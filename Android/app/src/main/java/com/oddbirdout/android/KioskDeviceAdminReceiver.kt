package com.oddbirdout.android

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Device-owner admin receiver. When the app is set as device owner via
 *  adb shell dpm set-device-owner, the system calls onEnabled(), which
 *  permanently disables the lock screen and status bar and whitelists
 *  this app for lock-task pinning (suppressing the "App is pinned" overlay).
 *
 *  On disabled, all policies are reverted to restore normal device behavior.
 */
class KioskDeviceAdminReceiver : DeviceAdminReceiver() {

    /** Applies kiosk policies when the admin is activated (during
     *  dpm set-device-owner). */
    override fun onEnabled(context: Context, intent: Intent) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, KioskDeviceAdminReceiver::class.java)
        dpm.setKeyguardDisabled(admin, true)
        dpm.setLockTaskPackages(admin, arrayOf(context.packageName))
        dpm.setStatusBarDisabled(admin, true)
    }

    /** Reverts kiosk policies when the admin is deactivated. */
    override fun onDisabled(context: Context, intent: Intent) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, KioskDeviceAdminReceiver::class.java)
        dpm.setKeyguardDisabled(admin, false)
        dpm.setLockTaskPackages(admin, arrayOf<String>())
        dpm.setStatusBarDisabled(admin, false)
    }
}
