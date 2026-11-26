// ============================================================
// CLOUDFLARE WORKER — notificações do Chat no celular (portal-fb-push)
// ============================================================
// Colado no editor do Cloudflare Workers (dashboard.cloudflare.com). Não faz parte do site.
//
// Como funciona: quem envia uma mensagem no Chat avisa este Worker (POST com o ID token do Firebase e
// { conversaId, msgId }). O Worker:
//   1. confere a assinatura do ID token (chaves públicas do Google) → uid de quem enviou;
//   2. com o PRÓPRIO token da pessoa lê a conversa e a mensagem no Firestore (as regras do portal valem:
//      só participante lê) e confere que a mensagem é dela;
//   3. com a conta de serviço lê pushTokens/{uid} de cada outro participante e envia a notificação pelo
//      Firebase Cloud Messaging (FCM HTTP v1). Tokens que o FCM diz que não existem mais são apagados.
// Ninguém consegue mandar notificação "em nome" de outra pessoa nem para quem não está na conversa.
//
// Variáveis (Settings > Variables and Secrets):
//   GOOGLE_SA_EMAIL        (Secret) "client_email" do JSON da conta de serviço
//   GOOGLE_SA_PRIVATE_KEY  (Secret) "private_key" do mesmo JSON (com BEGIN/END PRIVATE KEY)
//   FIREBASE_PROJECT_ID    (variável normal, opcional) padrão: sistema-fb-4cce5
// Papéis da conta de serviço no projeto do portal: "Administrador da API Firebase Cloud Messaging" e
// "Leitor do Cloud Datastore" (só leitura: se a chave vazar, não altera o banco). Com leitura apenas, apagar
// aparelhos desativados falha em silêncio; o próprio portal limpa os antigos quando a pessoa entra.
// ============================================================

const ALLOWED_ORIGINS = ['https://portal.fonsecaebraga.com.br', 'https://jowjow007.github.io'];
const SITE = 'https://portal.fonsecaebraga.com.br/';

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin'
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json' }, cors(origin)) });
}

// ---------- base64url / chaves ----------
function b64url(bytes) {
  let bin = ''; const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlBytes(s) {
  let b = s.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
  const bin = atob(b), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function importarChavePrivada(pem) {
  const corpo = pem.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const bin = atob(corpo), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return crypto.subtle.importKey('pkcs8', bytes.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

// ---------- token da conta de serviço (guardado ~50 min por instância) ----------
let tokenSA = null, tokenSAExpira = 0;
async function tokenContaServico(env) {
  if (tokenSA && Date.now() < tokenSAExpira) return tokenSA;
  const enc = new TextEncoder(), agora = Math.floor(Date.now() / 1000);
  const cab = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const corpo = b64url(enc.encode(JSON.stringify({
    iss: env.GOOGLE_SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600
  })));
  const chave = await importarChavePrivada(env.GOOGLE_SA_PRIVATE_KEY);
  const ass = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, chave, enc.encode(cab + '.' + corpo));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(cab + '.' + corpo + '.' + b64url(ass))
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Conta de serviço: ' + (d.error_description || d.error || r.status));
  tokenSA = d.access_token; tokenSAExpira = Date.now() + 50 * 60 * 1000;
  return tokenSA;
}

// ---------- ID token do Firebase (quem está enviando) ----------
let jwks = null, jwksExpira = 0;
async function verificarIdToken(idToken, projeto) {
  const p = idToken.split('.');
  if (p.length !== 3) throw new Error('token mal formado');
  const cab = JSON.parse(new TextDecoder().decode(b64urlBytes(p[0])));
  const dados = JSON.parse(new TextDecoder().decode(b64urlBytes(p[1])));
  const agora = Math.floor(Date.now() / 1000);
  if (cab.alg !== 'RS256') throw new Error('algoritmo inválido');
  if (!dados.exp || dados.exp < agora) throw new Error('token expirado');
  if (!dados.iat || dados.iat > agora + 60) throw new Error('data inválida');
  if (dados.aud !== projeto || dados.iss !== 'https://securetoken.google.com/' + projeto) throw new Error('token de outro projeto');
  if (!dados.sub) throw new Error('token sem uid');
  if (!jwks || Date.now() > jwksExpira) {
    const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
    jwks = (await r.json()).keys || []; jwksExpira = Date.now() + 60 * 60 * 1000;
  }
  const jwk = jwks.find(k => k.kid === cab.kid);
  if (!jwk) throw new Error('chave não encontrada');
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, chave, b64urlBytes(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
  if (!ok) throw new Error('assinatura inválida');
  return dados.sub;
}

// ---------- Firestore (REST) ----------
function valor(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valor);
  if ('mapValue' in v) { const o = {}; const f = v.mapValue.fields || {}; for (const k in f) o[k] = valor(f[k]); return o; }
  return null;
}
async function lerDoc(projeto, caminho, bearer) {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/' + projeto + '/databases/(default)/documents/' + caminho, { headers: { Authorization: 'Bearer ' + bearer } });
  if (r.status === 404) return null;
  if (!r.ok) { const e = new Error('Firestore ' + r.status + ' em ' + caminho.split('/')[0]); e.status = r.status; throw e; }
  const d = await r.json(); const o = {}; const f = d.fields || {};
  for (const k in f) o[k] = valor(f[k]);
  return o;
}
async function apagarToken(projeto, uid, chave, bearer) {
  // remove só o campo tokens.<chave> (updateMask sem o campo no corpo = apagar)
  const campo = 'tokens.`' + chave + '`';
  await fetch('https://firestore.googleapis.com/v1/projects/' + projeto + '/databases/(default)/documents/pushTokens/' + encodeURIComponent(uid) +
    '?updateMask.fieldPaths=' + encodeURIComponent(campo) + '&currentDocument.exists=true',
    { method: 'PATCH', headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: {} }) }).catch(() => {});
}

function resumo(m) {
  const t = String(m.texto || '').replace(/\s+/g, ' ').trim();
  const ic = { foto: '📷 Foto', documento: '📄 ' + (m.documentoNome || 'Documento'), audio: '🎤 Áudio' }[m.tipo];
  const r = ic ? ic + (t ? ': ' + t : '') : t || 'Nova mensagem';
  return r.length > 140 ? r.slice(0, 137) + '…' : r;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origem não permitida.' }, 403, origin);
    const projeto = env.FIREBASE_PROJECT_ID || 'sistema-fb-4cce5';
    const auth = request.headers.get('Authorization') || '';
    const idToken = auth.indexOf('Bearer ') === 0 ? auth.slice(7).trim() : '';
    let uid;
    try { uid = await verificarIdToken(idToken, projeto); } catch (e) { return json({ error: 'Sessão inválida.' }, 401, origin); }
    let corpo;
    try { corpo = await request.json(); } catch (e) { return json({ error: 'Corpo inválido.' }, 400, origin); }
    const conversaId = String(corpo.conversaId || ''), msgId = String(corpo.msgId || '');
    if (!/^[\w-]{1,200}$/.test(conversaId) || !/^[\w-]{1,200}$/.test(msgId)) return json({ error: 'Pedido inválido.' }, 400, origin);
    try {
      // leitura com o login de quem enviou: as regras do portal decidem
      const conv = await lerDoc(projeto, 'conversas/' + conversaId, idToken);
      const msg = await lerDoc(projeto, 'conversas/' + conversaId + '/mensagens/' + msgId, idToken);
      if (!conv || !msg || !Array.isArray(conv.participantes) || conv.participantes.indexOf(uid) < 0 || msg.autorUid !== uid)
        return json({ error: 'Mensagem não encontrada.' }, 404, origin);
      // mensagem antiga (mais de 10 min): não notifica de novo
      if (msg.criadoEm && Date.now() - Date.parse(msg.criadoEm) > 10 * 60 * 1000) return json({ ok: true, enviados: 0, motivo: 'antiga' }, 200, origin);
      const perfil = await lerDoc(projeto, 'perfis/' + uid, idToken).catch(() => null);
      const nome = (perfil && perfil.displayName) || 'Alguém';
      const titulo = conv.tipo === 'grupo' ? nome.split(' ')[0] + ' em ' + (conv.nomeGrupo || 'Grupo') : nome;
      const texto = resumo(msg);
      const sa = await tokenContaServico(env);
      const destinos = conv.participantes.filter(p => p && p !== uid).slice(0, 60);
      let enviados = 0;
      await Promise.all(destinos.map(async (p) => {
        const doc = await lerDoc(projeto, 'pushTokens/' + encodeURIComponent(p), sa).catch(() => null);
        const tokens = (doc && doc.tokens) || {};
        await Promise.all(Object.keys(tokens).slice(0, 10).map(async (chave) => {
          const t = tokens[chave] && tokens[chave].token;
          if (!t) return;
          const r = await fetch('https://fcm.googleapis.com/v1/projects/' + projeto + '/messages:send', {
            method: 'POST', headers: { Authorization: 'Bearer ' + sa, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token: t,
              data: { title: titulo, body: texto, conversaId, tag: 'chat-' + conversaId, link: SITE + '?conversa=' + encodeURIComponent(conversaId) },
              webpush: { headers: { Urgency: 'high', TTL: '86400' } } } })
          });
          if (r.ok) { enviados++; return; }
          const erro = await r.text();
          if (r.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(erro)) ctx.waitUntil(apagarToken(projeto, p, chave, sa));
        }));
      }));
      return json({ ok: true, enviados }, 200, origin);
    } catch (e) {
      return json({ error: 'Falha ao notificar: ' + (e.message || e) }, e.status === 403 ? 403 : 502, origin);
    }
  }
};
