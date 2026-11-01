// Testes das regras do Firebase Storage (storage.rules) no emulador — revisão de segurança 01/11/2026.
// As regras consultam o Firestore (cadastro e participantes da conversa), por isso o teste sobe os dois
// emuladores juntos (firebase emulators:exec --only firestore,storage). Dados fictícios. Ver tests/LEIA-ME.md.
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const RAIZ = path.resolve(__dirname, '..', '..');
const REGRAS_STORAGE = process.env.REGRAS_STORAGE || path.join(RAIZ, 'storage.rules');
const REGRAS_FIRESTORE = process.env.REGRAS_ARQUIVO || path.join(RAIZ, 'firestore.rules');
const [FH, FP] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const [SH, SP] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199').split(':');
const resultados = [];
let env;

async function caso(grupo, nome, fn) {
  try { await fn(); resultados.push(['ok', grupo, nome]); }
  catch (e) { resultados.push(['FALHOU', grupo, nome + ' — ' + (e && e.message ? e.message.split('\n')[0] : e)]); }
}
const P = {
  ana:   { uid: 'u-ana',   doc: { role: 'membro', tabs: ['chat'], acesso: 'ativo' } },
  bia:   { uid: 'u-bia',   doc: { role: 'membro', tabs: ['chat'], acesso: 'ativo' } },
  caio:  { uid: 'u-caio',  doc: { role: 'membro', tabs: ['chat'], acesso: 'ativo' } },     // fora da conversa A
  admin: { uid: 'u-admin', doc: { role: 'admin', tabs: [], acesso: 'ativo' } },           // fora da conversa A
  pend:  { uid: 'u-pend',  doc: { role: 'membro', tabs: [], acesso: 'pendente' } },
  bloq:  { uid: 'u-bloq',  doc: { role: 'membro', tabs: ['chat'], acesso: 'bloqueado' } },
  deslig:{ uid: 'u-deslig', doc: null },                                                   // excluído, sessão aberta
};
const st = (p) => env.authenticatedContext(p.uid).storage();
const anon = () => env.unauthenticatedContext().storage();
const bytes = (n) => new Uint8Array(n);
const put = (s, caminho, tipo, n) => s.ref(caminho).put(bytes(n || 16), { contentType: tipo || 'application/pdf' });
const get = (s, caminho) => s.ref(caminho).getMetadata();

async function main() {
  env = await initializeTestEnvironment({
    projectId: 'demo-portal-regras',
    firestore: { rules: fs.readFileSync(REGRAS_FIRESTORE, 'utf8'), host: FH, port: Number(FP) },
    storage: { rules: fs.readFileSync(REGRAS_STORAGE, 'utf8'), host: SH, port: Number(SP) },
  });
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    for (const k of Object.keys(P)) if (P[k].doc) await d.doc('users/' + P[k].uid).set(P[k].doc);
    await d.doc('conversas/convA').set({ participantes: ['u-ana', 'u-bia', 'u-pend', 'u-bloq', 'u-deslig'] });
    await d.doc('conversas/convB').set({ participantes: ['u-caio', 'u-admin'] });
    const s = ctx.storage();
    await s.ref('chat/convA/u-ana/1_doc.pdf').put(bytes(16), { contentType: 'application/pdf' });
    await s.ref('chat/convB/u-caio/1_foto.jpg').put(bytes(16), { contentType: 'image/jpeg' });
    await s.ref('chat/u-ana/antigo_doc.pdf').put(bytes(16), { contentType: 'application/pdf' });
    await s.ref('outra-pasta/x.pdf').put(bytes(16), { contentType: 'application/pdf' });
  });

  let G = '1. Leitura';
  await caso(G, 'participante lê anexo da conversa', () => assertSucceeds(get(st(P.bia), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'autor lê o próprio anexo', () => assertSucceeds(get(st(P.ana), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'não participante (membro ativo) não lê', () => assertFails(get(st(P.caio), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'admin fora da conversa não lê', () => assertFails(get(st(P.admin), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'anônimo não lê', () => assertFails(get(anon(), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'pendente na conversa não lê', () => assertFails(get(st(P.pend), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'bloqueado na conversa não lê', () => assertFails(get(st(P.bloq), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'desligado (sessão aberta) não lê', () => assertFails(get(st(P.deslig), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'desligado não gera link de download', () => assertFails(st(P.deslig).ref('chat/convA/u-ana/1_doc.pdf').getDownloadURL()));
  await caso(G, 'não participante não gera link de download', () => assertFails(st(P.caio).ref('chat/convA/u-ana/1_doc.pdf').getDownloadURL()));
  await caso(G, 'não participante não lista a pasta da conversa', () => assertFails(st(P.caio).ref('chat/convA/u-ana').listAll()));

  G = '2. Acesso cruzado entre conversas';
  await caso(G, 'participante de A não lê anexo de B', () => assertFails(get(st(P.ana), 'chat/convB/u-caio/1_foto.jpg')));
  await caso(G, 'participante de A não envia arquivo na pasta de B', () => assertFails(put(st(P.ana), 'chat/convB/u-ana/2_doc.pdf')));
  await caso(G, 'não envia em conversa inexistente', () => assertFails(put(st(P.ana), 'chat/convX/u-ana/2_doc.pdf')));
  await caso(G, 'formato antigo: só o autor lê', () => assertSucceeds(get(st(P.ana), 'chat/u-ana/antigo_doc.pdf')));
  await caso(G, 'formato antigo: colega ativo não lê pelo SDK', () => assertFails(get(st(P.bia), 'chat/u-ana/antigo_doc.pdf')));
  await caso(G, 'formato antigo: não aceita envio novo', () => assertFails(put(st(P.ana), 'chat/u-ana/novo_doc.pdf')));
  await caso(G, 'outras pastas do bucket: ninguém lê', () => assertFails(get(st(P.admin), 'outra-pasta/x.pdf')));

  G = '3. Restrições de envio';
  await caso(G, 'participante envia PDF na própria pasta da conversa', () => assertSucceeds(put(st(P.bia), 'chat/convA/u-bia/2_doc.pdf')));
  await caso(G, 'não envia na pasta de outra pessoa', () => assertFails(put(st(P.bia), 'chat/convA/u-ana/3_doc.pdf')));
  await caso(G, 'pendente não envia', () => assertFails(put(st(P.pend), 'chat/convA/u-pend/1_doc.pdf')));
  await caso(G, 'desligado não envia', () => assertFails(put(st(P.deslig), 'chat/convA/u-deslig/1_doc.pdf')));
  await caso(G, 'acima de 10 MB é recusado', () => assertFails(put(st(P.bia), 'chat/convA/u-bia/grande.pdf', 'application/pdf', 10 * 1024 * 1024 + 1)));
  await caso(G, 'exatamente 10 MB é aceito', () => assertSucceeds(put(st(P.bia), 'chat/convA/u-bia/limite.pdf', 'application/pdf', 10 * 1024 * 1024)));
  for (const tipo of ['text/html', 'text/html; charset=utf-8', 'image/svg+xml', 'application/javascript', 'text/javascript', 'application/xhtml+xml', 'text/xml']) {
    await caso(G, 'tipo ' + tipo + ' é recusado', () => assertFails(put(st(P.bia), 'chat/convA/u-bia/x', tipo)));
  }
  await caso(G, 'imagem JPEG é aceita', () => assertSucceeds(put(st(P.bia), 'chat/convA/u-bia/f.jpg', 'image/jpeg')));
  await caso(G, 'não sobrescreve anexo já enviado', () => assertFails(put(st(P.ana), 'chat/convA/u-ana/1_doc.pdf')));
  await caso(G, 'não apaga anexo (nem o próprio)', () => assertFails(st(P.ana).ref('chat/convA/u-ana/1_doc.pdf').delete()));

  await env.cleanup();
  let falhas = 0, g0 = '';
  for (const [s, grupo, nome] of resultados) {
    if (grupo !== g0) { console.log('\n' + grupo); g0 = grupo; }
    if (s !== 'ok') falhas++;
    console.log((s === 'ok' ? '  ✓ ' : '  ✗ ') + nome);
  }
  console.log('\nStorage: ' + (resultados.length - falhas) + ' de ' + resultados.length + ' casos passaram (' + falhas + ' reprovados). Regras: ' + REGRAS_STORAGE);
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
