# OddBirdOut — Android Kiosk App

WebView wrapper that loads the OddBirdOut web game in a locked-down kiosk environment. Designed to run on three Android tablets via Fully Kiosk Browser-style device-owner pinning.

## Behavior

- Opens a fullscreen WebView pointed at a configurable URL
- Hides system bars (immersive sticky) — no status bar, no nav bar
- Blocks back, home, and app-switch buttons
- Re-enters lock task on user leave (prevents escape)
- Auto-reloads the page when network becomes available after an outage
- Shows a small connection indicator in the top-right corner (green = loaded, red = loading/error)
- Locked to landscape orientation

## Setting the URL

The URL is read from `Settings.Global.oddbirdout_url` at app start. Set it via ADB before launching:

```bash
adb shell settings put global oddbirdout_url "http://192.168.1.100:3000/?player=A"
```

Verify:

```bash
adb shell settings get global oddbirdout_url
```

If the setting is missing or blank, the app falls back to `http://localhost:3000`.

## WiFi Management (ADB)

All commands assume a single connected tablet. For multiple tablets, prepend `adb -s <serial>`.

```bash
# Toggle WiFi on/off
adb shell svc wifi enable
adb shell svc wifi disable

# Check current WiFi status
adb shell dumpsys wifi | grep "mWifiInfo"

# List saved networks
adb shell cmd wifi list-networks

# Connect to a network (Android 11+)
adb shell cmd wifi connect-network "SSID" wpa2 "password"

# Forget a saved network
adb shell cmd wifi forget-network <networkId>
```

## Kiosk Setup (per tablet)

### 1. Install the APK

```bash
adb install app/release/app-release.apk
```

### 2. Set as device owner

This enables lock-task (screen pinning) so players cannot leave the app:

```bash
adb shell dpm set-device-owner com.oddbirdout.android/.KioskDeviceAdminReceiver
```

### 3. Set the URL for this tablet's player role

```bash
adb shell settings put global oddbirdout_url "http://<server-ip>:3000/?player=A"
```

### 4. Launch

Open the app manually on first launch. On subsequent boots, if the app was set as the home screen (it declares `CATEGORY_HOME` in its intent filter), it will auto-launch.

## Build

From the `Android/` directory:

```bash
# Windows
gradlew.bat assembleRelease

# macOS / Linux
./gradlew assembleRelease
```

The APK will be at `app/build/outputs/apk/release/app-release.apk`.

The release build is signed with a debug keystore — sufficient for sideloaded kiosk tablets. For production, replace `debug.keystore` with your own key.

## Project Structure

```
Android/
├── app/
│   └── src/
│       └── main/
│           ├── java/com/oddbirdout/android/
│           │   ├── MainActivity.kt              # WebView + kiosk lock + indicator
│           │   └── KioskDeviceAdminReceiver.kt  # Device-owner receiver
│           ├── res/
│           │   ├── values/
│           │   │   ├── themes.xml               # Fullscreen theme
│           │   │   └── strings.xml
│           │   └── xml/
│           │       └── device_admin_receiver.xml # Admin policy metadata
│           └── AndroidManifest.xml
├── build.gradle.kts
└── settings.gradle.kts
```
