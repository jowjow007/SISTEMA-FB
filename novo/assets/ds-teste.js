/* DESENHO NOVO — VERSÃO DE TESTE (07/11/2026): ícones de traço fino no lugar das ilustrações antigas.
   Troca <span class="ds-ico" data-ico="nome"> e também as <img src="img/..."> que as ferramentas montam no JavaScript. */
(function () {
  'use strict';
  var P = {
    manual: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z"/><path d="M8 7h8M8 10.5h6"/>',
    pops: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M8.5 11l1.5 1.5 3-3M8.5 16.5h7"/>',
    videos: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.5 9.5v5l4.5-2.5z"/>',
    documentos: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    colaboradores: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 13.9c2.6.2 4.6 2.2 4.6 4.6"/>',
    patrimonio: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    compras: '<path d="M3 4h2.5l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.6a1.5 1.5 0 0 0 1.5-1.1L20 8H6.3"/><circle cx="10" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    holerites: '<path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    senhas: '<circle cx="8" cy="14" r="4"/><path d="M11 11.5 20 3M16.5 6.5l2.5 2.5M14.5 8.5l2 2"/>',
    clientes: '<path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-5h6v5M8 9h1M12 9h0M15 9h1M8 12.5h1M15 12.5h1"/>',
    comece: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    astrea: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h3M7.5 17.5h6"/>',
    brcondos: '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6M8 14h8M8 17.5h5"/>',
    almah: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    notificacoes: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    gerar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    nomenclatura: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
    fluxos: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10M6 12h6a4 4 0 0 0 4-4V7"/>',
    relatorios: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    julgamento: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0zM19 7l-2.5 6a3 3 0 0 0 5 0z"/>',
    padrao: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8M12 8v8"/>'
  };
  function svg(nome) {
    var k = String(nome || '').toLowerCase().replace(/\.(jpe?g|png|svg|webp|gif)$/, '');
    var d = P[k] || P[k.replace(/s$/, '')] || P.padrao;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  function trocar(raiz) {
    (raiz || document).querySelectorAll('.ds-ico:not([data-ok])').forEach(function (e) { e.innerHTML = svg(e.dataset.ico); e.setAttribute('data-ok', '1'); });
    // ilustrações montadas pelo JavaScript (ex.: cartões do hub de Condomínios)
    (raiz || document).querySelectorAll('img[src*="img/"]:not([data-ds])').forEach(function (img) {
      var m = /img\/([\w.-]+)/.exec(img.getAttribute('src') || ''); if (!m) return;
      if (!img.closest('.hub-art,.cd-art,.hub-card,.cd-card')) return;
      var s = document.createElement('span'); s.className = 'ds-ico'; s.dataset.ico = m[1]; s.innerHTML = svg(m[1]); s.setAttribute('data-ok', '1');
      img.setAttribute('data-ds', '1'); img.replaceWith(s);
    });
  }
  // versão nova publicada em /novo/: dentro das ferramentas também só o administrador (os demais voltam ao portal)
  if (/\/novo\//.test(location.pathname)) {
    var tent = 0;
    (function trava() {
      if (!(window.firebase && firebase.apps && firebase.apps.length && firebase.auth)) { if (++tent < 100) setTimeout(trava, 150); return; }
      firebase.auth().onAuthStateChanged(function (u) {
        var sair = function () { try { (window.top || window).location.replace('/'); } catch (e) { location.replace('/'); } };
        if (!u) return sair();
        firebase.firestore().collection('users').doc(u.uid).get().then(function (d) { if (!d.exists || d.data().role !== 'admin') sair(); }).catch(sair);
      });
    })();
  }
  // tema do portal em TODAS as ferramentas (algumas, como a Matriz, não liam a escolha)
  function aplicarTema(t) { if (t === 'light') document.documentElement.setAttribute('data-theme', 'light'); else if (t) document.documentElement.removeAttribute('data-theme'); }
  try { aplicarTema(localStorage.getItem('fb-portal-theme')); } catch (e) {}
  window.addEventListener('storage', function (e) { if (e.key === 'fb-portal-theme') aplicarTema(e.newValue); });
  window.addEventListener('message', function (e) { if (e.data && e.data.type === 'fb-portal-theme') aplicarTema(e.data.theme); });
  // Condomínios e Segurança usam --paper como fundo de bloco
  if (/tools\/(condominios|admin-seguranca)\//.test(location.pathname)) document.documentElement.setAttribute('data-ds-fam', 'b');
  if (/tools\/(matriz-demandas|academia-teste)\//.test(location.pathname)) document.documentElement.setAttribute('data-ds-fam', 'm');
  /* ---------- BLOCOS EM TONS SUAVES (08/11): cada cartão/bloco ganha um tom pelo assunto do seu título ----------
     prazo/agenda = âmbar · financeiro = verde · documentos = azul · condomínio = verde-água · pessoas = lilás ·
     alertas/segurança = rosa · comunicação (e-mail, notícias, publicações) = azul-céu. Sem assunto reconhecido, vale o
     tom da ferramenta. Só muda fundo, borda e uma faixa à esquerda (nada de tamanho). Documento oficial e Chat ficam fora. */
  var TONS = [
    ['rosa', /alerta|aviso|aten[çc][ãa]o|urgen|pend[êe]n|vencid|atras|erro|falha|seguran|bloque|revog|risco|senha|acesso|permiss|comunicad/i],
    ['ambar', /prazo|agenda|audi[êe]n|calend|hoje|amanh|semana|m[êe]s\b|data|hor[áa]rio|sess[ãa]o|sess[õo]es|tarefa|demanda|astrea|cronog|vencim/i],
    ['verde', /financ|pagament|cobran|honor|valor|r\$|receita|despesa|lucro|remunera|holerite|sal[áa]rio|d[ée]bito|asaas|boleto|pix|compra|or[çc]ament|custo|patrim/i],
    ['teal', /condom[íi]n|s[íi]ndic|consel|assembl|morador|unidade|multa|recurso|regimento|conven[çc]|ementa|julgament|condo\b/i],
    ['lilas', /pessoa|usu[áa]ri|colaborad|equipe|membro|cliente|perfil|aniversa|organogr|cargo|contato|treinament|academia|curso|aula|v[íi]deo|manual|pop\b/i],
    ['azul', /document|peti[çc]|contrat|procura[çc]|modelo|arquivo|anexo|pe[çc]a|formul|minuta|gerar|nomenclat|relat[óo]ri|fluxo|calculad|c[áa]lculo/i],
    ['ceu', /e-?mail|mensag|chat|not[íi]cia|public|intima|djen|di[áa]rio|gmail|caixa|conversa|sugest|anota|assistente|sistema|link/i]
  ];
  var TOM_FERRAMENTA = {
    'admin-seguranca': 'rosa', 'cobrancas': 'verde', 'remuneracao': 'verde', 'numeros-escritorio': 'verde', 'gestao': 'verde',
    'condominios': 'teal', 'sessoes-julgamento': 'teal', 'documentos': 'azul', 'peticoes': 'azul', 'contratos': 'azul', 'calculadoras': 'azul',
    'organograma': 'lilas', 'aniversariantes': 'lilas', 'perfil': 'lilas', 'treinamentos': 'lilas', 'academia-teste': 'lilas', 'pop': 'lilas',
    'conferencia-emails': 'ceu', 'gmail': 'ceu', 'noticias': 'ceu', 'sugestoes': 'ceu', 'minhas-anotacoes': 'ceu', 'assistente-ia': 'ceu', 'sistemas': 'ceu',
    'matriz-demandas': 'ambar'
  };
  var mf = /tools\/([\w-]+)\//.exec(location.pathname), FERR = mf ? mf[1] : '';
  var tomPadrao = TOM_FERRAMENTA[FERR] || 'azul';
  var SEM_TOM = FERR === 'chat';
  var FORA = '[class*="doc-"],[class*="dc-"],[class*="sig-"],.blk,.preview,.paper,.folha,.pagina-a4,iframe,svg,table,thead,tbody,tr,td,th,button,input,select,textarea,label,a,nav,header.topbar';
  var corCard = '', corCard2 = '';
  function lerCores() {
    var p = document.createElement('div'); p.style.cssText = 'position:absolute;left:-9999px;background:var(--ds-card)'; document.body.appendChild(p);
    corCard = getComputedStyle(p).backgroundColor; p.style.background = 'var(--ds-card-2)'; corCard2 = getComputedStyle(p).backgroundColor; p.remove();
  }
  function ehBloco(el, vw) {
    if (el.hasAttribute('data-ds-tom')) return true;
    var cs = getComputedStyle(el), bg = cs.backgroundColor;
    if (bg !== corCard && bg !== corCard2) return false;
    if (cs.position === 'fixed' || cs.display === 'inline') return false;
    var r = el.getBoundingClientRect();
    if (r.width < 160 || r.height < 52 || r.width > vw * 0.96) return false;
    if (el.parentElement && el.parentElement.closest(FORA)) return false;
    return parseFloat(cs.borderTopLeftRadius) >= 4 || parseFloat(cs.borderTopWidth) >= 1 || parseFloat(cs.borderLeftWidth) >= 1;
  }
  function assunto(el) {
    var t = el.querySelector('h1,h2,h3,h4,h5,h6,legend,summary,[class*="title"],[class*="titulo"],[class*="head"],[class*="cab"],strong,b');
    var txt = ((t && t.textContent) || '') + ' ' + (el.getAttribute('aria-label') || '');
    if (!txt.trim()) txt = (el.textContent || '').slice(0, 90);
    txt = txt.slice(0, 140);
    for (var i = 0; i < TONS.length; i++) if (TONS[i][1].test(txt)) return TONS[i][0];
    return tomPadrao;
  }
  var agendado = 0;
  function tingir() {
    agendado = 0; if (SEM_TOM || !document.body) return;
    if (!corCard) lerCores();
    var vw = document.documentElement.clientWidth || innerWidth;
    var todos = document.body.querySelectorAll('div,section,article,aside,form,fieldset,details,li,main,.hub-card,.cd-card');
    var blocos = [];
    for (var i = 0; i < todos.length && i < 4000; i++) if (ehBloco(todos[i], vw)) blocos.push(todos[i]);
    // só os blocos "folha" (que não contêm outro bloco) ganham tom; o bloco que os envolve fica neutro, separando-os
    blocos.forEach(function (b) {
      var temFilho = blocos.some(function (o) { return o !== b && b.contains(o); });
      if (temFilho) { b.removeAttribute('data-ds-tom'); return; }
      if (!b.hasAttribute('data-ds-tom')) b.setAttribute('data-ds-tom', assunto(b));
    });
  }
  function agendar() { if (!agendado) agendado = setTimeout(tingir, 350); }
  window.addEventListener('resize', agendar);
  document.addEventListener('click', function () { setTimeout(agendar, 50); }, true);

  function iniciar() {
    trocar(document);
    agendar(); setTimeout(agendar, 1500); setTimeout(agendar, 4000);
    new MutationObserver(function (ms) {
      var mudou = false;
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { trocar(n.parentNode || n); mudou = true; } }); });
      if (mudou) agendar();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
