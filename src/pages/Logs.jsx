import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, AlertOctagon, Info, Zap, Trash2, RefreshCw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useConfirm } from '../hooks/useConfirm'

const LEVEL_META = {
  info:     { label: 'Info',     icon: Info,          row: 'hover:bg-gray-50',              badge: 'bg-gray-100 text-gray-600'          },
  warning:  { label: 'Warning',  icon: AlertTriangle,  row: 'bg-amber-50 hover:bg-amber-100',  badge: 'bg-amber-100 text-amber-700'        },
  error:    { label: 'Error',    icon: AlertOctagon,   row: 'bg-red-50 hover:bg-red-100',       badge: 'bg-red-100 text-red-700'            },
  critical: { label: 'Critical', icon: Zap,            row: 'bg-red-100 hover:bg-red-200',      badge: 'bg-red-700 text-white'              },
}

const TODOS_NIVELES = ['critical', 'error', 'warning', 'info']

function MetadataViewer({ data }) {
  const [abierto, setAbierto] = useState(false)
  if (!data) return <span className="text-gray-400 text-xs">—</span>
  return (
    <div>
      <button
        onClick={() => setAbierto(v => !v)}
        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 transition"
      >
        {abierto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {abierto ? 'Ocultar' : 'Ver metadata'}
      </button>
      {abierto && (
        <pre className="mt-2 text-xs bg-gray-900 text-green-300 rounded-lg p-3 overflow-auto max-h-48 leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function Logs() {
  const { confirm, ConfirmModal } = useConfirm()
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [limpiando, setLimpiando] = useState(false)
  const [filtroNivel, setFiltroNivel] = useState([])   // [] = todos
  const [filtroModulo, setFiltroModulo] = useState('')
  const [diasLimpiar, setDiasLimpiar] = useState(30)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('app_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const toggleNivel = (nivel) =>
    setFiltroNivel(prev =>
      prev.includes(nivel) ? prev.filter(n => n !== nivel) : [...prev, nivel]
    )

  const filtrados = logs.filter(l => {
    if (filtroNivel.length > 0 && !filtroNivel.includes(l.level)) return false
    if (filtroModulo && !l.module.toLowerCase().includes(filtroModulo.toLowerCase())) return false
    return true
  })

  const conteosPorNivel = TODOS_NIVELES.reduce((acc, n) => {
    acc[n] = logs.filter(l => l.level === n).length
    return acc
  }, {})

  const handleLimpiar = async () => {
    const ok = await confirm({
      title:   'Limpiar logs antiguos',
      message: `¿Eliminar todos los logs con más de ${diasLimpiar} días? Esta acción no se puede deshacer.`,
      variant: 'danger',
    })
    if (!ok) return
    setLimpiando(true)
    const { data, error } = await supabase.rpc('limpiar_logs_antiguos', { dias: diasLimpiar })
    setLimpiando(false)
    if (!error) {
      await fetchLogs()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Logs del sistema</h2>
          <p className="text-gray-500 text-sm mt-1">{logs.length} registros · últimos 500</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Resumen por nivel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TODOS_NIVELES.map(nivel => {
          const { label, icon: Icon, badge } = LEVEL_META[nivel]
          const count = conteosPorNivel[nivel]
          const activo = filtroNivel.includes(nivel)
          return (
            <button
              key={nivel}
              onClick={() => toggleNivel(nivel)}
              className={`bg-white rounded-xl border p-4 text-left transition ${
                activo ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${badge}`}>
                  <Icon size={11} className="inline mr-0.5" />{label}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filtros + Limpieza */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Filtrar por módulo</label>
          <input
            value={filtroModulo}
            onChange={e => setFiltroModulo(e.target.value)}
            placeholder="Ej: Pagos, ErrorBoundary..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
          />
        </div>
        {(filtroNivel.length > 0 || filtroModulo) && (
          <button
            onClick={() => { setFiltroNivel([]); setFiltroModulo('') }}
            className="text-xs text-gray-400 hover:text-red-500 transition pb-2"
          >
            Limpiar filtros
          </button>
        )}

        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Limpiar logs &gt; X días</label>
            <select
              value={diasLimpiar}
              onChange={e => setDiasLimpiar(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
            >
              {[7, 14, 30, 60, 90].map(d => (
                <option key={d} value={d}>{d} días</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleLimpiar}
            disabled={limpiando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 text-sm transition"
          >
            {limpiando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">No hay logs con los filtros actuales.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-950 text-primary-200 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium w-36">Fecha</th>
                  <th className="px-4 py-3 font-medium w-24">Nivel</th>
                  <th className="px-4 py-3 font-medium w-32">Módulo</th>
                  <th className="px-4 py-3 font-medium">Mensaje</th>
                  <th className="px-4 py-3 font-medium w-32">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(log => {
                  const meta = LEVEL_META[log.level] ?? LEVEL_META.info
                  const Icon = meta.icon
                  const fecha = new Date(log.created_at)
                  return (
                    <tr key={log.id} className={`transition-colors ${meta.row}`}>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                        {fecha.toLocaleDateString('es-PY')}{' '}
                        {fecha.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
                          <Icon size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 truncate max-w-[8rem]">
                        {log.module}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs">
                        <p className="truncate" title={log.message}>{log.message}</p>
                      </td>
                      <td className="px-4 py-3">
                        <MetadataViewer data={log.metadata} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal />
    </div>
  )
}
