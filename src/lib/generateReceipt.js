import { jsPDF } from 'jspdf'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function imageToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas  = document.createElement('canvas')
      canvas.width  = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}

export async function generateReceipt(params) {
  const {
    pagoId, alumnoNombre, alumnoNivel, alumnoFrecuencia,
    monto, fechaPago, mes, anio, logoUrl,
    mesesPendientes = [],
    tipo = 'normal',
  } = params

  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const W   = doc.internal.pageSize.getWidth()
  const H   = doc.internal.pageSize.getHeight()

  const PURPLE = [76, 29, 149]
  const GOLD   = [217, 119, 6]
  const LIGHT  = [245, 243, 255]
  const GRAY   = [107, 114, 128]
  const DARK   = [31, 41, 55]

  // ── Marca de agua ────────────────────────────────────────────────────────
  doc.saveGraphicsState()
  try {
    doc.setGState(doc.GState({ opacity: 0.045 }))
  } catch (_) {}
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(76, 29, 149)
  doc.setFontSize(52)
  doc.text('HORUS VOLEY', W / 2, H / 2 - 10, { align: 'center', angle: 45 })
  doc.setFontSize(28)
  doc.text('ACADEMY', W / 2, H / 2 + 22, { align: 'center', angle: 45 })
  doc.restoreGraphicsState()

  // ── Cabecera morada ──────────────────────────────────────────────────────
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, W, 42, 'F')

  try {
    const base64 = await imageToBase64(logoUrl)
    doc.addImage(base64, 'PNG', 8, 4, 26, 26)
  } catch (_) {}

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('HORUS VOLEY ACADEMY', 38, 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(196, 181, 253)
  doc.text('Sistema de gestión · Vóley Control', 38, 20)

  // Banner dorado
  doc.setFillColor(...GOLD)
  doc.rect(0, 34, W, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('RECIBO DE PAGO', W / 2, 40.5, { align: 'center' })

  // ── N° y fecha ───────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(0, 44, W, 14, 'F')

  doc.setTextColor(...GRAY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('N° DE RECIBO', 10, 50)
  doc.text('FECHA DE PAGO', W / 2 + 4, 50)

  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`REC-${pagoId.substring(0, 8).toUpperCase()}`, 10, 56)

  const [y, m, d] = fechaPago.split('-')
  doc.text(`${d}/${m}/${y}`, W / 2 + 4, 56)

  // ── Datos del alumno ─────────────────────────────────────────────────────
  let cy = 66

  doc.setFillColor(...PURPLE)
  doc.rect(10, cy, W - 20, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DEL ALUMNO', 14, cy + 4.2)
  cy += 8

  const filaAlumno = [
    ['Nombre completo', alumnoNombre],
    ['Nivel',           alumnoNivel.charAt(0).toUpperCase() + alumnoNivel.slice(1)],
    ['Frecuencia',      alumnoFrecuencia === 1 ? '1 vez por semana' : '2 veces por semana'],
  ]

  filaAlumno.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(label, 14, cy + 4)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(value, 60, cy + 4)

    doc.setDrawColor(229, 231, 235)
    doc.line(10, cy + 7, W - 10, cy + 7)
    cy += 9
  })

  cy += 2

  // ── Detalle del pago ─────────────────────────────────────────────────────
  doc.setFillColor(...PURPLE)
  doc.rect(10, cy, W - 20, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLE DEL PAGO', 14, cy + 4.2)
  cy += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Concepto', 14, cy + 4)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  const concepto = tipo === 'prueba'
    ? `Clase de prueba (pago parcial) · ${MESES[mes - 1]} ${anio}`
    : `Cuota mensual · ${MESES[mes - 1]} ${anio}`
  doc.text(concepto, 60, cy + 4)
  cy += 9

  // Caja de monto
  doc.setFillColor(...GOLD)
  doc.roundedRect(10, cy, W - 20, 18, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('TOTAL PAGADO', W / 2, cy + 6, { align: 'center' })
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Gs. ${monto.toLocaleString('es-PY')}`, W / 2, cy + 14, { align: 'center' })
  cy += 24

  // ── Estado de cuenta ────────────────────────────────────────────────────
  cy += 6

  doc.setFillColor(...PURPLE)
  doc.rect(10, cy, W - 20, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('ESTADO DE CUENTA', 14, cy + 4.2)
  cy += 8

  if (mesesPendientes.length === 0) {
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(10, cy, W - 20, 12, 2, 2, 'F')
    doc.setTextColor(21, 128, 61)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('AL DIA  -  Sin cuotas pendientes', W / 2, cy + 7.8, { align: 'center' })
    cy += 14
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(`Cuotas pendientes: ${mesesPendientes.length}`, 14, cy + 5)
    cy += 8

    const mostrar = mesesPendientes.slice(0, 5)
    const hayMas  = mesesPendientes.length > 5

    for (const { mes: m, anio: a, vencido } of mostrar) {
      doc.setFillColor(...(vencido ? [254, 226, 226] : [254, 243, 199]))
      doc.roundedRect(14, cy, W - 28, 8, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...(vencido ? [185, 28, 28] : [146, 64, 14]))
      doc.text(`${MESES[m - 1]} ${a}`, 18, cy + 5.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(vencido ? 'VENCIDO' : 'PENDIENTE', W - 16, cy + 5.5, { align: 'right' })
      cy += 10
    }

    if (hayMas) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(...GRAY)
      doc.text(`... y ${mesesPendientes.length - 5} mes(es) mas`, 14, cy + 4)
      cy += 7
    }
  }

  // ── Pie de página ────────────────────────────────────────────────────────
  doc.setFillColor(...PURPLE)
  doc.rect(0, H - 6, W, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Horus Voley Academy · Este recibo es comprobante válido de pago', W / 2, H - 2.5, { align: 'center' })

  doc.save(`recibo-${pagoId.substring(0, 8)}.pdf`)
}
