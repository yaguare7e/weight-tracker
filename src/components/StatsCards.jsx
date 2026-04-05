import { Scale, Activity, TrendingDown, TrendingUp, Minus, BarChart3, Target, Heart, CalendarDays } from 'lucide-react'

const KG_TO_LBS = 2.20462

function toUnit(kg, unit) {
  return unit === 'lbs' ? kg * KG_TO_LBS : kg
}

function fmt(value, unit) {
  return `${value.toFixed(1)} ${unit}`
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StatsCards({ entries, unit, goalKg, heightCm }) {
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))

  const current  = sorted[0]
  const initial  = sorted[sorted.length - 1]
  const isSingle = sorted.length === 1

  const currentW = toUnit(current.weightKg, unit)
  const initialW = toUnit(initial.weightKg, unit)
  const change   = toUnit(current.weightKg - initial.weightKg, unit)
  const isLoss   = change < -0.05
  const isGain   = change > 0.05

  const available  = sorted.slice(0, Math.min(4, sorted.length))
  const avgKg      = available.reduce((s, e) => s + e.weightKg, 0) / available.length
  const movAvg     = toUnit(avgKg, unit)
  const hasFullAvg = sorted.length >= 4

  // Monthly average
  const currentMonth = new Date().toISOString().slice(0, 7)
  const thisMonth    = sorted.filter(e => e.date.startsWith(currentMonth))
  const monthAvg     = thisMonth.length > 0
    ? toUnit(thisMonth.reduce((s, e) => s + e.weightKg, 0) / thisMonth.length, unit)
    : null
  const monthName    = new Date().toLocaleDateString('es-ES', { month: 'long' })

  // BMI
  const bmi = heightCm ? current.weightKg / Math.pow(heightCm / 100, 2) : null
  const bmiCat   = !bmi ? '' : bmi < 18.5 ? 'Bajo peso' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Sobrepeso' : 'Obesidad'
  const bmiColor = !bmi ? 'slate' : bmi < 18.5 ? 'amber' : bmi < 25 ? 'emerald' : bmi < 30 ? 'amber' : 'rose'

  // Goal
  const goalDisp  = goalKg != null ? toUnit(goalKg, unit) : null
  const remaining = goalKg != null ? toUnit(current.weightKg - goalKg, unit) : null
  const isAtGoal  = remaining !== null && Math.abs(remaining) <= 0.1

  const showSecondary = bmi !== null || goalKg !== null || monthAvg !== null

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Peso Actual"
          value={fmt(currentW, unit)}
          sub={`Último: ${fmtDate(current.date)}`}
          icon={<Scale className="h-4.5 w-4.5" />}
          color="blue"
        />
        <StatCard
          label="Peso Inicial"
          value={fmt(initialW, unit)}
          sub={`Inicio: ${fmtDate(initial.date)}`}
          icon={<Activity className="h-4.5 w-4.5" />}
          color="slate"
        />
        <StatCard
          label="Cambio Total"
          value={
            isSingle
              ? '—'
              : `${isGain ? '+' : ''}${change.toFixed(1)} ${unit}`
          }
          sub={isSingle ? 'Agrega más registros' : isLoss ? 'Pérdida de peso' : isGain ? 'Ganancia de peso' : 'Sin cambio'}
          icon={isLoss ? <TrendingDown className="h-4.5 w-4.5" /> : isGain ? <TrendingUp className="h-4.5 w-4.5" /> : <Minus className="h-4.5 w-4.5" />}
          color={isLoss ? 'emerald' : isGain ? 'rose' : 'slate'}
        />
        <StatCard
          label="Promedio (4 últ.)"
          value={fmt(movAvg, unit)}
          sub={hasFullAvg ? 'Últimas 4 mediciones' : `${available.length} de 4 disponibles`}
          icon={<BarChart3 className="h-4.5 w-4.5" />}
          color="violet"
          badge={!hasFullAvg ? 'Parcial' : null}
        />
      </div>

      {showSecondary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthAvg !== null && (
            <StatCard
              label="Promedio del Mes"
              value={fmt(monthAvg, unit)}
              sub={`${thisMonth.length} registro${thisMonth.length !== 1 ? 's' : ''} en ${monthName}`}
              icon={<CalendarDays className="h-4.5 w-4.5" />}
              color="violet"
            />
          )}
          {bmi !== null && (
            <StatCard
              label="IMC"
              value={bmi.toFixed(1)}
              sub={bmiCat}
              icon={<Heart className="h-4.5 w-4.5" />}
              color={bmiColor}
            />
          )}
          {goalKg !== null && (
            <StatCard
              label="Peso Objetivo"
              value={isAtGoal ? '¡Logrado!' : `Faltan ${Math.abs(remaining).toFixed(1)} ${unit}`}
              sub={`Meta: ${goalDisp.toFixed(1)} ${unit}`}
              icon={<Target className="h-4.5 w-4.5" />}
              color={isAtGoal ? 'emerald' : 'blue'}
              badge={isAtGoal ? '✓' : null}
            />
          )}
        </div>
      )}
    </>
  )
}

// ─── Color map ──────────────────────────────────────────────────────────────
const colors = {
  blue:    { card: 'bg-blue-50 dark:bg-blue-900/20',       icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',       value: 'text-blue-800 dark:text-blue-300'    },
  slate:   { card: 'bg-white dark:bg-slate-800',           icon: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',       value: 'text-slate-800 dark:text-slate-200'  },
  emerald: { card: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400', value: 'text-emerald-800 dark:text-emerald-300' },
  rose:    { card: 'bg-rose-50 dark:bg-rose-900/20',       icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',       value: 'text-rose-800 dark:text-rose-300'    },
  violet:  { card: 'bg-violet-50 dark:bg-violet-900/20',   icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400', value: 'text-violet-800 dark:text-violet-300' },
  amber:   { card: 'bg-amber-50 dark:bg-amber-900/20',     icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',   value: 'text-amber-800 dark:text-amber-300'  },
}

function StatCard({ label, value, sub, icon, color, badge }) {
  const c = colors[color] || colors.slate
  return (
    <div className={`${c.card} rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 transition-colors duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.icon} rounded-xl p-2`}>
          {icon}
        </div>
        {badge && (
          <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-medium px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold leading-tight ${c.value}`}>{value}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</p>
    </div>
  )
}
