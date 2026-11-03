@echo off
rem Build the distributions into dists\ (SDK / assets / tools / docs / tests are excluded in options.rpy).
rem Default: Windows + macOS + Linux. Pass package names to build a subset, e.g.  build.bat win
cd /d "%~dp0"
set PKGS=--package win --package mac --package linux
if not "%~1"=="" (
    set PKGS=
    for %%p in (%*) do call set PKGS=%%PKGS%% --package %%p
)
"renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe" "renpy-8.5.3-sdk\renpy.py" "renpy-8.5.3-sdk\launcher" distribute "%~dp0." --destination "%~dp0dists" %PKGS%
if exist "%~dp0dists\SilentDetective-1.0.0-win.zip" (
    "renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe" -c "import os, shutil, zipfile; d=r'%~dp0dists\SilentDetective-1.0.0-win'; shutil.rmtree(d, ignore_errors=True); zipfile.ZipFile(r'%~dp0dists\SilentDetective-1.0.0-win.zip').extractall(r'%~dp0dists')"
)
