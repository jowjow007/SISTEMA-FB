# Compila o Portal FB para Windows (um único .exe, com as bibliotecas do WebView2 embutidas).
# Requisitos: só o Windows (usa o compilador C# do .NET Framework 4, que já vem no Windows 10/11).
# Uso:  powershell -ExecutionPolicy Bypass -File app-windows\compilar.ps1
# Saída: app-windows\dist\PortalFB.exe
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$versaoSdk = '1.0.4191.47'
$lib = Join-Path $aqui 'lib'
$dist = Join-Path $aqui 'dist'
New-Item -ItemType Directory -Force $lib, $dist | Out-Null

$core = Join-Path $lib 'Microsoft.Web.WebView2.Core.dll'
$winforms = Join-Path $lib 'Microsoft.Web.WebView2.WinForms.dll'
$loader = Join-Path $lib 'WebView2Loader.dll'
if (-not (Test-Path $core) -or -not (Test-Path $winforms) -or -not (Test-Path $loader)) {
  Write-Host "Baixando o WebView2 SDK $versaoSdk (NuGet oficial da Microsoft)..."
  $tmp = Join-Path $env:TEMP ("wv2-" + [guid]::NewGuid())
  New-Item -ItemType Directory $tmp | Out-Null
  $pkg = Join-Path $tmp 'wv2.zip'
  Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$versaoSdk/microsoft.web.webview2.$versaoSdk.nupkg" -OutFile $pkg -UseBasicParsing
  Expand-Archive $pkg (Join-Path $tmp 'x')
  Copy-Item (Join-Path $tmp 'x\lib\net462\Microsoft.Web.WebView2.Core.dll') $core
  Copy-Item (Join-Path $tmp 'x\lib\net462\Microsoft.Web.WebView2.WinForms.dll') $winforms
  Copy-Item (Join-Path $tmp 'x\runtimes\win-x64\native\WebView2Loader.dll') $loader
  Remove-Item -Recurse -Force $tmp
}
foreach ($f in @($core, $winforms, $loader)) {
  $sig = Get-AuthenticodeSignature $f
  if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'CN=Microsoft Corporation') {
    throw "Assinatura da Microsoft inválida em $f"
  }
}

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$saida = Join-Path $dist 'PortalFB.exe'
& $csc /nologo /target:winexe /platform:x64 /optimize+ `
  "/out:$saida" `
  "/win32icon:$(Join-Path $aqui 'portal-fb.ico')" `
  "/reference:$fw\System.Windows.Forms.dll" "/reference:$fw\System.Drawing.dll" `
  "/reference:$core" "/reference:$winforms" `
  "/resource:$core,Microsoft.Web.WebView2.Core.dll" `
  "/resource:$winforms,Microsoft.Web.WebView2.WinForms.dll" `
  "/resource:$loader,WebView2Loader.dll" `
  "/resource:$(Join-Path $aqui 'logo.png'),logo.png" `
  (Join-Path $aqui 'PortalFB.cs')
if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar" }
Write-Host "Pronto: $saida ($([math]::Round((Get-Item $saida).Length / 1MB, 1)) MB)"
