/* Relatório da Agenda Astrea (aba "Agenda — Astrea" de Números do Escritório).
   Uso: AgendaRelatorio.montar(elemento, {registros, colunas, data, atualizadoEm}, {carregarDelta})
   - registros: lista de objetos gravada pelo robô em astreaDiario/{data} (chave = nome da coluna)
   - carregarDelta(): Promise com os documentos de astreaDelta (entradas/saídas por dia)
   Os dados são só lidos; nada é gravado no Firestore. */
(function(){
'use strict';

var ICON = {
  layout:'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userplus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  hourglass:'<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  pause:'<circle cx="12" cy="12" r="10"/><path d="M10 15V9"/><path d="M14 15V9"/>',
  trend:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  swap:'<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  scale:'<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  table:'<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  filter:'<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  rotate:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  chevl:'<path d="m15 18-6-6 6-6"/>', chevr:'<path d="m9 18 6-6-6-6"/>',
  sort:'<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  up:'<path d="m18 15-6-6-6 6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  pie:'<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  ban:'<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  pencil:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  arrowup:'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  sheet:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
  lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
};
function ic(n,cls){ return '<svg class="ic '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICON[n]||'')+'</svg>'; }

var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var nf = new Intl.NumberFormat('pt-BR');
var pf = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
var DAY = 86400000;
function dayNum(s){
  s = String(s==null?'':s).trim();
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return Math.floor(Date.UTC(+m[1],+m[2]-1,+m[3])/DAY);
  m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); if(m) return Math.floor(Date.UTC(+m[3],+m[2]-1,+m[1])/DAY);
  return null;
}
function dayToBR(d){ if(d==null) return '—'; var x=new Date(d*DAY); return String(x.getUTCDate()).padStart(2,'0')+'/'+String(x.getUTCMonth()+1).padStart(2,'0')+'/'+x.getUTCFullYear(); }
function dayToISO(d){ return d==null?'':new Date(d*DAY).toISOString().slice(0,10); }
function todayDay(){ var t=new Date(); return Math.floor(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate())/DAY); }
function monthKey(d){ var x=new Date(d*DAY); return x.getUTCFullYear()+'-'+String(x.getUTCMonth()+1).padStart(2,'0'); }
var MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var MESF=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function monthLabel(k){ var p=k.split('-'); return MES[+p[1]-1]+'/'+p[0].slice(2); }
function monthFull(k){ var p=k.split('-'); return MESF[+p[1]-1]+' de '+p[0]; }
function norm(s){ return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function blank(v){ return v==null || String(v).trim()==='' || String(v).trim()==='-'; }
function median(a){ if(!a.length) return null; var s=a.slice().sort(function(x,y){return x-y;}); var m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function plural(n,s,p){ return nf.format(n)+' '+(n===1?s:p); }
function pct(n,t){ return t?pf.format(n/t*100)+'%':'0%'; }
function fmtVal(v){ if(v==null) return v; var s=String(v); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? dayToBR(dayNum(s)) : s; }

/* credenciais anotadas nas observações não aparecem no relatório */
var CRED = /\b(senha|password|passwd|pwd|pin|token|login|usu[áa]rio|user)(\s*[:=]\s*)(\S+)/gi;
function limpar(v, cont){
  if(v==null || typeof v==='object') return v==null?null:String(v);
  var s = String(v).replace(/_x000d_/g,'');
  return s.replace(CRED, function(_,a,b){ cont.n++; return a+b+'[oculto no portal]'; });
}

/* localiza a coluna pelo nome, tolerando acentos e variações */
function findCol(N, eq, inc, not){
  var i;
  for(i=0;i<(eq||[]).length;i++){ var k=N.indexOf(eq[i]); if(k>=0) return k; }
  for(i=0;i<N.length;i++){
    var n=N[i];
    if((inc||[]).some(function(x){ return n.indexOf(x)>=0; }) && !(not||[]).some(function(x){ return n.indexOf(x)>=0; })) return i;
  }
  return -1;
}

function hashStr(s){ var h=5381; for(var i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))|0; } return (h>>>0).toString(36); }

var ANOT_KEY = 'fb.agendaAstrea.anotacoes.v1';
function lerAnot(){ try { return { ok:true, v: JSON.parse(localStorage.getItem(ANOT_KEY)||'{}') || {} }; } catch(e){ return { ok:false, v:{} }; } }

var PAL = ['#8E2B25','#C9A04A','#5E8C6A','#9A8A83','#C9A9A3','#5C1A16','#D8B25A'];
var PAL_DARK = ['#C9463C','#D8B25A','#6FB283','#9C908B','#B98C86','#E3877E','#EAD39B'];
function palette(){ return document.documentElement.getAttribute('data-theme')==='light' ? PAL : PAL_DARK; }

var SIT = [
  {k:'vencida', label:'Vencida', tone:'red', badge:'b-red', icon:'alert'},
  {k:'hoje', label:'Hoje', tone:'amber', badge:'b-amber', icon:'clock'},
  {k:'prox7', label:'Amanhã a 7 dias', tone:'gold', badge:'b-gold', icon:'calendar'},
  {k:'prox30', label:'8 a 30 dias', tone:'light', badge:'b-petrol', icon:'calendar'},
  {k:'prox90', label:'31 a 90 dias', tone:'green', badge:'b-green', icon:'calendar'},
  {k:'futuro', label:'Mais de 90 dias', tone:'slate', badge:'b-slate', icon:'calendar'},
  {k:'semdata', label:'Sem data', tone:'slate', badge:'b-slate', icon:'ban'}
];
var SITMAP = {}; SIT.forEach(function(s){ SITMAP[s.k]=s; });
var IDADE = [
  {k:'futura', label:'Criada após a data-base', max:-1},
  {k:'a7', label:'Até 7 dias', max:7},
  {k:'a30', label:'8 a 30 dias', max:30},
  {k:'a90', label:'31 a 90 dias', max:90},
  {k:'a180', label:'91 a 180 dias', max:180},
  {k:'a365', label:'181 dias a 1 ano', max:365},
  {k:'mais', label:'Mais de 1 ano', max:Infinity}
];
var IDMAP={}; IDADE.forEach(function(x){ IDMAP[x.k]=x; });
var PRIO_ORDER = {'Alta':0,'Média':1,'Baixa':2,'Não informada':3};

var TEMPLATE =
'<div class="selbar" role="region" aria-label="Seleção atual">'+
  '<div class="sel-count" aria-live="polite">'+ic('filter')+'<span><b id="agr-selN">0</b> de <span id="agr-selT">0</span> atividades</span></div>'+
  '<div class="chips" id="agr-chips"></div>'+
  '<div class="sel-actions"><button class="btn" type="button" data-act="clear">'+ic('rotate')+'<span class="lbl-t">Limpar filtros</span></button>'+
  '<button class="btn primary" type="button" data-act="csv">'+ic('download')+'<span class="lbl-t">Exportar CSV</span></button></div>'+
'</div>'+
'<section class="card agr-filtros" aria-labelledby="agr-h-filtros">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('filter')+'</div><div><h2 id="agr-h-filtros">Filtros</h2><p>Os filtros se combinam e todos os indicadores, gráficos e tabelas abaixo seguem a mesma seleção. Gráficos também são clicáveis.</p></div></div>'+
  '<div class="filters">'+
    '<div class="field wide"><label for="agr-fQ">Busca por texto</label><div class="inp-ic">'+ic('search')+'<input class="inp" id="agr-fQ" type="search" placeholder="Título, caso, processo, juízo, observação…" autocomplete="off"></div></div>'+
    '<div class="field"><label for="agr-fResp">Responsável</label><select class="inp" id="agr-fResp"></select></div>'+
    '<div class="field"><label for="agr-fCriador" id="agr-lblCriador">Criado por</label><select class="inp" id="agr-fCriador"></select></div>'+
    '<div class="field"><label for="agr-fTipo">Tipo</label><select class="inp" id="agr-fTipo"></select></div>'+
    '<div class="field"><label for="agr-fPrio">Prioridade</label><select class="inp" id="agr-fPrio"></select></div>'+
    '<div class="field"><label for="agr-fTag">Etiqueta</label><select class="inp" id="agr-fTag"></select></div>'+
    '<div class="field"><label for="agr-fBase">Data-base dos cálculos</label><div class="base-row"><input class="inp" id="agr-fBase" type="date"><button class="btn" type="button" data-act="hoje" title="Usar a data de hoje">Hoje</button></div></div>'+
    '<div class="field wide"><span class="lbl" id="agr-lblPer">Intervalo de datas</span><div class="range" role="group" aria-labelledby="agr-lblPer">'+
      '<select class="inp" id="agr-fDateField" aria-label="Campo de data"><option value="ag">Data da agenda</option><option value="cr">Data de criação</option></select>'+
      '<input class="inp" id="agr-fFrom" type="date" aria-label="De"><input class="inp" id="agr-fTo" type="date" aria-label="Até"></div></div>'+
    '<div class="f-actions"><span class="f-hint" id="agr-baseHint"></span><div style="display:flex;gap:8px;flex-wrap:wrap">'+
      '<button class="btn" type="button" data-act="clear">'+ic('rotate')+'Limpar filtros</button>'+
      '<button class="btn primary" type="button" data-act="csv">'+ic('download')+'Exportar seleção (CSV)</button></div></div>'+
  '</div>'+
'</section>'+
'<section class="painel" aria-labelledby="agr-h-painel">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('layout')+'</div><div><h2 id="agr-h-painel">Painel da agenda</h2><p>Visão rápida da seleção atual. Clique em medidores, barras, dias e semanas para filtrar.</p></div></div>'+
  '<div class="pz-grid">'+
    '<div class="pz-card pz-gauge-card" id="agr-pz-g0"></div><div class="pz-card pz-gauge-card" id="agr-pz-g1"></div><div class="pz-card pz-gauge-card" id="agr-pz-g2"></div>'+
    '<div class="pz-card pz-big" id="agr-pz-big"></div><div class="pz-card pz-bars" id="agr-pz-bars"></div>'+
    '<div class="pz-card pz-chart" id="agr-pz-chart"></div><div class="pz-card pz-led" id="agr-pz-led"></div>'+
    '<div class="pz-card pz-act" id="agr-pz-act"></div><div class="pz-card pz-cal" id="agr-pz-cal"></div><div class="pz-card pz-rings" id="agr-pz-rings"></div>'+
  '</div>'+
'</section>'+
'<section aria-label="Visão geral"><div class="kpis" id="agr-kpis"></div></section>'+
'<section class="card" aria-labelledby="agr-h-agenda">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('calendar')+'</div><div><h2 id="agr-h-agenda">Situação da agenda</h2><p>Posição de cada atividade em relação à data-base, pela data cadastrada na agenda.</p></div></div>'+
  '<div class="grid-2"><div><h3 class="sub-h">Distribuição por período</h3><div id="agr-agBars"></div></div>'+
  '<div><h3 class="sub-h">Data da agenda vencida há mais tempo <small>— 10 maiores atrasos</small></h3><div id="agr-agLate"></div></div></div>'+
  '<p class="note">'+ic('info')+'<span>A data exibida é a <b>data cadastrada na agenda do Astrea</b>, não um prazo processual confirmado. "Vencida" significa apenas que essa data é anterior à data-base e a atividade continua na exportação de itens em aberto. O atraso é contado a partir da data da agenda e <b>não equivale a tempo sem movimentação</b>.</span></p>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-prazos">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('flag')+'</div><div><h2 id="agr-h-prazos">Prazos fatais</h2><p>Atividades identificadas pelos campos existentes na exportação.</p></div></div>'+
  '<div class="tbl-tools"><div class="aseg" role="group" aria-label="Critério de identificação" id="agr-fatalSeg">'+
    '<button type="button" data-m="etiqueta" aria-pressed="true">Etiqueta "PRAZO FATAL"</button><button type="button" data-m="tipo" aria-pressed="false">Tipo "Prazo"</button><button type="button" data-m="ambos" aria-pressed="false">Qualquer um dos dois</button></div></div>'+
  '<div class="stats" id="agr-fatalStats"></div><div id="agr-fatalTbl"></div>'+
  '<p class="note">'+ic('info')+'<span><b>Critério:</b> "Prazo fatal" = atividade com a etiqueta <b>PRAZO FATAL</b>. Como alternativa, é possível ver as atividades cujo campo <b>Tipo</b> é "Prazo". A exportação não possui campo próprio de prazo processual: a data mostrada é a da agenda e deve ser conferida nos autos.</span></p>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-revisao">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('eye')+'</div><div><h2 id="agr-h-revisao">Atividades em revisão</h2><p>Identificadas pela etiqueta "REVISÃO".</p></div></div>'+
  '<div class="stats" id="agr-revStats"></div>'+
  '<div class="grid-2"><div><h3 class="sub-h">Por responsável</h3><div id="agr-revResp"></div></div><div><h3 class="sub-h">Lista</h3><div id="agr-revTbl"></div></div></div>'+
  '<p class="note">'+ic('info')+'<span><b>Critério:</b> etiqueta <b>REVISÃO</b> presente no campo Etiquetas. O tempo em revisão <b>não pode ser calculado</b>: a exportação não registra quando a atividade entrou em revisão. Os dias mostrados são idade desde a criação.</span></p>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-resp">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('users')+'</div><div><h2 id="agr-h-resp">Responsáveis</h2><p>Quantidade e participação das atividades por responsável. Clique em uma barra ou linha para filtrar.</p></div></div>'+
  '<div id="agr-respBars"></div><h3 class="sub-h" style="margin-top:20px">Quadro por responsável</h3><div id="agr-respTbl"></div>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-criador">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('userplus')+'</div><div><h2 id="agr-h-criador">Quem criou as atividades</h2><p>Quantidade por pessoa que criou a atividade.</p></div></div><div id="agr-criadorBox"></div>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-class">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('pie')+'</div><div><h2 id="agr-h-class">Tipo, prioridade, status e etiquetas</h2><p>Clique em um item para filtrar.</p></div></div>'+
  '<div class="grid-2"><div><h3 class="sub-h">Tipo</h3><div id="agr-clTipo"></div></div><div><h3 class="sub-h">Prioridade</h3><div id="agr-clPrio"></div><h3 class="sub-h" style="margin-top:18px">Status</h3><div id="agr-clStatus"></div></div></div>'+
  '<h3 class="sub-h" style="margin-top:22px">Etiquetas <small>— uma atividade pode ter várias etiquetas; o percentual é sobre o total de atividades</small></h3><div id="agr-clTags"></div>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-idade">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('hourglass')+'</div><div><h2 id="agr-h-idade">Idade das atividades</h2><p>Dias entre a data de criação e a data-base.</p></div></div>'+
  '<div class="stats" id="agr-idStats"></div>'+
  '<div class="grid-2"><div><h3 class="sub-h">Faixas de idade</h3><div id="agr-idBars"></div></div><div><h3 class="sub-h">Criadas há mais tempo <small>— 10 mais antigas</small></h3><div id="agr-idOld"></div></div></div>'+
  '<p class="note">'+ic('info')+'<span><b>Idade não é tempo parado.</b> Ela mede apenas há quanto tempo a atividade existe. Uma atividade antiga pode ter sido movimentada recentemente; a exportação não informa movimentações.</span></p>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-mov">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('pause')+'</div><div><h2 id="agr-h-mov">Sem movimentação há mais tempo</h2><p>Duração desde a última movimentação de cada atividade.</p></div></div><div id="agr-movBox"></div>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-delta">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('swap')+'</div><div><h2 id="agr-h-delta">Entradas e saídas da agenda</h2><p>Comparação diária entre as importações do robô, nos últimos 35 dias.</p></div></div><div id="agr-deltaBox"><p class="empty">Carregando histórico…</p></div>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-evo">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('trend')+'</div><div><h2 id="agr-h-evo">Evolução por mês de criação</h2><p>Atividades em aberto agrupadas pelo mês em que foram criadas. Clique em um mês para filtrar.</p></div></div>'+
  '<div class="stats" id="agr-evoStats"></div><div id="agr-evoCols"></div>'+
  '<p class="note">'+ic('info')+'<span>A exportação contém apenas atividades em aberto. Por isso o gráfico mostra quantas atividades criadas em cada mês <b>continuam abertas</b>, e não o volume total criado no mês.</span></p>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-conc">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('folder')+'</div><div><h2 id="agr-h-conc">Concentração por caso, processo e juízo</h2><p>Os 10 itens com mais atividades na seleção. Clique para filtrar.</p></div></div>'+
  '<div class="grid-3"><div><h3 class="sub-h">'+ic('folder')+'Caso / atendimento</h3><div id="agr-coCaso" class="compact"></div></div>'+
  '<div><h3 class="sub-h">'+ic('file')+'Número do processo</h3><div id="agr-coProc" class="compact"></div></div>'+
  '<div><h3 class="sub-h">'+ic('scale')+'Juízo</h3><div id="agr-coJuizo" class="compact"></div></div></div>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-qual">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('database')+'</div><div><h2 id="agr-h-qual">Qualidade e lacunas dos dados</h2><p>Preenchimento de cada coluna na seleção atual e limitações que afetam as análises.</p></div></div>'+
  '<div class="grid-2"><div><h3 class="sub-h">Preenchimento por coluna</h3><div id="agr-qBars"></div></div><div><h3 class="sub-h">Lacunas que afetam as análises</h3><div id="agr-qNotes"></div></div></div>'+
'</section>'+
'<section class="card" aria-labelledby="agr-h-ativ">'+
  '<div class="sec-head"><div class="sec-ic">'+ic('table')+'</div><div><h2 id="agr-h-ativ">Todas as atividades da seleção</h2><p>Clique em uma linha (ou use Enter) para ver todos os campos da origem.</p></div></div><div id="agr-mainTbl"></div>'+
'</section>'+
'<div class="modal" id="agr-modal" hidden>'+
  '<div class="modal-back" data-close></div>'+
  '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="agr-mTitle" tabindex="-1" id="agr-mCard">'+
    '<div class="m-head"><div style="min-width:0"><p class="eyebrow">Detalhes da atividade</p><h2 id="agr-mTitle"></h2><div class="m-badges" id="agr-mBadges"></div></div>'+
    '<div class="m-nav"><button class="btn icon-btn" type="button" id="agr-mPrev" aria-label="Atividade anterior da seleção">'+ic('chevl')+'</button>'+
    '<button class="btn icon-btn" type="button" id="agr-mNext" aria-label="Próxima atividade da seleção">'+ic('chevr')+'</button>'+
    '<button class="btn icon-btn" type="button" data-close aria-label="Fechar detalhes">'+ic('x')+'</button></div></div>'+
    '<div class="m-body" id="agr-mBody"></div>'+
  '</div>'+
'</div>';

/* ================================================================== */
function montar(root, payload, opts){
  opts = opts || {};
  var $ = function(id){ return document.getElementById('agr-'+id); };
  var prevState = root._agrState || null;
  if(root._agrCleanup) root._agrCleanup();
  root.id = 'agr';
  root.innerHTML = TEMPLATE;

  /* -------- dados -------- */
  var registros = payload.registros || [];
  var H = (payload.colunas && payload.colunas.length ? payload.colunas.slice() : []);
  registros.forEach(function(r){ Object.keys(r).forEach(function(k){ if(H.indexOf(k)<0) H.push(k); }); });
  H = H.filter(function(k){ return registros.some(function(r){ return Object.prototype.hasOwnProperty.call(r,k); }); });
  var N = H.map(norm);
  var K = {
    data: findCol(N, ['data','data da atividade','data de vencimento'], ['data'], ['criac','conclus','atualiz','moviment']),
    hora: findCol(N, ['hora'], ['hora']),
    tipo: findCol(N, ['tipo','tipo da atividade'], []),
    resp: findCol(N, [], ['responsav']),
    titulo: findCol(N, ['titulo','titulo da atividade'], ['titulo'], ['processo','caso','atendimento']),
    caso: findCol(N, [], ['titulo do processo','processo/caso','caso/atendimento']),
    proc: findCol(N, [], ['numero do processo','n do processo','numero processo','n. do processo']),
    juizo: findCol(N, [], ['juizo']),
    obs: findCol(N, [], ['observa']),
    tags: findCol(N, [], ['etiqueta']),
    status: findCol(N, ['status','situacao'], ['status','situac']),
    prio: findCol(N, [], ['prioridade']),
    criacao: findCol(N, [], ['data de criac','criado em','criacao']),
    conclusao: findCol(N, [], ['conclus']),
    criador: findCol(N, [], ['criado por','criador','autor da atividade']),
    mov: findCol(N, [], ['ultima moviment','ultima atualiz','atualizado em'])
  };
  var masked = {n:0};
  var respAjust = 0;
  var seen = {};
  var RECS = registros.map(function(o,i){
    var f = H.map(function(k){ return limpar(o[k], masked); });
    var g = function(key){ var ix=K[key]; if(ix<0) return null; var v=f[ix]; return blank(v)?null:String(v).trim(); };
    if(K.resp>=0 && f[K.resp] && f[K.resp]!==String(f[K.resp]).trim()) respAjust++;
    var tags = K.tags>=0 ? String(f[K.tags]||'').split(',').map(function(s){return s.trim();}).filter(Boolean) : [];
    var baseId = hashStr([g('criacao'),g('titulo'),g('resp'),g('caso'),g('data'),g('hora')].join('|'));
    var id = baseId; if(seen[baseId]){ id = baseId+'-'+(++seen[baseId]); } else seen[baseId]=1;
    var r = {
      i:i, id:id, f:f, ag:dayNum(g('data')), cr:dayNum(g('criacao')), hora:g('hora'),
      resp:g('resp')||'(sem responsável)', tipo:g('tipo')||'(sem tipo)', prio:g('prio')||'Não informada',
      status:g('status')||'(sem status)', caso:g('caso'), proc:g('proc'), juizo:g('juizo'),
      titulo:g('titulo')||g('caso')||'(sem título)', tags:tags, criadorOrig:g('criador'), movOrig:dayNum(g('mov'))
    };
    r.fatal = tags.some(function(t){ return norm(t)==='prazo fatal'; });
    r.revisao = tags.some(function(t){ return norm(t)==='revisao'; });
    r.tipoPrazo = norm(r.tipo)==='prazo';
    r.search = norm(f.join(' \u0001 '));
    return r;
  });

  var AN = lerAnot(), ANOT = AN.v, ANOT_OK = AN.ok;
  function saveAnot(){ try { localStorage.setItem(ANOT_KEY, JSON.stringify(ANOT)); return true; } catch(e){ return false; } }
  function anot(r){ return ANOT[r.id] || {}; }
  function criadorOf(r){ if(r.criadorOrig) return r.criadorOrig; var c=anot(r).criador; return c && c.trim() ? c.trim() : null; }
  function ultMovOf(r){ return r.movOrig!=null ? r.movOrig : dayNum(anot(r).ultimaMov); }
  var TEM_CRIADOR = K.criador>=0, TEM_MOV = K.mov>=0;

  /* -------- estado (mantido entre atualizações do Firestore) -------- */
  var BASE0 = dayNum(payload.data) != null ? dayNum(payload.data) : todayDay();
  var S;
  function resetState(){
    S = { q:'', qTerms:[], resp:'', criador:'', tipo:'', prio:'', tag:'', dateField:'ag', from:null, to:null,
          chips:{ situacao:null, caso:null, proc:null, juizo:null, mes:null, idade:null }, base:BASE0, baseManual:false, fatalMode:(S&&S.fatalMode)||'etiqueta' };
  }
  if(prevState){ S = prevState; if(!S.baseManual) S.base = BASE0; } else resetState();
  root._agrState = S;

  function situacao(r){
    if(r.ag==null) return 'semdata';
    var d = r.ag - S.base;
    if(d<0) return 'vencida'; if(d===0) return 'hoje'; if(d<=7) return 'prox7'; if(d<=30) return 'prox30'; if(d<=90) return 'prox90'; return 'futuro';
  }
  function idade(r){ return r.cr==null?null:S.base-r.cr; }
  function idadeBucket(r){ var a=idade(r); if(a==null) return null; for(var i=0;i<IDADE.length;i++){ if(a<=IDADE[i].max) return IDADE[i].k; } return 'mais'; }

  function pass(r){
    if(S.resp && r.resp!==S.resp) return false;
    if(S.criador){ var c=criadorOf(r); if(S.criador==='__none'){ if(c) return false; } else if(c!==S.criador) return false; }
    if(S.tipo && r.tipo!==S.tipo) return false;
    if(S.prio && r.prio!==S.prio) return false;
    if(S.tag){ if(S.tag==='__none'){ if(r.tags.length) return false; } else if(r.tags.indexOf(S.tag)<0) return false; }
    if(S.from!=null || S.to!=null){
      var d = S.dateField==='ag' ? r.ag : r.cr;
      if(d==null) return false;
      if(S.from!=null && d<S.from) return false;
      if(S.to!=null && d>S.to) return false;
    }
    var c2=S.chips;
    if(c2.situacao && situacao(r)!==c2.situacao) return false;
    if(c2.caso && r.caso!==c2.caso) return false;
    if(c2.proc && r.proc!==c2.proc) return false;
    if(c2.juizo && r.juizo!==c2.juizo) return false;
    if(c2.mes && (r.cr==null || monthKey(r.cr)!==c2.mes)) return false;
    if(c2.idade && idadeBucket(r)!==c2.idade) return false;
    for(var i=0;i<S.qTerms.length;i++){ if(r.search.indexOf(S.qTerms[i])<0) return false; }
    return true;
  }

  /* -------- componentes -------- */
  function setNum(el, v, fmt){
    fmt = fmt || function(x){ return nf.format(Math.round(x)); };
    var from = el.dataset.v!=null && el.dataset.v!=='' ? +el.dataset.v : 0;
    el.dataset.v = v==null ? '' : v;
    if(v==null || isNaN(v)){ el.textContent='—'; return; }
    if(RM || from===v){ el.textContent = fmt(v); return; }
    var t0 = performance.now(), dur = 480, tok = {}; el._tok = tok;
    function step(t){ if(el._tok!==tok) return; var k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,3); el.textContent = k<1 ? fmt(from+(v-from)*e) : fmt(v); if(k<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
    setTimeout(function(){ if(el._tok===tok) el.textContent = fmt(v); }, dur+120);
  }
  function grow(el, sel, prop){
    var items = el.querySelectorAll(sel);
    if(RM){ items.forEach(function(x){ x.style[prop]=x.dataset.to; }); return; }
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ items.forEach(function(x){ x.style[prop]=x.dataset.to; }); }); });
  }
  function barList(el, items, o){
    o = o || {};
    var total = o.total!=null ? o.total : SEL.length;
    if(!items.length){ el.innerHTML = '<p class="empty">Nenhum registro na seleção atual.</p>'; return; }
    var max = Math.max.apply(null, items.map(function(x){ return x.count; }).concat([1]));
    var lim = o.limit && !el._expanded ? o.limit : items.length;
    var html = '<ul class="bars">' + items.slice(0,lim).map(function(it){
      var active = o.active!=null && o.active===it.key;
      var tag = o.onPick ? 'button' : 'div';
      var attrs = o.onPick ? ' type="button" data-key="'+esc(it.key)+'" aria-pressed="'+active+'" aria-label="'+esc(it.label)+': '+nf.format(it.count)+'. '+(active?'Remover filtro':'Filtrar')+'"' : '';
      return '<li><'+tag+' class="brow'+(active?' is-active':'')+'"'+attrs+'>'
        +'<span class="b-label" title="'+esc(it.label)+'">'+esc(it.label)+(it.sub?'<small>'+it.sub+'</small>':'')+'</span>'
        +'<span class="btrack" aria-hidden="true"><span class="bfill f-'+(it.tone||o.tone||'petrol')+'" data-to="'+(it.count/max*100).toFixed(2)+'%"></span></span>'
        +'<span class="b-val"><b>'+nf.format(it.count)+'</b>'+(o.noPct?'':'<small>'+(it.pctText!=null?it.pctText:pct(it.count,total))+'</small>')+'</span>'
        +'</'+tag+'></li>';
    }).join('') + '</ul>';
    if(o.limit && items.length>o.limit) html += '<button type="button" class="btn ghost more" data-more>'+(el._expanded?'Mostrar menos':'Mostrar todos ('+nf.format(items.length)+')')+'</button>';
    el.innerHTML = html;
    if(o.onPick) el.querySelectorAll('button.brow').forEach(function(b){ b.addEventListener('click', function(){ o.onPick(b.dataset.key); }); });
    var mb = el.querySelector('[data-more]'); if(mb) mb.addEventListener('click', function(){ el._expanded=!el._expanded; barList(el, items, o); });
    grow(el, '.bfill', 'width');
  }
  function donut(el, items, o){
    var total = items.reduce(function(a,b){ return a+b.count; },0);
    if(!total){ el.innerHTML='<p class="empty">Nenhum registro na seleção atual.</p>'; return; }
    var P = palette(), R=52, C=2*Math.PI*R, off=0;
    var segs = items.map(function(it,i){
      var len = it.count/total*C;
      var s = '<circle class="seg-c" data-key="'+esc(it.key)+'" r="'+R+'" cx="70" cy="70" fill="none" stroke="'+P[i%P.length]+'" stroke-width="20" stroke-dasharray="'+(RM?len:0)+' '+C+'" data-to="'+len+' '+C+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 70 70)"><title>'+esc(it.label)+': '+nf.format(it.count)+' ('+pct(it.count,total)+')</title></circle>';
      off += len; return s;
    }).join('');
    el.innerHTML = '<div class="donut-wrap"><svg viewBox="0 0 140 140" class="donut" role="img" aria-label="'+esc(o.aria)+'"><circle r="'+R+'" cx="70" cy="70" fill="none" stroke="var(--a-track)" stroke-width="20"/>'+segs
      +'<text x="70" y="70" text-anchor="middle" class="donut-n">'+nf.format(total)+'</text><text x="70" y="86" text-anchor="middle" class="donut-l">atividades</text></svg>'
      +'<ul class="legend">'+items.map(function(it,i){ var a=o.active===it.key; return '<li><button type="button" class="leg'+(a?' is-active':'')+'" data-key="'+esc(it.key)+'" aria-pressed="'+a+'"><i style="background:'+P[i%P.length]+'"></i><span>'+esc(it.label)+'</span><b>'+nf.format(it.count)+'</b><small>'+pct(it.count,total)+'</small></button></li>'; }).join('')+'</ul></div>';
    el.querySelectorAll('[data-key]').forEach(function(b){ b.addEventListener('click', function(){ o.onPick(b.getAttribute('data-key')); }); });
    if(!RM) requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.querySelectorAll('.seg-c').forEach(function(c){ c.setAttribute('stroke-dasharray', c.getAttribute('data-to')); }); }); });
  }
  function columns(el, items, o){
    if(!items.length){ el.innerHTML='<p class="empty">Nenhum registro na seleção atual.</p>'; return; }
    var max = Math.max.apply(null, items.map(function(x){ return x.count; }).concat([1]));
    el.innerHTML = '<div class="cols-scroll"><div class="cols" style="--n:'+items.length+'" role="group" aria-label="'+esc(o.aria)+'">'+items.map(function(it){
      var a=o.active===it.key;
      return '<button type="button" class="col'+(a?' is-active':'')+'" data-key="'+it.key+'" aria-pressed="'+a+'" aria-label="'+esc(it.full)+': '+plural(it.count,'atividade','atividades')+'"><span class="col-v">'+(it.count?nf.format(it.count):'')+'</span><span class="col-bar"><span class="col-fill" data-to="'+(it.count/max*100).toFixed(2)+'%"></span></span><span class="col-l">'+esc(it.label)+'</span></button>';
    }).join('')+'</div></div>';
    el.querySelectorAll('.col').forEach(function(b){ b.addEventListener('click', function(){ o.onPick(b.dataset.key); }); });
    grow(el, '.col-fill', 'height');
    var sc = el.querySelector('.cols-scroll'); if(sc) sc.scrollLeft = sc.scrollWidth;
  }
  function stats(el, arr){
    el.innerHTML = arr.map(function(s,i){ return '<div class="stat '+(s.tone||'')+'"><div class="s-l">'+esc(s.l)+'</div><div class="s-v"><span data-n="'+i+'">—</span>'+(s.u?'<small>'+esc(s.u)+'</small>':'')+'</div></div>'; }).join('');
    arr.forEach(function(s,i){ var n=el.querySelector('[data-n="'+i+'"]'); if(s.text!=null) n.textContent=s.text; else setNum(n, s.v, s.fmt); });
  }
  function counts(arr, fn){
    var m = new Map();
    arr.forEach(function(r){ var k=fn(r); if(k==null) return; (Array.isArray(k)?k:[k]).forEach(function(x){ m.set(x,(m.get(x)||0)+1); }); });
    return Array.from(m, function(e){ return {key:e[0], label:e[0], count:e[1]}; }).sort(function(a,b){ return b.count-a.count || String(a.label).localeCompare(String(b.label),'pt-BR'); });
  }
  function sitBadge(r){
    var k=situacao(r), s=SITMAP[k], d=r.ag==null?null:r.ag-S.base, t;
    if(k==='vencida') t='Vencida há '+plural(-d,'dia','dias'); else if(k==='hoje') t='Hoje'; else if(k==='semdata') t='Sem data'; else t='Em '+plural(d,'dia','dias');
    return '<span class="badge '+s.badge+'">'+ic(s.icon,'sm')+esc(t)+'</span>';
  }
  function prioBadge(r){ var cls={'Alta':'b-red','Média':'b-amber','Baixa':'b-green'}[r.prio]||'b-slate'; return '<span class="badge '+cls+'">'+esc(r.prio)+'</span>'; }
  function tagsHtml(r,max){
    if(!r.tags.length) return '<span class="muted">—</span>';
    max=max||3; var h=r.tags.slice(0,max).map(function(t){ return '<span class="tagl">'+esc(t)+'</span>'; }).join('');
    if(r.tags.length>max) h+='<span class="tagl" title="'+esc(r.tags.slice(max).join(', '))+'">+'+(r.tags.length-max)+'</span>';
    return h;
  }

  /* -------- tabela com ordenação e paginação -------- */
  function Table(el, cols, o){ this.el=el; this.cols=cols; this.o=o||{}; this.rows=[]; this.page=0; this.size=this.o.size||25; this.sort=this.o.sort||null; }
  Table.prototype.setRows=function(rows, keepPage){ this.rows=rows; if(!keepPage) this.page=0; this.draw(); };
  Table.prototype.sorted=function(){
    var rows=this.rows.slice(), s=this.sort; if(!s) return rows;
    var c=this.cols.filter(function(x){ return x.key===s.key; })[0]; if(!c||!c.sv) return rows;
    rows.sort(function(a,b){ var x=c.sv(a), y=c.sv(b);
      if(x==null&&y==null) return 0; if(x==null) return 1; if(y==null) return -1;
      var r = typeof x==='string' ? x.localeCompare(y,'pt-BR') : (x<y?-1:x>y?1:0);
      return r*s.dir || ((a.i||0)-(b.i||0)); });
    return rows;
  };
  Table.prototype.draw=function(){
    var self=this, o=this.o, rows=this.sorted(), n=rows.length;
    this.view = rows;
    if(!n){ this.el.innerHTML='<p class="empty">'+(o.empty||'Nenhum registro na seleção atual.')+'</p>'; return; }
    var paged = o.paginate!==false, pages=Math.max(1,Math.ceil(n/this.size));
    if(this.page>=pages) this.page=pages-1;
    var start = paged ? this.page*this.size : 0;
    var slice = paged ? rows.slice(start, start+this.size) : rows.slice(0, o.limit||n);
    var h = '<div class="table-scroll"><table><caption class="sr">'+esc(o.caption||'Tabela')+'</caption><thead><tr>';
    this.cols.forEach(function(c){
      var srt = self.sort && self.sort.key===c.key ? (self.sort.dir>0?'ascending':'descending') : null;
      h += '<th scope="col"'+(c.num?' class="num"':'')+(srt?' aria-sort="'+srt+'"':'')+'>'
        + (c.sv && o.sortable!==false ? '<button type="button" class="th-b" data-k="'+c.key+'">'+esc(c.label)+ic(srt==='ascending'?'up':srt==='descending'?'down':'sort','sm')+'</button>' : '<span class="th-s">'+esc(c.label)+'</span>')
        + '</th>';
    });
    h += '</tr></thead><tbody>';
    slice.forEach(function(r,ix){
      h += '<tr'+(o.onRow?' class="clickable" tabindex="0" data-ix="'+(start+ix)+'"':'')+(o.rowLabel?' aria-label="'+esc(o.rowLabel(r))+'"':'')+'>';
      self.cols.forEach(function(c){ h += '<td'+(c.num?' class="num"':'')+'>'+c.html(r)+'</td>'; });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    var sizes = o.sizes||[10,25,50,100];
    if(paged && n>Math.min.apply(null,sizes)){
      h += '<div class="pager"><span>'+nf.format(start+1)+'–'+nf.format(Math.min(n,start+this.size))+' de '+nf.format(n)+'</span><div class="pg">'
        + '<label class="sr" for="'+this.el.id+'-sz">Linhas por página</label><select id="'+this.el.id+'-sz">'+sizes.map(function(z){ return '<option'+(z===self.size?' selected':'')+'>'+z+'</option>'; }).join('')+'</select>'
        + '<button type="button" class="btn icon-btn" data-pg="-1" aria-label="Página anterior"'+(this.page===0?' disabled':'')+'>'+ic('chevl')+'</button>'
        + '<span>Página '+(this.page+1)+' de '+pages+'</span>'
        + '<button type="button" class="btn icon-btn" data-pg="1" aria-label="Próxima página"'+(this.page>=pages-1?' disabled':'')+'>'+ic('chevr')+'</button></div></div>';
    }
    this.el.innerHTML = h;
    this.el.querySelectorAll('.th-b').forEach(function(b){ b.addEventListener('click', function(){
      var k=b.dataset.k; var c=self.cols.filter(function(x){return x.key===k;})[0];
      self.sort = self.sort && self.sort.key===k ? {key:k, dir:-self.sort.dir} : {key:k, dir:c.dir0||1};
      self.page=0; self.draw(); var nb=self.el.querySelector('.th-b[data-k="'+k+'"]'); if(nb) nb.focus(); }); });
    this.el.querySelectorAll('[data-pg]').forEach(function(b){ b.addEventListener('click', function(){ self.page+=+b.dataset.pg; self.draw(); var t=self.el.querySelector('[data-pg="'+b.dataset.pg+'"]:not([disabled])')||self.el.querySelector('.th-b'); if(t) t.focus(); }); });
    var sz=this.el.querySelector('.pager select'); if(sz) sz.addEventListener('change', function(){ self.size=+sz.value; self.page=0; self.draw(); });
    if(o.onRow){
      this.el.querySelectorAll('tr.clickable').forEach(function(tr){
        var go=function(){ o.onRow(self.view[+tr.dataset.ix], self.view, +tr.dataset.ix); };
        tr.addEventListener('click', go);
        tr.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
      });
    }
  };

  var C = {
    ag:{key:'ag', label:'Agenda', sv:function(r){return r.ag;}, html:function(r){ return '<div class="stack nowrap"><span>'+dayToBR(r.ag)+'</span>'+(r.hora?'<small>'+esc(r.hora)+'</small>':'')+'</div>'; }},
    sit:{key:'sit', label:'Situação', sv:function(r){return r.ag;}, html:sitBadge},
    titulo:{key:'titulo', label:'Atividade', sv:function(r){return norm(r.titulo);}, html:function(r){ return '<div class="stack"><span class="clamp"><b>'+esc(r.titulo)+'</b></span>'+(r.caso&&r.caso!==r.titulo?'<small class="clamp">'+esc(r.caso)+'</small>':'')+'</div>'; }},
    resp:{key:'resp', label:'Responsável', sv:function(r){return norm(r.resp);}, html:function(r){ return esc(r.resp); }},
    tipo:{key:'tipo', label:'Tipo', sv:function(r){return norm(r.tipo);}, html:function(r){ return esc(r.tipo); }},
    prio:{key:'prio', label:'Prioridade', sv:function(r){return PRIO_ORDER[r.prio]!=null?PRIO_ORDER[r.prio]:9;}, html:prioBadge},
    tags:{key:'tags', label:'Etiquetas', sv:function(r){return norm(r.tags.join(', '));}, html:function(r){ return tagsHtml(r); }},
    idade:{key:'idade', label:'Idade (dias)', num:true, dir0:-1, sv:idade, html:function(r){ var a=idade(r); return a==null?'—':nf.format(a); }},
    status:{key:'status', label:'Status', sv:function(r){return norm(r.status);}, html:function(r){ return esc(r.status); }},
    atraso:{key:'atraso', label:'Atraso', num:true, dir0:-1, sv:function(r){ return r.ag==null?null:S.base-r.ag; }, html:function(r){ return '<b>'+plural(S.base-r.ag,'dia','dias')+'</b>'; }}
  };
  function recRowLabel(r){ return r.titulo+', '+r.resp+', agenda '+dayToBR(r.ag)+'. Abrir detalhes'; }
  function openFromTable(r, view, ix){ openModal(r, view, ix); }

  /* -------- Painel da agenda (visual inspirado no modelo de relatório) --------
     Medidores, barras e anéis usam a seleção atual. Gráfico diário, calendário e semanas
     ignoram só o intervalo de datas, para continuarem mostrando os dias ao redor. */
  var NEON_ESCURO = {cyan:'#22d3ee', teal:'#2dd4bf', pink:'#ec4899', coral:'#fb7185', orange:'#fb923c', gold:'#facc15', violet:'#8b5cf6', blue:'#3b82f6', green:'#4ade80'};
  var NEON_CLARO = {cyan:'#0891b2', teal:'#0d9488', pink:'#db2777', coral:'#e11d48', orange:'#ea580c', gold:'#b7791f', violet:'#7c3aed', blue:'#2563eb', green:'#16a34a'};
  var NEON = NEON_ESCURO;
  function atualizarNeon(){ NEON = document.documentElement.getAttribute('data-theme')==='light' ? NEON_CLARO : NEON_ESCURO; }
  var SEL_NP = [];
  function hex2rgb(h){ h=h.replace('#',''); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
  function mixCor(a,b,t){ var x=hex2rgb(a), y=hex2rgb(b); return 'rgb('+x.map(function(v,i){ return Math.round(v+(y[i]-v)*t); }).join(',')+')'; }
  function corNaEscala(stops,t){ if(stops.length===1) return stops[0]; var seg=(stops.length-1)*Math.max(0,Math.min(1,t)), i=Math.min(Math.floor(seg),stops.length-2); return mixCor(stops[i],stops[i+1],seg-i); }
  function dm(d){ var x=new Date(d*DAY); return String(x.getUTCDate()).padStart(2,'0')+'/'+String(x.getUTCMonth()+1).padStart(2,'0'); }
  function filtrarPeriodo(ini, fim){
    var ativo = S.dateField==='ag' && S.from===ini && S.to===fim;
    if(ativo){ S.from=null; S.to=null; } else { S.dateField='ag'; S.from=ini; S.to=fim; }
    syncControls(); render();
  }
  function periodoAtivo(ini, fim){ return S.dateField==='ag' && S.from===ini && S.to===fim; }

  function gaugeSvg(frac, stops, aria){
    var n=36, on=Math.round(Math.max(0,Math.min(1,frac||0))*n), s='';
    for(var i=0;i<n;i++){
      var a=(-90+i*(360/n))*Math.PI/180, r1=41, r2=55;
      var cor = i<on ? 'stroke="'+corNaEscala(stops, n>1?i/(n-1):0)+'"' : 'style="stroke:var(--a-track)"';
      s+='<line x1="'+(60+r1*Math.cos(a)).toFixed(1)+'" y1="'+(60+r1*Math.sin(a)).toFixed(1)+'" x2="'+(60+r2*Math.cos(a)).toFixed(1)+'" y2="'+(60+r2*Math.sin(a)).toFixed(1)+'" '+cor+' stroke-width="5.5"'+(i<on&&!RM?' class="pz-seg" style="animation-delay:'+(i*16)+'ms"':'')+'/>';
    }
    return '<svg viewBox="0 0 120 120" class="pz-gauge" role="img" aria-label="'+esc(aria)+'">'+s+'</svg>';
  }
  function gaugeCard(el, o){
    var tag=o.onClick?'button':'div';
    el.innerHTML='<'+tag+(o.onClick?' type="button" aria-pressed="'+!!o.ativo+'"':'')+' class="pz-gauge-inner'+(o.ativo?' is-active':'')+'">'
      +'<div class="pz-gauge-wrap">'+gaugeSvg(o.frac,o.stops,o.titulo+': '+nf.format(o.valor))+'<span class="pz-gauge-n" data-n>—</span></div>'
      +'<div class="pz-t" style="color:'+o.stops[0]+'">'+esc(o.titulo)+'</div><p class="pz-desc">'+o.desc+'</p></'+tag+'>';
    var n=el.querySelector('[data-n]'); if(el._v!=null) n.dataset.v=el._v; setNum(n,o.valor); el._v=o.valor;
    if(o.onClick) el.querySelector('button').addEventListener('click',o.onClick);
  }
  function suavizar(pts, yMin, yMax){
    if(pts.length<2) return '';
    var d='M'+pts[0][0].toFixed(1)+','+pts[0][1].toFixed(1), lim=function(v){ return Math.max(yMin,Math.min(yMax,v)); };
    for(var i=0;i<pts.length-1;i++){
      var p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
      d+=' C'+(p1[0]+(p2[0]-p0[0])/6).toFixed(1)+','+lim(p1[1]+(p2[1]-p0[1])/6).toFixed(1)+' '+(p2[0]-(p3[0]-p1[0])/6).toFixed(1)+','+lim(p2[1]-(p3[1]-p1[1])/6).toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
    }
    return d;
  }

  function renderPainel(){
    atualizarNeon();
    var n=SEL.length, venc=0, prox7=0, hoje=0, fatalVenc=0;
    SEL.forEach(function(r){ var s=situacao(r); if(s==='vencida'){ venc++; if(r.fatal) fatalVenc++; } if(s==='prox7') prox7++; if(s==='hoje') hoje++; });

    gaugeCard($('pz-g0'), {titulo:'Em aberto', valor:n, frac:RECS.length?n/RECS.length:0, stops:[NEON.teal,NEON.blue,NEON.violet],
      desc:'atividades na seleção, de '+nf.format(RECS.length)+' na última importação.'});
    gaugeCard($('pz-g1'), {titulo:'Vencidas', valor:venc, frac:n?venc/n:0, stops:[NEON.coral,NEON.pink,NEON.violet], ativo:S.chips.situacao==='vencida',
      desc:pct(venc,n)+' da seleção com data da agenda anterior a '+esc(dayToBR(S.base))+'.', onClick:function(){ toggleChip('situacao','vencida'); }});
    gaugeCard($('pz-g2'), {titulo:'Próximos 7 dias', valor:prox7, frac:n?prox7/n:0, stops:[NEON.gold,NEON.green,NEON.cyan], ativo:S.chips.situacao==='prox7',
      desc:'de '+esc(dm(S.base+1))+' a '+esc(dm(S.base+7))+'; mais '+plural(hoje,'para hoje','para hoje')+'.', onClick:function(){ toggleChip('situacao','prox7'); }});

    var emDia = n ? (n-venc)/n*100 : 0;
    $('pz-big').innerHTML='<div class="pz-t" style="color:'+NEON.gold+'">Agenda em dia</div><div class="pz-sub">data da agenda igual ou posterior à data-base</div>'
      +'<div class="pz-pct" data-n style="background-image:linear-gradient(90deg,'+NEON.cyan+','+NEON.teal+' 60%,'+NEON.gold+')">—</div>'
      +'<p class="pz-desc">'+nf.format(n-venc)+' de '+nf.format(n)+' atividades da seleção não estão vencidas.</p>'
      +'<p class="pz-desc">'+(fatalVenc?'<b class="pz-alerta">Atenção:</b> '+plural(fatalVenc,'prazo fatal (etiqueta) com agenda vencida','prazos fatais (etiqueta) com agenda vencida')+'.':'Nenhum prazo fatal (etiqueta) com agenda vencida.')+'</p>';
    var big=$('pz-big').querySelector('[data-n]'); if($('pz-big')._v!=null) big.dataset.v=$('pz-big')._v;
    setNum(big, emDia, function(x){ return pf.format(Math.round(x))+'%'; }); $('pz-big')._v=emDia;

    var topResp = counts(SEL,function(r){ return r.resp; }).slice(0,4), maxR = topResp.length?topResp[0].count:1;
    $('pz-bars').innerHTML='<div class="pz-t" style="color:'+NEON.coral+'">Responsáveis</div><div class="pz-sub">quem concentra mais atividades na seleção</div>'
      +(topResp.length?topResp.map(function(x){ var a=S.resp===x.key;
        return '<button type="button" class="pz-gbar'+(a?' is-active':'')+'" data-key="'+esc(x.key)+'" aria-pressed="'+a+'"><span class="pz-gbar-l"><span>'+esc(x.label)+'</span><b>'+nf.format(x.count)+'</b></span>'
          +'<span class="pz-gbar-t"><span class="pz-gbar-f" data-to="'+(x.count/maxR*100).toFixed(1)+'%"></span></span></button>'; }).join(''):'<p class="pz-desc">Nenhuma atividade na seleção.</p>');
    $('pz-bars').querySelectorAll('.pz-gbar').forEach(function(b){ b.addEventListener('click',function(){ toggle('resp',b.dataset.key); }); });
    grow($('pz-bars'),'.pz-gbar-f','width');

    renderPainelGrafico(); renderPainelLed(); renderPainelAtividades(); renderPainelCalendario(); renderPainelSemanas();
  }

  function renderPainelGrafico(){
    var el=$('pz-chart'), nDias=29, ini=S.base-14, cont=[], i;
    for(i=0;i<nDias;i++) cont.push(0);
    SEL_NP.forEach(function(r){ if(r.ag!=null && r.ag>=ini && r.ag<ini+nDias) cont[r.ag-ini]++; });
    var W=640,H=250,pl=36,pr=14,pt=34,pb=28, max=Math.max.apply(null,cont.concat([1])), passo=Math.max(1,Math.ceil(max/4)), topo=passo*4;
    var x=function(i){ return pl+i*(W-pl-pr)/(nDias-1); }, y=function(v){ return pt+(1-v/topo)*(H-pt-pb); }, y0=y(0);
    var pts=cont.map(function(v,i){ return [x(i),y(v)]; }), linha=suavizar(pts,pt,y0);
    var s='<defs><linearGradient id="pz-lg" x1="0" x2="1"><stop offset="0" stop-color="'+NEON.orange+'"/><stop offset=".5" stop-color="'+NEON.pink+'"/><stop offset="1" stop-color="'+NEON.violet+'"/></linearGradient>'
      +'<linearGradient id="pz-ag" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="'+NEON.pink+'" stop-opacity=".35"/><stop offset="1" stop-color="'+NEON.violet+'" stop-opacity="0"/></linearGradient></defs>';
    for(i=0;i<=4;i++){ var v=passo*i, yy=y(v); s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'" class="pz-grid-l"/><text x="'+(pl-8)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end" class="pz-ax">'+nf.format(v)+'</text>'; }
    s+='<path d="'+linha+' L'+x(nDias-1).toFixed(1)+','+y0.toFixed(1)+' L'+x(0).toFixed(1)+','+y0.toFixed(1)+' Z" fill="url(#pz-ag)"/>';
    s+='<path d="'+linha+'" fill="none" stroke="url(#pz-lg)" stroke-width="3" stroke-linecap="round" pathLength="1" class="pz-linha"/>';
    var xb=x(14); s+='<line x1="'+xb.toFixed(1)+'" x2="'+xb.toFixed(1)+'" y1="'+pt+'" y2="'+y0.toFixed(1)+'" class="pz-hoje"/><text x="'+(xb+5).toFixed(1)+'" y="'+(y0-6).toFixed(1)+'" text-anchor="start" class="pz-ax pz-ax-hoje">data-base</text>';
    var ordem=cont.map(function(v,i){ return {v:v,i:i}; }).filter(function(o){ return o.v>0; }).sort(function(a,b){ return b.v-a.v; }), picos=[];
    ordem.forEach(function(o){ if(picos.length<3 && picos.every(function(p){ return Math.abs(p.i-o.i)>=3; })) picos.push(o); });
    picos.forEach(function(p){ var px=x(p.i), py=y(p.v);
      s+='<line x1="'+px.toFixed(1)+'" x2="'+px.toFixed(1)+'" y1="'+py.toFixed(1)+'" y2="'+y0.toFixed(1)+'" class="pz-pico-l"/><circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="4.5" class="pz-pico"/>'
        +'<text x="'+px.toFixed(1)+'" y="'+(py-11).toFixed(1)+'" text-anchor="middle" class="pz-pico-t">'+dm(ini+p.i)+' · '+nf.format(p.v)+'</text>'; });
    [0,7,14,21,28].forEach(function(i){ s+='<text x="'+x(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" class="pz-ax">'+dm(ini+i)+'</text>'; });
    var larg=(W-pl-pr)/(nDias-1);
    cont.forEach(function(v,i){ var d=ini+i, a=periodoAtivo(d,d);
      s+='<rect x="'+(x(i)-larg/2).toFixed(1)+'" y="'+pt+'" width="'+larg.toFixed(1)+'" height="'+(y0-pt).toFixed(1)+'" class="pz-hit'+(a?' is-active':'')+'" data-d="'+d+'"><title>'+dayToBR(d)+': '+plural(v,'atividade','atividades')+' (clique para filtrar o dia)</title></rect>'; });
    el.innerHTML='<div class="pz-t" style="color:'+NEON.pink+'">Atividades por dia</div><div class="pz-sub">data da agenda, 14 dias antes e depois da data-base · destaques: os 3 dias mais cheios</div>'
      +'<div class="pz-chart-wrap"><svg viewBox="0 0 '+W+' '+H+'" class="pz-svg" role="img" aria-label="Atividades por dia da agenda entre '+dayToBR(ini)+' e '+dayToBR(ini+nDias-1)+'">'+s+'</svg></div>';
    el.querySelectorAll('.pz-hit').forEach(function(r){ r.addEventListener('click',function(){ var d=+r.getAttribute('data-d'); filtrarPeriodo(d,d); }); });
  }

  function renderPainelLed(){
    var el=$('pz-led'), tipos=counts(SEL,function(r){ return r.tipo; }).slice(0,5), tot=SEL.length||1, celulas=28;
    var pal=[[NEON.violet,NEON.pink,NEON.orange],[NEON.teal,NEON.green,NEON.gold],[NEON.blue,NEON.cyan,NEON.teal],[NEON.violet,NEON.pink,NEON.coral],[NEON.gold,NEON.orange,NEON.coral]];
    var linhas=tipos.map(function(t,k){ var cheias=Math.max(t.count?1:0,Math.round(t.count/tot*celulas)), a=S.tipo===t.key, c='';
      for(var i=0;i<celulas;i++) c+='<i style="background:'+(i<cheias?corNaEscala(pal[k%pal.length],cheias>1?i/(cheias-1):0):'var(--a-track)')+(i<cheias&&!RM?';animation-delay:'+(i*14)+'ms':'')+'"'+(i<cheias&&!RM?' class="pz-led-on"':'')+'></i>';
      return '<button type="button" class="pz-led-row'+(a?' is-active':'')+'" data-key="'+esc(t.key)+'" aria-pressed="'+a+'" aria-label="'+esc(t.label)+': '+nf.format(t.count)+' ('+pct(t.count,tot)+')">'+c+'</button>'; }).join('');
    var leg=tipos.map(function(t,k){ return '<li><i style="background:'+pal[k%pal.length][1]+'"></i><span>'+esc(t.label)+'</span><b>'+nf.format(t.count)+'</b><small>'+pct(t.count,tot)+'</small></li>'; }).join('');
    el.innerHTML='<div class="pz-led-bars">'+(linhas||'<p class="pz-desc">Nenhuma atividade na seleção.</p>')+'</div>'
      +'<div class="pz-led-txt"><div class="pz-t" style="color:'+NEON.cyan+'">Tipos de atividade</div><p class="pz-desc">Cada barra mostra a fatia da seleção em cada tipo. Clique para filtrar.</p><ul class="pz-leg">'+leg+'</ul></div>';
    el.querySelectorAll('.pz-led-row').forEach(function(b){ b.addEventListener('click',function(){ toggle('tipo',b.dataset.key); }); });
  }

  /* Próximos compromissos, pelas etiquetas do Astrea (a partir da data-base):
     - Prazos fatais: etiqueta PRAZO FATAL sem PRAZO INTERNO
     - Prazos D-1: PRAZO FATAL e PRAZO INTERNO juntas
     - Prazos internos: PRAZO INTERNO sem PRAZO FATAL
     - Prazos condominiais: CONDOMÍNIO - GERAL ou CONDOMÍNIO - OCORRÊNCIAS
     - Todos: as categorias acima e as atividades sem nenhuma etiqueta
     O selo mostra a principal: D-1 > fatal > interno > condominial > sem etiqueta. */
  var CATS_COMP = [
    {id:'fatal', nome:'Prazos fatais', selo:'Prazo fatal', cls:'b-red'},
    {id:'d1', nome:'Prazos D-1', selo:'Prazo D-1', cls:'b-amber'},
    {id:'interno', nome:'Prazos internos', selo:'Prazo interno', cls:'b-green'},
    {id:'condominial', nome:'Prazos condominiais', selo:'Condominial', cls:'b-petrol'},
    {id:'todos', nome:'Todos'}
  ];
  var CAT_SEM_ETIQUETA = {id:'semEtiqueta', selo:'Sem etiqueta', cls:'b-slate'};
  function catsDoCompromisso(r){
    var c = {}, tn = r.tags.map(norm);
    var fatal = tn.indexOf('prazo fatal') !== -1, interno = tn.indexOf('prazo interno') !== -1;
    if (fatal && interno) c.d1 = true;
    else if (fatal) c.fatal = true;
    else if (interno) c.interno = true;
    if (tn.indexOf('condominio - geral') !== -1 || tn.indexOf('condominio - ocorrencias') !== -1) c.condominial = true;
    if (!r.tags.length) c.semEtiqueta = true;
    return c;
  }
  function catPrincipal(c){
    var ordem = ['d1','fatal','interno','condominial','semEtiqueta'];
    for (var i = 0; i < ordem.length; i++) if (c[ordem[i]]) return ordem[i];
    return null;
  }
  function renderPainelAtividades(){
    var el=$('pz-act'), cat=S.pzCat||'todos';
    if (!CATS_COMP.some(function(c){ return c.id===cat; })) cat='todos';
    var base=SEL.filter(function(r){ return r.ag!=null && r.ag>=S.base; }).map(function(r){ return {r:r, c:catsDoCompromisso(r)}; })
      .filter(function(x){ return catPrincipal(x.c); })
      .sort(function(a,b){ return a.r.ag-b.r.ag || a.r.i-b.r.i; });
    var cont={todos:base.length};
    base.forEach(function(x){ Object.keys(x.c).forEach(function(k){ cont[k]=(cont[k]||0)+1; }); });
    var lista=base.filter(function(x){ return cat==='todos' || x.c[cat]; });
    var limite=S.pzTodos?lista.length:8, vis=lista.slice(0,limite), regs=vis.map(function(x){ return x.r; });
    var catMap={semEtiqueta:CAT_SEM_ETIQUETA}; CATS_COMP.forEach(function(c){ catMap[c.id]=c; });
    el.innerHTML='<div class="pz-t" style="color:'+NEON.teal+'">Próximos compromissos</div><div class="pz-sub">pelas etiquetas do Astrea, a partir de '+esc(dayToBR(S.base))+' · em "Todos" entram também as atividades sem etiqueta</div>'
      +'<div class="pz-cats" role="group" aria-label="Categoria">'+CATS_COMP.filter(function(c){ return c.id==='todos' || cont[c.id] || cat===c.id; }).map(function(c){
        var a=cat===c.id; return '<button type="button" class="pz-cat'+(a?' is-active':'')+'" data-c="'+c.id+'" aria-pressed="'+a+'">'+c.nome+'<span>'+nf.format(cont[c.id]||0)+'</span></button>'; }).join('')+'</div>'
      +(vis.length?'<ul class="pz-act-list'+(S.pzTodos?' todos':'')+'">'+vis.map(function(x,i){ var r=x.r, d=r.ag-S.base, cp=catMap[catPrincipal(x.c)];
        return '<li><button type="button" data-i="'+i+'"><span class="pz-act-d'+(d===0?' hoje':'')+'">'+(d===0?'Hoje':d===1?'Amanhã':dayToBR(r.ag))+(r.hora?' · '+esc(r.hora):'')+'<span class="badge '+cp.cls+'">'+cp.selo+'</span></span>'
          +'<span class="pz-act-t">'+esc(r.titulo)+'</span><span class="pz-act-r">'+esc(r.resp)+(r.caso&&r.caso!==r.titulo?' · '+esc(r.caso):'')+'</span></button></li>'; }).join('')+'</ul>'
        :'<p class="pz-desc">Nada nesta categoria a partir de '+esc(dayToBR(S.base))+' na seleção.</p>')
      +(lista.length>8?'<button type="button" class="pz-mais">'+(S.pzTodos?'Mostrar menos':'Mostrar todos ('+nf.format(lista.length)+')')+'</button>':'');
    el.querySelectorAll('.pz-cat').forEach(function(b){ b.addEventListener('click',function(){ S.pzCat=b.dataset.c; S.pzTodos=false; renderPainelAtividades(); }); });
    var mais=el.querySelector('.pz-mais'); if(mais) mais.addEventListener('click',function(){ S.pzTodos=!S.pzTodos; renderPainelAtividades(); });
    el.querySelectorAll('button[data-i]').forEach(function(b){ b.addEventListener('click',function(){ var i=+b.dataset.i; openModal(regs[i],regs,i); }); });
  }

  function renderPainelCalendario(){
    var el=$('pz-cal'), mk=S.calMes||monthKey(S.base), y=+mk.slice(0,4), m=+mk.slice(5,7);
    var primeiro=Math.floor(Date.UTC(y,m-1,1)/DAY), nDias=new Date(Date.UTC(y,m,0)).getUTCDate(), wd=new Date(primeiro*DAY).getUTCDay();
    var cont={}, fat={}, max=1;
    SEL_NP.forEach(function(r){ if(r.ag!=null && r.ag>=primeiro && r.ag<primeiro+nDias){ cont[r.ag]=(cont[r.ag]||0)+1; if(r.fatal) fat[r.ag]=true; } });
    Object.keys(cont).forEach(function(k){ if(cont[k]>max) max=cont[k]; });
    var h='<div class="pz-cal-head"><button type="button" class="pz-cal-nav" data-m="-1" aria-label="Mês anterior">◀</button><span>'+MESF[m-1].charAt(0).toUpperCase()+MESF[m-1].slice(1)+' '+y+'</span><button type="button" class="pz-cal-nav" data-m="1" aria-label="Próximo mês">▶</button></div>';
    h+='<div class="pz-cal-grid">'+['D','S','T','Q','Q','S','S'].map(function(d,i){ return '<span class="pz-cal-wd'+(i===0?' dom':'')+'">'+d+'</span>'; }).join('');
    for(var i=0;i<wd;i++) h+='<span></span>';
    for(var d=0;d<nDias;d++){
      var dia=primeiro+d, c=cont[dia]||0, a=periodoAtivo(dia,dia), dom=(wd+d)%7===0;
      var bg=c?'background:rgba(236,72,153,'+(0.14+0.56*c/max).toFixed(2)+')':'';
      h+='<button type="button" class="pz-cal-d'+(dom?' dom':'')+(dia===S.base?' base':'')+(a?' is-active':'')+(c?' tem':'')+'" style="'+bg+'" data-d="'+dia+'" aria-pressed="'+a+'" aria-label="'+dayToBR(dia)+': '+plural(c,'atividade','atividades')+(fat[dia]?', com prazo fatal':'')+'">'
        +'<span>'+(d+1)+'</span>'+(c?'<small>'+c+'</small>':'')+(fat[dia]?'<i class="pz-cal-fatal" aria-hidden="true"></i>':'')+'</button>';
    }
    h+='</div><div class="pz-cal-leg"><span><i class="pz-cal-fatal"></i> prazo fatal</span><span>cor mais forte = mais atividades · clique no dia para filtrar</span></div>';
    el.innerHTML=h;
    el.querySelectorAll('.pz-cal-nav').forEach(function(b){ b.addEventListener('click',function(){ var mm=m+(+b.dataset.m), yy=y; if(mm<1){ mm=12; yy--; } if(mm>12){ mm=1; yy++; } S.calMes=yy+'-'+String(mm).padStart(2,'0'); renderPainelCalendario(); }); });
    el.querySelectorAll('.pz-cal-d').forEach(function(b){ b.addEventListener('click',function(){ var dd=+b.dataset.d; filtrarPeriodo(dd,dd); }); });
  }

  function renderPainelSemanas(){
    var el=$('pz-rings'), sem=[], tot=0, i;
    for(i=0;i<5;i++){ var a=S.base+i*7, b=a+6, c=SEL_NP.filter(function(r){ return r.ag!=null && r.ag>=a && r.ag<=b; }).length; sem.push({a:a,b:b,c:c}); tot+=c; }
    var cores=[[NEON.orange,NEON.pink],[NEON.gold,NEON.cyan],[NEON.cyan,NEON.blue],[NEON.pink,NEON.violet],[NEON.violet,NEON.blue]], R=34, CIRC=2*Math.PI*R;
    var aneis=sem.map(function(s,k){ var p=tot?Math.round(s.c/tot*100):0, at=periodoAtivo(s.a,s.b);
      return '<button type="button" class="pz-ring'+(at?' is-active':'')+'" data-k="'+k+'" aria-pressed="'+at+'" aria-label="'+dm(s.a)+' a '+dm(s.b)+': '+plural(s.c,'atividade','atividades')+', '+p+'% das próximas 5 semanas">'
        +'<svg viewBox="0 0 84 84"><defs><linearGradient id="pz-rg'+k+'" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="'+cores[k][0]+'"/><stop offset="1" stop-color="'+cores[k][1]+'"/></linearGradient></defs>'
        +'<circle cx="42" cy="42" r="'+R+'" fill="none" style="stroke:var(--a-track)" stroke-width="7"/>'
        +'<circle cx="42" cy="42" r="'+R+'" fill="none" stroke="url(#pz-rg'+k+')" stroke-width="7" stroke-linecap="round" transform="rotate(-90 42 42)" stroke-dasharray="'+(RM?(p/100*CIRC):0).toFixed(1)+' '+CIRC.toFixed(1)+'" data-to="'+(p/100*CIRC).toFixed(1)+' '+CIRC.toFixed(1)+'" class="pz-ring-arc"/>'
        +'<text x="42" y="47" text-anchor="middle" class="pz-ring-n">'+p+'%</text></svg>'
        +'<span class="pz-ring-tick"></span><span class="pz-ring-dot"></span><span class="pz-ring-l">'+dm(s.a)+' a '+dm(s.b)+'<b>'+plural(s.c,'atividade','atividades')+'</b></span></button>'; }).join('');
    el.innerHTML='<div class="pz-t" style="color:'+NEON.violet+'">Carga das próximas 5 semanas</div><div class="pz-sub">parte de cada semana no total de '+plural(tot,'atividade','atividades')+' das próximas 5 semanas · clique para filtrar</div>'
      +'<div class="pz-rings-row"><span class="pz-rings-line" aria-hidden="true"></span>'+aneis+'</div>';
    el.querySelectorAll('.pz-ring').forEach(function(b){ b.addEventListener('click',function(){ var s=sem[+b.dataset.k]; filtrarPeriodo(s.a,s.b); }); });
    if(!RM) requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.querySelectorAll('.pz-ring-arc').forEach(function(c){ c.setAttribute('stroke-dasharray', c.getAttribute('data-to')); }); }); });
  }

  /* -------- renderização -------- */
  var SEL = [];
  var T = {};
  function render(){
    SEL = RECS.filter(pass);
    var f0=S.from, t0=S.to; S.from=null; S.to=null; SEL_NP = RECS.filter(pass); S.from=f0; S.to=t0;
    renderPainel();
    renderSelBar(); renderKPIs(); renderAgenda(); renderFatal(); renderRevisao(); renderResp(); renderCriador();
    renderClass(); renderIdade(); renderMov(); renderMensal(); renderConc(); renderQual();
    T.main.setRows(SEL);
  }
  function toggle(field, key){ S[field] = S[field]===key ? '' : key; syncControls(); render(); }
  function toggleChip(field, key){ S.chips[field] = S.chips[field]===key ? null : key; render(); }

  function renderSelBar(){
    setNum($('selN'), SEL.length);
    $('selT').textContent = nf.format(RECS.length);
    var chips = [];
    if(S.q) chips.push(['q','Busca: "'+S.q+'"']);
    if(S.resp) chips.push(['resp','Responsável: '+S.resp]);
    if(S.criador) chips.push(['criador','Criado por: '+(S.criador==='__none'?'não informado':S.criador)]);
    if(S.tipo) chips.push(['tipo','Tipo: '+S.tipo]);
    if(S.prio) chips.push(['prio','Prioridade: '+S.prio]);
    if(S.tag) chips.push(['tag','Etiqueta: '+(S.tag==='__none'?'sem etiqueta':S.tag)]);
    if(S.from!=null||S.to!=null) chips.push(['periodo',(S.dateField==='ag'?'Agenda':'Criação')+': '+(S.from!=null?dayToBR(S.from):'início')+' a '+(S.to!=null?dayToBR(S.to):'fim')]);
    var c=S.chips;
    if(c.situacao) chips.push(['c:situacao','Situação: '+SITMAP[c.situacao].label]);
    if(c.idade) chips.push(['c:idade','Idade: '+IDMAP[c.idade].label]);
    if(c.mes) chips.push(['c:mes','Criadas em '+monthFull(c.mes)]);
    if(c.caso) chips.push(['c:caso','Caso: '+c.caso]);
    if(c.proc) chips.push(['c:proc','Processo: '+c.proc]);
    if(c.juizo) chips.push(['c:juizo','Juízo: '+c.juizo]);
    if(S.base!==BASE0) chips.push(['base','Data-base: '+dayToBR(S.base)]);
    var el=$('chips');
    el.innerHTML = chips.length ? chips.map(function(ch){ return '<span class="chip"><span title="'+esc(ch[1])+'">'+esc(ch[1])+'</span><button type="button" data-rm="'+ch[0]+'" aria-label="Remover filtro '+esc(ch[1])+'">'+ic('x','sm')+'</button></span>'; }).join('') : '<span class="muted" style="font-size:12.5px">Sem filtros: todas as atividades da última importação.</span>';
    el.querySelectorAll('[data-rm]').forEach(function(b){ b.addEventListener('click', function(){
      var k=b.dataset.rm;
      if(k.indexOf('c:')===0) S.chips[k.slice(2)]=null;
      else if(k==='periodo'){ S.from=null; S.to=null; }
      else if(k==='q'){ S.q=''; S.qTerms=[]; }
      else if(k==='base'){ S.base=BASE0; S.baseManual=false; }
      else S[k]='';
      syncControls(); render();
      var first=root.querySelector('.chips [data-rm]'); (first||$('fQ')).focus();
    }); });
    root.querySelectorAll('[data-act="clear"]').forEach(function(b){ b.disabled=!chips.length; });
    root.querySelectorAll('[data-act="csv"]').forEach(function(b){ b.disabled=!SEL.length; });
  }

  function kpiCard(o){
    var tag = o.onClick ? 'button' : 'div';
    return '<'+tag+(o.onClick?' type="button" aria-pressed="'+!!o.active+'"':'')+' class="ak t-'+(o.tone||'petrol')+(o.active?' is-active':'')+(o.flag?' has-flag':'')+'" data-kpi="'+o.id+'"'+(o.onClick?' title="'+esc(o.title||'Filtrar')+'"':'')+'>'
      +(o.flag?'<span class="k-flag">'+esc(o.flag)+'</span>':'')
      +'<div class="k-top"><span class="k-ic">'+ic(o.icon)+'</span><span class="k-lbl">'+esc(o.label)+'</span></div>'
      +'<div class="k-val" data-kv>—</div><div class="k-sub">'+o.sub+'</div></'+tag+'>';
  }
  function renderKPIs(){
    var n=SEL.length, sit={}; SIT.forEach(function(s){ sit[s.k]=0; });
    var fatal=0, fatalVenc=0, rev=0, alta=0, ages=[], resp=new Set();
    SEL.forEach(function(r){ var s=situacao(r); sit[s]++; resp.add(r.resp); if(r.fatal){ fatal++; if(s==='vencida') fatalVenc++; } if(r.revisao) rev++; if(r.prio==='Alta') alta++; var a=idade(r); if(a!=null) ages.push(a); });
    var cards = [
      {id:'total', icon:'layout', label:'Atividades em aberto', v:n, sub:'de '+nf.format(RECS.length)+' na importação'},
      {id:'resp', icon:'users', label:'Responsáveis', v:resp.size, sub:'pessoas com atividades na seleção', tone:'green'},
      {id:'venc', icon:'alert', label:'Agenda vencida', v:sit.vencida, sub:pct(sit.vencida,n)+' da seleção', tone:'red', flag:sit.vencida?'Atenção':null, active:S.chips.situacao==='vencida', onClick:function(){ toggleChip('situacao','vencida'); }, title:'Filtrar atividades com agenda vencida'},
      {id:'hoje', icon:'clock', label:'Agendadas para hoje', v:sit.hoje, sub:'data-base '+dayToBR(S.base), tone:'amber', active:S.chips.situacao==='hoje', onClick:function(){ toggleChip('situacao','hoje'); }},
      {id:'p7', icon:'calendar', label:'Próximos 7 dias', v:sit.prox7, sub:'de amanhã até '+dayToBR(S.base+7), tone:'gold', active:S.chips.situacao==='prox7', onClick:function(){ toggleChip('situacao','prox7'); }},
      {id:'fatal', icon:'flag', label:'Prazo fatal (etiqueta)', v:fatal, sub:fatalVenc?plural(fatalVenc,'com agenda vencida','com agenda vencida'):'nenhum com agenda vencida', tone:fatalVenc?'red':'gold', flag:fatalVenc?'Atenção':null, active:S.tag==='PRAZO FATAL', onClick:function(){ toggle('tag','PRAZO FATAL'); }},
      {id:'rev', icon:'eye', label:'Em revisão (etiqueta)', v:rev, sub:pct(rev,n)+' da seleção', tone:'gold', active:S.tag==='REVISÃO', onClick:function(){ toggle('tag','REVISÃO'); }},
      {id:'alta', icon:'arrowup', label:'Prioridade alta', v:alta, sub:pct(alta,n)+' da seleção', tone:'red', active:S.prio==='Alta', onClick:function(){ toggle('prio','Alta'); }},
      {id:'idade', icon:'hourglass', label:'Idade mediana', v:median(ages), sub:'dias desde a criação', tone:'green'}
    ];
    var el=$('kpis');
    var prev={}; el.querySelectorAll('[data-kpi]').forEach(function(k){ prev[k.dataset.kpi]=k.querySelector('[data-kv]').dataset.v; });
    el.innerHTML = cards.map(kpiCard).join('');
    cards.forEach(function(c){ var k=el.querySelector('[data-kpi="'+c.id+'"]'); var v=k.querySelector('[data-kv]'); if(prev[c.id]!=null){ v.dataset.v=prev[c.id]; k.style.animation='none'; } setNum(v, c.v); if(c.onClick) k.addEventListener('click', c.onClick); });
  }

  function renderAgenda(){
    var cnt={}; SIT.forEach(function(s){ cnt[s.k]=0; }); SEL.forEach(function(r){ cnt[situacao(r)]++; });
    var items = SIT.filter(function(s){ return s.k!=='semdata' || cnt.semdata; }).map(function(s){
      var sub = s.k==='vencida'?'data da agenda anterior a '+dayToBR(S.base):s.k==='hoje'?dayToBR(S.base):'';
      return {key:s.k, label:s.label, count:cnt[s.k], tone:s.tone, sub:sub?esc(sub):''}; });
    barList($('agBars'), items, {active:S.chips.situacao, onPick:function(k){ toggleChip('situacao',k); }});
    T.late.setRows(SEL.filter(function(r){ return situacao(r)==='vencida'; }));
  }
  function renderFatal(){
    var m=S.fatalMode;
    root.querySelectorAll('#agr-fatalSeg button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.m===m); });
    var rows = SEL.filter(function(r){ return m==='etiqueta'?r.fatal : m==='tipo'?r.tipoPrazo : (r.fatal||r.tipoPrazo); });
    var c={vencida:0,hoje:0,prox7:0}; rows.forEach(function(r){ var s=situacao(r); if(c[s]!=null) c[s]++; });
    stats($('fatalStats'), [
      {l:'Total identificado', v:rows.length},
      {l:'Agenda vencida', v:c.vencida, tone:c.vencida?'red':''},
      {l:'Agenda para hoje', v:c.hoje, tone:c.hoje?'amber':''},
      {l:'Próximos 7 dias', v:c.prox7}
    ]);
    T.fatal.setRows(rows);
  }
  function renderRevisao(){
    var rows = SEL.filter(function(r){ return r.revisao; });
    var venc = rows.filter(function(r){ return situacao(r)==='vencida'; }).length;
    var tituloSem = SEL.filter(function(r){ return !r.revisao && /revis/.test(norm(r.titulo)); }).length;
    stats($('revStats'), [
      {l:'Com etiqueta REVISÃO', v:rows.length},
      {l:'Com agenda vencida', v:venc, tone:venc?'red':''},
      {l:'Idade mediana', v:median(rows.map(idade).filter(function(x){ return x!=null; })), u:'dias'},
      {l:'Tempo em revisão', text:'Indisponível'},
      {l:'"Revisão" só no título', v:tituloSem}
    ]);
    barList($('revResp'), counts(rows, function(r){ return r.resp; }), {total:rows.length, tone:'gold', active:S.resp||null, onPick:function(k){ toggle('resp',k); }});
    T.rev.setRows(rows);
  }
  function respAgg(){
    var m=new Map();
    SEL.forEach(function(r){
      var a=m.get(r.resp); if(!a){ a={i:m.size, nome:r.resp, n:0, venc:0, hoje:0, p7:0, fatal:0, rev:0, alta:0, ages:[]}; m.set(r.resp,a); }
      a.n++; var s=situacao(r); if(s==='vencida') a.venc++; if(s==='hoje') a.hoje++; if(s==='prox7') a.p7++;
      if(r.fatal) a.fatal++; if(r.revisao) a.rev++; if(r.prio==='Alta') a.alta++; var g=idade(r); if(g!=null) a.ages.push(g);
    });
    return Array.from(m.values()).map(function(a){ a.med=median(a.ages); return a; });
  }
  function renderResp(){
    var agg = respAgg().sort(function(a,b){ return b.n-a.n || a.nome.localeCompare(b.nome,'pt-BR'); });
    barList($('respBars'), agg.map(function(a){
      var sub=[]; if(a.venc) sub.push(plural(a.venc,'vencida','vencidas')); if(a.fatal) sub.push(plural(a.fatal,'prazo fatal','prazos fatais')); if(a.rev) sub.push(plural(a.rev,'em revisão','em revisão'));
      return {key:a.nome, label:a.nome, count:a.n, sub:esc(sub.join(' · '))}; }), {active:S.resp||null, onPick:function(k){ toggle('resp',k); }});
    T.resp.setRows(agg, true);
  }
  function renderCriador(){
    var box=$('criadorBox');
    var informed = SEL.filter(function(r){ return criadorOf(r); });
    var h = '';
    if(!TEM_CRIADOR){
      h += '<div class="unavail"><div class="u-ic">'+ic('ban')+'</div><div><h3>Métrica indisponível na exportação</h3><p>A exportação da agenda do Astrea não contém coluna de criador (as colunas existentes estão listadas em "Qualidade dos dados"). O campo "Envolvidos" não indica autoria e não foi usado como substituto.</p></div></div>';
      h += '<p class="note gold">'+ic('pencil')+'<span>É possível registrar o criador manualmente na janela de detalhes de cada atividade. Esses valores ficam identificados como <b>informação adicionada pelo usuário</b>, são salvos apenas neste navegador'+(ANOT_OK?'':' (o armazenamento local está indisponível)')+' e alimentam o filtro "Criado por". Informados na seleção: <b>'+nf.format(informed.length)+'</b> de '+nf.format(SEL.length)+'.</span></p>';
    }
    box.innerHTML = h + '<div id="agr-criadorBars" style="margin-top:'+(TEM_CRIADOR?0:14)+'px"></div>';
    if(informed.length){
      var by = counts(informed, criadorOf);
      if(!TEM_CRIADOR) by.forEach(function(x){ x.sub='informado pelo usuário'; });
      barList($('criadorBars'), by, {total:informed.length, tone:'gold', active:S.criador||null, onPick:function(k){ toggle('criador',k); }});
    } else if(TEM_CRIADOR){ $('criadorBars').innerHTML='<p class="empty">Nenhum criador preenchido na seleção.</p>'; }
  }
  function renderClass(){
    donut($('clTipo'), counts(SEL, function(r){ return r.tipo; }), {aria:'Distribuição por tipo', active:S.tipo||null, onPick:function(k){ toggle('tipo',k); }});
    var pr = counts(SEL, function(r){ return r.prio; }).sort(function(a,b){ return (PRIO_ORDER[a.key]!=null?PRIO_ORDER[a.key]:9)-(PRIO_ORDER[b.key]!=null?PRIO_ORDER[b.key]:9); });
    pr.forEach(function(p){ p.tone={'Alta':'red','Média':'amber','Baixa':'green'}[p.key]||'slate'; });
    barList($('clPrio'), pr, {active:S.prio||null, onPick:function(k){ toggle('prio',k); }});
    var st = counts(SEL, function(r){ return r.status; });
    var stEl=$('clStatus');
    barList(stEl, st, {tone:'slate'});
    var concl = K.conclusao>=0 ? SEL.filter(function(r){ return !blank(r.f[K.conclusao]); }).length : 0;
    if(st.length===1 && !concl) stEl.insertAdjacentHTML('beforeend','<p class="note">'+ic('info')+'<span>Todas as atividades da seleção têm o mesmo status ("'+esc(st[0].key)+'") e nenhuma tem data de conclusão: a exportação traz apenas itens em aberto, por isso não há análise de conclusão.</span></p>');
    var tags = counts(SEL, function(r){ return r.tags.length?r.tags:['__none']; });
    tags.forEach(function(t){ if(t.key==='__none'){ t.label='(sem etiqueta)'; t.tone='slate'; } else if(t.key==='PRAZO FATAL'){ t.tone='red'; } else if(t.key==='REVISÃO'){ t.tone='gold'; } });
    barList($('clTags'), tags, {limit:12, active:S.tag||null, onPick:function(k){ toggle('tag',k); }});
  }
  function renderIdade(){
    var ages = SEL.map(idade).filter(function(x){ return x!=null; });
    var sum = ages.reduce(function(a,b){ return a+b; },0);
    stats($('idStats'), [
      {l:'Idade mediana', v:median(ages), u:'dias'},
      {l:'Idade média', v:ages.length?sum/ages.length:null, u:'dias'},
      {l:'Mais antiga', v:ages.length?Math.max.apply(null,ages):null, u:'dias'},
      {l:'Criadas há mais de 1 ano', v:ages.filter(function(a){ return a>365; }).length}
    ]);
    var cnt={}; IDADE.forEach(function(b){ cnt[b.k]=0; }); SEL.forEach(function(r){ var b=idadeBucket(r); if(b) cnt[b]++; });
    var tones={a7:'green',a30:'light',a90:'petrol',a180:'gold',a365:'amber',mais:'red',futura:'slate'};
    barList($('idBars'), IDADE.filter(function(b){ return b.k!=='futura'||cnt.futura; }).map(function(b){ return {key:b.k, label:b.label, count:cnt[b.k], tone:tones[b.k]}; }), {active:S.chips.idade, onPick:function(k){ toggleChip('idade',k); }});
    T.old.setRows(SEL.filter(function(r){ return r.cr!=null; }));
  }
  function renderMov(){
    var box=$('movBox');
    var informed = SEL.filter(function(r){ return ultMovOf(r)!=null; });
    var h='';
    if(!TEM_MOV){
      h += '<div class="unavail"><div class="u-ic">'+ic('ban')+'</div><div><h3>Métrica indisponível na exportação</h3><p>Não há coluna de última movimentação, de atualização ou de histórico. Não é possível saber há quanto tempo cada atividade está parada, e a idade desde a criação não é usada como substituto. Para atrasos em relação à data cadastrada, veja "Data da agenda vencida há mais tempo" na seção Situação da agenda.</p></div></div>';
      h += '<p class="note gold">'+ic('pencil')+'<span>Você pode informar a data da última movimentação na janela de detalhes de cada atividade (<b>informação adicionada pelo usuário</b>, salva apenas neste navegador). As atividades informadas aparecem abaixo. Informadas na seleção: <b>'+nf.format(informed.length)+'</b>.</span></p>';
    }
    box.innerHTML = h + '<div id="agr-movTbl" style="margin-top:12px"></div>';
    T.mov.el = $('movTbl');
    if(informed.length) T.mov.setRows(informed); else if(TEM_MOV) T.mov.el.innerHTML='<p class="empty">Nenhuma data de movimentação na seleção.</p>';
  }
  function renderMensal(){
    var m=new Map(), min=null, max=null;
    SEL.forEach(function(r){ if(r.cr==null) return; var k=monthKey(r.cr); m.set(k,(m.get(k)||0)+1); if(min==null||k<min) min=k; if(max==null||k>max) max=k; });
    var items=[];
    if(min){ var y=+min.slice(0,4), mo=+min.slice(5,7);
      while(true){ var k=y+'-'+String(mo).padStart(2,'0'); items.push({key:k, label:monthLabel(k), full:monthFull(k), count:m.get(k)||0}); if(k===max) break; mo++; if(mo>12){ mo=1; y++; } } }
    var top = items.slice().sort(function(a,b){ return b.count-a.count; })[0];
    stats($('evoStats'), [
      {l:'Meses com atividades abertas', v:items.filter(function(x){ return x.count; }).length},
      {l:'Mês com mais atividades abertas', text: top ? monthLabel(top.key)+' ('+nf.format(top.count)+')' : '—'},
      {l:'Criadas nos últimos 3 meses do período', v:items.slice(-3).reduce(function(a,b){ return a+b.count; },0)},
      {l:'Primeira criação', text: min ? monthLabel(min) : '—'}
    ]);
    columns($('evoCols'), items, {aria:'Atividades por mês de criação', active:S.chips.mes, onPick:function(k){ toggleChip('mes',k); }});
  }
  function renderConc(){
    [['coCaso','caso'],['coProc','proc'],['coJuizo','juizo']].forEach(function(x){
      var el=$(x[0]);
      var by = counts(SEL, function(r){ return r[x[1]]; });
      var sem = SEL.filter(function(r){ return !r[x[1]]; }).length;
      barList(el, by.slice(0,10), {active:S.chips[x[1]], onPick:function(k){ toggleChip(x[1],k); }});
      el.insertAdjacentHTML('beforeend','<p class="note">'+ic('info')+'<span>Distintos na seleção: <b>'+nf.format(by.length)+'</b>. Sem informação: <b>'+nf.format(sem)+'</b> ('+pct(sem,SEL.length)+').</span></p>');
    });
  }
  function renderQual(){
    barList($('qBars'), H.map(function(h,ci){
      var filled = SEL.filter(function(r){ return !blank(r.f[ci]); }).length, empty = SEL.length-filled;
      return {key:h, label:h, count:filled, tone: !SEL.length?'slate': filled===SEL.length?'green': filled/SEL.length>=.6?'gold':'red', sub: empty?nf.format(empty)+' vazio'+(empty===1?'':'s')+(ci===K.hora?' (valor "-")':''):'completo', pctText:pct(filled,SEL.length)};
    }), {});
    var bad = SEL.filter(function(r){ return r.ag!=null && r.cr!=null && r.ag<r.cr; }).length;
    var semPrio = SEL.filter(function(r){ return r.prio==='Não informada'; }).length;
    var notes = [];
    if(!TEM_CRIADOR) notes.push(['ban','Criador da atividade','Coluna inexistente na exportação. Métricas por criador dependem de preenchimento manual local.']);
    if(!TEM_MOV) notes.push(['ban','Última movimentação','Coluna inexistente. Não é possível medir tempo parado.']);
    notes.push(['ban','Início da revisão','Não registrado. O tempo em revisão não pode ser calculado.']);
    if(K.conclusao>=0 && !SEL.some(function(r){ return !blank(r.f[K.conclusao]); })) notes.push(['info','Data de conclusão','Vazia em todos os registros da seleção. Não há análise de conclusão nem de produtividade.']);
    notes.push(['info','Prazo processual','Não existe campo de prazo processual. Prazos fatais são identificados pela etiqueta PRAZO FATAL ou pelo tipo "Prazo", sempre com a data da agenda.']);
    if(K.prio>=0) notes.push(['info','Prioridade','Vazia em '+nf.format(semPrio)+' atividades da seleção, exibidas como "Não informada".']);
    notes.push(['info','Número do processo e juízo','Vazios em '+nf.format(SEL.filter(function(r){ return !r.proc; }).length)+' e '+nf.format(SEL.filter(function(r){ return !r.juizo; }).length)+' atividades, respectivamente (atendimentos e tratativas sem processo).']);
    notes.push(['info','Agenda anterior à criação', nf.format(bad)+' atividade'+(bad===1?'':'s')+' da seleção têm data da agenda anterior à data de criação.']);
    if(respAjust) notes.push(['info','Responsável','Espaços extras no início/fim do nome foram removidos para agrupar corretamente ('+nf.format(respAjust)+' registros). Nomes parecidos não foram unificados.']);
    notes.push(['lock','Dados sensíveis', masked.n ? nf.format(masked.n)+' trecho'+(masked.n===1?'':'s')+' com senha ou credencial nas observações foram ocultados no portal.' : 'Nenhuma senha ou credencial encontrada nas observações.']);
    $('qNotes').innerHTML = '<ul class="bars" style="gap:8px">'+notes.map(function(n){ return '<li class="note" style="margin:0">'+ic(n[0])+'<span><b>'+esc(n[1])+'.</b> '+esc(n[2])+'</span></li>'; }).join('')+'</ul>';
  }

  /* -------- entradas e saídas (astreaDelta) — não acompanha os filtros -------- */
  function renderDelta(docs){
    var box=$('deltaBox'); if(!box) return;
    if(!docs || !docs.length){ box.innerHTML='<p class="empty">Ainda não há comparação entre importações. Ela aparece a partir do segundo dia de importação.</p>'; return; }
    var ent=0, sai=0, porResp=new Map(), porSem=new Map();
    function isoWeek(day){ var d=new Date(day*DAY); d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7)); var y=d.getUTCFullYear(); var w=Math.ceil(((d-Date.UTC(y,0,1))/DAY+1)/7); return y+'-S'+String(w).padStart(2,'0'); }
    docs.forEach(function(d){
      var day=dayNum(d.data); var e=+d.novosTotal||0, s=+d.concluidosTotal||0; ent+=e; sai+=s;
      if(day!=null){ var wk=isoWeek(day); var w=porSem.get(wk)||{i:porSem.size, sem:wk, ini:day, ent:0, sai:0}; w.ent+=e; w.sai+=s; if(day<w.ini) w.ini=day; porSem.set(wk,w); }
      Object.keys(d.novosPorResponsavel||{}).forEach(function(r){ var a=porResp.get(r)||{i:porResp.size, nome:r, ent:0, sai:0}; a.ent+=+d.novosPorResponsavel[r]||0; porResp.set(r,a); });
      Object.keys(d.concluidosPorResponsavel||{}).forEach(function(r){ var a=porResp.get(r)||{i:porResp.size, nome:r, ent:0, sai:0}; a.sai+=+d.concluidosPorResponsavel[r]||0; porResp.set(r,a); });
    });
    box.innerHTML = '<div class="stats" id="agr-deltaStats"></div><div class="grid-2"><div><h3 class="sub-h">Por semana</h3><div id="agr-deltaSem"></div></div><div><h3 class="sub-h">Por responsável</h3><div id="agr-deltaResp"></div></div></div>'
      + '<p class="note">'+ic('info')+'<span><b>Entradas</b> são atividades que apareceram na exportação de um dia para o outro; <b>saídas</b> são as que deixaram de aparecer (concluídas ou excluídas no Astrea). Esta seção resume as importações diárias e <b>não acompanha os filtros</b> acima.</span></p>';
    stats($('deltaStats'), [
      {l:'Dias comparados', v:docs.length},
      {l:'Entradas', v:ent, tone:'green'},
      {l:'Saídas', v:sai},
      {l:'Saldo (entradas − saídas)', v:ent-sai, tone: ent-sai>0?'amber':'green', fmt:function(x){ var r=Math.round(x); return (r>0?'+':'')+nf.format(r); }}
    ]);
    var sinal=function(n){ return (n>0?'+':'')+nf.format(n); };
    new Table($('deltaSem'), [
      {key:'sem',label:'Semana',sv:function(w){return w.ini;},html:function(w){ return '<span class="nowrap">'+esc(w.sem)+'</span><br><small>a partir de '+dayToBR(w.ini)+'</small>'; }},
      {key:'ent',label:'Entradas',num:true,dir0:-1,sv:function(w){return w.ent;},html:function(w){ return nf.format(w.ent); }},
      {key:'sai',label:'Saídas',num:true,dir0:-1,sv:function(w){return w.sai;},html:function(w){ return nf.format(w.sai); }},
      {key:'sal',label:'Saldo',num:true,dir0:-1,sv:function(w){return w.ent-w.sai;},html:function(w){ return '<b>'+sinal(w.ent-w.sai)+'</b>'; }}
    ], {caption:'Entradas e saídas por semana', paginate:false, sort:{key:'sem',dir:-1}}).setRows(Array.from(porSem.values()));
    new Table($('deltaResp'), [
      {key:'nome',label:'Responsável',sv:function(a){return norm(a.nome);},html:function(a){ return esc(a.nome); }},
      {key:'ent',label:'Entradas',num:true,dir0:-1,sv:function(a){return a.ent;},html:function(a){ return nf.format(a.ent); }},
      {key:'sai',label:'Saídas',num:true,dir0:-1,sv:function(a){return a.sai;},html:function(a){ return nf.format(a.sai); }},
      {key:'sal',label:'Saldo',num:true,dir0:-1,sv:function(a){return a.ent-a.sai;},html:function(a){ return '<b>'+sinal(a.ent-a.sai)+'</b>'; }}
    ], {caption:'Entradas e saídas por responsável', paginate:false, sort:{key:'sai',dir:-1}}).setRows(Array.from(porResp.values()));
  }

  /* -------- controles -------- */
  function opt(v,l,sel){ return '<option value="'+esc(v)+'"'+(sel?' selected':'')+'>'+esc(l)+'</option>'; }
  function fillSelect(id, all, items, cur){ $(id).innerHTML = opt('',all,!cur) + items.map(function(x){ return opt(x.key, x.label+' ('+nf.format(x.count)+')', cur===x.key); }).join(''); }
  function buildControls(){
    fillSelect('fResp','Todos os responsáveis', counts(RECS,function(r){return r.resp;}), S.resp);
    fillSelect('fTipo','Todos os tipos', counts(RECS,function(r){return r.tipo;}), S.tipo);
    fillSelect('fPrio','Todas as prioridades', counts(RECS,function(r){return r.prio;}).sort(function(a,b){ return (PRIO_ORDER[a.key]!=null?PRIO_ORDER[a.key]:9)-(PRIO_ORDER[b.key]!=null?PRIO_ORDER[b.key]:9); }), S.prio);
    var tg = counts(RECS,function(r){ return r.tags.length?r.tags:['__none']; }); tg.forEach(function(t){ if(t.key==='__none') t.label='(sem etiqueta)'; });
    fillSelect('fTag','Todas as etiquetas', tg, S.tag);
    $('lblCriador').innerHTML = 'Criado por'+(TEM_CRIADOR?'':' <span class="muted">(informado pelo usuário)</span>');
    buildCriador();
  }
  function buildCriador(){
    var inf = counts(RECS.filter(function(r){ return criadorOf(r); }), criadorOf);
    var none = RECS.length - inf.reduce(function(a,b){ return a+b.count; },0);
    $('fCriador').innerHTML = opt('','Todos',!S.criador) + opt('__none','Não informado ('+nf.format(none)+')',S.criador==='__none') + inf.map(function(x){ return opt(x.key, x.label+' ('+nf.format(x.count)+')', S.criador===x.key); }).join('');
    if(S.criador && S.criador!=='__none' && !inf.some(function(x){ return x.key===S.criador; })){ S.criador=''; $('fCriador').value=''; }
  }
  function syncControls(){
    $('fQ').value=S.q;
    [['fResp','resp'],['fTipo','tipo'],['fPrio','prio'],['fTag','tag'],['fCriador','criador']].forEach(function(p){ $(p[0]).value=S[p[1]]; });
    $('fDateField').value=S.dateField; $('fFrom').value=dayToISO(S.from); $('fTo').value=dayToISO(S.to); $('fBase').value=dayToISO(S.base);
    $('baseHint').innerHTML = ic('info','sm')+'Data-base usada em vencidas, hoje, próximos períodos e idade. Padrão: data da importação ('+esc(dayToBR(BASE0))+').';
  }
  function wire(){
    var qT;
    $('fQ').addEventListener('input', function(e){ clearTimeout(qT); var v=e.target.value; qT=setTimeout(function(){ S.q=v.trim(); S.qTerms=norm(S.q).split(/\s+/).filter(Boolean); render(); }, 220); });
    [['fResp','resp'],['fTipo','tipo'],['fPrio','prio'],['fTag','tag'],['fCriador','criador']].forEach(function(p){ $(p[0]).addEventListener('change', function(e){ S[p[1]]=e.target.value; render(); }); });
    $('fDateField').addEventListener('change', function(e){ S.dateField=e.target.value; render(); });
    $('fFrom').addEventListener('change', function(e){ S.from=dayNum(e.target.value); render(); });
    $('fTo').addEventListener('change', function(e){ S.to=dayNum(e.target.value); render(); });
    $('fBase').addEventListener('change', function(e){ var d=dayNum(e.target.value); S.base = d==null?BASE0:d; S.baseManual = d!=null && d!==BASE0; syncControls(); render(); });
    root.querySelector('[data-act="hoje"]').addEventListener('click', function(){ S.base=todayDay(); S.baseManual=S.base!==BASE0; syncControls(); render(); });
    root.querySelectorAll('[data-act="clear"]').forEach(function(b){ b.addEventListener('click', function(){ resetState(); root._agrState=S; syncControls(); render(); $('fQ').focus(); }); });
    root.querySelectorAll('[data-act="csv"]').forEach(function(b){ b.addEventListener('click', exportCSV); });
    root.querySelectorAll('#agr-fatalSeg button').forEach(function(b){ b.addEventListener('click', function(){ S.fatalMode=b.dataset.m; renderFatal(); }); });
  }

  /* -------- exportação CSV -------- */
  function exportCSV(){
    if(!SEL.length) return;
    var head = H.concat(['Situação da agenda (data-base '+dayToBR(S.base)+')','Dias até a agenda (negativo = vencida)','Idade (dias)','Prazo fatal (etiqueta)','Em revisão (etiqueta)','Criado por (informado pelo usuário)','Última movimentação (informada pelo usuário)','Anotação (informada pelo usuário)']);
    function q(v){ v = v==null?'':String(v); if(/^[=+@\t\r]/.test(v) || /^-[^\d\s]/.test(v)) v="'"+v; return /[";\n\r]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }
    var lines = [head.map(q).join(';')];
    T.main.sorted().forEach(function(r){
      var a=anot(r);
      lines.push(r.f.map(fmtVal).concat([SITMAP[situacao(r)].label, r.ag==null?'':r.ag-S.base, idade(r), r.fatal?'Sim':'Não', r.revisao?'Sim':'Não', a.criador||'', a.ultimaMov?dayToBR(dayNum(a.ultimaMov)):'', a.nota||'']).map(q).join(';'));
    });
    var blob = new Blob(['﻿'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob), a2=document.createElement('a');
    a2.href=url; a2.download='agenda-astrea-selecao-'+dayToISO(S.base)+'.csv'; document.body.appendChild(a2); a2.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a2.remove(); }, 1000);
  }

  /* -------- janela de detalhes -------- */
  var modal=$('modal'), mCard=$('mCard'), lastFocus=null, mCtx={list:[], ix:0};
  function openModal(r, list, ix){
    if(modal.hidden) lastFocus=document.activeElement;
    mCtx.list = list || [r]; mCtx.ix = ix!=null ? ix : 0;
    fillModal(r);
    modal.hidden=false; document.body.style.overflow='hidden';
    mCard.focus();
  }
  function fillModal(r){
    $('mTitle').textContent = r.titulo;
    var b = [sitBadge(r), '<span class="badge b-slate">'+esc(r.tipo)+'</span>', prioBadge(r)];
    if(r.fatal) b.push('<span class="badge b-red">'+ic('flag','sm')+'Prazo fatal (etiqueta)</span>');
    if(r.revisao) b.push('<span class="badge b-gold">'+ic('eye','sm')+'Em revisão (etiqueta)</span>');
    $('mBadges').innerHTML = b.join('');
    var a = anot(r), d = r.ag==null?null:r.ag-S.base, um = ultMovOf(r);
    var h = '<div class="m-sec"><h3>'+ic('sheet','sm')+'Campos da origem (exportação do Astrea)</h3><dl class="dl">'+H.map(function(col,ci){ var v=r.f[ci]; return '<dt>'+esc(col)+'</dt><dd>'+(v==null||String(v).trim()===''?'<span class="vazio">vazio</span>':esc(fmtVal(v)))+'</dd>'; }).join('')+'</dl></div>';
    h += '<div class="m-sec"><h3>'+ic('layout','sm')+'Indicadores calculados (data-base '+esc(dayToBR(S.base))+')</h3><dl class="dl">'
      + '<dt>Situação da agenda</dt><dd>'+esc(SITMAP[situacao(r)].label)+(d==null?'':d<0?' — data da agenda há '+plural(-d,'dia','dias'):d>0?' — faltam '+plural(d,'dia','dias'):'')+'</dd>'
      + '<dt>Idade desde a criação</dt><dd>'+(idade(r)==null?'—':plural(idade(r),'dia','dias'))+'</dd>'
      + '<dt>Tempo sem movimentação</dt><dd>'+(um!=null?plural(S.base-um,'dia','dias')+(TEM_MOV?'':' (pela data informada pelo usuário)'):'<span class="vazio">indisponível na exportação</span>')+'</dd>'
      + '<dt>Etiquetas separadas</dt><dd>'+(r.tags.length?r.tags.map(function(t){ return '<span class="tagl">'+esc(t)+'</span>'; }).join(''):'<span class="vazio">nenhuma</span>')+'</dd></dl></div>';
    h += '<div class="m-sec"><h3>'+ic('pencil','sm')+'Informações adicionadas pelo usuário</h3><div class="userbox"><p class="muted" style="margin:0 0 10px;font-size:12.5px">Estes campos não existem na exportação. O que for preenchido aqui fica salvo apenas neste navegador, identificado como informado pelo usuário, e não altera o Astrea.'+(ANOT_OK?'':' <b>O armazenamento local está indisponível; os dados não serão mantidos.</b>')+'</p>'
      + '<div class="grid-2"><div class="field"><label for="agr-uCriador">Criado por</label><input class="inp" id="agr-uCriador" list="agr-dlPessoas" value="'+esc(a.criador||'')+'" autocomplete="off"></div>'
      + '<div class="field"><label for="agr-uMov">Data da última movimentação</label><input class="inp" id="agr-uMov" type="date" value="'+esc(a.ultimaMov||'')+'"></div></div>'
      + '<div class="field" style="margin-top:10px"><label for="agr-uNota">Anotação</label><textarea id="agr-uNota">'+esc(a.nota||'')+'</textarea></div>'
      + '<div class="ub-actions"><button type="button" class="btn primary" id="agr-uSave">Salvar neste navegador</button><button type="button" class="btn" id="agr-uDel"'+(ANOT[r.id]?'':' disabled')+'>Apagar informações</button><span class="ub-msg" id="agr-uMsg" role="status"></span></div></div></div>';
    var body=$('mBody'); body.innerHTML=h; body.scrollTop=0;
    $('uSave').addEventListener('click', function(){
      var v={criador:$('uCriador').value.trim(), ultimaMov:$('uMov').value, nota:$('uNota').value.trim()};
      if(!v.criador && !v.ultimaMov && !v.nota) delete ANOT[r.id]; else ANOT[r.id]=v;
      var ok=saveAnot(); buildCriador(); render(); fillModal(r);
      $('uMsg').textContent = ok ? 'Salvo neste navegador.' : 'Não foi possível salvar (armazenamento local indisponível).';
    });
    $('uDel').addEventListener('click', function(){ delete ANOT[r.id]; saveAnot(); buildCriador(); render(); fillModal(r); $('uMsg').textContent='Informações apagadas.'; });
    $('mPrev').disabled = mCtx.ix<=0;
    $('mNext').disabled = mCtx.ix>=mCtx.list.length-1;
  }
  function closeModal(){ modal.hidden=true; document.body.style.overflow=''; if(lastFocus && document.body.contains(lastFocus)) lastFocus.focus(); }
  modal.addEventListener('click', function(e){ if(e.target.closest('[data-close]')) closeModal(); });
  $('mPrev').addEventListener('click', function(){ if(mCtx.ix>0){ mCtx.ix--; fillModal(mCtx.list[mCtx.ix]); } });
  $('mNext').addEventListener('click', function(){ if(mCtx.ix<mCtx.list.length-1){ mCtx.ix++; fillModal(mCtx.list[mCtx.ix]); } });
  function onKey(e){
    if(modal.hidden) return;
    if(e.key==='Escape'){ e.preventDefault(); closeModal(); return; }
    if(e.key==='Tab'){
      var f=Array.prototype.filter.call(mCard.querySelectorAll('button,input,textarea,select,a[href],[tabindex]:not([tabindex="-1"])'), function(x){ return !x.disabled && x.offsetParent!==null; });
      if(!f.length) return; var first=f[0], last=f[f.length-1];
      if(e.shiftKey && (document.activeElement===first || document.activeElement===mCard)){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', onKey);

  /* a barra de seleção fica logo abaixo das abas fixas do topo */
  function ajustarTopo(){ var tn=document.querySelector('.tabnav'); root.style.setProperty('--a-top', (tn?tn.offsetHeight:0)+'px'); }
  ajustarTopo(); window.addEventListener('resize', ajustarTopo);
  /* a paleta da rosca muda com o tema do portal */
  var mo = new MutationObserver(function(){ renderClass(); renderPainel(); });
  mo.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  root._agrCleanup = function(){ document.removeEventListener('keydown', onKey); window.removeEventListener('resize', ajustarTopo); mo.disconnect(); if(!modal.hidden) document.body.style.overflow=''; };

  /* -------- inicialização -------- */
  root.insertAdjacentHTML('beforeend','<datalist id="agr-dlPessoas">'+counts(RECS,function(r){return r.resp;}).map(function(x){ return '<option value="'+esc(x.key)+'">'; }).join('')+'</datalist>');
  T.main = new Table($('mainTbl'), [C.ag,C.sit,C.titulo,C.resp,C.tipo,C.prio,C.tags,C.idade], {caption:'Atividades da seleção', size:25, sizes:[25,50,100], sort:{key:'ag',dir:1}, onRow:openFromTable, rowLabel:recRowLabel});
  T.late = new Table($('agLate'), [C.atraso,C.ag,C.titulo,C.resp], {caption:'Agenda vencida há mais tempo', paginate:false, limit:10, sortable:false, sort:{key:'atraso',dir:-1}, onRow:openFromTable, rowLabel:recRowLabel, empty:'Nenhuma atividade com agenda vencida na seleção.'});
  T.fatal = new Table($('fatalTbl'), [C.ag,C.sit,C.titulo,C.resp,C.tipo,C.status], {caption:'Prazos fatais', size:10, sizes:[10,25,50], sort:{key:'ag',dir:1}, onRow:openFromTable, rowLabel:recRowLabel, empty:'Nenhuma atividade identificada por este critério na seleção.'});
  T.rev = new Table($('revTbl'), [C.ag,C.titulo,C.resp,C.idade], {caption:'Atividades em revisão', size:10, sizes:[10,25,50], sort:{key:'ag',dir:1}, onRow:openFromTable, rowLabel:recRowLabel, empty:'Nenhuma atividade com etiqueta REVISÃO na seleção.'});
  T.old = new Table($('idOld'), [C.idade,{key:'cr',label:'Criação',sv:function(r){return r.cr;},html:function(r){ return '<span class="nowrap">'+dayToBR(r.cr)+'</span>'; }},C.titulo,C.resp], {caption:'Atividades mais antigas', paginate:false, limit:10, sortable:false, sort:{key:'idade',dir:-1}, onRow:openFromTable, rowLabel:recRowLabel});
  T.mov = new Table($('movBox'), [{key:'mov',label:'Sem movimentação',num:true,dir0:-1,sv:function(r){ return S.base-ultMovOf(r); },html:function(r){ return '<b>'+plural(S.base-ultMovOf(r),'dia','dias')+'</b>'+(TEM_MOV?'':'<br><small>informado pelo usuário</small>'); }},C.titulo,C.resp,C.sit], {caption:'Sem movimentação', size:10, sort:{key:'mov',dir:-1}, onRow:openFromTable, rowLabel:recRowLabel});
  T.resp = new Table($('respTbl'), [
    {key:'nome',label:'Responsável',sv:function(a){return norm(a.nome);},html:function(a){ return '<b>'+esc(a.nome)+'</b>'; }},
    {key:'n',label:'Atividades',num:true,dir0:-1,sv:function(a){return a.n;},html:function(a){ return nf.format(a.n); }},
    {key:'p',label:'Participação',num:true,dir0:-1,sv:function(a){return a.n;},html:function(a){ return pct(a.n,SEL.length); }},
    {key:'venc',label:'Vencidas',num:true,dir0:-1,sv:function(a){return a.venc;},html:function(a){ return a.venc?'<span class="badge b-red">'+ic('alert','sm')+nf.format(a.venc)+'</span>':'0'; }},
    {key:'hoje',label:'Hoje',num:true,dir0:-1,sv:function(a){return a.hoje;},html:function(a){ return nf.format(a.hoje); }},
    {key:'p7',label:'Próx. 7 dias',num:true,dir0:-1,sv:function(a){return a.p7;},html:function(a){ return nf.format(a.p7); }},
    {key:'fatal',label:'Prazo fatal',num:true,dir0:-1,sv:function(a){return a.fatal;},html:function(a){ return nf.format(a.fatal); }},
    {key:'rev',label:'Revisão',num:true,dir0:-1,sv:function(a){return a.rev;},html:function(a){ return nf.format(a.rev); }},
    {key:'alta',label:'Prior. alta',num:true,dir0:-1,sv:function(a){return a.alta;},html:function(a){ return nf.format(a.alta); }},
    {key:'med',label:'Idade mediana',num:true,dir0:-1,sv:function(a){return a.med;},html:function(a){ return a.med==null?'—':nf.format(Math.round(a.med))+' d'; }}
  ], {caption:'Quadro por responsável', paginate:false, sort:{key:'n',dir:-1}, onRow:function(a){ toggle('resp',a.nome); }, rowLabel:function(a){ return a.nome+': '+a.n+' atividades. Filtrar por este responsável'; }});

  buildControls(); syncControls(); wire(); render();
  if(opts.carregarDelta){
    opts.carregarDelta().then(renderDelta).catch(function(err){ var b=$('deltaBox'); if(b) b.innerHTML='<p class="empty">Não foi possível carregar o histórico: '+esc(err && err.message || err)+'</p>'; });
  } else renderDelta([]);

  return { total: RECS.length, ocultados: masked.n, selecao: function(){ return SEL.length; } };
}

window.AgendaRelatorio = { montar: montar };
})();
