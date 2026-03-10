@echo off
echo ============================================
echo   CriptoSolution - Unified Trading Platform
echo ============================================
echo.

cd /d "%~dp0"

:menu
echo.
echo Select an option:
echo.
echo 1. Start all services (docker-compose up)
echo 2. Start in background (docker-compose up -d)
echo 3. Stop all services (docker-compose down)
echo 4. Stop and remove volumes (docker-compose down -v)
echo 5. View logs (docker-compose logs -f)
echo 6. Rebuild and start (docker-compose up --build)
echo 7. Restart specific service
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto startbg
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto stopvolumes
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto rebuild
if "%choice%"=="7" goto restart
if "%choice%"=="8" goto end
goto menu

:start
echo.
echo Starting all services...
docker-compose up
goto menu

:startbg
echo.
echo Starting services in background...
docker-compose up -d
echo.
echo Services started! Access:
echo - WandaNarabot Frontend: http://localhost:80
echo - ChatarrinHMM Frontend: http://localhost:9999
echo - WandaNarabot API: http://localhost:8000
echo - ChatarrinHMM API: http://localhost:9998
goto menu

:stop
echo.
echo Stopping all services...
docker-compose down
goto menu

:stopvolumes
echo.
echo WARNING: This will remove all data!
set /p confirm="Are you sure? (y/n): "
if /i "%confirm%"=="y" (
    docker-compose down -v
    echo.
    echo All data removed.
) else (
    echo Operation cancelled.
)
goto menu

:logs
echo.
echo Showing logs... Press Ctrl+C to return to menu
echo.
docker-compose logs -f
goto menu

:rebuild
echo.
echo Rebuilding and starting...
docker-compose up --build
goto menu

:restart
echo.
echo Services available:
echo 1. wanda-api
echo 2. wanda-trader
echo 3. wanda-worker
echo 4. wanda-frontend
echo 5. hmm-api
echo 6. hmm-worker
echo 7. hmm-frontend
echo 8. wanda-db
echo 9. hmm-db
echo 10. wanda-redis
echo 11. hmm-redis
echo.
set /p service="Enter service number to restart: "

if "%service%"=="1" docker-compose restart wanda-api
if "%service%"=="2" docker-compose restart wanda-trader
if "%service%"=="3" docker-compose restart wanda-worker
if "%service%"=="4" docker-compose restart wanda-frontend
if "%service%"=="5" docker-compose restart hmm-api
if "%service%"=="6" docker-compose restart hmm-worker
if "%service%"=="7" docker-compose restart hmm-frontend
if "%service%"=="8" docker-compose restart wanda-db
if "%service%"=="9" docker-compose restart hmm-db
if "%service%"=="10" docker-compose restart wanda-redis
if "%service%"=="11" docker-compose restart hmm-redis

echo Service restarted.
goto menu

:end
echo.
echo Goodbye!
echo.
