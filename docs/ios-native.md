# Boutique Journal — iOS / TestFlight

## Native features (Tableside parity)

| Feature | Status |
|---------|--------|
| Capacitor shell + `cap:sync` | `capacitor.config.json`, `package.json` scripts |
| Native share (boutique text, lists, backup) | `src/native-bridge.js` → Share + Filesystem |
| Haptics on swipe delete / visit | `src/native.js`, `src/app.js` |
| Contacts import for staff | Staff form → **Import from Contacts** (iOS only) |
| Theme picker (Current / Light / Midnight) | Settings → Display |
| `capacitor-native` layout CSS | Already in `src/tableside.css` |

## Icons

```bash
pip install pillow   # once
npm run icons
```

Generates:

- `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/*` (if `ios/` exists)

Source reference: `icon.svg` — Tableside-style gold plate with hanger + shopping bag.

**Do not** use `npx capacitor-assets generate` — Apple may reject the default Capacitor template icon.

## Build for TestFlight

```bash
npm install
npm run icons          # after icon changes
npm run cap:sync       # build web + copy to ios/
npx cap open ios
```

In Xcode:

- Version **1.0**, increment **Build** each upload
- Archive → Distribute → App Store Connect → Upload

## Info.plist (on your Mac)

Match Tableside:

- Camera, Photo Library, Contacts usage strings
- `ITSAppUsesNonExemptEncryption` = **NO**
- `UIFileSharingEnabled` = **YES** (backup files in Files app)

## Version sync

Keep aligned:

1. Xcode **Version** / **Build**
2. `APP_VERSION` / `APP_BUILD` in `src/backup.js` (Settings → About)
