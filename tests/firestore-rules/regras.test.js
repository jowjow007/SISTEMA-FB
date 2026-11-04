// Testes de regressão das regras do Firestore (revisão de segurança 01/11/2026 — OWASP ASVS 4.0.3 V4).
// Rodam SÓ no emulador local, com dados fictícios (@exemplo.test). Ver tests/LEIA-ME.md.
// REGRAS_ARQUIVO=<arquivo> roda os mesmos casos contra outra versão das regras (ex.: as antigas, para comparar).
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const REGRAS = process.env.REGRAS_ARQUIVO || path.resolve(__dirname, '..', '..', 'firestore.rules');
const [HOST, PORTA] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
let env;
const resultados = [];

async function caso(grupo, nome, fn) {
  try { await fn(); resultados.push(['ok', grupo, nome]); }
  catch (e) { resultados.push(['FALHOU', grupo, nome + ' — ' + (e && e.message ? e.message.split('\n')[0] : e)]); }
}

// pessoas fictícias. acesso: só o admin grava (aprovação explícita)
const P = {
  admin:     { uid: 'u-admin',     email: 'admin@exemplo.test',     doc: { role: 'admin', tabs: [], acesso: 'ativo' } },
  membro:    { uid: 'u-membro',    email: 'membro@exemplo.test',    doc: { role: 'membro', tabs: ['agenda'], acesso: 'ativo', patrimonioVerTudo: false } },
  outro:     { uid: 'u-outro',     email: 'outro@exemplo.test',     doc: { role: 'membro', tabs: ['agenda'], acesso: 'ativo' } },
  semAbas:   { uid: 'u-semabas',   email: 'semabas@exemplo.test',   doc: { role: 'membro', tabs: [], acesso: 'ativo' } },
  // gravou nas regras antigas, no próprio cadastro: acesso, aprovador e patrimônio (as abas ele não consegue mudar)
  autoAprovado: { uid: 'u-auto', email: 'auto@exemplo.test', doc: { role: 'membro', tabs: [], acesso: 'ativo', acessoAprovadoPor: 'u-admin', patrimonioVerTudo: true } },
  pendente:  { uid: 'u-pendente',  email: 'pendente@exemplo.test',  doc: { role: 'membro', tabs: [], acesso: 'pendente' } },
  comAbasSemAprovacao: { uid: 'u-abas', email: 'abas@exemplo.test', doc: { role: 'membro', tabs: ['agenda', 'gestao'] } },
  bloqueado: { uid: 'u-bloq',      email: 'bloq@exemplo.test',      doc: { role: 'membro', tabs: ['agenda'], acesso: 'bloqueado' } },
  troca:     { uid: 'u-troca',     email: 'troca@exemplo.test',     doc: { role: 'membro', tabs: ['agenda'], acesso: 'ativo', mustChangePassword: true } },
  cliente:   { uid: 'u-cliente',   email: 'cliente@exemplo.test',   doc: { role: 'cliente', tabs: ['condominio'], acesso: 'ativo' } },
  adminPend: { uid: 'u-adminpend', email: 'adminpend@exemplo.test', doc: { role: 'admin', tabs: [], acesso: 'pendente' } },
  // desligado: o admin apagou users/{uid} e gravou acessosRevogados/{uid}; a sessão continua aberta no navegador
  desligado: { uid: 'u-deslig',    email: 'deslig@exemplo.test',    doc: null },
  // conta criada por qualquer pessoa no Auth com o e-mail do robô: não ganha nada (robô é por UID)
  roboEmail: { uid: 'u-robo-falso', email: 'robo@fonsecaebraga.com.br', doc: null },
  robo:      { uid: 'u-robo',      email: 'robo-pc@exemplo.test',   doc: null },
  vetudo:    { uid: 'u-vetudo',    email: 'vetudo@exemplo.test',    doc: { role: 'membro', tabs: ['gestao'], acesso: 'ativo', patrimonioVerTudo: true } },
  antigo:    { uid: 'u-antigo',    email: 'antigo@exemplo.test',    doc: { role: 'membro', tabs: ['agenda'], acesso: 'ativo' } },   // sem patrimonioVerTudo
  lancador:  { uid: 'u-lancador',  email: 'lancador@exemplo.test',  doc: { role: 'membro', tabs: ['gestao'], acesso: 'ativo' } },
};
const db = (p) => env.authenticatedContext(p.uid, { email: p.email }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const autocadastro = (extra) => Object.assign({ email: 'novo@exemplo.test', displayName: 'Novo', role: 'membro', tabs: [], acesso: 'pendente' }, extra || {});

async function semear() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    for (const k of Object.keys(P)) if (P[k].doc) await d.doc('users/' + P[k].uid).set(Object.assign({ email: P[k].email, displayName: 'Pessoa ' + k }, P[k].doc));
    await d.doc('robos/u-robo').set({ descricao: 'robô de teste' });
    await d.doc('users/u-gestor').set({ email: 'gestor@exemplo.test', displayName: 'Gestor', role: 'gestor', tabs: ['gestao'], acesso: 'ativo' });
    await d.doc('users/u-alvo').set({ email: 'alvo@exemplo.test', displayName: 'Alvo', role: 'membro', tabs: [], acesso: 'pendente' });
    await d.doc('acessosRevogados/u-deslig').set({ nome: 'Pessoa desligada' });
    await d.doc('permissoesGestao/u-lancador').set({ lancarHolerites: true });
    await d.doc('permissoesGestao/u-deslig').set({ lancarHolerites: true, patrimonioCadastro: true });   // permissão esquecida
    await d.doc('organograma/u-membro').set({ displayName: 'Pessoa membro', deptoAtual: 'Jurídico' });
    await d.doc('astreaDiario/2026-01-01').set({ itens: [] });
    await d.doc('contadores/c1').set({ n: 1 });
    await d.doc('perfis/u-membro').set({ foto: '' });
    await d.doc('conversas/cv1').set({ participantes: ['u-membro', 'u-outro', 'u-deslig', 'u-bloq'], criadoPor: 'u-membro' });
    await d.doc('conversas/cv1/mensagens/m1').set({ autorUid: 'u-membro', texto: 'oi' });
    await d.doc('holeritesDocs/h-membro').set({ uid: 'u-membro', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-lancador' });
    await d.doc('holeritesDocs/h-membro/partes/0').set({ b64: 'AAAA' });
    await d.doc('holeritesDocs/h-deslig').set({ uid: 'u-deslig', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-lancador' });
    await d.doc('holeritesDocs/g-fgts').set({ tipo: 'fgts', partes: 1, enviadoPorUid: 'u-lancador' });
    await d.doc('pagamentosColaboradores/2026-01').set({ pagos: {} });
    await d.doc('senhasDiversas/s1').set({ titulo: 'fictício' });
    await d.doc('remuneracaoConfig/geral').set({ x: 1 });
    await d.doc('remuneracaoPessoas/u-deslig').set({ liberado: true });
    await d.doc('emailsConferencia/e1').set({ responsavelEmail: 'membro@exemplo.test', status: 'pendente' });
    await d.doc('emailsConferencia/e2').set({ responsavelEmail: 'outro@exemplo.test', status: 'pendente' });
    await d.doc('emailsConferencia/e3').set({ responsavelEmail: 'deslig@exemplo.test', status: 'pendente' });
    await d.doc('patrimonio/p1').set({ nome: 'Notebook', responsavelUid: 'u-outro' });
    await d.doc('patrimonio/p2').set({ nome: 'Monitor', responsavelUid: 'u-membro' });
    await d.doc('patrimonio/p3').set({ nome: 'Cadeira', responsavelUid: 'u-deslig' });
    await d.doc('peticoes_historico/ph1').set({ criadoPor: 'u-outro', nomeArquivo: 'x', docsUrl: 'x' });
    await d.doc('peticoes_historico/ph-deslig').set({ criadoPor: 'u-deslig', nomeArquivo: 'x', docsUrl: 'x' });
    await d.doc('dadosPrivados/numerosStats').set({ json: '{"ficticio":true}' });
    await d.doc('arquivosPrivados/relatorio-ficticio.pdf').set({ nome: 'relatorio-ficticio.pdf', partes: 1 });
    await d.doc('arquivosPrivados/relatorio-ficticio.pdf/partes/0').set({ b64: 'JVBERi0=' });
  });
}

async function main() {
  env = await initializeTestEnvironment({
    projectId: 'demo-portal-regras',
    firestore: { rules: fs.readFileSync(REGRAS, 'utf8'), host: HOST, port: Number(PORTA) },
  });
  await env.clearFirestore();
  await semear();

  let G = '1. Acesso explícito (não depende de abas nem de mustChangePassword)';
  await caso(G, 'anônimo não lê organograma', () => assertFails(anon().doc('organograma/u-membro').get()));
  await caso(G, 'membro aprovado lê organograma', () => assertSucceeds(db(P.membro).doc('organograma/u-membro').get()));
  await caso(G, 'aprovado mas sem nenhuma aba não lê (exige aprovação E aba)', () => assertFails(db(P.semAbas).doc('organograma/u-membro').get()));
  await caso(G, 'autocadastro que se marcou "ativo" antes da publicação (sem abas) não lê', () => assertFails(db(P.autoAprovado).doc('organograma/u-membro').get()));
  await caso(G, '…nem com aprovação forjada (acessoAprovadoPor = admin)', () => assertFails(db(P.autoAprovado).doc('contadores/c1').get()));
  await caso(G, 'pendente não lê organograma', () => assertFails(db(P.pendente).doc('organograma/u-membro').get()));
  await caso(G, 'com abas mas sem aprovação não lê organograma', () => assertFails(db(P.comAbasSemAprovacao).doc('organograma/u-membro').get()));
  await caso(G, 'com abas mas sem aprovação não lê contadores', () => assertFails(db(P.comAbasSemAprovacao).doc('contadores/c1').get()));
  await caso(G, 'bloqueado não lê organograma', () => assertFails(db(P.bloqueado).doc('organograma/u-membro').get()));
  // tirar alguém do organograma (botão "Remover" e a conta de teste, que não é colaborador)
  await caso(G, 'membro não apaga ninguém do organograma', () => assertFails(db(P.membro).doc('organograma/u-membro').delete()));
  await caso(G, 'admin tira uma pessoa do organograma', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await c.firestore().doc('organograma/u-sai').set({ displayName: 'Conta de teste', deptoAtual: '' }); });
    await assertSucceeds(db(P.admin).doc('organograma/u-sai').delete());
  });
  await caso(G, 'admin pendente não age como admin', () => assertFails(db(P.adminPend).doc('pagamentosColaboradores/2026-01').get()));
  await caso(G, 'mustChangePassword não é tratado como prova: aprovado continua aprovado', () => assertSucceeds(db(P.troca).doc('contadores/c1').get()));
  await caso(G, 'cliente não lê contadores (só equipe)', () => assertFails(db(P.cliente).doc('contadores/c1').get()));
  await caso(G, 'membro lê contadores', () => assertSucceeds(db(P.membro).doc('contadores/c1').get()));
  await caso(G, 'pendente lê o próprio cadastro (tela de "aguardando")', () => assertSucceeds(db(P.pendente).doc('users/u-pendente').get()));
  await caso(G, 'membro não lê cadastro de outro', () => assertFails(db(P.membro).doc('users/u-outro').get()));

  G = '2. Ninguém se aprova sozinho';
  await caso(G, 'pendente não se aprova (acesso=ativo)', () => assertFails(db(P.pendente).doc('users/u-pendente').update({ acesso: 'ativo' })));
  await caso(G, 'bloqueado não se desbloqueia', () => assertFails(db(P.bloqueado).doc('users/u-bloq').update({ acesso: 'ativo' })));
  await caso(G, 'membro não muda o próprio papel', () => assertFails(db(P.membro).doc('users/u-membro').update({ role: 'admin' })));
  await caso(G, 'membro não libera abas para si', () => assertFails(db(P.membro).doc('users/u-membro').update({ tabs: ['gestao', 'remuneracao'] })));
  await caso(G, 'membro não altera a própria remuneração', () => assertFails(db(P.membro).doc('users/u-membro').update({ remuneracao: '99999' })));
  await caso(G, 'membro não se dá patrimonioVerTudo', () => assertFails(db(P.membro).doc('users/u-membro').update({ patrimonioVerTudo: true })));
  await caso(G, 'membro não grava a própria auditoria de aprovação', () => assertFails(db(P.membro).doc('users/u-membro').update({ acessoAprovadoPor: 'u-membro' })));
  await caso(G, 'membro atualiza telefone e PIX', () => assertSucceeds(db(P.membro).doc('users/u-membro').update({ telefone: '(00) 0000-0000', pixChave: 'chave-ficticia' })));
  await caso(G, 'membro preenche data de entrada vazia', () => assertSucceeds(db(P.membro).doc('users/u-membro').update({ dataIngresso: '2026-01-02' })));
  await caso(G, 'membro não muda data de entrada já preenchida', () => assertFails(db(P.membro).doc('users/u-membro').update({ dataIngresso: '2020-01-01' })));
  await caso(G, 'quem troca a senha pode zerar mustChangePassword (só aviso de tela)', () => assertSucceeds(db(P.troca).doc('users/u-troca').update({ mustChangePassword: false })));
  await caso(G, 'pendente não edita nem os próprios dados antes da aprovação', () => assertFails(db(P.pendente).doc('users/u-pendente').update({ telefone: '1' })));
  await caso(G, 'membro não altera cadastro de outro', () => assertFails(db(P.membro).doc('users/u-outro').update({ telefone: '1' })));
  await caso(G, 'admin aprova acesso', () => assertSucceeds(db(P.admin).doc('users/u-pendente').update({ acesso: 'ativo' })));
  await env.withSecurityRulesDisabled((c) => c.firestore().doc('users/u-pendente').update({ acesso: 'pendente' }));
  await caso(G, 'admin cria conta de outra pessoa', () => assertSucceeds(db(P.admin).doc('users/u-criado').set({ email: 'c@exemplo.test', displayName: 'C', role: 'membro', tabs: ['agenda'], acesso: 'ativo' })));

  G = '3. Autocadastro direto pelo SDK';
  const novo = env.authenticatedContext('u-novo', { email: 'novo@exemplo.test' }).firestore();
  await caso(G, 'autocadastro já aprovado (acesso=ativo) é negado', () => assertFails(novo.doc('users/u-novo').set(autocadastro({ acesso: 'ativo' }))));
  await caso(G, 'autocadastro como admin é negado', () => assertFails(novo.doc('users/u-novo').set(autocadastro({ role: 'admin' }))));
  await caso(G, 'autocadastro como gestor é negado', () => assertFails(novo.doc('users/u-novo').set(autocadastro({ role: 'gestor' }))));
  await caso(G, 'autocadastro já com abas é negado', () => assertFails(novo.doc('users/u-novo').set(autocadastro({ tabs: ['gestao'] }))));
  await caso(G, 'autocadastro com remuneração é negado', () => assertFails(novo.doc('users/u-novo').set(autocadastro({ remuneracao: '9000' }))));
  await caso(G, 'autocadastro com patrimonioVerTudo é negado', () => assertFails(novo.doc('users/u-novo').set(autocadastro({ patrimonioVerTudo: true }))));
  await caso(G, 'autocadastro com campo de auditoria é negado', () => assertFails(novo.doc('users/u-novo').set(autocadastro({ acessoAprovadoPor: 'u-admin' }))));
  await caso(G, 'autocadastro na conta de outra pessoa é negado', () => assertFails(novo.doc('users/u-x').set(autocadastro())));
  await caso(G, 'autocadastro pendente válido é aceito', () => assertSucceeds(novo.doc('users/u-novo').set(autocadastro({ cpf: '000', deptoAtual: '', patrimonioVerTudo: false }))));
  await caso(G, 'autocadastro grava o próprio perfil (foto) antes da aprovação', () => assertSucceeds(novo.doc('perfis/u-novo').set({ foto: 'data:', nascimento: '2000-01-01' })));
  await caso(G, 'autocadastro grava o próprio espelho do organograma (só nome)', () => assertSucceeds(novo.doc('organograma/u-novo').set({ displayName: 'Novo', email: 'novo@exemplo.test', deptoAtual: '', dataIngresso: '', remuneracao: '' })));
  await caso(G, 'pendente não altera o perfil depois de criado', () => assertFails(novo.doc('perfis/u-novo').update({ foto: 'outra' })));
  await caso(G, 'pendente não cria perfil de outra pessoa', () => assertFails(novo.doc('perfis/u-alvo').set({ foto: 'x' })));
  await caso(G, '…e não dá acesso a nada', () => assertFails(novo.doc('organograma/u-membro').get()));
  await caso(G, '…nem depois de criado ele consegue se aprovar', () => assertFails(novo.doc('users/u-novo').update({ acesso: 'ativo' })));
  await caso(G, 'conta com e-mail do robô criada por terceiro não grava agenda', () => assertFails(db(P.roboEmail).doc('astreaDiario/2026-01-03').set({ itens: ['falso'] })));
  await caso(G, 'conta com e-mail do robô não lê agenda', () => assertFails(db(P.roboEmail).doc('astreaDiario/2026-01-01').get()));

  G = '4. Conta desligada com sessão aberta';
  const D = P.desligado;
  await caso(G, 'desligado não lê organograma', () => assertFails(db(D).doc('organograma/u-membro').get()));
  await caso(G, 'desligado não lê a conversa de que participava', () => assertFails(db(D).doc('conversas/cv1').get()));
  await caso(G, 'desligado não lê mensagens', () => assertFails(db(D).doc('conversas/cv1/mensagens/m1').get()));
  await caso(G, 'desligado não marca mensagem como lida', () => assertFails(db(D).doc('conversas/cv1/mensagens/m1').update({ lidaPor: ['u-deslig'] })));
  await caso(G, 'desligado não envia mensagem', () => assertFails(db(D).collection('conversas/cv1/mensagens').add({ autorUid: 'u-deslig', texto: 'x' })));
  await caso(G, 'desligado não lê o próprio holerite antigo', () => assertFails(db(D).doc('holeritesDocs/h-deslig').get()));
  await caso(G, 'desligado não lê a própria remuneração liberada', () => assertFails(db(D).doc('remuneracaoPessoas/u-deslig').get()));
  await caso(G, 'desligado não lê e-mails da conferência', () => assertFails(db(D).doc('emailsConferencia/e3').get()));
  await caso(G, 'desligado não marca e-mail como respondido', () => assertFails(db(D).doc('emailsConferencia/e3').update({ status: 'respondido' })));
  await caso(G, 'desligado não lê o patrimônio que estava com ele', () => assertFails(db(D).doc('patrimonio/p3').get()));
  await caso(G, 'desligado não usa permissão de Gestão esquecida', () => assertFails(db(D).doc('holeritesDocs/h-x').set({ uid: 'u-membro', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-deslig' })));
  await caso(G, 'desligado não lê o próprio histórico de petições', () => assertFails(db(D).doc('peticoes_historico/ph-deslig').get()));
  await caso(G, 'desligado não grava presença', () => assertFails(db(D).doc('presencaDiaria/u-deslig_2026-01-05').set({ uid: 'u-deslig' })));
  await caso(G, 'desligado não grava o próprio perfil', () => assertFails(db(D).doc('perfis/u-deslig').set({ foto: 'x' })));
  await caso(G, 'desligado não recria o próprio cadastro (autocadastro)', () => assertFails(db(D).doc('users/u-deslig').set(autocadastro({ email: 'deslig@exemplo.test' }))));
  await caso(G, 'desligado não recria o espelho do organograma', () => assertFails(db(D).doc('organograma/u-deslig').set({ displayName: 'X', email: 'deslig@exemplo.test', deptoAtual: '', dataIngresso: '', remuneracao: '' })));
  await caso(G, 'desligado não apaga a própria marca de revogação', () => assertFails(db(D).doc('acessosRevogados/u-deslig').delete()));
  await caso(G, 'desligado não lê a própria marca de revogação', () => assertFails(db(D).doc('acessosRevogados/u-deslig').get()));
  await caso(G, 'bloqueado não lê mensagens da conversa', () => assertFails(db(P.bloqueado).doc('conversas/cv1/mensagens/m1').get()));

  G = '5. Robô por UID sob controle do admin';
  await caso(G, 'robô cadastrado (robos/{uid}) grava agenda', () => assertSucceeds(db(P.robo).doc('astreaDiario/2026-01-02').set({ itens: [] })));
  await caso(G, 'robô cadastrado grava delta', () => assertSucceeds(db(P.robo).doc('astreaDelta/2026-01-02').set({ x: 1 })));
  await caso(G, 'robô lê o próprio registro', () => assertSucceeds(db(P.robo).doc('robos/u-robo').get()));
  await caso(G, 'membro não se cadastra como robô', () => assertFails(db(P.membro).doc('robos/u-membro').set({ descricao: 'eu' })));
  await caso(G, 'conta nova não se cadastra como robô', () => assertFails(novo.doc('robos/u-novo').set({ descricao: 'eu' })));
  await caso(G, 'conta com e-mail do robô não se cadastra como robô', () => assertFails(db(P.roboEmail).doc('robos/u-robo-falso').set({ descricao: 'eu' })));
  await caso(G, 'robô não altera o próprio registro', () => assertFails(db(P.robo).doc('robos/u-robo').set({ descricao: 'outro' })));
  await caso(G, 'membro não lista robôs', () => assertFails(db(P.membro).collection('robos').get()));
  await caso(G, 'admin cadastra robô', () => assertSucceeds(db(P.admin).doc('robos/u-robo-novo').set({ descricao: 'teste' })));
  await caso(G, 'membro não grava agenda Astrea', () => assertFails(db(P.membro).doc('astreaDiario/2026-01-01').set({ itens: ['falso'] })));
  await caso(G, 'cliente não lê agenda Astrea', () => assertFails(db(P.cliente).doc('astreaDiario/2026-01-01').get()));
  await caso(G, 'robô não lê cadastros de pessoas', () => assertFails(db(P.robo).doc('users/u-membro').get()));

  G = '6. Patrimônio só com marcação explícita';
  await caso(G, 'sem o campo (cadastro antigo) não vê patrimônio de outro', () => assertFails(db(P.antigo).doc('patrimonio/p1').get()));
  await caso(G, 'sem o campo não lista o patrimônio inteiro', () => assertFails(db(P.antigo).collection('patrimonio').get()));
  await caso(G, 'patrimonioVerTudo=false não vê patrimônio de outro', () => assertFails(db(P.membro).doc('patrimonio/p1').get()));
  await caso(G, 'marcado em "Quem vê tudo" lê patrimônio de outro', () => assertSucceeds(db(P.vetudo).doc('patrimonio/p1').get()));
  await caso(G, 'admin lê qualquer patrimônio', () => assertSucceeds(db(P.admin).doc('patrimonio/p1').get()));
  await caso(G, 'membro lê o patrimônio sob a própria responsabilidade', () => assertSucceeds(db(P.membro).doc('patrimonio/p2').get()));
  await caso(G, 'membro lista só o próprio patrimônio (consulta filtrada)', () => assertSucceeds(db(P.membro).collection('patrimonio').where('responsavelUid', '==', 'u-membro').get()));
  await caso(G, 'pendente não lê nem o patrimônio próprio', () => assertFails(db(P.pendente).collection('patrimonio').where('responsavelUid', '==', 'u-pendente').get()));

  G = '7. Dados que saíram do site público';
  await caso(G, 'anônimo não lê o painel de Números', () => assertFails(anon().doc('dadosPrivados/numerosStats').get()));
  await caso(G, 'pendente não lê o painel de Números', () => assertFails(db(P.pendente).doc('dadosPrivados/numerosStats').get()));
  await caso(G, 'desligado não lê o painel de Números', () => assertFails(db(D).doc('dadosPrivados/numerosStats').get()));
  await caso(G, 'cliente não lê o painel de Números', () => assertFails(db(P.cliente).doc('dadosPrivados/numerosStats').get()));
  await caso(G, 'membro lê o painel de Números', () => assertSucceeds(db(P.membro).doc('dadosPrivados/numerosStats').get()));
  await caso(G, 'membro não altera o painel de Números', () => assertFails(db(P.membro).doc('dadosPrivados/numerosStats').set({ json: '{}' })));
  await caso(G, 'membro baixa partes do relatório', () => assertSucceeds(db(P.membro).doc('arquivosPrivados/relatorio-ficticio.pdf/partes/0').get()));
  await caso(G, 'cliente não baixa relatório', () => assertFails(db(P.cliente).doc('arquivosPrivados/relatorio-ficticio.pdf/partes/0').get()));
  await caso(G, 'membro não troca o relatório', () => assertFails(db(P.membro).doc('arquivosPrivados/relatorio-ficticio.pdf/partes/0').set({ b64: 'x' })));
  await caso(G, 'admin atualiza o painel', () => assertSucceeds(db(P.admin).doc('dadosPrivados/numerosStats').set({ json: '{}' })));

  G = '8. Demais isolamentos';
  await caso(G, 'admin não grava remuneração no organograma', () => assertFails(db(P.admin).doc('organograma/u-membro').set({ remuneracao: '5000' }, { merge: true })));
  await caso(G, 'admin não grava custos no organograma', () => assertFails(db(P.admin).doc('organograma/u-membro').set({ custos: { vt: 1 } }, { merge: true })));
  await caso(G, 'admin atualiza departamento no organograma', () => assertSucceeds(db(P.admin).doc('organograma/u-membro').set({ deptoAtual: 'Condomínio' }, { merge: true })));
  await caso(G, 'autocriação do espelho com salário é negada', () => assertFails(db(P.outro).doc('organograma/u-outro').set({ displayName: 'Outro', email: 'outro@exemplo.test', deptoAtual: '', dataIngresso: '', remuneracao: '100' })));
  await caso(G, 'autocriação do espelho só com nome é aceita', () => assertSucceeds(db(P.outro).doc('organograma/u-outro').set({ displayName: 'Outro', email: 'outro@exemplo.test', deptoAtual: '', dataIngresso: '', remuneracao: '' })));
  await caso(G, 'membro marca a própria presença', () => assertSucceeds(db(P.membro).doc('presencaDiaria/u-membro_2026-01-05').set({ uid: 'u-membro' })));
  await caso(G, 'membro não marca presença com docId de outro', () => assertFails(db(P.membro).doc('presencaDiaria/u-outro_2026-01-05').set({ uid: 'u-membro' })));
  await caso(G, 'participante lê a mensagem', () => assertSucceeds(db(P.membro).doc('conversas/cv1/mensagens/m1').get()));
  await caso(G, 'não participante não lê a mensagem', () => assertFails(db(P.admin).doc('conversas/cv1/mensagens/m1').get()));
  await caso(G, 'participante não envia mensagem como outro autor', () => assertFails(db(P.outro).collection('conversas/cv1/mensagens').add({ autorUid: 'u-membro', texto: 'forjada' })));
  await caso(G, 'colaborador lê o próprio holerite', () => assertSucceeds(db(P.membro).doc('holeritesDocs/h-membro').get()));
  await caso(G, 'outro colaborador não lê holerite alheio', () => assertFails(db(P.outro).doc('holeritesDocs/h-membro/partes/0').get()));
  await caso(G, 'colaborador não lê guia de FGTS', () => assertFails(db(P.membro).doc('holeritesDocs/g-fgts').get()));
  await caso(G, 'quem lança envia holerite', () => assertSucceeds(db(P.lancador).doc('holeritesDocs/h-novo').set({ uid: 'u-outro', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-lancador' })));
  await caso(G, 'membro não lê pagamentos', () => assertFails(db(P.membro).doc('pagamentosColaboradores/2026-01').get()));
  await caso(G, 'membro sem permissão não lê senhas', () => assertFails(db(P.membro).doc('senhasDiversas/s1').get()));
  await caso(G, 'admin comum (não dono) não lê remuneração', () => assertFails(db(P.admin).doc('remuneracaoConfig/geral').get()));
  await caso(G, 'responsável não lê e-mail de outro responsável', () => assertFails(db(P.membro).doc('emailsConferencia/e2').get()));
  await caso(G, 'membro não lê histórico de petições de outro', () => assertFails(db(P.membro).doc('peticoes_historico/ph1').get()));
  await caso(G, 'membro não lê auditoria de segurança', () => assertFails(db(P.membro).collection('auditoriaSeguranca').get()));
  await caso(G, 'admin não apaga registro de auditoria', () => assertFails(db(P.admin).doc('auditoriaSeguranca/a1').delete()));

  G = '9. Administração (migração, aprovação, revogação, robôs, dados privados) só por admin ativo — chamadas diretas pelo SDK';
  const atores = { membro: P.membro, gestor: { uid: 'u-gestor', email: 'gestor@exemplo.test' }, cliente: P.cliente, pendente: P.pendente, 'admin pendente': P.adminPend, bloqueado: P.bloqueado };
  // FieldValue do mesmo SDK que o rules-unit-testing usa (carregar outro SDK conflita)
  const fbCompat = require('firebase/compat/app'); const FV = (fbCompat.default || fbCompat).firestore.FieldValue;   // mesmo módulo em cache que o rules-unit-testing já carregou
  const TS = () => FV.serverTimestamp();
  const tentativas = [
    ['aprova outra pessoa (users.acesso)', (d) => d.doc('users/u-alvo').update({ acesso: 'ativo' })],
    ['revoga outra pessoa (users.acesso=bloqueado)', (d) => d.doc('users/u-outro').update({ acesso: 'bloqueado', tabs: [] })],
    ['dá patrimonioVerTudo a outra pessoa', (d) => d.doc('users/u-outro').update({ patrimonioVerTudo: true })],
    ['libera abas para outra pessoa', (d) => d.doc('users/u-alvo').update({ tabs: ['gestao'] })],
    ['apaga cadastro de outra pessoa', (d) => d.doc('users/u-alvo').delete()],
    ['lista todos os cadastros', (d) => d.collection('users').get()],
    ['cria marca de revogação', (d) => d.doc('acessosRevogados/u-alvo').set({ nome: 'x' })],
    ['apaga marca de revogação de um desligado', (d) => d.doc('acessosRevogados/u-deslig').delete()],
    ['lista marcas de revogação', (d) => d.collection('acessosRevogados').get()],
    ['cadastra robô (UID alheia)', (d) => d.doc('robos/u-alvo').set({ descricao: 'x' })],
    ['apaga o robô do escritório', (d) => d.doc('robos/u-robo').delete()],
    ['grava registro de auditoria', (d) => d.collection('auditoriaSeguranca').add({ porUid: 'u-membro', em: TS(), acao: 'x' })],
    ['grava dado privado (painel)', (d) => d.doc('dadosPrivados/numerosStats').set({ json: '{}' })],
    ['grava arquivo privado', (d) => d.doc('arquivosPrivados/falso.pdf').set({ nome: 'falso.pdf', partes: 0 })],
    ['dá a si permissão de Gestão', (d) => d.doc('permissoesGestao/' + d._uid).set({ lancarHolerites: true, patrimonioCadastro: true })],
    ['marca pagamento de colaborador', (d) => d.doc('pagamentosColaboradores/2026-01').set({ pagos: { x: true } })],
  ];
  for (const [nomeAtor, ator] of Object.entries(atores)) {
    for (const [acao, fn] of tentativas) {
      await caso(G, nomeAtor + ' não ' + acao, () => { const d = db(ator); d._uid = ator.uid; return assertFails(fn(d)); });
    }
  }
  // controles positivos: o admin ativo consegue cada operação
  const A = db(P.admin); A._uid = P.admin.uid;
  await caso(G, 'admin ativo aprova', () => assertSucceeds(A.doc('users/u-alvo').update({ acesso: 'ativo' })));
  await caso(G, 'admin ativo revoga', () => assertSucceeds(A.doc('users/u-alvo').update({ acesso: 'bloqueado', tabs: [] })));
  await caso(G, 'admin ativo grava marca de revogação', () => assertSucceeds(A.doc('acessosRevogados/u-alvo').set({ nome: 'x' })));
  await caso(G, 'admin ativo apaga marca de revogação (recontratação)', () => assertSucceeds(A.doc('acessosRevogados/u-alvo').delete()));
  await caso(G, 'admin ativo cadastra e remove robô', async () => { await assertSucceeds(A.doc('robos/u-robo-x').set({ descricao: 'x' })); await assertSucceeds(A.doc('robos/u-robo-x').delete()); });
  await caso(G, 'admin ativo grava auditoria (com o próprio uid e hora do servidor)', () => assertSucceeds(A.collection('auditoriaSeguranca').add({ porUid: 'u-admin', em: TS(), acao: 'teste' })));
  await caso(G, 'admin não grava auditoria em nome de outro', () => assertFails(A.collection('auditoriaSeguranca').add({ porUid: 'u-membro', em: TS(), acao: 'x' })));
  await caso(G, 'admin ativo grava dado privado', () => assertSucceeds(A.doc('dadosPrivados/condominios').set({ json: '{}' })));

  G = '10. Áreas restritas (Números › Clientes/Juízo/Efetividade, Contratos, Remuneração, Gestão › Colaboradores)';
  const NUM = 'numeros-do-escritorio-mscj8kts', CONTR = 'contratos-msmo451y', REM = 'remuneracao-variavel-mvrhiayb', GEST = 'gestao-mt9hdjwf';
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await d.doc('users/u-numcomum').set({ email: 'numcomum@exemplo.test', role: 'membro', acesso: 'ativo', tabs: [NUM] });   // sem escolha de sub-abas
    await d.doc('users/u-numcli').set({ email: 'numcli@exemplo.test', role: 'membro', acesso: 'ativo', tabs: [NUM, CONTR], subtabs: { [NUM]: ['geral', 'clientes'] } });
    await d.doc('users/u-semaba').set({ email: 'semaba@exemplo.test', role: 'membro', acesso: 'ativo', tabs: ['agenda'], subtabs: { [NUM]: ['clientes'] } });   // sub-aba sem a aba
    await d.doc('users/u-alvo2').set({ email: 'alvo2@exemplo.test', role: 'membro', acesso: 'ativo', tabs: ['agenda'] });
    for (const k of ['numerosClientes', 'numerosJuizo', 'numerosEfetividade']) await d.doc('dadosPrivados/' + k).set({ json: '{}' });
    await d.doc('contratosGerados/c-1').set({ criadoPorUid: 'u-numcli', tipo: 'x', nomeDisplay: 'x', dados: {} });
  });
  const pessoa = (uid, email, authTime) => env.authenticatedContext(uid, Object.assign({ email }, authTime ? { auth_time: authTime } : {})).firestore();
  const agora = Math.floor(Date.now() / 1000);
  const comum = pessoa('u-numcomum', 'numcomum@exemplo.test'), liberado = pessoa('u-numcli', 'numcli@exemplo.test'), semAba = pessoa('u-semaba', 'semaba@exemplo.test');
  await caso(G, 'membro com a aba Números lê o geral', () => assertSucceeds(comum.doc('dadosPrivados/numerosStats').get()));
  for (const k of ['numerosClientes', 'numerosJuizo', 'numerosEfetividade'])
    await caso(G, `membro com a aba Números, sem liberação, NÃO lê ${k} (sem escolha salva não libera área restrita)`, () => assertFails(comum.doc('dadosPrivados/' + k).get()));
  await caso(G, 'membro liberado em Clientes lê numerosClientes', () => assertSucceeds(liberado.doc('dadosPrivados/numerosClientes').get()));
  await caso(G, '... e não lê numerosJuizo (não liberado)', () => assertFails(liberado.doc('dadosPrivados/numerosJuizo').get()));
  await caso(G, 'sub-aba restrita sem a aba Números não libera', () => assertFails(semAba.doc('dadosPrivados/numerosClientes').get()));
  await caso(G, 'cliente não lê numerosClientes', () => assertFails(db(P.cliente).doc('dadosPrivados/numerosClientes').get()));
  await caso(G, 'admin lê numerosEfetividade', () => assertSucceeds(db(P.admin).doc('dadosPrivados/numerosEfetividade').get()));
  await caso(G, 'membro sem a aba Contratos NÃO lê contratos gerados', () => assertFails(comum.doc('contratosGerados/c-1').get()));
  await caso(G, 'membro sem a aba Contratos NÃO gera contrato', () => assertFails(comum.collection('contratosGerados').add({ criadoPorUid: 'u-numcomum', tipo: 'x', nomeDisplay: 'x', dados: {} })));
  await caso(G, 'membro com a aba Contratos lê e gera', async () => {
    await assertSucceeds(liberado.doc('contratosGerados/c-1').get());
    await assertSucceeds(liberado.collection('contratosGerados').add({ criadoPorUid: 'u-numcli', tipo: 'x', nomeDisplay: 'x', dados: {} }));
  });
  const adminVelho = pessoa(P.admin.uid, P.admin.email, agora - 3600), adminRecente = pessoa(P.admin.uid, P.admin.email, agora - 30);
  await caso(G, 'admin SEM senha recente não libera Contratos', () => assertFails(adminVelho.doc('users/u-alvo2').update({ tabs: ['agenda', CONTR] })));
  await caso(G, 'admin SEM senha recente não libera Remuneração variável', () => assertFails(adminVelho.doc('users/u-alvo2').update({ tabs: ['agenda', REM] })));
  await caso(G, 'admin SEM senha recente não libera Números › Clientes', () => assertFails(adminVelho.doc('users/u-alvo2').update({ tabs: ['agenda', NUM], subtabs: { [NUM]: ['clientes'] } })));
  await caso(G, 'admin SEM senha recente não libera Gestão › Colaboradores', () => assertFails(adminVelho.doc('users/u-alvo2').update({ tabs: ['agenda', GEST], subtabs: { [GEST]: ['colaboradores'] } })));
  await caso(G, 'admin SEM senha recente não cria conta já com área restrita', () => assertFails(adminVelho.doc('users/u-novo-restrito').set({ email: 'n@exemplo.test', role: 'membro', acesso: 'ativo', tabs: [CONTR] })));
  await caso(G, 'admin SEM senha recente libera abas comuns (Números sem sub-abas restritas)', () => assertSucceeds(adminVelho.doc('users/u-alvo2').update({ tabs: ['agenda', NUM], subtabs: { [NUM]: ['geral', 'qualidade'] } })));
  await caso(G, 'admin COM senha recente libera Números › Clientes e Contratos', () => assertSucceeds(adminRecente.doc('users/u-alvo2').update({ tabs: ['agenda', NUM, CONTR], subtabs: { [NUM]: ['geral', 'clientes'] } })));
  await caso(G, 'admin SEM senha recente pode RETIRAR área restrita', () => assertSucceeds(adminVelho.doc('users/u-alvo2').update({ tabs: ['agenda', NUM], subtabs: { [NUM]: ['geral'] } })));
  await caso(G, 'membro não se dá área restrita', () => assertFails(liberado.doc('users/u-numcli').update({ subtabs: { [NUM]: ['geral', 'clientes', 'juizo'] } })));

  G = '11. Lembrete de holerites: quem lança vê só a lista, não o arquivo';
  await caso(G, 'quem lança lista os holerites de uma competência (para saber quem falta)', () => assertSucceeds(db(P.lancador).collection('holeritesDocs').where('competencia', '==', '2026-10').get()));
  await caso(G, 'quem lança NÃO baixa o arquivo do holerite de outra pessoa', () => assertFails(db(P.lancador).doc('holeritesDocs/h-membro/partes/0').get()));
  await caso(G, 'membro sem a permissão NÃO lista os holerites', () => assertFails(db(P.outro).collection('holeritesDocs').where('competencia', '==', '2026-10').get()));

  G = '12. Histórico do Criador de Documentos (mesma coleção dos Contratos, tipos próprios)';
  const DOCS_TIPOS = ['procuracao', 'substabelecimento', 'hipossuficiencia', 'termo_repasse', 'recibo', 'carta_preposicao', 'peticao_ciencia'];
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await d.doc('contratosGerados/doc-proc').set({ criadoPorUid: 'u-outro', tipo: 'procuracao', nomeDisplay: 'x', dados: {} });
    await d.doc('contratosGerados/doc-contrato').set({ criadoPorUid: 'u-outro', tipo: 'contrato_pf', nomeDisplay: 'x', dados: {} });
  });
  await caso(G, 'membro sem a aba Contratos grava no histórico do Criador (petição de ciência)', () => assertSucceeds(comum.collection('contratosGerados').add({ criadoPorUid: 'u-numcomum', tipo: 'peticao_ciencia', nomeDisplay: 'x', dados: {} })));
  await caso(G, 'membro sem a aba Contratos lista o histórico do Criador (consulta só com os tipos do Criador)', () => assertSucceeds(comum.collection('contratosGerados').where('tipo', 'in', DOCS_TIPOS).get()));
  await caso(G, 'membro sem a aba Contratos lê um documento do Criador', () => assertSucceeds(comum.doc('contratosGerados/doc-proc').get()));
  await caso(G, 'membro sem a aba Contratos NÃO lê contrato', () => assertFails(comum.doc('contratosGerados/doc-contrato').get()));
  await caso(G, 'membro sem a aba Contratos NÃO lista tudo (consulta sem filtro de tipo)', () => assertFails(comum.collection('contratosGerados').get()));
  await caso(G, 'membro sem a aba Contratos NÃO grava contrato', () => assertFails(comum.collection('contratosGerados').add({ criadoPorUid: 'u-numcomum', tipo: 'contrato_pf', nomeDisplay: 'x', dados: {} })));
  await caso(G, 'cliente NÃO usa o histórico do Criador', () => assertFails(db(P.cliente).collection('contratosGerados').where('tipo', 'in', DOCS_TIPOS).get()));
  await caso(G, 'quem tem a aba Contratos lista tudo', () => assertSucceeds(liberado.collection('contratosGerados').get()));

  G = '13. Isolamento entre clientes (síndico/conselheiro não lê dados internos da equipe)';
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await d.doc('sugestoes/sg1').set({ autorUid: 'u-membro', status: 'aberta', texto: 'x' });
    await d.doc('condoUnidades/cond-a').set({ unidades: 10 });
    await d.doc('unidadeResets/r1').set({ condominioSlug: 'cond-a' });
    await d.doc('materiaisMarca/m1').set({ nome: 'x' });
    await d.doc('emailsConferenciaMeta/ultima').set({ em: 1 });
    await d.doc('condoAprovadores/cond-a').set({ aprovadorUid: 'u-cliente' });
    await d.doc('condoAprovadores/cond-b').set({ aprovadorUid: 'u-membro' });
    await d.doc('notificacoesGeradas/n-a').set({ condominioSlug: 'cond-a', status: 'pendente', texto: 'x', criadoPorUid: 'u-membro' });
    await d.doc('notificacoesGeradas/n-b').set({ condominioSlug: 'cond-b', status: 'pendente', texto: 'x', criadoPorUid: 'u-membro' });
    await d.doc('perfis/u-cliente').set({ foto: '' });
  });
  const cli = db(P.cliente);
  for (const [nome, caminho] of [['perfil de colega', 'perfis/u-membro'], ['organograma', 'organograma/u-membro'], ['sugestões', 'sugestoes/sg1'],
                                 ['unidades do condomínio', 'condoUnidades/cond-a'], ['zeragem de unidades', 'unidadeResets/r1'], ['materiais da marca', 'materiaisMarca/m1'],
                                 ['conferência de e-mails', 'emailsConferenciaMeta/ultima'], ['notificação de outro condomínio', 'notificacoesGeradas/n-b'],
                                 ['aprovador de outro condomínio', 'condoAprovadores/cond-b']])
    await caso(G, 'cliente NÃO lê ' + nome, () => assertFails(cli.doc(caminho).get()));
  await caso(G, 'cliente NÃO lista todas as notificações', () => assertFails(cli.collection('notificacoesGeradas').get()));
  await caso(G, 'cliente lê o próprio perfil', () => assertSucceeds(cli.doc('perfis/u-cliente').get()));
  await caso(G, 'síndico aprovador lê o próprio vínculo de aprovador', () => assertSucceeds(cli.collection('condoAprovadores').where('aprovadorUid', '==', 'u-cliente').get()));
  await caso(G, 'síndico aprovador lê as notificações do PRÓPRIO condomínio', () => assertSucceeds(cli.collection('notificacoesGeradas').where('condominioSlug', 'in', ['cond-a']).get()));
  await caso(G, 'síndico aprovador aprova notificação do próprio condomínio', () => assertSucceeds(cli.doc('notificacoesGeradas/n-a').update({ status: 'aprovada', decididoPorUid: 'u-cliente' })));
  await caso(G, 'cliente NÃO cria notificação', () => assertFails(cli.collection('notificacoesGeradas').add({ criadoPorUid: 'u-cliente', status: 'pendente', tentativa: 1, condominio: 'A', condominioSlug: 'cond-a', texto: 'x' })));
  await caso(G, 'membro continua lendo organograma, perfis e sugestões', async () => {
    await assertSucceeds(db(P.membro).doc('organograma/u-membro').get());
    await assertSucceeds(db(P.membro).doc('perfis/u-membro').get());
    await assertSucceeds(db(P.membro).collection('sugestoes').get());
  });

  G = '14. Sessões de Julgamento (conselho do condomínio)';
  const CONS = { uid: 'u-cons', email: 'cons@exemplo.test' }, OUTRO_CONS = { uid: 'u-cons2', email: 'cons2@exemplo.test' }, SEM_VINC = { uid: 'u-cons3', email: 'cons3@exemplo.test' };
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    for (const p of [CONS, OUTRO_CONS, SEM_VINC]) await d.doc('users/' + p.uid).set({ email: p.email, displayName: p.uid, role: 'cliente', tabs: ['sessoes'], acesso: 'ativo' });
    await d.doc('users/u-cons-pend').set({ email: 'pend@exemplo.test', role: 'cliente', tabs: ['sessoes'], acesso: 'pendente' });
    await d.doc('conselhoMembros/u-cons').set({ condominios: { 'cond-a': 'conselheiro' } });
    await d.doc('conselhoMembros/u-cons2').set({ condominios: { 'cond-b': 'sindico' } });
    await d.doc('conselhoMembros/u-cons-pend').set({ condominios: { 'cond-a': 'conselheiro' } });
    await d.doc('sessoesJulgamento/s-a').set({ condominioSlug: 'cond-a', liberada: true, titulo: 'x' });
    await d.doc('sessoesJulgamento/s-a2').set({ condominioSlug: 'cond-a', liberada: false, titulo: 'rascunho' });
    await d.doc('recursosJulgamento/r-a').set({ condominioSlug: 'cond-a', sessaoId: 's-a', liberado: true, ocorrencia: '1' });
    await d.doc('recursosJulgamento/r-a2').set({ condominioSlug: 'cond-a', sessaoId: 's-a2', liberado: false, ocorrencia: '2' });
    await d.doc('recursosJulgamento/r-b').set({ condominioSlug: 'cond-b', sessaoId: 's-b', liberado: true, ocorrencia: '3' });
  });
  const cons = db(CONS);
  await caso(G, 'conselheiro lista as sessões liberadas do próprio condomínio', () => assertSucceeds(cons.collection('sessoesJulgamento').where('condominioSlug', '==', 'cond-a').where('liberada', '==', true).get()));
  await caso(G, 'conselheiro lista os recursos liberados do próprio condomínio', () => assertSucceeds(cons.collection('recursosJulgamento').where('condominioSlug', '==', 'cond-a').where('liberado', '==', true).get()));
  await caso(G, 'conselheiro NÃO lê sessão em rascunho', () => assertFails(cons.doc('sessoesJulgamento/s-a2').get()));
  await caso(G, 'conselheiro NÃO lê recurso ainda não liberado', () => assertFails(cons.doc('recursosJulgamento/r-a2').get()));
  await caso(G, 'conselheiro NÃO lê recurso de OUTRO condomínio', () => assertFails(cons.doc('recursosJulgamento/r-b').get()));
  await caso(G, 'conselheiro NÃO lista sem filtrar pelo condomínio', () => assertFails(cons.collection('recursosJulgamento').where('liberado', '==', true).get()));
  await caso(G, 'conselheiro NÃO altera recurso (nem lança decisão)', () => assertFails(cons.doc('recursosJulgamento/r-a').update({ decisao: { resultado: 'cancelada' } })));
  await caso(G, 'conselheiro NÃO se vincula a outro condomínio', () => assertFails(cons.doc('conselhoMembros/u-cons').set({ condominios: { 'cond-a': 'conselheiro', 'cond-b': 'sindico' } })));
  await caso(G, 'conselheiro lê o próprio vínculo', () => assertSucceeds(cons.doc('conselhoMembros/u-cons').get()));
  await caso(G, 'conselheiro NÃO lê o vínculo de outra pessoa', () => assertFails(cons.doc('conselhoMembros/u-cons2').get()));
  await caso(G, 'cliente sem vínculo NÃO lê sessão liberada', () => assertFails(db(SEM_VINC).doc('sessoesJulgamento/s-a').get()));
  await caso(G, 'cadastro pendente com vínculo NÃO lê nada', () => assertFails(db({ uid: 'u-cons-pend', email: 'pend@exemplo.test' }).doc('sessoesJulgamento/s-a').get()));
  await caso(G, 'conselheiro marca "analisei" num recurso do próprio condomínio', () => assertSucceeds(cons.doc('leiturasJulgamento/u-cons_r-a').set({ uid: 'u-cons', nome: 'x', recursoId: 'r-a', sessaoId: 's-a', condominioSlug: 'cond-a' })));
  await caso(G, 'conselheiro NÃO marca "analisei" fingindo que o recurso é do condomínio dele', () => assertFails(cons.doc('leiturasJulgamento/u-cons_r-b').set({ uid: 'u-cons', nome: 'x', recursoId: 'r-b', sessaoId: 's-b', condominioSlug: 'cond-a' })));
  await caso(G, 'conselheiro grava anotação particular', () => assertSucceeds(cons.doc('anotacoesJulgamento/u-cons_r-a').set({ uid: 'u-cons', recursoId: 'r-a', texto: 'nota' })));
  await caso(G, 'outra pessoa NÃO lê a anotação particular (nem a equipe)', async () => {
    await assertFails(db(OUTRO_CONS).doc('anotacoesJulgamento/u-cons_r-a').get());
    await assertFails(db(P.membro).doc('anotacoesJulgamento/u-cons_r-a').get());
  });
  await caso(G, 'conselheiro registra a abertura de uma prova (auditoria)', () => assertSucceeds(cons.collection('acessosProvasJulgamento').add({ uid: 'u-cons', recursoId: 'r-a', condominioSlug: 'cond-a', arquivo: 'x', em: TS() })));
  await caso(G, 'conselheiro NÃO forja a hora nem o autor da auditoria', async () => {
    await assertFails(cons.collection('acessosProvasJulgamento').add({ uid: 'u-cons', recursoId: 'r-a', condominioSlug: 'cond-a', arquivo: 'x', em: new Date(2020, 0, 1) }));
    await assertFails(cons.collection('acessosProvasJulgamento').add({ uid: 'u-cons2', recursoId: 'r-a', condominioSlug: 'cond-a', arquivo: 'x', em: TS() }));
  });
  await caso(G, 'conselheiro NÃO lê a auditoria', () => assertFails(cons.collection('acessosProvasJulgamento').get()));
  await caso(G, 'equipe cria sessão e recurso e lança a decisão', async () => {
    const m = db(P.membro);
    await assertSucceeds(m.doc('sessoesJulgamento/s-nova').set({ condominioSlug: 'cond-a', liberada: false, titulo: 'x' }));
    await assertSucceeds(m.doc('recursosJulgamento/r-novo').set({ condominioSlug: 'cond-a', sessaoId: 's-nova', liberado: false, ocorrencia: '9' }));
    await assertSucceeds(m.doc('recursosJulgamento/r-novo').update({ decisao: { resultado: 'mantida' } }));
  });
  await caso(G, 'equipe lê a auditoria e quem já analisou', async () => {
    await assertSucceeds(db(P.membro).collection('acessosProvasJulgamento').get());
    await assertSucceeds(db(P.membro).collection('leiturasJulgamento').get());
  });
  await caso(G, 'só o admin vincula conselheiros', async () => {
    await assertFails(db(P.membro).doc('conselhoMembros/u-cons3').set({ condominios: { 'cond-a': 'conselheiro' } }));
    await assertSucceeds(db(P.admin).doc('conselhoMembros/u-cons3').set({ condominios: { 'cond-a': 'conselheiro' } }));
  });

  await env.cleanup();
  let falhas = 0, grupoAtual = '';
  for (const [st, grupo, nome] of resultados) {
    if (grupo !== grupoAtual) { console.log('\n' + grupo); grupoAtual = grupo; }
    if (st !== 'ok') falhas++;
    console.log((st === 'ok' ? '  ✓ ' : '  ✗ ') + nome);
  }
  console.log('\nFirestore: ' + (resultados.length - falhas) + ' de ' + resultados.length + ' casos passaram (' + falhas + ' reprovados). Regras: ' + REGRAS);
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
