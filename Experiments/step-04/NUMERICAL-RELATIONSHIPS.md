# Numerical relationship graph — v2

This supersedes the visual drafting-flow graph, not the existing experiment
results or boundary protocol in `DEPENDENCIES.md`.

The graph represents physical input values and the constraints on their future
normalized ranges. It does not represent the sequence of pattern production.
Data: `web/experiments/dependencies.json`. Display: journal `#dependencies`.

## Semantics

- Large hubs organize values. Pale spokes express membership only.
- Small filled points are body measurements, design settings, fixed construction
  settings, or the explicitly identified measured response.
- Numerical connections are shared constraints with a list of participating
  values. Selecting a connector opens the entire constraint. Pairwise drawings
  are a visual projection, not separate causal claims for every pair.
- Established equation, measured response and unmeasured conditional boundary
  are different evidence categories. A formula can be known while its acceptable
  design threshold remains unknown.
- No direction arrows: a constraint may be solved for different variables, but
  the engine does not automatically change them in reverse.
- Reference values are real units/shares. No normalized safe interval is
  assigned, and changing another value must not silently change a saved input.

## Relationships

1. W, H, Ew, Eh: positive takeout requires Ew < H + Eh − W − 1. Equivalently
   Eh > W + Ew − H + 1. Hip/Hip ease each raise this intake-only Ew bound by
   one centimetre per centimetre; Waist lowers it by the same amount. The
   engine's separate caps and other validity/design conditions can be tighter.
2. W and H: current engine requires W < H. This is a support restriction, not
   an assertion that bodies outside it are invalid.
3. Length and hip depth: L > D. Keep strict endpoints explicit in normalization.
4. Four shares: nonnegative, sum one. Changing a share redistributes a common
   budget. They are not four independent scalars when the total is fixed.
5. F, side shares, L, D: side addition F*s/2; hip-to-raised-hem chord slope is
   that addition divided by L − 0.5 − D (when positive). Side-hem rise is fixed.
6. F, princess shares, L, D: edge addition F*s/4; hip-to-hem chord slope uses
   L − D. At F=0, distribution has no added-flare effect. A zero share contributes
   no fullness bound from that edge alone. No maximum slope is approved yet.
7. Waist/Hip, ease, length, F and side shares jointly affect side shaping.
   Conditional straightness limits must be sampled; no universal monotonic
   waist-ease/fullness relationship is asserted.
8. Bust/back length and design inputs affect side balance/upper geometry.
   These conditional ranges are unmeasured. The measured evidence is a separate
   two-node relationship: F32→64 caused maximum upper-knot shift ≈0.539 cm in the
   fixed reference-body experiment. It is not a derivative or safe bound.
9. Allowance and geometry-changing inputs can jointly affect cut validity.
   The current 15 passing cases at SA=1 cm do not certify a continuous range.

The measured response is not an independent control and does not join the body
measurement hub. Grouping variables into a hub creates no extra numerical edge.

## Interactions

Select/focus a value for incident constraints, a hub for member constraints,
or a hollow connector point for equation/evidence and range implications.
Filter by evidence category. The sidebar offers buttons for the same constraints
and related values. All relationships are also available in text disclosures.
Zoom and horizontal scrolling support smaller screens. Reference measurement
and configuration stores are never mutated.
