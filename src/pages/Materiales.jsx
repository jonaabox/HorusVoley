import { useEffect, useState } from 'react'
import { Plus, Trash2, Send, Loader2, FileText, X, Users, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useConfirm } from '../hooks/useConfirm'
import EnvioModal from '../components/EnvioModal'

const MENSAJE_TEMPLATE = (nombre, url) =>
  `Hola {{nombre_completo}}, te compartimos el siguiente material de estudio:\n\n📄 ${nombre}\n\n${url}\n\n¡Esperamos que te sea útil! 🏐`

export default function Materiales() {
  const [materiales, setMateriales]     = useState([])
  const [horarios, setHorarios]         = useState([])
  const [alumnos, setAlumnos]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [sendModalMaterial, setSendModalMaterial] = useState(null)
  const [recipientModal, setRecipientModal]       = useState(false)
  const [selectedHorarioId, setSelectedHorarioId] = useState('')
  const [selectedAlumnos, setSelectedAlumnos]     = useState(new Set())
  const [recipientMode, setRecipientMode]         = useState('todos')
  const [envioModal, setEnvioModal]               = useState(null)
  const [uploading, setUploading]                 = useState(false)
  const [uploadError, setUploadError]             = useState('')
  const [uploadForm, setUploadForm]               = useState({ nombre: '', descripcion: '', file: null })
  const { confirm, ConfirmModal } = useConfirm()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: mats }, { data: hors }, { data: alums }] = await Promise.all([
      supabase.from('materiales').select('*').order('created_at', { ascending: false }),
      supabase.from('horarios').select('*').order('hora_inicio'),
      supabase.from('alumnos').select('id, nombre_completo, telefono, horario_id').eq('estado', 'activo').order('nombre_completo'),
    ])
    setMateriales(mats ?? [])
    setHorarios(hors ?? [])
    setAlumnos(alums ?? [])
    setLoading(false)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.file || !uploadForm.nombre.trim()) return
    setUploading(true)
    setUploadError('')

    const ext      = uploadForm.file.name.split('.').pop()
    const path     = `${Date.now()}-${uploadForm.nombre.trim().replace(/\s+/g, '-')}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('materiales')
      .upload(path, uploadForm.file)

    if (uploadErr) { setUploadError(uploadErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('materiales').getPublicUrl(path)

    const { error: dbErr } = await supabase.from('materiales').insert({
      nombre:       uploadForm.nombre.trim(),
      descripcion:  uploadForm.descripcion.trim() || null,
      storage_path: path,
      public_url:   publicUrl,
    })

    if (dbErr) { setUploadError(dbErr.message); setUploading(false); return }

    setUploading(false)
    setUploadModalOpen(false)
    setUploadForm({ nombre: '', descripcion: '', file: null })
    fetchAll()
  }

  const handleDelete = async (material) => {
    const ok = await confirm({
      title: 'Eliminar material',
      message: `¿Estás seguro que querés eliminar "${material.nombre}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
    })
    if (!ok) return
    await supabase.storage.from('materiales').remove([material.storage_path])
    await supabase.from('materiales').delete().eq('id', material.id)
    fetchAll()
  }

  const openSendFlow = (material) => {
    setSendModalMaterial(material)
    setRecipientMode('todos')
    setSelectedHorarioId('')
    setSelectedAlumnos(new Set())
    setRecipientModal(true)
  }

  const buildContactos = () => {
    let lista = alumnos
    if (recipientMode === 'grupo' && selectedHorarioId) {
      lista = alumnos.filter(a => a.horario_id === selectedHorarioId)
    } else if (recipientMode === 'manual') {
      lista = alumnos.filter(a => selectedAlumnos.has(a.id))
    }
    return lista
      .map(a => {
        const digits   = (a.telefono ?? '').replace(/\D/g, '')
        const cleaned  = digits.startsWith('0') ? digits.slice(1) : digits
        const telefono = cleaned.startsWith('595') ? cleaned : '595' + cleaned
        return { telefono, nombre_completo: a.nombre_completo }
      })
      .filter(c => c.telefono.length >= 11)
  }

  const handleConfirmSend = () => {
    const contactos = buildContactos()
    if (!contactos.length) return
    const mensaje = MENSAJE_TEMPLATE(sendModalMaterial.nombre, sendModalMaterial.public_url)
    setRecipientModal(false)
    setEnvioModal({
      contactos,
      mensaje,
      campana: `Material: ${sendModalMaterial.nombre}`,
    })
  }

  const toggleAlumno = (id) => {
    setSelectedAlumnos(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Materiales</h2>
          <p className="text-gray-500 text-sm mt-1">Biblioteca de material de estudio para compartir con alumnos</p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 bg-primary-800 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow transition"
        >
          <Plus size={16} />
          Subir PDF
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : materiales.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No hay materiales subidos aún.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {materiales.map(m => (
              <li key={m.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{m.nombre}</p>
                  {m.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.descripcion}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(m.created_at).toLocaleDateString('es-PY')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openSendFlow(m)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                  >
                    <Send size={12} />
                    Enviar
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950">
              <h3 className="text-white font-semibold">Subir PDF</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-primary-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  required type="text"
                  value={uploadForm.nombre}
                  onChange={e => setUploadForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ej: Reglas del voley"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={uploadForm.descripcion}
                  onChange={e => setUploadForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo PDF *</label>
                <input
                  required type="file" accept=".pdf"
                  onChange={e => setUploadForm(f => ({ ...f, file: e.target.files[0] ?? null }))}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              {uploadError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{uploadError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setUploadModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={uploading}
                  className="flex-1 py-2.5 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition">
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipient selection modal */}
      {recipientModal && sendModalMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950 shrink-0">
              <h3 className="text-white font-semibold">Enviar: {sendModalMaterial.nombre}</h3>
              <button onClick={() => setRecipientModal(false)} className="text-primary-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* Mode selector */}
              <div className="flex gap-2">
                {[
                  { value: 'todos', label: 'Todos' },
                  { value: 'grupo', label: 'Por grupo' },
                  { value: 'manual', label: 'Manual' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setRecipientMode(value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      recipientMode === value
                        ? 'bg-primary-800 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Group selector */}
              {recipientMode === 'grupo' && (
                <div className="space-y-2">
                  {horarios.map(h => (
                    <button
                      key={h.id}
                      onClick={() => setSelectedHorarioId(h.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                        selectedHorarioId === h.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{h.nombre} · {h.hora_inicio.slice(0, 5)}</span>
                      <span className="text-xs text-gray-400">
                        {alumnos.filter(a => a.horario_id === h.id).length} alumnos
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual selector */}
              {recipientMode === 'manual' && (
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {alumnos.map(a => (
                    <li
                      key={a.id}
                      onClick={() => toggleAlumno(a.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selectedAlumnos.has(a.id) ? 'bg-primary-700 border-primary-700' : 'border-gray-300'
                      }`}>
                        {selectedAlumnos.has(a.id) && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm text-gray-800">{a.nombre_completo}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg">
                <Users size={12} />
                {buildContactos().length} destinatario{buildContactos().length !== 1 ? 's' : ''} seleccionado{buildContactos().length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setRecipientModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={buildContactos().length === 0}
                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition"
              >
                Preparar envío
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EnvioModal */}
      {envioModal && (
        <EnvioModal
          contactos={envioModal.contactos}
          mensaje={envioModal.mensaje}
          campana={envioModal.campana}
          onCerrar={() => setEnvioModal(null)}
        />
      )}

      <ConfirmModal />
    </div>
  )
}
