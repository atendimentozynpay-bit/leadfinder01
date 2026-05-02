import { useState, useEffect } from 'react'
import { fetchCommissions } from '../lib/supabase'
import { signOut } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function PerfilPage() {
  const { user, profile, isAdmin } = useAuth()
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommissions(user.id).then(d => { setCommissions(d); setLoading(false) })
  }, [])

  const totalPago = commissions.filter(c => c.status_pagamento === 'Pago').reduce((s,c) => s + (c.valor_comissao || 0), 0)
  const totalPendente = commissions.filter(c => c.status_pagamento !== 'Pago').reduce((s,c) => s + (c.valor_comissao || 0), 0)

  const initials = profile?.nome?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || 'VH'
  const fmt = v => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',background:'#1a1f2e',fontFamily:"'DM Sans',sans-serif",overflowY:'auto' }}>
      {/* Header */}
      <div style={{ background:'#252b3b',padding:'1.25rem 1.25rem 1rem',borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width:58,height:58,borderRadius:'50%',background:'rgba(5,150,105,0.25)',border:'2px solid #059669',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:700,color:'#34d399',marginBottom:10 }}>
          {initials}
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:'#f8fafc' }}>{profile?.nome || user?.email}</div>
        <div style={{ fontSize:12,color:'#059669',marginBottom:14 }}>{isAdmin ? 'Diretor · Admin' : 'Vendedor Autônomo'}</div>

        {/* Meta diária */}
        <div>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:'#94a3b8',marginBottom:6 }}>
            <span>Meta diária de visitas</span>
            <span>0 / {profile?.meta_diaria || 10}</span>
          </div>
          <div style={{ height:8,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden' }}>
            <div style={{ height:'100%',width:'0%',background:'#059669',borderRadius:4 }}/>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex',gap:10,padding:'14px 14px 0' }}>
        {[
          ['Pago',fmt(totalPago),'#34d399'],
          ['Pendente',fmt(totalPendente),'#fcd34d'],
          ['Total comissões',commissions.length.toString(),'#a78bfa'],
        ].map(([lbl,val,col]) => (
          <div key={lbl} style={{ flex:1,background:'#252b3b',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'10px 10px',textAlign:'center' }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:col }}>{val}</div>
            <div style={{ fontSize:9,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5,marginTop:2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Commissions */}
      <div style={{ padding:'14px 14px 0' }}>
        <div style={{ fontSize:11,fontWeight:500,color:'#64748b',textTransform:'uppercase',letterSpacing:1,marginBottom:10 }}>Extrato de Comissões</div>
        {loading && <div style={{ color:'#64748b',fontSize:13 }}>Carregando...</div>}
        {!loading && commissions.length === 0 && (
          <div style={{ color:'#64748b',fontSize:13,textAlign:'center',padding:16 }}>
            Nenhuma comissão registrada ainda. Feche sua primeira venda! 💪
          </div>
        )}
        {commissions.map(c => (
          <div key={c.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize:13,color:'#f8fafc' }}>{c.leads?.nome_empresa || 'Lead'}</div>
              <div style={{ fontSize:10,color:'#64748b',marginTop:2 }}>{c.proposal_id ? 'Proposta' : 'Venda direta'} · {new Date(c.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:15,fontWeight:600,color:'#34d399' }}>{fmt(c.valor_comissao || 0)}</div>
              <div style={{ fontSize:10,marginTop:2,color: c.status_pagamento==='Pago' ? '#34d399' : c.status_pagamento==='Aguardando 45d' ? '#fcd34d' : '#94a3b8' }}>
                {c.status_pagamento === 'Pago' ? '✓ Pago' : c.status_pagamento === 'Aguardando 45d' ? '⏳ 45 dias' : '⏳ Pendente'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ flexGrow:1 }}/>
      <button onClick={() => signOut()} style={{ margin:'16px 14px 24px',background:'transparent',border:'0.5px solid rgba(239,68,68,0.4)',borderRadius:10,padding:12,color:'#f87171',fontSize:13,fontWeight:500,cursor:'pointer' }}>
        Sair da conta
      </button>
    </div>
  )
}
