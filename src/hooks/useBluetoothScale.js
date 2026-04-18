import { useState, useEffect, useRef, useCallback } from 'react'

const WEIGHT_SCALE_UUID = 0x181d
const WEIGHT_SCALE_UUID_STR = '0000181d-0000-1000-8000-00805f9b34fb'
const DEBOUNCE_MS = 10_000

function getIsSupported() {
  return typeof navigator !== 'undefined'
    && 'bluetooth' in navigator
    && typeof navigator.bluetooth.requestLEScan === 'function'
}

function parseScaleData(dataView) {
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

function getServiceData(event) {
  if (!event.serviceData) return null
  // Try numeric key first, then string UUID
  let data = event.serviceData.get(WEIGHT_SCALE_UUID)
  if (!data) data = event.serviceData.get(WEIGHT_SCALE_UUID_STR)
  if (!data) {
    // Iterate and check keys ending with 181d
    for (const [key, value] of event.serviceData) {
      if (String(key).toLowerCase().includes('181d')) {
        data = value
        break
      }
    }
  }
  return data
}

export function useBluetoothScale({ onStabilizedWeight }) {
  const [status, setStatus] = useState(() => getIsSupported() ? 'idle' : 'unsupported')
  const [liveWeight, setLiveWeight] = useState(null)
  const [error, setError] = useState(null)

  const scanRef = useRef(null)
  const listenerRef = useRef(null)
  const lastStabilizedRef = useRef({ weight: null, time: 0 })
  const stabilizedTimerRef = useRef(null)
  const callbackRef = useRef(onStabilizedWeight)
  callbackRef.current = onStabilizedWeight

  const cleanup = useCallback(() => {
    if (scanRef.current) {
      scanRef.current.stop()
      scanRef.current = null
    }
    if (listenerRef.current) {
      navigator.bluetooth.removeEventListener('advertisementreceived', listenerRef.current)
      listenerRef.current = null
    }
    if (stabilizedTimerRef.current) {
      clearTimeout(stabilizedTimerRef.current)
      stabilizedTimerRef.current = null
    }
  }, [])

  const stopScan = useCallback(() => {
    cleanup()
    setStatus(getIsSupported() ? 'idle' : 'unsupported')
    setLiveWeight(null)
    setError(null)
  }, [cleanup])

  const startScan = useCallback(async () => {
    if (!getIsSupported()) {
      setError('Web Bluetooth Scanning no disponible en este navegador.')
      return
    }

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

        const result = parseScaleData(data)
        if (!result || result.isRemoved) return

        setLiveWeight(result.weightKg)

        if (result.isStabilized) {
          const now = Date.now()
          const last = lastStabilizedRef.current
          const isDuplicate = last.weight !== null
            && Math.abs(last.weight - result.weightKg) < 0.15
            && (now - last.time) < DEBOUNCE_MS

          if (!isDuplicate) {
            lastStabilizedRef.current = { weight: result.weightKg, time: now }
            setStatus('stabilized')
            callbackRef.current?.(result.weightKg)

            if (stabilizedTimerRef.current) clearTimeout(stabilizedTimerRef.current)
            stabilizedTimerRef.current = setTimeout(() => {
              setStatus('scanning')
            }, 3000)
          }
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
      console.error('[BLE] Scan error:', err)
    }
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  // Pause scan when page is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && scanRef.current) {
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
    isSupported: getIsSupported(),
  }
}
