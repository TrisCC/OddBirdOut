package com.oddbirdout.android

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

class BatteryIndicatorView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var level = 100
    private var isCharging = false
    private val density = resources.displayMetrics.density

    private val outlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = density * 1.5f
    }

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val nubPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val boltPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.WHITE
    }

    fun setBatteryState(level: Int, isCharging: Boolean) {
        this.level = level.coerceIn(0, 100)
        this.isCharging = isCharging
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val w = width.toFloat()
        val h = height.toFloat()
        val color = stateColor

        val bodyWidth = w * 0.55f
        val bodyHeight = h * 0.4f
        val bodyLeft = (w - bodyWidth) / 2f
        val bodyTop = (h - bodyHeight) / 2f
        val bodyRadius = density * 2f

        val nubWidth = w * 0.08f
        val nubHeight = h * 0.15f
        val nubLeft = bodyLeft + bodyWidth
        val nubTop = bodyTop + (bodyHeight - nubHeight) / 2f

        val fillMargin = density * 2f
        val fillLeft = bodyLeft + fillMargin
        val fillTop = bodyTop + fillMargin
        val fillWidth = (bodyWidth - fillMargin * 2) * (level / 100f)
        val fillRect = RectF(fillLeft, fillTop, fillLeft + fillWidth, fillTop + bodyHeight - fillMargin * 2)

        fillPaint.color = if (isCharging) COLOR_GREEN else color
        canvas.drawRoundRect(fillRect, bodyRadius, bodyRadius, fillPaint)

        outlinePaint.color = color
        canvas.drawRoundRect(
            RectF(bodyLeft, bodyTop, bodyLeft + bodyWidth, bodyTop + bodyHeight),
            bodyRadius, bodyRadius, outlinePaint
        )

        nubPaint.color = color
        canvas.drawRect(nubLeft, nubTop, nubLeft + nubWidth, nubTop + nubHeight, nubPaint)

        if (isCharging) {
            drawBolt(canvas, RectF(bodyLeft, bodyTop, bodyLeft + bodyWidth, bodyTop + bodyHeight))
        }
    }

    private fun drawBolt(canvas: Canvas, body: RectF) {
        val cx = body.centerX()
        val topY = body.top + body.height() * 0.18f
        val botY = body.bottom - body.height() * 0.18f
        val offX = body.width() * 0.14f

        val path = Path().apply {
            moveTo(cx, topY)
            lineTo(cx - offX, body.centerY())
            lineTo(cx - offX * 0.35f, body.centerY())
            lineTo(cx - offX * 0.7f, botY)
            lineTo(cx + offX * 0.35f, body.centerY())
            lineTo(cx + offX, body.centerY())
            close()
        }
        canvas.drawPath(path, boltPaint)
    }

    private val stateColor: Int get() = when {
        level > 80 -> COLOR_GREEN
        level > 35 -> COLOR_YELLOW
        else -> COLOR_RED
    }

    companion object {
        private const val COLOR_GREEN = 0xFF4CAF50.toInt()
        private const val COLOR_YELLOW = 0xFFFFC107.toInt()
        private const val COLOR_RED = 0xFFF44336.toInt()
    }
}
