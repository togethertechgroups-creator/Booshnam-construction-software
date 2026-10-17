@echo off
setlocal enabledelayedexpansion

if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
)
if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
    set "PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%"
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0wireless_debug.ps1" %*
