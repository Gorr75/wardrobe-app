# Wardrobe Journal

A client-side wardrobe journal app. Track clothing pieces, log daily outfits, and export your data — everything stays in your browser via localStorage.

Live demo: [https://gorr75.github.io/wardrobe-app/](https://gorr75.github.io/wardrobe-app/)

## Features

- **Wardrobe** — add, edit, and categorize clothing pieces
- **Journal** — log what you wore, when, and how it felt
- **Wear counts** — see how often each piece appears in your journal
- **Export / import** — back up or restore your data as JSON
- **Fully client-side** — no backend or account required

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/wardrobe-app/](http://localhost:5173/wardrobe-app/) during local development.

## Build

```bash
npm run build
npm run preview
```

The production build outputs to `dist/` and is configured for GitHub Pages at `/wardrobe-app/`.

## Deployment

GitHub Pages deploys automatically from `main` via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

Ensure GitHub Pages is enabled for this repository (Settings → Pages → Source: GitHub Actions).

## Data storage

All wardrobe and journal data is stored in `localStorage` under the key `wardrobe-journal-data`. Use the **Data** tab to export a JSON backup.

## Note on the original wardrobe-side app

The previous URL `https://gorr75.github.io/repo/wardrobe-side/` was not available (404, no matching source repository). This repo contains a rebuilt client-side wardrobe journal app aligned with the project name and README description.
