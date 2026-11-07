/* ================================================================================================
   VERSÃO DE TESTE — layout "Visão geral" (07/11/2026). Ver layout-visao-geral.css.
   Não muda dados nem permissões: só reorganiza a casca do portal e monta o painel inicial com o que a
   pessoa já pode ler (agenda do Astrea, conferência de e-mails, tarefas e comunicados).
   ================================================================================================ */
(function () {
  'use strict';
  var IC = {
    casa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    sol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    tarefa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
    megafone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5v3a1 1 0 0 0 1 1h2.5l6.5 4V5.5l-6.5 4H4a1 1 0 0 0-1 1z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>'
  };
  var GRUPOS = [
    { id: 'escritorio', rot: 'Escritório', chaves: ['chat', 'organograma', 'sugest', 'anota', 'treinament', 'pop', 'noticia', 'sistema', 'comunicad', 'perfil', 'aniversar'] },
    { id: 'juridico', rot: 'Jurídico', chaves: ['formatador', 'petic', 'document', 'contrato', 'e-mail', 'email', 'assistente', 'matriz', 'agenda', 'prazo', 'djen', 'public', 'calcul'] },
    { id: 'condominios', rot: 'Condomínios', chaves: ['condom', 'sessoes', 'julgament'] },
    { id: 'gestao', rot: 'Gestão', chaves: ['gestao', 'numero', 'remunera', 'cobranc', 'financ', 'patrimo', 'segur', 'pagament', 'administra'] }
  ];
  var MEDIA = window.matchMedia('(min-width: 861px)');
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var lerLS = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  var gravarLS = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // ---------------------------------------------------------------- topo
  function montarTopo() {
    var wrap = document.querySelector('.topbar-logo-wrap');
    if (wrap && !wrap.querySelector('.vg-marca')) {
      var m = document.createElement('div'); m.className = 'vg-marca';
      m.innerHTML = '<b>FONSECA E BRAGA</b><span id="vg-onde">Visão geral</span>';
      wrap.appendChild(m);
    }
    var menu = $('user-menu-wrap');
    if (menu && !$('vg-tema')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'vg-tema'; b.className = 'vg-tema'; b.title = 'Tema claro / escuro'; b.innerHTML = IC.sol;
      b.addEventListener('click', function () {
        var item = document.querySelector('#user-menu-dropdown .theme-switch-item');
        if (item) item.click();
        else { var claro = document.documentElement.getAttribute('data-theme') !== 'light'; document.documentElement.setAttribute('data-theme', claro ? 'light' : 'dark'); }
      });
      menu.insertBefore(b, menu.firstChild);
    }
    var sel = document.createElement('div'); sel.className = 'vg-selo-teste'; sel.textContent = 'Versão de teste · novo layout';
    document.body.appendChild(sel);
  }
  function atualizarOnde() {
    var onde = $('vg-onde'); if (!onde) return;
    var home = $('mobile-home');
    var ativo = document.querySelector('#tabstrip-list .tab-btn.active span');
    onde.textContent = (home && home.classList.contains('active')) || !ativo ? 'Visão geral' : ativo.textContent;
    var vh = document.querySelector('.vg-home'); if (vh) vh.classList.toggle('fora', !(home && home.classList.contains('active')));
  }

  // ---------------------------------------------------------------- menu lateral em seções
  var agrupando = false;
  function grupoDe(rotulo) {
    var n = norm(rotulo);
    for (var i = 0; i < GRUPOS.length; i++) if (GRUPOS[i].chaves.some(function (k) { return n.indexOf(k) >= 0; })) return GRUPOS[i];
    return { id: 'outras', rot: 'Outras ferramentas' };
  }
  function agrupar() {
    var lista = $('tabstrip-list'); if (!lista || agrupando) return;
    var botoes = Array.prototype.filter.call(lista.querySelectorAll('.tab-btn'), function (b) { return !b.closest('.subaba-gaveta'); });
    if (!botoes.length || lista.querySelector(':scope > .tab-btn') === null) return;   // já agrupado
    agrupando = true;
    var abertos = lerLS('vg-grupos-abertos', null);
    var ordem = GRUPOS.concat([{ id: 'outras', rot: 'Outras ferramentas' }]);
    var blocos = {};
    ordem.forEach(function (g) {
      var d = document.createElement('div'); d.className = 'vg-grupo'; d.dataset.grupo = g.id;
      d.innerHTML = '<button type="button" class="vg-grupo-cab"><span>' + esc(g.rot) + '</span>' + IC.seta + '</button><div class="vg-grupo-itens"></div>';
      d.querySelector('.vg-grupo-cab').addEventListener('click', function () {
        d.classList.toggle('aberto');
        var est = {}; lista.querySelectorAll('.vg-grupo').forEach(function (x) { est[x.dataset.grupo] = x.classList.contains('aberto'); });
        gravarLS('vg-grupos-abertos', est);
      });
      blocos[g.id] = d;
    });
    botoes.forEach(function (b) {
      var rot = (b.querySelector('span') || b).textContent;
      var g = grupoDe(rot), alvo = blocos[g.id].querySelector('.vg-grupo-itens');
      var prox = b.nextElementSibling;
      alvo.appendChild(b);
      if (prox && prox.classList && prox.classList.contains('subaba-gaveta')) alvo.appendChild(prox);
    });
    ordem.forEach(function (g, i) {
      var d = blocos[g.id];
      if (!d.querySelector('.tab-btn')) return;
      var temAtivo = !!d.querySelector('.tab-btn.active');
      if (abertos ? (abertos[g.id] || temAtivo) : (i === 0 || temAtivo)) d.classList.add('aberto');
      lista.appendChild(d);
    });
    agrupando = false;
  }
  function montarMenu() {
    var ts = $('tabstrip'), lista = $('tabstrip-list');
    if (!ts || !lista) return;
    if (!ts.querySelector('.vg-home')) {
      var h = document.createElement('button'); h.type = 'button'; h.className = 'vg-home'; h.innerHTML = IC.casa + '<span>Visão geral</span>';
      h.addEventListener('click', function () { var b = $('mbn-home'); if (b) b.click(); });
      ts.insertBefore(h, lista);
    }
    new MutationObserver(function () { if (!agrupando) { agrupar(); atualizarOnde(); } }).observe(lista, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    agrupar();
    // busca: abre todas as seções enquanto houver texto
    ['global-search', 'drawer-global-search'].forEach(function (id) {
      var inp = $(id); if (!inp) return;
      inp.addEventListener('input', function () {
        var q = inp.value.trim();
        lista.querySelectorAll('.vg-grupo').forEach(function (g) {
          if (q) g.classList.add('aberto');
          g.style.display = q && !g.querySelector('.tab-btn:not(.search-hidden)') ? 'none' : '';
        });
      });
    });
    // rodapé: quadro de situação + mini indicadores
    var rodape = $('theme-toggle-row');
    if (rodape && !rodape.querySelector('.vg-situacao')) {
      var s = document.createElement('div'); s.className = 'vg-situacao'; s.id = 'vg-situacao';
      s.innerHTML = '<div class="t">Carregando a situação…</div><div class="d"></div>';
      var mi = document.createElement('div'); mi.className = 'vg-mini'; mi.id = 'vg-mini';
      mi.innerHTML = '<span>Agenda</span><b>–</b><span>E-mails</span><b>–</b><span>Tarefas</span><b>–</b>';
      rodape.insertBefore(mi, rodape.firstChild); rodape.insertBefore(s, mi);
    }
  }
  function abrirAbaPorRotulo(re) {
    var b = Array.prototype.find.call(document.querySelectorAll('#tabstrip-list .tab-btn'), function (x) { return re.test(norm((x.querySelector('span') || x).textContent)); });
    if (b) { b.click(); return true; }
    return false;
  }

  // ---------------------------------------------------------------- dados (só o que a pessoa já pode ler)
  var D = { eu: null, agenda: null, emails: null, emailsMeta: null, tarefas: null, comunicadosPend: null, janela: 15, filtro: 'todas' };
  function dia(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return Math.round(x.getTime() / 864e5); }
  function dataBR(s) {
    var m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || '')); if (m) return dia(new Date(+m[3], +m[2] - 1, +m[1]));
    m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); if (m) return dia(new Date(+m[1], +m[2] - 1, +m[3]));
    return null;
  }
  function colunas(regs, cols) {
    var nomes = (cols && cols.length ? cols : Object.keys(regs[0] || {}));
    var achar = function (f) { return nomes.find(function (c) { return f(norm(c)); }) || null; };
    return {
      data: achar(function (c) { return /^data/.test(c) && !/criac|conclus|atualiz|moviment/.test(c); }),
      resp: achar(function (c) { return c.indexOf('respons') >= 0; }),
      tags: achar(function (c) { return c.indexOf('etiqueta') >= 0; })
    };
  }
  function carregar(db, user, perfil) {
    D.eu = { uid: user.uid, email: String(user.email || '').toLowerCase(), nome: perfil.displayName || user.email, role: perfil.role };
    var hoje = new Date(), id = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
    var tarefas = [];
    // agenda do Astrea: o snapshot mais recente (o robô grava um por dia)
    var tentar = function (n) {   // hoje; se o robô ainda não rodou, ontem, anteontem… (até 7 dias)
      var t = new Date(Date.now() - n * 864e5), did = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
      return db.collection('astreaDiario').doc(did).get().then(function (x) { return x.exists ? x : (n < 7 ? tentar(n + 1) : null); });
    };
    tentar(0).then(function (doc) {
      if (!doc) { D.agenda = { vazio: true }; return; }
      var s = { docs: [doc] };
      var d = s.docs[0].data(), regs = d.registros || [], k = colunas(regs, d.colunas);
      var primeiro = norm(String(D.eu.nome).split(' ')[0]);
      D.agenda = {
        id: s.docs[0].id, hoje: s.docs[0].id === id, em: d.atualizadoEm || '',
        itens: regs.map(function (r) {
          var tags = k.tags ? String(r[k.tags] || '').split(',').map(function (t) { return norm(t.trim()); }) : [];
          return { d: k.data ? dataBR(r[k.data]) : null, fatal: tags.indexOf('prazo fatal') >= 0, minha: !!(k.resp && primeiro && norm(r[k.resp]).indexOf(primeiro) >= 0) };
        })
      };
    }).catch(function () { D.agenda = { semAcesso: true }; }).then(desenhar);
    // conferência de e-mails: o que é meu (admin vê os últimos 30 dias de todos)
    var q = db.collection('emailsConferencia');
    q = D.eu.role === 'admin' ? q.where('recebidoEm', '>=', new Date(Date.now() - 30 * 864e5)) : q.where('responsavelEmail', '==', D.eu.email);
    q.get().then(function (s) {
      var pend = 0, resp = 0; s.forEach(function (x) { var st = x.data().status; if (st === 'pendente') pend++; else if (st === 'respondido') resp++; });
      D.emails = { pend: pend, resp: resp, total: pend + resp };
    }).catch(function () { D.emails = { semAcesso: true }; }).then(desenhar);
    db.collection('emailsConferenciaMeta').doc('ultima').get().then(function (d) { D.emailsMeta = d.exists ? d.data() : {}; }).catch(function () { D.emailsMeta = {}; }).then(desenhar);
    db.collection('tarefasEnviadas').where('destinatarioUid', '==', user.uid).get().then(function (s) {
      s.forEach(function (x) { var t = x.data(); if (t.status === 'pendente' || t.status === 'reprovada') tarefas.push(t); });
      D.tarefas = tarefas.length;
    }).catch(function () { D.tarefas = 0; }).then(desenhar);
    db.collection('comunicadosCiencia').where('uid', '==', user.uid).get().then(function (s) {
      var vistos = {}; s.forEach(function (x) { vistos[x.data().comunicadoId] = true; });
      var hojeISO = id;
      D.comunicados = (window.COMUNICADOS_FB || []).filter(function (c) { return c.data <= hojeISO; }).sort(function (a, b) { return b.data.localeCompare(a.data); });
      D.comunicadosPend = D.comunicados.filter(function (c) { return !vistos[c.id]; }).length;
    }).catch(function () { D.comunicados = []; D.comunicadosPend = 0; }).then(desenhar);
  }

  // ---------------------------------------------------------------- painel
  function resumoAgenda() {
    var a = D.agenda; if (!a || !a.itens) return null;
    var h = dia(new Date()), sel = a.itens.filter(function (r) { return D.filtro === 'minhas' ? r.minha : D.filtro === 'fatal' ? r.fatal : true; });
    var r = { venc: 0, hoje: 0, sete: 0, fatal7: 0, porDia: [], fatalDia: [] };
    for (var i = 0; i <= D.janela; i++) { r.porDia.push(0); r.fatalDia.push(0); }
    sel.forEach(function (x) {
      if (x.d == null) return;
      var dd = x.d - h;
      if (dd < 0) r.venc++; else if (dd === 0) r.hoje++;
      if (dd >= 1 && dd <= 7) { r.sete++; if (x.fatal) r.fatal7++; }
      if (dd >= 0 && dd <= D.janela) { r.porDia[dd]++; if (x.fatal) r.fatalDia[dd]++; }
    });
    return r;
  }
  function grafico(r) {
    var W = 760, H = 220, pl = 34, pr = 10, pt = 10, pb = 26, n = r.porDia.length;
    var max = Math.max(4, Math.max.apply(null, r.porDia));
    var x = function (i) { return pl + (W - pl - pr) * i / Math.max(1, n - 1); };
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var linha = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' '); };
    var s = '';
    [max, Math.round(max / 2), 0].forEach(function (v) { s += '<line class="grade" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="eixo" x="' + (pl - 8) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v + '</text>'; });
    s += '<path class="a1" d="' + linha(r.porDia) + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z"/>';
    s += '<path class="l1" d="' + linha(r.porDia) + '"/><path class="l2" d="' + linha(r.fatalDia) + '"/>';
    s += '<text class="eixo" x="' + x(0) + '" y="' + (H - 6) + '">hoje</text><text class="eixo" x="' + x(Math.round((n - 1) / 2)) + '" y="' + (H - 6) + '" text-anchor="middle">+' + Math.round((n - 1) / 2) + ' dias</text><text class="eixo" x="' + x(n - 1) + '" y="' + (H - 6) + '" text-anchor="end">+' + (n - 1) + ' dias</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Atividades da agenda por dia">' + s + '</svg>';
  }
  function anel(frac) {
    var r = 58, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
    return '<svg viewBox="0 0 150 150"><circle class="fundo" cx="75" cy="75" r="' + r + '" fill="none" stroke-width="12"/>'
      + '<circle class="valor" cx="75" cy="75" r="' + r + '" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 75 75)"/>'
      + '<text x="75" y="82" text-anchor="middle" fill="currentColor" style="font:500 22px var(--vg-mono)">' + Math.round(f * 100) + '%</text></svg>';
  }
  function hora(iso) { if (!iso) return ''; var t = iso.toDate ? iso.toDate() : new Date(iso); return isNaN(t) ? '' : t.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function minutosDesde(iso) { if (!iso) return null; var t = iso.toDate ? iso.toDate() : new Date(iso); return isNaN(t) ? null : Math.round((Date.now() - t.getTime()) / 60000); }

  function desenhar() {
    var p = $('vg-painel'); if (!p || !D.eu) return;
    var r = resumoAgenda(), a = D.agenda || {}, e = D.emails || {}, nf = function (v) { return v == null ? '–' : String(v); };
    var temAba = function (re) { return Array.prototype.some.call(document.querySelectorAll('#tabstrip-list .tab-btn span'), function (s) { return re.test(norm(s.textContent)); }); };
    var h = '';
    // 1) gráfico da agenda
    h += '<section class="vg-bloco vg-graf" data-ds-tom="ambar"><div class="vg-topo-bloco"><div><div class="vg-rot">Agenda · próximos dias</div>'
      + '<div class="vg-sub">' + (a.semAcesso ? 'sem acesso à agenda do Astrea' : a.vazio ? 'nenhuma importação do Astrea ainda' : !a.itens ? 'carregando…' : 'importada do Astrea ' + (a.hoje ? 'hoje' : 'em ' + esc(a.id.split('-').reverse().join('/'))) + (a.em ? ' · ' + esc(hora(a.em)) : '')) + '</div></div>'
      + '<div style="text-align:right"><div class="vg-rot">Prazos fatais</div><div class="vg-num" style="font-size:1.2rem">' + (r ? r.fatalDia.reduce(function (t, v) { return t + v; }, 0) : '–') + '</div></div></div>'
      + '<div class="vg-topo-bloco" style="margin-top:14px;"><div class="vg-chips">' + [7, 15, 30].map(function (n) { return '<button type="button" class="vg-chip' + (D.janela === n ? ' on' : '') + '" data-vg-janela="' + n + '">' + n + ' DIAS</button>'; }).join('') + '</div>'
      + '<div class="vg-chips">' + [['todas', 'Todas'], ['minhas', 'Minhas'], ['fatal', 'Prazo fatal']].map(function (f) { return '<button type="button" class="vg-chip' + (D.filtro === f[0] ? ' on' : '') + '" data-vg-filtro="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div></div>'
      + (r ? grafico(r) + '<div class="vg-legenda"><span><i></i>Atividades</span><span><i class="tr"></i>Prazos fatais</span></div>' : '<div class="vg-vazio" style="height:220px;">' + (a.semAcesso || a.vazio ? 'Sem dados da agenda.' : 'Carregando…') + '</div>')
      + '</section>';
    // 2) resumo (como o bloco "Desempenho" do modelo)
    h += '<section class="vg-bloco vg-resumo" data-ds-tom="ambar"><div class="vg-rot">Agenda · resumo' + (D.filtro === 'minhas' ? ' · minhas' : '') + '</div>'
      + '<div class="vg-num grande">' + (r ? r.venc : '–') + '</div><div class="vg-sub">atividades com a data da agenda vencida</div>'
      + '<div class="vg-linhas"><div><span>Para hoje</span><b>' + (r ? r.hoje : '–') + '</b></div><div><span>Próximos 7 dias</span><b>' + (r ? r.sete : '–') + '</b></div><div><span>Prazos fatais em 7 dias</span><b>' + (r ? r.fatal7 : '–') + '</b></div></div>'
      + '<div class="vg-caixa"><div><span>Pessoa</span><b>' + esc(D.eu.nome) + '</b></div><div><span>Base</span><b>' + (a.id ? esc(a.id.split('-').reverse().join('/')) : '–') + '</b></div></div>'
      + (temAba(/numero|agenda/) ? '<button type="button" class="vg-pilula" data-vg-abrir="numero|agenda">Abrir a agenda</button>' : '')
      + '</section>';
    // 3) tabela (como a de componentes do modelo)
    var linhas = [];
    linhas.push({ ic: IC.agenda, nome: 'Agenda do Astrea', det: a.id ? 'snapshot de ' + a.id.split('-').reverse().join('/') : 'robô do PC do escritório', sit: a.hoje ? 'Atualizada hoje' : a.itens ? 'Desatualizada' : '–', pend: r ? r.venc + ' vencidas' : '–', quando: a.em ? hora(a.em) : '–', abrir: temAba(/numero|agenda/) ? 'numero|agenda' : '' });
    if (!e.semAcesso) linhas.push({ ic: IC.email, nome: 'Conferência de e-mails', det: D.eu.role === 'admin' ? 'todas as caixas · 30 dias' : 'e-mails encaminhados para você', sit: e.pend ? 'Aguardando resposta' : 'Em dia', pend: nf(e.pend) + ' sem resposta', quando: D.emailsMeta && D.emailsMeta.em ? hora(D.emailsMeta.em) : '–', abrir: temAba(/e-?mail/) ? 'e-?mail' : '' });
    linhas.push({ ic: IC.tarefa, nome: 'Tarefas recebidas', det: 'enviadas a você para fazer ou corrigir', sit: D.tarefas ? 'Pendentes' : 'Em dia', pend: nf(D.tarefas), quando: '–', abrir: temAba(/anota/) ? 'anota' : '' });
    linhas.push({ ic: IC.megafone, nome: 'Comunicados do escritório', det: 'ciência obrigatória', sit: D.comunicadosPend ? 'Ciência pendente' : 'Em dia', pend: nf(D.comunicadosPend), quando: D.comunicados && D.comunicados[0] ? D.comunicados[0].data.split('-').reverse().join('/') : '–', abrir: '__comunicados' });
    h += '<section class="vg-bloco vg-tabela"><table><thead><tr><th>Item</th><th>Situação</th><th>Pendências</th><th>Atualizado</th><th style="text-align:right">Ver</th></tr></thead><tbody>'
      + linhas.map(function (l) {
        return '<tr><td><div class="nome"><span class="ic">' + l.ic + '</span><div>' + esc(l.nome) + '<small>' + esc(l.det) + '</small></div></div></td>'
          + '<td>' + esc(l.sit) + '</td><td class="mono">' + esc(l.pend) + '</td><td class="mono">' + esc(l.quando) + '</td>'
          + '<td style="text-align:right">' + (l.abrir ? '<button type="button" class="ver" data-vg-abrir="' + esc(l.abrir) + '" title="Abrir">→</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></section>';
    // 4) três blocos de baixo
    h += '<section class="vg-bloco vg-c4" data-ds-tom="ceu"><div class="vg-rot">E-mails para responder</div>'
      + (e.semAcesso ? '<div class="vg-vazio">A conferência de e-mails não está liberada para você.</div>'
        : '<div class="vg-num grande">' + nf(e.pend) + '</div><div class="vg-sub">de ' + nf(e.total) + ' e-mails ' + (D.eu.role === 'admin' ? 'nos últimos 30 dias' : 'encaminhados a você') + '</div>'
          + '<div class="vg-anel">' + anel(e.total ? e.resp / e.total : 0) + '</div><div class="vg-sub" style="text-align:center">respondidos</div>')
      + '</section>';
    var ev = (D.comunicados || []).slice(0, 4);
    h += '<section class="vg-bloco vg-c4" data-ds-tom="rosa"><h3 class="vg-h">Avisos recentes</h3>'
      + (ev.length ? '<ul class="vg-eventos">' + ev.map(function (c) { return '<li>' + esc(c.titulo) + '<small>' + esc(c.data.split('-').reverse().join('/')) + '</small></li>'; }).join('') + '</ul>'
        : '<div class="vg-vazio">Nada ainda. Comunicados do escritório aparecem aqui.</div>')
      + '</section>';
    var mAg = a.em ? minutosDesde(a.em) : null, mEm = D.emailsMeta && D.emailsMeta.em ? minutosDesde(D.emailsMeta.em) : null;
    var itens = [
      [!!a.hoje, 'Agenda do Astrea importada hoje', a.hoje ? 'Snapshot de hoje' + (a.em ? ', ' + hora(a.em) : '') + '.' : 'O robô do PC do escritório ainda não rodou hoje.'],
      [mEm != null && mEm <= 90, 'Conferência de e-mails em dia', mEm == null ? 'Sem registro da última rodada.' : 'Última rodada há ' + (mEm < 60 ? mEm + ' min' : Math.round(mEm / 60) + ' h') + '.'],
      [!D.comunicadosPend, 'Comunicados com ciência', D.comunicadosPend ? D.comunicadosPend + ' aguardando a sua ciência.' : 'Nenhuma ciência pendente.'],
      [!D.tarefas, 'Tarefas recebidas em dia', D.tarefas ? D.tarefas + ' tarefa(s) para fazer ou corrigir.' : 'Nenhuma tarefa pendente.']
    ];
    h += '<section class="vg-bloco vg-c4" data-ds-tom="verde"><h3 class="vg-h">Saúde do escritório</h3><ul class="vg-saude">'
      + itens.map(function (i) { return '<li><span class="cx' + (i[0] ? ' ok' : '') + '">' + (i[0] ? IC.ok : '') + '</span><div>' + esc(i[1]) + '<small>' + esc(i[2]) + '</small></div></li>'; }).join('')
      + '</ul></section>';
    p.innerHTML = h;
    // rodapé do menu
    var st = $('vg-situacao'), mi = $('vg-mini');
    if (st) {
      var pior = !a.hoje && a.itens ? ['Agenda do Astrea desatualizada', 'O robô do PC do escritório não importou a agenda hoje.', 'numero|agenda']
        : e.pend ? [e.pend + ' e-mail(s) sem resposta', 'Encaminhados para você na conferência.', 'e-?mail']
          : r && r.hoje ? [r.hoje + ' atividade(s) para hoje', 'Pela agenda do Astrea.', 'numero|agenda'] : ['Tudo em dia', 'Nenhuma pendência urgente agora.', ''];
      st.innerHTML = '<div class="t">' + esc(pior[0]) + '</div><div class="d">' + esc(pior[1]) + '</div>' + (pior[2] && temAba(new RegExp(pior[2])) ? '<button type="button" class="vg-pilula peq" style="width:100%" data-vg-abrir="' + pior[2] + '">Abrir</button>' : '');
    }
    if (mi) mi.innerHTML = '<span>Agenda</span><b>' + (r ? r.hoje + ' hoje' : '–') + '</b><span>E-mails</span><b>' + (e.semAcesso ? '–' : nf(e.pend)) + '</b><span>Tarefas</span><b>' + nf(D.tarefas) + '</b>';
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-vg-janela],[data-vg-filtro],[data-vg-abrir]'); if (!t) return;
    if (t.dataset.vgJanela) { D.janela = +t.dataset.vgJanela; desenhar(); }
    else if (t.dataset.vgFiltro) { D.filtro = t.dataset.vgFiltro; desenhar(); }
    else if (t.dataset.vgAbrir === '__comunicados') { var c = $('comunicados-btn'); if (c) c.click(); }
    else abrirAbaPorRotulo(new RegExp(t.dataset.vgAbrir));
  });

  function montarPainel() {
    var home = $('mobile-home'); if (!home || $('vg-painel')) return;
    var p = document.createElement('div'); p.id = 'vg-painel'; home.appendChild(p);
    var aplicar = function () { home.classList.toggle('vg-ativo', MEDIA.matches && !!D.eu && D.eu.role !== 'cliente'); atualizarOnde(); };
    new MutationObserver(aplicar).observe(home, { attributes: true, attributeFilter: ['class'] });
    if (MEDIA.addEventListener) MEDIA.addEventListener('change', aplicar);
    D.aplicar = aplicar;
  }

  function iniciar() {
    montarTopo(); montarMenu(); montarPainel();
    if (!window.firebase || !firebase.auth) return;
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) return;
      var db = firebase.firestore();
      db.collection('users').doc(user.uid).get().then(function (d) {
        var perfil = d.exists ? d.data() : {};
        // versão nova publicada em /novo/: só o administrador; os demais voltam ao portal de sempre
        if (/\/novo\//.test(location.pathname) && perfil.role !== 'admin') { location.replace('/'); return; }
        if (perfil.role === 'cliente' || perfil.role === 'conselheiro' || perfil.role === 'sindico') return;   // clientes: tela de sempre
        carregar(db, user, perfil);
        if (D.aplicar) D.aplicar();
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
