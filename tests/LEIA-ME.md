# Testes de segurança do portal

Testes de regressão da revisão de segurança de 01/11/2026 (referência: OWASP ASVS 4.0.3). Rodam **só na máquina local**, nos emuladores do Firebase, com dados fictícios (`@exemplo.test`). Nada vai para produção.

Pré-requisitos: Node 20+ e Java 11+.

```bash
cd tests
npm install
npm test                 # Firestore + Storage + Worker
npm run test:firestore   # só as regras do Firestore (tests/firestore-rules)
npm run test:storage     # regras do Storage, com o emulador do Firestore junto (as regras consultam o cadastro)
npm run test:worker      # Worker do Assistente IA, com rede simulada
```

## Testes funcionais com login (`tests/funcional/`)

O portal de verdade (`index.html` e as ferramentas) roda num navegador de teste (Playwright/Chromium) contra os emuladores de Auth, Firestore e Storage. São usados 9 personagens fictícios: admin, membro, colega, cliente, desligado, cadastro antigo sem abas, novo autocadastro, robô e quem vê todo o patrimônio.

Passo a passo coberto:
1. migração com as regras **antigas**;
2. troca para as regras novas;
3. envio dos dados privados;
4. membro: holerites, patrimônio, Números, Agenda, Condomínios, Chat com anexo novo e antigo, tentativa de XSS e Assistente;
5. cliente;
6. desligado com a sessão aberta enquanto o admin o exclui;
7. autocadastro e aprovação;
8. o `importar.py` real do robô, com os endereços trocados para o emulador.

As páginas são apontadas para um projeto `demo-`. O navegador resolve os domínios de produção para uma porta fechada, e o teste **reprova** se houver qualquer pedido a eles.

```bash
cd tests
REGRAS_ANTIGAS=/caminho/regras-de-antes.rules npm run test:funcional   # requer Python 3 + playwright (pip install playwright && playwright install chromium)
```

## Sessões de Julgamento (`tests/funcional/julgamentos.py`)

Escritório monta sessão e recurso e envia provas; conselheira do condomínio lê, abre as provas (auditoria), anota e marca "analisei"; síndico de outro condomínio não vê nada (nem pelo SDK nem pelo Storage); decisão e ementa; prazo das provas vencido; aprovação de um cadastro como conselheiro; importação de pacote.

```bash
cd tests
firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/julgamentos.py"
# FOTOS=<pasta> guarda as telas com os dados fictícios
```

## Migração dos anexos antigos do Chat e DJEN

```bash
cd tests
firebase emulators:exec --only auth,firestore,storage --project demo-portal-func "python funcional/migracao_anexos.py"
python djen/testar-djen.py      # script real do DJEN numa cópia descartável, com uma API do CNJ falsa
python djen/testar-diagnostico-astrea.py  # diagnóstico supervisionado do robô (robô e Firestore falsos)
python djen/testar-delta-astrea.py        # delta da agenda: artefato NaN x null, repetições e a análise só de leitura
python djen/testar-watcher-supervisionado.py  # watcher.py real em um ciclo supervisionado, sem importar (Firestore falso)
```

## Comparar com as regras publicadas hoje

Copie as regras do console para dois arquivos `.txt` e rode:

```bash
python tests/comparar-regras.py regras-firestore-atuais.txt regras-storage-atuais.txt
```

O script lista:
- os caminhos que só existem nas regras atuais, que a proposta deixaria de permitir;
- as permissões alteradas;
- as coleções que o código usa e que ficariam sem regra.

Para provar que os testes pegam as falhas, rode os mesmos casos contra uma versão antiga das regras. Eles **devem** reprovar:

```bash
git show 4d115d5:README-SETUP.md > /tmp/readme.md   # extraia o bloco rules_version... até o fim do bloco de código
REGRAS_ARQUIVO=/tmp/regras-antigas.rules npm run test:firestore
REGRAS_STORAGE=/tmp/storage-antigo.rules npm run test:storage
WORKER_ARQUIVO=/tmp/worker-antigo.mjs npm run test:worker
```

Se o Java estiver em português e o emulador travar com `MissingResourceException ... locale pt_BR`, defina `JAVA_TOOL_OPTIONS="-Duser.language=en -Duser.country=US"`.

## Contrato de associação (`tests/contrato-associacao/`)

Preparo pelo admin, prévia, assinatura da sociedade, tela obrigatória no login, diretor interveniente, chave "exigir", texto adulterado, documento final e sub-aba em Contratos. Usa um Firebase **falso em memória** (`fake-firebase.js`): nenhum pedido sai para a internet, só fontes e o html2pdf. Precisa do arquivo `privado/contrato-associacao-modelo.txt`.

```bash
python tests/contrato-associacao/teste.py   # fotos em tests/contrato-associacao/fotos/
```
