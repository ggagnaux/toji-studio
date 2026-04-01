$ErrorActionPreference = "Stop"

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$publicRoot = Resolve-Path (Join-Path $backendRoot "..")
$distRoot = Join-Path $backendRoot "dist"

$serverEntry = Join-Path $backendRoot "src/server.js"
$siteIndex = Join-Path $publicRoot "index.html"
if (-not (Test-Path $serverEntry)) {
  throw "Could not find server entry at $serverEntry"
}
if (-not (Test-Path $siteIndex)) {
  throw "Could not find public site index at $siteIndex"
}

function Set-DistEnvToProduction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$EnvPath
  )

  if (-not (Test-Path $EnvPath)) {
    return
  }

  $lines = Get-Content -Path $EnvPath
  $inDevelopmentSection = $false
  $inProductionSection = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $trimmed = $line.Trim()

    if ($trimmed -like "# Development Settings*Start*") {
      $inDevelopmentSection = $true
      $inProductionSection = $false
      continue
    }

    if ($trimmed -like "# Development Settings*End*") {
      $inDevelopmentSection = $false
      continue
    }

    if ($trimmed -like "# Production Settings*Start*") {
      $inDevelopmentSection = $false
      $inProductionSection = $true
      continue
    }

    if ($trimmed -like "# Production Settings*End*") {
      $inProductionSection = $false
      continue
    }

    if (-not $trimmed) {
      continue
    }

    if ($trimmed.StartsWith("#") -and -not $trimmed.StartsWith("#CORS_ORIGIN=") -and -not $trimmed.StartsWith("#TOJI_STORAGE_DIR=")) {
      continue
    }

    if ($inDevelopmentSection) {
      if ($trimmed -match '^[A-Za-z_][A-Za-z0-9_]*=') {
        $lines[$i] = "#$line"
      }
      continue
    }

    if ($inProductionSection) {
      if ($trimmed.StartsWith("#") -and $trimmed.Substring(1) -match '^[A-Za-z_][A-Za-z0-9_]*=') {
        $lines[$i] = $line -replace '^\s*#\s*', ''
      }
    }
  }

  Set-Content -Path $EnvPath -Value $lines -Encoding utf8
}

if (Test-Path $distRoot) {
  Remove-Item -Path $distRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $distRoot | Out-Null

$siteDist = Join-Path $distRoot "site"

New-Item -ItemType Directory -Path $siteDist | Out-Null

# Backend runtime files
Copy-Item -Path (Join-Path $backendRoot "package.json") -Destination $distRoot -Force

$lockFile = Join-Path $backendRoot "package-lock.json"
if (Test-Path $lockFile) {
  Copy-Item -Path $lockFile -Destination $distRoot -Force
}

$envExampleCandidates = @(
  Join-Path $backendRoot ".env.example"
  Join-Path $backendRoot ".env-EXAMPLE"
)
$envExample = $envExampleCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($envExample) {
  Copy-Item -Path $envExample -Destination (Join-Path $distRoot ".env.example") -Force
}

$envFile = Join-Path $backendRoot ".env"
if (Test-Path $envFile) {
  $distEnvFile = Join-Path $distRoot ".env"
  Copy-Item -Path $envFile -Destination $distEnvFile -Force
  Set-DistEnvToProduction -EnvPath $distEnvFile
}

Copy-Item -Path (Join-Path $backendRoot "src") -Destination $distRoot -Recurse -Force

# Public site files (excluding backend source tree)
Get-ChildItem -Path $publicRoot -Force | Where-Object {
  $_.Name -ne "server"
} | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $siteDist -Recurse -Force
}

# Minify all JavaScript files in dist using esbuild.
$jsFiles = Get-ChildItem -Path $distRoot -Recurse -File -Filter "*.js"

Push-Location $backendRoot
try {
  foreach ($jsFile in $jsFiles) {
    & npm exec --yes --package esbuild -- esbuild $jsFile.FullName --minify --legal-comments=none --allow-overwrite "--outfile=$($jsFile.FullName)"
    if ($LASTEXITCODE -ne 0) {
      throw "JavaScript minification failed for file: $($jsFile.FullName)"
    }
  }
}
finally {
  Pop-Location
}

Write-Host "Minified JavaScript files in dist: $($jsFiles.Count)"

Write-Host "Deployment bundle created at: $distRoot"
Write-Host " - App root: $distRoot"
Write-Host " - Site:     $siteDist"
