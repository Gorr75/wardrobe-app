#!/usr/bin/env python3
"""Generate Boutique Journal icons in the Tableside plate style (no grid, no baked corners)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
IOS_ICONSET = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset"

SIZE = 1024
CANVAS = SIZE * 2
CX, CY = 1024, 1040


def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def radial_background(size: int, inner, outer):
    img = Image.new("RGB", (size, size), outer)
    px = img.load()
    cx = cy = size / 2
    max_r = (size * 0.72) ** 2
    for y in range(size):
        dy = y - cy
        for x in range(size):
            dx = x - cx
            t = min(1.0, (dx * dx + dy * dy) / max_r) ** 2
            px[x, y] = mix(inner, outer, t)
    return img


def draw_plate(draw, rim, well, highlight=None):
    draw.ellipse([CX - 660, CY - 660, CX + 660, CY + 660], fill=rim)
    draw.ellipse([CX - 548, CY - 548, CX + 548, CY + 548], fill=well)
    draw.ellipse([CX - 500, CY - 500, CX + 500, CY + 500], outline=rim, width=16)
    if highlight:
        draw.arc([CX - 530, CY - 530, CX + 530, CY + 530], start=200, end=255, fill=highlight, width=20)


def draw_hanger(draw, color, cx, cy):
    draw.arc([cx - 90, cy - 250, cx + 90, cy - 70], start=200, end=340, fill=color, width=28)
    draw.rounded_rectangle([cx - 150, cy - 70, cx + 150, cy - 34], radius=12, fill=color)
    draw.line([(cx - 150, cy - 52), (cx - 210, cy + 170)], fill=color, width=28)
    draw.line([(cx + 150, cy - 52), (cx + 210, cy + 170)], fill=color, width=28)


def draw_shopping_bag(draw, color, cx, cy):
    draw.rounded_rectangle([cx - 24, cy - 250, cx + 24, cy - 170], radius=10, fill=color)
    draw.arc([cx - 120, cy - 250, cx - 24, cy - 120], start=200, end=340, fill=color, width=24)
    draw.arc([cx + 24, cy - 250, cx + 120, cy - 120], start=200, end=340, fill=color, width=24)
    draw.polygon(
        [
            (cx - 150, cy - 150),
            (cx + 150, cy - 150),
            (cx + 120, cy + 190),
            (cx - 120, cy + 190),
        ],
        fill=color,
    )
    draw.line([(cx - 150, cy - 150), (cx + 150, cy - 150)], fill=color, width=12)


def draw_boutique_marks(draw, color):
    """Tableside uses fork + knife on the plate; Boutique uses hanger + shopping bag."""
    draw_hanger(draw, color, CX - 220, CY + 20)
    draw_shopping_bag(draw, color, CX + 220, CY + 20)


def render_icon(variant: str = "default") -> Image.Image:
    if variant == "dark":
        img = radial_background(CANVAS, (34, 28, 22), (10, 8, 6))
        rim = (176, 132, 58)
        well = (24, 20, 16)
        mark = (224, 188, 118)
        highlight = (240, 210, 150)
    elif variant == "tinted":
        img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse([CX - 500, CY - 500, CX + 500, CY + 500], outline=(255, 255, 255, 255), width=28)
        draw_boutique_marks(draw, (255, 255, 255, 255))
        return img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    else:
        img = radial_background(CANVAS, (42, 34, 28), (16, 14, 12))
        rim = (201, 162, 39)
        well = (28, 24, 20)
        mark = (240, 212, 138)
        highlight = (255, 230, 180)

    draw = ImageDraw.Draw(img)
    draw_plate(draw, rim, well, highlight)
    draw_boutique_marks(draw, mark)
    return img.resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGB")


def save_png(path: Path, image: Image.Image, size: int | None = None):
    path.parent.mkdir(parents=True, exist_ok=True)
    out = image
    if size and size != image.width:
        out = image.resize((size, size), Image.Resampling.LANCZOS)
    if path.suffix.lower() == ".png" and out.mode == "RGBA" and "tinted" not in path.name:
        out = out.convert("RGB")
    out.save(path, format="PNG", optimize=True)
    print(f"Wrote {path}")


def main():
    default_icon = render_icon("default")
    dark_icon = render_icon("dark")
    tinted_icon = render_icon("tinted")

    save_png(PUBLIC / "apple-touch-icon.png", default_icon, 180)
    save_png(PUBLIC / "icon-192.png", default_icon, 192)
    save_png(PUBLIC / "icon-512.png", default_icon, 512)

    if IOS_ICONSET.exists():
        save_png(IOS_ICONSET / "AppIcon-512@2x.png", default_icon, 1024)
        save_png(IOS_ICONSET / "AppIcon-dark.png", dark_icon, 1024)
        save_png(IOS_ICONSET / "AppIcon-tinted.png", tinted_icon, 1024)
    else:
        print("iOS icon set not found — run `npx cap add ios` first, then re-run `npm run icons`.")

    print("Done.")


if __name__ == "__main__":
    main()
