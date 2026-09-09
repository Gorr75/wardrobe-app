# Boutique Journal — Xcode Cloud → TestFlight Internal

This is the **preferred recurring TestFlight path** for Boutique Journal. It is a **separate Apple app** and a **separate Xcode Cloud workflow** from Tableside. Never point a Tableside workflow at this repo, and never reuse Tableside’s bundle ID, scheme settings, or TestFlight group as a shortcut.

## App Store Connect inventory (already created)

| | Boutique Journal | Do not reuse from Tableside |
|---|---|---|
| GitHub repo | `Gorr75/wardrobe-app` | `Gorr75/repo` |
| App name | Boutique Journal | Tableside |
| Apple ID | **6807574028** | Tableside’s Apple ID |
| Bundle ID | `se.jansson.boutiquejournal` | Tableside’s bundle ID |
| SKU | `se.jansson.boutiquejournal` | Tableside’s SKU |
| TestFlight Internal group | **BU Butiksapp** (exists) | Do not attach Tableside’s group |
| Xcode Cloud workflow | **None yet** — create **Boutique App Store** below | Tableside’s own workflow |
| Scheme | **App** | Tableside’s own scheme |

Local TestFlight **1.0 (3)** failed ITC processing with **Error 90683** (missing `NSContactsUsageDescription`). The committed `ios/App/App/Info.plist` now includes contacts, camera, and photo-library usage strings; `ci_post_clone` refuses to continue if those keys disappear.

Local `ios/App/App.xcodeproj` may keep a different `CURRENT_PROJECT_VERSION` than the Settings version line. On Cloud, `CI_BUILD_NUMBER` rewrites both **before** `cap:sync`.

## What Cloud does (already in this repo)

On every Cloud action, Xcode Cloud runs:

1. **`ci_post_clone.sh`** (repo-root `ci_scripts/` and the same files next to `App.xcodeproj` in `ios/App/ci_scripts/`):
   - Verifies `Info.plist` still has contacts/camera/photo usage strings (blocks a repeat of Error 90683)
   - Verifies the workspace `Package.resolved` Cloud needs for `capacitor-swift-pm` **and** `ion-ios-filesystem` (Filesystem plugin transitive)
   - Installs Node 22 if the image does not already have Node ≥ 20 (official tarball first; Homebrew is a fallback and must not abort the script)
   - If `CI_BUILD_NUMBER` is set: stamps `APP_BUILD` in `src/backup.js` and `CURRENT_PROJECT_VERSION` in the pbxproj (marketing version stays **1.0**)
   - `npm ci` (keeps `package-lock.json`; cache under the repo / tmp — does not write `~/.npmrc`). If the host `@rollup/rollup-*` optional binary is missing — typical on Xcode Cloud after a Linux-generated lockfile — install that platform package explicitly (`npm install @rollup/rollup-darwin-arm64@<lockfile rollup version> --no-save`), restore any lock/package.json edits, then fall back to `--force`, `npm install --include=optional --no-save`, and `npm rebuild`. A missing binding is classified only when `require('rollup/dist/native.js')` fails with `MODULE_NOT_FOUND`; a failed `npm ci` / `npm install`, or a dlopen/`other-error` load failure, is reported as that error — not as the optional-deps bug.
   - Vite build (requires `dist/index.html`), then `npx cap copy ios` + `npx cap update ios` (Capacitor 8.5.1 has no `--no-build` on `cap sync`). `verify_ios_web_assets.sh` requires `ios/App/App/public/index.html` plus JS so Archive cannot ship a black WKWebView
   - Restores `Package.resolved` if `cap sync` deletes it or drops a required pin
   - Logs Capacitor native pin vs `package-lock.json` and **does not fail** on mismatch
2. **`ci_pre_xcodebuild.sh`**: re-checks Info.plist keys, `Package.resolved`, and `verify_ios_web_assets.sh` (`ios/App/App/public`)
3. **`xcodebuild` Archive**
4. **`ci_post_xcodebuild.sh`**: logs archive version strings and **always exits 0**

There is **no** Xcode Run Script phase that writes `CFBundleVersion`. That pattern fails Cloud’s mutable-output checks.

Do **not** add unused channel env vars. Boutique does not need a `BOUTIQUE_CLOUD_CHANNEL` (or similar) unless you later add a second workflow that must branch in these scripts.

## App Store Connect app (already exists)

Do **not** create another app. Boutique Journal is already in ASC:

- Apple ID: **6807574028**
- Bundle ID / SKU: `se.jansson.boutiquejournal`
- TestFlight Internal group: **BU Butiksapp**

Still confirm:

1. Identifiers → App ID `se.jansson.boutiquejournal` is the one attached to Apple ID 6807574028 (not Tableside).
2. Encryption: the committed `Info.plist` sets `ITSAppUsesNonExemptEncryption` = **NO**. Complete the ASC compliance question the same way if ASC still asks.
3. Users who should see Internal builds can access this app and group **BU Butiksapp**.

## One-time Xcode Cloud product

1. On a Mac: `npm ci && npm run cap:sync && npx cap open ios`
2. In Xcode, select the **App** target → **Signing & Capabilities**:
   - Team: Magnus’s Apple Developer team
   - Bundle Identifier: `se.jansson.boutiquejournal`
   - Automatic signing
3. **Product → Xcode Cloud → Create Workflow…** (or App Store Connect → this app → Xcode Cloud).
4. Grant Xcode Cloud access to **`Gorr75/wardrobe-app` only**. Do not attach `Gorr75/repo`.
5. When Cloud asks to use source-control credentials for Swift packages, **grant** at least:
   - `https://github.com/ionic-team/capacitor-swift-pm` (exact `8.5.1` via `CapApp-SPM/Package.swift`)
   - `https://github.com/ionic-team/ion-ios-filesystem` (`from: "1.1.1"` via `@capacitor/filesystem` 8.1.3 `Package.swift`; resolved **1.1.4**)
   - Any additional GitHub SPM URLs Cloud lists on the first failed resolve
6. `Package.resolved` is committed at `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` (the path Xcode Cloud requires when automatic resolution is disabled). Pins:
   - `capacitor-swift-pm` **8.5.1** (`6afa7424fd2fcd8ca1e577478e8a00af284b7e82`)
   - `ion-ios-filesystem` **1.1.4** (`56bd6f9e77cb4f2269c03f2d92a9fe58fe168a1c`) — required by `@capacitor/filesystem`; no other plugin adds a remote SPM dep
   After changing Capacitor or `CapApp-SPM/Package.swift`, regenerate and commit that file from Xcode (File → Packages → Resolve Package Versions).

## Workflow settings to create (exact)

There is **no** Xcode Cloud workflow on Boutique Journal yet. Create a **new** one named **Boutique App Store**, mirroring Tableside’s App Store loop, pointed at **this** app only.

| Setting | Value |
|---|---|
| Name | Boutique App Store |
| ASC app | Boutique Journal (Apple ID **6807574028**) |
| Project / workspace | `ios/App/App.xcodeproj` (scheme is inside this project) |
| Scheme | **App** (shared scheme is committed at `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`) |
| Start condition | **Branch Changes** on **`main`** |
| Primary repository | `Gorr75/wardrobe-app` |
| Xcode / macOS | Latest stable Xcode 16+ recommended (iOS 15 deployment target) |
| Environment variables | None required |
| Actions | **Archive** (Release, generic iOS device) → **Distribution Preparation** → **App Store Connect** |
| Post-action | **TestFlight Internal Testing** → Internal group **BU Butiksapp** |

### Internal group “BU Butiksapp”

This group already exists on Boutique Journal. Do **not** create a group named Test.

1. App Store Connect → Boutique Journal (6807574028) → **TestFlight** → Internal Testing → **BU Butiksapp**
2. Confirm testers are on that group
3. Attach **BU Butiksapp** as the workflow post-action destination

Do not attach Tableside’s Internal group.

### Build number floor

Xcode Cloud’s `CI_BUILD_NUMBER` starts at **1** for a new workflow. Local **1.0 (3)** was uploaded and **failed processing** (Error 90683). Invalid builds sometimes still consume that number.

Before the first Cloud upload, set the workflow’s next build number **above the highest Boutique Journal `CFBundleVersion` ASC still considers used**. Prefer starting at **4** or higher unless ASC explicitly allows a retry of 3 after the Invalid state.

## First build checklist

1. Merge this PR to `main` (Cloud is configured for branch changes on `main`).
2. Confirm the workflow run executes **ci_post_clone** (Node + stamp + `cap:sync`) before Archive.
3. If SPM fetch fails: confirm `Package.resolved` is still at `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`, grant the GitHub package(s) listed in the Cloud log, and retry.
4. If signing fails: confirm the App ID, the team on the App target, and that Cloud is managing certificates for **this** bundle ID.
5. Confirm TestFlight Internal **BU Butiksapp** shows **Boutique Journal 1.0 (CI_BUILD_NUMBER)** (processing succeeded — not another 90683) and Settings shows the same compact `1.0 (CI_BUILD_NUMBER)` line.
6. Confirm the build is under Apple ID **6807574028**, not Tableside.

## App Store Connect listing icon (grey wireframe)

Keep the committed gold plate / hanger+bag `AppIcon.appiconset`. Do not redesign it.

ASC’s header tile is a **marketing asset**. It does not change just because the catalog is in git. Home Screen / TestFlight use the binary AppIcon (Cloud picks it up automatically). The Connect listing stays Apple’s grey wireframe until a build **finishes processing**, or Magnus uploads `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` under **App Information**. That is expected after Build 1 failed.

## Local fallback (not the recurring path)

```bash
npm install
npm run icons          # after icon.svg changes
npm run cap:sync
npx cap open ios
```

Archive in Xcode only when Cloud is unavailable. Increment **Build** (`CURRENT_PROJECT_VERSION`) for that upload; leave Version at **1.0**. You do not need to keep the committed pbxproj build in lockstep with `APP_BUILD` in `src/backup.js` — Cloud overwrites both from `CI_BUILD_NUMBER`.
