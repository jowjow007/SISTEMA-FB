# -*- coding: utf-8 -*-
"""
Análise SÓ DE LEITURA do robô do Astrea no PC do escritório (revisão de segurança, 02/11/2026):
de onde veio a gravação da agenda e por que o delta mostra centenas de "novos" e "concluídos".

Copie para a mesma pasta do diagnóstico (C:\\Users\\FB\\diagnostico-astrea\\) e rode com o python.exe da tarefa:

  python analisar_delta_astrea.py              # sem rede: tarefas agendadas, arquivos e planilhas do histórico
  python analisar_delta_astrea.py --firebase   # também LÊ astreaDiario/astreaDelta (login do robô; nada é gravado)

O que este arquivo garante:
  - não abre o Astrea, não grava no Firebase, não altera tarefas nem arquivos do robô;
  - não faz "git pull" e confere no fim que o repositório do robô continua igual;
  - bloqueia qualquer chamada de rede fora do permitido (sem --firebase: nenhuma);
  - não imprime dados da agenda: só nomes de colunas, contagens, datas e códigos de resultado;
  - grava a saída em analise-AAAAMMDD-HHMMSS.txt, na pasta deste arquivo.
"""
import argparse, collections, datetime, importlib.util, json, os, re, subprocess, sys, traceback
from pathlib import Path

AQUI = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument('--firebase', action='store_true', help='também lê (sem gravar) astreaDiario e astreaDelta')
ap.add_argument('--pasta-robo', default=r'C:\Users\FB\portal-fb\scripts\astrea-importer')
ap.add_argument('--historico', default=str(Path.home() / 'Downloads' / 'astrea-import' / 'historico'))
ap.add_argument('--planilhas', nargs=2, metavar=('ANTERIOR', 'NOVA'), help='compara estas duas planilhas em vez das do histórico')
ap.add_argument('--sem-tarefas', action='store_true', help='não consulta o Agendador de Tarefas (usado nos testes)')
a = ap.parse_args()
PASTA = Path(a.pasta_robo)
BASE = os.getenv('DIAG_FIRESTORE_BASE', 'https://firestore.googleapis.com/v1')  # só os testes locais trocam
LOGIN = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'

os.environ['ASTREA_AUTO_UPDATE'] = 'false'
os.environ['_ASTREA_ATUALIZADO'] = '1'
sys.dont_write_bytecode = True

ARQ = AQUI / f"analise-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.txt"
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


def info(t): print(f"[análise {datetime.datetime.now():%H:%M:%S}] {t}", flush=True)


def estado_git():
    raiz = str(PASTA.parents[1])
    try:
        g = lambda *x: subprocess.run(['git', '-C', raiz, *x], capture_output=True, text=True, timeout=30)
        head = g('rev-parse', '--short', 'HEAD').stdout.strip()
        return (head, sorted(g('status', '--porcelain').stdout.rstrip().splitlines())) if head else None
    except Exception:
        return None


# ---------- trava de rede ----------
def autorizar(metodo, url):
    if not a.firebase: return False
    if url.split('?', 1)[0] == LOGIN: return metodo == 'POST'
    if not url.startswith(BASE) or '/documents/' not in url: return False
    c = url.split('/documents/', 1)[1].split('?', 1)[0]
    return metodo == 'GET' and c.split('/', 1)[0] in ('astreaDiario', 'astreaDelta')


try:
    import requests
    _orig = requests.sessions.Session.request

    def _guarda(self, method, url, *args, **kw):
        m, u = str(method).upper(), str(url)
        if not autorizar(m, u):
            info(f"BLOQUEADO pela análise: {m} {u.split('?', 1)[0]}")
            raise RuntimeError('chamada bloqueada pela análise')
        return _orig(self, method, url, *args, **kw)
    requests.sessions.Session.request = _guarda
except Exception as e:
    info(f"não foi possível instalar a trava de rede ({e}); interrompendo por segurança"); sys.exit(2)

GIT_ANTES = estado_git()
info(f"análise só de leitura{' + leitura no Firebase' if a.firebase else ' (sem rede)'}; robô em {PASTA}")
if GIT_ANTES: info(f"código do robô: {GIT_ANTES[0]} | alterados localmente: {', '.join(s.strip() for s in GIT_ANTES[1]) or 'nenhum'}")
try:
    spec = importlib.util.spec_from_file_location('importar_analise', PASTA / 'importar.py')
    imp = importlib.util.module_from_spec(spec); spec.loader.exec_module(imp)
    imp.log = lambda m: None  # o robô imprime o nome da planilha; aqui só contagens
except Exception:
    info("ERRO ao carregar importar.py:\n" + traceback.format_exc()); sys.exit(2)
try:
    import pandas; info(f"pandas {pandas.__version__}")
except Exception:
    pass


# ---------- 1) tarefas agendadas e histórico do Agendador ----------
RESULTADOS = {0: 'sucesso', 1: 'o programa terminou com erro (código 1)', 0x41301: 'em execução', 0x41303: 'ainda não executada',
              0x41306: 'encerrada (desligamento, fim de sessão ou limite de tempo)', 0x8004131F: 'já havia uma instância rodando',
              0x800710E0: 'recusada pelo operador ou administrador', 0xC000013A: 'interrompida (Ctrl+C ou fechamento)'}
PS_TAREFAS = r"""
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$l = Get-ScheduledTask | Where-Object { $_.TaskName -match '(?i)astrea' -or (($_.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)" }) -join ' ') -match '(?i)astrea|importar\.py|watcher\.py' }
$s = foreach ($t in $l) { $i = $t | Get-ScheduledTaskInfo
  [pscustomobject]@{ nome=$t.TaskName; estado="$($t.State)"; ultima=$(if ($i.LastRunTime) { $i.LastRunTime.ToString('s') } else { '' })
    resultado=[int64]$i.LastTaskResult; proxima=$(if ($i.NextRunTime) { $i.NextRunTime.ToString('s') } else { '' })
    usuario="$($t.Principal.UserId)"; logon="$($t.Principal.LogonType)"; nivel="$($t.Principal.RunLevel)"; limite="$($t.Settings.ExecutionTimeLimit)"
    gatilhos=@($t.Triggers | ForEach-Object { "$($_.CimClass.CimClassName) $($_.StartBoundary)" })
    acoes=@($t.Actions | ForEach-Object { "$($_.Execute) | $($_.Arguments) | $($_.WorkingDirectory)" }) } }
$ev = try { @(Get-WinEvent -FilterHashtable @{ LogName='Microsoft-Windows-TaskScheduler/Operational'; StartTime=(Get-Date).AddDays(-6) } -ErrorAction Stop |
  Where-Object { $_.Message -match '(?i)astrea' } | Sort-Object TimeCreated | ForEach-Object {
    $m = ($_.Message -replace '\s+', ' '); [pscustomobject]@{ quando=$_.TimeCreated.ToString('s'); id=$_.Id; msg=$m.Substring(0, [Math]::Min(230, $m.Length)) } }) } catch { "$($_.Exception.Message)" }
[pscustomobject]@{ tarefas=@($s); eventos=$ev } | ConvertTo-Json -Depth 4
"""


def tarefas():
    info("== 1) Tarefas agendadas do robô (só consulta) ==")
    try:
        p = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', PS_TAREFAS], capture_output=True, timeout=120)
        j = json.loads(p.stdout.decode('utf-8', 'replace') or '{}')
    except Exception as e:
        info(f"não foi possível consultar o Agendador: {e}"); return
    if not j.get('tarefas'): info("nenhuma tarefa com 'astrea', 'importar.py' ou 'watcher.py' encontrada")
    for t in j.get('tarefas') or []:
        r = t.get('resultado', 0) & 0xFFFFFFFF
        info(f"tarefa {t['nome']}: estado={t['estado']} última={t['ultima']} resultado=0x{r:X} ({RESULTADOS.get(r, 'ver tabela de códigos')}) próxima={t['proxima']}")
        info(f"  conta={t['usuario']} logon={t['logon']} nível={t['nivel']} limite={t['limite']} gatilhos={t['gatilhos']}")
        for ac in t.get('acoes') or []: info(f"  ação: {ac}")
    ev = j.get('eventos')
    if isinstance(ev, str):
        info(f"histórico do Agendador indisponível: {ev} (o log 'TaskScheduler/Operational' costuma vir desligado)")
    elif not ev:
        info("histórico do Agendador: nenhum evento do robô nos últimos 6 dias (ou o histórico está desligado)")
    else:
        info(f"histórico do Agendador (últimos 6 dias, {len(ev)} eventos; 100=início, 200/201=ação iniciada/concluída com código, 102=concluída, 111/322/329=encerrada ou ignorada):")
        for e in ev: info(f"  {e['quando']} id={e['id']} {e['msg']}")


# ---------- 2) arquivos deixados pelas execuções ----------
def arquivos():
    info("== 2) Arquivos das execuções (nomes, tamanhos e horários) ==")
    hist = Path(a.historico)
    if hist.exists():
        fs = sorted(hist.glob('*.xlsx'), key=lambda p: p.stat().st_mtime)
        info(f"histórico ({hist}): {len(fs)} planilha(s) arquivada(s); só existe quando a execução chegou ao fim. Últimas:")
        for p in fs[-8:]: info(f"  {p.name}  {p.stat().st_size} bytes  arquivada em {datetime.datetime.fromtimestamp(p.stat().st_mtime):%Y-%m-%d %H:%M:%S}")
        soltas = sorted(hist.parent.glob('*.xlsx'), key=lambda p: p.stat().st_mtime)
        for p in soltas: info(f"  planilha não arquivada: {p.name}  {datetime.datetime.fromtimestamp(p.stat().st_mtime):%Y-%m-%d %H:%M:%S}")
    else:
        info(f"pasta do histórico não encontrada: {hist}")
    for nome in ('log-diario.txt', 'log-watcher.txt'):
        p = PASTA / nome
        if not p.exists(): info(f"{nome}: não existe"); continue
        linhas = p.read_text(encoding='utf-8', errors='replace').splitlines()
        info(f"{nome}: {len(linhas)} linhas, alterado em {datetime.datetime.fromtimestamp(p.stat().st_mtime):%Y-%m-%d %H:%M:%S}; últimas 20 (mensagens do watcher, sem dados da agenda):")
        for l in linhas[-20:]: info(f"  | {l[:200]}")
    logs = PASTA / 'logs'
    info(f"pasta logs/: {', '.join(p.name for p in sorted(logs.glob('*.txt'))) if logs.exists() else 'não existe (o log próprio só chega com a publicação)'}")


# ---------- 3) por que o delta dá centenas de novos e concluídos ----------
def ida_e_volta(regs):
    """Como o dia anterior volta do Firestore: NaN vira null."""
    return [imp._from_fs_value(imp._fs_value(r)) for r in regs]


def texto(v):
    if v is None or (isinstance(v, float) and v != v): return ''
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    return ' '.join(str(v).split())


def campo(r, *nomes):
    for k in r:
        if any(n in k.lower() for n in nomes): return texto(r[k])
    return ''


def chave(r, sem_data=False, por_criacao=False):
    base = [campo(r, 'tipo'), campo(r, 'número', 'numero'), campo(r, 'título', 'titulo')]
    if por_criacao: return '|'.join(base + [campo(r, 'data de cria'), campo(r, 'respons')])
    return '|'.join(base if sem_data else base + [campo(r, 'data'), campo(r, 'hora')])


def delta_multiconjunto(hoje, ontem, f=chave):
    ch, co = collections.Counter(f(r) for r in hoje), collections.Counter(f(r) for r in ontem)
    return sum((ch - co).values()), sum((co - ch).values())


def comparar(nova, anterior, rotulo, anterior_ja_do_firestore=False):
    info(f"-- {rotulo}: {len(anterior)} registros antes, {len(nova)} depois")
    ant_fs = anterior if anterior_ja_do_firestore else ida_e_volta(anterior)
    d = imp.calcular_delta(nova, ant_fs)
    info(f"delta que o robô grava hoje (código atual): {d['novosTotal']} novos, {d['concluidosTotal']} concluídos")
    n, c = delta_multiconjunto(nova, ant_fs)
    info(f"delta com a correção (vazio/NaN normalizados e repetições contadas): {n} novos, {c} concluídos")
    artef = sum(1 for r, v in zip(nova, ida_e_volta(nova)) if imp._chave_tarefa(r) != imp._chave_tarefa(v))
    info(f"registros do dia cuja chave muda só por ir e voltar do Firestore (o artefato): {artef}")
    nan = collections.Counter(k for r in nova for k, v in r.items() if isinstance(v, float) and v != v)
    info(f"células NaN que o código atual deixa na planilha do dia, por coluna: {dict(nan) or 'nenhuma'}")
    for nome, regs in (('antes', ant_fs), ('depois', nova)):
        cs = collections.Counter(chave(r) for r in regs)
        info(f"repetições ({nome}): {sum(1 for v in cs.values() if v > 1)} chaves repetidas, {sum(v - 1 for v in cs.values() if v > 1)} registros que o código atual não conta")
    n2, c2 = delta_multiconjunto(nova, ant_fs, lambda r: chave(r, sem_data=True))
    info(f"remarcações (mesmo tipo, número e título; mudou só data/hora): {min(n, c) - min(n2, c2)} pares contados como 1 concluído + 1 novo")
    n3, c3 = delta_multiconjunto(nova, ant_fs, lambda r: chave(r, por_criacao=True))
    info(f"alternativa (chave com data de criação e responsável no lugar de data/hora): {n3} novos, {c3} concluídos")


def planilhas():
    info("== 3) Delta: comparação entre dois dias, só contagens ==")
    if a.planilhas:
        par = [Path(p) for p in a.planilhas]
    else:
        fs = sorted(Path(a.historico).glob('????-??-??_*.xlsx'))
        por_dia = {}
        for p in fs: por_dia[p.name[:10]] = p
        dias = sorted(por_dia)
        if len(dias) < 2:
            info("o histórico não tem planilhas de dois dias diferentes; use --planilhas ANTERIOR NOVA"); return
        par = [por_dia[dias[-2]], por_dia[dias[-1]]]
    regs = [imp.processar_arquivo(p) for p in par]
    info(f"colunas: {list(regs[1][0].keys()) if regs[1] else []}")
    comparar(regs[1], regs[0], f"planilhas {par[0].name} -> {par[1].name}")


# ---------- 4) o que está gravado no Firebase (só leitura) ----------
def firebase():
    info("== 4) Firebase (só leitura) ==")
    token = imp.get_firebase_token()
    h = {'Authorization': f'Bearer {token}'}
    url = lambda c: f"{BASE}/projects/{imp.FIREBASE_PROJECT}/databases/(default)/documents/{c}"

    def listar(col, campos):
        docs, pag = [], None
        for _ in range(20):
            p = [('pageSize', '300')] + [('mask.fieldPaths', c) for c in campos] + ([('pageToken', pag)] if pag else [])
            r = requests.get(url(col), headers=h, params=p, timeout=60); r.raise_for_status(); j = r.json()
            docs += j.get('documents', []); pag = j.get('nextPageToken')
            if not pag: break
        return sorted(((d['name'].rsplit('/', 1)[1], {k: imp._from_fs_value(v) for k, v in d.get('fields', {}).items()}) for d in docs))
    for nome, f in listar('astreaDiario', ['total', 'atualizadoEm'])[-7:]:
        info(f"astreaDiario/{nome}: total={f.get('total')} atualizadoEm={f.get('atualizadoEm')}")
    deltas = listar('astreaDelta', ['totalHoje', 'totalOntem', 'novosTotal', 'concluidosTotal', 'atualizadoEm'])
    info(f"astreaDelta: {len(deltas)} dia(s); os últimos 12 (novos/concluídos gravados):")
    for nome, f in deltas[-12:]:
        info(f"  {nome}: totalHoje={f.get('totalHoje')} totalOntem={f.get('totalOntem')} novos={f.get('novosTotal')} concluídos={f.get('concluidosTotal')} atualizadoEm={f.get('atualizadoEm')}")
    dias = [n for n, _ in listar('astreaDiario', ['total'])][-2:]
    if len(dias) == 2:
        regs = []
        for d in dias:
            r = requests.get(url(f'astreaDiario/{d}'), headers=h, params=[('mask.fieldPaths', 'registros')], timeout=120); r.raise_for_status()
            regs.append(imp._from_fs_value(r.json().get('fields', {}).get('registros', {'nullValue': None})) or [])
        comparar(regs[1], regs[0], f"gravados no Firebase {dias[0]} -> {dias[1]} (os dois já sem NaN)", anterior_ja_do_firestore=True)


codigo = 0
for etapa in ([] if a.sem_tarefas else [tarefas]) + [arquivos, planilhas] + ([firebase] if a.firebase else []):
    try:
        etapa()
    except SystemExit as e:
        codigo = e.code if isinstance(e.code, int) else 1; info(f"etapa {etapa.__name__} encerrou com sys.exit({e.code})")
    except Exception:
        codigo = 1; info(f"ERRO na etapa {etapa.__name__}:\n" + traceback.format_exc())
if GIT_ANTES:
    if estado_git() == GIT_ANTES: info("repositório do robô inalterado")
    else: info("ATENÇÃO: o repositório do robô mudou durante a análise"); codigo = codigo or 3
info(f"RESULTADO: código {codigo}. Saída completa: {ARQ}")
sys.exit(codigo)
