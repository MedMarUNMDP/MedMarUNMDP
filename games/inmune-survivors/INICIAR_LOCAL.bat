@echo off
setlocal
cd /d "%~dp0"
title Inmune Survivors v3.5

py -c "import sys" >nul 2>nul
if not errorlevel 1 (
  py "%~dp0iniciar_juego.py"
  goto :eof
)
python -c "import sys" >nul 2>nul
if not errorlevel 1 (
  python "%~dp0iniciar_juego.py"
  goto :eof
)

echo No se encontro Python. Instala Python para iniciar el juego.
pause




