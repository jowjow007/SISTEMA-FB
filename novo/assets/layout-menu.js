/* ================================================================================================
   VERSÃO NOVA (/novo/) — barra lateral organizada (21/11/2026)
   - Visão geral · Favoritos · categorias recolhíveis · abas principais · rodapé (o rodapé é de layout-visao-geral.js).
   - Sem sub-abas na lateral: as divisões internas ficam dentro de cada página.
   - Categoria e ordem vêm desta CONFIGURAÇÃO EXPLÍCITA, ligada à pasta da ferramenta (tools/<pasta>/), nunca ao nome
     da aba: renomear uma aba não muda a categoria.
   - Alguns itens abrem um destino dentro de uma ferramenta (ex.: Gestão › Compras). Eles só aparecem quando a própria
     ferramenta confirma o acesso (window.fbNav.disponivel) ou, nas sub-abas restritas, quando o portal confirma a
     liberação — promover um item à lateral não amplia permissão nenhuma.
   - Favoritos pessoais em perfis/{uid}.navFavoritos (a própria pessoa grava; regra já existente), com cópia local.
   ================================================================================================ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var lerLS = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  var gravarLS = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var P = function () { return window.__fbPortal; };

  // ---------------------------------------------------------------- configuração do menu (ordem e categorias)
  // f = pasta da ferramenta; d = destino interno (só para itens promovidos); rot = nome do item promovido.
  var MENU = [
    { id: 'rotina', rot: 'Minha rotina', itens: [{ f: 'minhas-anotacoes' }, { f: 'chat' }, { f: 'gmail' }, { f: 'conferencia-emails' }] },
    { id: 'juridico', rot: 'Jurídico', itens: [{ f: 'agenda-teste' }, { f: 'matriz-demandas' }, { f: 'peticoes' }, { f: 'documentos' }, { f: 'contratos' },
      { f: 'calculadoras' }, { f: 'assistente-ia' }, { f: 'sistemas' }] },
    { id: 'condominios', rot: 'Condomínios', itens: [{ f: 'condominios', d: 'consultar', rot: 'Consultar Clientes' }, { f: 'condominios', d: 'notificacao', rot: 'Gerar Notificação' },
      { f: 'condominios', d: 'sessoes', rot: 'Sessões de Julgamento' }, { f: 'condominios', d: 'relatorios', rot: 'Relatórios Condominiais' },
      { f: 'condominios', d: 'procedimentos', rot: 'Procedimentos do setor' }] },
    { id: 'conhecimento', rot: 'Conhecimento', itens: [{ f: 'treinamentos' }, { f: 'pop' }, { f: 'academia-teste' }, { f: 'noticias' }] },
    { id: 'escritorio', rot: 'Escritório', itens: [{ f: 'organograma' }, { f: 'aniversariantes' }, { f: 'sugestoes' }] },
    { id: 'gestao', rot: 'Gestão', itens: [{ f: 'numeros-escritorio' }, { f: 'gestao', d: 'colaboradores', rot: 'Colaboradores' }, { f: 'gestao', d: 'holerites', rot: 'Holerites' },
      { f: 'remuneracao' }, { f: 'documentos', d: 'cobrancas', rot: 'Relatório de Cobranças' }, { f: 'gestao', d: 'compras', rot: 'Compras' },
      { f: 'gestao', d: 'patrimonio', rot: 'Patrimônio' }] },
    { id: 'admin', rot: 'Administração do portal', itens: [{ admin: true, rot: 'Administração' }, { f: 'gestao', d: 'senhas', rot: 'Senhas' }, { f: 'monitor-pcs' },
      { f: 'admin-seguranca' }] }
  ];
  var CATEGORIA_SOBRAS = 'escritorio';   // aba nova que ainda não está na configuração: entra no fim de Escritório (não some)

  // destinos internos (sub-abas) de cada ferramenta: favoritos, busca, link direto e "onde estou".
  // nav: a ferramenta tem window.fbNav (abre e diz se está liberado); sel: botão da própria página; sub: sub-aba restrita do portal
  var DESTINOS = {
    'chat': { sel: [['todos', 'Todas as conversas', '[data-tab="todos"]'], ['favoritos', 'Favoritos das conversas', '[data-tab="favoritos"]']] },
    'agenda-teste': { sel: [['agenda', 'Agenda', '[data-sub="agenda"]'], ['clientes', 'Clientes', '[data-sub="clientes"]'], ['processos', 'Processos e casos', '[data-sub="processos"]'],
      ['publicacoes', 'Publicações', '[data-sub="publicacoes"]'], ['relatorios', 'Relatórios', '[data-sub="relatorios"]']] },
    'matriz-demandas': { sel: [['tipo', 'Atividade', '[data-mode="tipo"]'], ['responsavel', 'Responsável', '[data-mode="responsavel"]'], ['revisor', 'Revisor/Orientador', '[data-mode="revisor"]'],
      ['calculadora', 'Calculadora de Prazo', '[data-mode="calculadora"]'], ['prazotribunal', 'Prazo por tribunal', '[data-mode="prazotribunal"]'], ['guia', 'Como Usar', '[data-mode="guia"]'],
      ['feedback', 'Sugestões da Matriz', '[data-mode="feedback"]'], ['calendario', 'Calendário Forense', '[data-mode="calendario"]']] },
    'peticoes': { sel: [['formatar', 'Formatar petição', '[data-view="formatar"]'], ['parecer', 'Formatar parecer', '[data-view="parecer"]'],
      ['notificacao', 'Formatar notificação', '[data-view="notificacao"]'], ['nomenclatura', 'Nomenclatura', '[data-view="nomenclatura"]']] },
    'documentos': { nav: [['procuracao', 'Procuração'], ['substabelecimento', 'Substabelecimento'], ['hipossuficiencia', 'Declaração de Hipossuficiência'],
      ['termo_repasse', 'Termo de Repasse'], ['recibo', 'Recibo'], ['carta_preposicao', 'Carta de Preposição'], ['peticao_ciencia', 'Petição de Ciência'], ['cobrancas', 'Relatório de Cobranças']] },
    'contratos': { sel: [['contrato_pf', 'Contrato — Pessoa Física', '[data-tipo="contrato_pf"]'], ['contrato_pj', 'Contrato — Pessoa Jurídica', '[data-tipo="contrato_pj"]'],
      ['contrato_condominio', 'Contrato — Condomínio', '[data-tipo="contrato_condominio"]'], ['proposta_pf_pj', 'Proposta — PF/PJ', '[data-tipo="proposta_pf_pj"]'],
      ['proposta_condominio', 'Proposta — Condomínio', '[data-tipo="proposta_condominio"]']] },
    'calculadoras': { sel: [['price', 'Parcelas (Price)', '[data-painel="panel-price"]'], ['taxa', 'Descobrir os juros', '[data-painel="panel-taxa"]'],
      ['atraso', 'Débito em atraso', '[data-painel="panel-atraso"]'], ['js', 'Juros simples × compostos', '[data-painel="panel-js"]'],
      ['conv', 'Converter taxa', '[data-painel="panel-conv"]'], ['atual', 'Calculadora', '[data-painel="panel-atual"]']] },
    'conferencia-emails': { sel: [['conf', 'Conferência', '[data-aba="conf"]'], ['env', 'Enviados', '[data-aba="env"]'], ['hist', 'Histórico', '[data-aba="hist"]'], ['rel', 'Relatório', '[data-aba="rel"]']] },
    'condominios': { nav: [['consultar', 'Consultar Clientes'], ['consultar.calculadoras', 'Calculadoras do setor'], ['notificacao', 'Compor notificação'],
      ['notificacao.prontas', 'Notificações prontas'], ['notificacao.padrao', 'Padrão de Notificações'], ['notificacao.nomenclatura', 'Nomenclatura do setor'],
      ['relatorios', 'Relatórios Condominiais'], ['procedimentos', 'Comece por Aqui'], ['procedimentos.pops', 'POPs do setor'], ['procedimentos.astrea', 'ASTREA'],
      ['procedimentos.brcondos', 'BRCondos'], ['procedimentos.almahcondos', 'AlmahCondos'], ['procedimentos.fluxos', 'Fluxos'],
      ['sessoes', 'Sessões de Julgamento'], ['sessoes.ementario', 'Ementário', '[data-ir="ementario"]'], ['sessoes.conselheiros', 'Conselheiros', '[data-ir="conselheiros"]']],
      pagina: { sessoes: 'sessoes-julgamento' } },
    'treinamentos': { sel: [['manual', 'Manual', '[data-goto="manual"]'], ['pop', 'POP', '[data-goto="pop"]'], ['videos', 'Vídeos', '[data-goto="videos"]'], ['documentos', 'Documentos de treinamento', '[data-goto="documentos"]']] },
    'numeros-escritorio': { sel: [['geral', 'Visão Geral', '[data-tab="geral"]'], ['clientes', 'Clientes', '[data-tab="clientes"]', 'clientes'], ['juizo', 'Juízo & Ação', '[data-tab="juizo"]', 'juizo'],
      ['efetividade', 'Efetividade', '[data-tab="efetividade"]', 'efetividade'], ['qualidade', 'Qualidade de Cadastro', '[data-tab="qualidade"]'], ['agenda', 'Agenda — Astrea', '[data-tab="agenda"]']] },
    'remuneracao': { sel: [['mes', 'Lançamento do mês', '[data-aba="mes"]'], ['pessoas', 'Pessoas e cargos', '[data-aba="pessoas"]'], ['cargos', 'Cargos e percentuais', '[data-aba="cargos"]']] },
    'sugestoes': { sel: [['abertas', 'Abertas', '[data-view="abertas"]'], ['historico', 'Implantadas e excluídas', '[data-view="historico"]']] },
    'gestao': { nav: [['colaboradores', 'Colaboradores'], ['holerites', 'Holerites'], ['compras', 'Compras'], ['compras.lista', 'Lista de compras', '[data-cp-view="aprovacao"]'],
      ['compras.recebidas', 'Compras recebidas', '[data-cp-view="recebidas"]'], ['patrimonio', 'Patrimônio'], ['senhas', 'Senhas']] }
  };
  // ferramentas que só existem pelos itens promovidos (sem item principal): sem destino, abrem o primeiro liberado
  var SO_PROMOVIDOS = { condominios: 1, gestao: 1 };

  // ---------------------------------------------------------------- estado
  var S = { uid: null, favs: [], estado: {}, disp: {}, montando: false, abertas: lerLS('vg-cat-abertas', null) };
  var ICONE_ESTRELA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
  var ICONE_ESTRELA_CHEIA = ICONE_ESTRELA.replace('fill="none"', 'fill="currentColor"');
  var ICONE_SETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  function pasta(url) { var m = /tools\/([^\/?#]+)/.exec(String(url || '')); return m ? m[1] : ''; }
  function abaDaPasta(f) {
    var p = P(); if (!p) return null;
    return p.abas().filter(function (t) { return pasta(t.url) === f && p.permitida(t.id); })[0] || null;
  }
  function destinosDe(f) {
    var c = DESTINOS[f]; if (!c) return [];
    return (c.nav || c.sel || []).map(function (x) { return { id: x[0], rot: x[1], sel: x[2] || '', sub: c.sel ? x[3] || '' : '', nav: !!c.nav }; });
  }
  function destino(f, id) { return destinosDe(f).filter(function (d) { return d.id === id; })[0] || null; }
  function promovidos(f) { var r = []; MENU.forEach(function (c) { c.itens.forEach(function (i) { if (i.f === f && i.d) r.push(i); }); }); return r; }
  function temItemPrincipal(f) { return MENU.some(function (c) { return c.itens.some(function (i) { return i.f === f && !i.d; }); }); }
  function promovidoDe(f, d) {   // item promovido que contém o destino d (ex.: "notificacao.prontas" -> Gerar Notificação)
    if (!d) return null;
    return promovidos(f).filter(function (i) { return d === i.d || d.indexOf(i.d + '.') === 0; })[0] || null;
  }
  function quadro(tabId) { var p = P(); return p ? p.quadroSeExistir(tabId) : null; }
  function janela(tabId) { var q = quadro(tabId); try { return q && q.contentWindow && q.contentDocument && q.contentDocument.readyState === 'complete' ? q.contentWindow : null; } catch (e) { return null; } }

  // destino liberado? true / false / null (ferramenta ainda carregando)
  function destinoLiberado(tabId, f, d) {
    var p = P(); if (!p || !p.permitida(tabId)) return false;
    if (!d) return true;
    var de = destino(f, d);
    if (!de) return false;
    if (de.sub && !p.subabaPermitida(tabId, de.sub)) return false;
    if (!de.nav) return true;
    var w = janela(tabId), base = d.split('.')[0];
    var navOk = w && w.fbNav ? w.fbNav.disponivel(de.sel ? base : d) : undefined;   // destino com botão próprio (ex.: Compras recebidas): vale o módulo
    if (navOk === undefined) {
      // a página do quadro é outra (ex.: Sessões de Julgamento aberta dentro de Condomínios): vale o último resultado conhecido
      return S.disp[tabId + '|' + d] !== undefined ? S.disp[tabId + '|' + d] : (S.disp[tabId + '|' + base] !== undefined ? S.disp[tabId + '|' + base] : null);
    }
    if (navOk !== null) S.disp[tabId + '|' + d] = navOk;
    return navOk;
  }

  // ---------------------------------------------------------------- abrir destino dentro da ferramenta
  var execucao = 0;
  function aguardar(cond, ms, feito, falhou) {
    var t0 = Date.now(), meu = execucao;
    (function laco() {
      if (meu !== execucao) return;
      var r = null; try { r = cond(); } catch (e) { r = null; }
      if (r) return feito(r);
      if (Date.now() - t0 > ms) return falhou && falhou();
      setTimeout(laco, 150);
    })();
  }
  function visivel(el) { return !!el && el.getClientRects().length > 0; }
  function abrirDentro(tabId, f, d) {
    execucao++;
    var q = quadro(tabId); if (!q) return;
    var cfg = DESTINOS[f] || {};
    if (!d) {   // aba principal: volta ao começo quando a ferramenta tiver "início" (Documentos sai do Relatório de Cobranças)
      if (SO_PROMOVIDOS[f]) { var prim = promovidos(f).filter(function (i) { return destinoLiberado(tabId, f, i.d) === true; })[0]; if (prim) abrirDentro(tabId, f, prim.d); return; }
      aguardar(function () { var w = janela(tabId); return w && w.fbNav ? w : null; }, 8000, function (w) { if (w.fbNav.inicio) w.fbNav.inicio(); sincronizar(tabId); });
      return;
    }
    var de = destino(f, d); if (!de) return;
    if (destinoLiberado(tabId, f, d) === false) return;   // sem acesso: não abre (a página fica no começo)
    var partes = d.split('.'), base = partes[0];
    var paginaAlvo = (cfg.pagina || {})[base] || f;
    function naPagina(w) { try { return w.location.pathname.indexOf('/tools/' + paginaAlvo + '/') >= 0; } catch (e) { return false; } }
    function depois() {   // passo final por botão da página (ex.: Compras recebidas, Ementário)
      if (!de.sel) return sincronizar(tabId);
      aguardar(function () { var w = janela(tabId); var el = w && w.document.querySelector(de.sel); return visivel(el) ? el : null; }, 12000,
        function (el) { el.click(); setTimeout(function () { sincronizar(tabId); }, 300); }, function () { sincronizar(tabId); });
    }
    if (de.nav) {
      aguardar(function () {
        var w = janela(tabId); if (!w) return null;
        // o quadro está em outra página da ferramenta (ex.: voltou de Sessões de Julgamento): volta para a página certa
        if (!naPagina(w) && paginaAlvo === f) { try { w.location.replace(q.src); } catch (e) {} return null; }   // q.src já é o endereço completo
        if (paginaAlvo !== f && naPagina(w)) return w;
        return w.fbNav && w.fbNav.disponivel(de.sel ? base : d) !== null ? w : null;
      }, 20000, function (w) {
        if (paginaAlvo !== f && naPagina(w)) return depois();
        var alvo = de.sel ? base : d;
        if (w.fbNav.abrir(alvo) === false) return sincronizar(tabId);
        if (paginaAlvo !== f) { aguardar(function () { var w2 = janela(tabId); return w2 && naPagina(w2) ? w2 : null; }, 15000, depois); return; }
        setTimeout(depois, 200);
      });
      return;
    }
    aguardar(function () { var w = janela(tabId); var el = w && w.document.querySelector(de.sel); return visivel(el) ? el : null; }, 15000,
      function (el) { el.click(); setTimeout(function () { sincronizar(tabId); }, 300); });
  }

  // qual destino está aberto agora dentro da ferramenta
  function destinoAtual(tabId, f) {
    var w = janela(tabId); if (!w) return S.estado[tabId] || '';
    var cfg = DESTINOS[f] || {};
    try {
      var pg = (cfg.pagina || {}).sessoes;
      if (pg && w.location.pathname.indexOf('/tools/' + pg + '/') >= 0) {
        return 'sessoes';
      }
      if (cfg.nav && w.fbNav) {
        var a = w.fbNav.atual() || '';
        if (f === 'gestao' && a === 'compras') {
          var rec = w.document.querySelector('[data-cp-view="recebidas"]');
          if (rec && /\b(on|active|ativa|ativo)\b/.test(rec.className)) a = 'compras.recebidas';
        }
        return a;
      }
      var achou = '';
      destinosDe(f).some(function (de) {
        if (!de.sel) return false;
        var el = w.document.querySelector(de.sel);
        if (el && visivel(el) && (/\b(active|on|ativa|ativo|selected|sel)\b/.test(el.className) || el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true')) { achou = de.id; return true; }
        return false;
      });
      return achou;
    } catch (e) { return S.estado[tabId] || ''; }
  }

  // ---------------------------------------------------------------- marcação, "onde estou", endereço
  function infoAtual() {
    var p = P(); if (!p) return null;
    var tabId = p.ativa(); if (!tabId || tabId === '__home__') return { home: true };
    if (tabId === '__admin__') return { tabId: tabId, f: '', d: '', rotAba: 'Administração' };
    var t = p.abas().filter(function (x) { return x.id === tabId; })[0]; if (!t) return null;
    var f = pasta(t.url);
    return { tabId: tabId, f: f, d: S.estado[tabId] || '', rotAba: t.label };
  }
  function rotuloDestino(f, d) { var de = destino(f, d); return de ? de.rot : ''; }
  function marcar() {
    var lista = $('tabstrip-list'); if (!lista) return;
    var i = infoAtual() || {};
    var promo = i.f ? promovidoDe(i.f, i.d) : null;
    if (i.f && SO_PROMOVIDOS[i.f] && !promo) promo = promovidos(i.f)[0];
    var trocar = function (b, v) { if (b.classList.contains('active') !== v) b.classList.toggle('active', v); };
    lista.querySelectorAll('.vg-item[data-vg-tab]').forEach(function (b) {
      trocar(b, !!promo && b.dataset.vgTab === i.tabId && b.dataset.vgDest === promo.d);
    });
    // a aba principal (botão do portal) fica marcada só quando nenhum item promovido dela está aberto
    lista.querySelectorAll('.tab-btn[data-tab-id]').forEach(function (b) {
      if (b.dataset.tabId === i.tabId && promo && !b.classList.contains('vg-oculto')) b.classList.remove('active');
    });
    // favoritos: marca o favorito do lugar exato
    lista.querySelectorAll('.vg-fav-item').forEach(function (b) {
      trocar(b, !!i.f && b.dataset.chave === chave(i.f, i.d));
    });
    // categoria da página aberta fica aberta
    var ativo = lista.querySelector('.vg-cat .tab-btn.active');
    if (ativo) { var cat = ativo.closest('.vg-cat'); if (cat && !cat.classList.contains('aberto')) cat.classList.add('aberto'); }
    onde();
  }
  function onde() {
    var el = $('vg-onde'); var i = infoAtual();
    if (el) {
      var txt = 'Visão geral';
      if (i && !i.home) {
        var promo = i.f ? promovidoDe(i.f, i.d) : null;
        var base = promo ? promo.rot : i.rotAba, det = i.d ? rotuloDestino(i.f, i.d) : '';
        txt = det && det !== base ? base + ' › ' + det : base;
      }
      if (el.textContent !== txt) el.textContent = txt;
    }
    var vh = document.querySelector('.vg-home'), fora = !(i && i.home); if (vh && vh.classList.contains('fora') !== fora) vh.classList.toggle('fora', fora);
    estrela();
  }
  window.__fbMenuOnde = onde;
  function sincronizar(tabId) {
    var p = P(); if (!p) return;
    var t = p.abas().filter(function (x) { return x.id === tabId; })[0]; if (!t) return;
    var f = pasta(t.url), d = destinoAtual(tabId, f);
    S.estado[tabId] = d;
    if (p.ativa() === tabId) {
      var slug = p.slug(tabId), h = '#' + slug + (d ? '/' + d : '');
      if (slug && decodeURIComponent(location.hash) !== h) { try { history.replaceState(null, '', h); } catch (e) {} }
      marcar();
    }
  }
  // o portal chama depois de cada troca de aba (clique, favorito, link direto, voltar/avançar)
  window.__fbNovoAposAbrir = function (tabId, d, origem) {
    var p = P(); if (!p) return;
    if (tabId === '__home__' || tabId === '__admin__') { marcar(); return; }
    var t = p.abas().filter(function (x) { return x.id === tabId; })[0]; if (!t) return;
    var f = pasta(t.url);
    vigiarQuadro(tabId);
    if (d) S.estado[tabId] = d;
    else if (origem === 'historico' || origem === 'inicio') { /* sem destino no endereço: deixa a página como está */ }
    else S.estado[tabId] = '';
    marcar();
    if (d || !origem) abrirDentro(tabId, f, d);
  };
  window.__fbNovoDestinoAtual = function (tabId) { return S.estado[tabId] || ''; };
  // cliques dentro da ferramenta (troca de sub-aba) atualizam endereço, marcação e estrela
  function vigiarQuadro(tabId) {
    var q = quadro(tabId); if (!q || q.dataset.vgVigiado) return;
    q.dataset.vgVigiado = '1';
    var ligar = function () {
      try {
        q.contentDocument.addEventListener('click', function () { setTimeout(function () { sincronizar(tabId); }, 350); }, true);
      } catch (e) {}
      setTimeout(function () { sincronizar(tabId); atualizarDisponiveis(); }, 600);
    };
    q.addEventListener('load', ligar);
    try { if (q.contentDocument && q.contentDocument.readyState === 'complete') ligar(); } catch (e) {}
  }

  // ---------------------------------------------------------------- favoritos
  function chave(f, d) { return f + (d ? '|' + d : ''); }
  function carregarFavoritos() {
    if (!S.uid) return;
    S.favs = lerLS('vg-favs-' + S.uid, []);
    desenharFavoritos();
    try {
      firebase.firestore().collection('perfis').doc(S.uid).get().then(function (doc) {
        var l = doc.exists && Array.isArray(doc.data().navFavoritos) ? doc.data().navFavoritos : null;
        if (l) { S.favs = l.filter(function (x) { return typeof x === 'string'; }); gravarLS('vg-favs-' + S.uid, S.favs); desenharFavoritos(); estrela(); estrelasAbas(); }
      }).catch(function () {});
    } catch (e) {}
  }
  function salvarFavoritos() {
    gravarLS('vg-favs-' + S.uid, S.favs);
    try { firebase.firestore().collection('perfis').doc(S.uid).set({ navFavoritos: S.favs }, { merge: true }).catch(function (e) { console.warn('favoritos:', e && e.message); }); } catch (e) {}
  }
  function alternarFavorito(k) {
    var i = S.favs.indexOf(k);
    if (i >= 0) S.favs.splice(i, 1); else S.favs.push(k);   // nunca duplica: a chave é única
    S.favs = S.favs.filter(function (x, j, a) { return a.indexOf(x) === j; }).slice(0, 40);
    salvarFavoritos(); desenharFavoritos(); estrela(); estrelasAbas();
  }
  // um favorito só aparece se a pessoa ainda tem acesso (aba liberada e, no destino, liberação confirmada)
  function resolverFavorito(k) {
    var p = k.split('|'), f = p[0], d = p[1] || '';
    var t = abaDaPasta(f); if (!t) return null;
    if (d && destinoLiberado(t.id, f, d) !== true) return null;
    var promo = d ? MENU.reduce(function (a, c) { return a || c.itens.filter(function (i) { return i.f === f && i.d === d; })[0]; }, null) : null;
    var rot = promo ? promo.rot : (d ? rotuloDestino(f, d) : t.label);
    var sec = promo ? '' : (d ? (promovidoDe(f, d) ? promovidoDe(f, d).rot : t.label) : '');
    var icoBase = promovidoDe(f, d) ? promovidoDe(f, d).rot : t.label;
    return { k: k, tabId: t.id, f: f, d: d, rot: rot, sec: sec, ico: P().icone(icoBase) };
  }
  function desenharFavoritos() {
    var box = $('vg-favs'); if (!box) return;
    var itens = S.favs.map(resolverFavorito).filter(Boolean);
    var lista = box.querySelector('.vg-favs-lista');
    var html = itens.length ? itens.map(function (x) {
      return '<button type="button" class="tab-btn vg-item vg-fav-item" data-chave="' + esc(x.k) + '" title="' + esc(x.rot + (x.sec ? ' · ' + x.sec : '')) + '">' + estrelaAba(x.k, x.rot, true) + x.ico +
        '<span class="vg-dois"><span class="vg-l1">' + esc(x.rot) + '</span>' + (x.sec ? '<span class="vg-l2">' + esc(x.sec) + '</span>' : '') + '</span></button>';
    }).join('') : '<div class="vg-fav-vazio">Nenhum favorito ainda. Toque na estrelinha ao lado do nome de uma aba para guardar aqui.</div>';
    if (lista._vgHtml !== html) { lista._vgHtml = html; lista.innerHTML = html; }
    marcar();
  }
  // estrelinha antes do nome de cada aba da lateral; ao tocar, pede confirmação
  function estrelaAba(k, rot, on) {
    var tit = on ? 'Tirar dos favoritos' : 'Favoritar';
    return '<span class="vg-aba-est' + (on ? ' on' : '') + '" data-k="' + esc(k) + '" data-rot="' + esc(rot) + '" title="' + tit + '" aria-label="' + tit + ': ' + esc(rot) + '">' + (on ? ICONE_ESTRELA_CHEIA : ICONE_ESTRELA) + '</span>';
  }
  function chaveDoBotao(b) {
    if (b.classList.contains('vg-promo')) return chave(b.dataset.vgPasta, b.dataset.vgDest);
    var id = b.dataset.tabId; if (!id || id === '__admin__') return '';
    var t = P().abas().filter(function (x) { return x.id === id; })[0]; var f = t ? pasta(t.url) : '';
    return f && !SO_PROMOVIDOS[f] ? chave(f, '') : '';
  }
  function estrelasAbas() {   // idempotente: só mexe no DOM quando algo muda
    var raiz = $('vg-menu'); if (!raiz || !P()) return;
    raiz.querySelectorAll('.vg-cat .tab-btn').forEach(function (b) {
      var k = chaveDoBotao(b); if (!k) return;
      var on = S.favs.indexOf(k) >= 0, e = b.querySelector('.vg-aba-est');
      if (!e) {
        var rot = (b.querySelector('span:not(.vg-aba-est):not(.pending-badge):not(.tab-blink-dot)') || b).textContent.trim();
        b.insertAdjacentHTML('afterbegin', estrelaAba(k, rot, on)); return;
      }
      if (e.classList.contains('on') !== on) {
        e.classList.toggle('on', on); e.innerHTML = on ? ICONE_ESTRELA_CHEIA : ICONE_ESTRELA;
        var tit = on ? 'Tirar dos favoritos' : 'Favoritar'; e.title = tit; e.setAttribute('aria-label', tit + ': ' + e.dataset.rot);
      }
    });
  }
  function confirmarFavorito(k, rot) {
    var on = S.favs.indexOf(k) >= 0;
    var box = $('vg-conf');
    if (!box) { box = document.createElement('div'); box.id = 'vg-conf'; box.className = 'vg-conf'; document.body.appendChild(box); }
    box.innerHTML = '<div class="vg-conf-caixa" role="dialog" aria-modal="true" aria-labelledby="vg-conf-tit">' +
      '<div class="vg-conf-ic' + (on ? '' : ' on') + '">' + ICONE_ESTRELA_CHEIA + '</div>' +
      '<div class="vg-conf-tit" id="vg-conf-tit">' + (on ? 'Tirar dos favoritos?' : 'Favoritar esta aba?') + '</div>' +
      '<div class="vg-conf-txt">' + (on ? '<b>' + esc(rot) + '</b> sai da sua lista de Favoritos.' : '<b>' + esc(rot) + '</b> vai aparecer na sua lista de Favoritos, no topo do menu.') + '</div>' +
      '<div class="vg-conf-bts"><button type="button" class="vg-conf-nao">Cancelar</button><button type="button" class="vg-conf-sim">' + (on ? 'Tirar' : 'Favoritar') + '</button></div></div>';
    box.classList.add('aberto');
    var fechar = function () { box.classList.remove('aberto'); document.removeEventListener('keydown', tecla, true); };
    var tecla = function (ev) { if (ev.key === 'Escape') { ev.preventDefault(); fechar(); } };
    document.addEventListener('keydown', tecla, true);
    box.onclick = function (ev) {
      if (ev.target === box || ev.target.closest('.vg-conf-nao')) { fechar(); return; }
      if (ev.target.closest('.vg-conf-sim')) { fechar(); if ((S.favs.indexOf(k) >= 0) === on) alternarFavorito(k); }
    };
    setTimeout(function () { var s = box.querySelector('.vg-conf-sim'); if (s) s.focus(); }, 0);
  }
  function abrirFavorito(k) {
    var x = resolverFavorito(k); if (!x) { desenharFavoritos(); return; }
    P().selectTab(x.tabId, { destino: x.d });
  }

  // estrela: favoritar a página aberta (ferramenta inteira e/ou o destino interno)
  function opcoesEstrela() {
    var i = infoAtual(); if (!i || i.home || !i.f) return [];
    var r = [], promo = promovidoDe(i.f, i.d) || (SO_PROMOVIDOS[i.f] ? promovidos(i.f)[0] : null);
    if (temItemPrincipal(i.f) && !promo) r.push({ k: chave(i.f, ''), rot: i.rotAba, tipo: 'Ferramenta inteira' });
    if (promo) r.push({ k: chave(i.f, promo.d), rot: promo.rot, tipo: 'Página' });
    if (i.d && (!promo || i.d !== promo.d) && destino(i.f, i.d)) r.push({ k: chave(i.f, i.d), rot: rotuloDestino(i.f, i.d), tipo: 'Seção desta página' });
    return r;
  }
  function estrela() {
    var b = $('vg-fav-btn'), m = $('vg-fav-pagina'); var ops = opcoesEstrela();
    var marcado = ops.some(function (o) { return S.favs.indexOf(o.k) >= 0; });
    // só mexe no que mudou: a casca observa a lista e qualquer mudança à toa viraria um laço sem fim
    [b, m].forEach(function (x) {
      if (!x) return;
      var vis = ops.length ? '' : 'none', est = marcado ? 'cheia' : 'vazia';
      if (x.style.display !== vis) x.style.display = vis;
      if (x.classList.contains('on') !== marcado) x.classList.toggle('on', marcado);
      if (x.getAttribute('aria-pressed') !== String(marcado)) x.setAttribute('aria-pressed', String(marcado));
      var ic = x.querySelector('.vg-est');
      if (ic && ic.dataset.est !== est) { ic.dataset.est = est; ic.innerHTML = marcado ? ICONE_ESTRELA_CHEIA : ICONE_ESTRELA; }
    });
    var pop = $('vg-fav-pop'); if (pop && pop.classList.contains('aberto')) desenharPop();
  }
  function desenharPop() {
    var pop = $('vg-fav-pop'); var ops = opcoesEstrela();
    pop.innerHTML = '<div class="vg-pop-tit">Favoritos</div>' + ops.map(function (o) {
      var on = S.favs.indexOf(o.k) >= 0;
      return '<button type="button" class="vg-pop-op' + (on ? ' on' : '') + '" data-k="' + esc(o.k) + '"><span class="vg-est">' + (on ? ICONE_ESTRELA_CHEIA : ICONE_ESTRELA) + '</span>' +
        '<span class="vg-dois"><span class="vg-l1">' + esc(o.rot) + '</span><span class="vg-l2">' + esc(o.tipo) + (on ? ' · nos favoritos (toque para tirar)' : '') + '</span></span></button>';
    }).join('');
  }
  function abrirPop(ancora) {
    var pop = $('vg-fav-pop'); desenharPop();
    var r = ancora.getBoundingClientRect();
    pop.style.top = Math.round(r.bottom + 8) + 'px';
    pop.style.left = Math.round(Math.max(10, Math.min(window.innerWidth - 300, r.left - 10))) + 'px';
    pop.classList.add('aberto');
  }

  // ---------------------------------------------------------------- montar a barra lateral
  function categoriaAberta(id, padrao) { return S.abertas && S.abertas[id] !== undefined ? S.abertas[id] : padrao; }
  function montar() {
    var p = P(), lista = $('tabstrip-list'); if (!p || !lista || !p.perfil()) return;
    if (lista.querySelector('#vg-menu')) return;
    S.montando = true;
    var botoes = {};   // botões do portal por aba
    Array.prototype.forEach.call(lista.querySelectorAll('.tab-btn[data-tab-id]'), function (b) { botoes[b.dataset.tabId] = b; });
    var raiz = document.createElement('div'); raiz.id = 'vg-menu';
    // favoritos
    var favs = document.createElement('div'); favs.id = 'vg-favs'; favs.className = 'vg-favs';
    favs.innerHTML = '<div class="vg-favs-cab"><span>Favoritos</span><button type="button" class="vg-fav-pagina" id="vg-fav-pagina" title="Favoritar a página aberta" aria-label="Favoritar a página aberta"><span class="vg-est">' + ICONE_ESTRELA + '</span></button></div><div class="vg-favs-lista"></div>';
    raiz.appendChild(favs);
    var achados = document.createElement('div'); achados.id = 'vg-achados'; achados.className = 'vg-achados'; raiz.appendChild(achados);
    var usados = {};
    var abas = p.abas();
    var porPasta = {}; abas.forEach(function (t) { var f = pasta(t.url); if (f && !porPasta[f]) porPasta[f] = t; });
    MENU.forEach(function (c) {
      var cat = document.createElement('div'); cat.className = 'vg-grupo vg-cat'; cat.dataset.cat = c.id;
      cat.innerHTML = '<button type="button" class="vg-grupo-cab"><span>' + esc(c.rot) + '</span>' + ICONE_SETA + '</button><div class="vg-grupo-itens"></div>';
      var cx = cat.querySelector('.vg-grupo-itens');
      c.itens.forEach(function (it) {
        if (it.admin) { if (botoes.__admin__) { cx.appendChild(botoes.__admin__); usados.__admin__ = 1; } return; }
        var t = porPasta[it.f]; if (!t || !p.permitida(t.id)) return;
        if (!it.d) {
          var b = botoes[t.id];
          if (!b) {   // abas que o portal põe na engrenagem (Aniversariantes, Sugestões)
            b = document.createElement('button'); b.type = 'button'; b.className = 'tab-btn'; b.dataset.tabId = t.id;
            b.innerHTML = p.icone(t.label) + '<span>' + esc(t.label) + '</span>';
            b.title = t.label;
            b.addEventListener('click', function () { p.selectTab(t.id); });
          }
          cx.appendChild(b); usados[t.id] = 1; return;
        }
        var bp = document.createElement('button'); bp.type = 'button'; bp.className = 'tab-btn vg-item vg-promo';
        bp.dataset.vgTab = t.id; bp.dataset.vgDest = it.d; bp.dataset.vgPasta = it.f; bp.title = it.rot;
        bp.innerHTML = p.icone(it.rot) + '<span>' + esc(it.rot) + '</span>';
        bp.style.display = 'none';   // aparece quando a ferramenta confirmar o acesso
        cx.appendChild(bp);
        if (SO_PROMOVIDOS[it.f]) usados[t.id] = 1;
      });
      raiz.appendChild(cat);
    });
    // abas que não estão na configuração: entram no fim de Escritório (para não sumirem)
    var sobras = raiz.querySelector('.vg-cat[data-cat="' + CATEGORIA_SOBRAS + '"] .vg-grupo-itens');
    Object.keys(botoes).forEach(function (id) {
      var b = botoes[id];
      if (usados[id]) return;
      var t = abas.filter(function (x) { return x.id === id; })[0];
      if (t && SO_PROMOVIDOS[pasta(t.url)]) { b.classList.add('vg-oculto'); raiz.appendChild(b); return; }
      sobras.appendChild(b);
    });
    // os botões das ferramentas que só existem pelos itens promovidos ficam escondidos (o portal ainda os usa)
    Object.keys(botoes).forEach(function (id) {
      var t = abas.filter(function (x) { return x.id === id; })[0];
      if (t && SO_PROMOVIDOS[pasta(t.url)] && botoes[id].parentNode !== raiz) { botoes[id].classList.add('vg-oculto'); raiz.appendChild(botoes[id]); }
    });
    // o que sobrou do portal (títulos e divisórias) sai da lista
    Array.prototype.slice.call(lista.children).forEach(function (n) { if (n !== raiz) n.remove(); });
    lista.appendChild(raiz);
    // ferramentas com itens promovidos: carrega o quadro em segundo plano para confirmar o que a pessoa pode abrir
    Object.keys(SO_PROMOVIDOS).concat(['documentos']).forEach(function (f) { var t = porPasta[f]; if (t && p.permitida(t.id)) { p.quadro(t.id); vigiarQuadro(t.id); } });
    S.montando = false;
    atualizarDisponiveis();
    desenharFavoritos();
    estrelasAbas();
    aplicarAberturas();
    marcar();
  }
  function aplicarAberturas() {
    var lista = $('tabstrip-list'); if (!lista) return;
    var i = infoAtual() || {};
    lista.querySelectorAll('.vg-cat').forEach(function (c) {
      var temAtivo = !!c.querySelector('.tab-btn.active');
      c.classList.toggle('aberto', !!categoriaAberta(c.dataset.cat, c.dataset.cat === 'rotina') || temAtivo);
    });
  }
  // mostra os itens promovidos já confirmados e esconde categorias vazias
  var tentativas = 0;
  function atualizarDisponiveis() {
    var lista = $('tabstrip-list'); if (!lista) return;
    var pendente = false;
    lista.querySelectorAll('.vg-promo').forEach(function (b) {
      var ok = destinoLiberado(b.dataset.vgTab, b.dataset.vgPasta, b.dataset.vgDest);
      if (ok === null) pendente = true;
      b.style.display = ok === true ? '' : 'none';
    });
    lista.querySelectorAll('.vg-cat').forEach(function (c) {
      var tem = Array.prototype.some.call(c.querySelectorAll('.tab-btn'), function (b) { return b.style.display !== 'none' && !b.classList.contains('search-hidden') && !b.classList.contains('vg-oculto'); });
      c.style.display = tem ? '' : 'none';
    });
    desenharFavoritos();
    if (pendente && tentativas++ < 120) setTimeout(atualizarDisponiveis, 1000);
  }

  // ---------------------------------------------------------------- busca: ferramentas e destinos internos
  function buscar(termo) {
    var lista = $('tabstrip-list'), box = $('vg-achados'); if (!lista || !box) return;
    var q = norm(termo).trim();
    if (!q) { box.innerHTML = ''; atualizarDisponiveis(); aplicarAberturas(); return; }
    // itens promovidos e categorias seguem o mesmo filtro do portal
    lista.querySelectorAll('.vg-promo').forEach(function (b) { b.classList.toggle('search-hidden', norm(b.textContent).indexOf(q) < 0); });
    lista.querySelectorAll('.vg-cat').forEach(function (c) {
      c.classList.add('aberto');
      var tem = Array.prototype.some.call(c.querySelectorAll('.tab-btn'), function (b) { return b.style.display !== 'none' && !b.classList.contains('search-hidden') && !b.classList.contains('vg-oculto'); });
      c.style.display = tem ? '' : 'none';
    });
    var achou = [];
    Object.keys(DESTINOS).forEach(function (f) {
      var t = abaDaPasta(f); if (!t) return;
      destinosDe(f).forEach(function (de) {
        if (norm(de.rot).indexOf(q) < 0) return;
        if (destinoLiberado(t.id, f, de.id) !== true) return;
        var promo = promovidoDe(f, de.id);
        achou.push({ tabId: t.id, d: de.id, rot: de.rot, sec: promo && promo.d !== de.id ? promo.rot : (promo ? '' : t.label), ico: P().icone(promo ? promo.rot : t.label) });
      });
    });
    box.innerHTML = achou.length ? '<div class="vg-achados-tit">Dentro das páginas</div>' + achou.slice(0, 12).map(function (x) {
      return '<button type="button" class="tab-btn vg-item vg-achado" data-tab="' + esc(x.tabId) + '" data-d="' + esc(x.d) + '">' + x.ico +
        '<span class="vg-dois"><span class="vg-l1">' + esc(x.rot) + '</span>' + (x.sec ? '<span class="vg-l2">' + esc(x.sec) + '</span>' : '') + '</span></button>';
    }).join('') : '';
    var semRes = lista.querySelector('.no-results');
    if (semRes && achou.length) semRes.remove();
  }

  // ---------------------------------------------------------------- eventos
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    var ea = t.closest && t.closest('.vg-aba-est');
    if (ea) { ev.stopPropagation(); ev.preventDefault(); confirmarFavorito(ea.dataset.k, ea.dataset.rot); return; }
    var cab = t.closest && t.closest('.vg-cat > .vg-grupo-cab');
    if (cab) {
      var c = cab.parentNode; c.classList.toggle('aberto');
      S.abertas = S.abertas || {}; S.abertas[c.dataset.cat] = c.classList.contains('aberto'); gravarLS('vg-cat-abertas', S.abertas);
      return;
    }
    var promo = t.closest && t.closest('.vg-promo');
    if (promo) { P().selectTab(promo.dataset.vgTab, { destino: promo.dataset.vgDest }); return; }
    var fav = t.closest && t.closest('.vg-fav-item');
    if (fav) { abrirFavorito(fav.dataset.chave); return; }
    var ach = t.closest && t.closest('.vg-achado');
    if (ach) { P().selectTab(ach.dataset.tab, { destino: ach.dataset.d }); return; }
    var est = t.closest && t.closest('#vg-fav-btn, #vg-fav-pagina');
    if (est) {
      ev.stopPropagation();
      var ops = opcoesEstrela();
      var pop = $('vg-fav-pop');
      if (pop.classList.contains('aberto')) { pop.classList.remove('aberto'); return; }
      if (ops.length === 1) { alternarFavorito(ops[0].k); return; }
      abrirPop(est); return;
    }
    var op = t.closest && t.closest('.vg-pop-op');
    if (op) { alternarFavorito(op.dataset.k); return; }
    var pop2 = $('vg-fav-pop'); if (pop2 && pop2.classList.contains('aberto') && !t.closest('#vg-fav-pop')) pop2.classList.remove('aberto');
  }, true);

  // clicar dentro da ferramenta (outro documento) também fecha o painel da estrela
  window.addEventListener('blur', function () { var pop = $('vg-fav-pop'); if (pop) pop.classList.remove('aberto'); });
  function iniciar() {
    var lista = $('tabstrip-list'); if (!lista) return;
    // estrela no topo (ao lado de "onde estou") e o painel de opções
    var marca = document.querySelector('.vg-marca');
    if (marca && !$('vg-fav-btn')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'vg-fav-btn'; b.className = 'vg-fav-btn'; b.title = 'Favoritar esta página'; b.setAttribute('aria-label', 'Favoritar esta página');
      b.innerHTML = '<span class="vg-est">' + ICONE_ESTRELA + '</span>'; b.style.display = 'none';
      marca.appendChild(b);
    }
    if (!$('vg-fav-pop')) { var pop = document.createElement('div'); pop.id = 'vg-fav-pop'; pop.className = 'vg-fav-pop'; document.body.appendChild(pop); }
    new MutationObserver(function () { if (!S.montando && !lista.querySelector('#vg-menu')) setTimeout(montar, 0); }).observe(lista, { childList: true });
    ['global-search', 'drawer-global-search'].forEach(function (id) {
      var inp = $(id); if (inp) inp.addEventListener('input', function () { setTimeout(function () { buscar(inp.value); }, 0); });
    });
    if (window.firebase && firebase.auth) firebase.auth().onAuthStateChanged(function (u) {
      S.uid = u ? u.uid : null; S.favs = []; if (u) carregarFavoritos();
      var t0 = Date.now();
      (function esperarPortal() { var p = P(); if (p && p.perfil()) { montar(); return; } if (Date.now() - t0 < 30000) setTimeout(esperarPortal, 200); })();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
