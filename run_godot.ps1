param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$PassThruArgs
)

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot
$GodotConsole = Join-Path $ProjectDir ".godot_bin\Godot_v4.3-stable_win64_console.exe"

if (-not (Test-Path $GodotConsole)) {
    Write-Error "Godot binary not found at $GodotConsole"
    exit 1
}

if ($PassThruArgs -contains "--self-test") {
    & $GodotConsole --path $ProjectDir -- --self-test
    exit $LASTEXITCODE
} else {
    & $GodotConsole --path $ProjectDir @PassThruArgs
    exit $LASTEXITCODE
}
