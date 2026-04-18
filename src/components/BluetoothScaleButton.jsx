import { Bluetooth, BluetoothSearching, Check, X } from 'lucide-react'

export default function BluetoothScaleButton({ status, liveWeight, error, onStart, onStop, isSupported }) {
  if (!isSupported) return null

  return (
    <div className="mb-3">
      {status === 'idle' && (
        <button
          type="button"
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                     border-2 border-dashed border-slate-200 dark:border-slate-600
                     rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400
                     hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500
                     dark:hover:text-blue-400 transition-all"
        >
          <Bluetooth className="h-4 w-4" />
          Conectar balanza
        </button>
      )}

      {status === 'scanning' && (
        <button
          type="button"
          onClick={onStop}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                     bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800
                     rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400
                     hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
        >
          <BluetoothSearching className="h-4 w-4 animate-pulse" />
          Buscando balanza...
        </button>
      )}

      {status === 'receiving' && (
        <div className="w-full flex items-center justify-between px-4 py-2.5
                        bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800
                        rounded-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Recibiendo: {liveWeight?.toFixed(1)} kg
            </span>
          </div>
          <button type="button" onClick={onStop} className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {status === 'stabilized' && (
        <div className="w-full flex items-center justify-between px-4 py-2.5
                        bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800
                        rounded-xl">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {liveWeight?.toFixed(1)} kg
            </span>
          </div>
          <button type="button" onClick={onStop} className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-rose-500">{error}</p>
      )}
    </div>
  )
}
