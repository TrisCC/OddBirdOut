package com.oddbirdout.android

import android.annotation.SuppressLint
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.PorterDuff
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.BatteryManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
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
 * Status icons in the top-right corner: a battery indicator (left) and a WiFi
 * connectivity icon (right). Long-press the WiFi icon to manually reload. */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var wifiIcon: ImageView
    private lateinit var batteryIcon: ImageView
    private var batteryReceiver: BroadcastReceiver? = null
    private var isPageLoaded = false
    private var isNetworkAvailable = false
    private val handler = Handler(Looper.getMainLooper())
    private val refreshIntervalMs = 10_000L

    /** Fallback watchdog that fires 15 seconds after a manual reload. The
     *  primary indicator state is driven by WebChromeClient.onProgressChanged,
     *  but if progress somehow never reaches 100, this forces the indicator to
     *  resolve based on the current isPageLoaded value. */
    private val loadWatchdog = Runnable {
        updateWifiState()
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

        // Status icons (battery left, wifi right, top-right corner)
        val statusBar = createStatusBar()
        val statusBarParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            setMargins(0, dp(16), dp(16), 0)
        }
        container.addView(statusBar, statusBarParams)

        setContentView(container)

        // Consume all back-press events so the player never leaves
        onBackPressedDispatcher.addCallback(this) {}

        webView.loadUrl(getTargetUrl())
        startNetworkMonitor()
        startBatteryMonitor()
        setDeviceName()
        handler.postDelayed(refreshRunnable, refreshIntervalMs)
        requestLockTask()
    }

    /** Cancels periodic callbacks to avoid leaks. */
    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(refreshRunnable)
        handler.removeCallbacks(loadWatchdog)
        batteryReceiver?.let { unregisterReceiver(it) }
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
                    updateWifiState()
                } else {
                    isPageLoaded = false
                    setWifiRefreshing()
                }
            }
        }

        webViewClient = object : WebViewClient() {

            /** Page load started — reset loaded flag and show yellow. */
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                isPageLoaded = false
                setWifiRefreshing()
            }

            /** Final success safety net in case onProgressChanged stalls. */
            override fun onPageFinished(view: WebView, url: String) {
                isPageLoaded = true
                updateWifiState()
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
                updateWifiState()
            }

            /** Modern error callback — only react to main-frame failures. */
            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    isPageLoaded = false
                    updateWifiState()
                }
            }

            /** Never let the WebView navigate away from the game URL. */
            @Suppress("DEPRECATION")
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = false

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false
        }
    }

    // ── Status bar (battery + wifi icons) ────────────────────────────

    private fun createStatusBar(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL

        batteryIcon = ImageView(context).apply {
            layoutParams = LinearLayout.LayoutParams(dp(48), dp(48))
            scaleType = ImageView.ScaleType.CENTER
            setPadding(dp(12), dp(12), dp(12), dp(12))
        }
        addView(batteryIcon)

        wifiIcon = ImageView(context).apply {
            layoutParams = LinearLayout.LayoutParams(dp(48), dp(48))
            scaleType = ImageView.ScaleType.CENTER
            setPadding(dp(12), dp(12), dp(12), dp(12))
            setOnLongClickListener {
                isPageLoaded = false
                setWifiRefreshing()
                handler.removeCallbacks(loadWatchdog)
                handler.postDelayed(loadWatchdog, 15_000L)
                webView.loadUrl(getTargetUrl())
                true
            }
        }
        addView(wifiIcon)
    }

    private fun updateBatteryIcon(level: Int, charging: Boolean) {
        val (res, color) = when {
            charging -> R.drawable.sharp_battery_charging_80_2_24 to COLOR_GREEN
            level > 80 -> R.drawable.sharp_battery_android_full_24 to COLOR_GREEN
            level > 35 -> R.drawable.sharp_battery_android_4_24 to COLOR_YELLOW
            else -> R.drawable.sharp_battery_android_1_24 to COLOR_RED
        }
        batteryIcon.setImageResource(res)
        batteryIcon.setColorFilter(color, PorterDuff.Mode.SRC_IN)
    }

    private fun updateWifiState() {
        when {
            isPageLoaded -> setWifiIcon(R.drawable.sharp_android_wifi_3_bar_24, COLOR_ONLINE)
            isNetworkAvailable -> setWifiIcon(R.drawable.sharp_android_wifi_3_bar_alert_24, COLOR_OFFLINE)
            else -> setWifiIcon(R.drawable.sharp_android_wifi_3_bar_off_24, COLOR_OFFLINE)
        }
    }

    private fun setWifiRefreshing() {
        setWifiIcon(R.drawable.sharp_android_wifi_3_bar_question_24, COLOR_REFRESHING)
    }

    private fun setWifiIcon(res: Int, color: Int) {
        wifiIcon.setImageResource(res)
        wifiIcon.setColorFilter(color, PorterDuff.Mode.SRC_IN)
    }

    private fun startBatteryMonitor() {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
                val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, BatteryManager.BATTERY_STATUS_UNKNOWN)
                val pct = if (scale > 0) (level * 100 / scale) else 50
                val charging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL
                updateBatteryIcon(pct, charging)
            }
        }
        batteryReceiver = receiver
        registerReceiver(receiver, filter)
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

        enableAdbOverTcp()
    }

    /** Enables ADB over TCP on port 5555 so any machine on the same WiFi
     *  network can connect with `adb connect <ip>:5555`.
     *
     *  Writes the necessary global settings (device owner can do this) then
     *  attempts to restart adbd in TCP mode. The restart may fail silently
     *  on locked-down devices — in that case fall back to a one-time USB
     *  connection to run `adb tcpip 5555`. */
    private fun enableAdbOverTcp() {
        try {
            Settings.Global.putInt(contentResolver, "adb_enabled", 1)
            Settings.Global.putInt(contentResolver, "adb_wifi_enabled", 1)
            Settings.Global.putInt(contentResolver, "development_settings_enabled", 1)

            Runtime.getRuntime().exec(arrayOf("setprop", "service.adb.tcp.port", "5555"))
            Thread.sleep(200)
            Runtime.getRuntime().exec(arrayOf("stop", "adbd"))
            Thread.sleep(200)
            Runtime.getRuntime().exec(arrayOf("start", "adbd"))
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

    /** Sets the device's network hostname. Extracts the player role and a
     *  unique device suffix to produce names like "OddBirdOut-A-8f32".
     *
     *  Falls back to "{domain}-{id}" when the URL has no player= param,
     *  or "UNSET-{id}" when no URL has been configured. */
    @SuppressLint("HardwareIds")
    private fun setDeviceName() {
        try {
            val id = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
                ?.takeLast(4) ?: "0000"
            val url = getTargetUrl()

            val name = when {
                url.isBlank() || url == DEFAULT_URL -> "UNSET-$id"
                else -> {
                    val m = Regex("[?&]player=([A-C])").find(url)
                    if (m != null) "OddBirdOut-${m.groupValues[1]}-$id"
                    else "${extractDomain(url)}-$id"
                }
            }

            Settings.Global.putString(contentResolver, "device_name", name)
            Runtime.getRuntime().exec(arrayOf("cmd", "deviceid", "name", name))
        } catch (_: Exception) {}
    }

    private fun extractDomain(url: String): String {
        return try {
            java.net.URI(url).host ?: "UNKNOWN"
        } catch (_: Exception) {
            "UNKNOWN"
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
                updateWifiState()
                if (!isPageLoaded) {
                    runOnUiThread { webView.loadUrl(getTargetUrl()) }
                }
            }

            override fun onLost(network: Network) {
                isNetworkAvailable = false
                runOnUiThread { updateWifiState() }
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
        const val COLOR_GREEN = 0xFF4CAF50.toInt()
        const val COLOR_YELLOW = 0xFFFFC107.toInt()
        const val COLOR_RED = 0xFFF44336.toInt()
        const val COLOR_ONLINE = COLOR_GREEN
        const val COLOR_REFRESHING = COLOR_YELLOW
        const val COLOR_OFFLINE = COLOR_RED
    }
}
