# Versão única do portal e do app: lê o número do index.html (<span class="version-tag">v207</span>), grava o mesmo
# número no app, compila e deixa pronto para publicar: baixar/PortalFB.exe + baixar/versao.json (com o SHA-256 que o
# app confere antes de se atualizar). Rodar a cada mudança, depois de subir o número no index.html, e fazer commit.
# Uso:  powershell -ExecutionPolicy Bypass -File app-windows\publicar.ps1
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz = Split-Path -Parent $aqui
$html = [IO.File]::ReadAllText((Join-Path $raiz 'index.html'))
$m = [regex]::Match($html, 'version-tag">v(\d+)<')
if (-not $m.Success) { throw 'Não achei a versão (version-tag) no index.html' }
$v = [int]$m.Groups[1].Value

$cs = Join-Path $aqui 'PortalFB.cs'
$fonte = [IO.File]::ReadAllText($cs)
$fonte = [regex]::Replace($fonte, 'public const string VERSAO = "\d+";', "public const string VERSAO = `"$v`";")
$fonte = [regex]::Replace($fonte, 'Assembly(File)?Version\("\d+\.0\.0\.0"\)', { param($x) $x.Value -replace '\d+\.0\.0\.0', "$v.0.0.0" })
[IO.File]::WriteAllText($cs, $fonte, (New-Object Text.UTF8Encoding $false))

& (Join-Path $aqui 'compilar.ps1')
$exe = Join-Path $aqui 'dist\PortalFB.exe'
$baixar = Join-Path $raiz 'baixar'
New-Item -ItemType Directory -Force $baixar | Out-Null
Copy-Item $exe (Join-Path $baixar 'PortalFB.exe') -Force
$sha = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLowerInvariant()
$json = "{`n  `"versao`": $v,`n  `"sha256`": `"$sha`",`n  `"publicadoEm`": `"$(Get-Date -Format 'yyyy-MM-dd HH:mm')`"`n}`n"
[IO.File]::WriteAllText((Join-Path $baixar 'versao.json'), $json, (New-Object Text.UTF8Encoding $false))
Write-Host "Portal e app na v$v (sha256 $($sha.Substring(0,12))...). Faça o commit de index.html, app-windows/PortalFB.cs, baixar/."
