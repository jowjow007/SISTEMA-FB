// ============================================================
// CONFIGURAÇÃO DO FIREBASE — Portal Fonseca e Braga
// ============================================================
// Preencha estes valores com os dados do SEU projeto Firebase.
// Onde encontrar: console.firebase.google.com > (seu projeto) >
// ⚙️ Configurações do projeto > "Seus apps" > app da Web > SDK setup and configuration.
//
// Este arquivo NÃO é secreto — a apiKey do Firebase é pública por
// design (ela só identifica o projeto). Quem protege os dados de
// verdade são as REGRAS do Firestore (veja README-SETUP.md).
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyAWClOREaOXYupgzN3t2eJCddm8FcQTjfE",
  authDomain: "sistema-fb-4cce5.firebaseapp.com",
  projectId: "sistema-fb-4cce5",
  storageBucket: "sistema-fb-4cce5.firebasestorage.app",
  messagingSenderId: "586536122095",
  appId: "1:586536122095:web:6d4d5c83d63193f2194d1a"
};

// ------------------------------------------------------------
// Uma conta por vez, sem misturar dados entre contas.
// O login do Firebase vale para todas as abas do site no mesmo navegador. Quando a conta desta página
// muda depois de carregada (saiu, ou entrou com outra conta em outra aba), a página recarrega e começa
// do zero: na tela de login ou já com a conta nova, sem nada da anterior na tela nem na memória.
// Exceções: entrar a partir da tela de login (não havia conta) e as saídas que a própria página faz e
// trata (ela marca window.__portalSaidaLocal = true antes de chamar signOut).
// Para usar duas contas ao mesmo tempo, use uma janela anônima ou outro navegador.
// ------------------------------------------------------------
(function () {
  function vigiarConta() {
    if (!window.firebase || !firebase.apps || !firebase.apps.length || typeof firebase.auth !== 'function') return false;
    var contaDaPagina;   // undefined até a primeira notificação do Firebase
    firebase.auth().onAuthStateChanged(function (u) {
      var uid = u ? u.uid : null;
      if (contaDaPagina === undefined || uid === contaDaPagina) { contaDaPagina = uid; return; }
      if (contaDaPagina === null || window.__portalSaidaLocal) {
        window.__portalSaidaLocal = false; contaDaPagina = uid; return;
      }
      location.reload();
    });
    return true;
  }
  // as páginas chamam initializeApp depois de carregar este arquivo: espera o app existir
  if (!vigiarConta()) {
    var tentativas = 0, t = setInterval(function () { if (vigiarConta() || ++tentativas > 200) clearInterval(t); }, 50);
  }
})();

// ------------------------------------------------------------
// Modo offline — SÓ no app para Windows (app-windows/, que se identifica com "PortalFBApp" no navegador).
// O Firestore guarda no computador os dados já abertos e enfileira o que for gravado sem internet; quando a
// conexão volta, envia sozinho. No navegador comum nada muda (computadores compartilhados não guardam dados).
// O cache local NÃO passa pelas regras de acesso, então ele pertence a uma conta só: ao sair, ou se outra
// conta entrar neste computador, o cache é apagado antes de continuar.
// ------------------------------------------------------------
(function () {
  if (!/PortalFBApp\//.test(navigator.userAgent || '')) return;
  window.__portalApp = true;
  var DONO = 'fb-offline-uid';
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  function instalar() {
    if (!window.firebase || typeof firebase.firestore !== 'function' || firebase.firestore.__offline) return !!(window.firebase && firebase.firestore && firebase.firestore.__offline);
    var original = firebase.firestore, ligado = false;
    var envolto = function () {
      var db = original.apply(this, arguments);
      if (!ligado) {
        ligado = true;
        try {
          db.enablePersistence({ synchronizeTabs: true }).then(function () { window.__portalOffline = true; })
            .catch(function () { window.__portalOffline = false; });   // outra janela antiga aberta, ou sem espaço: segue só online
        } catch (e) {}
      }
      return db;
    };
    // FieldValue, Timestamp etc. continuam acessíveis em firebase.firestore.X
    Object.getOwnPropertyNames(original).forEach(function (k) {
      if (k in envolto && k !== 'prototype') return;
      try { Object.defineProperty(envolto, k, Object.getOwnPropertyDescriptor(original, k)); } catch (e) {}
    });
    envolto.__offline = true;
    firebase.firestore = envolto;
    return true;
  }
  if (!instalar()) {
    var n = 0, t = setInterval(function () { if (instalar() || ++n > 200) clearInterval(t); }, 10);
  }

  // apaga o cache desta conta (saída) ou de outra conta (troca), e recarrega limpo — só a janela principal decide
  if (window.top !== window) return;
  var vigiando = false;
  function vigiar() {
    if (vigiando || !window.firebase || !firebase.apps || !firebase.apps.length || typeof firebase.auth !== 'function') return vigiando;
    vigiando = true;
    firebase.auth().onAuthStateChanged(function (u) {
      var dono = ler(DONO), uid = u ? u.uid : null;
      if (uid && !dono) { gravar(DONO, uid); return; }
      if ((uid && dono && uid !== dono) || (!uid && dono)) {
        var db = firebase.firestore();
        db.terminate().then(function () { return db.clearPersistence(); }).catch(function () {})
          .then(function () { gravar(DONO, uid); location.reload(); });
      }
    });
    return true;
  }
  if (!vigiar()) {
    var m = 0, t2 = setInterval(function () { if (vigiar() || ++m > 200) clearInterval(t2); }, 50);
  }
})();
