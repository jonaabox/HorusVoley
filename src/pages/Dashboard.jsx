import { useEffect, useState } from 'react'
import { Users, DollarSign, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-center gap-5 border border-gray-100">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

// Calcula todos los meses adeudados de un alumno desde su inscripción
function calcularMesesDeuda(alumno, todosPagos, hoy, diaVenc) {
  const inscripcion = new Date(alumno.fecha_inscripcion + 'T00:00:00')
  let cursor = new Date(inscripcion.getFullYear(), inscripcion.getMonth(), 1)
  const limiteActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const mesesDeuda = []

  while (cursor <= limiteActual) {
    const mes  = cursor.getMonth() + 1
    const anio = cursor.getFullYear()

    // Si es el mes actual y todavía no llegó el día de vencimiento, no se cobra
    const esActual    = anio === hoy.getFullYear() && mes === (hoy.getMonth() + 1)
    const vencioHoy   = hoy.getDate() > diaVenc

    if (esActual && !vencioHoy) {
      cursor.setMonth(cursor.getMonth() + 1)
      continue
    }

    const pagado = todosPagos.some(
      p => p.alumno_id === alumno.id &&
           p.mes_correspondiente === mes &&
           p.año_correspondiente === anio
    )

    if (!pagado) {
      const vencimiento = new Date(anio, mes - 1, diaVenc)
      mesesDeuda.push({ mes, anio, vencido: hoy > vencimiento })
    }

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return mesesDeuda
}

function DeudorRow({ alumno }) {
  const [expandido, setExpandido] = useState(false)
  const totalMeses = alumno.mesesDeuda.length
  const tieneVencidos = alumno.mesesDeuda.some(m => m.vencido)

  return (
    <li className={`border-b border-gray-50 last:border-0 ${tieneVencidos ? 'bg-red-50/50' : 'bg-yellow-50/30'}`}>
      {/* Fila principal */}
      <button
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-black/5 transition"
        onClick={() => setExpandido(e => !e)}
      >
        <div>
          <p className="font-medium text-gray-800">{alumno.nombre_completo}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {alumno.frecuencia === 1 ? '1 vez/semana' : '2 veces/semana'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
              tieneVencidos ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {tieneVencidos ? 'Vencido' : 'Pendiente'}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {totalMeses} mes{totalMeses !== 1 ? 'es' : ''} adeudado{totalMeses !== 1 ? 's' : ''}
            </p>
          </div>
          {expandido
            ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
            : <ChevronDown size={16} className="text-gray-400 shrink-0" />
          }
        </div>
      </button>

      {/* Detalle de meses */}
      {expandido && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {alumno.mesesDeuda.map(({ mes, anio, vencido }) => (
              <span
                key={`${mes}-${anio}`}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  vencido
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                }`}
              >
                {MESES[mes - 1]} {anio}
              </span>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}

export default function Dashboard() {
  const [stats, setStats]     = useState({ totalAlumnos: 0, ingresosMes: 0, deudoresCount: 0 })
  const [deudores, setDeudores] = useState([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const hoy        = new Date()
    const mesActual  = hoy.getMonth() + 1
    const anioActual = hoy.getFullYear()

    // Configuración
    const { data: config } = await supabase.from('configuracion').select('clave, valor')
    const diaVenc = parseInt(config?.find(c => c.clave === 'dia_vencimiento_cuota')?.valor ?? '5')

    // Prefijo del mes actual para filtrar por fecha_pago (YYYY-MM)
    const prefijoMes = `${anioActual}-${String(mesActual).padStart(2, '0')}`

    // Alumnos activos + todos los pagos
    const [{ data: alumnosActivos }, { data: todosPagos }] = await Promise.all([
      supabase.from('alumnos').select('id, nombre_completo, frecuencia, fecha_inscripcion').eq('estado', 'activo'),
      supabase.from('pagos').select('alumno_id, mes_correspondiente, año_correspondiente, monto, fecha_pago'),
    ])

    // Ingresos del mes actual → usa fecha_pago (cuándo se cobró), no mes_correspondiente
    const ingresosMes = (todosPagos ?? [])
      .filter(p => p.fecha_pago?.startsWith(prefijoMes))
      .reduce((s, p) => s + parseFloat(p.monto || 0), 0)

    // Calcular deuda histórica por alumno
    const deudoresCalculados = (alumnosActivos ?? [])
      .map(a => ({
        ...a,
        mesesDeuda: calcularMesesDeuda(a, todosPagos ?? [], hoy, diaVenc),
      }))
      .filter(a => a.mesesDeuda.length > 0)
      .sort((a, b) => b.mesesDeuda.length - a.mesesDeuda.length) // más deudas primero

    setStats({
      totalAlumnos:   alumnosActivos?.length ?? 0,
      ingresosMes,
      deudoresCount:  deudoresCalculados.length,
    })
    setDeudores(deudoresCalculados)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Inicio</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen general de la academia</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard icon={Users}         label="Alumnos activos"    value={stats.totalAlumnos}                                       color="bg-primary-700" />
        <StatCard icon={DollarSign}    label="Ingresos del mes"   value={`Gs. ${stats.ingresosMes.toLocaleString('es-PY')}`}       color="bg-gold-600"    />
        <StatCard icon={AlertTriangle} label="Alumnos con deuda"  value={stats.deudoresCount}                                      color="bg-red-500"     />
      </div>

      {/* Lista de deudores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={18} className="text-gold-600" />
          <h3 className="font-semibold text-gray-800">Alumnos con cuotas pendientes</h3>
          <span className="ml-auto text-xs text-gray-400">
            {deudores.length} alumno{deudores.length !== 1 ? 's' : ''} · click para ver detalle
          </span>
        </div>

        {deudores.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Todos los alumnos están al día.
          </div>
        ) : (
          <ul>
            {deudores.map(a => <DeudorRow key={a.id} alumno={a} />)}
          </ul>
        )}
      </div>
    </div>
  )
}
