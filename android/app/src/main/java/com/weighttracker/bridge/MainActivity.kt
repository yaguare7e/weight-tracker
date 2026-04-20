package com.weighttracker.bridge

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    companion object {
        private const val PREFS = "weight_bridge"
        private const val KEY_SYNC_KEY = "sync_key"
        private const val KEY_RUNNING = "running"
        private const val PERMISSION_REQUEST = 100
    }

    private lateinit var prefs: SharedPreferences
    private lateinit var syncKeyInput: EditText
    private lateinit var toggleButton: Button
    private lateinit var statusText: TextView
    private lateinit var logText: TextView

    private var isRunning = false
    private val logEntries = mutableListOf<String>()

    private val weightReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            val weight = intent?.getDoubleExtra(BleScaleService.EXTRA_WEIGHT, 0.0) ?: return
            val success = intent.getBooleanExtra("success", false)
            val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            val status = if (success) "OK" else "ERROR"

            val entry = "$time  ${weight} kg  [$status]"
            logEntries.add(0, entry)
            if (logEntries.size > 50) logEntries.removeAt(logEntries.size - 1)

            logText.text = logEntries.joinToString("\n")
            if (success) {
                statusText.text = "Ultimo peso: ${weight} kg"
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        syncKeyInput = findViewById(R.id.syncKeyInput)
        toggleButton = findViewById(R.id.toggleButton)
        statusText = findViewById(R.id.statusText)
        logText = findViewById(R.id.logText)

        syncKeyInput.setText(prefs.getString(KEY_SYNC_KEY, ""))
        isRunning = prefs.getBoolean(KEY_RUNNING, false)
        updateUI()

        // Auto-restart service if it was running but process was killed
        if (isRunning) {
            val syncKey = prefs.getString(KEY_SYNC_KEY, "") ?: ""
            if (syncKey.isNotEmpty()) {
                val intent = Intent(this, BleScaleService::class.java).apply {
                    putExtra(BleScaleService.EXTRA_SYNC_KEY, syncKey)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent)
                } else {
                    startService(intent)
                }
            }
        }

        toggleButton.setOnClickListener {
            if (isRunning) {
                stopBridge()
            } else {
                startBridge()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(BleScaleService.ACTION_WEIGHT_RECEIVED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(weightReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(weightReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(weightReceiver)
    }

    private fun startBridge() {
        val syncKey = syncKeyInput.text.toString().trim()
        if (syncKey.isEmpty()) {
            statusText.text = "Ingresa tu sync key"
            return
        }

        if (!checkPermissions()) return

        requestBatteryOptimizationExemption()

        prefs.edit()
            .putString(KEY_SYNC_KEY, syncKey)
            .putBoolean(KEY_RUNNING, true)
            .apply()

        val intent = Intent(this, BleScaleService::class.java).apply {
            putExtra(BleScaleService.EXTRA_SYNC_KEY, syncKey)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        isRunning = true
        updateUI()
    }

    private fun stopBridge() {
        stopService(Intent(this, BleScaleService::class.java))
        prefs.edit().putBoolean(KEY_RUNNING, false).apply()
        isRunning = false
        updateUI()
    }

    private fun updateUI() {
        if (isRunning) {
            toggleButton.text = "Detener"
            statusText.text = "Escuchando balanza..."
            syncKeyInput.isEnabled = false
        } else {
            toggleButton.text = "Iniciar"
            statusText.text = "Detenido"
            syncKeyInput.isEnabled = true
        }
    }

    private fun checkPermissions(): Boolean {
        val needed = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN)
                != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.BLUETOOTH_SCAN)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
                != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.BLUETOOTH_CONNECT)
            }
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSION_REQUEST)
            return false
        }

        return true
    }

    private fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                startBridge()
            } else {
                statusText.text = "Permisos denegados"
            }
        }
    }
}
