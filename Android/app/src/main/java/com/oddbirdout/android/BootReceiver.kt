package com.oddbirdout.android

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Broadcast receiver that auto-launches the app when the device finishes
 * booting. Registered for android.intent.action.BOOT_COMPLETED in the
 * manifest. Together with the HOME intent filter on MainActivity, the
 * tablet boots directly into the kiosk app with no lock screen or launcher.
 */
class BootReceiver : BroadcastReceiver() {

    /** Fires on BOOT_COMPLETED. Starts MainActivity with CLEAR_TOP so
     *  any existing instance is reused, and NEW_TASK since this isn't
     *  an Activity context. */
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val launch = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(launch)
        }
    }
}
