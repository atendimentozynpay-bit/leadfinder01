import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// Campo Grande centro
const CG = { lat: -20.4697, lng: -54.6201 }

// Pins de lead animados sobre o mapa
const LEAD_PINS = [
  { lat: -20.4620, lng: -54.6150, color: '#34d399', label: 'Padaria', delay: 0 },
  { lat: -20.4700, lng: -54.6080, color: '#fcd34d', label: 'Açougue', delay: 300 },
  { lat: -20.4780, lng: -54.6220, color: '#93c5fd', label: 'Mercado', delay: 600 },
  { lat: -20.4550, lng: -54.6300, color: '#f87171', label: 'Farmácia', delay: 900 },
  { lat: -20.4650, lng: -54.6350, color: '#a78bfa', label: 'Restaurante', delay: 1200 },
  { lat: -20.4820, lng: -54.6120, color: '#34d399', label: 'Mercado', delay: 1500 },
  { lat: -20.4490, lng: -54.6180, color: '#fcd34d', label: 'Padaria', delay: 800 },
]

// ── Componente interno: controla o mapa após mount
function MapController({ onReady }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    // Configuração 3D: inclinação + ângulo que gera o efeito isométrico
    map.setTilt(60)
    map.setHeading(30)

    // Animação de rotação suave contínua
    let heading = 30
    let rafId
    const rotate = () => {
      heading = (heading + 0.04) % 360
      map.setHeading(heading)
      rafId = requestAnimationFrame(rotate)
    }

    // Começa a rotação após 1s para o mapa carregar
    const timer = setTimeout(() => {
      rotate()
      onReady?.()
    }, 1000)

    // Zoom in cinematográfico
    let zoom = 13
    const zoomIn = setInterval(() => {
      if (zoom < 15.5) {
        zoom += 0.05
        map.setZoom(zoom)
      } else {
        clearInterval(zoomIn)
      }
    }, 80)

    return () => {
      clearTimeout(timer)
      clearInterval(zoomIn)
      cancelAnimationFrame(rafId)
    }
  }, [map])

  return null
}

// ── Pin de lead com animação CSS
function LeadPin({ lat, lng, color, label, delay, mapReady }) {
  const map = useMap()
  const pinRef = useRef(null)
  const [pos, setPos] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!map || !mapReady) return

    // Converte lat/lng para posição de pixel no mapa
    const updatePos = () => {
      const projection = map.getProjection()
      if (!projection) return

      const bounds = map.getBounds()
      if (!bounds) return

      try {
        const point = projection.fromLatLngToPoint({ lat, lng })
        const nwPoint = projection.fromLatLngToPoint(bounds.getNorthEast())
        const sePoint = projection.fromLatLngToPoint(bounds.getSouthWest())
        // Calcula posição relativa ao container
        const mapDiv = map.getDiv()
        const w = mapDiv.offsetWidth
        const h = mapDiv.offsetHeight
        const scale = Math.pow(2, map.getZoom())
        const x = (point.x - sePoint.x) * scale
        const y = (point.y - nwPoint.y) * scale
        setPos({ x: (x / (w)) * 100, y: (y / h) * 100 })
      } catch {}
    }

    const listeners = [
      map.addListener('projection_changed', updatePos),
      map.addListener('bounds_changed', updatePos),
      map.addListener('zoom_changed', updatePos),
      map.addListener('heading_changed', updatePos),
      map.addListener('tilt_changed', updatePos),
    ]

    updatePos()

    setTimeout(() => setVisible(true), delay + 1200)

    return () => listeners.forEach(l => l.remove?.())
  }, [map, mapReady, lat, lng, delay])

  if (!pos || !visible) return null

  return (
    <div style={{
      position: 'absolute',
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 10,
      pointerEvents: 'none',
      animation: 'pinFloat 2.5s ease-in-out infinite',
      animationDelay: `${delay % 800}ms`,
    }}>
      <div style={{
        width: 12, height: 12,
        borderRadius: '50%',
        background: color,
        border: '2px solid rgba(255,255,255,0.9)',
        boxShadow: `0 0 12px ${color}88`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          inset: -5,
          borderRadius: '50%',
          border: `1.5px solid ${color}`,
          opacity: 0.5,
          animation: 'ripple 2s ease-out infinite',
        }}/>
      </div>
      <div style={{
        position: 'absolute',
        top: -22,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15,20,30,0.85)',
        border: `0.5px solid ${color}55`,
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: 9,
        color: color,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        fontFamily: "'DM Sans', sans-serif",
      }}>{label}</div>
    </div>
  )
}

// ── Seção de feature card
function FeatureCard({ icon, title, desc, accent }) {
  return (
    <div style={{
      background: '#0f1520',
      border: '0.5px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '18px 16px',
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 42, height: 42,
        borderRadius: 12,
        background: `${accent}18`,
        border: `0.5px solid ${accent}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9', marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>{title}</div>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Componente principal
export default function LandingPage() {
  const navigate = useNavigate()
  const [mapReady, setMapReady] = useState(false)
  const [statsActive, setStatsActive] = useState(false)
  const [counts, setCounts] = useState({ leads: 0, eco: 0, pitch: 0 })

  // Animação dos números
  useEffect(() => {
    if (!statsActive) return
    const targets = { leads: 25, eco: 44, pitch: 8 }
    const dur = 1400
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setCounts({
        leads: Math.round(ease * targets.leads),
        eco: Math.round(ease * targets.eco),
        pitch: Math.round(ease * targets.pitch),
      })
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [statsActive])

  useEffect(() => {
    const timer = setTimeout(() => setStatsActive(true), 1800)
    return () => clearTimeout(timer)
  }, [])

  const mapOptions = {
    mapId: 'leadfinder-3d',
    disableDefaultUI: true,
    gestureHandling: 'none',
    keyboardShortcuts: false,
    colorScheme: 'DARK',
    renderingType: 'VECTOR',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes pinFloat {
          0%,100% { transform: translate(-50%,-50%) translateY(0); }
          50%      { transform: translate(-50%,-50%) translateY(-6px); }
        }
        @keyframes ripple {
          0%   { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes scanDown {
          0%   { top: 0%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 0.7; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgePulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.4; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #070d16; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#070d16', minHeight: '100dvh', overflowX: 'hidden' }}>

        {/* ══ HERO ══ */}
        <div style={{ position: 'relative', height: '100dvh', maxHeight: 700, overflow: 'hidden' }}>

          {/* MAPA 3D REAL */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <APIProvider apiKey={GMAPS_KEY}>
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <Map
                  defaultCenter={CG}
                  defaultZoom={13}
                  mapId="leadfinder-3d"
                  style={{ width: '100%', height: '100%' }}
                  disableDefaultUI
                  gestureHandling="none"
                  colorScheme="DARK"
                >
                  <MapController onReady={() => setMapReady(true)} />
                </Map>

                {/* Pins de lead sobrepostos */}
                {LEAD_PINS.map((pin, i) => (
                  <LeadPin key={i} {...pin} mapReady={mapReady} />
                ))}

                {/* Linha de scan */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, transparent 0%, #059669 50%, transparent 100%)',
                  animation: 'scanDown 4s linear infinite',
                  opacity: 0.5,
                  top: 0, zIndex: 5, pointerEvents: 'none',
                }}/>
              </div>
            </APIProvider>
          </div>

          {/* Gradiente de escurecimento nas bordas */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 50% 45%, transparent 20%, rgba(7,13,22,0.55) 70%, rgba(7,13,22,0.92) 100%)',
          }}/>

          {/* Gradiente no rodapé do hero para transição suave */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
            background: 'linear-gradient(to top, #070d16 0%, transparent 100%)',
            zIndex: 3, pointerEvents: 'none',
          }}/>

          {/* Conteúdo sobre o mapa */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-end',
            padding: '0 20px 40px',
            textAlign: 'center',
          }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(5,150,105,0.12)',
              border: '0.5px solid rgba(5,150,105,0.45)',
              borderRadius: 20, padding: '5px 14px',
              marginBottom: 16,
              animation: 'fadeSlideUp 0.7s ease both',
              animationDelay: '0.3s',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', animation: 'badgePulse 1.6s ease infinite' }}/>
              <span style={{ fontSize: 11, color: '#34d399', fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Campo Grande, MS
              </span>
            </div>

            {/* Título */}
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 34, fontWeight: 800,
              color: '#f8fafc', lineHeight: 1.08,
              letterSpacing: '-1.5px',
              marginBottom: 12,
              animation: 'fadeSlideUp 0.7s ease both',
              animationDelay: '0.5s',
            }}>
              Prospecte mais.<br/>
              <span style={{ color: '#34d399' }}>Feche mais.</span>
            </h1>

            {/* Subtítulo */}
            <p style={{
              fontSize: 13, color: '#94a3b8', lineHeight: 1.7,
              maxWidth: 300, marginBottom: 28,
              animation: 'fadeSlideUp 0.7s ease both',
              animationDelay: '0.7s',
            }}>
              Encontre clientes de energia em qualquer bairro, simule a economia e gere o pitch com IA — tudo num só app.
            </p>

            {/* CTAs */}
            <div style={{
              display: 'flex', gap: 10,
              animation: 'fadeSlideUp 0.7s ease both',
              animationDelay: '0.9s',
            }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: '#059669', border: 'none',
                  borderRadius: 12, padding: '13px 24px',
                  color: '#fff', fontFamily: "'Syne', sans-serif",
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.3px',
                  transition: 'background 0.2s, transform 0.1s',
                }}
                onMouseEnter={e => e.target.style.background = '#047857'}
                onMouseLeave={e => e.target.style.background = '#059669'}
                onMouseDown={e => e.target.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.target.style.transform = 'scale(1)'}
              >
                Começar agora →
              </button>
              <button
                onClick={() => navigate('/map')}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '0.5px solid rgba(255,255,255,0.18)',
                  borderRadius: 12, padding: '13px 20px',
                  color: '#e2e8f0', fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.07)'}
              >
                Ver demo
              </button>
            </div>
          </div>
        </div>

        {/* ══ STATS BAR ══ */}
        <div style={{
          background: '#0c1219',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
        }}>
          {[
            { num: `${counts.leads}+`, lbl: 'Leads por dia' },
            { num: `${counts.eco}%`,  lbl: 'Economia média' },
            { num: `${counts.pitch}s`, lbl: 'Pitch com IA' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              padding: '18px 8px',
              borderRight: i < 2 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: '#34d399' }}>{s.num}</div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* ══ FEATURES ══ */}
        <div style={{ padding: '36px 20px 28px', background: '#070d16' }}>
          <div style={{ fontSize: 10, color: '#059669', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 500, marginBottom: 8 }}>
            Funcionalidades
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 24, lineHeight: 1.2 }}>
            Tudo que você precisa<br/>para prospectar
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FeatureCard icon="🗺️" accent="#059669" title="Mapa de leads em tempo real"
              desc="Busque padarias, açougues, mercados — qualquer nicho — no Google Maps e salve direto na sua carteira de clientes." />
            <FeatureCard icon="⚡" accent="#f59e0b" title="Simulador financeiro instantâneo"
              desc="Calcule a economia de Pré-pago, Otimizador ou Combo em segundos. Mostra o gráfico, a parcela e sua comissão." />
            <FeatureCard icon="✨" accent="#a78bfa" title="Pitch gerado por IA"
              desc="IA cria mensagem personalizada para WhatsApp com nome do cliente, economia calculada e convite para visita." />
            <FeatureCard icon="🧭" accent="#93c5fd" title="Roteirização porta a porta"
              desc="Selecione os leads do dia e o app monta a rota otimizada. Check-in geolocalizado em cada estabelecimento visitado." />
            <FeatureCard icon="📊" accent="#34d399" title="Dashboard gerencial"
              desc="Mapa de calor de Campo Grande, funil de vendas, mix de produtos e relatório diário exportável em PDF." />
          </div>
        </div>

        {/* ══ COMO FUNCIONA ══ */}
        <div style={{ padding: '0 20px 36px', background: '#070d16' }}>
          <div style={{ fontSize: 10, color: '#059669', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 500, marginBottom: 8 }}>
            Como funciona
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 20, lineHeight: 1.2 }}>
            Do lead ao fechamento<br/>em minutos
          </h2>
          {[
            ['01', '#34d399', 'Abre o mapa', 'Busca padarias no bairro. Os estabelecimentos aparecem com foto, endereço e telefone.'],
            ['02', '#fcd34d', 'Simula a economia', 'Digita o valor da fatura. O app calcula quanto o cliente economiza e quanto você ganha.'],
            ['03', '#a78bfa', 'Gera o pitch com IA', 'Um clique e a IA cria a mensagem ideal para WhatsApp baseada nos dados reais do cliente.'],
            ['04', '#059669', 'Fecha o contrato', 'Registra o lead, faz o check-in e o gestor acompanha tudo no dashboard em tempo real.'],
          ].map(([num, col, title, desc]) => (
            <div key={num} style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `${col}18`, border: `0.5px solid ${col}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: col,
              }}>{num}</div>
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9', marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>{title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ══ DEPOIMENTO ══ */}
        <div style={{ padding: '0 20px 36px', background: '#070d16' }}>
          <div style={{
            background: '#0c1219',
            border: '0.5px solid rgba(5,150,105,0.2)',
            borderRadius: 18, padding: '20px 18px',
          }}>
            <div style={{ color: '#f59e0b', fontSize: 15, marginBottom: 10, letterSpacing: 2 }}>★★★★★</div>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.75, marginBottom: 16, fontStyle: 'italic' }}>
              "Antes eu gastava 2 horas procurando clientes no Google. Agora abro o app, filtro por padarias e já tenho 20 leads com telefone e estimativa de economia. Fechei 3 contratos na primeira semana."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(5,150,105,0.15)',
                border: '1.5px solid rgba(5,150,105,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: '#34d399',
              }}>MF</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>Marcos F.</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Vendedor autônomo · Campo Grande</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ CTA FINAL ══ */}
        <div style={{
          background: '#040e09',
          borderTop: '0.5px solid rgba(5,150,105,0.2)',
          padding: '36px 20px 44px',
          textAlign: 'center',
        }}>
          {/* Ícone decorativo */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(5,150,105,0.15)',
            border: '0.5px solid rgba(5,150,105,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 20px',
          }}>⚡</div>

          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: '#f8fafc', marginBottom: 8, lineHeight: 1.2 }}>
            Comece a prospectar<br/>ainda hoje
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
            Gratuito para testar. Sem cartão de crédito.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%', maxWidth: 340,
              background: '#059669', border: 'none',
              borderRadius: 12, padding: '15px',
              color: '#fff', fontFamily: "'Syne', sans-serif",
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.5px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = '#047857'}
            onMouseLeave={e => e.target.style.background = '#059669'}
          >
            Quero meu LeadFinder →
          </button>
          <div style={{ marginTop: 14, fontSize: 11, color: '#374151' }}>
            Habil Soluções Energéticas · CNPJ 19.816.880/0001-05
          </div>
        </div>

      </div>
    </>
  )
}
