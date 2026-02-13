@echo off
chcp 65001 >nul
echo 正在启动思流图后端服务...
echo.
cd /d "%~dp0"
python start_backend.py
pause
