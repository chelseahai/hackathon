# Step 4 — design experiment on one body

Open `http://127.0.0.1:8768/web/experiments/` while the repository server is running.
This is separate from `web/presentation/`; it documents computed experiments.

## Protocol

Reference body: bust 84, waist 68, hip 90, back length 38 cm.
The accepted engine defaults form the design baseline: length 50, waist ease 3,
hip ease 4, hem fullness 32 cm; normalized distribution 3:4:4:5.
Construction rules, sampling and 1 cm allowance remain fixed.

`cases.json` records the reference, two values each for length/waist ease/hip
ease/fullness, three distribution vectors, and three named combinations.
A distribution change is one vector-control experiment: all shares remain
normalized and total fullness remains 32 cm. These are design intentions, not
physically verified silhouettes.

## Reproduce

Install `Validation/requirements.txt` and make Node available, then run from
the repository root:

```
python Experiments/step-04/publish.py --node /path/to/node
python Experiments/step-04/verify.py
```

The publisher runs the same seam, outline, notch, DXF, sampling and
Python/browser checks as baseline validation. Failed engineering results remain
in the journal rather than being discarded. `--skip-validation` republishes an
existing local run and should only be used when its inputs and sources match.

Every case's full geometry, Python/browser DXFs, seam CSV and full validation
report are written under ignored `output/experiments/step-04/`. The journal's
committed `data.json` preserves inputs, stitch geometry, metrics, source hashes
and validation results. Regenerate local outputs to restore download links on
a fresh checkout. No personal data or saved measurement stores are changed.

The compare view uses matching horizontal offsets for both configurations and
preserves their drafted y coordinates. Selected-only results use waist-based
grainline placement, a shared centre-front vertical midpoint and inward marks.
Names and geometry depict flat patterns; no garment photos or drape simulations
are fabricated.

## Reading the results

Engineering pass is separate from open seam review flags. The 0.1 cm seam
threshold is a project diagnostic, not an approved sewing tolerance. Totals and
individual intervals can both be flagged. Garment ease is not seam sewing ease.

Area change is the sum of four stitch-panel areas, not full garment fabric use.
Upper movement is the largest Euclidean shift of corresponding above-waist seam
knots. Lower-body controls can affect the front dart transfer through side-seam
balancing; the experiment records this coupling rather than hiding it.

Current limitations: no physical plot measurement, closure/fold decision, toile
or fitting evidence; no proof across all continuous parameter combinations.
