// Conferência de e-mails — Fonseca e Braga
//
// Roda no Google Apps Script (script.google.com) da conta jonathan@fonsecaebraga.com.br, de hora em hora.
// 1) Lê (somente leitura) os e-mails recebidos na caixa principal — inclusive os aliases condominio@ e juridico@.
// 2) Para cada e-mail ainda sem resposta, procura a resposta no mesmo fio: na caixa principal e nos
//    ENVIADOS do responsável (a cópia encaminhada é achada pelo Message-ID original).
// 3) Grava o resultado no Firestore do portal (coleção emailsConferencia), que a aba "Conferência de E-mails" mostra.
// 4) Guarda o texto do e-mail recebido e o da resposta (emailsConferenciaTextos — só o dono lê, nunca é apagado)
//    e a lista do que foi descartado (emailsConferenciaDescartes), para o Histórico e o Relatório do portal.
//
// Acesso: conta de serviço conferencia-emails@sistema-fb-7a811 com delegação em todo o domínio (escopo
// gmail.readonly) e papel "Usuário do Cloud Datastore" no projeto sistema-fb-4cce5. A chave JSON fica em
// Configurações do projeto › Propriedades do script › CHAVE_JSON — nunca neste arquivo nem no GitHub.
//
// Funções para rodar pelo editor: testarAcessos (não grava nada), conferirAgora, instalarAgendamento.

var CONFIG = {
  projetoFirestore: 'sistema-fb-4cce5',
  dominio: 'fonsecaebraga.com.br',
  caixaPrincipal: 'jonathan@fonsecaebraga.com.br',
  // Ordem importa: um e-mail endereçado ao condomínio e ao Jonathan entra como "condominio".
  caixas: [
    { id: 'condominio', endereco: 'condominio@fonsecaebraga.com.br', responsavel: 'yasmin@fonsecaebraga.com.br' },
    { id: 'juridico',   endereco: 'juridico@fonsecaebraga.com.br',   responsavel: 'avsoares@fonsecaebraga.com.br' },
    { id: 'meu',        endereco: 'jonathan@fonsecaebraga.com.br',   responsavel: 'jonathan@fonsecaebraga.com.br' }
  ],
  nomes: {
    'jonathan@fonsecaebraga.com.br': 'Jonathan Fonseca',
    'yasmin@fonsecaebraga.com.br': 'Dra. Yasmin',
    'avsoares@fonsecaebraga.com.br': 'Ana Vitória'
  },
  // Únicas caixas que o robô abre. Responsável fora desta lista: só vale a resposta vista na caixa principal
  // (ou o botão "Marcar respondido" no portal).
  caixasLiberadas: ['jonathan@fonsecaebraga.com.br', 'yasmin@fonsecaebraga.com.br', 'avsoares@fonsecaebraga.com.br'],
  diasNovos: 7,        // e-mails recebidos nos últimos N dias entram na conferência
  diasAcompanhar: 30,  // por quanto tempo se continua procurando a resposta
  // As abas do Gmail (Social, Atualizações…) NÃO entram no filtro: nesta caixa elas recebem e-mails de verdade.
  // O que é automático sai pelos cabeçalhos (função automatico) e pela lista remetentesIgnorados.
  filtroGmail: '-in:sent -in:chats -in:drafts -in:spam -in:trash -from:me -from:fonsecaebraga.com.br',
  // Remetentes que nunca precisam de resposta: endereço inteiro, domínio ('@nubank.com.br') ou final do
  // domínio ('.jus.br' = qualquer tribunal). Lista inicial montada com o diagnóstico de 28/10/2026.
  remetentesIgnorados: [
    '.jus.br',                                   // tribunais (intimações, andamentos, e-SAJ, e-proc, PJe)
    'astrea@aurum.com.br', 'andamentos@jusbrasil.com.br', 'contato@sedep.com.br',
    'informativo@oab.com.br', 'informativo@oabuberlandia.org.br', 'regularize@oabsp.org.br',
    'informativo@comunicadocaamg.com.br', 'contact@cuoreplatform.com',
    '@nubank.com.br', '@novidades.nubank.com.br', '@atendimento.empresas.vivo.com.br', 'financeiro@ikatec.com.br',
    '@correios.com.br', '@autoavaliar.com.br', '@email.v4company.com', 'gemini-notes@google.com',
    'nfe-auto@prefeitura.sp.gov.br', 'comercial@clicleiloes.com.br'
  ]
};

var ESCOPO_GMAIL = 'https://www.googleapis.com/auth/gmail.readonly';
var ESCOPO_FIRESTORE = 'https://www.googleapis.com/auth/datastore';
var COLECAO = 'emailsConferencia';
var TEXTOS = 'emailsConferenciaTextos';
var DESCARTES = 'emailsConferenciaDescartes';
var LIMITE_TEXTO = 3000;
var CABECALHOS = ['From', 'To', 'Cc', 'Subject', 'Message-ID', 'Auto-Submitted', 'Precedence',
                  'List-Unsubscribe', 'List-Id', 'X-Autoreply', 'X-Autorespond'];

// ======================================================================
// Funções para rodar pelo editor
// ======================================================================

// Confere se a chave, a delegação e o Firestore estão funcionando. Não grava nada.
function testarAcessos() {
  CONFIG.caixasLiberadas.forEach(function(u) {
    var p = gmail(u, 'profile');
    Logger.log('✓ Gmail de ' + u + ': ' + p.messagesTotal + ' mensagens');
  });
  consultar(null, 1);
  Logger.log('✓ Firestore do portal acessível');

  // Quantos e-mails chegaram em cada alias (antes de qualquer filtro).
  CONFIG.caixas.forEach(function(cx) {
    if (cx.id === 'meu') return;
    var r = gmail(CONFIG.caixaPrincipal, 'messages', { q: 'newer_than:' + CONFIG.diasNovos + 'd to:' + cx.endereco + ' -from:me', maxResults: 500 });
    Logger.log('Recebidos em ' + cx.endereco + ': ' + (r.messages || []).length + (r.nextPageToken ? '+' : ''));
  });

  var lidos = lerMensagens(CONFIG.caixaPrincipal, listarRecebidos());
  var cont = {}, porAba = {}, remetentes = {};
  lidos.forEach(function(m) {
    var c = classificar(m);
    var k = c.motivo || c.caixa.id;
    cont[k] = (cont[k] || 0) + 1;
    if (!c.caixa) return;
    var aba = c.caixa.id + ' / aba ' + abaGmail(m.rotulos);
    porAba[aba] = (porAba[aba] || 0) + 1;
    var chave = c.caixa.id + ' | ' + c.de.email;
    remetentes[chave] = (remetentes[chave] || 0) + 1;
  });
  Logger.log('Últimos ' + CONFIG.diasNovos + ' dias: ' + lidos.length + ' e-mails lidos → ' + JSON.stringify(cont));
  Object.keys(porAba).sort().forEach(function(k) { Logger.log('  entrariam: ' + k + ' = ' + porAba[k]); });
  Logger.log('Remetentes que entrariam (mais frequentes primeiro):');
  Object.keys(remetentes).sort(function(a, b) { return remetentes[b] - remetentes[a]; }).slice(0, 40).forEach(function(k) {
    Logger.log('  ' + remetentes[k] + '× ' + k);
  });
}

// Uma conferência completa (é o que o agendamento roda de hora em hora).
function conferirAgora() {
  var resumo = { em: new Date(), novos: 0, respondidos: 0, pendentes: 0, textos: 0, erro: '' };
  try {
    migrarTextos();
    resumo.novos = registrarNovos();
    var r = atualizarRespostas();
    resumo.respondidos = r.respondidos;
    resumo.pendentes = r.pendentes;
    resumo.textos = completarTextos();
  } catch (e) {
    resumo.erro = String(e && e.message || e).slice(0, 500);
    throw e;
  } finally {
    try { gravar('emailsConferenciaMeta', 'ultima', resumo); } catch (e2) { Logger.log('Falha ao gravar o resumo: ' + e2); }
    Logger.log(JSON.stringify(resumo));
  }
}

function instalarAgendamento() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'conferirAgora') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('conferirAgora').timeBased().everyHours(1).create();
  Logger.log('✓ Agendado: conferência de hora em hora.');
}

// ======================================================================
// Conferência
// ======================================================================

function registrarNovos() {
  var desde = new Date(Date.now() - (CONFIG.diasNovos + 1) * 864e5);
  var existentes = {};
  consultar(filtroCampo('recebidoEm', 'GREATER_THAN_OR_EQUAL', desde)).forEach(function(d) { existentes[d._id] = true; });

  // E-mails já descartados (automáticos, só em cópia) ficam 6 h no cache para não serem relidos toda hora.
  var cache = CacheService.getScriptCache();
  var ids = listarRecebidos().filter(function(id) { return !existentes[id]; });
  var jaDescartados = ids.length ? cache.getAll(ids.map(function(id) { return 'desc|' + id; })) : {};
  ids = ids.filter(function(id) { return !jaDescartados['desc|' + id]; });

  var novos = [], textos = [], descartes = [], descartados = {}, manter = [];
  lerMensagens(CONFIG.caixaPrincipal, ids).forEach(function(m) {
    var c = classificar(m);
    if (c.caixa) { manter.push({ m: m, c: c }); return; }
    descartados['desc|' + m.id] = '1';
    descartes.push({ id: m.id, dados: {
      recebidoEm: new Date(m.internalDate),
      deNome: c.de.nome.slice(0, 150),
      deEmail: c.de.email.slice(0, 150),
      assunto: (m.h['subject'] || '(sem assunto)').slice(0, 300),
      para: (m.h['to'] || '').slice(0, 300),
      motivo: c.motivo
    } });
  });
  var corpos = {};
  lerMensagens(CONFIG.caixaPrincipal, manter.map(function(x) { return x.m.id; }), 'full').forEach(function(m) {
    corpos[m.id] = textoDaMensagem(m.payload);
  });
  manter.forEach(function(x) {
    var m = x.m, c = x.c;
    var resp = c.caixa.responsavel;
    textos.push({ id: m.id, dados: { recebidoTexto: corpos[m.id] || limparTrecho(m.snippet), criadoEm: new Date() } });
    novos.push({ id: m.id, dados: {
      caixa: c.caixa.id,
      assunto: (m.h['subject'] || '(sem assunto)').slice(0, 300),
      deNome: c.de.nome.slice(0, 150),
      deEmail: c.de.email.slice(0, 150),
      para: (m.h['to'] || '').slice(0, 300),
      trecho: limparTrecho(m.snippet),
      recebidoEm: new Date(m.internalDate),
      messageId: (m.h['message-id'] || '').replace(/[<>\s]/g, ''),
      threadId: m.threadId,
      responsavelEmail: resp,
      responsavelNome: CONFIG.nomes[resp] || resp,
      status: 'pendente',
      textos: false,
      criadoEm: new Date()
    } });
  });
  if (Object.keys(descartados).length) cache.putAll(descartados, 21600);
  criarVarios(DESCARTES, descartes);
  criarVarios(TEXTOS, textos);
  return criarVarios(COLECAO, novos);
}

function atualizarRespostas() {
  var limite = Date.now() - CONFIG.diasAcompanhar * 864e5;
  var respondidos = 0, pendentes = 0;
  consultar(filtroCampo('status', 'EQUAL', 'pendente')).forEach(function(d) {
    if (!d.recebidoEm || d.recebidoEm.getTime() < limite) return;
    var achou = acharResposta(d);
    if (achou) {
      guardarResposta(d._id, achou);
      atualizar(COLECAO, d._id, { status: 'respondido', respondidoEm: new Date(achou.em), respondidoPor: achou.por, respondidoModo: 'auto', textos: true });
      respondidos++;
    } else {
      pendentes++;
    }
  });
  return { respondidos: respondidos, pendentes: pendentes };
}

// Procura a resposta no mesmo fio: na caixa principal e nas caixas do responsável atual e do responsável
// padrão da caixa (o e-mail pode ter sido respondido antes de o responsável ser trocado no portal).
function acharResposta(d) {
  var recebido = d.recebidoEm.getTime();
  var achou = respostaNoFio(CONFIG.caixaPrincipal, d.threadId, recebido);
  if (achou) { achou.usuario = CONFIG.caixaPrincipal; return achou; }
  if (!d.messageId) return null;
  var padrao = CONFIG.caixas.filter(function(cx) { return cx.id === d.caixa; }).map(function(cx) { return cx.responsavel; });
  var outros = [d.responsavelEmail].concat(padrao).filter(function(u, i, a) {
    return u && u !== CONFIG.caixaPrincipal && a.indexOf(u) === i && CONFIG.caixasLiberadas.indexOf(u) >= 0;
  });
  for (var i = 0; i < outros.length; i++) {
    var tid = fioPorMessageId(outros[i], d.messageId);
    achou = tid && respostaNoFio(outros[i], tid, recebido);
    if (achou) { achou.usuario = outros[i]; return achou; }
  }
  return null;
}

function guardarResposta(id, achou) {
  var m = gmail(achou.usuario, 'messages/' + achou.id, { format: 'full' });
  mesclar(TEXTOS, id, {
    respostaTexto: m ? textoDaMensagem(m.payload) : '',
    respostaEm: new Date(achou.em),
    respostaPor: achou.por
  });
}

// E-mails respondidos sem texto da resposta (marcados à mão, ou de antes de os textos existirem): procura a
// resposta no Gmail por até CONFIG.diasAcompanhar dias. Não muda quem marcou nem como.
function completarTextos() {
  var limite = Date.now() - CONFIG.diasAcompanhar * 864e5;
  var n = 0;
  consultar(filtroCampo('textos', 'EQUAL', false)).forEach(function(d) {
    if (d.status !== 'respondido' || !d.recebidoEm) return;
    var achou = d.recebidoEm.getTime() >= limite ? acharResposta(d) : null;
    if (achou) { guardarResposta(d._id, achou); n++; }
    if (achou || d.recebidoEm.getTime() < limite) atualizar(COLECAO, d._id, { textos: true });
  });
  return n;
}

// Uma vez só: os e-mails gravados antes de existir o texto ganham o texto recebido e entram na fila de completarTextos.
function migrarTextos() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('TEXTOS_MIGRADOS')) return;
  var faltam = consultar(null).filter(function(d) { return d.textos === undefined; });
  var corpos = {};
  lerMensagens(CONFIG.caixaPrincipal, faltam.map(function(d) { return d._id; }), 'full').forEach(function(m) {
    corpos[m.id] = textoDaMensagem(m.payload);
  });
  faltam.forEach(function(d) {
    mesclar(TEXTOS, d._id, { recebidoTexto: corpos[d._id] || d.trecho || '', criadoEm: new Date() });
    atualizar(COLECAO, d._id, { textos: false });
  });
  props.setProperty('TEXTOS_MIGRADOS', new Date().toISOString());
}

function listarRecebidos() {
  var q = 'newer_than:' + CONFIG.diasNovos + 'd ' + CONFIG.filtroGmail;
  var ids = [], pagina;
  do {
    var r = gmail(CONFIG.caixaPrincipal, 'messages', { q: q, maxResults: 500, pageToken: pagina });
    (r.messages || []).forEach(function(m) { ids.push(m.id); });
    pagina = r.nextPageToken;
  } while (pagina && ids.length < 2000);
  return ids;
}

// Lê várias mensagens, 25 requisições em paralelo por vez. Sem "formato", só os cabeçalhos; 'full' traz o corpo.
function lerMensagens(usuario, ids, formato) {
  var params = formato === 'full' ? { format: 'full' } : { format: 'metadata', metadataHeaders: CABECALHOS };
  var lidos = [];
  for (var i = 0; i < ids.length; i += 25) {
    var lote = ids.slice(i, i + 25);
    var reqs = lote.map(function(id) {
      return {
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + id + '?' + qs(params),
        headers: { Authorization: 'Bearer ' + token(ESCOPO_GMAIL, usuario) },
        muteHttpExceptions: true
      };
    });
    UrlFetchApp.fetchAll(reqs).forEach(function(r, j) {
      var c = r.getResponseCode(), m;
      if (c === 200) m = JSON.parse(r.getContentText());
      else if (c === 404) return;
      else { Utilities.sleep(1000); m = gmail(usuario, 'messages/' + lote[j], params); }
      if (m) lidos.push(paraMensagem(m));
    });
  }
  return lidos;
}

function paraMensagem(m) {
  return { id: m.id, threadId: m.threadId, internalDate: +m.internalDate, snippet: m.snippet || '', rotulos: m.labelIds || [], h: cabecalhos(m), payload: m.payload };
}

// Decide a caixa do e-mail, ou o motivo de ficar de fora.
function classificar(m) {
  var de = separarRemetente(m.h['from']);
  if (automatico(m.h, de.email)) return { motivo: 'automatico', de: de };
  var para = (m.h['to'] || '').toLowerCase();
  var cc = (m.h['cc'] || '').toLowerCase();
  for (var i = 0; i < CONFIG.caixas.length; i++) {
    var cx = CONFIG.caixas[i];
    // aliases valem em Para ou Cc; o e-mail pessoal só quando está em Para (cópias ficam de fora)
    var alvo = cx.id === 'meu' ? para : para + ',' + cc;
    if (alvo.indexOf(cx.endereco) >= 0) return { caixa: cx, de: de };
  }
  return { motivo: 'foraDasCaixas', de: de };
}

function abaGmail(rotulos) {
  var nomes = { CATEGORY_PERSONAL: 'Principal', CATEGORY_SOCIAL: 'Social', CATEGORY_UPDATES: 'Atualizações',
                CATEGORY_FORUMS: 'Fóruns', CATEGORY_PROMOTIONS: 'Promoções' };
  for (var i = 0; i < rotulos.length; i++) if (nomes[rotulos[i]]) return nomes[rotulos[i]];
  return 'sem aba';
}

function automatico(h, email) {
  var ignorado = CONFIG.remetentesIgnorados.some(function(r) {
    r = r.toLowerCase();
    return r.charAt(0) === '@' || r.charAt(0) === '.' ? email.slice(-r.length) === r : email === r;
  });
  if (ignorado) return true;
  if ((h['auto-submitted'] || 'no').trim().toLowerCase() !== 'no') return true;
  if (/^(bulk|list|junk|auto_reply)$/i.test((h['precedence'] || '').trim())) return true;
  if (h['list-unsubscribe'] || h['list-id'] || h['x-autoreply'] || h['x-autorespond']) return true;
  return /(^|[._+-])(no-?reply|nao[._-]?respond[ae]r?|donotreply|do-not-reply|mailer-daemon|postmaster|newsletter|bounces?|notifica(coes|cao|tions?))([._+-]|@)/i.test(email);
}

// Primeira mensagem do fio, depois do recebimento, enviada por alguém do escritório (rascunhos não contam).
function respostaNoFio(usuario, threadId, depoisDe) {
  if (!threadId) return null;
  var t = gmail(usuario, 'threads/' + threadId, { format: 'metadata', metadataHeaders: ['From'] });
  if (!t) return null;
  var msgs = t.messages || [];
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i], rot = m.labelIds || [];
    if (+m.internalDate <= depoisDe || rot.indexOf('DRAFT') >= 0) continue;
    var de = separarRemetente(cabecalhos(m)['from']);
    if (rot.indexOf('SENT') >= 0 || de.email.slice(-CONFIG.dominio.length - 1) === '@' + CONFIG.dominio) {
      return { id: m.id, em: +m.internalDate, por: de.email || usuario };
    }
  }
  return null;
}

function fioPorMessageId(usuario, messageId) {
  var r = gmail(usuario, 'messages', { q: 'rfc822msgid:' + messageId, maxResults: 5 });
  return r && r.messages && r.messages.length ? r.messages[0].threadId : null;
}

// ======================================================================
// Utilidades
// ======================================================================

function cabecalhos(m) {
  var h = {};
  ((m.payload && m.payload.headers) || []).forEach(function(x) {
    var k = x.name.toLowerCase();
    h[k] = h[k] ? h[k] + ', ' + x.value : x.value;
  });
  return h;
}

function separarRemetente(s) {
  s = String(s || '');
  var m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>/.exec(s);
  if (m) return { nome: m[1].trim() || m[2].trim(), email: m[2].trim().toLowerCase() };
  return { nome: s.trim(), email: s.trim().toLowerCase() };
}

// O trecho fica guardado no portal: corta e esconde o que parecer senha ou código de acesso.
function limparTrecho(s) {
  return String(s || '')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/((?:senha|password|c[óo]digo|token|pin)\s*[:=]?\s*)\S+/gi, '$1•••')
    .slice(0, 220);
}

// Texto legível de uma mensagem: prefere text/plain, cai para o HTML sem tags; ignora anexos.
function textoDaMensagem(payload) {
  var plano = [], html = [];
  (function andar(p) {
    if (!p || p.filename) return;
    var tipo = String(p.mimeType || '').toLowerCase();
    if (p.body && p.body.data) {
      if (tipo === 'text/plain') plano.push(decodificarParte(p));
      else if (tipo === 'text/html') html.push(decodificarParte(p));
    }
    (p.parts || []).forEach(andar);
  })(payload);
  return limparCorpo(plano.length ? plano.join('\n') : htmlParaTexto(html.join('\n')));
}

function decodificarParte(p) {
  var dados = p.body.data;
  while (dados.length % 4) dados += '=';
  var bytes = Utilities.base64DecodeWebSafe(dados);
  var ct = ((p.headers || []).filter(function(h) { return h.name.toLowerCase() === 'content-type'; })[0] || {}).value || '';
  var cs = (/charset="?([\w-]+)/i.exec(ct) || [])[1] || 'UTF-8';
  try { return Utilities.newBlob(bytes).getDataAsString(cs); } catch (e) { return Utilities.newBlob(bytes).getDataAsString(); }
}

function htmlParaTexto(h) {
  return String(h || '')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<div[^>]*class="?gmail_quote[\s\S]*$/i, '')
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, function(m, n) { return String.fromCharCode(+n); }).replace(/&amp;/g, '&');
}

// Corta o histórico citado ("Em … escreveu:", "-----Mensagem original-----", linhas com ">"), limpa e limita o tamanho.
function limparCorpo(t) {
  t = '\n' + String(t || '').replace(/\r\n?/g, '\n');
  var marcas = [
    /\n[ \t>]*(Em|On)\s[\s\S]{0,250}?(escreveu|wrote)\s*:/i,
    /\n[ \t]*-{2,}\s*(Mensagem original|Original Message|Forwarded message|Mensagem encaminhada)/i,
    /\n[ \t]*_{5,}[ \t]*\n[ \t]*(De|From)\s*:/i,
    /\n[ \t]*\*?(De|From)\s*:\*?[^\n]*\n[ \t]*\*?(Enviad[oa]|Sent|Data|Date)\s*:/i
  ];
  var corte = t.length;
  marcas.forEach(function(re) { var m = re.exec(t); if (m && m.index < corte) corte = m.index; });
  t = t.slice(0, corte).split('\n').filter(function(l) { return !/^\s*>/.test(l); }).join('\n');
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  t = t.replace(/((?:senha|password|c[óo]digo|token|pin)\s*[:=]?\s*)\S+/gi, '$1•••');
  return t.length > LIMITE_TEXTO ? t.slice(0, LIMITE_TEXTO) + '…' : t;
}

function qs(p) {
  return Object.keys(p).filter(function(k) { return p[k] !== undefined && p[k] !== null; }).map(function(k) {
    return [].concat(p[k]).map(function(v) { return encodeURIComponent(k) + '=' + encodeURIComponent(v); }).join('&');
  }).join('&');
}

function gmail(usuario, caminho, params) {
  if (CONFIG.caixasLiberadas.indexOf(usuario) < 0) throw new Error('Caixa não liberada para o robô: ' + usuario);
  var url = 'https://gmail.googleapis.com/gmail/v1/users/me/' + caminho + (params ? '?' + qs(params) : '');
  var r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token(ESCOPO_GMAIL, usuario) }, muteHttpExceptions: true });
  var c = r.getResponseCode();
  if (c === 404) return null;
  if (c !== 200) throw new Error('Gmail (' + usuario + ') ' + caminho + ': ' + c + ' ' + r.getContentText().slice(0, 300));
  return JSON.parse(r.getContentText());
}

// Token de acesso da conta de serviço; com "usuario", age em nome dele (delegação em todo o domínio).
function token(escopo, usuario) {
  var cache = CacheService.getScriptCache();
  var chaveCache = 'tk|' + escopo + '|' + (usuario || '');
  var t = cache.get(chaveCache);
  if (t) return t;
  var k = chaveServico();
  var agora = Math.floor(Date.now() / 1000);
  var corpo = { iss: k.client_email, scope: escopo, aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 };
  if (usuario) corpo.sub = usuario;
  var b64 = function(x) {
    var bytes = typeof x === 'string' ? Utilities.newBlob(x).getBytes() : x;
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
  };
  var entrada = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64(JSON.stringify(corpo));
  var assinatura = b64(Utilities.computeRsaSha256Signature(entrada, k.private_key));
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: entrada + '.' + assinatura },
    muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) {
    throw new Error('Acesso negado para ' + (usuario || 'o Firestore') + ': ' + r.getContentText().slice(0, 300) +
      (usuario ? ' — confira a delegação em admin.google.com (ID do cliente e escopo gmail.readonly).' : ''));
  }
  t = JSON.parse(r.getContentText()).access_token;
  cache.put(chaveCache, t, 3000);
  return t;
}

function chaveServico() {
  var bruto = PropertiesService.getScriptProperties().getProperty('CHAVE_JSON');
  if (!bruto) throw new Error('Falta a propriedade CHAVE_JSON (Configurações do projeto › Propriedades do script).');
  return JSON.parse(bruto);
}

// ---------- Firestore (REST) ----------

var FS_BASE = 'https://firestore.googleapis.com/v1/projects/' + CONFIG.projetoFirestore + '/databases/(default)/documents';

function fs(metodo, caminho, corpo) {
  var op = { method: metodo, headers: { Authorization: 'Bearer ' + token(ESCOPO_FIRESTORE) }, muteHttpExceptions: true };
  if (corpo) { op.contentType = 'application/json'; op.payload = JSON.stringify(corpo); }
  var r = UrlFetchApp.fetch(FS_BASE + caminho, op);
  return { codigo: r.getResponseCode(), corpo: r.getContentText() };
}

function paraFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
}

function deFs(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return +v.integerValue;
  if ('doubleValue' in v) return v.doubleValue;
  return null;
}

function campos(o) {
  var f = {};
  Object.keys(o).forEach(function(k) { f[k] = paraFs(o[k]); });
  return { fields: f };
}

function filtroCampo(campo, op, valor) {
  return { fieldFilter: { field: { fieldPath: campo }, op: op, value: paraFs(valor) } };
}

function consultar(onde, limite) {
  var q = { from: [{ collectionId: COLECAO }] };
  if (onde) q.where = onde;
  if (limite) q.limit = limite;
  var r = fs('post', ':runQuery', { structuredQuery: q });
  if (r.codigo !== 200) throw new Error('Firestore (consulta): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
  return JSON.parse(r.corpo).filter(function(x) { return x.document; }).map(function(x) {
    var d = { _id: x.document.name.split('/').pop() };
    Object.keys(x.document.fields || {}).forEach(function(k) { d[k] = deFs(x.document.fields[k]); });
    return d;
  });
}

// Cria em lotes, só os que ainda não existem (nunca sobrescreve o responsável trocado no portal).
// Devolve quantos foram criados.
function criarVarios(colecao, itens) {
  var criados = 0;
  var prefixo = 'projects/' + CONFIG.projetoFirestore + '/databases/(default)/documents/' + colecao + '/';
  for (var i = 0; i < itens.length; i += 200) {
    var writes = itens.slice(i, i + 200).map(function(it) {
      return { update: { name: prefixo + it.id, fields: campos(it.dados).fields }, currentDocument: { exists: false } };
    });
    var r = fs('post', ':batchWrite', { writes: writes });
    if (r.codigo !== 200) throw new Error('Firestore (criar): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
    (JSON.parse(r.corpo).status || []).forEach(function(st) { if (!st.code) criados++; });
  }
  return criados;
}

function atualizar(colecao, id, dados) {
  var mascara = Object.keys(dados).map(function(k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  var r = fs('patch', '/' + colecao + '/' + encodeURIComponent(id) + '?' + mascara + '&currentDocument.exists=true', campos(dados));
  if (r.codigo !== 200) throw new Error('Firestore (atualizar): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
}

// Grava só os campos informados, criando o documento se ainda não existir.
function mesclar(colecao, id, dados) {
  var mascara = Object.keys(dados).map(function(k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  var r = fs('patch', '/' + colecao + '/' + encodeURIComponent(id) + '?' + mascara, campos(dados));
  if (r.codigo !== 200) throw new Error('Firestore (mesclar): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
}

function gravar(colecao, id, dados) {
  var r = fs('patch', '/' + colecao + '/' + encodeURIComponent(id), campos(dados));
  if (r.codigo !== 200) throw new Error('Firestore (gravar): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
}
