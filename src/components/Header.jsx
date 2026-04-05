import { Scale } from 'lucide-react'

export default function Header({ unit, onUnitChange }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-xl p-2 shadow-sm">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">
              WeightTracker
            </h1>
            <p className="text-xs text-slate-400 leading-tight">
              Seguimiento de peso corporal
            </p>
          </div>
        </div>

        {/* Unit toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
          {['kg', 'lbs'].map((u) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                unit === u
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

      </div>
    </header>
  )
}
