# HU0001 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 features on branch HU0001: confirm/alert modals, debt alert notification, schedules + groups A/B, and PDF materials library.

**Architecture:** Feature #4 (modals) is done first as the foundation—it provides `ConfirmModal` and `useConfirm` that subsequent features use for deletion confirmations. Features #1, #3, and #5 are independent and build on the existing Supabase + React stack. All DB changes go through Supabase migrations in `supabase/migrations/`.

**Tech Stack:** React 18, Vite, Supabase JS v2, React Router v6, Tailwind CSS, Lucide React

---

## File Map

### Feature #4 — Modales
- **Create** `src/components/ConfirmModal.jsx`
- **Create** `src/hooks/useConfirm.js`
- **Modify** `src/pages/Alumnos.jsx` (handleDelete)
- **Modify** `src/pages/Pagos.jsx` (handleDelete)
- **Modify** `src/pages/Campanas.jsx` (TabGrupos.eliminar)
- **Modify** `src/pages/Dashboard.jsx` (DeudorRow onClick)

### Feature #1 — Batch deudores
- **Create** `supabase/migrations/20260407000000_add_dias_aviso.sql`
- **Create** `src/context/DebtAlertContext.jsx`
- **Modify** `src/App.jsx`
- **Modify** `src/components/Sidebar.jsx`
- **Modify** `src/pages/Campanas.jsx`
- **Modify** `src/pages/Configuracion.jsx`

### Feature #3 — Horarios
- **Create** `supabase/migrations/20260407000001_add_horarios.sql`
- **Modify** `src/pages/Alumnos.jsx`
- **Modify** `src/pages/Asistencia.jsx`

### Feature #5 — Materiales
- **Create** `supabase/migrations/20260407000002_add_materiales.sql`
- **Create** `src/lib/whatsapp.js`
- **Create** `src/components/EnvioModal.jsx`
- **Create** `src/pages/Materiales.jsx`
- **Modify** `src/pages/Campanas.jsx`
- **Modify** `src/components/Sidebar.jsx`
- **Modify** `src/App.jsx`

---

## Task 1: ConfirmModal + useConfirm hook

**Files:**
- Create: `src/components/ConfirmModal.jsx`
- Create: `src/hooks/useConfirm.js`

- [ ] **Step 1: Create ConfirmModal component**

```jsx
// src/components/ConfirmModal.jsx
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
```

- [ ] **Step 2: Create useConfirm hook**

```js
// src/hooks/useConfirm.js
import { useState, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'

export function useConfirm() {
  const [options, setOptions] = useState(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setOptions({ ...opts, resolve })
    })
  }, [])

  const handleConfirm = () => {
    options?.resolve(true)
    setOptions(null)
  }

  const handleCancel = () => {
    options?.resolve(false)
    setOptions(null)
  }

  const BoundConfirmModal = () =>
    options ? (
      <ConfirmModal
        title={options.title}
        message={options.message}
        confirmLabel={options.confirmLabel}
        variant={options.variant ?? 'danger'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ) : null

  return { confirm, ConfirmModal: BoundConfirmModal }
}
```

- [ ] **Step 3: Verify in browser**

Abrir `http://localhost:5173/HorusVoley/`. No debe haber errores en consola. Los archivos aún no se usan en ningún lado.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConfirmModal.jsx src/hooks/useConfirm.js
git commit -m "feat: add ConfirmModal component and useConfirm hook"
```

---

## Task 2: Replace confirm/alert in Alumnos, Pagos, Campanas, Dashboard

**Files:**
- Modify: `src/pages/Alumnos.jsx`
- Modify: `src/pages/Pagos.jsx`
- Modify: `src/pages/Campanas.jsx`
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Update Alumnos.jsx**

Agregar import al inicio del archivo:
```js
import { useConfirm } from '../hooks/useConfirm'
```

Agregar dentro del componente `Alumnos()`, junto a los otros `useState`:
```js
const { confirm, ConfirmModal } = useConfirm()
```

Reemplazar `handleDelete` (línea 165):
```js
const handleDelete = async (id) => {
  const ok = await confirm({
    title: 'Eliminar alumno',
    message: '¿Estás seguro que querés eliminar este alumno? Esta acción no se puede deshacer.',
    variant: 'danger',
  })
  if (!ok) return
  await supabase.from('alumnos').delete().eq('id', id)
  fetchAll()
}
```

Agregar `<ConfirmModal />` justo antes del `</div>` de cierre del return principal (antes del último `</div>`):
```jsx
      <ConfirmModal />
    </div>
  )
```

- [ ] **Step 2: Update Pagos.jsx**

Agregar import:
```js
import { useConfirm } from '../hooks/useConfirm'
```

Agregar dentro del componente `Pagos()`:
```js
const { confirm, ConfirmModal } = useConfirm()
```

Reemplazar `handleDelete` (línea 144):
```js
const handleDelete = async (id) => {
  const ok = await confirm({
    title: 'Eliminar pago',
    message: '¿Estás seguro que querés eliminar este pago? Esta acción no se puede deshacer.',
    variant: 'danger',
  })
  if (!ok) return
  await supabase.from('pagos').delete().eq('id', id)
  fetchAll()
}
```

Agregar `<ConfirmModal />` antes del `</div>` de cierre del return:
```jsx
      <ConfirmModal />
    </div>
  )
```

- [ ] **Step 3: Update Campanas.jsx — TabGrupos**

Agregar import al inicio del archivo:
```js
import { useConfirm } from '../hooks/useConfirm'
```

En el componente `TabGrupos` (línea 330), reemplazar la función `eliminar` y agregar el hook:
```js
function TabGrupos({ grupos, onRecargar, onIrACampana }) {
  const { confirm, ConfirmModal } = useConfirm()
  const [eliminando, setEliminando] = useState(null)

  const eliminar = async (id, nombre) => {
    const ok = await confirm({
      title: 'Eliminar grupo',
      message: `¿Estás seguro que querés eliminar el grupo "${nombre}"?`,
      variant: 'danger',
    })
    if (!ok) return
    setEliminando(id)
    await supabase.from('grupos').delete().eq('id', id)
    onRecargar()
    setEliminando(null)
  }
```

Agregar `<ConfirmModal />` al final del JSX que devuelve `TabGrupos`, antes del `</div>` de cierre:
```jsx
      </div>
      <ConfirmModal />
    </div>
  )
```

- [ ] **Step 4: Update Dashboard.jsx — DeudorRow**

Agregar import al inicio del archivo:
```js
import { useConfirm } from '../hooks/useConfirm'
```

En el componente `DeudorRow` (línea 62), agregar el hook:
```js
function DeudorRow({ alumno }) {
  const { confirm, ConfirmModal } = useConfirm()
  const [expandido, setExpandido] = useState(false)
```

Reemplazar el `onClick` del `<a>` con link de WhatsApp (línea ~143):
```jsx
onClick={async (e) => {
  if (!alumno.telefono || numeroLimpio.length < 8) {
    e.preventDefault()
    await confirm({
      title: 'Atención',
      message: 'Este alumno no tiene un número de teléfono válido registrado.',
      variant: 'info',
    })
  }
}}
```

Agregar `<ConfirmModal />` al final del JSX del `<li>`, antes del cierre `</li>`:
```jsx
      <ConfirmModal />
    </li>
  )
```

- [ ] **Step 5: Verify**

1. Ir a Alumnos → intentar eliminar un alumno → debe aparecer modal con header oscuro y botón rojo "Eliminar"
2. Hacer click en "Cancelar" → alumno no se elimina
3. Ir a Pagos → verificar mismo comportamiento al eliminar pago
4. Ir a Campañas → tab Grupos → eliminar un grupo → modal de confirmación
5. Ir a Dashboard → expandir un alumno deudor sin teléfono → al hacer click en WhatsApp debe aparecer modal info azul con "Entendido"

- [ ] **Step 6: Commit**

```bash
git add src/pages/Alumnos.jsx src/pages/Pagos.jsx src/pages/Campanas.jsx src/pages/Dashboard.jsx
git commit -m "feat: replace native confirm/alert with ConfirmModal in all pages"
```

---

## Task 3: Migration dias_aviso + DebtAlertContext

**Files:**
- Create: `supabase/migrations/20260407000000_add_dias_aviso.sql`
- Create: `src/context/DebtAlertContext.jsx`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/20260407000000_add_dias_aviso.sql
insert into public.configuracion (clave, valor)
values ('dias_aviso_vencimiento', '5')
on conflict (clave) do nothing;
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected output: `Applying migration 20260407000000_add_dias_aviso.sql`

- [ ] **Step 3: Create DebtAlertContext**

```jsx
// src/context/DebtAlertContext.jsx
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
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260407000000_add_dias_aviso.sql src/context/DebtAlertContext.jsx
git commit -m "feat: add dias_aviso_vencimiento config and DebtAlertContext"
```

---

## Task 4: App provider + Sidebar notification + Campanas preload + Configuracion field

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/pages/Campanas.jsx`
- Modify: `src/pages/Configuracion.jsx`

- [ ] **Step 1: Wrap App with DebtAlertProvider**

En `src/App.jsx`, agregar el import:
```js
import { DebtAlertProvider } from './context/DebtAlertContext'
```

Envolver `<AuthProvider>` con el nuevo provider (el `DebtAlertProvider` debe ir dentro de `AuthProvider` porque necesita el user):
```jsx
export default function App() {
  return (
    <AuthProvider>
      <DebtAlertProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {/* ... Routes sin cambios ... */}
        </BrowserRouter>
      </DebtAlertProvider>
    </AuthProvider>
  )
}
```

- [ ] **Step 2: Update Sidebar with debt notification**

Reemplazar el contenido completo de `src/components/Sidebar.jsx`:

```jsx
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
```

- [ ] **Step 3: Update Campanas main export to read router state**

En `src/pages/Campanas.jsx`, agregar al inicio del archivo (junto a los otros imports de react-router):
```js
import { useLocation } from 'react-router-dom'
```

Reemplazar la función `Campanas` (export default, línea 690):
```jsx
export default function Campanas() {
  const location = useLocation()
  const routeState = location.state ?? {}

  const [tab, setTab]           = useState(routeState.deudores ? 'campana' : 'importar')
  const [grupos, setGrupos]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [grupoParaCampana, setGrupoParaCampana] = useState(
    routeState.deudores
      ? { id: '__deudores__', nombre: 'Alumnos con cuota próxima', contactos: routeState.deudores }
      : null
  )

  const cargarGrupos = async () => {
    setCargando(true)
    const { data } = await supabase.from('grupos').select('*').order('created_at', { ascending: false })
    setGrupos(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargarGrupos() }, [])

  const irACampana = (grupo) => {
    setGrupoParaCampana(grupo)
    setTab('campana')
  }

  // If there's a synthetic deudores group, add it at the top of the list
  const gruposConDeudores = grupoParaCampana?.id === '__deudores__'
    ? [grupoParaCampana, ...grupos]
    : grupos

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Campañas de WhatsApp</h2>
        <p className="text-gray-500 text-sm mt-1">Importa contactos, crea grupos y envía mensajes personalizados · costo $0</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          <Tab label="Importar Excel"  icon={FileSpreadsheet} active={tab === 'importar'} onClick={() => setTab('importar')} />
          <Tab label="Grupos"          icon={Users}           active={tab === 'grupos'}   onClick={() => setTab('grupos')}   badge={grupos.length || null} />
          <Tab label="Enviar campaña"  icon={Megaphone}       active={tab === 'campana'}  onClick={() => setTab('campana')}  />
        </div>
        <div className="p-6">
          {tab === 'importar' && <TabImportar onRecargarGrupos={cargarGrupos} />}
          {tab === 'grupos' && (
            cargando
              ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
              : <TabGrupos grupos={grupos} onRecargar={cargarGrupos} onIrACampana={irACampana} />
          )}
          {tab === 'campana' && (
            <TabCampana
              grupos={gruposConDeudores}
              grupoInicial={grupoParaCampana}
              mensajeInicial={routeState.mensajeInicial ?? ''}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

También actualizar `TabCampana` para aceptar `mensajeInicial` (en la línea donde se define la función, ~371):
```js
function TabCampana({ grupos, grupoInicial, mensajeInicial = '' }) {
  const [grupoId, setGrupoId]             = useState(grupoInicial?.id ?? '')
  const [nombreCampana, setNombreCampana] = useState('')
  const [mensaje, setMensaje]             = useState(mensajeInicial)  // usa mensajeInicial
```

- [ ] **Step 4: Add dias_aviso_vencimiento field to Configuracion**

En `src/pages/Configuracion.jsx`, agregar dentro del bloque "Cobros" (después del campo `dia_vencimiento_cuota`, antes del `</div>` de cierre de la card):

```jsx
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Días de aviso antes del vencimiento
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Días de anticipación para mostrar la alerta de deudores próximos (ej: 5)
            </p>
            <input
              type="number" min="1" max="28"
              value={valores['dias_aviso_vencimiento'] ?? '5'}
              onChange={e => set('dias_aviso_vencimiento', e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
```

- [ ] **Step 5: Verify**

1. Si hoy es ≤ `dia_vencimiento_cuota` días antes del vencimiento: debe aparecer badge amarillo en "Campañas" en el sidebar y banner debajo del menú
2. Hacer click en el banner → navega a Campañas con tab "Enviar campaña" activo y el grupo "Alumnos con cuota próxima" pre-seleccionado
3. El mensaje de recordatorio debe estar pre-cargado en el campo de mensaje
4. Verificar en Configuración que aparece el nuevo campo "Días de aviso"

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/Sidebar.jsx src/pages/Campanas.jsx src/pages/Configuracion.jsx
git commit -m "feat: add debt alert notification in sidebar with Campanas preload"
```

---

## Task 5: Migration horarios

**Files:**
- Create: `supabase/migrations/20260407000001_add_horarios.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/20260407000001_add_horarios.sql

-- Tabla de horarios
create table if not exists public.horarios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  dia_semana  text not null,
  hora_inicio time not null,
  hora_fin    time not null,
  created_at  timestamptz default now()
);

alter table public.horarios enable row level security;
create policy "authenticated_all" on public.horarios for all to authenticated using (true) with check (true);

-- Seed inicial
insert into public.horarios (nombre, dia_semana, hora_inicio, hora_fin) values
  ('Grupo A', 'Sábado', '14:30', '16:30'),
  ('Grupo B', 'Sábado', '16:30', '18:30');

-- Columna en alumnos
alter table public.alumnos
  add column if not exists horario_id uuid references public.horarios(id) on delete set null;
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: `Applying migration 20260407000001_add_horarios.sql`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407000001_add_horarios.sql
git commit -m "feat: add horarios table and horario_id to alumnos"
```

---

## Task 6: Alumnos group selector + Asistencia group filter

**Files:**
- Modify: `src/pages/Alumnos.jsx`
- Modify: `src/pages/Asistencia.jsx`

- [ ] **Step 1: Update Alumnos.jsx — load horarios**

Agregar estado al inicio del componente `Alumnos()`:
```js
const [horarios, setHorarios] = useState([])
```

En `fetchAll`, agregar la consulta de horarios:
```js
const fetchAll = async () => {
  setLoading(true)
  const [{ data: alumnosData }, { data: configData }, { data: pagosData }, { data: horariosData }] = await Promise.all([
    supabase.from('alumnos').select('*').order('nombre_completo'),
    supabase.from('configuracion').select('clave, valor'),
    supabase.from('pagos').select('alumno_id, mes_correspondiente, año_correspondiente, monto, fecha_pago'),
    supabase.from('horarios').select('*').order('hora_inicio'),
  ])
  // ... código existente sin cambios ...
  setHorarios(horariosData ?? [])
  setLoading(false)
}
```

- [ ] **Step 2: Update EMPTY_FORM**

Agregar `horario_id` al objeto `EMPTY_FORM`:
```js
const EMPTY_FORM = {
  nombre_completo:   '',
  fecha_nacimiento:  '',
  telefono:          '',
  fecha_inscripcion: new Date().toISOString().split('T')[0],
  estado:            'activo',
  frecuencia:        2,
  nivel:             'principiante',
  horario_id:        '',
}
```

En `openEdit`, agregar `horario_id`:
```js
const openEdit = (alumno) => {
  setForm({
    nombre_completo:   alumno.nombre_completo,
    fecha_nacimiento:  alumno.fecha_nacimiento ?? '',
    telefono:          alumno.telefono ?? '',
    fecha_inscripcion: alumno.fecha_inscripcion,
    estado:            alumno.estado,
    frecuencia:        alumno.frecuencia,
    nivel:             alumno.nivel,
    horario_id:        alumno.horario_id ?? '',
  })
  // ... resto sin cambios ...
}
```

- [ ] **Step 3: Add group selector in Alumnos form**

Dentro del `<form>`, agregar el selector de horario después del bloque "Nivel + Frecuencia":
```jsx
{/* Horario */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Horario / Grupo</label>
  <select
    value={form.horario_id}
    onChange={e => setForm({ ...form, horario_id: e.target.value })}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
  >
    <option value="">Sin asignar</option>
    {horarios.map(h => (
      <option key={h.id} value={h.id}>
        {h.nombre} — {h.dia_semana} {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
      </option>
    ))}
  </select>
</div>
```

- [ ] **Step 4: Add Grupo column in Alumnos table**

En el `<thead>`, agregar columna después de "Nivel":
```jsx
<th className="px-6 py-3 font-medium">Grupo</th>
```

En el `<tbody>`, agregar celda después de la celda de nivel:
```jsx
<td className="px-6 py-4">
  {(() => {
    const h = horarios.find(h => h.id === a.horario_id)
    if (!h) return <span className="text-gray-400 text-xs">Sin asignar</span>
    const colorClass = h.nombre === 'Grupo A'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700'
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
        {h.nombre} · {h.hora_inicio.slice(0, 5)}
      </span>
    )
  })()}
</td>
```

- [ ] **Step 5: Update Asistencia.jsx — add group filter**

En `src/pages/Asistencia.jsx`, agregar estado para horarios y filtro en el componente `Registro`:

En el componente `Registro` (línea 39), agregar estado:
```js
function Registro({ dias1x, dias2x, horarios }) {
  const [filtroHorarioId, setFiltroHorarioId] = useState('')
  const [fecha, setFecha]           = useState(new Date().toISOString().split('T')[0])
  // ... resto sin cambios ...
```

En `fetchData` del componente `Registro`, actualizar el select de alumnos:
```js
supabase.from('alumnos').select('id, nombre_completo, nivel, frecuencia, horario_id').eq('estado', 'activo').order('nombre_completo'),
```

Después de calcular `alumnosFiltrados` (por frecuencia), agregar filtro por horario:
```js
const alumnosFiltradosPorGrupo = filtroHorarioId
  ? alumnosFiltrados.filter(a => a.horario_id === filtroHorarioId)
  : alumnosFiltrados

const presentes = alumnosFiltradosPorGrupo.filter(a => asistencia[a.id] === true).length
```

Usar `alumnosFiltradosPorGrupo` en lugar de `alumnosFiltrados` en el render del `<ul>` y en el conteo de presentes.

Agregar botones de filtro antes del `<input type="date">`:
```jsx
{horarios.length > 0 && (
  <div className="flex gap-2 flex-wrap">
    <button
      onClick={() => setFiltroHorarioId('')}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
        !filtroHorarioId
          ? 'bg-primary-800 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      Todos
    </button>
    {horarios.map(h => (
      <button
        key={h.id}
        onClick={() => setFiltroHorarioId(h.id)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
          filtroHorarioId === h.id
            ? (h.nombre === 'Grupo A' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white')
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {h.nombre} · {h.hora_inicio.slice(0, 5)}
      </button>
    ))}
  </div>
)}
```

En el componente `Asistencia` (página principal), cargar horarios y pasarlos a `Registro`:

```js
export default function Asistencia() {
  const [tab, setTab]           = useState('registro')
  const [dias1x, setDias1x]     = useState([6])
  const [dias2x, setDias2x]     = useState([2, 6])
  const [horarios, setHorarios] = useState([])
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('configuracion').select('clave, valor')
        .in('clave', ['dias_1_vez_semana', 'dias_2_veces_semana']),
      supabase.from('horarios').select('*').order('hora_inicio'),
    ]).then(([{ data: configData }, { data: horariosData }]) => {
      if (configData) {
        const parse = (clave, fallback) => {
          const v = configData.find(c => c.clave === clave)?.valor
          return v ? v.split(',').map(Number) : fallback
        }
        setDias1x(parse('dias_1_vez_semana', [6]))
        setDias2x(parse('dias_2_veces_semana', [2, 6]))
      }
      setHorarios(horariosData ?? [])
      setConfigLoaded(true)
    })
  }, [])
  // ... resto del componente ...
```

Pasar `horarios` a `<Registro>`:
```jsx
{tab === 'registro'
  ? <Registro dias1x={dias1x} dias2x={dias2x} horarios={horarios} />
  : <Reporte  dias1x={dias1x} dias2x={dias2x} />
}
```

- [ ] **Step 6: Verify**

1. Ir a Alumnos → editar un alumno → debe haber selector "Horario / Grupo" con Grupo A, Grupo B y Sin asignar
2. Asignar Grupo A a un alumno y guardar → en la tabla debe aparecer badge azul "Grupo A · 14:30"
3. Ir a Asistencia → deben aparecer botones "Todos / Grupo A · 14:30 / Grupo B · 16:30"
4. Seleccionar Grupo A → solo aparecen alumnos del Grupo A

- [ ] **Step 7: Commit**

```bash
git add src/pages/Alumnos.jsx src/pages/Asistencia.jsx
git commit -m "feat: add group/schedule selector in Alumnos and group filter in Asistencia"
```

---

## Task 7: Migration materiales + whatsapp utils + EnvioModal extraction

**Files:**
- Create: `supabase/migrations/20260407000002_add_materiales.sql`
- Create: `src/lib/whatsapp.js`
- Create: `src/components/EnvioModal.jsx`
- Modify: `src/pages/Campanas.jsx`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/20260407000002_add_materiales.sql

-- Bucket de storage (público para links compartibles)
insert into storage.buckets (id, name, public)
values ('materiales', 'materiales', true)
on conflict (id) do nothing;

-- Política de storage: solo autenticados pueden subir y eliminar
create policy "authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'materiales');

create policy "authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'materiales');

create policy "public read" on storage.objects
  for select using (bucket_id = 'materiales');

-- Tabla de materiales
create table if not exists public.materiales (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  storage_path text not null,
  public_url   text not null,
  created_at   timestamptz default now()
);

alter table public.materiales enable row level security;
create policy "authenticated_all" on public.materiales for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: `Applying migration 20260407000002_add_materiales.sql`

- [ ] **Step 3: Create whatsapp.js utility**

```js
// src/lib/whatsapp.js

export function buildWaUrl(telefono, mensaje) {
  return `https://web.whatsapp.com/send/?phone=${telefono}&text=${encodeURIComponent(mensaje)}&type=phone_number&app_absent=0`
}

export function personalizarMensaje(template, contacto) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => contacto[k] ?? `{{${k}}}`)
}

export function limpiarTelefono(raw, prefijo) {
  if (!raw) return null
  const limpio = String(raw).replace(/[\s\-\(\)\+]/g, '')
  if (limpio.length < 7) return null
  return limpio.startsWith(prefijo) ? limpio : prefijo + limpio
}
```

- [ ] **Step 4: Create EnvioModal component**

Extraer `EnvioModal` de `Campanas.jsx` a su propio archivo, importando las utilidades de `whatsapp.js`:

```jsx
// src/components/EnvioModal.jsx
import { useState } from 'react'
import { X, Check, Loader2, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { buildWaUrl, personalizarMensaje } from '../lib/whatsapp'

export default function EnvioModal({ contactos, mensaje, campana, onCerrar }) {
  const [enviados, setEnviados]   = useState(new Set())
  const [guardando, setGuardando] = useState(new Set())

  const marcar = async (idx, telefono) => {
    if (enviados.has(idx)) return
    setGuardando(g => new Set([...g, idx]))
    if (campana) {
      await supabase.from('envios_historial')
        .upsert({ telefono, campana }, { onConflict: 'telefono,campana', ignoreDuplicates: true })
    }
    setGuardando(g => { const s = new Set(g); s.delete(idx); return s })
    setEnviados(e => new Set([...e, idx]))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="bg-primary-950 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-white font-semibold">{campana ? `Enviar campaña: ${campana}` : 'Enviar material'}</h3>
            <p className="text-primary-300 text-sm">{enviados.size} / {contactos.length} enviados</p>
          </div>
          <button onClick={onCerrar} className="text-primary-300 hover:text-white"><X size={20} /></button>
        </div>

        <div className="h-1.5 bg-gray-100 shrink-0">
          <div className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${contactos.length ? (enviados.size / contactos.length) * 100 : 0}%` }} />
        </div>

        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 shrink-0">
          Haz click en el botón verde para abrir WhatsApp Web. El número queda registrado automáticamente.
        </div>

        <ul className="overflow-y-auto flex-1 divide-y divide-gray-50 px-2 py-2">
          {contactos.map((c, i) => {
            const msg    = personalizarMensaje(mensaje, c)
            const nombre = c['nombre_completo'] ?? c['Nombres'] ?? c['Nombre'] ?? c['nombre'] ?? `Contacto ${i + 1}`
            const enviado = enviados.has(i)
            const guardandoEste = guardando.has(i)
            return (
              <li key={i} className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${enviado ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${enviado ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200'}`}>
                  {enviado && <Check size={11} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${enviado ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{nombre}</p>
                  <p className="text-xs text-gray-400 font-mono">{c.telefono}</p>
                </div>
                <a href={buildWaUrl(c.telefono, msg)} target="_blank" rel="noopener noreferrer"
                  onClick={() => marcar(i, c.telefono)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition min-w-[68px] justify-center ${
                    enviado ? 'bg-gray-100 text-gray-400 pointer-events-none'
                    : guardandoEste ? 'bg-green-100 text-green-600'
                    : 'bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm'
                  }`}
                >
                  {guardandoEste ? <Loader2 size={12} className="animate-spin" /> : enviado ? 'Enviado' : <><MessageSquare size={12} /> Abrir</>}
                </a>
              </li>
            )
          })}
        </ul>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-sm text-gray-500">{enviados.size} de {contactos.length} enviados</span>
          <button onClick={onCerrar} className="px-5 py-2 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update Campanas.jsx to import from lib and component**

En `src/pages/Campanas.jsx`:

1. Agregar imports al inicio:
```js
import EnvioModal from '../components/EnvioModal'
import { buildWaUrl, personalizarMensaje, limpiarTelefono } from '../lib/whatsapp'
```

2. Eliminar las definiciones locales de `limpiarTelefono`, `buildWaUrl` y `personalizarMensaje` (líneas 12–25 aprox).

3. Eliminar la definición local de `EnvioModal` (líneas 95–168 aprox) ya que ahora se importa.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260407000002_add_materiales.sql src/lib/whatsapp.js src/components/EnvioModal.jsx src/pages/Campanas.jsx
git commit -m "feat: add materiales migration, extract EnvioModal and whatsapp utils"
```

---

## Task 8: Materiales page

**Files:**
- Create: `src/pages/Materiales.jsx`

- [ ] **Step 1: Create Materiales page**

```jsx
// src/pages/Materiales.jsx
import { useEffect, useState } from 'react'
import { Plus, Trash2, Send, Loader2, FileText, X, Users, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useConfirm } from '../hooks/useConfirm'
import EnvioModal from '../components/EnvioModal'

const MENSAJE_TEMPLATE = (nombre, url) =>
  `Hola {{nombre_completo}}, te compartimos el siguiente material de estudio:\n\n📄 ${nombre}\n\n${url}\n\n¡Esperamos que te sea útil! 🏐`

export default function Materiales() {
  const [materiales, setMateriales]     = useState([])
  const [horarios, setHorarios]         = useState([])
  const [alumnos, setAlumnos]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [sendModalMaterial, setSendModalMaterial] = useState(null)   // material seleccionado para enviar
  const [recipientModal, setRecipientModal]       = useState(false)  // modal de destinatarios
  const [selectedHorarioId, setSelectedHorarioId] = useState('')
  const [selectedAlumnos, setSelectedAlumnos]     = useState(new Set())
  const [recipientMode, setRecipientMode]         = useState('todos') // 'todos' | 'grupo' | 'manual'
  const [envioModal, setEnvioModal]               = useState(null)   // { contactos, mensaje, campana }
  const [uploading, setUploading]                 = useState(false)
  const [uploadError, setUploadError]             = useState('')
  const [uploadForm, setUploadForm]               = useState({ nombre: '', descripcion: '', file: null })
  const { confirm, ConfirmModal } = useConfirm()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: mats }, { data: hors }, { data: alums }] = await Promise.all([
      supabase.from('materiales').select('*').order('created_at', { ascending: false }),
      supabase.from('horarios').select('*').order('hora_inicio'),
      supabase.from('alumnos').select('id, nombre_completo, telefono, horario_id').eq('estado', 'activo').order('nombre_completo'),
    ])
    setMateriales(mats ?? [])
    setHorarios(hors ?? [])
    setAlumnos(alums ?? [])
    setLoading(false)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.file || !uploadForm.nombre.trim()) return
    setUploading(true)
    setUploadError('')

    const ext      = uploadForm.file.name.split('.').pop()
    const path     = `${Date.now()}-${uploadForm.nombre.trim().replace(/\s+/g, '-')}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('materiales')
      .upload(path, uploadForm.file)

    if (uploadErr) { setUploadError(uploadErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('materiales').getPublicUrl(path)

    const { error: dbErr } = await supabase.from('materiales').insert({
      nombre:       uploadForm.nombre.trim(),
      descripcion:  uploadForm.descripcion.trim() || null,
      storage_path: path,
      public_url:   publicUrl,
    })

    if (dbErr) { setUploadError(dbErr.message); setUploading(false); return }

    setUploading(false)
    setUploadModalOpen(false)
    setUploadForm({ nombre: '', descripcion: '', file: null })
    fetchAll()
  }

  const handleDelete = async (material) => {
    const ok = await confirm({
      title: 'Eliminar material',
      message: `¿Estás seguro que querés eliminar "${material.nombre}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
    })
    if (!ok) return
    await supabase.storage.from('materiales').remove([material.storage_path])
    await supabase.from('materiales').delete().eq('id', material.id)
    fetchAll()
  }

  const openSendFlow = (material) => {
    setSendModalMaterial(material)
    setRecipientMode('todos')
    setSelectedHorarioId('')
    setSelectedAlumnos(new Set())
    setRecipientModal(true)
  }

  const buildContactos = () => {
    let lista = alumnos
    if (recipientMode === 'grupo' && selectedHorarioId) {
      lista = alumnos.filter(a => a.horario_id === selectedHorarioId)
    } else if (recipientMode === 'manual') {
      lista = alumnos.filter(a => selectedAlumnos.has(a.id))
    }
    return lista
      .map(a => {
        const digits   = (a.telefono ?? '').replace(/\D/g, '')
        const cleaned  = digits.startsWith('0') ? digits.slice(1) : digits
        const telefono = cleaned.startsWith('595') ? cleaned : '595' + cleaned
        return { telefono, nombre_completo: a.nombre_completo }
      })
      .filter(c => c.telefono.length >= 11)
  }

  const handleConfirmSend = () => {
    const contactos = buildContactos()
    if (!contactos.length) return
    const mensaje = MENSAJE_TEMPLATE(sendModalMaterial.nombre, sendModalMaterial.public_url)
    setRecipientModal(false)
    setEnvioModal({
      contactos,
      mensaje,
      campana: `Material: ${sendModalMaterial.nombre}`,
    })
  }

  const toggleAlumno = (id) => {
    setSelectedAlumnos(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Materiales</h2>
          <p className="text-gray-500 text-sm mt-1">Biblioteca de material de estudio para compartir con alumnos</p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 bg-primary-800 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow transition"
        >
          <Plus size={16} />
          Subir PDF
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : materiales.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No hay materiales subidos aún.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {materiales.map(m => (
              <li key={m.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{m.nombre}</p>
                  {m.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.descripcion}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(m.created_at).toLocaleDateString('es-PY')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openSendFlow(m)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                  >
                    <Send size={12} />
                    Enviar
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950">
              <h3 className="text-white font-semibold">Subir PDF</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-primary-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  required type="text"
                  value={uploadForm.nombre}
                  onChange={e => setUploadForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ej: Reglas del voley"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={uploadForm.descripcion}
                  onChange={e => setUploadForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo PDF *</label>
                <input
                  required type="file" accept=".pdf"
                  onChange={e => setUploadForm(f => ({ ...f, file: e.target.files[0] ?? null }))}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              {uploadError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{uploadError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setUploadModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={uploading}
                  className="flex-1 py-2.5 bg-primary-800 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition">
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recipient selection modal */}
      {recipientModal && sendModalMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-primary-950 shrink-0">
              <h3 className="text-white font-semibold">Enviar: {sendModalMaterial.nombre}</h3>
              <button onClick={() => setRecipientModal(false)} className="text-primary-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              {/* Mode selector */}
              <div className="flex gap-2">
                {[
                  { value: 'todos', label: 'Todos' },
                  { value: 'grupo', label: 'Por grupo' },
                  { value: 'manual', label: 'Manual' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setRecipientMode(value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      recipientMode === value
                        ? 'bg-primary-800 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Group selector */}
              {recipientMode === 'grupo' && (
                <div className="space-y-2">
                  {horarios.map(h => (
                    <button
                      key={h.id}
                      onClick={() => setSelectedHorarioId(h.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                        selectedHorarioId === h.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{h.nombre} · {h.hora_inicio.slice(0, 5)}</span>
                      <span className="text-xs text-gray-400">
                        {alumnos.filter(a => a.horario_id === h.id).length} alumnos
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual selector */}
              {recipientMode === 'manual' && (
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {alumnos.map(a => (
                    <li
                      key={a.id}
                      onClick={() => toggleAlumno(a.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selectedAlumnos.has(a.id) ? 'bg-primary-700 border-primary-700' : 'border-gray-300'
                      }`}>
                        {selectedAlumnos.has(a.id) && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm text-gray-800">{a.nombre_completo}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg">
                <Users size={12} />
                {buildContactos().length} destinatario{buildContactos().length !== 1 ? 's' : ''} seleccionado{buildContactos().length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setRecipientModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={buildContactos().length === 0}
                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition"
              >
                Preparar envío
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EnvioModal */}
      {envioModal && (
        <EnvioModal
          contactos={envioModal.contactos}
          mensaje={envioModal.mensaje}
          campana={envioModal.campana}
          onCerrar={() => setEnvioModal(null)}
        />
      )}

      <ConfirmModal />
    </div>
  )
}
```

- [ ] **Step 2: Verify**

En el browser: no debe haber errores en consola al importar el archivo.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Materiales.jsx
git commit -m "feat: add Materiales page with PDF library and WhatsApp send flow"
```

---

## Task 9: Sidebar Materiales link + App router

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Verify Sidebar already has Materiales**

En Task 4, Step 2, se incluyó el ítem `{ to: '/materiales', icon: BookOpen, label: 'Materiales' }` en `navItems`. Verificar que el import `BookOpen` de lucide-react está presente.

Si no está, agregar a la lista de imports de lucide-react:
```js
import { ..., BookOpen } from 'lucide-react'
```

Y agregar a `navItems`:
```js
{ to: '/materiales', icon: BookOpen, label: 'Materiales' },
```

- [ ] **Step 2: Add Materiales route to App.jsx**

En `src/App.jsx`, agregar el import:
```js
import Materiales from './pages/Materiales'
```

Dentro del bloque de rutas protegidas (junto a las otras rutas), agregar:
```jsx
<Route path="materiales" element={<Materiales />} />
```

- [ ] **Step 3: Verify full flow**

1. En el sidebar debe aparecer "Materiales" con ícono de libro
2. Navegar a `/materiales` → página carga sin errores
3. Subir un PDF → aparece en la lista
4. Click en "Enviar" → modal de destinatarios con opciones Todos / Por grupo / Manual
5. Seleccionar destinatarios → "Preparar envío" → abre EnvioModal con links de WhatsApp
6. Eliminar un material → aparece ConfirmModal con header oscuro

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.jsx src/App.jsx
git commit -m "feat: add Materiales route and sidebar link"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| #4 Reemplazar alert/confirm con modales | Tasks 1–2 |
| #1 Batch deudores con notificación y pre-carga en Campañas | Tasks 3–4 |
| #1 Días de aviso configurables | Task 4 (Configuracion) |
| #3 Tabla horarios + Grupo A/B | Task 5 |
| #3 Selector de grupo en Alumnos | Task 6 |
| #3 Filtro de grupo en Asistencia | Task 6 |
| #5 Tabla materiales + bucket Storage | Task 7 |
| #5 Página biblioteca de PDFs | Task 8 |
| #5 Envío masivo por WhatsApp | Task 8 |
| #5 Sidebar + ruta | Task 9 |

### Type consistency

- `useConfirm()` → `{ confirm, ConfirmModal }` — usado consistentemente en Tasks 1, 2, 8
- `DebtAlertContext` → `{ debtors, loading, refresh }` — `debtors` es `Array<{ id, nombre_completo, telefono }>` — usado en Sidebar (Task 4) con los campos correctos
- `EnvioModal` props: `{ contactos, mensaje, campana, onCerrar }` — consistente en Tasks 7 y 8
- `TabCampana` agrega `mensajeInicial` prop en Task 4 — usada correctamente en el state inicial de `mensaje`
- Horarios en Asistencia: se pasa `horarios` como prop a `<Registro>` — el componente lo acepta en Task 6

### No placeholders: verificado — todo el código está completo.
