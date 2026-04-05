import { Scale, ArrowUp } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-full p-8 mb-5 shadow-inner">
        <Scale className="h-12 w-12 text-blue-400" strokeWidth={1.5} />
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-2">
        Comienza tu seguimiento
      </h3>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
        Registra tu primer peso usando el formulario de arriba. Tus datos se guardan
        automáticamente en este dispositivo.
      </p>

      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 animate-bounce">
        <ArrowUp className="h-3.5 w-3.5" />
        <span>Registra tu primer peso</span>
      </div>
    </div>
  )
}
