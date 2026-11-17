# Compila o Otimizador de PC (um único .exe, sem dependências; usa o compilador C# que já vem no Windows).
# Uso:  powershell -ExecutionPolicy Bypass -File otimizador-pc\compilar.ps1
# Saída: otimizador-pc\dist\OtimizadorPC.exe
# A chave do monitoramento (envio ao painel "Computadores" do portal) vem de privado\monitor-chave.txt, que fica fora
# do repositório; sem ela o app funciona, mas não envia nada. A regra do Firestore guarda só o SHA-256 da chave.
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$raiz = Split-Path -Parent $aqui
$dist = Join-Path $aqui 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null

$arqChave = Join-Path $raiz 'privado\monitor-chave.txt'
$chave = ''
if (Test-Path $arqChave) { $chave = (Get-Content $arqChave -Raw).Trim() } else { Write-Warning 'privado\monitor-chave.txt não existe: o app não vai enviar ao painel do portal.' }
if ($chave -notmatch '^[0-9a-f]*$') { throw 'A chave deve ter só 0-9 e a-f' }
$gerado = Join-Path $dist 'Chave.g.cs'
[IO.File]::WriteAllText($gerado, "static class ChaveMonitor { public const string VALOR = `"$chave`"; }")
if ($chave) {
  $hash = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($chave))).Replace('-', '').ToLower()
  Write-Host "SHA-256 da chave (tem que ser o mesmo da função chaveMonitor() em firestore.rules): $hash"
}

$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$saida = Join-Path $dist 'OtimizadorPC.exe'
$icone = Join-Path $aqui '..\app-windows\portal-fb.ico'
& (Join-Path $fw 'csc.exe') /nologo /target:winexe /platform:anycpu /optimize+ /codepage:65001 `
  "/out:$saida" "/win32icon:$icone" "/win32manifest:$(Join-Path $aqui 'app.manifest')" `
  "/reference:$fw\System.Windows.Forms.dll" "/reference:$fw\System.Drawing.dll" `
  "/reference:$fw\System.Web.Extensions.dll" "/reference:$fw\System.Core.dll" "/reference:$fw\System.Management.dll" `
  (Join-Path $aqui 'OtimizadorPC.cs') (Join-Path $aqui 'Monitor.cs') (Join-Path $aqui 'Envio.cs') (Join-Path $aqui 'Otimizacoes.cs') $gerado
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar' }
Write-Host "Pronto: $saida"
