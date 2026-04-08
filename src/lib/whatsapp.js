export function buildWaUrl(telefono, mensaje) {
  return `https://web.whatsapp.com/send/?phone=${telefono}&text=${encodeURIComponent(mensaje)}&type=phone_number&app_absent=0`
}

export function personalizarMensaje(template, contacto) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => contacto[k] ?? `{{${k}}}`)
}

export function limpiarTelefono(raw, prefijo) {
  if (!raw) return null
  const limpio = String(raw).replace(/[\s\-\(\)\+]/g, '')
  if (limpio.length < 7) return null
  return limpio.startsWith(prefijo) ? limpio : prefijo + limpio
}
