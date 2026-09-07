# Princess-line dress: accepted implementation baseline

Baseline commit: `1e0bde401cae73df7357d378b131be0dbdef3537` (7 September 2026).
This commit preserves the pre-validation project, including the original exporter syntax error.
No drafting geometry was changed when introducing validation.

Sources: the development-history PDF, 26 August to 4 September 2026, pages 1–61,
and the code in that commit. The PDF is a conversation record, not an independent
textbook or fitting study. “Textbook-derived” below means attributed to the book
in that history; the original book pages were not independently rechecked here.
This is a project specification, not a copy of personal chat notes.

## Scope and coordinate conventions

- Layer 1: bodice, sleeve, skirt, trousers. Layer 2: princess-line dress from bodice and skirt.
- Four half-garment panels: centre back (CB), side back (SB), side front (SF), centre front (CF).
- Draft in centimetres, +Y up, +X toward centre front; back construction waist at y=0.
- SVG is a preview. DXF is millimetres, AC1015 / AutoCAD 2000, with named seam entities.
- Reference: bust 84, waist 68, hip 90, back length 38, waist-to-hem length 50 cm.
  Hip depth 18 cm; seam allowance 1 cm. Dress length is measured from waist, not shoulder.
- Inward/outward means relative to a piece or fold. The implementation uses
  piece-oriented helpers for the requested directional operations; it is not a
  general rotation-invariant garment coordinate framework (+Y and horizontal remain explicit).

## Textbook-derived starting constructions

- Bodice width B/2+5; armhole depth B/6+7; back width B/6+4.5; chest width B/6+3.
  Reference front hem drop is half front neck width: (B/12−0.2)/2 = 3.4 cm.
- Skirt supplies hip distribution: back H/4; front H/4+2, and an 18 cm hip depth.
- Dress underarm moves 1 cm inward and 0.5 cm up; chest/back width indents 0.4 cm.
  Neck widens 0.5 cm; shoulder tip drops 0.5 cm.
- Back princess shoulder locations are 5.5 and 7 cm from side neck, leaving a 1.5 cm dart.
  Front initial princess shoulder location is 5.5 cm from side neck.
- Side flare is 3 cm back, 4 cm front. These are design constants, not body measurements.

## Accepted refinements and clarified construction order

The history contains reversals. These are final accepted states, not every intermediate proposal.

### Placement and front side dart (PDF pp. 45–50)

1. Keep dress waist at y=0 and the skirt below it fixed. Lift the original front
   upper bodice by its dropped-hem amount, aligning that hem with the skirt waist.
   Do not lower waist/hip/hem to compensate.
2. Move the placed original bodice side 1 cm toward CF. Intersect it with the
   horizontal through BP to form Point A.
3. Front side length before closure is straight UA–A + straight A–side waist
   + the below-waist side curve. Subtract the back side length for dart intake.
4. Measure the full intake down A–waist; rotate the upper side front around BP.
   Code applies rotation when intake exceeds 0.08 cm; smaller/negative values are
   not rotated. This threshold is an implementation detail, not approved sewing ease.
5. Trim rotated SF shoulder TIP 0.7 cm toward its princess SH; shift SF SH
   horizontally 0.7 cm toward CF. Rebuild the armhole through the final TIP.
   The removed original tip T0 must not remain as a curve endpoint.
6. Centre-front SH is 6.5 cm from side neck (5.5 + 1 cm hollow-chest adjustment).

### Princess and side curves (PDF pp. 35–44, 49–50)

- Cubic natural interpolating splines, chord-length parameterization; display samples 32 per span.
  They interpolate knots. This is not a guarantee of exact Rhino Interpolate equivalence.
- Princess seams split into independent upper and lower splines meeting at W.
  Tangent continuity at W is not enforced.
- Back upper: SH → “6” → inward 0.2 midpoint → W. “6” is found by walking
  6 cm upward from BP height on a provisional princess curve, not down from shoulder.
  The inward midpoint comes from BL–W. BL itself is no longer a knot.
- CF upper: SH → midpoint of SH–BP shifted horizontally 0.2 cm toward CF → BP
  → inward 0.3 midpoint of BP–W → W.
- SF upper: SH → point 7 cm along SH–BP → BP shifted 0.3 cm toward the dart
  → inward 0.3 midpoint → W. Removed M and ±3 controls stay removed.
- Lower princess on all panels: W → point 4 cm vertically above H → midpoint
  of the H–hem construction line → hem. H and the quarter-point are reference
  marks, not spline knots. Hip–hem is not a separately imposed straight seam.
- Back side: UA → W → W–H midpoint → H → H–hem midpoint → hem, one spline.
  SF side above W follows the dart-closing line construction; below W follows
  its own spline through the corresponding lower controls.
- Armhole MID comes from halfway along a provisional armhole, shifted 0.2 cm inward.
- Princess flare = side flare / 2 + 0.5 cm. Raise side hem endpoints 0.5 cm;
  use the two-thirds-from-fold flared hem-width point to shape side-panel hems.

### Waist distribution (PDF pp. 54–57)

- Finished half-back width CB+SB = W/4; half-front CF+SF = W/4+1.5.
  Their mirrored sum implies W+3 cm at the waist; this is a horizontal width
  construction, not a measured body-fit result.
- Reference princess darts are 3 cm at W68/H90.
- Back takeout = H/4−W/4. Back dart = takeout × 3/5.5.
- Front takeout = (H/4+2)−(W/4+1.5). Front dart = takeout × 3/6.
- Remaining takeout goes to the side; princess waist points move by half the
  dart about their axes. Folds remain fixed. No fixed 3 cm dart at all sizes.
- Hips imply H+4 cm full horizontal width. Both waist and hip formulas need
  physical fit verification; the proportional split is an accepted modeling rule.

## Later fitting assumptions, not established anatomical facts (PDF pp. 58–60)

- In the dress only, BL and base BP height derive from reference bust 84:
  BL = back length − (84/6+7); BP = BL−4.
- Back underarm and provisional armhole construction use that same reference depth.
  Current bust still changes horizontal geometry. Front lift still varies with bust,
  so the final front BP is not completely independent of bust (16.4 cm at reference).
- Basic bodice retains the original bust-dependent rule. The dress deliberately diverges.
- Back length alone does not establish measured BP height, bust projection or armhole fit.
  Hollow-chest defaults and the fixed hip depth likewise remain fitting assumptions.
- Do not label a measured princess mismatch as “intended ease” without deciding
  its amount and location. No such numerical princess ease target exists in the record.

## Notches, cut lines and export

- Current princess notches are at shared BL, waist and hip heights. The front
  upper notch is at back BL, not lifted front BP; at reference these are 17 and 16.4 cm.
- SF alone has an additional side hip/zipper notch. SB has no matching side notch.
  Side waist/hip subdivisions in validation are virtual references, not new cut marks.
- CUT offsets the entire closed outline, including centre edges. A fold-cut plan
  must place the centre stitch line on the fold and omit its outside allowance.
  Do not blindly cut every CUT edge as a finished production instruction.
- Grain is a vertical inset line. Notches are short ticks; do not cut through the stitch line.
- DXF has 20 named seam entities at reference, plus four closed CUT loops, grain,
  notches and names; no construction overlays. There are currently no piece quantity,
  fold, closure, facing or hem-finishing specifications in the export.
- Source exporter and served copy must remain identical. Initial validation repaired
  the missing parenthesis in their two-point spline-to-Bezier conversion and bumped
  the dress page's exporter version; no curve formula was changed.

## Acceptance boundary

The preserved baseline is an accepted implementation, not a fit-approved pattern.
Validation findings do not authorize inventing new ease, shifting landmarks, or
silently smoothing away a drafting problem. Keep measurements, tolerances, unresolved
findings and physical observations attached to each future fitting iteration.
