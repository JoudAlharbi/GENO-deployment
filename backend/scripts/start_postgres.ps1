# Start PostgreSQL 18 on Windows (run in PowerShell as Administrator if service start fails)
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$dataDir = "C:\Program Files\PostgreSQL\18\data"

if (-not (Test-Path $pgCtl)) {
    Write-Host "PostgreSQL 18 not found at $pgCtl"
    Write-Host "Install PostgreSQL or update paths in this script."
    exit 1
}

& $pgCtl start -D $dataDir -w
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL started successfully."
} else {
    Write-Host "Trying Windows service..."
    Start-Service postgresql-x64-18 -ErrorAction SilentlyContinue
    Get-Service postgresql-x64-18
}
