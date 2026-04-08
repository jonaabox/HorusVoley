import { useEffect, useState } from 'react'
import { useConfirm } from '../hooks/useConfirm'
import { Plus, X, Loader2, Trash2, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateReceipt } from '../lib/generateReceipt'
import logoUrl from '../IMG_6191-removebg-preview.png'

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
    const pagado = pagosAlumno.some(p => p.mes_correspondiente === mes && p.año_correspondiente === anio)
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

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: pagosData }, { data: alumnosData }, { data: configData }] = await Promise.all([
      supabase.from('pagos').select('*, alumnos(nombre_completo, nivel, frecuencia)').order('fecha_pago', { ascending: false }),
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

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const handleAlumnoChange = (alumnoId) => {
    const alumno = alumnos.find(a => a.id === alumnoId)
    const monto  = alumno ? precios[alumno.frecuencia] : ''
    setForm(f => ({ ...f, alumno_id: alumnoId, monto: String(monto) }))
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
      <div className="flex items-center justify-between">
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : pagos.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">No hay pagos registrados aún.</p>
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
              <tbody className="divide-y divide-gray-50">
                {pagos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {p.alumnos?.nombre_completo ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-green-700 font-semibold">
                      Gs. {parseFloat(p.monto).toLocaleString('es-PY')}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(p.fecha_pago + 'T00:00:00').toLocaleDateString('es-PY')}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {MESES[(p.mes_correspondiente ?? 1) - 1]} {p.año_correspondiente}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => downloadReceipt(p)}
                          disabled={downloading === p.id}
                          className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-40 transition"
                          title="Descargar recibo"
                        >
                          {downloading === p.id
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Download size={15} />
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                          title="Eliminar pago"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                  {form.alumno_id && (
                    <p className="text-xs text-gray-400 mt-1">
                      Precio configurado: Gs. {precios[alumnos.find(a => a.id === form.alumno_id)?.frecuencia]?.toLocaleString('es-PY')}
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
