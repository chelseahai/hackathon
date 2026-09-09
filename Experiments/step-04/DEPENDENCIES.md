# Dependency map and conditional-range protocol — v1

Scope: document dependencies before implementing normalized controls. This is
not a fitted safe-range declaration. Existing step-4 results remain unchanged.

## Current dependency graph

Machine-readable map: `web/experiments/dependencies.json`. Interactive journal:
`web/experiments/index.html#dependencies`. Each node records its code location.

- Body, waist ease, hip ease → waist/hip widths and available intake.
- Intake, length, fullness and distribution → lower panel geometry.
- Body and lower geometry → side-seam length balance → front dart transfer.
- Intake, lower geometry and transfer → resolved panels and notch locations.
- Resolved panels → cutting outlines and interval-based seam checks.
- Intake, contours and cuts → geometry validity checks.
- Lower geometry and contours → proposed design-intent evaluation.
- Design intent and seam review → questions requiring physical evaluation.

Arrows represent implemented calculations/checks except the proposed design and
physical evaluation edges. They do not represent a measured sensitivity, a
proof of wearability or automatic reverse adjustment. Range constraints can
couple several inputs even though the engine's calculation proceeds forward.
Construction settings (including hip depth and seam allowance) are held fixed
in the current study. Changing them requires a new range context.

## Established equations and guards

Let D = H + Eh − W − Ew. Back takeout = (D − 1)/4, front = (D + 1)/4.
Both positive therefore requires D > 1, or Ew < H + Eh − W − 1.
At W=68, H=90, Eh=4, the intake-only upper bound is Ew < 25 cm.
The engine currently also requires 0 ≤ Ew ≤ 12, 0 ≤ Eh ≤ 12, 0 ≤ F ≤ 80,
positive body dimensions, W < H and length > hip depth. These guards are not
independently established design or wearability limits.

Fullness F and distribution do not enter the intake inequality. They enter
hem endpoints and side lengths, which influence dart transfer and the final
seams. Per half-garment side edge, addition = F × share / 2. Per princess edge,
addition = F × share / 4. Four nonnegative shares must sum to one.

The current branch for front dart transfer activates when side excess > 0.08 cm.
Boundary exploration must sample both sides of this transition. Distribution
is a simplex-valued control, not four independently adjustable 0–1 scalars.

## Measured evidence

Step 4 held B=84, W=68, H=90 and back length=38 fixed. Its 15 configurations
passed engineering checks with 2–4 seam review flags each. Doubling F from
32 to 64 shifted a corresponding above-waist seam knot by about 0.539 cm.
This measures a finite change, not a derivative or monotonicity guarantee.
The calculation path through side balance explains why lower changes can
reach upper geometry. See `RESULTS.md` and the archived case/source records.

## Boundary definitions to investigate

1. Geometry validity: finite construction, positive takeout and nonzero panel
   area, sampled outline validity/containment, preserved notch identity and
   Python/browser parity. Keep existing diagnostic policies unchanged.
2. Straightness: separately measure waist→hip, hip→hem and underarm→hem.
   For each, maximum perpendicular distance to the endpoint chord divided by
   chord length is a proposed scale-normalized descriptor. Also retain the
   distance in cm, chord slope and signed curvature. No threshold is approved.
3. Flare/taper: record hem width relative to hip/waist width and side slope;
   a straight sloping side is not equivalent to a vertical side.
4. Sewing: retain each notch-to-notch difference, totals, intended ease (or
   null) and diagnostic flags. Do not turn unexplained mismatch into ease.
5. Wearability: ease adequacy, motion, fabric response and closure need fitting
   observations. Geometry cannot establish these limits by itself.

## Proposed next sampling experiment

Start with two-control slices on the fixed reference body:

- Waist ease × hip ease: positive takeout and shaping redistribution.
- Waist ease × fullness: straightness descriptors and side/upper changes.
- Fullness × length: flare slope, side lengths and transfer branch transitions.
- Distribution × fullness: princess-only to side-only allocation at fixed F;
  separately vary front/back allocation with other context explicit.

Use current implementation guards as exploration bounds, not safety labels.
Log every tested input, descriptor, result and failure reason. Bracket boundary
changes and refine locally, checking for non-monotonic and disconnected regions.
Retain last-pass/first-fail brackets and resolution uncertainty. Do not claim
continuous coverage from samples. Physically informed boundaries remain pending.

## Normalization contract (not implemented yet)

For a continuous admissible interval [a,b] with b>a, u=(x−a)/(b−a).
Store x, units, u, a, b, interval ID, body, other fixed design/construction
settings, limiting conditions, sampling resolution, evidence category and
range-rule version. Include/exclude endpoints explicitly; an open geometric
bound cannot be offered as u=1 without an evidence-based interior margin.

Disjoint intervals need explicit interval selection; a=b is a fixed value,
not a division by zero. Changing another control preserves x and re-evaluates
validity; never silently clamp x or reinterpret stored u. The same u across
two bodies can represent different physical amounts, so retain both for the
matrix. Establish these intervals before exposing normalized adjustment APIs.
