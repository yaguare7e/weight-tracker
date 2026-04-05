import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const KG_TO_LBS = 2.20462

function toUnit(kg, unit) {
  return unit === 'lbs' ? kg * KG_TO_LBS : kg
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function WeightHistory({ entries, unit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null)
  const [showAll, setShowAll] = useState(false)

  // Newest first
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))
  const visible = showAll ? sorted : sorted.slice(0, 8)

  const handleDelete = async (id) => {
    if (confirmId === id) {
      await onDelete(id)
      setConfirmId(null)
    } else {
      setConfirmId(id)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Historial de Registros</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''} en total
          </p>
        </div>
      </div>

      {/* Table header — desktop only */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fecha</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Peso</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cambio</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Acción</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {visible.map((entry, idx) => {
          const weight   = toUnit(entry.weightKg, unit)
          const prev     = sorted[idx + 1]
          const change   = prev ? weight - toUnit(prev.weightKg, unit) : null
          const isLatest = idx === 0

          return (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
            >
              {/* Left — date + badge */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    isLatest ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 capitalize truncate">
                    {fmtDate(entry.date)}
                  </p>
                  {isLatest && (
                    <span className="inline-block mt-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                      Actual
                    </span>
                  )}
                </div>
              </div>

              {/* Right — weight + change + delete */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {weight.toFixed(1)}&nbsp;{unit}
                </span>

                {change !== null && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full tabular-nums ${
                      change < -0.05
                        ? 'text-emerald-700 bg-emerald-50'
                        : change > 0.05
                        ? 'text-rose-700 bg-rose-50'
                        : 'text-slate-500 bg-slate-100'
                    }`}
                  >
                    {change > 0 ? '+' : ''}{change.toFixed(1)}
                  </span>
                )}

                {/* Delete / confirm */}
                {confirmId === entry.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs px-2 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-medium"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Show more / less */}
      {sorted.length > 8 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showAll ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Mostrar menos</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Ver {sorted.length - 8} registros más</>
            )}
          </button>
        </div>
      )}

    </div>
  )
}
