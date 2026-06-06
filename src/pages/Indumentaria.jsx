import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shirt, Plus, Search, Trash2, CreditCard,
  DollarSign, CheckCircle2, AlertCircle, ShoppingBag, Loader2, X, Download
} from 'lucide-react'

const TIPOS_PRENDA = {
  camiseta: 'Camiseta Oficial',
  accesorios: 'Accesorios',
  indumentaria: 'Indumentaria General'
}

const TALLES = ['PP', 'P', 'M', 'G', 'GG', 'XG']

export default function Indumentaria() {
  const [pedidos, setPedidos] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroTalle, setFiltroTalle] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Modales
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({
    alumno_id: '',
    tipo_prenda: 'camiseta',
    talle: 'PP',
    monto_total: '',
    monto_pagado: '',
    nombre_camiseta: ''
  })
  const [nuevoSaving, setNuevoSaving] = useState(false)
  const [nuevoError, setNuevoError] = useState('')

  // Modal registrar pago parcial
  const [pagoOpen, setPagoOpen] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)
  const [montoAbonar, setMontoAbonar] = useState('')
  const [pagoSaving, setPagoSaving] = useState(false)
  const [pagoError, setPagoError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [
      { data: pedidosData },
      { data: alumnosData }
    ] = await Promise.all([
      supabase.from('pedidos_indumentaria').select('*, alumnos(nombre_completo)').order('created_at', { ascending: false }),
      supabase.from('alumnos').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo')
    ])

    setPedidos(pedidosData ?? [])
    setAlumnos(alumnosData ?? [])
    setLoading(false)
  }

  const handleNuevoSubmit = async (e) => {
    e.preventDefault()
    if (!nuevoForm.alumno_id) {
      setNuevoError('Debe seleccionar un alumno.')
      return
    }

    setNuevoSaving(true)
    setNuevoError('')

    const total = parseFloat(nuevoForm.monto_total || 0)
    const pagado = parseFloat(nuevoForm.monto_pagado || 0)

    if (pagado > total) {
      setNuevoError('El monto pagado no puede ser mayor que el monto total.')
      setNuevoSaving(false)
      return
    }

    const payload = {
      alumno_id: nuevoForm.alumno_id,
      tipo_prenda: nuevoForm.tipo_prenda,
      talle: nuevoForm.talle,
      monto_total: total,
      monto_pagado: pagado,
      nombre_camiseta: nuevoForm.nombre_camiseta.trim() || null
    }

    const { data, error } = await supabase
      .from('pedidos_indumentaria')
      .insert(payload)
      .select('*, alumnos(nombre_completo)')
      .single()

    setNuevoSaving(false)
    if (error) {
      setNuevoError(error.message)
      return
    }

    setPedidos(prev => [data, ...prev])
    setNuevoOpen(false)
    setNuevoForm({
      alumno_id: '',
      tipo_prenda: 'camiseta',
      talle: 'PP',
      monto_total: '',
      monto_pagado: '',
      nombre_camiseta: ''
    })
  }

  const handleRegistrarPago = async (e) => {
    e.preventDefault()
    if (!pedidoSeleccionado) return

    setPagoSaving(true)
    setPagoError('')

    const abono = parseFloat(montoAbonar || 0)
    const maxAbonar = pedidoSeleccionado.monto_total - pedidoSeleccionado.monto_pagado

    if (abono <= 0) {
      setPagoError('El monto a abonar debe ser mayor que cero.')
      setPagoSaving(false)
      return
    }

    if (abono > maxAbonar) {
      setPagoError(`El monto máximo que falta pagar es Gs. ${maxAbonar.toLocaleString('es-PY')}.`)
      setPagoSaving(false)
      return
    }

    const nuevoPagado = parseFloat(pedidoSeleccionado.monto_pagado) + abono

    const { data, error } = await supabase
      .from('pedidos_indumentaria')
      .update({ monto_pagado: nuevoPagado })
      .eq('id', pedidoSeleccionado.id)
      .select('*, alumnos(nombre_completo)')
      .single()

    setPagoSaving(false)
    if (error) {
      setPagoError(error.message)
      return
    }

    setPedidos(prev => prev.map(p => p.id === data.id ? data : p))
    setPagoOpen(false)
    setPedidoSeleccionado(null)
    setMontoAbonar('')
  }

  const handleEliminarPedido = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este pedido de indumentaria?')) return
    const { error } = await supabase.from('pedidos_indumentaria').delete().eq('id', id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
      return
    }
    setPedidos(prev => prev.filter(p => p.id !== id))
  }

  // Filtrado de pedidos
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const nombreMatches = p.alumnos?.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
      const tipoMatches = !filtroTipo || p.tipo_prenda === filtroTipo
      const talleMatches = !filtroTalle || p.talle === filtroTalle

      let estadoMatches = true
      if (filtroEstado === 'completado') {
        estadoMatches = parseFloat(p.monto_pagado) >= parseFloat(p.monto_total)
      } else if (filtroEstado === 'pendiente') {
        estadoMatches = parseFloat(p.monto_pagado) < parseFloat(p.monto_total)
      }

      return nombreMatches && tipoMatches && talleMatches && estadoMatches
    })
  }, [pedidos, busqueda, filtroTipo, filtroTalle, filtroEstado])

  const exportCSV = () => {
    const rows = pedidosFiltrados.map(p => {
      const total = parseFloat(p.monto_total || 0)
      const pagado = parseFloat(p.monto_pagado || 0)
      const restante = total - pagado
      const esCompletado = restante <= 0
      return [
        p.alumnos?.nombre_completo ?? '',
        p.nombre_camiseta ?? '',
        p.talle,
        TIPOS_PRENDA[p.tipo_prenda] ?? p.tipo_prenda,
        esCompletado ? 'Pagado' : 'Pendiente',
        esCompletado ? 'Sí' : 'No',
        total.toLocaleString('es-PY'),
        pagado.toLocaleString('es-PY'),
        restante > 0 ? restante.toLocaleString('es-PY') : '0'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const header = [
      '"Nombre Alumno"',
      '"Nombre en Camiseta"',
      '"Talle"',
      '"Tipo Prenda"',
      '"Estado"',
      '"Pago Completo"',
      '"Monto Total (Gs.)"',
      '"Monto Pagado (Gs.)"',
      '"Deuda (Gs.)"'
    ].join(',')
    const csv = [header, ...rows].join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `indumentaria_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Estadísticas del banner superior
  const stats = useMemo(() => {
    let total = 0
    let recaudado = 0
    let pendiente = 0
    const tallesStock = Object.fromEntries(TALLES.map(t => [t, 0]))

    pedidos.forEach(p => {
      const tot = parseFloat(p.monto_total || 0)
      const pag = parseFloat(p.monto_pagado || 0)
      total += tot
      recaudado += pag
      pendiente += (tot - pag)
      if (tallesStock[p.talle] !== undefined) {
        tallesStock[p.talle]++
      }
    })

    return { total, recaudado, pendiente, tallesStock }
  }, [pedidos])

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Indumentaria y Camisetas</h2>
          <p className="text-gray-500 text-sm mt-1">Control de pedidos oficiales, talles y saldos pendientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={() => setNuevoOpen(true)}
            className="flex items-center gap-2 bg-primary-800 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus size={16} />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Banner de métricas premium */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary-950 to-primary-900 text-white rounded-2xl shadow-sm border border-primary-800 px-5 py-4 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <ShoppingBag size={24} className="text-gold-400" />
          </div>
          <div>
            <p className="text-xs text-primary-200">Total en Pedidos</p>
            <p className="text-lg font-bold">Gs. {stats.total.toLocaleString('es-PY')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-green-50 rounded-xl">
            <CheckCircle2 size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Recaudado (Abonado)</p>
            <p className="text-lg font-bold text-green-700">Gs. {stats.recaudado.toLocaleString('es-PY')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-red-50 rounded-xl">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pendiente de Cobro</p>
            <p className="text-lg font-bold text-red-600">Gs. {stats.pendiente.toLocaleString('es-PY')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Shirt size={24} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Pedidos por Talle</p>
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              {TALLES.map(t => (
                <span key={t} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  {t}: {stats.tallesStock[t] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de alumno..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>

        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_PRENDA).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filtroTalle}
            onChange={e => setFiltroTalle(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos los talles</option>
            {TALLES.map(t => (
              <option key={t} value={t}>Talle {t}</option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes de Pago</option>
            <option value="completado">Pagados Completamente</option>
          </select>
        </div>
      </div>

      {/* Listado de pedidos (Tabla) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">No se encontraron pedidos con los filtros aplicados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-950 text-primary-200 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Alumno</th>
                  <th className="px-6 py-3 font-medium">Nombre en Camiseta</th>
                  <th className="px-6 py-3 font-medium">Prenda / Tipo</th>
                  <th className="px-6 py-3 font-medium text-center">Talle</th>
                  <th className="px-6 py-3 font-medium text-right">Monto Total</th>
                  <th className="px-6 py-3 font-medium text-right">Monto Pagado</th>
                  <th className="px-6 py-3 font-medium text-right">Monto Restante</th>
                  <th className="px-6 py-3 font-medium text-center">Estado</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidosFiltrados.map(p => {
                  const total = parseFloat(p.monto_total || 0)
                  const pagado = parseFloat(p.monto_pagado || 0)
                  const restante = total - pagado
                  const esCompletado = restante <= 0

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">{p.alumnos?.nombre_completo}</td>
                      <td className="px-6 py-4 text-gray-600 italic">{p.nombre_camiseta || <span className="text-gray-300">—</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.tipo_prenda === 'camiseta' ? 'bg-emerald-50 text-emerald-700' :
                          p.tipo_prenda === 'accesorios' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {TIPOS_PRENDA[p.tipo_prenda]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold text-xs">{p.talle}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">Gs. {total.toLocaleString('es-PY')}</td>
                      <td className="px-6 py-4 text-right font-medium text-green-700">Gs. {pagado.toLocaleString('es-PY')}</td>
                      <td className="px-6 py-4 text-right font-medium text-red-600">
                        {restante > 0 ? `Gs. ${restante.toLocaleString('es-PY')}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          esCompletado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {esCompletado ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {esCompletado ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!esCompletado && (
                            <button
                              onClick={() => {
                                setPedidoSeleccionado(p)
                                setMontoAbonar(String(restante))
                                setPagoOpen(true)
                              }}
                              className="p-1.5 rounded-lg text-primary-700 hover:bg-primary-50 transition"
                              title="Registrar Abono"
                            >
                              <CreditCard size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminarPedido(p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                            title="Eliminar Pedido"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Pedido */}
      {nuevoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950">
              <h3 className="text-white font-semibold text-sm">Registrar Nuevo Pedido</h3>
              <button onClick={() => setNuevoOpen(false)} className="text-primary-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleNuevoSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Alumno *</label>
                <select
                  required
                  value={nuevoForm.alumno_id}
                  onChange={e => setNuevoForm(f => ({ ...f, alumno_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccione un alumno...</option>
                  {alumnos.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre_completo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre solicitado en camiseta</label>
                <input
                  type="text"
                  placeholder="Nombre a estampar (opcional)"
                  value={nuevoForm.nombre_camiseta}
                  onChange={e => setNuevoForm(f => ({ ...f, nombre_camiseta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Prenda *</label>
                  <select
                    required
                    value={nuevoForm.tipo_prenda}
                    onChange={e => setNuevoForm(f => ({ ...f, tipo_prenda: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(TIPOS_PRENDA).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Talle *</label>
                  <select
                    required
                    value={nuevoForm.talle}
                    onChange={e => setNuevoForm(f => ({ ...f, talle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TALLES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto Total (Gs.) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="Monto total"
                    value={nuevoForm.monto_total}
                    onChange={e => setNuevoForm(f => ({ ...f, monto_total: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto Inicial Abonado (Gs.)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Monto abonado"
                    value={nuevoForm.monto_pagado}
                    onChange={e => setNuevoForm(f => ({ ...f, monto_pagado: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {nuevoError && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{nuevoError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNuevoOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={nuevoSaving}
                  className="flex-1 py-2.5 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition flex items-center justify-center gap-2"
                >
                  {nuevoSaving ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                  {nuevoSaving ? 'Guardando...' : 'Crear Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Abono */}
      {pagoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950">
              <h3 className="text-white font-semibold text-sm">Registrar Abono / Pago</h3>
              <button onClick={() => setPagoOpen(false)} className="text-primary-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegistrarPago} className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500">Abonando para el pedido de:</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{pedidoSeleccionado?.alumnos?.nombre_completo}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {TIPOS_PRENDA[pedidoSeleccionado?.tipo_prenda]} (Talle {pedidoSeleccionado?.talle})
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto Total:</span>
                  <span className="font-semibold text-gray-800">Gs. {parseFloat(pedidoSeleccionado?.monto_total || 0).toLocaleString('es-PY')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto Pagado:</span>
                  <span className="font-semibold text-green-700">Gs. {parseFloat(pedidoSeleccionado?.monto_pagado || 0).toLocaleString('es-PY')}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-600 font-medium">Saldo Restante:</span>
                  <span className="font-bold text-red-600">Gs. {parseFloat((pedidoSeleccionado?.monto_total || 0) - (pedidoSeleccionado?.monto_pagado || 0)).toLocaleString('es-PY')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monto a Abonar (Gs.) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={montoAbonar}
                  onChange={e => setMontoAbonar(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {pagoError && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{pagoError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPagoOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pagoSaving}
                  className="flex-1 py-2.5 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition flex items-center justify-center gap-2"
                >
                  {pagoSaving ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                  {pagoSaving ? 'Registrando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
