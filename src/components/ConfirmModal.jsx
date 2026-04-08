import { X } from 'lucide-react'

const ICONS = { danger: '⚠️', info: 'ℹ️' }
const CONFIRM_BTN = {
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  info:   'bg-primary-800 hover:bg-primary-700 text-white',
}

export default function ConfirmModal({ title, message, confirmLabel, variant = 'danger', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 bg-primary-950">
          <span className="text-lg">{ICONS[variant]}</span>
          <h3 className="text-white font-semibold flex-1">{title}</h3>
          {variant === 'danger' && (
            <button onClick={onCancel} className="text-primary-300 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="px-6 py-5">
          <p className="text-gray-600 text-sm mb-5">{message}</p>
          <div className="flex gap-3">
            {variant === 'danger' && (
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${CONFIRM_BTN[variant]}`}
            >
              {confirmLabel ?? (variant === 'danger' ? 'Eliminar' : 'Entendido')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
