import { useState, useEffect } from 'react'
import { fetchLeads, updateLead, deleteLead } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import LeadDetailModal from '../components/LeadDetailModal'

const STATUS_COLORS = {
  'Novo':'#93c5fd','Contatado':'#fcd34d','Fatura Coletada':'#a78bfa',
  'Fechado':'#34d399','Já Possui Solar':'#94a3b8'
}
const NICHO_EMOJI = {'Padaria':'🥖','Açougue':'🥩','Mercado':'🛒','Farmácia':'💊','Restaurante':'🍽️','Posto':'⛽','Comércio':'🏪'}

export default function LeadsPage() {
  const { user, isAdmin } = useAuth()
  const [leads, setLeads] = useState([])
  const [selected, setSelected] = useState(null)
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const data = await fetchLeads(user.id, isAdmin)
    setLeads(data)
    setLoading(false)
  }

  async function handleUpdate(id, updates) {
    const updated = await updateLead(id, updates)
    setLeads(prev => prev.map(l => l.id === id ? updated : l))
    setSelected(updated)
  }

  async function handleDelete(id) {
    await deleteLead(id)
    setLeads(prev => prev.filter(l => l.id !== id))
    setSelected(null)
  }

  const STATUS_LIST = ['Todos','Novo','Contatado','Fatura Coletada','Fechado','Já Possui Solar']
  const filtered = filterStatus === 'Todos' ? leads : leads.filter(l => l.status === filterStatus)

  // Stats
  const stats = {
    total: leads.length,
    fechados: leads.filter(l => l.status === 'Fechado').length,
    quentes: leads.filter(l => l.status === 'Fatura Coletada').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1f2e', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ background: '#252b3b', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>
          Meus Leads
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[['Total',stats.total,'#f8fafc'],['Fechados',stats.fechados,'#34d399'],['Fatura Colet.',stats.quentes,'#a78bfa']].map(([lbl,val,col]) => (
            <div key={lbl} style={{ flex: 1, background: '#1a1f2e', borderRadius: 10, padding: '8px 10px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: col }}>{val}</div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', scrollbarWidth: 'none', background: '#252b3b', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        {STATUS_LIST.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
            border: filterStatus === s ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.12)',
            background: filterStatus === s ? 'rgba(5,150,105,0.2)' : 'transparent',
            color: filterStatus === s ? '#34d399' : '#94a3b8',
          }}>{s}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Carregando leads...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
            Nenhum lead encontrado. Use o Mapa para prospectar! 🗺️
          </div>
        )}
        {filtered.map(lead => (
          <div key={lead.id} onClick={() => setSelected(lead)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#252b3b', border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
          }}>
            {lead.foto_url
              ? <img src={lead.foto_url} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 42, height: 42, borderRadius: 8, background: '#2f3749', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {NICHO_EMOJI[lead.nicho] || '🏪'}
                </div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.nome_empresa}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {lead.nicho} · {lead.bairro || 'CG'}
                {lead.fatura_media ? ` · R$ ${lead.fatura_media.toLocaleString('pt-BR')}/mês` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: STATUS_COLORS[lead.status], background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 6 }}>{lead.status}</span>
              {lead.status === 'Já Possui Solar' && <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>🔧 Manutenção</div>}
            </div>
          </div>
        ))}
      </div>

      {selected && <LeadDetailModal lead={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} />}
    </div>
  )
}
