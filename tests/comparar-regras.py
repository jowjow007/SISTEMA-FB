# -*- coding: utf-8 -*-
"""
Compara as regras publicadas hoje (copiadas do console) com as propostas e cruza com o que o código usa.

Uso:
  python tests/comparar-regras.py <regras-firestore-atuais.txt> [<regras-storage-atuais.txt>]

Mostra:
  - caminhos (match) que existem só nas atuais (o que a proposta deixaria de permitir) e só nas propostas;
  - para cada caminho comum, as linhas "allow" que mudaram;
  - coleções e pastas do Storage que o código do portal usa e que NÃO têm regra na proposta (quebrariam);
  - caminhos com regra nas atuais que o código não usa (resto de recurso antigo ou uso fora do portal: conferir).
"""
import io, os, re, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def blocos(texto):
    """Devolve {caminho_completo: [linhas allow normalizadas]} seguindo o aninhamento dos match."""
    texto = re.sub(r'//[^\n]*', '', texto)
    pilha, saida, i = [], {}, 0
    # o caminho vai até o espaço (inclui os {curingas}); o "{" do bloco vem depois
    tokens = re.finditer(r'match\s+(/\S+)\s*\{|\{|\}|allow\s+[^;]+;', texto)
    for t in tokens:
        g = t.group(0)
        if g.startswith('match'):
            pilha.append(t.group(1))
            saida.setdefault(''.join(p for p in pilha if p and not p.startswith('/databases') and not p.startswith('/b/')), [])
        elif g == '{':
            pilha.append(None)
        elif g == '}':
            if pilha: pilha.pop()
        else:
            caminho = ''.join(p for p in pilha if p and not p.startswith('/databases') and not p.startswith('/b/'))
            saida.setdefault(caminho, []).append(re.sub(r'\s+', ' ', g).strip())
    return {k: v for k, v in saida.items() if k}


def colecoes_no_codigo():
    usadas = set()
    for base, _, arqs in os.walk(RAIZ):
        if any(x in base for x in ('node_modules', os.sep + '.git', os.sep + 'tests', os.sep + 'output', os.sep + 'tmp', os.sep + 'privado')):
            continue
        for a in arqs:
            if not a.endswith(('.html', '.js', '.py', '.gs')): continue
            try: s = io.open(os.path.join(base, a), encoding='utf-8', errors='ignore').read()
            except Exception: continue
            usadas.update(re.findall(r"collection\(\s*['\"]([A-Za-z_]+)['\"]", s))
            usadas.update(re.findall(r"documents/([A-Za-z_]+)", s))
            usadas.update(re.findall(r"\.doc\(\s*['\"]([A-Za-z_]+)/", s))
    return usadas


def raiz_colecao(caminho):
    m = re.match(r'/([A-Za-z_]+)', caminho)
    return m.group(1) if m else caminho


def comparar(nome, atual_txt, proposta_txt, usadas=None):
    A, P = blocos(atual_txt), blocos(proposta_txt)
    print('=' * 70 + '\n' + nome + '\n' + '=' * 70)
    so_a = sorted(set(A) - set(P)); so_p = sorted(set(P) - set(A))
    print('\nCaminhos SÓ nas regras atuais (a proposta deixaria de permitir):')
    for c in so_a: print('  - %s   %s' % (c, ' | '.join(A[c])[:160]))
    if not so_a: print('  (nenhum)')
    print('\nCaminhos SÓ na proposta (novos):')
    for c in so_p: print('  + ' + c)
    if not so_p: print('  (nenhum)')
    print('\nCaminhos em ambas com permissões diferentes:')
    n = 0
    for c in sorted(set(A) & set(P)):
        if A[c] != P[c]:
            n += 1
            print('  * ' + c)
            for l in A[c]:
                if l not in P[c]: print('      atual   : ' + l[:170])
            for l in P[c]:
                if l not in A[c]: print('      proposta: ' + l[:170])
    if not n: print('  (nenhum)')
    if usadas is not None:
        # coleção coberta = aparece como trecho literal de algum caminho (inclui subcoleções), ou está
        # sob um pai com curinga recursivo {x=**} (ex.: chatPrefs/{uid}/{document=**} cobre etiquetas)
        def segmentos(regras):
            seg = set()
            for c in regras:
                seg.update(p for p in c.split('/') if p and not p.startswith('{'))
            return seg
        recursivos = {raiz_colecao(c) for c in P if '=**}' in c}
        cobertas_p = segmentos(P)
        cobertas_a = {raiz_colecao(c) for c in A}
        if 'chatPrefs' in recursivos: cobertas_p.add('etiquetas')
        print('\nColeções usadas pelo código SEM regra na proposta (quebrariam):')
        falta = sorted(u for u in usadas if u not in cobertas_p and '{' not in u)
        print('  ' + (', '.join(falta) if falta else '(nenhuma)'))
        print('\nColeções com regra nas atuais que o código do portal não usa (conferir: uso externo, robô ou resto antigo):')
        sobra = sorted(c for c in cobertas_a if c not in usadas and '{' not in c)
        print('  ' + (', '.join(sobra) if sobra else '(nenhuma)'))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    atual = io.open(sys.argv[1], encoding='utf-8-sig').read()
    comparar('FIRESTORE', atual, io.open(os.path.join(RAIZ, 'firestore.rules'), encoding='utf-8').read(), colecoes_no_codigo())
    if len(sys.argv) > 2:
        comparar('STORAGE', io.open(sys.argv[2], encoding='utf-8-sig').read(), io.open(os.path.join(RAIZ, 'storage.rules'), encoding='utf-8').read())
