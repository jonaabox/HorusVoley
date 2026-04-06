import { useState } from 'react'
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Validacion() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  const handleValidar = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResultado(null)
    setError('')

    let searchCode = codigo.trim().toUpperCase()
    if (searchCode.startsWith('REC-')) {
      searchCode = searchCode.slice(4)
    }

    if (searchCode.length !== 8) {
      setError('El código debe tener exactamente 8 caracteres (ej: REC-123E4567).')
      setLoading(false)
      return
    }

    try {
      // Como PostgREST permite .ilike() en UUIDs usando text casting:
      const { data, error: err } = await supabase
        .from('pagos')
        .select('*, alumnos(nombre_completo)')
        .ilike('id', `${searchCode}%`)
        .limit(1)
        .single()

      if (err) {
        if (err.code === 'PGRST116') {
          setResultado(false) // No encontrado
        } else {
          // Fallback manual en caso de que supabase postgrest falle el cast ilike
          const { data: allData } = await supabase.from('pagos').select('*, alumnos(nombre_completo)')
          const found = allData?.find(p => p.id.toUpperCase().startsWith(searchCode))
          if (found) {
            setResultado(found)
          } else {
            setResultado(false)
          }
        }
      } else {
        setResultado(data)
      }
    } catch (e) {
      setError('Ocurrió un error general.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-950">Vóley Control</h1>
          <p className="text-gray-500 mt-2">Validador Oficial de Recibos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleValidar}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Recibo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej. REC-123E4567"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors uppercase"
              />
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            
            <button
              type="submit"
              disabled={loading || !codigo}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-800 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60 transition-all"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Validar Recibo'}
            </button>
          </form>

          {resultado === false && (
            <div className="mt-8 bg-red-50 rounded-xl p-5 border border-red-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <XCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
              <h3 className="text-lg font-bold text-red-800">Recibo no encontrado</h3>
              <p className="text-red-600 mt-1 text-sm">Este código no existe en nuestra base de datos o fue anulado.</p>
            </div>
          )}

          {resultado && typeof resultado === 'object' && (
            <div className="mt-8 bg-green-50 rounded-xl p-5 border border-green-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
              <h3 className="text-lg font-bold text-green-800">Recibo Válido y Oficial</h3>
              
              <div className="mt-4 bg-white rounded-lg p-4 text-left border border-green-100 shadow-sm space-y-2">
                <p className="text-sm border-b border-green-50 pb-2">
                  <span className="text-gray-500 font-medium w-24 inline-block">Alumno:</span>
                  <span className="font-bold text-gray-800">{resultado.alumnos?.nombre_completo}</span>
                </p>
                <p className="text-sm border-b border-green-50 pb-2">
                  <span className="text-gray-500 font-medium w-24 inline-block">Fecha:</span>
                  <span className="font-bold text-gray-800">
                    {new Date(resultado.fecha_pago + 'T00:00:00').toLocaleDateString('es-PY')}
                  </span>
                </p>
                <p className="text-sm border-b border-green-50 pb-2">
                  <span className="text-gray-500 font-medium w-24 inline-block">Monto:</span>
                  <span className="font-bold text-gray-800">Gs. {resultado.monto.toLocaleString('es-PY')}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500 font-medium w-24 inline-block">Concepto:</span>
                  <span className="font-bold text-gray-800">Mes {resultado.mes_correspondiente} / {resultado.año_correspondiente}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
