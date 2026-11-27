@echo off
rem Delete the local saves and persistent progress of this project (asks first, cannot be undone).
cd /d "%~dp0"
echo This deletes game\saves and "%APPDATA%\RenPy\SilentDetective-1683720000" (saves, unlocked CGs, endings, achievements).
choice /c YN /m "Continue"
if errorlevel 2 exit /b 1
if exist "game\saves" rmdir /s /q "game\saves"
if exist "%APPDATA%\RenPy\SilentDetective-1683720000" rmdir /s /q "%APPDATA%\RenPy\SilentDetective-1683720000"
mkdir "game\saves"
echo [OK] Progress reset.
