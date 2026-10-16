# setup-watcher-startup.ps1
# Registra o watcher para iniciar automaticamente com o Windows (sem janela visível).
# Execute UMA vez como Administrador:
#   Right-click → Executar como Administrador
#
# Ou no terminal elevado:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\FB\portal-fb\scripts\astrea-importer\setup-watcher-startup.ps1"

$ErrorActionPreference = "Stop"

# ── Caminhos ──────────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Localiza pythonw.exe (roda sem janela) a partir do Python 3.12
$PythonwExe = $null
try {
    $pyExe = (& py -3.12 -c "import sys; print(sys.executable)" 2>$null)
    if ($pyExe) {
        $candidate = Join-Path (Split-Path $pyExe) "pythonw.exe"
        if (Test-Path $candidate) { $PythonwExe = $candidate }
    }
} catch {}
if (-not $PythonwExe) {
    try {
        $pyExe = (Get-Command python -ErrorAction Stop).Source
        $candidate = Join-Path (Split-Path $pyExe) "pythonw.exe"
        if (Test-Path $candidate) { $PythonwExe = $candidate }
    } catch {}
}
if (-not $PythonwExe) {
    Write-Host "❌ pythonw.exe não encontrado. Verifique se o Python 3.12 está instalado." -ForegroundColor Red
    exit 1
}

$WatcherPath = "$ScriptDir\watcher.py"
$LogPath     = "$ScriptDir\log-watcher.txt"
$TaskName    = "AstreaWatcher"

Write-Host "Usando: $PythonwExe"
Write-Host "Script: $WatcherPath"

# ── Ação ──────────────────────────────────────────────────────
# pythonw.exe não suporta redirecionamento via linha de argumento;
# usamos um wrapper .vbs para capturar o log silenciosamente.
$VbsPath = "$ScriptDir\inicia-watcher.vbs"
$VbsContent = @"
Set oShell = CreateObject("WScript.Shell")
oShell.Run """$PythonwExe"" ""$WatcherPath"" >> ""$LogPath"" 2>&1", 0, False
"@
Set-Content -Path $VbsPath -Value $VbsContent -Encoding UTF8

# ── Gatilho: ao fazer logon ────────────────────────────────────
$Action  = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsPath`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn

$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 23) `
    -MultipleInstances IgnoreNew `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -RestartCount 3

# ── Registra (ou atualiza) ────────────────────────────────────
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
    -Description "Watcher do robô Astrea — aguarda comandos do portal (sem janela)" `
    -RunLevel Highest | Out-Null

Write-Host ""
Write-Host "✅ Tarefa '$TaskName' criada com sucesso!" -ForegroundColor Green
Write-Host "   Vai iniciar automaticamente a cada login."
Write-Host ""

# ── Inicia agora ──────────────────────────────────────────────
Write-Host "Iniciando watcher agora..." -ForegroundColor Cyan
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

$state = (Get-ScheduledTask -TaskName $TaskName).State
Write-Host "Estado da tarefa: $state"
Write-Host ""
Write-Host "Para ver o log:   notepad $LogPath"
Write-Host "Para parar:       Stop-ScheduledTask  -TaskName $TaskName"
Write-Host "Para remover:     Unregister-ScheduledTask -TaskName $TaskName -Confirm:false"
