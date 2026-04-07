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

  // Formato seguro para WhatsApp Paraguay (removiendo el 0 inicial del 09...)
  let numeroLimpio = alumno.telefono?.replace(/\D/g, '') || ''
  if (numeroLimpio.startsWith('0')) {
    numeroLimpio = numeroLimpio.substring(1)
  }

  const mensaje = `¡Hola, ${alumno.nombre_completo}! 🏐

Esperamos que estés disfrutando de las clases en Horus Voley.

Te enviamos este recordatorio porque registramos un saldo pendiente de ${totalMeses} mes${totalMeses !== 1 ? 'es' : ''}. Para nosotros es fundamental contar con tu apoyo para mantener el nivel de los entrenamientos. 🛡️

🗓️ ¿Nos confirmas si puedes ponerte al día esta semana?
Si tienes alguna duda con los montos o ya realizaste el pago, por favor envíanos el comprobante para actualizar tu ficha.

¡Muchas gracias por tu compromiso! 🦅`

  const waLink = `https://web.whatsapp.com/send/?phone=595${numeroLimpio}&text=${encodeURIComponent(mensaje)}&type=phone_number&app_absent=0`

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
          <div className="flex flex-col gap-3">
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

            {/* Redes o Whatsapp batch simulado */}
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-fit items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
              onClick={(e) => {
                if (!alumno.telefono || numeroLimpio.length < 8) {
                  e.preventDefault()
                  alert('Este alumno no tiene un número de teléfono válido registrado.')
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>
              Enviar Whatsapp
            </a>
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
      supabase.from('alumnos').select('id, nombre_completo, frecuencia, fecha_inscripcion, telefono').eq('estado', 'activo'),
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
