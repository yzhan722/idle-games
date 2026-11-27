# Builds the release package. Needs the Godot 4.3 export templates (Editor > Manage Export Templates).
#   .\package_win64.ps1            export + zip
#   .\package_win64.ps1 -SelfTest  also run the packaged self-test on a hidden, muted desktop
param([switch]$SelfTest)
$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot
$BuildDir = Join-Path $ProjectDir "build"
$GodotConsole = Join-Path $ProjectDir ".godot_bin\Godot_v4.3-stable_win64_console.exe"
$Template = Join-Path $env:APPDATA "Godot\export_templates\4.3.stable\windows_release_x86_64.exe"
$Exe = Join-Path $BuildDir "CloudIsleMarket.exe"

if (-not (Test-Path $GodotConsole)) {
    Write-Host "Godot 4.3 console binary not found: $GodotConsole"
    exit 2
}
# The editor binary must never be shipped as the game: without templates there is no release build.
if (-not (Test-Path $Template)) {
    Write-Host "Export template not found: $Template"
    Write-Host "Install the Godot 4.3 stable export templates, then run this script again."
    exit 2
}
if (-not (Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
}

Write-Host "[1/3] Exporting release build (resource pack embedded)..."
& $GodotConsole --headless --path $ProjectDir --export-release "Windows Desktop" $Exe
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $Exe)) {
    Write-Host "Release export failed."
    exit 1
}

if ($SelfTest) {
    Write-Host "[2/3] Packaged self-test on a hidden desktop..."
    $Log = Join-Path $BuildDir "selftest.log"
    & python (Join-Path $ProjectDir "tools\hidden_run.py") --cwd $BuildDir --log $Log --timeout 600 -- $Exe --audio-driver Dummy -- --self-test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Packaged self-test failed, see $Log"
        exit 1
    }
} else {
    Write-Host "[2/3] Self-test skipped (pass -SelfTest to run it)."
}

Write-Host "[3/3] Creating the archive..."
$Version = [regex]::Match((Get-Content (Join-Path $ProjectDir "project.godot") -Raw -Encoding UTF8), 'config/version="([^"]+)"').Groups[1].Value
$ZipPath = Join-Path $BuildDir "CloudIsleMarket_v$($Version)_Win64.zip"
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}
Compress-Archive -Path @($Exe, (Join-Path $ProjectDir "assets\fonts\LICENSE-OFL.txt")) -DestinationPath $ZipPath -CompressionLevel Optimal
Write-Host "Executable : $Exe"
Write-Host "Archive    : $ZipPath"
