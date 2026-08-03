$ErrorActionPreference = "Stop"

$job = Start-Job -ScriptBlock {
  Set-Location $using:PSScriptRoot
  Set-Location ..
  npm.cmd run dev -- --hostname 127.0.0.1
}

try {
  $ready = $false

  for ($i = 0; $i -lt 60; $i++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3000" -TimeoutSec 2

      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $ready) {
    Receive-Job $job
    throw "Next dev server did not become ready."
  }

  $env:PLAYWRIGHT_SKIP_WEB_SERVER = "1"
  npx.cmd playwright test --project=mobile-chrome --project=mobile-safari --workers=1 --reporter=list
} finally {
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\PLAYWRIGHT_SKIP_WEB_SERVER -ErrorAction SilentlyContinue
}
