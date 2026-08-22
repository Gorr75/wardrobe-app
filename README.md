# Boutique Journal

A multi-city luxury boutique clienteling journal. Full-screen map with a Tableside-style bottom sheet — scroll to hide the header, browse boutiques, staff, and visits across **Stockholm**, **Copenhagen**, **London**, **Paris**, **Dubai**, and **Oslo**.

Live demo: [https://gorr75.github.io/wardrobe-app/](https://gorr75.github.io/wardrobe-app/)

## Cities & stores

Each city has three boutiques with map pins and directions:

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
- **Directions** — Apple Maps and Uber links per boutique
- **Staff** — contacts per boutique with roles and photos
- **Purchases** — log items with name, price, size, and photo
- **Custom boutiques** — add your own stores beyond the built-in catalog
- **Multi-city** — horizontal city picker, data filtered by city

## Development

```bash
npm install
npm run dev
```

## Deployment

GitHub Pages from `main` via [`.github/workflows/pages.yml`](.github/workflows/pages.yml).
