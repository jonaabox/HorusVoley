import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
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
            <Route path="campanas"      element={<Campanas />}      />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
