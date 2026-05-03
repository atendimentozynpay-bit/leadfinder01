import { useState, useEffect, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps'
import { fetchLeads, createLead, updateLead, deleteLead } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import LeadDetailModal from '../components/LeadDetailModal'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY
const CG_CENTER = { lat: -20.4697, lng: -54.6201 }
const NICHOS    = ['Padaria','Açougue','Mercado','Farmácia','Restaurante','Posto','Salão','Academia','Loja','Escola']
const STATUS_COLORS = {
  'Novo':'#93c5fd','Contatado':'#fcd34d',
  'Fatura Coletada':'#a78bfa','Fechado':'#34d399','Já Possui Solar':'#94a3b8',
}
const EMOJI = {
  'Padaria':'🥖','Açougue':'🥩','Mercado':'🛒','Farmácia':'💊',
  'Restaurante':'🍽️','Posto':'⛽','Salão':'💇','Academia':'🏋️',
  'Comércio':'🏪','Loja':'🏪','Escola':'🏫',
}

// Detecta se a string contém um CEP (formato 00000-000 ou 00000000)
function extractCEP(text) {
  const match = text.match(/\b(\d{5})-?(\d{3})\b/)
  return match ? `${match[1]}-${match[2]}` : null
}

// Extrai o nicho da query (parte antes do CEP ou bairro)
function extractNicho(text) {
  return text.replace(/\d{5}-?\d{3}/, '').replace(/próximo|perto|no bairro|em/gi, '').trim()
}

// Componente interno que tem acesso ao hook useMap
function MapController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !center) return
    map.panTo(center)
    if (zoom) map.setZoom(zoom)
  }, [map, center, zoom])
  return null
}

export default function MapPage() {
  const { user, isAdmin }   = useAuth()
  const [leads, setLeads]   = useState([])
  const [filteredLeads, setFiltered] = useState([])
  const [selectedNicho, setNicho]    = useState('Todos')
  const [selectedLead, setSelectedLead] = useState(null)
  const [searchQuery, setSearchQuery]   = useState('')
  const [searching, setSearching]       = useState(false)
  const [saving, setSaving]             = useState(null)
  const [placesResults, setPlaces]      = useState([])
  const [mapCenter, setMapCenter]       = useState(null)
  const [mapZoom, setMapZoom]           = useState(null)
  const [searchInfo, setSearchInfo]     = useState('')  // feedback para o usuário

  useEffect(() => { loadLeads() }, [])

  async function loadLeads() {
    try {
      const data = await fetchLeads(user.id, isAdmin)
      setLeads(data)
      setFiltered(data)
    } catch (e) { console.error('loadLeads:', e) }
  }

  // ── Geocodifica CEP e retorna { lat, lng, bairro }
  async function geocodeCEP(cep) {
    try {
      const { Geocoder } = await window.google.maps.importLibrary('geocoding')
      const geocoder = new Geocoder()
      return new Promise((resolve) => {
        geocoder.geocode(
          { address: `${cep}, Campo Grande, MS, Brasil` },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              const loc = results[0].geometry.location
              // Tenta extrair nome do bairro
              const bairroComp = results[0].address_components
                .find(c => c.types.includes('sublocality') || c.types.includes('neighborhood'))
              resolve({
                lat: loc.lat(),
                lng: loc.lng(),
                bairro: bairroComp?.long_name || cep,
              })
            } else {
              resolve(null)
            }
          }
        )
      })
    } catch (e) {
      console.error('Geocode error:', e)
      return null
    }
  }

  // ── Motor de busca principal
  async function runSearch(query) {
    if (!query.trim()) return
    setSearching(true)
    setPlaces([])
    setSearchInfo('')

    try {
      const { Place } = await window.google.maps.importLibrary('places')

      // Detecta se tem CEP na query
      const cep    = extractCEP(query)
      const nicho  = cep ? extractNicho(query) || query : query

      let searchCenter = CG_CENTER
      let searchRadius = 15000
      let infoMsg = ''

      if (cep) {
        // Geocodifica o CEP primeiro
        setSearchInfo(`📍 Localizando CEP ${cep}...`)
        const geo = await geocodeCEP(cep)
        if (geo) {
          searchCenter = { lat: geo.lat, lng: geo.lng }
          searchRadius = 2000   // raio menor: 2km ao redor do CEP
          setMapCenter(searchCenter)
          setMapZoom(15)
          infoMsg = `📍 Buscando ${nicho || 'estabelecimentos'} próximos ao CEP ${cep} (raio 2km)`
        } else {
          infoMsg = `⚠️ CEP ${cep} não encontrado. Buscando em Campo Grande.`
        }
      }

      // Monta a query para o Places
      const textQuery = cep && nicho
        ? `${nicho} próximo ao CEP ${cep} Campo Grande MS`
        : `${query} em Campo Grande MS Brasil`

      const { places } = await Place.searchByText({
        textQuery,
        fields: ['displayName','formattedAddress','location','photos','id','nationalPhoneNumber','types'],
        locationBias: { center: searchCenter, radius: searchRadius },
        language: 'pt-BR',
        maxResultCount: 20,  // aumenta para trazer mais opções
      })

      const results = places.map(p => ({
        place_id:     p.id,
        nome_empresa: p.displayName,
        endereco:     p.formattedAddress,
        telefone:     p.nationalPhoneNumber || '',
        lat:          p.location?.lat(),
        lng:          p.location?.lng(),
        foto_url:     p.photos?.[0]?.getURI({ maxWidth: 400 }) || null,
        nicho:        inferNicho(p.types, query),
        status:       'Novo',
      }))

      setPlaces(results)
      setSearchInfo(infoMsg || `🔍 ${results.length} resultados para "${query}"`)

    } catch (e) {
      console.error('Places error:', e)
      const q = query.toLowerCase()
      setFiltered(leads.filter(l =>
        l.nome_empresa?.toLowerCase().includes(q) ||
        l.nicho?.toLowerCase().includes(q) ||
        l.bairro?.toLowerCase().includes(q)
      ))
      setSearchInfo('⚠️ Busca Places indisponível. Mostrando leads salvos.')
    }
    setSearching(false)
  }

  function handleNicho(nicho) {
    setNicho(nicho)
    if (nicho === 'Todos') {
      setPlaces([])
      setFiltered(leads)
      setSearchQuery('')
      setSearchInfo('')
      setMapCenter(null)
    } else {
      setSearchQuery(nicho)
      runSearch(nicho)
    }
  }

  function inferNicho(types, query) {
    const q = query.toLowerCase()
    if (q.includes('padaria')    || types?.includes('bakery'))      return 'Padaria'
    if (q.includes('açougue')    || q.includes('acougue'))          return 'Açougue'
    if (q.includes('mercado')    || q.includes('supermercado'))     return 'Mercado'
    if (q.includes('farmácia')   || types?.includes('pharmacy'))    return 'Farmácia'
    if (q.includes('restaurante')|| types?.includes('restaurant'))  return 'Restaurante'
    if (q.includes('posto')      || types?.includes('gas_station')) return 'Posto'
    if (q.includes('escola')     || types?.includes('school'))      return 'Escola'
    if (q.includes('salão')      || types?.includes('beauty_salon'))return 'Salão'
    if (q.includes('academia')   || types?.includes('gym'))         return 'Academia'
    return 'Comércio'
  }

  async function savePlaceLead(place) {
    if (saving === place.place_id) return
    setSaving(place.place_id)
    try {
      const lead = await createLead({
        nome_empresa:    place.nome_empresa,
        endereco:        place.endereco,
        telefone:        place.telefone,
        lat:             place.lat,
        lng:             place.lng,
        foto_url:        place.foto_url,
        nicho:           place.nicho,
        status:          'Novo',
        user_id:         user.id,
        google_place_id: place.place_id,
      })
      setLeads(prev => [lead, ...prev])
      setFiltered(prev => [lead, ...prev])
      setPlaces(prev => prev.filter(p => p.place_id !== place.place_id))
      setSelectedLead(lead)
    } catch (e) {
      console.error('savePlaceLead:', e)
      alert('Erro ao salvar: ' + (e.message || 'verifique o console'))
    }
    setSaving(null)
  }

  async function handleUpdateLead(id, updates) {
    try {
      const updated = await updateLead(id, updates)
      setLeads(prev => prev.map(l => l.id === id ? updated : l))
      setFiltered(prev => prev.map(l => l.id === id ? updated : l))
      setSelectedLead(updated)
    } catch (e) { console.error('updateLead:', e) }
  }

  async function handleDeleteLead(id) {
    await deleteLead(id)
    setLeads(prev => prev.filter(l => l.id !== id))
    setFiltered(prev => prev.filter(l => l.id !== id))
    setSelectedLead(null)
  }

  const displayList = placesResults.length > 0 ? placesResults : filteredLeads

  return (
    <APIProvider apiKey={GMAPS_KEY}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#1a1f2e' }}>

        {/* Top bar */}
        <div style={{ background:'#252b3b', borderBottom:'0.5px solid rgba(255,255,255,0.08)', padding:'10px 14px', display:'flex', gap:8, alignItems:'center' }}>
          <input
            style={{ flex:1, background:'#1a1f2e', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'8px 12px', color:'#f8fafc', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif" }}
            placeholder="Ex: Padaria 79002-000 ou Mercado Tiradentes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch(searchQuery)}
          />
          <button
            onClick={() => runSearch(searchQuery)}
            style={{ background:'#059669', border:'none', borderRadius:8, padding:'8px 16px', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', opacity: searching ? 0.7 : 1 }}
          >
            {searching ? '...' : 'Buscar'}
          </button>
        </div>

        {/* Feedback de busca */}
        {searchInfo && (
          <div style={{ background:'#1a1f2e', borderBottom:'0.5px solid rgba(255,255,255,0.06)', padding:'5px 14px', fontSize:11, color:'#64748b' }}>
            {searchInfo}
          </div>
        )}

        {/* Pills de nicho */}
        <div style={{ display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', background:'#252b3b', borderBottom:'0.5px solid rgba(255,255,255,0.06)', scrollbarWidth:'none' }}>
          {['Todos', ...NICHOS].map(n => (
            <button key={n} type="button" onClick={() => handleNicho(n)} style={{
              padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:500,
              cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
              border: selectedNicho===n ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.15)',
              background: selectedNicho===n ? 'rgba(5,150,105,0.2)' : 'transparent',
              color: selectedNicho===n ? '#34d399' : '#94a3b8',
            }}>{n}</button>
          ))}
        </div>

        {/* Mapa */}
        <div style={{ flex:1, minHeight:240 }}>
          <Map
            defaultCenter={CG_CENTER}
            defaultZoom={13}
            mapId="leadfinder-map"
            style={{ width:'100%', height:'100%' }}
            colorScheme="DARK"
          >
            <MapController center={mapCenter} zoom={mapZoom} />

            {[
              ...filteredLeads.map(l => ({ ...l, _source:'saved' })),
              ...placesResults.map(p => ({ ...p, id: p.place_id, _source:'places' })),
            ].filter(l => l.lat && l.lng).map(lead => (
              <AdvancedMarker
                key={lead.id || lead.place_id}
                position={{ lat: lead.lat, lng: lead.lng }}
                onClick={() => lead._source === 'places' ? savePlaceLead(lead) : setSelectedLead(lead)}
              >
                <Pin
                  background={STATUS_COLORS[lead.status] || '#059669'}
                  borderColor={lead._source === 'places' ? '#ffffff' : '#1a1f2e'}
                  glyphColor="#1a1f2e"
                />
              </AdvancedMarker>
            ))}
          </Map>
        </div>

        {/* Cards */}
        <div style={{ background:'#252b3b', borderTop:'0.5px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px 4px' }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:'#f8fafc' }}>
              {placesResults.length > 0 ? 'Resultados da Busca' : 'Leads Salvos'}
            </span>
            <span style={{ fontSize:11, color:'#059669', background:'rgba(5,150,105,0.15)', padding:'2px 8px', borderRadius:10 }}>
              {displayList.length} encontrados
            </span>
          </div>
          <div style={{ display:'flex', gap:10, padding:'4px 12px 14px', overflowX:'auto', scrollbarWidth:'none' }}>
            {searching && <div style={{ padding:'12px 0', color:'#34d399', fontSize:13 }}>⏳ Buscando...</div>}
            {!searching && displayList.length === 0 && (
              <div style={{ padding:'12px 0', color:'#64748b', fontSize:13 }}>
                Faça uma busca ou selecione um nicho 🔍
              </div>
            )}
            {!searching && displayList.map(lead => (
              <LeadCard
                key={lead.id || lead.place_id}
                lead={lead}
                isNew={placesResults.length > 0}
                isSaving={saving === lead.place_id}
                onClick={() => placesResults.length > 0 ? savePlaceLead(lead) : setSelectedLead(lead)}
              />
            ))}
          </div>
        </div>

        {selectedLead && (
          <LeadDetailModal
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={handleUpdateLead}
            onDelete={handleDeleteLead}
          />
        )}
      </div>
    </APIProvider>
  )
}

function LeadCard({ lead, onClick, isNew, isSaving }) {
  const statusColor = {
    'Novo':'#93c5fd','Contatado':'#fcd34d',
    'Fatura Coletada':'#a78bfa','Fechado':'#34d399','Já Possui Solar':'#94a3b8',
  }
  return (
    <div onClick={onClick} style={{
      flexShrink:0, width:155, background:'#1a1f2e',
      border: isNew ? '0.5px solid rgba(5,150,105,0.5)' : '0.5px solid rgba(255,255,255,0.1)',
      borderRadius:12, overflow:'hidden',
      cursor: isSaving ? 'wait' : 'pointer',
      opacity: isSaving ? 0.6 : 1, transition:'opacity 0.2s',
    }}>
      {lead.foto_url
        ? <img src={lead.foto_url} alt={lead.nome_empresa} style={{ width:'100%', height:70, objectFit:'cover', display:'block' }} />
        : <div style={{ width:'100%', height:70, background:'#2f3749', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>
            {EMOJI[lead.nicho] || '🏪'}
          </div>
      }
      <div style={{ padding:'7px 9px' }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#f8fafc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>
          {lead.nome_empresa}
        </div>
        <div style={{ fontSize:10, color:'#94a3b8', marginBottom:5 }}>{lead.nicho || 'Comércio'}</div>
        {isNew
          ? <span style={{ fontSize:10, color: isSaving ? '#fcd34d' : '#34d399', background:'rgba(5,150,105,0.15)', padding:'2px 7px', borderRadius:6 }}>
              {isSaving ? '⏳ Salvando...' : '+ Adicionar Lead'}
            </span>
          : <span style={{ fontSize:10, color: statusColor[lead.status]||'#93c5fd', background:'rgba(255,255,255,0.06)', padding:'2px 7px', borderRadius:6 }}>
              {lead.status}
            </span>
        }
      </div>
    </div>
  )
}
