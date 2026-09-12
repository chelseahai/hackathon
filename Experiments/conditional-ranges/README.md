# Conditional ranges — study 01

This extends the fixed-body design experiment with five two-control slices.
It leaves all drafting equations, existing diagnostic policies and stored
measurement/design inputs unchanged.

## Reproduce

Use the Python dependencies from `Validation/requirements.txt` and Node.js.
From this directory:

```text
python -B study.py --root ../.. --node /path/to/node --out results
python -B publish.py
python -B -m unittest test_study.py
python -B ../../Validation/run.py --repo ../.. --cases results/audit-cases.json --out results/export-audit --node /path/to/node
python -B attach-audit.py
```

Publish `results/ranges.json` to `web/experiments/ranges.json` and the generated
written findings as `RESULTS.md`. Keep the independent export-audit result
alongside the sampler results; the journal's audit link uses
`output/experiments/conditional-ranges/export-audit/report.html`. Copy the generated
audit report there for local preview. The sampling tier deliberately does not label
its screening as the full export/physical validation suite.

## Repaired study and policy

The second run uses the repaired cutting-outline construction and explicit
guards described in `CONSTRUCTION-REPAIR.md`. Its complete browser journal data
is `web/experiments/ranges-v2.json`; the first run remains in `ranges.json` for
comparison. `RESULTS-V2.md` records the repaired outcome.

`silhouette-policy.json` is the approved design-intent source. The matching
`silhouette_policy.py` and `web/silhouette-policy.js` evaluators calculate the
fitted/relaxed family, the 45-degree lower-chord constraint, and conditional
physical intervals before normalization. `test_repair.py` covers the geometry
repair, policy boundary and normalization contract. None of these files claims
physical-fit certification.

## Design and evidence

- Reference body: bust84, waist68, hip90, back length38 cm. All other fixed
  construction parameters are taken explicitly from the archived reference.
- Ease uses 0–12 cm, fullness 0–80 cm: existing implementation guards, not
  empirically derived fitting limits.
- Length18–80 cm is a search window. The engine requires length > hip depth18;
  the lower endpoint deliberately tests rejection. 80 is a study ceiling.
- Initial grids cover waist × hip ease, waist ease × fullness, length ×
  fullness, side allocation × fullness and front allocation × fullness.
- Side allocation `t` gives shares `[3t/7,4(1−t)/9,4t/7,5(1−t)/9]`.
  Front allocation `t` gives `[3(1−t)/7,4(1−t)/7,4t/9,5t/9]`.
  These are distinct allocation paths, not four independently adjustable shares.
- Every generated sample checks sampled polygon validity/containment, seam
  notch identity/order, Python/browser-source geometry parity and interval
  convergence at 32 versus128 samples. Code exceptions remain explicit failures.
- Seam differences retain the existing 0.1 cm diagnostic policy and unassigned
  princess ease. Review flags are separate from screening failures.
- Side descriptors are evaluated on final back/front stitch seams, traversed
  from top to hem, split at corresponding waist and hip notches. Outward x is
  positive on each side. Deviation/chord is dimensionless; slope is outward
  displacement per downward height; signed turn is radians, mean signed
  curvature is signed turn divided by arc length (1/cm).
- Observed status and transfer-branch changes on neighboring grid points are
  refined by bisection along both axes. Stopping resolutions: ease0.025 cm,
  fullness0.1 cm, length0.05 cm, share0.002. These are numerical search settings.
  Bisection isolates a change, not necessarily every change in that segment.
- Identical endpoint status never proves the interior is uniform. All points
  between samples remain untested, including points between passing endpoints.

## Saved record and normalization

The JSON contains resolved inputs for every unique sample, rule and sampler
hashes, all seam intervals, outline checks, parity results, descriptor values,
geometry hashes, simplified previews and explicit boundary brackets. Preview
outlines are simplified at0.025 cm and are not cutting files. The exact
draft is reproducible from its inputs and source version.

Candidate rows retain consecutive passing samples, endpoint values, largest
untested gap, whether the run reaches the search-window edge and its evidence
IDs. `continuous_validity` remains `unproven`; `normalization_enabled` remains
false. A chosen silhouette threshold and physical fitting limits require
separate evidence. The unchanged normalization contract remains in
`../step-04/DEPENDENCIES.md`.
