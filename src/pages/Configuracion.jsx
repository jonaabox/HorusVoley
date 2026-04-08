import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const DIAS_SEMANA = [
  { valor: 0, label: 'Domingo'  },
  { valor: 1, label: 'Lunes'    },
  { valor: 2, label: 'Martes'   },
  { valor: 3, label: 'Miércoles'},
  { valor: 4, label: 'Jueves'   },
  { valor: 5, label: 'Viernes'  },
  { valor: 6, label: 'Sábado'   },
]

function DiaSelector({ value, onChange }) {
  // value es un string como "2,6" o "6"
  const seleccionados = value ? value.split(',').map(Number) : []

  const toggle = (diaValor) => {
    const set = new Set(seleccionados)
    if (set.has(diaValor)) {
      set.delete(diaValor)
    } else {
      set.add(diaValor)
    }
    onChange([...set].sort().join(','))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DIAS_SEMANA.map(d => (
        <button
          key={d.valor}
          type="button"
          onClick={() => toggle(d.valor)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
            seleccionados.includes(d.valor)
              ? 'bg-primary-800 text-white border-primary-800'
              : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
          }`}
        >
          {d.label}
        </button>
      ))}
    </div>
  )
}

export default function Configuracion() {
  const [valores, setValores]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => { fetchConfig() }, [])

  const fetchConfig = async () => {
    setLoading(true)
    const { data } = await supabase.from('configuracion').select('clave, valor')
    const mapa = {}
    ;(data ?? []).forEach(c => { mapa[c.clave] = c.valor })
    setValores(mapa)
    setLoading(false)
  }

  const set = (clave, valor) => setValores(v => ({ ...v, [clave]: valor }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    await Promise.all(
      Object.entries(valores).map(([clave, valor]) =>
        supabase.from('configuracion').upsert({ clave, valor }, { onConflict: 'clave' })
      )
    )
    setSaving(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
        <p className="text-gray-500 text-sm mt-1">Precios, días de entrenamiento y parámetros del sistema</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Precios */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-3">Precios mensuales (Gs.)</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">1 vez por semana</label>
            <input
              type="number" min="0"
              value={valores['precio_1_vez_semana'] ?? ''}
              onChange={e => set('precio_1_vez_semana', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">2 veces por semana</label>
            <input
              type="number" min="0"
              value={valores['precio_2_veces_semana'] ?? ''}
              onChange={e => set('precio_2_veces_semana', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Días de entrenamiento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-semibold text-gray-700 border-b pb-3">Días de entrenamiento</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1 vez por semana
            </label>
            <DiaSelector
              value={valores['dias_1_vez_semana'] ?? '6'}
              onChange={v => set('dias_1_vez_semana', v)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2 veces por semana
            </label>
            <DiaSelector
              value={valores['dias_2_veces_semana'] ?? '2,6'}
              onChange={v => set('dias_2_veces_semana', v)}
            />
          </div>
        </div>

        {/* Vencimiento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-3">Cobros</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Día de vencimiento de cuota</label>
            <p className="text-xs text-gray-400 mb-2">Día del mes a partir del cual se marca como vencido (ej: 5)</p>
            <input
              type="number" min="1" max="28"
              value={valores['dia_vencimiento_cuota'] ?? '5'}
              onChange={e => set('dia_vencimiento_cuota', e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Días de aviso antes del vencimiento
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Días de anticipación para mostrar la alerta de deudores próximos (ej: 5)
            </p>
            <input
              type="number" min="1" max="28"
              value={valores['dias_aviso_vencimiento'] ?? '5'}
              onChange={e => set('dias_aviso_vencimiento', e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
          >
            <Save size={15} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {guardado && (
            <p className="mt-2 text-sm text-green-600">Cambios guardados correctamente.</p>
          )}
        </div>
      </form>
    </div>
  )
}
