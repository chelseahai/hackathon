"""Women's basic skirt block (textbook p. 115), current version.

Coordinate system
-----------------
Origin is centre back × the original waist line (top of the rectangle).
+X is toward the front (right on the page).
+Y is up.
Units are centimetres.

The draft is constructed in one rectangle (back left, front right), then
split into two pattern pieces on the side seam.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from math import atan2, cos, hypot, pi, sin


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
class SkirtParams:
    """Page 115 reference sizes, plus the fixed construction constants."""

    hip: float = 90.0
    waist: float = 68.0
    skirt_length: float = 60.0

    hip_ease: float = 2.0
    waist_ease: float = 0.5
    hip_depth: float = 18.0
    side_shift: float = 1.0
    side_rise: float = 0.7
    cb_drop: float = 1.0
    side_take_frac: float = 1.0 / 3.0
    back_waist_straight: float = 1.0 / 3.0
    front_waist_straight: float = 2.0 / 3.0

    spline_samples: int = 32
    seam_allowance: float = 1.0


@dataclass
class SkirtDraft:
    params: SkirtParams
    total_width: float
    back_hip: float
    front_hip: float
    back_waist: float
    front_waist: float
    back_diff: float
    front_diff: float
    side_take: float
    back_side_take: float
    front_side_take: float
    wl_y: float
    hl_y: float
    hem_y: float
    cb_x: float
    cf_x: float
    side_x: float
    cb_waist: Vec2
    cf_waist: Vec2
    back_waist_mark: Vec2
    front_waist_mark: Vec2
    back_side_waist: Vec2
    front_side_waist: Vec2
    hip: Vec2
    cb_hem: Vec2
    cf_hem: Vec2
    side_hem: Vec2
    back_waist_curve: list[Vec2]
    front_waist_curve: list[Vec2]
    back_side: list[Vec2]
    front_side: list[Vec2]
    notes: list[str] = field(default_factory=list)

    def report(self) -> str:
        p = self.params
        lines = [
            "Women's basic skirt block  (p. 115)",
            f"  hip             {p.hip:.2f} cm",
            f"  waist           {p.waist:.2f} cm",
            f"  skirt length    {p.skirt_length:.2f} cm",
            f"  total width     H/2 + {p.hip_ease:g} = {self.total_width:.2f} cm",
            f"  back hip        {self.back_hip:.2f} cm",
            f"  front hip       {self.front_hip:.2f} cm",
            f"  back waist      W/4 - {p.side_shift:g} + {p.waist_ease:g} = {self.back_waist:.2f} cm",
            f"  front waist     W/4 + {p.side_shift:g} + {p.waist_ease:g} = {self.front_waist:.2f} cm",
            f"  side takeout    1/3 of waist-hip = {self.side_take:.2f} cm",
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


def arc_horizontal_at_start(start: Vec2, end: Vec2, samples: int = 32) -> list[Vec2]:
    """Circular arc from start to end with a horizontal tangent at start."""
    dx = end.x - start.x
    dy = end.y - start.y
    n = max(samples, 2)
    if abs(dy) < 1e-9:
        return [lerp(start, end, i / (n - 1)) for i in range(n)]
    radius = (dx * dx + dy * dy) / (2.0 * dy)
    center = Vec2(start.x, start.y + radius)
    r = hypot(start.x - center.x, start.y - center.y)
    a0 = atan2(start.y - center.y, start.x - center.x)
    a1 = atan2(end.y - center.y, end.x - center.x)
    da = a1 - a0
    while da > pi:
        da -= 2.0 * pi
    while da < -pi:
        da += 2.0 * pi
    pts = [
        Vec2(
            center.x + r * cos(a0 + da * i / (n - 1)),
            center.y + r * sin(a0 + da * i / (n - 1)),
        )
        for i in range(n)
    ]
    pts[0] = start
    pts[-1] = end
    return pts


def _waist_curve(start: Vec2, end: Vec2, straight_frac: float, samples: int) -> list[Vec2]:
    """Level from the centre, then curve up to the raised side seam.

    `straight_frac` is the share of the x-span that stays on the centre's y
    (book: about 1/3 on the back, 2/3 on the front).
    """
    span = end.x - start.x
    frac = min(max(straight_frac, 0.0), 0.95)
    blend = Vec2(start.x + span * frac, start.y)
    straight = interpolate([start, blend], samples)
    curve = arc_horizontal_at_start(blend, end, samples)
    return straight[:-1] + curve


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


def offset_closed(points: list[Vec2], dist: float) -> list[Vec2]:
    ring = _dedupe_closed(points)
    n = len(ring)
    if n < 3 or not dist:
        return list(ring)
    ccw = _signed_area(ring) > 0
    out: list[Vec2] = []
    for i in range(n):
        prev = ring[(i - 1) % n]
        curr = ring[i]
        nxt = ring[(i + 1) % n]
        n1 = _edge_outward(prev, curr, ccw)
        n2 = _edge_outward(curr, nxt, ccw)
        den = 1.0 + n1.x * n2.x + n1.y * n2.y
        if abs(den) < 0.05:
            out.append(curr + n1 * dist)
            continue
        miter = dist / den
        limit = abs(dist) * 4.0
        if abs(miter) > limit:
            miter = limit if miter > 0 else -limit
        out.append(Vec2((n1.x + n2.x) * miter, (n1.y + n2.y) * miter) + curr)
    return out


PIECE_GAP = 4.0


def translate(points: list[Vec2], dx: float, dy: float = 0.0) -> list[Vec2]:
    if dx == 0.0 and dy == 0.0:
        return list(points)
    return [Vec2(pt.x + dx, pt.y + dy) for pt in points]


def back_outline(draft: SkirtDraft) -> list[Vec2]:
    return _dedupe_closed(
        [
            *draft.back_waist_curve,
            *draft.back_side[1:],
            draft.cb_hem,
        ]
    )


def front_outline(draft: SkirtDraft) -> list[Vec2]:
    return _dedupe_closed(
        [
            *draft.front_waist_curve,
            *draft.front_side[1:],
            draft.cf_hem,
        ]
    )


def pattern_outline(draft: SkirtDraft) -> list[Vec2]:
    return back_outline(draft)


def front_display_shift(draft: SkirtDraft, seam: float = 0.0, gap: float = PIECE_GAP) -> float:
    back = back_outline(draft)
    front = front_outline(draft)
    back_pts = back + (offset_closed(back, seam) if seam else [])
    front_pts = front + (offset_closed(front, seam) if seam else [])
    back_max = max(pt.x for pt in back_pts)
    front_min = min(pt.x for pt in front_pts)
    return back_max + gap - front_min


def draft_skirt(params: SkirtParams | None = None) -> SkirtDraft:
    p = params or SkirtParams()
    notes: list[str] = []

    if p.hip <= 0 or p.waist <= 0:
        raise ValueError("hip and waist must be positive")
    if p.skirt_length <= p.hip_depth:
        raise ValueError("skirt length must be greater than hip depth")
    if p.waist >= p.hip:
        raise ValueError("waist must be smaller than hip")

    total_width = p.hip / 2.0 + p.hip_ease
    quarter_w = p.waist / 4.0
    back_waist = quarter_w - p.side_shift + p.waist_ease
    front_waist = quarter_w + p.side_shift + p.waist_ease
    side_x = total_width / 2.0 - p.side_shift
    back_hip = side_x
    front_hip = total_width - side_x
    back_diff = back_hip - back_waist
    front_diff = front_hip - front_waist
    back_side_take = back_diff * p.side_take_frac
    front_side_take = front_diff * p.side_take_frac
    side_take = back_side_take

    if back_waist <= 0 or front_waist <= 0:
        raise ValueError("waist is too small for this construction")
    if back_side_take <= 0 or front_side_take <= 0:
        raise ValueError("waist-hip difference is too small for side shaping")

    wl_y = 0.0
    hl_y = -p.hip_depth
    hem_y = -p.skirt_length
    cb_x = 0.0
    cf_x = total_width

    cb_waist = Vec2(cb_x, wl_y - p.cb_drop)
    cf_waist = Vec2(cf_x, wl_y)
    back_side_waist = Vec2(side_x - back_side_take, wl_y + p.side_rise)
    front_side_waist = Vec2(side_x + front_side_take, wl_y + p.side_rise)
    back_waist_mark = Vec2(cb_x + back_waist, wl_y)
    front_waist_mark = Vec2(cf_x - front_waist, wl_y)
    hip = Vec2(side_x, hl_y)
    cb_hem = Vec2(cb_x, hem_y)
    cf_hem = Vec2(cf_x, hem_y)
    side_hem = Vec2(side_x, hem_y)

    samples = p.spline_samples
    back_waist_curve = _waist_curve(cb_waist, back_side_waist, p.back_waist_straight, samples)
    front_waist_curve = _waist_curve(cf_waist, front_side_waist, p.front_waist_straight, samples)

    hip_ctrl = Vec2(side_x, hl_y + p.hip_depth / 3.0)
    back_side = interpolate([back_side_waist, hip_ctrl, hip], samples) + interpolate(
        [hip, side_hem], samples
    )[1:]
    front_side = interpolate([front_side_waist, hip_ctrl, hip], samples) + interpolate(
        [hip, side_hem], samples
    )[1:]

    return SkirtDraft(
        params=p,
        total_width=total_width,
        back_hip=back_hip,
        front_hip=front_hip,
        back_waist=back_waist,
        front_waist=front_waist,
        back_diff=back_diff,
        front_diff=front_diff,
        side_take=side_take,
        back_side_take=back_side_take,
        front_side_take=front_side_take,
        wl_y=wl_y,
        hl_y=hl_y,
        hem_y=hem_y,
        cb_x=cb_x,
        cf_x=cf_x,
        side_x=side_x,
        cb_waist=cb_waist,
        cf_waist=cf_waist,
        back_waist_mark=back_waist_mark,
        front_waist_mark=front_waist_mark,
        back_side_waist=back_side_waist,
        front_side_waist=front_side_waist,
        hip=hip,
        cb_hem=cb_hem,
        cf_hem=cf_hem,
        side_hem=side_hem,
        back_waist_curve=back_waist_curve,
        front_waist_curve=front_waist_curve,
        back_side=back_side,
        front_side=front_side,
        notes=notes,
    )
