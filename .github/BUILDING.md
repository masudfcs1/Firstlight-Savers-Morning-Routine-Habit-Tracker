# Android and iPhone builds

The **Android & iOS** workflow runs on pushes and pull requests to `main`, and can be run manually from GitHub's Actions tab. TypeScript, ESLint, Jest, Expo dependency checks, and a web export must pass before either native build begins. Actions are pinned to reviewed commit hashes; dependencies use `npm ci` and the committed lockfile.

The native projects are generated with Expo Prebuild in each job. Generated `android/` and `ios/` directories do not need to be committed.

## Download automatic build artifacts

Open **Actions → Android & iOS → a successful run → Artifacts**. Artifacts are kept for 14 days.

| Artifact | What it contains | How to use it |
| --- | --- | --- |
| `firstlight-android-preview-*` | A standalone release-mode APK, signed with the Expo template's public debug key. Includes ARM64 device and x86_64 emulator libraries. | Extract the artifact and install `app-release.apk` on an Android device or emulator. Metro is not required. |
| `firstlight-ios-simulator-*` | An unsigned Release `.app`, packaged in `firstlight-ios-simulator-arm64.zip`. | Extract both ZIP layers and drag the `.app` into an iPhone Simulator on an Apple Silicon Mac. Metro is not required. |
| `firstlight-web-*` | A static web export. | Extract it and serve the directory with a static HTTP server. |

The Android preview key is not a production upload key. The iOS simulator app cannot run on a physical iPhone and is not an IPA. These automatic builds require no Expo account, Apple signing secrets, or store credentials. The simulator build uses Xcode 26.6 on GitHub's `macos-26` runner, matching Expo SDK 57's Xcode 26.4-or-newer requirement.

## Signed Android and physical iPhone builds

The separate **EAS device build (manual)** workflow submits builds to Expo's EAS service. It never runs automatically and never submits an app to Google Play, TestFlight, or the App Store. EAS account limits and build charges may apply.

One-time setup:

1. Sign in locally with `npx eas-cli@24.12.1 login`, then run `npx eas-cli@24.12.1 init` to link this app to your own Expo project. Commit the resulting `extra.eas.projectId` in the Expo app configuration.
2. Run `npx eas-cli@24.12.1 build --platform android --profile preview` and, for physical iPhones, `npx eas-cli@24.12.1 build --platform ios --profile preview` locally once. Complete the prompts so signing credentials are stored with EAS. For iOS internal distribution, use an Apple Developer membership and register the target device with `npx eas-cli@24.12.1 device:create` before the initial build.
3. Create an Expo access token and save it in **GitHub repository Settings → Secrets and variables → Actions → New repository secret** as `EXPO_TOKEN`. Keep the token out of source files.
4. Open **Actions → EAS device build (manual) → Run workflow**. Choose Android, iOS, or both, and the `preview` or `production` profile. A production profile also needs its own signing credentials configured once before non-interactive use.

The workflow checks for the token and project ID before submitting. It uses `--no-wait`: green means that EAS accepted the request, not that compilation finished. Follow the EAS URL in the job log for the final status and download. Newly registered iPhones or expired Apple profiles may require refreshing credentials locally before rerunning CI.

References: [Expo SDK requirements](https://docs.expo.dev/versions/latest/), [GitHub macOS runner image](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md), [Expo builds from CI](https://docs.expo.dev/build/building-on-ci/), and [internal distribution](https://docs.expo.dev/build/internal-distribution/).
