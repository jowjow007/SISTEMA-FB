# -*- coding: utf-8 -*-
"""Teste local (sem Astrea e sem Firebase) do diagnóstico supervisionado e do log próprio do importar.py."""
import io, os, shutil, subprocess, sys, tempfile, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DIAG = RAIZ / 'scripts' / 'seguranca' / 'diagnostico_astrea.py'
res = []
FALSO = r'''
import os, sys, asyncio
from pathlib import Path
AQUI = Path(__file__).parent
ASTREA_EMAIL = "astrea@exemplo.test"; ASTREA_SENHA = "x"; ROBO_EMAIL = "robo@exemplo.test"; ROBO_SENHA = "y"; HEADLESS = False
def log(m): print(m, flush=True)
def atualizar_codigo(): (AQUI / "GIT_PULL_CHAMADO").write_text("1")
def get_firebase_token(): (AQUI / "FIREBASE_CHAMADO").write_text("1"); return "t"
def enviar_firestore(registros, colunas): get_firebase_token(); (AQUI / "GRAVOU").write_text(str(len(registros)))
def arquivar(c): (AQUI / "ARQUIVOU").write_text("1")
async def main():
    (AQUI / "ENV").write_text(os.getenv("ASTREA_AUTO_UPDATE", "?"))
    modo = os.getenv("FALSO_MODO", "ok")
    if modo == "exit1": log("ERRO: Nenhum arquivo para processar."); sys.exit(1)
    if modo == "excecao": raise RuntimeError("falha simulada no Playwright")
    enviar_firestore([{"a": 1}, {"a": 2}], ["a"]); arquivar("planilha.xlsx"); log("Importação concluída.")
'''


def caso(n, ok, det=''): res.append((n, bool(ok), det))


def rodar_diag(modo, *args):
    robo = Path(tempfile.mkdtemp()); (robo / 'importar.py').write_text(FALSO, encoding='utf-8')
    diag_dir = Path(tempfile.mkdtemp()); shutil.copy(DIAG, diag_dir / 'diagnostico_astrea.py')
    env = dict(os.environ, FALSO_MODO=modo, PYTHONIOENCODING='utf-8')
    env.pop('ASTREA_AUTO_UPDATE', None)
    p = subprocess.run([sys.executable, str(diag_dir / 'diagnostico_astrea.py'), '--pasta-robo', str(robo), *args], capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
    logs = list(diag_dir.glob('diagnostico-*.txt'))
    texto = logs[0].read_text(encoding='utf-8') if logs else ''
    return p.returncode, robo, texto


def main():
    c, robo, t = rodar_diag('ok')
    caso('Fase A: termina com código 0', c == 0, t[-300:])
    caso('Fase A: NÃO chama o Firebase (nem login nem gravação)', not (robo / 'FIREBASE_CHAMADO').exists() and not (robo / 'GRAVOU').exists())
    caso('Fase A: não arquiva a planilha', not (robo / 'ARQUIVOU').exists())
    caso('Fase A: não faz git pull e desliga a atualização automática', not (robo / 'GIT_PULL_CHAMADO').exists() and (robo / 'ENV').read_text() == 'false')
    caso('Fase A: registra quantos registros leu', 'Registros lidos da planilha: 2' in t)
    caso('não imprime e-mails completos', 'astrea@exemplo.test' not in t and 'robo@exemplo.test' not in t and 'ast***@exemplo.test' in t)
    c, robo, t = rodar_diag('exit1')
    caso('captura sys.exit(1) do robô com a mensagem', c == 1 and 'Nenhum arquivo para processar' in t and 'sys.exit(1)' in t, t[-300:])
    c, robo, t = rodar_diag('excecao')
    caso('captura erro não tratado com o traceback', c == 1 and 'falha simulada no Playwright' in t and 'Traceback' in t, t[-300:])
    c, robo, t = rodar_diag('ok', '--completo')
    caso('Fase B (--completo): grava como a tarefa faria', c == 0 and (robo / 'GRAVOU').exists() and not (robo / 'GIT_PULL_CHAMADO').exists())

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
    print('\nDIAGNÓSTICO SUPERVISIONADO DO ROBÔ + LOG PRÓPRIO (robô falso, sem Astrea e sem Firebase)')
    for n, ok, det in res:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (f'  [{det}]' if det and not ok else ''))
    print(f'\nDiagnóstico: {len(res) - falhas} de {len(res)} verificações passaram ({falhas} reprovadas).')
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
