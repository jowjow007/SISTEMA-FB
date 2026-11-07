"""Teste funcional das Sessões de Julgamento (tools/sessoes-julgamento), com login, nos emuladores e com dados fictícios.

Escritório monta a sessão e o recurso, envia provas e libera ao conselho; o conselheiro do condomínio lê, abre as provas
(fica a trilha de auditoria), marca "analisei" e anota; o conselheiro de OUTRO condomínio não vê nada; o escritório
lança a decisão e a ementa; as provas vencidas saem do portal; o admin aprova um cadastro como conselheiro; e o pacote
de importação cria sessões, recursos e arquivos.

    cd tests
    firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/julgamentos.py"
"""
import io, json, os, sys, tempfile, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import funcional as F   # noqa: E402  (servidor de teste, emuladores e login reaproveitados)

G = 'Sessões de Julgamento'
MP4_FALSO = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom' + b'\x00' * 64


def foto(pg, nome):
    """FOTOS=<pasta>: guarda a tela (para mostrar a ferramenta com os dados fictícios)."""
    if os.environ.get('FOTOS'):
        pg.wait_for_timeout(600)
        pg.screenshot(path=os.path.join(os.environ['FOTOS'], nome + '.png'), full_page=True)


def semear():
    import requests
    requests.delete(f'{F.AUTH}/emulator/v1/projects/{F.PROJ}/accounts').raise_for_status()
    requests.delete(f'{F.FS}/emulator/v1/projects/{F.PROJ}/databases/(default)/documents').raise_for_status()
    U = {}
    for k in ('admin', 'membro', 'cons', 'cons2', 'novo'):
        U[k] = F.criar_conta(f'{k}@exemplo.test')
    F.gravar(f"users/{U['admin']}", {'email': 'admin@exemplo.test', 'displayName': 'Admin Fictício', 'role': 'admin', 'tabs': ['condominios'], 'acesso': 'ativo'})
    F.gravar(f"users/{U['membro']}", {'email': 'membro@exemplo.test', 'displayName': 'Membro Fictício', 'role': 'membro', 'tabs': ['condominios', 'sessoes-julgamento-x'], 'acesso': 'ativo'})
    F.gravar(f"users/{U['cons']}", {'email': 'cons@exemplo.test', 'displayName': 'Conselheira Fictícia Alfa', 'role': 'conselheiro', 'tabs': ['condominios'], 'acesso': 'ativo'})
    F.gravar(f"users/{U['cons2']}", {'email': 'cons2@exemplo.test', 'displayName': 'Síndico Fictício Beta', 'role': 'sindico', 'tabs': ['condominios'], 'acesso': 'ativo'})
    # autocadastro de um conselheiro novo: entra como membro pendente, sem abas, e cria o próprio bloco no organograma
    F.gravar(f"users/{U['novo']}", {'email': 'novo@exemplo.test', 'displayName': 'Conselheiro Novo Fictício', 'role': 'membro', 'tabs': [], 'acesso': 'pendente'})
    F.gravar(f"organograma/{U['novo']}", {'displayName': 'Conselheiro Novo Fictício', 'email': 'novo@exemplo.test', 'deptoAtual': '', 'dataIngresso': ''})
    F.gravar(f"conselhoMembros/{U['cons']}", {'condominios': {'condominio-ficticio-alfa': 'conselheiro'}, 'nomesCondominios': {'condominio-ficticio-alfa': 'Condomínio Fictício Alfa'}})
    F.gravar(f"conselhoMembros/{U['cons2']}", {'condominios': {'condominio-ficticio-beta': 'sindico'}, 'nomesCondominios': {'condominio-ficticio-beta': 'Condomínio Fictício Beta'}})
    F.gravar('tabs/sessoes-julgamento-x', {'label': 'Sessões de Julgamento', 'url': 'tools/sessoes-julgamento/', 'order': 50})
    F.gravar('tabs/condominios', {'label': 'Condomínios', 'url': 'tools/condominios/', 'order': 10})
    F.gravar('dadosPrivados/condominios', {'json': json.dumps({'condominios': [{'nome': 'Condomínio Fictício Alfa'}, {'nome': 'Condomínio Fictício Beta'}], 'relatorios': {}, 'procedimentos': {}})})
    return U


def main():
    regras = io.open(os.path.join(F.RAIZ, 'firestore.rules'), encoding='utf-8').read()
    st_regras = io.open(os.path.join(F.RAIZ, 'storage.rules'), encoding='utf-8').read()
    site = F.subir_site()
    U = semear()
    F.regras_firestore(regras); F.regras_storage(st_regras)
    URL = F.BASE + '/tools/sessoes-julgamento/index.html'
    rec_id = 'condominio-ficticio-alfa-900001'
    pasta = tempfile.mkdtemp(prefix='julg-')
    arquivos = {}
    for nome, dados in (('VIDEO 01.mp4', MP4_FALSO), ('IMAGEM.jpg', F.JPG_FALSO), ('OCORRENCIA 900001.pdf', F.PDF_FALSO)):
        arquivos[nome] = os.path.join(pasta, nome); open(arquivos[nome], 'wb').write(dados)

    with sync_playwright() as p:
        def sessao(email):
            b = p.chromium.launch(headless=True, args=F.ARGS_NAVEGADOR)
            ctx = F.novo_contexto(b)
            pg = F.entrar(ctx, email)
            ok = F.esperar(pg, "document.getElementById('app-screen').style.display === 'flex'", 25000)
            if ok:
                pg.wait_for_timeout(4000)   # comunicados e pop-ups abrem logo depois do login
                telas_login[email] = pg.evaluate("""(() => {
                  const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
                  return { janelas: [...document.querySelectorAll('.modal-backdrop.show')].map(e => e.id), megafone: vis('comunicados-btn'),
                           escudo: vis('sistemas-status-btn'), logos: document.getElementById('user-menu-dropdown').textContent.includes('Logomarcas') };
                })()""")
            pg.close()
            t = ctx.new_page()
            t.goto(URL)
            return b, t, ok

        telas_login = {}

        def respostas(pg, fila):
            def h(d):
                F.console.append('DIÁLOGO ' + d.type + ': ' + d.message[:160].replace(chr(10), ' '))
                if d.type == 'prompt' and fila: d.accept(fila.pop(0))
                else: d.accept()
            pg.on('dialog', h)

        # ---------- 1. escritório monta a sessão e o recurso
        b, pm, ok = sessao('membro@exemplo.test')
        F.caso(G, 'membro do escritório entra e abre a ferramenta', ok and F.esperar(pm, "window.__julgamentos && window.__julgamentos.estado().equipe === true", 20000),
               'login ' + str(ok) + ' | ' + pm.url + ' | ' + pm.evaluate("document.body.innerText.slice(0, 300)").replace(chr(10), ' '))
        F.caso(G, 'lista os condomínios dos dados privados', F.esperar(pm, "document.querySelectorAll('[data-condo]').length === 2", 10000))
        fila = ['15/11/2026 19:30', 'Sessão de julgamento — novembro de 2026']
        respostas(pm, fila)
        pm.click('#nova-sessao')
        F.caso(G, 'cria a sessão (rascunho)', F.esperar(pm, "document.body.innerText.toLowerCase().includes('rascunho') && document.body.innerText.includes('15/11/2026 às 19h30')", 10000),
               pm.evaluate("document.getElementById('app').innerText.slice(0, 300)").replace(chr(10), ' '))
        pm.click('#novo-recurso')
        for k, v in (('ocorrencia', '900001'), ('unidade', 'Bloco 9, nº 101'), ('morador', 'Morador Fictício'), ('titulo', 'Tráfego em contramão'),
                     ('classificacao', 'Trânsito'), ('penalidade', 'Notificação + multa de R$ 100,00')):
            pm.fill('#ed-' + k, v)
        pm.click('#ed-salvar')
        F.caso(G, 'salva o recurso e segue para "Fatos e fundamentos"', F.ate(lambda: F.ler(f'recursosJulgamento/{rec_id}') is not None, 10) and F.esperar(pm, "!!document.getElementById('ed-fatos')", 10000))
        pm.fill('#ed-fatos', 'No dia 01/10/2026, veículo fictício trafegou na contramão.')
        pm.fill('#ed-alegacoes', 'O morador fictício diz que a sinalização estava apagada.')
        pm.fill('#ed-fundamentos', 'Art. 18 e 67 do Regimento Interno fictício.')
        pm.click('#ed-salvar')
        F.caso(G, 'grava fatos, alegações e fundamentos', F.ate(lambda: (F.ler(f'recursosJulgamento/{rec_id}') or {}).get('alegacoes', '').startswith('O morador'), 10))
        pm.click('[data-edpasso="2"]')
        F.esperar(pm, "!!document.getElementById('ed-arquivos')", 10000)
        pm.select_option('#ed-categoria', 'prova')
        pm.set_input_files('#ed-arquivos', [arquivos['VIDEO 01.mp4'], arquivos['IMAGEM.jpg']])
        F.caso(G, 'envia vídeo e imagem (Storage) e registra no recurso',
               F.ate(lambda: len((F.ler(f'recursosJulgamento/{rec_id}') or {}).get('provas', [])) == 2, 30),
               str(len((F.ler(f'recursosJulgamento/{rec_id}') or {}).get('provas', []))) + ' | ' + F.telas())
        pm.select_option('#ed-categoria', 'ocorrencia')
        pm.set_input_files('#ed-arquivos', [arquivos['OCORRENCIA 900001.pdf']])
        F.ate(lambda: len((F.ler(f'recursosJulgamento/{rec_id}') or {}).get('provas', [])) == 3, 30)
        objs = F.objetos_storage(f'julgamentos/condominio-ficticio-alfa/{rec_id}/')
        F.caso(G, 'os 3 arquivos estão no Storage, na pasta do condomínio e do recurso', len(objs) == 3, str(objs))
        bloqueado = F.ler(f'recursosJulgamento/{rec_id}').get('liberado')
        F.caso(G, 'recurso de sessão em rascunho fica fechado ao conselho', bloqueado is False)
        # liberar ao conselho
        pm.click(f'[data-voltar-sessao]')
        F.esperar(pm, "!!document.getElementById('liberar')", 10000)
        pm.click('#liberar')
        F.caso(G, 'liberar a sessão libera também os recursos dela', F.ate(lambda: (F.ler(f'recursosJulgamento/{rec_id}') or {}).get('liberado') is True, 10))
        sid = F.ler(f'recursosJulgamento/{rec_id}')['sessaoId']
        F.esperar(pm, "document.body.innerText.includes('Recolher do conselho')", 8000); foto(pm, '1-escritorio-sessao')

        # ---------- 2. conselheira do condomínio
        b2, pc, ok = sessao('cons@exemplo.test')
        F.caso(G, 'conselheira entra e vê a sessão liberada do condomínio dela', ok and F.esperar(pc, "document.body.innerText.includes('Sessão de julgamento — novembro de 2026')", 20000), F.telas())
        t = telas_login.get('cons@exemplo.test', {})
        F.caso(G, 'conselheira entra sem pop-up da equipe (comunicados, PIX) e sem megafone, escudo e logomarcas',
               t and not t['janelas'] and not t['megafone'] and not t['escudo'] and not t['logos'], str(t))
        t = telas_login.get('membro@exemplo.test', {})
        F.caso(G, '... e a equipe continua com o comunicado, o megafone e o escudo', t and 'com-backdrop' in t['janelas'] and t['megafone'] and t['escudo'], str(t))
        F.caso(G, 'conselheira não vê botões do escritório', pc.evaluate("!document.getElementById('nova-sessao') && !document.querySelector('[data-ir=\"conselheiros\"]')"))
        # entrada pela aba Condomínios: só o cartão das Sessões, e o botão de volta ao hub
        hub = pc.context.new_page()
        hub.goto(F.BASE + '/tools/condominios/index.html')
        F.caso(G, 'no hub de Condomínios a conselheira vê só o cartão das Sessões (sem POPs, onboarding ou clientes)',
               F.esperar(hub, "document.querySelectorAll('.cd-card').length === 1 && document.querySelector('.cd-card').innerText.includes('Sessões de Julgamento')", 15000)
               and hub.evaluate("document.querySelectorAll('#tabs-nav button').length") == 1,
               hub.evaluate("[...document.querySelectorAll('.cd-card h3')].map(e => e.textContent).join(', ') + ' | nav: ' + document.querySelectorAll('#tabs-nav button').length"))
        hub.click('.cd-card')
        F.caso(G, '... o cartão abre as sessões, com o botão "← Condomínios"',
               F.esperar(hub, "location.pathname.includes('sessoes-julgamento') && getComputedStyle(document.getElementById('voltar-condo')).display !== 'none' && document.body.innerText.includes('novembro de 2026')", 15000))
        hub.close()
        pc.click(f'[data-sessao="{sid}"]')
        F.esperar(pc, f"!!document.querySelector('[data-recurso=\"{rec_id}\"]')", 10000)
        pc.click(f'[data-recurso="{rec_id}"]')
        F.caso(G, 'abre o recurso no passo 1 (resumo com os dados da ocorrência)', F.esperar(pc, "document.body.innerText.includes('Bloco 9, nº 101') && document.body.innerText.includes('trafegou na contramão')", 10000))
        foto(pc, '2-conselho-resumo')
        pc.click('[data-passo="1"]')
        F.esperar(pc, "document.querySelectorAll('[data-abrir]').length === 3", 10000)
        pc.click('[data-abrir*="IMAGEM"]')
        F.caso(G, 'abre a imagem pela API do Storage com o login dela (sem link público)',
               F.esperar(pc, "!!document.querySelector('.prova img[src^=\"blob:\"]')", 15000), F.telas())
        foto(pc, '3-conselho-provas')
        F.caso(G, 'a abertura da prova fica registrada na auditoria (quem e o quê)',
               F.ate(lambda: any(d.get('uid') == U['cons'] and 'IMAGEM' in d.get('arquivo', '') for _, d in F.listar('acessosProvasJulgamento')), 10))
        pc.click('[data-passo="2"]')
        F.caso(G, 'passo 3 mostra as alegações do morador', F.esperar(pc, "document.body.innerText.includes('sinalização estava apagada')", 8000))
        pc.fill('#nota-texto', 'Pedir o vídeo da outra câmera.')
        F.caso(G, 'anotação particular é salva sozinha', F.ate(lambda: (F.ler(f"anotacoesJulgamento/{U['cons']}_{rec_id}") or {}).get('texto') == 'Pedir o vídeo da outra câmera.', 10))
        pc.click('#marcar-lido')
        F.caso(G, '"Analisei este recurso" fica registrado', F.ate(lambda: F.ler(f"leiturasJulgamento/{U['cons']}_{rec_id}") is not None, 10))
        F.esperar(pc, "document.body.innerText.includes('marcou como analisado')", 8000); foto(pc, '4-conselho-alegacoes-e-anotacoes')
        r = F.sdk(pc, f"await firebase.firestore().doc('recursosJulgamento/{rec_id}').update({{decisao:{{resultado:'cancelada'}}}})")
        F.caso(G, 'conselheira NÃO lança decisão pelo SDK', r.startswith('erro:permission-denied'), r)

        # ---------- 3. síndico de OUTRO condomínio
        b3, po, ok = sessao('cons2@exemplo.test')
        F.caso(G, 'síndico de outro condomínio não vê a sessão', ok and F.esperar(po, "document.body.innerText.includes('Nenhuma sessão de julgamento liberada')", 15000), F.telas())
        r = F.sdk(po, f"await firebase.firestore().doc('recursosJulgamento/{rec_id}').get()")
        F.caso(G, 'síndico de outro condomínio NÃO lê o recurso pelo SDK', r.startswith('erro:permission-denied'), r)
        caminho = F.ler(f'recursosJulgamento/{rec_id}')['provas'][0]['caminho']
        r = F.sdk(po, f"const t = await firebase.auth().currentUser.getIdToken(); const resp = await fetch('{F.ST}/v0/b/{F.BUCKET}/o/' + encodeURIComponent('{caminho}') + '?alt=media', {{headers:{{Authorization:'Firebase ' + t}}}}); return resp.status")
        F.caso(G, 'síndico de outro condomínio NÃO baixa a prova (Storage 403)', r == 'ok:403', r)
        b3.close()

        # ---------- 4. escritório lança a decisão e a ementa
        F.caso(G, 'escritório vê na sessão quem já analisou', F.esperar(pm, "document.body.innerText.includes('analisado por Conselheira Fictícia Alfa')", 15000))
        pm.click(f'[data-editar="{rec_id}"]')
        F.esperar(pm, "!!document.querySelector('[data-edpasso=\"3\"]')", 10000)
        pm.click('[data-edpasso="3"]')
        F.esperar(pm, "!!document.getElementById('dec-salvar')", 10000)
        pm.check('input[name="dec-res"][value="modulada"]')
        pm.check('input[name="dec-mod"][value="parcelamento"]')
        pm.fill('#dec-detalhe', 'Multa parcelada em 3 vezes.')
        pm.fill('#dec-favor', '4'); pm.fill('#dec-contra', '1')
        pm.click('#dec-sugerir')
        F.caso(G, '"Sugerir ementa" monta o texto com os dados do recurso',
               'OCORRÊNCIA Nº 900001' in pm.input_value('#dec-ementa') and 'PARCIALMENTE PROVIDO' in pm.input_value('#dec-ementa') and '4 a 1' in pm.input_value('#dec-ementa')
               and 'CONDOMÍNIO CONDOMÍNIO' not in pm.input_value('#dec-ementa') and '..' not in pm.input_value('#dec-ementa'),
               pm.input_value('#dec-ementa')[:200])
        foto(pm, '5-escritorio-decisao')
        pm.click('#dec-salvar')
        rr = {}
        F.caso(G, 'decisão salva com a ementa', F.ate(lambda: ((F.ler(f'recursosJulgamento/{rec_id}') or {}).get('decisao') or {}).get('resultado') == 'modulada', 10))
        rr = F.ler(f'recursosJulgamento/{rec_id}') or {}
        exp = rr.get('provasExpiramEm')
        F.caso(G, 'as provas passam a vencer em 90 dias', bool(exp), str(exp))
        F.caso(G, 'conselheira vê o resultado e a ementa no passo "Decisão"',
               (pc.click('[data-passo="4"]') or True) and F.esperar(pc, "document.body.innerText.includes('Penalidade modulada') && document.body.innerText.includes('EMENTA'.toLowerCase()) || document.body.innerText.includes('Ementa')", 15000))
        foto(pc, '6-conselho-decisao')
        with pc.expect_popup() as pop:
            pc.click('[data-ementa-pdf]')
        janela = pop.value
        F.caso(G, 'ementa em PDF: abre a página no timbrado com o nome no padrão do POP',
               F.esperar(janela, "document.title.includes('#900001') && document.title.includes('EMENTA DE JULGAMENTO') && !!document.querySelector('img.bg')", 8000), janela.title())
        janela.close()

        # ---------- 5. ementário
        pm.goto(URL)
        F.esperar(pm, "!!document.querySelector('[data-ir=\"ementario\"]')", 15000)
        pm.click('[data-ir="ementario"]')
        F.caso(G, 'ementário lista o julgado com a contagem por resultado', F.esperar(pm, "document.body.innerText.includes('#900001') && document.body.innerText.includes('moduladas')", 10000))
        foto(pm, '7-ementario')

        # ---------- 6. prazo das provas vencido: conselho perde o acesso e a equipe limpa o Storage
        F.gravar(f'recursosJulgamento/{rec_id}', dict(F.ler(f'recursosJulgamento/{rec_id}'), provasExpiramEm={'__ts__': '2020-01-01T00:00:00Z'}))
        r = F.sdk(pc, f"const t = await firebase.auth().currentUser.getIdToken(); const resp = await fetch('{F.ST}/v0/b/{F.BUCKET}/o/' + encodeURIComponent('{caminho}') + '?alt=media', {{headers:{{Authorization:'Firebase ' + t}}}}); return resp.status")
        F.caso(G, 'prazo vencido: a conselheira não baixa mais a prova', r == 'ok:403', r)
        pm.goto(URL)
        F.caso(G, 'prazo vencido: ao abrir a tela, a equipe apaga as provas do Storage',
               F.ate(lambda: (F.ler(f'recursosJulgamento/{rec_id}') or {}).get('provasRemovidas') is True, 20)
               and not F.objetos_storage(f'julgamentos/condominio-ficticio-alfa/{rec_id}/'), str(F.objetos_storage(f'julgamentos/condominio-ficticio-alfa/{rec_id}/')))
        F.caso(G, 'a decisão e a ementa continuam', ((F.ler(f'recursosJulgamento/{rec_id}') or {}).get('decisao') or {}).get('ementa', '').startswith('RECURSO ADMINISTRATIVO'))
        b2.close(); b.close()

        # ---------- 7. admin aprova o autocadastro como conselheiro e importa um pacote
        ba, pa, ok = sessao('admin@exemplo.test')
        respostas(pa, [])
        # pacote: pasta com pacote.json e uma subpasta por ocorrência
        pac = tempfile.mkdtemp(prefix='pacote-')
        os.makedirs(os.path.join(pac, '900002'))
        open(os.path.join(pac, '900002', 'VIDEO.mp4'), 'wb').write(MP4_FALSO)
        open(os.path.join(pac, '900002', 'OCORRENCIA.pdf'), 'wb').write(F.PDF_FALSO)
        json.dump({'condominio': 'Condomínio Fictício Beta',
                   'sessoes': [{'chave': 'set-2026', 'titulo': 'Sessão de julgamento — setembro de 2026', 'data': '2026-09-20', 'realizada': True}],
                   'recursos': [{'sessao': 'set-2026', 'ocorrencia': '900002', 'unidade': 'Bloco 1, nº 2', 'titulo': 'Animal sem guia', 'fatos': 'Fato fictício.',
                                 'arquivos': [{'arquivo': '900002/VIDEO.mp4', 'categoria': 'prova'}, {'arquivo': '900002/OCORRENCIA.pdf', 'categoria': 'ocorrencia'}]}]},
                  open(os.path.join(pac, 'pacote.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        F.esperar(pa, "!!document.getElementById('importar')", 20000)
        pa.set_input_files('#importar', pac)
        # a confirmação abre depois de ler o pacote.json: esperar pela página (o Playwright só atende a janela quando é chamado)
        F.esperar(pa, "(document.getElementById('imp-log') || {}).textContent && document.getElementById('imp-log').textContent.includes('Concluído')", 60000)
        F.caso(G, 'importar pacote: cria a sessão (rascunho, realizada) e o recurso com os arquivos',
               F.ate(lambda: len((F.ler('recursosJulgamento/condominio-ficticio-beta-900002') or {}).get('provas', [])) == 2, 40)
               and (F.ler('sessoesJulgamento/condominio-ficticio-beta-set-2026') or {}).get('liberada') is False
               and (F.ler('sessoesJulgamento/condominio-ficticio-beta-set-2026') or {}).get('realizada') is True,
               str(F.ler('recursosJulgamento/condominio-ficticio-beta-900002'))[:300] + ' | ' + pa.evaluate("document.getElementById('app').innerText.slice(0, 600)").replace(chr(10), ' / '))
        F.caso(G, 'recurso importado de sessão realizada aparece como "decisão a lançar"',
               (pa.goto(URL) or True) and F.esperar(pa, "document.querySelectorAll('[data-condo]').length >= 2", 15000)
               and (pa.click('[data-condo="condominio-ficticio-beta"]') or True)
               and (pa.click('[data-sessao="condominio-ficticio-beta-set-2026"]') or True)
               and F.esperar(pa, "document.body.innerText.toLowerCase().includes('decisão a lançar')", 10000))
        pa.goto(URL)
        F.esperar(pa, "!!document.querySelector('[data-ir=\"conselheiros\"]')", 20000)
        pa.click('[data-ir="conselheiros"]')
        F.esperar(pa, f"!!document.querySelector('[data-aprovar-conselho=\"{U['novo']}\"]')", 15000)
        foto(pa, '8-admin-conselheiros')
        pa.select_option(f".cs-condo[data-uid='{U['novo']}']", 'condominio-ficticio-alfa')
        pa.select_option(f".cs-papel[data-uid='{U['novo']}']", 'sindico')
        pa.click(f'[data-aprovar-conselho="{U["novo"]}"]')
        F.caso(G, 'admin aprova o cadastro como síndico: vira tipo Síndico, ativo, só com a aba Condomínios',
               F.ate(lambda: (F.ler(f"users/{U['novo']}") or {}).get('acesso') == 'ativo', 10)
               and (F.ler(f"users/{U['novo']}") or {}).get('role') == 'sindico' and (F.ler(f"users/{U['novo']}") or {}).get('tabs') == ['condominios'],
               str(F.ler(f"users/{U['novo']}")))
        F.caso(G, 'o vínculo com o condomínio é gravado e o bloco do organograma sai',
               ((F.ler(f"conselhoMembros/{U['novo']}") or {}).get('condominios') or {}).get('condominio-ficticio-alfa') == 'sindico'
               and F.ler(f"organograma/{U['novo']}") is None)
        ba.close()

    F.caso('0. Isolamento do ambiente de teste', 'nenhum pedido saiu para domínios de produção', not F.pedidos_producao, '; '.join(F.pedidos_producao[:5]))
    site.shutdown()
    falhas = 0
    for g, n, ok, det in F.resultados:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (('  [' + det + ']') if (det and not ok) else ''))
    if falhas:
        print('\nCONSOLE (últimas 25):'); [print('  ' + c) for c in F.console[-25:]]
    print('\nSessões de Julgamento: %d de %d verificações passaram (%d reprovadas).' % (len(F.resultados) - falhas, len(F.resultados), falhas))
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        import traceback; traceback.print_exc()
        for g, n, ok, det in F.resultados: print(('  ✓ ' if ok else '  ✗ ') + n + ('  [' + det + ']' if det and not ok else ''))
        print('\nCONSOLE (últimas 30):'); [print('  ' + c) for c in F.console[-30:]]
        sys.exit(2)
