# Testes de segurança do portal

Testes de regressão criados na revisão de segurança de 01/11/2026 (referência: OWASP ASVS 4.0.3).
Eles rodam **só na máquina local**. Usam dados fictícios (`@exemplo.test`) e não acessam produção.

## 1. Regras do Firestore (`tests/firestore-rules/`)

Os testes conferem, no emulador do Firestore, quem lê e quem grava cada coleção. Cobrem:

- autocadastro;
- escalada de privilégio no próprio cadastro;
- contas pendentes, excluídas e com troca de senha;
- salário no organograma;
- robô do Astrea;
- presença;
- chat;
- holerites;
- pagamentos;
- senhas;
- remuneração;
- conferência de e-mails;
- patrimônio.

Pré-requisitos: Node 20+ e Java 11+.

```bash
cd tests/firestore-rules
npm install
npm test          # sobe o emulador, roda regras.test.js e derruba o emulador
```

Para comparar com outra versão das regras, por exemplo as publicadas hoje, copie as regras do console para um arquivo e rode:

```bash
REGRAS_ARQUIVO=/caminho/regras-publicadas.rules npm test
```

> Se o Java estiver em português e o emulador travar com `MissingResourceException ... locale pt_BR`, rode o emulador com `JAVA_TOOL_OPTIONS="-Duser.language=en -Duser.country=US"`.

## 2. Worker do Assistente IA (`tests/worker-assistente/`)

Os testes conferem que o Worker exige o token do Firebase de alguém da equipe ativa. Também conferem que a rota `/rss` só busca os feeds da lista. A rede é simulada.

```bash
node tests/worker-assistente/worker.test.mjs
```
