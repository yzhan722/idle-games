@echo off
rem Launch the game directly (without the Ren'Py launcher).
cd /d "%~dp0"
start "" "renpy-8.5.3-sdk\renpy.exe" "%~dp0."
