import { useState } from 'react'
import { X, Target, Ruler } from 'lucide-react'

const KG_TO_LBS = 2.20462

export default function SettingsPanel({ unit, goalKg, heightCm, onSaveGoal, onSaveHeight, onClose }) {
  const [goalVal, setGoalVal] = useState(
    goalKg != null
      ? (unit === 'lbs' ? (goalKg * KG_TO_LBS).toFixed(1) : goalKg.toFixed(1))
      : ''
  )
  const [heightVal, setHeightVal] = useState(heightCm != null ? String(heightCm) : '')

  function handleSave() {
    const gv = parseFloat(goalVal)
    if (!goalVal || isNaN(gv) || gv <= 0) {
      onSaveGoal(null)
    } else {
      onSaveGoal(unit === 'lbs' ? gv / KG_TO_LBS : gv)
    }
    const hv = parseFloat(heightVal)
    if (!heightVal || isNaN(hv) || hv <= 0) {
      onSaveHeight(null)
    } else {
      onSaveHeight(hv)
    }
    onClose()
  }

  const inputClass = `w-full px-3 py-2.5 pr-12 border border-slate-200 dark:border-slate-600 rounded-xl
    text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700
    placeholder:text-slate-300 dark:placeholder:text-slate-500
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">Configuración</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">

          {/* Height */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Altura</span>
            </div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Altura (cm)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="100"
                max="250"
                value={heightVal}
                onChange={e => setHeightVal(e.target.value)}
                placeholder="170"
                className={inputClass}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300 dark:text-slate-500">cm</span>
            </div>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Necesario para calcular tu IMC.</p>
          </div>

          {/* Goal weight */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Peso Objetivo</span>
            </div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Peso objetivo ({unit})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                value={goalVal}
                onChange={e => setGoalVal(e.target.value)}
                placeholder={unit === 'kg' ? '70.0' : '154.0'}
                className={inputClass}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300 dark:text-slate-500">{unit}</span>
            </div>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Se mostrará como línea de referencia en el gráfico. Deja vacío para quitar.</p>
          </div>

        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
