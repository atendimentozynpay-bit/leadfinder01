# ⚡ LeadFinder Energia — Setup Guide

## Stack
- **Frontend:** React + Vite
- **Banco de Dados:** Supabase (PostgreSQL + Auth)
- **Mapa:** Google Maps Platform (Maps JS + Places API)
- **IA Pitch:** Anthropic Claude API
- **IA Imagem:** OpenAI DALL-E 3 (opcional)
- **Deploy:** Vercel ou Netlify (gratuito)

---

## Passo 1 — Supabase (banco de dados)

1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Anote a **URL** e a **anon key** em Settings → API
3. Vá em **SQL Editor** → cole todo o conteúdo de `supabase_schema.sql`
4. Execute → as tabelas e políticas serão criadas

---

## Passo 2 — Google Maps

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto → **APIs e Serviços** → Ativar:
   - Maps JavaScript API
   - Places API (New)
3. **Credenciais** → Criar chave de API → copie a chave
4. *(Opcional)* Restrinja a chave ao seu domínio após o deploy

---

## Passo 3 — Claude API (pitch de vendas)

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → Create Key → copie
3. Essa chave gera os pitchs personalizados por WhatsApp

---

## Passo 4 — OpenAI DALL-E (opcional)

1. Acesse [platform.openai.com](https://platform.openai.com)
2. **API Keys** → Create Key → copie
3. Usado apenas para gerar imagens do estabelecimento com painéis solares

---

## Passo 5 — Variáveis de ambiente

Renomeie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_GOOGLE_MAPS_KEY=sua-google-maps-key
VITE_ANTHROPIC_KEY=sk-ant-sua-chave
VITE_OPENAI_KEY=sk-sua-chave-openai  # opcional
```

---

## Passo 6 — Rodar localmente

```bash
npm install
npm run dev
# Abrir: http://localhost:3000
```

---

## Passo 7 — Deploy no Vercel (link para o celular)

### Opção A — GitHub + Vercel (recomendado)
1. Suba o projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project** → importe o repo
3. Em **Environment Variables**, adicione as 4 variáveis do `.env`
4. **Deploy** → em 2 minutos você recebe um link público tipo:
   `https://leadfinder-energia.vercel.app`
5. Abra no celular e clique em **"Adicionar à Tela Inicial"** (PWA)

### Opção B — Bolt.new
1. Acesse [bolt.new](https://bolt.new)
2. Arraste os arquivos do projeto
3. Configure as env vars no painel
4. Deploy em 1 clique

---

## Criar usuário admin (Vander)

Após o deploy, no Supabase:
1. **Authentication** → **Users** → **Add User**
2. Email: `vander@habilenergia.com.br` | Senha: sua escolha
3. No **SQL Editor**:
```sql
INSERT INTO public.users (id, nome, email, cargo, meta_diaria)
VALUES (
  '<cole-o-uuid-do-usuario-criado>',
  'Vander Habil',
  'vander@habilenergia.com.br',
  'admin',
  10
);
```

---

## Regras de negócio implementadas

| Regra | Onde |
|-------|------|
| Lead "Já Possui Solar" → oculta venda, mostra Manutenção/Ampliação | `LeadDetailModal.jsx` |
| Pré-pago: R$1,08 → R$0,60/kWh | `ai.js → calcularEconomia()` |
| Otimizador: 40% redução + 21x R$15.000 | `ai.js → calcularEconomia()` |
| Comissão Pré-pago: 40% da economia | `ai.js → calcularEconomia()` |
| Comissão Portabilidade: 60% do kWh | `ai.js → calcularEconomia()` |
| RLS Supabase: vendedor vê só próprios leads | `supabase_schema.sql` |
| Admin vê todos os leads | `supabase_schema.sql` |
