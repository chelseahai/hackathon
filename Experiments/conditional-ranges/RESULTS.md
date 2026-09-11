# Conditional ranges — first coupled study

Run: 2026-09-11T14:31:20.512878+00:00
Rule protocol: conditional-slices-v1

## What was measured

263 unique input sets: 186 screening passes, 41 screening failures and 36 rejected inputs.
15 observed transitions refined in both grid directions.

The fixed body is B84 / W68 / H90 / back length38 cm. Hip depth18 and allowance1 cm remain fixed.
Screening includes outlines, browser-source parity, ordered corresponding notches and seam-length convergence.
Export audits are recorded separately for selected examples. No result certifies physical fit.

## Slices

- Waist × hip ease: 30 grid points; {'pass': 30, 'failed': 0, 'rejected': 0}; 0 refined transitions.
- Waist ease × fullness: 30 grid points; {'pass': 30, 'failed': 0, 'rejected': 0}; 0 refined transitions.
- Length × fullness: 48 grid points; {'pass': 26, 'failed': 5, 'rejected': 17}; 13 refined transitions.
- Side allocation × fullness: 36 grid points; {'pass': 36, 'failed': 0, 'rejected': 0}; 0 refined transitions.
- Front allocation × fullness: 36 grid points; {'pass': 36, 'failed': 0, 'rejected': 0}; 2 refined transitions.

## Observed failures

- Centre back: cut_covers_stitch
- Centre front: cut_covers_stitch
- Centre front: stitch_valid; cut_covers_stitch
- Side back: cut_covers_stitch
- Side front: cut_covers_stitch
- Side front: stitch_valid; cut_covers_stitch
- ValueError: side: landmarks are not ordered along the seam
- ZeroDivisionError: float division by zero

## What this means for 0–1 controls

- Available waist intake does not reach zero inside the tested reference-body ease guards. A guard endpoint is not a measured fit limit.
- Passing runs are retained as sampled candidates with fixed context, endpoint values, maximum gaps and source records. They are not continuous safe intervals.
- Length80 cm is the exploration ceiling, not an engine maximum. The lower length region includes deliberately close and rejected probes.
- Side and front allocation coordinates are exact budget fractions on [0,1]. Their geometrically acceptable subsets depend on the other inputs; zero fullness makes the allocation observationally redundant.
- Straightness, slope, signed turn and seam mismatch are descriptors. No arbitrary straightness or fitting threshold was introduced.
- Further sampling may find additional failures or disconnected regions between current samples.
- Full inputs, source hashes, geometry hashes, seam intervals, failures and bracket widths are retained in `web/experiments/ranges.json`.

## Next decision

Review which combinations preserve the intended silhouette and which seam differences require correction. Use those decisions to define design limits separately from engine failures, then re-sample the candidate regions before exposing normalized controls.

## Independent export audit

All 7 selected samples passed the existing full engineering audit, including both DXF exporters. These samples retain 2–7 seam review flags. The audit is a subset of the sweep, not a claim about every export.

Of the 36 draft rejections, 13 hit parameter guards; 23 hit construction guards. Those construction rejections are distinct from invalid physical bodies.

At fixed reference ease/allocation and fullness 32 cm, a local length transition from failed to passing screening was bracketed at 19.28125–19.328125 cm. This is a numerical construction transition, not a wearable minimum dress length.

At fixed reference ease/allocation and fullness 80 cm, a local length transition from failed to passing screening was bracketed at 20.734375–20.78125 cm. This is a numerical construction transition, not a wearable minimum dress length.
