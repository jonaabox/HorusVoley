import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { logger } from '../lib/logger'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Fire-and-forget: no bloqueamos el render de la pantalla de error
    logger.critical('ErrorBoundary', `Crash inesperado: ${error.message}`, {
      name:            error.name,
      message:         error.message,
      stack:           error.stack ?? null,
      componentStack:  info?.componentStack ?? null,
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Algo salió mal</h1>
            <p className="text-gray-500 text-sm mt-2">
              Ocurrió un error inesperado. El sistema registró el incidente automáticamente.
            </p>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-gray-100 rounded-lg p-3 overflow-auto max-h-40 text-red-700">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-800 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition"
          >
            <RefreshCw size={15} />
            Recargar página
          </button>
        </div>
      </div>
    )
  }
}
