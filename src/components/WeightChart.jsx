import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const KG_TO_LBS = 2.20462

function fmtAxisDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function fmtTooltipDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function WeightChart({ entries, unit, goalKg, dark }) {
  const data = [...entries]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => ({
      rawDate: e.date,
      label: fmtAxisDate(e.date),
      weight: parseFloat(
        (unit === 'lbs' ? e.weightKg * KG_TO_LBS : e.weightKg).toFixed(1)
      ),
    }))

  const goalVal = goalKg != null
    ? parseFloat((unit === 'lbs' ? goalKg * KG_TO_LBS : goalKg).toFixed(1))
    : null

  const weights = data.map(d => d.weight)
  const allVals = goalVal !== null ? [...weights, goalVal] : weights
  const minW = Math.min(...allVals)
  const maxW = Math.max(...allVals)
  const pad  = Math.max((maxW - minW) * 0.25, 1.5)
  const yMin = parseFloat((minW - pad).toFixed(1))
  const yMax = parseFloat((maxW + pad).toFixed(1))

  const gridColor   = dark ? '#1e293b' : '#f1f5f9'
  const axisColor   = dark ? '#475569' : '#94a3b8'
  const axisLineCl  = dark ? '#1e293b' : '#e2e8f0'
  const dotStroke   = dark ? '#1e293b' : '#ffffff'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 transition-colors duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Evolución del Peso</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {data.length} registro{data.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {goalVal !== null && (
            <span className="text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg">
              Meta: {goalVal} {unit}
            </span>
          )}
          <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">
            {unit}
          </span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={{ stroke: axisLineCl }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: axisColor }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={v => v.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip unit={unit} dark={dark} />} />
            {goalVal !== null && (
              <ReferenceLine
                y={goalVal}
                stroke="#10b981"
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
            )}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6', stroke: dotStroke, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: dotStroke, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, unit, dark }) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className={`rounded-xl shadow-lg px-3.5 py-2.5 border ${
      dark
        ? 'bg-slate-700 border-slate-600'
        : 'bg-white border-slate-200'
    }`}>
      <p className="text-xs text-slate-400 mb-0.5">
        {fmtTooltipDate(point.payload.rawDate)}
      </p>
      <p className={`text-base font-bold ${dark ? 'text-slate-100' : 'text-slate-900'}`}>
        {point.value}{' '}
        <span className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{unit}</span>
      </p>
    </div>
  )
}
