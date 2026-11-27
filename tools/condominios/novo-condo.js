/* ================================================================================================
   NOVO CONDOMÍNIO (só administrador)
   Duas opções: baixar a lista de documentos (PDF timbrado) ou enviar os documentos para o portal ler.
   A leitura acontece NESTE navegador (pdf.js e, para PDF digitalizado, OCR Tesseract): o conteúdo dos
   documentos não é enviado a nenhum serviço de IA. O resultado sempre passa pela conferência de uma pessoa.
   Grava em dadosPrivados/condominios (lista), condoUnidades/{slug}.ficha e condominiosDocs/{slug}/.
   ================================================================================================ */
var NC = { arquivos: [], rascunho: null, nome: '', docs: {} };
var NC_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
var NC_OCR = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

var NC_CAD = { pode: false };
function podeCadastrarCondo() { return isAdminUser() || NC_CAD.pode; }
function ncCarregarPermissao() {
  if (isAdminUser() || !currentUser || !currentProfile || ['gestor', 'membro'].indexOf(currentProfile.role) < 0) return;
  db.collection('condoCadastradores').doc(currentUser.uid).get().then(function (s) {
    NC_CAD.pode = s.exists;
    if (s.exists && state.section === 'condominios') render();
  }).catch(function () { NC_CAD.pode = false; });
}
function ncBotao() {
  return (isAdminUser() ? '<button type="button" class="btn secondary" data-nc="permissoes">Quem pode cadastrar</button>' : '')
    + (podeCadastrarCondo() ? '<button type="button" class="btn" data-nc="abrir">+ Novo Condomínio</button>' : '');
}
// administrador escolhe quem cadastra condomínios e envia convenções e regimentos
function ncPermissoes() {
  var f = ncCaixa('<p class="nc-lead">Marque quem pode cadastrar condomínios e enviar convenções e regimentos.</p><div id="nc-pessoas" class="nc-lista">Carregando…</div><p id="nc-perm-status" class="nc-status" role="status"></p><div class="fc-acoes"><button type="button" class="btn ghost" data-nc="fechar">Cancelar</button><button type="button" class="btn" data-nc="salvar-perm" disabled>Salvar</button></div>');
  Promise.all([db.collection('users').get(), db.collection('condoCadastradores').get()]).then(function (r) {
    var marcados = {}; r[1].docs.forEach(function (d) { marcados[d.id] = 1; });
    NC.pessoas = r[0].docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); })
      .filter(function (u) { return ['gestor', 'membro'].indexOf(u.role) >= 0 && u.acesso === 'ativo'; })
      .sort(function (a, b) { return String(a.displayName || a.email).localeCompare(String(b.displayName || b.email), 'pt-BR'); });
    NC.marcados = marcados;
    var el = f.querySelector('#nc-pessoas');
    el.innerHTML = NC.pessoas.length ? NC.pessoas.map(function (u) {
      return '<label class="nc-pessoa"><input type="checkbox" data-nc-uid="' + fcEsc(u.uid) + '"' + (marcados[u.uid] ? ' checked' : '') + '> <span>' + fcEsc(u.displayName || u.email) + '</span></label>';
    }).join('') : 'Nenhuma pessoa ativa da equipe.';
    f.querySelector('[data-nc="salvar-perm"]').disabled = !NC.pessoas.length;
  }).catch(function (e) { f.querySelector('#nc-pessoas').textContent = 'Não foi possível carregar: ' + e.message; });
}
function ncSalvarPermissoes(bt) {
  var st = document.getElementById('nc-perm-status'), b = db.batch(), n = 0;
  NC.pessoas.forEach(function (u) {
    var el = document.querySelector('[data-nc-uid="' + u.uid + '"]'), quer = !!(el && el.checked), tem = !!NC.marcados[u.uid], ref = db.collection('condoCadastradores').doc(u.uid);
    if (quer && !tem) { b.set(ref, { nome: u.displayName || '', email: u.email || '', definidoPor: currentUser.uid, definidoEm: firebase.firestore.FieldValue.serverTimestamp() }); n++; }
    if (!quer && tem) { b.delete(ref); n++; }
  });
  if (!n) return ncFechar();
  bt.disabled = true; st.textContent = 'Salvando…';
  b.commit().then(ncFechar).catch(function (e) { bt.disabled = false; st.textContent = 'Não foi possível salvar: ' + e.message; });
}
function ncCaixa(corpo) {
  ncFechar();
  var f = document.createElement('div');
  f.id = 'nc-modal'; f.className = 'nc-fundo'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-label', 'Novo condomínio');
  f.innerHTML = '<div class="nc-caixa"><div class="nc-topo"><b>Novo condomínio</b><button type="button" class="btn ghost" data-nc="fechar" aria-label="Fechar">✕</button></div><div class="nc-corpo">' + corpo + '</div></div>';
  document.body.appendChild(f);
  return f;
}
function ncFechar() { var m = document.getElementById('nc-modal'); if (m) m.remove(); }
function ncInicio() {
  NC = { arquivos: [], rascunho: null, nome: '', docs: {} };
  ncCaixa('<p class="nc-lead">Como você quer começar?</p><div class="nc-opcoes">'
    + '<a class="nc-opcao" href="lista-documentos-novo-condominio.pdf" download="Lista de documentos - Novo condomínio - Fonseca e Braga.pdf"><b>Baixar a lista de documentos</b><span>PDF no timbrado do escritório, com capa, para enviar ao síndico ou à administradora.</span></a>'
    + '<button type="button" class="nc-opcao" data-nc="enviar"><b>Enviar os documentos</b><span>O portal lê os PDFs, preenche a ficha e você confere antes de salvar.</span></button>'
    + '<button type="button" class="nc-opcao" data-nc="sem-docs"><b>Começar sem documentos</b><span>Só o nome é obrigatório. Preencha o que já tiver e complete a ficha e os documentos depois.</span></button></div>');
}
function ncTelaEnvio() {
  ncCaixa('<p class="nc-lead">Selecione os PDFs do condomínio: Convenção, Regimento, ata de eleição, cartão CNPJ e ficha da administradora.</p>'
    + '<label class="btn secondary" style="cursor:pointer;">Escolher os PDFs<input type="file" id="nc-arquivos" accept="application/pdf,.pdf" multiple hidden></label>'
    + '<div id="nc-lista" class="nc-lista"></div><p id="nc-status" class="nc-status" role="status"></p>'
    + '<div class="fc-acoes"><button type="button" class="btn ghost" data-nc="inicio">Voltar</button><button type="button" class="btn ghost" data-nc="sem-docs">Continuar sem documentos</button><button type="button" class="btn" data-nc="ler" id="nc-ler" disabled>Ler os documentos</button></div>');
}
function ncScript(src) {
  return new Promise(function (ok, erro) {
    if (document.querySelector('script[src="' + src + '"]')) return ok();
    var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error('não foi possível carregar o leitor de PDF')); };
    document.head.appendChild(s);
  });
}
function ncTipo(nome, texto) {
  var n = String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/conven/.test(n)) return 'convencao';
  if (/regim/.test(n)) return 'regimento';
  var t = String(texto || '').slice(0, 1500).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/convencao (de|do) condominio/.test(t)) return 'convencao';
  if (/regimento interno/.test(t)) return 'regimento';
  return '';
}
function ncLerPdf(arq, aviso) {
  return arq.arrayBuffer().then(function (buf) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = NC_PDFJS + 'pdf.worker.min.js';
    return window.pdfjsLib.getDocument({ data: buf }).promise;
  }).then(function (pdf) {
    var paginas = [], cadeia = Promise.resolve();
    for (var i = 1; i <= pdf.numPages; i++) (function (n) {
      cadeia = cadeia.then(function () { return pdf.getPage(n); }).then(function (p) { return p.getTextContent(); }).then(function (c) {
        var linhas = [], y = null;
        c.items.forEach(function (it) { var yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 3) linhas.push('\n'); linhas.push(it.str + ' '); y = yy; });
        paginas[n - 1] = linhas.join('');
      });
    })(i);
    return cadeia.then(function () {
      var letras = paginas.join('').replace(/\W/g, '').length;
      if (letras / Math.max(pdf.numPages, 1) >= 150) return paginas.join('\n');
      return ncOcr(pdf, aviso);
    });
  });
}
// PDF digitalizado: lê as primeiras páginas e as últimas (identificação do condomínio e assinaturas)
function ncOcr(pdf, aviso) {
  return ncScript(NC_OCR).then(function () { return window.Tesseract.createWorker('por'); }).then(function (w) {
    var nums = [], total = pdf.numPages, i;
    for (i = 1; i <= Math.min(10, total); i++) nums.push(i);
    for (i = Math.max(11, total - 1); i <= total; i++) nums.push(i);
    var txt = [], cadeia = Promise.resolve();
    nums.forEach(function (n, k) {
      cadeia = cadeia.then(function () { aviso('Lendo página digitalizada ' + (k + 1) + ' de ' + nums.length + '…'); return pdf.getPage(n); }).then(function (p) {
        var v = p.getViewport({ scale: 2 }), cv = document.createElement('canvas'); cv.width = v.width; cv.height = v.height;
        return p.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise.then(function () { return w.recognize(cv); });
      }).then(function (r) { txt.push(r.data.text); });
    });
    return cadeia.then(function () { return w.terminate(); }).then(function () { return txt.join('\n'); });
  });
}
function ncCnpjValido(c) {
  c = String(c).replace(/\D/g, ''); if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  function dv(t) { var s = 0, p = t - 7; for (var i = 0; i < t; i++) { s += +c[i] * p--; if (p < 2) p = 9; } var r = s % 11; return r < 2 ? 0 : 11 - r; }
  return dv(12) === +c[12] && dv(13) === +c[13];
}
// Só aceita o CNPJ quando ele aparece ligado ao próprio condomínio: a convenção costuma trazer também o da incorporadora.
function ncExtrair(textos) {
  var r = { administradora: {}, banco: {}, sindico: {}, subsindico: {}, conselho: [], blocos: [] }, tudo = textos.join('\n');
  var cn = /CONDOM[ÍI]NIO[^\n]{0,90}?CNPJ[^\d]{0,25}(\d{2}[. ]?\d{3}[. ]?\d{3}\s?\/\s?\d{4}\s?-?\s?\d{2})/i.exec(tudo);
  if (cn && ncCnpjValido(cn[1])) r.cnpj = cn[1].replace(/\s/g, '');
  // título em maiúsculas pode quebrar em duas linhas; em texto corrido o nome vai até a vírgula ou o fim da linha
  // texto corrido como "nos termos desta Convenção do Condomínio e leis vigentes" não é nome: depois de
  // "Condomínio" o nome começa com maiúscula e nunca com conectivo (e, de, que...)
  var ruim = /^(?:condom[íi]nio|edif[íi]cio|residencial)\s+(?:e|é|de|do|da|dos|das|que|a|o|as|os|em|no|na|ou|para|por|com|se|ao|à)\b/i;
  var nm = null, m, rxs = [
    /(?:CONVENÇÃO|CONVENCAO|REGIMENTO INTERNO)\s+(?:DE\s+CONDOM[ÍI]NIO\s+)?D[OA]\s+((?:CONDOM[ÍI]NIO|EDIF[ÍI]CIO|RESIDENCIAL)(?:\s+[A-ZÀ-Ú0-9'&-]+){1,8})/g,
    /(?:Conven[çc][ãa]o|Regimento Interno)\s+(?:de\s+Condom[íi]nio\s+)?d[oa]\s+((?:Condom[íi]nio|Edif[íi]cio|Residencial)\s+[A-ZÀ-Ú0-9][^\n,.;]{1,70})/g];
  rxs.forEach(function (rx) { while (!nm && (m = rx.exec(tudo))) if (!ruim.test(m[1].replace(/\s+/g, ' '))) nm = m; });
  if (nm) r.nomeCompleto = nm[1].replace(/\s+/g, ' ').replace(/^(.{12,}?)\s+(?:CONDOM[ÍI]NIO|CNPJ)\b.*$/, '$1').trim();
  var en = /situad[oa]\s+(?:na|no|à)\s+((?:Rua|Avenida|Av\.|Alameda|Rodovia)[^\n;]{5,110})/i.exec(tudo);
  if (en) r.endereco = en[1].replace(/\s+/g, ' ').replace(/[,.]\s*$/, '').trim();
  var un = /\b(\d{1,4})\s*(?:\([^)]{2,40}\)\s*)?unidades\s+aut[ôo]nomas/i.exec(tudo);
  if (un) r.unidades = un[1];
  var bl, rx = /\b(Torre|Bloco)\s+([A-Z0-9]{1,3})\s*:\s*(\d{1,4})\s+apartamentos/gi, vistos = {};
  while ((bl = rx.exec(tudo))) { var k = bl[1] + ' ' + bl[2].toUpperCase(); if (!vistos[k]) { vistos[k] = 1; r.blocos.push(k.charAt(0).toUpperCase() + k.slice(1).toLowerCase().replace(/ (.+)$/, function (m, x) { return ' ' + x.toUpperCase(); }) + ': ' + bl[3]); } }
  // a ficha da administradora, se veio entre os PDFs, tem os campos rotulados
  if (/FICHA CADASTRAL/i.test(tudo) && typeof fcLerTexto === 'function') {
    var lido = fcLerTexto(tudo.slice(tudo.search(/FICHA CADASTRAL/i)));
    r = fcMesclar(r, lido);
  }
  return r;
}
// sem nome confiável no texto, usa o nome do arquivo: "GRANDVERSE GARDEN - Convenção.pdf" → "Grandverse Garden"
function ncNomeDoArquivo(arqs) {
  for (var i = 0; i < arqs.length; i++) {
    var s = String(arqs[i].name || '').replace(/\.[a-z0-9]{2,4}$/i, '')
      .replace(/\b(conven[çc][ãa]o|regimento(\s+interno)?|condom[íi]nio|edif[íi]cio|ficha(\s+cadastral)?|de|do|da)\b/gi, ' ')
      .replace(/[-_–—()]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.replace(/[^A-Za-zÀ-ú]/g, '').length >= 3) return s.toLowerCase().replace(/(^|\s)(\S)/g, function (x, a, b) { return a + b.toUpperCase(); });
  }
  return '';
}
function ncLer() {
  var st = document.getElementById('nc-status'), bt = document.getElementById('nc-ler');
  var aviso = function (m) { if (st) st.textContent = m; };
  if (bt) bt.disabled = true;
  var textos = [], cadeia = ncScript(NC_PDFJS + 'pdf.min.js');
  NC.docs = {};
  NC.arquivos.forEach(function (a, i) {
    cadeia = cadeia.then(function () { aviso('Lendo ' + (i + 1) + ' de ' + NC.arquivos.length + ': ' + a.name); return ncLerPdf(a, aviso); }).then(function (t) {
      textos.push(t); var tipo = ncTipo(a.name, t); if (tipo && !NC.docs[tipo]) NC.docs[tipo] = a;
    });
  });
  cadeia.then(function () {
    NC.rascunho = ncExtrair(textos);
    if (!NC.rascunho.nomeCompleto) { var pelo = ncNomeDoArquivo(NC.arquivos); if (pelo) NC.rascunho.nomeCompleto = 'Condomínio ' + pelo; }
    NC.nome = (NC.rascunho.nomeCompleto || '').replace(/^(condom[íi]nio|edif[íi]cio)\s+(residencial\s+)?/i, '');
    ncTelaConferir('');
  }).catch(function (e) { console.warn('novo condomínio', e); aviso('Não foi possível ler: ' + e.message); if (bt) bt.disabled = false; });
}
function ncTelaConferir(msg) {
  var r = NC.rascunho || {};
  var form = fcFormulario({ nome: r.nomeCompleto || '', cnpj: r.cnpj || '', endereco: r.endereco || '', plataforma: '', sindico: '' }, r)
    .replace('data-fc="salvar"', 'data-nc="salvar"').replace('data-fc="cancelar"', 'data-nc="fechar"')
    .replace('data-fc="colar"', 'data-nc="colar"').replace('data-fc="mais-cons"', 'data-nc="mais-cons"').replace(/data-fc="tirar-cons"/g, 'data-nc="tirar-cons"');
  var docs = ['convencao', 'regimento'].map(function (k) { return (k === 'convencao' ? 'Convenção' : 'Regimento') + ': ' + (NC.docs[k] ? fcEsc(NC.docs[k].name) : 'não enviado'); }).join(' · ');
  var semDocs = !NC.arquivos.length;
  ncCaixa('<div class="fc-aviso" style="background:var(--red-pale);color:var(--text);">' + (semDocs
      ? 'Só o nome curto é obrigatório. Preencha o que já tiver; o resto pode ser completado depois em "Ver a ficha completa › ✎ Editar a ficha", e a Convenção e o Regimento pelo botão "Enviar convenções e regimentos".'
      : 'Confira cada campo. O que o portal não encontrou com segurança ficou em branco. Só o nome curto é obrigatório.') + '</div>'
    + '<label class="fc-f" style="margin-bottom:10px;"><span>Nome curto no portal (obrigatório)</span><input id="nc-nome" value="' + fcEsc(NC.nome) + '" placeholder="Ex.: Jardim das Flores"></label>'
    + '<p class="nc-status">' + docs + '</p>' + form);
  if (msg) { var s = document.getElementById('fc-status'); if (s) s.textContent = msg; }
}
function ncSalvar(b) {
  var st = document.getElementById('fc-status'), caixa = document.getElementById('nc-modal');
  var nome = ((document.getElementById('nc-nome') || {}).value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (!nome) { st.textContent = 'Informe o nome curto do condomínio.'; return; }
  var slug = slugify(nome), f = fcLerForm(caixa), quem = (currentProfile && (currentProfile.displayName || currentProfile.email)) || '';
  f.atualizadoPor = quem; f.atualizadoEm = new Date().toLocaleDateString('pt-BR');
  var ref = db.collection('dadosPrivados').doc('condominios');
  b.disabled = true; st.textContent = 'Salvando…';
  db.runTransaction(function (tx) {
    return tx.get(ref).then(function (s) {
      if (!s.exists) throw new Error('a lista de condomínios não foi encontrada');
      var d = JSON.parse(s.data().json);
      d.condominios = d.condominios || [];
      if (d.condominios.some(function (c) { return slugify(c.nome) === slug; })) throw new Error('já existe um condomínio com esse nome');
      d.condominios.push({ nome: nome, sindico: (f.sindico && f.sindico.nome) || '', plataforma: (f.administradora && f.administradora.nome) || '', cnpj: f.cnpj || '', endereco: f.endereco || '', nota: '' });
      tx.update(ref, { json: JSON.stringify(d), atualizadoPor: currentUser.uid, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
      return d;
    });
  }).then(function (d) {
    var dados = { condominio: nome, ficha: f, atualizadoPorUid: currentUser.uid, atualizadoPorNome: quem, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() }, n = parseInt(f.unidades, 10);
    if (n > 0) dados.unidades = n;
    // o nome entra na lista da tela de cadastro (síndicos e conselheiros escolhem o condomínio)
    db.collection('publico').doc('condominios').set({ nomes: firebase.firestore.FieldValue.arrayUnion(nome), atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () {});
    return fcGravarFicha(slug, dados).then(function (semCpf) {
      CONDOMINIOS.length = 0; Array.prototype.push.apply(CONDOMINIOS, d.condominios);
      unidadesState.porSlug[slug] = Object.assign({}, unidadesState.porSlug[slug] || {}, { condominio: nome, ficha: semCpf }, n > 0 ? { unidades: n } : {});
      var cad = Promise.resolve(), erros = [];
      ['convencao', 'regimento'].forEach(function (k) {
        var a = NC.docs[k]; if (!a) return;
        cad = cad.then(function () {
          st.textContent = 'Enviando ' + (k === 'convencao' ? 'a Convenção' : 'o Regimento') + '…';
          var bonito = (k === 'convencao' ? 'Convenção' : 'Regimento Interno') + ' - ' + nome + '.pdf';
          return firebase.storage().ref('condominiosDocs/' + slug + '/' + k + '.pdf').put(a, { contentType: 'application/pdf', contentDisposition: 'inline; filename="' + bonito.replace(/[^\x20-\x7e]/g, '_') + '"', customMetadata: { nomeOriginal: bonito } });
        }).catch(function () { erros.push(k === 'convencao' ? 'Convenção' : 'Regimento'); });
      });
      return cad.then(function () { return erros; });
    });
  }).then(function (erros) {
    ncFechar();
    if (typeof carregarDocsCond === 'function') carregarDocsCond(true);
    render();
    if (erros.length) alert('O condomínio foi salvo, mas não consegui enviar: ' + erros.join(' e ') + '. Envie pelo botão "Enviar convenções e regimentos".');
  }).catch(function (e) { b.disabled = false; st.textContent = 'Não foi possível salvar: ' + e.message; });
}

document.addEventListener('click', function (ev) {
  var b = ev.target.closest && ev.target.closest('[data-nc]');
  if (!b) { if (ev.target && ev.target.id === 'nc-modal') ncFechar(); return; }
  if (!podeCadastrarCondo()) return;
  var a = b.getAttribute('data-nc');
  if (a === 'permissoes') return isAdminUser() ? ncPermissoes() : undefined;
  if (a === 'salvar-perm') return isAdminUser() ? ncSalvarPermissoes(b) : undefined;
  if (a === 'abrir' || a === 'inicio') return ncInicio();
  if (a === 'fechar') return ncFechar();
  if (a === 'enviar') return ncTelaEnvio();
  if (a === 'ler') return ncLer();
  if (a === 'sem-docs') { NC.arquivos = []; NC.docs = {}; NC.rascunho = { administradora: {}, banco: {}, sindico: {}, subsindico: {}, conselho: [], blocos: [] }; NC.nome = ''; return ncTelaConferir(''); }
  if (a === 'salvar') return ncSalvar(b);
  var caixa = document.getElementById('nc-modal');
  if (a === 'mais-cons' || a === 'tirar-cons' || a === 'colar') {
    NC.nome = (document.getElementById('nc-nome') || {}).value || '';
    var atual = fcLerForm(caixa);
    if (a === 'mais-cons') atual.conselho.push({ cargo: 'Conselho Fiscal' });
    if (a === 'tirar-cons') atual.conselho.splice(+b.getAttribute('data-i'), 1);
    if (a === 'colar') atual = fcMesclar(atual, fcLerTexto((document.getElementById('fc-colar') || {}).value || ''));
    NC.rascunho = atual; ncTelaConferir(a === 'colar' ? 'Campos preenchidos a partir do texto. Confira antes de salvar.' : '');
  }
});
document.addEventListener('change', function (ev) {
  if (!ev.target || ev.target.id !== 'nc-arquivos') return;
  NC.arquivos = Array.prototype.slice.call(ev.target.files || []).filter(function (a) { return /\.pdf$/i.test(a.name) && a.size <= 60 * 1024 * 1024; });
  document.getElementById('nc-lista').innerHTML = NC.arquivos.map(function (a) { return '<div>' + fcEsc(a.name) + '</div>'; }).join('');
  document.getElementById('nc-ler').disabled = !NC.arquivos.length;
  document.getElementById('nc-status').textContent = NC.arquivos.length === ev.target.files.length ? '' : 'Alguns arquivos foram ignorados (só PDF de até 60 MB).';
});
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') ncFechar(); });
