# -*- coding: utf-8 -*-
"""Agenda v270 no emulador (regras reais, pessoas e dados fictícios, CEP falso):
números Cli-/Prc-/Cas- sem repetição, cadastro novo de cliente (CEP, máscaras), processo (sistema, distribuição,
cliente/contato pelo card), prazo com processo + tarefa obrigatórios, tarefa escolhendo o prazo, @menção → sino,
link da atividade (?agenda=ID), envio pelo Chat e Relatórios.
Uso (de dentro de tests/): firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/agenda_v270.py"
"""
import io, os, sys, json, time
os.environ['IFRAME_OK'] = '/tools/agenda-teste/'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import funcional as F  # noqa
import requests  # noqa
from playwright.sync_api import sync_playwright  # noqa
AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fotos-agenda'); os.makedirs(AQUI, exist_ok=True)
falhas = []
def ok(c, m):
    print(('  OK   ' if c else '  FALHA ') + m, flush=True)
    if not c: falhas.append(m)

requests.delete(f'{F.AUTH}/emulator/v1/projects/{F.PROJ}/accounts').raise_for_status()
requests.delete(f'{F.FS}/emulator/v1/projects/{F.PROJ}/databases/(default)/documents').raise_for_status()
F.regras_firestore(io.open(os.path.join(F.RAIZ, 'firestore.rules'), encoding='utf-8').read())
U = {k: F.criar_conta(f'{k}@exemplo.test') for k in ('chefe', 'ana', 'cris', 'beto')}
dados = {'chefe': ('Chefe Fictício', 'admin', ['chat', 'agenda-teste']), 'ana': ('Ana Fictícia', 'membro', ['agenda-teste', 'chat']),
         'cris': ('Cris Exemplo', 'membro', ['agenda-teste', 'chat']), 'beto': ('Beto Fictício', 'membro', ['chat'])}
for k, (nome, role, tabs) in dados.items():
    F.gravar(f'users/{U[k]}', {'email': f'{k}@exemplo.test', 'displayName': nome, 'role': role, 'tabs': tabs, 'acesso': 'ativo', 'pixChave': 'x'})
    F.gravar(f'perfis/{U[k]}', {'displayName': nome})
    F.gravar(f'organograma/{U[k]}', {'nome': nome})
F.gravar('tabs/chat', {'label': 'Chat', 'url': 'tools/chat/', 'order': 1})
# comunicados obrigatórios já com ciência (o pop-up não é o assunto deste teste)
import re as _re
for _cid in _re.findall(r"id: *'([^']+)'", io.open(os.path.join(F.RAIZ, 'comunicados.js'), encoding='utf-8').read()):
    for k in U: F.gravar(f'comunicadosCiencia/{_cid}_{U[k]}', {'uid': U[k], 'comunicadoId': _cid})
F.gravar('tabs/agenda-teste', {'label': 'Agenda (teste)', 'url': 'tools/agenda-teste/index.html', 'order': 57})
F.gravar('agTeste_config/geral', {'membros': {U['ana']: 'advogado', U['cris']: 'assistente'}, 'etiquetas': [], 'djenAtualizadoEm': ''})
# cadastros "antigos" (sem número), como os importados do Astrea
for i, nome in enumerate(['Antigo Cliente Um', 'Antigo Cliente Dois', 'Antigo Cliente Tres']):
    F.gravar(f'agTeste_clientes/astc_{i}', {'tipo': 'PF', 'nome': nome, 'doc': '', 'email': '', 'fone': '34999990000', 'endereco': 'Rua Velha, 10', 'obs': '', 'criadoEm': f'2020-01-0{i+1}T10:00:00Z'})
F.gravar('agTeste_casos/astk_0', {'tipo': 'processo', 'titulo': 'Processo Antigo', 'clientes': ['astc_0'], 'contraria': 'Fulano', 'numero': '50000999920268130702', 'tribunal': 'TJMG', 'orgao': '1ª Vara Fictícia',
    'area': 'Cível', 'fase': 'Inicial', 'responsavel': U['ana'], 'status': 'ativo', 'valor': '', 'obs': '', 'etiquetas': [], 'criadoEm': '2020-02-01T10:00:00Z'})
F.gravar('agTeste_casos/astk_1', {'tipo': 'caso', 'titulo': 'Consulta Antiga', 'clientes': ['astc_1'], 'contraria': '', 'numero': '', 'tribunal': '', 'orgao': '',
    'area': 'Cível', 'fase': 'Inicial', 'responsavel': U['ana'], 'status': 'ativo', 'valor': '', 'obs': '', 'etiquetas': [], 'criadoEm': '2020-02-02T10:00:00Z'})
CEP = {'cep': '38400-000', 'logradouro': 'Avenida Ficticia', 'bairro': 'Centro Exemplo', 'localidade': 'Cidade Teste', 'uf': 'MG'}
F.subir_site()
URL = F.BASE + '/tools/agenda-teste/index.html'
HOJE = time.strftime('%Y-%m-%d')
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=F.ARGS_NAVEGADOR)
    erros = []
    def contexto():
        ctx = F.novo_contexto(b)
        ctx.route('https://viacep.com.br/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(CEP), headers={'Access-Control-Allow-Origin': '*'}))
        return ctx
    def abrir(quem):
        ctx = contexto(); pg = F.entrar(ctx, f'{quem}@exemplo.test'); F.esperar(pg, "document.getElementById('app-screen').style.display === 'flex'", 25000)
        t = ctx.new_page(); t.on('dialog', F.aceitar); t.on('pageerror', lambda e: erros.append(quem + ': ' + str(e)))
        t.goto(URL); F.esperar(t, "document.querySelector('#pag h1')", 20000); t.wait_for_timeout(1200)
        # o servidor de teste fala HTTP/1.1 com o emulador: o Chrome só abre 6 conexões por endereço e o portal + a Agenda
        # abertos juntos ocupam todas com as escutas, e as gravações ficam na fila. Em produção (HTTP/2) não existe esse limite.
        pg.close(); t.wait_for_timeout(500); return t, None
    a, pa = abrir('chefe')
    # ---------- 1) numerar os antigos ----------
    ok(a.is_visible('#t-numerar') and '5 sem número' in a.inner_text('#t-numerar'), 'admin vê "Numerar cadastros (5 sem número)": ' + a.inner_text('#t-numerar'))
    a.click('#t-numerar')
    t0 = time.time(); F.esperar(a, "document.getElementById('t-numerar').textContent.indexOf('Numerando') < 0", 20000); print('  (numeração levou %.1f s; botão: %s)' % (time.time() - t0, a.inner_text('#t-numerar')), flush=True); a.wait_for_timeout(800)
    cl = dict(F.listar('agTeste_clientes')); ks = dict(F.listar('agTeste_casos'))
    ok([cl[f'astc_{i}'].get('seq') for i in range(3)] == [1, 2, 3], 'clientes antigos numerados na ordem de cadastro (Cli-1..3)')
    ok(ks['astk_0'].get('seq') == 1 and ks['astk_1'].get('seq') == 2, 'processo e caso antigos: Prc-1 e Cas-2 (mesma sequência)')
    ok((F.ler('agTeste_contadores/cli') or {}).get('n') == 3 and (F.ler('agTeste_contadores/proc') or {}).get('n') == 2, 'contadores ficaram em 3 e 2')
    ok(not a.is_visible('#t-numerar'), 'botão some quando tudo tem número')
    # ---------- 2) ninguém recebe o mesmo número: 2 pessoas, 12 transações ao mesmo tempo ----------
    t, pt = abrir('ana')
    # dispara as duas páginas sem esperar (cada uma 6 transações em paralelo) e junta depois
    a.evaluate("() => { window.__p = Promise.allSettled(Array.from({length:6}, () => window.__agenda.reservar('cli', 1))).then(r => r.map(x => x.status === 'fulfilled' ? x.value : 'ERRO ' + (x.reason && (x.reason.code || x.reason.message)))); }")
    t.evaluate("() => { window.__p = Promise.allSettled(Array.from({length:6}, () => window.__agenda.reservar('cli', 1))).then(r => r.map(x => x.status === 'fulfilled' ? x.value : 'ERRO ' + (x.reason && (x.reason.code || x.reason.message)))); }")
    na = a.evaluate("() => window.__p"); nt = t.evaluate("() => window.__p")
    print('  reservas:', na, nt, flush=True)
    todos = sorted([x for x in na + nt if isinstance(x, int)])
    ok(todos == list(range(4, 16)), '12 números reservados ao mesmo tempo por 2 pessoas, sem repetir: ' + str(todos))
    r = F.sdk(t, "const ref = firebase.firestore().collection('agTeste_contadores').doc('cli'); const d = await ref.get(); await ref.update({n: d.data().n + 5});")
    ok(r == 'erro:permission-denied', 'não-admin não consegue pular números: ' + r)
    r = F.sdk(t, "await firebase.firestore().collection('agTeste_contadores').doc('cli').update({n: 1});")
    ok(r == 'erro:permission-denied', 'contador nunca desce: ' + r)
    # ---------- 3) cadastro de cliente (Ana) ----------
    t.click('#subnav button[data-sub="clientes"]'); t.wait_for_timeout(400)
    t.click('#c-novo'); t.wait_for_timeout(300)
    t.fill('#fc-nome', 'Maria Exemplo da Silva'); t.type('#fc-doc', '52998224725'); t.type('#fc-nasc', '15051980'); t.type('#fc-fone', '34988887777')
    ok(t.input_value('#fc-nasc') == '15/05/1980' and t.input_value('#fc-fone') == '(34) 98888-7777' and t.input_value('#fc-doc') == '529.982.247-25', 'máscaras: nascimento, telefone e CPF')
    t.fill('#fc-prof', 'Engenheira'); t.fill('#fc-pai', 'José Exemplo'); t.fill('#fc-mae', 'Joana Exemplo'); t.fill('#fb-banco', 'Banco Ficticio'); t.fill('#fb-pix', 'chave-ficticia')
    t.click('#fc-end-add'); t.wait_for_timeout(200); t.type('#en-cep', '38400000'); t.wait_for_timeout(900)
    ok(t.input_value('#en-log') == 'Avenida Ficticia' and t.input_value('#en-cid') == 'Cidade Teste', 'CEP preenche rua e cidade sozinho')
    t.fill('#en-num', '120'); t.fill('#en-comp', 'Apto 3'); t.click('#en-ok'); t.wait_for_timeout(200)
    t.click('#fc-end-add'); t.wait_for_timeout(200); t.type('#en-cep', '38400000'); t.wait_for_timeout(900); t.select_option('#en-rot', 'Comercial'); t.fill('#en-num', '45'); t.click('#en-ok'); t.wait_for_timeout(200)
    t.click('#fc-salvar'); t.wait_for_timeout(1800)
    m = [d for i, d in F.listar('agTeste_clientes') if d.get('nome') == 'Maria Exemplo da Silva']
    m = m[0] if m else {}
    ok(m.get('seq') == 16 and m.get('nascimento') == '1980-05-15' and m.get('fone') == '(34) 98888-7777' and m.get('profissao') == 'Engenheira', 'cliente gravado com Cli-16, nascimento e telefone: ' + str({k: m.get(k) for k in ('seq', 'nascimento', 'fone')}))
    ok(len(m.get('enderecos') or []) == 2 and m['enderecos'][0].get('numero') == '120' and m['enderecos'][1].get('rotulo') == 'Comercial', 'dois endereços no mesmo cadastro')
    ok((m.get('banco') or {}).get('pix') == 'chave-ficticia' and m.get('mae') == 'Joana Exemplo', 'dados bancários e filiação')
    ok('Cli-16' in t.inner_text('.fundo-modal'), 'ficha mostra Cli-16')
    t.click('#cl-x'); t.wait_for_timeout(200)
    # ---------- 4) processo: cliente e contato pelo card, sistema, distribuição ----------
    t.click('#subnav button[data-sub="processos"]'); t.wait_for_timeout(300); t.click('#k-novo'); t.wait_for_timeout(300)
    t.click('#fk-novocli'); t.wait_for_timeout(300)
    ok(t.locator('#fc-end-add').count() == 1, 'botão "cadastrar cliente" abre o card completo de cadastro')
    t.fill('#fc-nome', 'Empresa Exemplo Ltda'); t.select_option('#fc-tipo', 'PJ'); t.click('#fc-salvar'); t.wait_for_timeout(1500)
    ok('EMPRESA EXEMPLO LTDA' in t.inner_text('#fk-cls').upper(), 'cliente novo já entra no processo: ' + t.inner_text('#fk-cls') + ' | ' + str(t.locator('.fundo-modal').count()))
    t.click('#fk-novocon'); t.wait_for_timeout(300); t.fill('#fc-nome', 'Parte Contraria Exemplo'); t.click('#fc-salvar'); t.wait_for_timeout(1500)
    ok(t.input_value('#fk-contra') == 'Parte Contraria Exemplo', 'contato novo vira a parte contrária')
    t.fill('#fk-tit', 'Ação de cobrança (teste)'); t.fill('#fk-num', '50001112220268130702'); t.type('#fk-dist', '01022026')
    ok(t.input_value('#fk-dist') == '01/02/2026', 'máscara da data da distribuição')
    t.click('#fk-sis input'); t.type('#fk-sis input', 'eproc mg'); t.wait_for_timeout(200); t.keyboard.press('Enter'); t.wait_for_timeout(200)
    ok(t.input_value('#fk-sis input') == 'EPROC-TJ/MG' and t.input_value('#fk-trib') == 'TJMG', 'sistema escolhido pela busca (EPROC-TJ/MG) e tribunal preenchido')
    t.click('#fk-salvar'); t.wait_for_timeout(1800)
    k = [d for i, d in F.listar('agTeste_casos') if d.get('titulo') == 'Ação de cobrança (teste)']; k = k[0] if k else {}
    contato = [d for i, d in F.listar('agTeste_clientes') if d.get('nome') == 'Parte Contraria Exemplo']
    ok(k.get('seq') == 3 and k.get('sistema') == 'EPROC-TJ/MG' and k.get('distribuicao') == '2026-02-01', 'processo gravado como Prc-3, com sistema e distribuição: ' + str({x: k.get(x) for x in ('seq', 'sistema', 'distribuicao')}))
    ok(contato and contato[0].get('perfil') == 'contato' and contato[0].get('seq') and len(k.get('contrariaIds') or []) == 1, 'contato cadastrado (perfil contato, com número) e ligado ao processo')
    ok('Prc-3' in t.inner_text('.fundo-modal'), 'ficha do processo mostra Prc-3')
    t.click('#k-x'); t.wait_for_timeout(200)
    # ---------- 5) prazo: menu do +, processo e tarefa obrigatórios ----------
    t.click('#subnav button[data-sub="agenda"]'); t.wait_for_timeout(400)
    t.click('#b-novo'); t.wait_for_timeout(200)
    ok(t.inner_text('.menu').split() == ['Prazo', 'Audiência', 'Tarefa'], 'o + vermelho mostra Prazo, Audiência e Tarefa')
    t.click('.menu button[data-v="prazo"]'); t.wait_for_timeout(300)
    ok(t.locator('.modal .m-topo #fa-et').count() == 1, 'etiqueta no topo, ao lado do X')
    t.fill('#fa-tit', 'Réplica (teste)'); t.fill('#fa-data', '2099-12-20')
    t.click('#fa-salvar'); t.wait_for_timeout(200)
    ok('processo ou caso' in t.inner_text('#fa-av'), 'prazo sem processo/caso não salva')
    t.click('#fa-caso input'); t.type('#fa-caso input', 'Prc-3'); t.wait_for_timeout(200); t.keyboard.press('Enter'); t.wait_for_timeout(200)
    ok('Prc-3' in t.input_value('#fa-caso input'), 'processo achado pela busca livre (Prc-3)')
    t.click('#fa-salvar'); t.wait_for_timeout(200)
    ok('ao menos uma tarefa' in t.inner_text('#fa-av'), 'prazo sem tarefa não salva')
    t.click('#fa-tar-add'); t.wait_for_timeout(200); t.fill('#ft-tit', 'Minutar a réplica'); t.fill('#ft-data', ''); t.click('#ft-ok'); t.wait_for_timeout(150)
    ok('data de conclusão' in t.inner_text('#ft-av'), 'tarefa sem data de conclusão não entra')
    t.fill('#ft-data', '2099-12-15'); t.select_option('#ft-resp', U['cris']); t.click('#ft-ok'); t.wait_for_timeout(200)
    t.click('#fa-salvar'); t.wait_for_timeout(1800)
    ats = F.listar('agTeste_atividades')
    pz = [(i, d) for i, d in ats if d.get('titulo') == 'Réplica (teste)']; tf = [(i, d) for i, d in ats if d.get('titulo') == 'Minutar a réplica']
    ok(pz and tf and tf[0][1].get('paiId') == pz[0][0] and tf[0][1].get('responsavel') == U['cris'] and pz[0][1].get('casoId'), 'prazo gravado com processo e a tarefa dentro dele (da Cris)')
    PZ = pz[0][0] if pz else ''
    ok(any('criou a tarefa' in (h.get('txt') or '') for h in (tf[0][1].get('historico') if tf else [])), 'histórico da tarefa registra a criação')
    t.click('#d-fechar'); t.wait_for_timeout(200)
    # ---------- 6) tarefa pelo +: escolhe o prazo ----------
    t.click('#b-novo'); t.click('.menu button[data-v="tarefa"]'); t.wait_for_timeout(300)
    t.fill('#fa-tit', 'Revisar a réplica'); t.fill('#fa-data', '')
    t.click('#fa-pai input'); t.type('#fa-pai input', 'réplica'); t.wait_for_timeout(200); t.keyboard.press('Enter'); t.wait_for_timeout(200)
    t.click('#fa-salvar'); t.wait_for_timeout(200)
    ok('data de conclusão' in t.inner_text('#fa-av'), 'tarefa sem data não salva')
    t.fill('#fa-data', '2099-12-31'); t.click('#fa-salvar'); t.wait_for_timeout(200)
    ok('precisa terminar até' in t.inner_text('#fa-av'), 'tarefa não pode passar da data do prazo')
    t.fill('#fa-data', '2099-12-18'); t.click('#fa-salvar'); t.wait_for_timeout(1500)
    rv = [d for i, d in F.listar('agTeste_atividades') if d.get('titulo') == 'Revisar a réplica']
    ok(rv and rv[0].get('paiId') == PZ, 'tarefa criada dentro do prazo escolhido na busca')
    # ---------- 7) @menção ----------
    t.evaluate("id => window.__agenda.abrirPorId(id)", PZ); t.wait_for_timeout(500)
    t.click('[data-aba="comentarios"]'); t.wait_for_timeout(200)
    t.click('[data-cm-txt]'); t.keyboard.type('Oi @Cri'); t.wait_for_timeout(300)
    ok(t.locator('.mencao-box button').count() == 1 and 'Cris Exemplo' in t.inner_text('.mencao-box'), 'digitar @ mostra os nomes (filtra "Cri")')
    t.keyboard.press('Enter'); t.keyboard.type('pode revisar?')
    ok(t.input_value('[data-cm-txt]') == 'Oi @Cris Exemplo pode revisar?', 'nome escolhido entra no texto: ' + t.input_value('[data-cm-txt]'))
    t.click('[data-cm-env]'); t.wait_for_timeout(1500)
    mens = F.listar('agTeste_mencoes')
    ok(len(mens) == 1 and mens[0][1].get('para') == U['cris'] and mens[0][1].get('atividadeId') == PZ and mens[0][1].get('lida') is False, 'aviso de menção gravado para a Cris')
    ok(t.locator('.cm .men').count() == 1, 'menção aparece em destaque no comentário')
    # ---------- 8) envio pelo Chat (de verdade) ----------
    t.click('#fundo-det .m-topo [data-chat]'); t.wait_for_timeout(200); t.click('.menu button[data-v="%s"]' % U['cris']); t.wait_for_timeout(2500)
    convs = F.listar('conversas')
    msgs = F.listar(f'conversas/{convs[0][0]}/mensagens') if convs else []
    ok(convs and msgs and ('?agenda=' + PZ) in (msgs[0][1].get('texto') or ''), 'mensagem no Chat da Cris com o link do prazo')
    # ---------- 9) Cris: sino e link ----------
    ctxc = contexto(); pc = F.entrar(ctxc, 'cris@exemplo.test'); pc.on('pageerror', lambda e: erros.append('cris portal: ' + str(e)))
    F.esperar(pc, "document.getElementById('app-screen').style.display === 'flex'", 25000); pc.wait_for_timeout(2500); F.dar_ciencia(pc); pc.wait_for_timeout(800)
    ok(pc.is_visible('#mencoes-btn') and pc.inner_text('#mencoes-qtd') == '1', 'sino aparece para a Cris com 1 menção nova')
    pc.click('#mencoes-btn', timeout=10000); pc.wait_for_timeout(500)
    ok('Ana Fictícia' in pc.inner_text('#mencoes-dropdown') and 'Réplica (teste)' in pc.inner_text('#mencoes-dropdown'), 'lista mostra quem chamou e em qual prazo')
    pc.screenshot(path=os.path.join(AQUI, 'v270-sino.png'))
    pc.click('#mencoes-dropdown [data-men]'); pc.wait_for_timeout(1000)
    fr = None
    for _ in range(40):
        fr = next((f for f in pc.frames if '/tools/agenda-teste/' in f.url), None)
        if fr and fr.evaluate("() => !!document.querySelector('#fundo-det')"): break
        pc.wait_for_timeout(500)
    ok(fr is not None and 'RÉPLICA' in (fr.inner_text('#fundo-det').upper() if fr.query_selector('#fundo-det') else ''), 'clicar no sino abre a Agenda já no prazo')
    ok(F.ate(lambda: (F.listar('agTeste_mencoes')[0][1].get('lida') is True), 10), 'menção marcada como lida')
    ok(pc.inner_text('#mencoes-qtd') in ('', '0') or not pc.is_visible('#mencoes-qtd'), 'contador do sino zera')
    MIA = mens[0][0]; pc.close()
    pg2 = ctxc.new_page(); pg2.goto(F.BASE + '/index.html?agenda=' + tf[0][0] if tf else F.BASE); F.esperar(pg2, "document.getElementById('app-screen').style.display === 'flex'", 25000); pg2.wait_for_timeout(2500); F.dar_ciencia(pg2)
    fr2 = None
    for _ in range(50):
        fr2 = next((f for f in pg2.frames if '/tools/agenda-teste/' in f.url), None)
        if fr2 and fr2.evaluate("() => !!document.querySelector('#fundo-det')"): break
        pg2.wait_for_timeout(500)
    ok(fr2 is not None and fr2.query_selector('#fundo-det') and 'MINUTAR' in fr2.inner_text('#fundo-det').upper() and '?agenda=' not in pg2.url, 'link ?agenda=ID abre direto a tarefa (e sai da barra de endereço)')
    if fr2 and fr2.query_selector('#fundo-det'):
        ok(all(x in fr2.inner_text('#fundo-det .abas') for x in ('Checklists', 'Comentários', 'Histórico')), 'tarefa tem as abas de comentários, checklist e histórico')
    # ---------- 10) regras das menções ----------
    r = F.sdk(pg2, "const s = await firebase.firestore().collection('agTeste_mencoes').doc('%s').get(); return s.exists;" % mens[0][0])
    ok(r == 'ok:true', 'Cris lê a própria menção')
    r = F.sdk(t, "await firebase.firestore().collection('agTeste_mencoes').doc('%s').get();" % mens[0][0])
    ok(r == 'erro:permission-denied', 'Ana não lê a menção da Cris: ' + r)
    r = F.sdk(pg2, "await firebase.firestore().collection('agTeste_mencoes').doc('%s').update({trecho:'mudado'});" % mens[0][0])
    ok(r == 'erro:permission-denied', 'Cris não altera o texto da menção: ' + r)
    r = F.sdk(t, "await firebase.firestore().collection('agTeste_mencoes').add({para:'%s', de:'%s', atividadeId:'x', em:firebase.firestore.FieldValue.serverTimestamp(), lida:false});" % (U['cris'], U['cris']))
    ok(r == 'erro:permission-denied', 'ninguém cria menção em nome de outro: ' + r)
    ctxb = contexto(); pb = F.entrar(ctxb, 'beto@exemplo.test'); F.esperar(pb, "document.getElementById('app-screen').style.display === 'flex'", 25000)
    r = F.sdk(pb, "await firebase.firestore().collection('agTeste_mencoes').add({para:'%s', de:'%s', atividadeId:'x', em:firebase.firestore.FieldValue.serverTimestamp(), lida:false});" % (U['cris'], U['beto']))
    ok(r == 'erro:permission-denied', 'quem não tem a Agenda não cria menção: ' + r)
    ok(not pb.is_visible('#mencoes-btn'), 'sem a aba Agenda, o sino não aparece')
    # ---------- 11) relatórios ----------
    t.click('#d-fechar') if t.query_selector('#d-fechar') else None
    t.click('#subnav button[data-sub="relatorios"]'); t.wait_for_timeout(500)
    t.fill('#r-ini', '2099-12-01'); t.fill('#r-fim', '2099-12-31'); t.dispatch_event('#r-fim', 'change'); t.wait_for_timeout(1500)
    txt = t.inner_text('#pag')
    ok('Relatórios' in txt and 'Cris Exemplo' in txt and 'Ana Fictícia' in txt and '3' in t.inner_text('.rel-tile >> nth=0'), 'relatório por pessoa (3 atividades em dez/2099)')
    t.click('#r-dim'); t.click('.menu button[data-v="cliente"]'); t.wait_for_timeout(600)
    ok('Empresa Exemplo Ltda' in t.inner_text('#pag'), 'relatório por cliente')
    t.locator('tr[data-g]').first.click(); t.wait_for_timeout(500)
    ok('Próximas a concluir' in t.inner_text('#pag'), 'painel do cliente escolhido')
    with t.expect_download() as dl: t.click('#r-csv')
    ok(dl.value.suggested_filename.endswith('.csv'), 'exporta a planilha: ' + dl.value.suggested_filename)
    t.screenshot(path=os.path.join(AQUI, 'v270-relatorio.png'), full_page=True)
    ok(not erros, 'sem erros de script ' + str(erros[:5]))
    ok(not F.pedidos_producao, 'nenhum pedido à produção ' + str(F.pedidos_producao[:3]))
print('RESULTADO:', 'TUDO OK' if not falhas else 'FALHAS: ' + str(falhas))
