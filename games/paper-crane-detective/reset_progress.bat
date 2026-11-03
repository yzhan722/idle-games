@echo off
cd /d "%~dp0"
.\renpy-8.5.3-sdk\lib\py3-windows-x86_64\python.exe -c "import os, shutil, pathlib; [shutil.rmtree(p, ignore_errors=True) for p in [pathlib.Path('game/saves'), pathlib.Path(os.environ.get('APPDATA',''))/'RenPy'/'SilentDetective-1683720000']]; pathlib.Path('game/saves').mkdir(parents=True, exist_ok=True); print('[OK] All saves, unlocked CGs, endings, and achievements have been reset to 0!')"
