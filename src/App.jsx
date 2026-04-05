import { useState } from 'react'
import Header from './components/Header.jsx'
import WeightForm from './components/WeightForm.jsx'
import StatsCards from './components/StatsCards.jsx'
import WeightChart from './components/WeightChart.jsx'
import WeightHistory from './components/WeightHistory.jsx'
import EmptyState from './components/EmptyState.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import { useWeightData } from './hooks/useWeightData.js'
import { useSettings } from './hooks/useSettings.js'
import { isFirebaseConfigured } from './lib/firebase.js'

export default function App() {
  const [unit, setUnit] = useState('kg')
  const [showSettings, setShowSettings] = useState(false)
  const { entries, loading, addEntry, removeEntry, updateEntry } = useWeightData()
  const { goalKg, setGoalKg, heightCm, setHeightCm, dark, setDark } = useSettings()

  const hasData = entries.length > 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Header
        unit={unit}
        onUnitChange={setUnit}
        dark={dark}
        onToggleDark={() => setDark(!dark)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Firebase mode indicator — only in dev */}
      {import.meta.env.DEV && (
        <div className={`text-center text-xs py-1 font-medium ${
          isFirebaseConfigured
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
        }`}>
          {isFirebaseConfigured
            ? 'Firebase conectado — datos sincronizados en la nube'
            : 'Modo local — datos guardados en localStorage (configura .env para Firebase)'}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 pt-6 space-y-5">

        <WeightForm onAdd={addEntry} unit={unit} />

        {loading ? (
          <Spinner />
        ) : hasData ? (
          <>
            <StatsCards entries={entries} unit={unit} goalKg={goalKg} heightCm={heightCm} />
            <WeightChart entries={entries} unit={unit} goalKg={goalKg} dark={dark} />
            <WeightHistory entries={entries} unit={unit} onDelete={removeEntry} onUpdate={updateEntry} />
          </>
        ) : (
          <EmptyState />
        )}

      </main>

      <footer className="text-center text-xs text-slate-300 dark:text-slate-600 pb-6">
        WeightTracker — datos guardados {isFirebaseConfigured ? 'en Firebase' : 'localmente'}
      </footer>

      {showSettings && (
        <SettingsPanel
          unit={unit}
          goalKg={goalKg}
          heightCm={heightCm}
          onSaveGoal={setGoalKg}
          onSaveHeight={setHeightCm}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
    </div>
  )
}
