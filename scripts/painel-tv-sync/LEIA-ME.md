# Sincronizar Agenda Astrea → Painel de TV

Pega o mesmo snapshot que a sub-aba **Agenda — Astrea** de Números do Escritório
usa (coleção `astreaDiario` no Firestore, alimentada pelo robô do Astrea) e
regrava `agenda.csv` no repositório do painel de TV (`C:\Users\jowjo\painel-tv`),
com commit + push automático.

Substitui o passo manual antigo descrito em
`painel-tv/ROTINA-ATUALIZACAO-AGENDA.md` (exportar .xlsx do Astrea e importar
por cima da planilha do Google Sheets).

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
