"""Princess line dress (textbook 衣身部分), current version.

Coordinate system
-----------------
Origin is centre back × waist line.
+X is toward the front (right on the page).
+Y is up.
Units are centimetres.

Layer 2: draft the existing bodice and skirt blocks, join them at the
waist, then apply the twelve conversion steps. The result is four cut
panels (centre back, side back, side front, centre front).
"""

from __future__ import annotations

import importlib.util
import sys
from dataclasses import dataclass, field
from math import atan2, cos, hypot, isfinite, sin, sqrt
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]


def _load_block(alias: str, rel: str):
    path = _ROOT / rel / "draft.py"
    spec = importlib.util.spec_from_file_location(alias, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[alias] = mod
    spec.loader.exec_module(mod)
    return mod


_bodice = _load_block("princess_src_bodice", "BasicBlock-Bodice")
_skirt = _load_block("princess_src_skirt", "BasicBlock-Skirt")

Vec2 = _bodice.Vec2
interpolate = _bodice.interpolate
arc_horizontal_at_start = _bodice.arc_horizontal_at_start
polyline_length = _bodice.polyline_length
point_along = _bodice.point_along
_raw_offset_closed = _bodice.offset_closed
close_ring = _bodice.close_ring
_dedupe_closed = _bodice._dedupe_closed
_same_point = _bodice._same_point
_signed_area = _bodice._signed_area
lerp = _bodice.lerp

PIECE_GAP = 4.0


def _inside_ring(point: Vec2, ring: list[Vec2]) -> bool:
    """Nonzero winding containment, including the boundary."""
    winding = 0
    for a, b in zip(ring, ring[1:] + ring[:1]):
        dx, dy = b.x - a.x, b.y - a.y
        cross = dx * (point.y - a.y) - dy * (point.x - a.x)
        if (abs(cross) <= 1e-9 * max(1.0, hypot(dx, dy))
                and min(a.x, b.x)-1e-9 <= point.x <= max(a.x, b.x)+1e-9
                and min(a.y, b.y)-1e-9 <= point.y <= max(a.y, b.y)+1e-9):
            return True
        if a.y <= point.y < b.y and cross > 0:
            winding += 1
        elif b.y <= point.y < a.y and cross < 0:
            winding -= 1
    return winding != 0


def _nested_ring(inner: list[Vec2], outer: list[Vec2]) -> bool:
    # Split each inner edge at every outer crossing. Testing all resulting open
    # intervals also catches an edge leaving/re-entering a concave outer ring.
    for a, b in zip(inner, inner[1:] + inner[:1]):
        if not _inside_ring(a, outer):
            return False
        rx, ry = b.x-a.x, b.y-a.y
        cuts = [0.0, 1.0]
        for c, d in zip(outer, outer[1:] + outer[:1]):
            sx, sy = d.x-c.x, d.y-c.y
            den = rx*sy-ry*sx
            if abs(den) < 1e-12:
                continue
            qx, qy = c.x-a.x, c.y-a.y
            t, u = (qx*sy-qy*sx)/den, (qx*ry-qy*rx)/den
            if 0 <= t <= 1 and 0 <= u <= 1:
                cuts.append(t)
        cuts.sort()
        for start, end in zip(cuts, cuts[1:]):
            if end-start > 1e-12 and not _inside_ring(lerp(a,b,(start+end)/2),outer):
                return False
    return True


def _trim_offset_loops(points: list[Vec2]) -> list[Vec2]:
    """Trim reverse-winding loops where offset edges cross at a concave join.

    Keep the exterior walk, meeting at the exact segment intersection. Do not
    round corners, move stitch knots or pick a largest component arbitrarily.
    Nested loops are redundant. Disconnected same-winding lobes are ambiguous
    and must not be silently discarded.
    """
    ring = _dedupe_closed(points)
    orientation = 1 if _signed_area(ring) > 0 else -1
    for _ in range(len(ring)):
        found = False
        n = len(ring)
        for i in range(n):
            a, b = ring[i], ring[(i + 1) % n]
            for j in range(i + 2, n):
                if i == 0 and j == n - 1:
                    continue
                c, d = ring[j], ring[(j + 1) % n]
                if (max(a.x, b.x) < min(c.x, d.x) or max(c.x, d.x) < min(a.x, b.x)
                        or max(a.y, b.y) < min(c.y, d.y) or max(c.y, d.y) < min(a.y, b.y)):
                    continue
                rx, ry = b.x - a.x, b.y - a.y
                sx, sy = d.x - c.x, d.y - c.y
                denominator = rx * sy - ry * sx
                if abs(denominator) < 1e-12:
                    continue
                qx, qy = c.x - a.x, c.y - a.y
                t = (qx * sy - qy * sx) / denominator
                u = (qx * ry - qy * rx) / denominator
                if not (0 <= t <= 1 and 0 <= u <= 1):
                    continue
                hit = Vec2(a.x + t * rx, a.y + t * ry)
                first = _dedupe_closed([hit, *ring[i + 1:j + 1]])
                second = _dedupe_closed([*ring[:i + 1], hit, *ring[j + 1:]])
                first_area = _signed_area(first) * orientation
                second_area = _signed_area(second) * orientation
                if first_area <= 1e-10 < second_area:
                    ring = second
                elif second_area <= 1e-10 < first_area:
                    ring = first
                elif first_area < second_area and _nested_ring(first, second):
                    ring = second
                elif second_area < first_area and _nested_ring(second, first):
                    ring = first
                else:
                    raise ValueError("Seam allowance has ambiguous overlapping regions")
                found = True
                break
            if found:
                break
        if not found:
            return ring
    raise ValueError("Seam allowance intersections could not be resolved")


def offset_closed(points: list[Vec2], dist: float) -> list[Vec2]:
    """Dress allowance: original miter offset with local crossing loops trimmed."""
    ring = _dedupe_closed(points)
    if not dist or len(ring) < 3:
        return list(ring)
    ccw = _signed_area(ring) > 0
    raw = []
    for i, curr in enumerate(ring):
        n1 = _bodice._edge_outward(ring[i-1], curr, ccw)
        n2 = _bodice._edge_outward(curr, ring[(i+1) % len(ring)], ccw)
        den = 1 + n1.x*n2.x + n1.y*n2.y
        if abs(den) < 0.05 or abs(dist / den) > abs(dist)*4:
            # A clipped single miter can cut through the stitch contour.
            # Bevel with BOTH shifted edge endpoints, then trim concave loops.
            raw.extend([curr+n1*dist, curr+n2*dist])
        else:
            raw.append(curr + (n1+n2)*(dist/den))
    return _trim_offset_loops(raw) if dist else raw


@dataclass
class DressParams:
    """Body measurements plus the book's conversion constants."""

    bust: float = 84.0
    back_length: float = 38.0
    waist: float = 68.0
    hip: float = 90.0
    dress_length: float = 50.0
    seam_allowance: float = 1.0

    hip_depth: float = 18.0
    # From the bodice underarm: inward toward each piece centre, then upward.
    side_shave: float = 1.0
    width_indent: float = 0.4
    armhole_mid_inward: float = 0.2
    neck_widen: float = 0.5
    shoulder_drop: float = 0.5
    armhole_raise: float = 0.5
    waist_ease: float = 3.0
    hip_ease: float = 4.0
    hem_fullness: float = 32.0
    # Back side, back princess, front side, front princess; full garment shares.
    hem_distribution: tuple[float, ...] = (3/16, 4/16, 4/16, 5/16)
    side_hem_raise: float = 0.5
    hem_ctrl_from_fold: float = 2.0 / 3.0
    back_dart_from_snp: float = 5.5
    back_shoulder_dart: float = 1.5
    front_princess_from_snp: float = 5.5
    bp_side_shave: float = 0.3
    hollow_toward_dart: float = 1.0
    hollow_tip_trim: float = 0.7
    sf_sh_to_cf: float = 0.7
    sf_ctrl_from_sh: float = 7.0
    side_take_frac: float = 1.0 / 3.0
    princess_dart: float = 3.0
    reference_bust: float = 84.0
    reference_waist: float = 68.0
    reference_hip: float = 90.0
    princess_ctrl_down: float = 6.0
    princess_above_hip: float = 4.0
    back_bl_w_inward: float = 0.2
    front_bp_w_inward: float = 0.3
    cf_sh_bp_to_cf: float = 0.2
    spline_samples: int = 32


@dataclass
class Mark:
    pt: Vec2
    label: str = ""


@dataclass
class Panel:
    name: str
    outline: list[Vec2]
    notches: list[Vec2] = field(default_factory=list)
    marks: list[Mark] = field(default_factory=list)
    construction: list[list[Vec2]] = field(default_factory=list)
    overlays: list[list[Vec2]] = field(default_factory=list)
    pre_rotation: list[list[Vec2]] = field(default_factory=list)
    seams: list["Seam"] = field(default_factory=list)
    notch_ids: list[str] = field(default_factory=list)


@dataclass
class Seam:
    """One named edge of a panel. `points` are for display/offset; knots/spans for DXF."""

    name: str
    kind: str
    points: list[Vec2]
    knots: list[Vec2] = field(default_factory=list)
    spans: list[list[Vec2]] = field(default_factory=list)
    center: Vec2 | None = None


@dataclass
class DressDraft:
    params: DressParams
    panels: list[Panel]
    back_waist: float
    front_waist: float
    back_hip: float
    front_hip: float
    back_dart: float
    front_dart: float
    back_side_len: float
    front_side_len: float
    side_dart: float
    dress_length: float
    notes: list[str] = field(default_factory=list)

    def report(self) -> str:
        p = self.params
        lines = [
            "Princess line dress  (bodice + skirt conversion)",
            f"  bust            {p.bust:.2f} cm",
            f"  back length     {p.back_length:.2f} cm",
            f"  waist           {p.waist:.2f} cm",
            f"  hip             {p.hip:.2f} cm",
            f"  dress length    {self.dress_length:.2f} cm  (from waist)",
            f"  back waist      {self.back_waist:.2f} cm",
            f"  front waist     {self.front_waist:.2f} cm",
            f"  back hip        {self.back_hip:.2f} cm",
            f"  front hip       {self.front_hip:.2f} cm",
            f"  back dart       {self.back_dart:.2f} cm",
            f"  front dart      {self.front_dart:.2f} cm",
            f"  back side       {self.back_side_len:.2f} cm",
            f"  front side      {self.front_side_len:.2f} cm",
        ]
        if self.notes:
            lines.append("  notes:")
            lines.extend(f"    - {n}" for n in self.notes)
        return "\n".join(lines)


def translate(points: list[Vec2], dx: float, dy: float = 0.0) -> list[Vec2]:
    if dx == 0.0 and dy == 0.0:
        return list(points)
    return [Vec2(pt.x + dx, pt.y + dy) for pt in points]


def translate_marks(marks: list[Mark], dx: float, dy: float = 0.0) -> list[Mark]:
    if dx == 0.0 and dy == 0.0:
        return list(marks)
    return [Mark(Vec2(m.pt.x + dx, m.pt.y + dy), m.label) for m in marks]


def translate_seams(seams: list[Seam], dx: float, dy: float = 0.0) -> list[Seam]:
    if dx == 0.0 and dy == 0.0:
        return list(seams)
    out: list[Seam] = []
    for seam in seams:
        center = None if seam.center is None else Vec2(seam.center.x + dx, seam.center.y + dy)
        out.append(
            Seam(
                name=seam.name,
                kind=seam.kind,
                points=translate(seam.points, dx, dy),
                knots=translate(seam.knots, dx, dy),
                spans=[translate(span, dx, dy) for span in seam.spans],
                center=center,
            )
        )
    return out


def rotate_around(pt: Vec2, origin: Vec2, ang: float) -> Vec2:
    d = pt - origin
    c, s = cos(ang), sin(ang)
    return Vec2(origin.x + d.x * c - d.y * s, origin.y + d.x * s + d.y * c)


def rotate_poly(points: list[Vec2], origin: Vec2, ang: float) -> list[Vec2]:
    if abs(ang) < 1e-12:
        return list(points)
    return [rotate_along(pt, origin, ang) for pt in points]


def rotate_along(pt: Vec2, origin: Vec2, ang: float) -> Vec2:
    return rotate_around(pt, origin, ang)


def angle_at(origin: Vec2, a: Vec2, b: Vec2) -> float:
    va = a - origin
    vb = b - origin
    return atan2(va.x * vb.y - va.y * vb.x, va.x * vb.x + va.y * vb.y)


def ensure_ccw(ring: list[Vec2]) -> list[Vec2]:
    pts = _dedupe_closed(ring)
    if len(pts) >= 3 and _signed_area(pts) < 0:
        pts.reverse()
    return pts


def along_segment(a: Vec2, b: Vec2, dist: float) -> Vec2:
    span = (b - a).length()
    if span < 1e-12:
        return a
    t = min(max(dist / span, 0.0), 1.0)
    return lerp(a, b, t)


def closest_on_polyline(poly: list[Vec2], pt: Vec2) -> tuple[Vec2, float]:
    best_pt = poly[0]
    best_d = (poly[0] - pt).length()
    best_along = 0.0
    along = 0.0
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]
        ab = b - a
        length = ab.length()
        if length < 1e-12:
            continue
        t = ((pt.x - a.x) * ab.x + (pt.y - a.y) * ab.y) / (length * length)
        t = min(max(t, 0.0), 1.0)
        q = lerp(a, b, t)
        d = (q - pt).length()
        if d < best_d:
            best_d = d
            best_pt = q
            best_along = along + t * length
        along += length
    return best_pt, best_along


def up_seam_from_level(poly: list[Vec2], level_y: float, dist: float, toward: Vec2) -> Vec2:
    """Point `dist` cm toward the start of `poly` from where it crosses `level_y`."""
    hit = nearest_hit(hits_at_y(poly, level_y), toward)
    if hit is None:
        return Vec2(toward.x, level_y + dist)
    _pt, along_hit = closest_on_polyline(poly, hit)
    return point_along(poly, max(0.0, along_hit - dist))


def hits_at_y(poly: list[Vec2], y: float) -> list[Vec2]:
    hits: list[Vec2] = []
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]
        if (a.y - y) * (b.y - y) > 0:
            continue
        if abs(b.y - a.y) < 1e-9:
            continue
        t = (y - a.y) / (b.y - a.y)
        if 0.0 <= t <= 1.0:
            hits.append(lerp(a, b, t))
    return hits


def nearest_hit(hits: list[Vec2], target: Vec2) -> Vec2 | None:
    if not hits:
        return None
    return min(hits, key=lambda h: (h - target).length())


def layout_shifts(outlines: list[list[Vec2]], seam: float = 0.0, gap: float = PIECE_GAP) -> list[float]:
    """X shifts that place panels left to right with `gap` between bounding boxes."""
    shifts: list[float] = []
    cursor: float | None = None
    for outline in outlines:
        pts = list(outline)
        if seam:
            pts = pts + offset_closed(outline, seam)
        min_x = min(pt.x for pt in pts)
        max_x = max(pt.x for pt in pts)
        if cursor is None:
            shifts.append(0.0)
            cursor = max_x + gap
        else:
            dx = cursor - min_x
            shifts.append(dx)
            cursor = max_x + dx + gap
    return shifts


def laid_out_panels(draft: DressDraft, seam: float = 0.0, gap: float = PIECE_GAP) -> list[Panel]:
    def layout_pts(panel: Panel) -> list[Vec2]:
        pts = list(panel.outline)
        if seam:
            pts = pts + offset_closed(panel.outline, seam)
        for poly in panel.construction:
            pts.extend(poly)
        for poly in panel.pre_rotation:
            pts.extend(poly)
        return pts

    shifts = layout_shifts([layout_pts(p) for p in draft.panels], 0.0, gap)
    out: list[Panel] = []
    for panel, dx in zip(draft.panels, shifts):
        out.append(
            Panel(
                name=panel.name,
                outline=translate(panel.outline, dx),
                notches=translate(panel.notches, dx),
                marks=translate_marks(panel.marks, dx),
                construction=[translate(poly, dx) for poly in panel.construction],
                overlays=[translate(poly, dx) for poly in panel.overlays],
                pre_rotation=[translate(poly, dx) for poly in panel.pre_rotation],
                seams=translate_seams(panel.seams, dx),
                notch_ids=list(panel.notch_ids),
            )
        )
    return out


def _side_curve(
    underarm: Vec2, waist: Vec2, wh_half: Vec2, hip: Vec2, hem_half: Vec2, hem: Vec2, samples: int
) -> list[Vec2]:
    """UA–W, then ½ of W–H, H, ½ of H–HEM, hem."""
    return interpolate([underarm, waist, wh_half, hip, hem_half, hem], samples)


def _princess(points: list[Vec2], samples: int) -> list[Vec2]:
    cleaned: list[Vec2] = []
    for pt in points:
        if not cleaned or not _same_point(pt, cleaned[-1], 0.05):
            cleaned.append(pt)
    if len(cleaned) < 2:
        return cleaned
    return interpolate(cleaned, samples)


def _princess_at_waist(upper: list[Vec2], lower: list[Vec2], samples: int) -> list[Vec2]:
    """Two curves that share the waist point; lower is independent of the upper tangent."""
    up = _princess(upper, samples)
    down = _princess(lower, samples)
    if not up:
        return down
    if not down:
        return up
    return up + down[1:]


def _hip_hem_straight(hip: Vec2, hem: Vec2) -> tuple[Vec2, Vec2]:
    """Control points on the hip–hem construction line (1/4 and 1/2 from the hip)."""
    return lerp(hip, hem, 0.25), lerp(hip, hem, 0.5)


def _scaled_princess_dart(takeout: float, ref_takeout: float, ref_dart: float) -> float:
    """Scale the reference princess dart by hip-to-actual-waist takeout."""
    if ref_takeout < 1e-9:
        return ref_dart
    return takeout * (ref_dart / ref_takeout)


def _scye_from_back(back_length: float, body_params, ref_bust: float) -> tuple[float, float]:
    """Bust line and BP height from back length and the reference scye, not current B."""
    armhole = ref_bust / 6.0 + body_params.armhole_depth_add
    bl_y = back_length - armhole
    return bl_y, bl_y - body_params.bp_below_bl


def _offset_toward(origin: Vec2, target: Vec2, distance: float) -> Vec2:
    """Move `distance` from `origin` toward `target`. Independent of left/right."""
    delta = target - origin
    if delta.length() < 1e-12:
        return origin
    return origin + delta.unit() * distance


def _offset_outward(origin: Vec2, interior: Vec2, distance: float) -> Vec2:
    """Move `distance` away from the piece centre, at the same height as `origin`."""
    return _offset_toward(origin, Vec2(interior.x, origin.y), -distance)


def _raise_up(origin: Vec2, distance: float) -> Vec2:
    """Move `distance` up (+Y). Independent of left/right."""
    return Vec2(origin.x, origin.y + distance)


def _raise_poly(points: list[Vec2], distance: float) -> list[Vec2]:
    if not distance:
        return list(points)
    return [_raise_up(pt, distance) for pt in points]


def _intersect_horizontal(a: Vec2, b: Vec2, y: float) -> Vec2 | None:
    """Intersection of segment a–b with the horizontal through `y`."""
    if abs(b.y - a.y) < 1e-12:
        return Vec2(a.x, y) if abs(a.y - y) < 1e-9 else None
    t = (y - a.y) / (b.y - a.y)
    if t < -1e-9 or t > 1.0 + 1e-9:
        return None
    return lerp(a, b, min(max(t, 0.0), 1.0))


def _hem_curve(side_hem: Vec2, ctrl: Vec2, princess_hem: Vec2, samples: int) -> list[Vec2]:
    """Hem from the side, through the 2/3-from-fold control, to the princess hem."""
    return interpolate([side_hem, ctrl, princess_hem], samples)


def _upward_inward(origin: Vec2, up: float, interior: Vec2, inward: float) -> Vec2:
    """From `origin`, move `up` along +Y, then `inward` toward the piece centre.

    Inward is toward `interior` at the raised height, not left/right in page space.
    """
    raised = Vec2(origin.x, origin.y + up)
    return _offset_toward(raised, Vec2(interior.x, raised.y), inward)


def _half_inward(poly: list[Vec2], interior: Vec2, inward: float) -> Vec2:
    """1/2 along `poly`, then `inward` toward the piece centre at that height."""
    if not poly:
        return Vec2(0.0, 0.0)
    half = point_along(poly, polyline_length(poly) / 2.0)
    return _offset_toward(half, Vec2(interior.x, half.y), inward)


def _centroid(pts: list[Vec2]) -> Vec2:
    if not pts:
        return Vec2(0.0, 0.0)
    n = float(len(pts))
    return Vec2(sum(pt.x for pt in pts) / n, sum(pt.y for pt in pts) / n)


def _inward_midpoint(a: Vec2, b: Vec2, interior: Vec2, distance: float) -> Vec2:
    """Half-way along a–b, then `distance` toward the interior of the piece.

    Inward is the perpendicular to a–b that points at `interior` (the piece
    centre). It does not assume left/right or +X/−X.
    """
    mid = lerp(a, b, 0.5)
    along = b - a
    if along.length() < 1e-12:
        toward = interior - mid
        if toward.length() < 1e-12:
            return mid
        return mid + toward.unit() * distance
    normal = Vec2(-along.y, along.x).unit()
    to_interior = interior - mid
    if to_interior.x * normal.x + to_interior.y * normal.y < 0.0:
        normal = Vec2(-normal.x, -normal.y)
    return mid + normal * distance


def _clean_knots(points: list[Vec2]) -> list[Vec2]:
    cleaned: list[Vec2] = []
    for pt in points:
        if not cleaned or not _same_point(pt, cleaned[-1], 0.05):
            cleaned.append(pt)
    return cleaned


def _line_seam(name: str, a: Vec2, b: Vec2) -> Seam:
    return Seam(name=name, kind="line", points=[a, b], knots=[a, b])


def _curve_seam(name: str, knots: list[Vec2], samples: int) -> Seam:
    kn = _clean_knots(knots)
    if len(kn) < 2:
        return Seam(name=name, kind="line", points=kn, knots=kn)
    if len(kn) == 2:
        return _line_seam(name, kn[0], kn[1])
    return Seam(name=name, kind="curve", points=interpolate(kn, samples), knots=kn, spans=[kn])


def _span_seam(name: str, spans: list[list[Vec2]], samples: int) -> Seam:
    cleaned = [_clean_knots(span) for span in spans if span]
    cleaned = [span for span in cleaned if len(span) >= 2]
    points: list[Vec2] = []
    for kn in cleaned:
        part = interpolate(kn, samples) if len(kn) > 2 else kn
        if points and part:
            if _same_point(points[-1], part[0], 0.05):
                points.extend(part[1:])
            else:
                points.extend(part)
        else:
            points.extend(part)
    if len(cleaned) == 1 and len(cleaned[0]) == 2:
        return _line_seam(name, cleaned[0][0], cleaned[0][1])
    return Seam(name=name, kind="curve", points=points, knots=[], spans=cleaned)


def _arc_seam(name: str, start: Vec2, end: Vec2, samples: int) -> Seam:
    points = arc_horizontal_at_start(start, end, samples)
    dx = end.x - start.x
    dy = end.y - start.y
    if abs(dy) < 1e-9:
        return _line_seam(name, start, end)
    radius = (dx * dx + dy * dy) / (2.0 * dy)
    center = Vec2(start.x, start.y + radius)
    return Seam(
        name=name,
        kind="arc",
        points=points,
        knots=[start, end],
        center=center,
    )


def _reverse_seam(seam: Seam) -> Seam:
    spans = [list(reversed(span)) for span in reversed(seam.spans)]
    return Seam(
        name=seam.name,
        kind=seam.kind,
        points=list(reversed(seam.points)),
        knots=list(reversed(seam.knots)),
        spans=spans,
        center=seam.center,
    )


def _join_seams(seams: list[Seam]) -> list[Vec2]:
    pts: list[Vec2] = []
    for seam in seams:
        sp = seam.points
        if not sp:
            continue
        if pts and _same_point(pts[-1], sp[0], 0.05):
            pts.extend(sp[1:])
        else:
            pts.extend(sp)
    return pts


def _seams_ccw(seams: list[Seam]) -> tuple[list[Seam], list[Vec2]]:
    outline = _join_seams(seams)
    ring = _dedupe_closed(outline)
    if len(ring) >= 3 and _signed_area(ring) < 0:
        seams = [_reverse_seam(s) for s in reversed(seams)]
        outline = _join_seams(seams)
    return seams, ensure_ccw(outline)


def _simple_stitch_ring(points: list[Vec2]) -> bool:
    """Reject crossings/touches between non-neighboring sampled stitch edges."""
    ring = _dedupe_closed(points)
    if len(ring) < 3 or abs(_signed_area(ring)) < 1e-10:
        return False
    n = len(ring)
    for i, a in enumerate(ring):
        b = ring[(i+1) % n]
        for j in range(i+2, n):
            if i == 0 and j == n-1:
                continue
            c, d = ring[j], ring[(j+1) % n]
            if max(a.x,b.x) < min(c.x,d.x) or max(c.x,d.x) < min(a.x,b.x) or max(a.y,b.y) < min(c.y,d.y) or max(c.y,d.y) < min(a.y,b.y):
                continue
            rx, ry, sx, sy = b.x-a.x, b.y-a.y, d.x-c.x, d.y-c.y
            den = rx*sy-ry*sx
            qx, qy = c.x-a.x, c.y-a.y
            if abs(den) < 1e-12:
                if abs(qx*ry-qy*rx) < 1e-12:
                    return False
                continue
            t, u = (qx*sy-qy*sx)/den, (qx*ry-qy*rx)/den
            if 0 <= t <= 1 and 0 <= u <= 1:
                return False
    return True


def _seam_position(points: list[Vec2], target: Vec2) -> float:
    walked = 0.0
    best = (float('inf'), 0.0)
    for a, b in zip(points, points[1:]):
        dx, dy = b.x-a.x, b.y-a.y
        square = dx*dx+dy*dy
        if square == 0:
            continue
        t = max(0.0, min(1.0, ((target.x-a.x)*dx+(target.y-a.y)*dy)/square))
        projected = lerp(a,b,t)
        best = min(best, ((target-projected).length(), walked+t*sqrt(square)))
        walked += sqrt(square)
    return best[1]


def draft_princess_dress(params: DressParams | None = None) -> DressDraft:
    p = params or DressParams()
    notes: list[str] = []
    if not all(isfinite(v) for v in (p.bust, p.waist, p.hip, p.back_length,
            p.dress_length, p.hip_depth, p.seam_allowance, p.waist_ease, p.hip_ease, p.hem_fullness)):
        raise ValueError("Measurements and design settings must be finite")
    if not (0 <= p.waist_ease <= 12 and 0 <= p.hip_ease <= 12 and 0 <= p.hem_fullness <= 80):
        raise ValueError("Ease must be 0–12 cm and hem fullness 0–80 cm")
    if (len(p.hem_distribution) != 4 or
            any(not isfinite(v) or v < 0 for v in p.hem_distribution) or
            abs(sum(p.hem_distribution)-1) > 1e-9):
        raise ValueError("Hem distribution needs four nonnegative shares summing to one")
    if p.back_length <= 0 or p.hip_depth <= 0 or p.seam_allowance < 0:
        raise ValueError("Lengths must be positive and seam allowance nonnegative")

    if p.bust <= 0 or p.waist <= 0 or p.hip <= 0:
        raise ValueError("bust, waist, and hip must be positive")
    if not isfinite(p.side_hem_raise) or p.side_hem_raise < 0:
        raise ValueError("Side hem rise must be finite and nonnegative")
    if p.dress_length <= p.hip_depth + p.side_hem_raise:
        raise ValueError("Dress length must exceed hip depth plus side hem rise; the raised side hem must stay below the hip")
    if p.waist >= p.hip:
        raise ValueError("waist must be smaller than hip")

    body = _bodice.draft_body(
        _bodice.BodyParams(
            bust=p.bust,
            back_length=p.back_length,
            seam_allowance=p.seam_allowance,
        )
    )
    skirt = _skirt.draft_skirt(
        _skirt.SkirtParams(
            hip=p.hip,
            waist=p.waist,
            skirt_length=p.dress_length,
            hip_depth=p.hip_depth,
            seam_allowance=p.seam_allowance,
        )
    )

    samples = p.spline_samples
    bisector = sqrt(2.0) / 2.0
    wl_y = 0.0
    hl_y = -p.hip_depth
    hem_y = -p.dress_length
    bl_y, bp_y = _scye_from_back(p.back_length, body.params, p.reference_bust)
    top_y = body.top_y
    cf_x = body.cf_x
    bodice_ua = Vec2(body.underarm.x, bl_y)

    # --- 2, 7, 8: side inward/up at underarm, chest/back indent ---
    back_width_x = body.back_width_x - p.width_indent
    chest_width_x = body.chest_width_x + p.width_indent
    # Dress underarm: 0.5 cm up from the (locked) bodice UA, then 1 cm inward
    # (back toward CB, front toward CF).
    back_underarm = _upward_inward(bodice_ua, p.armhole_raise, Vec2(0.0, 0.0), p.side_shave)
    front_underarm = _upward_inward(bodice_ua, p.armhole_raise, Vec2(cf_x, 0.0), p.side_shave)
    ah_depth = top_y - back_underarm.y
    mid_depth_y = top_y - ah_depth / 2.0

    # --- 5, 6: neck 0.5 wider, shoulder tip 0.5 down ---
    back_snp = Vec2(body.back_snp.x + p.neck_widen, body.back_snp.y)
    back_shoulder = Vec2(body.back_shoulder.x, body.back_shoulder.y - p.shoulder_drop)
    back_neck = arc_horizontal_at_start(body.cb_neck, back_snp, samples)

    fnw = body.front_neck_width + p.neck_widen
    front_snp = Vec2(cf_x - fnw, body.front_snp.y)
    neck_corner = Vec2(cf_x - fnw, body.cf_neck.y)
    front_bisector_len = fnw / 2.0 - body.params.front_neck_bisector_minus
    front_neck_offset = Vec2(
        neck_corner.x + front_bisector_len * bisector,
        neck_corner.y + front_bisector_len * bisector,
    )
    front_neck = interpolate([front_snp, front_neck_offset, body.cf_neck], samples)
    front_shoulder = Vec2(body.front_shoulder.x, body.front_shoulder.y - p.shoulder_drop)

    back_ah_width = back_underarm.x - back_width_x
    front_ah_width = chest_width_x - front_underarm.x
    back_ah_along = max(back_ah_width, 0.4) / 2.0 + body.params.back_ah_bisector_extra
    front_ah_along = max(front_ah_width, 0.4) / 2.0
    back_ah_mid = Vec2(back_width_x, mid_depth_y)
    front_ah_mid = Vec2(chest_width_x, mid_depth_y)
    back_ah_bisector = Vec2(
        back_width_x + back_ah_along * bisector,
        back_underarm.y + back_ah_along * bisector,
    )
    front_ah_bisector = Vec2(
        chest_width_x - front_ah_along * bisector,
        front_underarm.y + front_ah_along * bisector,
    )
    back_armhole = interpolate([back_shoulder, back_ah_mid, back_ah_bisector, back_underarm], samples)
    back_ah_mid = _half_inward(back_armhole, Vec2(0.0, 0.0), p.armhole_mid_inward)
    back_armhole = interpolate([back_shoulder, back_ah_mid, back_ah_bisector, back_underarm], samples)
    front_armhole = interpolate(
        [front_underarm, front_ah_bisector, front_ah_mid, front_shoulder], samples
    )
    front_ah_mid = _half_inward(front_armhole, Vec2(cf_x, 0.0), p.armhole_mid_inward)
    front_armhole = interpolate(
        [front_underarm, front_ah_bisector, front_ah_mid, front_shoulder], samples
    )

    # Dress waist stays at y = 0. The original front bodice waist is its
    # dropped hem (fnw/2 below the construction waist). Lift the front
    # above the waist so that dropped hem sits on y = 0. Do not move hip,
    # hem, or any point on or below the waist.
    front_lift = -body.cf_hem.y
    front_snp = _raise_up(front_snp, front_lift)
    front_neck_offset = _raise_up(front_neck_offset, front_lift)
    front_neck = _raise_poly(front_neck, front_lift)
    front_shoulder = _raise_up(front_shoulder, front_lift)
    front_underarm = _raise_up(front_underarm, front_lift)
    front_ah_mid = _raise_up(front_ah_mid, front_lift)
    front_ah_bisector = _raise_up(front_ah_bisector, front_lift)
    front_armhole = _raise_poly(front_armhole, front_lift)
    bp_front = _raise_up(Vec2(body.bp.x, bp_y), front_lift)
    cf_neck = _raise_up(body.cf_neck, front_lift)

    # Actual waists: CB+SB = W/4, CF+SF = skirt front (W/4+0.5+1).
    # At the 68/90 reference the princess dart is 3 cm; other sizes keep
    # that dart:side ratio so both the princess edge and the side seam move.
    back_hip = (p.hip + p.hip_ease) / 4 - 1
    front_hip = (p.hip + p.hip_ease) / 4 + 1
    back_waist = (p.waist + p.waist_ease) / 4 - 0.75
    front_waist = (p.waist + p.waist_ease) / 4 + 0.75
    back_take = back_hip - back_waist
    front_take = front_hip - front_waist
    if back_take <= 0 or front_take <= 0:
        raise ValueError("waist-hip difference is too small for this dress")
    ref_skirt = _skirt.draft_skirt(
        _skirt.SkirtParams(
            hip=p.reference_hip,
            waist=p.reference_waist,
            skirt_length=p.dress_length,
            hip_depth=p.hip_depth,
            seam_allowance=p.seam_allowance,
        )
    )
    ref_back_take = ref_skirt.back_hip - p.reference_waist / 4.0
    ref_front_take = ref_skirt.front_hip - ref_skirt.front_waist
    back_dart = _scaled_princess_dart(back_take, ref_back_take, p.princess_dart)
    front_dart = _scaled_princess_dart(front_take, ref_front_take, p.princess_dart)
    back_side_take = back_take - back_dart
    front_side_take = front_take - front_dart

    cb_hem = Vec2(0.0, hem_y)
    cf_hem = Vec2(cf_x, hem_y)
    back_hip_pt = Vec2(back_hip, hl_y)
    back_side_waist = Vec2(back_hip - back_side_take, wl_y)
    # Original hem width is the hip (CB → unflared side). Add the side-seam
    # flare, then take 2/3 of that total from the fold as a hem control.
    back_side_hem0 = _offset_outward(Vec2(back_hip, hem_y), Vec2(0.0, hem_y), p.hem_fullness / 2 * p.hem_distribution[0])
    back_hem_23 = lerp(cb_hem, back_side_hem0, p.hem_ctrl_from_fold)
    back_side_hem = _raise_up(back_side_hem0, p.side_hem_raise)
    back_wh_half = lerp(back_side_waist, back_hip_pt, 0.5)
    back_side_half = lerp(back_hip_pt, back_side_hem, 0.5)
    front_hip_pt = Vec2(cf_x - front_hip, hl_y)
    front_side_waist = Vec2(cf_x - front_hip + front_side_take, wl_y)
    front_side_hem0 = _offset_outward(
        Vec2(cf_x - front_hip, hem_y), Vec2(cf_x, hem_y), p.hem_fullness / 2 * p.hem_distribution[2]
    )
    front_hem_23 = lerp(cf_hem, front_side_hem0, p.hem_ctrl_from_fold)
    front_side_hem = _raise_up(front_side_hem0, p.side_hem_raise)
    front_wh_half = lerp(front_side_waist, front_hip_pt, 0.5)
    front_side_half = lerp(front_hip_pt, front_side_hem, 0.5)

    back_side = _side_curve(
        back_underarm,
        back_side_waist,
        back_wh_half,
        back_hip_pt,
        back_side_half,
        back_side_hem,
        samples,
    )
    # Original bodice side (after placing dropped hem on the skirt waist),
    # then 1 cm inward toward CF. Point A is BP-level on that line.
    bodice_side_ua = _offset_toward(
        _raise_up(bodice_ua, front_lift),
        Vec2(cf_x, bl_y + front_lift),
        p.side_shave,
    )
    bodice_side_sw = _offset_toward(
        _raise_up(body.side_waist, front_lift),
        Vec2(cf_x, body.side_waist.y + front_lift),
        p.side_shave,
    )
    point_a = _intersect_horizontal(bodice_side_ua, bodice_side_sw, bp_front.y)
    if point_a is None:
        point_a = lerp(bodice_side_ua, bodice_side_sw, 0.5)
    front_below = interpolate(
        [front_side_waist, front_wh_half, front_hip_pt, front_side_half, front_side_hem],
        samples,
    )
    line1_len = (front_underarm - point_a).length()
    line2_len = (point_a - front_side_waist).length()
    back_side_len = polyline_length(back_side)
    front_side_len0 = line1_len + line2_len + polyline_length(front_below)
    side_dart = front_side_len0 - back_side_len
    front_side = [front_underarm, point_a, front_side_waist] + front_below[1:]

    # --- 10, 11: princess axes and back shoulder dart ---
    back_axis = back_width_x / 2.0
    bp = Vec2(body.bp.x, bp_y)
    p0 = along_segment(back_snp, back_shoulder, p.back_dart_from_snp)
    p1 = along_segment(back_snp, back_shoulder, p.back_dart_from_snp + p.back_shoulder_dart)
    cb_waist = Vec2(back_axis - back_dart / 2.0, wl_y)
    sb_waist = Vec2(back_axis + back_dart / 2.0, wl_y)
    cb_hip = Vec2(back_axis, hl_y)
    sb_hip = Vec2(back_axis, hl_y)
    back_pr_flare = p.hem_fullness / 4 * p.hem_distribution[1]
    cb_pr_hem = _offset_outward(Vec2(back_axis, hem_y), Vec2(0.0, hem_y), back_pr_flare)
    sb_pr_hem = _offset_outward(Vec2(back_axis, hem_y), Vec2(back_hip, hem_y), back_pr_flare)
    bl_pt = Vec2(back_axis, bl_y)
    bp_level = Vec2(back_axis, bp.y)
    back_knot_cb = up_seam_from_level(
        _princess([p0, bl_pt, cb_waist], samples), bp.y, p.princess_ctrl_down, bp_level
    )
    back_knot_sb = up_seam_from_level(
        _princess([p1, bl_pt, sb_waist], samples), bp.y, p.princess_ctrl_down, bp_level
    )
    cb_knot_4 = Vec2(cb_hip.x, cb_hip.y + p.princess_above_hip)
    sb_knot_4 = Vec2(sb_hip.x, sb_hip.y + p.princess_above_hip)
    cb_q, cb_half = _hip_hem_straight(cb_hip, cb_pr_hem)
    sb_q, sb_half = _hip_hem_straight(sb_hip, sb_pr_hem)
    cb_interior = _centroid([body.cb_neck, Vec2(0.0, wl_y), Vec2(0.0, hem_y)])
    sb_interior = _centroid([back_shoulder, back_underarm, back_side_waist, back_side_hem])
    cb_bl_w = _inward_midpoint(bl_pt, cb_waist, cb_interior, p.back_bl_w_inward)
    sb_bl_w = _inward_midpoint(bl_pt, sb_waist, sb_interior, p.back_bl_w_inward)
    back_pr_cb = _princess_at_waist(
        [p0, back_knot_cb, cb_bl_w, cb_waist],
        [cb_waist, cb_knot_4, cb_half, cb_pr_hem],
        samples,
    )
    back_pr_sb = _princess_at_waist(
        [p1, back_knot_sb, sb_bl_w, sb_waist],
        [sb_waist, sb_knot_4, sb_half, sb_pr_hem],
        samples,
    )

    bp = bp_front

    # --- 9, 11: front side-seam dart, rotated into the shoulder ---
    f0 = along_segment(front_snp, front_shoulder, p.front_princess_from_snp)
    rot_ang = 0.0
    dart_u = point_a
    dart_l = point_a
    front_armhole_r = list(front_armhole)
    front_shoulder_r = front_shoulder
    f0_side = f0
    front_side_r = list(front_side)
    if side_dart > 0.08:
        dart_u = point_a
        dart_l = along_segment(point_a, front_side_waist, side_dart)
        rot_ang = angle_at(bp, dart_u, dart_l)
        front_armhole_r = rotate_poly(front_armhole, bp, rot_ang)
        front_shoulder_r = rotate_around(front_shoulder, bp, rot_ang)
        f0_side = rotate_around(f0, bp, rot_ang)
        ua_r = rotate_around(front_underarm, bp, rot_ang)
        front_side_r = [ua_r, dart_l]
        if not _same_point(dart_l, front_side_waist, 0.05):
            front_side_r.append(front_side_waist)
        front_side_r = front_side_r + front_below[1:]
        if len(front_side_r) < 2:
            front_side_r = list(front_side)

    # --- 12: hollow chest (default) and 0.3 cm at BP on the side front ---
    f0_cf = along_segment(
        front_snp, front_shoulder, p.front_princess_from_snp + p.hollow_toward_dart
    )
    tip_to_dart = f0_side - front_shoulder_r
    if tip_to_dart.length() > p.hollow_tip_trim + 0.2:
        front_shoulder_r = front_shoulder_r + tip_to_dart.unit() * p.hollow_tip_trim
    front_ah_mid_r = rotate_around(front_ah_mid, bp, rot_ang)
    front_ah_bisector_r = rotate_around(front_ah_bisector, bp, rot_ang)
    ah_ua = front_armhole_r[0] if front_armhole_r else front_underarm
    front_armhole_r = interpolate(
        [ah_ua, front_ah_bisector_r, front_ah_mid_r, front_shoulder_r], samples
    )
    f0_side = _offset_toward(f0_side, Vec2(cf_x, f0_side.y), p.sf_sh_to_cf)
    sf_from_sh = along_segment(f0_side, bp, p.sf_ctrl_from_sh)

    bp_side = Vec2(bp.x - p.bp_side_shave, bp.y)
    cf_pr_waist = Vec2(bp.x + front_dart / 2.0, wl_y)
    sf_pr_waist = Vec2(bp.x - front_dart / 2.0, wl_y)
    cf_pr_hip = Vec2(bp.x, hl_y)
    sf_pr_hip = Vec2(bp.x, hl_y)
    front_pr_flare = p.hem_fullness / 4 * p.hem_distribution[3]
    cf_pr_hem = _offset_outward(Vec2(bp.x, hem_y), Vec2(cf_x, hem_y), front_pr_flare)
    sf_pr_hem = _offset_outward(Vec2(bp.x, hem_y), Vec2(cf_x - front_hip, hem_y), front_pr_flare)
    cf_knot_4 = Vec2(cf_pr_hip.x, cf_pr_hip.y + p.princess_above_hip)
    sf_knot_4 = Vec2(sf_pr_hip.x, sf_pr_hip.y + p.princess_above_hip)
    cf_q, cf_half = _hip_hem_straight(cf_pr_hip, cf_pr_hem)
    sf_q, sf_half = _hip_hem_straight(sf_pr_hip, sf_pr_hem)
    cf_interior = _centroid([cf_neck, Vec2(cf_x, wl_y), Vec2(cf_x, hem_y)])
    sf_underarm = front_armhole_r[0] if front_armhole_r else front_underarm
    sf_interior = _centroid([front_shoulder_r, sf_underarm, front_side_waist, front_side_hem])
    cf_bp_w = _inward_midpoint(bp, cf_pr_waist, cf_interior, p.front_bp_w_inward)
    sf_bp_w = _inward_midpoint(bp_side, sf_pr_waist, sf_interior, p.front_bp_w_inward)
    cf_sh_bp = _offset_toward(
        lerp(f0_cf, bp, 0.5), Vec2(cf_x, (f0_cf.y + bp.y) / 2.0), p.cf_sh_bp_to_cf
    )
    front_pr_cf = _princess_at_waist(
        [f0_cf, cf_sh_bp, bp, cf_bp_w, cf_pr_waist],
        [cf_pr_waist, cf_knot_4, cf_half, cf_pr_hem],
        samples,
    )
    front_pr_sf = _princess_at_waist(
        [f0_side, sf_from_sh, bp_side, sf_bp_w, sf_pr_waist],
        [sf_pr_waist, sf_knot_4, sf_half, sf_pr_hem],
        samples,
    )

    sb_hem = _hem_curve(back_side_hem, back_hem_23, sb_pr_hem, samples)
    sf_hem = _hem_curve(front_side_hem, front_hem_23, sf_pr_hem, samples)

    pre_sf_interior = _centroid([front_shoulder, front_underarm, front_side_waist, front_side_hem])
    pre_sf_bp_w = _inward_midpoint(bp_side, sf_pr_waist, pre_sf_interior, p.front_bp_w_inward)
    pre_pr_sf = _princess_at_waist(
        [f0, bp_side, pre_sf_bp_w, sf_pr_waist],
        [sf_pr_waist, sf_knot_4, sf_half, sf_pr_hem],
        samples,
    )
    sf_pre = close_ring(
        ensure_ccw(
            [
                f0,
                front_shoulder,
                *list(reversed(front_armhole[:-1])),
                *front_side[1:],
                *sf_hem[1:],
                *list(reversed(pre_pr_sf[1:])),
            ]
        )
    )

    cb_upper = [p0, back_knot_cb, cb_bl_w, cb_waist]
    cb_lower = [cb_waist, cb_knot_4, cb_half, cb_pr_hem]
    sb_upper = [p1, back_knot_sb, sb_bl_w, sb_waist]
    sb_lower = [sb_waist, sb_knot_4, sb_half, sb_pr_hem]
    cf_upper = [f0_cf, cf_sh_bp, bp, cf_bp_w, cf_pr_waist]
    cf_lower = [cf_pr_waist, cf_knot_4, cf_half, cf_pr_hem]
    sf_upper = [f0_side, sf_from_sh, bp_side, sf_bp_w, sf_pr_waist]
    sf_lower = [sf_pr_waist, sf_knot_4, sf_half, sf_pr_hem]

    if side_dart > 0.08:
        sf_side_spans = [[front_side_r[0], dart_l]]
        if not _same_point(dart_l, front_side_waist, 0.05):
            sf_side_spans.append([dart_l, front_side_waist])
        sf_side_spans.append(
            [front_side_waist, front_wh_half, front_hip_pt, front_side_half, front_side_hem]
        )
    else:
        sf_side_spans = [
            [front_underarm, point_a],
            [point_a, front_side_waist],
            [front_side_waist, front_wh_half, front_hip_pt, front_side_half, front_side_hem],
        ]

    cb_seams, cb_outline = _seams_ccw(
        [
            _arc_seam("SEAM-CB-Collar", body.cb_neck, back_snp, samples),
            _line_seam("SEAM-CB-Shoulder", back_snp, p0),
            _span_seam("SEAM-CB-PrincessSeam", [cb_upper, cb_lower], samples),
            _line_seam("SEAM-CB-Hem", cb_pr_hem, cb_hem),
            _line_seam("SEAM-CB-Center", cb_hem, body.cb_neck),
        ]
    )
    sb_seams, sb_outline = _seams_ccw(
        [
            _line_seam("SEAM-SB-Shoulder", p1, back_shoulder),
            _curve_seam(
                "SEAM-SB-Armhole",
                [back_shoulder, back_ah_mid, back_ah_bisector, back_underarm],
                samples,
            ),
            _curve_seam(
                "SEAM-SB-Side",
                [back_underarm, back_side_waist, back_wh_half, back_hip_pt, back_side_half, back_side_hem],
                samples,
            ),
            _curve_seam("SEAM-SB-Hem", [back_side_hem, back_hem_23, sb_pr_hem], samples),
            _span_seam(
                "SEAM-SB-PrincessSeam",
                [list(reversed(sb_lower)), list(reversed(sb_upper))],
                samples,
            ),
        ]
    )
    ah_ua = front_armhole_r[0] if front_armhole_r else front_underarm
    sf_seams, sf_outline = _seams_ccw(
        [
            _line_seam("SEAM-SF-Shoulder", f0_side, front_shoulder_r),
            _curve_seam(
                "SEAM-SF-Armhole",
                [front_shoulder_r, front_ah_mid_r, front_ah_bisector_r, ah_ua],
                samples,
            ),
            _span_seam("SEAM-SF-Side", sf_side_spans, samples),
            _curve_seam("SEAM-SF-Hem", [front_side_hem, front_hem_23, sf_pr_hem], samples),
            _span_seam(
                "SEAM-SF-PrincessSeam",
                [list(reversed(sf_lower)), list(reversed(sf_upper))],
                samples,
            ),
        ]
    )
    cf_seams, cf_outline = _seams_ccw(
        [
            _curve_seam("SEAM-CF-Collar", [front_snp, front_neck_offset, cf_neck], samples),
            _line_seam("SEAM-CF-Center", cf_neck, cf_hem),
            _line_seam("SEAM-CF-Hem", cf_hem, cf_pr_hem),
            _span_seam(
                "SEAM-CF-PrincessSeam",
                [list(reversed(cf_lower)), list(reversed(cf_upper))],
                samples,
            ),
            _line_seam("SEAM-CF-Shoulder", f0_cf, front_snp),
        ]
    )

    def princess_notches(pr: list[Vec2], axis_x: float, ys: list[float]) -> list[Vec2]:
        out: list[Vec2] = []
        for y in ys:
            hit = nearest_hit(hits_at_y(pr, y), Vec2(axis_x, y))
            if hit is not None:
                out.append(hit)
        return out

    notch_ys = [bl_y, wl_y, hl_y]
    cb_notches = princess_notches(back_pr_cb, back_axis, notch_ys)
    sb_notches = princess_notches(back_pr_sb, back_axis, notch_ys)
    sf_notches = princess_notches(front_pr_sf, bp.x, notch_ys)
    cf_notches = princess_notches(front_pr_cf, bp.x, notch_ys)

    sf_construction = [
        [bodice_side_ua, bodice_side_sw],
        [bp, point_a],
        [front_underarm, point_a],
        [point_a, front_side_waist],
        [f0_side, bp],
    ]
    if side_dart > 0.08:
        sf_construction.append([dart_u, bp, dart_l])
    cf_construction = [[f0_cf, bp]]

    body_front = close_ring(_raise_poly(_bodice.front_outline(body), front_lift))

    panels = [
        Panel(
            "Centre back",
            cb_outline,
            cb_notches,
            [
                Mark(p0, "SH"),
                Mark(back_knot_cb, "6"),
                Mark(bl_pt, "BL"),
                Mark(cb_bl_w, "0.2"),
                Mark(cb_waist, "W"),
                Mark(cb_knot_4, "4"),
                Mark(cb_hip, "H"),
                Mark(cb_q, "¼"),
                Mark(cb_half, "½"),
                Mark(cb_pr_hem, "HEM"),
                Mark(cb_hem, "HEM"),
            ],
            seams=cb_seams,
        ),
        Panel(
            "Side back",
            sb_outline,
            sb_notches,
            [
                Mark(p1, "SH"),
                Mark(back_knot_sb, "6"),
                Mark(bl_pt, "BL"),
                Mark(sb_bl_w, "0.2"),
                Mark(sb_waist, "W"),
                Mark(sb_knot_4, "4"),
                Mark(sb_hip, "H"),
                Mark(sb_q, "¼"),
                Mark(sb_half, "½"),
                Mark(sb_pr_hem, "HEM"),
                Mark(back_shoulder, "TIP"),
                Mark(back_ah_mid, "MID"),
                Mark(back_ah_bisector, "45"),
                Mark(back_underarm, "UA"),
                Mark(back_side_waist, "W"),
                Mark(back_wh_half, "½"),
                Mark(back_hip_pt, "H"),
                Mark(back_side_half, "½"),
                Mark(back_hem_23, "⅔"),
                Mark(back_side_hem, "HEM"),
            ],
            seams=sb_seams,
        ),
        Panel(
            "Side front",
            sf_outline,
            sf_notches,
            [
                Mark(f0_side, "SH"),
                Mark(sf_from_sh, "7"),
                Mark(bp_side, "BP"),
                Mark(sf_bp_w, "0.3"),
                Mark(sf_pr_waist, "W"),
                Mark(sf_knot_4, "4"),
                Mark(sf_pr_hip, "H"),
                Mark(sf_q, "¼"),
                Mark(sf_half, "½"),
                Mark(sf_pr_hem, "HEM"),
                Mark(front_shoulder_r, "TIP"),
                Mark(front_ah_mid_r, "MID"),
                Mark(front_ah_bisector_r, "45"),
                Mark(front_side_r[0] if front_side_r else front_underarm, "UA"),
                Mark(point_a, "A"),
                Mark(front_side_waist, "W"),
                Mark(front_wh_half, "½"),
                Mark(front_hip_pt, "H"),
                Mark(front_side_half, "½"),
                Mark(front_hem_23, "⅔"),
                Mark(front_side_hem, "HEM"),
            ],
            construction=sf_construction,
            overlays=[body_front],
            pre_rotation=[sf_pre],
            seams=sf_seams,
        ),
        Panel(
            "Centre front",
            cf_outline,
            cf_notches,
            [
                Mark(f0_cf, "SH"),
                Mark(cf_sh_bp, "0.2"),
                Mark(bp, "BP"),
                Mark(cf_bp_w, "0.3"),
                Mark(cf_pr_waist, "W"),
                Mark(cf_knot_4, "4"),
                Mark(cf_pr_hip, "H"),
                Mark(cf_q, "¼"),
                Mark(cf_half, "½"),
                Mark(cf_pr_hem, "HEM"),
                Mark(cf_hem, "HEM"),
            ],
            construction=cf_construction,
            seams=cf_seams,
        ),
    ]

    for panel in panels:
        if len(panel.outline) < 4:
            raise ValueError(f"{panel.name} did not form a closed panel")
        if not _simple_stitch_ring(panel.outline):
            raise ValueError(f"Unsupported design: {panel.name} stitch outline intersects itself or is degenerate")
        pair = "back_princess" if panel.name in ("Centre back", "Side back") else "front_princess"
        if len(panel.notches) != 3:
            raise ValueError(f"{panel.name} is missing a princess sewing mark")
        panel.notch_ids = [f"{pair}.{level}" for level in ("upper", "waist", "hip")]
        side = next((s for s in panel.seams if s.name.endswith("-Side")), None)
        if side:
            for level, y in (("waist", wl_y), ("hip", hl_y)):
                hits = hits_at_y(side.points, y)
                # Consecutive segments can both return the same knot.
                unique = []
                for hit in hits:
                    if not any(_same_point(hit, old) for old in unique):
                        unique.append(hit)
                if len(unique) != 1:
                    raise ValueError(f"{panel.name} has no unique {level} side mark")
                panel.notches.append(unique[0])
                panel.notch_ids.append(f"side.{level}")
            ordered_side = side.points if side.points[0].y > side.points[-1].y else list(reversed(side.points))
            marks = dict(zip(panel.notch_ids, panel.notches))
            waist_position = _seam_position(ordered_side, marks['side.waist'])
            hip_position = _seam_position(ordered_side, marks['side.hip'])
            if not 0 < waist_position < hip_position < polyline_length(ordered_side):
                raise ValueError(f"Unsupported design: {panel.name} side marks must be ordered underarm, waist, hip, hem")

    front_side_len = polyline_length(front_side_r)
    if abs(rot_ang) > 1e-6:
        notes.append("Front side dart rotated into the shoulder; hollow chest applied.")

    return DressDraft(
        params=p,
        panels=panels,
        back_waist=back_waist,
        front_waist=front_waist,
        back_hip=back_hip,
        front_hip=front_hip,
        back_dart=back_dart,
        front_dart=front_dart,
        back_side_len=back_side_len,
        front_side_len=front_side_len,
        side_dart=max(side_dart, 0.0),
        dress_length=p.dress_length,
        notes=notes,
    )
