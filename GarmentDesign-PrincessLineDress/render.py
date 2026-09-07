"""SVG / HTML drawing of a princess line dress."""

from __future__ import annotations

from html import escape
from pathlib import Path
import importlib.util
import sys

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def _load_export_dxf():
    path = _ROOT / "Export-DXF" / "dxf.py"
    spec = importlib.util.spec_from_file_location("export_dxf", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_dxf = _load_export_dxf()
grainline_on_piece = _dxf.grainline_on_piece
notch_segment = _dxf.notch_segment
write_pattern_dxf = _dxf.write_pattern_dxf

from draft import DressDraft, Vec2, close_ring, laid_out_panels, offset_closed


def _bbox(draft: DressDraft, seam: float = 0.0, margin: float = 4.0) -> tuple[float, float, float, float]:
    laid = laid_out_panels(draft, seam)
    pts: list[Vec2] = []
    for panel in laid:
        pts.extend(panel.outline)
        if seam:
            pts.extend(offset_closed(panel.outline, seam))
        for poly in panel.construction:
            pts.extend(poly)
        for poly in panel.overlays:
            pts.extend(poly)
        for poly in panel.pre_rotation:
            pts.extend(poly)
    xs = [pt.x for pt in pts]
    ys = [pt.y for pt in pts]
    return min(xs) - margin, min(ys) - margin, max(xs) + margin, max(ys) + margin


def _poly(points: list[Vec2], to_svg) -> str:
    return " ".join(f"{to_svg(pt)[0]:.3f},{to_svg(pt)[1]:.3f}" for pt in points)


def dress_svg(draft: DressDraft, *, display_width: int = 920) -> str:
    seam = draft.params.seam_allowance
    min_x, min_y, max_x, max_y = _bbox(draft, seam)
    width = max_x - min_x
    height = max_y - min_y
    display_height = round(display_width * height / width)

    def to_svg(pt: Vec2) -> tuple[float, float]:
        return (pt.x - min_x, max_y - pt.y)

    def text(pt: Vec2, label: str, cls: str, dx: float = 0.0, dy: float = 0.0) -> str:
        x, y = to_svg(pt)
        return (
            f'<text class="{cls}" x="{x + dx:.3f}" y="{y + dy:.3f}">'
            f"{escape(label)}</text>"
        )

    laid = laid_out_panels(draft, seam)
    parts: list[str] = []
    for panel in laid:
        outline = close_ring(panel.outline)
        parts.append(f'<polyline class="outline" points="{_poly(outline, to_svg)}" />')
        if seam > 0:
            cutting = close_ring(offset_closed(panel.outline, seam))
            parts.append(f'<polyline class="seam" points="{_poly(cutting, to_svg)}" />')
        xs = [pt.x for pt in panel.outline]
        ys = [pt.y for pt in panel.outline]
        mid = Vec2((min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0)
        parts.append(text(mid, panel.name, "label"))

    joined = "\n  ".join(parts)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.3f} {height:.3f}"
     width="{display_width}" height="{display_height}" role="img"
     aria-label="Princess line dress">
  <style>
    .outline {{ stroke: #111; stroke-width: 0.28; stroke-dasharray: 0.45 0.35; fill: none; }}
    .seam {{ stroke: #111; stroke-width: 0.28; fill: none; }}
    .label {{ font: 1.1px "Helvetica Neue", Helvetica, Arial, sans-serif; fill: #111; text-transform: uppercase; }}
  </style>
  {joined}
</svg>'''


def write_svg(draft: DressDraft, path: Path, *, display_width: int = 920) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dress_svg(draft, display_width=display_width), encoding="utf-8")
    return path


def dress_dxf_pieces(draft: DressDraft) -> list[dict]:
    seam = draft.params.seam_allowance
    laid = laid_out_panels(draft, seam)
    pieces: list[dict] = []
    for panel in laid:
        outline = close_ring(panel.outline)
        cut = close_ring(offset_closed(panel.outline, seam)) if seam else None
        grain = grainline_on_piece(panel.outline)
        notches = []
        for pt in panel.notches:
            seg = notch_segment(panel.outline, pt, seam, offset_closed)
            if seg:
                notches.append(seg)
        pieces.append(
            {
                "name": panel.name,
                "outline": outline,
                "cut": cut,
                "grain": grain,
                "notches": notches,
                "seams": [
                    {
                        "name": seam.name,
                        "kind": seam.kind,
                        "knots": seam.knots,
                        "spans": seam.spans,
                        "points": seam.points,
                        "center": seam.center,
                    }
                    for seam in panel.seams
                ],
            }
        )
    return pieces


def write_dxf(draft: DressDraft, path: Path) -> Path:
    return write_pattern_dxf(dress_dxf_pieces(draft), path)


def html_page(draft: DressDraft) -> str:
    p = draft.params
    svg = dress_svg(draft, display_width=960)

    def row(name: str, value: str) -> str:
        return f"<tr><th>{escape(name)}</th><td>{escape(value)}</td></tr>"

    rows = "\n".join(
        [
            row("Bust", f"{p.bust:.2f} cm"),
            row("Back length", f"{p.back_length:.2f} cm"),
            row("Waist", f"{p.waist:.2f} cm"),
            row("Hip", f"{p.hip:.2f} cm"),
            row("Dress length from waist", f"{p.dress_length:.2f} cm"),
            row("Back waist", f"{draft.back_waist:.2f} cm"),
            row("Front waist", f"{draft.front_waist:.2f} cm"),
            row("Back hip", f"{draft.back_hip:.2f} cm"),
            row("Front hip", f"{draft.front_hip:.2f} cm"),
            row("Back princess dart", f"{draft.back_dart:.2f} cm"),
            row("Front princess dart", f"{draft.front_dart:.2f} cm"),
        ]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Princess line dress</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{
      margin: 0; font-family: "Segoe UI", "Source Han Sans SC", sans-serif;
      background: #f6f3ee; color: #1c1c1c;
    }}
    main {{
      max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px;
      display: grid; grid-template-columns: minmax(320px, 1fr) minmax(280px, 360px);
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
    @media (max-width: 840px) {{
      main {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Princess line dress</h1>
      <p class="lead">Converted from the basic bodice and skirt blocks.
      Four cut panels: centre back, side back, side front, centre front.</p>
      <div class="sheet">{svg}</div>
    </section>
    <aside>
      <h2>Measurements</h2>
      <table>{rows}</table>
    </aside>
  </main>
</body>
</html>
"""


def write_html(draft: DressDraft, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html_page(draft), encoding="utf-8")
    return path
