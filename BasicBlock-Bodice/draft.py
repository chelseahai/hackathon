"""Women's basic bodice block (textbook pp. 108–110), current version.

Coordinate system
-----------------
Origin is centre back × waist line.
+X is toward the front (right on the page).
+Y is up (toward the neck / shoulder construction line).
Units are centimetres.

The draft is constructed in one rectangle (back left, front right), then
split into two pattern pieces on the side seam from step 13.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from math import atan2, cos, hypot, pi, sin, sqrt


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


@dataclass
class BodyParams:
    """Page 108 reference sizes, plus the fixed construction constants."""

    bust: float = 84.0
    back_length: float = 38.0

    width_ease: float = 5.0
    armhole_depth_add: float = 7.0
    back_width_add: float = 4.5
    chest_width_add: float = 3.0

    neck_unit_div: float = 12.0
    front_neck_width_minus: float = 0.2
    front_neck_depth_add: float = 1.0
    front_side_neck_drop: float = 0.5
    front_neck_bisector_minus: float = 0.3

    back_shoulder_out: float = 2.0
    front_shoulder_shorter: float = 1.8

    back_ah_bisector_extra: float = 0.5
    side_seam_to_back: float = 2.0
    bp_to_armhole: float = 0.7
    bp_below_bl: float = 4.0
    sleeve_notch_down: float = 3.0

    spline_samples: int = 32
    seam_allowance: float = 1.0


@dataclass
class BodyDraft:
    params: BodyParams
    total_width: float
    armhole_depth: float
    back_width: float
    chest_width: float
    back_neck_width: float
    back_neck_height: float
    front_neck_width: float
    front_neck_depth: float
    back_shoulder_len: float
    front_shoulder_len: float
    back_armhole_len: float
    front_armhole_len: float
    top_y: float
    bl_y: float
    wl_y: float
    cb_x: float
    cf_x: float
    back_width_x: float
    chest_width_x: float
    side_x: float
    cb_neck: Vec2
    back_snp: Vec2
    back_shoulder: Vec2
    cf_neck: Vec2
    front_snp: Vec2
    front_neck_offset: Vec2
    front_shoulder: Vec2
    underarm: Vec2
    side_waist: Vec2
    cb_waist: Vec2
    cf_hem: Vec2
    hem_at_bp: Vec2
    bp: Vec2
    back_ah_bisector: Vec2
    front_ah_bisector: Vec2
    back_ah_mid: Vec2
    front_ah_mid: Vec2
    back_ah_half: Vec2
    front_ah_half: Vec2
    notch_a: Vec2
    notch_b: Vec2
    back_neck: list[Vec2]
    front_neck: list[Vec2]
    back_armhole: list[Vec2]
    front_armhole: list[Vec2]
    hem: list[Vec2]
    notes: list[str] = field(default_factory=list)

    def report(self) -> str:
        p = self.params
        lines = [
            "Women's basic bodice block  (pp. 108-110)",
            f"  bust            {p.bust:.2f} cm",
            f"  back length     {p.back_length:.2f} cm",
            f"  total width     B/2 + {p.width_ease:g} = {self.total_width:.2f} cm",
            f"  back AH         {self.back_armhole_len:.2f} cm",
            f"  front AH        {self.front_armhole_len:.2f} cm",
            f"  back width      B/6 + {p.back_width_add:g} = {self.back_width:.2f} cm",
            f"  chest width     B/6 + {p.chest_width_add:g} = {self.chest_width:.2f} cm",
            f"  back neck       {self.back_neck_width:.2f} x {self.back_neck_height:.3f} cm",
            f"  front neck      {self.front_neck_width:.2f} x {self.front_neck_depth:.2f} cm",
            f"  back shoulder   {self.back_shoulder_len:.3f} cm",
            f"  front shoulder  {self.front_shoulder_len:.3f} cm  (back - {p.front_shoulder_shorter:g})",
        ]
        if self.notes:
            lines.append("  notes:")
            lines.extend(f"    - {n}" for n in self.notes)
        return "\n".join(lines)


def lerp(a: Vec2, b: Vec2, t: float) -> Vec2:
    return a.lerp(b, t)


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


def _eval_natural_cubic(
    t: float, t0: float, t1: float, y0: float, y1: float, m0: float, m1: float
) -> float:
    h = t1 - t0
    a = t1 - t
    b = t - t0
    return (
        (m0 / (6.0 * h)) * a**3
        + (m1 / (6.0 * h)) * b**3
        + (y0 / h - m0 * h / 6.0) * a
        + (y1 / h - m1 * h / 6.0) * b
    )


def arc_horizontal_at_start(start: Vec2, end: Vec2, samples: int = 32) -> list[Vec2]:
    """Circular arc from start to end with a horizontal tangent at start.

    Used for the back neck: square to centre back, through the raised side-neck
    point. A quarter-ellipse of the same box finishes vertical and is too tight
    for a parallel seam allowance.
    """
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
    """Point at `distance` along a polyline, clamped to the ends."""
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


def _armhole_half_and_notch(armhole: list[Vec2], down: float) -> tuple[Vec2, Vec2]:
    """Midpoint of the drafted armhole curve, then `down` cm toward the underarm."""
    total = polyline_length(armhole)
    half = total / 2.0
    mid = point_along(armhole, half)
    starts_at_underarm = armhole[0].y < armhole[-1].y
    if starts_at_underarm:
        notch = point_along(armhole, max(0.0, half - down))
    else:
        notch = point_along(armhole, min(total, half + down))
    return mid, notch


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


def back_outline(draft: BodyDraft) -> list[Vec2]:
    """Closed back piece: neck, shoulder, armhole, side seam, waist, centre back."""
    return _dedupe_closed(
        [
            *draft.back_neck,
            draft.back_shoulder,
            *draft.back_armhole[1:],
            draft.side_waist,
            draft.cb_waist,
        ]
    )


def front_outline(draft: BodyDraft) -> list[Vec2]:
    """Closed front piece: armhole, shoulder, neck, centre front, hem, side seam."""
    return _dedupe_closed(
        [
            *draft.front_armhole,
            draft.front_snp,
            *draft.front_neck[1:],
            draft.cf_hem,
            *draft.hem[1:],
        ]
    )


def pattern_outline(draft: BodyDraft) -> list[Vec2]:
    return back_outline(draft)


PIECE_GAP = 4.0


def translate(points: list[Vec2], dx: float, dy: float = 0.0) -> list[Vec2]:
    if dx == 0.0 and dy == 0.0:
        return list(points)
    return [Vec2(pt.x + dx, pt.y + dy) for pt in points]


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


def front_display_shift(draft: BodyDraft, seam: float = 0.0, gap: float = PIECE_GAP) -> float:
    """X shift that places the front piece to the right of the back, with a gap."""
    back = back_outline(draft)
    front = front_outline(draft)
    back_pts = back + (offset_closed(back, seam) if seam else [])
    front_pts = front + (offset_closed(front, seam) if seam else [])
    back_max = max(pt.x for pt in back_pts)
    front_min = min(pt.x for pt in front_pts)
    return back_max + gap - front_min


def _horiz_circle(center: Vec2, radius: float, y: float, toward_smaller_x: bool) -> Vec2:
    dy = y - center.y
    span = radius * radius - dy * dy
    if span < 0:
        dx = 0.0
    else:
        dx = sqrt(span)
    x = center.x - dx if toward_smaller_x else center.x + dx
    return Vec2(x, y)


def _intersect_horizontal(poly: list[Vec2], y: float) -> list[Vec2]:
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


def draft_body(params: BodyParams | None = None) -> BodyDraft:
    """Draft the current basic bodice block."""
    p = params or BodyParams()
    notes: list[str] = []

    if p.bust <= 0:
        raise ValueError("bust must be positive")

    total_width = p.bust / 2.0 + p.width_ease
    armhole_depth = p.bust / 6.0 + p.armhole_depth_add
    back_width = p.bust / 6.0 + p.back_width_add
    chest_width = p.bust / 6.0 + p.chest_width_add

    if p.back_length <= armhole_depth:
        raise ValueError("back length must be greater than armhole depth")
    if back_width + chest_width >= total_width:
        raise ValueError("back width + chest width exceeds total width")

    top_y = p.back_length
    bl_y = p.back_length - armhole_depth
    wl_y = 0.0
    cb_x = 0.0
    cf_x = total_width
    back_width_x = back_width
    chest_width_x = total_width - chest_width
    side_x = (back_width_x + chest_width_x) / 2.0

    bnw = p.bust / p.neck_unit_div
    bnh = bnw / 3.0
    fnw = bnw - p.front_neck_width_minus
    fnd = bnw + p.front_neck_depth_add

    cb_neck = Vec2(cb_x, top_y)
    back_snp = Vec2(bnw, top_y + bnh)
    back_shoulder = Vec2(back_width_x + p.back_shoulder_out, top_y - bnh)
    back_shoulder_len = (back_shoulder - back_snp).length()
    front_shoulder_len = back_shoulder_len - p.front_shoulder_shorter

    cf_neck = Vec2(cf_x, top_y - fnd)
    front_snp = Vec2(cf_x - fnw, top_y - p.front_side_neck_drop)
    neck_corner = Vec2(cf_x - fnw, top_y - fnd)
    bisector = sqrt(2.0) / 2.0
    front_bisector_len = fnw / 2.0 - p.front_neck_bisector_minus
    front_neck_offset = Vec2(
        neck_corner.x + front_bisector_len * bisector,
        neck_corner.y + front_bisector_len * bisector,
    )

    front_shoulder_y = top_y - 2.0 * bnh
    if front_shoulder_len <= abs(front_shoulder_y - front_snp.y):
        notes.append("Front shoulder length is shorter than the 2× neck-height drop; clamped.")
        front_shoulder = Vec2(front_snp.x, front_shoulder_y)
    else:
        front_shoulder = _horiz_circle(front_snp, front_shoulder_len, front_shoulder_y, True)

    underarm = Vec2(side_x, bl_y)
    side_waist = Vec2(side_x - p.side_seam_to_back, wl_y)
    cb_waist = Vec2(cb_x, wl_y)

    bp = Vec2((chest_width_x + cf_x) / 2.0 - p.bp_to_armhole, bl_y - p.bp_below_bl)
    cf_hem = Vec2(cf_x, wl_y - fnw / 2.0)
    hem_at_bp = Vec2(bp.x, cf_hem.y)

    back_ah_width = side_x - back_width_x
    front_ah_width = chest_width_x - side_x
    back_ah_along = back_ah_width / 2.0 + p.back_ah_bisector_extra
    front_ah_along = back_ah_width / 2.0
    back_ah_bisector = Vec2(
        back_width_x + back_ah_along * bisector,
        bl_y + back_ah_along * bisector,
    )
    front_ah_bisector = Vec2(
        chest_width_x - front_ah_along * bisector,
        bl_y + front_ah_along * bisector,
    )

    mid_depth_y = top_y - armhole_depth / 2.0
    back_ah_mid = Vec2(back_width_x, mid_depth_y)
    front_ah_mid = Vec2(chest_width_x, mid_depth_y)

    samples = p.spline_samples
    back_neck = arc_horizontal_at_start(cb_neck, back_snp, samples)
    front_neck = interpolate([front_snp, front_neck_offset, cf_neck], samples)
    back_armhole = interpolate(
        [back_shoulder, back_ah_mid, back_ah_bisector, underarm], samples
    )
    front_armhole = interpolate(
        [underarm, front_ah_bisector, front_ah_mid, front_shoulder], samples
    )
    hem = [cf_hem, hem_at_bp, side_waist]

    # Step 16: 1/2 of each drafted armhole curve, then 3 cm along the curve
    # toward the underarm.
    back_ah_half, notch_b = _armhole_half_and_notch(back_armhole, p.sleeve_notch_down)
    front_ah_half, notch_a = _armhole_half_and_notch(front_armhole, p.sleeve_notch_down)

    return BodyDraft(
        params=p,
        total_width=total_width,
        armhole_depth=armhole_depth,
        back_width=back_width,
        chest_width=chest_width,
        back_neck_width=bnw,
        back_neck_height=bnh,
        front_neck_width=fnw,
        front_neck_depth=fnd,
        back_shoulder_len=back_shoulder_len,
        front_shoulder_len=front_shoulder_len,
        back_armhole_len=polyline_length(back_armhole),
        front_armhole_len=polyline_length(front_armhole),
        top_y=top_y,
        bl_y=bl_y,
        wl_y=wl_y,
        cb_x=cb_x,
        cf_x=cf_x,
        back_width_x=back_width_x,
        chest_width_x=chest_width_x,
        side_x=side_x,
        cb_neck=cb_neck,
        back_snp=back_snp,
        back_shoulder=back_shoulder,
        cf_neck=cf_neck,
        front_snp=front_snp,
        front_neck_offset=front_neck_offset,
        front_shoulder=front_shoulder,
        underarm=underarm,
        side_waist=side_waist,
        cb_waist=cb_waist,
        cf_hem=cf_hem,
        hem_at_bp=hem_at_bp,
        bp=bp,
        back_ah_bisector=back_ah_bisector,
        front_ah_bisector=front_ah_bisector,
        back_ah_mid=back_ah_mid,
        front_ah_mid=front_ah_mid,
        back_ah_half=back_ah_half,
        front_ah_half=front_ah_half,
        notch_a=notch_a,
        notch_b=notch_b,
        back_neck=back_neck,
        front_neck=front_neck,
        back_armhole=back_armhole,
        front_armhole=front_armhole,
        hem=hem,
        notes=notes,
    )
