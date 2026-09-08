# First design controls — implementation contract

Scope: body × design matrix from the project checklist. Commercial/artistic
positioning and time-dependent garments are not part of this implementation.

The existing princess dress is the reference configuration. Separate body inputs,
garment ease, style inputs and construction settings. Body measurements must not
be overwritten to simulate a style change. Garment ease is not sewing ease between
paired seams; the latter remains a separate validation policy.

## Implemented controls

1. **Waist-to-hem length** (`dressLength`, cm). Existing default 50; initial UI
   range 40–80. Keep waist, hip depth and upper-body landmarks fixed. Recompute
   lower seam controls, flared hem endpoints and hem shaping. Require length > hip depth.
2. **Waist ease** (`waistEase`, cm added to full waist circumference). Default 3,
   reproducing the existing full width W+3. Initial exploration range 0–12 is
   provisional, not a fit-certified range. Back target = (W+ease)/4−0.75;
   front target = (W+ease)/4+0.75. This preserves the existing 1.5 cm half-front/back
   width difference. Distribute takeout using the existing reference dart/side ratios.
3. **Hip ease** (`hipEase`, cm added to full hip circumference). Default 4,
   reproducing H+4. Initial exploration range 0–12, provisional. Back target =
   (H+ease)/4−1; front target = (H+ease)/4+1. Preserve the existing 2 cm
   half-front/back hip difference. Recompute waist takeout, lower seams and hem
   positions. Reject incompatible takeout; do not silently clamp a negative dart.
4. **Hem fullness** (`hemFullness`, cm total horizontal width added beyond the
   unflared hip width, across the mirrored full garment). Default 32. This is
   a width construction, not curved hem arc length. Initial exploration 0–80,
   provisional. The 0.5 cm side-hem rise is still a separate construction setting.
5. **Fullness distribution** (`hemDistribution`, four normalized shares summing
   to 1). Groups: back side 3/16; back princess 4/16; front side 4/16;
   front princess 5/16. Each princess group covers two edges in the half garment.
   Given F = hemFullness, a side edge gets F/2 × its group share, while each
   princess edge gets F/4 × its group share. Defaults reproduce 3/4 cm side
   flare and 2/2.5 cm princess flare exactly. Moving one share must explicitly
   redistribute the others; do not let the total fullness change accidentally.

The distribution control replaces the old fixed dependency “princess flare =
side flare/2+0.5” when enabled. That old rule remains represented by the default
shares; it cannot also be enforced independently for every new distribution.

## Rules that remain protected

- Body inputs and stored body profiles remain independent of these design settings.
- Centre fold lines remain fixed, and upper-body fit geometry is not directly edited
  by length/fullness controls. Ease can affect side matching and the existing
  front dart-rotation calculation; measure that effect rather than promise complete
  independence of upper-body geometry.
- Maintain the dropped-front-hem registration, reference-scye convention and
  current shoulder/neck/BP construction until a separate fitting change is approved.
- Preserve named seams and paired notch IDs across designs.
- Recompute affected downstream geometry; never drag a sampled endpoint while
  retaining a curve aimed at its old position.
- Require finite inputs, positive panel areas, valid cutting outlines and valid
  parameter combinations. Expose unsupported combinations as errors.
- A configuration that passes geometry checks can still need sewing-ease decisions
  or physical fitting. Never convert a mismatch into “intended ease” automatically.

## Acceptance checks for the next implementation

- Defaults reproduce the preserved reference stitch geometry and derived widths.
- Changing a design input leaves the body measurement record unchanged.
- Waist widths sum to W+waistEase; hip widths sum to H+hipEase.
- Hem group shares sum to 1 and their additions sum to hemFullness.
- Fullness redistribution preserves the total while moving the intended edges outward.
- Length/fullness changes preserve the upper stitch knots before any independently
  required seam-balancing operation; report any operation that changes them.
- Python and browser outputs agree for every design preset and body combination.
- Every output includes the body, design settings, construction/rule version and
  validation status so it can become a reproducible matrix entry.

The controls below are implemented in both drafting engines and the dress page.
The full acceptance list remains the target for the expanding matrix experiment.

## Using design version 1

The dress page now has Body measurements, Design settings and Construction
groups. Body values use the existing shared measurement store; dress design and
allowance use a separate `princess-dress.design.v1` store. Reset body and Reset
design act independently. Reset design preserves the construction allowance.
The new design store starts with reference defaults rather than inheriting old
shared dress length/allowance values.

The four distribution sliders preserve the total by rescaling the other shares
proportionally. If the changed share was 100%, the newly available remainder is
split equally among the other three. Exact shares are retained in configuration;
displayed percentages are rounded and can add to 100.01%.

Save configuration downloads a versioned JSON containing body, design,
construction, units, rule version and an explicit unverified fit status. Browser
settings restore on reload. Saved JSON can be loaded by the Python CLI:

```powershell
python GarmentDesign-PrincessLineDress --config princess-dress-configuration.json --out output/my-design
python GarmentDesign-PrincessLineDress --waist-ease 8 --hip-ease 8 --hem-fullness 48 --length 65 --out output/relaxed
```

The CLI writes `princess-dress-configuration.json` beside the SVG, HTML and DXF,
and reuses it on the next run for that output directory. Explicit flags override
loaded settings. Body-only values are written back to shared measurements.
Distribution CLI order is back side, back princess, front side, front princess;
pass four fractions summing to one to `--hem-distribution`.

The former internal `back_hem_flare`, `front_hem_flare` and
`princess_flare_extra` constants are replaced by fullness and distribution.
Reference allocations reproduce their previous geometry. New lower-body
settings can change the dependent side-dart rotation in the upper draft.

Validation now includes relaxed, straight, full, princess-only and side-only
designs on the reference body, plus invalid ease and distribution inputs. All
24 cases pass engineering expectations (including four expected rejections),
and 17 unit tests pass. This is a sampled engineering check, not certification
of every combination in the slider ranges or of physical fit. Sewing review
flags remain in the generated report. Configuration metadata intentionally does
not claim an independent geometry check for arbitrary interactive settings.
