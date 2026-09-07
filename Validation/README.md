# Princess-line dress validation

The drafting baseline is preserved in Git commit `1e0bde4`. Read `BASELINE.md`
for final rules and their provenance, and `FITTING.md` for the physical trial.
This folder adds diagnostics; it does not alter garment geometry.

## Run

From the repository root, with Python 3.10+ and Node.js available:

```powershell
python -m venv .venv-validation
.\.venv-validation\Scripts\python.exe -m pip install -r Validation/requirements.txt
.\.venv-validation\Scripts\python.exe Validation/run.py
.\.venv-validation\Scripts\python.exe -m unittest discover -s Validation -p "test_*.py" -v
```

If Node is not on PATH, pass `--node "C:\path\to\node.exe"` to the runner.
Optional `--repo` and `--out` allow a read-only source checkout and a separate output directory.
Generated artifacts default to `output/validation/`, which Git already ignores.
The runner never writes the shared measurements store and uses explicit case inputs.

Outputs: `report.html`, `report.json`, `seams.csv`, reference Python/browser DXFs,
`reference-snapshot.json`, preview SVG (not a scale-controlled print file), and
`calibration-100mm.dxf`. Open the HTML report locally; it has no network dependencies.

Exit code 1 means an engineering failure (including self-intersecting cut outlines).
`--strict` also fails for open seam review flags. An expected failure in the current
baseline is an honest finding, not a broken validation harness; do not loosen the
checks to make the report green. Unit tests exercise the checking machinery separately.

## What is checked

- Fifteen scenarios: reference; small/large sets within slider ranges; individual
  bust/waist/hip/torso/length changes; 0 and 2.5 cm allowance; extreme and nearly
  equal waist/hip combinations; two explicitly invalid inputs.
- Named stitch seams measured top-to-bottom, with distances projected onto their
  actual exported notch points. Back and front princess pairs use the three stored
  princess notches. Side seams use waist/hip intersections, explicitly unpaired references.
- Differences are second piece minus first (SB−CB, SF−CF, SF−SB), including
  segment and total lengths. A 0.1 cm diagnostic threshold prompts review; it is
  not an industry tolerance. Princess ease is unspecified, not automatically equal
  to a detected mismatch. Side target zero is provisional per interval and follows
  the total-side matching intent; physical ease decisions remain unapproved.
- Shapely checks sampled stitch and cut polygons for closure, nonzero area,
  self-intersection and whether the cut polygon contains the stitch polygon.
- Actual browser JavaScript is executed in a Node VM with browser global semantics.
  All named seams, knots, spans, outlines, notches, marks, laid-out geometry, cut
  vertices and summary metrics are compared with Python (1e-7 cm tolerance).
  This is browser-source parity, not an automated slider/UI test.
- The independent ezdxf reader audits both exports, checks units, layers, entity
  counts, cut vertices ×10, grain/notch coordinates and names. It flattens actual
  DXF curves independently and compares them with stitch polylines (0.5 mm maximum
  Hausdorff diagnostic gate, 0.1 mm seam-length difference gate, flattening
  resolution 0.005 mm).
- Sampling convergence compares stitch lengths at 32 and 128 samples per span
  (0.01 cm diagnostic gate). This is not an exact analytic arc-length proof.
- Source hashes identify the run. Canonical and served JS exporters must be identical.
- The separate 10 cm source square must reopen as exactly 100×100 mm.

## Limits

The matrix is diagnostic coverage, not proof over every continuous slider combination.
Polygon checks concern sampled outlines, not a general exact spline-offset theorem.
Paired princess notches are currently height-derived, not guaranteed equal arc-length
positions. Total equality can hide interval mismatch. No fit certification is implied.
The physical CAD application, printer, fabric, closure/fold plan and toile remain
outside automated validation; record those in a copy of `fitting-observations.json`.

Do not commit personal measurements/photos or generated outputs. The empty observation
template is safe to version; completed fitting records belong in ignored output storage.
