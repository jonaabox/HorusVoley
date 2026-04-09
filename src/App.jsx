import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DebtAlertProvider } from './context/DebtAlertContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alumnos from './pages/Alumnos'
import Asistencia from './pages/Asistencia'
import Pagos from './pages/Pagos'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import Campanas from './pages/Campanas'
import Materiales from './pages/Materiales'
import Validacion from './pages/Validacion'
import Logs from './pages/Logs'

export default function App() {
  return (
    <AuthProvider>
      <DebtAlertProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/validar" element={<Validacion />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index             element={<Dashboard />}    />
            <Route path="alumnos"    element={<Alumnos />}      />
            <Route path="asistencia" element={<Asistencia />}   />
            <Route path="pagos"      element={<Pagos />}        />
            <Route path="reportes"   element={<Reportes />}     />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="materiales"    element={<Materiales />}    />
            <Route path="campanas"      element={<Campanas />}      />
            <Route path="logs"          element={<Logs />}          />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </DebtAlertProvider>
    </AuthProvider>
  )
}
