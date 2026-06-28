$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
while ($true) {
  $inUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if (-not $inUse) { break }
  $port++
}

$url = "http://127.0.0.1:$port/"
$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  $cmd = "py"
  $args = @("-3", "-m", "http.server", "$port", "--bind", "127.0.0.1")
} else {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if (-not $python) {
    Write-Host "Pythonが見つかりません。index.htmlを直接開くか、Pythonを入れてください。"
    pause
    exit 1
  }
  $cmd = "python"
  $args = @("-m", "http.server", "$port", "--bind", "127.0.0.1")
}

Start-Process -FilePath $cmd -ArgumentList $args -WorkingDirectory $root -WindowStyle Hidden

for ($i = 0; $i -lt 30; $i++) {
  try {
    $res = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1
    if ($res.StatusCode -eq 200) { break }
  } catch {
    Start-Sleep -Milliseconds 250
  }
}

Start-Process $url
Write-Host "政経暗記を起動しました: $url"
Write-Host "閉じるときは、必要ならタスクマネージャーから python を終了してください。"
