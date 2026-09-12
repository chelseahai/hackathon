# Fitted and relaxed silhouette policy — v1

Approved design intent: preserve fitted and relaxed as separate families.

## Waist-shaping boundary

Let `A = H + Eh − W − 1`, the back takeout available at zero waist ease.
Retained shaping is `R = (A − Ew) / A`.

- Fitted: `R >= 0.75`.
- Relaxed: `0 < R < 0.75`.
- At the fitted/relaxed boundary: `Ew = 0.25 × A`.

On the reference body (W68, H90) with hip ease4, `A=25`, so fitted waist
ease is 0–6.25 cm inclusive. Relaxed waist ease is above6.25 through the
current engine cap of12 cm. Changing the body or hip ease recomputes this
boundary; 6.25 cm is not a universal size rule.

## Lower-volume boundary

For each side or princess lower edge, calculate the outward addition divided by
the available vertical distance from hip to hem. The maximum permitted chord
angle from vertical is45 degrees, so the maximum permitted ratio is1.

- Side edge: `(F × side share / 2) / (L − D − side hem rise) <= 1`.
- Princess edge: `(F × princess share / 4) / (L − D) <= 1`.

All affected edges must pass. This produces conditional limits for fullness,
length, side allocation and front allocation. On the reference configuration,
the minimum length allowed by this design rule is22.5 cm and the engine’s
fullness cap80 cm remains tighter than the45-degree rule at length50.

## Status and normalization

The policy module returns the family, retained shaping, maximum lower angle,
failure reasons and conditional intervals. A sample is usable only when it
passes both construction screening and this design policy. Physical fit remains
unverified.

Finite, nonempty intervals can be mapped to0–1 while retaining the physical
amount, interval, family, fixed context and policy version. Open endpoints cannot
be represented as0 or1. Length currently has no approved upper design boundary,
so it does not yet have a complete normalized interval. The 80 cm sampling edge
is not promoted to a design limit.
