@echo off
rem Static check: compile all .rpy files and report undefined images / labels / variables.
cd /d "%~dp0"
"renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe" "renpy-8.5.3-sdk\renpy.py" "%~dp0." lint
pause
