// Testes de regressão do Worker do Assistente IA (tools/assistente-ia/worker.js) — revisão de segurança 01/11/2026.
// Rodam localmente com Node 20+, sem rede: o fetch global é substituído por um dublê e o "Google" é uma chave RSA
// gerada na hora. Nenhum dado real, nenhuma chamada a produção.  Uso:  node tests/worker-assistente/worker.test.mjs
import { webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const subtle = webcrypto.subtle;
const PROJETO = 'demo-portal';
const ORIGEM = 'https://portal.fonsecaebraga.com.br';
const resultados = [];
const chamadas = [];
let usuarios = {};   // uid -> campos (formato REST do Firestore), simulando a leitura com o token da pessoa

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const { publicKey, privateKey } = await subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwkPublico = Object.assign(await subtle.exportKey('jwk', publicKey), { kid: 'k1', alg: 'RS256', use: 'sig' });
const { privateKey: chaveIntrusa } = await subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);

async function token(uid, { chave = privateKey, aud = PROJETO, exp = 3600 } = {}) {
  const agora = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }));
  const p = b64url(JSON.stringify({ sub: uid, aud, iss: 'https://securetoken.google.com/' + aud, iat: agora - 10, exp: agora + exp }));
  const assinatura = await subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, chave, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + b64url(assinatura);
}

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  chamadas.push({ url: u, opts });
  if (u.startsWith('https://www.googleapis.com/service_accounts/v1/jwk/')) return Response.json({ keys: [jwkPublico] });
  if (u.startsWith('https://firestore.googleapis.com/')) {
    const uid = decodeURIComponent(u.split('/users/')[1]);
    return usuarios[uid] ? Response.json({ fields: usuarios[uid] }) : new Response('{}', { status: 403 });
  }
  if (u.startsWith('https://generativelanguage.googleapis.com/')) return Response.json({ candidates: [] });
  if (u.startsWith('https://www.conjur.com.br/')) return new Response('<rss/>', { status: 200 });
  return new Response('inesperado', { status: 599 });
};

const worker = (await import(pathToFileURL(path.resolve(process.env.WORKER_ARQUIVO || 'tools/assistente-ia/worker.js')).href)).default;
const env = { FIREBASE_PROJECT_ID: PROJETO, GEMINI_API_KEY: 'chave-ficticia' };
const post = (headers = {}) => new Request('https://worker.test/', { method: 'POST', headers: Object.assign({ Origin: ORIGEM, 'Content-Type': 'application/json' }, headers), body: '{"contents":[]}' });
const rss = (alvo, origem = ORIGEM) => new Request('https://worker.test/rss?url=' + encodeURIComponent(alvo), { headers: { Origin: origem } });
const chamouGemini = () => chamadas.some((c) => c.url.startsWith('https://generativelanguage.googleapis.com/'));

async function caso(nome, fn) {
  chamadas.length = 0;
  try { await fn(); resultados.push(['ok', nome]); }
  catch (e) { resultados.push(['FALHOU', nome + ' — ' + e.message]); }
}
function espera(cond, msg) { if (!cond) throw new Error(msg); }

const ativo = { acesso: { stringValue: 'ativo' } };
usuarios = {
  'u-membro':   Object.assign({ role: { stringValue: 'membro' }, tabs: { arrayValue: { values: [{ stringValue: 'assistente' }] } } }, ativo),
  'u-pendente': { role: { stringValue: 'membro' }, tabs: { arrayValue: {} }, acesso: { stringValue: 'pendente' } },
  'u-abas':     { role: { stringValue: 'membro' }, tabs: { arrayValue: { values: [{ stringValue: 'assistente' }] } } },   // abas sem aprovação
  'u-bloq':     { role: { stringValue: 'membro' }, tabs: { arrayValue: { values: [{ stringValue: 'assistente' }] } }, acesso: { stringValue: 'bloqueado' } },
  'u-cliente':  Object.assign({ role: { stringValue: 'cliente' }, tabs: { arrayValue: { values: [{ stringValue: 'condominio' }] } } }, ativo),
  'u-troca':    Object.assign({ role: { stringValue: 'membro' }, tabs: { arrayValue: {} }, mustChangePassword: { booleanValue: true } }, ativo),
};

await caso('origem estranha é recusada', async () => {
  const r = await worker.fetch(post({ Origin: 'https://atacante.example' }), env); espera(r.status === 403, 'status ' + r.status);
});
await caso('pedido sem token (só com Origin forjado) é recusado e não chega ao Gemini', async () => {
  const r = await worker.fetch(post(), env); espera(r.status === 401, 'status ' + r.status); espera(!chamouGemini(), 'chamou o Gemini');
});
await caso('token lixo é recusado', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer abc.def.ghi' }), env); espera(r.status === 401, 'status ' + r.status);
});
await caso('token assinado por outra chave é recusado', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-membro', { chave: chaveIntrusa }) }), env);
  espera(r.status === 401, 'status ' + r.status); espera(!chamouGemini(), 'chamou o Gemini');
});
await caso('token de outro projeto é recusado', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-membro', { aud: 'outro-projeto' }) }), env); espera(r.status === 401, 'status ' + r.status);
});
await caso('token expirado é recusado', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-membro', { exp: -60 }) }), env); espera(r.status === 401, 'status ' + r.status);
});
await caso('conta pendente (sem abas) é recusada', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-pendente') }), env); espera(r.status === 403, 'status ' + r.status); espera(!chamouGemini(), 'chamou o Gemini');
});
await caso('cliente é recusado', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-cliente') }), env); espera(r.status === 403, 'status ' + r.status);
});
await caso('conta com abas mas sem aprovação explícita é recusada', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-abas') }), env); espera(r.status === 403, 'status ' + r.status); espera(!chamouGemini(), 'chamou o Gemini');
});
await caso('conta bloqueada (sessão ainda válida) é recusada', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-bloq') }), env); espera(r.status === 403, 'status ' + r.status); espera(!chamouGemini(), 'chamou o Gemini');
});
await caso('mustChangePassword não decide acesso: aprovada é aceita', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-troca') }), env); espera(r.status === 200, 'status ' + r.status);
});
await caso('conta desligada (cadastro apagado, token ainda válido) é recusada', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-excluido') }), env); espera(r.status === 403, 'status ' + r.status);
});
await caso('membro ativo chega ao Gemini', async () => {
  const r = await worker.fetch(post({ Authorization: 'Bearer ' + await token('u-membro') }), env);
  espera(r.status === 200, 'status ' + r.status); espera(chamouGemini(), 'não chamou o Gemini');
  const fs = chamadas.find((c) => c.url.startsWith('https://firestore.googleapis.com/'));
  espera(fs && /^Bearer /.test(fs.opts.headers.Authorization), 'não leu o cadastro com o token da pessoa');
});
for (const alvo of ['http://169.254.169.254/latest/meta-data/', 'https://atacante.example/feed', 'http://www.conjur.com.br/rss.xml', 'https://www.conjur.com.br.atacante.example/rss', 'file:///etc/passwd']) {
  await caso('RSS recusa ' + alvo + ' sem buscar nada', async () => {
    const r = await worker.fetch(rss(alvo), env); espera(r.status === 403 || r.status === 400, 'status ' + r.status); espera(chamadas.length === 0, 'fez fetch');
  });
}
await caso('RSS busca feed permitido sem seguir redirecionamento', async () => {
  const r = await worker.fetch(rss('https://www.conjur.com.br/rss.xml'), env);
  espera(r.status === 200, 'status ' + r.status); espera(chamadas[0] && chamadas[0].opts.redirect === 'manual', 'redirect ' + (chamadas[0] && chamadas[0].opts.redirect));
});

let falhas = 0;
for (const [st, nome] of resultados) { if (st !== 'ok') falhas++; console.log((st === 'ok' ? '  ✓ ' : '  ✗ ') + nome); }
console.log('\n' + (resultados.length - falhas) + ' de ' + resultados.length + ' casos passaram.');
process.exit(falhas ? 1 : 0);
