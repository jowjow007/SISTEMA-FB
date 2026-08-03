<#
.SINOPSE
    Atualizacao diaria automatica da secao "Publicacoes Processuais" (DJEN) do painel
    Numeros do Escritorio (tools/numeros-escritorio/index.html) do Portal Fonseca e Braga.

    Busca as publicacoes no DJEN (API publica Comunica PJe/CNJ) para a OAB 163443/MG,
    do periodo fixo 2026-01-01 ate a data de execucao, recalcula os numeros (com a
    deduplicacao de republicacao + mesmo processo/mesmo dia acertada com o usuario em
    02/08/2026), regrava os valores dentro do index.html e publica (git commit + push)
    para o repositorio do Portal, que redeploya sozinho via GitHub Pages.

    Pensado para rodar 1x/dia via agendamento. Idempotente: se os numeros nao mudaram
    desde a ultima execucao, o commit e pulado (nao gera commits vazios).

.LIMITACOES
    - So cobre o que a API Comunica PJe/CNJ devolve para esta OAB (nao cobre STF/STJ push
      nem DJE estadual residual fora do DJEN).
    - A secao "Publicacoes por area do direito" (PUB_AREAS) cruza com export do Astrea e
      NAO e atualizada por este script (permanece manual, conforme rodape da pagina).
    - Se a estrutura HTML dos blocos-alvo for alterada manualmente (rotulos dos KPIs,
      nomes das classes CSS), as regras de substituicao abaixo podem parar de casar -
      o script avisa e NAO grava nada nesse caso, para nunca corromper a pagina ao vivo
      silenciosamente.
#>

$ErrorActionPreference = "Stop"

$NumeroOab      = "163443"
$UfOab          = "MG"
$DataInicio     = "2026-01-01"
$RepoDir        = "C:\Users\jowjo\portal-fb"
$IndexPath      = Join-Path $RepoDir "tools\numeros-escritorio\index.html"
$ItensPorPagina = 1000

$hoje = Get-Date
$DataFim = $hoje.ToString("yyyy-MM-dd")

Write-Host "=== Atualizacao Publicacoes DJEN - OAB $NumeroOab/$UfOab - $DataInicio a $DataFim ==="

# ---------- 1) Busca paginada na API Comunica PJe/CNJ ----------
$allItems = New-Object System.Collections.Generic.List[Object]
$pagina = 1
$totalCount = $null
do {
    $url = "https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=$NumeroOab&ufOab=$UfOab&dataDisponibilizacaoInicio=$DataInicio&dataDisponibilizacaoFim=$DataFim&itensPorPagina=$ItensPorPagina&pagina=$pagina"
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Get -Headers @{ Accept = "application/json" } -TimeoutSec 60
    } catch {
        Write-Warning ("Falha na pagina " + $pagina + " : " + $_.Exception.Message + ". Tentando novamente em 3s...")
        Start-Sleep -Seconds 3
        $resp = Invoke-RestMethod -Uri $url -Method Get -Headers @{ Accept = "application/json" } -TimeoutSec 60
    }
    if ($null -eq $totalCount) { $totalCount = $resp.count }
    if ($resp.items) { foreach ($it in $resp.items) { $allItems.Add($it) } }
    Write-Host ("  Pagina " + $pagina + " : " + $resp.items.Count + " itens (acumulado: " + $allItems.Count + " / esperado: " + $totalCount + ")")
    $pagina++
    if (-not $resp.items -or $resp.items.Count -eq 0) { break }
} while ($allItems.Count -lt $totalCount -and $pagina -le 100)

$allItems = $allItems | Sort-Object -Property id -Unique

if ($totalCount -and $allItems.Count -lt $totalCount) {
    Write-Warning ("Coletado " + $allItems.Count + " de " + $totalCount + " reportado pela API. Abortando para nao publicar numero incompleto.")
    exit 1
}

# ---------- 2) Deduplicacao (mesma regra usada em 02/08/2026) ----------
$dedupConteudo = $allItems | Group-Object { $_.numero_processo + "|" + $_.data_disponibilizacao + "|" + $_.texto } | ForEach-Object { $_.Group[0] }
$grupos = $dedupConteudo | Group-Object { $_.numero_processo + "|" + $_.data_disponibilizacao }

$totalPub = $grupos.Count

# ---------- 3) Serie diaria completa (com zeros nos dias sem publicacao) ----------
$contagemPorDia = @{}
foreach ($g in $grupos) {
    $dia = $g.Group[0].data_disponibilizacao
    if (-not $contagemPorDia.ContainsKey($dia)) { $contagemPorDia[$dia] = 0 }
    $contagemPorDia[$dia]++
}

$inicioDt = [datetime]::ParseExact($DataInicio, 'yyyy-MM-dd', $null)
$fimDt    = [datetime]::ParseExact($DataFim, 'yyyy-MM-dd', $null)
$diasCorridos = [int]($fimDt - $inicioDt).TotalDays + 1

$dailyPairs = New-Object System.Collections.Generic.List[string]
$diasComPub = 0
for ($d = $inicioDt; $d -le $fimDt; $d = $d.AddDays(1)) {
    $k = $d.ToString("yyyy-MM-dd")
    $v = 0
    if ($contagemPorDia.ContainsKey($k)) { $v = $contagemPorDia[$k] }
    if ($v -gt 0) { $diasComPub++ }
    $dailyPairs.Add('["' + $k + '",' + $v + ']')
}
$dailyJs = "[" + ($dailyPairs -join ",") + "]"

$diasUteis = 0
for ($d = $inicioDt; $d -le $fimDt; $d = $d.AddDays(1)) {
    if ($d.DayOfWeek -ne 'Saturday' -and $d.DayOfWeek -ne 'Sunday') { $diasUteis++ }
}

$mesesDecimal       = $diasCorridos / 30.44
$mediaMensal        = [math]::Round($totalPub / $mesesDecimal, 1)
$mediaDiaUtil        = [math]::Round($totalPub / $diasUteis, 2)
$mediaDiaCorrido    = [math]::Round($totalPub / $diasCorridos, 2)
$pctDiasComPub      = [math]::Round(($diasComPub / $diasCorridos) * 100, 0)

# ---------- 4) Serie mensal ----------
# "Março" construido por codigo de caractere (nao literal acentuado) para nao depender
# de como o interpretador do .ps1 decodifica o arquivo-fonte (Windows PowerShell 5.1
# le .ps1 sem BOM como ANSI do sistema, corrompendo acentos UTF-8 - ja aconteceu 1x).
$marco = "Mar" + [char]0x00E7 + "o"
$mesesPt = @{1="Janeiro";2="Fevereiro";3=$marco;4="Abril";5="Maio";6="Junho";7="Julho";8="Agosto";9="Setembro";10="Outubro";11="Novembro";12="Dezembro"}
$porMes = $grupos | ForEach-Object { $_.Group[0] } | Group-Object { ([datetime]$_.data_disponibilizacao).ToString("yyyy-MM") } | Sort-Object Name
$monthsJsItems = foreach ($m in $porMes) {
    $mm = [int]($m.Name.Split('-')[1])
    '  { nome:"' + $mesesPt[$mm] + '", total:' + $m.Count + ' }'
}
$monthsJs = "[`n" + ($monthsJsItems -join ",`n") + "`n]"

$mesIniNome = $mesesPt[$inicioDt.Month]
$mesFimNome = $mesesPt[$fimDt.Month]
$tituloTrend = ""
if ($inicioDt.Month -eq $fimDt.Month) {
    $tituloTrend = $mesIniNome + " de " + $fimDt.Year
} else {
    $tituloTrend = $mesIniNome.ToLower() + " a " + $mesFimNome.ToLower() + " de " + $fimDt.Year
}

$dataFimBr = $fimDt.ToString("dd/MM/yyyy")
$dataIniBr = $inicioDt.ToString("dd/MM/yyyy")

$culturaBr = [System.Globalization.CultureInfo]::GetCultureInfo('pt-BR')
$culturaJs = [System.Globalization.CultureInfo]::InvariantCulture
$totalPubTxt        = $totalPub.ToString('N0', $culturaBr)
$mediaMensalTxt     = $mediaMensal.ToString("0.0", $culturaBr)
$mediaDiaUtilTxt    = $mediaDiaUtil.ToString("0.##", $culturaBr)
$mediaDiaCorridoTxt = $mediaDiaCorrido.ToString("0.##", $culturaBr)
# Versao com PONTO decimal (nao virgula) para uso dentro de literais JavaScript --
# "4,35" dentro de "const X = 4,35;" e o operador virgula do JS (vira 35), nao o numero 4.35.
$mediaDiaCorridoJs  = $mediaDiaCorrido.ToString("0.##", $culturaJs)

Write-Host ("Total publicacoes (dedup final): " + $totalPub + " | dias corridos: " + $diasCorridos + " | dias uteis: " + $diasUteis + " | dias c/ pub: " + $diasComPub + " (" + $pctDiasComPub + "%)")
Write-Host ("Media mensal: " + $mediaMensalTxt + " | dia util: " + $mediaDiaUtilTxt + " | dia corrido: " + $mediaDiaCorridoTxt)

# ---------- 5) Regrava index.html (regex ancoradas em rotulo/estrutura, nunca em valor) ----------
$html = Get-Content -Path $IndexPath -Raw -Encoding UTF8
$original = $html
$falhas = New-Object System.Collections.Generic.List[string]
$RegexOpts = [System.Text.RegularExpressions.RegexOptions]::Singleline

function Apply-Replace {
    param(
        [string]$Texto,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Nome,
        [System.Text.RegularExpressions.RegexOptions]$Opts,
        [System.Collections.Generic.List[string]]$Falhas
    )
    $rx = New-Object System.Text.RegularExpressions.Regex($Pattern, $Opts)
    $matches = $rx.Matches($Texto)
    if ($matches.Count -eq 0) {
        $Falhas.Add($Nome)
        return $Texto
    }
    return $rx.Replace($Texto, $Replacement)
}

# 5.1 Periodo no subtitulo da secao
$pattern1 = '(Movimenta..es publicadas no Di.rio de Justi.a Eletr.nico Nacional . OAB 163\.443/MG, )\d{2}/\d{2}/\d{4}( a )\d{2}/\d{2}/\d{4}(\.)'
$repl1 = '${1}' + $dataIniBr + '${2}' + $dataFimBr + '${3}'
$html = Apply-Replace -Texto $html -Pattern $pattern1 -Replacement $repl1 -Nome "periodo-subtitulo" -Opts $RegexOpts -Falhas $falhas

# 5.2 KPI: total de publicacoes
$pattern2 = '(<div class="kpi-value">)[\d.,]+(</div>\s*<div class="kpi-label">Publica..es no per.odo</div>)'
$repl2 = '${1}' + $totalPubTxt + '${2}'
$html = Apply-Replace -Texto $html -Pattern $pattern2 -Replacement $repl2 -Nome "kpi-total" -Opts $RegexOpts -Falhas $falhas

# 5.3 KPI: media mensal + rodape (dia util / dia corrido)
$pattern3 = '(<div class="kpi-value">)[\d.,]+(</div>\s*<div class="kpi-label">M.dia mensal</div>\s*<div class="kpi-foot">)[^<]*(</div>)'
# "útil" e "·" (middle dot) construidos por codigo de caractere, pelo mesmo motivo do "Março" acima
$util = [char]0x00FA + "til"
$middot = [char]0x00B7
$textoRodapeMedia = $mediaDiaUtilTxt + " por dia " + $util + " " + $middot + " " + $mediaDiaCorridoTxt + " por dia corrido"
$repl3 = '${1}' + $mediaMensalTxt + '${2}' + $textoRodapeMedia + '${3}'
$html = Apply-Replace -Texto $html -Pattern $pattern3 -Replacement $repl3 -Nome "kpi-media-mensal" -Opts $RegexOpts -Falhas $falhas

# 5.4 KPI: dias com publicacao / dias corridos + rodape percentual
$pattern4 = '(<div class="kpi-value">)\d+( <span style="font-size:1rem;color:var\(--muted\);font-weight:600">/ )\d+(</span></div>\s*<div class="kpi-label">Dias com publica..o</div>\s*<div class="kpi-foot">)\d+(% dos dias corridos do per.odo</div>)'
$repl4 = '${1}' + $diasComPub + '${2}' + $diasCorridos + '${3}' + $pctDiasComPub + '${4}'
$html = Apply-Replace -Texto $html -Pattern $pattern4 -Replacement $repl4 -Nome "kpi-dias-com-pub" -Opts $RegexOpts -Falhas $falhas

# 5.5 Titulo do grafico de tendencia
$pattern5 = '(<h3>Publica..es por dia . )[^<]+(</h3>)'
$repl5 = '${1}' + $tituloTrend + '${2}'
$html = Apply-Replace -Texto $html -Pattern $pattern5 -Replacement $repl5 -Nome "trend-titulo" -Opts $RegexOpts -Falhas $falhas

# 5.6 Rodape do grafico: data final + media diaria na legenda tracejada
$pattern6 = '(<div class="trend-foot">\s*<span>)\d{2}/\d{2}/\d{4}(</span>\s*<span>Linha tracejada: m.dia di.ria \()[\d.,]+(\)</span>\s*<span>)\d{2}/\d{2}/\d{4}(</span>\s*</div>)'
$repl6 = '${1}' + $dataIniBr + '${2}' + $mediaDiaCorridoTxt + '${3}' + $dataFimBr + '${4}'
$html = Apply-Replace -Texto $html -Pattern $pattern6 -Replacement $repl6 -Nome "trend-rodape" -Opts $RegexOpts -Falhas $falhas

# 5.7 const DAILY / DAILY_AVG (replacement builds a huge literal - escapes $ so .NET doesn't hunt for group refs in it)
$pattern7 = 'const DAILY = \[.*?\];'
$repl7 = ('const DAILY = ' + $dailyJs + ';') -replace '\$', '$$$$'
$html = Apply-Replace -Texto $html -Pattern $pattern7 -Replacement $repl7 -Nome "const-daily" -Opts $RegexOpts -Falhas $falhas

$pattern7b = 'const DAILY_AVG = [\d.,]+;'
$repl7b = 'const DAILY_AVG = ' + $mediaDiaCorridoJs + ';'
$html = Apply-Replace -Texto $html -Pattern $pattern7b -Replacement $repl7b -Nome "const-daily-avg" -Opts $RegexOpts -Falhas $falhas

# 5.8 const MONTHS
$pattern8 = 'const MONTHS = \[.*?\];'
$repl8 = ('const MONTHS = ' + $monthsJs + ';') -replace '\$', '$$$$'
$html = Apply-Replace -Texto $html -Pattern $pattern8 -Replacement $repl8 -Nome "const-months" -Opts $RegexOpts -Falhas $falhas

if ($falhas.Count -gt 0) {
    Write-Warning ("As seguintes ancoras NAO casaram (pagina pode ter mudado de estrutura manualmente): " + ($falhas -join ", "))
    Write-Warning "Nada foi gravado em disco, para nao publicar uma pagina corrompida. Revise manualmente."
    exit 1
}

if ($html -eq $original) {
    Write-Host "Nenhuma mudanca de conteudo detectada - pulando escrita/commit."
    exit 0
}

Set-Content -Path $IndexPath -Value $html -Encoding UTF8 -NoNewline

# ---------- 6) Commit + push ----------
Push-Location $RepoDir
try {
    git add "tools/numeros-escritorio/index.html"
    $statusPorcelain = git status --porcelain "tools/numeros-escritorio/index.html"
    if ([string]::IsNullOrWhiteSpace($statusPorcelain)) {
        Write-Host "Sem diferencas apos git add - nada a commitar."
    } else {
        git commit -m ("Atualiza numeros de publicacoes DJEN (automatico, " + $DataFim + ")") --author="jowjo <jowjow07@gmail.com>" | Out-Null
        git push
        Write-Host "Commit e push realizados com sucesso."
    }
} finally {
    Pop-Location
}

Write-Host "=== Concluido ==="
