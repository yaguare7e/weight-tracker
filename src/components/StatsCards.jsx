import { Scale, Activity, TrendingDown, TrendingUp, Minus, BarChart3 } from 'lucide-react'

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

export default function StatsCards({ entries, unit }) {
  // entries already sorted newest-first from the hook
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date))

  const current  = sorted[0]
  const initial  = sorted[sorted.length - 1]
  const isSingle = sorted.length === 1

  const currentW = toUnit(current.weightKg, unit)
  const initialW = toUnit(initial.weightKg, unit)
  const change   = toUnit(current.weightKg - initial.weightKg, unit)
  const isLoss   = change < -0.05
  const isGain   = change > 0.05

  // Moving average — last 4 entries
  const available = sorted.slice(0, Math.min(4, sorted.length))
  const avgKg     = available.reduce((s, e) => s + e.weightKg, 0) / available.length
  const movAvg    = toUnit(avgKg, unit)
  const hasFullAvg = sorted.length >= 4

  return (
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
  )
}

// ─── Color map ──────────────────────────────────────────────────────────────
const colors = {
  blue:    { card: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-600',    value: 'text-blue-800'    },
  slate:   { card: 'bg-white',      icon: 'bg-slate-100 text-slate-600',  value: 'text-slate-800'   },
  emerald: { card: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-800' },
  rose:    { card: 'bg-rose-50',    icon: 'bg-rose-100 text-rose-600',    value: 'text-rose-800'    },
  violet:  { card: 'bg-violet-50',  icon: 'bg-violet-100 text-violet-600', value: 'text-violet-800'  },
}

function StatCard({ label, value, sub, icon, color, badge }) {
  const c = colors[color] || colors.slate
  return (
    <div className={`${c.card} rounded-2xl border border-slate-200 shadow-sm p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.icon} rounded-xl p-2`}>
          {icon}
        </div>
        {badge && (
          <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold leading-tight ${c.value}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>
    </div>
  )
}
