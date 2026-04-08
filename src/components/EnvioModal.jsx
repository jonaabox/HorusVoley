import { useState } from 'react'
import { X, Check, Loader2, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildWaUrl, personalizarMensaje } from '../lib/whatsapp'

export default function EnvioModal({ contactos, mensaje, campana, onCerrar }) {
  const [enviados, setEnviados]   = useState(new Set())
  const [guardando, setGuardando] = useState(new Set())

  const marcar = async (idx, telefono) => {
    if (enviados.has(idx)) return
    setGuardando(g => new Set([...g, idx]))
    if (campana) {
      await supabase.from('envios_historial')
        .upsert({ telefono, campana }, { onConflict: 'telefono,campana', ignoreDuplicates: true })
    }
    setGuardando(g => { const s = new Set(g); s.delete(idx); return s })
    setEnviados(e => new Set([...e, idx]))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-primary-950 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-white font-semibold">{campana ? `Enviar campaña: ${campana}` : 'Enviar material'}</h3>
            <p className="text-primary-300 text-sm">{enviados.size} / {contactos.length} enviados</p>
          </div>
          <button onClick={onCerrar} className="text-primary-300 hover:text-white"><X size={20} /></button>
        </div>

        <div className="h-1.5 bg-gray-100 shrink-0">
          <div className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${contactos.length ? (enviados.size / contactos.length) * 100 : 0}%` }} />
        </div>

        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 shrink-0">
          Haz click en el botón verde para abrir WhatsApp Web. El número queda registrado automáticamente.
        </div>

        <ul className="overflow-y-auto flex-1 divide-y divide-gray-50 px-2 py-2">
          {contactos.map((c, i) => {
            const msg    = personalizarMensaje(mensaje, c)
            const nombre = c['nombre_completo'] ?? c['Nombres'] ?? c['Nombre'] ?? c['nombre'] ?? `Contacto ${i + 1}`
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
