import { useState } from 'react'
import { Bell, Plus, Trash2, X } from 'lucide-react'
import { requestAndRegister, notifSupported } from '../lib/fcm.js'

// L M X J V S D  (week starting Monday, Spanish abbreviations)
const DAYS = [
  { label: 'L', v: 1 },
  { label: 'M', v: 2 },
  { label: 'X', v: 3 },
  { label: 'J', v: 4 },
  { label: 'V', v: 5 },
  { label: 'S', v: 6 },
  { label: 'D', v: 0 },
]

export default function RemindersPanel({
  reminders, onAdd, onUpdate, onRemove,
  permission, onPermissionChange,
  syncKey, onClose,
}) {
  const [requesting, setRequesting] = useState(false)
  const [err, setErr]               = useState('')

  async function handleEnable() {
    setRequesting(true)
    setErr('')
    try {
      await requestAndRegister(syncKey)
      onPermissionChange('granted')
    } catch (e) {
      setErr(e.message)
      onPermissionChange(typeof Notification !== 'undefined' ? Notification.permission : 'default')
    } finally {
      setRequesting(false)
    }
  }

  function handleAdd() {
    onAdd({
      time: '08:00',
      days: [1, 2, 3, 4, 5, 6, 0],
      enabled: true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4.5 w-4.5 text-blue-500" />
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">Recordatorios</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Permission banner */}
        {permission !== 'granted' && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              {permission === 'denied' ? 'Notificaciones bloqueadas' : 'Activar notificaciones'}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mb-3">
              {permission === 'denied'
                ? 'Habilitálas desde Ajustes del sistema o del navegador.'
                : 'Necesitás dar permiso para recibir recordatorios en este dispositivo.'}
            </p>
            {permission !== 'denied' && notifSupported() && (
              <button
                onClick={handleEnable}
                disabled={requesting}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {requesting ? 'Activando…' : 'Activar notificaciones'}
              </button>
            )}
            {!notifSupported() && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Tu navegador no soporta notificaciones web.
              </p>
            )}
            {err && <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">{err}</p>}
          </div>
        )}

        {permission === 'granted' && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            Notificaciones activadas en este dispositivo
          </p>
        )}

        {/* iOS install note */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 leading-relaxed">
          En iPhone: instalá la app desde Safari{' '}
          (<strong className="font-medium text-slate-500 dark:text-slate-400">Compartir</strong>
          {' → '}
          <strong className="font-medium text-slate-500 dark:text-slate-400">Agregar a Inicio</strong>)
          {' '}antes de activar notificaciones.
        </p>

        {/* Reminder cards */}
        <div className="space-y-3 mb-4">
          {reminders.map(r => (
            <ReminderCard
              key={r.id}
              reminder={r}
              onUpdate={c => onUpdate(r.id, c)}
              onRemove={() => onRemove(r.id)}
            />
          ))}
          {reminders.length === 0 && (
            <p className="text-sm text-center text-slate-400 dark:text-slate-500 py-6">
              No tenés recordatorios todavía.
            </p>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={permission !== 'granted'}
          className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-500 dark:hover:border-blue-700 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Nuevo recordatorio
        </button>
      </div>
    </div>
  )
}

function ReminderCard({ reminder, onUpdate, onRemove }) {
  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
      <div className="flex items-center gap-3 mb-3">
        <input
          type="time"
          value={reminder.time ?? '08:00'}
          onChange={e => onUpdate({ time: e.target.value })}
          className="text-xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-none outline-none p-0"
        />
        <div className="flex-1" />
        {/* Enable/disable toggle */}
        <button
          onClick={() => onUpdate({ enabled: !reminder.enabled })}
          aria-label={reminder.enabled ? 'Desactivar' : 'Activar'}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            reminder.enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
          }`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
            reminder.enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Day toggles */}
      <div className="flex gap-1">
        {DAYS.map(({ label, v }) => {
          const on = (reminder.days ?? []).includes(v)
          return (
            <button
              key={v}
              onClick={() => {
                const days = on
                  ? (reminder.days ?? []).filter(d => d !== v)
                  : [...(reminder.days ?? []), v]
                onUpdate({ days })
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                on
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
