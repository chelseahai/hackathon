# Conditional ranges — repaired construction and silhouette policy

Run: 2026-09-12

## Result

The fresh coupled-control study evaluated 220 unique input sets on the reference
body. It produced 190 screening passes, 30 explicit unsupported-construction
rejections and no unhandled construction failures. Eight numerical transitions
were refined. Python and browser-source calculations agree for every record.

The separate replay of all 263 inputs from the first study preserved all 186
previous passes, repaired 32 of the 41 failures, and converted the remaining
nine failures into explicit geometric rejections. The repair does not change
stitch geometry for previously passing inputs.

Seven representative patterns also passed the full independent audit, including
Python and browser DXF export, scale, outline validity, notch identity and curve
sampling convergence. Their existing seam-review flags remain open.

## Approved silhouette policy

Fitted and relaxed are separate design families built by the same construction.
If `A = hip + hip ease - waist - 1`, retained waist shaping is
`(A - waist ease) / A`.

- Fitted retains at least 75% of `A`.
- Relaxed retains less than 75%, while remaining positive.
- Every hip-to-hem chord is limited to 45 degrees from vertical.

For the reference W68/H90 body with 4 cm hip ease, the waist-ease boundary is
6.25 cm: fitted is 0–6.25 cm inclusive and relaxed is above 6.25 cm through the
current 12 cm engine guard. At 32 cm fullness, the lower-volume rule gives a
22.5 cm minimum length. These values are contextual outcomes, not universal
garment limits.

Of the fresh records, 141 are fitted, 25 are relaxed, and 54 fall outside the
approved design policy. A total of 165 both pass construction screening and the
design policy.

## Normalization contract

The evaluator returns the family and conditional physical interval before a
value is mapped to 0–1. Normalized values must retain the physical amount, body
measurements, other design controls, policy version and interval used. Open
endpoints cannot map to exactly 0 or 1.

Dress length has a calculated contextual lower bound but no approved upper
design bound. It therefore remains physical-only for now. The 80 cm study edge
is an exploration limit and is not promoted to a design limit. Physical fitting
and the unresolved seam-ease decisions also remain separate from this policy.
