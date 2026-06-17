# OddBirdOut — Android Kiosk App

WebView wrapper that loads the OddBirdOut web game in a locked-down kiosk environment. Designed to run on three Android tablets via device-owner pinning.

## Behavior

- Opens a fullscreen WebView pointed at a configurable URL
- Hides system bars — no status bar, no nav bar
- Blocks back, home, and app-switch buttons
- Disables the lock screen permanently (device-owner required)
- Locks the task (screen pinning) so players cannot leave the app
- Auto-launches on boot via `BOOT_COMPLETED` receiver
- Auto-reloads the page every 10 seconds while WiFi is connected
- Manually reload on long-press of the connection indicator
- Shows a connection indicator in the top-right corner:
  - **Yellow** — page loading / refreshing
  - **Green** — page loaded successfully
  - **Red** — page failed to load or no network
- Keeps the screen on permanently
- Locked to landscape orientation

## Tablet Setup (fresh device, per tablet)

Run these commands from the laptop with the tablet connected via USB. Prerequisites: USB debugging enabled on the tablet.

### 1. Build the APK

```bash
# From the Android/ directory
gradlew.bat assembleRelease
```

APK will be at `app\release\app-release.apk`.

### 2. Install the APK

```bash
adb install -r app/release/app-release.apk
```

### 3. Connect to the expo WiFi network

```bash
adb shell svc wifi enable
adb shell cmd wifi connect-network "OddBirdOut" wpa2 "Ostracism"
```

Verify with:

```bash
adb shell dumpsys wifi | findstr "mWifiInfo"
```

Look for `Supplicant state: COMPLETED` and an assigned IP address.

### 4. Set the target URL (per player role)

```bash
# Tablet A
adb shell settings put global oddbirdout_url "http://192.168.1.74:3000/?player=A"

# Tablet B
adb shell settings put global oddbirdout_url "http://192.168.1.74:3000/?player=B"

# Tablet C
adb shell settings put global oddbirdout_url "http://192.168.1.74:3000/?player=C"
```

### 5. Set as device owner

Enables lock-task pinning and permanently disables the lock screen:

```bash
adb shell dpm set-device-owner com.oddbirdout.android/.KioskDeviceAdminReceiver
```

### 6. Set as home activity

Makes the app auto-launch on boot instead of the system launcher:

```bash
adb shell cmd package set-home-activity com.oddbirdout.android/.MainActivity
```

### 7. Disable Bluetooth

Bluetooth is enabled by default. Disable it to save resources:

```bash
adb shell svc bluetooth disable
```

To verify if its disabled:

```bash
adb shell settings get global bluetooth_on
```

### 8. Reboot and verify

```bash
adb reboot
```

After reboot the tablet should boot directly into the app (no lock screen) and load the game.

### 9. Test connectivity

From the laptop, verify the tablet can reach the server:

```bash
adb shell ping -c 3 192.168.1.100
```

If you need to update the APK later:

```bash
# Install the new APK over the old one (device owner persists)
adb install -r app\build\outputs\apk\release\app-release.apk

# Restart the app (re-applies all device policies on launch)
adb shell am force-stop com.oddbirdout.android
adb shell am start -n com.oddbirdout.android/.MainActivity
```

> The app re-applies all device policies on every launch (`setKeyguardDisabled`, `setStatusBarDisabled`, `setLockTaskPackages`) — no need to re-set the device owner.

## Build

From the `Android/` directory:

```bash
gradlew.bat assembleRelease
```

The APK will be at `app\build\outputs\apk\release\app-release.apk`.

Signing uses the debug keystore by default — sufficient for sideloaded kiosk tablets.

## Command Reference

### App lifecycle

```bash
# Install / update the APK
adb install -r app\release\app-release.apk

# Launch the app
adb shell am start -n com.oddbirdout.android/.MainActivity

# Force-stop + relaunch
adb shell am force-stop com.oddbirdout.android && adb shell am start -n com.oddbirdout.android/.MainActivity

# Open a URL in the device browser (test connectivity)
adb shell am start -a android.intent.action.VIEW -d "http://192.168.1.100:3000"
```

### URL configuration

```bash
# Set the target URL (per tablet)
adb shell settings put global oddbirdout_url "http://192.168.1.100:3000/?player=A"

# Read the current URL
adb shell settings get global oddbirdout_url
```

### Kiosk / device owner

```bash
# Set app as device owner (enables lock-task, disables lock screen)
adb shell dpm set-device-owner com.oddbirdout.android/.KioskDeviceAdminReceiver

# Make this app the default home screen (auto-launch on boot)
adb shell cmd package set-home-activity com.oddbirdout.android/.MainActivity
```

### Screen info

```bash
# Display resolution
adb shell wm size

# Display density (DPI)
adb shell wm density
```

### WiFi

```bash
# Enable / disable
adb shell svc wifi enable
adb shell svc wifi disable

# Connection status
adb shell dumpsys wifi | findstr "Wi-Fi"
adb shell dumpsys wifi | findstr "mWifiInfo"

# Saved networks
adb shell cmd wifi list-networks

# Connect (Android 11+)
adb shell cmd wifi connect-network "SSID" wpa2 "password"

# Forget
adb shell cmd wifi forget-network <networkId>
```

### Debugging

```bash
# Ping a host from the tablet
adb shell ping -c 3 192.168.1.100

# Stream app logcat (filtered)
adb logcat -s WebViewCallback:* chromium:* MainActivity:*

# Inspect the installed APK manifest
aapt dump xmltree app\release\app-release.apk AndroidManifest.xml | findstr cleartext
```

> **Note:** Commands use `findstr` (Windows). On macOS / Linux replace with `grep`.

### Keystore (one-time)

```bash
keytool -genkey -v -keystore oddbirdout.keystore -alias oddbirdout -keyalg RSA -keysize 2048 -validity 10000 -storepass yourpassword -keypass yourpassword -dname "CN=OddBirdOut"
```

## Project Structure

```
Android/
├── app/
│   └── src/
│       └── main/
│           ├── java/com/oddbirdout/android/
│           │   ├── MainActivity.kt               # WebView + kiosk lock + indicator
│           │   ├── BootReceiver.kt                # Auto-launch on device boot
│           │   └── KioskDeviceAdminReceiver.kt    # Device-owner + keyguard disable
│           ├── res/
│           │   ├── values/
│           │   │   ├── themes.xml                 # Fullscreen theme
│           │   │   └── strings.xml
│           │   └── xml/
│           │       └── device_admin_receiver.xml   # Admin policy metadata
│           └── AndroidManifest.xml
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```
