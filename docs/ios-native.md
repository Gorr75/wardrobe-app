# Boutique Journal — iOS / TestFlight

## Preferred path: Xcode Cloud

Recurring TestFlight Internal uploads go through **Xcode Cloud**, not a local Archive.

See **[docs/xcode-cloud.md](xcode-cloud.md)** for ASC inventory (Apple ID **6807574028**), creating the **Boutique App Store** workflow (scheme **App**, branch **main**, TestFlight Internal group **BU Butiksapp**), and signing / SPM grant notes.

On Cloud, `CI_BUILD_NUMBER` is written to both `CFBundleVersion` and the Settings version line (`APP_BUILD` in `src/backup.js`) in `ci_post_clone` **before** `cap:sync`. Marketing version stays **1.0**. The Settings header shows a compact `{APP_VERSION} ({APP_BUILD})` badge, e.g. `1.0 (5)`.

## Native features (Tableside parity)

| Feature | Status |
|---------|--------|
| Capacitor shell + `cap:sync` | `capacitor.config.json`, `package.json` scripts, committed `ios/` |
| Xcode Cloud → TestFlight Internal | `ci_scripts/`, [docs/xcode-cloud.md](xcode-cloud.md) |
| Native share (boutique text, lists, backup) | `src/native-bridge.js` → Share + Filesystem |
| Haptics on swipe delete / visit | `src/native.js`, `src/app.js` — light impact on Visit/Delete tap; Visit also impacts after the visit is saved (Tableside timing) |
| Contacts import for staff | Staff form → **Import from Contacts** (iOS only) |
| Theme picker (Current / Light / Midnight appearance cards) | Settings → Theme |
| `capacitor-native` layout CSS | Already in `src/tableside.css` |

## Icons

```bash
pip install pillow   # once
npm run icons
```

Generates:

- `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/*`

Source reference: `icon.svg` — Tableside-style gold plate with hanger + shopping bag. **Keep this artwork** — do not redesign or run `npx capacitor-assets generate`.

The committed `AppIcon.appiconset` is already that plate (1024 RGB, no alpha). Cloud Archive ships it as-is. ASC’s grey wireframe listing tile is a **separate** App Information upload (or a processed build) — see [xcode-cloud.md](xcode-cloud.md). To update the Connect tile before a build processes, upload `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`.

## Local Xcode (fallback only)

Use this when Cloud is not available. It is not the recurring TestFlight path.

```bash
npm install
npm run icons          # after icon changes
npm run cap:sync       # build web + copy to ios/
npx cap open ios
```

In Xcode:

- Version **1.0**, increment **Build** each upload
- Archive → Distribute → App Store Connect → Upload

If a local upload already consumed `1.0 (N)`, the Cloud workflow’s next `CI_BUILD_NUMBER` must start above that N. Build **3** failed processing (90683) but may still be reserved — see [docs/xcode-cloud.md](xcode-cloud.md).

## Info.plist

Committed in `ios/App/App/Info.plist`. Local TestFlight **1.0 (3)** failed ITC **Error 90683** because `NSContactsUsageDescription` was missing — do not ship without these keys (`ci_post_clone` checks them):

- `NSContactsUsageDescription` (staff → Import from Contacts)
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`
- `ITSAppUsesNonExemptEncryption` = **NO**
- `UIFileSharingEnabled` = **YES** and `LSSupportsOpeningDocumentsInPlace` = **YES** (backup files in Files app)

## Version sync

| Field | Local repo | Xcode Cloud |
|---|---|---|
| Marketing / Settings `APP_VERSION` | `1.0` in `src/backup.js` | Left at **1.0** |
| Settings `APP_BUILD` | `src/backup.js` (currently 3) | Rewritten from `CI_BUILD_NUMBER` |
| Xcode Version | `MARKETING_VERSION` = 1.0 | Left at **1.0** |
| Xcode Build | `CURRENT_PROJECT_VERSION` (local number may differ) | Rewritten from `CI_BUILD_NUMBER` |

A local pbxproj build that does not match `APP_BUILD` is OK. Cloud unifies them. Do not add a “Stamp CFBundleVersion” Run Script — it fails Xcode Cloud mutable-output checks.
