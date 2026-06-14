package com.oddbirdout.android

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class KioskDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, KioskDeviceAdminReceiver::class.java)
        dpm.setKeyguardDisabled(admin, true)
        dpm.setLockTaskPackages(admin, arrayOf(context.packageName))
        dpm.setStatusBarDisabled(admin, true)
    }

    override fun onDisabled(context: Context, intent: Intent) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = ComponentName(context, KioskDeviceAdminReceiver::class.java)
        dpm.setKeyguardDisabled(admin, false)
        dpm.setLockTaskPackages(admin, arrayOf<String>())
        dpm.setStatusBarDisabled(admin, false)
    }
}
