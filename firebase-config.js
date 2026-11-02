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
