"""SVG / HTML drawing of a trouser front and back draft."""

from __future__ import annotations

from html import escape
from pathlib import Path

from draft import (
    TrouserDraft,
    Vec2,
    back_outline,
    close_ring,
    front_display_shift,
    front_outline,
    mirror_x,
    translate,
)


def _bbox(draft: TrouserDraft, margin: float = 4.0) -> tuple[float, float, float, float]:
    dx = front_display_shift(draft)
    back = back_outline(draft)
    front = translate(front_outline(draft), dx)
    xs = [pt.x for pt in back + front]
    ys = [pt.y for pt in back + front]
    min_x = min(xs) - margin
    max_x = max(xs) + margin
    min_y = min(ys) - margin
    max_y = max(ys) + margin
    return min_x, min_y, max_x, max_y


def _poly(points: list[Vec2], to_svg) -> str:
    return " ".join(f"{to_svg(pt)[0]:.3f},{to_svg(pt)[1]:.3f}" for pt in points)


def trouser_svg(draft: TrouserDraft, *, display_width: int = 560) -> str:
    min_x, min_y, max_x, max_y = _bbox(draft)
    width = max_x - min_x
    height = max_y - min_y
    display_height = round(display_width * height / width)

    def to_svg(pt: Vec2) -> tuple[float, float]:
        return (pt.x - min_x, max_y - pt.y)

    def line(a: Vec2, b: Vec2, cls: str) -> str:
        ax, ay = to_svg(a)
        bx, by = to_svg(b)
        return (
            f'<line class="{cls}" x1="{ax:.3f}" y1="{ay:.3f}" '
            f'x2="{bx:.3f}" y2="{by:.3f}" />'
        )

    def circle(pt: Vec2, r: float, cls: str) -> str:
        x, y = to_svg(pt)
        return f'<circle class="{cls}" cx="{x:.3f}" cy="{y:.3f}" r="{r}" />'

    def text(pt: Vec2, label: str, cls: str, dx: float = 0.0, dy: float = 0.0) -> str:
        x, y = to_svg(pt)
        return (
            f'<text class="{cls}" x="{x + dx:.3f}" y="{y + dy:.3f}">'
            f"{escape(label)}</text>"
        )

    def ticks(points: list[Vec2], tick: float = 0.5) -> str:
        parts = []
        for pt in points:
            parts.append(line(Vec2(pt.x - tick, pt.y), Vec2(pt.x + tick, pt.y), "construction"))
            parts.append(circle(pt, 0.22, "point"))
        return "\n  ".join(parts)

    def ticks_along(points: list[Vec2], tick: float = 0.45) -> str:
        parts = []
        n = len(points)
        for i, pt in enumerate(points):
            if i == 0:
                tangent = points[1] - points[0]
            elif i == n - 1:
                tangent = points[i] - points[i - 1]
            else:
                tangent = points[i + 1] - points[i - 1]
            unit = tangent.unit()
            nx, ny = -unit.y, unit.x
            parts.append(
                line(
                    Vec2(pt.x - nx * tick, pt.y - ny * tick),
                    Vec2(pt.x + nx * tick, pt.y + ny * tick),
                    "construction",
                )
            )
            parts.append(circle(pt, 0.22, "point"))
        return "\n  ".join(parts)

    dx = front_display_shift(draft)
    back = close_ring(back_outline(draft))
    front = close_ring(translate(front_outline(draft), dx))

    def B(pt: Vec2) -> Vec2:
        return mirror_x(pt)

    def M(pt: Vec2) -> Vec2:
        return Vec2(pt.x + dx, pt.y)

    thirds = [M(pt) for pt in draft.crotch_thirds]
    rise = [M(pt) for pt in draft.rise_thirds]

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}"
     width="{display_width}" height="{display_height}" role="img"
     aria-label="Women's basic trouser block, back and front">
  <style>
    .construction {{ stroke: #b3b3b3; stroke-width: 0.12; stroke-dasharray: 0.45 0.35; fill: none; }}
    .outline {{ stroke: #111; stroke-width: 0.28; fill: none; }}
    .label {{ font: 2.2px "Segoe UI", sans-serif; fill: #111; }}
    .point {{ fill: #b3b3b3; }}
  </style>
  {line(B(Vec2(draft.back_hl_side.x, draft.wl_y)), B(draft.back_base), "construction")}
  {line(B(Vec2(draft.back_hl_side.x, draft.hl_y)), B(draft.back_cb_hl), "construction")}
  {line(B(draft.back_base), B(draft.back_crotch_on_cl), "construction")}
  {line(B(draft.back_crotch_on_cl), B(draft.back_crotch_tip), "construction")}
  {line(B(draft.back_hem_side), B(draft.back_hem_inseam), "construction")}
  {line(B(Vec2(draft.back_knee_side.x, draft.kl_y)), B(Vec2(draft.back_knee_inseam.x, draft.kl_y)), "construction")}
  {line(B(draft.back_cb_waist), B(draft.back_base), "construction")}
  {line(B(Vec2(draft.crease_x, draft.wl_y)), B(Vec2(draft.crease_x, draft.hem_y)), "construction")}
  {line(B(draft.back_crotch_tip), B(draft.back_hem_inseam), "construction")}
  {line(B(draft.back_hl_side), B(draft.back_knee_side), "construction")}
  {line(M(Vec2(draft.side_x, draft.wl_y)), M(Vec2(draft.cf_box_x, draft.wl_y)), "construction")}
  {line(M(Vec2(draft.side_x, draft.hl_y)), M(Vec2(draft.cf_box_x, draft.hl_y)), "construction")}
  {line(M(Vec2(draft.side_x, draft.cl_y)), M(draft.point5), "construction")}
  {line(M(draft.hem_side), M(draft.hem_inseam), "construction")}
  {line(M(Vec2(draft.side_x, draft.kl_y)), M(Vec2(draft.knee_inseam.x + 1, draft.kl_y)), "construction")}
  {line(M(Vec2(draft.side_x, draft.wl_y)), M(Vec2(draft.side_x, draft.hem_y)), "construction")}
  {line(M(Vec2(draft.cf_box_x, draft.wl_y)), M(Vec2(draft.cf_box_x, draft.cl_y)), "construction")}
  {line(M(Vec2(draft.cf_x, draft.wl_y)), M(draft.cf_hl), "construction")}
  {line(M(Vec2(draft.crease_x, draft.wl_y)), M(Vec2(draft.crease_x, draft.hem_y)), "construction")}
  {line(M(draft.hem_side), M(draft.point4), "construction")}
  {line(M(draft.point4), M(draft.waist_corner), "construction")}
  {line(M(draft.knee_side), M(draft.hem_side), "construction")}
  {line(M(draft.knee_side), M(draft.waist_corner), "construction")}
  {line(M(draft.point5), M(draft.hem_inseam), "construction")}
  {line(M(draft.hip11), M(draft.point5), "construction")}
  {line(M(draft.crotch_corner), M(draft.bisector_hit), "construction")}
  {line(B(Vec2(draft.back_dart_mid.x, draft.back_dart_mid.y + 0.6)), B(draft.back_dart_apex), "construction")}
  {line(M(Vec2(draft.dart_cf_mid.x, draft.dart_cf_mid.y + 0.6)), M(draft.dart_cf_apex), "construction")}
  {line(M(Vec2(draft.dart_side_mid.x, draft.dart_side_mid.y + 0.6)), M(draft.dart_side_apex), "construction")}
  {ticks(rise)}
  {ticks_along(thirds, 0.45)}
  <polyline class="outline" points="{_poly(back, to_svg)}" />
  <polyline class="outline" points="{_poly(front, to_svg)}" />
  {circle(B(draft.back_cb_waist), 0.22, "point")}
  {circle(B(draft.back_side_waist), 0.22, "point")}
  {circle(B(draft.back_base), 0.22, "point")}
  {circle(B(draft.back_crotch_on_cl), 0.22, "point")}
  {circle(B(draft.back_crotch_tip), 0.22, "point")}
  {circle(B(draft.back_cb_hl), 0.22, "point")}
  {circle(B(draft.back_hl_side), 0.22, "point")}
  {circle(B(draft.back_knee_side), 0.22, "point")}
  {circle(B(draft.back_knee_inseam), 0.22, "point")}
  {circle(B(draft.back_hem_side), 0.22, "point")}
  {circle(B(draft.back_hem_inseam), 0.22, "point")}
  {circle(B(draft.back_hem_mid), 0.22, "point")}
  {circle(B(draft.back_dart_apex), 0.22, "point")}
  {circle(M(draft.cf_waist), 0.22, "point")}
  {circle(M(draft.side_waist), 0.22, "point")}
  {circle(M(draft.point4), 0.22, "point")}
  {circle(M(draft.point5), 0.22, "point")}
  {circle(M(draft.hip11), 0.22, "point")}
  {circle(M(draft.knee_side), 0.22, "point")}
  {circle(M(draft.knee_inseam), 0.22, "point")}
  {circle(M(draft.hem_side), 0.22, "point")}
  {circle(M(draft.hem_inseam), 0.22, "point")}
  {circle(M(draft.hem_mid), 0.22, "point")}
  {text(B(Vec2(draft.crease_x + 0.6, (draft.hl_y + draft.kl_y) / 2)), "Back", "label")}
  {text(M(Vec2(draft.crease_x + 0.6, (draft.hl_y + draft.kl_y) / 2)), "Front", "label")}
</svg>
'''
    return svg


def write_svg(draft: TrouserDraft, path: Path, *, display_width: int = 560) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(trouser_svg(draft, display_width=display_width), encoding="utf-8")
    return path


def html_page(draft: TrouserDraft) -> str:
    p = draft.params
    svg = trouser_svg(draft, display_width=620)

    def row(name: str, value: str) -> str:
        return f"<tr><th>{escape(name)}</th><td>{escape(value)}</td></tr>"

    rows = "\n".join(
        [
            row("Hip", f"{p.hip:.2f} cm"),
            row("Waist", f"{p.waist:.2f} cm"),
            row("Trouser length", f"{p.trouser_length:.2f} cm"),
            row("Rise", f"{p.rise:.2f} cm"),
            row("Hem", f"{p.hem:.2f} cm"),
            row("Front hip H/4 + 1.5", f"{draft.front_hip:.2f} cm"),
            row("Back hip H/4 + 1.5", f"{draft.back_hip:.2f} cm"),
            row("Front crotch", f"{draft.crotch_ext:.2f} cm"),
            row("Back crotch", f"{draft.back_crotch_ext:.2f} cm"),
            row("Front waist W/4 + 5", f"{draft.front_waist:.2f} cm"),
            row("Back waist W/4 + 3", f"{draft.back_waist_len:.2f} cm"),
        ]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Women's basic trouser block</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{
      margin: 0; font-family: "Segoe UI", "Source Han Sans SC", sans-serif;
      background: #f6f3ee; color: #1c1c1c;
    }}
    main {{
      max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px;
      display: grid; grid-template-columns: minmax(280px, 1fr) minmax(320px, 420px);
      gap: 28px;
    }}
    h1 {{ font-size: 1.4rem; font-weight: 600; margin: 0 0 8px; }}
    .lead {{ color: #444; margin: 0 0 20px; }}
    .sheet {{ background: #fff; padding: 16px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 0.92rem; }}
    th, td {{ text-align: left; padding: 6px 0; border-bottom: 1px solid #e4ddd3; }}
    th {{ font-weight: 600; width: 58%; color: #333; }}
    td {{ font-variant-numeric: tabular-nums; }}
    h2 {{ font-size: 1rem; margin: 24px 0 8px; }}
    ol {{ margin: 0; padding-left: 1.2rem; color: #333; line-height: 1.45; font-size: 0.92rem; }}
    @media (max-width: 840px) {{
      main {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Women's basic trouser block</h1>
      <p class="lead">Coded from the draft on pages 117-120.
      Construction lines are grey; the outline is the finished back (left) and front (right).</p>
      <div class="sheet">{svg}</div>
    </section>
    <aside>
      <h2>Reference sizes (pages 117-120)</h2>
      <table>{rows}</table>
      <h2>Front construction</h2>
      <ol>
        <li>Length down, waist and hem square to it.</li>
        <li>Rise 26 (body rise + 1.5) for the crotch line.</li>
        <li>Front hip H/4 + 1.5.</li>
        <li>Side indent 0.5 on the crotch line.</li>
        <li>Crotch extension: a quarter of front hip, minus 1.</li>
        <li>Crease at the midpoint of (4) and (5).</li>
        <li>Knee at the crotch-to-hem midpoint, then up 4.</li>
        <li>Hem 9.5 either side of the crease.</li>
        <li>Auxiliary side through (8) and (4) to the waist corner.</li>
        <li>Knee 1 cm in from that auxiliary; (5) down to the inseam hem.</li>
        <li>Rise split into thirds; hip line at the third above the crotch.</li>
        <li>Centre front 0.7 in from the hip-width line.</li>
        <li>Crotch curve: (11) to (5) through the second third of the 90-degree bisector.</li>
        <li>Waist W/4 + 5 from centre front; side up 0.5.</li>
        <li>Side out to the hip, 0.2 hollow toward the knee.</li>
        <li>Inseam 0.3 hollow above the knee.</li>
        <li>Hem up 0.5 at the crease.</li>
        <li>Two darts of 2.5, 11 cm near the crease and 10 cm toward the side.</li>
      </ol>
      <h2>Back construction</h2>
      <ol>
        <li>Base at the front crotch × hip-width corner.</li>
        <li>Back crotch width: front crotch plus 4.</li>
        <li>Drop the crotch tip 1 cm.</li>
        <li>Centre-back mark 5 cm in from the hip-width line; slant through the base.</li>
        <li>Extend that slant 1.5 cm for the centre-back waist.</li>
        <li>Back waist W/4 + 3; side raised 0.5.</li>
        <li>Back hip H/4 + 1.5 from the slanted centre back.</li>
        <li>Knee 1 cm wider than the front on each side.</li>
        <li>Hem 1 cm wider than the front on each side.</li>
        <li>Crotch curve 0.7 in from the front curve, faired into the centre-back slant.</li>
        <li>Smooth the waist after the dart.</li>
        <li>Side: 0.3 out between waist and hip; 0.4 in between crotch and knee.</li>
        <li>Inseam: 1.3 in at the upper third, 1 in at the lower third.</li>
        <li>Hem down 0.5 at the crease.</li>
        <li>One dart 3 cm wide × 12 cm, perpendicular to the waist, at the midpoint.</li>
      </ol>
    </aside>
  </main>
</body>
</html>
"""


def write_html(draft: TrouserDraft, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html_page(draft), encoding="utf-8")
    return path
