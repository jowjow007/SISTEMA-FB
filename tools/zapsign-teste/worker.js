// ============================================================
// CLOUDFLARE WORKER — ponte entre o Portal e a API do ZapSign (TESTE)
// ============================================================
// Este código NÃO roda no navegador nem faz parte do site do GitHub Pages.
// Ele é colado no editor do Cloudflare Workers (dashboard.cloudflare.com),
// num Worker novo chamado "portal-fb-zapsign". É o único lugar onde o token
// da API do ZapSign existe, guardado como Secret. O navegador só fala com
// este Worker e nunca vê o token.
//
// Quem pode usar: só ADMIN do portal com acesso ativo (confere o ID token do
// Firebase e lê users/{uid} com o próprio token da pessoa).
//
// Variáveis (Settings > Variables and Secrets):
//   ZAPSIGN_API_TOKEN   (Secret, obrigatório) — token de Configurações >
//                        Integrações > API ZapSign.
//   ZAPSIGN_API_BASE    (texto, opcional) — padrão https://api.zapsign.com.br
//                        (troque pelo endereço do sandbox se for testar lá).
//   FIREBASE_PROJECT_ID (texto, opcional) — padrão sistema-fb-4cce5.
//
// Rotas (todas exigem "Authorization: Bearer <ID token do Firebase>"):
//   GET  /plano               -> dados do plano (não gasta franquia)
//   GET  /docs?page=N&todos=1 -> lista (padrão: só a pasta do portal)
//   GET  /doc/{token}         -> detalhe de um documento
//   POST /criar               -> cria documento (GASTA 1 da franquia)
//   POST /excluir/{token}     -> exclui (só documentos da pasta do portal)
// ============================================================

const ALLOWED_ORIGINS = [
  'https://portal.fonsecaebraga.com.br',
  'https://jowjow007.github.io'
];

// Tudo o que o portal cria vai para esta pasta no ZapSign. A exclusão só vale
// para documentos daqui, para nunca apagar os documentos reais da conta.
const PASTA_PORTAL = '/Portal FB - teste/';
const LIMITE_PDF_BYTES = 10 * 1024 * 1024;
const MAX_SIGNATARIOS = 10;
const AUTH_MODES = ['assinaturaTela', 'tokenEmail', 'assinaturaTela-tokenEmail', 'tokenSms', 'assinaturaTela-tokenSms', 'tokenWhatsapp', 'assinaturaTela-tokenWhatsapp'];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(origin))
  });
}

function erro(msg, status) { return Object.assign(new Error(msg), { status: status || 400 }); }

function base64urlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Mesma verificação do Worker do Assistente IA.
async function verifyFirebaseIdToken(idToken, projectId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token mal formado.');
  const header = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(parts[1])));
  const signature = base64urlToBytes(parts[2]);
  const signedData = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error('Token expirado.');
  if (!payload.iat || payload.iat > now + 60) throw new Error('Token com data inválida.');
  if (payload.aud !== projectId) throw new Error('Token de outro projeto.');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('Emissor inválido.');
  if (!payload.sub) throw new Error('Token sem uid.');
  const jwkResp = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  const jwk = ((await jwkResp.json()).keys || []).find(function (k) { return k.kid === header.kid; });
  if (!jwk) throw new Error('Chave pública não encontrada.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, signature, signedData))) throw new Error('Assinatura inválida.');
  return payload.sub;
}

async function exigirAdmin(request, env) {
  const projectId = env.FIREBASE_PROJECT_ID || 'sistema-fb-4cce5';
  const auth = request.headers.get('Authorization') || '';
  const idToken = auth.indexOf('Bearer ') === 0 ? auth.slice(7).trim() : '';
  if (!idToken) throw erro('Faça login no portal.', 401);
  let uid;
  try { uid = await verifyFirebaseIdToken(idToken, projectId); }
  catch (e) { throw erro('Sessão inválida. Recarregue o portal e tente de novo.', 401); }
  const url = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/users/' + encodeURIComponent(uid);
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + idToken } });
  if (!r.ok) throw erro('Acesso não liberado.', 403);
  const f = (await r.json()).fields || {};
  const role = f.role && f.role.stringValue;
  const acesso = f.acesso && f.acesso.stringValue;
  if (role !== 'admin' || acesso !== 'ativo') throw erro('Esta aba de teste é só para o administrador.', 403);
  return uid;
}

async function zap(env, method, path, body) {
  const base = (env.ZAPSIGN_API_BASE || 'https://api.zapsign.com.br').replace(/\/+$/, '');
  const opts = { method: method, headers: { Authorization: 'Bearer ' + env.ZAPSIGN_API_TOKEN } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(base + path, opts);
  const txt = await r.text();
  let data;
  try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = { bruto: txt.slice(0, 2000) }; }
  return { status: r.status, ok: r.ok, data: data };
}

function tokenValido(t) { return /^[A-Za-z0-9-]{8,80}$/.test(t || ''); }

function limparTexto(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }

// Monta o corpo do ZapSign só com campos conhecidos. O navegador não escolhe
// pasta, marca, observadores etc.: a pasta é sempre a do portal.
function montarDocumento(entrada) {
  const nome = limparTexto(entrada.nome, 200);
  if (!nome) throw erro('Dê um nome ao documento.');
  const pdf = String(entrada.pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
  if (!pdf || !/^[A-Za-z0-9+/]+=*$/.test(pdf)) throw erro('Envie um PDF.');
  if (Math.floor(pdf.length * 3 / 4) > LIMITE_PDF_BYTES) throw erro('O PDF passa de 10 MB.');
  if (!pdf.startsWith('JVBERi')) throw erro('O arquivo não parece ser um PDF.');

  const lista = Array.isArray(entrada.signatarios) ? entrada.signatarios : [];
  if (!lista.length) throw erro('Inclua pelo menos um signatário.');
  if (lista.length > MAX_SIGNATARIOS) throw erro('No máximo ' + MAX_SIGNATARIOS + ' signatários no teste.');

  const signers = lista.map(function (s, i) {
    const name = limparTexto(s.nome, 120);
    if (!name) throw erro('Signatário ' + (i + 1) + ' sem nome.');
    const email = limparTexto(s.email, 160).toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw erro('E-mail inválido no signatário ' + (i + 1) + '.');
    const fone = String(s.celular || '').replace(/\D/g, '');
    if (fone && (fone.length < 10 || fone.length > 11)) throw erro('Celular do signatário ' + (i + 1) + ' deve ter DDD + número.');
    const auth_mode = AUTH_MODES.indexOf(s.autenticacao) !== -1 ? s.autenticacao : 'assinaturaTela';
    if (/Email/.test(auth_mode) && !email) throw erro('O signatário ' + (i + 1) + ' precisa de e-mail para o código por e-mail.');
    if (/Sms|Whatsapp/.test(auth_mode) && !fone) throw erro('O signatário ' + (i + 1) + ' precisa de celular para o código por SMS/WhatsApp.');
    const out = {
      name: name,
      auth_mode: auth_mode,
      send_automatic_email: !!(s.enviarEmail && email),
      send_automatic_whatsapp: !!(s.enviarWhatsapp && fone),
      lock_name: true
    };
    if (email) { out.email = email; out.lock_email = true; }
    if (fone) { out.phone_country = '55'; out.phone_number = fone; out.lock_phone = true; }
    return out;
  });

  return {
    name: nome,
    base64_pdf: pdf,
    signers: signers,
    lang: 'pt-br',
    folder_path: PASTA_PORTAL,
    external_id: limparTexto(entrada.idExterno, 80) || ('portal-teste-' + Date.now())
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origem não autorizada.' }, 403, origin);
    if (!env.ZAPSIGN_API_TOKEN) return json({ error: 'Token do ZapSign não configurado no Worker (Secret ZAPSIGN_API_TOKEN).' }, 500, origin);

    try {
      await exigirAdmin(request, env);
      const url = new URL(request.url);
      const p = url.pathname.replace(/\/+$/, '') || '/';
      let m;

      if (request.method === 'GET' && p === '/plano') {
        const r = await zap(env, 'GET', '/api/v1/info-plan/');
        return json({ status: r.status, dados: r.data }, r.ok ? 200 : 502, origin);
      }

      if (request.method === 'GET' && p === '/docs') {
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const q = new URLSearchParams({ page: String(page), sort_order: 'desc', include_signers: 'true' });
        if (url.searchParams.get('todos') !== '1') q.set('folder_path', PASTA_PORTAL);
        const r = await zap(env, 'GET', '/api/v1/docs/?' + q.toString());
        // Antes do primeiro envio a pasta ainda não existe e o ZapSign responde erro: é lista vazia.
        if (!r.ok && q.has('folder_path') && /folder/i.test(JSON.stringify(r.data || ''))) {
          return json({ status: 200, dados: { count: 0, next: null, previous: null, results: [] }, pasta: PASTA_PORTAL }, 200, origin);
        }
        return json({ status: r.status, dados: r.data, pasta: PASTA_PORTAL }, r.ok ? 200 : 502, origin);
      }

      if (request.method === 'GET' && (m = p.match(/^\/doc\/([^/]+)$/))) {
        if (!tokenValido(m[1])) throw erro('Documento inválido.');
        const r = await zap(env, 'GET', '/api/v1/docs/' + m[1] + '/');
        return json({ status: r.status, dados: r.data }, r.ok ? 200 : 502, origin);
      }

      if (request.method === 'POST' && p === '/criar') {
        let entrada;
        try { entrada = await request.json(); } catch (e) { throw erro('Pedido inválido.'); }
        const corpo = montarDocumento(entrada || {});
        const r = await zap(env, 'POST', '/api/v1/docs/', corpo);
        return json({ status: r.status, dados: r.data }, r.ok ? 200 : 502, origin);
      }

      if (request.method === 'POST' && (m = p.match(/^\/excluir\/([^/]+)$/))) {
        if (!tokenValido(m[1])) throw erro('Documento inválido.');
        const d = await zap(env, 'GET', '/api/v1/docs/' + m[1] + '/');
        if (!d.ok) return json({ status: d.status, dados: d.data }, 502, origin);
        const pasta = String((d.data && d.data.folder_path) || '');
        if (pasta.replace(/\/+$/, '') !== PASTA_PORTAL.replace(/\/+$/, '')) {
          throw erro('Só é possível excluir daqui documentos criados pelo portal (pasta "' + PASTA_PORTAL + '").', 403);
        }
        const r = await zap(env, 'DELETE', '/api/v1/docs/' + m[1] + '/');
        return json({ status: r.status, dados: r.data }, r.ok ? 200 : 502, origin);
      }

      return json({ error: 'Rota não encontrada.' }, 404, origin);
    } catch (e) {
      return json({ error: e.message || 'Erro.' }, e.status || 500, origin);
    }
  }
};
