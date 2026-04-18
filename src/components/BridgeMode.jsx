import { useState, useEffect, useRef } from 'react'
import { Bluetooth, X, Wifi, WifiOff, Smartphone, ExternalLink } from 'lucide-react'
import { useBluetoothScale } from '../hooks/useBluetoothScale.js'

const todayISO = () => new Date().toISOString().split('T')[0]
const timeStr = (d) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function UnsupportedView({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-sm">Balanza Bluetooth</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="mb-6 w-24 h-24 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
          <Smartphone className="h-10 w-10 text-slate-400" />
        </div>

        <h3 className="text-lg font-semibold mb-4 text-center">
          Bluetooth no disponible en este navegador
        </h3>

        <div className="max-w-sm space-y-4 text-sm text-slate-300">
          <p className="text-center text-slate-400">
            Para conectar tu balanza Xiaomi necesitas un celular Android con Chrome.
            Podes usar un Android viejo como puente dedicado.
          </p>

          <div className="bg-slate-800 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-white text-xs uppercase tracking-wide">Como configurar el Android</p>

            <div className="space-y-2.5">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <span>Abri <strong className="text-white">Chrome</strong> en el Android</span>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <div>
                  Entra a <span className="text-blue-400 font-mono text-xs">chrome://flags</span> y activa <strong className="text-white">Experimental Web Platform features</strong>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <span>Reinicia Chrome</span>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                <span>Abri esta misma app y toca <strong className="text-white">"Conectar balanza Bluetooth"</strong></span>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">5</span>
                <span>Asegurate de usar la <strong className="text-white">misma sync key</strong> que en tu iPhone</span>
              </div>

              <div className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">6</span>
                <span>Activa el modo puente y deja el Android enchufado cerca de la balanza</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">
            Los pesos se sincronizan automaticamente por Firebase.
            Tu iPhone los muestra al instante.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BridgeMode({ onAdd, onClose }) {
  const [log, setLog] = useState([])

  const { status, liveWeight, error, startScan, stopScan, isSupported } = useBluetoothScale({
    onStabilizedWeight: async (kg) => {
      try {
        await onAdd({ weightKg: kg, date: todayISO() })
        setLog(prev => [{ weight: kg, time: new Date(), ok: true }, ...prev].slice(0, 20))
      } catch (err) {
        console.error('[Bridge] Save error:', err)
        setLog(prev => [{ weight: kg, time: new Date(), ok: false, error: err.message }, ...prev].slice(0, 20))
      }
    },
  })

  // Wake Lock to keep screen on
  useEffect(() => {
    if (!isSupported) return
    let wakeLock = null
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch { /* ignore */ }
    }
    acquire()

    const handleVisibility = () => {
      if (!document.hidden) acquire()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isSupported])

  const handleClose = () => {
    stopScan()
    onClose()
  }

  if (!isSupported) {
    return <UnsupportedView onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-sm">Modo puente</span>
        </div>
        <button onClick={handleClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main status */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {status === 'scanning' && (
          <>
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-24 h-24 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center">
                <Bluetooth className="h-10 w-10 text-blue-400" />
              </div>
            </div>
            <p className="text-lg font-medium text-blue-400">Esperando balanza...</p>
            <p className="text-sm text-slate-400 mt-2 text-center">
              Subite a la balanza y el peso se registra solo
            </p>
          </>
        )}

        {status === 'receiving' && (
          <>
            <div className="mb-6 w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-amber-400">{liveWeight?.toFixed(1)}</span>
            </div>
            <p className="text-lg font-medium text-amber-400">Midiendo...</p>
            <p className="text-sm text-slate-400 mt-2">Quedate quieto en la balanza</p>
          </>
        )}

        {status === 'stabilized' && (
          <>
            <div className="mb-6 w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-emerald-400">{liveWeight?.toFixed(1)}</span>
            </div>
            <p className="text-lg font-medium text-emerald-400">Guardado</p>
            <p className="text-sm text-slate-400 mt-2">Peso registrado correctamente</p>
          </>
        )}

        {status === 'idle' && (
          <>
            <div className="mb-6 w-24 h-24 rounded-full bg-blue-500/10 border-2 border-blue-500/50 flex items-center justify-center">
              <Bluetooth className="h-10 w-10 text-blue-400" />
            </div>
            <p className="text-lg font-medium text-slate-300 mb-2">Modo puente</p>
            <p className="text-sm text-slate-400 mb-6 text-center max-w-xs">
              Subite a la balanza para que se encienda, despues toca el boton
            </p>
            <button
              onClick={startScan}
              className="px-8 py-3 bg-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all"
            >
              Conectar balanza
            </button>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm text-rose-400 text-center">{error}</p>
        )}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="border-t border-slate-700 px-4 py-3 max-h-48 overflow-y-auto">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Registros recientes</p>
          <div className="space-y-1.5">
            {log.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${entry.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="font-medium">{entry.weight.toFixed(1)} kg</span>
                </div>
                <span className="text-slate-500 text-xs">{timeStr(entry.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
        <Wifi className="h-3.5 w-3.5" />
        <span>Pantalla activa — los pesos se sincronizan con Firebase</span>
      </div>
    </div>
  )
}
