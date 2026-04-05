import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, Pencil, Check, X, Download } from 'lucide-react'

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function exportCSV(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
  const header = ['Fecha', 'Peso (kg)']
  const rows   = sorted.map(e => [e.date, e.weightKg.toFixed(2)])
  const csv    = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pesos-${todayISO()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function WeightHistory({ entries, onDelete, onUpdate }) {
  const [confirmId, setConfirmId] = useState(null)
  const [showAll, setShowAll]     = useState(false)
  const [editId, setEditId]       = useState(null)
  const [editWeight, setEditWeight] = useState('')
  const [editDate, setEditDate]   = useState('')

  const sorted  = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))
  const visible = showAll ? sorted : sorted.slice(0, 8)

  const handleDelete = async (id) => {
    if (confirmId === id) {
      await onDelete(id)
      setConfirmId(null)
    } else {
      setConfirmId(id)
      setEditId(null)
    }
  }

  const startEdit = (entry) => {
    setEditId(entry.id)
    setEditWeight(entry.weightKg.toFixed(1))
    setEditDate(entry.date)
    setConfirmId(null)
  }

  const saveEdit = async (id) => {
    const val = parseFloat(editWeight)
    if (isNaN(val) || val <= 0) return
    await onUpdate({ id, weightKg: val, date: editDate })
    setEditId(null)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-200">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Historial de Registros</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => exportCSV(entries)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400
                     hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1.5 rounded-lg
                     hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Exportar CSV"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>

      {/* Table header — desktop only */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Fecha</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Peso</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Cambio</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Editar</span>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Borrar</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {visible.map((entry, idx) => {
          const weight = entry.weightKg
          const prev   = sorted[idx + 1]
          const change = prev ? weight - prev.weightKg : null
          const isLatest = idx === 0

          // ── Edit mode ──────────────────────────────────────────────────
          if (editId === entry.id) {
            return (
              <div
                key={entry.id}
                className="px-5 py-3 bg-blue-50 dark:bg-blue-900/10 flex flex-col sm:flex-row items-start sm:items-center gap-3"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  <div className="relative w-32">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={editWeight}
                      onChange={e => setEditWeight(e.target.value)}
                      className="w-full px-3 py-1.5 pr-10 text-sm border border-blue-300 dark:border-blue-600 rounded-lg
                                 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">kg</span>
                  </div>
                  <input
                    type="date"
                    value={editDate}
                    max={todayISO()}
                    onChange={e => setEditDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded-lg
                               text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700
                               focus:outline-none focus:ring-2 focus:ring-blue-500
                               [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => saveEdit(entry.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                </div>
              </div>
            )
          }

          // ── View mode ──────────────────────────────────────────────────
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {/* Left — date + badge */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${isLatest ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize truncate">
                    {fmtDate(entry.date)}
                  </p>
                  {isLatest && (
                    <span className="inline-block mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">
                      Actual
                    </span>
                  )}
                </div>
              </div>

              {/* Right — weight + change + actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {weight.toFixed(1)}&nbsp;kg
                </span>

                {change !== null && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full tabular-nums ${
                    change < -0.05
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                      : change > 0.05
                      ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30'
                      : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'
                  }`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}
                  </span>
                )}

                {/* Edit */}
                <button
                  onClick={() => startEdit(entry)}
                  className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Editar registro"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

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
                      className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
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
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {showAll ? (
              <><ChevronUp className="h-3.5 w-3.5" />Mostrar menos</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" />Ver {sorted.length - 8} registros más</>
            )}
          </button>
        </div>
      )}

    </div>
  )
}
