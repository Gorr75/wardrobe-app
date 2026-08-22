# Maison Journal — Stockholm

A client-side luxury boutique clienteling journal for Stockholm maisons. Track creators, brand-specific sizes, sales team roles, and client interactions across **Hermès**, **Omega**, and **Chanel**.

Live demo: [https://gorr75.github.io/wardrobe-app/](https://gorr75.github.io/wardrobe-app/)

## Features

- **Creators** — Stockholm-only client list with neighborhood, tags, and primary associate
- **Brand sizes** — separate sizing per maison (Hermès EU/FR, Omega wrist mm, Chanel RTW/handbag, etc.)
- **Journal** — appointments, fittings, private viewings, and follow-ups
- **Team** — Sales Associate, Senior Sales Associate, Client Advisor, Sales Manager, Boutique Director
- **Data** — export/import JSON backups via localStorage

## Stockholm seed data

The app ships with sample creators, team members, and journal entries for Stockholm boutiques:

- Hermès — Birger Jarlsgatan
- Omega — Biblioteksgatan
- Chanel — Hamngatan

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

## Deployment

GitHub Pages deploys automatically from `main` via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

Enable GitHub Pages for this repo: Settings → Pages → Source: **GitHub Actions**.

## Data storage

All data is stored in `localStorage` under `maison-journal-stockholm`. Use the **Data** tab to export or reset to the Stockholm sample list.
