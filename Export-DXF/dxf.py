"""ASCII DXF (AutoCAD 2000) for cuttable pattern pieces. Drawing units are millimetres.

Edit this file and Export-DXF/dxf.js together. See HOW-IT-WORKS.txt.
"""

from __future__ import annotations

from math import atan2, pi, tan
from pathlib import Path
from typing import Any, Iterable


MM = 10.0  # geometry is stored in centimetres
ACADVER = "AC1015"  # AutoCAD 2000 — SPLINE and LWPOLYLINE


def _xy(pt: Any) -> tuple[float, float]:
    if isinstance(pt, (tuple, list)):
        return float(pt[0]), float(pt[1])
    return float(pt.x), float(pt.y)


def _fmt(n: float) -> str:
    return f"{n:.4f}"


def _pair(code: int, value: Any) -> str:
    return f"{code}\n{value}\n"


def grainline_on_piece(outline: list[Any]) -> tuple[tuple[float, float], tuple[float, float]] | None:
    pts = [_xy(pt) for pt in outline]
    if len(pts) < 2:
        return None
    x = (min(p[0] for p in pts) + max(p[0] for p in pts)) / 2.0
    hits: list[tuple[float, float]] = []
    ring = pts + [pts[0]]
    for i in range(len(ring) - 1):
        ax, ay = ring[i]
        bx, by = ring[i + 1]
        if (ax - x) * (bx - x) > 0:
            continue
        if abs(bx - ax) < 1e-9:
            continue
        t = (x - ax) / (bx - ax)
        if 0.0 <= t <= 1.0:
            hits.append((x, ay + (by - ay) * t))
    if len(hits) < 2:
        return None
    top = max(h[1] for h in hits)
    bot = min(h[1] for h in hits)
    span = top - bot
    inset = min(6.0, max(4.0, span * 0.12))
    if inset * 2 + 8 > span:
        inset = span * 0.18
    return (x, top - inset), (x, bot + inset)


def notch_segment(
    outline: list[Any],
    pt: Any,
    seam: float,
    offset_closed,
) -> tuple[tuple[float, float], tuple[float, float]] | None:
    px, py = _xy(pt)
    probe = max(seam, 0.8)
    outer = offset_closed(outline, probe)
    if not outer:
        return None
    best = outer[0]
    best_d = float("inf")
    for cand in outer:
        cx, cy = _xy(cand)
        d = (cx - px) ** 2 + (cy - py) ** 2
        if d < best_d:
            best_d = d
            best = cand
    bx, by = _xy(best)
    length = (bx - px) ** 2 + (by - py) ** 2
    if length < 1e-18:
        return None
    length = length ** 0.5
    nx, ny = (bx - px) / length, (by - py) / length
    out_len = max(0.45, min(0.7, seam * 0.7)) if seam > 0.05 else 0.6
    return (px - nx * 0.12, py - ny * 0.12), (px + nx * out_len, py + ny * out_len)


def _natural_seconds(t: list[float], values: list[float]) -> list[float]:
    n = len(values) - 1
    m = [0.0] * (n + 1)
    if n < 2:
        return m
    h = [t[i + 1] - t[i] for i in range(n)]
    size = n - 1
    a = [0.0] * size
    b = [0.0] * size
    c = [0.0] * size
    d = [0.0] * size
    for i in range(1, n):
        k = i - 1
        a[k] = h[i - 1]
        b[k] = 2.0 * (h[i - 1] + h[i])
        c[k] = h[i]
        d[k] = 6.0 * ((values[i + 1] - values[i]) / h[i] - (values[i] - values[i - 1]) / h[i - 1])
    for i in range(1, size):
        w = a[i] / b[i - 1]
        b[i] -= w * c[i - 1]
        d[i] -= w * d[i - 1]
    interior = [0.0] * size
    interior[-1] = d[-1] / b[-1]
    for i in range(size - 2, -1, -1):
        interior[i] = (d[i] - c[i] * interior[i + 1]) / b[i]
    for i, value in enumerate(interior):
        m[i + 1] = value
    return m


def cubic_beziers_from_knots(points: Iterable[Any]) -> list[tuple[tuple[float, float], ...]]:
    """Natural cubic through `points` as cubic Bezier spans (same curve as interpolate)."""
    pts = [_xy(pt) for pt in points]
    if len(pts) < 2:
        return []
    if len(pts) == 2:
        a, b = pts
        return [
            (
                a,
                (a[0] + (b[0] - a[0]) / 3.0, a[1] + (b[1] - a[1]) / 3.0),
                (a[0] + 2.0 * (b[0] - a[0]) / 3.0, a[1] + 2.0 * (b[1] - a[1]) / 3.0),
                b,
            )
        ]
    t = [0.0]
    for i in range(len(pts) - 1):
        dx = pts[i + 1][0] - pts[i][0]
        dy = pts[i + 1][1] - pts[i][1]
        t.append(t[-1] + (dx * dx + dy * dy) ** 0.5)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    mx = _natural_seconds(t, xs)
    my = _natural_seconds(t, ys)
    beziers: list[tuple[tuple[float, float], ...]] = []
    for i in range(len(pts) - 1):
        h = t[i + 1] - t[i]
        if h < 1e-12:
            continue
        d0x = (xs[i + 1] - xs[i]) / h - h * (2.0 * mx[i] + mx[i + 1]) / 6.0
        d1x = (xs[i + 1] - xs[i]) / h + h * (mx[i] + 2.0 * mx[i + 1]) / 6.0
        d0y = (ys[i + 1] - ys[i]) / h - h * (2.0 * my[i] + my[i + 1]) / 6.0
        d1y = (ys[i + 1] - ys[i]) / h + h * (my[i] + 2.0 * my[i + 1]) / 6.0
        p0 = (xs[i], ys[i])
        p3 = (xs[i + 1], ys[i + 1])
        p1 = (p0[0] + d0x * h / 3.0, p0[1] + d0y * h / 3.0)
        p2 = (p3[0] - d1x * h / 3.0, p3[1] - d1y * h / 3.0)
        beziers.append((p0, p1, p2, p3))
    return beziers


def beziers_from_spans(spans: Iterable[Iterable[Any]]) -> list[tuple[tuple[float, float], ...]]:
    out: list[tuple[tuple[float, float], ...]] = []
    for knots in spans:
        kn = list(knots)
        if len(kn) < 2:
            continue
        out.extend(cubic_beziers_from_knots(kn))
    return out


def _is_linear_bezier(bez: tuple[tuple[float, float], ...], eps: float = 1e-6) -> bool:
    a, c1, c2, b = bez
    vx, vy = b[0] - a[0], b[1] - a[1]
    span = (vx * vx + vy * vy) ** 0.5
    if span < eps:
        return True

    def off(p: tuple[float, float]) -> float:
        return abs((p[0] - a[0]) * vy - (p[1] - a[1]) * vx) / span

    return off(c1) < eps and off(c2) < eps


class _Dxf:
    """AutoCAD 2000 (AC1015) writer: handles, required tables, BLOCKS, OBJECTS."""

    def __init__(self) -> None:
        self._n = 0
        self.model = "1"

    def handle(self) -> str:
        self._n += 1
        return f"{self._n:X}"

    def entity_head(self, etype: str, layer: str) -> str:
        return "".join(
            [
                _pair(0, etype),
                _pair(5, self.handle()),
                _pair(330, self.model),
                _pair(100, "AcDbEntity"),
                _pair(8, layer),
            ]
        )

    def line(self, layer: str, a: Any, b: Any) -> str:
        ax, ay = _xy(a)
        bx, by = _xy(b)
        return "".join(
            [
                self.entity_head("LINE", layer),
                _pair(100, "AcDbLine"),
                _pair(10, _fmt(ax * MM)),
                _pair(20, _fmt(ay * MM)),
                _pair(30, "0.0"),
                _pair(11, _fmt(bx * MM)),
                _pair(21, _fmt(by * MM)),
                _pair(31, "0.0"),
            ]
        )

    def text(self, layer: str, pt: Any, label: str, height_cm: float = 1.0) -> str:
        x, y = _xy(pt)
        return "".join(
            [
                self.entity_head("TEXT", layer),
                _pair(100, "AcDbText"),
                _pair(10, _fmt(x * MM)),
                _pair(20, _fmt(y * MM)),
                _pair(30, "0.0"),
                _pair(40, _fmt(height_cm * MM)),
                _pair(1, str(label).upper()),
                _pair(7, "STANDARD"),
            ]
        )

    def polyline(self, layer: str, points: Iterable[Any], closed: bool, bulge: float | None = None) -> str:
        pts = [_xy(pt) for pt in points]
        if len(pts) < 2:
            return ""
        if closed and pts[0] == pts[-1] and len(pts) > 2:
            pts = pts[:-1]
        parts = [
            self.entity_head("LWPOLYLINE", layer),
            _pair(100, "AcDbPolyline"),
            _pair(90, len(pts)),
            _pair(70, 1 if closed else 0),
        ]
        for i, (x, y) in enumerate(pts):
            parts.extend([_pair(10, _fmt(x * MM)), _pair(20, _fmt(y * MM))])
            if bulge is not None and i == 0:
                parts.append(_pair(42, _fmt(bulge)))
        return "".join(parts)

    def spline(self, layer: str, beziers: list[tuple[tuple[float, float], ...]]) -> str:
        if not beziers:
            return ""
        ctrl = [beziers[0][0], beziers[0][1], beziers[0][2], beziers[0][3]]
        for bez in beziers[1:]:
            ctrl.extend([bez[1], bez[2], bez[3]])
        k = len(beziers)
        knots = [0.0, 0.0, 0.0, 0.0]
        for i in range(1, k):
            knots.extend([float(i), float(i), float(i)])
        knots.extend([float(k), float(k), float(k), float(k)])
        parts = [
            self.entity_head("SPLINE", layer),
            _pair(100, "AcDbSpline"),
            _pair(70, 8),
            _pair(71, 3),
            _pair(72, len(knots)),
            _pair(73, len(ctrl)),
            _pair(74, 0),
            _pair(42, "0.0000001"),
            _pair(43, "0.0000001"),
        ]
        for knot in knots:
            parts.append(_pair(40, _fmt(knot)))
        for x, y in ctrl:
            parts.extend(
                [
                    _pair(10, _fmt(x * MM)),
                    _pair(20, _fmt(y * MM)),
                    _pair(30, "0.0"),
                ]
            )
        return "".join(parts)

    def arc_lwpolyline(self, layer: str, start: Any, end: Any, center: Any) -> str:
        sx, sy = _xy(start)
        ex, ey = _xy(end)
        cx, cy = _xy(center)
        a0 = atan2(sy - cy, sx - cx)
        a1 = atan2(ey - cy, ex - cx)
        da = a1 - a0
        while da > pi:
            da -= 2.0 * pi
        while da < -pi:
            da += 2.0 * pi
        bulge = tan(da / 4.0) if abs(da) > 1e-12 else 0.0
        return self.polyline(layer, [(sx, sy), (ex, ey)], False, bulge)

    def seam(self, seam: dict) -> str:
        layer = str(seam.get("name") or "STITCH").upper()
        kind = seam.get("kind") or "curve"
        knots = list(seam.get("knots") or [])
        spans = list(seam.get("spans") or [])
        if kind == "arc" and seam.get("center") is not None:
            pts = knots or list(seam.get("points") or [])
            if len(pts) < 2:
                return ""
            return self.arc_lwpolyline(layer, pts[0], pts[-1], seam["center"])
        if kind == "line" or (not spans and len(knots) == 2):
            pts = knots or list(seam.get("points") or [])
            if len(pts) < 2:
                return ""
            return self.line(layer, pts[0], pts[-1])
        if not spans:
            spans = [knots] if len(knots) >= 2 else [list(seam.get("points") or [])]
        beziers = beziers_from_spans(spans)
        if not beziers:
            return ""
        if len(beziers) == 1 and _is_linear_bezier(beziers[0]):
            return self.line(layer, beziers[0][0], beziers[0][3])
        return self.spline(layer, beziers)

    def empty_table(self, name: str) -> str:
        return "".join(
            [
                _pair(0, "TABLE"),
                _pair(2, name),
                _pair(5, self.handle()),
                _pair(330, "0"),
                _pair(100, "AcDbSymbolTable"),
                _pair(70, 0),
                _pair(0, "ENDTAB"),
            ]
        )

    def table_begin(self, name: str, count: int) -> tuple[str, str]:
        table_h = self.handle()
        body = "".join(
            [
                _pair(0, "TABLE"),
                _pair(2, name),
                _pair(5, table_h),
                _pair(330, "0"),
                _pair(100, "AcDbSymbolTable"),
                _pair(70, count),
            ]
        )
        return body, table_h

    def block_def(self, record: str, name: str) -> str:
        return "".join(
            [
                _pair(0, "BLOCK"),
                _pair(5, self.handle()),
                _pair(330, record),
                _pair(100, "AcDbEntity"),
                _pair(8, "0"),
                _pair(100, "AcDbBlockBegin"),
                _pair(2, name),
                _pair(70, 0),
                _pair(10, "0.0"),
                _pair(20, "0.0"),
                _pair(30, "0.0"),
                _pair(3, name),
                _pair(1, ""),
                _pair(0, "ENDBLK"),
                _pair(5, self.handle()),
                _pair(330, record),
                _pair(100, "AcDbEntity"),
                _pair(8, "0"),
                _pair(100, "AcDbBlockEnd"),
            ]
        )


def pattern_dxf(pieces: list[dict]) -> str:
    """Build a 2000 DXF AutoCAD will load. Named seams are one entity each."""
    dxf = _Dxf()

    seam_layers: list[str] = []
    for piece in pieces:
        for seam in piece.get("seams") or []:
            name = str(seam.get("name") or "").upper()
            if name and name not in seam_layers:
                seam_layers.append(name)
    layer_defs = [
        ("0", 7),
        ("CUT", 7),
        ("STITCH", 8),
        ("GRAIN", 4),
        ("NOTCH", 1),
        ("NAME", 7),
    ] + [(name, 8) for name in seam_layers]

    h_root = dxf.handle()
    h_group = dxf.handle()
    ltype_tab, h_ltype = dxf.table_begin("LTYPE", 3)
    h_byblock = dxf.handle()
    h_bylayer = dxf.handle()
    h_continuous = dxf.handle()
    layer_tab, h_layer = dxf.table_begin("LAYER", len(layer_defs))
    layer_handles = [dxf.handle() for _ in layer_defs]
    style_tab, h_style = dxf.table_begin("STYLE", 1)
    h_standard = dxf.handle()
    appid_tab, h_appid = dxf.table_begin("APPID", 1)
    h_acad = dxf.handle()
    dim_tab, h_dim = dxf.table_begin("DIMSTYLE", 1)
    h_dimstd = dxf.handle()
    blk_tab, h_blk = dxf.table_begin("BLOCK_RECORD", 2)
    h_model = dxf.handle()
    h_paper = dxf.handle()
    dxf.model = h_model

    def ltype(handle: str, name: str, desc: str) -> str:
        return "".join(
            [
                _pair(0, "LTYPE"),
                _pair(5, handle),
                _pair(330, h_ltype),
                _pair(100, "AcDbSymbolTableRecord"),
                _pair(100, "AcDbLinetypeTableRecord"),
                _pair(2, name),
                _pair(70, 0),
                _pair(3, desc),
                _pair(72, 65),
                _pair(73, 0),
                _pair(40, "0.0"),
            ]
        )

    def layer_rec(handle: str, name: str, color: int) -> str:
        return "".join(
            [
                _pair(0, "LAYER"),
                _pair(5, handle),
                _pair(330, h_layer),
                _pair(100, "AcDbSymbolTableRecord"),
                _pair(100, "AcDbLayerTableRecord"),
                _pair(2, name),
                _pair(70, 0),
                _pair(62, color),
                _pair(6, "CONTINUOUS"),
            ]
        )

    def block_rec(handle: str, name: str) -> str:
        return "".join(
            [
                _pair(0, "BLOCK_RECORD"),
                _pair(5, handle),
                _pair(330, h_blk),
                _pair(100, "AcDbSymbolTableRecord"),
                _pair(100, "AcDbBlockTableRecord"),
                _pair(2, name),
            ]
        )

    entities: list[str] = []
    for piece in pieces:
        seams = piece.get("seams") or []
        outline = piece.get("outline") or []
        cut = piece.get("cut")
        grain = piece.get("grain")
        notches = piece.get("notches") or []
        name = piece.get("name") or ""
        if seams:
            for seam in seams:
                ent = dxf.seam(seam)
                if ent:
                    entities.append(ent)
        elif outline:
            entities.append(dxf.polyline("STITCH", outline, True))
        if cut:
            entities.append(dxf.polyline("CUT", cut, True))
        if grain:
            entities.append(dxf.line("GRAIN", grain[0], grain[1]))
        for a, b in notches:
            entities.append(dxf.line("NOTCH", a, b))
        if name and outline:
            xs = [_xy(pt)[0] for pt in outline]
            ys = [_xy(pt)[1] for pt in outline]
            mid = ((min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0)
            entities.append(dxf.text("NAME", mid, name))

    classes = "".join([_pair(0, "SECTION"), _pair(2, "CLASSES"), _pair(0, "ENDSEC")])
    tables = "".join(
        [
            _pair(0, "SECTION"),
            _pair(2, "TABLES"),
            dxf.empty_table("VPORT"),
            ltype_tab,
            ltype(h_byblock, "BYBLOCK", ""),
            ltype(h_bylayer, "BYLAYER", ""),
            ltype(h_continuous, "CONTINUOUS", "Solid line"),
            _pair(0, "ENDTAB"),
            layer_tab,
            *[layer_rec(h, n, c) for h, (n, c) in zip(layer_handles, layer_defs)],
            _pair(0, "ENDTAB"),
            style_tab,
            _pair(0, "STYLE"),
            _pair(5, h_standard),
            _pair(330, h_style),
            _pair(100, "AcDbSymbolTableRecord"),
            _pair(100, "AcDbTextStyleTableRecord"),
            _pair(2, "STANDARD"),
            _pair(70, 0),
            _pair(40, "0.0"),
            _pair(41, "1.0"),
            _pair(50, "0.0"),
            _pair(71, 0),
            _pair(42, "1.0"),
            _pair(3, "txt"),
            _pair(4, ""),
            _pair(0, "ENDTAB"),
            dxf.empty_table("VIEW"),
            dxf.empty_table("UCS"),
            appid_tab,
            _pair(0, "APPID"),
            _pair(5, h_acad),
            _pair(330, h_appid),
            _pair(100, "AcDbSymbolTableRecord"),
            _pair(100, "AcDbRegAppTableRecord"),
            _pair(2, "ACAD"),
            _pair(70, 0),
            _pair(0, "ENDTAB"),
            dim_tab,
            _pair(0, "DIMSTYLE"),
            _pair(105, h_dimstd),
            _pair(330, h_dim),
            _pair(100, "AcDbSymbolTableRecord"),
            _pair(100, "AcDbDimStyleTableRecord"),
            _pair(2, "STANDARD"),
            _pair(70, 0),
            _pair(0, "ENDTAB"),
            blk_tab,
            block_rec(h_model, "*MODEL_SPACE"),
            block_rec(h_paper, "*PAPER_SPACE"),
            _pair(0, "ENDTAB"),
            _pair(0, "ENDSEC"),
        ]
    )
    blocks = "".join(
        [
            _pair(0, "SECTION"),
            _pair(2, "BLOCKS"),
            dxf.block_def(h_model, "*MODEL_SPACE"),
            dxf.block_def(h_paper, "*PAPER_SPACE"),
            _pair(0, "ENDSEC"),
        ]
    )
    ents = "".join(
        [
            _pair(0, "SECTION"),
            _pair(2, "ENTITIES"),
            *entities,
            _pair(0, "ENDSEC"),
        ]
    )
    objects = "".join(
        [
            _pair(0, "SECTION"),
            _pair(2, "OBJECTS"),
            _pair(0, "DICTIONARY"),
            _pair(5, h_root),
            _pair(330, "0"),
            _pair(100, "AcDbDictionary"),
            _pair(281, 1),
            _pair(3, "ACAD_GROUP"),
            _pair(350, h_group),
            _pair(0, "DICTIONARY"),
            _pair(5, h_group),
            _pair(330, h_root),
            _pair(100, "AcDbDictionary"),
            _pair(281, 1),
            _pair(0, "ENDSEC"),
            _pair(0, "EOF"),
        ]
    )
    # Header last so $HANDSEED is the next unused handle after every section.
    header = "".join(
        [
            _pair(0, "SECTION"),
            _pair(2, "HEADER"),
            _pair(9, "$ACADVER"),
            _pair(1, ACADVER),
            _pair(9, "$HANDSEED"),
            _pair(5, f"{dxf._n + 1:X}"),
            _pair(9, "$DWGCODEPAGE"),
            _pair(3, "ANSI_1252"),
            _pair(9, "$INSUNITS"),
            _pair(70, 4),
            _pair(9, "$MEASUREMENT"),
            _pair(70, 1),
            _pair(0, "ENDSEC"),
        ]
    )
    return header + classes + tables + blocks + ents + objects


def write_pattern_dxf(pieces: list[dict], path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(pattern_dxf(pieces), encoding="utf-8")
    return path
