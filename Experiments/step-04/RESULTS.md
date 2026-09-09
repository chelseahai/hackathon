# Step 4 — fixed-body design experiment

Generated: 2026-09-09T18:41:55.657219+00:00
Rule commit: 6c2bfe4595170242d4a2969c226ecaf8a89ccedc

Reference body: bust 84, waist 68, hip 90, back length 38 cm.
Construction settings are fixed; single-control cases differ in exactly one design field.
Distribution is treated as one normalized vector control; total fullness stays 32 cm.

## Results

- Reference: engineering=True; review flags=4; area change=0.00 cm²; maximum upper-knot movement=0.0000 cm.
- Length / 40: engineering=True; review flags=4; area change=-554.52 cm²; maximum upper-knot movement=0.0828 cm.
- Length / 75: engineering=True; review flags=3; area change=1394.27 cm²; maximum upper-knot movement=0.0721 cm.
- Waist ease / 0: engineering=True; review flags=4; area change=-22.17 cm²; maximum upper-knot movement=0.0625 cm.
- Waist ease / 8: engineering=True; review flags=3; area change=36.93 cm²; maximum upper-knot movement=0.0994 cm.
- Hip ease / 0: engineering=True; review flags=4; area change=-88.53 cm²; maximum upper-knot movement=0.1395 cm.
- Hip ease / 8: engineering=True; review flags=4; area change=88.52 cm²; maximum upper-knot movement=0.1323 cm.
- Fullness / 0: engineering=True; review flags=2; area change=-254.62 cm²; maximum upper-knot movement=0.1714 cm.
- Fullness / 64: engineering=True; review flags=4; area change=253.66 cm²; maximum upper-knot movement=0.5390 cm.
- Princess distribution: engineering=True; review flags=2; area change=2.80 cm²; maximum upper-knot movement=0.1714 cm.
- Side distribution: engineering=True; review flags=2; area change=-2.38 cm²; maximum upper-knot movement=0.1961 cm.
- Equal groups: engineering=True; review flags=2; area change=0.23 cm²; maximum upper-knot movement=0.1838 cm.
- Short column: engineering=True; review flags=2; area change=-729.47 cm²; maximum upper-knot movement=0.1756 cm.
- Long flare: engineering=True; review flags=4; area change=1844.05 cm²; maximum upper-knot movement=0.2254 cm.
- Relaxed midi: engineering=True; review flags=4; area change=1175.87 cm²; maximum upper-knot movement=0.3102 cm.

Area is the sum of four sampled stitch-panel areas, not fabric consumption.
Upper movement compares corresponding above-waist seam knots with the reference.
Sewing-ease, fold/closure choices, physical plot scale and toile fit remain open.
Passing engineering checks does not certify fit or settle seam review flags.

## Artifacts

- Website: `web/experiments/index.html` and `data.json`.
- Full inputs, source hashes and case-level checks: `data.json`.
- Per-case geometry, Python/browser DXFs, calibration and seam CSV: `output/experiments/step-04/`.
- Reproduce: `python Experiments/step-04/publish.py --node /path/to/node`.
