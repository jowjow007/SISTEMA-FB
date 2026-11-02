# -*- coding: utf-8 -*-
"""
Conferências do backup de produção (somente LEITURA) — para rodar no Cloud Shell do projeto, com o seu login.
Não restaura, não publica, não revoga e não altera nada. Não imprime tokens nem chaves.

Subcomandos
  volume       BUCKET_STORAGE              quantos documentos por coleção e arquivos/bytes do Storage (base do custo)
  permissoes   BUCKET_STORAGE BUCKET_BACKUP permissões EFETIVAS da sua conta para exportar, restaurar e publicar regras
  bucket       BUCKET_BACKUP               o bucket de backup é privado? (prevenção de acesso público, acesso uniforme, IAM)
  exportacao   NOME_DA_OPERACAO            resultado DAQUELA exportação (estado, documentos, bytes, destino, arquivos gerados)
  anexos       BUCKET_STORAGE gs://BUCKET_BACKUP/PASTA [PREFIXO]   compara caminhos, quantidade, tamanho, checksums e metadados

Uso no Cloud Shell:   python3 backup_conferencia.py volume sistema-fb-4cce5.firebasestorage.app
Teste local (emuladores):  acrescente --emulador
"""
import hashlib, json, subprocess, sys, urllib.parse, urllib.request, urllib.error

PROJETO = 'sistema-fb-4cce5'
EMU = '--emulador' in sys.argv
ARGS = [a for a in sys.argv[1:] if a != '--emulador']
if EMU:
    PROJETO = 'demo-portal-func'
FS = 'http://127.0.0.1:8080/v1' if EMU else 'https://firestore.googleapis.com/v1'
GCS = 'http://127.0.0.1:9199/storage/v1' if EMU else 'https://storage.googleapis.com/storage/v1'
DB = f'projects/{PROJETO}/databases/(default)'
SUBCOLECOES = ['mensagens', 'partes', 'meses', 'etiquetas']   # subcoleções conhecidas do portal


def token():
    if EMU:
        return 'owner'
    return subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True, check=True).stdout.strip()


TOK = None


def req(metodo, url, corpo=None):
    global TOK
    TOK = TOK or token()
    dados = json.dumps(corpo).encode() if corpo is not None else None
    r = urllib.request.Request(url, data=dados, method=metodo, headers={'Authorization': 'Bearer ' + TOK, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return json.loads(resp.read() or b'{}')
    except urllib.error.HTTPError as e:
        return {'_erro': e.code, '_msg': e.read()[:300].decode('utf-8', 'replace')}


def contar(colecao, grupo=False):
    q = {'structuredAggregationQuery': {'structuredQuery': {'from': [{'collectionId': colecao, 'allDescendants': grupo}]},
                                        'aggregations': [{'alias': 'n', 'count': {}}]}}
    r = req('POST', f'{FS}/{DB}/documents:runAggregationQuery', q)
    try:
        return int(r[0]['result']['aggregateFields']['n']['integerValue'])
    except Exception:
        return None


def objetos(bucket, prefixo=''):
    itens, pagina = [], None
    while True:
        u = f'{GCS}/b/{bucket}/o?maxResults=1000' + (f'&prefix={urllib.parse.quote(prefixo)}' if prefixo else '') + (f'&pageToken={urllib.parse.quote(pagina)}' if pagina else '')
        r = req('GET', u)
        if '_erro' in r:
            sys.exit(f'Erro ao listar gs://{bucket}/{prefixo}: {r["_erro"]} {r["_msg"]}')
        itens += r.get('items', [])
        pagina = r.get('nextPageToken')
        if not pagina:
            return itens


def humano(n):
    for u in ('B', 'KB', 'MB', 'GB'):
        if n < 1024: return f'{n:.1f} {u}'
        n /= 1024
    return f'{n:.1f} TB'


def cmd_volume(bucket):
    raiz = req('POST', f'{FS}/{DB}/documents:listCollectionIds', {'pageSize': 300}).get('collectionIds', [])
    total = 0
    print('FIRESTORE — documentos por coleção (contagem por agregação; custa ~1 leitura por 1.000 documentos contados)')
    for c in sorted(raiz):
        n = contar(c); total += n or 0
        print(f'  {c:32} {n}')
    for c in SUBCOLECOES:
        n = contar(c, grupo=True); total += n or 0
        print(f'  (subcoleção) {c:19} {n}')
    print(f'  TOTAL aproximado de documentos: {total}')
    obs = objetos(bucket)
    tam = sum(int(o.get('size', 0)) for o in obs)
    pastas = {}
    for o in obs:
        p = o['name'].split('/')[0]; pastas.setdefault(p, [0, 0]); pastas[p][0] += 1; pastas[p][1] += int(o.get('size', 0))
    print(f'\nSTORAGE gs://{bucket} — {len(obs)} arquivos, {humano(tam)}')
    for p, (n, b) in sorted(pastas.items()):
        print(f'  {p + "/":32} {n} arquivos, {humano(b)}')
    print('\nBASE DO CUSTO (conferir os preços da sua região na página de preços do Google Cloud):')
    print(f'  exportação do Firestore  = {total} leituras de documento')
    print(f'  cópia dos anexos (mesma região) = {len(obs)} operações de classe A, sem tráfego de saída')
    print(f'  armazenamento das cópias ≈ {humano(tam)} (anexos) + tamanho da exportação (ver subcomando exportacao)')
    print(f'  download opcional para o PC ≈ {humano(tam)} de tráfego de saída para a internet')


def cmd_permissoes(bucket_st, bucket_bk):
    proj = ['datastore.databases.export', 'datastore.databases.import', 'datastore.databases.get', 'datastore.entities.get',
            'datastore.entities.update', 'datastore.operations.get', 'firebaserules.releases.update', 'firebaserules.rulesets.create',
            'storage.buckets.create', 'resourcemanager.projects.getIamPolicy']
    r = req('POST', f'https://cloudresourcemanager.googleapis.com/v1/projects/{PROJETO}:testIamPermissions', {'permissions': proj})
    tem = set(r.get('permissions', []))
    print('PROJETO — permissões efetivas da sua conta (teste sem executar nada)')
    for p in proj:
        print(f"  {'✓' if p in tem else '✗'} {p}")
    for b, nec in ((bucket_st, ['storage.objects.list', 'storage.objects.get', 'storage.objects.create']),
                   (bucket_bk, ['storage.objects.list', 'storage.objects.get', 'storage.objects.create', 'storage.buckets.getIamPolicy'])):
        q = '&'.join('permissions=' + p for p in nec)
        r = req('GET', f'{GCS}/b/{b}/iam/testPermissions?{q}')
        tem = set(r.get('permissions', []))
        print(f'BUCKET gs://{b}')
        for p in nec:
            print(f"  {'✓' if p in tem else '✗'} {p}")
    print('\nPara RESTAURAR seriam necessárias: datastore.databases.import (Firestore), storage.objects.get no backup e '
          'storage.objects.create no bucket do Storage. Para publicar regras: firebaserules.*. Ter ✓ não executa nada.')


def cmd_bucket(bucket):
    b = req('GET', f'{GCS}/b/{bucket}')
    if '_erro' in b:
        sys.exit(f'Erro: {b["_erro"]} {b["_msg"]}')
    iam = b.get('iamConfiguration', {})
    pap = iam.get('publicAccessPrevention', '?')
    ubla = (iam.get('uniformBucketLevelAccess') or {}).get('enabled')
    print(f'gs://{bucket}: local {b.get("location")} ({b.get("locationType")}), classe {b.get("storageClass")}')
    print(f"  {'✓' if pap == 'enforced' else '✗'} prevenção de acesso público: {pap}")
    print(f"  {'✓' if ubla else '✗'} acesso uniforme no nível do bucket: {ubla}")
    pol = req('GET', f'{GCS}/b/{bucket}/iam')
    publico = False
    print('  quem tem acesso (IAM do bucket):')
    for bd in pol.get('bindings', []):
        membros = bd.get('members', [])
        if any(m in ('allUsers', 'allAuthenticatedUsers') for m in membros): publico = True
        print(f'    {bd.get("role")}: {", ".join(membros)}')
    print(f"  {'✓' if not publico else '✗'} nenhum acesso público (allUsers/allAuthenticatedUsers)")
    print('  Obs.: "projectViewer:" dá LEITURA a quem tem papel Leitor no projeto; se houver Leitores que não devem ver backups, remova essa linha.')


def cmd_exportacao(nome):
    r = req('GET', f'{FS}/{nome}' if nome.startswith('projects/') else f'{FS}/{DB}/operations/{nome}')
    if '_erro' in r:
        sys.exit(f'Erro: {r["_erro"]} {r["_msg"]}')
    m = r.get('metadata', {})
    print(f'Operação: {r.get("name")}')
    print(f'  concluída (done): {r.get("done")}   estado: {m.get("operationState")}   erro: {r.get("error")}')
    print(f'  início: {m.get("startTime")}   fim: {m.get("endTime")}')
    print(f'  documentos: {(m.get("progressDocuments") or {}).get("completedWork")} de {(m.get("progressDocuments") or {}).get("estimatedWork")}')
    print(f'  bytes: {(m.get("progressBytes") or {}).get("completedWork")} de {(m.get("progressBytes") or {}).get("estimatedWork")}')
    destino = m.get('outputUriPrefix', '')
    print(f'  destino: {destino}')
    if destino.startswith('gs://'):
        b, _, p = destino[5:].partition('/')
        obs = objetos(b, p.rstrip('/') + '/')
        meta = [o for o in obs if o['name'].endswith('.overall_export_metadata')]
        print(f'  arquivos gerados: {len(obs)} ({humano(sum(int(o.get("size", 0)) for o in obs))});  overall_export_metadata: {"✓" if meta else "✗"}')


def resumo_obj(o):
    md = o.get('metadata') or {}
    tok = md.get('firebaseStorageDownloadTokens', '')
    return {'size': int(o.get('size', 0)), 'md5': o.get('md5Hash'), 'crc32c': o.get('crc32c'), 'tipo': o.get('contentType'),
            'token_hash': hashlib.sha256(tok.encode()).hexdigest()[:12] if tok else None, 'meta_chaves': sorted(md.keys())}


def cmd_anexos(bucket_st, destino, prefixo_original=''):
    b2, _, p2 = destino.replace('gs://', '').partition('/')
    p2 = p2.rstrip('/') + '/' if p2 else ''
    orig = {o['name']: resumo_obj(o) for o in objetos(bucket_st, prefixo_original)}
    copia = {o['name'][len(p2):]: resumo_obj(o) for o in objetos(b2, p2)}
    so_orig = sorted(set(orig) - set(copia)); so_copia = sorted(set(copia) - set(orig))
    comuns = sorted(set(orig) & set(copia))
    dif = {'tamanho': [], 'md5': [], 'crc32c': [], 'tipo': [], 'token': [], 'metadados': []}
    for n in comuns:
        a, c = orig[n], copia[n]
        if a['size'] != c['size']: dif['tamanho'].append(n)
        if a['md5'] != c['md5']: dif['md5'].append(n)
        if a['crc32c'] != c['crc32c']: dif['crc32c'].append(n)
        if a['tipo'] != c['tipo']: dif['tipo'].append(n)
        if a['token_hash'] != c['token_hash']: dif['token'].append(n)
        if a['meta_chaves'] != c['meta_chaves']: dif['metadados'].append(n)
    to, tc = sum(v['size'] for v in orig.values()), sum(v['size'] for v in copia.values())
    print(f'ORIGINAL gs://{bucket_st}: {len(orig)} arquivos, {humano(to)}')
    print(f'CÓPIA    {destino}: {len(copia)} arquivos, {humano(tc)}')
    print(f"  {'✓' if not so_orig else '✗'} arquivos que faltam na cópia: {len(so_orig)}")
    print(f"  {'✓' if not so_copia else '✗'} arquivos a mais na cópia: {len(so_copia)}")
    for k, v in dif.items():
        print(f"  {'✓' if not v else '✗'} {k} diferente: {len(v)}")
    sem_md5 = sum(1 for v in orig.values() if not v['md5'])
    if sem_md5:
        print(f'  (obs.: {sem_md5} arquivos sem MD5 — objetos compostos; a comparação usa o CRC32C)')
    for k, v in list(dif.items()) + [('faltando', so_orig), ('a mais', so_copia)]:
        for n in v[:5]:
            print(f'    exemplo [{k}]: {n}')
    print('  (tokens comparados por hash; nenhum valor de token foi impresso)')


if __name__ == '__main__':
    if not ARGS or ARGS[0] not in ('volume', 'permissoes', 'bucket', 'exportacao', 'anexos'):
        print(__doc__); sys.exit(1)
    globals()['cmd_' + ARGS[0]](*ARGS[1:])
