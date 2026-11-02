# -*- coding: utf-8 -*-
"""
Testes funcionais com login (revisão de segurança 01/11/2026).

Roda o portal de verdade (index.html e ferramentas) num navegador de teste, contra os emuladores de
Auth, Firestore e Storage. Dados 100% fictícios; nenhum pedido sai para o projeto de produção: as páginas
são apontadas para um projeto "demo-" (emuladores.js) e o navegador ABORTA qualquer pedido aos domínios do
Google/Firebase/Worker de produção — se algum acontecer, o teste reprova.

Uso (de dentro de tests/):
  firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/funcional.py"
Variáveis: REGRAS_ANTIGAS=<arquivo .rules> (regras de antes da revisão, para o passo da migração).
"""
import base64, http.server, io, json, os, re, socketserver, sys, threading, time, urllib.parse, importlib.util
import requests
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
AQUI = os.path.dirname(os.path.abspath(__file__))
PROJ = 'demo-portal-func'
BUCKET = PROJ + '.appspot.com'
AUTH = 'http://127.0.0.1:9099'
FS = 'http://127.0.0.1:8080'
ST = 'http://127.0.0.1:9199'
BASE = 'http://127.0.0.1:8765'
DOCS = f'{FS}/v1/projects/{PROJ}/databases/(default)/documents'
DONO = {'Authorization': 'Bearer owner'}
SENHA = 'senha-ficticia-123'
WORKER = 'portal-fb-gemini.jowjow07.workers.dev'
PRODUCAO = ('firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com',
            'firebasestorage.googleapis.com', 'firebaseinstallations.googleapis.com', 'firebase.googleapis.com',
            'generativelanguage.googleapis.com', 'www.googleapis.com', 'firebaseio.com', 'workers.dev',
            'accounts.google.com', 'apis.google.com')

resultados = []          # (grupo, nome, ok, detalhe)
nao_testado = []         # (o quê, por quê)
pedidos_producao = []    # qualquer tentativa de falar com produção
console = []             # mensagens do console das páginas (diagnóstico)
assistente_pedidos = []  # cabeçalhos Authorization recebidos pelo Worker falso
ciencias = []            # (quem, quantos comunicados) registrados pela interface


def caso(grupo, nome, cond, detalhe=''):
    resultados.append((grupo, nome, bool(cond), detalhe))


def tentar(grupo, nome, fn):
    try:
        ok, det = fn()
        caso(grupo, nome, ok, det)
    except Exception as e:
        caso(grupo, nome, False, 'exceção: ' + str(e).split('\n')[0][:200])


# ---------------------------------------------------------------- servidor do site com injeção
SDK_RE = re.compile(r'(<script src="https://www\.gstatic\.com/firebasejs/[^"]+-compat\.js"[^>]*></script>)(?![\s\S]*firebasejs/[^"]+-compat\.js)')


class Site(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def log_message(self, *a):
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in (('Access-Control-Allow-Origin', '*'), ('Access-Control-Allow-Headers', 'Content-Type, Authorization'), ('Access-Control-Allow-Methods', 'POST, OPTIONS')):
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        # Worker do Assistente falso: registra o cabeçalho Authorization e devolve uma resposta no formato do Gemini
        if urllib.parse.urlparse(self.path).path == '/__worker':
            n = int(self.headers.get('Content-Length') or 0); self.rfile.read(n)
            assistente_pedidos.append(self.headers.get('Authorization') or '')
            corpo = json.dumps({'candidates': [{'content': {'parts': [{'text': 'Resposta fictícia do assistente.'}]}}]}).encode()
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(corpo))); self.end_headers(); self.wfile.write(corpo); return
        self.send_response(404); self.end_headers()

    def do_GET(self):
        caminho = urllib.parse.urlparse(self.path).path
        if caminho.startswith('/tools/') and self.headers.get('Sec-Fetch-Dest') == 'iframe':
            # as abas abrem a ferramenta num iframe; no teste cada ferramenta abre na própria página
            return self._enviar('<html><body>ferramenta desativada no iframe durante o teste</body></html>'.encode(), 'text/html; charset=utf-8')
        if caminho == '/tools/assistente-ia/gemini-config.js':
            js = io.open(os.path.join(RAIZ, 'tools', 'assistente-ia', 'gemini-config.js'), encoding='utf-8-sig').read()
            js = re.sub(r'const GEMINI_WORKER_URL = "[^"]*"', 'const GEMINI_WORKER_URL = "' + BASE + '/__worker"', js)
            return self._enviar(js.encode('utf-8'), 'application/javascript')
        if caminho == '/__emuladores.js':
            return self._enviar(io.open(os.path.join(AQUI, 'emuladores.js'), 'rb').read(), 'application/javascript')
        if caminho.endswith('/'):
            caminho += 'index.html'
        if caminho.endswith('.html'):
            arq = os.path.join(RAIZ, caminho.lstrip('/').replace('/', os.sep))
            if os.path.isfile(arq):
                html = io.open(arq, encoding='utf-8-sig').read()
                html = SDK_RE.sub(r'\1<script src="/__emuladores.js"></script>', html, count=1)
                return self._enviar(html.encode('utf-8'), 'text/html; charset=utf-8')
        return super().do_GET()

    def _enviar(self, corpo, tipo):
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(corpo)


def subir_site():
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8765), Site)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


# ---------------------------------------------------------------- emuladores (REST)
def fs_valor(v):
    if v is None: return {'nullValue': None}
    if isinstance(v, bool): return {'booleanValue': v}
    if isinstance(v, int): return {'integerValue': str(v)}
    if isinstance(v, float): return {'doubleValue': v}
    if isinstance(v, str): return {'stringValue': v}
    if isinstance(v, list): return {'arrayValue': {'values': [fs_valor(x) for x in v]}}
    if isinstance(v, dict) and '__ts__' in v: return {'timestampValue': v['__ts__']}
    if isinstance(v, dict): return {'mapValue': {'fields': {k: fs_valor(x) for k, x in v.items()}}}
    raise TypeError(type(v))


def fs_py(v):
    if 'stringValue' in v: return v['stringValue']
    if 'booleanValue' in v: return v['booleanValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'arrayValue' in v: return [fs_py(x) for x in v['arrayValue'].get('values', [])]
    if 'mapValue' in v: return {k: fs_py(x) for k, x in v['mapValue'].get('fields', {}).items()}
    if 'nullValue' in v: return None
    if 'timestampValue' in v: return v['timestampValue']
    return v


def ate(cond, seg=20):
    """Espera ativa: repete a conferência até dar certo ou acabar o tempo."""
    fim = time.time() + seg
    while True:
        try:
            if cond(): return True
        except Exception:
            pass
        if time.time() > fim: return False
        time.sleep(0.5)


def gravar(caminho, dados):
    r = requests.patch(f'{DOCS}/{caminho}', headers=DONO, json={'fields': {k: fs_valor(v) for k, v in dados.items()}})
    r.raise_for_status()


def ler(caminho):
    r = requests.get(f'{DOCS}/{caminho}', headers=DONO)
    if r.status_code == 404: return None
    r.raise_for_status()
    return {k: fs_py(v) for k, v in r.json().get('fields', {}).items()}


def apagar(caminho):
    requests.delete(f'{DOCS}/{caminho}', headers=DONO)


def listar(colecao):
    r = requests.get(f'{DOCS}/{colecao}?pageSize=300', headers=DONO)
    r.raise_for_status()
    return [(d['name'].split('/')[-1], {k: fs_py(v) for k, v in d.get('fields', {}).items()}) for d in r.json().get('documents', [])]


def regras_firestore(texto):
    r = requests.put(f'{FS}/emulator/v1/projects/{PROJ}:securityRules', json={'rules': {'files': [{'content': texto}]}})
    r.raise_for_status()


def regras_storage(texto):
    r = requests.put(f'{ST}/internal/setRules', json={'rules': {'files': [{'name': 'storage.rules', 'content': texto}]}})
    r.raise_for_status()


def criar_conta(email):
    r = requests.post(f'{AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
                      json={'email': email, 'password': SENHA, 'returnSecureToken': True})
    r.raise_for_status()
    return r.json()['localId']


def subir_arquivo_dono(caminho, dados, tipo):
    r = requests.post(f'{ST}/v0/b/{BUCKET}/o', params={'name': caminho, 'uploadType': 'media'},
                      headers=dict(DONO, **{'Content-Type': tipo}), data=dados)
    r.raise_for_status()
    tok = r.json().get('downloadTokens', '').split(',')[0]
    return f'{ST}/v0/b/{BUCKET}/o/{urllib.parse.quote(caminho, safe="")}?alt=media&token={tok}'


def objetos_storage(prefixo):
    r = requests.get(f'{ST}/v0/b/{BUCKET}/o', params={'prefix': prefixo}, headers=DONO)
    r.raise_for_status()
    return [i['name'] for i in r.json().get('items', [])]


PDF_FALSO = b'%PDF-1.4\n% documento ficticio de teste\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'
JPG_FALSO = base64.b64decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=')


def telas():
    """Texto curto das páginas abertas (diagnóstico de bloco interrompido)."""
    try:
        return ' || '.join((p.url.split('/')[-2] + ': ' + p.evaluate("(document.getElementById('gate')||document.getElementById('login-error')||document.body).innerText.slice(0,120)")).replace(chr(10), ' ')
                           for c in _ctxs for p in c.pages[-2:])[:600]
    except Exception as e:
        return 'n/d (' + str(e)[:60] + ')'


_ctxs = []


# ---------------------------------------------------------------- navegador
# domínios de produção apontam para uma porta fechada no próprio navegador (nada sai), sem interceptar a rede
ARGS_NAVEGADOR = ['--host-resolver-rules=MAP *.googleapis.com 127.0.0.1:9, MAP *.firebaseio.com 127.0.0.1:9, MAP *.firebaseapp.com 127.0.0.1:9, '
                  'MAP *.workers.dev 127.0.0.1:9, MAP accounts.google.com 127.0.0.1:9, MAP apis.google.com 127.0.0.1:9, EXCLUDE fonts.googleapis.com']


def novo_contexto(browser, worker_cb=None):
    ctx = browser.new_context(accept_downloads=True, viewport={'width': 1280, 'height': 900})
    _ctxs.append(ctx)

    def registrar(req):
        host = urllib.parse.urlparse(req.url).hostname or ''
        if host != 'fonts.googleapis.com' and any(host == p or host.endswith('.' + p) or host.endswith(p) for p in PRODUCAO):
            pedidos_producao.append(req.url[:120])
    ctx.on('request', registrar)
    ctx.on('page', lambda pg: pg.on('console', lambda m: console.append(pg.url.split('/')[-2][:20] + ' | ' + m.type + ' | ' + m.text[:220])))
    ctx.on('page', lambda pg: pg.on('pageerror', lambda e: console.append(pg.url.split('/')[-2][:20] + ' | ERRO | ' + str(e)[:220])))
    return ctx


def aceitar(d):
    # prompt (ex.: data de saída ao excluir) aceita o valor padrão; confirm/alert só confirmam
    d.accept(d.default_value) if d.type == 'prompt' else d.accept()


def entrar(ctx, email):
    pg = ctx.new_page()
    pg.on('dialog', aceitar)
    pg.goto(BASE + '/index.html')
    # espera a tela de login terminar de carregar (antes disso a página limpa o formulário)
    for tentativa in range(2):
        esperar(pg, "document.getElementById('login-screen') && getComputedStyle(document.getElementById('login-screen')).display !== 'none'", 20000)
        pg.wait_for_timeout(1500)
        pg.fill('#login-email', email)
        pg.fill('#login-password', SENHA)
        pg.click('#login-submit')
        if esperar(pg, "document.getElementById('app-screen').style.display === 'flex' || (document.getElementById('login-error').textContent || '').length > 0", 15000):
            break
    return pg


def esperar(pg, cond_js, ms=15000):
    try:
        pg.wait_for_function(cond_js, timeout=ms)
        return True
    except Exception:
        return False


def ok_nos_dialogos(pg):
    pg.evaluate("(() => { window.prompt = (m, d) => (d === undefined ? '' : d); window.confirm = () => true; window.alert = () => {}; })()")


def dar_ciencia(pg):
    """Comunicados obrigatórios aparecem ao entrar (ex.: regras de etiquetas do Astrea): registra a ciência como a pessoa faria."""
    registrados = 0
    for _ in range(6):
        if not pg.evaluate("(() => { const b = document.getElementById('com-backdrop'); return !!b && getComputedStyle(b).display !== 'none' && b.classList.contains('show'); })()"):
            break
        if pg.query_selector('#com-c1'):
            # marca as duas caixas como o usuário faria (o input fica escondido sob o rótulo) e clica no botão real
            pg.evaluate("(() => { for (const id of ['com-c1', 'com-c2']) { const c = document.getElementById(id); c.checked = true; c.dispatchEvent(new Event('change')); } })()")
            pg.wait_for_timeout(300)
            if pg.evaluate("document.getElementById('com-registrar').disabled"):
                break   # comunicado com vídeos obrigatórios: a ciência só libera depois de assistir (correto); o teste não assiste
            pg.click('#com-registrar'); registrados += 1
        elif pg.query_selector('#com-fechar'):
            pg.click('#com-fechar')
        pg.wait_for_timeout(1500)
    return registrados


def sdk(pg, js):
    """Executa uma chamada direta ao SDK do Firebase na página (sem a interface). Devolve 'ok' ou o código do erro."""
    return pg.evaluate("""async (js) => { try { const r = await (new Function('return (async () => {' + js + '})()'))(); return 'ok' + (r === undefined ? '' : ':' + JSON.stringify(r)); }
                       catch (e) { return 'erro:' + (e.code || e.message); } }""", js)


# ---------------------------------------------------------------- semeadura (antes da migração)
def semear():
    requests.delete(f'{AUTH}/emulator/v1/projects/{PROJ}/accounts').raise_for_status()
    requests.delete(f'{FS}/emulator/v1/projects/{PROJ}/databases/(default)/documents').raise_for_status()
    U = {}
    for k in ('admin', 'membro', 'colega', 'cliente', 'deslig', 'legado', 'robo', 'vetudo'):
        U[k] = criar_conta(f'{k}@exemplo.test')
    abas = ['agenda', 'chat', 'gestao', 'numeros', 'assistente', 'condominios']
    # cadastros como estão hoje em produção: SEM o campo acesso (a migração cria)
    gravar(f"users/{U['admin']}", {'email': 'admin@exemplo.test', 'displayName': 'Admin Fictício', 'role': 'admin', 'tabs': abas})
    gravar(f"users/{U['membro']}", {'email': 'membro@exemplo.test', 'displayName': 'Membro Fictício', 'role': 'membro', 'tabs': abas, 'tipoColaborador': 'clt', 'pixChave': 'x'})
    gravar(f"users/{U['colega']}", {'email': 'colega@exemplo.test', 'displayName': 'Colega Fictício', 'role': 'membro', 'tabs': abas, 'pixChave': 'x'})
    gravar(f"users/{U['vetudo']}", {'email': 'vetudo@exemplo.test', 'displayName': 'Patrimônio Fictício', 'role': 'membro', 'tabs': abas, 'pixChave': 'x'})
    gravar(f"users/{U['cliente']}", {'email': 'cliente@exemplo.test', 'displayName': 'Síndico Fictício', 'role': 'cliente', 'tabs': ['condominios']})
    gravar(f"users/{U['deslig']}", {'email': 'deslig@exemplo.test', 'displayName': 'Desligado Fictício', 'role': 'membro', 'tabs': abas, 'pixChave': 'x'})
    gravar(f"users/{U['legado']}", {'email': 'legado@exemplo.test', 'displayName': 'Sem Abas Fictício', 'role': 'membro', 'tabs': []})
    for k in ('admin', 'membro', 'colega', 'vetudo', 'deslig'):
        gravar(f"organograma/{U[k]}", {'displayName': k.title() + ' Fictício', 'email': f'{k}@exemplo.test', 'deptoAtual': '', 'dataIngresso': ''})
    for i, (tid, rot, url) in enumerate([('numeros', 'Números', 'tools/numeros-escritorio/index.html'), ('chat', 'Chat', 'tools/chat/index.html'),
                                         ('gestao', 'Gestão', 'tools/gestao/index.html'), ('assistente', 'Assistente', 'tools/assistente-ia/index.html'),
                                         ('condominios', 'Condomínios', 'tools/condominios/index.html')]):
        gravar(f'tabs/{tid}', {'label': rot, 'url': url, 'order': i})
    hoje = time.strftime('%Y-%m-%d')
    gravar(f'astreaDiario/{hoje}', {'data': hoje, 'total': 1, 'colunas': ['Tipo', 'Título', 'Responsáveis', 'Data'],
                                    'registros': [{'Tipo': 'Prazo', 'Título': 'Tarefa fictícia de teste', 'Responsáveis': 'Membro Fictício', 'Data': hoje}]})
    gravar(f"holeritesDocs/hol-membro", {'uid': U['membro'], 'tipo': 'holerite', 'competencia': '2026-10', 'partes': 1,
                                         'arquivoNome': 'holerite-ficticio.pdf', 'arquivoTipo': 'application/pdf', 'enviadoPorUid': U['admin']})
    gravar(f"holeritesDocs/hol-membro/partes/0", {'n': 0, 'dados': base64.b64encode(PDF_FALSO).decode()})
    gravar(f"holeritesDocs/hol-colega", {'uid': U['colega'], 'tipo': 'holerite', 'competencia': '2026-10', 'partes': 1, 'enviadoPorUid': U['admin']})
    gravar('patrimonio/p-membro', {'nome': 'Notebook fictício', 'codigo': 'PT-1', 'responsavelUid': U['membro']})
    gravar('patrimonio/p-colega', {'nome': 'Monitor fictício', 'codigo': 'PT-2', 'responsavelUid': U['colega']})
    # chat: conversa com anexo ANTIGO (formato chat/{uid}/arquivo, link com token já emitido)
    link_antigo = subir_arquivo_dono(f"chat/{U['membro']}/1700000000000_doc.pdf", PDF_FALSO, 'application/pdf')
    gravar('conversas/convA', {'participantes': [U['membro'], U['colega'], U['deslig']], 'criadoPor': U['membro'], 'tipo': 'direta',
                               'titulo': 'Conversa fictícia', 'atualizadoEm': {'__ts__': '2026-10-01T12:00:00Z'}, 'ultimaMensagemEm': {'__ts__': '2026-10-01T12:00:00Z'}})
    gravar('conversas/convA/mensagens/m-antiga', {'autorUid': U['membro'], 'tipo': 'documento', 'documentoUrl': link_antigo,
                                                  'documentoNome': 'anexo-antigo.pdf', 'documentoTamanho': len(PDF_FALSO), 'texto': '', 'criadoEm': {'__ts__': '2026-10-01T12:00:00Z'}})
    gravar('conversas/convB', {'participantes': [U['colega'], U['vetudo']], 'criadoPor': U['colega']})
    comunicados = re.findall(r"^\s*id:\s*'([^']+)'", io.open(os.path.join(RAIZ, 'comunicados.js'), encoding='utf-8').read(), re.M)
    for k, uid in U.items():
        for cid in comunicados:
            if k == 'membro' and 'etiquetas-astrea' in cid and 'errata' not in cid:
                continue
            gravar(f'comunicadosCiencia/{cid}_{uid}', {'comunicadoId': cid, 'uid': uid, 'nome': k, 'em': {'__ts__': '2026-10-30T12:00:00Z'}})
    return U, link_antigo


def dados_privados_ficticios():
    """Mesma estrutura dos arquivos reais de privado/, mas com todo texto trocado por valores fictícios."""
    pasta = os.path.join(AQUI, '.privado-teste')
    os.makedirs(pasta, exist_ok=True)
    real = os.path.join(RAIZ, 'privado', 'numeros-stats.json')
    contador = [0]

    def anon(o):
        if isinstance(o, dict): return {k: anon(v) for k, v in o.items()}
        if isinstance(o, list): return [anon(v) for v in o]
        if isinstance(o, str):
            contador[0] += 1
            return 'Fictício %d' % contador[0]
        return o
    if os.path.exists(real):
        stats = anon(json.load(io.open(real, encoding='utf-8')))
        stats['topClientesDemais'][0]['cliente'] = 'Cliente Fictício Alfa'
    else:
        stats = None
    io.open(os.path.join(pasta, 'numeros-stats.json'), 'w', encoding='utf-8').write(json.dumps(stats))
    condo = {'condominios': [{'nome': 'Condomínio Fictício', 'sindico': 'Síndico Fictício', 'plataforma': 'Teste', 'cnpj': '', 'endereco': '', 'nota': 'Observação fictícia'}],
             'relatorios': {'Condomínio Fictício': [{'periodo': 'Out/2026', 'titulo': 'Relatório fictício', 'desc': 'teste', 'pdf': 'relatorio-ficticio.pdf'}]}}
    io.open(os.path.join(pasta, 'condominios.json'), 'w', encoding='utf-8').write(json.dumps(condo, ensure_ascii=False))
    io.open(os.path.join(pasta, 'relatorio-ficticio.pdf'), 'wb').write(PDF_FALSO)
    return pasta, stats is not None


# ---------------------------------------------------------------- roteiro
def main():
    regras_novas = io.open(os.path.join(RAIZ, 'firestore.rules'), encoding='utf-8').read()
    storage_novas = io.open(os.path.join(RAIZ, 'storage.rules'), encoding='utf-8').read()
    regras_antigas = io.open(os.environ['REGRAS_ANTIGAS'], encoding='utf-8').read()
    site = subir_site()
    regras_firestore(regras_antigas)                  # produção hoje (equivalente)
    regras_storage('rules_version = "2"; service firebase.storage { match /b/{bucket}/o { match /{a=**} { allow read, write: if request.auth != null; } } }')
    U, link_antigo = semear()
    pasta_priv, tem_stats = dados_privados_ficticios()

    with sync_playwright() as p:
        # cada pessoa usa um navegador próprio (conexões ao emulador não competem entre si)
        def sessao(email, worker_cb=None):
            b = p.chromium.launch(headless=True, args=ARGS_NAVEGADOR)
            ctx = novo_contexto(b, worker_cb)
            pg = entrar(ctx, email)
            ok = esperar(pg, "document.getElementById('app-screen').style.display === 'flex'", 25000)
            if ok:
                pg.wait_for_timeout(2500)
                n = dar_ciencia(pg)
                if n: ciencias.append((email, n))
            if not ok:
                foto = os.path.join(os.environ.get('SAIDA_TESTE', AQUI), 'falha-login-' + email.split('@')[0] + '.png')
                try: pg.screenshot(path=foto)
                except Exception: pass
                console.append('LOGIN FALHOU ' + email + ' | erro na tela: ' + pg.evaluate("(document.getElementById('login-error')||{}).textContent||''")[:150] + ' | ' + foto)
            return b, ctx, pg, ok

        def bloco(nome, fn):
            try:
                fn()
            except Exception as e:
                caso(nome, 'BLOCO INTERROMPIDO', False, str(e).split(chr(10))[0][:160] + ' | tela: ' + telas())

        # ===== 1. Hoje (regras de produção): o que a própria pessoa consegue gravar no próprio cadastro
        def b1():
            G = '1. Regras de produção de hoje: autoescrita no próprio cadastro (demonstração do risco)'
            b, ctx, pl, ok = sessao('legado@exemplo.test')
            r = sdk(pl, f"await firebase.firestore().doc('users/{U['legado']}').update({{acesso:'ativo', acessoAprovadoPor:'{U['admin']}', patrimonioVerTudo:true}})")
            caso(G, 'HOJE um autocadastro sem abas consegue se marcar "ativo", forjar o aprovador e se dar patrimonioVerTudo (esperado nas regras atuais)', r == 'ok', r)
            b.close()
            b, ctx, pm2, ok = sessao('membro@exemplo.test')
            r = sdk(pm2, f"await firebase.firestore().doc('users/{U['membro']}').update({{remuneracao:'99999'}})")
            caso(G, 'HOJE um membro consegue alterar a própria remuneração (esperado nas regras atuais)', r == 'ok', r)
            b.close()
        bloco('1. Regras de produção de hoje: autoescrita no próprio cadastro (demonstração do risco)', b1)

        # ===== 2. Publicação na ordem nova: admin ativo pelo console, regras, e só depois a migração
        gravar(f"users/{U['admin']}", dict(ler(f"users/{U['admin']}"), acesso='ativo'))   # "pelo console"
        gravar(f"robos/{U['robo']}", {'descricao': 'robô fictício (criado "pelo console")'})
        regras_firestore(regras_novas); regras_storage(storage_novas)

        def b2():
            G = '2. Regras novas publicadas, migração depois (página admin)'
            b, ctx, pl, ok = sessao('legado@exemplo.test')
            caso(G, 'antes da migração, quem se marcou "ativo" sem abas já não lê nada', sdk(pl, "await firebase.firestore().collection('organograma').get()").startswith('erro:permission-denied'))
            caso(G, '…e não consegue mais mexer no próprio acesso', sdk(pl, f"await firebase.firestore().doc('users/{U['legado']}').update({{acesso:'ativo'}})").startswith('erro:permission-denied'))
            b.close()
            b, ctx, pa, ok = sessao('admin@exemplo.test')
            caso(G, 'admin ativado pelo console entra com as regras novas', ok)
            pa.close()
            pm = ctx.new_page(); pm.on('dialog', aceitar)
            pm.goto(BASE + '/tools/admin-seguranca/')
            caso(G, 'página de migração abre para o admin', esperar(pm, "!document.getElementById('conteudo').hidden && document.querySelectorAll('.cb-acesso').length >= 7", 25000))
            caso(G, 'página sinaliza quem estava "ativo" sem abas (⚠ conferir)', 'conferir' in pm.inner_text('#t-acesso'))
            pm.click('#b-acesso')
            esperar(pm, "document.getElementById('m-acesso').textContent.length > 0", 20000)
            ate(lambda: (ler(f"users/{U['legado']}") or {}).get('acesso') == 'pendente')
            caso(G, 'gravar acesso: quem tinha abas fica ativo', all((ler(f'users/{U[k]}') or {}).get('acesso') == 'ativo' for k in ('admin', 'membro', 'colega', 'vetudo', 'cliente', 'deslig')))
            caso(G, 'gravar acesso: o autoaprovado sem abas volta a pendente', (ler(f"users/{U['legado']}") or {}).get('acesso') == 'pendente')
            caso(G, 'gravar acesso: registra quem aprovou', (ler(f"users/{U['membro']}") or {}).get('acessoAprovadoPor') == U['admin'])
            caso(G, 'gravar acesso: registro em auditoriaSeguranca', ate(lambda: any(d.get('acao') == 'acesso' for _, d in listar('auditoriaSeguranca')), 10))
            pm.reload(); esperar(pm, "document.querySelectorAll('.cb-pat').length >= 3", 20000)
            caso(G, 'patrimônio: ninguém vem marcado (nem quem gravou true por conta própria)', pm.evaluate("Array.from(document.querySelectorAll('.cb-pat')).every(c => !c.checked)"))
            pm.check(f".cb-pat[data-uid='{U['vetudo']}']")
            pm.click('#b-pat'); esperar(pm, "document.getElementById('m-pat').textContent.length > 0", 20000)
            caso(G, 'patrimônio: marcado explicitamente fica true', ate(lambda: (ler(f"users/{U['vetudo']}") or {}).get('patrimonioVerTudo') is True), pm.inner_text('#m-pat'))
            caso(G, 'patrimônio: o true gravado por conta própria vira false', ate(lambda: (ler(f"users/{U['legado']}") or {}).get('patrimonioVerTudo') is False))
            caso(G, 'patrimônio: os demais ficam false explicitamente', (ler(f"users/{U['membro']}") or {}).get('patrimonioVerTudo') is False)
            with pm.expect_download() as dl:
                pm.click('#b-csv')
            caso(G, 'registro da migração baixa em CSV', dl.value.suggested_filename.endswith('.csv'))
            pm.fill('#r-uid', 'RoboNovoFicticio0000000001'); pm.fill('#r-desc', 'outro robô fictício'); pm.click('#b-robo')
            caso(G, 'cadastro de robô pela página funciona com as regras novas', ate(lambda: ler('robos/RoboNovoFicticio0000000001') is not None, 15))
            pm.reload(); esperar(pm, "!document.getElementById('conteudo').hidden", 25000)
            pm.set_input_files('#f-dados', [os.path.join(pasta_priv, f) for f in ('numeros-stats.json', 'condominios.json', 'relatorio-ficticio.pdf')])
            pm.click('#b-dados'); esperar(pm, "document.getElementById('m-dados').textContent.includes('Todos') || document.getElementById('m-dados').textContent.includes('Erros')", 40000)
            caso(G, 'envio dos dados privados pela página admin', 'Todos os 3' in pm.inner_text('#m-dados'), pm.inner_text('#m-dados'))
            caso(G, 'dados privados ficaram no Firestore', ler('dadosPrivados/condominios') is not None and ler('dadosPrivados/numerosStats') is not None and ler('arquivosPrivados/relatorio-ficticio.pdf') is not None)
            b.close()
        bloco('2. Regras novas publicadas, migração depois (página admin)', b2)

        # ===== 3. Membro

        def falso_worker(route):
            req = route.request
            if req.method == 'OPTIONS':
                return route.fulfill(status=204, headers={'Access-Control-Allow-Origin': BASE, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS'})
            assistente_pedidos.append(req.headers.get('authorization', ''))
            return route.fulfill(status=200, headers={'Access-Control-Allow-Origin': BASE, 'Content-Type': 'application/json'},
                                 body=json.dumps({'candidates': [{'content': {'parts': [{'text': 'Resposta fictícia do assistente.'}]}}]}))

        def b3():
            G = '3. Membro'
            b, cm, mm, ok = sessao('membro@exemplo.test')
            caso(G, 'membro entra no portal', ok)
            caso(G, 'comunicado obrigatório: ciência registrada pela interface (regras novas)', any(e == 'membro@exemplo.test' for e, n in ciencias) and
                 ate(lambda: ler(f"comunicadosCiencia/2026-10-28-etiquetas-astrea_{U['membro']}") is not None, 10))
            mm.click('#user-menu-btn')
            mm.evaluate("""() => { const b = Array.from(document.querySelectorAll('#user-menu-dropdown button')).find(x => x.textContent.includes('Meus holerites')); if (b) b.click(); }""")
            tem_lista = esperar(mm, "document.querySelector('#hol-lista [data-hol]') !== null", 30000)
            if not tem_lista:   # segunda tentativa: fecha e abre de novo a janela (o emulador às vezes demora a responder)
                mm.evaluate("document.getElementById('hol-fechar').click()"); mm.click('#user-menu-btn', force=True)
                mm.evaluate("""() => { const b = Array.from(document.querySelectorAll('#user-menu-dropdown button')).find(x => x.textContent.includes('Meus holerites')); if (b) b.click(); }""")
                tem_lista = esperar(mm, "document.querySelector('#hol-lista [data-hol]') !== null", 30000)
            caso(G, 'holerites: vê o próprio na lista (Meus holerites)', tem_lista, mm.evaluate("'botões no menu: ' + Array.from(document.querySelectorAll('#user-menu-dropdown button')).map(b => b.textContent.trim()).join(' / ').slice(0,200) + ' | lista: ' + ((document.getElementById('hol-lista')||{}).innerText||'').slice(0,80)"))
            if tem_lista:
                with mm.expect_download() as dl:
                    mm.click('#hol-lista [data-hol]')
                caso(G, 'holerites: baixa o próprio PDF', dl.value.suggested_filename == 'holerite-ficticio.pdf')
            caso(G, 'holerites: não lê o de outra pessoa (SDK direto)', sdk(mm, "await firebase.firestore().doc('holeritesDocs/hol-colega').get()").startswith('erro:permission-denied'))
            caso(G, 'patrimônio: lista os próprios itens', sdk(mm, f"return (await firebase.firestore().collection('patrimonio').where('responsavelUid','==','{U['membro']}').get()).size") == 'ok:1')
            caso(G, 'patrimônio: não lista o de todos', sdk(mm, "await firebase.firestore().collection('patrimonio').get()").startswith('erro:permission-denied'))
            mm.close()
            pn = cm.new_page(); pn.goto(BASE + '/tools/numeros-escritorio/index.html')
            if tem_stats:
                caso(G, 'Números: painel de clientes carrega do Firestore', esperar(pn, "document.body.textContent.includes('Cliente Fictício Alfa')", 25000))
            else:
                nao_testado.append(('Números: painel de clientes', 'privado/numeros-stats.json não existe nesta máquina para gerar o fictício'))
            pn.evaluate("""() => { const b = document.querySelector('[data-tab="agenda"]'); if (b) b.click(); }""")
            caso(G, 'Agenda Astrea: mostra o registro do dia', esperar(pn, "document.body.textContent.includes('Tarefa fictícia de teste')", 25000))
            pn.close()
            pc = cm.new_page(); pc.on('dialog', aceitar); pc.goto(BASE + '/tools/condominios/index.html')
            esperar(pc, "typeof dadosCondoStatus !== 'undefined' && dadosCondoStatus !== 'carregando'", 40000)
            caso(G, 'Condomínios: lista de clientes carrega do Firestore', pc.evaluate("CONDOMINIOS.length") == 1 and pc.evaluate("dadosCondoStatus") == 'ok', pc.evaluate("dadosCondoStatus"))
            with pc.expect_download(timeout=20000) as dl:
                pc.evaluate("baixarArquivoPrivado('relatorio-ficticio.pdf', 'relatorio-ficticio.pdf')")
            caso(G, 'Condomínios: relatório em PDF baixa do Firestore', dl.value.suggested_filename == 'relatorio-ficticio.pdf')
            pc.close()
            pch = cm.new_page(); pch.on('dialog', aceitar); pch.goto(BASE + '/tools/chat/index.html')
            esperar(pch, "document.querySelector('.conv-item[data-id=\"convA\"]') !== null", 25000)
            pch.click('.conv-item[data-id="convA"]')
            caso(G, 'chat: anexo antigo aparece na conversa', esperar(pch, "document.querySelector('a.msg-doc') !== null", 15000))
            r = requests.get(link_antigo)
            caso(G, 'chat: link ANTIGO (token já emitido) continua abrindo — risco documentado', r.status_code == 200)
            pdf_novo = os.path.join(pasta_priv, 'anexo-novo.pdf'); io.open(pdf_novo, 'wb').write(PDF_FALSO)
            pch.set_input_files('#doc-input', pdf_novo)
            esperar(pch, "document.body.textContent.includes('anexo-novo.pdf')", 10000)
            time.sleep(3)
            pch.click('#btn-enviar')
            time.sleep(4)
            novos = objetos_storage(f"chat/convA/{U['membro']}/")
            caso(G, 'chat: anexo NOVO vai para chat/{conversa}/{uid}/', len(novos) == 1, str(len(novos)) + ' objeto(s)')
            gravada = ate(lambda: any(m.get('documentoNome') == 'anexo-novo.pdf' for _, m in listar('conversas/convA/mensagens')), 20)
            caso(G, 'chat: mensagem com o anexo novo foi gravada', gravada, str([sorted(m.keys())[:6] for _, m in listar('conversas/convA/mensagens')])[:200])
            caso(G, 'chat: não envia arquivo na pasta de outra conversa (SDK direto)',
                 sdk(pch, f"await firebase.storage().ref('chat/convB/{U['membro']}/x.pdf').put(new Blob(['x'],{{type:'application/pdf'}}))").startswith('erro:storage/unauthorized'))
            caso(G, 'chat: não gera link de anexo antigo de outra pessoa (SDK direto)',
                 sdk(pch, f"await firebase.storage().ref('chat/{U['colega']}/qualquer.pdf').getDownloadURL()").startswith('erro:storage/'))
            sdk(pch, f"""await firebase.firestore().collection('conversas/convA/mensagens').add({{autorUid:'{U['membro']}', tipo:'documento', documentoNome:'x',
                   documentoUrl:'javascript:window.__xss=1', texto:'', criadoEm: firebase.firestore.FieldValue.serverTimestamp()}})""")
            sdk(pch, f"""await firebase.firestore().collection('conversas/convA/mensagens').add({{autorUid:'{U['membro']}', tipo:'foto',
                   fotoUrl:'x" onerror="window.__xss=2', texto:'', criadoEm: firebase.firestore.FieldValue.serverTimestamp()}})""")
            time.sleep(3)
            hrefs = pch.evaluate("Array.from(document.querySelectorAll('a.msg-doc')).map(a => a.getAttribute('href'))")
            caso(G, 'chat: link javascript: forjado não vira link clicável', len(hrefs) >= 2 and not any(h and h.lower().startswith('javascript') for h in hrefs), str(len(hrefs)) + ' links')
            caso(G, 'chat: foto com aspas forjadas não injeta atributo (onerror)', pch.evaluate("window.__xss === undefined && !document.querySelector('img.msg-photo[onerror]')"))
            pch.close()
            pas = cm.new_page(); pas.goto(BASE + '/tools/assistente-ia/index.html')
            esperar(pas, "document.getElementById('composer-input') !== null", 15000)
            time.sleep(3)
            pas.fill('#composer-input', 'Pergunta fictícia de teste')
            pas.click('#btn-enviar')
            caso(G, 'Assistente: resposta aparece na tela', esperar(pas, "document.body.textContent.includes('Resposta fictícia do assistente.')", 20000))
            caso(G, 'Assistente: pedido ao Worker leva o token do login (Authorization: Bearer)', bool(assistente_pedidos) and assistente_pedidos[-1].startswith('Bearer '))
            b.close()
        bloco('3. Membro', b3)
        nao_testado.append(('Assistente ponta a ponta com o Worker real', 'o emulador de Auth emite tokens sem assinatura; o Worker exige assinatura RS256 do Google. A autorização do Worker está coberta pelos 19 testes com tokens assinados por chave de teste; aqui foi testado que a página envia o token e mostra a resposta'))

        # ===== 4. Cliente
        def b4():
            G = '4. Cliente (síndico)'
            b, cc, mc, ok = sessao('cliente@exemplo.test')
            caso(G, 'cliente entra no portal', ok)
            mc.close(); mc = None
            pcc = cc.new_page(); pcc.goto(BASE + '/tools/condominios/index.html')
            esperar(pcc, "typeof dadosCondoStatus !== 'undefined' && dadosCondoStatus !== 'carregando'", 25000)
            caso(G, 'Condomínios: lista de clientes/relatórios fica restrita à equipe', pcc.evaluate("dadosCondoStatus") == 'sem-acesso' and pcc.evaluate("CONDOMINIOS.length") == 0, pcc.evaluate("dadosCondoStatus"))
            caso(G, 'não lê painel de Números (SDK direto)', sdk(pcc, "await firebase.firestore().doc('dadosPrivados/numerosStats').get()").startswith('erro:permission-denied'))
            caso(G, 'não lê agenda Astrea (SDK direto)', sdk(pcc, f"await firebase.firestore().doc('astreaDiario/{time.strftime('%Y-%m-%d')}').get()").startswith('erro:permission-denied'))
            caso(G, 'não se aprova nem muda de papel (SDK direto)', sdk(pcc, f"await firebase.firestore().doc('users/{U['cliente']}').update({{role:'admin'}})").startswith('erro:permission-denied'))
            caso(G, 'não cadastra robô (SDK direto)', sdk(pcc, f"await firebase.firestore().doc('robos/{U['cliente']}').set({{d:1}})").startswith('erro:permission-denied'))
            caso(G, 'não envia dados privados (SDK direto)', sdk(pcc, "await firebase.firestore().doc('dadosPrivados/condominios').set({json:'{}'})").startswith('erro:permission-denied'))
            b.close()
        bloco('4. Cliente (síndico)', b4)

        # ===== 5. Desligado (sessão aberta enquanto o admin exclui)
        def b5():
            G = '5. Desligado com sessão aberta'
            b, cd, md, ok = sessao('deslig@exemplo.test')
            md.close()
            mdc = cd.new_page(); mdc.goto(BASE + '/tools/chat/index.html'); esperar(mdc, "typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth().currentUser !== null", 20000)
            caso(G, 'antes: entra e lê a conversa', ok and sdk(mdc, "await firebase.firestore().doc('conversas/convA').get()") == 'ok')
            ba, ca, pa, oka = sessao('admin@exemplo.test')
            antes = len(console)
            ok_nos_dialogos(pa)
            pa.evaluate(f"""() => window.__deleteUser(document.createElement('button'), '{U['deslig']}', 'Desligado Fictício')""")
            apagado = ate(lambda: ler(f"users/{U['deslig']}") is None, 25)
            caso(G, 'admin exclui pela interface: cadastro apagado', apagado, ' / '.join(c for c in console[antes:] if 'error' in c or 'ERRO' in c)[:250])
            caso(G, 'admin exclui pela interface: marca de revogação gravada', ler(f"acessosRevogados/{U['deslig']}") is not None)
            caso(G, 'admin exclui pela interface: fica em Pagamentos (colaboradoresDesligados)', ler(f"colaboradoresDesligados/{U['deslig']}") is not None)
            ba.close()
            caso(G, 'com a sessão ainda aberta: não lê a conversa', sdk(mdc, "await firebase.firestore().doc('conversas/convA').get()").startswith('erro:permission-denied'))
            caso(G, 'com a sessão ainda aberta: não lê mensagens', sdk(mdc, "await firebase.firestore().collection('conversas/convA/mensagens').get()").startswith('erro:permission-denied'))
            caso(G, 'com a sessão ainda aberta: não lê organograma', sdk(mdc, "await firebase.firestore().collection('organograma').get()").startswith('erro:permission-denied'))
            anexo_conv = (objetos_storage(f"chat/convA/{U['membro']}/") or ['chat/convA/x/x.pdf'])[0]
            caso(G, 'Storage: não gera link de anexo da conversa', sdk(mdc, f"await firebase.storage().ref('{anexo_conv}').getDownloadURL()").startswith('erro:storage/'))
            r_up = sdk(mdc, f"await firebase.storage().ref('chat/convA/{U['deslig']}/x.pdf').put(new Blob(['x'],{{type:'application/pdf'}}))")
            caso(G, 'Storage: não envia arquivo', r_up.startswith('erro:storage/'), r_up)
            caso(G, 'não recria o próprio cadastro (SDK direto)', sdk(mdc, f"""await firebase.firestore().doc('users/{U['deslig']}').set({{email:'deslig@exemplo.test', displayName:'X', role:'membro', tabs:[], acesso:'pendente'}})""").startswith('erro:permission-denied'))
            r1 = sdk(mdc, f"await firebase.firestore().doc('perfis/{U['deslig']}').set({{foto:'x'}})")
            r2 = sdk(mdc, f"await firebase.firestore().doc('organograma/{U['deslig']}').set({{displayName:'X',email:'x',deptoAtual:'',dataIngresso:'',remuneracao:''}})")
            caso(G, 'não recria o próprio perfil nem o organograma', r1.startswith('erro:permission-denied') and r2.startswith('erro:permission-denied'), r1 + ' / ' + r2)
            mdc.close()
            md = cd.new_page(); md.goto(BASE + '/index.html')
            caso(G, 'ao recarregar, volta para o login com aviso', esperar(md, "document.getElementById('login-error').textContent.includes('acesso configurado')", 20000))
            b.close()
        bloco('5. Desligado com sessão aberta', b5)
        nao_testado.append(('Desligado no Worker do Assistente (ponta a ponta)', 'mesmo motivo do token sem assinatura no emulador; coberto pelo teste unitário "conta desligada (cadastro apagado, token ainda válido) é recusada"'))
        nao_testado.append(('Login do desligado no Firebase Auth', 'o Worker de exclusão (admin-worker) não está publicado: a conta de login continua existindo e consegue autenticar, só não lê nada'))

        # ===== 6. Autocadastro pela interface + aprovação
        def b6():
            G = '6. Autocadastro e aprovação explícita'
            b = p.chromium.launch(headless=True, args=ARGS_NAVEGADOR); cn = novo_contexto(b)
            pn2 = cn.new_page(); pn2.on('dialog', aceitar); pn2.goto(BASE + '/index.html')
            pn2.click('#show-register')
            campos = {'#register-name': 'Novo', '#register-surname': 'Fictício', '#register-cpf': '000.000.000-00', '#register-rg': '0000',
                      '#register-rg-orgao': 'SSP', '#register-nacionalidade': 'brasileira', '#register-email': 'novo@exemplo.test',
                      '#register-telefone': '(00) 00000-0000', '#register-endereco': 'Rua Fictícia, 0', '#register-pix': 'chave-ficticia',
                      '#register-password': SENHA, '#register-birthdate': '2000-01-01', '#register-ingresso': '2026-11-01'}
            for sel, v in campos.items():
                pn2.fill(sel, v)
            pn2.select_option('#register-rg-uf', index=1); pn2.select_option('#register-estado-civil', index=1)
            foto = os.path.join(pasta_priv, 'foto.jpg'); io.open(foto, 'wb').write(JPG_FALSO)
            pn2.set_input_files('#register-photo', foto); time.sleep(2)
            pn2.click('#register-submit')
            ate(lambda: any(d.get('email') == 'novo@exemplo.test' for _, d in listar('users')), 25)
            ate(lambda: any(d.get('email') == 'novo@exemplo.test' for _, d in listar('perfis')) or False, 10)
            novos_users = [(uid, d) for uid, d in listar('users') if d.get('email') == 'novo@exemplo.test']
            erro_tela = pn2.evaluate("(document.getElementById('register-error')||{}).textContent || ''")
            caso(G, 'autocadastro pela interface cria o cadastro como pendente', len(novos_users) == 1 and novos_users[0][1].get('acesso') == 'pendente', erro_tela[:150])
            caso(G, 'autocadastro grava perfil e organograma (não quebrou com as regras novas)', bool(novos_users) and ate(lambda: ler('perfis/' + novos_users[0][0]) is not None and ler('organograma/' + novos_users[0][0]) is not None, 15), erro_tela[:150])
            caso(G, 'pendente vê aviso de aguardando aprovação e não entra', esperar(pn2, "document.getElementById('login-error').textContent.includes('aguarda a aprovação')", 10000))
            b.close()
            if novos_users:
                ba, ca, pa, oka = sessao('admin@exemplo.test')
                ok_nos_dialogos(pa)
                pa.evaluate(f"window.__aprovarUser('{novos_users[0][0]}')")
                ate(lambda: (ler('users/' + novos_users[0][0]) or {}).get('acesso') == 'ativo', 15)
                caso(G, 'admin aprova pela interface (Aprovar acesso)', (ler('users/' + novos_users[0][0]) or {}).get('acesso') == 'ativo')
                bn0, cn0, pn0, okn0 = sessao('novo@exemplo.test')
                caso(G, 'aprovado mas ainda sem abas: não lê dados', sdk(pn0, "await firebase.firestore().collection('organograma').get()").startswith('erro:permission-denied'))
                bn0.close()
                caso(G, 'admin libera uma aba (Editar abas)', sdk(pa, f"await firebase.firestore().doc('users/{novos_users[0][0]}').update({{tabs:['chat']}})") == 'ok')
                ba.close()
                bn, cn2, pn3, okn = sessao('novo@exemplo.test')
                caso(G, 'depois da aprovação e da aba, entra e lê os dados da equipe', okn and sdk(pn3, "return (await firebase.firestore().collection('organograma').get()).size").startswith('ok'))
                bn.close()
            bl = p.chromium.launch(headless=True, args=ARGS_NAVEGADOR); cl = novo_contexto(bl); ml = entrar(cl, 'legado@exemplo.test')
            caso(G, 'cadastro antigo sem abas ficou pendente e não entra', esperar(ml, "document.getElementById('login-error').textContent.includes('aguarda a aprovação')", 15000))
            bl.close()
        bloco('6. Autocadastro e aprovação explícita', b6)

    # ===== 7. Robô do Astrea (código real do importar.py, apontado para os emuladores)
    G = '7. Robô do Astrea (importar.py real, com os endereços trocados para o emulador)'
    sys.path.insert(0, os.path.join(RAIZ, 'scripts', 'astrea-importer'))
    try:
        spec = importlib.util.spec_from_file_location('importar_teste', os.path.join(RAIZ, 'scripts', 'astrea-importer', 'importar.py'))
        imp = importlib.util.module_from_spec(spec); spec.loader.exec_module(imp)
        imp.FIREBASE_PROJECT = PROJ; imp.FIREBASE_API_KEY = 'demo-key'
        imp.ROBO_EMAIL = 'robo@exemplo.test'; imp.ROBO_SENHA = SENHA
        orig = {m: getattr(requests, m) for m in ('get', 'post', 'patch')}

        def trocar(url):
            u = url.replace('https://identitytoolkit.googleapis.com', AUTH + '/identitytoolkit.googleapis.com').replace('https://firestore.googleapis.com', FS)
            if (urllib.parse.urlparse(u).hostname or '').endswith('googleapis.com'):
                pedidos_producao.append('robô: ' + u[:100]); raise RuntimeError('tentou produção')
            return u
        for m, f in orig.items():
            setattr(imp.requests, m, (lambda f: lambda url, *a, **k: f(trocar(url), *a, **k))(f))
        tok = imp.get_firebase_token()
        caso(G, 'robô autentica (e informa a UID no log)', bool(tok))
        hoje = time.strftime('%Y-%m-%d')
        try:
            imp.enviar_firestore([{'Tipo': 'Prazo', 'Título': 'Registro do robô fictício', 'Responsáveis': 'Membro Fictício', 'Data': hoje}], ['Tipo', 'Título', 'Responsáveis', 'Data'])
            gravou = 'Registro do robô fictício' in json.dumps(ler(f'astreaDiario/{hoje}') or {}, ensure_ascii=False)
        except SystemExit:
            gravou = False
        caso(G, 'robô cadastrado em robos/{uid} grava a agenda', gravou)
        apagar(f"robos/{U['robo']}")
        try:
            imp.enviar_firestore([{'Tipo': 'Prazo', 'Título': 'Gravação indevida', 'Data': hoje}], ['Tipo', 'Título', 'Data'])
            bloqueado = 'Gravação indevida' not in json.dumps(ler(f'astreaDiario/{hoje}') or {}, ensure_ascii=False)
        except (SystemExit, Exception):
            bloqueado = 'Gravação indevida' not in json.dumps(ler(f'astreaDiario/{hoje}') or {}, ensure_ascii=False)
        caso(G, 'sem robos/{uid} (descadastrado), o mesmo robô é recusado', bloqueado)
        for m, f in orig.items(): setattr(imp.requests, m, f)
    except Exception as e:
        caso(G, 'robô: execução do importar.py', False, 'exceção: ' + str(e)[:200])
    nao_testado.append(('Robô: login no Astrea e exportação da planilha (Playwright no site do Astrea)', 'exige credenciais reais e acesso ao Astrea; foi testada só a parte que fala com o Firebase'))
    nao_testado.append(('Botão "Executar robô agora" + watcher.py', 'o watcher roda em laço no PC do escritório; a regra de astreaTrigger está coberta nos testes de regras'))

    for c in console:
        if c.startswith('LOGIN FALHOU'): print('DIAGNÓSTICO: ' + c)
    caso('0. Isolamento do ambiente de teste', 'nenhum pedido saiu para domínios de produção', not pedidos_producao, '; '.join(pedidos_producao[:5]))
    site.shutdown()

    falhas, g0 = 0, ''
    for g, n, ok, det in sorted(resultados, key=lambda r: r[0]):
        if g != g0: print('\n' + g); g0 = g
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (('  [' + det + ']') if (det and not ok) else ''))
    print('\nNÃO TESTADO:')
    for o, pq in nao_testado: print('  - ' + o + ' — ' + pq)
    print('\nFuncional: %d de %d verificações passaram (%d reprovadas).' % (len(resultados) - falhas, len(resultados), falhas))
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        import traceback; traceback.print_exc()
        print(chr(10) + 'RESULTADOS ATÉ A FALHA:')
        for g, n, ok, det in resultados: print(('  ✓ ' if ok else '  ✗ ') + g + ' | ' + n + ('  [' + det + ']' if det and not ok else ''))
        print(chr(10) + 'CONSOLE (últimas 40):'); [print('  ' + c) for c in console[-40:]]
        sys.exit(2)
