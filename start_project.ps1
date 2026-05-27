# CSPM Project Startup Script

Write-Host "Starting CSPM Findings Dashboard..." -ForegroundColor Cyan

# Define paths
$ProjectRoot = Get-Location
$BackendPath = "$ProjectRoot\csmp-findings-dashboard\backend"
$FrontendPath = "$ProjectRoot\csmp-findings-dashboard"

# Check if Backend exists
if (Test-Path $BackendPath) {
    Write-Host "Starting Backend Server..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; Write-Host 'Starting Flask Backend...'; python app.py"
} else {
    Write-Host "Backend directory not found at $BackendPath" -ForegroundColor Red
}

# Check if Frontend exists
if (Test-Path $FrontendPath) {
    Write-Host "Starting Frontend Server..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; Write-Host 'Starting Vite Frontend...'; npm run dev"
} else {
    Write-Host "Frontend directory not found at $FrontendPath" -ForegroundColor Red
}

Write-Host "Servers are launching in new windows." -ForegroundColor Yellow
