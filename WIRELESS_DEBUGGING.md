# Booshnam Construction Platform - Wireless Debugging Guide 📶

This guide explains how to debug both the **React Native Android Mobile App** and the **Vite Web Portal** completely wirelessly over your local Wi-Fi without needing a USB cable.

---

## ⚡ 1-Click Quick Start

We have added a one-click automated Wireless Debugger:

1. In Windows Explorer, simply double-click:
   ```cmd
   run-wireless-debug.bat
   ```
   *or from your terminal:*
   ```bash
   npm run debug:wireless
   ```

2. The interactive runner automatically:
   - Detects your PC's local Wi-Fi IP (e.g., `192.168.1.13`)
   - Locates `adb.exe` in your Android SDK
   - Displays all connected wireless devices
   - Automatically sets up **ADB Reverse Port Forwarding** for:
     - **Port 8081**: React Native Metro Bundler
     - **Port 8000**: Django REST API Backend
     - **Port 5173**: Vite Web Application

---

## 📱 Method 1: Android 11, 12, 13, 14, 15, 16 (No USB Cable Ever Needed)

Modern Android devices support native wireless pairing using Wi-Fi:

### Step 1: Enable Wireless Debugging on Phone
1. Connect your phone to the **same Wi-Fi network** as your development PC.
2. Go to **Settings** ➡️ **About phone** ➡️ Tap **Build number** 7 times to enable **Developer Options**.
3. Go to **Settings** ➡️ **System** / **Additional Settings** ➡️ **Developer Options**.
4. Scroll down and turn on **Wireless debugging** (tap **Allow** on the pop-up).

### Step 2: Pair with PC
1. Tap on the text **"Wireless debugging"** (not just the toggle) to open its settings.
2. Tap **"Pair device with pairing code"**.
3. A dialog appears showing:
   - **IP address & Port** (e.g., `192.168.1.12:37891`)
   - **Wi-Fi pairing code** (e.g., `482910`)
4. In `run-wireless-debug.bat`, choose **Option 3** (or run `adb pair <IP>:<PORT> <code>`).
5. After pairing succeeds, look at the main Wireless Debugging screen for the **connection IP and Port** (e.g., `192.168.1.12:41235`), then enter it to connect.
6. The script will automatically configure reverse port forwarding (`8081`, `8000`, `5173`).

---

## 🔌 Method 2: Android 10 or Older (Connect USB Cable Once)

If your device is running Android 10 or older:

1. Plug your phone into your PC with a USB cable once.
2. In `run-wireless-debug.bat`, choose **Option 2: Convert USB connection to Wireless**.
3. The script executes:
   ```cmd
   adb tcpip 5555
   adb connect <PHONE_IP>:5555
   ```
4. **Unplug your USB cable!** Your phone is now debugging wirelessly over port 5555.

---

## 🔄 ADB Reverse Port Forwarding Explained

When testing a mobile app on a physical phone:
- Physical phones treat `http://localhost:8000` as the phone itself, NOT your PC.
- Running **ADB Reverse** solves this by routing requests on the phone back to your PC:

| Service | Port | ADB Reverse Command | What it Does |
|---|---|---|---|
| **Metro Bundler** | `8081` | `adb reverse tcp:8081 tcp:8081` | App loads React Native JavaScript bundle from PC |
| **Django API** | `8000` | `adb reverse tcp:8000 tcp:8000` | App talks to Django REST API without CORS/firewall issues |
| **Vite Web** | `5173` | `adb reverse tcp:5173 tcp:5173` | Phone browser can open `http://localhost:5173` |

> [!NOTE]
> Our runner script sets all 3 ports automatically every time you connect or launch!

---

## 🛠️ In-App Developer Menu & Metro Settings

If the app fails to load the bundle on your phone screen:

1. **Trigger Developer Menu**:
   - Shake your physical device, OR
   - Run **Option 5** in `run-wireless-debug.bat` (sends `adb shell input keyevent 82`).
2. In the Dev Menu:
   - Tap **Settings** ➡️ **Debug server host & port for device**.
   - Enter your PC's Wi-Fi IP and port:
     ```
     192.168.1.13:8081
     ```
   - Go back and tap **Reload**.

---

## 🌐 Opening the Web Portal on Mobile Wi-Fi

You can also test the web version of Booshnam on your mobile phone's Chrome or Safari browser:

1. Start the Vite server on all network interfaces:
   ```bash
   npm run frontend:lan
   ```
   *(or run `npm run dev -- --host 0.0.0.0` inside `frontend/`)*

2. On your phone's browser, navigate to:
   ```
   http://192.168.1.13:5173
   ```

---

## 🔍 Handy CLI Commands

| Action | Command |
|---|---|
| Launch Interactive Wireless Tool | `run-wireless-debug.bat` or `npm run debug:wireless` |
| View Device Status & IP | `powershell -File scripts/wireless_debug.ps1 -Action status` |
| Re-apply Port Forwarding | `powershell -File scripts/wireless_debug.ps1 -Action reverse` |
| Trigger Dev Menu on Phone Screen | `powershell -File scripts/wireless_debug.ps1 -Action menu-dev` |
| Start Metro on LAN | `npm run mobile:start:lan` |
| Build & Run App Wirelessly | `npm run mobile:wireless` |
| Stream Live React Native Logs | `powershell -File scripts/wireless_debug.ps1 -Action logs` |
| Disconnect Wireless Devices | `powershell -File scripts/wireless_debug.ps1 -Action disconnect` |

---

## ❓ Troubleshooting

1. **"Cannot connect / Target machine actively refused it (10061)"**
   - Ensure your phone and PC are connected to the exact same Wi-Fi network (not mobile data or guest network).
   - On Android 11+, make sure the toggle for **Wireless Debugging** is turned ON in Developer Options.
   - Note that the port shown on the main Wireless Debugging screen changes whenever Wi-Fi reconnects.

2. **Windows Firewall Blocking Connection**
   - Set your Wi-Fi network profile in Windows Settings to **Private Network** (not Public).
   - If prompted by Windows Defender Firewall, allow `Node.js`, `Python`, and `adb.exe` for Private networks.

3. **Check Router "AP Isolation"**
   - Some office or public Wi-Fi networks have "Client Isolation" / "AP Isolation" enabled, which blocks devices on the same Wi-Fi from talking to each other. If so, connect PC and phone to a personal mobile hotspot.
