import { useEffect, useState } from 'react'
import { useConfirm } from '../hooks/useConfirm'
import { Plus, Search, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

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

    const pagado = todosPagos.some(
      p => p.alumno_id === alumno.id &&
           p.mes_correspondiente === mes &&
           p.año_correspondiente === anio
    )

    if (!pagado) {
      mesesDeuda.push({ mes, anio })
    }

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return mesesDeuda
}

export default function Alumnos() {
  const { confirm, ConfirmModal } = useConfirm()
  const [alumnos, setAlumnos]       = useState([])
  const [precios, setPrecios]       = useState({ 1: 70000, 2: 120000 })
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [modalOpen, setModalOpen]   = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editingId, setEditingId]   = useState(null)
  const [error, setError]           = useState('')
  // Pago inmediato al crear
  const [pagarAhora, setPagarAhora] = useState(false)
  const [montoPago, setMontoPago]   = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: alumnosData }, { data: configData }, { data: pagosData }] = await Promise.all([
      supabase.from('alumnos').select('*').order('nombre_completo'),
      supabase.from('configuracion').select('clave, valor'),
      supabase.from('pagos').select('alumno_id, mes_correspondiente, año_correspondiente, monto, fecha_pago'),
    ])
    
    let diaVenc = 5;
    if (configData) {
      const p1 = parseInt(configData.find(c => c.clave === 'precio_1_vez_semana')?.valor ?? '70000')
      const p2 = parseInt(configData.find(c => c.clave === 'precio_2_veces_semana')?.valor ?? '120000')
      diaVenc = parseInt(configData.find(c => c.clave === 'dia_vencimiento_cuota')?.valor ?? '5')
      setPrecios({ 1: p1, 2: p2 })
    }

    const hoy = new Date();
    const finalAlumnos = (alumnosData ?? []).map(a => ({
      ...a,
      mesesDeuda: calcularMesesDeuda(a, pagosData ?? [], hoy, diaVenc)
    }))

    setAlumnos(finalAlumnos)
    setLoading(false)
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError('')
    setPagarAhora(false)
    setMontoPago(String(precios[2]))
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
    })
    setEditingId(alumno.id)
    setError('')
    setPagarAhora(false)
    setModalOpen(true)
  }

  const handleFrecuenciaChange = (val) => {
    const freq = parseInt(val)
    setForm(f => ({ ...f, frecuencia: freq }))
    setMontoPago(String(precios[freq]))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form, frecuencia: parseInt(form.frecuencia) }

    if (editingId) {
      const { error: err } = await supabase.from('alumnos').update(payload).eq('id', editingId)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { data: nuevo, error: err } = await supabase
        .from('alumnos').insert(payload).select().single()
      if (err) { setError(err.message); setSaving(false); return }

      // Registrar pago inmediato si está marcado
      if (pagarAhora && montoPago && nuevo) {
        const hoy = new Date()
        await supabase.from('pagos').insert({
          alumno_id:           nuevo.id,
          monto:               parseFloat(montoPago),
          fecha_pago:          form.fecha_inscripcion,
          mes_correspondiente: hoy.getMonth() + 1,
          año_correspondiente: hoy.getFullYear(),
        })
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

  const filtered = alumnos.filter(a =>
    a.nombre_completo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Alumnos</h2>
          <p className="text-gray-500 text-sm mt-1">{alumnos.length} alumnos registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-800 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow transition"
        >
          <Plus size={16} />
          Nuevo alumno
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
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
                  <th className="px-6 py-3 font-medium">Nivel</th>
                  <th className="px-6 py-3 font-medium">Estado Cuota</th>
                  <th className="px-6 py-3 font-medium">Frecuencia</th>
                  <th className="px-6 py-3 font-medium">Teléfono</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => {
                  const tieneDeuda = (a.mesesDeuda || []).length > 0;
                  return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{a.nombre_completo}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${NIVEL_COLOR[a.nivel]}`}>
                        {NIVEL_LABEL[a.nivel]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tieneDeuda ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Debe</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Al día</span>
                      )}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monto (Gs.)</label>
                      <input
                        type="number" min="0" value={montoPago}
                        onChange={e => setMontoPago(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
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
