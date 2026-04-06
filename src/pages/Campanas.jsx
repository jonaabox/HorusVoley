import { useState, useRef, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  FileSpreadsheet, X, Plus, Eye, Megaphone, FolderPlus, Trash2,
  Loader2, Check, MessageSquare, Send, Users, BookMarked,
  ChevronDown, Save, BookOpen, AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Utilidades ───────────────────────────────────────────────────────────────

function limpiarTelefono(raw, prefijo) {
  if (!raw) return null
  const limpio = String(raw).replace(/[\s\-\(\)\+]/g, '')
  if (limpio.length < 7) return null
  return limpio.startsWith(prefijo) ? limpio : prefijo + limpio
}

function buildWaUrl(telefono, mensaje) {
  return `https://web.whatsapp.com/send/?phone=${telefono}&text=${encodeURIComponent(mensaje)}&type=phone_number&app_absent=0`
}

function personalizarMensaje(template, contacto) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => contacto[k] ?? `{{${k}}}`)
}

// ── Tab header ────────────────────────────────────────────────────────────────

function Tab({ label, active, onClick, icon: Icon, badge }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
        active ? 'border-primary-700 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon size={15} />{label}
      {badge != null && (
        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">{badge}</span>
      )}
    </button>
  )
}

// ── Upload zone ───────────────────────────────────────────────────────────────

function UploadZone({ onFile }) {
  const inputRef = useRef()
  const [drag, setDrag] = useState(false)
  const handle = f => { if (f?.name.endsWith('.xlsx')) onFile(f) }
  const onDrop = useCallback(e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }, [])
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
      onClick={() => inputRef.current.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${drag ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}`}>
      <FileSpreadsheet size={32} className="mx-auto text-gray-400 mb-2" />
      <p className="font-medium text-gray-700">Arrastra un <span className="text-primary-700">.xlsx</span> o haz click</p>
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={e => handle(e.target.files[0])} />
    </div>
  )
}

// ── Editor de mensaje ─────────────────────────────────────────────────────────

function MessageEditor({ columnas, mensaje, onChange }) {
  const taRef = useRef()
  const insertar = col => {
    const ta = taRef.current, s = ta.selectionStart, e = ta.selectionEnd
    onChange(mensaje.slice(0, s) + `{{${col}}}` + mensaje.slice(e))
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + col.length + 4; ta.focus() }, 0)
  }
  return (
    <div className="space-y-2">
      {columnas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400">Variables:</span>
          {columnas.map(c => (
            <button key={c} type="button" onClick={() => insertar(c)}
              className="px-2 py-0.5 text-xs font-mono rounded bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition">
              {`{{${c}}}`}
            </button>
          ))}
        </div>
      )}
      <textarea ref={taRef} value={mensaje} onChange={e => onChange(e.target.value)} rows={8}
        placeholder="Escribe tu mensaje aquí..."
        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none leading-relaxed"
      />
      <p className="text-xs text-gray-400">{mensaje.length} caracteres</p>
    </div>
  )
}

// ── Modal de envío ────────────────────────────────────────────────────────────

function EnvioModal({ contactos, mensaje, campana, onCerrar }) {
  const [enviados, setEnviados] = useState(new Set())
  const [guardando, setGuardando] = useState(new Set())

  const marcar = async (idx, telefono) => {
    if (enviados.has(idx)) return
    setGuardando(g => new Set([...g, idx]))
    // Registrar en historial para no repetir en futuras campañas
    await supabase.from('envios_historial')
      .upsert({ telefono, campana }, { onConflict: 'telefono,campana', ignoreDuplicates: true })
    setGuardando(g => { const s = new Set(g); s.delete(idx); return s })
    setEnviados(e => new Set([...e, idx]))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-primary-950 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-white font-semibold">Enviar campaña: {campana}</h3>
            <p className="text-primary-300 text-sm">{enviados.size} / {contactos.length} enviados</p>
          </div>
          <button onClick={onCerrar} className="text-primary-300 hover:text-white"><X size={20} /></button>
        </div>

        <div className="h-1.5 bg-gray-100 shrink-0">
          <div className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${(enviados.size / contactos.length) * 100}%` }} />
        </div>

        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 shrink-0">
          Haz click en el botón verde para abrir WhatsApp Web. El número queda registrado automáticamente para no repetirlo.
        </div>

        <ul className="overflow-y-auto flex-1 divide-y divide-gray-50 px-2 py-2">
          {contactos.map((c, i) => {
            const msg     = personalizarMensaje(mensaje, c)
            const nombre  = c['Nombres'] ?? c['Nombre'] ?? c['nombre'] ?? `Contacto ${i + 1}`
            const enviado = enviados.has(i)
            const guardandoEste = guardando.has(i)
            return (
              <li key={i} className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${enviado ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${enviado ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200'}`}>
                  {enviado && <Check size={11} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${enviado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{nombre}</p>
                  <p className="text-xs text-gray-400 font-mono">{c.telefono}</p>
                </div>
                <a href={buildWaUrl(c.telefono, msg)} target="_blank" rel="noopener noreferrer"
                  onClick={() => marcar(i, c.telefono)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition min-w-[68px] justify-center ${
                    enviado ? 'bg-gray-100 text-gray-400 pointer-events-none'
                    : guardandoEste ? 'bg-green-100 text-green-600'
                    : 'bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm'
                  }`}
                >
                  {guardandoEste ? <Loader2 size={12} className="animate-spin" /> : enviado ? 'Enviado' : <><MessageSquare size={12} /> Abrir</>}
                </a>
              </li>
            )
          })}
        </ul>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-500">{enviados.size} de {contactos.length} enviados</span>
          <button onClick={onCerrar} className="px-5 py-2 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TAB: Importar ─────────────────────────────────────────────────────────────

function TabImportar({ onRecargarGrupos }) {
  const [archivo, setArchivo]     = useState(null)
  const [columnas, setColumnas]   = useState([])
  const [filas, setFilas]         = useState([])
  const [colTel, setColTel]       = useState('')
  const [prefijo, setPrefijo]     = useState('595')
  const [nombreGrupo, setNombreGrupo] = useState('')
  const [colGrupo, setColGrupo]   = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState('')
  const [error, setError]         = useState('')

  const procesarArchivo = f => {
    setError(''); setArchivo(f)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const hoja = wb.Sheets['Respuestas de formulario 1'] ?? wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(hoja, { defval: '' })
        if (!rows.length) { setError('La hoja está vacía.'); return }
        const cols = Object.keys(rows[0])
        setColumnas(cols); setFilas(rows)
        setColTel(cols.find(c => /whats?app|tel[eé]fono|celular|phone|m[oó]vil/i.test(c)) ?? cols[0])
        setNombreGrupo(f.name.replace('.xlsx', ''))
      } catch (err) { setError('Error: ' + err.message) }
    }
    reader.readAsArrayBuffer(f)
  }

  const contactosProcesados = (() => {
    const mapa = new Map()
    const colNombre = columnas.find(c => /^nombres?$/i.test(c)) ?? columnas.find(c => /nombre|name/i.test(c))
    for (const row of filas) {
      const t = limpiarTelefono(row[colTel], prefijo)
      if (!t) continue
      if (!mapa.has(t)) {
        const contacto = { ...row, telefono: t }
        contacto._nombres = colNombre ? [String(row[colNombre] ?? '').trim()].filter(Boolean) : []
        mapa.set(t, contacto)
      } else if (colNombre) {
        const existente = mapa.get(t)
        const nombreNuevo = String(row[colNombre] ?? '').trim()
        if (nombreNuevo && !existente._nombres.includes(nombreNuevo)) {
          existente._nombres.push(nombreNuevo)
        }
      }
    }
    return [...mapa.values()].map(({ _nombres, ...c }) => {
      if (colNombre && _nombres.length > 0) {
        c[colNombre] = _nombres.length === 1
          ? _nombres[0]
          : _nombres.slice(0, -1).join(', ') + ' y ' + _nombres[_nombres.length - 1]
      }
      return c
    })
  })()

  const gruposUnicos = colGrupo ? [...new Set(filas.map(r => r[colGrupo]).filter(Boolean))] : []

  const guardar = async (nombre, contactos, desc = '') => {
    if (!nombre.trim()) return
    setGuardando(true)
    const { error: err } = await supabase.from('grupos').insert({ nombre: nombre.trim(), descripcion: desc, contactos })
    setGuardando(false)
    if (err) { setError(err.message); return }
    setExito(`Grupo "${nombre}" guardado (${contactos.length} contactos)`)
    onRecargarGrupos()
    setTimeout(() => setExito(''), 3000)
  }

  const guardarTodos = () => guardar(nombreGrupo, contactosProcesados)
  const guardarPorColumna = () =>
    gruposUnicos.forEach(v => {
      const m = contactosProcesados.filter(c => c[colGrupo] === v)
      if (m.length) guardar(String(v), m, `De ${archivo?.name}`)
    })

  return (
    <div className="space-y-5">
      {!archivo ? <UploadZone onFile={procesarArchivo} /> : (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={18} className="text-green-600" />
            <div>
              <p className="font-medium text-green-800 text-sm">{archivo.name}</p>
              <p className="text-xs text-green-600">{filas.length} filas · {columnas.length} columnas</p>
            </div>
          </div>
          <button onClick={() => { setArchivo(null); setFilas([]); setColumnas([]) }} className="text-green-600 hover:text-green-800"><X size={16} /></button>
        </div>
      )}

      {columnas.length > 0 && <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Columna WhatsApp</label>
            <select value={colTel} onChange={e => setColTel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              {columnas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prefijo país</label>
            <input value={prefijo} onChange={e => setPrefijo(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-0.5">PY=595 · AR=54</p>
          </div>
        </div>

        <div className="bg-primary-50 px-4 py-2.5 rounded-lg text-sm text-primary-800">
          <strong>{contactosProcesados.length}</strong> contactos con número válido detectados
        </div>

        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FolderPlus size={14} className="text-primary-700" />Guardar todos como un grupo</h4>
          <div className="flex gap-2">
            <input value={nombreGrupo} onChange={e => setNombreGrupo(e.target.value)} placeholder="Nombre del grupo..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button onClick={guardarTodos} disabled={!nombreGrupo.trim() || guardando}
              className="px-4 py-2 bg-primary-800 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              {guardando ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users size={14} className="text-primary-700" />Crear grupos por columna</h4>
          <div className="flex gap-2">
            <select value={colGrupo} onChange={e => setColGrupo(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Seleccionar columna para agrupar...</option>
              {columnas.filter(c => c !== colTel).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={guardarPorColumna} disabled={!colGrupo || guardando}
              className="px-4 py-2 bg-primary-800 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              Crear
            </button>
          </div>
          {colGrupo && gruposUnicos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {gruposUnicos.map(v => {
                const n = contactosProcesados.filter(c => c[colGrupo] === v).length
                return <span key={v} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs border border-primary-200">{v} ({n})</span>
              })}
            </div>
          )}
        </div>
      </>}

      {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {exito && <p className="text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2"><Check size={14} />{exito}</p>}
    </div>
  )
}

// ── TAB: Grupos ───────────────────────────────────────────────────────────────

function TabGrupos({ grupos, onRecargar, onIrACampana }) {
  const [eliminando, setEliminando] = useState(null)
  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar el grupo "${nombre}"?`)) return
    setEliminando(id)
    await supabase.from('grupos').delete().eq('id', id)
    onRecargar(); setEliminando(null)
  }
  if (!grupos.length) return (
    <div className="text-center py-14 text-gray-400">
      <Users size={36} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">Sin grupos guardados. Importa un Excel primero.</p>
    </div>
  )
  return (
    <div className="space-y-3">
      {grupos.map(g => (
        <div key={g.id} className="border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-primary-300 transition">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <Users size={16} className="text-primary-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 text-sm">{g.nombre}</p>
            <p className="text-xs text-gray-500">{g.contactos.length} contactos{g.descripcion ? ` · ${g.descripcion}` : ''}</p>
          </div>
          <button onClick={() => onIrACampana(g)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg text-xs font-semibold transition">
            <Send size={12} />Enviar
          </button>
          <button onClick={() => eliminar(g.id, g.nombre)} disabled={eliminando === g.id}
            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
            {eliminando === g.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      ))}
    </div>
  )
}

// ── TAB: Campaña ──────────────────────────────────────────────────────────────

function TabCampana({ grupos, grupoInicial }) {
  const [grupoId, setGrupoId]           = useState(grupoInicial?.id ?? '')
  const [nombreCampana, setNombreCampana] = useState('')
  const [mensaje, setMensaje]           = useState('')
  const [plantillas, setPlantillas]     = useState([])
  const [yaEnviados, setYaEnviados]     = useState(new Set())
  const [modalAbierto, setModalAbierto] = useState(false)
  const [soloNuevos, setSoloNuevos]     = useState(true)
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [nombrePlantilla, setNombrePlantilla]       = useState('')
  const [mostrarGuardar, setMostrarGuardar]         = useState(false)
  const [mostrarCargar, setMostrarCargar]           = useState(false)
  const [vistaPrevia, setVistaPrevia]               = useState(false)
  const [cargandoHistorial, setCargandoHistorial]   = useState(false)
  const [exitoPlantilla, setExitoPlantilla]         = useState('')
  const [mostrarContactos, setMostrarContactos]     = useState(false)
  const [busqueda, setBusqueda]                     = useState('')

  const grupo      = grupos.find(g => g.id === grupoId)
  const contactos  = grupo?.contactos ?? []
  const columnas   = contactos.length > 0 ? Object.keys(contactos[0]).filter(k => k !== 'telefono') : []

  // Cargar plantillas al montar
  useEffect(() => {
    supabase.from('plantillas').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setPlantillas(data ?? []))
  }, [])

  // Cuando cambia grupo o nombre de campaña, buscar ya enviados
  useEffect(() => {
    if (!nombreCampana.trim() || !grupoId) { setYaEnviados(new Set()); return }
    setCargandoHistorial(true)
    const telefonos = contactos.map(c => c.telefono).filter(Boolean)
    if (!telefonos.length) { setYaEnviados(new Set()); setCargandoHistorial(false); return }
    supabase.from('envios_historial')
      .select('telefono')
      .eq('campana', nombreCampana.trim())
      .in('telefono', telefonos)
      .then(({ data }) => {
        setYaEnviados(new Set((data ?? []).map(r => r.telefono)))
        setCargandoHistorial(false)
      })
  }, [grupoId, nombreCampana])

  const contactosNuevos  = contactos.filter(c => !yaEnviados.has(c.telefono))
  const contactosAEnviar = soloNuevos ? contactosNuevos : contactos
  const puedeEnviar      = contactosAEnviar.length > 0 && mensaje.trim() && nombreCampana.trim()

  const guardarPlantilla = async () => {
    if (!nombrePlantilla.trim() || !mensaje.trim()) return
    setGuardandoPlantilla(true)
    const { error } = await supabase.from('plantillas').insert({ nombre: nombrePlantilla.trim(), mensaje })
    setGuardandoPlantilla(false)
    if (!error) {
      const { data } = await supabase.from('plantillas').select('*').order('created_at', { ascending: false })
      setPlantillas(data ?? [])
      setNombrePlantilla('')
      setMostrarGuardar(false)
      setExitoPlantilla('Plantilla guardada')
      setTimeout(() => setExitoPlantilla(''), 2500)
    }
  }

  const eliminarPlantilla = async (id) => {
    await supabase.from('plantillas').delete().eq('id', id)
    setPlantillas(p => p.filter(x => x.id !== id))
  }

  useEffect(() => {
    if (grupoInicial) setGrupoId(grupoInicial.id)
  }, [grupoInicial])

  return (
    <div className="space-y-5">

      {/* Nombre de campaña */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de campaña <span className="text-red-400">*</span>
        </label>
        <input value={nombreCampana} onChange={e => setNombreCampana(e.target.value)}
          placeholder="Ej: Bienvenida abril 2026, Recordatorio cuota marzo..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        <p className="text-xs text-gray-400 mt-1">Se usa para identificar a quién ya se le envió este mensaje.</p>
      </div>

      {/* Grupo destino */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Grupo destino</label>
        <select value={grupoId} onChange={e => setGrupoId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Seleccionar grupo...</option>
          {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre} ({g.contactos.length})</option>)}
        </select>
      </div>

      {/* Estado de deduplicación */}
      {grupoId && nombreCampana.trim() && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
          yaEnviados.size > 0 ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {cargandoHistorial ? <Loader2 size={15} className="animate-spin mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <div>
            {cargandoHistorial ? 'Verificando historial...' : (
              <>
                <strong>{contactos.length}</strong> contactos en el grupo ·{' '}
                <strong className="text-green-700">{contactosNuevos.length} nuevos</strong>
                {yaEnviados.size > 0 && <> · <strong className="text-amber-700">{yaEnviados.size} ya recibieron esta campaña</strong></>}
                {yaEnviados.size > 0 && (
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input type="checkbox" checked={soloNuevos} onChange={e => setSoloNuevos(e.target.checked)}
                        className="accent-primary-700" />
                      Enviar solo a los {contactosNuevos.length} nuevos
                    </label>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Lista de contactos del grupo */}
      {contactos.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setMostrarContactos(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
          >
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users size={14} className="text-primary-700" />
              Ver contactos del grupo
              <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                {contactosAEnviar.length}{yaEnviados.size > 0 && soloNuevos ? ` nuevos` : ''}
              </span>
              {yaEnviados.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-xs">
                  {yaEnviados.size} ya enviados
                </span>
              )}
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${mostrarContactos ? 'rotate-180' : ''}`} />
          </button>

          {mostrarContactos && (
            <div className="border-t border-gray-100">
              {/* Buscador */}
              <div className="px-4 py-2 border-b border-gray-100">
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o teléfono..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {/* Tabla */}
              <div className="overflow-y-auto max-h-72">
                {(() => {
                  // Detectar columna de nombre
                  const colNombre = columnas.find(c => /nombre|name/i.test(c)) ?? columnas[0]
                  const filtrados = contactos.filter(c => {
                    const q = busqueda.toLowerCase()
                    return !q || String(c[colNombre] ?? '').toLowerCase().includes(q) || c.telefono.includes(q)
                  })
                  return (
                    <table className="w-full text-sm">
                      <thead className="bg-primary-950 text-primary-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-xs w-8">#</th>
                          <th className="px-4 py-2 text-left font-medium text-xs">{colNombre ?? 'Nombre'}</th>
                          <th className="px-4 py-2 text-left font-medium text-xs">Teléfono</th>
                          {columnas.filter(c => c !== colNombre && c !== 'telefono').slice(0, 2).map(c => (
                            <th key={c} className="px-4 py-2 text-left font-medium text-xs">{c}</th>
                          ))}
                          <th className="px-4 py-2 text-left font-medium text-xs">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filtrados.map((c, i) => {
                          const enviado = yaEnviados.has(c.telefono)
                          return (
                            <tr key={i} className={`hover:bg-gray-50 transition-colors ${enviado ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">
                                {c[colNombre] ?? '—'}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.telefono}</td>
                              {columnas.filter(col => col !== colNombre && col !== 'telefono').slice(0, 2).map(col => (
                                <td key={col} className="px-4 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{c[col]}</td>
                              ))}
                              <td className="px-4 py-2.5">
                                {enviado
                                  ? <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-xs">Ya enviado</span>
                                  : <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Nuevo</span>
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plantillas */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <BookMarked size={14} className="text-primary-700" />
            Plantillas de mensaje
          </span>
          <div className="flex gap-2">
            <button onClick={() => { setMostrarCargar(v => !v); setMostrarGuardar(false) }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-300 hover:bg-white transition text-gray-600">
              <BookOpen size={12} /> Cargar
            </button>
            <button onClick={() => { setMostrarGuardar(v => !v); setMostrarCargar(false) }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-primary-300 bg-primary-50 hover:bg-primary-100 transition text-primary-700">
              <Save size={12} /> Guardar actual
            </button>
          </div>
        </div>

        {/* Panel: cargar plantilla */}
        {mostrarCargar && (
          <div className="p-3 bg-white border-b border-gray-100">
            {plantillas.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No hay plantillas guardadas.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {plantillas.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                    <button onClick={() => { setMensaje(p.mensaje); setMostrarCargar(false) }}
                      className="flex-1 text-left text-sm text-gray-700 hover:text-primary-700 truncate">
                      {p.nombre}
                    </button>
                    <button onClick={() => eliminarPlantilla(p.id)}
                      className="p-1 text-red-400 hover:bg-red-50 rounded transition shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel: guardar plantilla */}
        {mostrarGuardar && (
          <div className="p-3 bg-white border-b border-gray-100">
            <div className="flex gap-2">
              <input value={nombrePlantilla} onChange={e => setNombrePlantilla(e.target.value)}
                placeholder="Nombre de la plantilla..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button onClick={guardarPlantilla} disabled={!nombrePlantilla.trim() || !mensaje.trim() || guardandoPlantilla}
                className="px-3 py-1.5 bg-primary-800 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
                {guardandoPlantilla ? <Loader2 size={13} className="animate-spin" /> : 'Guardar'}
              </button>
            </div>
            {exitoPlantilla && <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1"><Check size={11} />{exitoPlantilla}</p>}
          </div>
        )}

        {/* Editor */}
        <div className="p-4">
          <MessageEditor columnas={columnas} mensaje={mensaje} onChange={setMensaje} />
        </div>
      </div>

      {/* Vista previa */}
      {mensaje && contactosAEnviar.length > 0 && (
        <div>
          <button onClick={() => setVistaPrevia(v => !v)}
            className="flex items-center gap-1.5 text-sm text-primary-700 hover:text-primary-900 transition">
            <Eye size={14} />
            {vistaPrevia ? 'Ocultar' : 'Vista previa (primer contacto)'}
          </button>
          {vistaPrevia && (
            <div className="mt-3 bg-[#e5ddd5] rounded-xl p-4 flex justify-end">
              <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs text-sm text-gray-800 shadow-sm whitespace-pre-wrap leading-relaxed">
                {personalizarMensaje(mensaje, contactosAEnviar[0])}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón enviar */}
      <button onClick={() => setModalAbierto(true)} disabled={!puedeEnviar}
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition shadow">
        <Megaphone size={18} />
        {puedeEnviar
          ? `Enviar a ${contactosAEnviar.length} contacto${contactosAEnviar.length !== 1 ? 's' : ''}${soloNuevos && yaEnviados.size > 0 ? ' nuevos' : ''}`
          : 'Completa el nombre de campaña, grupo y mensaje'
        }
      </button>

      {modalAbierto && (
        <EnvioModal
          contactos={contactosAEnviar}
          mensaje={mensaje}
          campana={nombreCampana.trim()}
          onCerrar={() => { setModalAbierto(false); /* refrescar historial */ setNombreCampana(n => n) }}
        />
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Campanas() {
  const [tab, setTab]             = useState('importar')
  const [grupos, setGrupos]       = useState([])
  const [cargando, setCargando]   = useState(true)
  const [grupoParaCampana, setGrupoParaCampana] = useState(null)

  const cargarGrupos = async () => {
    setCargando(true)
    const { data } = await supabase.from('grupos').select('*').order('created_at', { ascending: false })
    setGrupos(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargarGrupos() }, [])

  const irACampana = (grupo) => {
    setGrupoParaCampana(grupo)
    setTab('campana')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Campañas de WhatsApp</h2>
        <p className="text-gray-500 text-sm mt-1">Importa contactos, crea grupos y envía mensajes personalizados · costo $0</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          <Tab label="Importar Excel"  icon={FileSpreadsheet} active={tab === 'importar'} onClick={() => setTab('importar')} />
          <Tab label="Grupos"          icon={Users}           active={tab === 'grupos'}   onClick={() => setTab('grupos')}   badge={grupos.length || null} />
          <Tab label="Enviar campaña"  icon={Megaphone}       active={tab === 'campana'}  onClick={() => setTab('campana')}  />
        </div>
        <div className="p-6">
          {tab === 'importar' && <TabImportar onRecargarGrupos={cargarGrupos} />}
          {tab === 'grupos' && (
            cargando
              ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
              : <TabGrupos grupos={grupos} onRecargar={cargarGrupos} onIrACampana={irACampana} />
          )}
          {tab === 'campana' && <TabCampana grupos={grupos} grupoInicial={grupoParaCampana} />}
        </div>
      </div>
    </div>
  )
}
