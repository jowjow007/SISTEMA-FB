// ============================================================
// Autorização para liberar ÁREAS RESTRITAS (Contratos, Remuneração variável, Gestão › Colaboradores e
// Números › Clientes / Juízo & Ação / Efetividade).
// Mostra o que vai ser liberado e para quem, pede a senha de quem está logado (reautenticação no Firebase
// Auth) e registra em auditoriaSeguranca. As regras do Firestore só aceitam a liberação até 10 minutos
// depois da senha (auth_time), então pular esta tela não basta para liberar.
// Usado em Administração › Usuários (index.html) e em Remuneração variável ("Pode ver").
// ============================================================
(function () {
  function el(tag, estilo, texto) {
    var e = document.createElement(tag);
    if (estilo) e.setAttribute('style', estilo);
    if (texto != null) e.textContent = texto;
    return e;
  }

  // opcoes: { pessoa: 'Nome', itens: ['Contratos', ...] } -> Promise resolvida depois da senha conferida
  window.autorizarAreaRestrita = function (opcoes) {
    return new Promise(function (resolve, reject) {
      var fundo = el('div', 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px;');
      var caixa = el('form', 'background:var(--panel,#211918);color:var(--paper,#f3ede9);border:1px solid #c9a24a;border-radius:12px;max-width:440px;width:100%;box-sizing:border-box;padding:20px 22px;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.5);');
      caixa.appendChild(el('h3', 'margin:0 0 8px;font-size:17px;', '🔒 Liberar área restrita'));
      var p = el('p', 'margin:0 0 6px;', 'Você está liberando para ');
      p.appendChild(el('b', null, opcoes.pessoa || 'esta pessoa'));
      p.appendChild(document.createTextNode(':'));
      caixa.appendChild(p);
      var ul = el('ul', 'margin:0 0 12px;padding-left:20px;');
      (opcoes.itens || []).forEach(function (i) { ul.appendChild(el('li', null, i)); });
      caixa.appendChild(ul);
      caixa.appendChild(el('label', 'display:block;margin-bottom:6px;', 'Confirme com a sua senha do portal'));
      var senha = el('input', 'width:100%;box-sizing:border-box;padding:9px 10px;border-radius:6px;border:1px solid var(--line-strong,#5a4a46);background:var(--panel-2,#2c2221);color:inherit;font:inherit;');
      senha.type = 'password'; senha.autocomplete = 'current-password'; senha.required = true; senha.id = 'ar-senha';
      caixa.appendChild(senha);
      var erro = el('p', 'color:#ff8a80;min-height:18px;margin:8px 0;');
      caixa.appendChild(erro);
      var botoes = el('div', 'display:flex;gap:8px;justify-content:flex-end;');
      var cancelar = el('button', 'padding:8px 14px;border-radius:6px;border:1px solid var(--line-strong,#5a4a46);background:transparent;color:inherit;cursor:pointer;', 'Cancelar');
      cancelar.type = 'button';
      var liberar = el('button', 'padding:8px 14px;border-radius:6px;border:0;background:#b8322a;color:#fff;cursor:pointer;font-weight:600;', 'Liberar');
      liberar.type = 'submit'; liberar.id = 'ar-liberar';
      botoes.appendChild(cancelar); botoes.appendChild(liberar);
      caixa.appendChild(botoes);
      fundo.appendChild(caixa);
      document.body.appendChild(fundo);
      senha.focus();

      function fechar() { if (fundo.parentNode) fundo.parentNode.removeChild(fundo); }
      cancelar.onclick = function () { fechar(); reject(new Error('cancelado')); };
      caixa.onsubmit = function (e) {
        e.preventDefault();
        var u = firebase.auth().currentUser;
        if (!u || !u.email) { erro.textContent = 'Sessão encerrada. Entre de novo no portal.'; return; }
        liberar.disabled = true; erro.textContent = '';
        var cred = firebase.auth.EmailAuthProvider.credential(u.email, senha.value);
        u.reauthenticateWithCredential(cred)
          .then(function () { return u.getIdToken(true); })   // token novo, com auth_time de agora, para as regras
          .then(function () { fechar(); resolve(); })
          .catch(function (err) {
            liberar.disabled = false;
            erro.textContent = /wrong-password|invalid-credential|invalid-login/.test(err && err.code || '')
              ? 'Senha incorreta.' : 'Não foi possível conferir a senha (' + (err && err.code || 'erro') + ').';
          });
      };
    });
  };

  // registro da decisão (quem, para quem, o que entrou e o que saiu); falha aqui não desfaz a liberação
  window.registrarAreaRestrita = function (dados) {
    var u = firebase.auth().currentUser;
    return firebase.firestore().collection('auditoriaSeguranca').add(Object.assign({
      tipo: 'areasRestritas', porUid: u ? u.uid : '', em: firebase.firestore.FieldValue.serverTimestamp()
    }, dados)).catch(function (e) { console.warn('auditoria da área restrita não gravada:', e.message); });
  };
})();
