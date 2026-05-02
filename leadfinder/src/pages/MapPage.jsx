import { useState, useEffect, useRef, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { fetchLeads, createLead, updateLead } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import LeadDetailModal from '../components/LeadDetailModal'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
// Centro de Campo Grande, MS
const CG_CENTER = { lat: -20.4697, lng: -54.6201 }

const NICHOS = ['Padaria','Açougue','Mercado','Farmácia','Restaurante','Posto','Salão','Academia','Loja','Escola']
const STATUS_COLORS = {
  'Novo': '#93c5fd',
  'Contatado': '#fcd34d',
  'Fatura Coletada': '#a78bfa',
  'Fechado': '#34d399',
  'Já Possui Solar': '#94a3b8',
}

export default function MapPage() {
  const { user, profile, isAdmin } = useAuth()
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [selectedNicho, setSelectedNicho] = useState('Todos')
  const [selectedLead, setSelectedLead] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [placesResults, setPlacesResults] = useState([])
  const mapRef = useRef(null)

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    try {
      const data = await fetchLeads(user.id, isAdmin)
      setLeads(data)
      setFilteredLeads(data)
    } catch (e) { console.error(e) }
  }

  function filterByNicho(nicho) {
    setSelectedNicho(nicho)
    setFilteredLeads(nicho === 'Todos' ? leads : leads.filter(l => l.nicho === nicho))
  }

  // Busca via Google Places API
  async function searchPlaces() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const request = {
        textQuery: `${searchQuery} em Campo Grande MS`,
        fields: ['displayName','formattedAddress','location','photos','id','nationalPhoneNumber','types'],
        locationBias: { center: CG_CENTER, radius: 15000 },
        language: 'pt-BR',
        maxResultCount: 10,
      }
      const { places } = await Place.searchByText(request)
      const results = places.map(p => ({
        place_id: p.id,
        nome_empresa: p.displayName,
        endereco: p.formattedAddress,
        telefone: p.nationalPhoneNumber || '',
        lat: p.location?.lat(),
        lng: p.location?.lng(),
        foto_url: p.photos?.[0]?.getURI({ maxWidth: 400 }) || null,
        nicho: inferNicho(p.types, searchQuery),
        status: 'Novo',
      }))
      setPlacesResults(results)
    } catch (e) {
      console.error('Places error:', e)
      // Fallback: busca local nos leads
      const q = searchQuery.toLowerCase()
      setFilteredLeads(leads.filter(l =>
        l.nome_empresa?.toLowerCase().includes(q) ||
        l.nicho?.toLowerCase().includes(q) ||
        l.bairro?.toLowerCase().includes(q)
      ))
    }
    setSearching(false)
  }

  function inferNicho(types, query) {
    const q = query.toLowerCase()
    if (q.includes('padaria') || types?.includes('bakery')) return 'Padaria'
    if (q.includes('açougue') || q.includes('acougue')) return 'Açougue'
    if (q.includes('mercado') || q.includes('supermercado')) return 'Mercado'
    if (q.includes('farmácia') || types?.includes('pharmacy')) return 'Farmácia'
    if (q.includes('restaurante') || types?.includes('restaurant')) return 'Restaurante'
    if (q.includes('posto') || types?.includes('gas_station')) return 'Posto'
    return 'Comércio'
  }

  async function savePlaceLead(place) {
    try {
      const lead = await createLead({
        ...place,
        user_id: user.id,
        google_place_id: place.place_id,
      })
      setLeads(prev => [lead, ...prev])
      setFilteredLeads(prev => [lead, ...prev])
      setPlacesResults(prev => prev.filter(p => p.place_id !== place.place_id))
      setSelectedLead(lead)
    } catch (e) { console.error(e) }
  }

  async function handleUpdateLead(id, updates) {
    const updated = await updateLead(id, updates)
    setLeads(prev => prev.map(l => l.id === id ? updated : l))
    setFilteredLeads(prev => prev.map(l => l.id === id ? updated : l))
    setSelectedLead(updated)
  }

  const allMarkers = [
    ...filteredLeads.map(l => ({ ...l, source: 'saved' })),
    ...placesResults.map(p => ({ ...p, id: p.place_id, source: 'places' })),
  ]

  return (
    <APIProvider apiKey={GMAPS_KEY}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1f2e' }}>

        {/* Top bar */}
        <div style={{ background: '#252b3b', borderBottom: '0.5px solid rgba(255,255,255,0.08)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ flex: 1, background: '#1a1f2e', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#f8fafc', fontSize: 13, outline: 'none', fontFamily: "'DM Sans',sans-serif" }}
            placeholder="Buscar nicho, bairro ou empresa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchPlaces()}
          />
          <button
            onClick={searchPlaces}
            style={{ background: '#059669', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {searching ? '...' : 'Buscar'}
          </button>
        </div>

        {/* Nicho pills */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', background: '#252b3b', borderBottom: '0.5px solid rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}>
          {['Todos', ...NICHOS].map(n => (
            <button key={n}
              onClick={() => filterByNicho(n)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                border: selectedNicho === n ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.15)',
                background: selectedNicho === n ? 'rgba(5,150,105,0.2)' : 'transparent',
                color: selectedNicho === n ? '#34d399' : '#94a3b8',
              }}
            >{n}</button>
          ))}
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: 280 }}>
          <Map
            defaultCenter={CG_CENTER}
            defaultZoom={13}
            mapId="leadfinder-map"
            style={{ width: '100%', height: '100%' }}
            colorScheme="DARK"
          >
            {allMarkers.map(lead => (
              lead.lat && lead.lng ? (
                <AdvancedMarker
                  key={lead.id || lead.place_id}
                  position={{ lat: lead.lat, lng: lead.lng }}
                  onClick={() => lead.source === 'places' ? savePlaceLead(lead) : setSelectedLead(lead)}
                >
                  <Pin
                    background={STATUS_COLORS[lead.status] || '#059669'}
                    borderColor={lead.source === 'places' ? '#fff' : '#1a1f2e'}
                    glyphColor="#1a1f2e"
                  />
                </AdvancedMarker>
              ) : null
            ))}
          </Map>
        </div>

        {/* Leads cards strip */}
        <div style={{ background: '#252b3b', borderTop: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 4px' }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              {placesResults.length > 0 ? 'Resultados da Busca' : 'Leads Salvos'}
            </span>
            <span style={{ fontSize: 11, color: '#059669', background: 'rgba(5,150,105,0.15)', padding: '2px 8px', borderRadius: 10 }}>
              {placesResults.length > 0 ? placesResults.length : filteredLeads.length} encontrados
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, padding: '4px 12px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {(placesResults.length > 0 ? placesResults : filteredLeads).map(lead => (
              <LeadCard key={lead.id || lead.place_id} lead={lead}
                isNew={!!placesResults.length}
                onClick={() => placesResults.length ? savePlaceLead(lead) : setSelectedLead(lead)}
              />
            ))}
            {(placesResults.length === 0 && filteredLeads.length === 0) && (
              <div style={{ padding: '1rem', color: '#64748b', fontSize: 13 }}>
                Nenhum lead encontrado. Faça uma busca acima! 🔍
              </div>
            )}
          </div>
        </div>

        {/* Lead detail modal */}
        {selectedLead && (
          <LeadDetailModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={handleUpdateLead}
          />
        )}
      </div>
    </APIProvider>
  )
}

function LeadCard({ lead, onClick, isNew }) {
  const EMOJI = { 'Padaria':'🥖','Açougue':'🥩','Mercado':'🛒','Farmácia':'💊','Restaurante':'🍽️','Posto':'⛽','Salão':'💇','Academia':'🏋️','Comércio':'🏪' }
  const statusClass = { 'Novo':'#93c5fd','Contatado':'#fcd34d','Fatura Coletada':'#a78bfa','Fechado':'#34d399','Já Possui Solar':'#94a3b8' }

  return (
    <div onClick={onClick} style={{
      flexShrink: 0, width: 155, background: '#1a1f2e',
      border: isNew ? '0.5px solid rgba(5,150,105,0.5)' : '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
    }}>
      {lead.foto_url
        ? <img src={lead.foto_url} alt={lead.nome_empresa} style={{ width: '100%', height: 70, objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: 70, background: '#2f3749', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            {EMOJI[lead.nicho] || '🏪'}
          </div>
      }
      <div style={{ padding: '7px 9px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{lead.nome_empresa}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5 }}>{lead.nicho || 'Comércio'}</div>
        {isNew
          ? <span style={{ fontSize: 10, color: '#34d399', background: 'rgba(5,150,105,0.2)', padding: '2px 7px', borderRadius: 6 }}>+ Adicionar Lead</span>
          : <span style={{ fontSize: 10, color: statusClass[lead.status] || '#93c5fd', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6 }}>{lead.status}</span>
        }
      </div>
    </div>
  )
}
