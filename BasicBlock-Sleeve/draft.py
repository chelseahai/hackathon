"""Women's basic sleeve block (textbook pp. 111–112), current version.

Coordinate system
-----------------
Origin is the crosshair (bicep line × grain).
+X is toward the front (right on the page).
+Y is up (toward the sleeve cap).
Units are centimetres.

Current geometry
----------------
- Cap height = AH/3 − 1.
- Front diagonal = front AH; back diagonal = back AH + 1.
- Outward offsets point away from the grain (back and front independently).
- Sleeve cap is one cubic interpolating spline: back underarm → back offsets →
  peak → front offsets → front underarm.
- Cuff is a separate interpolating spline.
- No match notches.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from math import hypot, sqrt


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

    def rotated_ccw(self) -> Vec2:
        return Vec2(-self.y, self.x)

    def lerp(self, other: Vec2, t: float) -> Vec2:
        return Vec2(self.x + (other.x - self.x) * t, self.y + (other.y - self.y) * t)

    def as_tuple(self) -> tuple[float, float]:
        return (self.x, self.y)


@dataclass
class SleeveParams:
    """Page 111 reference sizes, plus the fixed construction constants."""

    front_ah: float = 20.5
    back_ah: float = 21.0
    sleeve_length: float = 52.0
    ah: float | None = None

    cap_height_subtract: float = 1.0
    back_diagonal_ease: float = 1.0
    elbow_extra: float = 2.5

    front_upper_out: float = 1.8
    front_lower_in: float = 1.5
    back_upper_out: float = 1.5
    back_mid_along: float = 2.5
    back_lower_in: float = 0.5

    cuff_front_in: float = 0.5
    cuff_back_out: float = 1.0
    cuff_center_drop: float = 0.3

    spline_samples: int = 32
    seam_allowance: float = 1.0

    @property
    def total_ah(self) -> float:
        return self.front_ah + self.back_ah if self.ah is None else self.ah


@dataclass
class SleeveDraft:
    params: SleeveParams
    cap_height: float
    origin: Vec2
    peak: Vec2
    front_underarm: Vec2
    back_underarm: Vec2
    front_cuff: Vec2
    back_cuff: Vec2
    elbow_y: float
    cuff_y: float
    front_diag_len: float
    back_diag_len: float
    front_offset_upper: Vec2
    front_offset_lower: Vec2
    back_offset_upper: Vec2
    back_offset_lower: Vec2
    back_mid: Vec2
    back_locator: Vec2
    cuff_front_mid: Vec2
    cuff_back_mid: Vec2
    cuff_center: Vec2
    cap: list[Vec2]
    front_cap: list[Vec2]
    back_cap: list[Vec2]
    cuff: list[Vec2]
    front_seam: list[Vec2]
    back_seam: list[Vec2]
    notes: list[str] = field(default_factory=list)

    @property
    def front_width(self) -> float:
        return self.front_underarm.x

    @property
    def back_width(self) -> float:
        return -self.back_underarm.x

    @property
    def cap_length(self) -> float:
        return polyline_length(self.cap)

    @property
    def front_cap_length(self) -> float:
        return polyline_length(self.front_cap)

    @property
    def back_cap_length(self) -> float:
        return polyline_length(self.back_cap)

    @property
    def elbow_from_peak(self) -> float:
        return self.params.sleeve_length / 2.0 + self.params.elbow_extra

    def report(self) -> str:
        p = self.params
        lines = [
            "Women's basic sleeve block  (pp. 111-112)",
            f"  front AH        {p.front_ah:.2f} cm",
            f"  back AH         {p.back_ah:.2f} cm",
            f"  total AH        {p.total_ah:.2f} cm",
            f"  sleeve length   {p.sleeve_length:.2f} cm",
            f"  cap height      AH/3 - 1 = {self.cap_height:.3f} cm  (book prints 12.8)",
            f"  front diagonal  {self.front_diag_len:.2f} cm",
            f"  back diagonal   {self.back_diag_len:.2f} cm  (back AH + {p.back_diagonal_ease:g})",
            f"  front width     {self.front_width:.3f} cm",
            f"  back width      {self.back_width:.3f} cm",
            f"  EL from peak    {self.elbow_from_peak:.2f} cm",
            f"  cap curve       {self.cap_length:.3f} cm  (one interpolating spline)",
            f"  front cap       {self.front_cap_length:.3f} cm  (ease {self.front_cap_length - p.front_ah:.3f})",
            f"  back cap        {self.back_cap_length:.3f} cm  (ease {self.back_cap_length - p.back_ah:.3f})",
        ]
        if self.notes:
            lines.append("  notes:")
            lines.extend(f"    - {n}" for n in self.notes)
        return "\n".join(lines)


def lerp(a: Vec2, b: Vec2, t: float) -> Vec2:
    return a.lerp(b, t)


def _natural_seconds(t: list[float], values: list[float]) -> list[float]:
    """Second derivatives for a natural cubic spline (m[0] = m[n] = 0)."""
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


def interpolate(points: list[Vec2], samples_per_seg: int = 32) -> list[Vec2]:
    """Cubic interpolating spline through the points (chord-length, natural ends)."""
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


def _nearest_index(points: list[Vec2], target: Vec2) -> int:
    best = 0
    best_d = float("inf")
    for i, p in enumerate(points):
        d = (p - target).length()
        if d < best_d:
            best_d = d
            best = i
    return best


def polyline_length(points: list[Vec2]) -> float:
    return sum((points[i + 1] - points[i]).length() for i in range(len(points) - 1))


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


def pattern_outline(draft: SleeveDraft) -> list[Vec2]:
    outline = [
        *draft.back_cap,
        *draft.back_seam[1:],
        *draft.cuff[1:],
        *list(reversed(draft.front_seam))[1:],
        *list(reversed(draft.front_cap))[1:],
    ]
    return _dedupe_closed(outline)


def _edge_outward(start: Vec2, end: Vec2) -> Vec2:
    direction = (end - start).unit()
    normal = Vec2(direction.y, -direction.x)
    mid = Vec2((start.x + end.x) / 2.0, (start.y + end.y) / 2.0)
    if -mid.x * normal.x - mid.y * normal.y > 0:
        normal = -normal
    return normal


def offset_closed(points: list[Vec2], dist: float) -> list[Vec2]:
    ring = _dedupe_closed(points)
    n = len(ring)
    if n < 3 or not dist:
        return list(ring)
    out: list[Vec2] = []
    for i in range(n):
        prev = ring[(i - 1) % n]
        curr = ring[i]
        nxt = ring[(i + 1) % n]
        n1 = _edge_outward(prev, curr)
        n2 = _edge_outward(curr, nxt)
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


def _along_diagonal(peak: Vec2, underarm: Vec2, t: float) -> Vec2:
    return lerp(peak, underarm, t)


def _outward_inward(peak: Vec2, underarm: Vec2) -> tuple[Vec2, Vec2]:
    """Perpendiculars of peak→underarm. Outward is away from the grain."""
    direction = (underarm - peak).unit()
    outward = direction.rotated_ccw()
    mid = lerp(peak, underarm, 0.5)
    if abs((mid + outward).x) < abs(mid.x):
        outward = -outward
    return outward, -outward


def draft_sleeve(params: SleeveParams | None = None) -> SleeveDraft:
    """Draft the current basic sleeve block."""
    p = params or SleeveParams()
    notes: list[str] = []
    ah = p.total_ah

    origin = Vec2(0.0, 0.0)
    cap_height = ah / 3.0 - p.cap_height_subtract
    if cap_height <= 0:
        raise ValueError(f"cap height must be positive, got {cap_height:.3f}")
    peak = Vec2(0.0, cap_height)

    cuff_y = cap_height - p.sleeve_length
    if p.sleeve_length <= cap_height:
        raise ValueError("sleeve length must be greater than cap height")

    front_diag_len = p.front_ah
    back_diag_len = p.back_ah + p.back_diagonal_ease
    if front_diag_len <= cap_height:
        raise ValueError(
            f"front AH ({front_diag_len}) must be greater than cap height ({cap_height:.3f})"
        )
    if back_diag_len <= cap_height:
        raise ValueError(
            f"back AH + ease ({back_diag_len}) must be greater than cap height ({cap_height:.3f})"
        )

    front_underarm = Vec2(sqrt(front_diag_len**2 - cap_height**2), 0.0)
    back_underarm = Vec2(-sqrt(back_diag_len**2 - cap_height**2), 0.0)
    front_cuff = Vec2(front_underarm.x, cuff_y)
    back_cuff = Vec2(back_underarm.x, cuff_y)
    front_seam = [front_underarm, front_cuff]
    back_seam = [back_underarm, back_cuff]

    elbow_from_peak = p.sleeve_length / 2.0 + p.elbow_extra
    elbow_y = cap_height - elbow_from_peak

    front_out, front_in = _outward_inward(peak, front_underarm)
    front_offset_upper = _along_diagonal(peak, front_underarm, 0.25) + front_out * p.front_upper_out
    front_offset_lower = _along_diagonal(peak, front_underarm, 0.75) + front_in * p.front_lower_in

    back_out, back_in = _outward_inward(peak, back_underarm)
    back_q1 = _along_diagonal(peak, back_underarm, 0.25)
    back_mid = _along_diagonal(peak, back_underarm, 0.50)
    locator_t = 0.50 + p.back_mid_along / back_diag_len
    if locator_t >= 1.0:
        notes.append(
            f"back locator 2.5 cm past midpoint overshoots the underarm "
            f"(t={locator_t:.3f}); clamped to the lower half."
        )
        locator_t = min(locator_t, 0.95)
    back_locator = _along_diagonal(peak, back_underarm, locator_t)
    back_offset_upper = back_q1 + back_out * p.back_upper_out
    back_offset_lower = (
        _along_diagonal(peak, back_underarm, (locator_t + 1.0) / 2.0) + back_in * p.back_lower_in
    )

    cap = interpolate(
        [
            back_underarm,
            back_offset_lower,
            back_offset_upper,
            peak,
            front_offset_upper,
            front_offset_lower,
            front_underarm,
        ],
        samples_per_seg=p.spline_samples,
    )
    peak_i = _nearest_index(cap, peak)
    back_cap = list(reversed(cap[: peak_i + 1]))
    front_cap = cap[peak_i:]

    cuff_back_mid = Vec2(back_cuff.x / 2.0, cuff_y - p.cuff_back_out)
    cuff_center = Vec2(0.0, cuff_y - p.cuff_center_drop)
    cuff_front_mid = Vec2(front_cuff.x / 2.0, cuff_y + p.cuff_front_in)
    cuff = interpolate(
        [back_cuff, cuff_back_mid, cuff_center, cuff_front_mid, front_cuff],
        samples_per_seg=p.spline_samples,
    )

    return SleeveDraft(
        params=p,
        cap_height=cap_height,
        origin=origin,
        peak=peak,
        front_underarm=front_underarm,
        back_underarm=back_underarm,
        front_cuff=front_cuff,
        back_cuff=back_cuff,
        elbow_y=elbow_y,
        cuff_y=cuff_y,
        front_diag_len=front_diag_len,
        back_diag_len=back_diag_len,
        front_offset_upper=front_offset_upper,
        front_offset_lower=front_offset_lower,
        back_offset_upper=back_offset_upper,
        back_offset_lower=back_offset_lower,
        back_mid=back_mid,
        back_locator=back_locator,
        cuff_front_mid=cuff_front_mid,
        cuff_back_mid=cuff_back_mid,
        cuff_center=cuff_center,
        cap=cap,
        front_cap=front_cap,
        back_cap=back_cap,
        cuff=cuff,
        front_seam=front_seam,
        back_seam=back_seam,
        notes=notes,
    )
