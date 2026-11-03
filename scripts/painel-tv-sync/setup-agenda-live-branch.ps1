# setup-agenda-live-branch.ps1
# Cria, UMA vez, a branch "agenda-live" isolada (sem historico compartilhado com main)
# no repositorio do painel de TV, e um worktree local separado para ela em
# C:\Users\jowjo\painel-tv-agenda-live. E' nesse worktree que sincronizar_agenda.py
# escreve o agenda.csv e faz commit --amend + push --force a cada execucao.
#
# Por que uma branch/worktree separados: o repositorio PAINEL-FB e publico (exigencia
# do GitHub Pages no plano free) e nao deve acumular, para sempre, nomes de clientes e
# numeros de processo no historico. Isolar numa branch so com 1 commit (sempre
# reescrito) evita isso sem precisar mexer na branch main nem no checkout principal.
#
# Execute UMA vez:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\jowjo\portal-fb\scripts\painel-tv-sync\setup-agenda-live-branch.ps1"

$ErrorActionPreference = "Stop"

$PainelTvDir    = "C:\Users\jowjo\painel-tv"
$AgendaLiveDir  = "C:\Users\jowjo\painel-tv-agenda-live"
$Branch         = "agenda-live"
$AuthorArg      = '--author=jowjo <jowjow07@gmail.com>'

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
