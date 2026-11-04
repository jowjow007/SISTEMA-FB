# Sincronizar Agenda Astrea → Painel de TV

Pega o mesmo snapshot que a sub-aba **Agenda — Astrea** de Números do Escritório
usa (coleção `astreaDiario` no Firestore, alimentada pelo robô do Astrea) e
publica `agenda.csv` para o painel de TV ler, com commit + push automático.

Substitui o passo manual antigo descrito em
`painel-tv/ROTINA-ATUALIZACAO-AGENDA.md` (exportar .xlsx do Astrea e importar
por cima da planilha do Google Sheets).

## Por que uma branch separada (`agenda-live`), e não o `agenda.csv` normal do repositório

O repositório `PAINEL-FB` é **público** (o GitHub Pages do plano free exige
isso). Dados reais de clientes/processos não devem se acumular para sempre no
histórico de commits público — por isso o `.gitignore` do painel de TV
explicitamente bloqueia `*.csv`.

A solução: uma branch isolada, `agenda-live`, que **nunca tem mais de 1
commit** — cada sincronização reescreve esse commit (`git commit --amend`) e
faz `push --force` só nela, nunca em `main`. O painel de TV lê o arquivo direto
de `raw.githubusercontent.com` nessa branch (não depende de qual branch o
GitHub Pages publica). O dado de *hoje* continua visível para quem tiver o
link — igual já era com a planilha do Google Sheets publicada na web — mas não
fica acumulado como histórico pesquisável.

---

Funciona em qualquer computador que já tenha (ou vá ter) um clone de
`portal-fb` — não depende de ser o notebook do jowjo nem o computador do
escritório especificamente. Os caminhos são detectados automaticamente a
partir de onde este script está.

## Instalação (fazer UMA vez por computador)

### 0. Clonar o painel de TV, se ainda não existir nesta máquina

O robô do Astrea já roda em `portal-fb` neste computador — falta só clonar o
`painel-tv` do GitHub ao lado dele (mesma pasta "pai"):

```powershell
cd ..\..\..
git clone https://github.com/jowjow007/PAINEL-FB.git painel-tv
```

(Se já existir, pule este passo.)

### 1. Python e dependências

```powershell
pip install -r requirements.txt
```

### 2. Criar o robô de leitura no Firebase (só na primeira vez, em qualquer computador)

As regras do Firestore só deixam ler `astreaDiario` com uma conta da equipe ou
um robô cadastrado — por segurança, não reaproveite seu login pessoal nem o do
robô do Astrea (aquele só devia gravar, não ler para fora). **Se esse robô já
foi criado em outro computador, não crie de novo — reaproveite as mesmas
credenciais** (mesmo usuário Firebase funciona de qualquer máquina).

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) →
   projeto **sistema-fb-4cce5** → **Authentication** → **Add user**.
2. Crie um usuário só para isso (ex: `painel-tv@fonsecaebraga.com.br` / uma senha forte).
3. Copie o **UID** gerado.
4. No Firestore do mesmo projeto, crie o documento `robos/{UID}` (qualquer
   campo serve, ex: `{ "descricao": "Sincronização Agenda -> Painel de TV" }`) —
   é esse documento que a regra `isRobo()` verifica, não o e-mail.

### 3. Credenciais

Edite `credenciais.env` e preencha `FIREBASE_ROBO_EMAIL` / `FIREBASE_ROBO_SENHA`
com a conta do passo 2 (copie de outro computador se já existir, em vez de
redigitar a senha).

### 4. Criar a branch/worktree isolada `agenda-live` (uma vez por computador)

```powershell
cd <pasta deste script>
powershell -ExecutionPolicy Bypass -File "setup-agenda-live-branch.ps1"
```

Isso cria a pasta `painel-tv-agenda-live` ao lado do clone normal do painel de
TV (um segundo checkout, separado) já na branch `agenda-live`. Como a branch
já existe no GitHub (criada da primeira vez), aqui ele só faz um checkout nela
— não recria do zero.

---

## Teste manual

```powershell
cd <pasta deste script>
python sincronizar_agenda.py
```

Se não houver mudança desde a última sincronização, o script avisa e não
commita nada (idempotente, mesmo padrão do script de publicações do DJEN).

---

## Agendar para rodar 2x/dia (08h e 16h)

Execute **como Administrador**:

```powershell
powershell -ExecutionPolicy Bypass -File "setup-tarefa.ps1"
```

Para rodar agora sem esperar o horário:
```powershell
Start-ScheduledTask -TaskName "PainelTV_SincronizarAgendaAstrea"
```

Log: `logs/sincronizar-AAAA-MM-DD.txt` nesta pasta (um arquivo por dia).

## Desinstalar

```powershell
Unregister-ScheduledTask -TaskName "PainelTV_SincronizarAgendaAstrea" -Confirm:$false
```
