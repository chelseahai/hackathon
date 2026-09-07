"""Women's basic trouser block, front and back (textbook pp. 117-120).

Coordinate system
-----------------
Origin is the original side seam x the original waist line (top-left of
the hip rectangle). +X is toward centre front / the crotch (right on the
page). +Y is up. Units are centimetres.

The back is drafted in those same front-style coordinates, then mirrored
over x = 0 for display so centre back / the crotch faces left.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from math import atan2, hypot, pi, sqrt


@dataclass(frozen=True)
class Vec2:
    x: float
    y: float

    def __add__(self, other: Vec2) -> Vec2:
        return Vec2(self.x + other.x, self.y + other.y)

    def __sub__(self, other: Vec2) -> Vec2:
        return Vec2(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> Vec2:
        return Vec2(self.x * scalar, self.y * scalar)

    def __rmul__(self, scalar: float) -> Vec2:
        return self.__mul__(scalar)

    def __truediv__(self, scalar: float) -> Vec2:
        return Vec2(self.x / scalar, self.y / scalar)

    def __neg__(self) -> Vec2:
        return Vec2(-self.x, -self.y)

    def length(self) -> float:
        return hypot(self.x, self.y)

    def unit(self) -> Vec2:
        length = self.length()
        if length == 0:
            return Vec2(0.0, 0.0)
        return self / length

    def lerp(self, other: Vec2, t: float) -> Vec2:
        return Vec2(self.x + (other.x - self.x) * t, self.y + (other.y - self.y) * t)

    def as_tuple(self) -> tuple[float, float]:
        return (self.x, self.y)


def lerp(a: Vec2, b: Vec2, t: float) -> Vec2:
    return a.lerp(b, t)


@dataclass
class TrouserParams:
    """Pages 117-120 reference sizes, plus the fixed construction constants."""

    hip: float = 90.0
    waist: float = 68.0
    trouser_length: float = 98.0
    rise: float = 26.0
    hem: float = 19.0

    front_hip_ease: float = 1.5
    rise_ease: float = 1.5
    crotch_minus: float = 1.0
    side_indent: float = 0.5
    cf_inset: float = 0.7
    side_rise: float = 0.5
    knee_up: float = 4.0
    knee_side_in: float = 1.0
    side_hollow: float = 0.2
    inseam_hollow: float = 0.3
    hem_lift: float = 0.5
    dart_width: float = 2.5
    dart_count: float = 2.0
    dart_near_cf_len: float = 11.0
    dart_near_side_len: float = 10.0

    back_crotch_add: float = 4.0
    back_crotch_drop: float = 1.0
    cb_inset: float = 5.0
    cb_rise: float = 1.5
    back_dart_width: float = 3.0
    back_dart_len: float = 12.0
    crotch_in: float = 0.7
    back_side_out: float = 0.3
    back_side_in: float = 0.4
    back_inseam_upper: float = 1.3
    back_inseam_lower: float = 1.0
    leg_extra: float = 1.0
    back_hem_drop: float = 0.5

    spline_samples: int = 48
    seam_allowance: float = 1.0


@dataclass
class TrouserDraft:
    params: TrouserParams
    front_hip: float
    crotch_ext: float
    front_waist: float
    hem_half: float
    wl_y: float
    cl_y: float
    hl_y: float
    kl_y: float
    hem_y: float
    side_x: float
    cf_box_x: float
    cf_x: float
    crease_x: float
    side_waist: Vec2
    cf_waist: Vec2
    cf_hl: Vec2
    hip11: Vec2
    point4: Vec2
    point5: Vec2
    hem_side: Vec2
    hem_inseam: Vec2
    hem_mid: Vec2
    knee_side: Vec2
    knee_inseam: Vec2
    hl_side: Vec2
    waist_corner: Vec2
    crotch_corner: Vec2
    bisector_hit: Vec2
    crotch_thirds: list[Vec2]
    rise_thirds: list[Vec2]
    dart_cf_left: Vec2
    dart_cf_apex: Vec2
    dart_cf_right: Vec2
    dart_cf_mid: Vec2
    dart_side_left: Vec2
    dart_side_apex: Vec2
    dart_side_right: Vec2
    dart_side_mid: Vec2
    waist_guide: list[Vec2]
    waist: list[Vec2]
    crotch: list[Vec2]
    inseam: list[Vec2]
    hem: list[Vec2]
    side: list[Vec2]
    back_hip: float
    back_crotch_ext: float
    back_waist_len: float
    back_base: Vec2
    back_crotch_on_cl: Vec2
    back_crotch_tip: Vec2
    back_cb_mark: Vec2
    back_cb_waist: Vec2
    back_side_waist: Vec2
    back_cb_hl: Vec2
    back_hl_side: Vec2
    back_knee_side: Vec2
    back_knee_inseam: Vec2
    back_hem_side: Vec2
    back_hem_inseam: Vec2
    back_hem_mid: Vec2
    back_waist_hip_out: Vec2
    back_crotch_knee_in: Vec2
    back_inseam_upper: Vec2
    back_inseam_lower: Vec2
    back_crotch_ctrl: Vec2
    back_dart_left: Vec2
    back_dart_apex: Vec2
    back_dart_right: Vec2
    back_dart_mid: Vec2
    back_waist_guide: list[Vec2]
    back_waist: list[Vec2]
    back_side: list[Vec2]
    back_inseam: list[Vec2]
    back_hem: list[Vec2]
    back_crotch: list[Vec2]
    back_cb: list[Vec2]
    notes: list[str] = field(default_factory=list)

    def report(self) -> str:
        p = self.params
        lines = [
            "Women's basic trouser block  (pp. 117-120)",
            f"  hip             {p.hip:.2f} cm",
            f"  waist           {p.waist:.2f} cm",
            f"  trouser length  {p.trouser_length:.2f} cm",
            f"  rise            {p.rise:.2f} cm",
            f"  hem             {p.hem:.2f} cm",
            f"  front hip       H/4 + {p.front_hip_ease:g} = {self.front_hip:.2f} cm",
            f"  back hip        H/4 + {p.front_hip_ease:g} = {self.back_hip:.2f} cm",
            f"  crotch ext      front hip/4 - {p.crotch_minus:g} = {self.crotch_ext:.2f} cm",
            f"  back crotch     front + {p.back_crotch_add:g} = {self.back_crotch_ext:.2f} cm",
            f"  front waist     W/4 + {p.dart_width * p.dart_count:g} = {self.front_waist:.2f} cm",
            f"  back waist      W/4 + {p.back_dart_width:g} = {self.back_waist_len:.2f} cm",
            f"  crease          {self.crease_x:.2f} cm from side",
        ]
        if self.notes:
            lines.append("  notes:")
            lines.extend(f"    - {n}" for n in self.notes)
        return "\n".join(lines)


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
    interior[size - 1] = d[size - 1] / b[size - 1]
    for i in range(size - 2, -1, -1):
        interior[i] = (d[i] - c[i] * interior[i + 1]) / b[i]
    for i in range(size):
        m[i + 1] = interior[i]
    return m


def _eval_natural_cubic(
    s: float, t0: float, t1: float, y0: float, y1: float, m0: float, m1: float
) -> float:
    h = t1 - t0
    a = t1 - s
    b = s - t0
    return (
        (m0 / (6.0 * h)) * a**3
        + (m1 / (6.0 * h)) * b**3
        + (y0 / h - m0 * h / 6.0) * a
        + (y1 / h - m1 * h / 6.0) * b
    )


def interpolate(points: list[Vec2], samples_per_seg: int = 32) -> list[Vec2]:
    if len(points) < 2:
        return list(points)
    if len(points) == 2:
        return [lerp(points[0], points[1], i / samples_per_seg) for i in range(samples_per_seg + 1)]

    t = [0.0]
    for i in range(len(points) - 1):
        t.append(t[-1] + (points[i + 1] - points[i]).length())
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    mx = _natural_seconds(t, xs)
    my = _natural_seconds(t, ys)

    out: list[Vec2] = []
    for i in range(len(points) - 1):
        for k in range(samples_per_seg):
            s = t[i] + (t[i + 1] - t[i]) * (k / samples_per_seg)
            out.append(
                Vec2(
                    _eval_natural_cubic(s, t[i], t[i + 1], xs[i], xs[i + 1], mx[i], mx[i + 1]),
                    _eval_natural_cubic(s, t[i], t[i + 1], ys[i], ys[i + 1], my[i], my[i + 1]),
                )
            )
    out.append(points[-1])
    return out


def cubic_bezier(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2, samples: int) -> list[Vec2]:
    n = max(samples, 2)
    out: list[Vec2] = []
    for i in range(n + 1):
        t = i / n
        u = 1.0 - t
        out.append(
            p0 * (u**3) + c1 * (3.0 * u * u * t) + c2 * (3.0 * u * t * t) + p3 * (t**3)
        )
    return out


def _bezier_min_radius(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2) -> float:
    rmin = 1e9
    for i in range(41):
        t = i / 40.0
        u = 1.0 - t
        dx = 3 * u * u * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x)
        dy = 3 * u * u * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y)
        ddx = 6 * u * (c2.x - 2 * c1.x + p0.x) + 6 * t * (p3.x - 2 * c2.x + c1.x)
        ddy = 6 * u * (c2.y - 2 * c1.y + p0.y) + 6 * t * (p3.y - 2 * c2.y + c1.y)
        sp = dx * dx + dy * dy
        if sp < 1e-12:
            continue
        k = abs(dx * ddy - dy * ddx) / (sp**1.5)
        if k > 1e-9:
            rmin = min(rmin, 1.0 / k)
    return rmin


def crotch_bezier(p0: Vec2, p3: Vec2, ctrl: Vec2, samples: int) -> list[Vec2]:
    """Cubic from (11) to (5): vertical then horizontal, through ctrl, fairest handles."""
    best_a = best_b = best_r = None
    for i in range(20, 81):
        t = i / 100.0
        u = 1.0 - t
        A = u**3 + 3 * u * u * t
        C = 3 * u * t * t + t**3
        den_a = 3 * u * u * t
        den_b = 3 * u * t * t
        if den_a < 1e-9 or den_b < 1e-9:
            continue
        a = (A * p0.y + C * p3.y - ctrl.y) / den_a
        b = (A * p0.x + C * p3.x - ctrl.x) / den_b
        if a < 0.5 or b < 0.5:
            continue
        c1 = Vec2(p0.x, p0.y - a)
        c2 = Vec2(p3.x - b, p3.y)
        r = _bezier_min_radius(p0, c1, c2, p3)
        if best_r is None or r > best_r:
            best_a, best_b, best_r = a, b, r
    if best_a is None:
        best_a = max((0.5 * (p0.y + p3.y) - ctrl.y) / 0.375, 0.5)
        best_b = max((0.5 * (p0.x + p3.x) - ctrl.x) / 0.375, 0.5)
    return cubic_bezier(
        p0,
        Vec2(p0.x, p0.y - best_a),
        Vec2(p3.x - best_b, p3.y),
        p3,
        samples,
    )


def fair_bezier(
    p0: Vec2, tan0: Vec2, p3: Vec2, tan3: Vec2, ctrl: Vec2, samples: int
) -> list[Vec2]:
    """Cubic with given end tangents that passes through ctrl, fairest handles."""
    tan0 = tan0.unit()
    tan3 = tan3.unit()
    best_c1 = best_c2 = None
    best_r = None
    for i in range(20, 81):
        t = i / 100.0
        u = 1.0 - t
        A = u**3 + 3 * u * u * t
        C = 3 * u * t * t + t**3
        k1 = 3 * u * u * t
        k2 = 3 * u * t * t
        if k1 < 1e-9 or k2 < 1e-9:
            continue
        rhsx = ctrl.x - A * p0.x - C * p3.x
        rhsy = ctrl.y - A * p0.y - C * p3.y
        det = k1 * tan0.x * (-k2 * tan3.y) - (-k2 * tan3.x) * k1 * tan0.y
        if abs(det) < 1e-12:
            continue
        a = (rhsx * (-k2 * tan3.y) - (-k2 * tan3.x) * rhsy) / det
        b = (k1 * tan0.x * rhsy - rhsx * k1 * tan0.y) / det
        if a < 0.5 or b < 0.5:
            continue
        c1 = p0 + tan0 * a
        c2 = p3 - tan3 * b
        r = _bezier_min_radius(p0, c1, c2, p3)
        if best_r is None or r > best_r:
            best_c1, best_c2, best_r = c1, c2, r
    if best_c1 is None:
        chord = (p3 - p0).length() / 3.0
        best_c1 = p0 + tan0 * chord
        best_c2 = p3 - tan3 * chord
    return cubic_bezier(p0, best_c1, best_c2, p3, samples)


def polyline_length(points: list[Vec2]) -> float:
    return sum((points[i + 1] - points[i]).length() for i in range(len(points) - 1))


def point_along(points: list[Vec2], distance: float) -> Vec2:
    if not points:
        return Vec2(0.0, 0.0)
    if distance <= 0:
        return points[0]
    remaining = distance
    for i in range(len(points) - 1):
        seg = (points[i + 1] - points[i]).length()
        if remaining <= seg:
            return lerp(points[i], points[i + 1], remaining / seg if seg else 0.0)
        remaining -= seg
    return points[-1]


def _same_point(a: Vec2, b: Vec2, eps: float = 1e-6) -> bool:
    return abs(a.x - b.x) <= eps and abs(a.y - b.y) <= eps


def _dedupe_closed(points: list[Vec2], eps: float = 1e-6) -> list[Vec2]:
    out: list[Vec2] = []
    for pt in points:
        if not out or not _same_point(pt, out[-1], eps):
            out.append(pt)
    if len(out) > 1 and _same_point(out[0], out[-1], eps):
        out.pop()
    return out


def close_ring(points: list[Vec2]) -> list[Vec2]:
    out = list(points)
    if out and not _same_point(out[0], out[-1]):
        out.append(out[0])
    return out


def _signed_area(ring: list[Vec2]) -> float:
    area = 0.0
    n = len(ring)
    for i in range(n):
        a = ring[i]
        b = ring[(i + 1) % n]
        area += a.x * b.y - b.x * a.y
    return area


def _edge_outward(start: Vec2, end: Vec2, ccw: bool) -> Vec2:
    direction = (end - start).unit()
    if ccw:
        return Vec2(direction.y, -direction.x)
    return Vec2(-direction.y, direction.x)


def _dart_at(pt: Vec2, darts: list[tuple[Vec2, Vec2, Vec2]] | None, eps: float = 0.05) -> tuple[Vec2, Vec2, Vec2] | None:
    if not darts:
        return None
    for dart in darts:
        if (pt - dart[1]).length() <= eps:
            return dart
    return None


def _collapse_short(points: list[Vec2], min_len: float = 0.04) -> list[Vec2]:
    out: list[Vec2] = []
    for pt in points:
        if not out or (pt - out[-1]).length() >= min_len:
            out.append(pt)
    if len(out) > 1 and (out[0] - out[-1]).length() < min_len:
        out.pop()
    return out


def _strip_hairpins(ring: list[Vec2], max_turn_deg: float = 120.0) -> list[Vec2]:
    limit = max_turn_deg * pi / 180.0
    pts = list(ring)
    changed = True
    while changed and len(pts) > 3:
        changed = False
        nxt: list[Vec2] = []
        n = len(pts)
        for i in range(n):
            prev = pts[(i - 1) % n]
            curr = pts[i]
            following = pts[(i + 1) % n]
            e1 = curr - prev
            e2 = following - curr
            ang = atan2(e1.x * e2.y - e1.y * e2.x, e1.x * e2.x + e1.y * e2.y)
            if abs(ang) > limit:
                changed = True
                continue
            nxt.append(curr)
        pts = nxt
    return pts


def offset_closed(
    points: list[Vec2], dist: float, darts: list[tuple[Vec2, Vec2, Vec2]] | None = None
) -> list[Vec2]:
    ring = _collapse_short(_dedupe_closed(points))
    n = len(ring)
    if n < 3 or not dist:
        return list(ring)
    ccw = _signed_area(ring) > 0
    out: list[Vec2] = []
    for i in range(n):
        prev = ring[(i - 1) % n]
        curr = ring[i]
        nxt = ring[(i + 1) % n]
        dart = _dart_at(curr, darts)
        if dart is not None:
            _left, apex, _right = dart
            out.append(Vec2(apex.x, apex.y + dist))
            continue
        n1 = _edge_outward(prev, curr, ccw)
        n2 = _edge_outward(curr, nxt, ccw)
        turn = n1.x * n2.x + n1.y * n2.y
        if turn > 0.25:
            nor = (n1 + n2).unit()
            if nor.length() == 0:
                nor = n1
            out.append(curr + nor * dist)
            continue
        den = 1.0 + turn
        if abs(den) < 0.05:
            out.append(curr + n1 * dist)
            continue
        miter = dist / den
        limit = abs(dist) * 4.0
        if abs(miter) > limit:
            miter = limit if miter > 0 else -limit
        out.append(Vec2((n1.x + n2.x) * miter, (n1.y + n2.y) * miter) + curr)
    return _collapse_short(_strip_hairpins(out), 0.06)


PIECE_GAP = 4.0


def translate(points: list[Vec2], dx: float, dy: float = 0.0) -> list[Vec2]:
    if dx == 0.0 and dy == 0.0:
        return list(points)
    return [Vec2(pt.x + dx, pt.y + dy) for pt in points]


def mirror_x(pt: Vec2) -> Vec2:
    return Vec2(-pt.x, pt.y)


def mirror_pts(points: list[Vec2]) -> list[Vec2]:
    return [mirror_x(pt) for pt in points]


def intersect_y(a: Vec2, b: Vec2, y: float) -> Vec2:
    if abs(b.y - a.y) < 1e-12:
        return Vec2(a.x, y)
    t = (y - a.y) / (b.y - a.y)
    return lerp(a, b, t)


def intersect_x(a: Vec2, b: Vec2, x: float) -> Vec2:
    if abs(b.x - a.x) < 1e-12:
        return Vec2(x, a.y)
    t = (x - a.x) / (b.x - a.x)
    return lerp(a, b, t)


def ray_hit(origin: Vec2, direction: Vec2, a: Vec2, b: Vec2) -> Vec2 | None:
    dx, dy = direction.x, direction.y
    ex, ey = b.x - a.x, b.y - a.y
    den = dx * ey - dy * ex
    if abs(den) < 1e-12:
        return None
    ox, oy = a.x - origin.x, a.y - origin.y
    t = (ox * ey - oy * ex) / den
    if t < -1e-9:
        return None
    return origin + direction * t


def toward_x(pt: Vec2, target_x: float, dist: float) -> Vec2:
    if pt.x < target_x:
        return Vec2(pt.x + dist, pt.y)
    return Vec2(pt.x - dist, pt.y)


def front_outline(draft: TrouserDraft, close_darts: bool = False) -> list[Vec2]:
    waist = draft.waist_guide if close_darts else draft.waist
    cf_down = interpolate([draft.cf_waist, draft.hip11], 8)
    return _dedupe_closed(
        [
            *waist,
            *draft.side[1:],
            *draft.hem[1:],
            *list(reversed(draft.inseam))[1:],
            *list(reversed(draft.crotch))[1:],
            *list(reversed(cf_down))[1:],
        ]
    )


def dart_pairs(draft: TrouserDraft) -> list[tuple[Vec2, Vec2, Vec2]]:
    return [
        (draft.dart_cf_left, draft.dart_cf_apex, draft.dart_cf_right),
        (draft.dart_side_left, draft.dart_side_apex, draft.dart_side_right),
    ]


def back_outline_raw(draft: TrouserDraft, close_darts: bool = False) -> list[Vec2]:
    waist = draft.back_waist_guide if close_darts else draft.back_waist
    return _dedupe_closed(
        [
            *waist,
            *draft.back_side[1:],
            *draft.back_hem[1:],
            *list(reversed(draft.back_inseam))[1:],
            *list(reversed(draft.back_crotch))[1:],
            *list(reversed(draft.back_cb))[1:],
        ]
    )


def back_outline(draft: TrouserDraft, close_darts: bool = False) -> list[Vec2]:
    return mirror_pts(back_outline_raw(draft, close_darts))


def pattern_outline(draft: TrouserDraft) -> list[Vec2]:
    return back_outline(draft)


def front_display_shift(
    draft: TrouserDraft, seam: float = 0.0, gap: float = PIECE_GAP
) -> float:
    back = back_outline(draft)
    front = front_outline(draft)
    back_pts = back + (offset_closed(back_outline(draft, True), seam) if seam else [])
    front_pts = front + (offset_closed(front_outline(draft, True), seam) if seam else [])
    back_max = max(pt.x for pt in back_pts)
    front_min = min(pt.x for pt in front_pts)
    return back_max + gap - front_min


def draft_trouser(params: TrouserParams | None = None) -> TrouserDraft:
    p = params or TrouserParams()
    notes: list[str] = []

    if p.hip <= 0 or p.waist <= 0:
        raise ValueError("hip and waist must be positive")
    if p.trouser_length <= p.rise:
        raise ValueError("trouser length must be greater than rise")
    if p.hem <= 0 or p.rise <= 0:
        raise ValueError("rise and hem must be positive")
    if p.waist >= p.hip:
        raise ValueError("waist must be smaller than hip")

    # (1) length, (2) rise / crotch line, (3) front hip rectangle
    wl_y = 0.0
    cl_y = -p.rise
    hem_y = -p.trouser_length
    front_hip = p.hip / 4.0 + p.front_hip_ease
    side_x = 0.0
    cf_box_x = front_hip
    waist_corner = Vec2(side_x, wl_y)

    # (4) side indent on the crotch line
    point4 = Vec2(side_x + p.side_indent, cl_y)

    # (5) front crotch width = one quarter of front hip, minus 1
    crotch_ext = front_hip / 4.0 - p.crotch_minus
    if crotch_ext <= 0:
        raise ValueError("front hip is too small for the crotch extension")
    point5 = Vec2(cf_box_x + crotch_ext, cl_y)
    crotch_corner = Vec2(cf_box_x, cl_y)

    # (6) crease: midpoint of (4) and (5)
    crease_x = (point4.x + point5.x) / 2.0

    # (7) knee: midpoint of crotch-to-hem, then up 4
    kl_y = (cl_y + hem_y) / 2.0 + p.knee_up

    # (8) hem  equally either side of the crease
    hem_half = p.hem / 2.0
    hem_side = Vec2(crease_x - hem_half, hem_y)
    hem_inseam = Vec2(crease_x + hem_half, hem_y)
    hem_mid = Vec2(crease_x, hem_y + p.hem_lift)

    # (9) auxiliary side: (8) through (4) to the original waist corner
    # (10) knee: 1 cm in from that auxiliary on the side; (5) to (8') on the inseam
    knee_aux = intersect_y(point4, hem_side, kl_y)
    knee_side = toward_x(knee_aux, crease_x, p.knee_side_in)
    knee_inseam = intersect_y(point5, hem_inseam, kl_y)

    # (11) hip line: rise divided into thirds; HL is 1/3 up from the crotch
    hl_y = cl_y + p.rise / 3.0
    rise_thirds = [Vec2(cf_box_x, wl_y - p.rise * k / 3.0) for k in range(4)]
    hip11 = Vec2(cf_box_x, hl_y)
    hl_side = Vec2(side_x, hl_y)

    # (12) centre front 0.7 in from the hip-width line
    cf_x = cf_box_x - p.cf_inset
    cf_waist = Vec2(cf_x, wl_y)
    cf_hl = Vec2(cf_x, hl_y)

    # (13) crotch curve: connect (5) to (11), bisect the 90-degree corner,
    # split that bisector into thirds, and pass the curve through the second
    # third (from the inner corner toward (5)~(11)).
    bisector_dir = Vec2(1.0, 1.0).unit()
    bisector_hit = ray_hit(crotch_corner, bisector_dir, hip11, point5)
    if bisector_hit is None:
        bisector_hit = crotch_corner + bisector_dir * (crotch_ext * sqrt(2.0) / 2.0)
    crotch_thirds = [crotch_corner.lerp(bisector_hit, k / 3.0) for k in range(4)]
    crotch_ctrl = crotch_thirds[2]
    samples = p.spline_samples
    # J-curve: vertical tangent at (11), through the second bisector third, horizontal at (5).
    crotch = crotch_bezier(hip11, point5, crotch_ctrl, samples * 4)

    # (14) waist W/4 + two dart widths, side raised 0.5
    front_waist = p.waist / 4.0 + p.dart_width * p.dart_count
    if front_waist <= 0 or front_waist >= front_hip:
        raise ValueError("waist is too large or too small for this front piece")
    side_waist = Vec2(cf_x - front_waist, wl_y + p.side_rise)
    if side_waist.x < side_x - 1.0:
        raise ValueError("front waist is wider than the hip rectangle")

    waist_guide = interpolate([cf_waist, side_waist], samples)

    def dart_on_waist(along: float, width: float, length: float) -> tuple[Vec2, Vec2, Vec2]:
        left = point_along(waist_guide, along)
        right = point_along(waist_guide, along + width)
        mid = lerp(left, right, 0.5)
        apex = Vec2(mid.x, mid.y - length)
        return left, apex, right

    waist_len = polyline_length(waist_guide)
    crease_on_waist = intersect_x(cf_waist, side_waist, crease_x)
    d1_along = (cf_waist - crease_on_waist).length() - p.dart_width / 2.0
    if d1_along < 0.4:
        d1_along = max(0.4, waist_len * 0.28 - p.dart_width / 2.0)
        notes.append("Crease is too close to centre front for the first dart; dart was shifted.")
    dart_cf_left, dart_cf_apex, dart_cf_right = dart_on_waist(
        d1_along, p.dart_width, p.dart_near_cf_len
    )
    dart_cf_mid = lerp(dart_cf_left, dart_cf_right, 0.5)
    rest_start = d1_along + p.dart_width
    rest = waist_len - rest_start
    d2_along = rest_start + (rest - p.dart_width) / 2.0
    if d2_along < rest_start + 0.3 or d2_along + p.dart_width > waist_len - 0.3:
        d2_along = rest_start + max(0.4, (rest - p.dart_width) / 2.0)
    dart_side_left, dart_side_apex, dart_side_right = dart_on_waist(
        d2_along, p.dart_width, p.dart_near_side_len
    )
    dart_side_mid = lerp(dart_side_left, dart_side_right, 0.5)

    waist = (
        interpolate([cf_waist, dart_cf_left], max(4, samples // 4))
        + [dart_cf_apex]
        + interpolate([dart_cf_right, dart_side_left], max(4, samples // 4))
        + [dart_side_apex]
        + interpolate([dart_side_right, side_waist], max(4, samples // 4))
    )

    # (15) side: out to the hip, through the 0.5 indent, 0.2 hollow, knee, hem
    thigh_y = (cl_y + kl_y) / 2.0
    thigh_on_line = intersect_y(point4, knee_side, thigh_y)
    side_hollow = toward_x(thigh_on_line, crease_x, p.side_hollow)
    side = interpolate(
        [side_waist, hl_side, point4, side_hollow, knee_side, hem_side], samples
    )

    # (16) inseam: 0.3 hollow above the knee
    inseam_mid_y = (point5.y + knee_inseam.y) / 2.0
    inseam_on_line = intersect_y(point5, knee_inseam, inseam_mid_y)
    inseam_hollow = toward_x(inseam_on_line, crease_x, p.inseam_hollow)
    inseam = interpolate([point5, inseam_hollow, knee_inseam, hem_inseam], samples)

    # (17) hem lifted 0.5 at the crease
    hem = interpolate([hem_side, hem_mid, hem_inseam], samples)

    # ---- back, pp. 119-120 (front-style coords: side left, crotch right) ----
    back_hip = p.hip / 4.0 + p.front_hip_ease
    back_crotch_ext = crotch_ext + p.back_crotch_add
    back_waist_len = p.waist / 4.0 + p.back_dart_width
    back_base = crotch_corner
    back_crotch_on_cl = Vec2(cf_box_x + back_crotch_ext, cl_y)
    back_crotch_tip = Vec2(back_crotch_on_cl.x, cl_y - p.back_crotch_drop)
    back_cb_mark = Vec2(cf_box_x - p.cb_inset, wl_y)
    cb_dir = (back_cb_mark - back_base).unit()
    back_cb_waist = back_cb_mark + cb_dir * p.cb_rise
    side_y = wl_y + p.side_rise
    dy_waist = side_y - back_cb_waist.y
    span2 = back_waist_len * back_waist_len - dy_waist * dy_waist
    if span2 <= 0.25:
        raise ValueError("back waist is too short to reach the side")
    back_side_waist = Vec2(back_cb_waist.x - sqrt(span2), side_y)
    back_cb_hl = intersect_y(back_cb_waist, back_base, hl_y)
    back_hl_side = Vec2(back_cb_hl.x - back_hip, hl_y)
    back_knee_side = Vec2(knee_side.x - p.leg_extra, kl_y)
    back_knee_inseam = Vec2(knee_inseam.x + p.leg_extra, kl_y)
    back_hem_side = Vec2(hem_side.x - p.leg_extra, hem_y)
    back_hem_inseam = Vec2(hem_inseam.x + p.leg_extra, hem_y)
    back_hem_mid = Vec2(crease_x, hem_y - p.back_hem_drop)

    waist_hip_y = (back_side_waist.y + hl_y) / 2.0
    waist_hip_on = intersect_y(back_side_waist, back_hl_side, waist_hip_y)
    back_waist_hip_out = toward_x(waist_hip_on, crease_x, -p.back_side_out)
    crotch_knee_y = (cl_y + kl_y) / 2.0
    crotch_knee_on = intersect_y(back_hl_side, back_knee_side, crotch_knee_y)
    back_crotch_knee_in = toward_x(crotch_knee_on, crease_x, p.back_side_in)

    back_crotch_ctrl = Vec2(crotch_ctrl.x - p.crotch_in, crotch_ctrl.y)
    cb_tan = (back_base - back_cb_waist).unit()
    back_crotch = fair_bezier(
        back_cb_hl,
        cb_tan,
        back_crotch_tip,
        Vec2(1.0, 0.0),
        back_crotch_ctrl,
        samples * 4,
    )
    back_cb = interpolate([back_cb_waist, back_cb_hl], max(8, samples // 4))

    back_waist_guide = interpolate([back_cb_waist, back_side_waist], samples)
    back_waist_guide_len = polyline_length(back_waist_guide)
    dart_along = back_waist_guide_len / 2.0 - p.back_dart_width / 2.0
    if dart_along < 0.4:
        dart_along = 0.4
    back_dart_left = point_along(back_waist_guide, dart_along)
    back_dart_right = point_along(back_waist_guide, dart_along + p.back_dart_width)
    back_dart_mid = lerp(back_dart_left, back_dart_right, 0.5)
    dart_tan = (
        point_along(
            back_waist_guide,
            min(back_waist_guide_len, dart_along + p.back_dart_width / 2.0 + 0.4),
        )
        - point_along(
            back_waist_guide,
            max(0.0, dart_along + p.back_dart_width / 2.0 - 0.4),
        )
    ).unit()
    dart_perp = Vec2(dart_tan.y, -dart_tan.x)
    if dart_perp.y > 0:
        dart_perp = dart_perp * -1.0
    back_dart_apex = back_dart_mid + dart_perp * p.back_dart_len

    back_waist = (
        interpolate([back_cb_waist, back_dart_left], max(4, samples // 4))
        + [back_dart_apex]
        + interpolate([back_dart_right, back_side_waist], max(4, samples // 4))
    )
    back_side = interpolate(
        [
            back_side_waist,
            back_waist_hip_out,
            back_hl_side,
            back_crotch_knee_in,
            back_knee_side,
            back_hem_side,
        ],
        samples,
    )
    back_inseam_upper = toward_x(
        lerp(back_crotch_tip, back_knee_inseam, 1.0 / 3.0),
        crease_x,
        p.back_inseam_upper,
    )
    back_inseam_lower = toward_x(
        lerp(back_crotch_tip, back_knee_inseam, 2.0 / 3.0),
        crease_x,
        p.back_inseam_lower,
    )
    back_inseam = interpolate(
        [
            back_crotch_tip,
            back_inseam_upper,
            back_inseam_lower,
            back_knee_inseam,
            back_hem_inseam,
        ],
        samples,
    )
    back_hem = interpolate([back_hem_side, back_hem_mid, back_hem_inseam], samples)

    return TrouserDraft(
        params=p,
        front_hip=front_hip,
        crotch_ext=crotch_ext,
        front_waist=front_waist,
        hem_half=hem_half,
        wl_y=wl_y,
        cl_y=cl_y,
        hl_y=hl_y,
        kl_y=kl_y,
        hem_y=hem_y,
        side_x=side_x,
        cf_box_x=cf_box_x,
        cf_x=cf_x,
        crease_x=crease_x,
        side_waist=side_waist,
        cf_waist=cf_waist,
        cf_hl=cf_hl,
        hip11=hip11,
        point4=point4,
        point5=point5,
        hem_side=hem_side,
        hem_inseam=hem_inseam,
        hem_mid=hem_mid,
        knee_side=knee_side,
        knee_inseam=knee_inseam,
        hl_side=hl_side,
        waist_corner=waist_corner,
        crotch_corner=crotch_corner,
        bisector_hit=bisector_hit,
        crotch_thirds=crotch_thirds,
        rise_thirds=rise_thirds,
        dart_cf_left=dart_cf_left,
        dart_cf_apex=dart_cf_apex,
        dart_cf_right=dart_cf_right,
        dart_cf_mid=dart_cf_mid,
        dart_side_left=dart_side_left,
        dart_side_apex=dart_side_apex,
        dart_side_right=dart_side_right,
        dart_side_mid=dart_side_mid,
        waist_guide=waist_guide,
        waist=waist,
        crotch=crotch,
        inseam=inseam,
        hem=hem,
        side=side,
        back_hip=back_hip,
        back_crotch_ext=back_crotch_ext,
        back_waist_len=back_waist_len,
        back_base=back_base,
        back_crotch_on_cl=back_crotch_on_cl,
        back_crotch_tip=back_crotch_tip,
        back_cb_mark=back_cb_mark,
        back_cb_waist=back_cb_waist,
        back_side_waist=back_side_waist,
        back_cb_hl=back_cb_hl,
        back_hl_side=back_hl_side,
        back_knee_side=back_knee_side,
        back_knee_inseam=back_knee_inseam,
        back_hem_side=back_hem_side,
        back_hem_inseam=back_hem_inseam,
        back_hem_mid=back_hem_mid,
        back_waist_hip_out=back_waist_hip_out,
        back_crotch_knee_in=back_crotch_knee_in,
        back_inseam_upper=back_inseam_upper,
        back_inseam_lower=back_inseam_lower,
        back_crotch_ctrl=back_crotch_ctrl,
        back_dart_left=back_dart_left,
        back_dart_apex=back_dart_apex,
        back_dart_right=back_dart_right,
        back_dart_mid=back_dart_mid,
        back_waist_guide=back_waist_guide,
        back_waist=back_waist,
        back_side=back_side,
        back_inseam=back_inseam,
        back_hem=back_hem,
        back_crotch=back_crotch,
        back_cb=back_cb,
        notes=notes,
    )
