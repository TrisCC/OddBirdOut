package com.oddbirdout.android

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

class WifiIndicatorView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val density = resources.displayMetrics.density

    private val arcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = density * 2f
        strokeCap = Paint.Cap.ROUND
    }

    private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private var wifiColor = COLOR_OFFLINE
    private var visibleArcs = 0

    init {
        isClickable = true
        isLongClickable = true
    }

    fun setOnline() {
        wifiColor = COLOR_ONLINE
        visibleArcs = 3
        invalidate()
    }

    fun setRefreshing() {
        wifiColor = COLOR_REFRESHING
        visibleArcs = 2
        invalidate()
    }

    fun setOffline() {
        wifiColor = COLOR_OFFLINE
        visibleArcs = 1
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val w = width.toFloat()
        val h = height.toFloat()
        val cx = w / 2f
        val dotRadius = density * 1.8f
        val dotY = h * 0.62f
        val arcCenterY = dotY - density * 2.5f
        val arcGap = density * 3.5f

        val arcRadius = FloatArray(3) { i -> dotRadius + arcGap * (i + 1) }
        val arcBounds = Array(3) { i ->
            val r = arcRadius[i]
            RectF(cx - r, arcCenterY - r, cx + r, arcCenterY + r)
        }

        arcPaint.color = wifiColor
        dotPaint.color = wifiColor

        for (i in 0 until 3) {
            arcPaint.alpha = if (i < visibleArcs) 255 else 50
            canvas.drawArc(arcBounds[i], 225f, 90f, false, arcPaint)
        }

        dotPaint.alpha = if (visibleArcs > 0) 255 else 50
        canvas.drawCircle(cx, dotY, dotRadius, dotPaint)
    }

    companion object {
        private const val COLOR_ONLINE = 0xFF4CAF50.toInt()
        private const val COLOR_REFRESHING = 0xFFFFC107.toInt()
        private const val COLOR_OFFLINE = 0xFFF44336.toInt()
    }
}
