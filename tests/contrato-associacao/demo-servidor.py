# Demonstração LOCAL do contrato de associação, sem senha e sem internet para o Firebase.
# Usa o Firebase FALSO (fake-firebase.js) com dados fictícios guardados só no navegador (localStorage).
# Nada aqui toca o portal de verdade.   Uso:  python tests/contrato-associacao/demo-servidor.py   →  http://localhost:8001/__demo/
import functools, http.server, json, os, re, socketserver

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))
PORTA = 8001
MODELO = os.path.join(REPO, 'privado', 'contrato-associacao-modelo.txt')

USERS = {
  'adm':   {'role': 'admin', 'displayName': 'Jonathan Silva Fonseca', 'email': 'jonathan@exemplo.test', 'cpf': '11122233344', 'oab': '163443/MG',
            'estadoCivil': 'Casado', 'nacionalidade': 'brasileiro', 'tabs': ['x'], 'acesso': 'ativo'},
  'hecy':  {'role': 'membro', 'displayName': 'Hecy Braga de Oliveira', 'email': 'hecy@exemplo.test', 'cpf': '55566677788', 'oab': '95948/MG',
            'estadoCivil': 'Divorciado', 'nacionalidade': 'brasileiro', 'tabs': ['x'], 'acesso': 'ativo'},
  'assoc1': {'role': 'membro', 'tipoColaborador': 'associado', 'displayName': 'Fulana de Teste Silva', 'email': 'fulana@exemplo.test',
            'cpf': '12345678909', 'rg': 'MG-12.345.678 SSP/MG', 'oab': '199999/MG', 'estadoCivil': 'Solteira', 'nacionalidade': 'brasileira',
            'telefone': '34999990000', 'endereco': 'Rua Exemplo, 100, Bairro Centro, CEP 38400-000, Uberlândia/MG', 'dataIngresso': '2026-12-01',
            'pixTipo': 'CPF', 'pixChave': '123.456.789-09', 'remuneracao': 'R$ 3.500,00', 'tabs': ['x'], 'acesso': 'ativo'},
  'novo':  {'role': 'membro', 'tipoColaborador': 'associado', 'displayName': 'Novo Associado (cadastro incompleto)', 'email': 'novo@exemplo.test',
            'tabs': ['x'], 'acesso': 'ativo'},
}
def semente():
    st = {f'users/{k}': v for k, v in USERS.items()}
    st['perfis/assoc1'] = {'displayName': 'Fulana de Teste Silva', 'birthDate': '1990-03-13'}
    if os.path.exists(MODELO):
        st['contratosAssociacaoConfig/modelo'] = {'texto': open(MODELO, encoding='utf8').read(), 'versao': 'demonstracao',
                                                 'titularUid': 'adm', 'diretorUid': 'hecy'}
    st['contratosAssociacaoConfig/regras'] = {'exigirAssinatura': False}
    return st

PRELUDIO = '''(function(){
  window.__DEMO = true;
  var USERS = %s, SEMENTE = %s;
  var q = new URLSearchParams(location.search).get('__como');
  try { if (q) localStorage.setItem('demoComo', q); } catch (e) {}
  var como = 'adm'; try { como = localStorage.getItem('demoComo') || 'adm'; } catch (e) {}
  var st = null; try { st = JSON.parse(localStorage.getItem('demoStore') || 'null'); } catch (e) {}
  window.__FAKE_STORE = st || SEMENTE;
  var u = USERS[como] || USERS.adm;
  window.__FAKE_USER = { uid: USERS[como] ? como : 'adm', email: u.email, senha: '*' };
  window.__PERFIL = Object.assign({ uid: window.__FAKE_USER.uid }, u);
  // aviso fixo de demonstração
  document.addEventListener('DOMContentLoaded', function(){
    if (window.top !== window) return;
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99999;background:#7a5a00;color:#fff;font:600 12px Segoe UI,sans-serif;padding:7px 11px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.4)';
    d.innerHTML = 'DEMONSTRAÇÃO (dados fictícios) — entrando como ' + (u.displayName || como) + ' · <a href="/__demo/" style="color:#ffe9a8">menu</a>';
    document.body.appendChild(d);
  });
})();
'''

MENU = '''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demonstração — Contrato de associação</title>
<style>body{margin:0;background:#161010;color:#ece6e1;font-family:Segoe UI,system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:30px 18px}
h1{font-family:Georgia,serif;font-weight:600;font-size:1.4rem;margin:0 0 6px}p{color:#b9aea9;line-height:1.55;font-size:.92rem}
a.c{display:block;background:#211918;border:1px solid rgba(236,230,225,.18);border-radius:12px;padding:16px 18px;margin:12px 0;color:inherit;text-decoration:none}
a.c:hover{border-color:#b8362e}a.c b{display:block;font-size:1rem;margin-bottom:4px}a.c span{color:#9c908b;font-size:.84rem;line-height:1.5}
button{background:transparent;color:#ffb4ae;border:1px solid rgba(255,180,174,.4);border-radius:8px;padding:8px 14px;cursor:pointer;font:inherit;margin-top:14px}</style></head>
<body><main><h1>Demonstração: contrato de associação</h1>
<p>Versão para ver o funcionamento <b>sem senha</b>, com pessoas e dados <b>fictícios</b>. Nada é gravado no portal de verdade. Tudo fica só neste navegador. Em qualquer pedido de senha, digite qualquer coisa.</p>
<a class="c" href="/tools/contratos/index.html?__como=adm"><b>1. Sou o administrador (Jonathan)</b><span>Abre a aba Contratos. Vá na sub-aba <b>Contrato de associação</b>, clique em <b>Preparar contrato</b> da Fulana, preencha, pré-visualize e clique em <b>Assinar pela sociedade e enviar</b>. O modelo já vem carregado.</span></a>
<a class="c" href="/__demo-portal.html?__como=assoc1"><b>2. Sou a associada (Fulana)</b><span>Simula o login dela. Se você já enviou o contrato no passo 1, aparece a tela obrigatória de assinatura. Se não, o "portal" abre livre.</span></a>
<a class="c" href="/__demo-portal.html?__como=hecy"><b>3. Sou o Dr. Hecy (diretor interveniente)</b><span>Simula o login dele. Aparece a assinatura como interveniente, com a opção de assinar depois.</span></a>
<a class="c" href="/__demo-portal.html?__como=novo"><b>4. Sou um associado novo, ainda sem contrato</b><span>Mostra o que acontece quando a chave "Exigir contrato assinado" está ligada (ligue na Configuração, no passo 1).</span></a>
<a class="c" href="/tools/contratos/index.html?__como=adm"><b>5. Voltar ao administrador</b><span>Para ver o status "Assinado", abrir o documento final com as três assinaturas e baixar o PDF.</span></a>
<button onclick="localStorage.removeItem('demoStore');localStorage.removeItem('demoComo');alert('Demonstração zerada.');">Recomeçar do zero</button>
</main></body></html>'''

PORTAL = '''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portal (demonstração)</title><script src="/__demo/fake.js"></script><script src="/contrato-associacao.js"></script>
<style>body{margin:0;background:#161010;color:#ece6e1;font-family:Segoe UI,system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:40px 18px;text-align:center}
h1{font-family:Georgia,serif;font-weight:600}p{color:#b9aea9}</style></head>
<body><main><h1>Portal Fonseca e Braga</h1><p id="st">Entrando…</p><p><a href="/__demo/" style="color:#d4af6a">voltar ao menu da demonstração</a></p></main>
<script>firebase.initializeApp({});
FBContratoAssociacao.verificar({ db: firebase.firestore(), auth: firebase.auth(), perfil: window.__PERFIL }).then(function(r){
  document.getElementById('st').textContent = r === 'livre' ? '✓ Acesso liberado. Aqui seria o portal normal de ' + (window.__PERFIL.displayName || '') + '.'
    : r === 'aguardando' ? 'Acesso bloqueado até a assinatura do contrato.' : 'O acesso é liberado depois de assinar o contrato. Depois de assinar, volte ao menu para continuar a demonstração.';
});</script></body></html>'''

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def enviar(self, corpo, tipo):
        b = corpo.encode('utf8')
        self.send_response(200); self.send_header('Content-Type', tipo + '; charset=utf-8'); self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        caminho = self.path.split('?')[0]
        if caminho in ('/', '/__demo', '/__demo/'): return self.enviar(MENU, 'text/html')
        if caminho == '/__demo-portal.html': return self.enviar(PORTAL, 'text/html')
        if caminho == '/__demo/fake.js':
            js = PRELUDIO % (json.dumps(USERS), json.dumps(semente())) + open(os.path.join(AQUI, 'fake-firebase.js'), encoding='utf8').read()
            return self.enviar(js, 'application/javascript')
        if caminho == '/sw.js': return self.enviar('/* sem service worker na demonstração */', 'application/javascript')
        if caminho.endswith('.html'):
            arq = os.path.join(REPO, caminho.lstrip('/').replace('/', os.sep))
            if os.path.isfile(arq):
                h = open(arq, encoding='utf8').read()
                h = re.sub(r'\s+integrity="[^"]+"', '', h)
                h = re.sub(r'<script src="https://www\.gstatic\.com/firebasejs/[^"]*firebase-app-compat\.js"[^>]*></script>', '<script src="/__demo/fake.js"></script>', h)
                h = re.sub(r'<script src="https://www\.gstatic\.com/firebasejs/[^"]*"[^>]*></script>', '', h)
                return self.enviar(h, 'text/html')
        return super().do_GET()

if __name__ == '__main__':
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORTA), functools.partial(H, directory=REPO))
    print(f'Demonstração em http://localhost:{PORTA}/__demo/', flush=True)
    srv.serve_forever()
