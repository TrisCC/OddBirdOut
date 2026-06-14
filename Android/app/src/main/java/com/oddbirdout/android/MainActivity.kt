package com.oddbirdout.android

import android.annotation.SuppressLint
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.graphics.Color
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

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var indicator: View
    private var isPageLoaded = false
    private var isNetworkAvailable = false
    private val handler = Handler(Looper.getMainLooper())
    private val refreshIntervalMs = 10_000L

    private val refreshRunnable = object : Runnable {
        override fun run() {
            if (isNetworkAvailable) {
                webView.reload()
            }
            handler.postDelayed(this, refreshIntervalMs)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        disableKeyguard()
        hideSystemBars()

        window.decorView.setOnApplyWindowInsetsListener { view, insets ->
            val controller = ViewCompat.getWindowInsetsController(view)
            if (controller != null) {
                controller.hide(WindowInsetsCompat.Type.systemBars())
                controller.systemBarsBehavior =
                    WindowInsetsControllerCompat.BEHAVIOR_DEFAULT
            }
            insets
        }

        val container = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }

        webView = createWebView()
        container.addView(
            webView,
            FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        )

        indicator = createIndicator()
        val indicatorParams = FrameLayout.LayoutParams(dp(14), dp(14)).apply {
            gravity = Gravity.TOP or Gravity.END
            setMargins(0, dp(16), dp(16), 0)
        }
        container.addView(indicator, indicatorParams)

        setContentView(container)

        onBackPressedDispatcher.addCallback(this) {}

        webView.loadUrl(getTargetUrl())
        startNetworkMonitor()
        handler.postDelayed(refreshRunnable, refreshIntervalMs)
        requestLockTask()
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(refreshRunnable)
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        requestLockTask()
        if (!isPageLoaded && isNetworkAvailable) {
            webView.reload()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_APP_SWITCH -> true
            else -> super.onKeyDown(keyCode, event)
        }
    }

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

        webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                setIndicatorRefreshing()
            }

            override fun onPageFinished(view: WebView, url: String) {
                isPageLoaded = true
                updateIndicator()
            }

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

            @Suppress("DEPRECATION")
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = false

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false
        }
    }

    private fun createIndicator(): View = View(this).apply {
        setBackgroundResource(android.R.drawable.presence_offline)
        visibility = View.VISIBLE
        isClickable = true
        isFocusable = false
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        setOnLongClickListener {
            setIndicatorRefreshing()
            webView.reload()
            true
        }
    }

    private fun updateIndicator() {
        val drawable = if (isPageLoaded) {
            android.R.drawable.presence_online
        } else {
            android.R.drawable.presence_offline
        }
        indicator.setBackgroundResource(drawable)
    }

    private fun setIndicatorRefreshing() {
        indicator.setBackgroundResource(android.R.drawable.presence_away)
    }

    private fun disableKeyguard() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return
        val admin = ComponentName(this, KioskDeviceAdminReceiver::class.java)
        try {
            dpm.setKeyguardDisabled(admin, true)
        } catch (_: Exception) {}
    }

    private fun getTargetUrl(): String {
        return try {
            val stored = Settings.Global.getString(contentResolver, "oddbirdout_url")
            if (stored.isNullOrBlank()) DEFAULT_URL else stored
        } catch (e: Exception) {
            DEFAULT_URL
        }
    }

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
                    runOnUiThread { webView.reload() }
                }
            }

            override fun onLost(network: Network) {
                isNetworkAvailable = false
            }
        })
    }

    private fun requestLockTask() {
        try {
            startLockTask()
        } catch (_: Exception) {}
    }

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

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val DEFAULT_URL = "http://localhost:3000"
    }
}
