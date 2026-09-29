@echo off
echo Starting Booshnam Mobile App on Connected Device...
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
cd mobile
npm run android
pause
