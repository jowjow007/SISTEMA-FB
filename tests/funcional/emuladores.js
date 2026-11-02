// Injetado pelo servidor de teste (servidor.py) logo depois dos scripts do Firebase de cada página.
// Troca o projeto por um projeto "demo-" e liga Auth, Firestore e Storage aos emuladores locais:
// nenhuma chamada sai para o projeto de produção (o navegador de teste ainda bloqueia os domínios do Google).
(function () {
  if (!window.firebase || firebase.__emuladores) return;
  firebase.__emuladores = true;
  var original = firebase.initializeApp.bind(firebase);
  firebase.initializeApp = function (cfg, nome) {
    var c = Object.assign({}, cfg, {
      apiKey: 'demo-key', authDomain: '127.0.0.1', projectId: 'demo-portal-func',
      storageBucket: 'demo-portal-func.appspot.com', appId: 'demo-app'
    });
    var app = original(c, nome);
    try { app.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); } catch (e) {}
    try { app.firestore().useEmulator('127.0.0.1', 8080); } catch (e) { console.warn('emulador firestore:', e.message); }
    try { if (app.storage) app.storage().useEmulator('127.0.0.1', 9199); } catch (e) {}
    return app;
  };
})();
