// Verificação das FUNÇÕES do portal contra as regras (leitura, criação, edição e exclusão, inclusive registros antigos).
// Cada cenário usa o mesmo formato de dados que a ferramenta grava (copiado do código) e diz o esperado:
//   'permitir' = função legítima;  'negar' = acesso indevido.
// Rode contra as regras novas e contra as de produção (REGRAS_ARQUIVO) e compare com comparar-funcoes.js:
// assim se separa "bloqueado de propósito" de "função legítima que parou". Dados fictícios.
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fbCompat = require('firebase/compat/app');
const FV = (fbCompat.default || fbCompat).firestore.FieldValue;
const TS = () => FV.serverTimestamp();

const REGRAS = process.env.REGRAS_ARQUIVO || path.resolve(__dirname, '..', '..', 'firestore.rules');
const SAIDA = process.env.SAIDA_JSON || '';
const [HOST, PORTA] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
let env;
const res = [];

const ativo = { acesso: 'ativo' };
const P = {
  admin:    { uid: 'u-admin', email: 'admin@exemplo.test', doc: Object.assign({ role: 'admin', tabs: [] }, ativo) },
  dono:     { uid: 'u-dono', email: 'jonathan@fonsecaebraga.com.br', doc: Object.assign({ role: 'admin', tabs: ['remuneracao'] }, ativo) },
  gestor:   { uid: 'u-gestor', email: 'gestor@exemplo.test', doc: Object.assign({ role: 'gestor', tabs: ['anotacoes'] }, ativo) },
  membro:   { uid: 'u-membro', email: 'membro@exemplo.test', doc: Object.assign({ role: 'membro', tabs: ['anotacoes', 'documentos'], patrimonioVerTudo: false }, ativo) },
  colega:   { uid: 'u-colega', email: 'colega@exemplo.test', doc: Object.assign({ role: 'membro', tabs: ['anotacoes'] }, ativo) },
  lancador: { uid: 'u-lanc', email: 'lanc@exemplo.test', doc: Object.assign({ role: 'membro', tabs: ['gestao'] }, ativo) },
  senhas:   { uid: 'u-senhas', email: 'senhas@exemplo.test', doc: Object.assign({ role: 'membro', tabs: ['gestao'] }, ativo) },
  patcad:   { uid: 'u-patcad', email: 'patcad@exemplo.test', doc: Object.assign({ role: 'membro', tabs: ['gestao'] }, ativo) },
  cliente:  { uid: 'u-cliente', email: 'sindico@exemplo.test', doc: Object.assign({ role: 'cliente', tabs: ['condominios'] }, ativo) },
  pendente: { uid: 'u-pend', email: 'pend@exemplo.test', doc: { role: 'membro', tabs: [], acesso: 'pendente' } },
  deslig:   { uid: 'u-deslig', email: 'deslig@exemplo.test', doc: null },
};
const db = (p) => env.authenticatedContext(p.uid, { email: p.email }).firestore();

async function semear() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    for (const k of Object.keys(P)) if (P[k].doc) await d.doc('users/' + P[k].uid).set(Object.assign({ email: P[k].email, displayName: 'Pessoa ' + k }, P[k].doc));
    await d.doc('acessosRevogados/u-deslig').set({ nome: 'x' });
    await d.doc('permissoesGestao/u-lanc').set({ lancarHolerites: true });
    await d.doc('permissoesGestao/u-senhas').set({ senhasDiversas: true });
    await d.doc('permissoesGestao/u-patcad').set({ patrimonioCadastro: true });
    await d.doc('condoAprovadores/cond-a').set({ aprovadorUid: 'u-cliente', condominio: 'Cond A' });
    // registros "antigos" (campos de versões anteriores, sem os campos novos)
    await d.doc('pendGrupos/g-antigo').set({ ownerUid: 'u-membro', nome: 'Lista antiga', emoji: '📁' });
    await d.doc('pendTarefas/t-antiga').set({ ownerUid: 'u-membro', grupoId: 'g-antigo', texto: 'tarefa antiga', concluida: false });
    await d.doc('pendTarefas/t-colega').set({ ownerUid: 'u-colega', grupoId: 'x', texto: 'do colega', concluida: false });
    await d.doc('tarefasEnviadas/te-antiga').set({ remetenteUid: 'u-gestor', destinatarioUid: 'u-membro', texto: 'enviada antiga', status: 'pendente' });
    await d.doc('tarefasEnviadas/te-aguardando').set({ remetenteUid: 'u-gestor', destinatarioUid: 'u-membro', texto: 'para aprovar', status: 'aguardando_aprovacao' });
    await d.doc('contratosGerados/cg-antigo').set({ tipo: 'procuracao', nomeDisplay: 'Antigo', criadoPorUid: 'u-membro', dados: { a: 1 } });
    await d.doc('contratosGerados/cg-colega').set({ tipo: 'procuracao', nomeDisplay: 'Do colega', criadoPorUid: 'u-colega', dados: { a: 1 } });
    await d.doc('peticoes_historico/ph-antiga').set({ criadoPor: 'u-membro', nomeArquivo: 'antiga.docx', docsUrl: 'https://docs.google.com/x' });
    await d.doc('peticoes_historico/ph-colega').set({ criadoPor: 'u-colega', nomeArquivo: 'c.docx', docsUrl: 'https://docs.google.com/y' });
    await d.doc('pagamentosColaboradores/2026-10_u-colega').set({ uid: 'u-colega', mes: '2026-10', valor: 100 });
    await d.doc('colaboradoresDesligados/u-x').set({ displayName: 'X', dataSaida: '2026-10-10' });
    await d.doc('holeritesDocs/h-antigo').set({ uid: 'u-membro', tipo: 'holerite', competencia: '2026-09', partes: 1, enviadoPorUid: 'u-lanc' });
    await d.doc('holeritesDocs/h-antigo/partes/0').set({ n: 0, dados: 'AAAA' });
    await d.doc('senhasDiversas/s1').set({ titulo: 'fictícia' });
    await d.doc('senhasSync/senhasDiversas').set({ em: 'x' });
    await d.doc('emailsConferencia/e-membro').set({ responsavelEmail: 'membro@exemplo.test', status: 'pendente', assunto: 'x', recebidoEm: '2026-10-01' });
    await d.doc('emailsConferencia/e-antigo').set({ responsavelEmail: 'membro@exemplo.test', status: 'pendente' });
    await d.doc('emailsConferencia/e-colega').set({ responsavelEmail: 'colega@exemplo.test', status: 'pendente' });
    await d.doc('emailsConferenciaMeta/ultima').set({ em: 'x' });
    await d.doc('emailsConferenciaTextos/e-membro').set({ corpo: 'texto fictício' });
    await d.doc('sugestoes/sg-aberta').set({ texto: 'antiga', autorUid: 'u-colega', autorNome: 'Pessoa Colega', status: 'aberta', motivoExclusao: null, criadoEm: 1 });
    await d.doc('notificacoesGeradas/n-pend').set({ condominio: 'Cond A', condominioSlug: 'cond-a', texto: 'x', status: 'pendente', tentativa: 1, criadoPorUid: 'u-membro' });
    await d.doc('notificacoesGeradas/n-rej').set({ condominio: 'Cond A', condominioSlug: 'cond-a', texto: 'x', status: 'rejeitada', tentativa: 1, criadoPorUid: 'u-membro' });
    await d.doc('compras/c-rasc').set({ item: 'Papel', status: 'rascunho', solicitanteUid: 'u-membro' });
    await d.doc('compras/c-pend').set({ item: 'Toner', status: 'pendente', solicitanteUid: 'u-colega' });
    await d.doc('patrimonio/p-membro').set({ nome: 'Notebook', codigo: 'P1', responsavelUid: 'u-membro' });
    await d.doc('patrimonio/p-pendente').set({ nome: 'Monitor', codigo: 'P2', responsavelUid: 'u-colega', pendenteParaUid: 'u-membro' });
    await d.doc('remuneracaoConfig/geral').set({ x: 1 });
    await d.doc('remuneracaoPessoas/u-membro').set({ liberado: true });
    await d.doc('remuneracaoExtrato/u-membro/meses/2026-10').set({ valor: 1 });
    await d.doc('perfis/u-membro').set({ foto: '' });
    await d.doc('organograma/u-membro').set({ displayName: 'Pessoa membro', deptoAtual: '' });
    await d.doc('condoUnidades/cond-a').set({ unidades: [] });
    await d.doc('materiaisMarca/m1').set({ tipo: 'logo' });
    await d.doc('astreaTrigger/pedido').set({ status: 'pronto' });
  });
}

// [área, função, ator, esperado, operação]
const C = (area, funcao, ator, esperado, op) => ({ area, funcao, ator, esperado, op });
const cenarios = [
  // ---------- Tarefas (Minhas Anotações)
  C('Tarefas', 'criar lista', 'membro', 'permitir', (d) => d.collection('pendGrupos').add({ ownerUid: 'u-membro', nome: 'Lista', emoji: '📌', criadoEm: TS() })),
  C('Tarefas', 'preparar lista "Envio de Tarefa" (set merge)', 'membro', 'permitir', (d) => d.doc('pendGrupos/enviarTarefa_u-membro').set({ ownerUid: 'u-membro', nome: 'Envio de Tarefa', emoji: '📨', fixa: true, criadoEm: TS() }, { merge: true })),
  C('Tarefas', 'ler as próprias listas', 'membro', 'permitir', (d) => d.collection('pendGrupos').where('ownerUid', '==', 'u-membro').get()),
  C('Tarefas', 'criar tarefa', 'membro', 'permitir', (d) => d.collection('pendTarefas').add({ ownerUid: 'u-membro', grupoId: 'g-antigo', texto: 'nova', concluida: false, concluidaEm: null, dataVencimento: null, criadoEm: TS() })),
  C('Tarefas', 'ler as próprias tarefas (inclui antiga)', 'membro', 'permitir', (d) => d.collection('pendTarefas').where('ownerUid', '==', 'u-membro').get()),
  C('Tarefas', 'concluir tarefa antiga', 'membro', 'permitir', (d) => d.doc('pendTarefas/t-antiga').update({ concluida: true, concluidaEm: TS() })),
  C('Tarefas', 'editar texto', 'membro', 'permitir', (d) => d.doc('pendTarefas/t-antiga').update({ texto: 'editada', editadoEm: TS() })),
  C('Tarefas', 'mudar de lista e vencimento', 'membro', 'permitir', async (d) => { await d.doc('pendTarefas/t-antiga').update({ grupoId: 'enviarTarefa_u-membro' }); await d.doc('pendTarefas/t-antiga').update({ dataVencimento: '2026-12-01' }); }),
  C('Tarefas', 'ler tarefa de outra pessoa', 'membro', 'negar', (d) => d.doc('pendTarefas/t-colega').get()),
  C('Tarefas', 'alterar tarefa de outra pessoa', 'membro', 'negar', (d) => d.doc('pendTarefas/t-colega').update({ texto: 'x' })),
  C('Tarefas', 'excluir tarefa', 'membro', 'permitir', (d) => d.doc('pendTarefas/t-antiga').delete()),
  C('Tarefas', 'excluir lista (lote)', 'membro', 'permitir', (d) => { const b = d.batch(); b.delete(d.doc('pendGrupos/g-antigo')); return b.commit(); }),
  C('Tarefas', 'gestor envia tarefa a um membro', 'gestor', 'permitir', (d) => d.collection('tarefasEnviadas').add({ remetenteUid: 'u-gestor', remetenteNome: 'G', destinatarioUid: 'u-membro', destinatarioNome: 'M', texto: 'faça', dataVencimento: null, enviarEm: null, status: 'pendente', criadoEm: TS(), concluidaEm: null, aprovadoEm: null, aprovadoPor: null, motivoReprovacao: null, justificativaConclusao: null })),
  C('Tarefas', 'membro (sem cargo de gestão) envia tarefa', 'membro', 'negar', (d) => d.collection('tarefasEnviadas').add({ remetenteUid: 'u-membro', destinatarioUid: 'u-colega', texto: 'x', status: 'pendente' })),
  C('Tarefas', 'destinatário lê tarefa recebida antiga', 'membro', 'permitir', (d) => d.doc('tarefasEnviadas/te-antiga').get()),
  C('Tarefas', 'destinatário conclui (aguardando aprovação)', 'membro', 'permitir', (d) => d.doc('tarefasEnviadas/te-antiga').update({ status: 'aguardando_aprovacao', concluidaEm: TS(), justificativaConclusao: 'feito' })),
  C('Tarefas', 'registrar histórico da tarefa enviada (arrayUnion)', 'membro', 'permitir', (d) => d.doc('tarefasEnviadas/te-aguardando').update({ historico: FV.arrayUnion({ tipo: 'concluida', texto: 'x', autorUid: 'u-membro', em: '2026-11-01' }) })),
  C('Tarefas', 'histórico: não serve para trocar status', 'membro', 'negar', (d) => d.doc('tarefasEnviadas/te-aguardando').update({ historico: FV.arrayUnion({ tipo: 'x' }), status: 'aprovada' })),
  C('Tarefas', 'histórico: terceiro não escreve', 'colega', 'negar', (d) => d.doc('tarefasEnviadas/te-aguardando').update({ historico: FV.arrayUnion({ tipo: 'x' }) })),
  C('Tarefas', 'remetente devolve (reprova)', 'gestor', 'permitir', (d) => d.doc('tarefasEnviadas/te-aguardando').update({ status: 'reprovada', aprovadoEm: TS(), aprovadoPor: 'G', motivoReprovacao: 'refazer' })),
  C('Tarefas', 'terceiro lê tarefa enviada', 'colega', 'negar', (d) => d.doc('tarefasEnviadas/te-antiga').get()),
  C('Tarefas', 'remetente exclui tarefa enviada', 'gestor', 'permitir', (d) => d.doc('tarefasEnviadas/te-antiga').delete()),

  // ---------- Documentos e Contratos (histórico contratosGerados)
  C('Documentos/Contratos', 'gerar documento (grava histórico)', 'membro', 'permitir', (d) => d.collection('contratosGerados').add({ tipo: 'procuracao', nomeDisplay: 'Fictício', metaDisplay: 'x', dataDisplay: '1º de novembro', criadoEm: TS(), criadoPorUid: 'u-membro', criadoPorNome: 'M', dados: { tipo: 'procuracao' } })),
  C('Documentos/Contratos', 'listar histórico', 'membro', 'permitir', (d) => d.collection('contratosGerados').get()),
  C('Documentos/Contratos', 'reabrir documento antigo', 'membro', 'permitir', (d) => d.doc('contratosGerados/cg-antigo').get()),
  C('Documentos/Contratos', 'excluir o próprio', 'membro', 'permitir', (d) => d.doc('contratosGerados/cg-antigo').delete()),
  C('Documentos/Contratos', 'excluir o de outra pessoa', 'membro', 'negar', (d) => d.doc('contratosGerados/cg-colega').delete()),
  C('Documentos/Contratos', 'editar histórico (não existe edição)', 'membro', 'negar', (d) => d.doc('contratosGerados/cg-colega').update({ nomeDisplay: 'x' })),
  C('Documentos/Contratos', 'cliente lê histórico de documentos', 'cliente', 'negar', (d) => d.collection('contratosGerados').get()),
  C('Documentos/Contratos', 'pendente lê histórico', 'pendente', 'negar', (d) => d.collection('contratosGerados').get()),

  // ---------- Petições (histórico; o documento em si vai para o Google Docs da pessoa)
  C('Petições', 'gerar petição (grava histórico)', 'membro', 'permitir', (d) => d.collection('peticoes_historico').add({ criadoPor: 'u-membro', nomeArquivo: 'peticao.docx', docsUrl: 'https://docs.google.com/document/d/ficticio', criadoEm: TS(), dados: {} })),
  C('Petições', 'listar as próprias (inclui antiga)', 'membro', 'permitir', (d) => d.collection('peticoes_historico').where('criadoPor', '==', 'u-membro').get()),
  C('Petições', 'carregar rascunho antigo', 'membro', 'permitir', (d) => d.doc('peticoes_historico/ph-antiga').get()),
  C('Petições', 'excluir a própria (lote)', 'membro', 'permitir', (d) => { const b = d.batch(); b.delete(d.doc('peticoes_historico/ph-antiga')); return b.commit(); }),
  C('Petições', 'ler a de outra pessoa', 'membro', 'negar', (d) => d.doc('peticoes_historico/ph-colega').get()),
  C('Petições', 'desligado lê o próprio histórico', 'deslig', 'negar', (d) => d.collection('peticoes_historico').where('criadoPor', '==', 'u-deslig').get()),

  // ---------- Pagamentos (Gestão › Colaboradores)
  C('Pagamentos', 'admin marca pago', 'admin', 'permitir', (d) => d.doc('pagamentosColaboradores/2026-10_u-membro').set({ uid: 'u-membro', nome: 'M', mes: '2026-10', valor: 10, dias: 30, diasMes: 31, pixChave: 'x', pagoEm: TS(), pagoPor: 'u-admin' })),
  C('Pagamentos', 'admin lista o mês', 'admin', 'permitir', (d) => d.collection('pagamentosColaboradores').where('mes', '==', '2026-10').get()),
  C('Pagamentos', 'admin desfaz pagamento', 'admin', 'permitir', (d) => d.doc('pagamentosColaboradores/2026-10_u-colega').delete()),
  C('Pagamentos', 'admin tira desligado da lista', 'admin', 'permitir', (d) => d.doc('colaboradoresDesligados/u-x').update({ removidoDaLista: true })),
  C('Pagamentos', 'membro lê pagamentos', 'membro', 'negar', (d) => d.collection('pagamentosColaboradores').where('mes', '==', '2026-10').get()),
  C('Pagamentos', 'membro marca o próprio pagamento', 'membro', 'negar', (d) => d.doc('pagamentosColaboradores/2026-10_u-membro').set({ uid: 'u-membro', mes: '2026-10' })),
  C('Pagamentos', 'membro lê desligados', 'membro', 'negar', (d) => d.collection('colaboradoresDesligados').get()),

  // ---------- Lançamento de holerites
  C('Holerites', 'quem lança cria holerite + partes (lote)', 'lancador', 'permitir', (d) => { const b = d.batch(); const ref = d.collection('holeritesDocs').doc('h-novo'); b.set(ref, { uid: 'u-colega', tipo: 'holerite', competencia: '2026-10', partes: 1, enviadoPorUid: 'u-lanc', arquivoNome: 'h.pdf' }); b.set(ref.collection('partes').doc('0'), { n: 0, dados: 'AAAA' }); return b.commit(); }),
  C('Holerites', 'quem lança cria guia de FGTS', 'lancador', 'permitir', (d) => d.collection('holeritesDocs').doc('g-novo').set({ tipo: 'fgts', competencia: '2026-10', partes: 1, enviadoPorUid: 'u-lanc' })),
  C('Holerites', 'quem lança lê holerite alheio', 'lancador', 'negar', (d) => d.doc('holeritesDocs/h-antigo').get()),
  C('Holerites', 'admin lista todos', 'admin', 'permitir', (d) => d.collection('holeritesDocs').get()),
  C('Holerites', 'admin baixa partes', 'admin', 'permitir', (d) => d.collection('holeritesDocs/h-antigo/partes').get()),
  C('Holerites', 'colaborador lê holerite antigo e as partes', 'membro', 'permitir', async (d) => { await d.collection('holeritesDocs').where('uid', '==', 'u-membro').get(); await d.collection('holeritesDocs/h-antigo/partes').get(); }),
  C('Holerites', 'membro sem permissão lança', 'membro', 'negar', (d) => d.collection('holeritesDocs').doc('h-x').set({ uid: 'u-membro', tipo: 'holerite', partes: 1, enviadoPorUid: 'u-membro' })),
  C('Holerites', 'admin exclui', 'admin', 'permitir', (d) => d.doc('holeritesDocs/h-antigo').delete()),

  // ---------- Senhas (Gestão; a planilha sincroniza via Apps Script com credencial do Google, fora destas regras)
  C('Senhas', 'com permissão lê senhas diversas', 'senhas', 'permitir', (d) => d.collection('senhasDiversas').get()),
  C('Senhas', 'equipe lê data da última sincronização', 'membro', 'permitir', (d) => d.doc('senhasSync/senhasDiversas').get()),
  C('Senhas', 'membro sem permissão lê senhas', 'membro', 'negar', (d) => d.collection('senhasDiversas').get()),
  C('Senhas', 'cliente lê data de sincronização', 'cliente', 'negar', (d) => d.doc('senhasSync/senhasDiversas').get()),
  C('Senhas', 'alguém grava senha pelo portal', 'admin', 'negar', (d) => d.doc('senhasDiversas/s2').set({ titulo: 'x' })),

  // ---------- Conferência de e-mails (o robô grava com conta de serviço, fora destas regras)
  C('Conferência e-mails', 'responsável lista os seus', 'membro', 'permitir', (d) => d.collection('emailsConferencia').where('responsavelEmail', '==', 'membro@exemplo.test').get()),
  C('Conferência e-mails', 'responsável marca respondido', 'membro', 'permitir', (d) => d.doc('emailsConferencia/e-membro').update({ status: 'respondido', respondidoModo: 'manual', respondidoPor: 'membro@exemplo.test', respondidoEm: TS() })),
  C('Conferência e-mails', 'responsável grava nota (merge)', 'membro', 'permitir', (d) => d.doc('emailsConferenciaTextos/e-antigo').set({ nota: 'respondi por telefone', notaPor: 'membro@exemplo.test', notaEm: TS() }, { merge: true })),
  C('Conferência e-mails', 'responsável marca respondido em registro antigo', 'membro', 'permitir', (d) => d.doc('emailsConferencia/e-antigo').update({ status: 'respondido', respondidoModo: 'manual', respondidoPor: 'membro@exemplo.test', respondidoEm: TS() })),
  C('Conferência e-mails', 'equipe vê a hora da última rodada', 'membro', 'permitir', (d) => d.doc('emailsConferenciaMeta/ultima').get()),
  C('Conferência e-mails', 'responsável lê e-mail de outro', 'membro', 'negar', (d) => d.doc('emailsConferencia/e-colega').get()),
  C('Conferência e-mails', 'responsável lê texto completo (só o dono)', 'membro', 'negar', (d) => d.doc('emailsConferenciaTextos/e-membro').get()),
  C('Conferência e-mails', 'admin reatribui', 'admin', 'permitir', (d) => d.doc('emailsConferencia/e-colega').update({ responsavelEmail: 'membro@exemplo.test', responsavelNome: 'M', atribuidoPor: 'admin@exemplo.test', atribuidoEm: TS() })),
  C('Conferência e-mails', 'dono lê textos', 'dono', 'permitir', (d) => d.collection('emailsConferenciaTextos').get()),

  // ---------- Demais funções
  C('Sugestões', 'enviar sugestão', 'membro', 'permitir', (d) => d.collection('sugestoes').add({ texto: 'ideia', autorUid: 'u-membro', autorNome: 'Pessoa Membro', status: 'aberta', motivoExclusao: null, decididoPor: null, decididoEm: null, criadoEm: TS() })),
  C('Sugestões', 'listar sugestões', 'membro', 'permitir', (d) => d.collection('sugestoes').get()),
  C('Sugestões', 'admin exclui com motivo', 'admin', 'permitir', (d) => d.doc('sugestoes/sg-aberta').update({ status: 'excluida', motivoExclusao: 'duplicada', decididoPor: 'A', decididoEm: TS() })),
  C('Sugestões', 'cliente lista sugestões', 'cliente', 'permitir', (d) => d.collection('sugestoes').get()),
  C('Condomínios', 'gerar notificação', 'membro', 'permitir', (d) => d.collection('notificacoesGeradas').add({ condominio: 'Cond A', condominioSlug: 'cond-a', torre: '1', apto: '101', ocorrencia: 'x', tipoPenalidade: 'advertência', texto: 'texto', status: 'pendente', tentativa: 1, historico: [], motivoRejeicao: null, criadoPorUid: 'u-membro', criadoPorNome: 'M', criadoEm: TS(), decididoPorUid: null, decididoPorNome: null, decididoEm: null })),
  C('Condomínios', 'síndico aprovador aprova', 'cliente', 'permitir', (d) => d.doc('notificacoesGeradas/n-pend').update({ status: 'aprovada', decididoPorUid: 'u-cliente', decididoPorNome: 'S', decididoEm: TS() })),
  C('Condomínios', 'reenviar notificação rejeitada', 'membro', 'permitir', (d) => d.doc('notificacoesGeradas/n-rej').update({ condominio: 'Cond A', condominioSlug: 'cond-a', torre: '1', apto: '101', ocorrencia: 'x', tipoPenalidade: 'multa', texto: 'novo', status: 'pendente', tentativa: 2, motivoRejeicao: null, decididoPorUid: null, decididoPorNome: null, decididoEm: null })),
  C('Condomínios', 'síndico lê aprovadores e unidades', 'cliente', 'permitir', async (d) => { await d.doc('condoAprovadores/cond-a').get(); await d.doc('condoUnidades/cond-a').get(); }),
  C('Condomínios', 'membro (não aprovador) aprova', 'membro', 'negar', (d) => d.doc('notificacoesGeradas/n-pend').update({ status: 'aprovada', decididoPorUid: 'u-membro' })),
  C('Compras', 'criar item (rascunho)', 'membro', 'permitir', (d) => d.collection('compras').add({ item: 'Caneta', quantidade: 1, valorUnitario: 1, valorEstimado: 1, solicitante: 'M', solicitanteUid: 'u-membro', loteId: 'l', loteNome: 'L', status: 'rascunho', dataSolicitacao: TS() })),
  C('Compras', 'enviar lista (rascunho → pendente)', 'membro', 'permitir', (d) => { const b = d.batch(); b.update(d.doc('compras/c-rasc'), { status: 'pendente', dataEnvio: '2026-11-01', totalLista: 1 }); return b.commit(); }),
  C('Compras', 'admin aprova', 'admin', 'permitir', (d) => d.doc('compras/c-pend').update({ status: 'aprovado', aprovadoPor: 'A', dataAprovacao: TS() })),
  C('Compras', 'membro aprova', 'membro', 'negar', (d) => d.doc('compras/c-pend').update({ status: 'aprovado' })),
  C('Compras', 'cliente vê compras', 'cliente', 'negar', (d) => d.collection('compras').get()),
  C('Patrimônio', 'quem cadastra cria item', 'patcad', 'permitir', (d) => d.collection('patrimonio').add({ nome: 'Cadeira', codigo: 'P9', criadoPorUid: 'u-patcad', responsavelUid: 'u-membro' })),
  C('Patrimônio', 'membro aceita item enviado a ele', 'membro', 'permitir', (d) => d.doc('patrimonio/p-pendente').update({ responsavelUid: 'u-membro', pendenteParaUid: null, pendente: null, atualizadoEm: TS(), historico: [] })),
  C('Patrimônio', 'membro pede devolução do próprio', 'membro', 'permitir', (d) => d.doc('patrimonio/p-membro').update({ devolucaoPendente: true, devolucao: { porUid: 'u-membro', estado: 'bom' }, historico: [], atualizadoEm: TS() })),
  C('Patrimônio', 'membro assina termo de entrega', 'membro', 'permitir', (d) => d.collection('termosPatrimonio').add({ itemId: 'p-membro', assinaturaPng: 'data:', assinadoEm: TS(), colaboradorUid: 'u-membro', tipoTermo: 'entrega' })),
  C('Patrimônio', 'membro edita item de outro', 'membro', 'negar', (d) => d.collection('patrimonio').doc('p-membro').update({ nome: 'renomeado' })),
  C('Organograma/Perfil', 'pessoa atualiza o próprio perfil', 'membro', 'permitir', (d) => d.doc('perfis/u-membro').set({ foto: 'data:x', nascimento: '2000-01-01' }, { merge: true })),
  C('Organograma/Perfil', 'pessoa atualiza telefone/PIX no cadastro', 'membro', 'permitir', (d) => d.doc('users/u-membro').update({ telefone: '0', pixChave: 'x' })),
  C('Organograma/Perfil', 'equipe lê organograma e perfis', 'membro', 'permitir', async (d) => { await d.collection('organograma').get(); await d.collection('perfis').get(); }),
  C('Organograma/Perfil', 'admin atualiza cargo no organograma', 'admin', 'permitir', (d) => d.doc('organograma/u-membro').set({ deptoAtual: 'Jurídico', remuneracao: FV.delete(), custos: FV.delete() }, { merge: true })),
  C('Organograma/Perfil', 'pessoa altera a própria remuneração', 'membro', 'negar', (d) => d.doc('users/u-membro').update({ remuneracao: '99999' })),
  C('Remuneração', 'dono configura', 'dono', 'permitir', (d) => d.doc('remuneracaoConfig/geral').set({ x: 2 })),
  C('Remuneração', 'dono libera pessoa', 'dono', 'permitir', (d) => d.doc('remuneracaoPessoas/u-colega').set({ nome: 'C', email: 'c', cargoId: 'x', liberado: true, pctManual: null, atualizadoEm: TS() })),
  C('Remuneração', 'pessoa liberada lê o próprio extrato', 'membro', 'permitir', async (d) => { await d.doc('remuneracaoPessoas/u-membro').get(); await d.collection('remuneracaoExtrato/u-membro/meses').get(); }),
  C('Remuneração', 'admin comum lê configuração', 'admin', 'negar', (d) => d.doc('remuneracaoConfig/geral').get()),
  C('Agenda Astrea', 'equipe pede "Executar robô agora"', 'membro', 'permitir', (d) => d.doc('astreaTrigger/pedido').set({ status: 'pedido', pedidoPor: 'u-membro', pedidoEm: TS() })),
  C('Agenda Astrea', 'cliente pede execução do robô', 'cliente', 'negar', (d) => d.doc('astreaTrigger/pedido').set({ status: 'pedido' })),
  C('Comunicados', 'registrar ciência', 'membro', 'permitir', (d) => d.doc('comunicadosCiencia/c1_u-membro').set({ comunicadoId: 'c1', uid: 'u-membro', nome: 'M', em: TS() })),
  C('Comunicados', 'ciência em nome de outro', 'membro', 'negar', (d) => d.doc('comunicadosCiencia/c1_u-colega').set({ comunicadoId: 'c1', uid: 'u-colega', em: TS() })),
  C('Presença', 'marcar a própria presença', 'membro', 'permitir', (d) => d.doc('presencaDiaria/u-membro_2026-11-01').set({ uid: 'u-membro', dia: '2026-11-01' })),
  C('Treinamentos', 'registrar progresso de vídeo', 'membro', 'permitir', (d) => d.doc('treinamentoProgresso/u-membro').set({ videos: { a: true } }, { merge: true })),
  C('Materiais da marca', 'equipe lê logos e papéis de parede', 'membro', 'permitir', (d) => d.collection('materiaisMarca').get()),
  C('Materiais da marca', 'admin cadastra', 'admin', 'permitir', (d) => d.collection('materiaisMarca').add({ tipo: 'wallpaper', nome: 'x' })),
];

async function main() {
  env = await initializeTestEnvironment({ projectId: 'demo-portal-funcoes', firestore: { rules: fs.readFileSync(REGRAS, 'utf8'), host: HOST, port: Number(PORTA) } });
  await env.clearFirestore();
  await semear();
  for (const c of cenarios) {
    let r;
    try { await c.op(db(P[c.ator])); r = 'permitido'; }
    catch (e) { r = (e && (e.code === 'permission-denied' || String(e.message).includes('PERMISSION_DENIED'))) ? 'negado' : 'erro: ' + String(e.message).split('\n')[0].slice(0, 80); }
    res.push({ area: c.area, funcao: c.funcao, ator: c.ator, esperado: c.esperado, resultado: r });
  }
  await env.cleanup();
  let falhas = 0, area = '';
  for (const r of res) {
    const ok = (r.esperado === 'permitir' && r.resultado === 'permitido') || (r.esperado === 'negar' && r.resultado === 'negado');
    if (!ok) falhas++;
    if (r.area !== area) { console.log('\n' + r.area); area = r.area; }
    console.log((ok ? '  ✓ ' : '  ✗ ') + r.funcao + ' [' + r.ator + '] esperado: ' + r.esperado + ' → ' + r.resultado);
  }
  console.log('\nFunções: ' + (res.length - falhas) + ' de ' + res.length + ' conforme o esperado (' + falhas + ' divergentes). Regras: ' + REGRAS);
  if (SAIDA) fs.writeFileSync(SAIDA, JSON.stringify(res, null, 1));
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
