import { useState, useEffect, useRef, useCallback } from 'react'

const WEIGHT_SCALE_UUID = 0x181d
const WEIGHT_MEASUREMENT_UUID = 0x2a9d
const DEBOUNCE_MS = 10_000

function hasBluetooth() {
  return typeof navigator !== 'undefined'
    && 'bluetooth' in navigator
    && typeof navigator.bluetooth.requestDevice === 'function'
}

// ─── GATT Weight Measurement characteristic (BLE SIG standard) ──────────
function parseGATTWeight(dataView) {
  if (dataView.byteLength < 3) return null

  const flags = dataView.getUint8(0)
  const isSI = !(flags & 0x01)

  const rawWeight = dataView.getUint16(1, true)

  let weightKg
  if (isSI) {
    weightKg = rawWeight * 0.005
  } else {
    weightKg = rawWeight * 0.01 * 0.453592
  }

  const hasTimestamp = (flags & 0x02) !== 0

  return {
    weightKg: Math.round(weightKg * 10) / 10,
    isStabilized: hasTimestamp && weightKg > 0,
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useBluetoothScale({ onStabilizedWeight }) {
  const supported = hasBluetooth()
  const [status, setStatus] = useState(supported ? 'idle' : 'unsupported')
  const [liveWeight, setLiveWeight] = useState(null)
  const [error, setError] = useState(null)

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
    stabilizedTimerRef.current = setTimeout(() => setStatus('scanning'), 3000)
  }, [])

  const cleanup = useCallback(() => {
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

  const stopScan = useCallback(() => {
    cleanup()
    setStatus(supported ? 'idle' : 'unsupported')
    setLiveWeight(null)
    setError(null)
  }, [cleanup, supported])

  const startScan = useCallback(async () => {
    if (!supported) {
      setError('Bluetooth no disponible en este navegador.')
      return
    }

    cleanup()
    setError(null)
    setLiveWeight(null)
    setStatus('scanning')

    try {
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

      const server = await device.gatt.connect()
      serverRef.current = server
      setStatus('scanning')

      const service = await server.getPrimaryService(WEIGHT_SCALE_UUID)
      const characteristic = await service.getCharacteristic(WEIGHT_MEASUREMENT_UUID)

      await characteristic.startNotifications()

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
      if (err.name === 'NotFoundError' || err.code === 8) {
        // User cancelled the picker
        setStatus('idle')
        return
      }
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setError('Permiso Bluetooth denegado.')
      } else {
        setError('Error al conectar: ' + err.message)
      }
      setStatus('idle')
      console.error('[BLE] Error:', err)
    }
  }, [cleanup, handleStabilized, supported])

  useEffect(() => cleanup, [cleanup])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && serverRef.current) {
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
    startScan,
    stopScan,
    isSupported: supported,
  }
}
