<#
.SYNOPSIS
  《沉默侦探：千纸鹤的约定》打包脚本：检查 SDK → 静态检查 → lint → 三平台 distribute → 核对产物清单。

.DESCRIPTION
  不下载任何东西。Ren'Py SDK 不在仓库里，要自己准备（见 README「仓库里没有的东西」），
  用 -SdkPath 或环境变量 RENPY_SDK 指到解压后的目录；都没给时找项目目录下的 renpy-<版本>-sdk。
  打包在项目目录之外的临时工程里进行：只复制 game/ 与 icon.ico，不带存档、缓存、测试，也不在仓库里留下 .rpyc。

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\build_release.ps1 -SdkPath D:\renpy-8.5.3-sdk
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\build_release.ps1 -Packages win
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\build_release.ps1 -CheckOnly

.EXAMPLE
  更新已发行的版本时，带上一版留下的编译脚本，否则玩家的旧存档对不上原来的语句：
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\build_release.ps1 -OldGame D:\release\1.0.0\old-game

.NOTES
  退出码：0 成功；2 缺 SDK；3 SDK 版本不符；4 项目文件不全；5 静态检查 / lint 没过；6 打包失败；7 产物核对没过。
#>
[CmdletBinding()]
param(
    [string]$SdkPath = $env:RENPY_SDK,
    [string[]]$Packages = @('win', 'mac', 'linux'),
    [string]$OutDir,
    [string]$OldGame,
    [string]$EngineVersion = '8.5.3',
    [switch]$AllowOtherEngine,
    [switch]$SkipLint,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$GameDir = Join-Path $ProjectRoot 'game'

function Stop-Build([int]$Code, [string]$Message) {
    Write-Host ''
    Write-Host "[停止] $Message" -ForegroundColor Red
    exit $Code
}

function Write-Step([string]$Message) {
    Write-Host ''
    Write-Host "== $Message" -ForegroundColor Cyan
}

# ---------------------------------------------------------------- 1. 项目文件
Write-Step '检查项目文件'
$Options = Join-Path $GameDir 'options.rpy'
foreach ($Need in @($Options, (Join-Path $GameDir 'script.rpy'), (Join-Path $ProjectRoot 'icon.ico'),
                    (Join-Path $GameDir 'presplash.png'), (Join-Path $GameDir 'gui\window_icon.png'),
                    (Join-Path $GameDir 'fonts\LICENSE-OFL.txt'))) {
    if (-not (Test-Path -LiteralPath $Need)) { Stop-Build 4 "缺少文件：$Need" }
}
$OptionsText = [IO.File]::ReadAllText($Options, [Text.Encoding]::UTF8)
$VersionMatch = [regex]::Match($OptionsText, '(?m)^define config\.version = "([^"]+)"')
$NameMatch = [regex]::Match($OptionsText, '(?m)^define build\.name = "([^"]+)"')
if (-not $VersionMatch.Success -or -not $NameMatch.Success) { Stop-Build 4 'options.rpy 里读不到 config.version 或 build.name' }
$GameVersion = $VersionMatch.Groups[1].Value
$BuildName = $NameMatch.Groups[1].Value
Write-Host "游戏版本 $GameVersion，包名 $BuildName"

# -File 方式调用时 win,mac 会当成一个字符串传进来
$Packages = @($Packages | ForEach-Object { $_ -split '[,\s]+' } | Where-Object { $_ })
$Bad = @($Packages | Where-Object { $_ -notin @('win', 'mac', 'linux', 'pc', 'market') })
if ($Bad.Count) { Stop-Build 4 "不认识的包类型：$($Bad -join ', ')（可用：win mac linux pc market）" }

# ---------------------------------------------------------------- 2. SDK
Write-Step '检查 Ren''Py SDK'
if (-not $SdkPath) {
    $SdkPath = Join-Path $ProjectRoot "renpy-$EngineVersion-sdk"
}
$RenpyPy = Join-Path $SdkPath 'renpy.py'
$Python = Join-Path $SdkPath 'lib\py3-windows-x86_64\python.exe'
$Launcher = Join-Path $SdkPath 'launcher'
$Missing = @($RenpyPy, $Python, $Launcher | Where-Object { -not (Test-Path -LiteralPath $_) })
if ($Missing.Count) {
    Write-Host "没有找到可用的 Ren'Py SDK：$SdkPath"
    Write-Host '缺少：'
    $Missing | ForEach-Object { Write-Host "  $_" }
    Write-Host ''
    Write-Host '准备办法（本脚本不会替你下载）：'
    Write-Host "  1. 到 Ren'Py 官网下载 $EngineVersion 的 SDK（Windows 版）并解压；"
    Write-Host '  2. 运行时加 -SdkPath <解压后的目录>，或设环境变量 RENPY_SDK，'
    Write-Host "     或把它放到 $ProjectRoot\renpy-$EngineVersion-sdk（已在 .gitignore 里）。"
    Stop-Build 2 "缺少 Ren'Py SDK"
}
$EngineText = (& $Python $RenpyPy --version | Out-String).Trim()
Write-Host "引擎：$EngineText"
if ($EngineText -notmatch [regex]::Escape($EngineVersion)) {
    if ($AllowOtherEngine) {
        Write-Host "注意：不是 $EngineVersion，按 -AllowOtherEngine 继续" -ForegroundColor Yellow
    } else {
        Stop-Build 3 "SDK 版本不是 $EngineVersion（要用别的版本请加 -AllowOtherEngine，并重新跑一遍四条路线回归）"
    }
}

# ---------------------------------------------------------------- 3. 静态检查
Write-Step '静态检查'
$env:PYTHONDONTWRITEBYTECODE = '1'
& $Python (Join-Path $ProjectRoot 'tests\rpy_syntax.py')
if ($LASTEXITCODE -ne 0) { Stop-Build 5 'tests\rpy_syntax.py 报告了问题' }

# ---------------------------------------------------------------- 4. 临时工程
if (-not $OutDir) {
    # 放在仓库外面，避免打包产物混进仓库
    $RepoParent = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $ProjectRoot))
    $OutDir = Join-Path $RepoParent '_release\paper-crane-detective'
}
$OutDir = [IO.Path]::GetFullPath($OutDir)
if ($OutDir.TrimEnd('\') -eq $ProjectRoot.TrimEnd('\') -or $OutDir.StartsWith($GameDir, [StringComparison]::OrdinalIgnoreCase)) {
    Stop-Build 4 "输出目录不能是项目目录本身或 game 目录：$OutDir"
}
$Stage = Join-Path $OutDir '_stage'
$Dest = Join-Path $OutDir $GameVersion
Write-Step "准备临时工程 $Stage"
if (Test-Path -LiteralPath $Stage) { Remove-Item -LiteralPath $Stage -Recurse -Force -Confirm:$false }
New-Item -ItemType Directory -Force -Path $Stage, $Dest | Out-Null
$RoboLog = & robocopy $GameDir (Join-Path $Stage 'game') /E /NFL /NDL /NJH /NJS /NP /XD saves cache tests _saves_backup /XF *.rpyc *.rpyb *.bak *~
if ($LASTEXITCODE -ge 8) { $RoboLog | Out-Host; Stop-Build 4 '复制 game 目录失败' }
Copy-Item -LiteralPath (Join-Path $ProjectRoot 'icon.ico') -Destination $Stage
if ($OldGame) {
    # Ren'Py 编译时读 old-game 里上一版的 .rpyc，没改过的语句沿用原来的编号（旧存档靠它定位）
    if (-not (Test-Path -LiteralPath (Join-Path $OldGame 'script.rpyc'))) { Stop-Build 4 "-OldGame 里没有 script.rpyc：$OldGame" }
    $RoboLog = & robocopy $OldGame (Join-Path $Stage 'old-game') *.rpyc /E /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { $RoboLog | Out-Host; Stop-Build 4 '复制 old-game 失败' }
} else {
    Write-Host '没有给 -OldGame：首发可以；更新已发行的版本会让玩家的旧存档失效' -ForegroundColor Yellow
}

# ---------------------------------------------------------------- 5. lint
if ($SkipLint) {
    Write-Host '按 -SkipLint 跳过 lint' -ForegroundColor Yellow
} else {
    Write-Step 'lint'
    $LintLog = Join-Path $Dest 'lint.txt'
    & $Python $RenpyPy $Stage lint $LintLog --error-code
    $LintExit = $LASTEXITCODE
    if (Test-Path -LiteralPath $LintLog) { Get-Content -LiteralPath $LintLog -Encoding UTF8 -Tail 25 | Out-Host }
    if ($LintExit -ne 0) { Stop-Build 5 "lint 没过，完整报告：$LintLog" }
}

if ($CheckOnly) {
    Write-Host ''
    Write-Host '[完成] 只检查，不打包' -ForegroundColor Green
    exit 0
}

# ---------------------------------------------------------------- 6. distribute
Write-Step "打包：$($Packages -join ', ')"
$DistArgs = @($RenpyPy, $Launcher, 'distribute', $Stage, '--destination', $Dest, '--no-update')
foreach ($P in $Packages) { $DistArgs += @('--package', $P) }
& $Python @DistArgs
if ($LASTEXITCODE -ne 0) { Stop-Build 6 'distribute 失败，看上面的输出' }

# ---------------------------------------------------------------- 7. 产物清单
Write-Step '核对产物'
$Expected = @{ win = "$BuildName-$GameVersion-win.zip"; mac = "$BuildName-$GameVersion-mac.zip";
               linux = "$BuildName-$GameVersion-linux.tar.bz2"; pc = "$BuildName-$GameVersion-pc.zip";
               market = "$BuildName-$GameVersion-market.zip" }
$Report = @()
foreach ($P in $Packages) {
    $File = Join-Path $Dest $Expected[$P]
    if (-not (Test-Path -LiteralPath $File)) { Stop-Build 7 "没有生成 $($Expected[$P])" }
    $Info = Get-Item -LiteralPath $File
    if ($Info.Length -lt 20MB) { Stop-Build 7 "$($Info.Name) 只有 $([math]::Round($Info.Length / 1MB, 1)) MB，内容不全" }
    $Hash = (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash
    $Report += [pscustomobject]@{ Package = $P; File = $Info.Name; MB = [math]::Round($Info.Length / 1MB, 1); SHA256 = $Hash }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($P in @($Packages | Where-Object { $Expected[$_] -like '*.zip' })) {
    $Zip = [IO.Compression.ZipFile]::OpenRead((Join-Path $Dest $Expected[$P]))
    try {
        $Entries = @($Zip.Entries | ForEach-Object { $_.FullName })
    } finally {
        $Zip.Dispose()
    }
    foreach ($Must in @('game/archive.rpa', 'game/fonts/LICENSE-OFL.txt', 'game/presplash.png')) {
        if (-not ($Entries | Where-Object { $_ -like "*$Must" })) { Stop-Build 7 "$P 包里没有 $Must" }
    }
    if ($P -in @('win', 'pc') -and -not ($Entries | Where-Object { $_ -like "*/$BuildName.exe" })) { Stop-Build 7 "$P 包里没有 $BuildName.exe" }
    $Leaked = @($Entries | Where-Object {
        ($_ -match '/game/(tests|saves|cache)/.') -or ($_ -match '/game/.*\.(rpy|bak)$') -or
        (($_ -notmatch '/(renpy|lib)/') -and (($_ -match '/(docs|tools|tests|steam_kit)/.') -or ($_ -match '/[^/]+\.(md|bat|ps1|log)$')))
    })
    if ($Leaked.Count) {
        $Leaked | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
        Stop-Build 7 "$P 包里混进了不该发布的文件（$($Leaked.Count) 个）"
    }
}
# 留下这一版编译出的 .rpyc，下一版打包时用 -OldGame 指到这里
$RoboLog = & robocopy (Join-Path $Stage 'game') (Join-Path $Dest 'old-game') *.rpyc /E /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -ge 8) { $RoboLog | Out-Host; Stop-Build 7 '保存 old-game 失败' }
Remove-Item -LiteralPath $Stage -Recurse -Force -Confirm:$false
$Report | Format-Table -AutoSize | Out-Host
$Report | ConvertTo-Json | Out-File -FilePath (Join-Path $Dest 'manifest.json') -Encoding utf8
Write-Host "[完成] 产物在 $Dest" -ForegroundColor Green
Write-Host '接下来（人工）：三个平台各装一次，从头跑四条路线，再看一遍片尾、成就与案卷。'
exit 0
