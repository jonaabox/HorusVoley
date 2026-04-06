import { useState } from 'react'
import { Search, CheckCircle, XCircle, Loader2, UserSearch, Receipt, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function calcularDeuda(fechaInscripcion, pagos) {
  const hoy = new Date()
  const diaVenc = 5
  const inscripcion = new Date(fechaInscripcion + 'T00:00:00')
  let cursor = new Date(inscripcion.getFullYear(), inscripcion.getMonth(), 1)
  const limite = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const deuda = []
  
  while (cursor <= limite) {
    const mes = cursor.getMonth() + 1
    const anio = cursor.getFullYear()
    const esActual = anio === hoy.getFullYear() && mes === (hoy.getMonth() + 1)
    const vencioHoy = hoy.getDate() > diaVenc
    
    if (esActual && !vencioHoy) { 
      cursor.setMonth(cursor.getMonth() + 1)
      continue 
    }
    
    const pagado = pagos.some(p => p.mes === mes && p.anio === anio)
    if (!pagado) {
      deuda.push({ mes, anio })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return deuda
}

export default function Validacion() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [tab, setTab] = useState('recibo') // 'recibo' | 'nombre'
  
  // Recibo State
  const [codigo, setCodigo] = useState('')
  const [loadingRecibo, setLoadingRecibo] = useState(false)
  const [resultadoRecibo, setResultadoRecibo] = useState(null)
  const [errorRecibo, setErrorRecibo] = useState('')

  // Nombre State
  const [nombre, setNombre] = useState('')
  const [loadingNombre, setLoadingNombre] = useState(false)
  const [resultadoNombre, setResultadoNombre] = useState(null)
  const [errorNombre, setErrorNombre] = useState('')

  const handleValidarRecibo = async (e) => {
    e.preventDefault()
    setLoadingRecibo(true)
    setResultadoRecibo(null)
    setErrorRecibo('')

    let searchCode = codigo.trim().toUpperCase()
    if (searchCode.startsWith('REC-')) searchCode = searchCode.slice(4)

    if (searchCode.length !== 8) {
      setErrorRecibo('El código debe tener exactamente 8 caracteres (ej: REC-123E4567).')
      setLoadingRecibo(false)
      return
    }

    try {
      const { data, error: err } = await supabase.rpc('validar_recibo_publico', {
        codigo_busqueda: searchCode
      })
      if (err) throw err
      if (data && data.valido) {
        setResultadoRecibo({
          alumnos: { nombre_completo: data.alumno_nombre },
          fecha_pago: data.fecha_pago,
          monto: data.monto,
          mes_correspondiente: data.mes,
          año_correspondiente: data.anio
        })
      } else {
        setResultadoRecibo(false)
      }
    } catch (e) {
      setErrorRecibo('Ocurrió un error al buscar el recibo.')
    }
    setLoadingRecibo(false)
  }

  const handleValidarNombre = async (e) => {
    e.preventDefault()
    setLoadingNombre(true)
    setResultadoNombre(null)
    setErrorNombre('')

    const busqueda = nombre.trim()
    if (busqueda.length < 4) {
      setErrorNombre('Escribe al menos 4 letras para buscar.')
      setLoadingNombre(false)
      return
    }

    try {
      const { data, error: err } = await supabase.rpc('buscar_alumno_deuda_publico', {
        busqueda
      })
      if (err) throw err
      
      if (data && data.length > 0) {
        // Calcular deuda para cada alumno encontrado
        const alumnosConDeuda = data.map(al => {
          const deudas = calcularDeuda(al.fecha_inscripcion, al.pagos)
          return { ...al, deudas }
        })
        setResultadoNombre(alumnosConDeuda)
      } else {
        setResultadoNombre([])
      }
    } catch (e) {
      setErrorNombre('Ocurrió un error al buscar al alumno.')
    }
    setLoadingNombre(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-lg relative">
        {/* Botón Volver dinámico */}
        <button
          onClick={() => navigate(user ? '/' : '/login')}
          className="absolute -top-12 left-0 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary-800 transition-colors"
        >
          <ArrowLeft size={16} />
          {user ? 'Volver al Sistema' : 'Volver a Iniciar Sesión'}
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-950">Vóley Control</h1>
          <p className="text-gray-500 mt-2">Consulta Pública de Recibos y Cuotas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab('recibo')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                tab === 'recibo' ? 'text-primary-800 border-b-2 border-primary-800 bg-primary-50/50' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Receipt size={18} /> Por Recibo
            </button>
            <button
              onClick={() => setTab('nombre')}
              className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                tab === 'nombre' ? 'text-primary-800 border-b-2 border-primary-800 bg-primary-50/50' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <UserSearch size={18} /> Por Alumno
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {tab === 'recibo' && (
              <div className="animate-in fade-in duration-300">
                <form onSubmit={handleValidarRecibo}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Recibo
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ej. REC-123E4567"
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 uppercase"
                    />
                  </div>
                  {errorRecibo && <p className="mt-3 text-sm text-red-600">{errorRecibo}</p>}
                  
                  <button
                    type="submit" disabled={loadingRecibo || !codigo}
                    className="mt-6 w-full flex justify-center py-3 bg-primary-800 hover:bg-primary-700 text-white font-medium rounded-xl disabled:opacity-60 transition-all"
                  >
                    {loadingRecibo ? <Loader2 className="animate-spin h-5 w-5" /> : 'Validar Recibo Oficial'}
                  </button>
                </form>

                {resultadoRecibo === false && (
                  <div className="mt-8 bg-red-50 rounded-xl p-5 border border-red-100 text-center">
                    <XCircle className="mx-auto h-12 w-12 text-red-500 mb-2" />
                    <h3 className="font-bold text-red-800">Recibo no encontrado</h3>
                    <p className="text-red-600 text-sm">Este código no existe o fue anulado.</p>
                  </div>
                )}

                {resultadoRecibo && typeof resultadoRecibo === 'object' && (
                  <div className="mt-8 bg-green-50 rounded-xl p-5 border border-green-100 text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
                    <h3 className="font-bold text-green-800">Recibo Válido y Oficial</h3>
                    <div className="mt-4 bg-white rounded-lg p-4 text-left border border-green-100 shadow-sm space-y-2">
                      <p className="text-sm border-b border-green-50 pb-2"><span className="text-gray-500 font-medium inline-block w-20">Alumno:</span><span className="font-bold">{resultadoRecibo.alumnos?.nombre_completo}</span></p>
                      <p className="text-sm border-b border-green-50 pb-2"><span className="text-gray-500 font-medium inline-block w-20">Monto:</span><span className="font-bold">Gs. {resultadoRecibo.monto.toLocaleString('es-PY')}</span></p>
                      <p className="text-sm"><span className="text-gray-500 font-medium inline-block w-20">Concepto:</span><span className="font-bold">Mes {resultadoRecibo.mes_correspondiente} / {resultadoRecibo.año_correspondiente}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'nombre' && (
              <div className="animate-in fade-in duration-300">
                <form onSubmit={handleValidarNombre}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre o Apellido del Alumno
                  </label>
                  <div className="relative">
                    <UserSearch className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Juan Perez"
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  {errorNombre && <p className="mt-3 text-sm text-red-600">{errorNombre}</p>}
                  
                  <button
                    type="submit" disabled={loadingNombre || !nombre}
                    className="mt-6 w-full flex justify-center py-3 bg-primary-800 hover:bg-primary-700 text-white font-medium rounded-xl disabled:opacity-60 transition-all"
                  >
                    {loadingNombre ? <Loader2 className="animate-spin h-5 w-5" /> : 'Consultar Estado de Cuotas'}
                  </button>
                </form>

                {resultadoNombre && resultadoNombre.length === 0 && (
                  <div className="mt-8 bg-gray-50 rounded-xl p-5 border border-gray-200 text-center">
                    <p className="text-gray-600 text-sm">No se encontraron alumnos con ese nombre.</p>
                  </div>
                )}

                {resultadoNombre && resultadoNombre.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">Resultados ({resultadoNombre.length})</h3>
                    {resultadoNombre.map((al) => (
                      <div key={al.alumno_id} className="bg-white border rounded-xl overflow-hidden shadow-sm p-4">
                        <p className="font-bold text-primary-950 text-lg">{al.nombre_completo}</p>
                        
                        <div className="mt-3">
                          {al.deudas.length === 0 ? (
                            <div className="bg-green-50 text-green-800 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                              <CheckCircle size={16} className="text-green-600" /> AL DÍA - Sin cuotas pendientes
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-red-600">Cuotas Pendientes ({al.deudas.length}):</p>
                              <div className="flex flex-wrap gap-2">
                                {al.deudas.map((d, i) => (
                                  <span key={i} className="bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded text-xs font-bold">
                                    {MESES[d.mes - 1]} {d.anio}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
