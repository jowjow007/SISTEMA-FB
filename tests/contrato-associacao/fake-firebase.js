// Firebase compat FALSO, em memória, só para os testes locais (nada vai para a rede).
(function(){
  var store = window.__FAKE_STORE || {};      // { 'colecao/doc': dados }
  window.__FAKE_STORE = store;
  var usuario = window.__FAKE_USER || null;   // { uid, email, senha }
  var SERVER_TS = { __ts: true };
  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function resolverTs(o){
    if (o && o.__ts) return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, toDate: function(){ return new Date(this.seconds * 1000); } };
    if (o && typeof o === 'object' && !Array.isArray(o)) { var r = {}; Object.keys(o).forEach(function(k){ r[k] = resolverTs(o[k]); }); return r; }
    return o;
  }
  function snap(id, path){
    var d = store[path];
    return { id: id, exists: !!d, data: function(){ return d ? d : undefined; } };
  }
  var seq = Date.now() % 100000;
  function salvar(){ if (window.__DEMO) try { localStorage.setItem('demoStore', JSON.stringify(store)); } catch (e) {} }
  function docRef(col, id){
    var path = col + '/' + id;
    return {
      id: id,
      get: function(){ window.__FAKE_LOG.push(['get', path]); return Promise.resolve(snap(id, path)); },
      set: function(data, opt){ window.__FAKE_LOG.push(['set', path, clone(data)]);
        store[path] = opt && opt.merge ? Object.assign({}, store[path] || {}, resolverTs(data)) : resolverTs(data); salvar(); return Promise.resolve(); },
      onSnapshot: function(fn){ var self = this; setTimeout(function(){ self.get().then(fn); }, 0); return function(){}; },
      delete: function(){ delete store[path]; return Promise.resolve(); },
      update: function(data){ window.__FAKE_LOG.push(['update', path, clone(data)]);
        if (!store[path]) return Promise.reject({ code: 'not-found', message: 'not found' });
        if (window.__FAKE_NEGAR_UPDATE) return Promise.reject({ code: 'permission-denied', message: 'negado' });
        store[path] = Object.assign({}, store[path], resolverTs(data)); salvar(); return Promise.resolve(); }
    };
  }
  function query(col, filtros){
    return {
      where: function(c, op, v){ return query(col, filtros.concat([[c, op, v]])); },
      orderBy: function(){ return query(col, filtros); },
      limit: function(){ return query(col, filtros); },
      onSnapshot: function(fn){ this.get().then(fn); return function(){}; },
      get: function(){
        var docs = Object.keys(store).filter(function(p){ return p.indexOf(col + '/') === 0 && p.split('/').length === 2; }).map(function(p){
          return snap(p.split('/')[1], p);
        }).filter(function(s){
          return filtros.every(function(f){ var v = s.data()[f[0]]; return f[1] === '==' ? v === f[2] : f[1] === 'in' ? f[2].indexOf(v) !== -1 : true; });
        });
        return Promise.resolve({ docs: docs, forEach: function(fn){ docs.forEach(fn); }, size: docs.length, empty: !docs.length, docChanges: function(){ return []; } });
      }
    };
  }
  var db = {
    collection: function(col){
      var q = query(col, []);
      q.doc = function(id){ return docRef(col, id || ('auto' + (++seq))); };
      q.add = function(data){ var id = 'ctr' + (++seq); var r = docRef(col, id); return r.set(data).then(function(){ return r; }); };
      return q;
    }
  };
  var authListeners = [];
  var auth = {
    get currentUser(){ return usuario ? Object.assign({}, usuario, {
      reauthenticateWithCredential: function(cred){ window.__FAKE_LOG.push(['reauth', cred.senha]);
        return (cred.senha === usuario.senha || (window.__DEMO && cred.senha)) ? Promise.resolve() : Promise.reject({ code: 'auth/wrong-password', message: 'senha' }); },
      getIdToken: function(){ return Promise.resolve('token'); }
    }) : null; },
    onAuthStateChanged: function(fn){ authListeners.push(fn); setTimeout(function(){ fn(auth.currentUser); }, 0); return function(){}; },
    signOut: function(){ window.__FAKE_LOG.push(['signOut']); usuario = null; if (window.__DEMO) { location.href = '/__demo/'; return new Promise(function(){}); } return Promise.resolve(); }
  };
  window.__FAKE_LOG = window.__FAKE_LOG || [];
  var authFn = function(){ return auth; };
  authFn.EmailAuthProvider = { credential: function(email, senha){ return { email: email, senha: senha }; } };
  var fsFn = function(){ return db; };
  fsFn.FieldValue = { serverTimestamp: function(){ return SERVER_TS; }, delete: function(){ return null; } };
  function tsDe(ms){ return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: function(){ return new Date(ms); }, toMillis: function(){ return ms; } }; }
  fsFn.Timestamp = { now: function(){ return tsDe(Date.now()); }, fromMillis: tsDe, fromDate: function(d){ return tsDe(d.getTime()); } };
  fsFn.FieldValue.increment = function(n){ return n; }; fsFn.FieldValue.arrayUnion = function(){ return Array.prototype.slice.call(arguments); };
  fsFn.FieldValue.arrayRemove = function(){ return []; };
  window.firebase = { initializeApp: function(){ return { auth: authFn }; }, auth: authFn, firestore: fsFn };
})();
