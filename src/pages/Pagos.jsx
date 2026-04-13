import { useEffect, useState, useMemo } from 'react'
import { useConfirm } from '../hooks/useConfirm'
import { Plus, X, Loader2, Trash2, Download, CircleCheckBig, ChevronDown, ChevronRight, User, Search, Banknote, ArrowLeftRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateReceipt, calcularProximoVenc } from '../lib/generateReceipt'
import logoUrl from '../IMG_6191-removebg-preview.png'

const PRECIO_PRUEBA = 25000

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function calcularMesesDeuda(fechaInscripcion, pagosAlumno, hoy, diaVenc) {
  const inscripcion = new Date(fechaInscripcion + 'T00:00:00')
  let cursor = new Date(inscripcion.getFullYear(), inscripcion.getMonth(), 1)
  const limite = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const deuda = []
  while (cursor <= limite) {
    const mes  = cursor.getMonth() + 1
    const anio = cursor.getFullYear()
    const esActual  = anio === hoy.getFullYear() && mes === (hoy.getMonth() + 1)
    const vencioHoy = hoy.getDate() > diaVenc
    if (esActual && !vencioHoy) { cursor.setMonth(cursor.getMonth() + 1); continue }
    const pagado = pagosAlumno.some(p => p.mes_correspondiente === mes && p.año_correspondiente === anio && (p.tipo ?? 'normal') !== 'prueba')
    if (!pagado) {
      const vencimiento = new Date(anio, mes - 1, diaVenc)
      deuda.push({ mes, anio, vencido: hoy > vencimiento })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return deuda
}

const EMPTY_FORM = {
  alumno_id:           '',
  monto:               '',
  fecha_pago:          new Date().toISOString().split('T')[0],
  mes_correspondiente: new Date().getMonth() + 1,
  año_correspondiente: new Date().getFullYear(),
  tipo:                'normal',
  metodo_pago:         'efectivo',
}

export default function Pagos() {
  const { confirm, ConfirmModal } = useConfirm()
  const [pagos, setPagos]           = useState([])
  const [alumnos, setAlumnos]       = useState([])
  const [precios, setPrecios]       = useState({ 1: 70000, 2: 120000 })
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [downloading, setDownloading] = useState(null) // pagoId descargando
  const [modalOpen, setModalOpen]   = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [error, setError]           = useState('')
  const [filtroAlumno, setFiltroAlumno] = useState('')
  const [busqueda, setBusqueda]         = useState('')
  const [expandidos, setExpandidos]     = useState({}) // grupoKey → bool

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: pagosData }, { data: alumnosData }, { data: configData }] = await Promise.all([
      supabase.from('pagos').select('*, alumnos(nombre_completo, nivel, frecuencia, id)').order('fecha_pago', { ascending: false }),
      supabase.from('alumnos').select('id, nombre_completo, frecuencia, nivel').eq('estado', 'activo').order('nombre_completo'),
      supabase.from('configuracion').select('clave, valor'),
    ])
    setPagos(pagosData ?? [])
    setAlumnos(alumnosData ?? [])
    if (configData) {
      const p1 = parseInt(configData.find(c => c.clave === 'precio_1_vez_semana')?.valor ?? '70000')
      const p2 = parseInt(configData.find(c => c.clave === 'precio_2_veces_semana')?.valor ?? '120000')
      setPrecios({ 1: p1, 2: p2 })
    }
    setLoading(false)
  }

  // Agrupa pagos por (alumno_id, mes, año). Si hay prueba+normal para el mismo período,
  // se muestran como una sola entrada "completada".
  const grupos = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    const filtrados = pagos.filter(p => {
      if (filtroAlumno && p.alumno_id !== filtroAlumno) return false
      if (q && !p.alumnos?.nombre_completo?.toLowerCase().includes(q)) return false
      return true
    })

    const mapa = {}
    filtrados.forEach(p => {
      const key = `${p.alumno_id}-${p.mes_correspondiente}-${p.año_correspondiente}`
      if (!mapa[key]) mapa[key] = { key, alumno_id: p.alumno_id, alumnos: p.alumnos, mes: p.mes_correspondiente, año: p.año_correspondiente, items: [] }
      mapa[key].items.push(p)
    })

    return Object.values(mapa).sort((a, b) => {
      const maxFechaA = Math.max(...a.items.map(p => new Date(p.fecha_pago).getTime()))
      const maxFechaB = Math.max(...b.items.map(p => new Date(p.fecha_pago).getTime()))
      return maxFechaB - maxFechaA
    })
  }, [pagos, filtroAlumno])

  const toggleExpandido = (key) =>
    setExpandidos(prev => ({ ...prev, [key]: !prev[key] }))

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const handleAlumnoChange = (alumnoId) => {
    const alumno = alumnos.find(a => a.id === alumnoId)
    const monto  = alumno ? (form.tipo === 'prueba' ? PRECIO_PRUEBA : precios[alumno.frecuencia]) : ''
    setForm(f => ({ ...f, alumno_id: alumnoId, monto: String(monto) }))
  }

  const handleTipoChange = (tipo) => {
    const alumno = alumnos.find(a => a.id === form.alumno_id)
    const monto  = tipo === 'prueba' ? PRECIO_PRUEBA : (alumno ? precios[alumno.frecuencia] : '')
    setForm(f => ({ ...f, tipo, monto: String(monto) }))
  }

  const openCompletar = (pago) => {
    const alumno = alumnos.find(a => a.id === pago.alumno_id)
    const montoComplemento = alumno ? Math.max(0, precios[alumno.frecuencia] - PRECIO_PRUEBA) : ''
    setForm({
      alumno_id:           pago.alumno_id,
      monto:               String(montoComplemento),
      fecha_pago:          new Date().toISOString().split('T')[0],
      mes_correspondiente: pago.mes_correspondiente,
      año_correspondiente: pago.año_correspondiente,
      tipo:                'normal',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ...form,
      monto:               parseFloat(form.monto),
      mes_correspondiente: parseInt(form.mes_correspondiente),
      año_correspondiente: parseInt(form.año_correspondiente),
      tipo:                form.tipo,
      metodo_pago:         form.metodo_pago ?? 'efectivo',
    }

    const { data: nuevoPago, error: err } = await supabase
      .from('pagos')
      .insert(payload)
      .select('*, alumnos(nombre_completo, nivel, frecuencia)')
      .single()

    setSaving(false)

    if (err) { setError(err.message); return }

    setModalOpen(false)
    fetchAll()

    // Generar recibo automáticamente al registrar
    await downloadReceipt(nuevoPago)
  }

  const downloadReceipt = async (pago) => {
    setDownloading(pago.id)
    try {
      const alumnoId = pago.alumno_id ?? pago.alumnos?.id
      const [{ data: alumnoData }, { data: pagosList }, { data: config }] = await Promise.all([
        supabase.from('alumnos').select('fecha_inscripcion').eq('id', alumnoId).single(),
        supabase.from('pagos').select('mes_correspondiente, año_correspondiente').eq('alumno_id', alumnoId),
        supabase.from('configuracion').select('clave, valor'),
      ])
      const diaVenc = parseInt(config?.find(c => c.clave === 'dia_vencimiento_cuota')?.valor ?? '5')
      const mesesPendientes = alumnoData
        ? calcularMesesDeuda(alumnoData.fecha_inscripcion, pagosList ?? [], new Date(), diaVenc)
        : []

      await generateReceipt({
        pagoId:           pago.id,
        alumnoNombre:     pago.alumnos?.nombre_completo ?? '—',
        alumnoNivel:      pago.alumnos?.nivel ?? 'principiante',
        alumnoFrecuencia: pago.alumnos?.frecuencia ?? 1,
        monto:            parseFloat(pago.monto),
        fechaPago:        pago.fecha_pago,
        mes:              pago.mes_correspondiente,
        anio:             pago.año_correspondiente,
        logoUrl,
        mesesPendientes,
        tipo:             pago.tipo ?? 'normal',
        proximoVencTexto: calcularProximoVenc(alumnoData?.fecha_inscripcion, pago.mes_correspondiente, pago.año_correspondiente),
      })
    } catch (e) {
      console.error('Error generando recibo:', e)
    }
    setDownloading(null)
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar pago',
      message: '¿Estás seguro que querés eliminar este pago? Esta acción no se puede deshacer.',
      variant: 'danger',
    })
    if (!ok) return
    await supabase.from('pagos').delete().eq('id', id)
    fetchAll()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pagos</h2>
          <p className="text-gray-500 text-sm mt-1">{pagos.length} pagos registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-800 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow transition"
        >
          <Plus size={16} />
          Registrar pago
        </button>
      </div>

      {/* Búsqueda + filtro por alumno */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
          />
        </div>
        <div className="relative">
          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filtroAlumno}
            onChange={e => setFiltroAlumno(e.target.value)}
            className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white min-w-[200px]"
          >
            <option value="">Todos los alumnos</option>
            {alumnos.map(a => (
              <option key={a.id} value={a.id}>{a.nombre_completo}</option>
            ))}
          </select>
        </div>
        {(busqueda || filtroAlumno) && (
          <button
            onClick={() => { setBusqueda(''); setFiltroAlumno('') }}
            className="text-xs text-gray-400 hover:text-red-500 transition"
          >
            Limpiar filtros
          </button>
        )}
        {filtroAlumno && (
          <span className="text-xs text-gray-500">
            {grupos.length} período{grupos.length !== 1 ? 's' : ''} ·{' '}
            Gs. {pagos.filter(p => p.alumno_id === filtroAlumno).reduce((s, p) => s + parseFloat(p.monto || 0), 0).toLocaleString('es-PY')} total pagado
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : grupos.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">
            {filtroAlumno ? 'Este alumno no tiene pagos registrados.' : 'No hay pagos registrados aún.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-950 text-primary-200 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Alumno</th>
                  <th className="px-6 py-3 font-medium">Monto</th>
                  <th className="px-6 py-3 font-medium">Fecha de pago</th>
                  <th className="px-6 py-3 font-medium">Mes / Año</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grupos.map(grupo => {
                  const { key, alumnos: alumnoInfo, mes, año, items } = grupo
                  const prueba  = items.find(p => p.tipo === 'prueba')
                  const normal  = items.find(p => (p.tipo ?? 'normal') === 'normal')
                  const esCompletado = prueba && normal
                  const soloSinCompletar = prueba && !normal
                  const totalGrupo = items.reduce((s, p) => s + parseFloat(p.monto || 0), 0)
                  const expandido = expandidos[key]
                  const ultimaFecha = items.reduce((latest, p) => {
                    const d = new Date(p.fecha_pago)
                    return d > latest ? d : latest
                  }, new Date(0))

                  return (
                    <tr key={key} className={`transition-colors ${esCompletado ? 'hover:bg-green-50/30' : soloSinCompletar ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {alumnoInfo?.nombre_completo ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        {esCompletado ? (
                          // Prueba completada: mostrar total + desglose expandible
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-green-700">
                                Gs. {totalGrupo.toLocaleString('es-PY')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                Completado
                              </span>
                              <button
                                onClick={() => toggleExpandido(key)}
                                className="text-gray-400 hover:text-gray-600 transition"
                                title="Ver detalle"
                              >
                                {expandido ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                            </div>
                            {expandido && (
                              <div className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                                <div>· Gs. {parseFloat(prueba.monto).toLocaleString('es-PY')} — clase de prueba ({new Date(prueba.fecha_pago + 'T00:00:00').toLocaleDateString('es-PY')})</div>
                                <div>· Gs. {parseFloat(normal.monto).toLocaleString('es-PY')} — complemento ({new Date(normal.fecha_pago + 'T00:00:00').toLocaleDateString('es-PY')})</div>
                              </div>
                            )}
                          </div>
                        ) : soloSinCompletar ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-amber-700">
                              Gs. {parseFloat(prueba.monto).toLocaleString('es-PY')}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              Prueba
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-green-700">
                            Gs. {parseFloat(normal.monto).toLocaleString('es-PY')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {ultimaFecha.toLocaleDateString('es-PY')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {MESES[(mes ?? 1) - 1]} {año}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {soloSinCompletar && (
                            <button
                              onClick={() => openCompletar(prueba)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition"
                              title="Registrar pago restante"
                            >
                              <CircleCheckBig size={13} />
                              Completar
                            </button>
                          )}
                          {/* Descargar recibo del pago normal (o prueba si no hay normal) */}
                          <button
                            onClick={() => downloadReceipt(normal ?? prueba)}
                            disabled={downloading === (normal ?? prueba)?.id}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-40 transition"
                            title="Descargar recibo"
                          >
                            {downloading === (normal ?? prueba)?.id
                              ? <Loader2 size={15} className="animate-spin" />
                              : <Download size={15} />
                            }
                          </button>
                          {/* Eliminar: borra todos los pagos del grupo */}
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Eliminar pago',
                                message: esCompletado
                                  ? '¿Eliminar los 2 pagos de este período (prueba + complemento)? Esta acción no se puede deshacer.'
                                  : '¿Eliminar este pago? Esta acción no se puede deshacer.',
                                variant: 'danger',
                              })
                              if (!ok) return
                              await Promise.all(items.map(p => supabase.from('pagos').delete().eq('id', p.id)))
                              fetchAll()
                            }}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                            title="Eliminar pago"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950">
              <h3 className="text-white font-semibold">Registrar pago</h3>
              <button onClick={() => setModalOpen(false)} className="text-primary-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-6 space-y-4">
              {/* Tipo de pago */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTipoChange('normal')}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition text-left ${
                    form.tipo === 'normal'
                      ? 'border-primary-600 bg-primary-50 text-primary-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Cuota normal</div>
                  <div className="text-xs opacity-70">Pago completo del mes</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoChange('prueba')}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition text-left ${
                    form.tipo === 'prueba'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Clase de prueba</div>
                  <div className="text-xs opacity-70">Gs. {PRECIO_PRUEBA.toLocaleString('es-PY')} parcial</div>
                </button>
              </div>

              {/* Método de pago */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, metodo_pago: 'efectivo' }))}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition flex items-center gap-2 ${
                    form.metodo_pago === 'efectivo'
                      ? 'border-green-600 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Banknote size={15} />
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, metodo_pago: 'transferencia' }))}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition flex items-center gap-2 ${
                    form.metodo_pago === 'transferencia'
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <ArrowLeftRight size={15} />
                  Transferencia
                </button>
              </div>

              {form.tipo === 'prueba' && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                  <span>El alumno podrá completar el pago del mes en otro momento usando el botón <strong>Completar</strong> en la lista.</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alumno *</label>
                <select
                  required
                  value={form.alumno_id}
                  onChange={e => handleAlumnoChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar alumno...</option>
                  {alumnos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nombre_completo} — {a.frecuencia === 1 ? '1 vez/sem' : '2 veces/sem'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Gs.) *</label>
                  <input
                    required type="number" min="0" value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {form.alumno_id && form.tipo === 'normal' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Precio completo: Gs. {precios[alumnos.find(a => a.id === form.alumno_id)?.frecuencia]?.toLocaleString('es-PY')}
                    </p>
                  )}
                  {form.alumno_id && form.tipo === 'prueba' && (
                    <p className="text-xs text-amber-600 mt-1">
                      Resta: Gs. {Math.max(0, (precios[alumnos.find(a => a.id === form.alumno_id)?.frecuencia] ?? 0) - PRECIO_PRUEBA).toLocaleString('es-PY')} para completar
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago *</label>
                  <input
                    required type="date" value={form.fecha_pago}
                    onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                  <select
                    value={form.mes_correspondiente}
                    onChange={e => setForm(f => ({ ...f, mes_correspondiente: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <input
                    type="number" value={form.año_correspondiente}
                    onChange={e => setForm(f => ({ ...f, año_correspondiente: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg">
                <Download size={12} />
                El recibo se descargará automáticamente al registrar el pago.
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition"
                >
                  {saving ? 'Registrando...' : 'Registrar y descargar recibo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal />
    </div>
  )
}
