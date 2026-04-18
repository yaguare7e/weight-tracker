import { useState, useEffect, useRef, useCallback } from 'react'

const WEIGHT_SCALE_UUID = 0x181d
const WEIGHT_SCALE_UUID_STR = '0000181d-0000-1000-8000-00805f9b34fb'
const WEIGHT_MEASUREMENT_UUID = 0x2a9d
const DEBOUNCE_MS = 10_000

// ─── Feature detection ─────────────────────────────────────────────────────
function hasBluetooth() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

function hasLEScan() {
  return hasBluetooth() && typeof navigator.bluetooth.requestLEScan === 'function'
}

function hasGATT() {
  return hasBluetooth() && typeof navigator.bluetooth.requestDevice === 'function'
}

function getSupport() {
  if (hasLEScan()) return 'scan'
  if (hasGATT()) return 'gatt'
  return 'none'
}

// ─── Advertisement data parsing (for requestLEScan) ─────────────────────────
function parseAdvertisementData(dataView) {
  if (dataView.byteLength < 13) return null

  const ctrl0 = dataView.getUint8(0)
  const ctrl1 = dataView.getUint8(1)

  const isImperial   = (ctrl0 & 0x01) !== 0
  const isCatty      = (ctrl0 & 0x10) !== 0
  const isStabilized = (ctrl1 & 0x20) !== 0
  const isRemoved    = (ctrl1 & 0x80) !== 0

  const rawWeight = dataView.getUint16(11, true)

  let weightKg
  if (isImperial) {
    weightKg = (rawWeight / 100) * 0.453592
  } else if (isCatty) {
    weightKg = (rawWeight / 100) * 0.5
  } else {
    weightKg = rawWeight / 200
  }

  return { weightKg: Math.round(weightKg * 10) / 10, isStabilized, isRemoved }
}

// ─── GATT characteristic parsing (for requestDevice) ────────────────────────
function parseGATTWeight(dataView) {
  if (dataView.byteLength < 3) return null

  const flags = dataView.getUint8(0)
  const isSI = !(flags & 0x01) // bit 0: 0=SI(kg), 1=Imperial(lb)

  const rawWeight = dataView.getUint16(1, true)

  let weightKg
  if (isSI) {
    weightKg = rawWeight * 0.005 // BLE spec: resolution 0.005 kg
  } else {
    weightKg = rawWeight * 0.01 * 0.453592 // resolution 0.01 lb → kg
  }

  // Check if measurement is stabilized (no timestamp = still measuring on some scales)
  // For Mi Scale 2 via GATT, we consider any value > 0 with timestamp as stabilized
  const hasTimestamp = (flags & 0x02) !== 0
  const isStabilized = hasTimestamp && weightKg > 0

  return { weightKg: Math.round(weightKg * 10) / 10, isStabilized }
}

function getServiceData(event) {
  if (!event.serviceData) return null
  let data = event.serviceData.get(WEIGHT_SCALE_UUID)
  if (!data) data = event.serviceData.get(WEIGHT_SCALE_UUID_STR)
  if (!data) {
    for (const [key, value] of event.serviceData) {
      if (String(key).toLowerCase().includes('181d')) {
        data = value
        break
      }
    }
  }
  return data
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useBluetoothScale({ onStabilizedWeight }) {
  const support = getSupport()
  const [status, setStatus] = useState(support === 'none' ? 'unsupported' : 'idle')
  const [liveWeight, setLiveWeight] = useState(null)
  const [error, setError] = useState(null)

  const scanRef = useRef(null)
  const listenerRef = useRef(null)
  const deviceRef = useRef(null)
  const serverRef = useRef(null)
  const lastStabilizedRef = useRef({ weight: null, time: 0 })
  const stabilizedTimerRef = useRef(null)
  const callbackRef = useRef(onStabilizedWeight)
  callbackRef.current = onStabilizedWeight

  const handleStabilized = useCallback((weightKg) => {
    const now = Date.now()
    const last = lastStabilizedRef.current
    const isDuplicate = last.weight !== null
      && Math.abs(last.weight - weightKg) < 0.15
      && (now - last.time) < DEBOUNCE_MS

    if (isDuplicate) return

    lastStabilizedRef.current = { weight: weightKg, time: now }
    setStatus('stabilized')
    callbackRef.current?.(weightKg)

    if (stabilizedTimerRef.current) clearTimeout(stabilizedTimerRef.current)
    stabilizedTimerRef.current = setTimeout(() => {
      setStatus('scanning')
    }, 3000)
  }, [])

  const cleanup = useCallback(() => {
    if (scanRef.current) {
      scanRef.current.stop()
      scanRef.current = null
    }
    if (listenerRef.current && hasBluetooth()) {
      navigator.bluetooth.removeEventListener('advertisementreceived', listenerRef.current)
      listenerRef.current = null
    }
    if (serverRef.current?.connected) {
      serverRef.current.disconnect()
    }
    serverRef.current = null
    deviceRef.current = null
    if (stabilizedTimerRef.current) {
      clearTimeout(stabilizedTimerRef.current)
      stabilizedTimerRef.current = null
    }
  }, [])

  // ─── GATT connection approach ───────────────────────────────────────────
  const startGATT = useCallback(async () => {
    cleanup()
    setError(null)
    setLiveWeight(null)

    try {
      setStatus('scanning')

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'MI SCALE' },
          { namePrefix: 'MIBFS' },
          { services: [WEIGHT_SCALE_UUID] },
        ],
        optionalServices: [WEIGHT_SCALE_UUID],
      })
      deviceRef.current = device

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('idle')
        setLiveWeight(null)
      })

      setStatus('scanning')
      const server = await device.gatt.connect()
      serverRef.current = server

      const service = await server.getPrimaryService(WEIGHT_SCALE_UUID)
      const characteristic = await service.getCharacteristic(WEIGHT_MEASUREMENT_UUID)

      await characteristic.startNotifications()
      setStatus('scanning')

      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value
        const result = parseGATTWeight(value)
        if (!result || result.weightKg <= 0) return

        setLiveWeight(result.weightKg)

        if (result.isStabilized) {
          handleStabilized(result.weightKg)
        } else {
          setStatus('receiving')
        }
      })
    } catch (err) {
      if (err.name === 'NotFoundError') {
        setError('No se encontro la balanza. Asegurate de estar parado en ella.')
      } else if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setError('Permiso Bluetooth denegado.')
      } else {
        setError('Error al conectar: ' + err.message)
      }
      setStatus('idle')
      console.error('[BLE GATT] Error:', err)
    }
  }, [cleanup, handleStabilized])

  // ─── Advertisement scanning approach ────────────────────────────────────
  const startScan = useCallback(async () => {
    cleanup()
    setError(null)
    setLiveWeight(null)

    try {
      const scan = await navigator.bluetooth.requestLEScan({
        acceptAllAdvertisements: true,
        keepRepeatedDevices: true,
      })
      scanRef.current = scan
      setStatus('scanning')

      const handler = (event) => {
        const data = getServiceData(event)
        if (!data) return

        const result = parseAdvertisementData(data)
        if (!result || result.isRemoved) return

        setLiveWeight(result.weightKg)

        if (result.isStabilized) {
          handleStabilized(result.weightKg)
        } else {
          setStatus('receiving')
        }
      }

      navigator.bluetooth.addEventListener('advertisementreceived', handler)
      listenerRef.current = handler
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Permiso de escaneo BLE denegado.')
      } else {
        setError('No se pudo iniciar el escaneo. Verifica que Bluetooth este activado.')
      }
      setStatus('idle')
      console.error('[BLE Scan] Error:', err)
    }
  }, [cleanup, handleStabilized])

  // ─── Public start method: GATT first (more reliable), scan as fallback ──
  const start = useCallback(async () => {
    if (hasGATT()) {
      await startGATT()
    } else if (hasLEScan()) {
      await startScan()
    } else {
      setError('Bluetooth no disponible en este navegador.')
    }
  }, [startScan, startGATT])

  const stop = useCallback(() => {
    cleanup()
    setStatus(support === 'none' ? 'unsupported' : 'idle')
    setLiveWeight(null)
    setError(null)
  }, [cleanup, support])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  // Pause when page is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && (scanRef.current || serverRef.current)) {
        cleanup()
        setStatus('idle')
        setLiveWeight(null)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [cleanup])

  return {
    status,
    liveWeight,
    error,
    startScan: start,
    stopScan: stop,
    isSupported: support !== 'none',
  }
}
