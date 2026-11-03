# setup-tarefa.ps1
# Registra a sincronização da Agenda Astrea -> Painel de TV para rodar 2x/dia (08:00 e 16:00)
# Execute UMA vez como Administrador:
#   Right-click -> Executar como Administrador
#
# Ou no terminal elevado:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\jowjo\portal-fb\scripts\painel-tv-sync\setup-tarefa.ps1"

$ErrorActionPreference = "Stop"

# ── Caminhos ──────────────────────────────────────────────────
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
# Tenta py -3.12, depois python3.12, depois python
$PythonExe = $null
try { $PythonExe = (& py -3.12 -c "import sys; print(sys.executable)" 2>$null) } catch {}
if (-not $PythonExe) { try { $PythonExe = (Get-Command python3.12 -ErrorAction Stop).Source } catch {} }
if (-not $PythonExe) { try { $PythonExe = (Get-Command python -ErrorAction Stop).Source } catch {} }
if (-not $PythonExe) { $PythonExe = "$env:LOCALAPPDATA\Python\pythoncore-3.12-64\python.exe" }
$ScriptPath = "$ScriptDir\sincronizar_agenda.py"
$LogPath    = "$ScriptDir\log-diario.txt"
$TaskName   = "PainelTV_SincronizarAgendaAstrea"

Write-Host "Usando Python: $PythonExe"

# ── Ação: roda o script e grava log ───────────────────────────
$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "`"$ScriptPath`" >> `"$LogPath`" 2>&1" `
    -WorkingDirectory $ScriptDir

# ── Gatilhos: todo dia às 08:00 e às 16:00 ─────────────────────
$Trigger1 = New-ScheduledTaskTrigger -Daily -At "08:00AM"
$Trigger2 = New-ScheduledTaskTrigger -Daily -At "04:00PM"

# ── Configurações ─────────────────────────────────────────────
$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
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
    -Trigger @($Trigger1, $Trigger2) `
    -Settings $Settings `
    -Description "Sincroniza a Agenda Astrea do Portal (astreaDiario) para o agenda.csv do painel de TV" `
    -RunLevel Highest | Out-Null

Write-Host ""
Write-Host "✅ Tarefa '$TaskName' criada com sucesso!"
Write-Host "   Vai rodar todo dia às 08:00 e às 16:00."
Write-Host ""
Write-Host "Para testar agora: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Para ver o log:    notepad '$LogPath'"
Write-Host "Para remover:      Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
