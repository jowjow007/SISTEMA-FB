# setup-agenda-live-branch.ps1
# Cria, UMA vez, a branch "agenda-live" isolada (sem historico compartilhado com main)
# no repositorio do painel de TV, e um worktree local separado para ela, por padrao em
# "painel-tv-agenda-live" ao lado do clone do painel de TV. E' nesse worktree que
# sincronizar_agenda.py escreve o agenda.csv e faz commit --amend + push --force a
# cada execucao.
#
# Por que uma branch/worktree separados: o repositorio PAINEL-FB e publico (exigencia
# do GitHub Pages no plano free) e nao deve acumular, para sempre, nomes de clientes e
# numeros de processo no historico. Isolar numa branch so com 1 commit (sempre
# reescrito) evita isso sem precisar mexer na branch main nem no checkout principal.
#
# Funciona em qualquer computador/usuario (nao depende de "C:\Users\jowjo"): por
# padrao procura o clone do painel de TV em "painel-tv" ao lado da pasta "portal-fb"
# (ex: C:\Users\FB\painel-tv no computador do escritorio). Para usar outro caminho,
# passe -PainelTvDir e/ou -AgendaLiveDir.
#
# Execute UMA vez:
#   powershell -ExecutionPolicy Bypass -File "setup-agenda-live-branch.ps1"

param(
    [string]$PainelTvDir   = (Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))) "painel-tv"),
    [string]$AgendaLiveDir = (Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))) "painel-tv-agenda-live")
)

$ErrorActionPreference = "Stop"

$Branch    = "agenda-live"
$AuthorArg = '--author=jowjo <jowjow07@gmail.com>'

Write-Host "Clone do painel de TV: $PainelTvDir"
Write-Host "Worktree agenda-live:  $AgendaLiveDir"

if (-not (Test-Path $PainelTvDir)) {
    throw "Nao encontrei o clone do painel de TV em $PainelTvDir."
}

if (Test-Path $AgendaLiveDir) {
    Write-Host "Pasta $AgendaLiveDir ja existe - nada a fazer. Remova-a manualmente antes se quiser recriar do zero."
    exit 0
}

Push-Location $PainelTvDir
try {
    # Verifica se a branch ja existe no remoto (git ls-remote sem match devolve $null,
    # nao "" - por isso o teste e feito com [bool], nunca comparando com "" diretamente)
    git fetch origin --quiet
    $remoteRef = git ls-remote --heads origin $Branch
    $existeRemoto = [bool]$remoteRef

    if ($existeRemoto) {
        Write-Host "Branch '$Branch' ja existe no remoto - criando worktree a partir dela..."
        git worktree add $AgendaLiveDir $Branch
        if ($LASTEXITCODE -ne 0) { throw "git worktree add falhou (codigo $LASTEXITCODE)." }
    } else {
        Write-Host "Branch '$Branch' nao existe ainda - criando worktree orfao (sem historico compartilhado)..."
        git worktree add --detach $AgendaLiveDir
        if ($LASTEXITCODE -ne 0) { throw "git worktree add --detach falhou (codigo $LASTEXITCODE)." }
        Push-Location $AgendaLiveDir
        try {
            git checkout --orphan $Branch
            if ($LASTEXITCODE -ne 0) { throw "git checkout --orphan falhou (codigo $LASTEXITCODE)." }
            git rm -rf --quiet . 2>$null
            $header = "Data,Hora,Tipo,Responsavel,Titulo,Titulo do processo/caso/atendimento,Numero do processo,Juizo,Observacao da atividade,Etiquetas,Envolvidos,Status,Prioridade,Data de criacao,Data de conclusao"
            [System.IO.File]::WriteAllText("$AgendaLiveDir\agenda.csv", $header, [System.Text.UTF8Encoding]::new($false))
            git add agenda.csv
            if ($LASTEXITCODE -ne 0) { throw "git add falhou (codigo $LASTEXITCODE)." }
            git commit -m "Agenda atual (inicial)" $AuthorArg | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "git commit falhou (codigo $LASTEXITCODE)." }
            git push -u origin $Branch
            if ($LASTEXITCODE -ne 0) { throw "git push falhou (codigo $LASTEXITCODE)." }
        } finally {
            Pop-Location
        }
    }
    Write-Host ""
    Write-Host "OK: worktree da branch '$Branch' pronto em $AgendaLiveDir."
} finally {
    Pop-Location
}
