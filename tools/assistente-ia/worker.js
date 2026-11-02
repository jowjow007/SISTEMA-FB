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
// ATUALIZAÇÃO out/2026: o Google passou a recusar o token da conta de serviço
// ("Access to Gemini API is restricted with service accounts. Use authorization
// keys instead"). Agora o Worker usa a chave de API (GEMINI_API_KEY) quando ela
// existe; o caminho da conta de serviço abaixo ficou só como reserva.
//
// Variáveis de ambiente esperadas (configuradas no dashboard, não aqui):
//   GEMINI_API_KEY         (Secret, o caminho atual) — chave criada em
//                           aistudio.google.com/apikey ("Criar chave de API").
//   GOOGLE_SA_EMAIL        (Secret, reserva) — "client_email" do JSON
//                           da conta de serviço baixado no Google Cloud.
//   GOOGLE_SA_PRIVATE_KEY  (Secret, reserva) — "private_key" do mesmo
//                           JSON (cole com as quebras de linha, incluindo
//                           "-----BEGIN PRIVATE KEY-----" e "-----END...").
//   GEMINI_MODEL           (Variável normal, opcional) — ex: "gemini-3.5-flash"
//   DAILY_LIMIT            (Variável normal, opcional) — teto de mensagens
//                           por dia para o escritório inteiro (protege
//                           contra gasto inesperado se o faturamento do
//                           Google estiver ativado). Padrão: 200/dia. Com
//                           o modo de raciocínio desligado e o teto de
//                           saída em 2048 tokens, o pior caso teórico de
//                           custo em 200/dia fica em torno de US$ 3-4/dia
//                           mesmo que toda resposta usasse o máximo de
//                           tokens (na prática, bem menos).
//
// Binding necessário (Settings > Bindings, não é uma variável de texto):
//   USAGE_KV               (KV Namespace) — guarda a contagem de
//                           mensagens do dia. Sem esse binding, o Worker
//                           funciona normalmente mas sem limite próprio
//                           (depende só da cota do Google).
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
  });
}

function todayKey() {
  return 'reqs:' + new Date().toISOString().slice(0, 10);
}

async function checkAndIncrementDailyUsage(env) {
  if (!env.USAGE_KV) return true;
  var limit = parseInt(env.DAILY_LIMIT, 10);
  if (!limit || limit <= 0) limit = 200;
  var key = todayKey();
  var current = parseInt((await env.USAGE_KV.get(key)) || '0', 10);
  if (current >= limit) return false;
  await env.USAGE_KV.put(key, String(current + 1), { expirationTtl: 172800 });
  return true;
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

function base64urlToBytes(b64url) {
  var b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Verifica a assinatura e as claims de um idToken do Firebase Auth, usando
// as chaves públicas do Google (JWK). Retorna o uid (claim "sub") se válido.
async function verifyFirebaseIdToken(idToken, projectId) {
  var parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token mal formado.');

  var header = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[0])));
  var payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[1])));
  var signature = base64urlToBytes(parts[2]);
  var signedData = new TextEncoder().encode(parts[0] + '.' + parts[1]);

  var now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error('Token expirado.');
  if (!payload.iat || payload.iat > now + 60) throw new Error('Token com data inválida.');
  if (payload.aud !== projectId) throw new Error('Token de outro projeto.');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('Emissor do token inválido.');
  if (!payload.sub) throw new Error('Token sem uid.');

  var jwkResp = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  var jwkData = await jwkResp.json();
  var jwk = (jwkData.keys || []).find(function (k) { return k.kid === header.kid; });
  if (!jwk) throw new Error('Chave pública do Google não encontrada para este token.');

  var cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  var valido = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, cryptoKey, signature, signedData);
  if (!valido) throw new Error('Assinatura do token inválida.');

  return payload.sub;
}

// Revisão de segurança (01/11/2026, ASVS 4.0.3 V4.1/V13.1): o cabeçalho Origin não autentica ninguém
// (qualquer cliente fora do navegador o forja). Agora o pedido precisa trazer o ID token do Firebase
// do usuário logado; o Worker confere a assinatura e, com o próprio token da pessoa, lê users/{uid}
// no Firestore — as regras só deixam ler o próprio cadastro — e exige equipe ativa (mesma regra do
// isEquipe() do Firestore).
async function exigirEquipe(request, env) {
  const projectId = env.FIREBASE_PROJECT_ID || 'sistema-fb-4cce5';
  const auth = request.headers.get('Authorization') || '';
  const idToken = auth.indexOf('Bearer ') === 0 ? auth.slice(7).trim() : '';
  if (!idToken) throw Object.assign(new Error('Faça login no portal para usar o Assistente.'), { status: 401 });
  let uid;
  try { uid = await verifyFirebaseIdToken(idToken, projectId); }
  catch (e) { throw Object.assign(new Error('Sessão inválida. Recarregue o portal e tente de novo.'), { status: 401 }); }
  const url = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/users/' + encodeURIComponent(uid);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + idToken } });
  if (!r.ok) throw Object.assign(new Error('Acesso não liberado ao Assistente.'), { status: 403 });
  const f = (await r.json()).fields || {};
  const role = f.role && f.role.stringValue;
  // mesmo critério do isEquipe() do Firestore: acesso aprovado pelo admin (acesso == 'ativo') e papel de equipe
  const acesso = f.acesso && f.acesso.stringValue;
  const abas = (f.tabs && f.tabs.arrayValue && f.tabs.arrayValue.values) || [];
  const equipe = ['admin', 'gestor', 'membro'].indexOf(role) !== -1 && acesso === 'ativo' && (role === 'admin' || abas.length > 0);
  if (!equipe) throw Object.assign(new Error('Acesso não liberado ao Assistente.'), { status: 403 });
  return uid;
}

// Feeds que a rota /rss pode buscar (antes buscava qualquer URL: proxy aberto / SSRF).
const RSS_PERMITIDOS = ['www.conjur.com.br', 'res.stj.jus.br', 'www.jota.info', 'condo.news', 'jornaldosindico.com.br'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ error: 'Origem não autorizada.' }, 403, origin);
    }

    // ── Proxy RSS (GET /rss?url=...) ──────────────────────────────────────
    const reqUrl = new URL(request.url);
    if (request.method === 'GET' && reqUrl.pathname === '/rss') {
      const feedUrl = reqUrl.searchParams.get('url');
      if (!feedUrl) return jsonResponse({ error: 'Parâmetro url ausente.' }, 400, origin);
      let alvo;
      try { alvo = new URL(feedUrl); } catch (e) { return jsonResponse({ error: 'URL inválida.' }, 400, origin); }
      if (alvo.protocol !== 'https:' || RSS_PERMITIDOS.indexOf(alvo.hostname) === -1) {
        return jsonResponse({ error: 'Feed não permitido.' }, 403, origin);
      }
      try {
        const resp = await fetch(alvo.toString(), {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortalFB/1.0)' },
          redirect: 'manual'
        });
        const text = await resp.text();
        return new Response(text, {
          status: resp.status,
          headers: Object.assign({ 'Content-Type': 'application/xml; charset=utf-8' }, corsHeaders(origin))
        });
      } catch (e) {
        return jsonResponse({ error: 'Falha ao buscar feed: ' + e.message }, 502, origin);
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Método não suportado.' }, 405, origin);
    }

    try {
      await exigirEquipe(request, env);
    } catch (e) {
      return jsonResponse({ error: e.message }, e.status || 401, origin);
    }

    // Desde out/2026 o Google recusa token de conta de serviço no Gemini ("Access to Gemini
    // API is restricted with service accounts. Use authorization keys instead"): o caminho
    // certo é uma chave de API (Secret GEMINI_API_KEY), enviada no cabeçalho x-goog-api-key.
    // A conta de serviço fica só como alternativa para quem ainda não criou a chave.
    const usaChave = !!env.GEMINI_API_KEY;
    if (!usaChave && (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY)) {
      return jsonResponse({ error: 'Chave do Gemini não configurada no Worker (Secret GEMINI_API_KEY).' }, 500, origin);
    }

    var podeUsar;
    try {
      podeUsar = await checkAndIncrementDailyUsage(env);
    } catch (e) {
      podeUsar = true;
    }
    if (!podeUsar) {
      return jsonResponse({ error: 'O Assistente IA atingiu o limite diário de mensagens do escritório. Tente novamente amanhã.' }, 429, origin);
    }

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return jsonResponse({ error: 'Não foi possível ler o corpo da requisição.' }, 400, origin);
    }

    const authHeaders = { 'Content-Type': 'application/json' };
    if (usaChave) {
      authHeaders['x-goog-api-key'] = env.GEMINI_API_KEY;
    } else {
      try {
        authHeaders['Authorization'] = 'Bearer ' + await getAccessToken(env.GOOGLE_SA_EMAIL, env.GOOGLE_SA_PRIVATE_KEY);
      } catch (e) {
        return jsonResponse({ error: 'Falha na autenticação com o Google: ' + e.message }, 500, origin);
      }
    }

    const model = env.GEMINI_MODEL || 'gemini-3.5-flash';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

    let geminiResp;
    try {
      geminiResp = await fetch(url, {
        method: 'POST',
        headers: authHeaders,
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
