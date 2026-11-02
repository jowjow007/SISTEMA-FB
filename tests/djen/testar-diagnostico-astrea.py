# -*- coding: utf-8 -*-
"""Teste local (sem Astrea e sem Firebase de verdade) do diagnóstico supervisionado e do log próprio do importar.py.
O Firestore é um servidor falso em 127.0.0.1; o robô é falso; a pasta do robô é um repositório git temporário."""
import json, os, shutil, subprocess, sys, tempfile, threading, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DIAG = RAIZ / 'scripts' / 'seguranca' / 'diagnostico_astrea.py'
HOJE = datetime.date.today().isoformat()
ONTEM = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
res = []
FALSO = r'''
import os, sys, asyncio, base64, json, datetime
import requests
from pathlib import Path
AQUI = Path(__file__).parent
ASTREA_EMAIL = "astrea@exemplo.test"; ASTREA_SENHA = "x"; ROBO_EMAIL = "robo@exemplo.test"; ROBO_SENHA = "y"; HEADLESS = False
FIREBASE_PROJECT = "projeto-teste"
BASE = os.environ.get("DIAG_FIRESTORE_BASE", "")
def log(m): print(m, flush=True)
def atualizar_codigo(): (AQUI / "GIT_PULL_CHAMADO").write_text("1")
def get_firebase_token():
    (AQUI / "FIREBASE_CHAMADO").write_text("1")
    p = base64.urlsafe_b64encode(json.dumps({"user_id": "UIDTESTE123456789"}).encode()).decode().rstrip("=")
    return "cab." + p + ".ass"
def _url(c): return f"{BASE}/projects/{FIREBASE_PROJECT}/databases/(default)/documents/{c}"
def calcular_delta(h, o): return {"novosTotal": len(h), "concluidosTotal": len(o)}
def enviar_firestore(registros, colunas):
    get_firebase_token(); hoje = datetime.date.today().isoformat()
    requests.patch(_url(f"astreaDiario/{hoje}"), json={"fields": {"total": {"integerValue": str(len(registros))}, "atualizadoEm": {"stringValue": "agora"}}}).raise_for_status()
    requests.patch(_url(f"astreaDelta/{hoje}"), json={"fields": {"totalHoje": {"integerValue": str(len(registros))}}}).raise_for_status()
    if os.getenv("FALSO_MODO") == "escrita_extra":
        requests.patch(_url("users/alguem"), json={"fields": {}}).raise_for_status()
    (AQUI / "GRAVOU").write_text(str(len(registros)))
def arquivar(c): (AQUI / "ARQUIVOU").write_text("1")
async def main():
    (AQUI / "ENV").write_text(os.getenv("ASTREA_AUTO_UPDATE", "?"))
    modo = os.getenv("FALSO_MODO", "ok")
    if modo == "exit1": log("ERRO: Nenhum arquivo para processar."); sys.exit(1)
    if modo == "excecao": raise RuntimeError("falha simulada no Playwright")
    if modo == "rede_fase_a": requests.get(_url(f"astreaDiario/{datetime.date.today().isoformat()}"))
    enviar_firestore([{"a": 1}, {"a": 2}], ["a"]); arquivar("planilha.xlsx"); log("Importação concluída.")
'''


class Firestore(BaseHTTPRequestHandler):
    """Firestore falso: guarda documentos em memória e anota cada chamada recebida."""
    docs, chamadas = {}, []

    def log_message(self, *a): pass

    def _resp(self, cod, corpo):
        b = json.dumps(corpo).encode()
        self.send_response(cod); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def _caminho(self): return self.path.split('/documents/', 1)[1].split('?', 1)[0]

    def do_GET(self):
        c = self._caminho(); Firestore.chamadas.append(('GET', c))
        if '/' not in c:
            lista = [{'name': f'x/documents/{k}', **v} for k, v in Firestore.docs.items() if k.startswith(c + '/')]
            return self._resp(200, {'documents': lista})
        if c in Firestore.docs: return self._resp(200, {'name': f'x/documents/{c}', **Firestore.docs[c]})
        self._resp(404, {'error': 'nao existe'})

    def do_PATCH(self):
        c = self._caminho(); Firestore.chamadas.append(('PATCH', c))
        n = int(self.headers.get('Content-Length', 0)); Firestore.docs[c] = json.loads(self.rfile.read(n))
        self._resp(200, Firestore.docs[c])


srv = ThreadingHTTPServer(('127.0.0.1', 0), Firestore)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_port}/v1'


def preparar_firestore():
    reg = {'arrayValue': {'values': [{'mapValue': {'fields': {'a': {'integerValue': '9'}}}}]}}
    Firestore.docs = {
        f'astreaDiario/{ONTEM}': {'fields': {'total': {'integerValue': '1'}, 'registros': reg}},
        f'astreaDiario/{HOJE}': {'fields': {'total': {'integerValue': '7'}, 'atualizadoEm': {'stringValue': 'versao-antiga'}}},
    }
    Firestore.chamadas = []


def caso(n, ok, det=''): res.append((n, bool(ok), det))


def git(raiz, *a): return subprocess.run(['git', '-C', str(raiz), *a], capture_output=True, text=True)


def rodar_diag(modo, *args):
    raiz = Path(tempfile.mkdtemp()); robo = raiz / 'scripts' / 'astrea-importer'; robo.mkdir(parents=True)
    (robo / 'importar.py').write_text(FALSO, encoding='utf-8'); (raiz / 'outro.txt').write_text('original', encoding='utf-8')
    # como no PC do escritório, __pycache__ NÃO é ignorado: se o diagnóstico o criasse, o repositório "mudaria"
    (raiz / '.gitignore').write_text('scripts/astrea-importer/*\n!scripts/astrea-importer/importar.py\n!scripts/astrea-importer/__pycache__/\n', encoding='utf-8')
    git(raiz, 'init', '-q'); git(raiz, 'add', '-A'); git(raiz, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'inicial')
    (raiz / 'outro.txt').write_text('alteracao local', encoding='utf-8')  # alteração local que precisa ser preservada
    diag_dir = Path(tempfile.mkdtemp()); shutil.copy(DIAG, diag_dir / 'diagnostico_astrea.py')
    env = dict(os.environ, FALSO_MODO=modo, PYTHONIOENCODING='utf-8', DIAG_FIRESTORE_BASE=BASE, NO_PROXY='127.0.0.1')
    env.pop('ASTREA_AUTO_UPDATE', None)
    preparar_firestore()
    p = subprocess.run([sys.executable, str(diag_dir / 'diagnostico_astrea.py'), '--pasta-robo', str(robo), *args], capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
    logs = list(diag_dir.glob('diagnostico-*.txt'))
    texto = logs[0].read_text(encoding='utf-8') if logs else ''
    return p.returncode, robo, texto, diag_dir, raiz


def escritas(): return [c for m, c in Firestore.chamadas if m != 'GET']


def main():
    c, robo, t, d, raiz = rodar_diag('ok')
    caso('Fase A: termina com código 0', c == 0, t[-300:])
    caso('Fase A: NÃO chama o Firebase (nem login nem gravação)', not (robo / 'FIREBASE_CHAMADO').exists() and not (robo / 'GRAVOU').exists() and not Firestore.chamadas)
    caso('Fase A: não arquiva a planilha', not (robo / 'ARQUIVOU').exists())
    caso('Fase A: não faz git pull e desliga a atualização automática', not (robo / 'GIT_PULL_CHAMADO').exists() and (robo / 'ENV').read_text() == 'false')
    caso('Fase A: registra quantos registros leu', 'Registros lidos da planilha: 2' in t)
    caso('não imprime e-mails completos', 'astrea@exemplo.test' not in t and 'robo@exemplo.test' not in t and 'ast***@exemplo.test' in t)
    caso('lista o arquivo alterado localmente e confirma que o repositório ficou igual',
         'alterado localmente (preservado):  M outro.txt' in t and 'repositório do robô inalterado' in t
         and (raiz / 'outro.txt').read_text(encoding='utf-8') == 'alteracao local', t[:600])
    c, robo, t, d, raiz = rodar_diag('rede_fase_a')
    caso('Fase A: a trava bloqueia qualquer chamada de rede do robô', c == 1 and 'BLOQUEADO pelo diagnóstico' in t and not Firestore.chamadas, t[-300:])
    c, robo, t, d, raiz = rodar_diag('exit1')
    caso('captura sys.exit(1) do robô com a mensagem', c == 1 and 'Nenhum arquivo para processar' in t and 'sys.exit(1)' in t, t[-300:])
    c, robo, t, d, raiz = rodar_diag('excecao')
    caso('captura erro não tratado com o traceback', c == 1 and 'falha simulada no Playwright' in t and 'Traceback' in t, t[-300:])

    c, robo, t, d, raiz = rodar_diag('ok', '--leitura')
    caso('Fase B1: termina com código 0 e faz login', c == 0 and (robo / 'FIREBASE_CHAMADO').exists(), t[-400:])
    caso('Fase B1: NÃO grava nada e não arquiva', not escritas() and not (robo / 'GRAVOU').exists() and not (robo / 'ARQUIVOU').exists(), str(Firestore.chamadas))
    caso('Fase B1: mostra o documento de hoje que seria substituído', f'leitura astreaDiario/{HOJE}: existe (total=7 atualizadoEm=versao-antiga)' in t, t[-800:])
    caso('Fase B1: lista os dias mais recentes e calcula o delta só em totais', 'astreaDiario tem 2 dia(s)' in t and 'delta que a Fase B2 gravaria: 2 novos, 1 concluídos' in t, t[-800:])
    caso('Fase B1: UID só mascarada', 'UIDTES…' in t and 'UIDTESTE123456789' not in t)
    caso('Fase B1: lê só astreaDiario e astreaDelta', all(x.split('/')[0] in ('astreaDiario', 'astreaDelta') for _, x in Firestore.chamadas))

    c, robo, t, d, raiz = rodar_diag('ok', '--completo')
    caso('Fase B2: grava só astreaDiario/{hoje} e astreaDelta/{hoje}', c == 0 and sorted(escritas()) == sorted([f'astreaDelta/{HOJE}', f'astreaDiario/{HOJE}']), str(Firestore.chamadas) + t[-400:])
    copias = list(d.glob(f'copia-anterior-astreaDiario-{HOJE}-*.json'))
    caso('Fase B2: salva cópia do documento de hoje antes de substituir', copias and 'versao-antiga' in copias[0].read_text(encoding='utf-8') and 'será SUBSTITUÍDO' in t)
    caso('Fase B2: avisa que astreaDelta de hoje não existia e será criado', f'astreaDelta/{HOJE} não existia (HTTP 404): será criado' in t)
    caso('Fase B2: confere a gravação', f'conferência astreaDiario/{HOJE}: OK (gravado 2, planilha 2)' in t)
    caso('Fase B2: sem git pull, repositório inalterado', not (robo / 'GIT_PULL_CHAMADO').exists() and 'repositório do robô inalterado' in t)
    c, robo, t, d, raiz = rodar_diag('escrita_extra', '--completo')
    caso('Fase B2: bloqueia gravação fora dos dois documentos', c == 1 and 'users/alguem' not in escritas() and 'BLOQUEADO pelo diagnóstico' in t, t[-400:])

    # log próprio do importar.py real (numa cópia temporária, sem Astrea)
    tmp = Path(tempfile.mkdtemp()); shutil.copy(RAIZ / 'scripts' / 'astrea-importer' / 'importar.py', tmp / 'importar.py')
    (tmp / 'credenciais.env').write_text('ASTREA_EMAIL=\nASTREA_SENHA=\n', encoding='utf-8')
    codigo = ("import importlib.util,sys; sys.argv=['importar.py','>>','log-diario.txt','2>&1'];"
              f"s=importlib.util.spec_from_file_location('m', r'{tmp / 'importar.py'}'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m);"
              "m.configurar_log_em_arquivo(); m.log('linha de teste'); raise ValueError('falha simulada')")
    subprocess.run([sys.executable, '-c', codigo], capture_output=True, text=True, encoding='utf-8', errors='replace', env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    arq = tmp / 'logs' / f'importar-{datetime.date.today().isoformat()}.txt'
    t = arq.read_text(encoding='utf-8') if arq.exists() else ''
    caso('importar.py: cria logs/importar-AAAA-MM-DD.txt mesmo com os argumentos da tarefa', arq.exists())
    caso('importar.py: avisa dos argumentos de redirecionamento ignorados', "argumentos ignorados ['>>', 'log-diario.txt', '2>&1']" in t, t[:300])
    caso('importar.py: grava as mensagens e o erro não tratado com traceback', 'linha de teste' in t and 'ERRO NÃO TRATADO' in t and 'falha simulada' in t)

    falhas = 0
    print('\nDIAGNÓSTICO SUPERVISIONADO DO ROBÔ + LOG PRÓPRIO (robô falso, Firestore falso local, sem Astrea)')
    for n, ok, det in res:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (f'  [{det}]' if det and not ok else ''))
    print(f'\nDiagnóstico: {len(res) - falhas} de {len(res)} verificações passaram ({falhas} reprovadas).')
    srv.shutdown()
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
