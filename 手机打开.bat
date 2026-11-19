@echo off
cd /d "%~dp0"
title Anatomy Study Site - phone access
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
