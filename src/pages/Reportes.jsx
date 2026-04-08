import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, DollarSign, Eye, EyeOff, Users, Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MESES      = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const fmtGs = (n) => `Gs. ${Math.round(n).toLocaleString('es-PY')}`

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T00:00:00')
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function DistBar({ label, count, total, color = 'bg-primary-600' }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-600 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`${color} rounded-full h-2.5 transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-semibold text-gray-800 w-5 text-right">{count}</span>
      <span className="text-gray-400 text-xs w-9 text-right">{pct}%</span>
    </div>
  )
}

export default function Reportes() {
  const [resumen, setResumen]       = useState([])
  const [alumnos, setAlumnos]       = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [horarios, setHorarios]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [oculto, setOculto]         = useState(false)
  const anio = new Date().getFullYear()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [
      { data: pagos },
      { data: alumnosData },
      { data: asistenciaData },
      { data: horariosData },
    ] = await Promise.all([
      supabase.from('pagos').select('monto, fecha_pago')
        .gte('fecha_pago', `${anio}-01-01`)
        .lte('fecha_pago', `${anio}-12-31`),
      supabase.from('alumnos').select('id, nombre_completo, fecha_nacimiento, nivel, frecuencia, estado, horario_id'),
      supabase.from('asistencia').select('alumno_id, fecha, presente')
        .gte('fecha', `${anio}-01-01`),
      supabase.from('horarios').select('id, nombre'),
    ])

    const totalesPorMes = Array.from({ length: 12 }, (_, i) => {
      const prefijo = `${anio}-${String(i + 1).padStart(2, '0')}`
      const total = (pagos ?? [])
        .filter(p => p.fecha_pago?.startsWith(prefijo))
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0)
      return { mes: MESES[i], total }
    })

    setResumen(totalesPorMes)
    setAlumnos(alumnosData ?? [])
    setAsistencia(asistenciaData ?? [])
    setHorarios(horariosData ?? [])
    setLoading(false)
  }

  // ── Ingresos ────────────────────────────────────────────────────────────────
  const maxTotal  = Math.max(...resumen.map(r => r.total), 1)
  const totalAnio = resumen.reduce((sum, r) => sum + r.total, 0)
  const mesMayor  = resumen.reduce(
    (prev, curr) => curr.total > prev.total ? curr : prev,
    resumen[0] ?? { mes: '—', total: 0 }
  )

  // ── Alumnos ─────────────────────────────────────────────────────────────────
  const activos   = alumnos.filter(a => a.estado === 'activo')
  const inactivos = alumnos.filter(a => a.estado !== 'activo')

  const porNivel = ['principiante', 'intermedio', 'avanzado'].map(n => ({
    label: n.charAt(0).toUpperCase() + n.slice(1),
    count: activos.filter(a => a.nivel === n).length,
    color: n === 'principiante' ? 'bg-blue-500' : n === 'intermedio' ? 'bg-yellow-500' : 'bg-green-500',
  }))

  const por1 = activos.filter(a => a.frecuencia === 1).length
  const por2 = activos.filter(a => a.frecuencia === 2).length

  const porHorario = [
    ...horarios.map(h => ({ label: h.nombre, count: activos.filter(a => a.horario_id === h.id).length })),
    { label: 'Sin asignar', count: activos.filter(a => !a.horario_id).length },
  ].filter(h => h.count > 0)

  const GRUPOS_EDAD = [
    { label: 'Menores de 15', test: e => e < 15 },
    { label: '15 – 20 años',  test: e => e >= 15 && e <= 20 },
    { label: '21 – 30 años',  test: e => e >= 21 && e <= 30 },
    { label: '31 – 40 años',  test: e => e >= 31 && e <= 40 },
    { label: 'Más de 40',     test: e => e > 40 },
  ]
  const edades  = activos.map(a => calcularEdad(a.fecha_nacimiento))
  const sinEdad = edades.filter(e => e === null).length
  const conEdad = activos.length - sinEdad
  const porEdad = GRUPOS_EDAD.map(g => ({
    label: g.label,
    count: edades.filter(e => e !== null && g.test(e)).length,
  }))

  // ── Asistencia ───────────────────────────────────────────────────────────────
  const hoy = new Date()
  const prefijoMes   = `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const asisMes      = asistencia.filter(a => a.fecha?.startsWith(prefijoMes))
  const totalRegistros = asistencia.length
  const totalPresentes = asistencia.filter(a => a.presente).length
  const pctAsistencia  = totalRegistros > 0 ? Math.round(totalPresentes / totalRegistros * 100) : 0

  const presenciasPorAlumno = {}
  asistencia.filter(a => a.presente).forEach(a => {
    presenciasPorAlumno[a.alumno_id] = (presenciasPorAlumno[a.alumno_id] ?? 0) + 1
  })
  const topAsistentes = Object.entries(presenciasPorAlumno)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({
      nombre: activos.find(a => a.id === id)?.nombre_completo ?? alumnos.find(a => a.id === id)?.nombre_completo ?? '—',
      count,
    }))
  const maxAsist = topAsistentes[0]?.count ?? 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
          <p className="text-gray-500 text-sm mt-1">Resumen del año {anio}</p>
        </div>
        <button
          onClick={() => setOculto(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
        >
          {oculto ? <Eye size={15} /> : <EyeOff size={15} />}
          {oculto ? 'Mostrar montos' : 'Ocultar montos'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          <div className="p-3 rounded-xl bg-primary-800">
            <DollarSign size={22} className="text-white" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total anual {anio}</p>
            <p className="text-2xl font-bold text-gray-800">
              {oculto ? 'Gs. ●●●●●●' : fmtGs(totalAnio)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          <div className="p-3 rounded-xl bg-gold-600">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Mejor mes</p>
            <p className="text-2xl font-bold text-gray-800">
              {mesMayor?.mes} — {oculto ? 'Gs. ●●●●●●' : fmtGs(mesMayor?.total ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-primary-700" />
          <h3 className="font-semibold text-gray-800">Ingresos mensuales</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {resumen.map(item => (
              <div key={item.mes} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium leading-none">
                  {item.total > 0 && !oculto
                    ? Math.round(item.total).toLocaleString('es-PY')
                    : ''}
                </span>
                <div className="w-full flex justify-center">
                  <div
                    className="w-full rounded-t-md bg-primary-700 hover:bg-gold-600 transition-colors cursor-default"
                    style={{ height: `${(item.total / maxTotal) * 160}px`, minHeight: item.total > 0 ? '4px' : '0' }}
                    title={`${item.mes}: ${fmtGs(item.total)}`}
                  />
                </div>
                <span className="text-xs text-gray-500">{item.mes}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics */}
      {!loading && (
        <>
          {/* Alumnos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-primary-700" />
              <h3 className="font-semibold text-gray-800">Alumnos</h3>
              <span className="text-sm text-gray-400">
                — {activos.length} activos · {inactivos.length} inactivos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Por nivel */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Por nivel</h4>
                {porNivel.map(({ label, count, color }) => (
                  <DistBar key={label} label={label} count={count} total={activos.length} color={color} />
                ))}
              </div>

              {/* Por frecuencia */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Por frecuencia</h4>
                <DistBar label="1 vez/semana"    count={por1} total={activos.length} color="bg-purple-500" />
                <DistBar label="2 veces/semana"  count={por2} total={activos.length} color="bg-primary-600" />
              </div>

              {/* Por horario */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Por horario / grupo</h4>
                {porHorario.map(({ label, count }) => (
                  <DistBar key={label} label={label} count={count} total={activos.length}
                    color={label === 'Sin asignar' ? 'bg-gray-400' : 'bg-teal-500'} />
                ))}
              </div>

              {/* Por edad */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Por edad
                  {sinEdad > 0 && (
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({sinEdad} sin fecha de nacimiento)
                    </span>
                  )}
                </h4>
                {porEdad.map(({ label, count }) => (
                  <DistBar key={label} label={label} count={count} total={conEdad || 1} color="bg-gold-500" />
                ))}
              </div>
            </div>
          </div>

          {/* Asistencia */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-primary-700" />
              <h3 className="font-semibold text-gray-800">Asistencia {anio}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-primary-700">{totalPresentes}</p>
                <p className="text-sm text-gray-500 mt-1">Clases asistidas</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{pctAsistencia}%</p>
                <p className="text-sm text-gray-500 mt-1">Asistencia promedio</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-gold-600">
                  {asisMes.filter(a => a.presente).length}
                </p>
                <p className="text-sm text-gray-500 mt-1">Asistencias este mes</p>
              </div>
            </div>

            {topAsistentes.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Top 5 — más asistencias</h4>
                {topAsistentes.map(({ nombre, count }, i) => (
                  <div key={nombre} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                    <span className="text-gray-700 flex-1 truncate">{nombre}</span>
                    <div className="w-28 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary-600 rounded-full h-2"
                        style={{ width: `${(count / maxAsist) * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-primary-700 w-20 text-right">
                      {count} clase{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4 bg-white rounded-xl border border-gray-100">
                No hay registros de asistencia para {anio}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
