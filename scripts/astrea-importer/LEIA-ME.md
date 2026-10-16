# Importador Astrea → Portal

Importa tarefas, prazos, audiências e eventos em aberto do Astrea
e publica automaticamente na subaba **Astrea — Agenda** do Portal.

---

## Instalação (fazer UMA vez)

### 1. Python e dependências

```powershell
pip install -r requirements.txt
playwright install chromium
```

### 2. Credenciais do Astrea

Edite `credenciais.env` e preencha:

```
ASTREA_EMAIL=seuemail@astrea.com.br
ASTREA_SENHA=suasenha
```

### 3. Chave do Firebase (Service Account)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Projeto **sistema-fb-4cce5** → ⚙️ Configurações do projeto → **Contas de serviço**
3. Clique em **Gerar nova chave privada** → confirme → salve o JSON baixado
4. Renomeie o arquivo para `firebase-service-account.json`
5. Coloque-o nesta pasta (`scripts/astrea-importer/`)

> ⚠️ Nunca commite este arquivo. Ele já está no `.gitignore`.

---

## Teste manual

```powershell
cd C:\Users\jowjo\portal-fb\scripts\astrea-importer
python importar.py
```

O script vai:
1. Abrir o Chrome (visível para verificar)
2. Fazer login no Astrea
3. Navegar até a agenda
4. Baixar o relatório Excel/CSV
5. Enviar para Firestore → `astreaDiario/YYYY-MM-DD`

Se o Astrea mudar a interface e o bot travar na hora de exportar,
o script vai pedir para você exportar manualmente e apertar ENTER.

---

## Ajustar seletores (se necessário)

Se a navegação automática não funcionar, rode:

```powershell
playwright codegen app.astrea.com.br
```

Isso abre o Chrome com gravação ao vivo. Faça os cliques normalmente
e copie os seletores gerados para a função `exportar_agenda` em `importar.py`.

---

## Agendar para 07h todo dia

Execute **como Administrador**:

```powershell
powershell -ExecutionPolicy Bypass -File "setup-tarefa.ps1"
```

Para verificar:
```powershell
Get-ScheduledTask -TaskName "AstreaImportDiario"
```

Para rodar agora sem esperar as 07h:
```powershell
Start-ScheduledTask -TaskName "AstreaImportDiario"
```

Log diário: `log-diario.txt` nesta pasta.

---

## Desinstalar

```powershell
Unregister-ScheduledTask -TaskName "AstreaImportDiario" -Confirm:$false
```
