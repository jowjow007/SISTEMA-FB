// Conferência de e-mails — Fonseca e Braga
//
// Roda no Google Apps Script (script.google.com) da conta jonathan@fonsecaebraga.com.br, de hora em hora.
// 1) Lê (somente leitura) os e-mails recebidos na caixa principal — inclusive os aliases condominio@ e juridico@.
// 2) Para cada e-mail ainda sem resposta, procura a resposta no mesmo fio: na caixa principal e nos
//    ENVIADOS do responsável (a cópia encaminhada é achada pelo Message-ID original).
// 3) Grava o resultado no Firestore do portal (coleção emailsConferencia), que a aba "Conferência de E-mails" mostra.
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
  filtroGmail: '-in:sent -in:chats -in:drafts -in:spam -in:trash -category:promotions -category:social ' +
               '-category:updates -category:forums -from:me -from:fonsecaebraga.com.br'
};

var ESCOPO_GMAIL = 'https://www.googleapis.com/auth/gmail.readonly';
var ESCOPO_FIRESTORE = 'https://www.googleapis.com/auth/datastore';
var COLECAO = 'emailsConferencia';
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

  var lidos = listarRecebidos().map(function(id) { return lerMensagem(CONFIG.caixaPrincipal, id); });
  var cont = { condominio: 0, juridico: 0, meu: 0, automatico: 0, foraDasCaixas: 0 };
  lidos.forEach(function(m) {
    var c = classificar(m);
    cont[c.motivo || c.caixa]++;
  });
  Logger.log('Últimos ' + CONFIG.diasNovos + ' dias: ' + lidos.length + ' e-mails lidos → condomínio ' + cont.condominio +
             ', jurídico ' + cont.juridico + ', meu e-mail ' + cont.meu + ' · ignorados: automáticos ' + cont.automatico +
             ', só em cópia/fora das caixas ' + cont.foraDasCaixas);
}

// Uma conferência completa (é o que o agendamento roda de hora em hora).
function conferirAgora() {
  var resumo = { em: new Date(), novos: 0, respondidos: 0, pendentes: 0, erro: '' };
  try {
    resumo.novos = registrarNovos();
    var r = atualizarRespostas();
    resumo.respondidos = r.respondidos;
    resumo.pendentes = r.pendentes;
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

  var novos = 0;
  listarRecebidos().forEach(function(id) {
    if (existentes[id]) return;
    var m = lerMensagem(CONFIG.caixaPrincipal, id);
    var c = classificar(m);
    if (!c.caixa) return;
    var resp = c.caixa.responsavel;
    var criado = criar(COLECAO, id, {
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
      criadoEm: new Date()
    });
    if (criado) novos++;
  });
  return novos;
}

function atualizarRespostas() {
  var limite = Date.now() - CONFIG.diasAcompanhar * 864e5;
  var respondidos = 0, pendentes = 0;
  consultar(filtroCampo('status', 'EQUAL', 'pendente')).forEach(function(d) {
    if (!d.recebidoEm || d.recebidoEm.getTime() < limite) return;
    var recebido = d.recebidoEm.getTime();
    var achou = respostaNoFio(CONFIG.caixaPrincipal, d.threadId, recebido);
    var outro = d.responsavelEmail;
    if (!achou && d.messageId && outro && outro !== CONFIG.caixaPrincipal && CONFIG.caixasLiberadas.indexOf(outro) >= 0) {
      var tid = fioPorMessageId(outro, d.messageId);
      if (tid) achou = respostaNoFio(outro, tid, recebido);
    }
    if (achou) {
      atualizar(COLECAO, d._id, { status: 'respondido', respondidoEm: new Date(achou.em), respondidoPor: achou.por, respondidoModo: 'auto' });
      respondidos++;
    } else {
      pendentes++;
    }
  });
  return { respondidos: respondidos, pendentes: pendentes };
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

function lerMensagem(usuario, id) {
  var m = gmail(usuario, 'messages/' + id, { format: 'metadata', metadataHeaders: CABECALHOS });
  return { id: m.id, threadId: m.threadId, internalDate: +m.internalDate, snippet: m.snippet || '', h: cabecalhos(m) };
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

function automatico(h, email) {
  if ((h['auto-submitted'] || 'no').trim().toLowerCase() !== 'no') return true;
  if (/^(bulk|list|junk|auto_reply)$/i.test((h['precedence'] || '').trim())) return true;
  if (h['list-unsubscribe'] || h['list-id'] || h['x-autoreply'] || h['x-autorespond']) return true;
  return /(^|[._+-])(no-?reply|nao-?responda|naoresponder|donotreply|do-not-reply|mailer-daemon|postmaster|newsletter|bounces?|notifica(coes|cao|tions?))([._+-]|@)/i.test(email);
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
      return { em: +m.internalDate, por: de.email || usuario };
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

// Cria só se ainda não existir (nunca sobrescreve o responsável trocado no portal).
function criar(colecao, id, dados) {
  var r = fs('post', '/' + colecao + '?documentId=' + encodeURIComponent(id), campos(dados));
  if (r.codigo === 409) return false;
  if (r.codigo !== 200) throw new Error('Firestore (criar): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
  return true;
}

function atualizar(colecao, id, dados) {
  var mascara = Object.keys(dados).map(function(k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  var r = fs('patch', '/' + colecao + '/' + encodeURIComponent(id) + '?' + mascara + '&currentDocument.exists=true', campos(dados));
  if (r.codigo !== 200) throw new Error('Firestore (atualizar): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
}

function gravar(colecao, id, dados) {
  var r = fs('patch', '/' + colecao + '/' + encodeURIComponent(id), campos(dados));
  if (r.codigo !== 200) throw new Error('Firestore (gravar): ' + r.codigo + ' ' + r.corpo.slice(0, 300));
}
