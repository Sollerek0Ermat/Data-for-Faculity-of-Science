@echo off
chcp 65001 >nul
title CS Data - Frontend Server
color 0E

echo.
echo  +==============================================+
echo  ^|                                              ^|
echo  ^|      CS DATA - FRONTEND SERVER               ^|
echo  ^|          localhost:5500                      ^|
echo  ^|                                              ^|
echo  +==============================================+
echo.

cd /d "%~dp0"

echo  Starting frontend...
echo.

if exist node_modules (
    echo  Using http-server...
    npx http-server -p 5500 -c-1 -o
) else (
    echo  Using Python...
    python -m http.server 5500
)

echo.
echo  Server stopped.
pause