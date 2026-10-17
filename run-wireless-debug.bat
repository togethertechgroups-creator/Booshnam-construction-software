@echo off
setlocal enabledelayedexpansion
title Booshnam Wireless Debugger ^& Dev Runner

:: Setup Android SDK & Java Environment
if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
)
if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    set "PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%"
)

:: Run the interactive PowerShell Wireless Debugger
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wireless_debug.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ==============================================================
    echo  PowerShell execution had an issue. Running fallback ADB check:
    echo ==============================================================
    adb.exe devices -l
    echo.
    echo Setting up reverse ports directly:
    adb.exe reverse tcp:8081 tcp:8081
    adb.exe reverse tcp:8000 tcp:8000
    adb.exe reverse tcp:5173 tcp:5173
    echo.
    pause
)
