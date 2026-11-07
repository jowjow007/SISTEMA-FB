/* ================================================================================================
   VERSÃO DE TESTE — sub-abas no menu lateral (07/11/2026)
   Abaixo da aba aberta aparecem as sub-abas da ferramenta; se uma sub-aba tem seções próprias, elas aparecem
   num terceiro nível, abaixo dela. O clique abre a seção dentro da ferramenta (clica o botão da própria página:
   pelo seletor cadastrado ou, se não houver, pelo texto). Se a seção não estiver à vista (ex.: a ferramenta
   está noutra tela), recarrega a ferramenta e tenta de novo.
   ================================================================================================ */
(function () {
  'use strict';
  // cadastro das sub-abas: { sel: seletor do botão na ferramenta | txt: texto do botão, pre: [cliques antes], filhos: [...] }
  var S = function (rot, sel, extra) { return Object.assign({ rot: rot, sel: sel }, extra || {}); };
  var T = function (rot, extra) { return Object.assign({ rot: rot, txt: rot }, extra || {}); };
  var CADASTRO = [
    { re: /tools\/condominios/, itens: [
      S('Consultar Clientes', '[data-s="condominios"]', { filhos: [S('Clientes', '[data-condoview="grid"]'), S('Calculadoras', '[data-condoview="calc"]')] }),
      S('Comece por Aqui', '[data-s="comece"]'), S('POPs', '[data-s="pops"]'), S('ASTREA', '[data-s="astrea"]'), S('BRCondos', '[data-s="brcondos"]'),
      S('AlmahCondos', '[data-s="almahcondos"]'), S('Padrão de Notificações', '[data-s="notificacoes"]'),
      S('Gerar Notificação', '[data-s="gerar-notificacao"]', { filhos: [S('Compor notificação', '[data-gerarview="compor"]'), S('Notificações prontas', '[data-gerarview="aprovacao"]')] }),
      S('Nomenclatura', '[data-s="nomenclatura"]'), S('Fluxos', '[data-s="fluxos"]'), S('Relatórios Condominiais', '[data-s="relatorios-condominiais"]'),
      S('Sessões de Julgamento', '[data-sub="sessoes-julgamento"]', { pre: ['[data-s="inicio"]'], filhos: [S('Sessões', '[data-ir="lista"]'), S('Ementário', '[data-ir="ementario"]'), S('Conselheiros', '[data-ir="conselheiros"]')] })
    ] },
    { re: /tools\/gestao/, itens: [
      S('Colaboradores', '[data-goto="colaboradores"]', { filhos: [S('Pagamentos', '[data-abre="pagamentos"]'), S('Holerites e guias', '[data-abre="holerites"]')] }),
      S('Patrimônio', '[data-goto="patrimonio"]'),
      S('Compras', '[data-goto="compras"]', { filhos: [S('Lista de compras', '[data-cp-view="aprovacao"]'), S('Compras recebidas', '[data-cp-view="recebidas"]')] }),
      S('Holerites', '[data-goto="holerites"]'), S('Senhas', '[data-goto="senhas"]')
    ] },
    { re: /tools\/numeros-escritorio/, itens: [
      S('Visão Geral', '[data-tab="geral"]'), S('Clientes', '[data-tab="clientes"]'), S('Juízo & Ação', '[data-tab="juizo"]'),
      S('Efetividade', '[data-tab="efetividade"]'), S('Qualidade de Cadastro', '[data-tab="qualidade"]'), S('Agenda — Astrea', '[data-tab="agenda"]')
    ] },
    { re: /tools\/conferencia-emails/, itens: [S('Conferência', '[data-aba="conf"]'), S('Histórico', '[data-aba="hist"]'), S('Relatório', '[data-aba="rel"]')] },
    { re: /tools\/peticoes/, itens: [S('Formatar petição', '[data-view="formatar"]'), S('Formatar parecer', '[data-view="parecer"]'), S('Nomenclatura', '[data-view="nomenclatura"]')] },
    { re: /tools\/remuneracao/, itens: [S('Lançamento do mês', '[data-aba="mes"]'), S('Pessoas e cargos', '[data-aba="pessoas"]'), S('Cargos e percentuais', '[data-aba="cargos"]')] },
    { re: /tools\/sugestoes/, itens: [S('Abertas', '[data-view="abertas"]'), S('Implantadas e excluídas', '[data-view="historico"]')] },
    { re: /tools\/treinamentos/, itens: [S('Manual', '[data-goto="manual"]'), S('POP', '[data-goto="pop"]'), S('Vídeos', '[data-goto="videos"]'), S('Documentos', '[data-goto="documentos"]')] },
    { re: /tools\/chat/, itens: [S('Todas as conversas', '[data-tab="todos"]'), S('Favoritos', '[data-tab="favoritos"]')] },
    { re: /tools\/documentos/, itens: ['Procuração', 'Substabelecimento', 'Declaração de Hipossuficiência', 'Termo de Repasse', 'Recibo', 'Carta de Preposição', 'Petição de Ciência', 'Relatório de Cobranças'].map(function (t) { return T(t); }) },
    { re: /tools\/contratos/, itens: [
      S('Contrato — Pessoa Física', '[data-tipo="contrato_pf"]'), S('Contrato — Pessoa Jurídica', '[data-tipo="contrato_pj"]'), S('Contrato — Condomínio', '[data-tipo="contrato_condominio"]'),
      S('Proposta — PF/PJ', '[data-tipo="proposta_pf_pj"]'), S('Proposta — Condomínio', '[data-tipo="proposta_condominio"]')
    ] },
    { re: /tools\/sessoes-julgamento/, itens: [S('Sessões', '[data-ir="lista"]'), S('Ementário', '[data-ir="ementario"]'), S('Conselheiros', '[data-ir="conselheiros"]')] }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var urlDaAba = {};          // id da aba -> endereço (do catálogo do Firestore)
  var marcada = {};           // aba -> caminho da sub-aba marcada ("2" ou "2.1")

  function cadastroDe(tabId) { var u = urlDaAba[tabId] || ''; for (var i = 0; i < CADASTRO.length; i++) if (CADASTRO[i].re.test(u)) return CADASTRO[i].itens; return null; }

  function desenhar() {
    var lista = $('tabstrip-list'); if (!lista) return;
    lista.querySelectorAll('.vg-subs').forEach(function (x) { x.remove(); });
    var ativo = lista.querySelector('.tab-btn.active'); if (!ativo) return;
    var tid = ativo.dataset.tabId, itens = cadastroDe(tid); if (!itens) return;
    var box = document.createElement('div'); box.className = 'vg-subs';
    var h = '';
    itens.forEach(function (it, i) {
      h += '<button type="button" class="vg-sub' + (marcada[tid] === String(i) || (marcada[tid] || '').indexOf(i + '.') === 0 ? ' on' : '') + '" data-vg-sub="' + i + '">' + esc(it.rot) + '</button>';
      (it.filhos || []).forEach(function (f, j) {
        h += '<button type="button" class="vg-sub2' + (marcada[tid] === i + '.' + j ? ' on' : '') + '" data-vg-sub="' + i + '.' + j + '">' + esc(f.rot) + '</button>';
      });
    });
    box.innerHTML = h;
    ativo.insertAdjacentElement('afterend', box);
    var on = box.querySelector('.vg-sub2.on') || box.querySelector('.vg-sub.on');
    try { (on || ativo).scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }

  function iframeDe(tabId) {
    var u = urlDaAba[tabId]; if (!u) return null;
    var base = u.replace(/index\.html$/, '').replace(/\/$/, '');
    return Array.prototype.find.call(document.querySelectorAll('#content iframe'), function (f) {
      return f.offsetParent !== null && (f.getAttribute('src') || '').indexOf(base) >= 0;
    }) || Array.prototype.find.call(document.querySelectorAll('#content iframe'), function (f) { return (f.getAttribute('src') || '').indexOf(base) >= 0; });
  }
  function achar(doc, passo) {
    if (!doc) return null;
    if (passo.sel) { var e = doc.querySelector(passo.sel); if (e) return e; }
    if (passo.txt) {
      var alvo = passo.txt.trim().toLowerCase();
      return Array.prototype.find.call(doc.querySelectorAll('button, [role="button"], a, .hub-card, .cd-card'), function (b) {
        return (b.textContent || '').trim().toLowerCase().indexOf(alvo) === 0 && b.offsetParent !== null;
      }) || null;
    }
    return null;
  }
  // executa os cliques em sequência; cada passo espera o botão aparecer (a página pode estar carregando ou trocando de tela)
  function executar(ifr, passos, recarregou) {
    var i = 0, tent = 0;
    (function prox() {
      if (i >= passos.length) return;
      var doc = null; try { doc = ifr.contentDocument; } catch (e) {}
      var el = doc && doc.readyState === 'complete' ? achar(doc, passos[i]) : null;
      if (el) { el.click(); i++; tent = 0; setTimeout(prox, 350); return; }
      if (++tent < 25) { setTimeout(prox, 200); return; }
      // não achou: a ferramenta está noutra tela; recarrega uma vez e refaz desde o começo
      if (!recarregou) { var src = ifr.getAttribute('src'); ifr.addEventListener('load', function f() { ifr.removeEventListener('load', f); setTimeout(function () { executar(ifr, passos, true); }, 400); }); ifr.setAttribute('src', src); }
    })();
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-vg-sub]'); if (!b) return;
    var ativo = document.querySelector('#tabstrip-list .tab-btn.active'); if (!ativo) return;
    var tid = ativo.dataset.tabId, itens = cadastroDe(tid), cam = b.dataset.vgSub.split('.').map(Number);
    var pai = itens[cam[0]], passos = (pai.pre || []).map(function (s) { return { sel: s }; }).concat([pai]);
    if (cam.length > 1) passos.push(pai.filhos[cam[1]]);
    marcada[tid] = b.dataset.vgSub; desenhar();
    var ifr = iframeDe(tid); if (ifr) executar(ifr, passos, false);
  });

  function iniciar() {
    var lista = $('tabstrip-list'); if (!lista) return;
    var pendente = false;
    new MutationObserver(function () {
      if (pendente) return; pendente = true;
      setTimeout(function () { pendente = false; var ativo = lista.querySelector('.tab-btn.active'); var box = lista.querySelector('.vg-subs');
        if (!box || !ativo || box.previousElementSibling !== ativo) desenhar(); }, 30);
    }).observe(lista, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    if (!window.firebase || !firebase.auth) return;
    firebase.auth().onAuthStateChanged(function (u) {
      if (!u) return;
      firebase.firestore().collection('tabs').get().then(function (s) { s.forEach(function (d) { var u = String(d.data().url || ''); urlDaAba[d.id] = window.__vgUrlLocal ? window.__vgUrlLocal(u) : u; }); desenhar(); }).catch(function () {});
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
