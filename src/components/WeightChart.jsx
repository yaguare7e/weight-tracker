import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
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

export default function WeightChart({ entries, unit }) {
  // Sort chronologically for the chart (left = oldest, right = newest)
  const data = [...entries]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(e => ({
      rawDate: e.date,
      label: fmtAxisDate(e.date),
      weight: parseFloat(
        (unit === 'lbs' ? e.weightKg * KG_TO_LBS : e.weightKg).toFixed(1)
      ),
    }))

  const weights = data.map(d => d.weight)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const pad  = Math.max((maxW - minW) * 0.25, 1.5)
  const yMin = parseFloat((minW - pad).toFixed(1))
  const yMax = parseFloat((maxW + pad).toFixed(1))

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-900">Evolución del Peso</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {data.length} registro{data.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
          {unit}
        </span>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={v => v.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5">
      <p className="text-xs text-slate-400 mb-0.5">
        {fmtTooltipDate(point.payload.rawDate)}
      </p>
      <p className="text-base font-bold text-slate-900">
        {point.value} <span className="text-sm font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  )
}
