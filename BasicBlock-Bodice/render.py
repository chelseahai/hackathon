"""SVG / HTML drawing of a bodice draft."""

from __future__ import annotations

from html import escape
from pathlib import Path

from draft import (
    BodyDraft,
    Vec2,
    back_outline,
    close_ring,
    front_display_shift,
    front_outline,
    translate,
)


def _bbox(draft: BodyDraft, margin: float = 4.0) -> tuple[float, float, float, float]:
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


def body_svg(draft: BodyDraft, *, display_width: int = 520) -> str:
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

    top_l = Vec2(draft.cb_x, draft.top_y)
    bl_l = Vec2(draft.cb_x, draft.bl_y)
    wl_l = Vec2(draft.cb_x, draft.wl_y)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}"
     width="{display_width}" height="{display_height}" role="img"
     aria-label="Women's basic bodice block">
  <style>
    .construction {{ stroke: #b3b3b3; stroke-width: 0.12; stroke-dasharray: 0.45 0.35; fill: none; }}
    .outline {{ stroke: #111; stroke-width: 0.28; fill: none; }}
    .point {{ fill: #b3b3b3; stroke: none; }}
    .label {{ font: 0.95px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #111; }}
  </style>
  {line(top_l, Vec2(draft.side_x, draft.top_y), "construction")}
  {line(bl_l, draft.underarm, "construction")}
  {line(wl_l, draft.side_waist, "construction")}
  {line(Vec2(draft.cb_x, draft.wl_y), Vec2(draft.cb_x, draft.top_y), "construction")}
  {line(Vec2(draft.back_width_x, draft.bl_y), Vec2(draft.back_width_x, draft.top_y), "construction")}
  {line(Vec2(draft.side_x, draft.wl_y), Vec2(draft.side_x, draft.bl_y), "construction")}
  {line(draft.underarm, draft.side_waist, "construction")}
  {line(draft.back_snp, draft.back_shoulder, "construction")}
  {line(Vec2(draft.back_snp.x, draft.top_y), draft.back_snp, "construction")}
  {line(M(Vec2(draft.side_x, draft.top_y)), M(Vec2(draft.cf_x, draft.top_y)), "construction")}
  {line(M(draft.underarm), M(Vec2(draft.cf_x, draft.bl_y)), "construction")}
  {line(M(draft.side_waist), M(Vec2(draft.cf_x, draft.wl_y)), "construction")}
  {line(M(Vec2(draft.cf_x, draft.cf_hem.y)), M(Vec2(draft.cf_x, draft.top_y)), "construction")}
  {line(M(Vec2(draft.chest_width_x, draft.bl_y)), M(Vec2(draft.chest_width_x, draft.top_y)), "construction")}
  {line(M(Vec2(draft.side_x, draft.wl_y)), M(Vec2(draft.side_x, draft.bl_y)), "construction")}
  {line(M(draft.underarm), M(draft.side_waist), "construction")}
  {line(M(draft.front_snp), M(draft.front_shoulder), "construction")}
  {line(M(Vec2(draft.front_snp.x, draft.top_y)), M(Vec2(draft.front_snp.x, draft.cf_neck.y)), "construction")}
  {line(M(Vec2(draft.front_snp.x, draft.cf_neck.y)), M(draft.cf_neck), "construction")}
  {line(M(Vec2(draft.front_snp.x, draft.cf_neck.y)), M(draft.front_neck_offset), "construction")}
  {line(M(Vec2(draft.bp.x, draft.bl_y)), M(draft.hem_at_bp), "construction")}
  {line(M(draft.cf_hem), M(draft.hem_at_bp), "construction")}
  <polyline class="outline" points="{_poly(back, to_svg)}" />
  <polyline class="outline" points="{_poly(front, to_svg)}" />
  {circle(draft.underarm, 0.22, "point")}
  {circle(draft.side_waist, 0.22, "point")}
  {circle(draft.back_ah_bisector, 0.22, "point")}
  {circle(M(draft.bp), 0.22, "point")}
  {circle(M(draft.underarm), 0.22, "point")}
  {circle(M(draft.front_neck_offset), 0.22, "point")}
  {circle(M(draft.hem_at_bp), 0.22, "point")}
  {text(Vec2(draft.back_width_x * 0.35, draft.bl_y + 1.2), "Back", "label")}
  {text(M(Vec2((draft.chest_width_x + draft.cf_x) / 2.0, draft.bl_y + 1.2)), "Front", "label")}
  {text(Vec2(draft.cb_x + 0.4, draft.bl_y + 0.35), "BL", "label")}
  {text(Vec2(draft.cb_x + 0.4, draft.wl_y + 0.35), "WL", "label")}
</svg>'''
    return svg


def write_svg(draft: BodyDraft, path: Path, *, display_width: int = 520) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body_svg(draft, display_width=display_width), encoding="utf-8")
    return path


def html_page(draft: BodyDraft) -> str:
    p = draft.params
    svg = body_svg(draft, display_width=560)

    def row(name: str, value: str) -> str:
        return f"<tr><th>{escape(name)}</th><td>{escape(value)}</td></tr>"

    rows = "\n".join(
        [
            row("Bust", f"{p.bust:.2f} cm"),
            row("Back length", f"{p.back_length:.2f} cm"),
            row("Total width B/2 + 5", f"{draft.total_width:.2f} cm"),
            row("Back AH", f"{draft.back_armhole_len:.2f} cm"),
            row("Front AH", f"{draft.front_armhole_len:.2f} cm"),
            row("Back width B/6 + 4.5", f"{draft.back_width:.2f} cm"),
            row("Chest width B/6 + 3", f"{draft.chest_width:.2f} cm"),
            row("Back neck width B/12", f"{draft.back_neck_width:.2f} cm"),
            row("Back neck height", f"{draft.back_neck_height:.3f} cm"),
            row("Front neck width", f"{draft.front_neck_width:.2f} cm"),
            row("Front neck depth", f"{draft.front_neck_depth:.2f} cm"),
            row("Back shoulder", f"{draft.back_shoulder_len:.3f} cm"),
            row("Front shoulder", f"{draft.front_shoulder_len:.3f} cm"),
        ]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Women's basic bodice block</title>
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
      <h1>Women's basic bodice block</h1>
      <p class="lead">Coded from the draft on pages 108–110.
      Construction lines are grey; the outline is the finished block.</p>
      <div class="sheet">{svg}</div>
    </section>
    <aside>
      <h2>Reference sizes (page 108)</h2>
      <table>{rows}</table>
      <h2>Construction</h2>
      <ol>
        <li>Rectangle: back length × (B/2 + 5).</li>
        <li>Bust line at B/6 + 7 down from the top.</li>
        <li>Back width B/6 + 4.5 from centre back.</li>
        <li>Chest width B/6 + 3 from centre front.</li>
        <li>Side seam at the midpoint of the armhole gap.</li>
        <li>Back neck: B/12 wide from centre back along the top line, then that width / 3 up for the side-neck point.</li>
        <li>Front neck: B/12 − 0.2 wide, B/12 + 1 deep; side neck down 0.5; curve through the corner bisector at half the neck width minus 0.3.</li>
        <li>Back shoulder: drop one neck height, out 2 cm.</li>
        <li>Front shoulder: drop two neck heights, length = back − 1.8.</li>
        <li>Armholes through the 45° bisectors. Side seam: 2 cm toward the back at the waist, then split into two pieces.</li>
        <li>BP: mid chest width, 0.7 toward the armhole, 4 below the bust line.</li>
        <li>Centre-front hem drops by half the front neck width; horizontal to the BP drop, then a straight line to the side seam.</li>
      </ol>
    </aside>
  </main>
</body>
</html>
"""


def write_html(draft: BodyDraft, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html_page(draft), encoding="utf-8")
    return path
