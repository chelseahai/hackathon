"""SVG / HTML drawing of a sleeve draft."""

from __future__ import annotations

from html import escape
from pathlib import Path

from draft import SleeveDraft, Vec2


def _bbox(draft: SleeveDraft, margin: float = 4.0) -> tuple[float, float, float, float]:
    xs = [draft.back_underarm.x, draft.front_underarm.x, draft.peak.x]
    ys = [draft.cuff_y, draft.peak.y, draft.cuff_back_mid.y, draft.cuff_front_mid.y]
    xs.extend(pt.x for pt in (draft.front_offset_upper, draft.back_offset_upper))
    ys.extend(pt.y for pt in (draft.front_offset_upper, draft.back_offset_upper))
    min_x = min(xs) - margin
    max_x = max(xs) + margin
    min_y = min(ys) - margin
    max_y = max(ys) + margin
    return min_x, min_y, max_x, max_y


def _poly(points: list[Vec2], to_svg) -> str:
    return " ".join(f"{to_svg(pt)[0]:.3f},{to_svg(pt)[1]:.3f}" for pt in points)


def sleeve_svg(draft: SleeveDraft, *, display_width: int = 520) -> str:
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

    peak = draft.peak
    el_left = Vec2(draft.back_underarm.x - 1.2, draft.elbow_y)
    el_right = Vec2(draft.front_underarm.x + 1.2, draft.elbow_y)
    bicep_left = Vec2(draft.back_underarm.x - 1.2, 0.0)
    bicep_right = Vec2(draft.front_underarm.x + 1.2, 0.0)
    grain_top = Vec2(0.0, draft.peak.y + 1.5)
    grain_bot = Vec2(0.0, draft.cuff_y - 1.5)
    cuff_line_l = Vec2(draft.back_cuff.x - 1.2, draft.cuff_y)
    cuff_line_r = Vec2(draft.front_cuff.x + 1.2, draft.cuff_y)

    outline = [
        *draft.back_cap,
        *draft.back_seam[1:],
        *draft.cuff[1:],
        *list(reversed(draft.front_seam))[1:],
        *list(reversed(draft.front_cap))[1:],
    ]
    if outline and outline[0] != outline[-1]:
        outline.append(outline[0])

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}"
     width="{display_width}" height="{display_height}" role="img"
     aria-label="Women's basic sleeve block">
  <style>
    .construction {{ stroke: #b3b3b3; stroke-width: 0.12; stroke-dasharray: 0.45 0.35; fill: none; }}
    .outline {{ stroke: #111; stroke-width: 0.28; fill: none; }}
    .point {{ fill: #b3b3b3; stroke: none; }}
    .label {{ font: 0.95px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #111; }}
  </style>
  {line(grain_top, grain_bot, "construction")}
  {line(bicep_left, bicep_right, "construction")}
  {line(cuff_line_l, cuff_line_r, "construction")}
  {line(peak, draft.front_underarm, "construction")}
  {line(peak, draft.back_underarm, "construction")}
  {line(el_left, el_right, "construction")}
  <polyline class="outline" points="{_poly(outline, to_svg)}" />
  {circle(draft.origin, 0.22, "point")}
  {circle(draft.front_offset_upper, 0.22, "point")}
  {circle(draft.front_offset_lower, 0.22, "point")}
  {circle(draft.back_offset_upper, 0.22, "point")}
  {circle(draft.back_offset_lower, 0.22, "point")}
  {circle(draft.back_locator, 0.22, "point")}
  {text(Vec2(draft.front_underarm.x * 0.45, -1.1), "Front", "label")}
  {text(Vec2(draft.back_underarm.x * 0.55, -1.1), "Back", "label")}
  {text(Vec2(draft.front_underarm.x + 0.35, draft.elbow_y + 0.35), "EL", "label")}
</svg>'''
    return svg


def write_svg(draft: SleeveDraft, path: Path, *, display_width: int = 520) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(sleeve_svg(draft, display_width=display_width), encoding="utf-8")
    return path


def html_page(draft: SleeveDraft) -> str:
    p = draft.params
    svg = sleeve_svg(draft, display_width=560)
    note_html = ""
    if draft.notes:
        items = "".join(f"<li>{escape(n)}</li>" for n in draft.notes)
        note_html = f"<h2>Notes</h2><ul>{items}</ul>"

    def row(name: str, value: str) -> str:
        return f"<tr><th>{escape(name)}</th><td>{escape(value)}</td></tr>"

    rows = "\n".join(
        [
            row("Front AH (A→C)", f"{p.front_ah:.2f} cm"),
            row("Back AH (B→C)", f"{p.back_ah:.2f} cm"),
            row("Total AH", f"{p.total_ah:.2f} cm"),
            row("Sleeve length", f"{p.sleeve_length:.2f} cm"),
            row("Cap height AH/3 - 1", f"{draft.cap_height:.3f} cm"),
            row("Front diagonal", f"{draft.front_diag_len:.2f} cm"),
            row("Back diagonal (back AH + 1)", f"{draft.back_diag_len:.2f} cm"),
            row("Front width", f"{draft.front_width:.3f} cm"),
            row("Back width", f"{draft.back_width:.3f} cm"),
            row("EL from peak", f"{draft.elbow_from_peak:.2f} cm"),
            row("Front cap curve", f"{draft.front_cap_length:.3f} cm"),
            row("Back cap curve", f"{draft.back_cap_length:.3f} cm"),
            row("Front cap ease (curve - AH)", f"{draft.front_cap_length - p.front_ah:.3f} cm"),
            row("Back cap ease (curve - AH)", f"{draft.back_cap_length - p.back_ah:.3f} cm"),
        ]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Women's basic sleeve block</title>
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
      <h1>Women's basic sleeve block</h1>
      <p class="lead">Coded from the two-step draft on pages 111–112.
      Construction lines are grey; the outline is the finished block. Orange dots
      are curve offsets.</p>
      <div class="sheet">{svg}</div>
    </section>
    <aside>
      <h2>Reference sizes (page 111)</h2>
      <table>{rows}</table>
      {note_html}
      <h2>Construction</h2>
      <ol>
        <li>Crosshair at the bicep / grain intersection.</li>
        <li>Cap height = AH/3 − 1, up from the crosshair.</li>
        <li>Sleeve length down from the peak; cuff line.</li>
        <li>Front cap diagonal = front AH onto the bicep line.</li>
        <li>Back cap diagonal = back AH + 1 onto the bicep line.</li>
        <li>Front underarm seam, vertical to the cuff.</li>
        <li>Back underarm seam, vertical to the cuff.</li>
        <li>Elbow line at length/2 + 2.5 from the peak.</li>
        <li>Front cap: 1/4 out 1.8, 3/4 in 1.5.</li>
        <li>Back cap: 1/4 out 1.5; 2.5 along from midpoint; lower mid in 0.5.</li>
        <li>Cuff: back out 1.0, centre drop 0.3, front in 0.5.</li>
      </ol>
    </aside>
  </main>
</body>
</html>
"""


def write_html(draft: SleeveDraft, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html_page(draft), encoding="utf-8")
    return path
