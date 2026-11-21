// Contrato de associação: assinatura obrigatória no login (chamado por entrarNoApp no index.html).
// - Associado com contrato "aguardando_associado" → tela cheia com o contrato, senha e assinatura; o Portal só
//   libera depois de assinar (ou a pessoa sai).
// - Se o admin ligar "Exigir contrato assinado" (contratosAssociacaoConfig/regras.exigirAssinatura), o associado
//   sem nenhum contrato assinado também fica bloqueado, com o aviso de que o contrato está sendo preparado.
// - Diretor interveniente com assinatura pendente → mesma tela, mas pode deixar para depois.
// O contrato é preparado pelo admin em Contratos › Contrato de associação (tools/contratos/associacao.html).
(function(){
  "use strict";
  var ESTILO = '' +
    '#ca-bd{position:fixed;inset:0;z-index:9000;background:rgba(10,6,6,.94);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:18px 12px;}' +
    '#ca-bd *{box-sizing:border-box;}' +
    '#ca-bd .ca-box{width:min(920px,100%);background:var(--panel,#211918);color:var(--paper,#ece6e1);border:1px solid var(--line-strong,rgba(236,230,225,.2));border-radius:16px;padding:20px;font-family:inherit;}' +
    '#ca-bd h2{margin:0 0 6px;font-size:1.15rem;}' +
    '#ca-bd .ca-sub{font-size:.84rem;color:var(--muted,#9c908b);line-height:1.5;margin:0 0 12px;}' +
    '#ca-bd .ca-baixar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:.8rem;color:var(--muted,#9c908b);margin:0 0 10px;}' +
    '#ca-bd .ca-baixar .ca-st{font-size:.76rem;}' +
    '#ca-bd .ca-frame{border:1px solid var(--line-strong,rgba(236,230,225,.2));border-radius:10px;overflow:hidden;background:#0e0b0b;}' +
    '#ca-bd .ca-frame iframe{display:block;width:100%;height:58vh;border:none;}' +
    '#ca-bd label{display:block;font-size:.76rem;color:var(--muted,#9c908b);margin:12px 0 5px;}' +
    '#ca-bd input[type=password]{box-sizing:border-box;width:100%;max-width:360px;padding:9px 11px;border-radius:8px;border:1px solid var(--line-strong,rgba(236,230,225,.2));background:var(--panel-2,#2a1f1e);color:inherit;font-size:.9rem;}' +
    '#ca-bd canvas{display:block;width:100%;height:160px;background:#fff;border-radius:10px;touch-action:none;cursor:crosshair;}' +
    '#ca-bd .ca-check{display:flex;gap:10px;align-items:flex-start;font-size:.84rem;line-height:1.45;color:inherit;margin-top:14px;cursor:pointer;}' +
    '#ca-bd .ca-check input{margin-top:3px;width:17px;height:17px;flex:0 0 auto;}' +
    '#ca-bd .ca-acoes{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px;}' +
    '#ca-bd button{font-family:inherit;padding:10px 16px;border-radius:8px;border:none;font-weight:600;font-size:.84rem;cursor:pointer;background:var(--red,#b8362e);color:#fff;}' +
    '#ca-bd button.sec{background:transparent;color:inherit;border:1px solid var(--line-strong,rgba(236,230,225,.2));}' +
    '#ca-bd button.mini{padding:4px 10px;font-size:.72rem;}' +
    '#ca-bd button:disabled{opacity:.5;cursor:default;}' +
    '#ca-bd .ca-err{color:var(--err,#ffb4ae);font-size:.82rem;margin-top:10px;min-height:1em;}' +
    '#ca-bd .ca-ok{font-size:.95rem;line-height:1.6;}' +
    '@media (max-width:600px){#ca-bd{padding:0;} #ca-bd .ca-box{border-radius:0;min-height:100%;} #ca-bd .ca-frame iframe{height:52vh;}}';

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function comTempo(p, ms, padrao){ return Promise.race([p, new Promise(function(r){ setTimeout(function(){ r(padrao); }, ms); })]); }
  function coletarRegistro(){
    var ip = comTempo(fetch('https://api.ipify.org?format=json', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(j){ return j.ip || ''; }).catch(function(){ return ''; }), 6000, '');
    var local = !navigator.geolocation ? Promise.resolve({ status: 'indisponível no aparelho' }) : comTempo(new Promise(function(res){
      navigator.geolocation.getCurrentPosition(function(p){ res({ status: 'ok', lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)), precisaoM: Math.round(p.coords.accuracy) }); },
        function(err){ res({ status: err && err.code === 1 ? 'não autorizada pelo usuário' : 'não obtida' }); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    }), 16000, { status: 'não obtida (tempo esgotado)' });
    return Promise.all([ip, local]).then(function(r){ return { ip: r[0], localizacao: r[1], dispositivo: String(navigator.userAgent || '').slice(0, 200) }; });
  }
  function sha256(t){
    if (!window.crypto || !crypto.subtle) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf), function(b){ return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function overlay(){
    var bd = document.getElementById('ca-bd');
    if (!bd) {
      if (!document.getElementById('ca-estilo')) { var st = document.createElement('style'); st.id = 'ca-estilo'; st.textContent = ESTILO; document.head.appendChild(st); }
      bd = document.createElement('div'); bd.id = 'ca-bd'; bd.setAttribute('role', 'dialog'); bd.setAttribute('aria-modal', 'true');
      bd.innerHTML = '<div class="ca-box"></div>';
      document.body.appendChild(bd);
    }
    bd.style.display = 'flex';
    return bd.querySelector('.ca-box');
  }
  function fechar(){ var bd = document.getElementById('ca-bd'); if (bd) bd.remove(); }

  // ---------- tela de assinatura ----------
  function telaAssinar(ctx, c, papel, aoTerminar){
    // papel: 'associado' (contrato), 'termo' (termo do associado) — obrigatórios; 'interveniente' e 'diretoria'
    // (remuneração anual da Diretoria) — podem ficar para depois
    var interveniente = papel === 'interveniente';
    var adiavel = interveniente || papel === 'diretoria';
    var titulo, sub;
    if (interveniente) {
      titulo = 'Contrato de associação: sua assinatura como diretor interveniente';
      sub = 'O contrato de <b>' + esc(c.associadoNome) + '</b> aguarda sua assinatura como diretor interveniente' +
        (/coobrigado solid/i.test(c.textoFinal || '') ? ' e <b>coobrigado solidário</b>: pela cláusula 6.6, você responde pessoal, ilimitada e solidariamente com a sociedade pelas obrigações dela perante o associado' : '') +
        '. Você pode assinar agora ou depois.';
    } else if (papel === 'diretoria') {
      titulo = esc(c.tituloDoc || 'Remuneração fixa da Diretoria');
      sub = 'O documento de fixação da remuneração da Diretoria aguarda sua assinatura. Você pode assinar agora ou depois.';
    } else if (papel === 'termo') {
      titulo = esc(c.tituloDoc || 'Termo') + ': assinatura obrigatória';
      sub = 'A Diretoria enviou este termo do seu contrato de associação. Para continuar usando o Portal, leia e assine. Se tiver dúvidas, fale com a Diretoria antes de assinar.';
    } else {
      titulo = 'Contrato de associação: assinatura obrigatória';
      sub = 'Para continuar usando o Portal, leia o contrato e o Anexo I e assine. Se tiver dúvidas, fale com a Diretoria antes de assinar. Depois de assinado, a cópia fica disponível em PDF.';
    }
    var box = overlay();
    box.innerHTML =
      '<h2>' + titulo + '</h2>' +
      '<p class="ca-sub">' + sub + '</p>' +
      '<div class="ca-baixar"><span>Prefere ler com calma antes de assinar? Baixe ou imprima uma cópia.</span>' +
      '<button type="button" class="sec mini" id="ca-pdf" disabled>⬇ Baixar PDF</button>' +
      '<button type="button" class="sec mini" id="ca-imprimir" disabled>🖨 Imprimir</button><span class="ca-st" id="ca-st"></span></div>' +
      '<div class="ca-frame"><iframe id="ca-frame" title="Contrato de associação"></iframe></div>' +
      '<label class="ca-check"><input type="checkbox" id="ca-li"><span>' + (papel === 'associado' || interveniente ? 'Li o contrato e o Anexo I, entendi as condições e concordo com seus termos.' : 'Li o documento, entendi as condições e concordo com seus termos.') + '</span></label>' +
      '<label for="ca-senha">Sua senha do Portal</label><input type="password" id="ca-senha" autocomplete="current-password">' +
      '<label style="display:flex;justify-content:space-between;align-items:center;max-width:100%;">Assinatura (dedo ou mouse) <button type="button" class="sec mini" id="ca-limpar">Limpar</button></label>' +
      '<canvas id="ca-canvas"></canvas>' +
      '<div class="ca-err" id="ca-err"></div>' +
      '<div class="ca-acoes">' + (adiavel ? '<button type="button" class="sec" id="ca-depois">Assinar depois</button>' : '<button type="button" class="sec" id="ca-sair">Sair do Portal</button>') +
      '<button type="button" id="ca-assinar">✍ Assinar</button></div>';

    var frame = box.querySelector('#ca-frame');
    var bPdf = box.querySelector('#ca-pdf'), bImp = box.querySelector('#ca-imprimir'), st = box.querySelector('#ca-st');
    frame.onload = function(){
      try { frame.contentWindow.mostrarContrato(c); bPdf.disabled = false; bImp.disabled = false; } catch (e) {}
    };
    bPdf.onclick = function(){
      bPdf.disabled = true; st.textContent = 'Gerando PDF…';
      Promise.resolve().then(function(){ return frame.contentWindow.baixarPdfContrato(); })
        .then(function(){ st.textContent = 'PDF baixado. Confira na pasta de downloads.'; })
        .catch(function(e){ st.textContent = 'Não foi possível gerar o PDF: ' + (e && e.message || e); })
        .then(function(){ bPdf.disabled = false; });
    };
    bImp.onclick = function(){ try { frame.contentWindow.imprimirContrato(); } catch (e) { st.textContent = 'Não foi possível imprimir.'; } };
    frame.src = 'tools/contratos/associacao-documento.html?preview=1&t=' + Date.now();

    var registro = coletarRegistro();
    var cv = box.querySelector('#ca-canvas'), g = null, desenhou = false, desenhando = false;
    function prep(){
      var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#13233f'; desenhou = false;
    }
    function pos(e){ var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener('pointerdown', function(e){ e.preventDefault(); if (!g) prep(); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      desenhando = true; var p = pos(e); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + .1, p.y + .1); g.stroke(); desenhou = true; });
    cv.addEventListener('pointermove', function(e){ if (!desenhando) return; e.preventDefault(); var p = pos(e); g.lineTo(p.x, p.y); g.stroke(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev){ cv.addEventListener(ev, function(){ desenhando = false; }); });
    setTimeout(prep, 30);
    box.querySelector('#ca-limpar').onclick = prep;
    function png(){ var w = Math.min(600, cv.width), h = Math.round(cv.height * w / cv.width), t = document.createElement('canvas'); t.width = w; t.height = h; t.getContext('2d').drawImage(cv, 0, 0, w, h); return t.toDataURL('image/png'); }

    var sair = box.querySelector('#ca-sair');
    if (sair) sair.onclick = function(){ ctx.auth.signOut().catch(function(){}).then(function(){ location.reload(); }); };
    var depois = box.querySelector('#ca-depois');
    if (depois) depois.onclick = function(){ fechar(); if (aoTerminar) aoTerminar(); };

    var err = box.querySelector('#ca-err');
    box.querySelector('#ca-assinar').onclick = function(){
      var btn = this, senha = box.querySelector('#ca-senha').value;
      if (!box.querySelector('#ca-li').checked) { err.textContent = 'Marque que leu e concorda com o contrato.'; return; }
      if (!senha) { err.textContent = 'Digite sua senha do Portal.'; return; }
      if (!desenhou) { err.textContent = 'Faça sua assinatura no quadro.'; return; }
      err.textContent = '';
      btn.disabled = true; btn.textContent = 'Conferindo…';
      var user = ctx.auth.currentUser;
      // o texto que a pessoa assina tem de ser exatamente o que a sociedade assinou
      sha256(c.textoFinal || '').then(function(h){
        if (c.hashTexto && h && h !== c.hashTexto) throw { code: 'texto-alterado' };
        return user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, senha));
      }).then(function(){ return user.getIdToken(true); }).then(function(){
        btn.textContent = 'Registrando…';
        return comTempo(registro, 8000, null);
      }).then(function(reg){
        var ts = firebase.firestore.FieldValue.serverTimestamp();
        var ass = { uid: user.uid, assinaturaPng: png(), assinadoEm: ts, assinadoEmISO: new Date().toISOString(),
          registroAssinatura: reg || { ip: '', localizacao: { status: 'não obtida' } }, metodo: 'Assinatura desenhada + confirmação da senha do Portal' };
        var patch = interveniente ? { interveniente: ass } : { status: 'assinado', associado: ass, assinadoEm: ts, assinadoEmISO: ass.assinadoEmISO };
        return ctx.db.collection('contratosAssociacao').doc(c.id).update(patch);
      }).then(function(){
        box.innerHTML = '<h2>✓ Assinado</h2><p class="ca-ok">Sua assinatura foi registrada. Você pode baixar a cópia em PDF agora ou mais tarde, pelo link abaixo.</p>' +
          '<div class="ca-acoes" style="justify-content:flex-start;"><button type="button" class="sec" id="ca-pdf">Abrir o documento (PDF)</button><button type="button" id="ca-continuar">Continuar para o Portal</button></div>';
        box.querySelector('#ca-pdf').onclick = function(){ window.open('tools/contratos/associacao-documento.html?id=' + encodeURIComponent(c.id), '_blank', 'noopener'); };
        box.querySelector('#ca-continuar').onclick = function(){ fechar(); if (aoTerminar) aoTerminar(); };
      }).catch(function(e){
        var code = e && e.code;
        if (code === 'texto-alterado') err.textContent = 'O texto deste contrato não confere com o que a sociedade assinou. Não assine e avise a Diretoria.';
        else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') err.textContent = 'Senha incorreta.';
        else if (code === 'auth/too-many-requests') err.textContent = 'Muitas tentativas com senha errada. Aguarde alguns minutos.';
        else if (code === 'permission-denied') err.textContent = 'Sem permissão para registrar a assinatura. Avise a Diretoria (as regras novas do Firestore precisam ser publicadas).';
        else err.textContent = 'Não foi possível assinar: ' + (e && e.message ? e.message : e);
      }).then(function(){ if (btn.isConnected) { btn.disabled = false; btn.textContent = '✍ Assinar'; } });
    };
  }

  function telaAguardando(ctx){
    var box = overlay();
    box.innerHTML = '<h2>Contrato de associação</h2>' +
      '<p class="ca-ok">O acesso ao Portal para advogados associados é liberado depois da assinatura do contrato de associação. ' +
      'Seu contrato está sendo preparado pela Diretoria. Assim que for enviado, a tela de assinatura aparece aqui no seu próximo acesso.</p>' +
      '<div class="ca-acoes"><button type="button" class="sec" id="ca-recarregar">Verificar de novo</button><button type="button" id="ca-sair">Sair do Portal</button></div>';
    box.querySelector('#ca-sair').onclick = function(){ ctx.auth.signOut().catch(function(){}).then(function(){ location.reload(); }); };
    box.querySelector('#ca-recarregar').onclick = function(){ location.reload(); };
  }

  function telaLembreteDiretoria(ano){
    var box = overlay();
    box.innerHTML = '<h2>Remuneração fixa da Diretoria de ' + esc(ano) + '</h2>' +
      '<p class="ca-ok">Até 25 de janeiro de cada ano, a remuneração fixa (pró-labore) da Diretoria precisa ser fixada e assinada, conforme o item A2.4 dos contratos de associação. A de ' + esc(ano) + ' ainda não foi feita.</p>' +
      '<p class="ca-sub">Abra <b>Contratos › Contrato de associação › Remuneração fixa da Diretoria</b> e clique em <b>Fixar valores</b>. O documento é gerado e guardado com as assinaturas.</p>' +
      '<div class="ca-acoes"><button type="button" id="ca-ok-lembrete">Entendi</button></div>';
    box.querySelector('#ca-ok-lembrete').onclick = fechar;
  }

  function porData(a, b){ return String(b.criadoEmISO || '').localeCompare(String(a.criadoEmISO || '')); }

  window.FBContratoAssociacao = {
    verificar: function(ctx){
      var perfil = ctx.perfil || {}, uid = perfil.uid;
      if (!uid || !ctx.db) return Promise.resolve();
      var meus = ctx.db.collection('contratosAssociacao').where('associadoUid', '==', uid).get()
        .then(function(s){ return s.docs.map(function(d){ var x = d.data(); x.id = d.id; return x; }); }).catch(function(){ return []; });
      var comoDiretor = ctx.db.collection('contratosAssociacao').where('diretorUid', '==', uid).get()
        .then(function(s){ return s.docs.map(function(d){ var x = d.data(); x.id = d.id; return x; }); }).catch(function(){ return []; });
      var regras = ctx.db.collection('contratosAssociacaoConfig').doc('regras').get()
        .then(function(d){ return d.exists ? d.data() : {}; }).catch(function(){ return {}; });
      // administrador: a partir de 25 de janeiro, lembra de fixar a remuneração da Diretoria do ano (item A2.4)
      var hoje = new Date(), ano = String(hoje.getFullYear());
      var diretoria = (perfil.role === 'admin' && hoje >= new Date(hoje.getFullYear(), 0, 25))
        ? ctx.db.collection('contratosAssociacao').where('tipo', '==', 'prolabore').get()
            .then(function(s){ return s.docs.some(function(d){ var x = d.data(); return String(x.ano) === ano && x.status !== 'cancelado'; }); }).catch(function(){ return true; })
        : Promise.resolve(true);
      return Promise.all([meus, comoDiretor, regras, diretoria]).then(function(r){
        var lista = r[0].sort(porData), dir = r[1].sort(porData), cfg = r[2], diretoriaOk = r[3];
        function ehContrato(c){ return !c.tipo || c.tipo === 'contrato'; }
        // fila: primeiro o que é obrigatório (contrato, termos), depois o que pode esperar
        var fila = [];
        lista.filter(function(c){ return c.status === 'aguardando_associado' && ehContrato(c); }).slice(0, 1).forEach(function(c){ fila.push([c, 'associado']); });
        lista.filter(function(c){ return c.status === 'aguardando_associado' && c.tipo === 'termo'; }).reverse().forEach(function(c){ fila.push([c, 'termo']); });
        var obrigatorios = fila.length;
        lista.filter(function(c){ return c.status === 'aguardando_associado' && c.tipo === 'prolabore'; }).forEach(function(c){ fila.push([c, 'diretoria']); });
        dir.filter(function(c){ return !c.interveniente && (c.status === 'aguardando_associado' || c.status === 'assinado'); }).forEach(function(c){ fila.push([c, 'interveniente']); });
        function lembrarDiretoria(){ if (!diretoriaOk) telaLembreteDiretoria(ano); }
        function proximo(i){ if (i < fila.length) telaAssinar(ctx, fila[i][0], fila[i][1], function(){ proximo(i + 1); }); else lembrarDiretoria(); }
        var assinado = lista.some(function(c){ return c.status === 'assinado' && ehContrato(c); });
        if (!obrigatorios && cfg.exigirAssinatura && perfil.tipoColaborador === 'associado' && perfil.role !== 'admin' && !assinado) { telaAguardando(ctx); return 'aguardando'; }
        proximo(0);
        return obrigatorios ? 'assinar' : (fila.length ? 'pendente' : (diretoriaOk ? 'livre' : 'lembrete'));
      });
    }
  };
})();
