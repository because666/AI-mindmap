@echo off
chcp 65001 >nul
echo 正在启动思流图前端服务...
echo.
cd /d "%~dp0\frontend"
echo 安装依赖（如果需要）...
call npm install
echo.
echo 启动开发服务器...
call npm run dev
echo.
pause
