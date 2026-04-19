package com.weighttracker.bridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.ParcelUuid
import android.os.PowerManager
import android.util.Log
import java.util.UUID
import kotlin.concurrent.thread

class BleScaleService : Service() {

    companion object {
        const val TAG = "BleScaleService"
        const val CHANNEL_ID = "weight_bridge"
        const val NOTIFICATION_ID = 1
        const val EXTRA_SYNC_KEY = "sync_key"
        const val ACTION_WEIGHT_RECEIVED = "com.weighttracker.bridge.WEIGHT_RECEIVED"
        const val EXTRA_WEIGHT = "weight"

        private val WEIGHT_SCALE_SERVICE = ParcelUuid(UUID.fromString("0000181d-0000-1000-8000-00805f9b34fb"))
        private const val DEBOUNCE_MS = 30_000L
    }

    private var scanner: BluetoothLeScanner? = null
    private var syncKey: String = ""
    private var lastWeight: Double = 0.0
    private var lastSaveTime: Long = 0
    private var wakeLock: PowerManager.WakeLock? = null

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val record = result.scanRecord ?: return
            val deviceName = result.device?.name ?: record.deviceName ?: ""

            // Only process known scale devices
            val isScale = deviceName.contains("MI SCALE", ignoreCase = true) ||
                    deviceName.contains("MIBFS", ignoreCase = true)
            if (!isScale && deviceName.isNotEmpty()) return
            // If deviceName is empty, still try to check service data (some devices don't broadcast name)

            if (isScale) Log.d(TAG, "Scale found: '$deviceName' rssi=${result.rssi}")

            // Try to get service data from Weight Scale UUID
            var serviceData = record.getServiceData(WEIGHT_SCALE_SERVICE)

            // If no service data via UUID, try to find it in the raw scan record bytes
            if (serviceData == null) {
                val bytes = record.bytes
                if (bytes != null) {
                    serviceData = parseServiceDataFromRaw(bytes)
                }
            }

            if (serviceData == null || serviceData.size < 13) {
                if (deviceName.contains("MI SCALE", ignoreCase = true) || deviceName.contains("MIBFS", ignoreCase = true)) {
                    Log.d(TAG, "Scale found but no valid service data (${serviceData?.size ?: 0} bytes)")
                }
                return
            }

            Log.d(TAG, "Service data (${serviceData.size} bytes): ${serviceData.joinToString(" ") { "%02X".format(it) }}")

            val ctrl0 = serviceData[0].toInt() and 0xFF
            val ctrl1 = serviceData[1].toInt() and 0xFF

            val isImperial = (ctrl0 and 0x01) != 0
            val isCatty = (ctrl0 and 0x10) != 0
            val isStabilized = (ctrl1 and 0x20) != 0
            val isRemoved = (ctrl1 and 0x80) != 0

            if (isRemoved) return

            val rawWeight = (serviceData[11].toInt() and 0xFF) or
                    ((serviceData[12].toInt() and 0xFF) shl 8)

            val weightKg = when {
                isImperial -> (rawWeight / 100.0) * 0.453592
                isCatty -> (rawWeight / 100.0) * 0.5
                else -> rawWeight / 200.0
            }

            val rounded = Math.round(weightKg * 10.0) / 10.0
            if (rounded <= 0) return

            if (!isStabilized) {
                updateNotification("Midiendo: ${rounded} kg")
                return
            }

            val now = System.currentTimeMillis()
            val isDuplicate = Math.abs(lastWeight - rounded) < 0.15 &&
                    (now - lastSaveTime) < DEBOUNCE_MS

            if (isDuplicate) return

            lastWeight = rounded
            lastSaveTime = now

            Log.d(TAG, "Stable weight: ${rounded} kg — saving to Firestore")
            updateNotification("Guardado: ${rounded} kg")

            thread {
                val ok = FirestoreClient.saveWeight(syncKey, rounded)
                val intent = Intent(ACTION_WEIGHT_RECEIVED).apply {
                    putExtra(EXTRA_WEIGHT, rounded)
                    putExtra("success", ok)
                    setPackage(packageName)
                }
                sendBroadcast(intent)

                if (ok) {
                    updateNotification("Ultimo peso: ${rounded} kg")
                } else {
                    updateNotification("Error al guardar ${rounded} kg")
                }
            }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "BLE scan failed: $errorCode")
            updateNotification("Error de escaneo BLE: $errorCode")
        }
    }

    // Parse 0x181D service data from raw advertisement bytes (AD structures)
    private fun parseServiceDataFromRaw(raw: ByteArray): ByteArray? {
        var i = 0
        while (i < raw.size - 1) {
            val len = raw[i].toInt() and 0xFF
            if (len == 0) break
            if (i + len >= raw.size) break

            val type = raw[i + 1].toInt() and 0xFF
            // 0x16 = Service Data - 16-bit UUID
            if (type == 0x16 && len >= 3) {
                val uuid16 = ((raw[i + 3].toInt() and 0xFF) shl 8) or (raw[i + 2].toInt() and 0xFF)
                if (uuid16 == 0x181D) {
                    // Service data starts after the 2-byte UUID
                    val dataLen = len - 3
                    if (dataLen > 0) {
                        return raw.copyOfRange(i + 4, i + 1 + len)
                    }
                }
            }
            i += len + 1
        }
        return null
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        syncKey = intent?.getStringExtra(EXTRA_SYNC_KEY) ?: ""
        if (syncKey.isEmpty()) {
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification("Iniciando escaneo BLE..."))
        acquireWakeLock()
        startBleScan()

        return START_STICKY
    }

    override fun onDestroy() {
        stopBleScan()
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startBleScan() {
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = bluetoothManager?.adapter
        if (adapter == null || !adapter.isEnabled) {
            updateNotification("Bluetooth no disponible")
            return
        }

        scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            updateNotification("BLE scanner no disponible")
            return
        }

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        try {
            // Scan without filters — most reliable on older Android
            // The callback checks device name and service data
            scanner?.startScan(null, settings, scanCallback)
            updateNotification("Esperando balanza...")
            Log.d(TAG, "BLE scan started")
        } catch (e: SecurityException) {
            updateNotification("Sin permisos de Bluetooth")
            Log.e(TAG, "BLE permission denied", e)
        }
    }

    private fun stopBleScan() {
        try {
            scanner?.stopScan(scanCallback)
        } catch (_: Exception) {}
        scanner = null
    }

    private fun acquireWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WeightBridge::BLE").apply {
            acquire()
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Weight Bridge",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Escaneo BLE activo para la balanza"
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val pi = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Weight Bridge")
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(pi)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Weight Bridge")
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(pi)
                .setOngoing(true)
                .build()
        }
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIFICATION_ID, buildNotification(text))
    }
}
