# -*- coding: utf-8 -*-
"""
Teste da migração dos anexos antigos do Chat (scripts/seguranca/migrar-anexos-chat.py) nos emuladores, com dados fictícios.
Uso (de dentro de tests/):
  firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/migracao_anexos.py"
"""
import importlib.util, io, json, os, subprocess, sys, tempfile, urllib.parse
import requests

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('func', os.path.join(AQUI, 'funcional.py'))
F = importlib.util.module_from_spec(spec); spec.loader.exec_module(F)
SCRIPT = os.path.join(F.RAIZ, 'scripts', 'seguranca', 'migrar-anexos-chat.py')
res = []


def caso(nome, cond, det=''):
    res.append((nome, bool(cond), det))


def rodar(*args):
    pasta = tempfile.mkdtemp()
    p = subprocess.run([sys.executable, SCRIPT, '--emulador', *args], capture_output=True, text=True, cwd=pasta, encoding='utf-8')
    linhas = [l for l in p.stdout.splitlines() if l.startswith('{')]
    csvs = [os.path.join(pasta, f) for f in os.listdir(pasta) if f.endswith('.csv')]
    return (json.loads(linhas[0]) if linhas else {'erro': p.stderr[-300:]}), (csvs[0] if csvs else None)


def existe(caminho):
    return requests.get(f'{F.ST}/storage/v1/b/{F.BUCKET}/o/{urllib.parse.quote(caminho, safe="")}', headers=F.DONO).status_code == 200


def token_de(email):
    r = requests.post(f'{F.AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',
                      json={'email': email, 'password': F.SENHA, 'returnSecureToken': True})
    return r.json()['idToken']


def le_como(email, caminho):
    """Leitura pelo SDK (passa pelas regras do Storage), como um participante faria para gerar um link novo."""
    r = requests.get(f'{F.ST}/v0/b/{F.BUCKET}/o/{urllib.parse.quote(caminho, safe="")}', headers={'Authorization': 'Firebase ' + token_de(email)})
    return r.status_code


def main():
    F.regras_firestore(io.open(os.path.join(F.RAIZ, 'firestore.rules'), encoding='utf-8').read())
    F.regras_storage(io.open(os.path.join(F.RAIZ, 'storage.rules'), encoding='utf-8').read())
    U, link_doc = F.semear()
    for k in ('admin', 'membro', 'colega', 'vetudo', 'cliente', 'deslig'):
        d = F.ler('users/' + U[k]); d['acesso'] = 'ativo'; F.gravar('users/' + U[k], d)
    # anexo do membro encaminhado para outra conversa (convB: colega + vetudo) e uma foto antiga da colega na convA
    F.gravar('conversas/convB/mensagens/m-encaminhada', {'autorUid': U['colega'], 'tipo': 'documento', 'documentoUrl': link_doc, 'documentoNome': 'anexo-antigo.pdf',
                                                         'encaminhada': True, 'texto': '', 'criadoEm': {'__ts__': '2026-10-02T12:00:00Z'}})
    link_foto = F.subir_arquivo_dono(f"chat/{U['colega']}/1700000000001_foto.jpg", F.JPG_FALSO, 'image/jpeg')
    F.gravar('conversas/convA/mensagens/m-foto-antiga', {'autorUid': U['colega'], 'tipo': 'foto', 'fotoUrl': link_foto, 'texto': '', 'criadoEm': {'__ts__': '2026-10-03T12:00:00Z'}})
    origem_doc = f"chat/{U['membro']}/1700000000000_doc.pdf"
    destinos = [f"chat/convA/{U['membro']}/1700000000000_doc.pdf", f"chat/convB/{U['membro']}/1700000000000_doc.pdf", f"chat/convA/{U['colega']}/1700000000001_foto.jpg"]

    # antes: o formato antigo só o autor lê pelo SDK (as regras novas já publicadas)
    caso('antes: participante que não é o autor NÃO gera link para o anexo antigo pelo SDK', le_como('colega@exemplo.test', origem_doc) == 403)

    r, csv_sim = rodar()
    caso('simulação encontra os 3 anexos antigos (1 documento em 2 conversas + 1 foto) e ignora o base64', r.get('com_anexo_antigo') == 3, json.dumps(r))
    caso('simulação não copia nada', r.get('copiados') == 0 and not any(existe(d) for d in destinos))
    caso('simulação não altera mensagens', F.ler('conversas/convA/mensagens/m-antiga').get('documentoUrl') == link_doc)

    r, csv_exec = rodar('--executar')
    print('DIAG situações:', [l.split(';')[-1].strip()[:160] for l in io.open(csv_exec, encoding='utf-8-sig').read().splitlines()[1:]])
    caso('execução copia os 3 anexos', r.get('copiados') == 3 and r.get('erros') == 0, json.dumps(r))
    caso('os arquivos novos existem na pasta de cada conversa', all(existe(d) for d in destinos))
    caso('os arquivos antigos continuam onde estavam (nada apagado)', existe(origem_doc))
    novo_a = F.ler('conversas/convA/mensagens/m-antiga').get('documentoUrl', '')
    novo_b = F.ler('conversas/convB/mensagens/m-encaminhada').get('documentoUrl', '')
    novo_f = F.ler('conversas/convA/mensagens/m-foto-antiga').get('fotoUrl', '')
    caso('mensagens apontam para a pasta da conversa certa', 'chat%2FconvA%2F' in novo_a and 'chat%2FconvB%2F' in novo_b and 'chat%2FconvA%2F' in novo_f)
    caso('mensagens guardam a origem (anexoMigradoDe)', F.ler('conversas/convA/mensagens/m-antiga').get('anexoMigradoDe') == origem_doc)
    caso('links novos abrem', all(requests.get(u).status_code == 200 for u in (novo_a, novo_b, novo_f)))
    caso('o link antigo continua abrindo (nenhum token revogado nesta etapa)', requests.get(link_doc).status_code == 200)
    caso('conteúdo copiado é idêntico', requests.get(novo_a).content == requests.get(link_doc).content)
    # depois: participantes autorizados conseguem pelo SDK (inclusive gerar link novo após uma futura revogação)
    caso('depois: participante da conversa A (não autor) lê o anexo migrado pelo SDK', le_como('colega@exemplo.test', destinos[0]) == 200)
    caso('depois: participante da conversa B lê a cópia encaminhada', le_como('vetudo@exemplo.test', destinos[1]) == 200)
    caso('depois: quem não participa da conversa A não lê', le_como('vetudo@exemplo.test', destinos[0]) == 403)
    caso('depois: quem não participa da conversa B não lê', le_como('membro@exemplo.test', destinos[1]) == 403)
    caso('depois: desligado (sem cadastro) não lê', le_como('deslig@exemplo.test', destinos[0]) == 403 if F.ler(f"users/{U['deslig']}") is None else True)

    r2, _ = rodar('--executar')
    caso('rodar de novo não duplica (idempotente)', r2.get('copiados') == 0 and r2.get('com_anexo_antigo') == 0, json.dumps(r2))

    rd = subprocess.run([sys.executable, SCRIPT, '--emulador', '--desfazer', csv_exec], capture_output=True, text=True, encoding='utf-8')
    caso('desfazer volta os links antigos nas mensagens', F.ler('conversas/convA/mensagens/m-antiga').get('documentoUrl') == link_doc
         and F.ler('conversas/convB/mensagens/m-encaminhada').get('documentoUrl') == link_doc, rd.stdout[-200:])

    falhas = 0
    print('\nMIGRAÇÃO DOS ANEXOS ANTIGOS DO CHAT')
    for n, ok, det in res:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (f'  [{det}]' if det and not ok else ''))
    print(f'\nMigração: {len(res) - falhas} de {len(res)} verificações passaram ({falhas} reprovadas).')
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
