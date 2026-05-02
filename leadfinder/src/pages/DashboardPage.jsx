import { useState, useEffect } from 'react'
import { fetchDashboardStats } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Mini heatmap de Campo Grande usando SVG (sem API externa)
const CG_BAIRROS = [
  { nome:'Centro',     x:170, y:110, weight:0 },
  { nome:'Pioneiros',  x:210, y:80,  weight:0 },
  { nome:'Tiradentes', x:240, y:130, weight:0 },
  { nome:'Amambaí',    x:140, y:140, weight:0 },
  { nome:'Santa Fé',   x:90,  y:90,  weight:0 },
  { nome:'Carandá',    x:200, y:160, weight:0 },
  { nome:'Autonomista',x:130, y:70,  weight:0 },
  { nome:'São Franc.', x:270, y:90,  weight:0 },
  { nome:'Jardim TV',  x:310, y:130, weight:0 },
  { nome:'Leblon',     x:180, y:170, weight:0 },
]

function getHeatColor(weight, max) {
  if (max === 0) return 'rgba(5,150,105,0.15)'
  const pct = weight / max
  if (pct > 0.75) return 'rgba(239,68,68,0.7)'
  if (pct > 0.50) return 'rgba(245,158,11,0.65)'
  if (pct > 0.25) return 'rgba(5,150,105,0.55)'
  return 'rgba(5,150,105,0.2)'
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ leads:[], proposals:[], commissions:[] })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('hoje')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchDashboardStats()
      setStats(data)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  // Calcula pesos por bairro (mock distribuição)
  const bairrosComPeso = CG_BAIRROS.map((b,i) => ({
    ...b,
    weight: Math.floor(Math.random() * 12) + (stats.leads.length > 0 ? stats.leads.length / 10 : 1),
  }))
  const maxWeight = Math.max(...bairrosComPeso.map(b => b.weight), 1)

  // KPIs
  const totalLeads      = stats.leads.length
  const leadsHoje       = Math.min(totalLeads, 8) // mock dia atual
  const fechados        = stats.leads.filter(l => l.status === 'Fechado').length
  const faturas         = stats.leads.filter(l => l.status === 'Fatura Coletada').length
  const totalEconomia   = stats.proposals.reduce((s,p) => s + (p.economia_prevista || 0), 0)
  const totalComissao   = stats.commissions.reduce((s,c) => s + (c.valor_comissao || 0), 0)
  const ticketMedio     = stats.proposals.length > 0
    ? stats.proposals.reduce((s,p) => s + (p.valor_fatura_original || 0), 0) / stats.proposals.length
    : 0

  const fmt  = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
  const fmtK = v => v >= 1000 ? 'R$ ' + (v/1000).toFixed(1) + 'k' : fmt(v)

  // Produto mix
  const prodMix = {}
  stats.proposals.forEach(p => {
    prodMix[p.produto_ofertado] = (prodMix[p.produto_ofertado] || 0) + 1
  })

  async function exportarRelatorio() {
    // Abre janela de impressão com dados formatados
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Relatório LeadFinder — ${new Date().toLocaleDateString('pt-BR')}</title>
      <style>body{font-family:Arial;padding:20px;color:#111}h1{color:#059669}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f0fdf4}</style>
      </head><body>
      <h1>⚡ LeadFinder Energia — Relatório Diário</h1>
      <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <h2>Resumo</h2>
      <table>
        <tr><th>Indicador</th><th>Valor</th></tr>
        <tr><td>Total de Leads</td><td>${totalLeads}</td></tr>
        <tr><td>Leads Hoje</td><td>${leadsHoje}</td></tr>
        <tr><td>Fechados</td><td>${fechados}</td></tr>
        <tr><td>Faturas Coletadas</td><td>${faturas}</td></tr>
        <tr><td>Economia Total Gerada</td><td>${fmt(totalEconomia)}/mês</td></tr>
        <tr><td>Comissões Totais</td><td>${fmt(totalComissao)}</td></tr>
        <tr><td>Ticket Médio de Fatura</td><td>${fmt(ticketMedio)}</td></tr>
      </table>
      <br><p style="color:#666;font-size:12px">Habil Soluções Energéticas Ltda — CNPJ 19.816.880/0001-05</p>
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#1a1f2e', fontFamily:"'DM Sans',sans-serif", overflowY:'auto' }}>

      {/* Header */}
      <div style={{ background:'#252b3b', padding:'12px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:'#f8fafc' }}>Dashboard Gerencial</div>
            <div style={{ fontSize:11, color:'#64748b' }}>Habil Soluções Energéticas</div>
          </div>
          <button onClick={exportarRelatorio} style={{ background:'rgba(5,150,105,0.2)', border:'0.5px solid rgba(5,150,105,0.5)', borderRadius:8, padding:'7px 12px', color:'#34d399', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            📄 Exportar PDF
          </button>
        </div>
        {/* Period filter */}
        <div style={{ display:'flex', gap:6 }}>
          {['hoje','semana','mês'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding:'4px 12px', borderRadius:14, fontSize:11, cursor:'pointer',
              border: period===p ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.12)',
              background: period===p ? 'rgba(5,150,105,0.2)' : 'transparent',
              color: period===p ? '#34d399' : '#94a3b8',
            }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* KPI grid — 2 colunas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:10, padding:'14px 14px 0' }}>
        {[
          ['Leads Total',      totalLeads,          '#f8fafc', '📋'],
          ['Fechados',         fechados,             '#34d399', '✅'],
          ['Fat. Coletadas',   faturas,              '#a78bfa', '📂'],
          ['Leads Hoje',       leadsHoje,            '#93c5fd', '📍'],
          ['Economia/mês',     fmtK(totalEconomia),  '#34d399', '💡'],
          ['Comissões Total',  fmtK(totalComissao),  '#fcd34d', '💰'],
        ].map(([lbl, val, col, icon]) => (
          <div key={lbl} style={{ background:'#252b3b', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'10px 12px' }}>
            <div style={{ fontSize:14 }}>{icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:col, marginTop:4, lineHeight:1 }}>{loading ? '...' : val}</div>
            <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginTop:3 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* MAPA DE CALOR */}
      <div style={{ margin:'14px 14px 0', background:'#252b3b', borderRadius:14, border:'0.5px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
        <div style={{ padding:'10px 14px 6px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'#f8fafc' }}>Mapa de Calor — Campo Grande</span>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {[['Pouco','rgba(5,150,105,0.4)'],['Médio','rgba(245,158,11,0.65)'],['Alto','rgba(239,68,68,0.7)']].map(([l,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:3 }}>
                <div style={{ width:8,height:8,borderRadius:'50%',background:c }}/>
                <span style={{ fontSize:9, color:'#64748b' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 380 220" style={{ width:'100%', display:'block' }}>
          <rect width="380" height="220" fill="#1b2233"/>
          {/* Grid de ruas */}
          {[60,110,160,200].map(y => <line key={y} x1="0" y1={y} x2="380" y2={y} stroke="#252b3b" strokeWidth="5"/>)}
          {[60,120,180,240,300].map(x => <line key={x} x1={x} y1="0" x2={x} y2="220" stroke="#252b3b" strokeWidth="5"/>)}
          {/* Círculos de calor */}
          {bairrosComPeso.map(b => (
            <g key={b.nome}>
              <circle cx={b.x} cy={b.y} r={18 + b.weight * 1.2} fill={getHeatColor(b.weight, maxWeight)} />
              <circle cx={b.x} cy={b.y} r={6} fill={getHeatColor(b.weight, maxWeight).replace(/[\d.]+\)$/, '1)')} />
              <text x={b.x} y={b.y + 22} textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="DM Sans,sans-serif">{b.nome}</text>
              <text x={b.x} y={b.y + 3}  textAnchor="middle" fontSize="8" fill="#f8fafc" fontWeight="600" fontFamily="Syne,sans-serif">{b.weight}</text>
            </g>
          ))}
          <text x="190" y="14" textAnchor="middle" fontSize="8" fill="#374151" letterSpacing="2" fontFamily="DM Sans,sans-serif">CAMPO GRANDE · MS</text>
        </svg>
      </div>

      {/* Mix de Produtos */}
      <div style={{ margin:'14px 14px 0', background:'#252b3b', borderRadius:14, border:'0.5px solid rgba(255,255,255,0.07)', padding:'12px 14px' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'#f8fafc', marginBottom:10 }}>Mix de Produtos</div>
        {Object.keys(prodMix).length === 0 && (
          <div style={{ fontSize:12, color:'#64748b' }}>Nenhuma proposta ainda.</div>
        )}
        {Object.entries(prodMix).map(([prod, count]) => {
          const total = Object.values(prodMix).reduce((a,b) => a+b, 0)
          const pct   = Math.round((count / total) * 100)
          const colors = {'Pré-pago':'#34d399','Otimizador':'#93c5fd','Combo':'#a78bfa','Solar':'#fcd34d','Portabilidade':'#fb923c'}
          return (
            <div key={prod} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#94a3b8', marginBottom:4 }}>
                <span>{prod}</span><span>{count} propostas · {pct}%</span>
              </div>
              <div style={{ height:7, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:pct+'%', background:colors[prod]||'#059669', borderRadius:4, transition:'width 0.6s' }}/>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status funil */}
      <div style={{ margin:'14px 14px 20px', background:'#252b3b', borderRadius:14, border:'0.5px solid rgba(255,255,255,0.07)', padding:'12px 14px' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'#f8fafc', marginBottom:10 }}>Funil de Vendas</div>
        {[
          ['Novo',              stats.leads.filter(l=>l.status==='Novo').length,              '#93c5fd', 100],
          ['Contatado',         stats.leads.filter(l=>l.status==='Contatado').length,         '#fcd34d', 75],
          ['Fatura Coletada',   stats.leads.filter(l=>l.status==='Fatura Coletada').length,   '#a78bfa', 50],
          ['Fechado',           stats.leads.filter(l=>l.status==='Fechado').length,           '#34d399', 25],
        ].map(([lbl, count, col, barMax]) => (
          <div key={lbl} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:11, color:'#94a3b8', width:110, flexShrink:0 }}>{lbl}</span>
            <div style={{ flex:1, height:7, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min((count/Math.max(totalLeads,1))*100, 100)}%`, background:col, borderRadius:4 }}/>
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:col, width:20, textAlign:'right' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
