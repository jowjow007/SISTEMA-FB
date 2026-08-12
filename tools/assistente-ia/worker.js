// ============================================================
// CLOUDFLARE WORKER — proxy do Assistente IA (Gemini)
// ============================================================
// Este código NÃO roda no navegador nem faz parte do site publicado no
// GitHub Pages — ele é colado direto no editor do Cloudflare Workers
// (dashboard.cloudflare.com), que é quem executa. É o único lugar onde a
// chave de API do Gemini existe de verdade, guardada como uma "Secret"
// (variável de ambiente criptografada, nunca aparece em texto depois de
// salva). O navegador de cada pessoa só fala com a URL pública deste
// Worker — nunca vê a chave real.
//
// Variáveis de ambiente esperadas (configuradas no dashboard, não aqui):
//   GEMINI_API_KEY  (Secret, obrigatória)  — a chave criada no AI Studio
//   GEMINI_MODEL    (Variável normal, opcional) — ex: "gemini-2.5-flash"
//
// Passo a passo completo no README-SETUP.md, seção 9.
// ============================================================

const ALLOWED_ORIGINS = [
  'https://portal.fonsecaebraga.com.br',
  'https://jowjow007.github.io'
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ error: 'Origem não autorizada.' }, 403, origin);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Método não suportado.' }, 405, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: 'GEMINI_API_KEY não configurada no Worker.' }, 500, origin);
    }

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return jsonResponse({ error: 'Não foi possível ler o corpo da requisição.' }, 400, origin);
    }

    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model +
      ':generateContent?key=' + env.GEMINI_API_KEY;

    let geminiResp;
    try {
      geminiResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
    } catch (e) {
      return jsonResponse({ error: 'Falha ao contatar o Gemini.' }, 502, origin);
    }

    const data = await geminiResp.text();
    return new Response(data, {
      status: geminiResp.status,
      headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
    });
  }
};
