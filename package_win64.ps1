$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot
$BuildDir = Join-Path $ProjectDir "build"
$GodotGui = Join-Path $ProjectDir ".godot_bin\Godot_v4.3-stable_win64.exe"
$GodotConsole = Join-Path $ProjectDir ".godot_bin\Godot_v4.3-stable_win64_console.exe"

if (-not (Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
}

Write-Host "[1/3] Exporting compiled resource pack (CloudIsleMarket.pck)..."
& $GodotConsole --headless --path $ProjectDir --export-pack "Windows Desktop" (Join-Path $BuildDir "CloudIsleMarket.pck")
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to export CloudIsleMarket.pck"
    exit $LASTEXITCODE
}

Write-Host "[2/3] Staging standalone Windows 64-bit executable (CloudIsleMarket.exe)..."
Copy-Item $GodotGui (Join-Path $BuildDir "CloudIsleMarket.exe") -Force
Copy-Item $GodotConsole (Join-Path $BuildDir "CloudIsleMarket_console.exe") -Force

Write-Host "[3/3] Running packaged --self-test verification and creating ZIP archive..."
Push-Location $BuildDir
try {
    & ".\CloudIsleMarket_console.exe" -- --self-test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Packaged --self-test failed!"
        exit $LASTEXITCODE
    }
    Remove-Item (Join-Path $BuildDir "preview_live_godot.png") -ErrorAction SilentlyContinue
} finally {
    Pop-Location
}

$ZipPath = Join-Path $BuildDir "CloudIsleMarket_v2.2_Win64.zip"
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}
Compress-Archive -Path @(
    (Join-Path $BuildDir "CloudIsleMarket.exe"),
    (Join-Path $BuildDir "CloudIsleMarket.pck")
) -DestinationPath $ZipPath -CompressionLevel Optimal

Write-Host "=================================================================="
Write-Host "[PACKAGE COMPLETE]"
Write-Host "  Executable : $BuildDir\CloudIsleMarket.exe"
Write-Host "  Data Pack  : $BuildDir\CloudIsleMarket.pck"
Write-Host "  ZIP Archive: $ZipPath"
Write-Host "=================================================================="
