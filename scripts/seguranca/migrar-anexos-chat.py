# -*- coding: utf-8 -*-
"""
Migração dos anexos ANTIGOS do Chat para a pasta da conversa (revisão de segurança, 01/11/2026).

Por quê: os anexos antigos ficam em  chat/{uid}/{arquivo}  e as mensagens guardam um link com token. As regras novas do
Storage só deixam o AUTOR ler esse formato pelo SDK. Se o token for revogado, os outros participantes perdem o anexo.
Esta migração copia cada anexo antigo para  chat/{conversaId}/{uid}/{arquivo}  (onde as regras liberam os
PARTICIPANTES daquela conversa), gera um link novo e atualiza a mensagem. Depois disso, revogar os tokens antigos não
tira o acesso de quem tem direito.

O que NÃO faz: não apaga arquivo nenhum e não revoga link nenhum (isso é uma etapa separada, depois de conferir).

Uso
  Simulação (padrão, não grava nada):   python migrar-anexos-chat.py --emulador
                                        python migrar-anexos-chat.py --producao
  Executar:                             ... --executar          (grava migracao-anexos-AAAAMMDD-HHMM.csv)
  Desfazer (volta o link nas mensagens): ... --desfazer migracao-anexos-....csv

Produção: precisa de um token de acesso de quem é dono do projeto, que FICA SÓ NO SEU COMPUTADOR:
  set GOOGLE_ACCESS_TOKEN=<saída de: gcloud auth print-access-token>
  (o token vale ~1 hora; nunca o envie para ninguém)
"""
import argparse, csv, datetime, json, os, sys, urllib.parse, uuid
import requests

PROJETO_PRODUCAO = 'sistema-fb-4cce5'
BUCKET_PRODUCAO = 'sistema-fb-4cce5.firebasestorage.app'


class Ambiente:
    def __init__(self, emulador, projeto, bucket):
        self.emulador = emulador
        self.projeto, self.bucket = projeto, bucket
        if emulador:
            self.fs = f'http://127.0.0.1:8080/v1/projects/{projeto}/databases/(default)/documents'
            self.gcs = 'http://127.0.0.1:9199'
            self.v0 = 'http://127.0.0.1:9199/v0'
            self.cab = {'Authorization': 'Bearer owner'}
        else:
            token = os.environ.get('GOOGLE_ACCESS_TOKEN', '').strip()
            if not token:
                sys.exit('Defina GOOGLE_ACCESS_TOKEN (gcloud auth print-access-token) para usar --producao.')
            self.fs = f'https://firestore.googleapis.com/v1/projects/{projeto}/databases/(default)/documents'
            self.gcs = 'https://storage.googleapis.com'
            self.v0 = 'https://firebasestorage.googleapis.com/v0'
            self.cab = {'Authorization': 'Bearer ' + token}

    # ---------- Firestore (REST)
    def listar(self, caminho):
        docs, pagina = [], None
        while True:
            params = {'pageSize': 300}
            if pagina: params['pageToken'] = pagina
            r = requests.get(f'{self.fs}/{caminho}', headers=self.cab, params=params, timeout=60)
            if r.status_code == 404: return docs
            r.raise_for_status()
            j = r.json()
            docs += j.get('documents', [])
            pagina = j.get('nextPageToken')
            if not pagina: return docs

    def atualizar_campos(self, nome_doc, campos):
        mascara = '&'.join('updateMask.fieldPaths=' + urllib.parse.quote(k) for k in campos)
        corpo = {'fields': {k: ({'stringValue': v} if isinstance(v, str) else {'nullValue': None}) for k, v in campos.items()}}
        url = (self.fs.split('/v1/')[0] + '/v1/' + nome_doc) if not nome_doc.startswith('http') else nome_doc
        r = requests.patch(url + '?' + mascara, headers=self.cab, json=corpo, timeout=60)
        r.raise_for_status()

    # ---------- Storage (API JSON do Cloud Storage — a mesma que o Admin SDK usa; o emulador também atende)
    def existe(self, caminho):
        r = requests.get(f'{self.gcs}/storage/v1/b/{self.bucket}/o/{urllib.parse.quote(caminho, safe="")}', headers=self.cab, timeout=60)
        return r.status_code == 200

    def metadados(self, caminho):
        r = requests.get(f'{self.gcs}/storage/v1/b/{self.bucket}/o/{urllib.parse.quote(caminho, safe="")}', headers=self.cab, timeout=60)
        r.raise_for_status()
        return r.json()

    def copiar(self, origem, destino):
        meta = self.metadados(origem)
        r = requests.get(f'{self.gcs}/storage/v1/b/{self.bucket}/o/{urllib.parse.quote(origem, safe="")}', headers=self.cab, params={'alt': 'media'}, timeout=300)
        r.raise_for_status()
        tipo = meta.get('contentType') or 'application/octet-stream'
        token = str(uuid.uuid4())
        # um único envio "multipart" com o arquivo e os metadados (inclusive o token do link novo)
        fronteira = 'migracao-' + uuid.uuid4().hex
        info = json.dumps({'name': destino, 'contentType': tipo, 'metadata': {'firebaseStorageDownloadTokens': token, 'migradoDe': origem}})
        corpo = (f'--{fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{info}\r\n'
                 f'--{fronteira}\r\nContent-Type: {tipo}\r\n\r\n').encode('utf-8') + r.content + f'\r\n--{fronteira}--\r\n'.encode('utf-8')
        up = requests.post(f'{self.gcs}/upload/storage/v1/b/{self.bucket}/o', params={'uploadType': 'multipart'},
                           headers=dict(self.cab, **{'Content-Type': f'multipart/related; boundary={fronteira}'}), data=corpo, timeout=300)
        up.raise_for_status()
        return self.link(destino, token)

    def link_existente(self, caminho):
        tok = (self.metadados(caminho).get('metadata') or {}).get('firebaseStorageDownloadTokens', '').split(',')[0]
        return self.link(caminho, tok) if tok else None

    def link(self, caminho, token):
        return f'{self.v0}/b/{self.bucket}/o/{urllib.parse.quote(caminho, safe="")}?alt=media&token={token}'


def caminho_do_link(url):
    """Extrai o caminho do objeto de um link de download do Firebase Storage."""
    try:
        p = urllib.parse.urlparse(url)
        i = p.path.index('/o/')
        return urllib.parse.unquote(p.path[i + 3:])
    except (ValueError, AttributeError):
        return None


def antigo(caminho):
    partes = (caminho or '').split('/')
    return len(partes) == 3 and partes[0] == 'chat'      # chat/{uid}/{arquivo}


def valor(campo):
    return (campo or {}).get('stringValue')


def migrar(amb, executar):
    agora = datetime.datetime.now().strftime('%Y%m%d-%H%M')
    log = []
    resumo = {'conversas': 0, 'mensagens': 0, 'com_anexo_antigo': 0, 'copiados': 0, 'ja_migrados': 0, 'arquivo_sumido': 0, 'erros': 0}
    for conv in amb.listar('conversas'):
        resumo['conversas'] += 1
        conv_id = conv['name'].split('/')[-1]
        for msg in amb.listar(f'conversas/{conv_id}/mensagens'):
            resumo['mensagens'] += 1
            f = msg.get('fields', {})
            for campo in ('documentoUrl', 'fotoUrl'):
                url = valor(f.get(campo))
                origem = caminho_do_link(url) if url else None
                if not antigo(origem):
                    continue
                resumo['com_anexo_antigo'] += 1
                _, uid, arquivo = origem.split('/')
                destino = f'chat/{conv_id}/{uid}/{arquivo}'
                linha = {'mensagem': msg['name'], 'campo': campo, 'origem': origem, 'destino': destino, 'link_antigo': url, 'link_novo': '', 'situacao': ''}
                try:
                    if not amb.existe(origem):
                        linha['situacao'] = 'arquivo antigo não existe mais (nada a fazer)'; resumo['arquivo_sumido'] += 1
                    elif amb.existe(destino):
                        linha['link_novo'] = amb.link_existente(destino) or ''
                        linha['situacao'] = 'já copiado antes'
                        resumo['ja_migrados'] += 1
                        if executar and linha['link_novo']:
                            amb.atualizar_campos(msg['name'], {campo: linha['link_novo'], 'anexoMigradoDe': origem})
                    elif executar:
                        linha['link_novo'] = amb.copiar(origem, destino)
                        amb.atualizar_campos(msg['name'], {campo: linha['link_novo'], 'anexoMigradoDe': origem})
                        linha['situacao'] = 'copiado e mensagem atualizada'; resumo['copiados'] += 1
                    else:
                        linha['situacao'] = 'SIMULAÇÃO: seria copiado'
                except Exception as e:
                    linha['situacao'] = 'ERRO: ' + str(e)[:200]; resumo['erros'] += 1
                log.append(linha)
    arq = f'migracao-anexos-{agora}{"" if executar else "-simulacao"}.csv'
    with open(arq, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=list(log[0].keys()) if log else ['mensagem'], delimiter=';')
        w.writeheader(); [w.writerow(l) for l in log]
    print(json.dumps(resumo, ensure_ascii=False))
    print('Registro: ' + os.path.abspath(arq) + '  (contém links com token: guarde só no seu computador)')
    return resumo, arq


def desfazer(amb, arq):
    n = 0
    with open(arq, encoding='utf-8-sig') as fh:
        for l in csv.DictReader(fh, delimiter=';'):
            if l.get('link_antigo') and l.get('situacao', '').startswith(('copiado', 'já copiado')):
                amb.atualizar_campos(l['mensagem'], {l['campo']: l['link_antigo'], 'anexoMigradoDe': None})
                n += 1
    print(json.dumps({'mensagens_restauradas': n}, ensure_ascii=False))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--emulador', action='store_true'); g.add_argument('--producao', action='store_true')
    ap.add_argument('--projeto'); ap.add_argument('--bucket')
    ap.add_argument('--executar', action='store_true', help='grava (sem isso, só simula)')
    ap.add_argument('--desfazer', metavar='CSV', help='volta os links antigos nas mensagens listadas no registro')
    a = ap.parse_args()
    amb = Ambiente(a.emulador, a.projeto or ('demo-portal-func' if a.emulador else PROJETO_PRODUCAO), a.bucket or ('demo-portal-func.appspot.com' if a.emulador else BUCKET_PRODUCAO))
    if a.desfazer:
        desfazer(amb, a.desfazer)
    else:
        migrar(amb, a.executar)
