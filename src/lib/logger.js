import { supabase } from './supabase'

const IS_DEV = import.meta.env.DEV

// Niveles que se persisten en la base de datos (info NO se guarda)
const PERSIST_LEVELS = new Set(['warning', 'error', 'critical'])

function buildMetadata(errorOrMeta) {
  if (!errorOrMeta) return null
  if (errorOrMeta instanceof Error) {
    return {
      name:    errorOrMeta.name,
      message: errorOrMeta.message,
      stack:   errorOrMeta.stack ?? null,
      cause:   errorOrMeta.cause ? String(errorOrMeta.cause) : undefined,
    }
  }
  // Si ya es un objeto plano (ej: { componentStack })
  return errorOrMeta
}

async function log(level, module, message, errorOrMeta = null) {
  const metadata = buildMetadata(errorOrMeta)

  // Siempre loguear en consola durante desarrollo
  if (IS_DEV) {
    const consoleFn =
      level === 'critical' || level === 'error' ? console.error
      : level === 'warning' ? console.warn
      : console.info
    consoleFn(`[${level.toUpperCase()}] [${module}]`, message, metadata ?? '')
  }

  // Solo persistir warning o superior
  if (!PERSIST_LEVELS.has(level)) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('app_logs').insert({
      level,
      module,
      message,
      metadata,
      user_id: user?.id ?? null,
    })
  } catch (persistError) {
    // Nunca lanzar desde el logger — loguear en consola y seguir
    console.error('[logger] No se pudo persistir el log:', persistError)
  }
}

export const logger = {
  info:     (module, message, meta)  => log('info',     module, message, meta),
  warning:  (module, message, meta)  => log('warning',  module, message, meta),
  error:    (module, message, error) => log('error',    module, message, error),
  critical: (module, message, error) => log('critical', module, message, error),
}
