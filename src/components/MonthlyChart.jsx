import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

function buildMonthlyData(entries) {
  const map = {}
  entries.forEach(e => {
    const month = e.date.slice(0, 7) // YYYY-MM
    if (!map[month]) map[month] = []
    map[month].push(e.weightKg)
  })

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, weights]) => {
      const avg    = parseFloat((weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1))
      const [y, m] = month.split('-')
      const label  = new Date(y, parseInt(m) - 1, 1)
        .toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      return { month, label, avg, count: weights.length }
    })
}

function fmtMonthFull(monthStr) {
  const [y, m] = monthStr.split('-')
  return new Date(y, parseInt(m) - 1, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

export default function MonthlyChart({ entries, goalKg, dark }) {
  const data = buildMonthlyData(entries)
  if (data.length < 2) return null

  const currentMonth = new Date().toISOString().slice(0, 7)

  const avgs = data.map(d => d.avg)
  const minA = Math.min(...avgs)
  const maxA = Math.max(...avgs)
  const pad  = Math.max((maxA - minA) * 0.3, 1.5)
  const yMin = parseFloat((minA - pad).toFixed(1))
  const yMax = parseFloat((maxA + pad).toFixed(1))

  const goalVal = goalKg != null ? parseFloat(goalKg.toFixed(1)) : null

  const gridColor  = dark ? '#1e293b' : '#f1f5f9'
  const axisColor  = dark ? '#475569' : '#94a3b8'
  const axisLineCl = dark ? '#1e293b' : '#e2e8f0'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-colors duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Promedio Mensual</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {data.length} meses — barra más oscura = mes actual
          </p>
        </div>
        <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">
          kg
        </span>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={{ stroke: axisLineCl }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={v => v.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip dark={dark} />} />
            {goalVal !== null && (
              <ReferenceLine
                y={goalVal}
                stroke="#10b981"
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
            )}
            <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
              {data.map(d => (
                <Cell
                  key={d.month}
                  fill={d.month === currentMonth ? '#2563eb' : (dark ? '#334155' : '#93c5fd')}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, dark }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={`rounded-xl shadow-lg px-3.5 py-2.5 border ${
      dark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'
    }`}>
      <p className={`text-xs mb-0.5 capitalize ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
        {fmtMonthFull(d.month)}
      </p>
      <p className={`text-base font-bold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
        {d.avg} <span className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>kg</span>
      </p>
      <p className={`text-xs mt-0.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
        {d.count} registro{d.count !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
