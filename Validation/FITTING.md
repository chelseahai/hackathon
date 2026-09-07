# First reference toile: physical verification record

Status: prepared, not physically verified. Use the generated reference DXF and
calibration DXF from the same validation run. Reference bust/waist/hip 84/68/90,
back length 38, waist-to-hem length 50 cm, allowance 1 cm; hip depth 18 cm.

## Before cutting

1. Read `output/validation/report.html`. Resolve or explicitly record the reference
   seam differences before claiming sewing approval. The extreme waist58/hip118
   scenario has invalid back cutting outlines; it is not the reference toile.
2. Open `calibration-100mm.dxf` in the CAD/plotting program. Measure both sides:
   expected width 100.00 mm and height 100.00 mm. Units must be mm.
3. Open `reference-python.dxf` in the same program. It has 20 named seam entities
   and four CUT loops. The reference CB shoulder stitch segment is 55.00 mm;
   check that independent feature as well as the separate calibration square.
4. Plot at actual size / 1:1, with fit-to-page disabled. If tiling, do not scale
   the tiles. Measure the physical square in both directions and record the readings.
   Proposed diagnostic gate: within 0.5 mm of 100 mm in each direction.
   This is a project check, not an asserted standard. Investigate any anisotropic scaling.
5. Resolve the cutting plan. The drafter offsets CB and CF centre edges too.
   For fold-cut centres, place the named centre STITCH line on the fold, not CUT.
   For a centre seam/zipper, use an explicitly chosen seam allowance and cut quantity.
   Decide closure access, left/right mirrored pieces, hem allowance and edge finishing.
   The current single allowance setting does not supply these decisions automatically.
6. Mark waist, hip, BP and grain on the toile from the construction/reference data.
   Keep the upper front princess notch separate from BP; they are not the same mark.
   Side waist and back side hip need transferred reference marks for this trial.

## Assembly and fitting

- Use stable toile fabric and record its stretch and grain direction. Compare a
  person/form's actual measurements with the reference; do not assume a nominal size matches.
- Walk/baste princess seams between corresponding marks. Record which edge has
  surplus and where; do not stretch an edge merely to conceal a discrepancy.
- Check side matching separately above waist, waist–hip, and hip–hem. A matching
  total can conceal differences of opposite sign in adjacent intervals.
- Baste shoulders and sides with the chosen temporary opening. Keep allowances
  available for adjustments. This prototype does not supply facings or a sleeve.
- Observe front/back waist level, centre/grain verticality, shoulder balance,
  neckline and armhole gaping, BP position, bust shaping, waist/hip ease, side-seam
  position and hem level. Record movement/comfort observations for a person.
- For each correction, record exact location, direction and amount in mm, which
  seams/notches it affects, and whether it is symmetric. Photograph front, side and
  back with level/vertical reference marks if useful; keep personal images outside Git.
- Change one hypothesis at a time. Rerun numerical validation after a code change;
  a visually improved toile must still have compatible seam lengths and valid cutting loops.

## Return measurements for the next iteration

Fill a copy of `fitting-observations.json` outside version control (for example in
`output/validation/`). Leave unknown values null rather than entering zero.
Send the physical square readings, actual body/form measurements, and observations.
Extra measurements such as shoulder-to-BP, BP spacing and front waist length
can then be considered based on the observed problem; they are not yet draft inputs.

Physical verification is complete only after the actual CAD/plot readings and
toile observations are recorded. Software checks cannot perform or certify that step.
