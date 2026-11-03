"""Build data.js for the PM PLP prototype from the live Men's Jerseys collection.

Usage: python3 tools/build_data.py <products.json> [more.json...]
Writes data.js next to index.html. Re-run to refresh prices, stock and images.
"""
import io
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
STORE = "https://usa.pedalmafia.cc"

# Order: the store's own merch order for the collection (the products.json order matches the live
# collection page). Sold-out products already sit at the end there (PM-12).

# Collab and print colorways get their own swatch group, separate from solids (PM-9).
COLLABS = ["Jean-Michel Basquiat", "PAC-MAN", "MotoGP", "Williams", "ROADNATS", "Oracle Red Bull Racing",
           "Keith Haring", "Kenny Scharf", "Lawrence Naesen", "Glitch Flow", "Wiggins", "Dusk",
           "Caleb Ewan"]

UA = {"User-Agent": "Mozilla/5.0 (PM PLP prototype build)"}


def fetch_img(url, width=160):
    req = urllib.request.Request(url.split("?")[0] + f"?width={width}", headers=UA)
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")


def corners(im):
    w, h = im.size
    return [im.getpixel((2, 2)), im.getpixel((w - 3, 2)), im.getpixel((2, h - 3)), im.getpixel((w - 3, h - 3))]


def is_white(im):
    return min(min(c) for c in corners(im)) >= 235


def is_studio(im):
    # Studio backdrops: low-saturation corners that are close to each other.
    cs = corners(im)
    sat = max(max(c) - min(c) for c in cs)
    spread = max(max(abs(a[i] - b[i]) for i in range(3)) for a in cs for b in cs)
    return sat < 28 and spread < 40


def garment_hex(im):
    w, h = im.size
    px = [im.getpixel((x, y)) for x in range(int(w * .3), int(w * .7), 3) for y in range(int(h * .3), int(h * .7), 3)]
    px = [p for p in px if min(p) < 235] or [(240, 240, 240)]
    px.sort(key=sum)
    return "#%02X%02X%02X" % px[len(px) // 2]


def classify(p):
    """Return (flat image, on-figure image or None, swatch hex)."""
    flat = figure = None
    hexv = None
    studio = lifestyle = None
    for im in p["images"][:8]:
        try:
            small = fetch_img(im["src"])
        except Exception:
            continue
        rec = {"src": im["src"].split("?")[0], "w": im["width"], "h": im["height"]}
        if is_white(small):
            if flat is None:
                flat, hexv = rec, garment_hex(small)
        elif studio is None and is_studio(small) and im["height"] >= im["width"]:
            studio = rec
        elif lifestyle is None and im["height"] >= im["width"]:
            lifestyle = rec
    figure = studio or lifestyle
    if flat is None and p["images"]:
        im = p["images"][0]
        flat = {"src": im["src"].split("?")[0], "w": im["width"], "h": im["height"]}
    return flat, figure, hexv or "#BBBDC0"


def split_title(title):
    t = re.sub(r"\s+", " ", title.strip())
    t = re.sub(r"^(Men's|Mens|Unisex)\s+", "", t)
    m = re.match(r"(.*?)\s+-\s+(.*)$", t)
    return (m.group(1).strip(), m.group(2).strip()) if m else (t, "")


def group_key(style, colorway):
    for c in COLLABS:
        if colorway.lower().startswith(c.lower()) or c.lower() in colorway.lower():
            return f"{style} · {c}"
    return style


def main(paths):
    products = []
    for path in paths:
        products += json.load(open(path))["products"]
    seen, keep = set(), []
    for p in products:
        if p["id"] in seen:
            continue
        seen.add(p["id"])
        tags = p["tags"]
        if p["product_type"] != "Jerseys":
            continue
        if not any(t in ("Gender: Men", "Gender: Unisex") for t in tags):
            continue
        if p["title"].strip().startswith("Women"):
            continue
        keep.append(p)

    with ThreadPoolExecutor(max_workers=12) as ex:
        imgs = list(ex.map(classify, keep))

    out = []
    for p, (flat, figure, hexv) in zip(keep, imgs):
        style, colorway = split_title(p["title"])
        v = p["variants"]
        price = min(float(x["price"]) for x in v)
        cmp_ = max((float(x["compare_at_price"] or 0) for x in v), default=0)
        tags = p["tags"]
        out.append({
            "id": p["id"],
            "handle": p["handle"],
            "url": f"{STORE}/products/{p['handle']}",
            "style": style,
            "colorway": colorway,
            "price": price,
            "compare": cmp_ if cmp_ > price else None,
            "available": any(x["available"] for x in v),
            "fit": next((t[5:] for t in tags if t.startswith("Fit: ")), None),
            "line": next((t[12:] for t in tags if t.startswith("Collection: ")), None),
            "group": group_key(style, colorway),
            "swatch": hexv,
            "flat": flat,
            "figure": figure,
        })

    out.sort(key=lambda x: not x["available"])  # stable: keeps merch order, sold out last

    js = "// Generated by tools/build_data.py from " + STORE + "/collections/jerseys. Do not edit by hand.\n"
    js += "window.PM_PRODUCTS = " + json.dumps(out, indent=1, ensure_ascii=False) + ";\n"
    (ROOT / "data.js").write_text(js)
    print(f"{len(out)} products · {sum(1 for x in out if x['figure'])} with on-figure · "
          f"{sum(1 for x in out if not x['available'])} sold out · {sum(1 for x in out if x['compare'])} on sale")


if __name__ == "__main__":
    main(sys.argv[1:])
