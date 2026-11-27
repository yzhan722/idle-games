@echo off
rem Launch the game directly (without the Ren'Py launcher).
cd /d "%~dp0"
if not defined RENPY_SDK set "RENPY_SDK=%~dp0renpy-8.5.3-sdk"
if not exist "%RENPY_SDK%\renpy.py" (
    echo Ren'Py SDK not found: "%RENPY_SDK%"
    echo The SDK is not part of this repository. Unpack it there or set RENPY_SDK, see the README.
    pause
    exit /b 2
)
start "" "%RENPY_SDK%\renpy.exe" "%~dp0."
