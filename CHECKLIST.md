# Math Dress: implementation checklist

Focus: build the body × design system and then combine the two experiments.
The two later direction discussions are outside the current build scope.

## 1. Stabilize the existing dress

- [x] Preserve the original implementation in Git (`1e0bde4`).
- [x] Add seam, outline, export and Python/browser parity validation.
- [x] Repair crossing/nested allowance loops without changing stitch geometry.
- [x] Preserve sharp corners; verify reflected and reversed contours.
- [x] Give corresponding sewing marks stable IDs and add side waist/hip pairs.
- [x] Keep the front upper notch explicitly a reference-height mark, not BP.
- [x] Keep unresolved sewing ease visible; do not infer it from a mismatch.
- [ ] Decide whether the small reference seam differences should be trued or
      assigned explicit interval-specific sewing ease after fitting review.
- [ ] Confirm fold/centre-seam and closure treatment for the first physical sample.
- [ ] Verify plot scale and record the reference toile observations.

## 2. Define the parameter system

- [x] Specify body, garment-ease, design and construction responsibilities.
- [x] Define the first five controls and default-preserving equations in
      `DESIGN-PARAMETERS.md`.
- [x] Implement separate configuration storage and dependent geometry calculations.
- [ ] Validate the proposed ranges and unsupported combinations.

## 3. Build design controls

- [x] Waist-to-hem length exists in the current draft.
- [x] Waist ease and hip ease as full-circumference inputs.
- [x] Total hem fullness and its distribution.
- [x] Recompute dependent seams, marks and allowances.
- [x] Keep the existing page design and distinguish body from design inputs.

## 4. Design experiment

- [x] Hold the reference body fixed and vary one design input at a time.
- [x] Save several named silhouette configurations.
- [x] Validate intentional combinations and compare the resulting patterns.

Step 4 records 15 fixed-body configurations: reference, 11 single-control
variations and 3 combinations. All pass engineering checks; 2–4 seam review
flags remain per case. See `Experiments/step-04/RESULTS.md` and the separate
`web/experiments/` journal. Physical fitting and seam-ease decisions remain open.

### Conditional-range study

- [x] Map numerical constraints separately from the drafting sequence.
- [x] Sample five coupled-control slices on the reference body.
- [x] Preserve failed inputs, shaping descriptors, seam differences and refined transition brackets.
- [ ] Resolve construction failures and approve silhouette criteria before defining normalized safe intervals.

See `Experiments/conditional-ranges/RESULTS.md` and journal `#ranges`.
Passing sample runs remain provisional; no continuous fit-safe interval is claimed.

## 5. Measurement profiles

- [ ] Select a permitted real-measurement source and standardize definitions/units.
- [ ] Keep measured values separate from estimates and preserve actual combinations.
- [ ] Choose contrasting profiles without including personal identities.

## 6. Body experiment

- [ ] Apply one design to each profile and compare geometry and fit assumptions.
- [ ] Record supported combinations and failures.

## 7. Matrix

- [ ] Generate body × design combinations with inputs, version and results attached.
- [ ] Compare within rows, columns and rule versions, retaining failed cases.

## 8. Physical validation

- [ ] Sample selected matrix entries and record fitting corrections.
- [ ] Link corrected patterns to the originals and rerun validation.

## 9. Further uses

- [ ] Regression collection, sensitivity analysis and operating-limit map.
- [ ] Searchable configuration/pattern collection.
- [ ] Consider prediction tools only when supported by the accumulated evidence.
