# Maple Isle Idle - Godot 4 One-Click Launcher
# Automatically locates Godot 4 or downloads Godot 4.3 Portable (win64) if not installed.

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PortableGodotDir = Join-Path $ProjectDir ".godot_bin"
$PortableGodotExe = Join-Path $PortableGodotDir "Godot_v4.3-stable_win64.exe"

# 1. Regenerate Pixel Art assets if missing
if (-not (Test-Path (Join-Path $ProjectDir "assets\pixel_art\islands\island_henesys.png"))) {
    Write-Host "[1/2] Generating MapleStory-style Pixel Art Assets..." -ForegroundColor Cyan
    python (Join-Path $ProjectDir "tools\generate_pixel_art.py")
}

# 2. Check for Godot 4 in PATH or Portable folder
$GodotCmd = Get-Command godot4, godot -ErrorAction SilentlyContinue | Select-Object -First 1
if ($GodotCmd) {
    $ExePath = $GodotCmd.Source
} elseif (Test-Path $PortableGodotExe) {
    $ExePath = $PortableGodotExe
} else {
    Write-Host "Godot 4 not found in PATH. Downloading Godot 4.3 Portable..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $PortableGodotDir | Out-Null
    $ZipPath = Join-Path $PortableGodotDir "godot43.zip"
    $Url = "https://github.com/godotengine/godot/releases/download/4.3-stable/Godot_v4.3-stable_win64.exe.zip"
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath
    Expand-Archive -Path $ZipPath -DestinationPath $PortableGodotDir -Force
    Remove-Item $ZipPath -Force
    $ExePath = $PortableGodotExe
}

Write-Host "Launching Maple Isle Idle with: $ExePath" -ForegroundColor Green
& $ExePath --path $ProjectDir
