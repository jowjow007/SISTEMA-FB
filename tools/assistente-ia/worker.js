// ============================================================
// CLOUDFLARE WORKER — proxy do Assistente IA (Gemini)
// ============================================================
// Este código NÃO roda no navegador nem faz parte do site publicado no
// GitHub Pages — ele é colado direto no editor do Cloudflare Workers
// (dashboard.cloudflare.com), que é quem executa. É o único lugar onde as
// credenciais do Gemini existem de verdade, guardadas como "Secrets"
// (variáveis de ambiente criptografadas, nunca aparecem em texto depois
// de salvas). O navegador de cada pessoa só fala com a URL pública deste
// Worker — nunca vê as credenciais reais.
//
// Por quê OAuth2 e não uma chave simples "?key=...": desde meados de 2026
// o Google passou a exigir que toda chave nova do Gemini/AI Studio venha
// "vinculada a uma conta de serviço" — e esse tipo de chave só é aceito
// com um token OAuth2 de verdade, não mais com o parâmetro "?key=" simples
// (isso foi confirmado testando: a API respondeu 401 "Expected OAuth 2
// access token"). Por isso o Worker assina um JWT com a chave privada da
// conta de serviço e troca por um token de acesso a cada requisição, em
// vez de só colar uma chave na URL.
//
// Variáveis de ambiente esperadas (configuradas no dashboard, não aqui):
//   GOOGLE_SA_EMAIL        (Secret, obrigatória) — "client_email" do JSON
//                           da conta de serviço baixado no Google Cloud.
//   GOOGLE_SA_PRIVATE_KEY  (Secret, obrigatória) — "private_key" do mesmo
//                           JSON (cole com as quebras de linha, incluindo
//                           "-----BEGIN PRIVATE KEY-----" e "-----END...").
//   GEMINI_MODEL           (Variável normal, opcional) — ex: "gemini-3.5-flash"
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

function base64url(bytes) {
  var bin = '';
  var arr = new Uint8Array(bytes);
  for (var i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function importPrivateKey(pem) {
  var contents = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  var bin = atob(contents);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function getAccessToken(clientEmail, privateKeyPem) {
  var enc = new TextEncoder();
  var now = Math.floor(Date.now() / 1000);
  var header = { alg: 'RS256', typ: 'JWT' };
  var claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/generative-language',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  var unsigned = base64url(enc.encode(JSON.stringify(header))) + '.' + base64url(enc.encode(JSON.stringify(claimSet)));
  var key = await importPrivateKey(privateKeyPem);
  var signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, enc.encode(unsigned));
  var jwt = unsigned + '.' + base64url(signature);

  var resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt)
  });
  var data = await resp.json();
  if (!resp.ok) throw new Error(data.error_description || data.error || 'Falha ao obter token OAuth2 do Google.');
  return data.access_token;
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

    if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY) {
      return jsonResponse({ error: 'Credenciais da conta de serviço não configuradas no Worker.' }, 500, origin);
    }

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return jsonResponse({ error: 'Não foi possível ler o corpo da requisição.' }, 400, origin);
    }

    let accessToken;
    try {
      accessToken = await getAccessToken(env.GOOGLE_SA_EMAIL, env.GOOGLE_SA_PRIVATE_KEY);
    } catch (e) {
      return jsonResponse({ error: 'Falha na autenticação com o Google: ' + e.message }, 500, origin);
    }

    const model = env.GEMINI_MODEL || 'gemini-3.5-flash';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

    let geminiResp;
    try {
      geminiResp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
        },
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
