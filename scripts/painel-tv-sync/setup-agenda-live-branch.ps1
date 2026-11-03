# setup-agenda-live-branch.ps1
# Cria, UMA vez, a branch "agenda-live" isolada (sem histórico compartilhado com main)
# no repositório do painel de TV, e um worktree local separado para ela em
# C:\Users\jowjo\painel-tv-agenda-live. É nesse worktree que sincronizar_agenda.py
# escreve o agenda.csv e faz commit --amend + push --force a cada execução.
#
# Por quê uma branch/worktree separados: o repositório PAINEL-FB é público (exigência
# do GitHub Pages no plano free) e não deve acumular, para sempre, nomes de clientes e
# números de processo no histórico. Isolar numa branch só com 1 commit (sempre
# reescrito) evita isso sem precisar mexer na branch main nem no checkout principal.
#
# Execute UMA vez:
#   powershell -ExecutionPolicy Bypass -File "C:\Users\jowjo\portal-fb\scripts\painel-tv-sync\setup-agenda-live-branch.ps1"

$ErrorActionPreference = "Stop"

$PainelTvDir    = "C:\Users\jowjo\painel-tv"
$AgendaLiveDir  = "C:\Users\jowjo\painel-tv-agenda-live"
$Branch         = "agenda-live"

if (-not (Test-Path $PainelTvDir)) {
    throw "Não encontrei o clone do painel de TV em $PainelTvDir."
}

if (Test-Path $AgendaLiveDir) {
    Write-Host "Pasta $AgendaLiveDir já existe — nada a fazer. Remova-a manualmente antes se quiser recriar do zero."
    exit 0
}

Push-Location $PainelTvDir
try {
    # Verifica se a branch já existe no remoto
    git fetch origin --quiet
    $existeRemoto = (git ls-remote --heads origin $Branch) -ne ""

    if ($existeRemoto) {
        Write-Host "Branch '$Branch' já existe no remoto — criando worktree a partir dela..."
        git worktree add $AgendaLiveDir $Branch
    } else {
        Write-Host "Branch '$Branch' não existe ainda — criando worktree órfão (sem histórico compartilhado)..."
        git worktree add --detach $AgendaLiveDir
        Push-Location $AgendaLiveDir
        try {
            git checkout --orphan $Branch
            git rm -rf --quiet . 2>$null
            "Data,Hora,Tipo,Responsável,Título,Título do processo/caso/atendimento,Número do processo,Juízo,Observação da atividade,Etiquetas,Envolvidos,Status,Prioridade,Data de criação,Data de conclusão" |
                Out-File -FilePath "agenda.csv" -Encoding utf8 -NoNewline
            git add agenda.csv
            git commit -m "Agenda atual (inicial)" --author="jowjo <jowjow07@gmail.com>" | Out-Null
            git push -u origin $Branch
        } finally {
            Pop-Location
        }
    }
    Write-Host ""
    Write-Host "✅ Worktree da branch '$Branch' pronto em $AgendaLiveDir."
} finally {
    Pop-Location
}
