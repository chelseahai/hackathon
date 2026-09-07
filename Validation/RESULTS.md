# First validation findings — 7 September 2026

Baseline `1e0bde4`. The authoritative per-run measurements and source hashes are
in `output/validation/report.json`; `report.html` is the readable view.

## Completed

- Saved the original project in a local Git commit before changing files.
- Recorded accepted constructions, user refinements and unverified fitting assumptions.
- Added 15 scenarios (13 draftable sets and two expected rejections).
- Ten checker/regression tests pass, including deliberately wrong-scale DXF,
  missing seam entities, malformed outlines and landmark ambiguity.
- All 13 draftable sets have matching Python/browser-source geometry; the maximum
  observed numeric difference is about 1.71e-13 cm.
- Independent DXF reader audits pass for both exporters across those sets.
  The separate calibration file reopens at exactly 100×100 mm.
- Reference stitch and cutting polygons are valid. Maximum reference DXF-to-preview
  curve deviation is approximately 0.0193 mm, below the diagnostic gate.
- Reference page loads and the live Export DXF button downloads. The actual browser
  download matches the independently checked JS export after newline normalization.
- The generated report was inspected in the browser. This was a reference-page
  smoke test, not a complete responsive or continuous-slider UI test.

## Exporter repair

Both JavaScript exporters had a missing closing parenthesis in the two-point
spline-to-Bezier branch. The syntax error prevented the entire exporter script
from loading. Repaired that parenthesis, synchronized the served copy exactly,
and bumped its script cache version from 6 to 7. No drafting formula was changed.

## Open numerical findings

- Reference back princess: SB is 1.714 mm shorter overall than CB; 1.575 mm of
  that difference is between shoulder and the upper notch. Intended ease is unspecified.
- Reference front princess: SF is 0.400 mm shorter overall than CF.
- Reference side: SF is 0.339 mm longer in total, but 1.440 mm shorter above
  waist, 0.671 mm longer between waist and hip, and 1.108 mm longer below hip.
  These are measured differences, not newly approved ease allowances.
- At W58/H118 (all other reference values), the CB and SB CUT loops self-intersect
  near the waist. This is inside the independent slider limits. The validation run
  correctly exits 1 and marks that set unsuitable for cutting. Geometry is preserved
  for review; this task does not silently change the offset algorithm or restrict sliders.
- Other sampled sets have valid cutting outlines. This is not a proof for every
  measurement combination in the continuous slider range.

## Physical decisions still required

- Actual CAD/plot scale measurement and a sewn toile are pending.
- The upper front princess notch currently uses back BL height, not front BP.
- Side waist and hip subdivisions are virtual reference points; only SF has the
  exported side hip/zipper notch. Decide paired sewing marks before assembly.
- CUT includes allowances on centre edges. Confirm centre fold/seam treatment,
  mirrored quantities, closure access and hem/edge finishing before cutting.
- Review seam ease by interval and record fitting observations before changing
  the model's reference-bust vertical assumptions.

Use `FITTING.md` and a copy of `fitting-observations.json` for the hands-on trial.
