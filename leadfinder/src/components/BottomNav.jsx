import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function BottomNav() {
  const location    = useLocation()
  const navigate    = useNavigate()
  const { isAdmin } = useAuth()

  const TABS = [
    { path:'/map',          icon:'🗺️',  label:'Mapa'       },
    { path:'/leads',        icon:'📋',  label:'Leads'      },
    { path:'/roteirizador', icon:'🧭',  label:'Rota'       },
    { path:'/simulador',    icon:'⚡',  label:'Simular'    },
    ...(isAdmin
      ? [{ path:'/dashboard', icon:'📊', label:'Dashboard' }]
      : [{ path:'/perfil',    icon:'👤', label:'Perfil'    }]
    ),
  ]

  return (
    <div style={{
      display:'flex', background:'#252b3b',
      borderTop:'0.5px solid rgba(255,255,255,0.08)',
      flexShrink:0,
      paddingBottom:'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const active = location.pathname === tab.path
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)} style={{
            flex:1, padding:'9px 2px 11px',
            display:'flex', flexDirection:'column',
            alignItems:'center', gap:2,
            cursor:'pointer', border:'none', background:'transparent',
          }}>
            <span style={{ fontSize:18 }}>{tab.icon}</span>
            <span style={{
              fontSize:8, fontWeight:500,
              color: active ? '#059669' : '#64748b',
              textTransform:'uppercase', letterSpacing:0.4,
              fontFamily:"'DM Sans',sans-serif",
            }}>{tab.label}</span>
            {active && <div style={{ width:3, height:3, borderRadius:'50%', background:'#059669', marginTop:-1 }}/>}
          </button>
        )
      })}
    </div>
  )
}
