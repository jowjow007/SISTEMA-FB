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

## Instalação (fazer UMA vez)

### 1. Python e dependências

```powershell
pip install -r requirements.txt
```

### 2. Criar o robô de leitura no Firebase

As regras do Firestore só deixam ler `astreaDiario` com uma conta da equipe ou
um robô cadastrado — por segurança, não reaproveite seu login pessoal nem o do
robô do Astrea (aquele só devia gravar, não ler para fora).

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) →
   projeto **sistema-fb-4cce5** → **Authentication** → **Add user**.
2. Crie um usuário só para isso (ex: `painel-tv@fonsecaebraga.com.br` / uma senha forte).
3. Copie o **UID** gerado.
4. No Firestore do mesmo projeto, crie o documento `robos/{UID}` (qualquer
   campo serve, ex: `{ "descricao": "Sincronização Agenda -> Painel de TV" }`) —
   é esse documento que a regra `isRobo()` verifica, não o e-mail.

### 3. Credenciais

Edite `credenciais.env` e preencha `FIREBASE_ROBO_EMAIL` / `FIREBASE_ROBO_SENHA`
com a conta criada no passo 2.

### 4. Criar a branch/worktree isolada `agenda-live` (uma vez)

```powershell
cd C:\Users\jowjo\portal-fb\scripts\painel-tv-sync
powershell -ExecutionPolicy Bypass -File "setup-agenda-live-branch.ps1"
```

Isso cria a pasta `C:\Users\jowjo\painel-tv-agenda-live` (um segundo checkout,
separado do seu `C:\Users\jowjo\painel-tv` normal) já na branch `agenda-live`.

---

## Teste manual

```powershell
cd C:\Users\jowjo\portal-fb\scripts\painel-tv-sync
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

Log: `log-diario.txt` nesta pasta.

## Desinstalar

```powershell
Unregister-ScheduledTask -TaskName "PainelTV_SincronizarAgendaAstrea" -Confirm:$false
```
