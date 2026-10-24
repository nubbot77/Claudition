# Claudition launcher for Windows (PowerShell).
#   .\start.ps1           check prerequisites, install, build the UI, start on http://127.0.0.1:8000
#   .\start.ps1 -Voice    also install the Kokoro neural voice (~1.9 GB download, once)
#   .\start.ps1 -NoBrowser  don't open the browser
param(
    [switch]$Voice,
    [switch]$NoBrowser,
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "`n[x] $text" -ForegroundColor Red; exit 1 }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

Step "Checking prerequisites"
if (-not (Has "claude")) {
    Fail "Claude Code is not installed. Install it, then run this script again:`n    npm install -g @anthropic-ai/claude-code"
}
if (-not (Has "uv")) {
    Fail "uv (Python package manager) is not installed. Install it, then open a new terminal:`n    powershell -ExecutionPolicy ByPass -c `"irm https://astral.sh/uv/install.ps1 | iex`""
}
if (-not (Has "npm")) {
    Fail "Node.js 20+ is not installed. Get it from https://nodejs.org and open a new terminal."
}

$auth = $null
try { $auth = claude auth status | ConvertFrom-Json } catch { }
if (-not $auth -or -not $auth.loggedIn) {
    Write-Host "Claude Code is not signed in. Opening the sign-in flow (use your Claude Pro/Max account)..."
    claude auth login
    try { $auth = claude auth status | ConvertFrom-Json } catch { $auth = $null }
    if (-not $auth -or -not $auth.loggedIn) { Fail "Still not signed in. Run 'claude auth login' and try again." }
}
Write-Host "Claude Code signed in ($($auth.authMethod), $($auth.subscriptionType) plan)"
if ($env:ANTHROPIC_API_KEY) {
    Write-Host "Note: ANTHROPIC_API_KEY is set in this shell. Claudition removes it for Claude calls so your subscription is used." -ForegroundColor Yellow
}

Step "Installing backend"
$syncArgs = @("sync", "--inexact")
if ($Voice) { $syncArgs += @("--extra", "voice") }
Push-Location $Backend
try {
    uv @syncArgs
    if ($LASTEXITCODE -ne 0) { Fail "uv sync failed." }
    if ($Voice) {
        Step "Downloading voice model files (~350 MB, skipped if present)"
        uv run --no-sync python scripts/download_tts_models.py
        if ($LASTEXITCODE -ne 0) { Fail "Voice model download failed. Run .\start.ps1 -Voice again to resume." }
    }
} finally { Pop-Location }

Step "Building the interface"
Push-Location $Frontend
try {
    if (-not (Test-Path "node_modules")) {
        npm ci
        if ($LASTEXITCODE -ne 0) { Fail "npm ci failed." }
    }
    $index = Join-Path $Frontend "dist\index.html"
    $stale = -not (Test-Path $index)
    if (-not $stale) {
        $built = (Get-Item $index).LastWriteTime
        $stale = [bool](Get-ChildItem -Recurse -File src, index.html, package.json |
            Where-Object { $_.LastWriteTime -gt $built } | Select-Object -First 1)
    }
    if ($stale) {
        npm run build
        if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed." }
    } else {
        Write-Host "Up to date."
    }
} finally { Pop-Location }

$url = "http://127.0.0.1:$Port"
Step "Starting Claudition on $url  (Ctrl+C to stop)"
if (-not $NoBrowser) { Start-Job -ScriptBlock { param($u) Start-Sleep -Seconds 3; Start-Process $u } -ArgumentList $url | Out-Null }
Push-Location $Backend
try {
    uv run --no-sync uvicorn app.main:app --host 127.0.0.1 --port $Port
} finally { Pop-Location }
