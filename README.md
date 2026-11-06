# Pedal Mafia PLP prototype

Coded prototype of the Pedal Mafia PLP redesign, built on the live US Men's Jerseys collection
(`https://usa.pedalmafia.cc/collections/jerseys`).

**Design source:** Figma `[PM] Templates & Pages`, section "PLP - Grid Sizes" (`228:1750`).
"PM - PLP Template - 4 Column" (`228:20`) is the source of truth for the card (Card A2: name, price,
colorway, swatches). The 3 and 6 column frames set the grid behavior (2 × 2 editorial tiles).

## What it does

- **Grid sizes (desktop, 990+):** 3 / 4 / 6 / Index. Index is images only. Below 990 the grid
  selector is hidden and the grid is 2 columns on tablet and mobile.
- **View:** Product (white flat lays on #F3F3F3 with multiply) or On figure (studio shot, falling
  back to the flat lay when there isn't one).
- **Swatches:** tapping a swatch swaps the tile to that colorway in place. Collab and print
  colorways are grouped separately from solids.
- **Second shot:** on desktop, hovering a card photo brings in the other shot with the rack focus
  (on figure in the Product view, flat lay in On figure). On tablet and mobile, the photo swipes
  between the two, with a 2px bar 4px under it (Taylor Stitch pattern).
- **Editorial tiles:** the two inline editorial images from the Figma, linking to their products. Pro Nomadic carries a line of copy under its label, top left (Figma `228:119`); both use a 48% black scrim over the top quarter (top half on mobile). On
  desktop they span 2 columns × 2 rows at 4 and 6 columns, and one slot at 3 columns; on tablet and mobile each takes its own full-width row, after 4 products and then 8 more. Labels
  pin below the toolbar while scrolling. Hidden in Index view and while filtering or sorting.
- **Filter panel:** View (Product / On figure, mirrored from the toolbar and applied straight away),
  then Fit, Line and In stock only, with live counts. A left drawer on desktop (25rem) that fades in moving right and reverses on close; a bottom action sheet
  below 990, where the toolbar is just Filter and Sort. **Sort:** featured or by price.
- Sold-out products sort last, with a dimmed image and a "Sold out" badge.
- **Rack focus + fade up:** on-screen tiles rise 24px and resolve from a 10px blur into focus, staggered 120ms apart over 1.2s,
  on load, grid size change, applied filters and the view switch. Hovering a swatch previews that
  colorway with the same effect, rings the swatch in light gray (#BBBDC0, desktop), and fades the colorway
  name up into place (16px over 300ms, from playground/swatch-hover-fade-up). Off with reduced motion.
- **Transition tuner** (bottom right, temporary): sliders for duration, stagger, blur, rise, scale, fade
  length and hover swap, an easing menu, on/off, and Replay / Reset / Copy CSS. Values save in the
  browser and apply inside the Tablet and Mobile frames. Reset returns to the current CSS defaults.
  Comment out its script tag in `index.html` to hide it again.
- **Viewport switcher** (top right, review tool only): Desktop shows the page as-is; Tablet (820 × 1180)
  and Mobile (393 × 852) load it in a frame at true size, so the real breakpoints apply. It hides itself
  on narrow screens and remembers the last choice.

## Run locally

```bash
python3 serve.py
```

Then open http://localhost:5181. The server live-reloads on file changes.

## Refresh the product data

`data.js` is generated from the store's public product JSON:

```bash
curl -sL "https://usa.pedalmafia.cc/collections/jerseys/products.json?limit=250" -o /tmp/pm-jerseys.json
python3 tools/build_data.py /tmp/pm-jerseys.json
```

It needs Pillow (`pip install pillow`) to classify images and sample swatch colors.

## Notes

- Inter stands in for ABC Whyte, the brand font, which is licensed and not bundled here.
- Product images load from Shopify's CDN; nothing is copied into the repo except the two editorial
  photos from Figma.
- The share image (`assets/og-image.jpg`, 1200 × 630) is a capture of the page top. To retake it, load the
  page with `?clean=1`, which hides the viewport switcher and transitions panel.
