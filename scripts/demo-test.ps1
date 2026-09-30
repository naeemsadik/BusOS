[CmdletBinding()]
param(
  [ValidateSet('Smoke', 'Full')]
  [string]$Mode = 'Smoke',
  [switch]$Headed,
  [switch]$KeepRunning
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$resultsDirectory = Join-Path $root 'test-results\demo-harness'
$processes = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()
$steps = [System.Collections.Generic.List[object]]::new()
$started = Get-Date

function Invoke-Checked {
  param([string]$Name, [string]$WorkingDirectory, [string[]]$CommandArguments)
  Write-Host "`n==> $Name" -ForegroundColor Cyan
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  Push-Location $WorkingDirectory
  try {
    & npm.cmd @CommandArguments
    if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE." }
    $steps.Add([pscustomobject]@{ Name = $Name; Status = 'PASS'; Seconds = [math]::Round($watch.Elapsed.TotalSeconds, 1) })
  } catch {
    $steps.Add([pscustomobject]@{ Name = $Name; Status = 'FAIL'; Seconds = [math]::Round($watch.Elapsed.TotalSeconds, 1) })
    throw
  } finally {
    Pop-Location
  }
}

function Assert-PortFree {
  param([int]$Port)
  if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use. Stop the existing service and run the demo again."
  }
}

function Start-DemoProcess {
  param([string]$Name, [string]$FilePath, [string[]]$ArgumentList, [string]$WorkingDirectory)
  $safeName = $Name.ToLowerInvariant().Replace(' ', '-')
  $stdout = Join-Path $resultsDirectory "$safeName.stdout.log"
  $stderr = Join-Path $resultsDirectory "$safeName.stderr.log"
  $escapedArguments = $ArgumentList | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }
  $process = Start-Process -FilePath $FilePath -ArgumentList ($escapedArguments -join ' ') -WorkingDirectory $WorkingDirectory `
    -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  $processes.Add($process)
  Write-Host "Started $Name (PID $($process.Id))."
}

function Wait-ForUrl {
  param([string]$Name, [string]$Url, [int]$TimeoutSeconds = 90)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "$Name is ready: $Url" -ForegroundColor Green
        return
      }
    } catch { }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)
  throw "$Name did not become ready at $Url within $TimeoutSeconds seconds. Check $resultsDirectory."
}

New-Item -ItemType Directory -Path $resultsDirectory -Force | Out-Null

# These overrides are deliberately explicit. dotenv will not replace them, so backend/.env and Neon are ignored.
$env:NODE_ENV = 'production'
$env:DATABASE_HOST = '127.0.0.1'
$env:DATABASE_PORT = '5432'
$env:DATABASE_USERNAME = 'postgres'
$env:DATABASE_PASSWORD = if ($env:BUSOS_DEMO_DB_PASSWORD) { $env:BUSOS_DEMO_DB_PASSWORD } else { 'BusOSDemo!2026' }
$env:DATABASE_NAME = 'busos_demo_test'
$env:DATABASE_SCHEMA = 'public'
$env:DATABASE_SSL = 'false'
$env:BUSOS_ALLOW_TEST_RESET = 'true'
$env:JWT_SECRET = 'busos-demo-jwt-secret-not-for-production'
$env:CONFIRMATION_TOKEN_SECRET = 'busos-demo-confirmation-secret'
$env:PORT = '5100'
$env:BACKEND_URL = 'http://127.0.0.1:5100'
$env:FRONTEND_1_URL = 'http://127.0.0.1:3100'
$env:FRONTEND_2_URL = 'http://127.0.0.1:3101'
$env:FRONTEND_URL = 'http://127.0.0.1:3100'
$env:BACKEND_INTERNAL_URL = 'http://127.0.0.1:5100'
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:5100'
$env:STOREFRONT_ROOT_DOMAIN = 'localhost'
$env:NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN = 'localhost:3100'
$env:CMS_AI_ENABLED = 'false'
$env:EMAIL_TRANSPORT = 'json'
$env:AI_API_URL = 'http://127.0.0.1:5199/provider/success'
$env:SMS_BASE_URL = 'http://127.0.0.1:5199'
$env:BKASH_BASE_URL = 'http://127.0.0.1:5199'
$env:SMTP_HOST = '127.0.0.1'
$env:SMTP_PORT = '5199'
$env:SSLCOMMERZ_IS_LIVE = 'false'
$env:BUSOS_BASE_URL = 'http://127.0.0.1:3100'
$env:BUSOS_DISABLE_STOREFRONT_CACHE = 'true'
$env:BUSOS_E2E_OWNER_EMAIL = 'cms.demo.owner@busos.local'
$env:BUSOS_E2E_OWNER_PASSWORD = 'DemoCMS!2026'
$env:BUSOS_E2E_STAFF_EMAIL = 'cms.demo.staff@busos.local'
$env:BUSOS_E2E_STAFF_PASSWORD = 'DemoCMS!2026'
$env:BUSOS_E2E_ISOLATION_EMAIL = 'cms.isolation.owner@busos.local'
$env:BUSOS_E2E_ISOLATION_PASSWORD = 'DemoCMS!2026'
$env:BUSOS_E2E_STOREFRONT_SLUG = 'demo'
$env:BUSOS_E2E_MUTATIONS = 'true'
$env:BUSOS_E2E_ADMIN_URL = 'http://127.0.0.1:3101'
$env:BUSOS_E2E_ADMIN_USERNAME = 'admin'
$env:BUSOS_E2E_ADMIN_PASSWORD = 'admin123'
$env:BUSOS_E2E_ORGANIZATION_QUERY = 'BusOS CMS Demo Shop'
$env:BUSOS_MOCK_PROVIDER_URL = 'http://127.0.0.1:5199'
$env:BUSOS_DEMO_HEADED = if ($Headed) { 'true' } else { 'false' }

try {
  foreach ($port in 3100, 3101, 5100, 5199) { Assert-PortFree $port }
  if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue)) {
    throw 'Local PostgreSQL is not listening on port 5432. Install/start PostgreSQL 16 before running the demo.'
  }

  Invoke-Checked 'Create disposable database if missing' (Join-Path $root 'backend') @('run', 'db:setup')
  Invoke-Checked 'Reset disposable schema' (Join-Path $root 'backend') @('run', 'demo:db:reset')
  Invoke-Checked 'Seed CMS and tenant data' (Join-Path $root 'backend') @('run', 'cms:seed-demo')
  Invoke-Checked 'Seed operational and admin data' (Join-Path $root 'backend') @('run', 'demo:seed:operations')

  Invoke-Checked 'Backend production build' (Join-Path $root 'backend') @('run', 'build')
  Invoke-Checked 'Frontend production build' (Join-Path $root 'frontend') @('run', 'build')
  Invoke-Checked 'Admin production build' (Join-Path $root 'admin') @('run', 'build')

  # React's test utilities require the test build; production is restored before starting the applications.
  $env:NODE_ENV = 'test'

  if ($Mode -eq 'Full') {
    Invoke-Checked 'Backend full tests with coverage' (Join-Path $root 'backend') @('run', 'test:cov', '--', '--runInBand')
    Invoke-Checked 'Frontend full tests with coverage' (Join-Path $root 'frontend') @('run', 'test', '--', '--coverage')
    Invoke-Checked 'Frontend locale parity' (Join-Path $root 'frontend') @('run', 'check:locales')
    Invoke-Checked 'Frontend UI glyph check' (Join-Path $root 'frontend') @('run', 'check:ui')
    Invoke-Checked 'Admin locale parity' (Join-Path $root 'admin') @('run', 'check:locales')
    Invoke-Checked 'Admin UI glyph check' (Join-Path $root 'admin') @('run', 'check:ui')
  } else {
    Invoke-Checked 'Backend critical business-rule tests' (Join-Path $root 'backend') @(
      'test', '--', '--runInBand',
      'pos/pos.service.spec.ts', 'orders/orders.service.spec.ts', 'orders/order-inventory.service.spec.ts',
      'permissions/permissions.service.spec.ts', 'storefront/storefront-security.spec.ts',
      'storefront/storefront-ai.service.spec.ts', 'storefront/tenant-scope.spec.ts'
    )
    Invoke-Checked 'Frontend component tests' (Join-Path $root 'frontend') @('test')
  }

  $env:NODE_ENV = 'production'
  Start-DemoProcess 'Mock providers' 'node.exe' @((Join-Path $root 'scripts\mock-providers.mjs')) $root
  Start-DemoProcess 'Backend' 'node.exe' @('dist/main.js') (Join-Path $root 'backend')
  Start-DemoProcess 'Owner frontend' 'node.exe' @((Join-Path $root 'frontend\node_modules\next\dist\bin\next'), 'start', '-p', '3100') (Join-Path $root 'frontend')
  Start-DemoProcess 'Admin frontend' 'node.exe' @((Join-Path $root 'admin\node_modules\next\dist\bin\next'), 'start', '-p', '3101') (Join-Path $root 'admin')

  Wait-ForUrl 'Mock providers' 'http://127.0.0.1:5199/health' 30
  Wait-ForUrl 'Backend' 'http://127.0.0.1:5100' 120
  Wait-ForUrl 'Owner frontend' 'http://127.0.0.1:3100/auth/login' 180
  Wait-ForUrl 'Admin frontend' 'http://127.0.0.1:3101/login' 180

  if ($Mode -eq 'Full') {
    Invoke-Checked 'Complete Playwright browser matrix' (Join-Path $root 'frontend') @('run', 'test:e2e')
  } else {
    $playwrightArguments = @('run', 'test:demo', '--')
    if ($Headed) { $playwrightArguments += '--headed' }
    Invoke-Checked 'BusOS headed demonstration' (Join-Path $root 'frontend') $playwrightArguments
  }

  Write-Host "`nBusOS automated demonstration PASSED." -ForegroundColor Green
} catch {
  Write-Host "`nBusOS automated demonstration FAILED: $($_.Exception.Message)" -ForegroundColor Red
  throw
} finally {
  Write-Host "`nTest summary" -ForegroundColor Cyan
  $steps | Format-Table -AutoSize
  Write-Host "Elapsed: $([math]::Round(((Get-Date) - $started).TotalMinutes, 2)) minutes"
  Write-Host "Playwright report: $(Join-Path $root 'frontend\playwright-report-demo\index.html')"
  Write-Host "Process logs: $resultsDirectory"

  if (-not $KeepRunning) {
    foreach ($process in $processes) {
      if (-not $process.HasExited) {
        & cmd.exe /d /c "taskkill /PID $($process.Id) /T /F >nul 2>nul" | Out-Null
        if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
      }
    }
  } else {
    Write-Host 'Applications remain running because -KeepRunning was supplied.' -ForegroundColor Yellow
    Write-Host 'Owner UI: http://127.0.0.1:3100 | Admin UI: http://127.0.0.1:3101 | API: http://127.0.0.1:5100'
  }
}
