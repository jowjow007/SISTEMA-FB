# -*- coding: utf-8 -*-
"""Teste local da recuperação supervisionada do watcher: usa o watcher.py REAL (só o login e o endereço do Firestore
trocados por um servidor falso em 127.0.0.1); sem Astrea, sem Firebase de verdade, sem dados reais."""
import json, os, shutil, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
WATCHER = RAIZ / 'scripts' / 'astrea-importer' / 'watcher.py'
SUP = RAIZ / 'scripts' / 'seguranca' / 'watcher_supervisionado.py'
res = []


class Firestore(BaseHTTPRequestHandler):
    """Só o documento astreaTrigger/pedido. Modo 'corrida': o 1º GET vê 'concluido', os seguintes veem 'pendente'."""
    status, modo, chamadas, gets = None, '', [], 0

    def log_message(self, *a): pass

    def _resp(self, cod, corpo):
        b = json.dumps(corpo).encode()
        self.send_response(cod); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        Firestore.chamadas.append('GET'); Firestore.gets += 1
        st = Firestore.status
        if Firestore.modo == 'corrida': st = 'concluido' if Firestore.gets == 1 else 'pendente'
        if st is None: return self._resp(404, {})
        self._resp(200, {'fields': {'status': {'stringValue': st}, 'solicitadoEm': {'timestampValue': '2026-10-26T12:00:00Z'}}})

    def do_PATCH(self): Firestore.chamadas.append('PATCH'); self._resp(200, {})
    def do_DELETE(self): Firestore.chamadas.append('DELETE'); self._resp(200, {})


def caso(n, ok, det=''): res.append((n, bool(ok), det))


def main():
    srv = ThreadingHTTPServer(('127.0.0.1', 0), Firestore); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_port}/v1'
    raiz = Path(tempfile.mkdtemp()); robo = raiz / 'scripts' / 'astrea-importer'; robo.mkdir(parents=True)
    troca = (f"\n\nDOC_URL = '{base}/projects/x/databases/(default)/documents/astreaTrigger/pedido'\n"
             "def get_token():\n    return 'cab.e30.ass'\n"
             "def executar_robo():\n    (BASE / 'IMPORTOU').write_text('1'); return True\n")  # se a supervisão falhar, o teste vê
    (robo / 'watcher.py').write_text(WATCHER.read_text(encoding='utf-8') + troca, encoding='utf-8')
    (raiz / '.gitignore').write_text('credenciais.env\n', encoding='utf-8')
    g = lambda *x: subprocess.run(['git', '-C', str(raiz), *x], capture_output=True, text=True)
    g('init', '-q'); g('add', '-A'); g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'x')
    pasta = Path(tempfile.mkdtemp()); shutil.copy(SUP, pasta / 'watcher_supervisionado.py')
    env = dict(os.environ, PYTHONIOENCODING='utf-8', DIAG_FIRESTORE_BASE=base, NO_PROXY='127.0.0.1')

    def rodar(status, *extra, modo=''):
        Firestore.status, Firestore.modo, Firestore.chamadas, Firestore.gets = status, modo, [], 0
        (robo / 'IMPORTOU').unlink(missing_ok=True)
        p = subprocess.run([sys.executable, str(pasta / 'watcher_supervisionado.py'), '--pasta-robo', str(robo), '--sem-agendador', *extra],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
        return p.returncode, p.stdout + p.stderr, (robo / 'IMPORTOU').exists()

    c, t, imp = rodar(None)
    caso('W1 sem pedido: código 0, diz que iniciar não dispara importação, só leu', c == 0 and 'NÃO existe' in t and Firestore.chamadas == ['GET'] and not imp, t[-500:])
    c, t, imp = rodar('pendente')
    caso('W1 com pedido pendente: avisa que iniciar DISPARA importação, sem gravar', c == 0 and 'DISPARA uma importação' in t and Firestore.chamadas == ['GET'] and not imp, t[-500:])
    c, t, imp = rodar('executando')
    caso('W1 com pedido travado em executando: explica e não grava', c == 0 and 'travado' in t and Firestore.chamadas == ['GET'], t[-500:])
    c, t, imp = rodar(None, '--um-ciclo')
    caso('W2 sem pedido: roda um ciclo do watcher real, termina com 0, sem gravar nem importar',
         c == 0 and 'W2 concluído' in t and 'PATCH' not in Firestore.chamadas and 'DELETE' not in Firestore.chamadas and not imp, t[-500:])
    c, t, imp = rodar('pendente', '--um-ciclo')
    caso('W2 com pedido pendente: recusa (código 5) sem rodar o ciclo e sem importar', c == 5 and 'W2 NÃO executado' in t and Firestore.chamadas == ['GET'] and not imp, t[-500:])
    c, t, imp = rodar('concluido', '--um-ciclo')
    caso('W2 com pedido concluído: o watcher ignora, sem gravar', c == 0 and Firestore.chamadas == ['GET', 'GET'] and not imp, str(Firestore.chamadas))
    c, t, imp = rodar(None, '--um-ciclo', modo='corrida')
    caso('W2 se alguém clicar durante o ciclo: a troca para "executando" é bloqueada e nada é importado (código 6)',
         c == 6 and 'PATCH' not in Firestore.chamadas and 'BLOQUEADO pela supervisão: PATCH' in t and not imp, t[-700:])
    caso('a atualização automática fica desligada para processos filhos', "os.environ['ASTREA_AUTO_UPDATE'] = 'false'" in SUP.read_text(encoding='utf-8'))
    caso('repositório do robô inalterado e sem __pycache__', 'repositório do robô inalterado' in t and not (robo / '__pycache__').exists())
    srv.shutdown()

    falhas = 0
    print('\nWATCHER SUPERVISIONADO (watcher.py real, Firestore falso local)')
    for n, ok, det in res:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (f'  [{det}]' if det and not ok else ''))
    print(f'\nWatcher: {len(res) - falhas} de {len(res)} verificações passaram ({falhas} reprovadas).')
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
