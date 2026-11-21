/* =====================================================================
   Calculadora de prazos por tribunal (16/11/2026) — sub-aba "Prazo por tribunal" da Matriz de Demandas.
   Mesmo fluxo do Prazo Fácil: Estado, Município, Matéria, Processo, Tribunal, Data da publicação, Prazo e Contagem;
   o resultado lista dia a dia o que conta e o que não conta (fim de semana, feriado, recesso), com a data final.
   O calendário é calculado aqui, sem depender de serviço externo:
   - feriados nacionais fixos e móveis (Páscoa → Carnaval, Semana Santa, Corpus Christi);
   - recesso de 20/12 a 20/01 (CPC art. 220 e CLT art. 775-A suspendem os prazos; no criminal só o recesso
     de 20/12 a 06/01, Res. CNJ 244/2016, em que o fórum fecha);
   - feriados forenses: Justiça Federal e do Trabalho (Lei 5.010/66, art. 62) e TJMG;
   - feriados municipais cadastrados (Uberlândia) e os que a pessoa informar no campo de suspensões.
   É referência: confira sempre as portarias do tribunal (indisponibilidade do sistema, pontos facultativos).
   ===================================================================== */
(function(){
  'use strict';
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DIAS_L = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  var MUNICIPIOS = {
    'uberlandia': { nome: 'Uberlândia', feriados: [['08-31', 'Aniversário de Uberlândia']] },
    'outro': { nome: 'Outro município de MG', feriados: [] }
  };
  var TRIBUNAIS = {
    'tjmg': { nome: 'TJ - MG', ramo: 'estadual' },
    'trf6': { nome: 'TRF6 - Tribunal Regional Federal', ramo: 'federal' },
    'trt3': { nome: 'TRT - 3ª Região', ramo: 'trabalho' }
  };

  function pad(n){ return String(n).padStart(2, '0'); }
  function iso(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function br(d){ return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function soma(d, n){ var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function pascoa(ano){
    var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(ano, mes - 1, dia);
  }
  var cache = {};
  // mapa iso -> motivo, para um ano, tribunal e município
  function feriadosDoAno(ano, trib, mun){
    var chave = ano + '|' + trib + '|' + mun; if (cache[chave]) return cache[chave];
    var m = {}, ramo = TRIBUNAIS[trib].ramo;
    function poe(d, motivo){ if (!m[iso(d)]) m[iso(d)] = motivo; }
    [['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['09-07', 'Independência do Brasil'],
     ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['12-25', 'Natal']]
      .forEach(function(f){ poe(new Date(ano + '-' + f[0] + 'T12:00:00'), 'Feriado Nacional — ' + f[1]); });
    if (ano >= 2024) poe(new Date(ano, 10, 20), 'Feriado Nacional — Consciência Negra');
    var p = pascoa(ano);
    poe(soma(p, -2), 'Feriado Nacional — Sexta-feira da Paixão');
    poe(soma(p, -48), 'Carnaval'); poe(soma(p, -47), 'Carnaval');
    poe(soma(p, 60), 'Corpus Christi');
    if (ramo === 'federal' || ramo === 'trabalho'){   // Lei 5.010/66, art. 62
      poe(soma(p, -4), 'Semana Santa (Lei 5.010/66)'); poe(soma(p, -3), 'Semana Santa (Lei 5.010/66)');
      poe(new Date(ano, 7, 11), 'Feriado Forense — Dia do Advogado (Lei 5.010/66)');
      poe(new Date(ano, 10, 1), 'Feriado Forense — Todos os Santos (Lei 5.010/66)');
      poe(new Date(ano, 11, 8), 'Feriado Forense — Dia da Justiça (Lei 5.010/66)');
    } else {
      poe(soma(p, -3), 'Feriado Forense — Quinta-feira Santa');
      poe(new Date(ano, 11, 8), 'Feriado Forense — Dia da Justiça');
    }
    (MUNICIPIOS[mun] || MUNICIPIOS.outro).feriados.forEach(function(f){ poe(new Date(ano + '-' + f[0] + 'T12:00:00'), 'Feriado Municipal — ' + f[1]); });
    cache[chave] = m; return m;
  }
  function lerExtras(txt){
    var r = {};
    String(txt || '').split(/[,;\n]+/).forEach(function(s){
      var x = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(s.trim()); if (!x) return;
      r[pad(+x[2]) + '-' + pad(+x[1]) + (x[3] ? '|' + (x[3].length === 2 ? '20' + x[3] : x[3]) : '')] = s.replace(x[0], '').replace(/^[\s\-–:]+/, '').trim() || 'Suspensão informada';
    });
    return r;
  }
  // motivo pelo qual o dia NÃO é útil (ou null se é útil)
  function motivoDe(d, o){
    if (d.getDay() === 0 || d.getDay() === 6) return 'Final de Semana';
    var k = iso(d), md = k.slice(5);
    var ex = o.extras[md + '|' + d.getFullYear()] || o.extras[md]; if (ex) return 'Suspensão — ' + ex;
    var f = feriadosDoAno(d.getFullYear(), o.trib, o.mun)[k]; if (f) return f;
    var mm = d.getMonth(), dd = d.getDate();
    var noRecesso = (mm === 11 && dd >= 20) || (mm === 0 && dd <= (o.materia === 'criminal' ? 6 : 20));
    if (noRecesso) return 'Recesso Forense';
    return null;
  }
  function calcular(o){
    var pub = new Date(o.data + 'T12:00:00'), n = o.prazo, linhas = [], d = soma(pub, 1), cont = 0, guarda = 0;
    if (o.contagem === 'uteis'){
      while (cont < n && guarda++ < 2000){
        var mo = motivoDe(d, o);
        if (mo) linhas.push({ d: d, x: true, motivo: mo }); else { cont++; linhas.push({ d: d, n: cont }); }
        d = soma(d, 1);
      }
      return { linhas: linhas, fim: linhas[linhas.length - 1].d };
    }
    // corridos: começa no primeiro dia útil depois da publicação (Súm. 310 STF) e, se terminar em dia não útil, prorroga
    while (motivoDe(d, o) && guarda++ < 400){ linhas.push({ d: d, x: true, motivo: motivoDe(d, o) + ' (início no dia útil seguinte)' }); d = soma(d, 1); }
    for (cont = 1; cont <= n; cont++){ var m2 = motivoDe(d, o); linhas.push({ d: d, n: cont, obs: m2 && o.materia === 'criminal' && /Recesso/.test(m2) ? 'Recesso (prazo penal corre)' : m2 }); d = soma(d, 1); }
    var fim = linhas[linhas.length - 1].d;
    if (motivoDe(fim, o)){
      d = soma(fim, 1);
      while (motivoDe(d, o) && guarda++ < 400){ linhas.push({ d: d, x: true, motivo: motivoDe(d, o) + ' (prorrogação)' }); d = soma(d, 1); }
      linhas.push({ d: d, n: 'P', obs: 'Prorrogado: o prazo terminava em dia não útil' }); fim = d;
    }
    return { linhas: linhas, fim: fim };
  }

  var $ = function(id){ return document.getElementById(id); };
  function montar(){
    var painel = $('prazoTribunalPanel'); if (!painel || painel.__ok) return; painel.__ok = true;
    $('ptMun').innerHTML = '<option value="">Selecione...</option>' + Object.keys(MUNICIPIOS).map(function(k){ return '<option value="' + k + '">' + MUNICIPIOS[k].nome + '</option>'; }).join('');
    $('ptTrib').innerHTML = '<option value="">Selecione...</option>' + Object.keys(TRIBUNAIS).map(function(k){ return '<option value="' + k + '">' + TRIBUNAIS[k].nome + '</option>'; }).join('');
    $('ptMun').value = 'uberlandia';
    $('ptMateria').onchange = function(){ var v = this.value;
      if (v === 'trabalhista') $('ptTrib').value = 'trt3'; else if ($('ptTrib').value === 'trt3') $('ptTrib').value = '';
      if (v === 'criminal') $('ptCont').value = 'corridos'; else if (v) $('ptCont').value = 'uteis'; };
    $('ptTrib').onchange = function(){ if (this.value === 'trt3') $('ptMateria').value = 'trabalhista'; else if ($('ptMateria').value === 'trabalhista') $('ptMateria').value = ''; };
    $('ptCalc').onclick = function(){
      var o = { mun: $('ptMun').value, materia: $('ptMateria').value, processo: $('ptProc').value, trib: $('ptTrib').value, data: $('ptData').value, prazo: parseInt($('ptPrazo').value, 10), contagem: $('ptCont').value, extras: lerExtras($('ptExtras').value) };
      var falta = [];
      if (!o.mun) falta.push('Município'); if (!o.materia) falta.push('Matéria'); if (!o.processo) falta.push('Processo'); if (!o.trib) falta.push('Tribunal');
      if (!o.data) falta.push('Data da Publicação'); if (!(o.prazo > 0 && o.prazo <= 365)) falta.push('Prazo (1 a 365 dias)');
      if (falta.length){ $('ptRes').innerHTML = '<div class="pt-aviso">Preencha: ' + falta.join(', ') + '.</div>'; return; }
      var r = calcular(o), pub = new Date(o.data + 'T12:00:00');
      $('ptRes').innerHTML = '<div class="pt-resultado" id="ptImprimir">' +
        '<h3>Prazo de ' + o.prazo + ' dias ' + (o.contagem === 'uteis' ? 'úteis' : 'corridos') + '</h3>' +
        '<p class="pt-sub">Início no dia útil subsequente à publicação de <b>' + br(pub) + '</b>.</p>' +
        '<div class="pt-dados"><span><b>Estado:</b> Minas Gerais</span><span><b>Município:</b> ' + MUNICIPIOS[o.mun].nome + '</span><span><b>Matéria:</b> ' + $('ptMateria').selectedOptions[0].text +
        '</span><span><b>Processo:</b> ' + $('ptProc').selectedOptions[0].text + '</span><span><b>Tribunal:</b> ' + TRIBUNAIS[o.trib].nome + '</span></div>' +
        '<div class="pt-final">Data final: <b>' + br(r.fim) + '</b> (' + DIAS_L[r.fim.getDay()] + ')<button type="button" class="pt-copiar" data-date="' + br(r.fim) + '">Copiar data</button></div>' +
        '<table class="pt-tab"><thead><tr><th>Contagem</th><th>Data</th></tr></thead><tbody>' + r.linhas.map(function(l){
          return '<tr class="' + (l.x ? 'nao' : '') + (l.n === 'P' ? ' prorr' : '') + '"><td>' + (l.x ? 'X' : l.n) + '</td><td>' + br(l.d) + ' - ' + DIAS[l.d.getDay()] + (l.x ? ' (' + l.motivo + ')' : l.obs ? ' <small>(' + l.obs + ')</small>' : '') + '</td></tr>'; }).join('') +
        '</tbody></table><div class="pt-acoes"><button type="button" class="btn" id="ptPdf">Gerar PDF</button></div>' +
        '<p class="pt-nota">Serviço de referência para conferência de datas, conforme o calendário cadastrado (feriados nacionais, forenses do tribunal, municipais e recesso). Confira sempre as portarias do tribunal — suspensões de expediente, indisponibilidade do sistema e pontos facultativos podem alterar o prazo; informe-as no campo "Suspensões / feriados locais".</p></div>';
      $('ptPdf').onclick = imprimir;
      var cp = document.querySelector('#ptRes .pt-copiar'); if (cp) cp.onclick = function(){ var t = this; (navigator.clipboard ? navigator.clipboard.writeText(t.getAttribute('data-date')) : Promise.reject()).then(function(){ t.textContent = 'Copiada!'; setTimeout(function(){ t.textContent = 'Copiar data'; }, 1500); }).catch(function(){}); };
      $('ptRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
  function imprimir(){
    var el = $('ptImprimir'); if (!el) return;
    var w = window.open('', '_blank'); if (!w){ window.print(); return; }
    w.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cálculo de prazo</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:28px;}h3{margin:0 0 4px;font-size:20px;}' +
      '.pt-sub{margin:0 0 12px;}.pt-dados{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;margin-bottom:10px;}.pt-final{font-size:16px;margin:10px 0 14px;}.pt-copiar,.pt-acoes{display:none;}' +
      'table{border-collapse:collapse;width:100%;font-size:12.5px;}th,td{border:1px solid #bbb;padding:4px 8px;text-align:left;}th{background:#eee;}tr.nao td{color:#999;}tr.prorr td{font-weight:bold;}.pt-nota{font-size:11px;color:#555;margin-top:14px;}' +
      '.cab{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #8a1f1a;padding-bottom:8px;margin-bottom:14px;}.cab b{color:#8a1f1a;}</style></head><body>' +
      '<div class="cab"><b>FONSECA E BRAGA — Sociedade de Advogados</b><span>Cálculo gerado em ' + br(new Date()) + '</span></div>' + el.innerHTML + '</body></html>');
    w.document.close(); w.focus(); setTimeout(function(){ w.print(); }, 300);
  }
  window.PrazoTribunal = { montar: montar, calcular: calcular, motivoDe: motivoDe, lerExtras: lerExtras };
})();
