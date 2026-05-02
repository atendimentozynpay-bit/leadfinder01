import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Auth helpers
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getUser = () => supabase.auth.getUser()

// ── Leads
export const fetchLeads = async (userId, isAdmin) => {
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })
  if (!isAdmin) query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const createLead = async (lead) => {
  const { data, error } = await supabase.from('leads').insert([lead]).select().single()
  if (error) throw error
  return data
}

export const updateLead = async (id, updates) => {
  const { data, error } = await supabase
    .from('leads').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export const deleteLead = async (id) => {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ── Proposals
export const createProposal = async (proposal) => {
  const { data, error } = await supabase.from('proposals').insert([proposal]).select().single()
  if (error) throw error
  return data
}

export const fetchProposals = async (userId) => {
  const { data, error } = await supabase
    .from('proposals').select('*, leads(nome_empresa)')
    .eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Commissions
export const fetchCommissions = async (userId) => {
  const { data, error } = await supabase
    .from('commissions').select('*, leads(nome_empresa)')
    .eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Checkins
export const createCheckin = async (checkin) => {
  const { data, error } = await supabase.from('checkins').insert([checkin]).select().single()
  if (error) throw error
  return data
}

// ── Dashboard stats (admin)
export const fetchDashboardStats = async () => {
  const [leads, proposals, commissions] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase.from('proposals').select('valor_fatura_original, economia_prevista, produto_ofertado'),
    supabase.from('commissions').select('valor_comissao, status_pagamento'),
  ])
  return {
    leads: leads.data || [],
    proposals: proposals.data || [],
    commissions: commissions.data || [],
  }
}
