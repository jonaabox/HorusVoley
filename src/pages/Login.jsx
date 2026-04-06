import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../IMG_6191-removebg-preview.png'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError('Correo o contraseña incorrectos.')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-900 to-primary-800 px-8 py-10 flex flex-col items-center">
            <img
              src={logo}
              alt="Horus Voley"
              className="h-28 w-28 object-contain drop-shadow-lg"
            />
            <h1 className="mt-4 text-white text-2xl font-bold tracking-wide">
              Vóley Control
            </h1>
            <p className="text-primary-300 text-sm mt-1">Horus Voley Academy</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@horusvoley.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-600 hover:bg-gold-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-all duration-150 shadow-md hover:shadow-lg"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">o</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/validar')}
              className="w-full flex justify-center items-center gap-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-medium py-3 rounded-lg transition-all duration-150"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Ver estado de cuota o validar recibo
            </button>
          </form>
        </div>

        <p className="text-center text-primary-400 text-xs mt-6">
          © 2025 Horus Voley Academy · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
