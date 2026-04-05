import { Scale, Moon, Sun, Settings } from 'lucide-react'

export default function Header({ unit, onUnitChange, dark, onToggleDark, onOpenSettings }) {
  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-xl p-2 shadow-sm">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight tracking-tight">
              WeightTracker
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight">
              Seguimiento de peso corporal
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">

          {/* Unit toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
            {['kg', 'lbs'].map((u) => (
              <button
                key={u}
                onClick={() => onUnitChange(u)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                  unit === u
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Configuración"
          >
            <Settings className="h-4 w-4" />
          </button>

        </div>
      </div>
    </header>
  )
}
