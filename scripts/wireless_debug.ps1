# ==============================================================================
# Booshnam Construction Platform - Wireless Debugger & Dev Runner
# Supports Android 11+ (Pairing Code) & Android 10/older (adb tcpip 5555)
# Configures ADB Reverse Port Forwarding for Metro (8081), Django (8000), Vite (5173)
# ==============================================================================

param (
    [string]$Action = "menu",
    [string]$DeviceIP = "",
    [string]$PairPort = "",
    [string]$PairCode = ""
)

# Colors and formatting helpers
function Write-Header($text) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "   $text" -ForegroundColor White
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success($text) {
    Write-Host " [SUCCESS] $text" -ForegroundColor Green
}

function Write-Info($text) {
    Write-Host " [INFO] $text" -ForegroundColor Cyan
}

function Write-Warn($text) {
    Write-Host " [WARN] $text" -ForegroundColor Yellow
}

function Write-ErrorMsg($text) {
    Write-Host " [ERROR] $text" -ForegroundColor Red
}

# 1. Locate ADB
function Get-AdbPath {
    $adbCmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCmd) {
        return $adbCmd.Source
    }

    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "C:\Android\Sdk\platform-tools\adb.exe",
        "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
    )

    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

$Adb = Get-AdbPath

if (-not $Adb) {
    Write-ErrorMsg "ADB (Android Debug Bridge) was not found!"
    Write-Warn "Please install Android Studio / SDK Platform-Tools or set ANDROID_HOME."
    exit 1
}

# 2. Get Host Local IPv4 Addresses
function Get-HostIPs {
    $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | 
           Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
           Select-Object -ExpandProperty IPAddress
    return $ips
}

# 3. Get Connected ADB Devices
function Get-ConnectedDevices {
    $raw = & $Adb devices -l
    $devices = @()
    foreach ($line in ($raw -split "`r?`n")) {
        $line = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("List of devices")) {
            continue
        }
        $parts = -split $line
        if ($parts.Count -ge 2) {
            $devices += [PSCustomObject]@{
                Serial = $parts[0]
                State  = $parts[1]
                Raw    = $line
            }
        }
    }
    return $devices
}

# 4. Get Phone Wi-Fi IP via ADB shell
function Get-PhoneIP {
    try {
        $out = & $Adb shell "ip -f inet addr show wlan0" 2>$null
        if ($out -match 'inet\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)') {
            return $matches[1]
        }
    } catch {}
    return $null
}

# 5. Reverse Port Forwarding
function Setup-ReversePorts {
    Write-Info "Setting up ADB reverse port forwarding for Booshnam..."
    
    $p8081 = & $Adb reverse tcp:8081 tcp:8081 2>&1
    $p8000 = & $Adb reverse tcp:8000 tcp:8000 2>&1
    $p5173 = & $Adb reverse tcp:5173 tcp:5173 2>&1

    Write-Success "Metro Bundler:  tcp:8081 -> host 8081  (React Native Bundle Server)"
    Write-Success "Django Backend: tcp:8000 -> host 8000  (SiteOps REST API)"
    Write-Success "Vite Frontend:  tcp:5173 -> host 5173  (Web Portal Mobile Preview)"
    
    Write-Host ""
    Write-Info "Active ADB Reverse Rules:"
    & $Adb reverse --list
}

# 6. Show Device Details
function Show-DeviceStatus {
    $devices = @(Get-ConnectedDevices)
    Write-Header "CURRENT DEVICE STATUS"

    $hostIps = Get-HostIPs
    Write-Host "Host PC Local IP(s):" -ForegroundColor White
    foreach ($ip in $hostIps) {
        Write-Host "  - http://$ip (Use this address on mobile Wi-Fi)" -ForegroundColor Green
    }
    Write-Host ""

    if ($devices.Count -eq 0) {
        Write-Warn "No Android devices currently attached to ADB."
        Write-Host "  - If using Android 11+: Choose Option 3 to pair via Wireless Debugging."
        Write-Host "  - If using USB cable: Plug in phone, enable USB Debugging, then choose Option 2."
        return
    }

    Write-Host "Connected Devices ($($devices.Count)):" -ForegroundColor White
    foreach ($dev in $devices) {
        $model = (& $Adb -s $dev.Serial shell "getprop ro.product.model" 2>$null).Trim()
        $androidVer = (& $Adb -s $dev.Serial shell "getprop ro.build.version.release" 2>$null).Trim()
        $phoneIp = Get-PhoneIP

        Write-Host "  [$($dev.Serial)]" -ForegroundColor Yellow
        Write-Host "    Model:       $model (Android $androidVer)"
        Write-Host "    State:       $($dev.State)"
        if ($phoneIp) {
            Write-Host "    Phone Wi-Fi: $phoneIp" -ForegroundColor Cyan
        }
    }
    Write-Host ""
}

# 7. Convert USB to Wireless (Android 10/any with USB)
function Switch-UsbToWireless {
    Write-Header "CONVERT USB TO WIRELESS (PORT 5555)"
    $devices = @(Get-ConnectedDevices)
    if ($devices.Count -eq 0) {
        Write-ErrorMsg "No device found. Please connect your Android phone via USB first!"
        return
    }

    Write-Info "Restarting ADB in TCP/IP mode on port 5555..."
    & $Adb tcpip 5555
    Start-Sleep -Seconds 2

    $phoneIp = Get-PhoneIP
    if (-not $phoneIp) {
        Write-Host ""
        $phoneIp = Read-Host " Enter your phone's Wi-Fi IP address (e.g., 192.168.1.12)"
    } else {
        Write-Info "Auto-detected phone Wi-Fi IP: $phoneIp"
    }

    if ([string]::IsNullOrWhiteSpace($phoneIp)) {
        Write-ErrorMsg "No phone IP provided."
        return
    }

    Write-Info "Connecting wirelessly to $phoneIp:5555..."
    $res = & $Adb connect "$phoneIp:5555"
    Write-Host $res -ForegroundColor Green

    Setup-ReversePorts
    Write-Success "Wireless connection established! You can now UNPLUG your USB cable!"
}

# 8. Android 11+ Wireless Debugging Pairing
function Pair-Android11 {
    Write-Header "ANDROID 11+ WIRELESS PAIRING"
    Write-Host "Instructions on your Android phone:" -ForegroundColor White
    Write-Host "  1. Open 'Settings' -> 'Developer Options'."
    Write-Host "  2. Enable 'Wireless Debugging' (ensure phone is on same Wi-Fi network)."
    Write-Host "  3. Tap 'Pair device with pairing code'."
    Write-Host "  4. Look at the pop-up showing IP address, Port, and 6-digit Wi-Fi pairing code."
    Write-Host ""

    $hostIps = Get-HostIPs
    Write-Info "Your PC is at: $($hostIps -join ', ')"
    Write-Host ""

    $pairEndpoint = Read-Host " Enter IP and Port from the pairing popup (e.g. 192.168.1.12:37891)"
    if ([string]::IsNullOrWhiteSpace($pairEndpoint)) {
        Write-ErrorMsg "Pair endpoint cannot be empty."
        return
    }

    $code = Read-Host " Enter the 6-digit pairing code (e.g. 123456)"
    if ([string]::IsNullOrWhiteSpace($code)) {
        Write-ErrorMsg "Pairing code cannot be empty."
        return
    }

    Write-Info "Pairing device with $pairEndpoint..."
    $pairResult = & $Adb pair $pairEndpoint $code
    Write-Host $pairResult -ForegroundColor Green

    Write-Host ""
    Write-Host "Now look at the main 'Wireless Debugging' screen for the connection port." -ForegroundColor Yellow
    Write-Host "(Note: The connection port is often different from the pairing port!)" -ForegroundColor Gray
    Write-Host ""
    
    $connectEndpoint = Read-Host " Enter connection IP:Port (e.g. 192.168.1.12:41235) [Press Enter to reuse $pairEndpoint]"
    if ([string]::IsNullOrWhiteSpace($connectEndpoint)) {
        $connectEndpoint = $pairEndpoint
    }

    Write-Info "Connecting to $connectEndpoint..."
    $connectResult = & $Adb connect $connectEndpoint
    Write-Host $connectResult -ForegroundColor Green

    Setup-ReversePorts
    Write-Success "Device paired and connected wirelessly!"
}

# 9. Direct Connect to Known IP:Port
function Connect-DirectIP {
    Write-Header "DIRECT CONNECT TO WIRELESS ADB"
    $phoneIp = Get-PhoneIP
    if ($phoneIp) {
        Write-Host "Auto-detected IP from attached device: $phoneIp" -ForegroundColor Cyan
    }

    $target = Read-Host " Enter phone IP:port (e.g. 192.168.1.12:5555 or 192.168.1.12:41235)"
    if ([string]::IsNullOrWhiteSpace($target)) {
        if ($phoneIp) {
            $target = "$phoneIp:5555"
        } else {
            Write-ErrorMsg "Target cannot be empty."
            return
        }
    }

    if ($target -notmatch ":") {
        $target = "$target:5555"
    }

    Write-Info "Connecting to $target..."
    $res = & $Adb connect $target
    Write-Host $res -ForegroundColor Green

    Setup-ReversePorts
}

# 10. Open In-App Dev Menu
function Open-DevMenu {
    Write-Info "Triggering React Native Developer Menu on connected phone..."
    & $Adb shell input keyevent 82
    Write-Success "Sent 'Menu' keyevent (82) to device. The React Native Dev Menu should appear on screen!"
}

# 11. Run Live Logcat for React Native
function Show-Logs {
    Write-Header "LIVE REACT NATIVE WIRELESS LOGS (Ctrl+C to stop)"
    Write-Info "Filtering logs for ReactNative, ReactNativeJS, and Booshnam..."
    & $Adb logcat -v time -s ReactNative:V ReactNativeJS:V Booshnam:V System.out:I
}

# 12. Start Metro Bundler on All Interfaces
function Start-Metro {
    Write-Header "STARTING METRO BUNDLER ON LAN (0.0.0.0:8081)"
    Setup-ReversePorts
    $mobileDir = Join-Path $PSScriptRoot "..\mobile"
    Set-Location $mobileDir
    Write-Info "Starting React Native Metro Bundler on all interfaces..."
    npx react-native start --host 0.0.0.0
}

# 13. Build & Run Android App Wirelessly
function Run-Android {
    Write-Header "BUILDING & LAUNCHING ANDROID APP WIRELESSLY"
    Setup-ReversePorts
    
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    
    $mobileDir = Join-Path $PSScriptRoot "..\mobile"
    Set-Location $mobileDir
    Write-Info "Building debug APK and launching on wireless device..."
    npx react-native run-android
}

# 14. Disconnect all wireless devices
function Disconnect-All {
    Write-Info "Disconnecting all wireless ADB connections..."
    & $Adb disconnect
    Write-Success "Disconnected."
}

# ------------------------------------------------------------------------------
# Dispatch based on $Action
# ------------------------------------------------------------------------------
switch ($Action.ToLower()) {
    "status" {
        Show-DeviceStatus
        exit 0
    }
    "reverse" {
        Setup-ReversePorts
        exit 0
    }
    "switch-usb" {
        Switch-UsbToWireless
        exit 0
    }
    "pair" {
        Pair-Android11
        exit 0
    }
    "connect" {
        Connect-DirectIP
        exit 0
    }
    "menu-dev" {
        Open-DevMenu
        exit 0
    }
    "logs" {
        Show-Logs
        exit 0
    }
    "start-metro" {
        Start-Metro
        exit 0
    }
    "run-android" {
        Run-Android
        exit 0
    }
    "disconnect" {
        Disconnect-All
        exit 0
    }
    Default {
        # Interactive Menu
        while ($true) {
            Clear-Host
            Write-Header "BOOSHNAM WIRELESS DEBUGGER & DEV RUNNER"
            Show-DeviceStatus

            Write-Host "Select an option:" -ForegroundColor White
            Write-Host "  [1]  Auto Setup & Reverse Ports (Metro:8081, Django:8000, Vite:5173)" -ForegroundColor Green
            Write-Host "  [2]  Convert USB connection to Wireless (adb tcpip 5555)" -ForegroundColor Cyan
            Write-Host "  [3]  Pair new Android 11+ phone via Wireless Debugging (Pairing Code)" -ForegroundColor Cyan
            Write-Host "  [4]  Connect directly to Phone IP:Port" -ForegroundColor Cyan
            Write-Host "  [5]  Trigger React Native Dev Menu on phone screen" -ForegroundColor Yellow
            Write-Host "  [6]  Start Metro Bundler on LAN (0.0.0.0:8081)" -ForegroundColor White
            Write-Host "  [7]  Build & Deploy Android App Wirelessly (run-android)" -ForegroundColor White
            Write-Host "  [8]  View Live React Native Logcat" -ForegroundColor White
            Write-Host "  [9]  Disconnect all wireless devices" -ForegroundColor Red
            Write-Host "  [0]  Exit" -ForegroundColor Gray
            Write-Host ""

            $choice = Read-Host "Enter option number [0-9]"
            switch ($choice) {
                "1" { Setup-ReversePorts; Pause }
                "2" { Switch-UsbToWireless; Pause }
                "3" { Pair-Android11; Pause }
                "4" { Connect-DirectIP; Pause }
                "5" { Open-DevMenu; Pause }
                "6" { Start-Metro; break }
                "7" { Run-Android; Pause }
                "8" { Show-Logs }
                "9" { Disconnect-All; Pause }
                "0" { exit 0 }
                Default { Write-Warn "Invalid choice. Please choose 0-9."; Start-Sleep -Seconds 1 }
            }
        }
    }
}
