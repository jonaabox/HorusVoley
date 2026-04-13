import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Phone, Calendar, Users, BookOpen,
  Clock, CreditCard, ChevronDown, ChevronRight, Loader2,
  CheckCircle2, AlertCircle, AlertTriangle, Download, X, Save, Plus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateReceipt, calcularProximoVenc } from '../lib/generateReceipt'
import logoUrl from '../IMG_6191-removebg-preview.png'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const PRECIO_PRUEBA = 25000
const NIVELES       = ['principiante', 'intermedio', 'avanzado']
const NIVEL_LABEL   = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' }

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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white'
const selectCls = inputCls

export default function AlumnoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [alumno, setAlumno]         = useState(null)
  const [pagos, setPagos]           = useState([])
  const [asistencia, setAsistencia] = useState([])
  const [horarios, setHorarios]     = useState([])
  const [horario, setHorario]       = useState(null)
  const [config, setConfig]         = useState({ diaVenc: 5, precio1: 70000, precio2: 120000 })
  const [loading, setLoading]       = useState(true)
  const [expandidos, setExpandidos] = useState({})
  const [downloading, setDownloading] = useState(null)

  // Edición inline
  const [editando, setEditando]   = useState(false)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')

  // Modal de pago rápido
  const [pagoOpen, setPagoOpen]     = useState(false)
  const [pagoForm, setPagoForm]     = useState({})
  const [pagoSaving, setPagoSaving] = useState(false)
  const [pagoError, setPagoError]   = useState('')

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const [
      { data: alumnoData },
      { data: pagosData },
      { data: asistenciaData },
      { data: configData },
      { data: horariosData },
    ] = await Promise.all([
      supabase.from('alumnos').select('*').eq('id', id).single(),
      supabase.from('pagos').select('*').eq('alumno_id', id).order('fecha_pago', { ascending: false }),
      supabase.from('asistencia').select('fecha, presente').eq('alumno_id', id).order('fecha', { ascending: false }),
      supabase.from('configuracion').select('clave, valor'),
      supabase.from('horarios').select('*').order('hora_inicio'),
    ])

    setAlumno(alumnoData)
    setPagos(pagosData ?? [])
    setAsistencia(asistenciaData ?? [])
    setHorarios(horariosData ?? [])

    if (configData) {
      const diaVenc = parseInt(configData.find(c => c.clave === 'dia_vencimiento_cuota')?.valor ?? '5')
      const precio1 = parseInt(configData.find(c => c.clave === 'precio_1_vez_semana')?.valor ?? '70000')
      const precio2 = parseInt(configData.find(c => c.clave === 'precio_2_veces_semana')?.valor ?? '120000')
      setConfig({ diaVenc, precio1, precio2 })
    }

    if (alumnoData?.horario_id && horariosData) {
      setHorario(horariosData.find(h => h.id === alumnoData.horario_id) ?? null)
    }

    setLoading(false)
  }

  const startEdit = () => {
    setForm({
      nombre_completo:   alumno.nombre_completo,
      fecha_nacimiento:  alumno.fecha_nacimiento ?? '',
      telefono:          alumno.telefono ?? '',
      fecha_inscripcion: alumno.fecha_inscripcion,
      estado:            alumno.estado,
      frecuencia:        alumno.frecuencia,
      nivel:             alumno.nivel,
      horario_id:        alumno.horario_id ?? '',
    })
    setSaveError('')
    setEditando(true)
  }

  const cancelEdit = () => {
    setEditando(false)
    setSaveError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = { ...form, frecuencia: parseInt(form.frecuencia), horario_id: form.horario_id || null }
    const { error } = await supabase.from('alumnos').update(payload).eq('id', id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setEditando(false)
    await fetchAll()
  }

  const mesesDeuda = useMemo(() => {
    if (!alumno) return []
    return calcularMesesDeuda(alumno, pagos, new Date(), config.diaVenc)
  }, [alumno, pagos, config.diaVenc])

  // Abre el modal pre-rellenado con el mes más antiguo adeudado
  const openPagoModal = () => {
    const hoy          = new Date()
    const precioNormal = alumno.frecuencia === 1 ? config.precio1 : config.precio2

    // Tomar el mes más antiguo pendiente (mesesDeuda ya viene ordenado cronológicamente)
    const mesPendiente = mesesDeuda[0] ?? {
      mes:  hoy.getMonth() + 1,
      anio: hoy.getFullYear(),
      parcial: false,
    }

    // Si ya tiene prueba parcial, solo falta el complemento
    const esParcial = mesPendiente.parcial
    const montoDefault = esParcial
      ? Math.max(0, precioNormal - PRECIO_PRUEBA)
      : precioNormal

    setPagoForm({
      mes:      mesPendiente.mes,
      anio:     mesPendiente.anio ?? mesPendiente.anio,
      fecha:    hoy.toISOString().split('T')[0],
      monto:    String(montoDefault),
      tipo:     'normal',
      esParcial,
    })
    setPagoError('')
    setPagoOpen(true)
  }

  const handlePagoSave = async (e) => {
    e.preventDefault()
    setPagoSaving(true)
    setPagoError('')

    const { data: nuevoPago, error } = await supabase
      .from('pagos')
      .insert({
        alumno_id:           id,
        monto:               parseFloat(pagoForm.monto),
        fecha_pago:          pagoForm.fecha,
        mes_correspondiente: pagoForm.mes,
        año_correspondiente: pagoForm.anio,
        tipo:                pagoForm.tipo,
      })
      .select()
      .single()

    if (error) { setPagoError(error.message); setPagoSaving(false); return }

    // Descargar recibo automáticamente
    try {
      const mesesPendientesActualizados = calcularMesesDeuda(
        alumno,
        [...pagos, nuevoPago],
        new Date(),
        config.diaVenc
      )
      await generateReceipt({
        pagoId:           nuevoPago.id,
        alumnoNombre:     alumno.nombre_completo,
        alumnoNivel:      alumno.nivel,
        alumnoFrecuencia: alumno.frecuencia,
        monto:            parseFloat(pagoForm.monto),
        fechaPago:        pagoForm.fecha,
        mes:              pagoForm.mes,
        anio:             pagoForm.anio,
        logoUrl,
        mesesPendientes:  mesesPendientesActualizados,
        tipo:             pagoForm.tipo,
        proximoVencTexto: calcularProximoVenc(alumno.fecha_inscripcion, pagoForm.mes, pagoForm.anio),
      })
    } catch (e) { console.error(e) }

    setPagoSaving(false)
    setPagoOpen(false)
    await fetchAll()
  }

  const gruposPago = useMemo(() => {
    const mapa = {}
    pagos.forEach(p => {
      const key = `${p.mes_correspondiente}-${p.año_correspondiente}`
      if (!mapa[key]) mapa[key] = { key, mes: p.mes_correspondiente, año: p.año_correspondiente, items: [] }
      mapa[key].items.push(p)
    })
    return Object.values(mapa).sort((a, b) => b.año !== a.año ? b.año - a.año : b.mes - a.mes)
  }, [pagos])

  const totalPagado    = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0)
  const presentes      = asistencia.filter(a => a.presente).length
  const ausentes       = asistencia.filter(a => !a.presente).length
  const pctAsistencia  = asistencia.length > 0 ? Math.round((presentes / asistencia.length) * 100) : null
  const precioMensual  = alumno ? (alumno.frecuencia === 1 ? config.precio1 : config.precio2) : 0

  // Próximo vencimiento: día de inscripción del próximo mes sin pagar
  // Ej: inscripto el 9 → vence el 9 de cada mes, sin importar cuándo pague
  const proximoVenc = useMemo(() => {
    if (!alumno) return null
    const diaInscripcion = new Date(alumno.fecha_inscripcion + 'T00:00:00').getDate()
    // Si tiene deuda, el vencimiento es el día de inscripción del mes más antiguo adeudado
    if (mesesDeuda.length > 0) {
      const oldest = mesesDeuda[0]
      return new Date(oldest.anio, oldest.mes - 1, diaInscripcion)
    }
    // Al día → próximo vencimiento = día de inscripción del mes siguiente
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaInscripcion)
  }, [alumno, mesesDeuda])

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
        pagoId: pago.id, alumnoNombre: alumno?.nombre_completo ?? '—',
        alumnoNivel: alumno?.nivel ?? 'principiante', alumnoFrecuencia: alumno?.frecuencia ?? 1,
        monto: parseFloat(pago.monto), fechaPago: pago.fecha_pago,
        mes: pago.mes_correspondiente, anio: pago.año_correspondiente,
        logoUrl, mesesPendientes, tipo: pago.tipo ?? 'normal',
        proximoVencTexto: calcularProximoVenc(alumno?.fecha_inscripcion, pago.mes_correspondiente, pago.año_correspondiente),
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
  const iniciales  = alumno.nombre_completo.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

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
          <div className="w-16 h-16 rounded-2xl bg-primary-800 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {iniciales}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-800">{alumno.nombre_completo}</h2>
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${alumno.estado === 'activo' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                {alumno.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {NIVEL_LABEL[alumno.nivel]} · {alumno.frecuencia === 1 ? '1 vez/semana' : '2 veces/semana'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openPagoModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-600 hover:bg-gold-500 text-white text-sm font-medium shadow transition"
            >
              <Plus size={14} />
              Registrar pago
            </button>
            {!editando ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <Pencil size={14} />
                Editar datos
              </button>
            ) : (
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                <X size={14} />
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-4">

          {/* ── Datos personales: modo lectura ── */}
          {!editando && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Datos personales</h3>

              {[
                alumno.telefono && { icon: Phone,     label: 'Teléfono',          value: alumno.telefono },
                alumno.fecha_nacimiento && {
                  icon: Calendar, label: 'Fecha de nacimiento',
                  value: `${new Date(alumno.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-PY')} (${calcularEdad(alumno.fecha_nacimiento)} años)`,
                },
                { icon: Calendar,  label: 'Inscripto desde', value: new Date(alumno.fecha_inscripcion + 'T00:00:00').toLocaleDateString('es-PY') },
                { icon: BookOpen,  label: 'Nivel',           value: NIVEL_LABEL[alumno.nivel] },
                { icon: Users,     label: 'Frecuencia',      value: alumno.frecuencia === 1 ? '1 vez por semana' : '2 veces por semana' },
                horario && {
                  icon: Clock, label: 'Horario / Grupo',
                  value: `${horario.nombre} — ${horario.dia_semana} ${horario.hora_inicio.slice(0,5)}–${horario.hora_fin.slice(0,5)}`,
                },
              ].filter(Boolean).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Datos personales: modo edición ── */}
          {editando && (
            <form onSubmit={handleSave} className="bg-white rounded-xl border-2 border-primary-200 shadow-sm px-5 py-4 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Editando datos</h3>
              </div>

              <Field label="Nombre completo *">
                <input
                  required type="text" value={form.nombre_completo}
                  onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              <Field label="Teléfono">
                <input
                  type="tel" value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                  className={inputCls}
                  placeholder="Ej: 0981 123456"
                />
              </Field>

              <Field label="Fecha de nacimiento">
                <input
                  type="date" value={form.fecha_nacimiento}
                  onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              <Field label="Fecha de inscripción *">
                <input
                  required type="date" value={form.fecha_inscripcion}
                  onChange={e => setForm(f => ({ ...f, fecha_inscripcion: e.target.value }))}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nivel">
                  <select
                    value={form.nivel}
                    onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}
                    className={selectCls}
                  >
                    {NIVELES.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
                  </select>
                </Field>

                <Field label="Frecuencia">
                  <select
                    value={form.frecuencia}
                    onChange={e => setForm(f => ({ ...f, frecuencia: parseInt(e.target.value) }))}
                    className={selectCls}
                  >
                    <option value={1}>1 vez/sem</option>
                    <option value={2}>2 veces/sem</option>
                  </select>
                </Field>
              </div>

              <Field label="Horario / Grupo">
                <select
                  value={form.horario_id}
                  onChange={e => setForm(f => ({ ...f, horario_id: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">Sin asignar</option>
                  {horarios.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.nombre} — {h.dia_semana} {h.hora_inicio.slice(0,5)}–{h.hora_fin.slice(0,5)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Estado">
                <select
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                  className={selectCls}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </Field>

              {saveError && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button" onClick={cancelEdit}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-2 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}

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
                  {proximoVenc
                    ? `${proximoVenc.getDate()} de ${MESES[proximoVenc.getMonth()]} ${proximoVenc.getFullYear()}`
                    : '—'}
                </span>
              </div>
              {mesesDeuda.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-red-600 font-semibold mb-1">Meses adeudados:</p>
                  {mesesDeuda.map((m, i) => (
                    <div key={i} className="text-xs">
                      {m.parcial
                        ? <span className="text-amber-600">· {MESES[m.mes - 1]} {m.anio} (prueba parcial)</span>
                        : <span className="text-red-500">· {MESES[m.mes - 1]} {m.anio}</span>
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

        {/* Columna derecha: historial de pagos + asistencia */}
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
                  const esCompletado     = prueba && normal
                  const soloSinCompletar = prueba && !normal
                  const totalGrupo = items.reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                  const expandido  = expandidos[key]

                  return (
                    <div key={key} className={`px-5 py-4 transition-colors ${soloSinCompletar ? 'bg-amber-50/30' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 text-center shrink-0">
                            <p className="text-xs font-semibold text-primary-700">{MESES[mes - 1].slice(0, 3).toUpperCase()}</p>
                            <p className="text-xs text-gray-400">{año}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${soloSinCompletar ? 'text-amber-700' : 'text-green-700'}`}>
                                Gs. {totalGrupo.toLocaleString('es-PY')}
                              </span>
                              {esCompletado && <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Completado</span>}
                              {soloSinCompletar && <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Prueba</span>}
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

      {/* Modal de pago rápido */}
      {pagoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950">
              <h3 className="text-white font-semibold text-sm">Registrar pago</h3>
              <button onClick={() => setPagoOpen(false)} className="text-primary-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePagoSave} className="px-6 py-5 space-y-4">
              {/* Aviso sobre qué mes se está pagando */}
              {mesesDeuda.length > 0 ? (
                <div className={`rounded-lg px-3 py-2.5 text-xs ${pagoForm.esParcial ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
                  {pagoForm.esParcial ? (
                    <>
                      <p className="font-semibold">Complemento de clase de prueba</p>
                      <p className="mt-0.5 opacity-80">Ya existe un pago parcial de Gs. {PRECIO_PRUEBA.toLocaleString('es-PY')} para <strong>{MESES[pagoForm.mes - 1]} {pagoForm.anio}</strong>. Este pago completa la cuota.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">Cuota más antigua pendiente</p>
                      <p className="mt-0.5 opacity-80">Se abonará <strong>{MESES[pagoForm.mes - 1]} {pagoForm.anio}</strong>. {mesesDeuda.length > 1 && `Quedan ${mesesDeuda.length - 1} cuota${mesesDeuda.length - 1 !== 1 ? 's' : ''} pendiente${mesesDeuda.length - 1 !== 1 ? 's' : ''} después de este pago.`}</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-lg px-3 py-2.5 text-xs bg-green-50 border border-green-200 text-green-800">
                  <p className="font-semibold">Alumno al día</p>
                  <p className="mt-0.5 opacity-80">Se registrará el pago para <strong>{MESES[pagoForm.mes - 1]} {pagoForm.anio}</strong>.</p>
                </div>
              )}

              {/* Mes/año — editables por si se quiere cambiar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
                  <select
                    value={pagoForm.mes}
                    onChange={e => setPagoForm(f => ({ ...f, mes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
                  <input
                    type="number" value={pagoForm.anio}
                    onChange={e => setPagoForm(f => ({ ...f, anio: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto (Gs.) *</label>
                  <input
                    required type="number" min="0" value={pagoForm.monto}
                    onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago *</label>
                  <input
                    required type="date" value={pagoForm.fecha}
                    onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Tipo (solo si NO es complemento de prueba) */}
              {!pagoForm.esParcial && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPagoForm(f => ({ ...f, tipo: 'normal', monto: String(alumno.frecuencia === 1 ? config.precio1 : config.precio2) }))}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition text-left ${pagoForm.tipo === 'normal' ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <div className="font-semibold">Cuota normal</div>
                    <div className="opacity-70">Gs. {(alumno.frecuencia === 1 ? config.precio1 : config.precio2).toLocaleString('es-PY')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagoForm(f => ({ ...f, tipo: 'prueba', monto: String(PRECIO_PRUEBA) }))}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition text-left ${pagoForm.tipo === 'prueba' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <div className="font-semibold">Clase de prueba</div>
                    <div className="opacity-70">Gs. {PRECIO_PRUEBA.toLocaleString('es-PY')} parcial</div>
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Download size={11} />
                El recibo se descargará automáticamente.
              </p>

              {pagoError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{pagoError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setPagoOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={pagoSaving}
                  className="flex-1 py-2.5 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition flex items-center justify-center gap-2"
                >
                  {pagoSaving ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  {pagoSaving ? 'Registrando...' : 'Registrar y descargar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
