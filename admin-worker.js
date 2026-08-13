// ============================================================
// CLOUDFLARE WORKER — exclusão definitiva de usuário (Auth + Firestore)
// ============================================================
// Este código NÃO roda no navegador nem faz parte do site publicado no
// GitHub Pages — ele é colado direto no editor do Cloudflare Workers
// (dashboard.cloudflare.com), que é quem executa. É o único lugar onde a
// credencial de administrador do projeto Firebase existe de verdade,
// guardada como "Secret" (variável de ambiente criptografada, nunca
// aparece em texto depois de salva). O navegador de cada admin só fala
// com a URL pública deste Worker — nunca vê a credencial real.
//
// Por que isso precisa existir: o SDK do Firebase que roda no navegador
// (usado no resto do Portal) só consegue apagar a CONTA DE LOGIN (Firebase
// Authentication) da própria pessoa logada, nunca a de outra pessoa — por
// segurança, isso é proposital e não tem contorno client-side. Apagar o
// login de outra pessoa exige uma "conta de serviço" com permissão de
// administrador, que só pode ficar num lugar que o navegador não acessa
// diretamente — daí este Worker, no mesmo molde do
// tools/assistente-ia/worker.js (mesma técnica de assinar um JWT com a
// chave privada da conta de serviço e trocar por um token de acesso do
// Google a cada requisição).
//
// O que este Worker faz, na ordem, a cada pedido de exclusão:
//   1. Confere se a origem (Origin) é um domínio autorizado do Portal.
//   2. Verifica a assinatura do "idToken" do Firebase Auth que o painel
//      Administração envia (prova de que quem pediu a exclusão está
//      realmente logado no Portal agora, sem ninguém conseguir forjar).
//   3. Usando o uid de quem pediu, consulta o Firestore (users/{uid}) e
//      exige role === "admin" — só admin pode excluir.
//   4. Apaga de vez: o login (Firebase Authentication) da pessoa alvo +
//      os documentos users/{uid}, perfis/{uid} e organograma/{uid} dela
//      no Firestore. Depois disso o e-mail volta a ficar livre para um
//      novo cadastro imediatamente.
//
// Variáveis de ambiente esperadas (configuradas no dashboard, não aqui):
//   ADMIN_SA_EMAIL         (Secret, obrigatória) — "client_email" do JSON
//                           da conta de serviço baixada no Google Cloud
//                           (projeto do Firebase, sistema-fb-4cce5).
//   ADMIN_SA_PRIVATE_KEY   (Secret, obrigatória) — "private_key" do mesmo
//                           JSON (cole com as quebras de linha, incluindo
//                           "-----BEGIN PRIVATE KEY-----" e "-----END...").
//   FIREBASE_PROJECT_ID    (Variável normal, obrigatória) — "sistema-fb-4cce5".
//
// A conta de serviço precisa destes dois papéis (IAM) no projeto do
// Firebase, nada além disso (princípio do mínimo privilégio):
//   - Firebase Authentication Admin  (apagar o login)
//   - Cloud Datastore User           (ler/apagar documentos no Firestore)
//
// Passo a passo completo no README-SETUP.md, seção 10.
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

function base64urlToBytes(b64url) {
  var b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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

async function getAccessToken(clientEmail, privateKeyPem, scope) {
  var enc = new TextEncoder();
  var now = Math.floor(Date.now() / 1000);
  var header = { alg: 'RS256', typ: 'JWT' };
  var claimSet = {
    iss: clientEmail,
    scope: scope,
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

async function isAdmin(uid, projectId, accessToken) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/users/' + uid;
  var resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + accessToken } });
  if (!resp.ok) return false;
  var data = await resp.json();
  return !!(data.fields && data.fields.role && data.fields.role.stringValue === 'admin');
}

async function deleteFirestoreDoc(path, projectId, accessToken) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/' + path;
  await fetch(url, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + accessToken } });
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

    if (!env.ADMIN_SA_EMAIL || !env.ADMIN_SA_PRIVATE_KEY || !env.FIREBASE_PROJECT_ID) {
      return jsonResponse({ error: 'Credenciais da conta de serviço não configuradas no Worker.' }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400, origin);
    }

    const idToken = body.idToken;
    const targetUid = body.targetUid;
    if (!idToken || !targetUid) {
      return jsonResponse({ error: 'idToken e targetUid são obrigatórios.' }, 400, origin);
    }

    const projectId = env.FIREBASE_PROJECT_ID;

    let callerUid;
    try {
      callerUid = await verifyFirebaseIdToken(idToken, projectId);
    } catch (e) {
      return jsonResponse({ error: 'Sessão inválida: ' + e.message }, 401, origin);
    }

    if (callerUid === targetUid) {
      return jsonResponse({ error: 'Você não pode excluir a si mesmo.' }, 400, origin);
    }

    let accessToken;
    try {
      accessToken = await getAccessToken(
        env.ADMIN_SA_EMAIL,
        env.ADMIN_SA_PRIVATE_KEY,
        'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore'
      );
    } catch (e) {
      return jsonResponse({ error: 'Falha na autenticação com o Google: ' + e.message }, 500, origin);
    }

    let souAdmin;
    try {
      souAdmin = await isAdmin(callerUid, projectId, accessToken);
    } catch (e) {
      souAdmin = false;
    }
    if (!souAdmin) {
      return jsonResponse({ error: 'Apenas administradores podem excluir usuários.' }, 403, origin);
    }

    try {
      const delAuthResp = await fetch(
        'https://identitytoolkit.googleapis.com/v1/projects/' + projectId + '/accounts:delete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
          body: JSON.stringify({ localId: targetUid })
        }
      );
      if (!delAuthResp.ok) {
        const errData = await delAuthResp.json().catch(function () { return {}; });
        const msg = (errData.error && errData.error.message) || '';
        // Se o login já não existir mais (ex: excluído antes só via console),
        // segue em frente e limpa o Firestore mesmo assim.
        if (msg.indexOf('USER_NOT_FOUND') === -1) {
          return jsonResponse({ error: 'Falha ao apagar o login: ' + (msg || delAuthResp.status) }, 502, origin);
        }
      }
    } catch (e) {
      return jsonResponse({ error: 'Falha ao contatar o Firebase Authentication.' }, 502, origin);
    }

    await Promise.all([
      deleteFirestoreDoc('users/' + targetUid, projectId, accessToken),
      deleteFirestoreDoc('perfis/' + targetUid, projectId, accessToken),
      deleteFirestoreDoc('organograma/' + targetUid, projectId, accessToken)
    ]);

    return jsonResponse({ ok: true }, 200, origin);
  }
};
