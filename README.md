# Maison Journal

A multi-city luxury boutique clienteling journal. Full-screen map with a Tableside-style bottom sheet — scroll to hide the header, browse stores, creators, and journal entries across **Stockholm**, **Copenhagen**, **London**, **Paris**, **Dubai**, and **Oslo**.

Live demo: [https://gorr75.github.io/wardrobe-app/](https://gorr75.github.io/wardrobe-app/)

## Cities & stores

Each city has three maisons with map pins and directions:

| City | Hermès | Omega | Chanel |
|------|--------|-------|--------|
| Stockholm | Hamngatan (NK) | Biblioteksgatan 3 | Birger Jarlsgatan 7 |
| Copenhagen | Amagertorv | Østergade | Store Kongensgade |
| London | New Bond Street | Old Bond Street | New Bond Street |
| Paris | Faubourg Saint-Honoré | Rue François 1er | Rue Cambon |
| Dubai | Mall of the Emirates | Dubai Mall | Dubai Mall |
| Oslo | Karl Johans gate | Karl Johans gate | Nedre Slottsgate |

## Features

- **Map + bottom sheet** — Apple Maps-style layout; header hides on scroll
- **Directions** — Apple Maps, Uber, and Google Maps links per boutique
- **Creators** — per-city client list with brand-specific sizes
- **Journal** — appointments, fittings, follow-ups
- **Team** — Sales Associate through Boutique Director
- **Multi-city** — horizontal city picker, data filtered by city

## Development

```bash
npm install
npm run dev
```

## Deployment

GitHub Pages from `main` via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).
