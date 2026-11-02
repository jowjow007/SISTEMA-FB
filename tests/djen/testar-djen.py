# -*- coding: utf-8 -*-
"""
Teste do script do DJEN (tools/numeros-escritorio/atualizar_publicacoes.ps1) ANTES de reativar o agendamento.

Roda o script REAL numa cópia descartável do repositório (sem remoto: nada é publicado) e com uma API do CNJ falsa
(dados fictícios, com nomes e números de processo inventados no texto das publicações). Confere três situações:
  1. execução normal na main: grava só os totais (série diária e mensal) e o commit não leva dado de cliente;
  2. alguém recolocou dados privados na página: o script recusa e não grava nem faz commit;
  3. fora da branch main: o script recusa.
Uso: python tests/djen/testar-djen.py      (Windows, PowerShell 5.1 e git no PATH)
"""
import http.server, io, json, os, re, shutil, socketserver, subprocess, sys, tempfile, threading

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SCRIPT = os.path.join(RAIZ, 'tools', 'numeros-escritorio', 'atualizar_publicacoes.ps1')
PAGINA = 'tools/numeros-escritorio/index.html'
CNJ = re.compile(r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}')
res = []


def caso(n, ok, det=''):
    res.append((n, bool(ok), det))


class ApiFalsa(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_GET(self):
        itens = [{'id': i, 'numero_processo': f'{1000000 + i:07d}-11.2026.8.13.0702', 'data_disponibilizacao': f'2026-10-{(i % 28) + 1:02d}',
                  'texto': f'Intimação fictícia de FULANO DE TAL {i} no processo {1000000 + i:07d}-11.2026.8.13.0702'} for i in range(40)]
        corpo = json.dumps({'count': len(itens) if 'pagina=1' in self.path else len(itens), 'items': itens if 'pagina=1' in self.path else []}).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(corpo))); self.end_headers(); self.wfile.write(corpo)


def git(pasta, *a):
    return subprocess.run(['git', '-C', pasta, *a], capture_output=True, text=True, encoding='utf-8')


def preparar(branch='main'):
    pasta = tempfile.mkdtemp(prefix='djen-teste-')
    subprocess.run(['git', 'clone', '-q', RAIZ, pasta], check=True)
    git(pasta, 'remote', 'remove', 'origin')               # sem remoto: o "git push" do script não tem para onde ir
    git(pasta, 'checkout', '-q', '-B', branch)
    git(pasta, 'config', 'user.email', 'teste@exemplo.test'); git(pasta, 'config', 'user.name', 'teste')
    s = io.open(SCRIPT, encoding='utf-8-sig').read()
    # o script descobre o repositório pela própria pasta ($PSScriptRoot), então a cópia descartável já é o alvo
    assert '$RepoDir        = (Resolve-Path (Join-Path $PSScriptRoot' in s, 'o script voltou a ter a pasta do repositório fixa'
    s = s.replace('https://comunicaapi.pje.jus.br', 'http://127.0.0.1:8777')
    assert '127.0.0.1:8777' in s, 'não consegui apontar o script para a API falsa'
    alvo = os.path.join(pasta, 'tools', 'numeros-escritorio', 'atualizar_publicacoes.ps1')
    io.open(alvo, 'w', encoding='utf-8-sig').write(s)
    git(pasta, 'update-index', '--assume-unchanged', 'tools/numeros-escritorio/atualizar_publicacoes.ps1')
    return pasta, alvo


def rodar(alvo, *args):
    return subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', alvo, *args], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)


def nomes_reais():
    caminho = os.path.join(RAIZ, 'privado', 'numeros-stats.json')
    if not os.path.exists(caminho): return set()
    d = json.load(io.open(caminho, encoding='utf-8'))
    return {c['cliente'] for k in ('topClientesDemais', 'topClientesCondo') for c in d.get(k, []) if len(c['cliente']) >= 5}


def main():
    srv = socketserver.TCPServer(('127.0.0.1', 8777), ApiFalsa); threading.Thread(target=srv.serve_forever, daemon=True).start()
    reais = nomes_reais()

    # 1. execução normal
    pasta, alvo = preparar('main')
    antes = git(pasta, 'rev-parse', 'HEAD').stdout.strip()
    p = rodar(alvo)
    depois = git(pasta, 'rev-parse', 'HEAD').stdout.strip()
    caso('1. execução normal faz um commit (na cópia, sem publicar)', antes != depois, (p.stdout + p.stderr)[-300:])
    alterados = git(pasta, 'diff', '--name-only', antes, depois).stdout.split()
    caso('1. o commit altera só a página de Números', alterados == [PAGINA], str(alterados))
    novo = io.open(os.path.join(pasta, PAGINA), encoding='utf-8-sig').read()
    caso('1. a página continua sem número de processo', not CNJ.search(novo))
    caso('1. a página continua sem a lista de clientes (STATS)', 'topClientesDemais"' not in novo and 'const STATS = {' not in novo)
    caso('1. nenhum nome de cliente real na página', not any(n in novo for n in reais), f'{len(reais)} nomes conferidos')
    caso('1. nenhum nome fictício do texto das publicações foi parar na página', 'FULANO DE TAL' not in novo)
    diff = git(pasta, 'show', '--format=', depois).stdout
    caso('1. o que mudou são só os totais (DAILY/MONTHS e números do painel)', 'const DAILY' in diff and not CNJ.search(diff))
    caso('1. o push não publicou nada (cópia sem remoto)', 'origin' not in git(pasta, 'remote').stdout)
    shutil.rmtree(pasta, ignore_errors=True)

    # 2. página com dado privado recolocado
    pasta, alvo = preparar('main')
    pag = os.path.join(pasta, PAGINA)
    s = io.open(pag, encoding='utf-8-sig').read()
    io.open(pag, 'w', encoding='utf-8').write(s.replace('</body>', '<!-- 1234567-89.2026.8.13.0702 --></body>'))
    git(pasta, 'commit', '-qam', 'simula dado privado recolocado')
    antes = git(pasta, 'rev-parse', 'HEAD').stdout.strip()
    p = rodar(alvo)
    caso('2. com número de processo na página, o script recusa', 'Nada foi gravado' in (p.stdout + p.stderr) or 'contem numero de processo' in (p.stdout + p.stderr), (p.stdout + p.stderr)[-200:])
    caso('2. ... e não faz commit', git(pasta, 'rev-parse', 'HEAD').stdout.strip() == antes)
    shutil.rmtree(pasta, ignore_errors=True)

    # 3. fora da main
    pasta, alvo = preparar('seguranca-teste')
    antes = git(pasta, 'rev-parse', 'HEAD').stdout.strip()
    p = rodar(alvo)
    caso('3. fora da branch main, o script recusa', 'so roda na branch main' in (p.stdout + p.stderr), (p.stdout + p.stderr)[-200:])
    caso('3. ... e não grava nem faz commit', git(pasta, 'rev-parse', 'HEAD').stdout.strip() == antes and not git(pasta, 'status', '--porcelain', PAGINA).stdout.strip())
    shutil.rmtree(pasta, ignore_errors=True)
    # 4. -SemPublicar: commit local, sem push (remoto local de mentira para provar que nada chega nele)
    pasta, alvo = preparar('main')
    remoto = tempfile.mkdtemp(prefix='djen-remoto-')
    subprocess.run(['git', 'clone', '-q', '--bare', pasta, remoto], check=True)
    git(pasta, 'remote', 'add', 'origin', remoto); git(pasta, 'fetch', '-q', 'origin'); git(pasta, 'branch', '-q', '-u', 'origin/main')
    remoto_antes = subprocess.run(['git', '-C', remoto, 'rev-parse', 'main'], capture_output=True, text=True).stdout.strip()
    antes = git(pasta, 'rev-parse', 'HEAD').stdout.strip()
    p = rodar(alvo, '-SemPublicar')
    caso('4. -SemPublicar faz o commit local', git(pasta, 'rev-parse', 'HEAD').stdout.strip() != antes, (p.stdout + p.stderr)[-200:])
    caso('4. -SemPublicar não envia nada ao remoto', subprocess.run(['git', '-C', remoto, 'rev-parse', 'main'], capture_output=True, text=True).stdout.strip() == remoto_antes)
    shutil.rmtree(pasta, ignore_errors=True); shutil.rmtree(remoto, ignore_errors=True)
    srv.shutdown()

    falhas = 0
    print('\nDJEN (script real, cópia descartável, API falsa)')
    for n, ok, det in res:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (f'  [{det}]' if det and not ok else ''))
    print(f'\nDJEN: {len(res) - falhas} de {len(res)} verificações passaram ({falhas} reprovadas).')
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
