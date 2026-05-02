// ═══════════════════════════════════════════════════════════
//  LeadFinder AI Services — v2
//
//  TEXTO:  Qwen3.5-122b via NVIDIA NIM (gratuito)
//          → pitch de vendas, objeções, análise de lead
//
//  IMAGEM: Stable Diffusion XL via Hugging Face (gratuito)
//          → estabelecimento com painéis solares
//
//  .env necessário:
//    VITE_NVIDIA_API_KEY=nvapi-xxxx
//    VITE_HF_TOKEN=hf_xxxx   (huggingface.co/settings/tokens)
// ═══════════════════════════════════════════════════════════

const NVIDIA_KEY  = import.meta.env.VITE_NVIDIA_API_KEY
const HF_TOKEN    = import.meta.env.VITE_HF_TOKEN
const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1'
const QWEN_MODEL  = 'qwen/qwen3.5-122b-a10b'

// ─────────────────────────────────────────────
//  HELPER: chama Qwen3.5 (streaming SSE)
//  Remove bloco <think>...</think> do output
// ─────────────────────────────────────────────
async function callQwen(systemPrompt, userPrompt, { maxTokens = 1024, thinking = false } = {}) {
  const response = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      max_tokens: maxTokens,
      temperature: 0.70,
      top_p: 0.95,
      stream: true,
      chat_template_kwargs: { enable_thinking: thinking },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`NVIDIA API erro ${response.status}: ${err}`)
  }

  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const json  = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) fullText += delta
      } catch { /* linha SSE incompleta */ }
    }
  }

  // Remove raciocínio interno do Qwen
  return fullText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

// ─────────────────────────────────────────────
//  1. PITCH WHATSAPP  (Qwen3.5 — sem thinking)
// ─────────────────────────────────────────────
export async function gerarPitchWhatsApp({ nomeEmpresa, nicho, fatura, novaFatura, economia, produto, vendedor }) {
  const system = `Você é especialista em vendas de energia elétrica no Brasil, 
da Habil Soluções Energéticas, Campo Grande MS.
Escreva mensagens de WhatsApp curtas e persuasivas em português brasileiro informal.
Nunca use linguagem corporativa genérica. Seja como um amigo que descobriu algo bom.`

  const user = `Crie um pitch de WhatsApp para este prospect:
- Empresa: ${nomeEmpresa} (${nicho})
- Fatura atual: R$ ${Math.round(fatura).toLocaleString('pt-BR')}
- Nova fatura estimada: R$ ${Math.round(novaFatura).toLocaleString('pt-BR')}
- Economia mensal: R$ ${Math.round(economia).toLocaleString('pt-BR')}
- Produto: ${produto}
- Vendedor: ${vendedor}

Regras rígidas:
- Máximo 5 linhas no total
- Mencione o nome da empresa e a economia em reais
- No máximo 3 emojis
- Termine com convite para visita rápida, sem pressão
- Tom: amigável, confiante, pessoal — não genérico`

  return callQwen(system, user, { maxTokens: 300 })
}

// ─────────────────────────────────────────────
//  2. RESPOSTA A OBJEÇÕES  (Qwen3.5 + thinking)
// ─────────────────────────────────────────────
export async function gerarRespostaObjecao({ objecao, nomeEmpresa, produto, economia }) {
  const system = `Você é vendedor experiente em energia solar e pré-paga no Brasil.
Conhece as objeções mais comuns e as contorna com empatia e dados reais.
Responda em português brasileiro informal. Máximo 4 linhas.`

  const user = `O cliente "${nomeEmpresa}" disse: "${objecao}"
Produto: ${produto} | Economia estimada: R$ ${Math.round(economia)}/mês

Resposta de contorno:
1. Valide o sentimento (1 frase curta)
2. Reposicione com dado de economia
3. Proponha próximo passo simples`

  return callQwen(system, user, { maxTokens: 250, thinking: true })
}

// ─────────────────────────────────────────────
//  3. ANÁLISE DE POTENCIAL DO LEAD  (JSON puro)
// ─────────────────────────────────────────────
export async function analisarPotencialLead({ nomeEmpresa, nicho, fatura, bairro }) {
  const system = `Analista de potencial de vendas de energia para comércios brasileiros.
Responda APENAS com JSON puro, sem markdown, sem texto extra.`

  const user = `Analise: Empresa=${nomeEmpresa} | Nicho=${nicho} | Bairro=${bairro} | Fatura=R$${fatura}

JSON esperado (exatamente este formato):
{"score":0,"classificacao":"","motivo":"","melhor_produto":"","melhor_horario":"","dica_abordagem":""}`

  const raw = await callQwen(system, user, { maxTokens: 300 })
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return {
      score: 70, classificacao: 'Quente',
      motivo: 'Fatura elevada para o nicho',
      melhor_produto: 'Pré-pago', melhor_horario: 'manhã',
      dica_abordagem: 'Mencione a economia logo no início',
    }
  }
}

// ─────────────────────────────────────────────
//  4. IMAGEM SOLAR  (Hugging Face — SDXL-Turbo)
//     Gratuito via hf_token
// ─────────────────────────────────────────────
export async function gerarImagemSolar({ nicho = 'commercial business' }) {
  if (!HF_TOKEN) throw new Error('Configure VITE_HF_TOKEN no .env (huggingface.co/settings/tokens)')

  const prompt = `Commercial rooftop solar panel installation on a ${nicho} in Brazil, 
modern monocrystalline solar panels, sunny day blue sky, 
photorealistic architectural render, professional green energy, 
high quality 4k, clean modern look`

  // Tenta SDXL-Turbo → FLUX.1-schnell como fallback
  const models = ['stabilityai/sdxl-turbo', 'black-forest-labs/FLUX.1-schnell']

  for (const model of models) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: 'blurry, cartoon, low quality, text, people',
            num_inference_steps: 4,
            guidance_scale: 0.0,
            width: 768,
            height: 512,
          },
        }),
      })

      if (res.status === 503) continue   // modelo carregando, tenta próximo
      if (!res.ok) throw new Error(await res.text())

      const blob = await res.blob()
      return URL.createObjectURL(blob)
    } catch (e) {
      if (model === models[models.length - 1]) throw e
    }
  }
}

// ─────────────────────────────────────────────
//  5. CALCULADORA FINANCEIRA  (sem API)
// ─────────────────────────────────────────────
export function calcularEconomia({ fatura, produto }) {
  const tarifaAtual    = 1.08
  const tarifaPrePago  = 0.60
  const kwhMensal      = fatura / tarifaAtual
  const precoOtimizador = 15000
  const parcelasOtimizador = 21

  let novaFatura = fatura, parcela = 0, detalhes = {}

  if (produto === 'Pré-pago') {
    novaFatura = kwhMensal * tarifaPrePago
    detalhes   = { kwhMensal: Math.round(kwhMensal), tarifaNova: tarifaPrePago }

  } else if (produto === 'Otimizador') {
    const kwhReduzido = kwhMensal * 0.60
    novaFatura = kwhReduzido * tarifaAtual
    parcela    = precoOtimizador / parcelasOtimizador
    detalhes   = { kwhReduzido: Math.round(kwhReduzido), reducao: '40%' }

  } else if (produto === 'Combo') {
    const kwhReduzido = kwhMensal * 0.60
    novaFatura = kwhReduzido * tarifaPrePago
    parcela    = precoOtimizador / parcelasOtimizador
    detalhes   = { kwhReduzido: Math.round(kwhReduzido), tarifaNova: tarifaPrePago }

  } else if (produto === 'Solar') {
    novaFatura = fatura * 0.10
    detalhes   = { cobertura: '90%' }

  } else if (produto === 'Portabilidade') {
    novaFatura = fatura * 0.85
    detalhes   = { kwhMensal: Math.round(kwhMensal) }
  }

  const economia = fatura - novaFatura

  // Comissões Habil
  let comissaoVendedor = 0
  const prazo45d = produto === 'Portabilidade'
  if      (produto === 'Pré-pago')      comissaoVendedor = economia * 0.40
  else if (produto === 'Portabilidade') comissaoVendedor = kwhMensal * 0.60
  else if (produto === 'Otimizador')    comissaoVendedor = economia * 0.30
  else if (produto === 'Combo')         comissaoVendedor = economia * 0.35
  else if (produto === 'Solar')         comissaoVendedor = fatura   * 0.50

  return {
    fatura:           Math.round(fatura),
    novaFatura:       Math.round(novaFatura),
    economia:         Math.round(economia),
    economiaAnual:    Math.round(economia * 12),
    parcela:          Math.round(parcela),
    comissaoVendedor: Math.round(comissaoVendedor),
    pctEconomia:      Math.round((economia / fatura) * 100),
    prazo45d,
    detalhes,
  }
}
