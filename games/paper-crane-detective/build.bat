@echo off
rem Build the release packages: SDK check, static check, lint, distribute (win + mac + linux), artefact check.
rem All steps live in tools\build_release.ps1; arguments are passed on, e.g.  build.bat -Packages win
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build_release.ps1" %*
exit /b %ERRORLEVEL%
