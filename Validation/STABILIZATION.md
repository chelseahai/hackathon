# Dress stabilization — 8 September 2026

Current changes follow the implementation checklist. The original reference stitch
geometry remains frozen by `reference-fixture.json`; it has not been regenerated
to accept new shapes. `RESULTS.md` records the earlier, pre-repair findings.

## Cutting outlines

The original dress inherited a vertex-by-vertex miter offset from the bodice.
At strong waist shaping, adjacent offset sections can cross and form small loops.
The dress now trims reverse-winding loops at their actual segment intersections.
If an extra loop is nested inside the retained contour, it is redundant and can
also be removed. Containment checks split edges at crossings, so they do not
assume that two inside endpoints imply an inside segment.

This is a local repair for the sampled dress offset, not a new general-purpose
polygon Boolean library. Disconnected/ambiguous lobes are rejected rather than
arbitrarily discarded. Browser errors clear the stale drawing and disable export;
changing back to valid measurements restores it.

No stitch knots, neckline, darts, body measurements or reference cut vertices were
moved. Sharp corners remain sharp. Basic block offset implementations are unchanged.
Tests cover the known extreme at 0.1, 1 and 2.5 cm allowance, including reversed
point order and mirrored/translated pieces. Independent polygon validation checks
closure, self-intersection and containment of the stitch outline.

## Sewing marks

Corresponding marks now have stable IDs:

- `back_princess.upper`, `.waist`, `.hip` on CB and SB.
- `front_princess.upper`, `.waist`, `.hip` on CF and SF.
- `side.waist`, `.hip` on SB and SF.

The side hip pair includes the previous SF zipper-reference position; it is not
duplicated. There are now 16 exported notch ticks, up from 13. Validation projects
the identified marks onto their actual named stitch seams, checks order and missing
IDs, and no longer assumes matching notches occupy the same list positions.

Princess upper marks have not moved: they are still at the back BL reference
height. The front mark is explicitly not labeled as the bust point.

## Sewing ease and cut treatment remain explicit decisions

Body-to-garment waist/hip ease is different from sewing ease along a paired seam.
Princess sewing ease remains unspecified. Side seams retain a zero-match target;
the small interval differences remain visible and `--strict` still reports them.
This repair does not invent ease or reshape fitted curves to conceal a mismatch.

The current CUT loop still offsets centre edges. A fold-cut sample must align the
centre stitch line with the fold, not the offset CUT edge. Whether to use centre
folds or a centre seam/closure is an unresolved physical cutting-plan decision.
No automatic fold clipping or closure design has been introduced here.

## Next implementation

`../DESIGN-PARAMETERS.md` specifies five controls and equations that reproduce the
current default shape: length, waist ease, hip ease, total hem fullness and its
distribution. Their storage and new geometry wiring are the next build; the
new ease/fullness controls are not yet active.

## Verification

- Fifteen unit/regression tests pass, including the unchanged reference fixture,
  malformed-loop detection, notch-ID pairing and wrong-scale/missing-entity DXFs.
- Seventeen matrix cases pass engineering checks (15 draftable configurations
  and two expected input rejections). Numerical seam-review flags remain open.
- The live page was checked at W58/H118 with 2.5 cm allowance and then restored
  to reference measurements. Its downloaded DXF independently passed units,
  geometry, 20 seam entities, four cutting loops and 16 notch-coordinate checks.
- The report shows the updated engineering status without treating it as physical
  fitting approval.
