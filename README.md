## Portable TMS Alignment System

A computer vision–driven mobile system that guides accurate positioning of a portable transcranial magnetic stimulation (TMS) helmet for at‑home treatment.

The app uses real‑time facial landmark detection to track head orientation, measure alignment error, and provide visual feedback so patients can consistently match a predefined, calibrated target position across sessions.

This repository contains the current iPad implementation, built as a React Native / Expo module with native components (VisionCamera, Apple Vision, and OpenCV) and an example app in the `example` folder.

**Author:** Moyinoluwa Orimoloye (`@moyindavid16`)

### Usage guidelines

- **Lighting:** Use the app in a well‑lit environment—bright enough to clearly see the face, but not so bright that it causes strong glare or deep shadows.
- **Background:** Avoid green objects or strong green backgrounds behind the user, as they can interfere with landmark detection.
- **Device orientation:** Keep the iPad in the same orientation and position as it was during calibration. A stand will typically be provided to help maintain this fixed position between sessions.

---

## Local development setup

### 1. Clone and install dependencies

From the project root:

```bash
git clone https://github.com/moyindavid16/tmsvision.git
cd TMSVision-Mobile

# Root (module) deps
npm install

# Example app deps
cd example
npm install
```

### 2. iOS native setup

From the `example` folder:

```bash
cd ios
pod install
cd ..
```

If you change native iOS code or pods, re‑run `pod install`.

---

## Running the example app (iPad / iPhone)

All commands below are run inside the `example` folder.

1. Connect your iPad (or iPhone) to your Mac **with a USB cable**.
2. From the `example` folder, build and run the app on your device:

   ```bash
   cd example
   npx expo run:ios --device
   ```

   This will build the project and then show a list of available devices; select your iPad from the list.

3. On the **first run**, you may need to trust the developer build on your iPad: go to **Settings → General → VPN & Device Management (or Profiles & Device Management)**, find the TMSVision / developer profile, and enable **Trust**. Then re‑run the command above.
4. After the initial wired run, it’s often possible to run subsequent builds wirelessly, as long as Xcode has been configured to use your device over Wi‑Fi.

### Common debugging tips

- **Use Xcode for detailed errors:** It’s often easier to see native build errors directly in Xcode. Open the `TMSVision-Mobile` iOS workspace in Xcode (the example project under `example/ios`), select your device, and press the **Run** button. This will surface clearer error messages and logs during the build.
- **Same network:** Ensure both the iPad and the laptop are connected to the **same network**. On large or corporate networks there may be blockers or subnetworks that prevent discovery; in that case, try using a personal hotspot shared between the laptop and the iPad.
- **Scan the QR code:** After running `npx expo run:ios --device`, if the app does not load immediately on the device, use the iPad to scan the QR code shown in the terminal (or Expo Dev Tools) on your laptop to connect the device to the development server.

---

## Cleaning the project

### Root (module)

```bash
npm run clean        # expo-module clean (build output)
rm -rf node_modules
npm install
```

### Example app

```bash
cd example
rm -rf node_modules
npm install

# iOS
cd ios
rm -rf Pods build
pod install
cd ..

# Android
cd android
./gradlew clean
cd ../..
```

To clear Metro cache:

```bash
cd example
npx expo start --clear
```

---
