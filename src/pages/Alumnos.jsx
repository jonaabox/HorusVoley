import { useEffect, useState } from 'react'
import { useConfirm } from '../hooks/useConfirm'
import { Plus, Search, Pencil, Trash2, X, Loader2, ExternalLink, Download, Banknote, ArrowLeftRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateReceipt, calcularProximoVenc } from '../lib/generateReceipt'
import logoUrl from '../IMG_6191-removebg-preview.png'

const PRECIO_PRUEBA = 25000

const NIVELES = ['principiante', 'intermedio', 'avanzado']

const NIVEL_LABEL = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' }
const NIVEL_COLOR = {
  principiante: 'bg-blue-100 text-blue-700',
  intermedio:   'bg-yellow-100 text-yellow-700',
  avanzado:     'bg-green-100 text-green-700',
}

const EMPTY_FORM = {
  nombre_completo:   '',
  fecha_nacimiento:  '',
  telefono:          '',
  fecha_inscripcion: new Date().toISOString().split('T')[0],
  estado:            'activo',
  frecuencia:        2,
  nivel:             'principiante',
  horario_id:        '',
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T00:00:00')
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function calcularMesesDeuda(alumno, todosPagos, hoy, diaVenc) {
  const inscripcion = new Date(alumno.fecha_inscripcion + 'T00:00:00')
  let cursor = new Date(inscripcion.getFullYear(), inscripcion.getMonth(), 1)
  const limiteActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const mesesDeuda = []

  while (cursor <= limiteActual) {
    const mes  = cursor.getMonth() + 1
    const anio = cursor.getFullYear()

    const esActual    = anio === hoy.getFullYear() && mes === (hoy.getMonth() + 1)
    const vencioHoy   = hoy.getDate() > diaVenc

    if (esActual && !vencioHoy) {
      cursor.setMonth(cursor.getMonth() + 1)
      continue
    }

    const tieneNormal = todosPagos.some(
      p => p.alumno_id === alumno.id &&
           p.mes_correspondiente === mes &&
           p.año_correspondiente === anio &&
           (p.tipo ?? 'normal') !== 'prueba'
    )

    if (!tieneNormal) {
      const tienePrueba = todosPagos.some(
        p => p.alumno_id === alumno.id &&
             p.mes_correspondiente === mes &&
             p.año_correspondiente === anio &&
             p.tipo === 'prueba'
      )
      mesesDeuda.push({ mes, anio, parcial: tienePrueba })
    }

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return mesesDeuda
}

export default function Alumnos() {
  const { confirm, ConfirmModal } = useConfirm()
  const navigate = useNavigate()
  const [alumnos, setAlumnos]       = useState([])
  const [horarios, setHorarios]     = useState([])
  const [precios, setPrecios]       = useState({ 1: 70000, 2: 120000 })
  const [diaVenc, setDiaVenc]       = useState(5)
  const [search, setSearch]         = useState('')
  const [filtroHorario, setFiltroHorario] = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [modalOpen, setModalOpen]   = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editingId, setEditingId]   = useState(null)
  const [error, setError]           = useState('')
  // Pago inmediato al crear
  const [pagarAhora, setPagarAhora] = useState(false)
  const [tipoPago, setTipoPago]     = useState('normal') // 'normal' | 'prueba'
  const [montoPago, setMontoPago]   = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: alumnosData }, { data: configData }, { data: pagosData }, { data: horariosData }] = await Promise.all([
      supabase.from('alumnos').select('*').order('nombre_completo'),
      supabase.from('configuracion').select('clave, valor'),
      supabase.from('pagos').select('alumno_id, mes_correspondiente, año_correspondiente, monto, fecha_pago, tipo'),
      supabase.from('horarios').select('*').order('hora_inicio'),
    ])
    
    let dv = 5
    if (configData) {
      const p1 = parseInt(configData.find(c => c.clave === 'precio_1_vez_semana')?.valor ?? '70000')
      const p2 = parseInt(configData.find(c => c.clave === 'precio_2_veces_semana')?.valor ?? '120000')
      dv = parseInt(configData.find(c => c.clave === 'dia_vencimiento_cuota')?.valor ?? '5')
      setPrecios({ 1: p1, 2: p2 })
      setDiaVenc(dv)
    }

    const hoy = new Date();
    const finalAlumnos = (alumnosData ?? []).map(a => ({
      ...a,
      mesesDeuda: calcularMesesDeuda(a, pagosData ?? [], hoy, dv)
    }))

    setAlumnos(finalAlumnos)
    setHorarios(horariosData ?? [])
    setLoading(false)
  }

  const exportarCSV = () => {
    const encabezado = ['Nombre', 'Edad', 'Fecha nacimiento', 'Teléfono', 'Fecha inscripción', 'Estado', 'Nivel', 'Frecuencia', 'Grupo/Horario']
    const filas = filtered.map(a => {
      const edad = calcularEdad(a.fecha_nacimiento)
      const h    = horarios.find(h => h.id === a.horario_id)
      return [
        a.nombre_completo,
        edad !== null ? edad : '',
        a.fecha_nacimiento ?? '',
        a.telefono ?? '',
        a.fecha_inscripcion,
        a.estado,
        NIVEL_LABEL[a.nivel] ?? a.nivel,
        a.frecuencia === 1 ? '1 vez/semana' : '2 veces/semana',
        h ? `${h.nombre} ${h.dia_semana} ${h.hora_inicio.slice(0,5)}` : '',
      ]
    })
    const csv = [encabezado, ...filas]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    const sufijo = filtroHorario && filtroHorario !== '__sin__'
      ? `_${horarios.find(h => h.id === filtroHorario)?.nombre?.replace(/\s+/g, '_') ?? 'grupo'}`
      : ''
    a.download = `alumnos${sufijo}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError('')
    setPagarAhora(false)
    setTipoPago('normal')
    setMontoPago(String(precios[2]))
    setMetodoPago('efectivo')
    setModalOpen(true)
  }

  const openEdit = (alumno) => {
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
    setEditingId(alumno.id)
    setError('')
    setPagarAhora(false)
    setModalOpen(true)
  }

  const handleFrecuenciaChange = (val) => {
    const freq = parseInt(val)
    setForm(f => ({ ...f, frecuencia: freq }))
    if (tipoPago === 'normal') setMontoPago(String(precios[freq]))
  }

  const handleTipoPagoChange = (tipo) => {
    setTipoPago(tipo)
    if (tipo === 'prueba') {
      setMontoPago(String(PRECIO_PRUEBA))
    } else {
      setMontoPago(String(precios[form.frecuencia] ?? precios[2]))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form, frecuencia: parseInt(form.frecuencia), horario_id: form.horario_id || null }

    if (editingId) {
      const { error: err } = await supabase.from('alumnos').update(payload).eq('id', editingId)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { data: nuevo, error: err } = await supabase
        .from('alumnos').insert(payload).select().single()
      if (err) { setError(err.message); setSaving(false); return }

      // Registrar pago inmediato y descargar recibo
      if (pagarAhora && montoPago && nuevo) {
        const hoy = new Date()
        const pagoPayload = {
          alumno_id:           nuevo.id,
          monto:               parseFloat(montoPago),
          fecha_pago:          form.fecha_inscripcion,
          mes_correspondiente: hoy.getMonth() + 1,
          año_correspondiente: hoy.getFullYear(),
          tipo:                tipoPago,
          metodo_pago:         metodoPago,
        }
        const { data: nuevoPago } = await supabase.from('pagos').insert(pagoPayload).select().single()
        if (nuevoPago) {
          await generateReceipt({
            pagoId:           nuevoPago.id,
            alumnoNombre:     nuevo.nombre_completo,
            alumnoNivel:      nuevo.nivel,
            alumnoFrecuencia: nuevo.frecuencia,
            monto:            parseFloat(montoPago),
            fechaPago:        form.fecha_inscripcion,
            mes:              hoy.getMonth() + 1,
            anio:             hoy.getFullYear(),
            logoUrl,
            mesesPendientes:  [],
            tipo:             tipoPago,
            proximoVencTexto: calcularProximoVenc(form.fecha_inscripcion, hoy.getMonth() + 1, hoy.getFullYear()),
          })
        }
      }
    }

    setSaving(false)
    setModalOpen(false)
    fetchAll()
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar alumno',
      message: '¿Estás seguro que querés eliminar este alumno? Esta acción no se puede deshacer.',
      variant: 'danger',
    })
    if (!ok) return
    await supabase.from('alumnos').delete().eq('id', id)
    fetchAll()
  }

  const filtered = alumnos.filter(a => {
    if (!a.nombre_completo.toLowerCase().includes(search.toLowerCase())) return false
    if (filtroHorario === '__sin__') return !a.horario_id
    if (filtroHorario && a.horario_id !== filtroHorario) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Alumnos</h2>
          <p className="text-gray-500 text-sm mt-1">{alumnos.length} alumnos registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            disabled={alumnos.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
          >
            <Download size={15} />
            Exportar CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow transition"
          >
            <Plus size={16} />
            Nuevo alumno
          </button>
        </div>
      </div>

      {/* Search + filtro grupo */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-56"
          />
        </div>
        <select
          value={filtroHorario}
          onChange={e => setFiltroHorario(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">Todos los grupos</option>
          {horarios.map(h => (
            <option key={h.id} value={h.id}>
              {h.nombre} · {h.dia_semana} {h.hora_inicio.slice(0,5)}
            </option>
          ))}
          <option value="__sin__">Sin grupo asignado</option>
        </select>
        {(search || filtroHorario) && (
          <button
            onClick={() => { setSearch(''); setFiltroHorario('') }}
            className="text-xs text-gray-400 hover:text-red-500 transition"
          >
            Limpiar filtros
          </button>
        )}
        {(search || filtroHorario) && (
          <span className="text-xs text-gray-500">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">No se encontraron alumnos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-950 text-primary-200 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Edad</th>
                  <th className="px-6 py-3 font-medium">Nivel</th>
                  <th className="px-6 py-3 font-medium">Grupo</th>
                  <th className="px-6 py-3 font-medium">Estado Cuota</th>
                  <th className="px-6 py-3 font-medium">Frecuencia</th>
                  <th className="px-6 py-3 font-medium">Teléfono</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => {
                  return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/alumnos/${a.id}`)}
                        className="flex items-center gap-1.5 font-medium text-gray-800 hover:text-primary-700 transition group"
                      >
                        {a.nombre_completo}
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-60 transition" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {calcularEdad(a.fecha_nacimiento) !== null ? `${calcularEdad(a.fecha_nacimiento)} años` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${NIVEL_COLOR[a.nivel]}`}>
                        {NIVEL_LABEL[a.nivel]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const h = horarios.find(h => h.id === a.horario_id)
                        if (!h) return <span className="text-gray-400 text-xs">Sin asignar</span>
                        const colorClass = h.nombre === 'Grupo A'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
                            {h.nombre} · {h.hora_inicio.slice(0, 5)}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const deuda = a.mesesDeuda || []
                        const sinPago   = deuda.some(m => !m.parcial)
                        const soloPrueba = deuda.length > 0 && !sinPago
                        if (sinPago)    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Debe</span>
                        if (soloPrueba) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Prueba parcial</span>
                        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Al día</span>
                      })()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {a.frecuencia === 1 ? '1 vez/sem' : '2 veces/sem'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{a.telefono || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition" title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950 shrink-0">
              <h3 className="text-white font-semibold">
                {editingId ? 'Editar alumno' : 'Nuevo alumno'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-primary-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  required type="text" value={form.nombre_completo}
                  onChange={e => setForm({ ...form, nombre_completo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Nivel + Frecuencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
                  <select
                    value={form.nivel}
                    onChange={e => setForm({ ...form, nivel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {NIVELES.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
                  <select
                    value={form.frecuencia}
                    onChange={e => handleFrecuenciaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={1}>1 vez/semana — Gs. {precios[1].toLocaleString('es-PY')}</option>
                    <option value={2}>2 veces/semana — Gs. {precios[2].toLocaleString('es-PY')}</option>
                  </select>
                </div>
              </div>

              {/* Horario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horario / Grupo</label>
                <select
                  value={form.horario_id}
                  onChange={e => setForm({ ...form, horario_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sin asignar</option>
                  {horarios.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.nombre} — {h.dia_semana} {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha nacimiento + Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                  <input
                    type="date" value={form.fecha_nacimiento}
                    onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                  <input
                    required type="tel" value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Inscripción + Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inscripción *</label>
                  <input
                    required type="date" value={form.fecha_inscripcion}
                    onChange={e => setForm({ ...form, fecha_inscripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              {/* Pago inmediato (solo al crear) */}
              {!editingId && (
                <div className="border border-gold-400 rounded-xl p-4 bg-gold-50 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pagarAhora}
                      onChange={e => setPagarAhora(e.target.checked)}
                      className="w-4 h-4 accent-gold-600"
                    />
                    <span className="text-sm font-medium text-gray-800">Registrar pago del mes actual</span>
                  </label>
                  {pagarAhora && (
                    <div className="space-y-3">
                      {/* Tipo de pago */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleTipoPagoChange('normal')}
                          className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition text-left ${
                            tipoPago === 'normal'
                              ? 'border-primary-600 bg-primary-50 text-primary-800'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-semibold">Cuota normal</div>
                          <div className="opacity-70">Gs. {(precios[form.frecuencia] ?? precios[2]).toLocaleString('es-PY')}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTipoPagoChange('prueba')}
                          className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition text-left ${
                            tipoPago === 'prueba'
                              ? 'border-amber-500 bg-amber-50 text-amber-800'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-semibold">Clase de prueba</div>
                          <div className="opacity-70">Gs. {PRECIO_PRUEBA.toLocaleString('es-PY')} parcial</div>
                        </button>
                      </div>
                      {/* Método de pago */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setMetodoPago('efectivo')}
                            className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition flex items-center gap-1.5 ${
                              metodoPago === 'efectivo'
                                ? 'border-green-600 bg-green-50 text-green-800'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <Banknote size={13} /> Efectivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setMetodoPago('transferencia')}
                            className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition flex items-center gap-1.5 ${
                              metodoPago === 'transferencia'
                                ? 'border-blue-600 bg-blue-50 text-blue-800'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            <ArrowLeftRight size={13} /> Transferencia
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Gs.)</label>
                        <input
                          type="number" min="0" value={montoPago}
                          onChange={e => setMontoPago(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Download size={11} />
                        El recibo se descargará automáticamente al crear el alumno.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

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
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear alumno'}
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
