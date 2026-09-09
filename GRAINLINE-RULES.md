# Pattern display and grainline rules

Applies to the final results on pages 4 and 5 and to future pattern families.
These rules supersede the earlier narrowest-region grainline placement.

## Pattern placement

- Preserve the engine's drafted y coordinates, scale and orientation.
- Separate pieces using horizontal translation only. Do not align their tops,
  hems or bounding boxes by moving pieces vertically.

## Grainline horizontal position

- Pants: midpoint between the two hem endpoints of each piece.
- Dresses: midpoint of each piece's horizontal width at its waistline.
- Tops: midpoint of each piece's horizontal width at its bustline.
- Sleeves: midpoint between the cuff endpoints.
- Current skirt convention: midpoint between its waist endpoints (waist-based
  placement, pending any future skirt-specific rule).

Use the actual drafted boundaries/landmarks, not the bounding-box centre,
the narrowest cross-section, or the midpoint of a curved edge's arc length.
For curved hems and cuffs, average the endpoint x coordinates.

## Grainline vertical position

- If a centre-front piece exists, use its vertical midpoint:
  `(highest outline y + lowest outline y) / 2`.
- A front bodice/skirt containing the centre-front edge is the centre-front
  reference even when its display name is simply “Front”.
- When no centre-front piece exists, use the front piece if available;
  otherwise use the first piece. This is the fallback convention for current
  trousers and the single sleeve.
- Apply this exact y midpoint to every grainline in the set.
- Use one equal, short length for the entire set, with identical upper and
  lower y coordinates. Draw a plain vertical line without arrowheads.
- Current short-length default: the smaller of 12 cm and 20% of the shortest
  piece height. If necessary, shorten all grainlines together to fit inside
  their pieces. Do not move individual lines off their category-defined axes
  or their shared vertical level to make them fit.
- If an axis at that shared level lies outside a future piece, report the
  incompatible geometry for review; do not silently substitute another axis.

## Final-result appearance

Keep the drafting layout, frame and white background. Show filled pattern
outlines, pattern names, plain grainlines and unnamed inward mark dashes.
Do not invent sewing marks for an engine that does not define them.

Implementation: `web/presentation/pattern-results.js`.
Verification: `node web/presentation/check-results.cjs`.
