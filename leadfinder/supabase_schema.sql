-- ═══════════════════════════════════════════════
--  LeadFinder Energia — Supabase SQL Schema
--  Cole isso no SQL Editor do seu projeto Supabase
-- ═══════════════════════════════════════════════

-- USERS (perfis complementam auth.users do Supabase)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  email text not null,
  cargo text check (cargo in ('admin','vendedor')) default 'vendedor',
  meta_diaria int default 10,
  saldo_comissao numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- LEADS
create table public.leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  nome_empresa text not null,
  endereco text,
  bairro text,
  telefone text,
  nicho text,
  lat numeric,
  lng numeric,
  status text check (status in (
    'Novo','Contatado','Fatura Coletada','Fechado','Já Possui Solar'
  )) default 'Novo',
  fatura_media numeric(10,2),
  google_place_id text,
  foto_url text,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROPOSALS
create table public.proposals (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  user_id uuid references public.users(id),
  valor_fatura_original numeric(10,2),
  economia_prevista numeric(10,2),
  produto_ofertado text check (produto_ofertado in (
    'Pré-pago','Otimizador','Solar','Portabilidade','Combo'
  )),
  valor_equipamento numeric(10,2),
  parcelas int,
  status text check (status in ('Rascunho','Enviada','Aceita','Recusada')) default 'Rascunho',
  created_at timestamptz default now()
);

-- COMMISSIONS
create table public.commissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  lead_id uuid references public.leads(id),
  proposal_id uuid references public.proposals(id),
  valor_total numeric(10,2),
  percentual_repasse numeric(5,2),
  valor_comissao numeric(10,2),
  status_pagamento text check (status_pagamento in (
    'Pendente','Aguardando 45d','Pago'
  )) default 'Pendente',
  data_prevista date,
  data_pagamento date,
  created_at timestamptz default now()
);

-- CHECKINS (porta a porta)
create table public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id),
  lead_id uuid references public.leads(id),
  lat numeric,
  lng numeric,
  notas text,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) — cada vendedor vê só os próprios leads
alter table public.leads enable row level security;
alter table public.proposals enable row level security;
alter table public.commissions enable row level security;
alter table public.checkins enable row level security;

-- Políticas básicas
create policy "Vendedor vê próprios leads" on public.leads
  for all using (auth.uid() = user_id);

create policy "Admin vê todos os leads" on public.leads
  for all using (
    exists (select 1 from public.users where id = auth.uid() and cargo = 'admin')
  );

create policy "Vendedor vê próprias propostas" on public.proposals
  for all using (auth.uid() = user_id);

create policy "Vendedor vê próprias comissões" on public.commissions
  for all using (auth.uid() = user_id);

create policy "Vendedor vê próprios checkins" on public.checkins
  for all using (auth.uid() = user_id);

-- Seed de exemplo (opcional)
-- insert into public.leads (nome_empresa, nicho, bairro, status, fatura_media)
-- values ('Padaria São Paulo', 'Padaria', 'Centro', 'Novo', 1800);
