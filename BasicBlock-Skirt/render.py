"""SVG / HTML drawing of a skirt draft."""

from __future__ import annotations

from html import escape
from pathlib import Path

from draft import (
    SkirtDraft,
    Vec2,
    back_outline,
    close_ring,
    front_display_shift,
    front_outline,
    translate,
)


def _bbox(draft: SkirtDraft, margin: float = 4.0) -> tuple[float, float, float, float]:
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


def skirt_svg(draft: SkirtDraft, *, display_width: int = 520) -> str:
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

    dx = front_display_shift(draft)
    back = close_ring(back_outline(draft))
    front = close_ring(translate(front_outline(draft), dx))

    def M(pt: Vec2) -> Vec2:
        return Vec2(pt.x + dx, pt.y)

    def waist_thirds(from_x: float, to_x: float, y: float, shift: float = 0.0) -> str:
        span = to_x - from_x
        tick = 0.5
        parts: list[str] = []
        xs = [from_x + span * k / 3.0 for k in range(4)]
        for k, x in enumerate(xs):
            pt = Vec2(x + shift, y)
            parts.append(line(Vec2(pt.x, pt.y - tick), Vec2(pt.x, pt.y + tick), "construction"))
            if 0 < k < 3:
                parts.append(circle(pt, 0.22, "point"))
        for k in range(3):
            mid = Vec2((xs[k] + xs[k + 1]) / 2.0 + shift, y - 0.85)
            mx, my = to_svg(mid)
            parts.append(
                f'<text class="label" x="{mx:.3f}" y="{my:.3f}" text-anchor="middle">1/3</text>'
            )
        return "\n  ".join(parts)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}"
     width="{display_width}" height="{display_height}" role="img"
     aria-label="Women's basic skirt block">
  <style>
    .construction {{ stroke: #b3b3b3; stroke-width: 0.12; stroke-dasharray: 0.45 0.35; fill: none; }}
    .outline {{ stroke: #111; stroke-width: 0.28; fill: none; }}
    .label {{ font: 2.2px "Segoe UI", sans-serif; fill: #111; }}
    .point {{ fill: #b3b3b3; }}
  </style>
  {line(Vec2(draft.cb_x, draft.wl_y), Vec2(draft.side_x, draft.wl_y), "construction")}
  {line(Vec2(draft.cb_x, draft.hl_y), draft.hip, "construction")}
  {line(Vec2(draft.cb_x, draft.hem_y), draft.side_hem, "construction")}
  {line(Vec2(draft.cb_x, draft.wl_y), Vec2(draft.cb_x, draft.hem_y), "construction")}
  {line(Vec2(draft.side_x, draft.wl_y + 2), Vec2(draft.side_x, draft.hem_y), "construction")}
  {line(M(Vec2(draft.side_x, draft.wl_y)), M(Vec2(draft.cf_x, draft.wl_y)), "construction")}
  {line(M(draft.hip), M(Vec2(draft.cf_x, draft.hl_y)), "construction")}
  {line(M(draft.side_hem), M(Vec2(draft.cf_x, draft.hem_y)), "construction")}
  {line(M(Vec2(draft.cf_x, draft.wl_y)), M(Vec2(draft.cf_x, draft.hem_y)), "construction")}
  {line(M(Vec2(draft.side_x, draft.wl_y + 2)), M(Vec2(draft.side_x, draft.hem_y)), "construction")}
  {waist_thirds(draft.back_waist_mark.x, draft.side_x, draft.wl_y)}
  {waist_thirds(draft.front_waist_mark.x, draft.side_x, draft.wl_y, dx)}
  <polyline class="outline" points="{_poly(back, to_svg)}" />
  <polyline class="outline" points="{_poly(front, to_svg)}" />
  {circle(draft.cb_waist, 0.22, "point")}
  {circle(draft.back_waist_mark, 0.22, "point")}
  {circle(draft.back_side_waist, 0.22, "point")}
  {circle(draft.hip, 0.22, "point")}
  {circle(M(draft.cf_waist), 0.22, "point")}
  {circle(M(draft.front_waist_mark), 0.22, "point")}
  {circle(M(draft.front_side_waist), 0.22, "point")}
  {circle(M(draft.hip), 0.22, "point")}
  {text(Vec2(draft.back_hip * 0.35, draft.hl_y + 1.2), "Back", "label")}
  {text(M(Vec2((draft.side_x + draft.cf_x) / 2, draft.hl_y + 1.2)), "Front", "label")}
</svg>
'''
    return svg


def write_svg(draft: SkirtDraft, path: Path, *, display_width: int = 520) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(skirt_svg(draft, display_width=display_width), encoding="utf-8")
    return path


def html_page(draft: SkirtDraft) -> str:
    p = draft.params
    svg = skirt_svg(draft, display_width=560)

    def row(name: str, value: str) -> str:
        return f"<tr><th>{escape(name)}</th><td>{escape(value)}</td></tr>"

    rows = "\n".join(
        [
            row("Hip", f"{p.hip:.2f} cm"),
            row("Waist", f"{p.waist:.2f} cm"),
            row("Skirt length", f"{p.skirt_length:.2f} cm"),
            row("Total width H/2 + 2", f"{draft.total_width:.2f} cm"),
            row("Back hip", f"{draft.back_hip:.2f} cm"),
            row("Front hip", f"{draft.front_hip:.2f} cm"),
            row("Back waist W/4 − 1 + 0.5", f"{draft.back_waist:.2f} cm"),
            row("Front waist W/4 + 1 + 0.5", f"{draft.front_waist:.2f} cm"),
            row("Side takeout", f"{draft.side_take:.2f} cm"),
        ]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Women's basic skirt block</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{
      margin: 0; font-family: "Segoe UI", "Source Han Sans SC", sans-serif;
      background: #f6f3ee; color: #1c1c1c;
    }}
    main {{
      max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px;
      display: grid; grid-template-columns: minmax(280px, 1fr) minmax(320px, 420px);
      gap: 32px; align-items: start;
    }}
    h1 {{ font-size: 1.35rem; font-weight: 600; margin: 0 0 8px; }}
    p.lead {{ margin: 0 0 20px; color: #444; line-height: 1.45; }}
    .sheet {{
      background: #fff; border: 1px solid #ddd4c6; border-radius: 8px;
      padding: 20px; overflow: auto;
    }}
    table {{ width: 100%; border-collapse: collapse; font-size: 0.92rem; }}
    th, td {{ text-align: left; padding: 6px 0; border-bottom: 1px solid #eee; vertical-align: top; }}
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
      <h1>Women's basic skirt block</h1>
      <p class="lead">Coded from the draft on page 115.
      Construction lines are grey; the outline is the finished block.</p>
      <div class="sheet">{svg}</div>
    </section>
    <aside>
      <h2>Reference sizes (page 115)</h2>
      <table>{rows}</table>
      <h2>Construction</h2>
      <ol>
        <li>Rectangle: skirt length × (H/2 + 2).</li>
        <li>Hip line 18 cm down from the waist.</li>
        <li>Side seam at the midpoint minus 1 cm toward the back.</li>
        <li>Front waist W/4 + 1 + 0.5 from centre front; back waist W/4 − 1 + 0.5 from centre back.</li>
        <li>One third of each waist-hip difference at the side seam.</li>
        <li>Side waist up 0.7 cm; centre back down 1 cm.</li>
        <li>Waist stays level from the centre, then curves up to the raised side (about 1/3 of the way on the back, 2/3 on the front).</li>
        <li>Side seam curves from the raised waist to the hip, then straight to the hem.</li>
      </ol>
    </aside>
  </main>
</body>
</html>
"""


def write_html(draft: SkirtDraft, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html_page(draft), encoding="utf-8")
    return path
