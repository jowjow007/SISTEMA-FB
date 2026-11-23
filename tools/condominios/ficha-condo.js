/* ================================================================================================
   CONDOMÍNIOS ATENDIDOS — FICHA DO CONDOMÍNIO (22/11/2026)
   Cartões no estilo do portal e a ficha completa de cada condomínio, organizada como a "Ficha Cadastral" da
   administradora: dados cadastrais, administradora (com o link do sistema), síndico, subsíndico, conselho e
   dados bancários. Os dados NÃO ficam no código: são digitados (ou colados da página da administradora) pelo
   administrador e gravados em condoUnidades/{slug}.ficha (a equipe lê; só o admin grava — regra já existente).
   Usa as funções globais da página (escapeHtml, slugify, isAdminUser, unidadesState, render, db...).
   ================================================================================================ */
var FC = { editando: null, rascunho: null, aviso: '', cpfs: {} };

function fcEsc(s) { return escapeHtml(s == null ? '' : s); }
function fcLista(v) { return (Array.isArray(v) ? v : String(v || '').split(/\n+/)).map(function (x) { return String(x).trim(); }).filter(Boolean); }
function fcUrl(u) { u = String(u || '').trim(); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u; return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
function fcFicha(c) {
  var slug = slugify(c.nome), r = (unidadesState.porSlug || {})[slug] || {}, f = r.ficha || {}, x = FC.cpfs[slug];
  if (!x || !isAdminUser()) return f;
  var o = JSON.parse(JSON.stringify(f));
  ['sindico', 'subsindico'].forEach(function (k) { if (x[k]) o[k] = Object.assign({}, o[k] || {}, { cpf: x[k] }); });
  (o.conselho || []).forEach(function (p, i) { var v = (x.conselho || {})[fcChaveCons(p, i)]; if (v) p.cpf = v; });
  return o;
}

/* ---------------------------------------------------------------- CPF só para administradores
   condoUnidades é lido por toda a equipe; o CPF/CNPJ das pessoas fica em condoFichaRestrita/{slug} (só admin). */
function fcChaveCons(p, i) { return slugify((p && p.nome) || '') || ('linha-' + i); }
function fcSeparar(ficha) {
  var f = JSON.parse(JSON.stringify(ficha || {})), c = { sindico: '', subsindico: '', conselho: {} };
  ['sindico', 'subsindico'].forEach(function (k) { if (f[k]) { c[k] = f[k].cpf || ''; delete f[k].cpf; } });
  (f.conselho || []).forEach(function (p, i) { if (p && p.cpf) c.conselho[fcChaveCons(p, i)] = p.cpf; if (p) delete p.cpf; });
  return { ficha: f, cpfs: c, tem: !!(c.sindico || c.subsindico || Object.keys(c.conselho).length) };
}
function fcTemCpfPublico(f) { return !!f && fcSeparar(f).tem; }
function fcParaGravar(sep, dados) {
  var FV = firebase.firestore.FieldValue, pub = Object.assign({}, dados, { ficha: JSON.parse(JSON.stringify(sep.ficha)) });
  ['sindico', 'subsindico'].forEach(function (k) { pub.ficha[k] = Object.assign({}, pub.ficha[k] || {}, { cpf: FV.delete() }); });
  return pub;
}
// grava a ficha sem CPF e o CPF na área restrita, juntos: ou as duas gravações entram, ou nenhuma
function fcGravarFicha(slug, dados) {
  var sep = fcSeparar(dados.ficha), b = db.batch();
  b.set(db.collection('condoUnidades').doc(slug), fcParaGravar(sep, dados), { merge: true });
  if (sep.tem || FC.cpfs[slug]) b.set(db.collection('condoFichaRestrita').doc(slug), { sindico: sep.cpfs.sindico, subsindico: sep.cpfs.subsindico, conselho: sep.cpfs.conselho, atualizadoPorUid: currentUser.uid, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
  return b.commit().then(function () { FC.cpfs[slug] = sep.cpfs; return sep.ficha; });
}
// ao abrir como administrador: carrega os CPFs e move os que ainda estiverem no documento da equipe
function fcCarregarRestrito(mapa) {
  if (!isAdminUser() || !db) return Promise.resolve();
  return db.collection('condoFichaRestrita').get().then(function (snap) {
    snap.docs.forEach(function (d) { FC.cpfs[d.id] = d.data(); });
    var b = db.batch(), mover = [];
    Object.keys(mapa).forEach(function (slug) {
      var f = mapa[slug].ficha; if (!fcTemCpfPublico(f)) return;
      var sep = fcSeparar(f), ant = FC.cpfs[slug] || {};
      var c = { sindico: sep.cpfs.sindico || ant.sindico || '', subsindico: sep.cpfs.subsindico || ant.subsindico || '', conselho: Object.assign({}, ant.conselho || {}, sep.cpfs.conselho) };
      b.set(db.collection('condoFichaRestrita').doc(slug), { sindico: c.sindico, subsindico: c.subsindico, conselho: c.conselho, atualizadoPorUid: currentUser.uid, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
      b.set(db.collection('condoUnidades').doc(slug), fcParaGravar(sep, { ficha: sep.ficha }), { merge: true });
      mover.push({ slug: slug, ficha: sep.ficha, c: c });
    });
    if (!mover.length) return;
    return b.commit().then(function () { mover.forEach(function (m) { mapa[m.slug].ficha = m.ficha; FC.cpfs[m.slug] = m.c; }); });
  }).catch(function (e) { console.warn('CPF restrito ainda indisponível', e && e.code); });
}
function fcIcone(n) {
  var I = {
    predio: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    adm: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>',
    link: '<path d="M7 17 17 7M8 7h9v9"/>',
    ficha: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    grupo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5"/>',
    banco: '<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18M12 3l9 5H3Z"/>',
    tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'
  }[n] || '';
  return '<svg class="fc-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I + '</svg>';
}

/* ---------------------------------------------------------------- cartão da grade */
function fcCard(c, i) {
  var f = fcFicha(c), s = f.sindico || {}, a = f.administradora || {}, slug = slugify(c.nome);
  var admNome = a.nome || (c.plataforma ? String(c.plataforma).toUpperCase() : ''), url = fcUrl(a.sistemaUrl);
  var sind = s.nome || c.sindico || '';
  var linha = function (rot, valor) { return '<div class="cc-l"><dt>' + rot + '</dt><dd>' + valor + '</dd></div>'; };
  return '<article class="condo-card cc">'
    + '<header class="cc-cab"><span class="cc-ic">' + fcIcone('predio') + '</span><div class="cc-tt"><h3>' + fcEsc(c.nome) + '</h3>'
    + '<span>' + fcEsc(f.cnpj || c.cnpj || '') + '</span></div><span class="badge ativo">Ativo</span></header>'
    + '<dl class="cc-dl">'
    + linha('Síndico(a)', sind ? '<b>' + fcEsc(sind) + '</b>' + (s.vigencia ? '<small>Mandato: ' + fcEsc(s.vigencia) + '</small>' : '') : '<span class="cc-vazio">não informado</span>')
    + linha('Administradora', admNome ? '<b>' + fcEsc(admNome) + '</b>' + (url ? '<a class="cc-link" href="' + fcEsc(url) + '" target="_blank" rel="noopener noreferrer">' + fcIcone('link') + 'Acessar o sistema</a>' : '') : '<span class="cc-vazio">não informada</span>')
    + '</dl>'
    + unidadesBlocoCard(slug, c.nome)
    + botoesDocsCond(c)
    + blocoConvocacao(c, false)
    + (c.nota ? '<p class="note">⚠ ' + truncate(c.nota, 90) + '</p>' : '')
    + '<button class="ver" data-open-condo="' + i + '">Ver a ficha completa <span>→</span></button>'
    + '</article>';
}

/* ---------------------------------------------------------------- ficha completa (aba "Informações Gerais") */
function fcCampo(rot, v) { return '<div class="fc-campo"><span>' + rot + '</span><b>' + (v ? fcEsc(v) : '<i class="cc-vazio">—</i>') + '</b></div>'; }
function fcContatos(p) {
  var t = fcLista(p.telefones).map(function (x) { return '<a href="tel:' + fcEsc(x.replace(/[^\d+]/g, '')) + '">' + fcIcone('tel') + fcEsc(x) + '</a>'; });
  var e = fcLista(p.emails).map(function (x) { return '<a href="mailto:' + fcEsc(x) + '">' + fcIcone('email') + fcEsc(x) + '</a>'; });
  return t.length || e.length ? '<div class="fc-contatos">' + t.concat(e).join('') + '</div>' : '';
}
function fcPessoa(cargo, p) {
  p = p || {};
  if (!p.nome && !p.cpf && !fcLista(p.telefones).length && !fcLista(p.emails).length) {
    return '<div class="fc-pessoa vazia"><span class="fc-cargo">' + fcEsc(cargo) + '</span><p class="cc-vazio">Não informado.</p></div>';
  }
  return '<div class="fc-pessoa"><span class="fc-cargo">' + fcEsc(p.cargo || cargo) + '</span><h4>' + fcEsc(p.nome || '—') + '</h4>'
    + '<div class="fc-pdados">' + (p.cpf && isAdminUser() ? '<span>CPF/CNPJ <b>' + fcEsc(p.cpf) + '</b></span>' : '') + (p.unidade ? '<span>Unidade <b>' + fcEsc(p.unidade) + '</b></span>' : '')
    + (p.vigencia ? '<span>Mandato <b>' + fcEsc(p.vigencia) + '</b></span>' : '') + '</div>' + fcContatos(p) + '</div>';
}
function fcSecao(ic, tit, ajuda, corpo) {
  return '<section class="fc-sec"><header><span class="fc-sic">' + fcIcone(ic) + '</span><div><h3>' + tit + '</h3>' + (ajuda ? '<p>' + ajuda + '</p>' : '') + '</div></header>' + corpo + '</section>';
}
function fcGeral(c) {
  var slug = slugify(c.nome);
  if (FC.editando === slug) return fcFormulario(c);
  var f = fcFicha(c), a = f.administradora || {}, b = f.banco || {}, url = fcUrl(a.sistemaUrl), reg = (unidadesState.porSlug || {})[slug] || {};
  var blocos = fcLista(f.blocos);
  var h = '<div class="fc-topo"><p class="lead" style="margin:0;font-size:.84rem;">Dados do condomínio, da administradora e de quem responde por ele.'
    + (f.atualizadoPor ? ' <span class="cc-vazio">Atualizado por ' + fcEsc(f.atualizadoPor) + (f.atualizadoEm ? ' em ' + fcEsc(f.atualizadoEm) : '') + '.</span>' : '') + '</p>'
    + (isAdminUser() ? '<button type="button" class="btn secondary" data-fc="editar" data-fc-slug="' + fcEsc(slug) + '">✎ Editar a ficha</button>' : '') + '</div>';
  if (FC.aviso) { h += '<div class="fc-aviso" role="status">' + fcEsc(FC.aviso) + '</div>'; FC.aviso = ''; }
  h += fcSecao('ficha', 'Ficha cadastral', 'Identificação do condomínio.',
    '<div class="fc-grade">' + fcCampo('Nome', f.nomeCompleto || c.nome) + fcCampo('CNPJ', f.cnpj || c.cnpj) + fcCampo('Endereço', f.endereco || c.endereco)
    + fcCampo('Cadastro municipal (CMC)', f.cmc) + fcCampo('Quantidade de unidades', f.unidades || reg.unidades) + '</div>'
    + (blocos.length ? '<div class="fc-blocos"><span>Unidades por bloco</span>' + blocos.map(function (x) { return '<em>' + fcEsc(x) + '</em>'; }).join('') + '</div>' : ''));
  h += fcSecao('adm', 'Administradora', 'Quem administra o condomínio e o sistema usado no dia a dia.',
    '<div class="fc-adm"><div><b>' + fcEsc(a.nome || (c.plataforma ? String(c.plataforma).toUpperCase() : '—')) + '</b>' + (a.contato ? '<p>' + fcEsc(a.contato).replace(/\n/g, '<br>') + '</p>' : '') + '</div>'
    + (url ? '<a class="btn" href="' + fcEsc(url) + '" target="_blank" rel="noopener noreferrer">' + fcIcone('link') + ' Acessar o sistema da administradora</a>' : '<span class="cc-vazio">Link do sistema não informado.</span>') + '</div>');
  h += fcSecao('pessoa', 'Síndico e subsíndico', 'Mandato, documento e contatos.',
    '<div class="fc-pessoas">' + fcPessoa('Síndico(a)', Object.assign({ nome: c.sindico }, f.sindico || {})) + fcPessoa('Subsíndico(a)', f.subsindico) + '</div>');
  var cons = (f.conselho || []).filter(function (p) { return p && (p.nome || p.cpf); });
  h += fcSecao('grupo', 'Conselho fiscal / deliberativo', cons.length ? cons.length + (cons.length === 1 ? ' membro.' : ' membros.') : '',
    cons.length ? '<div class="fc-pessoas">' + cons.map(function (p) { return fcPessoa('Conselho', p); }).join('') + '</div>' : '<p class="cc-vazio">Nenhum conselheiro informado.</p>');
  h += fcSecao('banco', 'Dados bancários', '', '<div class="fc-grade">' + fcCampo('Banco', b.banco) + fcCampo('Informações', b.info) + '</div>');
  h += (c.nota
    ? '<div class="obs-box"><span>ℹ️</span><div><div class="label">Observações importantes</div><div style="font-size:.86rem;line-height:1.55;">' + c.nota + '</div></div></div>'
    : '<div class="obs-box"><span>ℹ️</span><div><div class="label">Observações importantes</div><div style="font-size:.86rem;color:var(--muted);">Nenhuma particularidade registrada — segue o procedimento padrão.</div></div></div>');
  return h;
}

/* ---------------------------------------------------------------- formulário (só administrador) */
function fcIn(k, rot, v, ph, tipo) { return '<label class="fc-f"><span>' + rot + '</span><input data-fk="' + k + '" ' + (tipo ? 'type="' + tipo + '" ' : '') + 'value="' + fcEsc(v || '') + '" placeholder="' + fcEsc(ph || '') + '"></label>'; }
function fcTa(k, rot, v, ph) { return '<label class="fc-f"><span>' + rot + '</span><textarea data-fk="' + k + '" rows="2" placeholder="' + fcEsc(ph || '') + '">' + fcEsc(Array.isArray(v) ? v.join('\n') : (v || '')) + '</textarea></label>'; }
function fcPessoaForm(pre, p, comCargo, idx) {
  p = p || {};
  return (comCargo ? fcIn(pre + 'cargo', 'Cargo', p.cargo, 'Conselho Fiscal') : '') + fcIn(pre + 'nome', 'Nome completo', p.nome) + fcIn(pre + 'cpf', 'CPF/CNPJ', p.cpf)
    + (comCargo ? fcIn(pre + 'unidade', 'Unidade', p.unidade, 'Bloco C, nº 1302') : '') + fcIn(pre + 'vigencia', 'Mandato (vigência)', p.vigencia, '01/04/2026 a 31/03/2027')
    + fcTa(pre + 'telefones', 'Telefones (um por linha)', p.telefones) + fcTa(pre + 'emails', 'E-mails (um por linha)', p.emails);
}
function fcFormulario(c, rascunho) {
  var r = rascunho || FC.rascunho || {}, a = r.administradora || {}, b = r.banco || {};
  var h = '<div class="fc-form">'
    + '<div class="fc-colar"><b>Atalho: colar a ficha da administradora</b><p>Na administradora (ex.: BRCondos › Início), selecione a página toda, copie (Ctrl+C) e cole aqui. Os campos abaixo são preenchidos sozinhos; confira antes de salvar.</p>'
    + '<textarea id="fc-colar" rows="3" placeholder="Cole aqui o texto da Ficha Cadastral…"></textarea><button type="button" class="btn secondary" data-fc="colar">Preencher a partir do texto</button></div>'
    + '<fieldset><legend>Ficha cadastral</legend><div class="fc-fgrade">' + fcIn('nomeCompleto', 'Nome', r.nomeCompleto || c.nome) + fcIn('cnpj', 'CNPJ', r.cnpj || c.cnpj)
    + fcIn('endereco', 'Endereço', r.endereco || c.endereco) + fcIn('cmc', 'Cadastro municipal (CMC)', r.cmc) + fcIn('unidades', 'Quantidade de unidades', r.unidades, '', 'number')
    + fcTa('blocos', 'Unidades por bloco (um por linha)', r.blocos, 'Bloco A: 98') + '</div></fieldset>'
    + '<fieldset><legend>Administradora</legend><div class="fc-fgrade">' + fcIn('adm.nome', 'Nome', a.nome || (c.plataforma ? String(c.plataforma).toUpperCase() : ''))
    + fcIn('adm.sistemaUrl', 'Link do sistema', a.sistemaUrl, 'https://…') + fcTa('adm.contato', 'Contato / observações', a.contato) + '</div></fieldset>'
    + '<fieldset><legend>Síndico(a)</legend><div class="fc-fgrade">' + fcPessoaForm('sind.', Object.assign({ nome: c.sindico }, r.sindico || {})) + '</div></fieldset>'
    + '<fieldset><legend>Subsíndico(a)</legend><div class="fc-fgrade">' + fcPessoaForm('sub.', r.subsindico) + '</div></fieldset>'
    + '<fieldset><legend>Conselho fiscal / deliberativo</legend>' + (r.conselho || []).map(function (p, i) {
      return '<div class="fc-cons"><div class="fc-fgrade">' + fcPessoaForm('cons.' + i + '.', p, true) + '</div><button type="button" class="btn ghost" data-fc="tirar-cons" data-i="' + i + '">Remover</button></div>';
    }).join('') + '<button type="button" class="btn secondary" data-fc="mais-cons">+ Adicionar conselheiro</button></fieldset>'
    + '<fieldset><legend>Dados bancários</legend><div class="fc-fgrade">' + fcIn('banco.banco', 'Banco / agência / conta', b.banco) + fcIn('banco.info', 'Informações', b.info) + '</div></fieldset>'
    + '<div class="fc-acoes"><span class="cc-vazio" id="fc-status" role="status"></span><button type="button" class="btn ghost" data-fc="cancelar">Cancelar</button>'
    + '<button type="button" class="btn" data-fc="salvar" data-fc-slug="' + fcEsc(slugify(c.nome)) + '" data-fc-nome="' + fcEsc(c.nome) + '">Salvar a ficha</button></div></div>';
  return h;
}
function fcLerForm(raiz) {
  var r = { administradora: {}, banco: {}, sindico: {}, subsindico: {}, conselho: [] };
  Array.prototype.forEach.call((raiz || document).querySelectorAll('.fc-form [data-fk]'), function (el) {
    var k = el.getAttribute('data-fk'), v = el.value.trim(), m;
    if (/telefones$|emails$|^blocos$/.test(k)) v = fcLista(v);
    if ((m = /^adm\.(.+)$/.exec(k))) r.administradora[m[1]] = v;
    else if ((m = /^banco\.(.+)$/.exec(k))) r.banco[m[1]] = v;
    else if ((m = /^sind\.(.+)$/.exec(k))) r.sindico[m[1]] = v;
    else if ((m = /^sub\.(.+)$/.exec(k))) r.subsindico[m[1]] = v;
    else if ((m = /^cons\.(\d+)\.(.+)$/.exec(k))) { var i = +m[1]; r.conselho[i] = r.conselho[i] || {}; r.conselho[i][m[2]] = v; }
    else r[k] = v;
  });
  r.conselho = r.conselho.filter(Boolean);
  return r;
}

/* ---------------------------------------------------------------- colar a ficha da administradora (texto copiado da página) */
function fcLerTexto(txt) {
  var linhas = String(txt || '').replace(/\r/g, '').split('\n').map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  // junta rótulos quebrados em duas linhas ("CMC (CADASTRO MUNICIPAL" + "DE CONTRIBUINTE): 615…")
  var j = [];
  linhas.forEach(function (l) { var u = j[j.length - 1]; if (u && /\([^)]*$/.test(u) && /\)\s*:/.test(l)) j[j.length - 1] = u + ' ' + l; else j.push(l); });
  var r = { administradora: {}, banco: {}, sindico: {}, subsindico: {}, conselho: [], blocos: [] }, alvo = r, sec = 'ficha', ultima = null, emBlocos = false;
  var chave = function (k) { return k.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); };
  var por = function (o, campo, v) { if (/^(telefones|emails)$/.test(campo)) { o[campo] = (o[campo] || []).concat(v ? [v] : []); } else o[campo] = v; ultima = { o: o, campo: campo }; };
  j.forEach(function (l) {
    var t = chave(l);
    if (/^FICHA CADASTRAL$/.test(t) || /^CONSELHO FISCAL\s*\/\s*DELIBERATIVO$/.test(t)) { ultima = null; return; }
    if (/^SUB-?\s*SINDICO/.test(t) && l.indexOf(':') < 0) { sec = 'sub'; alvo = r.subsindico; ultima = null; emBlocos = false; return; }
    if (/^SINDICO/.test(t) && l.indexOf(':') < 0) { sec = 'sind'; alvo = r.sindico; ultima = null; emBlocos = false; return; }
    if (/^(CONSELH|MEMBRO DO CONSELHO)/.test(t) && l.indexOf(':') < 0) { sec = 'cons'; alvo = { cargo: l }; r.conselho.push(alvo); ultima = null; emBlocos = false; return; }
    if (/^DADOS BANCARIOS$/.test(t)) { sec = 'banco'; alvo = r.banco; ultima = null; emBlocos = false; return; }
    var m = /^([^:]{2,60}):\s*(.*)$/.exec(l);
    if (m) {
      var k = chave(m[1]), v = m[2].trim();
      if (emBlocos && /^(BLOCO|VAGA|TORRE|EDIF|PREDIO|LOJA|SALA|CASA)/.test(k)) { r.blocos.push(m[1].trim().replace(/\b\w+/g, function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }) + ': ' + v); return; }
      emBlocos = false;
      if (sec === 'ficha') {
        if (k === 'NOME') por(r, 'nomeCompleto', v);
        else if (k === 'CNPJ') por(r, 'cnpj', v);
        else if (/^ENDERECO/.test(k)) por(r, 'endereco', v);
        else if (/^CMC/.test(k)) por(r, 'cmc', v);
        else if (/UNIDADES POR BLOCO/.test(k)) { emBlocos = true; ultima = null; }
        else if (/UNIDADES/.test(k)) por(r, 'unidades', v.replace(/\D/g, ''));
        else ultima = null;
      } else if (sec === 'banco') {
        if (/^BANCO/.test(k)) por(r.banco, 'banco', v); else if (/^INFORMA/.test(k)) por(r.banco, 'info', v); else ultima = null;
      } else {
        if (k === 'NOME') por(alvo, 'nome', v);
        else if (/^CPF|^CNPJ/.test(k)) por(alvo, 'cpf', v);
        else if (/^VIGENCIA|^MANDATO/.test(k)) por(alvo, 'vigencia', v);
        else if (/^TELEFONE/.test(k)) por(alvo, 'telefones', v);
        else if (/^E-?MAIL/.test(k)) por(alvo, 'emails', v);
        else if (/^UNIDADE/.test(k)) por(alvo, 'unidade', v);
        else ultima = null;
      }
      return;
    }
    // linha sem rótulo: continuação do último campo (segundo telefone, segundo e-mail…)
    if (ultima) { if (/^(telefones|emails)$/.test(ultima.campo)) ultima.o[ultima.campo].push(l); else ultima.o[ultima.campo] = (ultima.o[ultima.campo] ? ultima.o[ultima.campo] + ' ' : '') + l; }
  });
  return r;
}
function fcMesclar(base, novo) {
  var r = JSON.parse(JSON.stringify(base || {}));
  ['nomeCompleto', 'cnpj', 'endereco', 'cmc', 'unidades'].forEach(function (k) { if (novo[k]) r[k] = novo[k]; });
  if (novo.blocos && novo.blocos.length) r.blocos = novo.blocos;
  ['sindico', 'subsindico', 'banco'].forEach(function (k) { if (novo[k] && Object.keys(novo[k]).length) r[k] = Object.assign({}, r[k] || {}, novo[k]); });
  if (novo.conselho && novo.conselho.length) r.conselho = novo.conselho;
  return r;
}

/* ---------------------------------------------------------------- ações */
document.addEventListener('click', function (ev) {
  var b = ev.target.closest && ev.target.closest('[data-fc]'); if (!b) return;
  var acao = b.getAttribute('data-fc');
  if (acao === 'editar') {
    var c = CONDOMINIOS[state.condoIdx]; if (!c || !isAdminUser()) return;
    FC.editando = slugify(c.nome); FC.rascunho = JSON.parse(JSON.stringify(fcFicha(c)));
    render(); var p = document.querySelector('.fc-form input'); if (p) p.focus();
    return;
  }
  if (acao === 'cancelar') { FC.editando = null; FC.rascunho = null; render(); return; }
  if (acao === 'mais-cons') { FC.rascunho = fcLerForm(); FC.rascunho.conselho.push({ cargo: 'Conselho Fiscal' }); render(); return; }
  if (acao === 'tirar-cons') { FC.rascunho = fcLerForm(); FC.rascunho.conselho.splice(+b.getAttribute('data-i'), 1); render(); return; }
  if (acao === 'colar') {
    var txt = (document.getElementById('fc-colar') || {}).value || '';
    var lido = fcLerTexto(txt), atual = fcLerForm();
    var achou = lido.nomeCompleto || lido.cnpj || lido.sindico.nome || lido.conselho.length;
    FC.rascunho = fcMesclar(atual, lido); render();
    var st = document.getElementById('fc-status');
    if (st) st.textContent = achou ? 'Campos preenchidos a partir do texto — confira e clique em "Salvar a ficha".' : 'Não reconheci a ficha nesse texto. Copie a página "Início" da administradora inteira.';
    return;
  }
  if (acao === 'salvar') {
    if (!isAdminUser() || !db) return;
    var slug = b.getAttribute('data-fc-slug'), nome = b.getAttribute('data-fc-nome'), f = fcLerForm(), stt = document.getElementById('fc-status');
    var quem = (currentProfile && (currentProfile.displayName || currentProfile.email)) || '';
    f.atualizadoPor = quem; f.atualizadoEm = new Date().toLocaleDateString('pt-BR');
    var dados = { condominio: nome, ficha: f, atualizadoPorUid: currentUser.uid, atualizadoPorNome: quem, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() };
    var n = parseInt(f.unidades, 10); if (n > 0) dados.unidades = n;
    b.disabled = true; if (stt) stt.textContent = 'Salvando…';
    fcGravarFicha(slug, dados).then(function (semCpf) {
      unidadesState.porSlug[slug] = Object.assign({}, unidadesState.porSlug[slug] || {}, { condominio: nome, ficha: semCpf }, n > 0 ? { unidades: n } : {});
      FC.editando = null; FC.rascunho = null; FC.aviso = 'Ficha salva.'; render();
    }).catch(function (e) { b.disabled = false; if (stt) stt.textContent = 'Não foi possível salvar: ' + e.message; });
  }
});
