# setup-watcher-startup.ps1
# Registra o watcher para iniciar automaticamente com o Windows (sem janela).
# Execute UMA vez como Administrador:
#   Right-click -> Executar como Administrador
# Ou:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\FB\portal-fb\scripts\astrea-importer\setup-watcher-startup.ps1"

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Localiza pythonw.exe do Python 3.12 (roda sem janela)
$PythonwExe = $null
try {
    $pyExe = (& py -3.12 -c "import sys; print(sys.executable)" 2>$null)
    if ($pyExe) {
        $cand = Join-Path (Split-Path $pyExe) "pythonw.exe"
        if (Test-Path $cand) { $PythonwExe = $cand }
    }
} catch {}
if (-not $PythonwExe) {
    try {
        $pyExe = (Get-Command python -ErrorAction Stop).Source
        $cand = Join-Path (Split-Path $pyExe) "pythonw.exe"
        if (Test-Path $cand) { $PythonwExe = $cand }
    } catch {}
}
if (-not $PythonwExe) {
    Write-Host "ERRO: pythonw.exe nao encontrado. Verifique o Python 3.12."
    exit 1
}

$WatcherPath = "$ScriptDir\watcher.py"
$TaskName    = "AstreaWatcher"

Write-Host "Python: $PythonwExe"
Write-Host "Script: $WatcherPath"

$Action = New-ScheduledTaskAction `
    -Execute $PythonwExe `
    -Argument "`"$WatcherPath`"" `
    -WorkingDirectory $ScriptDir

$Trigger = New-ScheduledTaskTrigger -AtLogOn

$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 23) `
    -MultipleInstances IgnoreNew `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -RestartCount 3

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
    -Description "Watcher do robo Astrea - aguarda comandos do portal" `
    -RunLevel Highest | Out-Null

Write-Host ""
Write-Host "OK: Tarefa $TaskName criada com sucesso!"
Write-Host "    Vai iniciar automaticamente a cada login."
Write-Host ""
Write-Host "Iniciando agora..."
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

$state = (Get-ScheduledTask -TaskName $TaskName).State
Write-Host "Estado: $state"
Write-Host ""
Write-Host "Log em: $ScriptDir\log-watcher.txt"
Write-Host "Parar:  Stop-ScheduledTask -TaskName $TaskName"
