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
  function iniciar() {
    trocar(document);
    new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) trocar(n.parentNode || n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
