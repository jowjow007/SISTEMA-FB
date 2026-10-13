/**
 * ============================================================
 *  Sincroniza a planilha de senhas com o Portal Fonseca e Braga
 * ============================================================
 *  Este código NÃO roda no site. Ele é colado dentro de cada planilha do Google
 *  (Extensões > Apps Script) e grava as linhas no banco do Portal (Firestore):
 *    - na hora, sempre que alguém altera a planilha;
 *    - e também todo dia por volta das 20h (garantia).
 *  A planilha é a fonte: no Portal as senhas são só para consultar/copiar.
 *
 *  As senhas não passam pelo GitHub (o site é público): vão direto da planilha
 *  para o Firestore, com o login Google de quem instalou o script.
 *
 *  Passo a passo (uma vez em cada planilha):
 *   1. Abra a planilha > Extensões > Apps Script.
 *   2. Apague o que estiver no editor e cole este arquivo inteiro.
 *   3. Na linha COLECAO abaixo, deixe 'senhasDiversas' (planilha SENHAS DIVERSAS)
 *      ou troque para 'senhasRestritas' (planilha SENHAS RESTRITAS).
 *   4. Engrenagem "Configurações do projeto" > marque
 *      "Mostrar arquivo de manifesto appsscript.json no editor".
 *      Volte ao editor, abra appsscript.json e substitua tudo pelo bloco
 *      MANIFESTO que está no fim deste arquivo (sem as barras de comentário).
 *   5. Salve, escolha a função "instalarAtualizacaoAutomatica" no topo e clique
 *      em Executar. Autorize com a conta Google que é dona do projeto Firebase
 *      do Portal (sistema-fb-4cce5).
 *  Pronto: as senhas aparecem no Portal e passam a se atualizar sozinhas.
 */

const PROJETO = 'sistema-fb-4cce5';
const COLECAO = 'senhasDiversas';   // na planilha SENHAS RESTRITAS: 'senhasRestritas'

function instalarAtualizacaoAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['sincronizarSenhas', 'aoAlterarPlanilha'].indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t);
  });
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('aoAlterarPlanilha').forSpreadsheet(planilha).onChange().create();
  ScriptApp.newTrigger('sincronizarSenhas').timeBased().atHour(20).everyDays(1).inTimezone('America/Sao_Paulo').create();
  sincronizarSenhas();
}

function aoAlterarPlanilha() {
  sincronizarSenhas();
}

function sincronizarSenhas() {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(60000)) return;
  try {
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const valores = planilha.getSheets()[0].getDataRange().getDisplayValues();
    const norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase(); };
    const iCab = valores.findIndex(function (l) {
      return l.some(function (c) { return norm(c) === 'SISTEMA'; }) && l.some(function (c) { return norm(c) === 'SENHA'; });
    });
    if (iCab === -1) throw new Error('Não achei a linha de cabeçalho com SISTEMA e SENHA.');
    const cab = valores[iCab].map(norm);
    const cSis = cab.indexOf('SISTEMA'), cUsu = cab.indexOf('USUARIO'), cSen = cab.indexOf('SENHA'), cObs = cab.indexOf('OBS');

    const linhas = [];
    for (let i = iCab + 1; i < valores.length; i++) {
      const l = valores[i];
      const v = function (c) { return c >= 0 ? String(l[c] || '').trim() : ''; };
      const r = { sistema: v(cSis), usuario: v(cUsu), senha: v(cSen), obs: v(cObs), obs2: cObs >= 0 ? v(cObs + 1) : '' };
      if (r.sistema || r.usuario || r.senha || r.obs || r.obs2) {
        r.id = 'linha-' + String(i + 1).padStart(4, '0');
        r.linha = i + 1;
        linhas.push(r);
      }
    }

    const base = 'projects/' + PROJETO + '/databases/(default)/documents';
    const url = 'https://firestore.googleapis.com/v1/' + base;
    const cabecalhos = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': PROJETO };

    // o que já está no Portal (para apagar linhas que saíram da planilha)
    const existentes = [];
    let pagina = '';
    do {
      const resp = UrlFetchApp.fetch(url + '/' + COLECAO + '?pageSize=300&mask.fieldPaths=sistema' + (pagina ? '&pageToken=' + encodeURIComponent(pagina) : ''),
        { headers: cabecalhos, muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) throw new Error('Falha ao ler o Portal: ' + resp.getContentText());
      const j = JSON.parse(resp.getContentText());
      (j.documents || []).forEach(function (d) { existentes.push(d.name); });
      pagina = j.nextPageToken || '';
    } while (pagina);

    const nomes = {};
    linhas.forEach(function (r) { nomes[base + '/' + COLECAO + '/' + r.id] = true; });
    const gravacoes = [];
    existentes.forEach(function (n) { if (!nomes[n]) gravacoes.push({ delete: n }); });
    linhas.forEach(function (r) {
      gravacoes.push({ update: { name: base + '/' + COLECAO + '/' + r.id, fields: {
        sistema: { stringValue: r.sistema }, usuario: { stringValue: r.usuario }, senha: { stringValue: r.senha },
        obs: { stringValue: r.obs }, obs2: { stringValue: r.obs2 }, linha: { integerValue: String(r.linha) }
      } } });
    });
    gravacoes.push({ update: { name: base + '/senhasSync/' + COLECAO, fields: {
      atualizadoEm: { timestampValue: new Date().toISOString() },
      linhas: { integerValue: String(linhas.length) },
      urlPlanilha: { stringValue: planilha.getUrl() }
    } } });

    for (let i = 0; i < gravacoes.length; i += 450) {
      const resp = UrlFetchApp.fetch(url + ':commit', {
        method: 'post', contentType: 'application/json', headers: cabecalhos, muteHttpExceptions: true,
        payload: JSON.stringify({ writes: gravacoes.slice(i, i + 450) })
      });
      if (resp.getResponseCode() !== 200) throw new Error('Falha ao gravar no Portal: ' + resp.getContentText());
    }
    console.log(linhas.length + ' linhas enviadas ao Portal (' + COLECAO + ').');
  } finally {
    trava.releaseLock();
  }
}

/* MANIFESTO — conteúdo do appsscript.json (passo 4):
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/cloud-platform"
  ]
}
*/
