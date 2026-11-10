# Teste de ponta a ponta da atualização automática do app (sem tocar no app instalado de verdade).
# Compila o app em modo TESTE (pasta %TEMP%\PortalFBTeste, registro ...\Uninstall\PortalFBTeste, servidor local
# http://127.0.0.1:8770/ no lugar do portal), em três versões, e confere:
#  1) instalar a v208; o app aberto baixa a v209 em segundo plano; ao FECHAR, a v209 se instala sozinha (sem reabrir);
#  2) atualização pendente (v210) é aplicada ao ABRIR o app, que reabre já na versão nova;
#  3) arquivo adulterado não é instalado;
#  4) botão "Atualizar o app" (a página pede ao app): baixa a v211, fecha e reabre já na v211, sem instalador em Downloads.
# Uso:  powershell -ExecutionPolicy Bypass -File tests\app-windows\teste-atualizacao.ps1
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$app = Join-Path $raiz 'app-windows'
$tmp = Join-Path $env:TEMP ('teste-app-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$site = Join-Path $tmp 'site'
New-Item -ItemType Directory -Force $tmp, (Join-Path $site 'baixar') | Out-Null
$pastaTeste = Join-Path $env:TEMP 'PortalFBTeste'
$chave = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\PortalFBTeste'
$falhas = 0
function Ok($cond, $msg) { if ($cond) { Write-Host "  OK    $msg" } else { Write-Host "  FALHA $msg"; $script:falhas++ } }
function ProcessosTeste { Get-Process PortalFB -ErrorAction SilentlyContinue | Where-Object { try { $_.Path -like "$pastaTeste*" } catch { $false } } }
function Limpar { ProcessosTeste | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep 1
  Remove-Item -Recurse -Force $pastaTeste -ErrorAction SilentlyContinue; Remove-Item $chave -ErrorAction SilentlyContinue }

# compila as versões de teste
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$lib = Join-Path $app 'lib'
$fonte = [IO.File]::ReadAllText((Join-Path $app 'PortalFB.cs'))
function Compilar($v) {
  $cs = Join-Path $tmp "PortalFB-$v.cs"
  $f = [regex]::Replace($fonte, 'public const string VERSAO = "\d+";', "public const string VERSAO = `"$v`";")
  $f = [regex]::Replace($f, 'Assembly(File)?Version\("\d+\.0\.0\.0"\)', { param($x) $x.Value -replace '\d+\.0\.0\.0', "$v.0.0.0" })
  [IO.File]::WriteAllText($cs, $f)
  $out = Join-Path $tmp "v$v\PortalFB.exe"; New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
  & $csc /nologo /nowarn:162 /target:winexe /platform:x64 /define:TESTE "/out:$out" "/win32icon:$(Join-Path $app 'portal-fb.ico')" `
    "/reference:$fw\System.Windows.Forms.dll" "/reference:$fw\System.Drawing.dll" `
    "/reference:$lib\Microsoft.Web.WebView2.Core.dll" "/reference:$lib\Microsoft.Web.WebView2.WinForms.dll" `
    "/resource:$lib\Microsoft.Web.WebView2.Core.dll,Microsoft.Web.WebView2.Core.dll" `
    "/resource:$lib\Microsoft.Web.WebView2.WinForms.dll,Microsoft.Web.WebView2.WinForms.dll" `
    "/resource:$lib\WebView2Loader.dll,WebView2Loader.dll" "/resource:$(Join-Path $app 'logo.png'),logo.png" $cs | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "falha ao compilar v$v" }
  return $out
}
$e208 = Compilar 208; $e209 = Compilar 209; $e210 = Compilar 210; $e211 = Compilar 211
Write-Host "Compilado: v208, v209, v210, v211 (modo TESTE)"

# servidor local que faz o papel do portal: publica a v209
[IO.File]::WriteAllText((Join-Path $site 'index.html'), '<!doctype html><meta charset="utf-8"><title>Portal teste</title><body style="background:#161010;color:#eee;font-family:Segoe UI"><h1>Portal de teste</h1>')
Copy-Item $e209 (Join-Path $site 'baixar\PortalFB.exe')
$sha209 = (Get-FileHash $e209 -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $site 'baixar\versao.json'), "{`"versao`": 209, `"sha256`": `"$sha209`"}")
$srv = Start-Process python -ArgumentList '-I', '-m', 'http.server', '8770', '--bind', '127.0.0.1', '--directory', $site -PassThru -WindowStyle Hidden
Start-Sleep 2

try {
  Limpar
  Write-Host "1) Instala v208; app baixa v209; ao fechar, atualiza sozinho"
  Start-Process $e208 | Out-Null
  $inst = Join-Path $pastaTeste 'PortalFB.exe'
  for ($i = 0; $i -lt 30 -and -not (ProcessosTeste); $i++) { Start-Sleep 1 }
  Ok ((Test-Path $inst) -and (Get-Item $inst).VersionInfo.FileVersion -eq '208.0.0.0') 'v208 instalada na pasta de teste'
  Ok ((Get-ItemProperty $chave).DisplayVersion -eq 'v208') 'registro mostra v208'
  Ok ([bool](ProcessosTeste)) 'app v208 aberto'
  for ($i = 0; $i -lt 30 -and -not (ProcessosTeste | Where-Object { $_.MainWindowTitle -eq 'Portal teste' }); $i++) { Start-Sleep 1 }
  Ok ([bool](ProcessosTeste | Where-Object { $_.MainWindowTitle -eq 'Portal teste' })) 'a página carregou dentro do app (WebView2 funcionando)'
  $info = Join-Path $pastaTeste 'atualizacao\pendente.txt'
  for ($i = 0; $i -lt 40 -and -not (Test-Path $info); $i++) { Start-Sleep 1 }
  Ok ((Test-Path $info) -and ((Get-Content $info) -eq "209;$sha209")) 'v209 baixada em segundo plano e conferida (SHA-256)'
  (ProcessosTeste | Where-Object { $_.MainWindowHandle -ne 0 }) | ForEach-Object { $_.CloseMainWindow() | Out-Null }
  for ($i = 0; $i -lt 30 -and (Get-Item $inst).VersionInfo.FileVersion -ne '209.0.0.0'; $i++) { Start-Sleep 1 }
  Ok ((Get-Item $inst).VersionInfo.FileVersion -eq '209.0.0.0') 'ao fechar, a v209 se instalou sozinha'
  Ok ((Get-ItemProperty $chave).DisplayVersion -eq 'v209') 'registro mostra v209'
  Start-Sleep 3
  Ok (-not (ProcessosTeste)) 'não reabriu (a pessoa tinha fechado o app)'

  Write-Host "2) Atualização pendente (v210) aplicada ao abrir"
  $pend = Join-Path $pastaTeste 'atualizacao'
  New-Item -ItemType Directory -Force $pend | Out-Null
  Copy-Item $e210 (Join-Path $pend 'PortalFB.exe') -Force
  $sha210 = (Get-FileHash $e210 -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText((Join-Path $pend 'pendente.txt'), "210;$sha210")
  Start-Process $inst | Out-Null
  for ($i = 0; $i -lt 30 -and (Get-Item $inst).VersionInfo.FileVersion -ne '210.0.0.0'; $i++) { Start-Sleep 1 }
  Ok ((Get-Item $inst).VersionInfo.FileVersion -eq '210.0.0.0') 'ao abrir, aplicou a v210 pendente'
  for ($i = 0; $i -lt 20 -and -not (ProcessosTeste | Where-Object { $_.Path -eq $inst -and $_.MainWindowHandle -ne 0 }); $i++) { Start-Sleep 1 }
  Ok ([bool](ProcessosTeste | Where-Object { $_.Path -eq $inst })) 'reabriu já na v210'
  for ($i = 0; $i -lt 30 -and -not (ProcessosTeste | Where-Object { $_.MainWindowTitle -eq 'Portal teste' }); $i++) { Start-Sleep 1 }
  Ok ([bool](ProcessosTeste | Where-Object { $_.MainWindowTitle -eq 'Portal teste' })) 'v210 carregou a página'

  Write-Host "3) Arquivo adulterado não é instalado"
  ProcessosTeste | Stop-Process -Force; Start-Sleep 2
  New-Item -ItemType Directory -Force $pend | Out-Null
  Copy-Item $e208 (Join-Path $pend 'PortalFB.exe') -Force   # conteúdo diferente do SHA declarado
  [IO.File]::WriteAllText((Join-Path $pend 'pendente.txt'), "211;$sha210")
  Start-Process $inst | Out-Null; Start-Sleep 8
  Ok ((Get-Item $inst).VersionInfo.FileVersion -eq '210.0.0.0') 'SHA-256 não confere: continua na v210'
  Ok (-not (Test-Path (Join-Path $pend 'pendente.txt'))) 'pendência inválida descartada'

  Write-Host "4) Botão 'Atualizar o app': um clique, fecha e reabre na versão nova"
  ProcessosTeste | Stop-Process -Force; Start-Sleep 2
  Remove-Item -Recurse -Force $pend -ErrorAction SilentlyContinue
  Copy-Item $e211 (Join-Path $site 'baixar\PortalFB.exe') -Force
  $sha211 = (Get-FileHash $e211 -Algorithm SHA256).Hash.ToLowerInvariant()
  [IO.File]::WriteAllText((Join-Path $site 'baixar\versao.json'), "{`"versao`": 211, `"sha256`": `"$sha211`"}")
  # a página faz o que o botão faz (só na v210, para a v211 reaberta não pedir de novo)
  [IO.File]::WriteAllText((Join-Path $site 'index.html'), '<!doctype html><meta charset="utf-8"><title>Portal teste</title><body><h1>Portal de teste</h1><script>if (navigator.userAgent.indexOf("PortalFBApp/210") >= 0) chrome.webview.postMessage("atualizar-agora");</script>')
  $antes = @(Get-ChildItem "$env:USERPROFILE\Downloads" -Filter '*Instalador*' -ErrorAction SilentlyContinue).Count
  Start-Process $inst | Out-Null
  for ($i = 0; $i -lt 40 -and (Get-Item $inst).VersionInfo.FileVersion -ne '211.0.0.0'; $i++) { Start-Sleep 1 }
  Ok ((Get-Item $inst).VersionInfo.FileVersion -eq '211.0.0.0') 'pedido da página: v211 baixada e instalada'
  Ok ((Get-ItemProperty $chave).DisplayVersion -eq 'v211') 'registro mostra v211'
  for ($i = 0; $i -lt 30 -and -not (ProcessosTeste | Where-Object { $_.MainWindowTitle -eq 'Portal teste' }); $i++) { Start-Sleep 1 }
  Ok ([bool](ProcessosTeste | Where-Object { $_.Path -eq $inst -and $_.MainWindowTitle -eq 'Portal teste' })) 'reabriu sozinho já na v211, com a página carregada'
  Ok (@(ProcessosTeste | Where-Object { $_.MainWindowHandle -ne 0 }).Count -eq 1) 'uma janela só (a antiga fechou)'
  Ok (@(Get-ChildItem "$env:USERPROFILE\Downloads" -Filter '*Instalador*' -ErrorAction SilentlyContinue).Count -eq $antes) 'nenhum instalador foi parar em Downloads'
}
finally {
  Limpar
  Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
if ($falhas) { Write-Host "RESULTADO: $falhas falha(s)"; exit 1 } else { Write-Host 'RESULTADO: TUDO OK' }
