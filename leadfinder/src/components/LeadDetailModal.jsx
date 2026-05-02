import { useState } from 'react'
import { gerarPitchWhatsApp, gerarImagemSolar, calcularEconomia } from '../lib/ai'
import { useAuth } from '../hooks/useAuth'

const STATUS_LIST = ['Novo','Contatado','Fatura Coletada','Fechado','Já Possui Solar']

export default function LeadDetailModal({ lead, onClose, onUpdate }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState('info') // info | simular | pitch
  const [status, setStatus] = useState(lead.status)
  const [fatura, setFatura] = useState(lead.fatura_media || '')
  const [produto, setProduto] = useState('Pré-pago')
  const [calculo, setCalculo] = useState(null)
  const [pitch, setPitch] = useState('')
  const [loadingPitch, setLoadingPitch] = useState(false)
  const [loadingImg, setLoadingImg] = useState(false)
  const [imagemSolar, setImagemSolar] = useState(null)
  const hasSolar = status === 'Já Possui Solar'

  async function salvarStatus(s) {
    setStatus(s)
    await onUpdate(lead.id, { status: s })
  }

  function simular() {
    if (!fatura) return
    const result = calcularEconomia({ fatura: parseFloat(fatura), produto })
    setCalculo(result)
  }

  async function handlePitch() {
    if (!calculo) { simular(); return }
    setLoadingPitch(true)
    try {
      const text = await gerarPitchWhatsApp({
        nomeEmpresa: lead.nome_empresa,
        nicho: lead.nicho,
        fatura: parseFloat(fatura),
        novaFatura: calculo.novaFatura,
        economia: calculo.economia,
        produto,
        vendedor: profile?.nome || 'Consultor Habil',
      })
      setPitch(text)
    } catch (e) { setPitch('Erro ao gerar pitch. Verifique sua chave Anthropic.') }
    setLoadingPitch(false)
  }

  async function handleWhatsApp() {
    const tel = lead.telefone?.replace(/\D/g, '')
    if (!tel) return alert('Telefone não cadastrado para este lead.')
    const msg = pitch || `Olá! Sou da Habil Soluções Energéticas. Seu estabelecimento pode economizar na conta de luz. Posso apresentar? ⚡🌱`
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  async function handleGerarImagem() {
    setLoadingImg(true)
    try {
      const url = await gerarImagemSolar({ nomeEmpresa: lead.nome_empresa, nicho: lead.nicho, fotoUrl: lead.foto_url })
      setImagemSolar(url)
    } catch (e) { alert('Configure a chave OpenAI no .env para gerar imagens DALL-E') }
    setLoadingImg(false)
  }

  const s = (active) => ({
    flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
    background: 'transparent', fontSize: 12, fontWeight: 500,
    color: active ? '#34d399' : '#64748b',
    borderBottom: active ? '2px solid #059669' : '2px solid transparent',
  })

  const fmt = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-end', zIndex: 50,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxHeight: '88dvh', overflowY: 'auto',
        background: '#252b3b', borderRadius: '16px 16px 0 0',
        borderTop: '0.5px solid rgba(255,255,255,0.1)',
        fontFamily: "'DM Sans',sans-serif",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '12px 16px 0' }}>
          {lead.foto_url && <img src={lead.foto_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />}
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700, color: '#f8fafc' }}>{lead.nome_empresa}</div>
          <div style={{ fontSize: 12, color: '#059669', marginBottom: 8 }}>{lead.nicho} · {lead.bairro || 'Campo Grande'}</div>

          {/* Status selector */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {STATUS_LIST.map(s => (
              <button key={s} onClick={() => salvarStatus(s)} style={{
                padding: '3px 9px', borderRadius: 10, fontSize: 10, fontWeight: 500, cursor: 'pointer',
                border: status === s ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.12)',
                background: status === s ? 'rgba(5,150,105,0.25)' : 'rgba(255,255,255,0.04)',
                color: status === s ? '#34d399' : '#94a3b8',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', margin: '0 16px' }}>
          <button style={s(tab==='info')} onClick={() => setTab('info')}>Informações</button>
          {!hasSolar && <button style={s(tab==='simular')} onClick={() => setTab('simular')}>Simulador</button>}
          <button style={s(tab==='pitch')} onClick={() => setTab('pitch')}>Pitch IA</button>
        </div>

        <div style={{ padding: '14px 16px 24px' }}>

          {/* INFO TAB */}
          {tab === 'info' && (
            <div>
              {[
                ['Endereço', lead.endereco],
                ['Telefone', lead.telefone],
                ['Fatura Média', lead.fatura_media ? fmt(lead.fatura_media) : '—'],
                ['Place ID Google', lead.google_place_id?.slice(0,20) + '...'],
              ].map(([k, v]) => v && (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{k}</span>
                  <span style={{ fontSize: 13, color: '#f8fafc', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
              {hasSolar && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(148,163,184,0.1)', borderRadius: 10, border: '0.5px solid rgba(148,163,184,0.3)' }}>
                  <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>☀️ Cliente já possui Solar</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Ofertar Manutenção, Limpeza ou Ampliação de sistema</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={{ flex: 1, padding: 9, borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }}>🔧 Manutenção</button>
                    <button style={{ flex: 1, padding: 9, borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#e2e8f0', fontSize: 12, cursor: 'pointer' }}>📈 Ampliação</button>
                  </div>
                </div>
              )}
              <button onClick={handleWhatsApp} style={{ width: '100%', marginTop: 14, background: '#25d366', border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                💬 Abrir WhatsApp
              </button>
            </div>
          )}

          {/* SIMULAR TAB */}
          {tab === 'simular' && (
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Valor da Fatura (R$)</label>
              <input
                type="number" value={fatura} onChange={e => setFatura(e.target.value)}
                style={{ width: '100%', background: '#1a1f2e', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px', color: '#f8fafc', fontSize: 18, fontWeight: 500, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
                placeholder="0,00"
              />
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {['Pré-pago','Otimizador','Combo','Portabilidade'].map(p => (
                  <button key={p} onClick={() => setProduto(p)} style={{
                    flex: 1, padding: '7px 2px', borderRadius: 8, fontSize: 10, fontWeight: 500, cursor: 'pointer',
                    border: produto === p ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.12)',
                    background: produto === p ? 'rgba(5,150,105,0.2)' : 'transparent',
                    color: produto === p ? '#34d399' : '#94a3b8',
                  }}>{p}</button>
                ))}
              </div>
              <button onClick={simular} style={{ width: '100%', background: '#059669', border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 14 }}>
                CALCULAR →
              </button>

              {calculo && (
                <div style={{ background: '#1a1f2e', borderRadius: 12, border: '0.5px solid rgba(5,150,105,0.3)', padding: 14 }}>
                  {[
                    ['Fatura atual', fmt(calculo.fatura), '#f8fafc'],
                    ['Nova fatura', fmt(calculo.novaFatura), '#34d399'],
                    ['Economia mensal', fmt(calculo.economia), '#34d399'],
                    ['Economia anual', fmt(calculo.economiaAnual), '#34d399'],
                    ...(calculo.parcela > 0 ? [['Equipamento 21x', fmt(calculo.parcela) + '/mês', '#fcd34d']] : []),
                    ['Sua comissão', fmt(calculo.comissaoVendedor), '#a78bfa'],
                  ].map(([k,v,c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{k}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: c }}>{v}</span>
                    </div>
                  ))}
                  {/* Bar chart */}
                  <div style={{ marginTop: 12 }}>
                    {[['Atual', 100, '#64748b'], ['Com Habil', calculo.pctEconomia, '#059669']].map(([lbl, pct, col]) => (
                      <div key={lbl} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                          <span>{lbl}</span><span>{pct}%</span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: col, borderRadius: 4, transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setTab('pitch')} style={{ width: '100%', marginTop: 10, background: 'transparent', border: '0.5px solid rgba(5,150,105,0.5)', borderRadius: 10, padding: 10, color: '#34d399', fontSize: 13, cursor: 'pointer' }}>
                    📲 Gerar Pitch com IA →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PITCH TAB */}
          {tab === 'pitch' && (
            <div>
              {!calculo && (
                <div style={{ marginBottom: 12, padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '0.5px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fcd34d' }}>
                  ⚠️ Simule a economia antes de gerar o pitch para um resultado personalizado.
                </div>
              )}
              <button onClick={handlePitch} disabled={loadingPitch} style={{ width: '100%', background: loadingPitch ? '#1a1f2e' : '#059669', border: '0.5px solid #059669', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                {loadingPitch ? '⏳ Claude está gerando...' : '✨ Gerar Pitch com Claude IA'}
              </button>

              {pitch && (
                <div>
                  <div style={{ background: '#1a1f2e', borderRadius: 10, padding: 14, marginBottom: 10, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Pitch gerado pela IA:</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{pitch}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => navigator.clipboard.writeText(pitch)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
                      📋 Copiar
                    </button>
                    <button onClick={handleWhatsApp} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#25d366', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      💬 Enviar
                    </button>
                  </div>
                </div>
              )}

              {/* DALL-E image */}
              <div style={{ marginTop: 16, borderTop: '0.5px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Opcional: gerar imagem do estabelecimento com painéis solares (DALL-E)</div>
                <button onClick={handleGerarImagem} disabled={loadingImg} style={{ width: '100%', padding: 10, borderRadius: 8, border: '0.5px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: 12, cursor: 'pointer' }}>
                  {loadingImg ? '⏳ Gerando imagem...' : '🖼️ Gerar Imagem Solar (DALL-E)'}
                </button>
                {imagemSolar && <img src={imagemSolar} alt="Solar" style={{ width: '100%', borderRadius: 10, marginTop: 10 }} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
