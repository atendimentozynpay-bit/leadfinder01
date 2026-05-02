import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage        from './pages/LoginPage'
import LandingPage      from './pages/LandingPage'
import MapPage          from './pages/MapPage'
import LeadsPage        from './pages/LeadsPage'
import SimuladorPage    from './pages/SimuladorPage'
import PerfilPage       from './pages/PerfilPage'
import DashboardPage    from './pages/DashboardPage'
import RoteirizadorPage from './pages/RoteirizadorPage'
import BottomNav        from './components/BottomNav'

function PrivateLayout({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1a1f2e',color:'#059669',fontFamily:"'Syne',sans-serif",fontSize:16 }}>
      ⚡ LeadFinder...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100dvh',overflow:'hidden' }}>
      <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
        {children}
      </div>
      <BottomNav />
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/map" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"        element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/map"          element={<PrivateLayout><MapPage /></PrivateLayout>} />
          <Route path="/leads"        element={<PrivateLayout><LeadsPage /></PrivateLayout>} />
          <Route path="/simulador"    element={<PrivateLayout><SimuladorPage /></PrivateLayout>} />
          <Route path="/perfil"       element={<PrivateLayout><PerfilPage /></PrivateLayout>} />
          <Route path="/dashboard"    element={<PrivateLayout><DashboardPage /></PrivateLayout>} />
          <Route path="/roteirizador" element={<PrivateLayout><RoteirizadorPage /></PrivateLayout>} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
