$ErrorActionPreference = "Stop"

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$publicRoot = Resolve-Path (Join-Path $backendRoot "..")
$distRoot = Join-Path $backendRoot "dist"

if (Test-Path $distRoot) {
  Remove-Item -Path $distRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $distRoot | Out-Null

$backendDist = Join-Path $distRoot "toji-backend"
$siteDist = Join-Path $distRoot "site"

New-Item -ItemType Directory -Path $backendDist | Out-Null
New-Item -ItemType Directory -Path $siteDist | Out-Null

# Backend runtime files
Copy-Item -Path (Join-Path $backendRoot "package.json") -Destination $backendDist -Force

$lockFile = Join-Path $backendRoot "package-lock.json"
if (Test-Path $lockFile) {
  Copy-Item -Path $lockFile -Destination $backendDist -Force
}

$envExample = Join-Path $backendRoot ".env.example"
if (Test-Path $envExample) {
  Copy-Item -Path $envExample -Destination $backendDist -Force
}

Copy-Item -Path (Join-Path $backendRoot "src") -Destination $backendDist -Recurse -Force

# Public site files (excluding backend source tree)
Get-ChildItem -Path $publicRoot -Force | Where-Object {
  $_.Name -ne "toji-backend"
} | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $siteDist -Recurse -Force
}

Write-Host "Deployment bundle created at: $distRoot"
Write-Host " - Backend: $backendDist"
Write-Host " - Site:    $siteDist"
