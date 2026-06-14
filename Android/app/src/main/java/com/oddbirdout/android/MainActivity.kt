package com.oddbirdout.android

import android.annotation.SuppressLint
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Kiosk-mode activity that hosts a fullscreen WebView pointed at the OddBirdOut
 * game server. The URL is read from Settings.Global.oddbirdout_url (set via ADB).
 *
 * The activity disables the lock screen, hides system bars, pins itself in
 * lock-task mode, and blocks back/home/recents so players cannot leave.
 *
 * A small colored circle in the top-right corner indicates page load state:
 * green = loaded, yellow = refreshing, red = error. Long-press it to manually
 * reload the page.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var indicator: View
    private lateinit var indicatorHitbox: FrameLayout
    private var isPageLoaded = false
    private var isNetworkAvailable = false
    private val handler = Handler(Looper.getMainLooper())
    private val refreshIntervalMs = 10_000L

    /** Fallback watchdog that fires 15 seconds after a manual reload. The
     *  primary indicator state is driven by WebChromeClient.onProgressChanged,
     *  but if progress somehow never reaches 100, this forces the indicator to
     *  resolve based on the current isPageLoaded value. */
    private val loadWatchdog = Runnable {
        updateIndicator()
    }

    /** Periodic task that auto-recovers: if the page is in an error state and
     *  WiFi is available, it retries loading every 10 seconds. Once the page
     *  loads successfully (isPageLoaded = true), this cycle becomes a no-op. */
    private val refreshRunnable = object : Runnable {
        override fun run() {
            if (isNetworkAvailable && !isPageLoaded) {
                webView.loadUrl(getTargetUrl())
            }
            handler.postDelayed(this, refreshIntervalMs)
        }
    }

    // ── Activity lifecycle ────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Fullscreen + keep screen on + show over lock screen
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setShowWhenLocked(true)
        setTurnScreenOn(true)

        // Apply device-owner policies (keyguard, status bar, lock-task whitelist)
        applyDevicePolicies()
        hideSystemBars()

        // Belt-and-suspenders: if system insets appear, immediately re-hide bars
        window.decorView.setOnApplyWindowInsetsListener { view, insets ->
            val controller = ViewCompat.getWindowInsetsController(view)
            if (controller != null) {
                controller.hide(WindowInsetsCompat.Type.systemBars())
                controller.systemBarsBehavior =
                    WindowInsetsControllerCompat.BEHAVIOR_DEFAULT
            }
            insets
        }

        // Black background so the transition from boot to web content is seamless
        val container = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }

        webView = createWebView()
        container.addView(
            webView,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        )

        // Connection indicator (14dp circle inside a 48dp touch hitbox, top-right)
        indicator = createIndicator()
        indicatorHitbox = createIndicatorHitbox()
        val indicatorParams = FrameLayout.LayoutParams(dp(48), dp(48)).apply {
            gravity = Gravity.TOP or Gravity.END
            setMargins(0, dp(16), dp(16), 0)
        }
        container.addView(indicatorHitbox, indicatorParams)

        setContentView(container)

        // Consume all back-press events so the player never leaves
        onBackPressedDispatcher.addCallback(this) {}

        webView.loadUrl(getTargetUrl())
        startNetworkMonitor()
        handler.postDelayed(refreshRunnable, refreshIntervalMs)
        requestLockTask()
    }

    /** Cancels periodic callbacks to avoid leaks. */
    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(refreshRunnable)
        handler.removeCallbacks(loadWatchdog)
    }

    /** Re-hides system bars on resume and re-enters lock-task in case the
     *  user managed to briefly leave. */
    override fun onResume() {
        super.onResume()
        hideSystemBars()
        requestLockTask()
        if (!isPageLoaded && isNetworkAvailable) {
            webView.loadUrl(getTargetUrl())
        }
    }

    /** Re-hides system bars whenever the window regains focus. */
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    /** Blocks hardware home and app-switch buttons (back is handled by the
     *  OnBackPressedDispatcher callback registered in onCreate). */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_APP_SWITCH -> true
            else -> super.onKeyDown(keyCode, event)
        }
    }

    // ── WebView setup ─────────────────────────────────────────────────

    /** Creates and configures the kiosk WebView with JS enabled, cache
     *  disabled, and all zoom/scroll indicators hidden.
     *
     *  A WebChromeClient tracks load progress (0-100%) to drive the indicator:
     *  progress < 100 = yellow, progress == 100 = green.
     *
     *  A WebViewClient handles errors (red) and ensures all URLs stay inside
     *  the WebView instead of opening the browser. */
    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView(): WebView = WebView(this).apply {
        overScrollMode = View.OVER_SCROLL_NEVER
        isVerticalScrollBarEnabled = false
        isHorizontalScrollBarEnabled = false

        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            databaseEnabled = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        }

        webChromeClient = object : WebChromeClient() {
            /** Track load progress to keep the indicator accurate. */
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (newProgress >= 100) {
                    isPageLoaded = true
                    updateIndicator()
                } else {
                    isPageLoaded = false
                    setIndicatorRefreshing()
                }
            }
        }

        webViewClient = object : WebViewClient() {

            /** Page load started — reset loaded flag and show yellow. */
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                isPageLoaded = false
                setIndicatorRefreshing()
            }

            /** Final success safety net in case onProgressChanged stalls. */
            override fun onPageFinished(view: WebView, url: String) {
                isPageLoaded = true
                updateIndicator()
            }

            /** Legacy error callback — show red. */
            @Suppress("DEPRECATION")
            override fun onReceivedError(
                view: WebView,
                errorCode: Int,
                description: String,
                failingUrl: String
            ) {
                isPageLoaded = false
                updateIndicator()
            }

            /** Modern error callback — only react to main-frame failures. */
            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    isPageLoaded = false
                    updateIndicator()
                }
            }

            /** Never let the WebView navigate away from the game URL. */
            @Suppress("DEPRECATION")
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = false

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false
        }
    }

    // ── Connection indicator (top-right colored circle) ──────────────

    /** Small non-focusable colored circle in the top-right corner.
     *  Green = page loaded, red = error, yellow = loading.
     *  The actual touch target is a larger surrounding FrameLayout. */
    private fun createIndicator(): View = View(this).apply {
        setBg(COLOR_OFFLINE)
        visibility = View.VISIBLE
        isClickable = false
        isFocusable = false
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    /** Transparent 48dp x 48dp FrameLayout with the indicator anchored at
     *  its top-right corner. This keeps the visible circle at the same 16dp
     *  screen offset while expanding the touch hitbox inward/downward. */
    private fun createIndicatorHitbox(): FrameLayout = FrameLayout(this).apply {
        setBackgroundColor(Color.TRANSPARENT)
        addView(
            indicator,
            FrameLayout.LayoutParams(dp(14), dp(14)).apply {
                gravity = Gravity.TOP or Gravity.END
            }
        )
        isClickable = true
        isLongClickable = true
        setOnLongClickListener {
            isPageLoaded = false
            setIndicatorRefreshing()
            handler.removeCallbacks(loadWatchdog)
            handler.postDelayed(loadWatchdog, 15_000L)
            webView.loadUrl(getTargetUrl())
            true
        }
    }

    /** Sets the indicator to green (page loaded) or red (error) based on
     *  the current value of isPageLoaded. */
    private fun updateIndicator() {
        val color = if (isPageLoaded) COLOR_ONLINE else COLOR_OFFLINE
        indicator.setBg(color)
    }

    /** Sets the indicator to yellow (page currently loading/refreshing). */
    private fun setIndicatorRefreshing() {
        indicator.setBg(COLOR_REFRESHING)
    }

    /** Applies a fresh oval GradientDrawable with the given fill color.
     *  Creates a new drawable each time to avoid stale-render issues. */
    private fun View.setBg(color: Int) {
        background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
        }
    }

    // ── Device-owner policies ─────────────────────────────────────────

    /** Applies device-owner policies: disables the lock screen, hides the
     *  status bar, and whitelists this app for lock-task mode. Called on
     *  every launch so updates take effect without re-registering the
     *  device owner. Silently no-ops if the app is not the device owner. */
    private fun applyDevicePolicies() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return
        val admin = ComponentName(this, KioskDeviceAdminReceiver::class.java)
        try {
            dpm.setKeyguardDisabled(admin, true)
            dpm.setStatusBarDisabled(admin, true)
            dpm.setLockTaskPackages(admin, arrayOf(packageName))
        } catch (_: Exception) {}
    }

    // ── URL resolution ────────────────────────────────────────────────

    /** Reads the target URL from Settings.Global.oddbirdout_url (set via
     *  ADB). Falls back to DEFAULT_URL if the setting is missing or blank. */
    private fun getTargetUrl(): String {
        return try {
            val stored = Settings.Global.getString(contentResolver, "oddbirdout_url")
            if (stored.isNullOrBlank()) DEFAULT_URL else stored
        } catch (e: Exception) {
            DEFAULT_URL
        }
    }

    // ── Network monitoring ────────────────────────────────────────────

    /** Registers a ConnectivityManager callback that tracks WiFi state.
     *  When a network with internet capability appears, it automatically
     *  reloads the page if it's in an error state. */
    private fun startNetworkMonitor() {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork
        val caps = connectivityManager.getNetworkCapabilities(activeNetwork)
        isNetworkAvailable = caps != null &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isNetworkAvailable = true
                if (!isPageLoaded) {
                    runOnUiThread { webView.loadUrl(getTargetUrl()) }
                }
            }

            override fun onLost(network: Network) {
                isNetworkAvailable = false
            }
        })
    }

    // ── Lock-task / kiosk pinning ─────────────────────────────────────

    /** Attempts to pin the activity in lock-task mode. Fails silently if
     *  the device owner hasn't been configured yet. */
    private fun requestLockTask() {
        try {
            startLockTask()
        } catch (_: Exception) {}
    }

    // ── System bar hiding ─────────────────────────────────────────────

    /** Hides both the status bar and navigation bar using the immersive
     *  (non-sticky) flag so swipe gestures cannot reveal them. */
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
    }

    // ── Utility ───────────────────────────────────────────────────────

    /** Converts a dp value to raw pixels based on the device density. */
    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val DEFAULT_URL = "http://localhost:3000"
        const val COLOR_ONLINE = 0xFF4CAF50.toInt()
        const val COLOR_OFFLINE = 0xFFF44336.toInt()
        const val COLOR_REFRESHING = 0xFFFFC107.toInt()
    }
}
