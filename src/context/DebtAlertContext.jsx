import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DebtAlertContext = createContext({ debtors: [], loading: false, refresh: () => {} })

export function useDebtAlert() {
  return useContext(DebtAlertContext)
}

export function DebtAlertProvider({ children }) {
  const { user } = useAuth()
  const [debtors, setDebtors] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { setDebtors([]); return }
    checkDebtors()
  }, [user])

  const checkDebtors = async () => {
    setLoading(true)
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear  = today.getFullYear()

    const [{ data: config }, { data: alumnos }, { data: pagos }] = await Promise.all([
      supabase.from('configuracion').select('clave, valor')
        .in('clave', ['dia_vencimiento_cuota', 'dias_aviso_vencimiento']),
      supabase.from('alumnos').select('id, nombre_completo, telefono')
        .eq('estado', 'activo'),
      supabase.from('pagos')
        .select('alumno_id')
        .eq('mes_correspondiente', currentMonth)
        .eq('año_correspondiente', currentYear),
    ])

    const diaVenc   = parseInt(config?.find(c => c.clave === 'dia_vencimiento_cuota')?.valor   ?? '5')
    const diasAviso = parseInt(config?.find(c => c.clave === 'dias_aviso_vencimiento')?.valor  ?? '5')

    const dueDate      = new Date(currentYear, currentMonth - 1, diaVenc)
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

    // Outside the alert window: no notification
    if (daysUntilDue > diasAviso) {
      setDebtors([])
      setLoading(false)
      return
    }

    const paidIds = new Set((pagos ?? []).map(p => p.alumno_id))

    const result = (alumnos ?? [])
      .filter(a => !paidIds.has(a.id))
      .map(a => {
        const digits  = (a.telefono ?? '').replace(/\D/g, '')
        const cleaned = digits.startsWith('0') ? digits.slice(1) : digits
        const telefono = cleaned.startsWith('595') ? cleaned : '595' + cleaned
        return { id: a.id, nombre_completo: a.nombre_completo, telefono }
      })
      .filter(a => a.telefono.length >= 11) // at least 595 + 8 digits

    setDebtors(result)
    setLoading(false)
  }

  return (
    <DebtAlertContext.Provider value={{ debtors, loading, refresh: checkDebtors }}>
      {children}
    </DebtAlertContext.Provider>
  )
}
