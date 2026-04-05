import { useState } from 'react'
import { X, Target, Ruler, Link2, Copy, Check, Bell, ChevronRight } from 'lucide-react'
import { isFirebaseConfigured } from '../lib/firebase'

const KG_TO_LBS = 2.20462

export default function SettingsPanel({
  unit, goalKg, heightCm, onSaveGoal, onSaveHeight,
  syncKey, onSaveSyncKey, onClose, onOpenReminders,
}) {
  const [goalVal, setGoalVal] = useState(
    goalKg != null
      ? (unit === 'lbs' ? (goalKg * KG_TO_LBS).toFixed(1) : goalKg.toFixed(1))
      : ''
  )
  const [heightVal, setHeightVal] = useState(heightCm != null ? String(heightCm) : '')
  const [importKey, setImportKey] = useState('')
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(syncKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    // Goal
    const gv = parseFloat(goalVal)
    if (!goalVal || isNaN(gv) || gv <= 0) onSaveGoal(null)
    else onSaveGoal(unit === 'lbs' ? gv / KG_TO_LBS : gv)

    // Height
    const hv = parseFloat(heightVal)
    if (!heightVal || isNaN(hv) || hv <= 0) onSaveHeight(null)
    else onSaveHeight(hv)

    // Sync key import
    const trimmed = importKey.trim()
    if (trimmed && trimmed !== syncKey) onSaveSyncKey(trimmed)

    onClose()
  }

  const inputClass = `w-full px-3 py-2.5 pr-12 border border-slate-200 dark:border-slate-600 rounded-xl
    text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700
    placeholder:text-slate-300 dark:placeholder:text-slate-500
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`

  const labelClass = 'block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">Configuración</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">

          {/* ── Reminders ──────────────────────────────────────── */}
          <button
            onClick={() => { onClose(); onOpenReminders() }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Bell className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recordatorios</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Notificaciones para registrar tu peso</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
          </button>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* ── Height ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Altura</span>
            </div>
            <label className={labelClass}>Altura (cm)</label>
            <div className="relative">
              <input
                type="number" step="0.5" min="100" max="250"
                value={heightVal} onChange={e => setHeightVal(e.target.value)}
                placeholder="170" className={inputClass}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300 dark:text-slate-500">cm</span>
            </div>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Necesario para calcular tu IMC.</p>
          </div>

          {/* ── Goal weight ────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Peso Objetivo</span>
            </div>
            <label className={labelClass}>Peso objetivo ({unit})</label>
            <div className="relative">
              <input
                type="number" step="0.1" min="1"
                value={goalVal} onChange={e => setGoalVal(e.target.value)}
                placeholder={unit === 'kg' ? '70.0' : '154.0'} className={inputClass}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300 dark:text-slate-500">{unit}</span>
            </div>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Se mostrará como línea de referencia en el gráfico. Deja vacío para quitar.</p>
          </div>

          {/* ── Sync key ───────────────────────────────────────── */}
          {isFirebaseConfigured && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sincronización</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                Copiá tu clave y pegala en otro dispositivo para ver los mismos datos.
              </p>

              {/* Current key display */}
              <label className={labelClass}>Tu clave</label>
              <div className="flex gap-2 mb-4">
                <code className="flex-1 min-w-0 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2.5 rounded-xl font-mono truncate">
                  {syncKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
                >
                  {copied
                    ? <><Check className="h-3.5 w-3.5 text-emerald-500" />Copiado</>
                    : <><Copy className="h-3.5 w-3.5" />Copiar</>
                  }
                </button>
              </div>

              {/* Import key */}
              <label className={labelClass}>Pegar clave de otro dispositivo</label>
              <input
                type="text"
                value={importKey}
                onChange={e => setImportKey(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className={`w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl
                  text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700
                  placeholder:text-slate-300 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono`}
              />
              <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
                Al guardar verás los datos del dispositivo que generó esa clave.
              </p>
            </div>
          )}

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
