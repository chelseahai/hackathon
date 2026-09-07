# Pattern page design

Use this with `web/styles.css` for every pattern page (BasicBlock-* and GarmentDesign-*). Copy the chrome; only the drawing script and measurement fields change.

Reference implementation: `web/BasicBlock-Sleeve.html`, `web/styles.css`, `web/BasicBlock-Sleeve-app.js`.

## Color

| Token | Value | Use |
|---|---|---|
| `--bg` / `--sheet` | `#111` | Page and drawing background |
| `--ink` | `#fff` | Primary text, pattern strokes, active controls |
| `--muted` | `#757575` | Section titles, slider values, inactive toggles, derived labels |
| `--line` | `#2a2a2a` | Slider track |
| Construction | `#b3b3b3` | Construction lines and offset dots |
| Grid | `#3a3a3a` | 1 cm grid |

No other accent colors. No boxes, cards, or borders around sections.

## Type

- Font: **Poppins 400** only (`https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap`)
- Never bold. `font-weight: 400` everywhere, including headings, buttons, and SVG labels. `font-synthesis: none`
- Size: `0.8rem` (html `16px`)
- `letter-spacing: 0.08rem`
- `text-transform: uppercase` on all UI and drawing labels
- Units on numbers: `xx.xx cm` (two decimals unless a third is needed, e.g. cap height)

## Layout

Full-viewport app, no page scroll on desktop.

```
[ title in topbar ]
[ drawing (flex) | sidebar 280px ]
```

- Body: CSS grid `auto 1fr`
- Main: CSS grid `1fr 280px`, height 100%, overflow hidden
- Topbar: title only, padding `20px 28px`, no subtitle
- Stage / sheet: padding 0, drawing fills the column
- Sidebar (`.panel`): padding `28px 24px`, grid rows `auto 1fr auto`, gap `28px`
  1. **Measurements** (top, natural height) + Reset
  2. **Derived** (middle band, content vertically centered)
  3. **Display** (bottom, natural height)
- Below `840px`: stack drawing above the panel; drawing `70vh` min `420px`

## Sidebar chrome

**Measurements** — one control per input: label (ink) + live value (muted) on the first row, full-width range slider under them. Slider: height `2px`, white thumb (`accent-color: var(--ink)`).

**Reset** — clickable text, not a filled button. White. Right-aligned under the last slider.

**Derived** — label (muted) left, value (ink) right. Only values the pattern actually needs (the sleeve page lists total AH, cap height, front/back cap, front/back cap ease). No extra construction trivia.

**Display** — clickable text, no checkboxes. Order: Labels, 1 cm grid, Construction Lines. Default **all off**. Off = muted grey, on = white. `aria-pressed` on the button.

No Download SVG. No boxed primary buttons.

## Drawing

SVG on `#111`. All pattern strokes use `vector-effect: non-scaling-stroke`.

| Layer | Style | Width |
|---|---|---|
| Stitch line (pattern edge) | dashed white `5 4` | `0.8` |
| Seam allowance | solid white | `0.8` |
| Grainline | solid white, **line only** (no arrows) | `0.8` |
| Construction | dashed `#b3b3b3` `5 4` | `0.8` |
| 1 cm grid | solid `#3a3a3a` | `0.6` |
| Construction points | filled `#b3b3b3` circles | radius `0.22` (cm in drawing space) |

Drawing labels: Poppins 400, uppercase, white fill. Same letter-spacing ratio as the UI (`0.1 ×` type size in drawing units).

The drawing viewBox is padded so a 1 cm grid, when shown, fills the whole sheet, not only the pattern bbox.

## New pattern page checklist

1. Link Poppins 400 and `styles.css`.
2. Keep the topbar + stage + three-block sidebar shell from `BasicBlock-Sleeve.html`.
3. Swap title, measurement fields, derived rows, and the drawing script.
4. Display toggles stay Labels / 1 cm grid / Construction Lines, all off by default.
5. Do not introduce new colors, weights, borders, or filled buttons.
6. Load `shared.js` before the page script. Bind sliders through `PatternStore` for any value another pattern also uses. Add new keys to `PatternStore.CATALOG` (and `shared/measurements.py`). If this pattern *produces* a length another pattern consumes, call `PatternStore.publish("this-pattern", { key: value })` after a successful draft.
