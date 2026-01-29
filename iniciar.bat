@echo off
echo ====================================
echo    Iniciando WhatsApp Chatbot
echo ====================================
echo.

echo [Backend] Iniciando servidor en puerto 5000...
start cmd /k "cd /d %~dp0 && npm run dev"

timeout /t 3 /nobreak >nul

echo [Frontend] Iniciando aplicacion React en puerto 3000...
start cmd /k "cd /d %~dp0\client && npm start"

echo.
echo ====================================
echo    Servidores Iniciados!
echo ====================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Se abriran 2 ventanas de terminal.
echo No las cierres mientras uses la aplicacion.
echo.
pause
