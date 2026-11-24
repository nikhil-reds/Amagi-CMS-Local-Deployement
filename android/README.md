# XOS Android Player

Android 8.0+ phone/tablet player using the Windows player's rendering and realtime logic. Update Android System WebView/Chrome before installing. Android TV and managed kiosk provisioning are not yet validated.

## Build

From the repository root, after `npm ci`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File android/scripts/build.ps1 -Setup
```

The first build downloads Java 17, Gradle 8.11.1 and the Android SDK into `android/.tools` and accepts the SDK licenses. Later builds can omit `-Setup`.

Convenience commands: `npm run android:setup`, `npm run android:build`, and `npm run test:android`. A standard Gradle wrapper is also included for Android Studio/CI; prepare the player assets before building with it.

The script builds and lints a signed release and copies it to `public/XOS-Android.apk`. It also creates `android/.signing/player-release.jks` and `release.properties` locally. **Back up both signing files securely**: future APK updates must use this same key. Signing secrets and build tools are excluded from Git and the Docker build context. Never commit or distribute the signing directory.

## Install and connect

1. Transfer `public/XOS-Android.apk` to the device, or download it using the CMS sidebar's **Download Android** button. Rebuild the CMS deployment to include the APK if running through Docker.
2. Allow installation from the browser/file manager when Android requests it, then install and open **XOS Player**.
3. Enter the CMS's LAN URL, for example `http://192.168.1.5:3000`, and the exact Screen ID, including any leading zeros.
4. Tap **Connect**. Settings are saved locally and reused on the next launch. CMS account credentials are not required by the public player APIs.
5. Tap the top-right menu, long-press player content, or use Android Back for settings, manual reconnect, resume or exit.

The CMS, Centrifugo, media storage and simulation feed servers must be reachable from the Android device. `localhost` on a phone means the phone itself; use the CMS PC's LAN address. Loopback media/WebSocket/feed addresses in snapshots are rewritten exactly as in Windows.

## Logic shared with Windows

- `desktop/player.html` is copied into the APK with a small event adapter replacing Electron IPC.
- `public/media-runtime.js` is copied unchanged, including media controls, update-in-place behavior and website refresh settings. Android bundles the same PDF.js version using its polyfilled legacy build for WebView compatibility.
- `desktop/screen-connection.cjs` supplies the exact connection function at build time. Android uses the browser Centrifuge distribution and native JSON requests instead of Electron `net.fetch`.
- Same initial screen validation, one credentials request, one snapshot, then publications only. No polling, automatic reconnect loop, offline fallback or snapshot disk cache.
- CMS media URLs are streamed through a same-origin native GET adapter, preserving byte ranges and avoiding WebView LAN HTTP/CORS restrictions. Only media paths on the saved CMS origin are allowed.
- Same revision ordering, screen deletion handling, multi-panel simulation and restoration through CMS snapshots.
- Only the bundled top-level app origin has a native bridge. Remote website frames cannot call Android settings/network/exit actions.

The Android shell keeps the screen awake and hides system bars. This is fullscreen playback, not enterprise lock-task mode. Network or lifecycle interruptions require **Reconnect**, matching Windows failure behavior. Playback codecs, website embedding policies and PDF performance depend on the device/WebView and require physical-device checks.

## Verification

```powershell
node android/scripts/prepare-assets.cjs
node --test android/scripts/parity.test.cjs
node android/scripts/smoke.cjs
```

The smoke check requires Playwright and installed Microsoft Edge. It mocks the native bridge and server publications; it does not replace physical Android tests.

Before production use, verify images, video/audio autoplay and controls, PDF navigation/zoom/rotation, all three simulation feeds, restoration, lost Wi-Fi/manual reconnect, app restart, rotation and sustained playback on the actual target devices. No physical device is assumed to be connected during a build.
