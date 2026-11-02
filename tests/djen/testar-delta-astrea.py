# -*- coding: utf-8 -*-
"""Teste local (dados fictícios; sem Astrea e sem Firebase de verdade) do delta da agenda:
o artefato NaN x null que fazia toda tarefa sem número de processo aparecer como concluída e nova,
as repetições e a análise só de leitura que roda no PC do escritório."""
import importlib.util, json, os, shutil, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import openpyxl

sys.dont_write_bytecode = True
RAIZ = Path(__file__).resolve().parents[2]
ROBO = RAIZ / 'scripts' / 'astrea-importer' / 'importar.py'
ANALISE = RAIZ / 'scripts' / 'seguranca' / 'analisar_delta_astrea.py'
COMMIT_ANTIGO = '4d115d5'  # versão em uso no PC do escritório
COLUNAS = ['Data', 'Hora', 'Tipo', 'Responsável', 'Título', 'Título do processo/caso/atendimento', 'Número do processo', 'Juízo',
           'Observação da atividade', 'Etiquetas', 'Envolvidos', 'Status', 'Prioridade', 'Data de criação', 'Data de conclusão']
res = []


def caso(n, ok, det=''): res.append((n, bool(ok), det))


def linha(titulo, numero=None, data='05/11/2026', resp='Pessoa Teste'):
    return [data, '09:00', 'Tarefa', resp, titulo, 'Caso fictício', numero, None, None, 'Etiqueta', None, 'A concluir', 'Alta', '01/10/2026 - 10:00', None]


# ontem: A (com processo), B e C (sem processo), D repetida 2x (sem processo), E (concluída hoje), F (remarcada hoje)
ONTEM = [linha('A SENTINELA-CLIENTE', '0000001-00.2026.8.13.0001'), linha('B'), linha('C'), linha('D'), linha('D'),
         linha('E', '0000002-00.2026.8.13.0001'), linha('F', '0000003-00.2026.8.13.0001')]
# hoje: A, B, C, uma D, F com outra data e G nova (sem processo)
HOJE = [linha('A SENTINELA-CLIENTE', '0000001-00.2026.8.13.0001'), linha('B'), linha('C'), linha('D'),
        linha('F', '0000003-00.2026.8.13.0001', data='12/11/2026'), linha('G')]


def planilha(caminho, linhas):
    wb = openpyxl.Workbook(); ws = wb.active; ws.append(COLUNAS)
    for l in linhas: ws.append(l)
    wb.save(caminho)


def carregar(caminho, nome):
    s = importlib.util.spec_from_file_location(nome, caminho); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    m.log = lambda x: None
    return m


def main():
    tmp = Path(tempfile.mkdtemp())
    p_ontem, p_hoje = tmp / 'ontem.xlsx', tmp / 'hoje.xlsx'
    planilha(p_ontem, ONTEM); planilha(p_hoje, HOJE)
    antigo_src = subprocess.run(['git', '-C', str(RAIZ), 'show', f'{COMMIT_ANTIGO}:scripts/astrea-importer/importar.py'], capture_output=True, text=True, encoding='utf-8').stdout
    (tmp / 'importar_antigo.py').write_text(antigo_src, encoding='utf-8')
    novo, velho = carregar(ROBO, 'novo'), carregar(tmp / 'importar_antigo.py', 'velho')
    volta = lambda m, regs: [m._from_fs_value(m._fs_value(r)) for r in regs]

    o_n, h_n = novo.processar_arquivo(p_ontem), novo.processar_arquivo(p_hoje)
    o_v, h_v = velho.processar_arquivo(p_ontem), velho.processar_arquivo(p_hoje)
    caso('corrigido: nenhuma célula NaN sobra na planilha processada', not any(isinstance(v, float) and v != v for r in h_n for v in r.values()))
    caso('corrigido: o que vai para o Firestore é idêntico ao da versão em uso',
         json.dumps([novo._fs_value(r) for r in h_n], sort_keys=True) == json.dumps([velho._fs_value(r) for r in h_v], sort_keys=True))
    d = velho.calcular_delta(h_v, volta(velho, o_v))
    caso('versão em uso reproduz o problema: 5 novos e 5 concluídos (só 2 e 3 são reais)', (d['novosTotal'], d['concluidosTotal']) == (5, 5), str(d))
    d = velho.calcular_delta(h_v, volta(velho, h_v))
    caso('versão em uso: o mesmo dia comparado com ele mesmo lido do Firestore já dá novos e concluídos', d['novosTotal'] == 4 and d['concluidosTotal'] == 4, str(d))
    d = novo.calcular_delta(h_n, volta(novo, o_n))
    caso('corrigido: 2 novos (G e F remarcada) e 3 concluídos (E, uma D e F da data antiga)', (d['novosTotal'], d['concluidosTotal']) == (2, 3), str(d))
    d = novo.calcular_delta(h_n, volta(novo, h_n))
    caso('corrigido: o mesmo dia comparado com ele mesmo dá 0 e 0', (d['novosTotal'], d['concluidosTotal']) == (0, 0), str(d))
    d = novo.calcular_delta(volta(novo, h_n), volta(novo, o_n))
    caso('corrigido: o resultado é o mesmo com os dois dias lidos do Firestore', (d['novosTotal'], d['concluidosTotal']) == (2, 3), str(d))
    caso('responsável vazio não vira a pessoa "nan"', novo._responsaveis_de({'Responsável': float('nan')}) == [] and velho._responsaveis_de({'Responsável': float('nan')}) == ['nan'])
    caso('número do processo lido como 123.0 e como "123" dá a mesma chave',
         novo._chave_tarefa({'Número do processo': 123.0}) == novo._chave_tarefa({'Número do processo': '123'}))

    # análise só de leitura, como no PC do escritório: robô na versão em uso, num repositório git com alteração local
    raiz = Path(tempfile.mkdtemp()); robo = raiz / 'scripts' / 'astrea-importer'; robo.mkdir(parents=True)
    fake_login = '\n\ndef get_firebase_token():\n    return "cab.e30.ass"\n'  # o teste não faz login de verdade
    (robo / 'importar.py').write_text(antigo_src + fake_login, encoding='utf-8')
    (raiz / '.gitignore').write_text('credenciais.env\n', encoding='utf-8')
    g = lambda *x: subprocess.run(['git', '-C', str(raiz), *x], capture_output=True, text=True)
    g('init', '-q'); g('add', '-A'); g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'x')
    (robo / 'log-watcher.txt').write_text('[06:00:00] Watcher iniciado\n', encoding='utf-8')
    hist = Path(tempfile.mkdtemp()) / 'historico'; hist.mkdir()
    shutil.copy(p_ontem, hist / '2026-11-01_Agenda.xlsx'); shutil.copy(p_hoje, hist / '2026-11-02_Agenda.xlsx')
    pasta = Path(tempfile.mkdtemp()); shutil.copy(ANALISE, pasta / 'analisar_delta_astrea.py')

    srv = ThreadingHTTPServer(('127.0.0.1', 0), Firestore); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_port}/v1'
    reg = lambda regs: {'arrayValue': {'values': [novo._fs_value(r) for r in volta(novo, regs)]}}
    Firestore.docs = {
        'astreaDiario/2026-11-01': {'fields': {'total': {'integerValue': '7'}, 'atualizadoEm': {'stringValue': '2026-11-01T10:03:00Z'}, 'registros': reg(o_n)}},
        'astreaDiario/2026-11-02': {'fields': {'total': {'integerValue': '6'}, 'atualizadoEm': {'stringValue': '2026-11-02T10:02:54Z'}, 'registros': reg(h_n)}},
        'astreaDelta/2026-11-02': {'fields': {'novosTotal': {'integerValue': '5'}, 'concluidosTotal': {'integerValue': '5'}, 'totalHoje': {'integerValue': '6'}}},
    }
    env = dict(os.environ, PYTHONIOENCODING='utf-8', DIAG_FIRESTORE_BASE=base, NO_PROXY='127.0.0.1')

    def rodar(*extra):
        Firestore.chamadas = []
        p = subprocess.run([sys.executable, str(pasta / 'analisar_delta_astrea.py'), '--pasta-robo', str(robo), '--historico', str(hist), '--sem-tarefas', *extra],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
        return p.returncode, p.stdout + p.stderr

    c, t = rodar()
    caso('análise sem rede: termina com código 0 e não chama nada', c == 0 and not Firestore.chamadas and 'BLOQUEADO' not in t, t[-600:])
    caso('análise: mostra o delta da versão em uso (5/5) e o corrigido (2/3)',
         'código atual): 5 novos, 5 concluídos' in t and 'repetições contadas): 2 novos, 3 concluídos' in t, t[-900:])
    caso('análise: mede o artefato, as repetições e as remarcações',
         'o artefato): 4' in t and 'remarcações (mesmo tipo, número e título; mudou só data/hora): 1 pares' in t and "1 chaves repetidas, 1 registros" in t, t[-900:])
    caso('análise: lista o histórico arquivado e o log do watcher', '2026-11-02_Agenda.xlsx' in t and 'Watcher iniciado' in t)
    caso('análise: não imprime dados da agenda', 'SENTINELA-CLIENTE' not in t and '0000001-00.2026' not in t and 'Pessoa Teste' not in t)
    caso('análise: repositório do robô inalterado e sem __pycache__', 'repositório do robô inalterado' in t and not (robo / '__pycache__').exists())
    c, t = rodar('--firebase')
    caso('análise --firebase: só lê astreaDiario e astreaDelta, sem gravar',
         c == 0 and Firestore.chamadas and all(m == 'GET' and x.split('/')[0] in ('astreaDiario', 'astreaDelta') for m, x in Firestore.chamadas), str(Firestore.chamadas) + t[-600:])
    caso('análise --firebase: mostra o delta gravado e recalcula com os dois dias do Firebase',
         'novos=5 concluídos=5' in t and 'gravados no Firebase 2026-11-01 -> 2026-11-02' in t and 'repetições contadas): 2 novos, 3 concluídos' in t, t[-900:])
    srv.shutdown()

    falhas = 0
    print('\nDELTA DA AGENDA DO ASTREA (dados fictícios, Firestore falso local)')
    for n, ok, det in res:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (f'  [{det}]' if det and not ok else ''))
    print(f'\nDelta: {len(res) - falhas} de {len(res)} verificações passaram ({falhas} reprovadas).')
    sys.exit(1 if falhas else 0)


class Firestore(BaseHTTPRequestHandler):
    docs, chamadas = {}, []

    def log_message(self, *a): pass

    def _resp(self, cod, corpo):
        b = json.dumps(corpo).encode()
        self.send_response(cod); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        c = self.path.split('/documents/', 1)[1].split('?', 1)[0]; Firestore.chamadas.append(('GET', c))
        if '/' not in c:
            return self._resp(200, {'documents': [{'name': f'x/documents/{k}', **v} for k, v in Firestore.docs.items() if k.startswith(c + '/')]})
        if c in Firestore.docs: return self._resp(200, {'name': f'x/documents/{c}', **Firestore.docs[c]})
        self._resp(404, {})

    def do_PATCH(self):
        Firestore.chamadas.append(('PATCH', self.path)); self._resp(403, {})


if __name__ == '__main__':
    main()
