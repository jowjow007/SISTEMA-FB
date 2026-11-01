// Testes de regressão das regras do Firestore (revisão de segurança 01/11/2026 — OWASP ASVS 4.0.3 V4).
// Rodam SÓ no emulador local, com dados fictícios. Ver tests/firestore-rules/LEIA-ME.md.
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const REGRAS = process.env.REGRAS_ARQUIVO || path.resolve(__dirname, '..', '..', 'firestore.rules');
let env;
const resultados = [];

async function caso(nome, fn) {
  try { await fn(); resultados.push(['ok', nome]); }
  catch (e) { resultados.push(['FALHOU', nome + ' — ' + (e && e.message ? e.message.split('\n')[0] : e)]); }
}

// pessoas fictícias
const P = {
  admin:    { uid: 'u-admin',    email: 'admin@exemplo.test',    doc: { role: 'admin', tabs: [] } },
  membro:   { uid: 'u-membro',   email: 'membro@exemplo.test',   doc: { role: 'membro', tabs: ['agenda'], patrimonioVerTudo: false } },
  antigo:   { uid: 'u-antigo',   email: 'antigo@exemplo.test',   doc: { role: 'membro', tabs: ['agenda'] } },
  outro:    { uid: 'u-outro',    email: 'outro@exemplo.test',    doc: { role: 'membro', tabs: ['agenda'] } },
  pendente: { uid: 'u-pendente', email: 'pendente@exemplo.test', doc: { role: 'membro', tabs: [] } },
  troca:    { uid: 'u-troca',    email: 'troca@exemplo.test',    doc: { role: 'membro', tabs: ['agenda'], mustChangePassword: true } },
  cliente:  { uid: 'u-cliente',  email: 'cliente@exemplo.test',  doc: { role: 'cliente', tabs: ['condominio'] } },
  excluido: { uid: 'u-excluido', email: 'excluido@exemplo.test', doc: null },
  robo:     { uid: 'u-robo',     email: 'robo@fonsecaebraga.com.br', doc: null },
  robo2:    { uid: 'u-robo2',    email: 'outro-robo@exemplo.test',   doc: null },
  vetudo:   { uid: 'u-vetudo',   email: 'vetudo@exemplo.test',   doc: { role: 'membro', tabs: ['gestao'], patrimonioVerTudo: true } },
  lancador: { uid: 'u-lancador', email: 'lancador@exemplo.test', doc: { role: 'membro', tabs: ['gestao'] } },
};
const db = (p) => env.authenticatedContext(p.uid, { email: p.email }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

async function semear() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    for (const k of Object.keys(P)) if (P[k].doc) await d.doc('users/' + P[k].uid).set(Object.assign({ email: P[k].email, displayName: 'Pessoa ' + k }, P[k].doc));
    await d.doc('robos/u-robo2').set({ nome: 'robô de teste' });
    await d.doc('permissoesGestao/u-lancador').set({ lancarHolerites: true });
    await d.doc('organograma/u-membro').set({ displayName: 'Pessoa membro', deptoAtual: 'Jurídico' });
    await d.doc('astreaDiario/2026-01-01').set({ itens: [] });
    await d.doc('contadores/c1').set({ n: 1 });
    await d.doc('perfis/u-membro').set({ foto: '' });
    await d.doc('conversas/cv1').set({ participantes: ['u-membro', 'u-outro'], criadoPor: 'u-membro' });
    await d.doc('conversas/cv1/mensagens/m1').set({ autorUid: 'u-membro', texto: 'oi' });
    await d.doc('holeritesDocs/h-membro').set({ uid: 'u-membro', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-lancador' });
    await d.doc('holeritesDocs/h-membro/partes/0').set({ b64: 'AAAA' });
    await d.doc('holeritesDocs/g-fgts').set({ tipo: 'fgts', partes: 1, enviadoPorUid: 'u-lancador' });
    await d.doc('pagamentosColaboradores/2026-01').set({ pagos: {} });
    await d.doc('senhasDiversas/s1').set({ titulo: 'fictício' });
    await d.doc('remuneracaoConfig/geral').set({ x: 1 });
    await d.doc('emailsConferencia/e1').set({ responsavelEmail: 'membro@exemplo.test', status: 'pendente' });
    await d.doc('emailsConferencia/e2').set({ responsavelEmail: 'outro@exemplo.test', status: 'pendente' });
    await d.doc('patrimonio/p1').set({ nome: 'Notebook', responsavelUid: 'u-outro' });
    await d.doc('patrimonio/p2').set({ nome: 'Monitor', responsavelUid: 'u-membro' });
    await d.doc('peticoes_historico/ph1').set({ criadoPor: 'u-outro', nomeArquivo: 'x', docsUrl: 'x' });
  });
}

async function main() {
  env = await initializeTestEnvironment({
    projectId: 'demo-portal-regras',
    firestore: { rules: fs.readFileSync(REGRAS, 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.clearFirestore();
  await semear();

  // ---- ativação: logado não basta ----
  await caso('anônimo não lê organograma', () => assertFails(anon().doc('organograma/u-membro').get()));
  await caso('membro ativo lê organograma', () => assertSucceeds(db(P.membro).doc('organograma/u-membro').get()));
  await caso('autocadastro sem abas (pendente) não lê organograma', () => assertFails(db(P.pendente).doc('organograma/u-membro').get()));
  await caso('conta com troca de senha pendente não lê organograma', () => assertFails(db(P.troca).doc('organograma/u-membro').get()));
  await caso('conta excluída (sem users) não lê organograma', () => assertFails(db(P.excluido).doc('organograma/u-membro').get()));
  await caso('pendente não lê contadores', () => assertFails(db(P.pendente).doc('contadores/c1').get()));
  await caso('cliente não lê contadores (só equipe)', () => assertFails(db(P.cliente).doc('contadores/c1').get()));
  await caso('membro lê contadores', () => assertSucceeds(db(P.membro).doc('contadores/c1').get()));
  await caso('pendente não lê perfis de outros', () => assertFails(db(P.pendente).doc('perfis/u-membro').get()));
  await caso('pendente lê o próprio cadastro', () => assertSucceeds(db(P.pendente).doc('users/u-pendente').get()));
  await caso('membro não lê cadastro de outro', () => assertFails(db(P.membro).doc('users/u-outro').get()));

  // ---- autocadastro ----
  const novo = env.authenticatedContext('u-novo', { email: 'novo@exemplo.test' }).firestore();
  await caso('autocadastro como admin é negado', () => assertFails(novo.doc('users/u-novo').set({ email: 'novo@exemplo.test', displayName: 'N', role: 'admin', tabs: [] })));
  await caso('autocadastro já com abas é negado', () => assertFails(novo.doc('users/u-novo').set({ email: 'novo@exemplo.test', displayName: 'N', role: 'membro', tabs: ['gestao'] })));
  await caso('autocadastro com campo extra (permissões) é negado', () => assertFails(novo.doc('users/u-novo').set({ email: 'novo@exemplo.test', displayName: 'N', role: 'membro', tabs: [], remuneracao: '9000' })));
  await caso('autocadastro com patrimonioVerTudo é negado', () => assertFails(novo.doc('users/u-novo').set({ email: 'novo@exemplo.test', displayName: 'N', role: 'membro', tabs: [], patrimonioVerTudo: true })));
  await caso('autocadastro pendente válido é aceito', () => assertSucceeds(novo.doc('users/u-novo').set({ email: 'novo@exemplo.test', displayName: 'N', role: 'membro', tabs: [], cpf: '000', deptoAtual: '', patrimonioVerTudo: false })));
  await caso('autocadastro na conta de outra pessoa é negado', () => assertFails(novo.doc('users/u-x').set({ email: 'x@exemplo.test', displayName: 'X', role: 'membro', tabs: [] })));
  await caso('admin cria conta de outra pessoa', () => assertSucceeds(db(P.admin).doc('users/u-criado').set({ email: 'c@exemplo.test', displayName: 'C', role: 'membro', tabs: ['agenda'] })));

  // ---- escalada de privilégio pelo próprio cadastro ----
  await caso('membro não se promove a admin', () => assertFails(db(P.membro).doc('users/u-membro').update({ role: 'admin' })));
  await caso('pendente não libera as próprias abas', () => assertFails(db(P.pendente).doc('users/u-pendente').update({ tabs: ['gestao'] })));
  await caso('membro não altera a própria remuneração', () => assertFails(db(P.membro).doc('users/u-membro').update({ remuneracao: '99999' })));
  await caso('membro não se dá patrimonioVerTudo', () => assertFails(db(P.membro).doc('users/u-membro').update({ patrimonioVerTudo: true })));
  await caso('membro atualiza telefone e PIX', () => assertSucceeds(db(P.membro).doc('users/u-membro').update({ telefone: '(00) 0000-0000', pixChave: 'chave-ficticia' })));
  await caso('membro preenche data de entrada vazia', () => assertSucceeds(db(P.membro).doc('users/u-membro').update({ dataIngresso: '2026-01-02' })));
  await caso('membro não muda data de entrada já preenchida', () => assertFails(db(P.membro).doc('users/u-membro').update({ dataIngresso: '2020-01-01' })));
  await caso('quem troca a senha zera mustChangePassword', () => assertSucceeds(db(P.troca).doc('users/u-troca').update({ mustChangePassword: false })));
  await caso('membro não reativa mustChangePassword=true em si', () => assertFails(db(P.membro).doc('users/u-membro').update({ mustChangePassword: true })));
  await caso('membro não altera cadastro de outro', () => assertFails(db(P.membro).doc('users/u-outro').update({ telefone: '1' })));
  await caso('admin altera abas de outra pessoa', () => assertSucceeds(db(P.admin).doc('users/u-outro').update({ tabs: ['agenda', 'gestao'] })));

  // ---- organograma: salário fora do espelho público ----
  await caso('admin não grava remuneração no organograma', () => assertFails(db(P.admin).doc('organograma/u-membro').set({ displayName: 'Pessoa membro', remuneracao: '5000' }, { merge: true })));
  await caso('admin não grava custos no organograma', () => assertFails(db(P.admin).doc('organograma/u-membro').set({ custos: { vt: 1 } }, { merge: true })));
  await caso('admin atualiza departamento no organograma', () => assertSucceeds(db(P.admin).doc('organograma/u-membro').set({ deptoAtual: 'Condomínio' }, { merge: true })));
  await caso('autocriação do espelho com salário é negada', () => assertFails(db(P.outro).doc('organograma/u-outro').set({ displayName: 'Outro', email: 'outro@exemplo.test', deptoAtual: '', dataIngresso: '', remuneracao: '100' })));
  await caso('autocriação do espelho só com nome é aceita', () => assertSucceeds(db(P.outro).doc('organograma/u-outro').set({ displayName: 'Outro', email: 'outro@exemplo.test', deptoAtual: '', dataIngresso: '', remuneracao: '' })));
  await caso('membro não altera espelho de outro', () => assertFails(db(P.membro).doc('organograma/u-outro').set({ deptoAtual: 'X' }, { merge: true })));

  // ---- Astrea: só o robô (ou admin) grava ----
  await caso('membro lê agenda Astrea', () => assertSucceeds(db(P.membro).doc('astreaDiario/2026-01-01').get()));
  await caso('cliente não lê agenda Astrea', () => assertFails(db(P.cliente).doc('astreaDiario/2026-01-01').get()));
  await caso('membro não grava agenda Astrea', () => assertFails(db(P.membro).doc('astreaDiario/2026-01-01').set({ itens: ['falso'] })));
  await caso('pendente não grava delta Astrea', () => assertFails(db(P.pendente).doc('astreaDelta/2026-01-01').set({ x: 1 })));
  await caso('robô (e-mail) grava agenda Astrea', () => assertSucceeds(db(P.robo).doc('astreaDiario/2026-01-02').set({ itens: [] })));
  await caso('robô (robos/{uid}) grava delta Astrea', () => assertSucceeds(db(P.robo2).doc('astreaDelta/2026-01-02').set({ x: 1 })));
  await caso('membro não se cadastra como robô', () => assertFails(db(P.membro).doc('robos/u-membro').set({ nome: 'eu' })));

  // ---- presença: só no próprio nome ----
  await caso('membro marca a própria presença', () => assertSucceeds(db(P.membro).doc('presencaDiaria/u-membro_2026-01-05').set({ uid: 'u-membro' })));
  await caso('membro não marca presença com docId de outro', () => assertFails(db(P.membro).doc('presencaDiaria/u-outro_2026-01-05').set({ uid: 'u-membro' })));
  await caso('membro não marca presença em nome de outro', () => assertFails(db(P.membro).doc('presencaDiaria/u-membro_2026-01-06').set({ uid: 'u-outro' })));

  // ---- chat ----
  await caso('participante lê a mensagem', () => assertSucceeds(db(P.membro).doc('conversas/cv1/mensagens/m1').get()));
  await caso('não participante não lê a conversa', () => assertFails(db(P.cliente).doc('conversas/cv1').get()));
  await caso('não participante não lê a mensagem', () => assertFails(db(P.admin).doc('conversas/cv1/mensagens/m1').get()));
  await caso('participante não envia mensagem como outro autor', () => assertFails(db(P.outro).collection('conversas/cv1/mensagens').add({ autorUid: 'u-membro', texto: 'forjada' })));

  // ---- holerites e pagamentos ----
  await caso('colaborador lê o próprio holerite', () => assertSucceeds(db(P.membro).doc('holeritesDocs/h-membro').get()));
  await caso('colaborador lê as partes do próprio holerite', () => assertSucceeds(db(P.membro).doc('holeritesDocs/h-membro/partes/0').get()));
  await caso('outro colaborador não lê holerite alheio', () => assertFails(db(P.outro).doc('holeritesDocs/h-membro').get()));
  await caso('outro colaborador não lê partes de holerite alheio', () => assertFails(db(P.outro).doc('holeritesDocs/h-membro/partes/0').get()));
  await caso('colaborador não lê guia de FGTS', () => assertFails(db(P.membro).doc('holeritesDocs/g-fgts').get()));
  await caso('quem lança não lê holerite alheio (só envia)', () => assertFails(db(P.lancador).doc('holeritesDocs/h-membro').get()));
  await caso('quem lança envia holerite', () => assertSucceeds(db(P.lancador).doc('holeritesDocs/h-novo').set({ uid: 'u-outro', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-lancador' })));
  await caso('membro sem permissão não envia holerite', () => assertFails(db(P.membro).doc('holeritesDocs/h-falso').set({ uid: 'u-outro', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-membro' })));
  await caso('holerite não pode ser alterado depois', () => assertFails(db(P.lancador).doc('holeritesDocs/h-membro').update({ uid: 'u-lancador' })));
  await caso('membro não lê pagamentos', () => assertFails(db(P.membro).doc('pagamentosColaboradores/2026-01').get()));
  await caso('admin lê pagamentos', () => assertSucceeds(db(P.admin).doc('pagamentosColaboradores/2026-01').get()));
  await caso('membro não marca pagamento', () => assertFails(db(P.membro).doc('pagamentosColaboradores/2026-01').set({ pagos: { 'u-membro': true } })));

  // ---- senhas, remuneração, e-mails, patrimônio, petições ----
  await caso('membro sem permissão não lê senhas', () => assertFails(db(P.membro).doc('senhasDiversas/s1').get()));
  await caso('admin comum (não dono) não lê remuneração', () => assertFails(db(P.admin).doc('remuneracaoConfig/geral').get()));
  await caso('responsável lê o próprio e-mail da conferência', () => assertSucceeds(db(P.membro).doc('emailsConferencia/e1').get()));
  await caso('responsável não lê e-mail de outro responsável', () => assertFails(db(P.membro).doc('emailsConferencia/e2').get()));
  await caso('membro não lê patrimônio sob responsabilidade de outro', () => assertFails(db(P.membro).doc('patrimonio/p1').get()));
  await caso('membro lê patrimônio sob a própria responsabilidade', () => assertSucceeds(db(P.membro).doc('patrimonio/p2').get()));
  await caso('liberado em "Quem vê tudo" lê patrimônio de outro', () => assertSucceeds(db(P.vetudo).doc('patrimonio/p1').get()));
  await caso('cadastro antigo sem o campo continua vendo todo o patrimônio', () => assertSucceeds(db(P.antigo).doc('patrimonio/p1').get()));
  await caso('admin lê qualquer patrimônio', () => assertSucceeds(db(P.admin).doc('patrimonio/p1').get()));
  await caso('membro lista só o próprio patrimônio (consulta filtrada)', () => assertSucceeds(db(P.membro).collection('patrimonio').where('responsavelUid', '==', 'u-membro').get()));
  await caso('membro não lista o patrimônio inteiro', () => assertFails(db(P.membro).collection('patrimonio').get()));
  await caso('pendente não lê nem o patrimônio próprio', () => assertFails(db(P.pendente).collection('patrimonio').where('responsavelUid', '==', 'u-pendente').get()));
  await caso('membro não lê histórico de petições de outro', () => assertFails(db(P.membro).doc('peticoes_historico/ph1').get()));

  await env.cleanup();
  let falhas = 0;
  for (const [st, nome] of resultados) { if (st !== 'ok') falhas++; console.log((st === 'ok' ? '  ✓ ' : '  ✗ ') + nome); }
  console.log('\n' + (resultados.length - falhas) + ' de ' + resultados.length + ' casos passaram.');
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
