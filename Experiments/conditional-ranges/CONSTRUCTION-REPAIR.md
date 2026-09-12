# Conditional-range construction repair

The first coupled sweep produced 41 construction failures. The repair was made
without changing stitch geometry for configurations that already passed.

## Causes and corrections

1. At sharp convex corners, the cutting-outline algorithm limited a long miter
   by moving to one clipped point. In short, highly flared pieces that shortcut
   could pass inside the stitch outline. The corrected construction adds both
   offset edge endpoints, creating a bevel, then applies the existing local
   concave-loop trimming. This preserves the seam allowance outside the stitch.
2. A dress length at or above the hip depth but at or below `hip depth + side
   hem rise` places the raised side hem on/above the hip. Coincident construction
   points previously caused spline division by zero. The engine now rejects that
   combination explicitly.
3. Extreme short/full combinations can cross a stitch outline or make side
   waist/hip marks non-unique or out of sewing order. The engine now rejects
   these unsupported constructions before export.

## Evidence

- All 186 original passing inputs remain passing.
- 32 of 41 original failures now pass complete range screening.
- The other nine original failures are explicit unsupported-design rejections.
- The repaired 263-input replay has no unhandled construction failure.
- Python and browser-source results agree for every replayed input.
- The full baseline validation passes, including independent Python/browser DXF
  audits, notch identity and sampling convergence.

Rejection describes the current construction’s supported region. It does not
describe an invalid body or an unwearable garment. Existing seam-review flags
remain open and separate from this repair.
