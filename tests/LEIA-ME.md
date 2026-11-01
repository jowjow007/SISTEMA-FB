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

Para provar que os testes pegam as falhas, rode os mesmos casos contra uma versão antiga das regras. Eles **devem** reprovar:

```bash
git show 4d115d5:README-SETUP.md > /tmp/readme.md   # extraia o bloco rules_version... até o fim do bloco de código
REGRAS_ARQUIVO=/tmp/regras-antigas.rules npm run test:firestore
REGRAS_STORAGE=/tmp/storage-antigo.rules npm run test:storage
WORKER_ARQUIVO=/tmp/worker-antigo.mjs npm run test:worker
```

Se o Java estiver em português e o emulador travar com `MissingResourceException ... locale pt_BR`, defina `JAVA_TOOL_OPTIONS="-Duser.language=en -Duser.country=US"`.
