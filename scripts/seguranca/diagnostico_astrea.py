# -*- coding: utf-8 -*-
"""
Execução SUPERVISIONADA do robô do Astrea para descobrir o erro real (revisão de segurança, 02/11/2026).

Copie este arquivo para uma pasta FORA do repositório, por exemplo C:\\Users\\FB\\diagnostico-astrea\\,
e rode no PowerShell do PC do escritório, com o mesmo python.exe da tarefa:

  Fase A (padrão, NÃO grava no Firebase):   python diagnostico_astrea.py
  Fase B (só com autorização; grava a agenda do dia no Firebase, como a tarefa diária faria):
                                            python diagnostico_astrea.py --completo

O que este arquivo garante:
  - não faz "git pull" (atualização automática desligada) e não altera a pasta do repositório;
  - não altera a tarefa agendada;
  - na Fase A não fala com o Firebase (nem login, nem leitura, nem gravação);
  - grava tudo (inclusive o erro completo) em diagnostico-AAAAMMDD-HHMMSS.txt, na pasta deste arquivo;
  - não imprime senhas nem e-mails completos.
"""
import argparse, asyncio, datetime, importlib.util, os, subprocess, sys, traceback
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument('--completo', action='store_true', help='Fase B: também grava no Firebase (só com autorização)')
ap.add_argument('--pasta-robo', default=r'C:\Users\FB\portal-fb\scripts\astrea-importer')
a = ap.parse_args()
PASTA = Path(a.pasta_robo)

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


info(f"modo: {'FASE B — completo (grava no Firebase)' if a.completo else 'FASE A — sem gravar no Firebase'}")
info(f"python: {sys.executable} {sys.version.split()[0]}")
info(f"pasta do robô: {PASTA}  existe={PASTA.exists()}")
try:
    head = subprocess.run(['git', '-C', str(PASTA.parents[1]), 'log', '-1', '--format=%h %ad %s', '--date=iso'], capture_output=True, text=True, timeout=30).stdout.strip()
    sujos = subprocess.run(['git', '-C', str(PASTA.parents[1]), 'status', '--porcelain'], capture_output=True, text=True, timeout=30).stdout.strip().splitlines()
    info(f"código do robô (sem atualizar): {head} | arquivos alterados localmente: {len(sujos)}")
except Exception as e:
    info(f"git indisponível: {e}")
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

# 3) carrega o robô como módulo (o bloco __main__ dele NÃO roda: nem log próprio, nem git pull)
try:
    spec = importlib.util.spec_from_file_location('importar_diag', PASTA / 'importar.py')
    imp = importlib.util.module_from_spec(spec); spec.loader.exec_module(imp)
except Exception:
    info("ERRO ao carregar importar.py:\n" + traceback.format_exc()); sys.exit(2)
info(f"credenciais.env: ASTREA_EMAIL={mascara(imp.ASTREA_EMAIL)} ASTREA_SENHA={'preenchida' if imp.ASTREA_SENHA else 'VAZIA'} "
     f"FIREBASE_ROBO_EMAIL={mascara(imp.ROBO_EMAIL)} FIREBASE_ROBO_SENHA={'preenchida' if imp.ROBO_SENHA else 'VAZIA'} HEADLESS={imp.HEADLESS}")
imp.atualizar_codigo = lambda: info("atualização automática desligada neste diagnóstico")

if not a.completo:
    def sem_gravar(registros, colunas):
        info(f"FASE A: NÃO enviado ao Firebase. Registros lidos da planilha: {len(registros)}; colunas: {len(colunas)}")
    imp.enviar_firestore = sem_gravar
    imp.arquivar = lambda c: info(f"FASE A: planilha mantida em {c} (não arquivada)")
    imp.get_firebase_token = lambda: (_ for _ in ()).throw(RuntimeError('FASE A não deveria falar com o Firebase'))

# 4) roda e registra o resultado real
codigo = 0
try:
    asyncio.run(imp.main())
except SystemExit as e:
    codigo = e.code if isinstance(e.code, int) else 1
    info(f"o robô encerrou com sys.exit({e.code})")
except Exception:
    codigo = 1
    info("ERRO NÃO TRATADO NO ROBÔ:\n" + traceback.format_exc())
info(f"RESULTADO: código {codigo}. Log completo: {ARQ}")
sys.exit(codigo)
