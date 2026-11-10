# -*- coding: utf-8 -*-
"""Agenda (teste) no emulador: regras reais, pessoas fictícias, DJEN falso.
Uso (de dentro de tests/): firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/agenda_teste.py"
"""
import io, os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import funcional as F  # noqa
import requests  # noqa
from playwright.sync_api import sync_playwright  # noqa
AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fotos-agenda'); os.makedirs(AQUI, exist_ok=True)
falhas = []
def ok(c, m):
    print(('  OK   ' if c else '  FALHA ') + m)
    if not c: falhas.append(m)

requests.delete(f'{F.AUTH}/emulator/v1/projects/{F.PROJ}/accounts').raise_for_status()
requests.delete(f'{F.FS}/emulator/v1/projects/{F.PROJ}/databases/(default)/documents').raise_for_status()
F.regras_firestore(io.open(os.path.join(F.RAIZ, 'firestore.rules'), encoding='utf-8').read())
U = {k: F.criar_conta(f'{k}@exemplo.test') for k in ('chefe', 'ana', 'beto')}
dados = {'chefe': ('Chefe Fictício', 'admin', ['chat']), 'ana': ('Ana Fictícia', 'membro', ['agenda-teste']), 'beto': ('Beto Fictício', 'membro', ['chat'])}
for k, (nome, role, tabs) in dados.items():
    F.gravar(f'users/{U[k]}', {'email': f'{k}@exemplo.test', 'displayName': nome, 'role': role, 'tabs': tabs, 'acesso': 'ativo', 'pixChave': 'x'})
    F.gravar(f'perfis/{U[k]}', {'displayName': nome})
    F.gravar(f'organograma/{U[k]}', {'nome': nome})
F.gravar('tabs/chat', {'label': 'Chat', 'url': 'tools/chat/', 'order': 1})
DJEN = {'status': 'success', 'count': 2, 'items': [
  {'id': 9001, 'data_disponibilizacao': time.strftime('%Y-%m-%d'), 'siglaTribunal': 'TJMG', 'nomeOrgao': '1ª Vara Cível Fictícia', 'tipoDocumento': 'Intimação',
   'nomeClasse': 'PROCEDIMENTO COMUM CÍVEL', 'numero_processo': '50000999920268130702', 'link': 'https://exemplo.test/x',
   'texto': 'Fica a parte autora intimada para, no prazo de 15 (quinze) dias, <b>manifestar-se</b> sobre a contestação.',
   'destinatarios': [{'nome': 'CLIENTE FICTICIO LTDA', 'polo': 'A'}, {'nome': 'REU EXEMPLO', 'polo': 'P'}]},
  {'id': 9002, 'data_disponibilizacao': time.strftime('%Y-%m-%d'), 'siglaTribunal': 'TRT3', 'nomeOrgao': 'Vara do Trabalho Fictícia', 'tipoDocumento': 'Notificação',
   'nomeClasse': 'ACAO TRABALHISTA', 'numero_processo': '00100888820265030001', 'link': '', 'texto': 'Notificação de teste.',
   'destinatarios': [{'nome': 'EMPRESA FICTICIA', 'polo': 'P'}]}]}
F.subir_site()
URL = F.BASE + '/tools/agenda-teste/index.html'
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=F.ARGS_NAVEGADOR)
    def abrir(quem):
        ctx = F.novo_contexto(b)
        ctx.route('https://comunicaapi.pje.jus.br/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(DJEN), headers={'Access-Control-Allow-Origin': '*'}))
        pg = F.entrar(ctx, f'{quem}@exemplo.test'); F.esperar(pg, "document.getElementById('app-screen').style.display === 'flex'", 25000)
        t = ctx.new_page(); t.on('dialog', F.aceitar); erros = []; t.on('pageerror', lambda e: erros.append(str(e)))
        t.goto(URL); t.wait_for_timeout(3500); return t, erros
    # ---- administrador ----
    a, ea = abrir('chefe')
    ok('Agenda' in a.inner_text('#pag') and a.is_visible('#t-equipe'), 'admin abre a aba e vê as ferramentas de admin')
    a.click('#t-aba'); a.wait_for_timeout(800); ok(F.ler('tabs/agenda-teste') is not None, 'botão registra a aba no menu')
    a.click('#t-equipe'); a.wait_for_timeout(1200)
    a.select_option(f'[data-membro="{U["ana"]}"]', 'advogado'); a.click('#eq-ok'); a.wait_for_timeout(1000)
    cfg = F.ler('agTeste_config/geral') or {}
    ok((cfg.get('membros') or {}).get(U['ana']) == 'advogado', 'equipe do teste salva')
    a.click('#subnav button[data-sub="publicacoes"]'); a.wait_for_timeout(500)
    a.click('#pb-buscar'); a.click('#dj-ok'); a.wait_for_timeout(2000)
    ok(a.locator('.pub').count() == 2 and len(F.listar('agTeste_publicacoes')) == 2, 'busca no DJEN grava as publicações')
    ok('manifestar-se' in a.inner_text('.pub >> nth=0') and '<b>' not in a.inner_text('.pub >> nth=0'), 'texto limpo (sem HTML)')
    a.locator('.pub', has_text='contestação').locator('[data-pub-cad]').click(); a.wait_for_timeout(300)
    a.locator('[data-pcli]').first.click(); a.locator('[data-pcon]').nth(1).click(); a.click('#fk-salvar'); a.wait_for_timeout(1200)
    ok(len(F.listar('agTeste_clientes')) == 1 and len(F.listar('agTeste_casos')) == 1, 'cliente e processo gravados a partir da publicação')
    a.click('#k-x'); a.wait_for_timeout(300)
    a.locator('.pub', has_text='contestação').locator('[data-pub-prazo]').click(); a.wait_for_timeout(400)
    a.select_option('#fa-resp', U['ana']); a.click('#fa-salvar'); a.wait_for_timeout(1500)
    ats = F.listar('agTeste_atividades'); pz = [x for x in ats if x[1].get('tipo') == 'prazo']
    ok(len(pz) == 1 and pz[0][1].get('responsavel') == U['ana'] and pz[0][1].get('pubId'), 'prazo criado para a Ana, ligado à publicação')
    pubs = dict(F.listar('agTeste_publicacoes'))
    ok(pubs.get('djen9001', {}).get('status') == 'tratada', 'publicação marcada como tratada')
    a.click('#d-fechar'); a.wait_for_timeout(200)
    # DJEN de novo: não duplica
    a.click('#pb-buscar'); a.click('#dj-ok'); a.wait_for_timeout(1500)
    ok(len(F.listar('agTeste_publicacoes')) == 2, 'buscar de novo não duplica')
    # ---- Ana (advogada com a aba) ----
    t, et = abrir('ana')
    ok('Manifesta' in t.inner_text('#pag') or 'MANIFESTA' in t.inner_text('#pag'), 'Ana vê o prazo dela na agenda')
    t.locator('.linha').first.click(); t.wait_for_timeout(400)
    t.click('#nt-abrir'); t.fill('#nt-tit', 'Buscar documentos (teste)'); t.click('#nt-salvar'); t.wait_for_timeout(1200)
    t.click('[data-aba="comentarios"]'); t.fill('[data-cm-txt]', 'Comentário da Ana (teste).'); t.click('[data-cm-env]'); t.wait_for_timeout(1500)
    ok(len([x for x in F.listar('agTeste_atividades') if x[1].get('tipo') == 'tarefa']) == 1, 'Ana cria tarefa encadeada')
    # admin vê ao vivo
    a.click('#subnav button[data-sub="agenda"]'); a.wait_for_timeout(300)
    a.click('#f-resp'); a.click('.menu button[data-v="todos"]'); a.wait_for_timeout(1500)
    a.locator('.linha', has_text='Manifesta').filter(has=a.locator('.tipo.prazo')).first.click(); a.wait_for_timeout(500)
    a.click('[data-aba="comentarios"]'); a.wait_for_timeout(300)
    ok('Comentário da Ana' in a.inner_text('#fundo-det'), 'admin vê o comentário da Ana em tempo real')
    cid = F.listar('agTeste_clientes')[0][0]
    err = t.evaluate("id => firebase.firestore().collection('agTeste_clientes').doc(id).delete().then(() => 'apagou', e => e.code)", cid)
    ok(err == 'permission-denied', 'Ana não consegue apagar cliente (só o admin): ' + str(err))
    a.screenshot(path=os.path.join(AQUI, 'emu-admin.png'))
    # ---- Beto (sem a aba) ----
    bt, eb = abrir('beto')
    ok('ainda não tem acesso' in bt.inner_text('#pag'), 'quem não tem a aba não vê nada')
    lido = bt.evaluate("() => firebase.firestore().collection('agTeste_clientes').get().then(s => 'leu ' + s.size, e => e.code)")
    ok(lido == 'permission-denied', 'Beto barrado pelas regras: ' + str(lido))
    ok(not ea and not et, 'sem erros de script ' + str(ea + et))
    ok(not F.pedidos_producao, 'nenhum pedido à produção ' + str(F.pedidos_producao[:3]))
print('RESULTADO:', 'TUDO OK' if not falhas else 'FALHAS: ' + str(falhas))
