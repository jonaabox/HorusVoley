import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Phone, Calendar, Users, BookOpen,
  Clock, CreditCard, ChevronDown, ChevronRight, Loader2,
  CheckCircle2, AlertCircle, AlertTriangle, Download, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateReceipt } from '../lib/generateReceipt'
import logoUrl from '../IMG_6191-removebg-preview.png'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const NIVEL_LABEL = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' }
const NIVEL_COLOR = {
  principiante: 'bg-blue-100 text-blue-700',
  intermedio:   'bg-yellow-100 text-yellow-700',
  avanzado:     'bg-green-100 text-green-700',
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T00:00:00')
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function calcularMesesDeuda(alumno, pagos, hoy, diaVenc) {
  if (!alumno.fecha_inscripcion) return []
  const inscripcion = new Date(alumno.fecha_inscripcion + 'T00:00:00')
  let cursor = new Date(inscripcion.getFullYear(), inscripcion.getMonth(), 1)
  const limite = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const deuda = []
  while (cursor <= limite) {
    const mes  = cursor.getMonth() + 1
    const anio = cursor.getFullYear()
    const esActual  = anio === hoy.getFullYear() && mes === (hoy.getMonth() + 1)
    const vencioHoy = hoy.getDate() > diaVenc
    if (esActual && !vencioHoy) { cursor.setMonth(cursor.getMonth() + 1); continue }
    const tieneNormal = pagos.some(p => p.mes_correspondiente === mes && p.año_correspondiente === anio && (p.tipo ?? 'normal') !== 'prueba')
    if (!tieneNormal) {
      const tienePrueba = pagos.some(p => p.mes_correspondiente === mes && p.año_correspondiente === anio && p.tipo === 'prueba')
      deuda.push({ mes, anio, parcial: tienePrueba })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return deuda
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-primary-600" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function AlumnoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [alumno, setAlumno]       = useState(null)
  const [pagos, setPagos]         = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [horario, setHorario]     = useState(null)
  const [config, setConfig]       = useState({ diaVenc: 5, precio1: 70000, precio2: 120000 })
  const [loading, setLoading]     = useState(true)
  const [expandidos, setExpandidos] = useState({})
  const [downloading, setDownloading] = useState(null)

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const [
      { data: alumnoData },
      { data: pagosData },
      { data: asistenciaData },
      { data: configData },
    ] = await Promise.all([
      supabase.from('alumnos').select('*').eq('id', id).single(),
      supabase.from('pagos').select('*').eq('alumno_id', id).order('fecha_pago', { ascending: false }),
      supabase.from('asistencia').select('fecha, presente').eq('alumno_id', id).order('fecha', { ascending: false }),
      supabase.from('configuracion').select('clave, valor'),
    ])

    setAlumno(alumnoData)
    setPagos(pagosData ?? [])
    setAsistencia(asistenciaData ?? [])

    if (configData) {
      const diaVenc  = parseInt(configData.find(c => c.clave === 'dia_vencimiento_cuota')?.valor ?? '5')
      const precio1  = parseInt(configData.find(c => c.clave === 'precio_1_vez_semana')?.valor ?? '70000')
      const precio2  = parseInt(configData.find(c => c.clave === 'precio_2_veces_semana')?.valor ?? '120000')
      setConfig({ diaVenc, precio1, precio2 })
    }

    if (alumnoData?.horario_id) {
      const { data: horarioData } = await supabase.from('horarios').select('*').eq('id', alumnoData.horario_id).single()
      setHorario(horarioData)
    }

    setLoading(false)
  }

  const mesesDeuda = useMemo(() => {
    if (!alumno) return []
    return calcularMesesDeuda(alumno, pagos, new Date(), config.diaVenc)
  }, [alumno, pagos, config.diaVenc])

  // Agrupar pagos por (mes, año) igual que en Pagos.jsx
  const gruposPago = useMemo(() => {
    const mapa = {}
    pagos.forEach(p => {
      const key = `${p.mes_correspondiente}-${p.año_correspondiente}`
      if (!mapa[key]) mapa[key] = { key, mes: p.mes_correspondiente, año: p.año_correspondiente, items: [] }
      mapa[key].items.push(p)
    })
    return Object.values(mapa).sort((a, b) => {
      if (b.año !== a.año) return b.año - a.año
      return b.mes - a.mes
    })
  }, [pagos])

  const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0)

  const presentes = asistencia.filter(a => a.presente).length
  const ausentes  = asistencia.filter(a => !a.presente).length
  const pctAsistencia = asistencia.length > 0 ? Math.round((presentes / asistencia.length) * 100) : null

  const precioMensual = alumno ? (alumno.frecuencia === 1 ? config.precio1 : config.precio2) : 0

  // Próximo vencimiento
  const proximoVenc = useMemo(() => {
    if (!alumno) return null
    const hoy  = new Date()
    const mes  = hoy.getMonth() + 1
    const anio = hoy.getFullYear()
    const venc = new Date(anio, mes - 1, config.diaVenc)
    return venc
  }, [alumno, config.diaVenc])

  const downloadReceipt = async (pago) => {
    setDownloading(pago.id)
    try {
      const [{ data: pagosList }, { data: configData }] = await Promise.all([
        supabase.from('pagos').select('mes_correspondiente, año_correspondiente').eq('alumno_id', id),
        supabase.from('configuracion').select('clave, valor'),
      ])
      const diaVenc = parseInt(configData?.find(c => c.clave === 'dia_vencimiento_cuota')?.valor ?? '5')
      const mesesPendientes = alumno ? calcularMesesDeuda(alumno, pagosList ?? [], new Date(), diaVenc) : []
      await generateReceipt({
        pagoId:           pago.id,
        alumnoNombre:     alumno?.nombre_completo ?? '—',
        alumnoNivel:      alumno?.nivel ?? 'principiante',
        alumnoFrecuencia: alumno?.frecuencia ?? 1,
        monto:            parseFloat(pago.monto),
        fechaPago:        pago.fecha_pago,
        mes:              pago.mes_correspondiente,
        anio:             pago.año_correspondiente,
        logoUrl,
        mesesPendientes,
        tipo:             pago.tipo ?? 'normal',
      })
    } catch (e) { console.error(e) }
    setDownloading(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (!alumno) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400">Alumno no encontrado.</p>
        <button onClick={() => navigate('/alumnos')} className="mt-4 text-primary-600 text-sm hover:underline">
          Volver a Alumnos
        </button>
      </div>
    )
  }

  const sinPago    = mesesDeuda.some(m => !m.parcial)
  const soloPrueba = mesesDeuda.length > 0 && !sinPago

  const iniciales = alumno.nombre_completo
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/alumnos')}
          className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 flex items-center gap-4 flex-wrap">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-primary-800 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {iniciales}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-800">{alumno.nombre_completo}</h2>
              {/* Estado cuota */}
              {sinPago ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  <AlertCircle size={12} /> Debe {mesesDeuda.filter(m => !m.parcial).length} mes{mesesDeuda.filter(m => !m.parcial).length !== 1 ? 'es' : ''}
                </span>
              ) : soloPrueba ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  <AlertTriangle size={12} /> Prueba parcial
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  <CheckCircle2 size={12} /> Al día
                </span>
              )}
              {/* Estado alumno */}
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${alumno.estado === 'activo' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                {alumno.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {NIVEL_LABEL[alumno.nivel]} · {alumno.frecuencia === 1 ? '1 vez/semana' : '2 veces/semana'}
            </p>
          </div>
          <button
            onClick={() => navigate('/alumnos', { state: { editId: alumno.id } })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <Pencil size={14} />
            Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: datos personales + stats */}
        <div className="space-y-4">
          {/* Datos personales */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Datos personales</h3>
            {alumno.telefono && (
              <InfoRow icon={Phone} label="Teléfono" value={alumno.telefono} />
            )}
            {alumno.fecha_nacimiento && (
              <InfoRow
                icon={Calendar}
                label="Fecha de nacimiento"
                value={`${new Date(alumno.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-PY')} (${calcularEdad(alumno.fecha_nacimiento)} años)`}
              />
            )}
            <InfoRow
              icon={Calendar}
              label="Inscripto desde"
              value={new Date(alumno.fecha_inscripcion + 'T00:00:00').toLocaleDateString('es-PY')}
            />
            <InfoRow
              icon={BookOpen}
              label="Nivel"
              value={NIVEL_LABEL[alumno.nivel]}
            />
            <InfoRow
              icon={Users}
              label="Frecuencia"
              value={alumno.frecuencia === 1 ? '1 vez por semana' : '2 veces por semana'}
            />
            {horario && (
              <InfoRow
                icon={Clock}
                label="Horario / Grupo"
                value={`${horario.nombre} — ${horario.dia_semana} ${horario.hora_inicio.slice(0,5)}–${horario.hora_fin.slice(0,5)}`}
              />
            )}
          </div>

          {/* Resumen financiero */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumen de pagos</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Precio mensual</span>
                <span className="text-sm font-semibold text-gray-800">Gs. {precioMensual.toLocaleString('es-PY')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total pagado</span>
                <span className="text-sm font-semibold text-green-700">Gs. {totalPagado.toLocaleString('es-PY')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Próximo vencimiento</span>
                <span className="text-sm font-semibold text-gray-800">
                  {proximoVenc ? `${config.diaVenc} de ${MESES[proximoVenc.getMonth()]}` : '—'}
                </span>
              </div>
              {mesesDeuda.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-red-600 font-semibold mb-1">Meses adeudados:</p>
                  {mesesDeuda.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-red-500">
                      {m.parcial
                        ? <span className="text-amber-600">· {MESES[m.mes - 1]} {m.anio} (prueba parcial)</span>
                        : <span>· {MESES[m.mes - 1]} {m.anio}</span>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Asistencia */}
          {asistencia.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Asistencia</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Clases registradas</span>
                  <span className="text-sm font-semibold text-gray-800">{asistencia.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Presentes</span>
                  <span className="text-sm font-semibold text-green-700">{presentes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Ausentes</span>
                  <span className="text-sm font-semibold text-red-600">{ausentes}</span>
                </div>
                {pctAsistencia !== null && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">% asistencia</span>
                      <span className="text-sm font-bold text-primary-700">{pctAsistencia}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pctAsistencia >= 75 ? 'bg-green-500' : pctAsistencia >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${pctAsistencia}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: historial de pagos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Historial de pagos</h3>
              </div>
              <span className="text-xs text-gray-400">{gruposPago.length} período{gruposPago.length !== 1 ? 's' : ''}</span>
            </div>

            {gruposPago.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">Sin pagos registrados.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {gruposPago.map(grupo => {
                  const { key, mes, año, items } = grupo
                  const prueba  = items.find(p => p.tipo === 'prueba')
                  const normal  = items.find(p => (p.tipo ?? 'normal') === 'normal')
                  const esCompletado = prueba && normal
                  const soloSinCompletar = prueba && !normal
                  const totalGrupo = items.reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                  const expandido = expandidos[key]

                  return (
                    <div key={key} className={`px-5 py-4 transition-colors ${soloSinCompletar ? 'bg-amber-50/30' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Mes/año */}
                          <div className="w-12 text-center shrink-0">
                            <p className="text-xs font-semibold text-primary-700">{MESES[mes - 1].slice(0, 3).toUpperCase()}</p>
                            <p className="text-xs text-gray-400">{año}</p>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${soloSinCompletar ? 'text-amber-700' : 'text-green-700'}`}>
                                Gs. {totalGrupo.toLocaleString('es-PY')}
                              </span>
                              {esCompletado && (
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  Completado
                                </span>
                              )}
                              {soloSinCompletar && (
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                  Prueba
                                </span>
                              )}
                            </div>
                            {esCompletado && (
                              <button
                                onClick={() => setExpandidos(prev => ({ ...prev, [key]: !prev[key] }))}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-0.5 transition"
                              >
                                {expandido ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                Ver detalle
                              </button>
                            )}
                            {esCompletado && expandido && (
                              <div className="mt-2 space-y-0.5 text-xs text-gray-500">
                                <div>· Gs. {parseFloat(prueba.monto).toLocaleString('es-PY')} — clase de prueba · {new Date(prueba.fecha_pago + 'T00:00:00').toLocaleDateString('es-PY')}</div>
                                <div>· Gs. {parseFloat(normal.monto).toLocaleString('es-PY')} — complemento · {new Date(normal.fecha_pago + 'T00:00:00').toLocaleDateString('es-PY')}</div>
                              </div>
                            )}
                            {!esCompletado && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date((normal ?? prueba).fecha_pago + 'T00:00:00').toLocaleDateString('es-PY')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Acción: descargar recibo */}
                        <button
                          onClick={() => downloadReceipt(normal ?? prueba)}
                          disabled={downloading === (normal ?? prueba)?.id}
                          className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-40 transition"
                          title="Descargar recibo"
                        >
                          {downloading === (normal ?? prueba)?.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Download size={14} />
                          }
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Últimas asistencias */}
            {asistencia.length > 0 && (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 mt-2">
                  <h3 className="font-semibold text-gray-800 text-sm">Últimas clases</h3>
                  <span className="text-xs text-gray-400">últimas 10</span>
                </div>
                <div className="divide-y divide-gray-50 pb-2">
                  {asistencia.slice(0, 10).map((a, i) => (
                    <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-PY', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </span>
                      {a.presente
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle2 size={12} /> Presente</span>
                        : <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><X size={12} /> Ausente</span>
                      }
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
