@echo off
echo ====================================
echo    WhatsApp Chatbot - Instalador
echo ====================================
echo.

echo [1/3] Instalando dependencias del backend...
call npm install

echo.
echo [2/3] Instalando dependencias del frontend...
cd client
call npm install
cd ..

echo.
echo [3/3] Verificando MongoDB...
echo Asegurate de tener MongoDB instalado y corriendo
echo O configura MongoDB Atlas en el archivo .env

echo.
echo ====================================
echo    Instalacion Completada!
echo ====================================
echo.
echo Proximos pasos:
echo 1. Edita el archivo .env con tus credenciales
echo 2. Ejecuta: npm run dev (en una terminal)
echo 3. Ejecuta: cd client ^&^& npm start (en otra terminal)
echo 4. Abre http://localhost:3000
echo.
echo Consulta INICIO_RAPIDO.md para mas detalles
echo.
pause
