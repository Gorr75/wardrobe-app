# Boutique Journal — Xcode Cloud → TestFlight Internal

This is the **preferred recurring TestFlight path** for Boutique Journal. It is a **separate Apple app** and a **separate Xcode Cloud workflow** from Tableside. Never point a Tableside workflow at this repo, and never reuse Tableside’s bundle ID, scheme settings, or TestFlight group as a shortcut.

| | Boutique Journal | Tableside |
|---|---|---|
| GitHub repo | `Gorr75/wardrobe-app` | `Gorr75/repo` (private) |
| App name | Boutique Journal | Tableside |
| Bundle ID | `se.jansson.boutiquejournal` | Tableside’s own ID — do not reuse |
| Workflow name | **Boutique App Store** | Tableside’s own workflow — do not reuse |
| Scheme | **App** | Tableside’s own scheme |

Local `ios/App/App.xcodeproj` may keep a different `CURRENT_PROJECT_VERSION` than Settings → About. On Cloud, `CI_BUILD_NUMBER` rewrites both **before** `cap:sync`.

## What Cloud does (already in this repo)

On every Cloud action, Xcode Cloud runs:

1. **`ci_post_clone.sh`** (repo-root `ci_scripts/` and the same files next to `App.xcodeproj` in `ios/App/ci_scripts/`):
   - Installs Node 22 if the image does not already have Node ≥ 20
   - If `CI_BUILD_NUMBER` is set: stamps `APP_BUILD` in `src/backup.js` and `CURRENT_PROJECT_VERSION` in the pbxproj (marketing version stays **1.0**)
   - `npm ci`
   - `npm run cap:sync` (Vite build + copy into `ios/App/App/public` + SPM plugin list)
   - Logs Capacitor native pin vs `package-lock.json` and **does not fail** on mismatch
2. **`xcodebuild` Archive**
3. **`ci_post_xcodebuild.sh`**: logs archive version strings and **always exits 0**

There is **no** Xcode Run Script phase that writes `CFBundleVersion`. That pattern fails Cloud’s mutable-output checks.

Do **not** add unused channel env vars. Boutique does not need a `BOUTIQUE_CLOUD_CHANNEL` (or similar) unless you later add a second workflow that must branch in these scripts.

## One-time App Store Connect app

Skip any step that is already done. Create a **new** iOS app — do not add a platform onto Tableside.

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers → register an **App ID** if needed:
   - Bundle ID: `se.jansson.boutiquejournal`
   - Description: Boutique Journal
2. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**:
   - Platforms: iOS
   - Name: **Boutique Journal**
   - Primary language: English (or Swedish if you already standardized on that)
   - Bundle ID: `se.jansson.boutiquejournal`
   - SKU: `boutique-journal` (or any unique SKU; this is not user-visible)
3. Encryption: the committed `Info.plist` sets `ITSAppUsesNonExemptEncryption` = **NO**. Complete the ASC compliance question the same way if ASC still asks.
4. Users: Magnus (and anyone who should see Internal builds) must be able to access this app.

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
   - Any additional GitHub SPM URLs Cloud lists on the first failed resolve
6. There is no committed `Package.resolved` yet (Linux cannot run Xcode’s resolver). The first successful Cloud/Xcode resolve will create one; committing it later is optional but makes builds more reproducible.

## Workflow settings to create (exact)

Create a **new** workflow. Suggested name: **Boutique App Store**.

| Setting | Value |
|---|---|
| Name | Boutique App Store |
| Project / workspace | `ios/App/App.xcodeproj` (scheme is inside this project) |
| Scheme | **App** (shared scheme is committed at `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`) |
| Start condition | **Branch Changes** on **`main`** |
| Primary repository | `Gorr75/wardrobe-app` |
| Xcode / macOS | Latest stable Xcode 16+ recommended (iOS 15 deployment target) |
| Environment variables | None required |
| Actions | **Archive** (Release, generic iOS device) → **Distribution Preparation** → **App Store Connect** |
| Post-action | **TestFlight Internal Testing** → Internal group **Test** |

### Internal group “Test”

If Boutique Journal does not already have an Internal testers group named **Test**:

1. App Store Connect → Boutique Journal → **TestFlight** → Internal Testing
2. Create a group named **Test**
3. Add testers (Apple IDs that belong to the team)
4. Attach that group to the workflow post-action

Do not attach Tableside’s Internal group.

### Build number floor

Xcode Cloud’s `CI_BUILD_NUMBER` starts at **1** for a new workflow. App Store Connect rejects a reuse of `1.0 (N)` if that build was already uploaded (local archives in this repo are **1.0 (3)**).

Before the first Cloud upload, in the workflow’s build-number / “next build number” control, start **above the highest Boutique Journal build already in ASC**. If nothing has been uploaded yet, starting at 1 is fine.

## First build checklist

1. Merge this PR to `main` (Cloud is configured for branch changes on `main`).
2. Confirm the workflow run executes **ci_post_clone** (Node + stamp + `cap:sync`) before Archive.
3. If SPM fetch fails: grant the GitHub package(s) listed in the Cloud log and retry.
4. If signing fails: confirm the App ID, the team on the App target, and that Cloud is managing certificates for **this** bundle ID.
5. Confirm TestFlight Internal shows **Boutique Journal 1.0 (CI_BUILD_NUMBER)** and Settings → About shows the same build.
6. Confirm the build is **not** filed under Tableside.

## Local fallback (not the recurring path)

```bash
npm install
npm run icons          # after icon.svg changes
npm run cap:sync
npx cap open ios
```

Archive in Xcode only when Cloud is unavailable. Increment **Build** (`CURRENT_PROJECT_VERSION`) for that upload; leave Version at **1.0**. You do not need to keep the committed pbxproj build in lockstep with `APP_BUILD` in `src/backup.js` — Cloud overwrites both from `CI_BUILD_NUMBER`.
