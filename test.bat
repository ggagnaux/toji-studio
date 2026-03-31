@echo off
setlocal

cd /d "%~dp0public\server"
npm run test
