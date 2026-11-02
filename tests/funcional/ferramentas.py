# -*- coding: utf-8 -*-
"""
Varredura de todas as ferramentas do portal no navegador (revisão de segurança, 01/11/2026).

Para cada perfil (admin, membro, cliente) abre cada página de tools/ e registra:
  - erros de JavaScript da página;
  - avisos de permissão do Firestore/Storage ("permission-denied", "insufficient permissions").
Roda duas vezes: com as regras de PRODUÇÃO (REGRAS_ANTIGAS) e com as novas, e compara. Um aviso que só aparece com as
regras novas, para um perfil que usa a ferramenta, indica função legítima que parou; os que aparecem nas duas são antigos.
Também testa os anexos antigos do Chat depois de trocar o token (o efeito de "revogar" o link).

Uso (de dentro de tests/):
  firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/ferramentas.py"
"""
import importlib.util, io, json, os, re, sys, time, urllib.parse
import requests
from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('func', os.path.join(AQUI, 'funcional.py'))
F = importlib.util.module_from_spec(spec); spec.loader.exec_module(F)

PAGINAS = sorted(
    [f'tools/{t}/index.html' for t in os.listdir(os.path.join(F.RAIZ, 'tools')) if os.path.isfile(os.path.join(F.RAIZ, 'tools', t, 'index.html'))]
    + ['tools/documentos/historico.html', 'tools/peticoes/historico.html'])
PERFIS = ['admin', 'membro', 'cliente']
ERRO_PERM = re.compile(r'permission|insufficient|PERMISSION_DENIED|unauthorized', re.I)


def preparar(regras_fs, regras_st):
    F.regras_firestore(regras_fs); F.regras_storage(regras_st)
    U, link = F.semear()
    for k in ('admin', 'membro', 'colega', 'vetudo', 'cliente', 'deslig'):
        d = F.ler('users/' + U[k]); d['acesso'] = 'ativo'; F.gravar('users/' + U[k], d)
    return U, link


def varrer(p, rotulo):
    achados = {}   # (perfil, pagina) -> [mensagens]
    for perfil in PERFIS:
        b = p.chromium.launch(headless=True, args=F.ARGS_NAVEGADOR)
        ctx = F.novo_contexto(b)
        pg = F.entrar(ctx, perfil + '@exemplo.test')
        F.esperar(pg, "document.getElementById('app-screen').style.display === 'flex'", 25000)
        pg.wait_for_timeout(2500)
        pg.close()
        for pag in PAGINAS:
            msgs = []
            t = ctx.new_page()
            t.on('console', lambda m, msgs=msgs: msgs.append(m.text[:200]) if (m.type in ('error', 'warning') and ERRO_PERM.search(m.text)) else None)
            t.on('pageerror', lambda e, msgs=msgs: msgs.append('ERRO JS: ' + str(e)[:200]))
            t.on('dialog', F.aceitar)
            try:
                t.goto(F.BASE + '/' + pag, timeout=30000)
                t.wait_for_timeout(5000)
            except Exception as e:
                msgs.append('não abriu: ' + str(e)[:120])
            t.close()
            achados[(perfil, pag)] = msgs
        b.close()
    return achados


def main():
    prod_fs = io.open(os.environ['REGRAS_ANTIGAS'], encoding='utf-8').read()
    prod_st = io.open(os.environ['STORAGE_ANTIGO'], encoding='utf-8').read()
    novas_fs = io.open(os.path.join(F.RAIZ, 'firestore.rules'), encoding='utf-8').read()
    novas_st = io.open(os.path.join(F.RAIZ, 'storage.rules'), encoding='utf-8').read()
    site = F.subir_site()
    with sync_playwright() as p:
        preparar(prod_fs, prod_st); antes = varrer(p, 'produção')
        U, link = preparar(novas_fs, novas_st); depois = varrer(p, 'novas')

        # ---- anexos antigos do Chat: link com token antigo, e efeito de trocar o token ("revogar")
        caminho = f"chat/{U['membro']}/1700000000000_doc.pdf"
        rev = {}
        rev['link antigo abre (participante usando o link gravado na mensagem)'] = requests.get(link).status_code == 200
        r = requests.patch(f"{F.ST}/v0/b/{F.BUCKET}/o/{urllib.parse.quote(caminho, safe='')}", headers=F.DONO,
                           json={'metadata': {'firebaseStorageDownloadTokens': 'token-novo-ficticio'}})
        rev['emulador aceitou trocar o token (simula "Revogar" do console)'] = r.status_code == 200
        rev['depois da troca, o link antigo deixa de abrir'] = requests.get(link).status_code in (401, 403, 404)
        b = p.chromium.launch(headless=True, args=F.ARGS_NAVEGADOR); ctx = F.novo_contexto(b)
        pg = F.entrar(ctx, 'membro@exemplo.test'); F.esperar(pg, "document.getElementById('app-screen').style.display === 'flex'", 25000); pg.close()
        ch = ctx.new_page(); ch.goto(F.BASE + '/tools/chat/index.html'); ch.wait_for_timeout(4000)
        rev['o autor ainda gera um link novo pelo SDK (formato antigo: só o autor)'] = F.sdk(ch, f"return await firebase.storage().ref('{caminho}').getDownloadURL()").startswith('ok')
        b.close()
        b = p.chromium.launch(headless=True, args=F.ARGS_NAVEGADOR); ctx = F.novo_contexto(b)
        pg = F.entrar(ctx, 'colega@exemplo.test'); F.esperar(pg, "document.getElementById('app-screen').style.display === 'flex'", 25000); pg.close()
        ch = ctx.new_page(); ch.goto(F.BASE + '/tools/chat/index.html'); ch.wait_for_timeout(4000)
        rev['outro participante NÃO gera link novo para o anexo antigo (perde o acesso após revogar)'] = F.sdk(ch, f"await firebase.storage().ref('{caminho}').getDownloadURL()").startswith('erro:storage/')
        b.close()
    site.shutdown()

    print('\nVARREDURA DAS FERRAMENTAS (avisos de permissão e erros de JavaScript)')
    print('página'.ljust(44) + ''.join(p_.ljust(30) for p_ in PERFIS))
    novos_total = 0
    for pag in PAGINAS:
        linha = pag.replace('tools/', '').ljust(44)
        for perfil in PERFIS:
            a, d = antes[(perfil, pag)], depois[(perfil, pag)]
            so_novas = [m for m in d if not any(m[:60] == x[:60] for x in a)]
            novos_total += len(so_novas)
            linha += (('ok' if not d else f'{len(d)} aviso(s)') + (f' / {len(so_novas)} só nas novas' if so_novas else '') + (f' (prod: {len(a)})' if a else '')).ljust(30)
        print(linha)
    print('\nDETALHE dos avisos que aparecem SÓ com as regras novas:')
    for pag in PAGINAS:
        for perfil in PERFIS:
            a, d = antes[(perfil, pag)], depois[(perfil, pag)]
            for m in d:
                if not any(m[:60] == x[:60] for x in a):
                    print(f'  [{perfil}] {pag}: {m}')
    print('\nDETALHE dos avisos que já existiam em produção (e continuam):')
    for pag in PAGINAS:
        for perfil in PERFIS:
            for m in depois[(perfil, pag)]:
                if any(m[:60] == x[:60] for x in antes[(perfil, pag)]):
                    print(f'  [{perfil}] {pag}: {m}')
    print('\nANEXOS ANTIGOS DO CHAT:')
    for k, v in rev.items(): print(('  ✓ ' if v else '  ✗ ') + k)
    json.dump({'antes': {f'{k[0]}|{k[1]}': v for k, v in antes.items()}, 'depois': {f'{k[0]}|{k[1]}': v for k, v in depois.items()}, 'anexos': rev},
              io.open(os.path.join(os.environ.get('SAIDA_TESTE', AQUI), 'varredura-ferramentas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'\nPáginas: {len(PAGINAS)} × perfis: {len(PERFIS)} × 2 conjuntos de regras = {len(PAGINAS) * len(PERFIS) * 2} aberturas. Avisos só nas regras novas: {novos_total}')


if __name__ == '__main__':
    main()
