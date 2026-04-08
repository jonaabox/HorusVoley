import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, BarChart3, ClipboardList,
  Settings, LogOut, Megaphone, SearchCheck, BookOpen,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDebtAlert } from '../context/DebtAlertContext'
import logo from '../IMG_6191-removebg-preview.png'

const MENSAJE_DEUDORES = `Hola {{nombre_completo}}, te recordamos que se acerca la fecha de vencimiento de tu cuota mensual. Por favor, acercate a realizar el pago antes del vencimiento. ¡Gracias! 🏐`

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Inicio'         },
  { to: '/alumnos',     icon: Users,           label: 'Alumnos'        },
  { to: '/asistencia',  icon: ClipboardList,   label: 'Asistencia'     },
  { to: '/pagos',       icon: CreditCard,      label: 'Pagos'          },
  { to: '/reportes',    icon: BarChart3,        label: 'Reportes'       },
  { to: '/materiales',  icon: BookOpen,         label: 'Materiales'     },
  { to: '/campanas',    icon: Megaphone,        label: 'Campañas'       },
  { to: '/validar',     icon: SearchCheck,      label: 'Validar Recibo' },
]

export default function Sidebar({ onMobileClose }) {
  const { signOut }    = useAuth()
  const navigate       = useNavigate()
  const { debtors }    = useDebtAlert()
  const hasDebtors     = debtors.length > 0

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleDebtorClick = () => {
    onMobileClose?.()
    navigate('/campanas', {
      state: {
        deudores: debtors,
        mensajeInicial: MENSAJE_DEUDORES,
      },
    })
  }

  return (
    <aside className="w-64 h-full bg-primary-950 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="flex flex-col items-center py-6 px-4 border-b border-primary-800 shrink-0">
        <img src={logo} alt="Horus Voley" className="h-16 w-16 md:h-20 md:w-20 object-contain" />
        <h1 className="mt-3 text-white font-bold text-lg leading-tight text-center">Vóley Control</h1>
        <p className="text-primary-300 text-xs">Horus Voley Academy</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isCampanas = to === '/campanas'
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gold-600 text-white shadow-lg'
                    : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {isCampanas && hasDebtors && (
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {debtors.length}
                </span>
              )}
            </NavLink>
          )
        })}

        {/* Debt alert banner */}
        {hasDebtors && (
          <button
            onClick={handleDebtorClick}
            className="w-full mt-2 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2.5 text-left hover:bg-amber-400/20 transition"
          >
            <p className="text-amber-300 text-xs font-semibold">
              ⚠️ {debtors.length} alumno{debtors.length !== 1 ? 's' : ''} con cuota próxima a vencer
            </p>
            <p className="text-amber-400/70 text-xs mt-0.5">Ver lista →</p>
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6 space-y-1 shrink-0">
        <NavLink
          to="/configuracion"
          onClick={onMobileClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-gold-600 text-white shadow-lg'
                : 'text-primary-200 hover:bg-primary-800 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          Configuración
        </NavLink>
        <button
          onClick={() => { onMobileClose?.(); handleSignOut() }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary-300 hover:bg-red-900/40 hover:text-red-300 transition-all duration-150"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
