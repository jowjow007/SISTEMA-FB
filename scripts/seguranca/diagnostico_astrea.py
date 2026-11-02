# -*- coding: utf-8 -*-
"""
Execução SUPERVISIONADA do robô do Astrea para descobrir o erro real (revisão de segurança, 02/11/2026).

Copie este arquivo para uma pasta FORA do repositório, por exemplo C:\\Users\\FB\\diagnostico-astrea\\,
e rode no PowerShell do PC do escritório, com o mesmo python.exe da tarefa:

  Fase A  (padrão; NÃO fala com o Firebase):        python diagnostico_astrea.py
  Fase B1 (login e LEITURA no Firebase; não grava):  python diagnostico_astrea.py --leitura
  Fase B2 (só com autorização; grava a agenda do dia, como a tarefa diária faria):
                                                     python diagnostico_astrea.py --completo

O que este arquivo garante:
  - não faz "git pull" (atualização automática desligada) e confere no fim que o repositório do robô
    continua igual (mesmo commit e mesmos arquivos alterados localmente);
  - não altera a tarefa agendada;
  - bloqueia qualquer chamada de rede do robô fora do permitido em cada fase:
      A: nenhuma;  B1: login do robô e leitura de astreaDiario/astreaDelta;
      B2: o mesmo + gravação SÓ em astreaDiario/{hoje} e astreaDelta/{hoje};
  - na B2, antes de gravar, salva nesta pasta uma cópia dos dois documentos como estavam (se existiam);
  - grava tudo (inclusive o erro completo) em diagnostico-AAAAMMDD-HHMMSS.txt, na pasta deste arquivo;
  - não imprime senhas, e-mails completos, UID completa nem registros da agenda (só contagens).
"""
import argparse, asyncio, base64, datetime, importlib.util, json, os, subprocess, sys, traceback
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
fase = ap.add_mutually_exclusive_group()
fase.add_argument('--leitura', action='store_true', help='Fase B1: login e leitura no Firebase, sem gravar')
fase.add_argument('--completo', action='store_true', help='Fase B2: também grava no Firebase (só com autorização)')
ap.add_argument('--pasta-robo', default=r'C:\Users\FB\portal-fb\scripts\astrea-importer')
a = ap.parse_args()
PASTA = Path(a.pasta_robo)
FASE = 'B2' if a.completo else 'B1' if a.leitura else 'A'
HOJE = datetime.date.today().isoformat()
ONTEM = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
# endereço do Firestore; só os testes locais trocam (servidor falso)
BASE = os.getenv('DIAG_FIRESTORE_BASE', 'https://firestore.googleapis.com/v1')
LOGIN = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'

# 1) desliga a atualização automática ANTES de carregar o robô
os.environ['ASTREA_AUTO_UPDATE'] = 'false'
os.environ['_ASTREA_ATUALIZADO'] = '1'

# 2) tudo o que aparecer na tela também vai para o arquivo de diagnóstico
ARQ = AQUI / f"diagnostico-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
_f = open(ARQ, 'a', encoding='utf-8')


class Dup:
    def __init__(self, o): self.o = o
    def write(self, t):
        for d in (self.o, _f):
            try: d.write(t); d.flush()
            except Exception: pass
    def flush(self):
        for d in (self.o, _f):
            try: d.flush()
            except Exception: pass


sys.stdout, sys.stderr = Dup(sys.stdout), Dup(sys.stderr)


def info(t): print(f"[diagnóstico {datetime.datetime.now():%H:%M:%S}] {t}", flush=True)


def mascara(e):
    if not e or '@' not in e: return '(vazio)' if not e else '(sem @)'
    u, d = e.split('@', 1); return u[:3] + '***@' + d


def estado_git():
    """Commit e arquivos alterados localmente (só os nomes) da pasta do portal no PC."""
    raiz = str(PASTA.parents[1])
    try:
        g = lambda *x: subprocess.run(['git', '-C', raiz, *x], capture_output=True, text=True, timeout=30)
        head = g('log', '-1', '--format=%h %ad %s', '--date=iso').stdout.strip()
        if not head: return None
        sujos = sorted(g('status', '--porcelain').stdout.rstrip().splitlines())
        imp_alterado = g('diff', '--quiet', 'HEAD', '--', 'scripts/astrea-importer/importar.py').returncode != 0
        return head, sujos, imp_alterado
    except Exception as e:
        info(f"git indisponível: {e}")
        return None


DESCRICAO = {
    'A': 'FASE A — sem falar com o Firebase',
    'B1': 'FASE B1 — login e leitura no Firebase, sem gravar',
    'B2': 'FASE B2 — completo (grava astreaDiario/{hoje} e astreaDelta/{hoje})',
}
info(f"modo: {DESCRICAO[FASE]}; data de hoje neste PC: {HOJE}")
info(f"python: {sys.executable} {sys.version.split()[0]}")
info(f"pasta do robô: {PASTA}  existe={PASTA.exists()}")
GIT_ANTES = estado_git()
if GIT_ANTES:
    head, sujos, imp_alterado = GIT_ANTES
    info(f"código do robô (sem atualizar): {head} | arquivos alterados localmente: {len(sujos)}")
    for s in sujos: info(f"  alterado localmente (preservado): {s}")
    info(f"importar.py igual ao do commit: {'NÃO (há alteração local nele)' if imp_alterado else 'sim'}")
for mod in ('playwright', 'pandas', 'openpyxl', 'requests', 'dotenv'):
    try:
        m = __import__(mod); info(f"pacote {mod}: {getattr(m, '__version__', 'ok')}")
    except Exception as e:
        info(f"pacote {mod}: FALTANDO ({e})")
try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        exe = p.chromium.executable_path
        info(f"navegador do Playwright: {exe}  existe={Path(exe).exists()}")
except Exception as e:
    info(f"navegador do Playwright: erro ao verificar ({e})")


# 3) trava de rede: o robô só alcança o que a fase permite (o Astrea usa o navegador, não passa por aqui)
def _caminho_doc(url):
    if not url.startswith(BASE) or '/documents/' not in url: return None
    return url.split('/documents/', 1)[1].split('?', 1)[0]


def autorizar(metodo, url):
    if FASE == 'A':
        return False
    if url.split('?', 1)[0] == LOGIN:
        return metodo == 'POST'
    c = _caminho_doc(url)
    if c is None:
        return False
    if metodo == 'GET':
        return c.split('/', 1)[0] in ('astreaDiario', 'astreaDelta')
    if metodo == 'PATCH' and FASE == 'B2':
        return c in (f'astreaDiario/{HOJE}', f'astreaDelta/{HOJE}')
    return False


try:
    import requests
    _request_original = requests.sessions.Session.request

    def _guarda(self, method, url, *args, **kw):
        m, u = str(method).upper(), str(url)
        if not autorizar(m, u):
            info(f"BLOQUEADO pelo diagnóstico ({DESCRICAO[FASE]}): {m} {u.split('?', 1)[0]}")
            raise RuntimeError(f"chamada bloqueada pelo diagnóstico: {m} {u.split('?', 1)[0]}")
        return _request_original(self, method, url, *args, **kw)
    requests.sessions.Session.request = _guarda
except Exception as e:
    info(f"não foi possível instalar a trava de rede ({e}); interrompendo por segurança")
    sys.exit(2)

# 4) carrega o robô como módulo (o bloco __main__ dele NÃO roda: nem log próprio, nem git pull)
sys.dont_write_bytecode = True  # não cria __pycache__ dentro do repositório do robô
try:
    spec = importlib.util.spec_from_file_location('importar_diag', PASTA / 'importar.py')
    imp = importlib.util.module_from_spec(spec); spec.loader.exec_module(imp)
except Exception:
    info("ERRO ao carregar importar.py:\n" + traceback.format_exc()); sys.exit(2)
info(f"credenciais.env: ASTREA_EMAIL={mascara(imp.ASTREA_EMAIL)} ASTREA_SENHA={'preenchida' if imp.ASTREA_SENHA else 'VAZIA'} "
     f"FIREBASE_ROBO_EMAIL={mascara(imp.ROBO_EMAIL)} FIREBASE_ROBO_SENHA={'preenchida' if imp.ROBO_SENHA else 'VAZIA'} HEADLESS={imp.HEADLESS}")
imp.atualizar_codigo = lambda: info("atualização automática desligada neste diagnóstico")


# 5) leitura no Firebase (B1 e B2): só metadados e contagens, nunca o conteúdo da agenda
def _url(caminho): return f"{BASE}/projects/{imp.FIREBASE_PROJECT}/databases/(default)/documents/{caminho}"


def _valor(v):
    if 'integerValue' in v: return int(v['integerValue'])
    if 'arrayValue' in v: return [_valor(x) for x in v['arrayValue'].get('values', [])]
    if 'mapValue' in v: return {k: _valor(x) for k, x in v['mapValue'].get('fields', {}).items()}
    for k in ('stringValue', 'doubleValue', 'booleanValue'):
        if k in v: return v[k]
    return None


def ler(token, caminho, campos=None):
    params = [('mask.fieldPaths', c) for c in campos] if campos else None
    r = requests.get(_url(caminho), headers={'Authorization': f'Bearer {token}'}, params=params, timeout=60)
    return r.status_code, (r.json() if r.ok else None)


def resumo(doc):
    f = {k: _valor(v) for k, v in (doc or {}).get('fields', {}).items()}
    return f"total={f.get('total', '?')} atualizadoEm={f.get('atualizadoEm', '?')}"


def uid_mascarada(token):
    try:
        p = token.split('.')[1]; p += '=' * (-len(p) % 4)
        uid = json.loads(base64.urlsafe_b64decode(p)).get('user_id', '')
        return (uid[:6] + '…') if uid else '?'
    except Exception:
        return '?'


def entrar():
    token = imp.get_firebase_token()
    info(f"login do robô no Firebase: ok; UID começa com {uid_mascarada(token)} (confira com o registro local)")
    return token


def panorama(token):
    for c in (f'astreaDiario/{HOJE}', f'astreaDelta/{HOJE}', f'astreaDiario/{ONTEM}'):
        st, doc = ler(token, c, ['total', 'atualizadoEm', 'totalHoje'])
        info(f"leitura {c}: " + (f"existe ({resumo(doc)})" if doc else f"não existe ou sem acesso (HTTP {st})"))
    datas, pagina = [], None
    for _ in range(20):
        params = [('pageSize', '300'), ('mask.fieldPaths', 'total'), ('mask.fieldPaths', 'atualizadoEm')]
        if pagina: params.append(('pageToken', pagina))
        r = requests.get(_url('astreaDiario'), headers={'Authorization': f'Bearer {token}'}, params=params, timeout=60)
        if not r.ok:
            info(f"listagem de astreaDiario: HTTP {r.status_code}"); return
        j = r.json()
        datas += [(d['name'].rsplit('/', 1)[1], d) for d in j.get('documents', [])]
        pagina = j.get('nextPageToken')
        if not pagina: break
    datas.sort(key=lambda x: x[0])
    info(f"astreaDiario tem {len(datas)} dia(s); os mais recentes:")
    for nome, d in datas[-5:]: info(f"  {nome}: {resumo(d)}")


if FASE == 'A':
    def sem_gravar(registros, colunas):
        info(f"FASE A: NÃO enviado ao Firebase. Registros lidos da planilha: {len(registros)}; colunas: {len(colunas)}")
    imp.enviar_firestore = sem_gravar
    imp.arquivar = lambda c: info(f"FASE A: planilha mantida em {c} (não arquivada)")
    imp.get_firebase_token = lambda: (_ for _ in ()).throw(RuntimeError('FASE A não deveria falar com o Firebase'))
elif FASE == 'B1':
    def so_leitura(registros, colunas):
        info(f"FASE B1: planilha com {len(registros)} registros e {len(colunas)} colunas; nada será gravado")
        token = entrar()
        panorama(token)
        st, doc = ler(token, f'astreaDiario/{ONTEM}', ['registros'])
        ontem = _valor((doc or {}).get('fields', {}).get('registros', {'nullValue': None})) or []
        if ontem:
            d = imp.calcular_delta(registros, ontem)
            info(f"delta que a Fase B2 gravaria: {d['novosTotal']} novos, {d['concluidosTotal']} concluídos (só totais)")
        else:
            info("sem astreaDiario de ontem: a Fase B2 não gravaria astreaDelta (o robô pula o delta)")
        info("FASE B1: nada gravado.")
    imp.enviar_firestore = so_leitura
    imp.arquivar = lambda c: info(f"FASE B1: planilha mantida em {c} (não arquivada)")
else:
    enviar_original = imp.enviar_firestore

    def com_copia_e_conferencia(registros, colunas):
        token = entrar()
        panorama(token)
        carimbo = datetime.datetime.now().strftime('%H%M%S')
        for c in (f'astreaDiario/{HOJE}', f'astreaDelta/{HOJE}'):
            st, doc = ler(token, c)
            if doc:
                destino = AQUI / f"copia-anterior-{c.replace('/', '-')}-{carimbo}.json"
                destino.write_text(json.dumps(doc, ensure_ascii=False), encoding='utf-8')
                info(f"{c} existia ({resumo(doc)}): será SUBSTITUÍDO; cópia local em {destino.name} (tem dados de clientes: apague depois de conferir)")
            else:
                info(f"{c} não existia (HTTP {st}): será criado")
        enviar_original(registros, colunas)
        st, doc = ler(token, f'astreaDiario/{HOJE}', ['total', 'atualizadoEm'])
        total = _valor(doc['fields']['total']) if doc and 'total' in doc.get('fields', {}) else None
        info(f"conferência astreaDiario/{HOJE}: {'OK' if total == len(registros) else 'DIVERGENTE'} "
             f"(gravado {total}, planilha {len(registros)})")
        st2, doc2 = ler(token, f'astreaDelta/{HOJE}', ['totalHoje', 'atualizadoEm'])
        info(f"conferência astreaDelta/{HOJE}: " + ('existe' if doc2 else f'não existe (HTTP {st2}); normal se não havia o dia anterior'))
        if total != len(registros):
            raise RuntimeError('a agenda gravada não confere com a planilha')
    imp.enviar_firestore = com_copia_e_conferencia

# 6) roda e registra o resultado real
codigo = 0
try:
    asyncio.run(imp.main())
except SystemExit as e:
    codigo = e.code if isinstance(e.code, int) else 1
    info(f"o robô encerrou com sys.exit({e.code})")
except Exception:
    codigo = 1
    info("ERRO NÃO TRATADO NO ROBÔ:\n" + traceback.format_exc())
GIT_DEPOIS = estado_git()
if GIT_ANTES:
    if GIT_DEPOIS == GIT_ANTES:
        info(f"repositório do robô inalterado (mesmo commit e os mesmos {len(GIT_ANTES[1])} arquivo(s) alterado(s) localmente): sem atualização automática")
    else:
        info(f"ATENÇÃO: o repositório do robô mudou durante o diagnóstico: antes={GIT_ANTES} depois={GIT_DEPOIS}")
        codigo = codigo or 3
info(f"RESULTADO: código {codigo}. Log completo: {ARQ}")
sys.exit(codigo)
