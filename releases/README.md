# FirstLight S.A.V.E.R.S. - Release Applications

This folder is designated for your standalone mobile release files:
- **Android APK**: `app-release.apk`
- **iOS Application**: `.ipa` (or simulator `.app.zip`)

---

## 1. Physical Android APK (Direct Download & Install)

### Download from GitHub Actions (Free, Automatic):
Each push to `main` automatically builds a standalone Release APK:
1. Open [GitHub Actions Runs](https://github.com/masudfcs1/Firstlight-Savers-Morning-Routine-Habit-Tracker/actions).
2. Click on the latest green run of **Android & iOS**.
3. Under **Artifacts** at the bottom, click **`firstlight-android-preview`**.
4. Extract `app-release.apk` and place it here in this `releases/` folder.

### Installing on your Android phone:
1. Transfer `app-release.apk` to your phone (via USB, Google Drive, WhatsApp, or email).
2. Tap the `.apk` on your phone.
3. If prompted, allow *"Install unknown apps"*.
4. Tap **Install** and open FirstLight S.A.V.E.R.S.!

---

## 2. iOS Applications (.ipa & Simulator)

### Building iOS without Apple ID / Developer Account:
We have configured `eas.json` so building for iOS never prompts for an Apple ID:
```bash
npm run build:ipa
```
EAS will compile the iOS application in the cloud without requiring any Apple Developer credentials.

### Automatic Free iOS Builds from GitHub Actions:
Every push to `main` automatically compiles on GitHub's macOS runner with zero Apple ID:
1. Open [GitHub Actions Runs](https://github.com/masudfcs1/Firstlight-Savers-Morning-Routine-Habit-Tracker/actions).
2. Download the artifact **`firstlight-ios-builds`**.
3. It contains both `firstlight-ios-unsigned.ipa` and `firstlight-ios-simulator-arm64.zip`.

### Installing on a Physical iPhone (Without Paid Apple Developer Account):
Because Apple blocks unsigned IPAs from installing directly on iPhones:
- **Free Sideloading (No Paid Account)**: Use [Sideloadly](https://sideloadly.io/) or [AltStore](https://altstore.io/) on your PC. Connect your iPhone via USB, select `firstlight-ios-unsigned.ipa`, and install it onto your phone for free.
- **Expo Go (Instant & Wireless)**: Run `npx expo start` and scan the QR code using your iPhone's camera (Expo Go installed from the App Store).
