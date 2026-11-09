import json, os, sys, threading, functools, http.server, socketserver, time, re
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
AQUI = os.path.dirname(os.path.abspath(__file__))
FAKE = open(os.path.join(AQUI, 'fake-firebase.js'), encoding='utf8').read()
PORTA = 8765
BASE = f'http://127.0.0.1:{PORTA}'
FOTOS = os.path.join(AQUI, 'fotos'); os.makedirs(FOTOS, exist_ok=True)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', PORTA), functools.partial(Q, directory=REPO))
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

falhas = []
def ok(cond, msg):
    print(('  OK   ' if cond else '  FALHA ') + msg)
    if not cond: falhas.append(msg)

USERS = {
  'adm':   {'role': 'admin', 'displayName': 'Jonathan Silva Fonseca', 'email': 'jonathan@exemplo.test', 'cpf': '11122233344', 'oab': '163443/MG',
            'estadoCivil': 'Casado', 'nacionalidade': 'brasileiro', 'tabs': ['x'], 'acesso': 'ativo'},
  'hecy':  {'role': 'membro', 'displayName': 'Hecy Braga de Oliveira', 'email': 'hecy@exemplo.test', 'cpf': '55566677788', 'oab': '95948/MG',
            'estadoCivil': 'Divorciado', 'nacionalidade': 'brasileiro', 'tabs': ['x'], 'acesso': 'ativo'},
  'assoc1': {'role': 'membro', 'tipoColaborador': 'associado', 'displayName': 'Fulana de Teste Silva', 'email': 'fulana@exemplo.test',
            'cpf': '07358094611', 'rg': 'MG-11.686.233 SSP/MG', 'oab': '163041/MG', 'estadoCivil': 'Solteira', 'nacionalidade': 'brasileira',
            'telefone': '34992964090', 'endereco': 'Rua Teste, 192, Bairro Jardim, CEP 38081-505, Uberaba/MG', 'dataIngresso': '2026-12-01',
            'pixTipo': 'CPF', 'pixChave': '073.580.946-11', 'remuneracao': 'R$ 3.500,00', 'tabs': ['x'], 'acesso': 'ativo'},
  'novo':  {'role': 'membro', 'tipoColaborador': 'associado', 'displayName': 'Novo Associado Incompleto', 'email': 'novo@exemplo.test',
            'tabs': ['x'], 'acesso': 'ativo'},
  'teste': {'role': 'membro', 'displayName': 'TESTE MEMBROS', 'email': 'teste@exemplo.test', 'tabs': ['x'], 'acesso': 'ativo'},
}
STORE = {f'users/{k}': v for k, v in USERS.items()}
STORE['perfis/assoc1'] = {'displayName': 'Fulana de Teste Silva', 'birthDate': '1990-03-13'}
STORE['perfis/adm'] = {'displayName': 'Jonathan Silva Fonseca'}

def contexto(p, user, store):
    ctx = p.chromium.launch().new_context(viewport={'width': 1300, 'height': 950}, accept_downloads=True, geolocation={'latitude': -18.9186, 'longitude': -48.2772},
                                         permissions=['geolocation'])
    externos = []
    def rota(route):
        u = route.request.url
        if u.startswith(BASE):
            if u.split('?')[0].endswith('.html'):
                r = route.fetch(); body = re.sub(r'\s+integrity="[^"]+"', '', r.text())
                return route.fulfill(response=r, body=body)
            return route.continue_()
        if 'firebase-app-compat' in u: return route.fulfill(status=200, content_type='application/javascript', body=FAKE)
        if 'firebasejs' in u: return route.fulfill(status=200, content_type='application/javascript', body='')
        if 'ipify' in u: return route.fulfill(status=200, content_type='application/json', body='{"ip":"203.0.113.5"}')
        if 'fonts.googleapis' in u or 'fonts.gstatic' in u or 'cdnjs.cloudflare.com' in u: return route.continue_()
        externos.append(u); return route.abort()
    ctx.route('**/*', rota)
    ctx.add_init_script(f'window.__FAKE_STORE = {json.dumps(store)}; window.__FAKE_USER = {json.dumps(user)}; window.__FAKE_LOG = [];')
    return ctx, externos

def assinar_canvas(page, sel):
    box = page.locator(sel).bounding_box()
    page.mouse.move(box['x'] + 30, box['y'] + 100); page.mouse.down()
    for i in range(12): page.mouse.move(box['x'] + 40 + i * 25, box['y'] + 60 + (i % 3) * 25)
    page.mouse.up()

erros_js = []
with sync_playwright() as p:
    # ================= 1) página do administrador =================
    print('1) Administrador: configuração, preparo, prévia e envio')
    ctx, ext = contexto(p, {'uid': 'adm', 'email': 'jonathan@exemplo.test', 'senha': 'certa'}, STORE)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: erros_js.append('admin: ' + str(e)))
    pg.goto(BASE + '/tools/contratos/associacao.html'); pg.wait_for_selector('#conteudo', state='visible')
    linhas = pg.locator('#lista tr').all_inner_texts()
    ok(any('Fulana' in l for l in linhas) and any('Novo Associado' in l for l in linhas), 'lista traz os associados do cadastro (inclusive o novo)')
    ok(not any('TESTE MEMBROS' in l for l in linhas), 'quem não é associado não entra na lista')
    # funções
    f = pg.evaluate('''() => { const c = window.__contratoAssoc; return {
        a: c.valorExtenso(3500), b: c.valorExtenso(1234.56), c: c.valorExtenso(1), d: c.valorExtenso(2000000), e: c.valorExtenso(10101),
        h0: c.calcHabilitacao('2026-12-01', 0), h12: c.calcHabilitacao('2026-12-01', 12), h1: c.calcHabilitacao('2027-01-31', 1),
        hS: c.calcHabilitacao('2026-03-07', 1), hFer: c.calcHabilitacao('2026-08-30', 12), o: c.fmtOAB('163041/MG') } }''')
    ok(f['a'] == 'três mil e quinhentos reais', 'extenso 3.500 → ' + f['a'])
    ok(f['b'] == 'mil duzentos e trinta e quatro reais e cinquenta e seis centavos', 'extenso 1.234,56 → ' + f['b'])
    ok(f['c'] == 'um real', 'extenso 1 → ' + f['c'])
    ok(f['d'] == 'dois milhões de reais', 'extenso 2.000.000 → ' + f['d'])
    ok(f['e'] == 'dez mil cento e um reais', 'extenso 10.101 → ' + f['e'])
    ok(f['h0'] == '2026-12-01', 'habilitação com 0 meses = data de início')
    ok(f['h12'] == '2027-12-02', 'habilitação 12 meses de 01/12/2026 → 02/12/2027 (dia útil seguinte) → ' + f['h12'])
    ok(f['h1'] == '2027-03-01', '31/01 + 1 mês = 28/02 (último dia) → próximo dia útil 01/03/2027 → ' + f['h1'])
    ok(f['hS'] == '2026-04-08', '07/03 + 1 mês = 07/04 (terça) → 08/04/2026 → ' + f['hS'])
    ok(f['hFer'] == '2027-09-01', '30/08/2027 + 1 dia = 31/08 (feriado de Uberlândia) → 01/09/2027 → ' + f['hFer'])
    ok(f['o'] == 'OAB/MG 163.041', 'OAB formatada → ' + f['o'])

    # configuração: modelo + titular + diretor
    pg.set_input_files('#cfg-modelo', os.path.join(REPO, 'privado', 'contrato-associacao-modelo.txt'))
    pg.wait_for_function("document.getElementById('cfg-msg').textContent.indexOf('Modelo lido') !== -1")
    pg.set_input_files('#cfg-termos', os.path.join(REPO, 'privado', 'termos-associacao.txt'))
    pg.wait_for_function("document.getElementById('cfg-msg').textContent.indexOf('termos lidos') !== -1")
    pg.select_option('#cfg-titular', 'adm'); pg.select_option('#cfg-diretor', 'hecy')
    pg.click('#cfg-salvar'); pg.wait_for_function("document.getElementById('cfg-msg').textContent === 'Configuração salva.'")
    st = pg.evaluate('window.__FAKE_STORE')
    ok(len(st.get('contratosAssociacaoConfig/modelo', {}).get('texto', '')) > 10000, 'modelo gravado no Firestore (não no código)')
    ok(st.get('contratosAssociacaoConfig/regras', {}).get('exigirAssinatura') is False, 'exigir assinatura começa desligado')

    # associado com cadastro incompleto: envio bloqueado
    pg.click('button[data-preparar="novo"]')
    ok('falta no cadastro' in pg.inner_text('#ed-dados'), 'cadastro incompleto aparece marcado')
    pg.fill('#ed-valor', '2.000,00'); pg.click('#ed-previa')
    pg.wait_for_function("document.getElementById('ed-msg').textContent.length > 0")
    ok('Faltam dados' in pg.inner_text('#ed-msg'), 'prévia avisa os dados que faltam: ' + pg.inner_text('#ed-msg')[:120])
    pg.click('#ed-enviar')
    ok(not pg.is_visible('#ass-bd'), 'com dados faltando não abre a assinatura')

    # associado completo
    pg.click('button[data-preparar="assoc1"]')
    ok(pg.input_value('#ed-valor') == '3.500,00', 'valor fixo pré-preenchido do cadastro')
    ok(pg.input_value('#ed-habilitacao') == '2027-12-02', 'data de habilitação calculada no formulário')
    ok('três mil e quinhentos reais' in pg.inner_text('#ed-valor-ext'), 'valor por extenso no formulário')
    pg.fill('#ed-prazo', '15'); pg.dispatch_event('#ed-prazo', 'input')
    ok(pg.input_value('#ed-prazo') == '12', 'prazo acima de 12 volta para 12 (teto)')
    pg.click('#ed-enviar')
    ok('Pré-visualizar' in pg.inner_text('#ed-msg'), 'não envia sem prévia')
    pg.click('#ed-previa'); pg.wait_for_function("document.getElementById('ed-msg').textContent.indexOf('Prévia pronta') !== -1")
    fr = pg.frame_locator('#ed-frame')
    fr.locator('.doc-page').first.wait_for(timeout=60000); pg.wait_for_timeout(2500)
    paginas = fr.locator('.doc-page').count()
    texto = fr.locator('#doc-pages').inner_text()
    ok(paginas >= 8, f'prévia com timbrado: {paginas} páginas')
    ok('[FALTA' not in texto and '{{' not in texto, 'prévia sem campos faltando nem chaves')
    ok('FULANA DE TESTE SILVA' in texto and 'OAB/MG 163.041' in texto and '073.580.946-11' in texto, 'qualificação do associado preenchida')
    ok('R$ 3.500,00 (três mil e quinhentos reais)' in texto, 'cláusula 7.1 com valor e extenso')
    ok('12 (doze) meses' in texto and '02/12/2027' in texto, 'Anexo I com prazo e data de habilitação')
    # cláusulas do modelo (o texto fica só em privado/, fora do repositório público): cada uma tem de aparecer na prévia
    with open(os.path.join(REPO, 'privado', 'contrato-associacao-modelo.txt'), encoding='utf8') as f:
        modelo = {l.split(' ', 1)[0]: l for l in f.read().splitlines() if re.match(r'^(A?\d+\.\d+\.|III – )', l)}
    for item in ['1.3.', '4.1.', '4.3.', '4.6.', '7.1.', '10.2.', '15.6.', '17.6.', 'A1.6.', 'A2.3.', 'A2.4.', 'A5.2.', 'A6.1.', 'A6.3.', 'A7.4.', 'A7.5.']:
        linha = modelo[item]
        trechos = [t for t in re.split(r'\{\{\w+\}\}', linha) if len(t.strip()) > 25]
        ok(all(' '.join(t.split()) in ' '.join(texto.split()) for t in trechos), 'cláusula ' + item + ' do modelo aparece na prévia')
    fr.locator('.doc-page').first.screenshot(path=os.path.join(FOTOS, 'previa-p1.png'))
    ok(pg.is_visible('#ed-imprimir') and pg.is_visible('#ed-pdf'), 'prévia pronta mostra Imprimir e Baixar PDF')
    with pg.expect_download(timeout=120000) as dl: pg.click('#ed-pdf')
    nomepdf = dl.value.suggested_filename
    ok(nomepdf.startswith('(FULANA DE TESTE SILVA) – MINUTA DO CONTRATO DE ASSOCIAÇÃO') and nomepdf.endswith('.pdf'), 'PDF da prévia baixado como minuta: ' + nomepdf)
    caminho = os.path.join(FOTOS, 'minuta.pdf'); dl.value.save_as(caminho)
    ok(os.path.getsize(caminho) > 200000 and open(caminho, 'rb').read(4) == b'%PDF', f'PDF válido ({os.path.getsize(caminho)//1024} KB)')
    pg.wait_for_function("document.getElementById('ed-msg').textContent.indexOf('PDF da minuta baixado') !== -1")
    pg.evaluate("() => { document.getElementById('ed-frame').contentWindow.print = function(){ window.__imprimiu = true; }; }")
    pg.click('#ed-imprimir')
    ok(pg.evaluate("window.__imprimiu === true"), 'Imprimir chama a impressão da prévia (timbrado)')   # a função falsa foi criada nesta página
    pg.fill('#ed-prazo', '6'); pg.dispatch_event('#ed-prazo', 'input')
    ok(not pg.is_visible('#ed-pdf'), 'mudou um campo: botões somem até nova prévia')
    pg.fill('#ed-prazo', '12'); pg.dispatch_event('#ed-prazo', 'input')
    pg.click('#ed-previa'); pg.wait_for_function("document.getElementById('ed-msg').textContent.indexOf('Prévia pronta') !== -1")
    fr.locator('.doc-page').first.wait_for(timeout=60000); pg.wait_for_timeout(2500)

    # assinar pela sociedade
    pg.click('#ed-enviar'); pg.wait_for_selector('#ass-bd.show')
    pg.fill('#ass-senha', 'errada'); assinar_canvas(pg, '#ass-canvas'); pg.click('#ass-ok')
    pg.wait_for_function("document.getElementById('ass-err').textContent.length > 0")
    ok(pg.inner_text('#ass-err') == 'Senha incorreta.', 'senha errada não envia')
    pg.fill('#ass-senha', 'certa'); pg.click('#ass-ok')
    pg.wait_for_selector('#ass-bd', state='hidden')
    st = pg.evaluate('window.__FAKE_STORE')
    cts = {k: v for k, v in st.items() if k.startswith('contratosAssociacao/')}
    ok(len(cts) == 1, 'um contrato criado')
    cid, c = list(cts.items())[0]
    ok(c['status'] == 'aguardando_associado' and c['associadoUid'] == 'assoc1', 'status aguardando o associado')
    ok(c['sociedade']['assinaturaPng'].startswith('data:image/png') and c['sociedade']['registroAssinatura']['ip'] == '203.0.113.5', 'assinatura da sociedade com IP')
    ok(c['sociedade']['registroAssinatura']['localizacao']['status'] == 'ok', 'localização registrada')
    ok(len(c['hashTexto']) == 64 and 'FALTA' not in c['textoFinal'], 'texto final com SHA-256')
    ok(c['diretorUid'] == 'hecy' and c['dados']['prazoMeses'] == 12, 'diretor e dados negociados gravados')
    ok('Aguardando o associado' in pg.inner_text('#lista'), 'lista mostra "Aguardando o associado"')
    pg.screenshot(path=os.path.join(FOTOS, 'admin-lista.png'), full_page=True)
    ok(not ext, 'nenhum pedido a servidores externos: ' + str(ext[:3]))
    STORE2 = pg.evaluate('JSON.parse(JSON.stringify(window.__FAKE_STORE))')
    ctx.close()

    # ================= 2) tela obrigatória no login (associado) =================
    print('2) Login do associado: tela obrigatória')
    HARNESS = '''<!doctype html><html><head><meta charset="utf-8"><script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"></script>
    <script src="/contrato-associacao.js"></script></head><body style="background:#161010;color:#eee;font-family:Segoe UI"><p>PORTAL</p>
    <script>firebase.initializeApp({}); window.__res = null;
    FBContratoAssociacao.verificar({ db: firebase.firestore(), auth: firebase.auth(), perfil: window.__PERFIL }).then(function(r){ window.__res = r; });</script></body></html>'''
    def gate(user, perfil, store, nome):
        ctx, ext = contexto(p, user, store)
        ctx.add_init_script(f'window.__PERFIL = {json.dumps(perfil)};')
        ctx.route(BASE + '/__gate.html', lambda r: r.fulfill(status=200, content_type='text/html', body=HARNESS))
        pg = ctx.new_page(); pg.on('pageerror', lambda e: erros_js.append(nome + ': ' + str(e)))
        pg.goto(BASE + '/__gate.html'); pg.wait_for_function('window.__res !== null')
        return ctx, pg, ext

    ctx, pg, ext = gate({'uid': 'assoc1', 'email': 'fulana@exemplo.test', 'senha': 's1'}, {'uid': 'assoc1', 'tipoColaborador': 'associado', 'role': 'membro'}, STORE2, 'gate-assoc')
    ok(pg.evaluate('window.__res') == 'assinar' and pg.is_visible('#ca-bd'), 'associado com contrato enviado vê a tela de assinatura')
    ok(pg.locator('#ca-sair').count() == 1 and pg.locator('#ca-depois').count() == 0, 'só dá para assinar ou sair (sem "depois")')
    pg.frame_locator('#ca-frame').locator('.doc-page').first.wait_for(timeout=60000); pg.wait_for_timeout(2500)
    ok(pg.frame_locator('#ca-frame').locator('.doc-page').count() >= 8, 'contrato aparece com o timbrado na tela')
    pg.screenshot(path=os.path.join(FOTOS, 'gate-associado.png'))
    pg.click('#ca-assinar'); ok('Marque' in pg.inner_text('#ca-err'), 'exige marcar que leu')
    pg.check('#ca-li'); pg.click('#ca-assinar'); ok('senha' in pg.inner_text('#ca-err'), 'exige senha')
    pg.fill('#ca-senha', 'x'); pg.click('#ca-assinar'); ok('assinatura' in pg.inner_text('#ca-err'), 'exige desenhar a assinatura')
    assinar_canvas(pg, '#ca-canvas'); pg.click('#ca-assinar')
    pg.wait_for_function("document.getElementById('ca-err').textContent.length > 0")
    ok(pg.inner_text('#ca-err') == 'Senha incorreta.', 'senha errada não assina')
    pg.fill('#ca-senha', 's1'); pg.click('#ca-assinar')
    pg.wait_for_selector('#ca-continuar')
    st = pg.evaluate('window.__FAKE_STORE'); c = st[cid]
    ok(c['status'] == 'assinado' and c['associado']['uid'] == 'assoc1' and c['associado']['assinaturaPng'].startswith('data:image/png'), 'contrato assinado pelo associado')
    upd = [l for l in pg.evaluate('window.__FAKE_LOG') if l[0] == 'update']
    ok(set(upd[-1][2].keys()) == {'status', 'associado', 'assinadoEm', 'assinadoEmISO'}, 'só grava os campos que a regra permite: ' + str(sorted(upd[-1][2].keys())))
    pg.click('#ca-continuar'); ok(pg.locator('#ca-bd').count() == 0, 'depois de assinar, o Portal fica livre')
    STORE3 = pg.evaluate('JSON.parse(JSON.stringify(window.__FAKE_STORE))'); ctx.close()

    # já assinado: entra livre
    ctx, pg, ext = gate({'uid': 'assoc1', 'email': 'fulana@exemplo.test', 'senha': 's1'}, {'uid': 'assoc1', 'tipoColaborador': 'associado', 'role': 'membro'}, STORE3, 'gate-assinado')
    ok(pg.evaluate('window.__res') == 'livre' and pg.locator('#ca-bd').count() == 0, 'associado com contrato assinado entra sem tela'); ctx.close()

    # ================= 3) diretor interveniente =================
    print('3) Diretor interveniente')
    ctx, pg, ext = gate({'uid': 'hecy', 'email': 'hecy@exemplo.test', 'senha': 'h1'}, {'uid': 'hecy', 'role': 'membro'}, STORE3, 'gate-diretor')
    ok(pg.is_visible('#ca-bd') and pg.locator('#ca-depois').count() == 1, 'diretor vê a assinatura com opção "Assinar depois"')
    ok('coobrigado solidário' in pg.inner_text('#ca-bd'), 'tela do diretor avisa da responsabilidade pessoal e solidária')
    pg.click('#ca-depois'); ok(pg.locator('#ca-bd').count() == 0, '"Assinar depois" libera o Portal'); ctx.close()
    ctx, pg, ext = gate({'uid': 'hecy', 'email': 'hecy@exemplo.test', 'senha': 'h1'}, {'uid': 'hecy', 'role': 'membro'}, STORE3, 'gate-diretor2')
    pg.check('#ca-li'); pg.fill('#ca-senha', 'h1'); pg.wait_for_timeout(300); assinar_canvas(pg, '#ca-canvas'); pg.click('#ca-assinar'); pg.wait_for_selector('#ca-continuar')
    st = pg.evaluate('window.__FAKE_STORE')
    upd = [l for l in pg.evaluate('window.__FAKE_LOG') if l[0] == 'update']
    ok(st[cid].get('interveniente', {}).get('uid') == 'hecy' and list(upd[-1][2].keys()) == ['interveniente'], 'diretor assina e só acrescenta a assinatura dele')
    STORE4 = pg.evaluate('JSON.parse(JSON.stringify(window.__FAKE_STORE))'); ctx.close()

    # ================= 4) exigir assinatura =================
    print('4) Exigir contrato assinado')
    ctx, pg, ext = gate({'uid': 'novo', 'email': 'novo@exemplo.test', 'senha': 'n'}, {'uid': 'novo', 'tipoColaborador': 'associado', 'role': 'membro'}, STORE4, 'gate-novo-off')
    ok(pg.evaluate('window.__res') == 'livre', 'sem a chave ligada, associado sem contrato entra normalmente (modo teste)'); ctx.close()
    S5 = dict(STORE4); S5['contratosAssociacaoConfig/regras'] = {'exigirAssinatura': True}
    ctx, pg, ext = gate({'uid': 'novo', 'email': 'novo@exemplo.test', 'senha': 'n'}, {'uid': 'novo', 'tipoColaborador': 'associado', 'role': 'membro'}, S5, 'gate-novo-on')
    ok(pg.evaluate('window.__res') == 'aguardando' and 'sendo preparado' in pg.inner_text('#ca-bd'), 'com a chave ligada, associado sem contrato fica bloqueado')
    pg.screenshot(path=os.path.join(FOTOS, 'gate-aguardando.png')); ctx.close()
    ctx, pg, ext = gate({'uid': 'teste', 'email': 'teste@exemplo.test', 'senha': 't'}, {'uid': 'teste', 'role': 'membro'}, S5, 'gate-membro')
    ok(pg.evaluate('window.__res') == 'livre', 'quem não é associado nunca é bloqueado'); ctx.close()
    ctx, pg, ext = gate({'uid': 'assoc1', 'email': 'fulana@exemplo.test', 'senha': 's1'}, {'uid': 'assoc1', 'tipoColaborador': 'associado', 'role': 'membro'}, S5, 'gate-assinado-on')
    ok(pg.evaluate('window.__res') == 'livre', 'associado com contrato assinado entra com a chave ligada'); ctx.close()

    # ================= 5) texto adulterado =================
    print('5) Texto adulterado depois da assinatura da sociedade')
    S6 = json.loads(json.dumps(STORE2)); S6[cid]['textoFinal'] = S6[cid]['textoFinal'].replace('3.500,00', '35.000,00')
    ctx, pg, ext = gate({'uid': 'assoc1', 'email': 'fulana@exemplo.test', 'senha': 's1'}, {'uid': 'assoc1', 'tipoColaborador': 'associado', 'role': 'membro'}, S6, 'gate-adulterado')
    pg.check('#ca-li'); pg.fill('#ca-senha', 's1'); assinar_canvas(pg, '#ca-canvas'); pg.click('#ca-assinar')
    pg.wait_for_function("document.getElementById('ca-err').textContent.length > 0")
    ok('não confere' in pg.inner_text('#ca-err'), 'texto alterado é recusado antes de assinar')
    ok(pg.evaluate('window.__FAKE_STORE')[cid]['status'] == 'aguardando_associado', 'nada foi gravado'); ctx.close()

    # ================= 6) documento assinado =================
    print('6) Documento final assinado')
    ctx, ext = contexto(p, {'uid': 'assoc1', 'email': 'fulana@exemplo.test', 'senha': 's1'}, STORE4)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: erros_js.append('doc: ' + str(e)))  # downloads aceitos no contexto
    pg.goto(BASE + '/tools/contratos/associacao-documento.html?id=' + cid.split('/')[1]); pg.wait_for_selector('.doc-page', timeout=60000); pg.wait_for_timeout(2500)
    t = pg.inner_text('#doc-pages'); n = pg.locator('.doc-page').count()
    ok('Código de verificação' in t and 'SHA-256' in t, 'rodapé com código de verificação e SHA-256')
    ok(t.count('Assinado eletronicamente no Portal') >= 6, 'três assinaturas aparecem nos dois blocos (contrato e anexo)')
    ok('DIRETOR INTERVENIENTE E COOBRIGADO SOLIDÁRIO' in t, 'assinatura do diretor como coobrigado solidário')
    ok('data da última assinatura' not in t and re.search(r'Uberlândia/MG, \d{1,2} de \w+ de \d{4}\.', t) is not None, 'data por extenso das assinaturas preenchida')
    ok(pg.locator('.doc-page').last.locator('.doc-pagenum').inner_text() == f'{n}/{n}', f'numeração das páginas ({n})')
    for i in [0, n // 2, n - 1]:
        pg.locator('.doc-page').nth(i).screenshot(path=os.path.join(FOTOS, f'assinado-p{i+1}.png'))
    # nenhuma página com texto escondido (a última linha não pode passar do quadro de conteúdo)
    with pg.expect_download(timeout=120000) as dl: pg.click('#btn-pdf')
    caminho = os.path.join(FOTOS, 'assinado.pdf'); dl.value.save_as(caminho)
    tam = os.path.getsize(caminho)
    ok(open(caminho, 'rb').read(4) == b'%PDF' and tam < 2 * 1024 * 1024, f'PDF do contrato assinado em texto, leve ({tam // 1024} KB)')
    ok(b'/FontFile2' in open(caminho, 'rb').read() and b'Poppins' in open(caminho, 'rb').read(), 'PDF com a fonte Poppins embutida (texto, não imagem)')
    vaz = pg.evaluate('''() => Array.from(document.querySelectorAll('.doc-content')).filter(c => c.scrollHeight > c.clientHeight + 1).length''')
    ok(vaz == 0, 'nenhuma página com texto cortado')
    ctx.close()

    # ================= 8) termos e remuneração da Diretoria =================
    print('8) Termos e remuneração da Diretoria')
    ctx, ext = contexto(p, {'uid': 'adm', 'email': 'jonathan@exemplo.test', 'senha': 'certa'}, STORE4)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: erros_js.append('termos: ' + str(e)))
    pg.goto(BASE + '/tools/contratos/associacao.html'); pg.wait_for_selector('#conteudo', state='visible')
    ok('5 modelos de termo carregados' in pg.inner_text('#cfg-termos-info'), 'modelos de termos carregados na configuração')
    ok('Pendente' in pg.inner_text('#dir-alerta'), 'remuneração da Diretoria do ano aparece pendente (depois de 25/01)')
    pg.click('button[data-termo]')
    opcoes = pg.locator('#te-escolha option').all_inner_texts()
    ok(len(opcoes) == 4 and 'Renegociação do repasse fixo' in opcoes, 'quatro termos do associado: ' + ', '.join(opcoes))
    pg.select_option('#te-escolha', 'renegociacao-fixo')
    pg.fill('[data-campo="VALOR_NOVO"]', '4.000,00')
    pg.click('#te-previa'); pg.wait_for_function("document.getElementById('te-msg').textContent.indexOf('Prévia pronta') !== -1")
    tf = pg.frame_locator('#te-frame'); tf.locator('.doc-page').first.wait_for(timeout=60000); pg.wait_for_timeout(1500)
    tt = tf.locator('#doc-pages').inner_text()
    ok('de R$ 3.500,00 (três mil e quinhentos reais) para R$ 4.000,00 (quatro mil reais)' in tt, 'termo de renegociação com valor atual e novo')
    ok('Contrato de Associação Profissional de Advogado de 01/12/2026' in tt and '[FALTA' not in tt, 'termo cita o contrato e não tem campos faltando')
    pg.click('#te-enviar'); pg.wait_for_selector('#ass-bd.show')
    pg.fill('#ass-senha', 'certa'); assinar_canvas(pg, '#ass-canvas'); pg.click('#ass-ok'); pg.wait_for_selector('#ass-bd', state='hidden')
    st = pg.evaluate('window.__FAKE_STORE')
    termo = [ (k, v) for k, v in st.items() if k.startswith('contratosAssociacao/') and v.get('tipo') == 'termo' ]
    ok(len(termo) == 1 and termo[0][1]['status'] == 'aguardando_associado' and termo[0][1]['associadoUid'] == 'assoc1' and termo[0][1]['dados']['campos']['VALOR_NOVO'] == 4000,
       'termo enviado ao associado, assinado pela sociedade')
    ok('Renegociação do repasse fixo' in pg.inner_text('#termos-lista'), 'termo aparece na lista de termos')
    # remuneração da Diretoria
    pg.click('#dir-fixar')
    pg.fill('[data-campo="VALOR_TITULAR"]', '8.000,00'); pg.fill('[data-campo="VALOR_DIRETOR"]', '6.000,00')
    pg.click('#te-previa'); pg.wait_for_function("document.getElementById('te-msg').textContent.indexOf('Prévia pronta') !== -1")
    tf.locator('.doc-page').first.wait_for(timeout=60000); pg.wait_for_timeout(1500)
    tt = tf.locator('#doc-pages').inner_text()
    ok('R$ 8.000,00 (oito mil reais)' in tt and 'R$ 6.000,00 (seis mil reais)' in tt and 'HECY BRAGA DE OLIVEIRA' in tt, 'documento da Diretoria com os dois valores')
    pg.click('#te-enviar'); pg.wait_for_selector('#ass-bd.show')
    pg.fill('#ass-senha', 'certa'); assinar_canvas(pg, '#ass-canvas'); pg.click('#ass-ok'); pg.wait_for_selector('#ass-bd', state='hidden')
    st = pg.evaluate('window.__FAKE_STORE')
    pl = [ v for k, v in st.items() if k.startswith('contratosAssociacao/') and v.get('tipo') == 'prolabore' ]
    ok(len(pl) == 1 and pl[0]['associadoUid'] == 'hecy' and pl[0]['rotuloSignatario'] == 'DIRETOR', 'documento da Diretoria vai para o diretor assinar')
    ok('fixada' in pg.inner_text('#dir-alerta'), 'alerta da Diretoria fica verde depois de fixada')
    STORE5 = pg.evaluate('JSON.parse(JSON.stringify(window.__FAKE_STORE))'); ctx.close()

    ctx, pg, ext = gate({'uid': 'assoc1', 'email': 'fulana@exemplo.test', 'senha': 's1'}, {'uid': 'assoc1', 'tipoColaborador': 'associado', 'role': 'membro'}, STORE5, 'gate-termo')
    ok(pg.evaluate('window.__res') == 'assinar' and 'Renegociação do repasse fixo' in pg.inner_text('#ca-bd') and pg.locator('#ca-sair').count() == 1, 'termo é obrigatório para o associado (assinar ou sair)')
    pg.check('#ca-li'); pg.fill('#ca-senha', 's1'); pg.wait_for_timeout(300); assinar_canvas(pg, '#ca-canvas'); pg.click('#ca-assinar'); pg.wait_for_selector('#ca-continuar')
    st = pg.evaluate('window.__FAKE_STORE')
    ok(any(v.get('tipo') == 'termo' and v.get('status') == 'assinado' for v in st.values()), 'associado assinou o termo')
    STORE6 = pg.evaluate('JSON.parse(JSON.stringify(window.__FAKE_STORE))'); ctx.close()
    ctx, pg, ext = gate({'uid': 'hecy', 'email': 'hecy@exemplo.test', 'senha': 'h1'}, {'uid': 'hecy', 'role': 'membro'}, STORE6, 'gate-diretoria')
    ok('Remuneração fixa da Diretoria' in pg.inner_text('#ca-bd') and pg.locator('#ca-depois').count() == 1, 'diretor assina a remuneração da Diretoria, podendo deixar para depois')
    ctx.close()
    ctx, pg, ext = gate({'uid': 'adm', 'email': 'jonathan@exemplo.test', 'senha': 'certa'}, {'uid': 'adm', 'role': 'admin'}, STORE4, 'gate-lembrete')
    ok(pg.evaluate('window.__res') == 'lembrete' and 'Remuneração fixa da Diretoria' in pg.inner_text('#ca-bd'), 'admin sem a remuneração do ano: lembrete no login')
    ctx.close()
    ctx, pg, ext = gate({'uid': 'adm', 'email': 'jonathan@exemplo.test', 'senha': 'certa'}, {'uid': 'adm', 'role': 'admin'}, STORE5, 'gate-sem-lembrete')
    ok(pg.evaluate('window.__res') == 'livre', 'admin com a remuneração do ano fixada: sem lembrete')
    ctx.close()

    # ================= 7) sub-aba em Contratos =================
    print('7) Sub-aba dentro de Contratos')
    ctx, ext = contexto(p, {'uid': 'adm', 'email': 'jonathan@exemplo.test', 'senha': 'certa'}, STORE4)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: erros_js.append('contratos: ' + str(e)))
    pg.goto(BASE + '/tools/contratos/index.html'); pg.wait_for_selector('#ctr-subnav')
    ok(pg.is_visible('body > main') and not pg.is_visible('#ctr-assoc'), 'abre em "Contratos e propostas"')
    pg.click('[data-sub="associacao"]'); pg.wait_for_timeout(800)
    ok(not pg.is_visible('body > main') and pg.is_visible('#ctr-assoc'), 'sub-aba "Contrato de associação" abre a página nova')
    pg.frame_locator('#ctr-assoc-frame').locator('#conteudo').wait_for(state='visible')
    pg.screenshot(path=os.path.join(FOTOS, 'contratos-subaba.png'))
    pg.goto(BASE + '/tools/contratos/index.html?_subtabs=gerador'); pg.wait_for_timeout(500)
    ok(not pg.is_visible('#ctr-subnav') and pg.is_visible('body > main'), 'quem só tem a sub-aba do gerador não vê a de associação')
    pg.goto(BASE + '/tools/contratos/index.html?_subtabs=associacao'); pg.wait_for_timeout(500)
    ok(pg.is_visible('#ctr-assoc') and not pg.is_visible('body > main'), 'só associação: abre direto nela')
    ctx.close()

    # membro com a aba Contratos: não vê a sub-aba de associação (por enquanto só o admin)
    ctx, ext = contexto(p, {'uid': 'teste', 'email': 'teste@exemplo.test', 'senha': 't'}, STORE4)
    pg = ctx.new_page(); pg.goto(BASE + '/tools/contratos/index.html'); pg.wait_for_timeout(1200)
    ok(not pg.is_visible('[data-sub="associacao"]') and not pg.is_visible('#ctr-subnav') and pg.is_visible('body > main'), 'não-admin não vê a sub-aba de associação'); ctx.close()
    # membro comum abrindo a página do admin
    ctx, ext = contexto(p, {'uid': 'teste', 'email': 'teste@exemplo.test', 'senha': 't'}, STORE4)
    pg = ctx.new_page(); pg.goto(BASE + '/tools/contratos/associacao.html'); pg.wait_for_timeout(600)
    ok('Só o administrador' in pg.inner_text('#bloqueio') and not pg.is_visible('#conteudo'), 'não-admin não usa a página de preparo'); ctx.close()

print('\nErros de script:', erros_js or 'nenhum')
print('RESULTADO:', 'TUDO OK' if not falhas and not erros_js else f'{len(falhas)} falha(s)')
srv.shutdown()
