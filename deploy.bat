@echo off
setlocal

cd /d "%~dp0public\server"
npm run deploy:build

echo.
echo Single Node deploy bundle ready at public\server\dist
