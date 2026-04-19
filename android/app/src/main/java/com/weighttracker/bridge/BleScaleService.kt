package com.weighttracker.bridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
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

        private val WEIGHT_SCALE_SERVICE_UUID = UUID.fromString("0000181d-0000-1000-8000-00805f9b34fb")
        private val WEIGHT_MEASUREMENT_CHAR_UUID = UUID.fromString("00002a9d-0000-1000-8000-00805f9b34fb")
        private val CCC_DESCRIPTOR_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
        private const val DEBOUNCE_MS = 30_000L
        private const val SCAN_RESTART_DELAY_MS = 5_000L
    }

    private var scanner: BluetoothLeScanner? = null
    private var gatt: BluetoothGatt? = null
    private var syncKey: String = ""
    private var lastWeight: Double = 0.0
    private var lastSaveTime: Long = 0
    private var wakeLock: PowerManager.WakeLock? = null
    private var isConnecting = false
    private val handler = Handler(Looper.getMainLooper())
    private var deviceCount = 0

    // GATT callback — handles connection, service discovery, and weight notifications
    private val gattCallback = object : BluetoothGattCallback() {

        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    Log.d(TAG, "GATT connected to ${g.device.address}")
                    updateNotification("Conectado — buscando servicios...")
                    try {
                        g.discoverServices()
                    } catch (e: SecurityException) {
                        Log.e(TAG, "Permission denied for discoverServices", e)
                    }
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    Log.d(TAG, "GATT disconnected")
                    isConnecting = false
                    try { g.close() } catch (_: Exception) {}
                    gatt = null
                    updateNotification("Desconectado — reescaneando...")
                    // Restart scan to find the scale again
                    handler.postDelayed({ startBleScan() }, SCAN_RESTART_DELAY_MS)
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "Service discovery failed: $status")
                updateNotification("Error descubriendo servicios")
                return
            }

            val service = g.getService(WEIGHT_SCALE_SERVICE_UUID)
            if (service == null) {
                Log.e(TAG, "Weight Scale service not found")
                updateNotification("Servicio de balanza no encontrado")
                return
            }

            val characteristic = service.getCharacteristic(WEIGHT_MEASUREMENT_CHAR_UUID)
            if (characteristic == null) {
                Log.e(TAG, "Weight Measurement characteristic not found")
                updateNotification("Caracteristica de peso no encontrada")
                return
            }

            // Enable notifications
            try {
                g.setCharacteristicNotification(characteristic, true)
                val descriptor = characteristic.getDescriptor(CCC_DESCRIPTOR_UUID)
                if (descriptor != null) {
                    descriptor.value = BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
                    g.writeDescriptor(descriptor)
                    Log.d(TAG, "Subscribed to weight notifications")
                    updateNotification("Esperando peso en balanza...")
                } else {
                    Log.e(TAG, "CCC descriptor not found")
                    updateNotification("Error suscribiendo a notificaciones")
                }
            } catch (e: SecurityException) {
                Log.e(TAG, "Permission denied for notifications", e)
            }
        }

        override fun onCharacteristicChanged(g: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            if (characteristic.uuid != WEIGHT_MEASUREMENT_CHAR_UUID) return

            val data = characteristic.value ?: return
            Log.d(TAG, "Weight data (${data.size} bytes): ${data.joinToString(" ") { "%02X".format(it) }}")

            parseWeightMeasurement(data)
        }
    }

    // Parse BLE SIG Weight Measurement (0x2A9D) characteristic
    private fun parseWeightMeasurement(data: ByteArray) {
        if (data.size < 3) return

        val flags = data[0].toInt() and 0xFF
        val isImperial = (flags and 0x01) != 0

        // Weight is at bytes 1-2, little-endian
        val rawWeight = (data[1].toInt() and 0xFF) or ((data[2].toInt() and 0xFF) shl 8)

        val weightKg = if (isImperial) {
            // Imperial: resolution 0.01 lb, convert to kg
            (rawWeight / 100.0) * 0.453592
        } else {
            // Metric: resolution 0.005 kg (per BLE SIG spec)
            rawWeight * 0.005
        }

        val rounded = Math.round(weightKg * 10.0) / 10.0
        if (rounded <= 0) return

        // Check if measurement is stable (bit 2 of flags in some implementations)
        // For Mi Scale, we save all readings and debounce
        updateNotification("Midiendo: ${rounded} kg")

        val now = System.currentTimeMillis()
        val isDuplicate = Math.abs(lastWeight - rounded) < 0.15 &&
                (now - lastSaveTime) < DEBOUNCE_MS

        if (isDuplicate) return

        lastWeight = rounded
        lastSaveTime = now

        Log.d(TAG, "Weight: ${rounded} kg — saving to Firestore")
        updateNotification("Guardando: ${rounded} kg")

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

    // Scan callback — finds the scale and connects via GATT
    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val deviceName = result.device?.name ?: result.scanRecord?.deviceName ?: ""
            if (deviceName.isNotEmpty()) {
                deviceCount++
                if (deviceCount % 20 == 1) {
                    Log.d(TAG, "Scanned $deviceCount devices so far, latest: '$deviceName'")
                }
            }

            val isScale = deviceName.contains("MI SCALE", ignoreCase = true) ||
                    deviceName.contains("MIBFS", ignoreCase = true) ||
                    deviceName.contains("MIBCS", ignoreCase = true)

            if (!isScale) return

            Log.d(TAG, "Found scale: '$deviceName' addr=${result.device.address}")
            updateNotification("Balanza encontrada — conectando...")

            // Stop scanning and connect via GATT
            if (!isConnecting) {
                isConnecting = true
                stopBleScan()
                connectGatt(result.device)
            }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "BLE scan failed: $errorCode")
            updateNotification("Error de escaneo BLE: $errorCode")
        }
    }

    private fun connectGatt(device: BluetoothDevice) {
        try {
            gatt = device.connectGatt(this, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
            Log.d(TAG, "Connecting GATT to ${device.address}...")
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for GATT connect", e)
            updateNotification("Sin permisos de Bluetooth")
            isConnecting = false
        }
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
        handler.removeCallbacksAndMessages(null)
        stopBleScan()
        disconnectGatt()
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
            deviceCount = 0
            scanner?.startScan(null, settings, scanCallback)
            updateNotification("Buscando balanza...")
            Log.d(TAG, "BLE scan started (no filters)")
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

    private fun disconnectGatt() {
        try {
            gatt?.disconnect()
            gatt?.close()
        } catch (_: Exception) {}
        gatt = null
        isConnecting = false
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
