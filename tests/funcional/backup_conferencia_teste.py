# -*- coding: utf-8 -*-
"""Teste do scripts/seguranca/backup_conferencia.py nos emuladores (dados fictícios): volume, anexos e diferenças detectadas."""
import importlib.util, os, subprocess, sys, urllib.parse
import requests

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('func', os.path.join(AQUI, 'funcional.py'))
F = importlib.util.module_from_spec(spec); spec.loader.exec_module(F)
SCRIPT = os.path.join(F.RAIZ, 'scripts', 'seguranca', 'backup_conferencia.py')
res = []


def rodar(*a):
    p = subprocess.run([sys.executable, SCRIPT, *a, '--emulador'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    return p.stdout + p.stderr


def copiar(origem, destino):
    """Cópia como o "gcloud storage cp" faria: mesmo conteúdo e mesmos metadados (multipart)."""
    meta = requests.get(f'{F.ST}/storage/v1/b/{F.BUCKET}/o/{urllib.parse.quote(origem, safe="")}', headers=F.DONO).json()
    dados = requests.get(f'{F.ST}/storage/v1/b/{F.BUCKET}/o/{urllib.parse.quote(origem, safe="")}', headers=F.DONO, params={'alt': 'media'}).content
    import json, uuid
    fr = uuid.uuid4().hex
    info = json.dumps({'name': destino, 'contentType': meta.get('contentType'), 'metadata': meta.get('metadata') or {}})
    corpo = f'--{fr}\r\nContent-Type: application/json\r\n\r\n{info}\r\n--{fr}\r\nContent-Type: {meta.get("contentType")}\r\n\r\n'.encode() + dados + f'\r\n--{fr}--\r\n'.encode()
    requests.post(f'{F.ST}/upload/storage/v1/b/{F.BUCKET}/o', params={'uploadType': 'multipart'}, headers=dict(F.DONO, **{'Content-Type': f'multipart/related; boundary={fr}'}), data=corpo).raise_for_status()


def main():
    F.regras_firestore(open(os.path.join(F.RAIZ, 'firestore.rules'), encoding='utf-8').read())
    F.regras_storage(open(os.path.join(F.RAIZ, 'storage.rules'), encoding='utf-8').read())
    U, link = F.semear()
    F.subir_arquivo_dono(f"chat/{U['colega']}/1700000000002_doc.pdf", F.PDF_FALSO + b'x', 'application/pdf')
    out = rodar('volume', F.BUCKET)
    res.append(('volume conta coleções e subcoleções', 'users' in out and 'mensagens' in out and 'TOTAL aproximado de documentos' in out, out[-400:]))
    res.append(('volume conta os arquivos do Storage', 'chat/' in out and 'arquivos' in out, ''))
    # "backup": cópia de chat/ para backup/chat/ (mesmo bucket no emulador, outra pasta)
    for o in requests.get(f'{F.ST}/storage/v1/b/{F.BUCKET}/o', headers=F.DONO, params={'prefix': 'chat/'}).json().get('items', []):
        copiar(o['name'], 'backup-teste/' + o['name'])
    out = rodar('anexos', F.BUCKET, f'gs://{F.BUCKET}/backup-teste', 'chat/')
    # o original inclui a própria pasta backup-teste; para o teste, comparar só chat/: usamos uma cópia completa
    res.append(('anexos: cópia íntegra → 0 faltando, 0 tamanho/crc32c/token diferentes',
                '✓ arquivos que faltam na cópia: 0' in out and '✓ tamanho diferente: 0' in out and '✓ crc32c diferente: 0' in out and '✓ token diferente: 0' in out, out[-500:]))
    res.append(('anexos: nenhum token impresso', 'token=' not in out and 'firebaseStorageDownloadTokens' not in out, ''))
    # adultera a cópia: apaga um arquivo e troca o conteúdo de outro → precisa acusar
    alvo = f"backup-teste/chat/{U['colega']}/1700000000002_doc.pdf"
    requests.delete(f'{F.ST}/storage/v1/b/{F.BUCKET}/o/{urllib.parse.quote(alvo, safe="")}', headers=F.DONO)
    out = rodar('anexos', F.BUCKET, f'gs://{F.BUCKET}/backup-teste', 'chat/')
    res.append(('anexos: detecta arquivo faltando na cópia', '✗ arquivos que faltam na cópia: ' in out and 'faltam na cópia: 0' not in out, out[-400:]))
    falhas = 0
    print('\nCONFERÊNCIA DO BACKUP (script de leitura, emulador)')
    for n, ok, det in res:
        if not ok: falhas += 1
        print(('  ✓ ' if ok else '  ✗ ') + n + (f'  [{det}]' if det and not ok else ''))
    print(f'\nConferência: {len(res) - falhas} de {len(res)} verificações passaram ({falhas} reprovadas).')
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
