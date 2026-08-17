@echo off
setlocal EnableDelayedExpansion
title Kort ERP - Arranque local
cd /d "%~dp0"

set FRONTEND_URL=http://localhost:5173
set BACKEND_URL=http://localhost:4000

echo ============================================
echo   Kort ERP - Script de arranque local
echo ============================================
echo.

REM --- 1. Docker ---
echo [1/6] Verificando que Docker este corriendo...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Docker no esta corriendo o no esta instalado.
    echo         Abri Docker Desktop, espera a que termine de iniciar y volve a
    echo         ejecutar este script.
    echo.
    pause
    exit /b 1
)
echo       Docker esta corriendo. OK.
echo.

REM --- 2. PostgreSQL via docker compose ---
echo [2/6] Levantando PostgreSQL (docker compose)...
docker compose version >nul 2>&1
if errorlevel 1 (
    set COMPOSE_CMD=docker-compose
) else (
    set COMPOSE_CMD=docker compose
)

!COMPOSE_CMD! up -d
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo levantar el contenedor de PostgreSQL.
    echo         Revisa docker-compose.yml y que el puerto 5432 no este ocupado
    echo         por otro proceso.
    echo.
    pause
    exit /b 1
)
echo       PostgreSQL esta levantado (si ya estaba corriendo, no se reinicio). OK.
echo.

REM --- 3. Dependencias ---
REM Este es un monorepo con npm workspaces (backend y frontend declarados en el
REM package.json de la raiz), asi que "npm install" se corre una sola vez desde
REM la raiz e instala las dependencias de ambos paquetes.
echo [3/6] Verificando dependencias de backend y frontend...
if not exist "node_modules" (
    echo       Instalando dependencias de backend y frontend, esto puede tardar unos minutos...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo.
        echo [ERROR] Fallo "npm install". Revisa el mensaje de arriba.
        pause
        exit /b 1
    )
    echo       Dependencias instaladas. OK.
) else (
    echo       Las dependencias ya estan instaladas ^(node_modules existe^), se omite instalacion.
)
echo.

REM --- 4. Variables de entorno + migraciones de Prisma ---
echo [4/6] Preparando base de datos (Prisma)...
if not exist "backend\.env" (
    echo       No existe backend\.env, se crea a partir de backend\.env.example...
    copy /y "backend\.env.example" "backend\.env" >nul
)

pushd backend
if not exist "prisma\migrations" (
    echo       No hay migraciones previas: creando la migracion inicial...
    call npx prisma migrate dev --name init
) else (
    echo       Aplicando migraciones pendientes...
    call npx prisma migrate deploy
)
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudieron aplicar las migraciones de Prisma.
    echo         Revisa que PostgreSQL este accesible y que backend\.env tenga
    echo         el DATABASE_URL correcto ^(coincide con docker-compose.yml^).
    popd
    pause
    exit /b 1
)
call npx prisma generate >nul
popd
echo       Base de datos lista. OK.
echo.

REM --- 5. Backend ---
echo [5/6] Levantando backend en una ventana aparte...
start "Kort - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
echo       Backend iniciandose en %BACKEND_URL%
echo.

REM --- 6. Frontend ---
echo [6/6] Levantando frontend en una ventana aparte...
start "Kort - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo       Frontend iniciandose en %FRONTEND_URL%
echo.

echo Esperando a que el frontend responda en %FRONTEND_URL% ...
set MAX_TRIES=40
set TRIES=0

:waitloop
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%FRONTEND_URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto openbrowser
set /a TRIES+=1
if !TRIES! GEQ %MAX_TRIES% (
    echo.
    echo [AVISO] El frontend todavia no respondio despues de un rato de espera.
    echo         Revisa la ventana "Kort - Frontend" por si hay algun error.
    echo         Se abre el navegador de todas formas...
    goto openbrowser
)
timeout /t 2 >nul
goto waitloop

:openbrowser
start "" "%FRONTEND_URL%"
echo.
echo ============================================
echo   Kort ERP esta corriendo.
echo   Backend:  %BACKEND_URL%
echo   Frontend: %FRONTEND_URL%
echo.
echo   Para detener el sistema, cerra las ventanas
echo   "Kort - Backend" y "Kort - Frontend".
echo ============================================
echo.
pause
endlocal
