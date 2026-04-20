package com.weighttracker.bridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
        private const val PREFS = "weight_bridge"
        private const val KEY_SYNC_KEY = "sync_key"
        private const val KEY_RUNNING = "running"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val wasRunning = prefs.getBoolean(KEY_RUNNING, false)
        val syncKey = prefs.getString(KEY_SYNC_KEY, "") ?: ""

        if (!wasRunning || syncKey.isEmpty()) {
            Log.d(TAG, "Service was not running before reboot, skipping")
            return
        }

        Log.d(TAG, "Restarting BLE service after boot")

        val serviceIntent = Intent(context, BleScaleService::class.java).apply {
            putExtra(BleScaleService.EXTRA_SYNC_KEY, syncKey)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
