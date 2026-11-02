# -*- coding: utf-8 -*-
"""
Recuperação SUPERVISIONADA do watcher do robô do Astrea (revisão de segurança, 02/11/2026).

O watcher (watcher.py, tarefa AstreaWatcher) fica lendo astreaTrigger/pedido no Firebase; quando um admin clica em
"Executar robô agora" no portal, o pedido fica "pendente" e o watcher dispara uma importação completa.
Antes de religá-lo, este arquivo confere se há um pedido que dispararia uma importação ao iniciar.

Copie para C:\\Users\\FB\\diagnostico-astrea\\ e rode com o python.exe da tarefa (não o pythonw):

  python watcher_supervisionado.py            # W1: só consulta (Agendador, processos, pedido no Firebase)
  python watcher_supervisionado.py --um-ciclo  # W2: UM ciclo do watcher.py real, em primeiro plano, e termina

O que este arquivo garante:
  - nunca dispara importação: se o pedido estiver "pendente", o W2 não roda o ciclo; e a trava de rede só permite
    o login do robô e a LEITURA de astreaTrigger/pedido (nenhuma gravação, nem a troca para "executando");
  - não inicia, não para e não altera a tarefa AstreaWatcher; o W2 recusa rodar se já houver um watcher ativo;
  - não faz "git pull" e confere no fim que o repositório do robô continua igual;
  - grava a saída em watcher-AAAAMMDD-HHMMSS.txt, na pasta deste arquivo.
"""
import argparse, datetime, importlib.util, json, os, subprocess, sys, traceback
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument('--um-ciclo', action='store_true', help='W2: roda um ciclo do watcher.py (sem disparar importação) e termina')
ap.add_argument('--pasta-robo', default=r'C:\Users\FB\portal-fb\scripts\astrea-importer')
ap.add_argument('--sem-agendador', action='store_true', help='não consulta o Agendador nem os processos (usado nos testes)')
a = ap.parse_args()
PASTA = Path(a.pasta_robo)
BASE = os.getenv('DIAG_FIRESTORE_BASE', 'https://firestore.googleapis.com/v1')  # só os testes locais trocam
LOGIN = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'
PEDIDO = '/documents/astreaTrigger/pedido'

os.environ['ASTREA_AUTO_UPDATE'] = 'false'  # herdado por qualquer processo filho
os.environ['_ASTREA_ATUALIZADO'] = '1'
sys.dont_write_bytecode = True

ARQ = AQUI / f"watcher-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
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


def info(t): print(f"[watcher-supervisionado {datetime.datetime.now():%H:%M:%S}] {t}", flush=True)


def estado_git():
    raiz = str(PASTA.parents[1])
    try:
        g = lambda *x: subprocess.run(['git', '-C', raiz, *x], capture_output=True, text=True, timeout=30)
        head = g('rev-parse', '--short', 'HEAD').stdout.strip()
        return (head, sorted(g('status', '--porcelain').stdout.rstrip().splitlines())) if head else None
    except Exception:
        return None


def sair(codigo, motivo):
    info(motivo)
    if GIT_ANTES:
        if estado_git() == GIT_ANTES: info("repositório do robô inalterado")
        else: info("ATENÇÃO: o repositório do robô mudou"); codigo = codigo or 3
    info(f"RESULTADO: código {codigo}. Saída completa: {ARQ}")
    sys.exit(codigo)


# ---------- trava de rede: login do robô e leitura do pedido, mais nada ----------
def autorizar(metodo, url):
    u = url.split('?', 1)[0]
    if u == LOGIN: return metodo == 'POST'
    return metodo == 'GET' and u.startswith(BASE) and u.endswith(PEDIDO)


BLOQUEIOS = []
try:
    import requests
    _orig = requests.sessions.Session.request

    def _guarda(self, method, url, *args, **kw):
        m, u = str(method).upper(), str(url)
        if not autorizar(m, u):
            BLOQUEIOS.append(m)
            info(f"BLOQUEADO pela supervisão: {m} {u.split('?', 1)[0]}")
            raise RuntimeError('chamada bloqueada pela supervisão')
        return _orig(self, method, url, *args, **kw)
    requests.sessions.Session.request = _guarda
except Exception as e:
    print(f"não foi possível instalar a trava de rede ({e}); interrompendo por segurança"); sys.exit(2)

GIT_ANTES = estado_git()
info(f"modo: {'W2 — um ciclo do watcher, sem disparar importação' if a.um_ciclo else 'W1 — só consulta'}; robô em {PASTA}")
if GIT_ANTES: info(f"código do robô: {GIT_ANTES[0]} | alterados localmente: {', '.join(s.strip() for s in GIT_ANTES[1]) or 'nenhum'}")

# ---------- 1) Agendador e processos (só consulta) ----------
PS = r"""
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$t = Get-ScheduledTask -TaskName 'AstreaWatcher' -ErrorAction SilentlyContinue
$i = if ($t) { $t | Get-ScheduledTaskInfo } else { $null }
$p = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'python%'" | Where-Object { $_.CommandLine -match '(?i)watcher\.py' } |
  ForEach-Object { [pscustomobject]@{ pid=$_.ProcessId; nome=$_.Name; inicio=$(if ($_.CreationDate) { $_.CreationDate.ToString('s') } else { '' }) } })
[pscustomobject]@{
  existe=[bool]$t; estado="$($t.State)"; ultima=$(if ($i -and $i.LastRunTime) { $i.LastRunTime.ToString('s') } else { '' })
  resultado=$(if ($i) { [int64]$i.LastTaskResult } else { 0 }); limite="$($t.Settings.ExecutionTimeLimit)"
  gatilhos=@($t.Triggers | ForEach-Object { "$($_.CimClass.CimClassName)" }); acoes=@($t.Actions | ForEach-Object { "$($_.Execute) | $($_.Arguments)" })
  processos=$p } | ConvertTo-Json -Depth 3
"""
rodando = []
if not a.sem_agendador:
    try:
        j = json.loads(subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', PS], capture_output=True, timeout=120).stdout.decode('utf-8', 'replace'))
        if j.get('existe'):
            r = j['resultado'] & 0xFFFFFFFF
            info(f"tarefa AstreaWatcher: estado={j['estado']} última={j['ultima']} resultado=0x{r:X} limite={j['limite']} gatilhos={j['gatilhos']}")
            for ac in j.get('acoes') or []: info(f"  ação: {ac}")
        else:
            info("tarefa AstreaWatcher: não encontrada")
        rodando = j.get('processos') or []
        info(f"processos do watcher em execução: {len(rodando)}" + ''.join(f"\n    pid={p['pid']} {p['nome']} desde {p['inicio']}" for p in rodando))
    except Exception as e:
        info(f"não foi possível consultar o Agendador/processos: {e}")
        if a.um_ciclo: sair(4, "sem saber se já há um watcher rodando, o W2 não roda")
if a.um_ciclo and rodando:
    sair(4, "já há um watcher em execução: o W2 não inicia outro (dois watchers poderiam disparar duas importações)")

# ---------- 2) carrega o watcher.py real como módulo (o loop dele NÃO roda) ----------
try:
    spec = importlib.util.spec_from_file_location('watcher_supervisionado_mod', PASTA / 'watcher.py')
    w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
except Exception:
    info("ERRO ao carregar watcher.py:\n" + traceback.format_exc()); sair(2, "watcher.py não carregou")
w.executar_robo = lambda: (_ for _ in ()).throw(RuntimeError('importação bloqueada pela supervisão'))  # cinto e suspensório

# ---------- 3) pedido atual no Firebase (só leitura) ----------
try:
    token = w.get_token()
    info("login do robô no Firebase: ok")
    resp = requests.get(w.DOC_URL, headers={'Authorization': f'Bearer {token}'}, timeout=15)
except Exception:
    info("ERRO no login ou na leitura do pedido:\n" + traceback.format_exc()); sair(1, "não foi possível ler o pedido")
if resp.status_code == 404:
    status = None
    info("astreaTrigger/pedido: NÃO existe. Iniciar o watcher não dispara importação.")
elif resp.ok:
    campos = {k: next(iter(v.values()), None) for k, v in resp.json().get('fields', {}).items()}
    status = campos.get('status', '')
    info(f"astreaTrigger/pedido: status='{status}' " + ' '.join(f"{k}={campos[k]}" for k in ('solicitadoEm', 'iniciadoEm', 'concluidoEm') if k in campos))
    info({'pendente': "ATENÇÃO: iniciar o watcher DISPARA uma importação completa em até 90 s (Astrea + gravação no Firebase).",
          'executando': "pedido travado em 'executando' (provável sobra do encerramento do watcher): o watcher o ignora, "
                        "mas o botão do portal fica bloqueado. Liberar exige apagar o documento (gravação; só com autorização).",
          'concluido': "pedido já concluído: o watcher o ignora; o portal apaga o documento quando um admin abre a página.",
          'erro': "pedido terminou com erro: o watcher o ignora; o portal apaga o documento quando um admin abre a página."}
         .get(status, "status desconhecido: o watcher só age com 'pendente'."))
else:
    sair(1, f"leitura do pedido falhou: HTTP {resp.status_code}")

if not a.um_ciclo:
    sair(0, "W1 concluída: nada foi gravado nem iniciado")

# ---------- 4) W2: um ciclo do watcher real, sem importação ----------
if status == 'pendente':
    sair(5, "W2 NÃO executado: com o pedido pendente, o ciclo dispararia uma importação. Nada foi alterado.")
info("W2: rodando UM ciclo de verificar_e_executar() do watcher.py (as mensagens dele aparecem abaixo)")
try:
    w.verificar_e_executar()
except Exception:
    info("ERRO no ciclo do watcher:\n" + traceback.format_exc()); sair(1, "o ciclo falhou")
if BLOQUEIOS:
    sair(6, f"W2: o pedido mudou durante o ciclo e a supervisão bloqueou {len(BLOQUEIOS)} gravação(ões); nenhuma importação foi disparada. Rode a W1 de novo.")
sair(0, "W2 concluído: o watcher entrou, leu o pedido e terminou o ciclo sem gravar nem importar")
