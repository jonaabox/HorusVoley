import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Check, Loader2, MessageSquare, Clock, Smile, SmilePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildWaUrl, personalizarMensaje } from '../lib/whatsapp'

// Elimina emojis Unicode del texto
function quitarEmojis(texto) {
  return texto
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function formatTime(segundos) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  if (m === 0) return `${s}s`
  return `${m}:${String(s).padStart(2, '0')} min`
}

export default function EnvioModal({ contactos, mensaje, campana, onCerrar }) {
  const [enviados, setEnviados]         = useState(new Set())
  const [guardando, setGuardando]       = useState(new Set())

  // Ritmo humano
  const [modoRitmo, setModoRitmo]       = useState(false)
  const [alternarEmoji, setAlternarEmoji] = useState(false)
  const [countdown, setCountdown]       = useState(0)
  const [esPausaBloque, setEsPausaBloque] = useState(false)
  const [msgsEnviados, setMsgsEnviados] = useState(0)
  const countdownRef = useRef(0)

  // Variante emoji por contacto: se asigna al montar (50% sin emoji)
  const variantesEmoji = useMemo(
    () => contactos.map(() => Math.random() < 0.5),
    [contactos]
  )

  // Intervalo único que decrementa el countdown
  useEffect(() => {
    const id = setInterval(() => {
      if (countdownRef.current > 0) {
        countdownRef.current -= 1
        setCountdown(countdownRef.current)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const iniciarCountdown = (segundos, bloque = false) => {
    countdownRef.current = segundos
    setCountdown(segundos)
    setEsPausaBloque(bloque)
  }

  // Marcar como enviado + guardar historial + iniciar ritmo
  const marcar = async (idx, telefono) => {
    if (enviados.has(idx) || countdown > 0) return

    setGuardando(g => new Set([...g, idx]))
    if (campana) {
      await supabase.from('envios_historial')
        .upsert({ telefono, campana }, { onConflict: 'campana,telefono', ignoreDuplicates: true })
    }
    setGuardando(g => { const s = new Set(g); s.delete(idx); return s })
    setEnviados(e => new Set([...e, idx]))

    if (modoRitmo) {
      const siguiente = msgsEnviados + 1
      setMsgsEnviados(siguiente)

      if (siguiente % 10 === 0) {
        // Pausa de bloque: 10-15 minutos
        const pausa = Math.floor(Math.random() * 300 + 600)
        iniciarCountdown(pausa, true)
      } else {
        // Pausa corta: 30-60 segundos
        const pausa = Math.floor(Math.random() * 31 + 30)
        iniciarCountdown(pausa, false)
      }
    }
  }

  const getMensaje = (contacto, idx) => {
    const base = personalizarMensaje(mensaje, contacto)
    if (!alternarEmoji) return base
    return variantesEmoji[idx] ? base : quitarEmojis(base)
  }

  const bloqueado = countdown > 0

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-primary-950 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-white font-semibold">
              {campana ? `Enviar: ${campana}` : 'Enviar mensaje'}
            </h3>
            <p className="text-primary-300 text-sm">{enviados.size} / {contactos.length} enviados</p>
          </div>
          <button onClick={onCerrar} className="text-primary-300 hover:text-white"><X size={20} /></button>
        </div>

        {/* Barra de progreso */}
        <div className="h-1.5 bg-gray-100 shrink-0">
          <div
            className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${contactos.length ? (enviados.size / contactos.length) * 100 : 0}%` }}
          />
        </div>

        {/* Instrucción base */}
        <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 shrink-0">
          Hacé click en el botón verde → se abre WhatsApp con el mensaje listo · el número queda registrado automáticamente.
        </div>

        {/* ── Opciones de ritmo ── */}
        <div className="px-5 py-3 border-b border-gray-100 space-y-2 shrink-0">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => { setModoRitmo(v => !v); if (bloqueado) { countdownRef.current = 0; setCountdown(0) } }}
              className={`w-9 h-5 rounded-full transition-colors relative ${modoRitmo ? 'bg-primary-700' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${modoRitmo ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Ritmo humano (anti-ban)</span>
              <span className="text-xs text-gray-400 ml-2">30–60s entre envíos · pausa 10–15 min cada 10 mensajes</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setAlternarEmoji(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative ${alternarEmoji ? 'bg-primary-700' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${alternarEmoji ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Alternar emojis
                <Smile size={13} className="text-gold-500" />
              </span>
              <span className="text-xs text-gray-400 ml-2">~50% de mensajes sin emojis para mayor variación</span>
            </div>
          </label>
        </div>

        {/* ── Countdown banner ── */}
        {bloqueado && (
          <div className={`px-5 py-3 flex items-center gap-3 shrink-0 ${esPausaBloque ? 'bg-orange-50 border-b border-orange-200' : 'bg-blue-50 border-b border-blue-100'}`}>
            <Clock size={16} className={esPausaBloque ? 'text-orange-500 shrink-0' : 'text-blue-500 shrink-0'} />
            <div className="flex-1">
              {esPausaBloque ? (
                <>
                  <p className="text-sm font-semibold text-orange-700">Pausa de bloque (10 mensajes enviados)</p>
                  <p className="text-xs text-orange-500">Reanuda en <strong>{formatTime(countdown)}</strong> · reducís el riesgo de baneo</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-blue-700">Esperando antes del próximo envío</p>
                  <p className="text-xs text-blue-500">Próximo habilitado en <strong>{formatTime(countdown)}</strong></p>
                </>
              )}
            </div>
            <span className={`text-2xl font-bold tabular-nums ${esPausaBloque ? 'text-orange-600' : 'text-blue-600'}`}>
              {formatTime(countdown)}
            </span>
          </div>
        )}

        {/* Lista de contactos */}
        <ul className="overflow-y-auto flex-1 divide-y divide-gray-50 px-2 py-2">
          {contactos.map((c, i) => {
            const msg       = getMensaje(c, i)
            const nombre    = c['nombre_completo'] ?? c['Nombres'] ?? c['Nombre'] ?? c['nombre'] ?? `Contacto ${i + 1}`
            const enviado   = enviados.has(i)
            const cargando  = guardando.has(i)
            const esProximo = !enviado && !bloqueado
            const tieneEmoji = alternarEmoji && !variantesEmoji[i]

            return (
              <li key={i} className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${enviado ? 'bg-green-50' : ''}`}>
                {/* Checkbox visual */}
                <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${enviado ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200'}`}>
                  {enviado && <Check size={11} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-medium truncate ${enviado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {nombre}
                    </p>
                    {alternarEmoji && !enviado && (
                      <span title={tieneEmoji ? 'Sin emoji' : 'Con emoji'}>
                        {tieneEmoji
                          ? <SmilePlus size={12} className="text-gray-300 shrink-0" />
                          : <Smile size={12} className="text-gold-400 shrink-0" />
                        }
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{c.telefono}</p>
                </div>

                {/* Botón */}
                <a
                  href={esProximo ? buildWaUrl(c.telefono, msg) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={esProximo ? () => marcar(i, c.telefono) : e => e.preventDefault()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition min-w-[72px] justify-center ${
                    enviado
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : cargando
                      ? 'bg-green-100 text-green-600 cursor-wait'
                      : bloqueado
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm'
                  }`}
                >
                  {cargando
                    ? <Loader2 size={12} className="animate-spin" />
                    : enviado
                    ? 'Enviado'
                    : bloqueado
                    ? <><Clock size={11} /> Esperar</>
                    : <><MessageSquare size={12} /> Abrir</>
                  }
                </a>
              </li>
            )
          })}
        </ul>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="text-sm text-gray-500">
            {enviados.size} de {contactos.length} enviados
            {modoRitmo && msgsEnviados > 0 && (
              <span className="text-xs text-gray-400 ml-2">
                · bloque {Math.floor(msgsEnviados / 10) + 1} ({msgsEnviados % 10}/10)
              </span>
            )}
          </div>
          <button
            onClick={onCerrar}
            className="px-5 py-2 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
