# Mac App Store distribution (Focuscat)

Reference: [Tauri App Store guide](https://v2.tauri.app/distribute/app-store/)

## Which scenario?

| Goal                                                                          | Section                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Publish a new version** of Focuscat on this Mac (everything already set up) | [§ Publish new version](#1-publish-a-new-version-this-mac)      |
| **Fresh clone or new machine** – no `apps/focuscat-desktop/.local/`           | [§ Fresh clone](#2-fresh-clone-no-local)                        |
| **First-time setup for an app** or **add a new app** (e.g. Abstand)           | [§ Once overall / new app](#3-once-overall--new-app-eg-abstand) |

## 1. Publish a new version (this Mac)

Use this when `.local` exists, certs are in Keychain, and you just want to ship a new build.

**1. Build** (from `apps/focuscat-desktop`):

```bash
pnpm run build:appstore
```

**2. Sign and package** (from **repo root**). Paths below are for **universal** build (Apple Silicon + Intel). Get identities: `security find-identity -v`. Then (replace the quoted identities with yours):

```bash
codesign --force --options runtime --entitlements apps/focuscat-desktop/src-tauri/Entitlements.plist --sign "Apple Distribution: Your Name (TEAM_ID)" target/universal-apple-darwin/release/bundle/macos/Focuscat.app
mkdir -p apps/focuscat-desktop/.local/output
xcrun productbuild --sign "3rd Party Mac Developer Installer: Your Name (TEAM_ID)" --component target/universal-apple-darwin/release/bundle/macos/Focuscat.app /Applications apps/focuscat-desktop/.local/output/Focuscat.pkg
```

**3. Upload** (from `apps/focuscat-desktop`):

```bash
source .local/.env
xcrun altool --upload-app --type macos --file .local/output/Focuscat.pkg --apiKey $APPLE_API_KEY_ID --apiIssuer $APPLE_API_ISSUER_ID
```

Success: `UPLOAD SUCCEEDED` and a Delivery UUID. The build appears in App Store Connect (TestFlight / build list) after processing.

## 2. Fresh clone (no .local)

You have the repo but no `apps/focuscat-desktop/.local/`. You need the same secrets and assets as on a machine that already ships Focuscat.

**What must be in `.local`:**

| Item                                                  | Purpose                                                   |
| ----------------------------------------------------- | --------------------------------------------------------- |
| `Focuscat.provisionprofile`                           | Embedded in the .app for App Store distribution           |
| `AuthKey_<KEY_ID>.p8`                                 | API key for `altool` upload                               |
| `.env` with `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID` | Used when calling `altool`                                |
| (optional) `.p12` certs                               | To import into Keychain if this machine doesn’t have them |

**Steps:**

1. Get the files above from a secure store or from another machine that has them. Create `apps/focuscat-desktop/.local/` and put the profile, `.p8`, and `.env` there.
2. **Certs:** If this Mac doesn’t have “Apple Distribution” and “3rd Party Mac Developer Installer” in Keychain, import the `.p12` from `.local` (double‑click or drag into Keychain Access).
3. **AuthKey for altool:** From `apps/focuscat-desktop`:  
   `mkdir -p ~/private_keys && ln -sf "$(pwd)/.local/AuthKey_<KEY_ID>.p8" ~/private_keys/AuthKey_<KEY_ID>.p8`
4. **Universal build (Silicon Mac only):** On Apple Silicon, run once per machine so the universal build can compile the Intel slice: `rustup target add x86_64-apple-darwin`.
5. Then follow [§ Publish new version](#1-publish-a-new-version-this-mac).

## 3. Once overall / new app (e.g. Abstand)

Use this when an app has **no** App Store setup yet: no bundle ID, no provisioning profile, no app in App Store Connect. Same checklist for “first app ever” (e.g. Focuscat) or “second app” (e.g. Abstand). For a second app you can **reuse** the same two certs and the same API key; you still need a **new bundle ID, new profile, new app** in App Store Connect.

**Order matters:** Do the steps below in order (e.g. bundle ID first so it appears in the App Store Connect dropdown).

**Apple Developer** ([developer.apple.com/account](https://developer.apple.com/account)):

1. **Identifiers** → [App IDs](https://developer.apple.com/account/resources/identifiers/list) → + → App → Bundle ID **Explicit** (e.g. `com.buildergroup.focuscat` or `com.buildergroup.abstand`). Register.
2. **Profiles** → [Profiles](https://developer.apple.com/account/resources/profiles/list) → + → Mac → Mac App Store → select **that** App ID (from step 1) and your **Apple Distribution** cert → download. Put in the app’s `.local/` (e.g. `Focuscat.provisionprofile` or `Abstand.provisionprofile`).
3. **Certificates** → [Certificates](https://developer.apple.com/account/resources/certificates/list): **Apple Distribution** (for the .app) and **Mac Installer Distribution** (“3rd Party Mac Developer Installer”, for the .pkg). Same CSR can be used for both; create both in that Certificates page. You can reuse these for multiple apps; only create new ones if you’re on a new team or machine. Install .cer; optionally export .p12 to `.local/`.

**App Store Connect** ([appstoreconnect.apple.com](https://appstoreconnect.apple.com)):

4. **My Apps** → [Apps](https://appstoreconnect.apple.com/apps) → + → New App. Platform **macOS**, name, **Bundle ID** = **select the one you created in step 1** from the dropdown, SKU (e.g. `focuscat` or `abstand`). Create.
5. **API key:** Create one under [Integrations → Individual Keys](https://appstoreconnect.apple.com/access/integrations/api) (or reuse an existing key with App Manager access). Note Key ID and Issuer ID; download the .p8 **once** (no second download). Save as `.local/AuthKey_<KEY_ID>.p8`. In `.local/.env`: `APPLE_API_KEY_ID=…`, `APPLE_API_ISSUER_ID=…`. Symlink to `~/private_keys` so `altool` finds it (see [§ Fresh clone](#2-fresh-clone-no-local) step 3).

**In the repo:** Copy from Focuscat or see [Tauri App Store setup](https://v2.tauri.app/distribute/app-store/#setup). You need:

- `tauri.appstore.conf.json` (identifier = bundle ID, productName, entitlements path, provisioning profile path to `.local/`)
- `Entitlements.plist` (sandbox, app ID, team ID)
- `Info.plist` (e.g. `ITSAppUsesNonExemptEncryption` false)
- In `package.json`: a `build:appstore` script (build with appstore config, then bundle with same config). For universal (Apple Silicon + Intel), use `--target universal-apple-darwin` on **both** the build and bundle commands.

Then follow [§ Publish new version](#1-publish-a-new-version-this-mac) with this app’s paths and `.local/.env`.

## Errors

When something goes wrong, check this table first.

| Error                                                                          | Fix                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **“App sandbox not enabled”**                                                  | Sign the .app before `productbuild`: `codesign --force --options runtime --entitlements …/Entitlements.plist --sign "<Apple Distribution identity>" …/App.app`. Verify: `codesign -d --entitlements - -- …/App.app/Contents/MacOS/App` shows `com.apple.security.app-sandbox`.        |
| **“Cannot determine the Apple ID from Bundle ID”**                             | Create the app in App Store Connect (My Apps, macOS, select that bundle ID).                                                                                                                                                                                                          |
| **productbuild: “Could not find appropriate signing identity”**                | Need **Mac Installer Distribution** cert (3rd Party Mac Developer Installer), not only Apple Distribution.                                                                                                                                                                            |
| **altool: “Failed to load AuthKey file”**                                      | Put key in `~/private_keys`; symlink from `.local`: `ln -sf "$(pwd)/.local/AuthKey_<KEY_ID>.p8" ~/private_keys/AuthKey_<KEY_ID>.p8`.                                                                                                                                                  |
| **“Your application bundle must install to '/Applications'”**                  | Use `--component …/App.app /Applications` in `productbuild`.                                                                                                                                                                                                                          |
| **"Installer package includes files that are only readable by the root user"** | Don't run build/productbuild as root; use normal user so permissions are readable by non-root.                                                                                                                                                                                        |
| **White/blank window (WebView doesn't load)**                                  | Missing `com.apple.security.network.client` in Entitlements.plist. WKWebView renders in a separate WebContent process that needs IPC with the host app; the sandbox blocks this without the entitlement. See [tauri-docs#3171](https://github.com/tauri-apps/tauri-docs/issues/3171). |

## Learnings

Reference for when you run into an issue or wonder why we do something a certain way.

- **Tauri does not apply entitlements to the main executable** when bundling for App Store. You must **codesign the .app yourself** before `productbuild`, or validation fails with “App sandbox not enabled”. Use **one** `codesign` on the `.app` with `--options runtime --entitlements Entitlements.plist` ([Tauri #13118](https://github.com/tauri-apps/tauri/issues/13118)). Signing the .app without entitlements re-signs the inner binary and strips entitlements, so don’t sign the binary then the app separately.
- **productbuild only signs the installer**, not the app. The .app must be fully signed (with entitlements) before you run `productbuild`.
- **Install location:** use `--component …/App.app /Applications` in `productbuild`. Omitting `/Applications` makes the validator reject with “Your application bundle must install to '/Applications'”.
- **altool** looks for the API key only in fixed paths (`~/private_keys`, etc.). If the key lives in `apps/focuscat-desktop/.local/`, create a symlink: `ln -sf "$(pwd)/.local/AuthKey_<KEY_ID>.p8" ~/private_keys/`.
- **App record must exist** in App Store Connect before upload. Otherwise: “Cannot determine the Apple ID from Bundle ID”. Create the app (macOS, bundle ID) in My Apps first.
- **Two certificates:** (1) **Apple Distribution** – for signing the .app; (2) **Mac Installer Distribution** (“3rd Party Mac Developer Installer”) – for signing the .pkg. Same CSR can be used for both.
- **Order in Apple portals:** Create **bundle ID (App ID) first** in Developer → Identifiers, then provisioning profile, then create the **app** in App Store Connect and select that bundle ID.
- **.p8 key is downloadable only once** from App Store Connect; store it safely (e.g. in `.local/` and a secure backup).
- **Universal build (Apple Silicon + Intel):** Focuscat uses `--target universal-apple-darwin`; output is `target/universal-apple-darwin/release/bundle/macos/…`. On a Silicon Mac you need the `x86_64-apple-darwin` Rust target once per machine (see [§ Fresh clone](#2-fresh-clone-no-local) step 4).
- **`com.apple.security.network.client` is mandatory** for WKWebView in a sandboxed app. WKWebView renders in a separate `com.apple.WebKit.WebContent` process that communicates with the host app via IPC. Without this entitlement the WebContent process crashes and the window stays white. This applies even though Tauri serves assets in-memory via a custom `tauri://` scheme — the IPC is still classified as "network" by the sandbox ([tauri-docs#3171](https://github.com/tauri-apps/tauri-docs/issues/3171), [Apple Forums](https://developer.apple.com/forums/thread/116359)).
- **`macOSPrivateApi` must be `false` for App Store.** The base `tauri.conf.json` has `macOSPrivateApi: true` (needed for transparent windows in direct distribution). The App Store config overrides it to `false` — Apple rejects apps using private APIs. The `app-store` Cargo feature gates transparent window code behind `#[cfg(not(feature = "app-store"))]`.
