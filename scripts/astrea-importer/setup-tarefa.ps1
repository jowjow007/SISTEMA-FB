# setup-tarefa.ps1
# Registra a importação do Astrea para rodar todo dia às 07:00
# Execute UMA vez como Administrador:
#   Right-click → Executar como Administrador
#
# Ou no terminal elevado:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\jowjo\portal-fb\scripts\astrea-importer\setup-tarefa.ps1"

$ErrorActionPreference = "Stop"

# ── Caminhos ──────────────────────────────────────────────────
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
# Tenta py -3.12, depois python3.12, depois python
$PythonExe = $null
try { $PythonExe = (& py -3.12 -c "import sys; print(sys.executable)" 2>$null) } catch {}
if (-not $PythonExe) { try { $PythonExe = (Get-Command python3.12 -ErrorAction Stop).Source } catch {} }
if (-not $PythonExe) { try { $PythonExe = (Get-Command python -ErrorAction Stop).Source } catch {} }
if (-not $PythonExe) { $PythonExe = "$env:LOCALAPPDATA\Python\pythoncore-3.12-64\python.exe" }
$ScriptPath = "$ScriptDir\importar.py"
$LogPath    = "$ScriptDir\log-diario.txt"
$TaskName   = "AstreaImportDiario"

Write-Host "Usando Python: $PythonExe"

# ── Ação: roda o script e grava log ───────────────────────────
$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "`"$ScriptPath`" >> `"$LogPath`" 2>&1" `
    -WorkingDirectory $ScriptDir

# ── Gatilho: todo dia às 07:00 ────────────────────────────────
$Trigger = New-ScheduledTaskTrigger -Daily -At "07:00AM"

# ── Configurações ─────────────────────────────────────────────
$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
    -MultipleInstances IgnoreNew

# ── Registra (ou atualiza se já existir) ──────────────────────
$Existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarefa anterior removida."
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Importa agenda do Astrea para o Portal Fonseca & Braga (astreaDiario)" `
    -RunLevel Highest | Out-Null

Write-Host ""
Write-Host "✅ Tarefa '$TaskName' criada com sucesso!"
Write-Host "   Vai rodar todo dia às 07:00."
Write-Host ""
Write-Host "Para testar agora: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Para ver o log:    notepad '$LogPath'"
Write-Host "Para remover:      Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
