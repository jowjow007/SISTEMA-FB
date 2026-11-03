# setup-tarefa.ps1
# Registra a sincronizacao da Agenda Astrea -> Painel de TV para rodar 2x/dia (08:00 e 16:00)
# Execute UMA vez como Administrador:
#   Right-click -> Executar como Administrador
#
# Ou no terminal elevado:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\jowjo\portal-fb\scripts\painel-tv-sync\setup-tarefa.ps1"

$ErrorActionPreference = "Stop"

# -- Caminhos ----------------------------------------------------
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path

# Encontra uma instalacao REAL do Python, nunca o "alias" do WindowsApps
# (C:\...\WindowsApps\python.exe): esse alias funciona quando digitado num terminal
# interativo, mas falha silenciosamente (sai com codigo 0, sem executar nada) quando
# chamado pelo Agendador de Tarefas sem sessao interativa - ja aconteceu aqui.
function Find-PythonReal {
    $candidato = "$env:LOCALAPPDATA\Python\bin\python.exe"
    if (Test-Path $candidato) { return $candidato }
    try {
        $viaPy = & py -3 -c "import sys; print(sys.executable)" 2>$null
        if ($viaPy -and $viaPy -notlike "*WindowsApps*") { return $viaPy }
    } catch {}
    $outros = Get-Command python -All -ErrorAction SilentlyContinue | Where-Object { $_.Source -notlike "*WindowsApps*" }
    if ($outros) { return $outros[0].Source }
    return $null
}
$PythonExe = Find-PythonReal
if (-not $PythonExe) {
    throw "Nao encontrei uma instalacao real do Python (fora do WindowsApps). Instale o Python ou edite PythonExe manualmente neste script."
}
$ScriptPath = "$ScriptDir\sincronizar_agenda.py"
$LogDir     = "$ScriptDir\logs"
$TaskName   = "PainelTV_SincronizarAgendaAstrea"

Write-Host "Usando Python: $PythonExe"

# -- Acao: roda o script (o proprio script grava o log em logs\, o Agendador de
#    Tarefas chama o python.exe sem shell, entao ">>"/"2>&1" aqui nao funcionariam) ---
$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $ScriptDir

# -- Gatilhos: todo dia as 08:00 e as 16:00 -----------------------
$Trigger1 = New-ScheduledTaskTrigger -Daily -At "08:00AM"
$Trigger2 = New-ScheduledTaskTrigger -Daily -At "04:00PM"

# -- Configuracoes --------------------------------------------------
$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -MultipleInstances IgnoreNew

# -- Registra (ou atualiza se ja existir) --------------------------
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
Write-Host "OK: Tarefa '$TaskName' criada com sucesso!"
Write-Host "   Vai rodar todo dia as 08:00 e as 16:00."
Write-Host ""
Write-Host "Para testar agora: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Para ver o log:    notepad '$LogDir\sincronizar-$(Get-Date -Format yyyy-MM-dd).txt'"
Write-Host "Para remover:      Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
