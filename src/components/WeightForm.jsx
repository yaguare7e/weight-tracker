import { useState } from 'react'
import { Plus } from 'lucide-react'

const todayISO = () => new Date().toISOString().split('T')[0]

export default function WeightForm({ onAdd, unit }) {
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = parseFloat(weight)

    if (!weight || isNaN(val) || val <= 0) {
      setError('Ingresa un peso válido.')
      return
    }
    const maxKg = unit === 'lbs' ? 1100 : 500
    if (val > maxKg) {
      setError('El peso ingresado parece demasiado alto.')
      return
    }
    if (!date) {
      setError('Selecciona una fecha.')
      return
    }

    setError('')
    setSaving(true)
    const weightKg = unit === 'lbs' ? val / 2.20462 : val
    await onAdd({ weightKg, date })
    setWeight('')
    setDate(todayISO())
    setSaving(false)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-colors duration-200">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2 text-sm">
        <span className="flex items-center justify-center w-5 h-5 bg-blue-600 rounded-full">
          <Plus className="h-3 w-3 text-white" />
        </span>
        Registrar nuevo peso
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* Weight + Date side by side on all screen sizes */}
        <div className="flex gap-3">

          {/* Weight input */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Peso ({unit})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="1"
                value={weight}
                onChange={(e) => { setWeight(e.target.value); setError('') }}
                placeholder={unit === 'kg' ? '70.5' : '155.0'}
                className="w-full px-3 py-2.5 pr-12 border border-slate-200 dark:border-slate-600 rounded-xl
                           text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700
                           placeholder:text-slate-300 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300 dark:text-slate-500">
                {unit}
              </span>
            </div>
          </div>

          {/* Date input */}
          <div className="w-36 sm:w-44 flex-shrink-0">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl
                         text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all text-sm [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || !weight}
          className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium
                     text-sm hover:bg-blue-700 active:scale-95 transition-all duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center
                     justify-center gap-2"
        >
          {saving ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Registrar
            </>
          )}
        </button>

      </form>

      {error && (
        <p className="mt-2 text-xs text-rose-500">{error}</p>
      )}
    </div>
  )
}
