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

## 2. Physical iPhone iOS (.ipa)

Apple requires all physical iOS applications to be cryptographically signed with an Apple Developer certificate.

### Option A: Build signed `.ipa` via EAS (Recommended for Physical iPhones)
1. Run in your terminal:
   ```bash
   npx eas-cli login
   npx eas-cli init
   ```
2. Build the physical device `.ipa`:
   ```bash
   npx eas-cli build --platform ios --profile preview
   ```
3. EAS will sign and compile the `.ipa` in the cloud. Once completed, download the `.ipa` file into this `releases/` folder or scan the QR code to install it directly on registered iPhones.

### Option B: iOS Simulator App (No Apple account needed)
If testing on a Mac iOS Simulator:
1. Open [GitHub Actions Runs](https://github.com/masudfcs1/Firstlight-Savers-Morning-Routine-Habit-Tracker/actions).
2. Download the artifact **`firstlight-ios-simulator`**.
3. Drag and drop the `.app` directly into the iOS Simulator.
