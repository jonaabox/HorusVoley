import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'

const MESES = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
]

export default function Reportes() {
  const [resumen, setResumen] = useState([])
  const [loading, setLoading] = useState(true)
  const anio = new Date().getFullYear()

  useEffect(() => {
    fetchReportes()
  }, [])

  const fetchReportes = async () => {
    setLoading(true)
    // Filtramos por fecha_pago (cuándo se cobró), no por mes_correspondiente
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto, fecha_pago')
      .gte('fecha_pago', `${anio}-01-01`)
      .lte('fecha_pago', `${anio}-12-31`)

    const totalesPorMes = Array.from({ length: 12 }, (_, i) => {
      const prefijo = `${anio}-${String(i + 1).padStart(2, '0')}`
      const total = (pagos ?? [])
        .filter(p => p.fecha_pago?.startsWith(prefijo))
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0)
      return { mes: MESES[i], total }
    })

    setResumen(totalesPorMes)
    setLoading(false)
  }

  const maxTotal = Math.max(...resumen.map((r) => r.total), 1)
  const totalAnio = resumen.reduce((sum, r) => sum + r.total, 0)
  const mesMayor  = resumen.reduce((prev, curr) => (curr.total > prev.total ? curr : prev), resumen[0] ?? { mes: '—', total: 0 })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reportes</h2>
        <p className="text-gray-500 text-sm mt-1">Resumen de ingresos del año {anio}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          <div className="p-3 rounded-xl bg-primary-800">
            <DollarSign size={22} className="text-white" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total anual {anio}</p>
            <p className="text-2xl font-bold text-gray-800">S/ {totalAnio.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
          <div className="p-3 rounded-xl bg-gold-600">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Mejor mes</p>
            <p className="text-2xl font-bold text-gray-800">
              {mesMayor?.mes} — S/ {(mesMayor?.total ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-primary-700" />
          <h3 className="font-semibold text-gray-800">Ingresos mensuales</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="flex items-end gap-2 h-48">
            {resumen.map((item) => (
              <div key={item.mes} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">
                  {item.total > 0 ? `S/${item.total.toFixed(0)}` : ''}
                </span>
                <div className="w-full relative flex justify-center">
                  <div
                    className="w-full rounded-t-md bg-primary-700 hover:bg-gold-600 transition-colors cursor-default"
                    style={{ height: `${(item.total / maxTotal) * 160}px`, minHeight: item.total > 0 ? '4px' : '0' }}
                    title={`${item.mes}: S/ ${item.total.toFixed(2)}`}
                  />
                </div>
                <span className="text-xs text-gray-500">{item.mes}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
