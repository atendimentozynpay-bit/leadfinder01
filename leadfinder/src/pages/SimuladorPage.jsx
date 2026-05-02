import { useState } from 'react'
import { calcularEconomia, gerarPitchWhatsApp } from '../lib/ai'
import { useAuth } from '../hooks/useAuth'
import { createProposal } from '../lib/supabase'

const PRODUTOS = ['Pré-pago','Otimizador','Combo','Solar','Portabilidade']

export default function SimuladorPage() {
  const { user, profile } = useAuth()
  const [fatura, setFatura] = useState('')
  const [produto, setProduto] = useState('Pré-pago')
  const [calculo, setCalculo] = useState(null)
  const [pitch, setPitch] = useState('')
  const [loadingPitch, setLoadingPitch] = useState(false)
  const [nomeEmpresa, setNomeEmpresa] = useState('')

  function simular() {
    if (!fatura) return
    setCalculo(calcularEconomia({ fatura: parseFloat(fatura), produto }))
    setPitch('')
  }

  async function gerarPitch() {
    if (!calculo) return
    setLoadingPitch(true)
    try {
      const text = await gerarPitchWhatsApp({
        nomeEmpresa: nomeEmpresa || 'Cliente',
        nicho: 'Comércio',
        fatura: parseFloat(fatura),
        novaFatura: calculo.novaFatura,
        economia: calculo.economia,
        produto,
        vendedor: profile?.nome || 'Consultor Habil',
      })
      setPitch(text)
    } catch { setPitch('Configure sua chave Anthropic no .env') }
    setLoadingPitch(false)
  }

  const fmt = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1f2e', fontFamily: "'DM Sans',sans-serif", overflowY: 'auto' }}>
      <div style={{ background: '#252b3b', padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>Simulador Financeiro ⚡</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Calcule a economia e gere o pitch com IA</div>
      </div>

      <div style={{ padding: '16px', flex: 1 }}>
        {/* Nome */}
        <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Nome do Estabelecimento (opcional)</label>
        <input value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)}
          style={{ width: '100%', background: '#252b3b', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
          placeholder="Ex: Padaria São Paulo"
        />

        {/* Fatura */}
        <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Valor da Fatura Atual (R$)</label>
        <input type="number" value={fatura} onChange={e => setFatura(e.target.value)}
          style={{ width: '100%', background: '#252b3b', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', color: '#f8fafc', fontSize: 22, fontWeight: 600, outline: 'none', marginBottom: 14, boxSizing: 'border-box', fontFamily: "'Syne',sans-serif" }}
          placeholder="0,00"
        />

        {/* Produto */}
        <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Produto</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {PRODUTOS.map(p => (
            <button key={p} onClick={() => setProduto(p)} style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: produto === p ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.12)',
              background: produto === p ? 'rgba(5,150,105,0.2)' : 'transparent',
              color: produto === p ? '#34d399' : '#94a3b8',
            }}>{p}</button>
          ))}
        </div>

        <button onClick={simular} style={{ width: '100%', background: '#059669', border: 'none', borderRadius: 10, padding: 13, color: '#fff', fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
          CALCULAR ECONOMIA →
        </button>

        {calculo && (
          <div style={{ background: '#252b3b', borderRadius: 14, border: '0.5px solid rgba(5,150,105,0.3)', padding: 16, marginBottom: 14 }}>
            {[
              ['Fatura atual', fmt(calculo.fatura), '#f8fafc'],
              ['Nova fatura', fmt(calculo.novaFatura), '#34d399'],
              ['Economia mensal', fmt(calculo.economia), '#34d399'],
              ['Economia anual', fmt(calculo.economiaAnual), '#34d399'],
              ...(calculo.parcela > 0 ? [['Equipamento 21x', fmt(calculo.parcela)+'/mês','#fcd34d']] : []),
              ['Sua comissão', fmt(calculo.comissaoVendedor), '#a78bfa'],
            ].map(([k,v,c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{k}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: c }}>{v}</span>
              </div>
            ))}
            {/* bar */}
            <div style={{ marginTop: 14 }}>
              {[['Cenário atual', 100,'#64748b'],['Com Habil', calculo.pctEconomia,'#059669']].map(([lbl,pct,col]) => (
                <div key={lbl} style={{ marginBottom: 8 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'#94a3b8',marginBottom:3 }}><span>{lbl}</span><span>{pct}%</span></div>
                  <div style={{ height:8,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden' }}>
                    <div style={{ height:'100%',width:pct+'%',background:col,borderRadius:4,transition:'width 0.6s' }}/>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={gerarPitch} disabled={loadingPitch} style={{ width:'100%',marginTop:12,background:'transparent',border:'0.5px solid rgba(5,150,105,0.5)',borderRadius:10,padding:10,color:'#34d399',fontSize:13,cursor:'pointer' }}>
              {loadingPitch ? '⏳ Claude gerando pitch...' : '✨ Gerar Pitch com IA Claude'}
            </button>
          </div>
        )}

        {pitch && (
          <div style={{ background: '#252b3b', borderRadius: 12, padding: 14, border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Pitch gerado</div>
            <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{pitch}</div>
            <button onClick={() => navigator.clipboard.writeText(pitch)} style={{ width:'100%',padding:10,borderRadius:8,border:'0.5px solid rgba(255,255,255,0.15)',background:'transparent',color:'#94a3b8',fontSize:12,cursor:'pointer' }}>
              📋 Copiar Pitch
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
