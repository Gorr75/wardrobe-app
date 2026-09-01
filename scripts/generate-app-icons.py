#!/usr/bin/env python3
"""Generate Boutique Journal app icons for web and iOS (no baked rounded corners)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
IOS_ICONSET = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset"

SIZE = 1024
CX, CY = SIZE // 2, int(SIZE * 0.46)


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


def draw_star(draw, cx, cy, outer_r, inner_r, color, width=16):
    import math

    points = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        r = outer_r if i % 2 == 0 else inner_r
        points.append((cx + r * math.cos(angle), cy - r * math.sin(angle)))
    draw.line(points + [points[0]], fill=color, width=width, joint="curve")


def load_font(size: int):
    candidates = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/NewYork.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_icon(variant: str = "default") -> Image.Image:
    if variant == "dark":
        img = radial_background(SIZE, (20, 18, 16), (8, 7, 6))
        gold = (232, 196, 122)
        accent = (184, 137, 63)
    elif variant == "tinted":
        img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        gold = (255, 255, 255)
        accent = (255, 255, 255)
    else:
        img = radial_background(SIZE, (26, 22, 18), (16, 14, 12))
        gold = (240, 212, 138)
        accent = (184, 137, 63)

    draw = ImageDraw.Draw(img)
    if variant != "tinted":
        draw_star(draw, CX, int(SIZE * 0.34), 118, 52, accent, width=18)

    font = load_font(248 if variant != "tinted" else 260)
    text = "BJ"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = CX - tw / 2 - bbox[0]
    y = CY - th / 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=gold)

    if variant == "default":
        return img.convert("RGB")
    if variant == "dark":
        return img.convert("RGB")
    return img


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
