import { useState, useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { fetchLeads, createCheckin } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const GMAPS_KEY   = import.meta.env.VITE_GOOGLE_MAPS_KEY
const CG_CENTER   = { lat: -20.4697, lng: -54.6201 }

// Algoritmo simples de rota: ordenar por proximidade (nearest neighbor)
function buildRoute(leads) {
  if (leads.length <= 1) return leads
  const remaining = [...leads]
  const route     = [remaining.shift()]
  while (remaining.length > 0) {
    const last = route[route.length - 1]
    let nearestIdx = 0
    let minDist    = Infinity
    remaining.forEach((l, i) => {
      const dist = Math.sqrt(Math.pow((l.lat||0) - (last.lat||0), 2) + Math.pow((l.lng||0) - (last.lng||0), 2))
      if (dist < minDist) { minDist = dist; nearestIdx = i }
    })
    route.push(remaining.splice(nearestIdx, 1)[0])
  }
  return route
}

export default function RoteirizadorPage() {
  const { user }          = useAuth()
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState([])  // ids selecionados para rota
  const [route, setRoute]       = useState([])
  const [routeBuilt, setRouteBuilt] = useState(false)
  const [checkedIn, setCheckedIn]   = useState({}) // leadId → true
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    fetchLeads(user.id, false).then(data => {
      // Só leads com coordenadas
      setLeads(data.filter(l => l.lat && l.lng))
    })
  }, [])

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    setRouteBuilt(false)
  }

  function buildAndShowRoute() {
    const leadsParaRota = leads.filter(l => selected.includes(l.id))
    setRoute(buildRoute(leadsParaRota))
    setRouteBuilt(true)
    setCurrentIdx(0)
  }

  async function doCheckin(lead) {
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await createCheckin({
            user_id: user.id,
            lead_id: lead.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            notas: `Check-in via roteirizador`,
          })
          setCheckedIn(prev => ({ ...prev, [lead.id]: true }))
          if (currentIdx < route.length - 1) setCurrentIdx(prev => prev + 1)
        },
        () => {
          // Sem GPS, faz check-in mesmo assim
          setCheckedIn(prev => ({ ...prev, [lead.id]: true }))
          if (currentIdx < route.length - 1) setCurrentIdx(prev => prev + 1)
        }
      )
    } catch(e) { console.error(e) }
  }

  function abrirNavegacao(lead) {
    const url = `https://maps.google.com/?q=${lead.lat},${lead.lng}&travelmode=driving`
    window.open(url, '_blank')
  }

  const visitasFeitas = Object.keys(checkedIn).length
  const meta = route.length || 10

  return (
    <APIProvider apiKey={GMAPS_KEY}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#1a1f2e', fontFamily:"'DM Sans',sans-serif" }}>

        {/* Header */}
        <div style={{ background:'#252b3b', padding:'12px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:'#f8fafc', marginBottom:6 }}>
            Roteirizador PAP 🗺️
          </div>
          {/* Progress bar */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#94a3b8', marginBottom:5 }}>
              <span>Progresso da rota</span>
              <span>{visitasFeitas} / {route.length || selected.length || '—'}</span>
            </div>
            <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width: route.length > 0 ? `${(visitasFeitas/route.length)*100}%` : '0%', background:'#059669', borderRadius:3, transition:'width 0.4s' }}/>
            </div>
          </div>
        </div>

        {!routeBuilt ? (
          /* SELEÇÃO DE LEADS */
          <div style={{ flex:1, overflowY:'auto' }}>
            <div style={{ padding:'10px 14px 6px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, color:'#94a3b8' }}>Selecione os leads para a rota de hoje</span>
              <span style={{ fontSize:11, color:'#059669' }}>{selected.length} selecionados</span>
            </div>
            {leads.length === 0 && (
              <div style={{ padding:20, color:'#64748b', textAlign:'center', fontSize:13 }}>
                Nenhum lead com localização. Adicione leads pelo Mapa primeiro.
              </div>
            )}
            {leads.map(lead => {
              const sel = selected.includes(lead.id)
              return (
                <div key={lead.id} onClick={() => toggleSelect(lead.id)} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 14px',
                  borderBottom:'0.5px solid rgba(255,255,255,0.05)',
                  background: sel ? 'rgba(5,150,105,0.08)' : 'transparent',
                  cursor:'pointer',
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    border: sel ? '2px solid #059669' : '1.5px solid rgba(255,255,255,0.2)',
                    background: sel ? '#059669' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12,
                  }}>{sel ? '✓' : ''}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#f8fafc' }}>{lead.nome_empresa}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{lead.nicho} · {lead.bairro}</div>
                  </div>
                  <span style={{ fontSize:10, color: lead.status==='Fechado'?'#34d399':lead.status==='Contatado'?'#fcd34d':'#93c5fd', background:'rgba(255,255,255,0.05)', padding:'2px 7px', borderRadius:6 }}>
                    {lead.status}
                  </span>
                </div>
              )
            })}

            {selected.length > 0 && (
              <div style={{ padding:'12px 14px', position:'sticky', bottom:0, background:'#1a1f2e', borderTop:'0.5px solid rgba(255,255,255,0.08)' }}>
                <button onClick={buildAndShowRoute} style={{ width:'100%', background:'#059669', border:'none', borderRadius:10, padding:13, color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  MONTAR ROTA OTIMIZADA ({selected.length} paradas) →
                </button>
              </div>
            )}
          </div>

        ) : (
          /* ROTA ATIVA */
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Mini mapa */}
            <div style={{ height:200, flexShrink:0 }}>
              <Map defaultCenter={CG_CENTER} defaultZoom={13} mapId="rota-map" style={{ width:'100%', height:'100%' }} colorScheme="DARK">
                {route.map((lead, idx) => (
                  lead.lat && lead.lng ? (
                    <AdvancedMarker key={lead.id} position={{ lat: lead.lat, lng: lead.lng }}>
                      <Pin
                        background={checkedIn[lead.id] ? '#34d399' : idx === currentIdx ? '#f59e0b' : '#94a3b8'}
                        borderColor="#1a1f2e"
                        glyph={String(idx + 1)}
                        glyphColor="#1a1f2e"
                      />
                    </AdvancedMarker>
                  ) : null
                ))}
              </Map>
            </div>

            {/* Lista da rota */}
            <div style={{ flex:1, overflowY:'auto', padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'#f8fafc' }}>Paradas da rota</span>
                <button onClick={() => { setRouteBuilt(false); setRoute([]); setSelected([]); setCheckedIn({}) }} style={{ fontSize:11, color:'#64748b', background:'transparent', border:'none', cursor:'pointer' }}>
                  ← Refazer
                </button>
              </div>

              {route.map((lead, idx) => {
                const done    = checkedIn[lead.id]
                const current = idx === currentIdx && !done
                return (
                  <div key={lead.id} style={{
                    background: done ? 'rgba(52,211,153,0.08)' : current ? 'rgba(245,158,11,0.1)' : '#252b3b',
                    border: current ? '0.5px solid rgba(245,158,11,0.5)' : '0.5px solid rgba(255,255,255,0.07)',
                    borderRadius:12, padding:'12px', marginBottom:8,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:28, height:28, borderRadius:'50%', flexShrink:0,
                        background: done ? '#059669' : current ? '#f59e0b' : '#2f3749',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:700, color:'#fff',
                      }}>{done ? '✓' : idx + 1}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color: done ? '#34d399' : '#f8fafc' }}>{lead.nome_empresa}</div>
                        <div style={{ fontSize:11, color:'#64748b' }}>{lead.endereco || lead.bairro}</div>
                      </div>
                    </div>

                    {!done && (
                      <div style={{ display:'flex', gap:8, marginTop:10 }}>
                        <button onClick={() => abrirNavegacao(lead)} style={{ flex:1, padding:'8px', borderRadius:8, border:'0.5px solid rgba(255,255,255,0.15)', background:'transparent', color:'#94a3b8', fontSize:11, cursor:'pointer' }}>
                          🧭 Navegar
                        </button>
                        <button onClick={() => doCheckin(lead)} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', background: current ? '#f59e0b' : '#059669', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                          📍 Check-in
                        </button>
                      </div>
                    )}
                    {done && <div style={{ fontSize:11, color:'#34d399', marginTop:6 }}>✓ Visitado e registrado</div>}
                  </div>
                )
              })}

              {visitasFeitas === route.length && (
                <div style={{ textAlign:'center', padding:16, background:'rgba(5,150,105,0.1)', borderRadius:12, border:'0.5px solid rgba(5,150,105,0.3)' }}>
                  <div style={{ fontSize:20, marginBottom:6 }}>🎉</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:'#34d399' }}>Rota concluída!</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{route.length} estabelecimentos visitados hoje</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  )
}
