# Drafting films: source and geometry review

## Bodice: supplied textbook pp. 108–110

All 16 numbered operations have a presentation step. Reference B=84 cm and
back length=38 cm. Existing drafting engines were not changed.

1. Back-length line: 38 cm, waist origin to top.
2. Rectangle width: B/2+5 = 47 cm.
3. Scye depth: B/6+7 = 21 cm below top; BL is y=17 cm.
4. Back width: B/6+4.5 = 18.5 cm from centre back.
5. Chest width: B/6+3 = 17 cm from centre front.
6. Underarm division: midway between the two width lines; projected to WL.
7. Back neck: width B/12 = 7 cm, height 7/3 cm. Construction box shown.
8. Front neck: width 6.8 cm, depth 8 cm, SNP drop 0.5 cm; half-width and
   45-degree bisector guides, with the 0.3 cm reduction, shown.
9. Back shoulder: one neck-height drop on the back-width line, extended 2 cm.
10. Front shoulder: two neck-height drop, length back shoulder minus 1.8 cm.
11. Back armhole: half-depth, half-width and 45-degree guide, with 0.5 cm addition.
12. Front armhole: half-depth and 45-degree guide based on half the BACK armhole
    width, matching the supplied text. Auxiliary front half-width line shown.
13. Side-waist correction: 2 cm toward centre back; side and back waist connected.
14. BP: half chest width, 0.7 cm toward armhole, 4 cm below BL; projections shown.
15. Front hem: half front neck width (3.4 cm) below WL; BP projection and hem shown.
16. The presentation now shows the engine convention only: half the drafted
    armhole arc plus 3 cm toward the underarm, with the arc midpoints marked.
    For provenance, the supplied source describes a different depth-based
    construction. That comparison is retained in this audit, not in the page copy.

The screenshots prescribe curve construction by landmarks, not a unique analytic
curve. The code's interpolated curves and horizontal-start back-neck arc remain
implementation choices. The film does not claim an exact traced reproduction
of the printed curve, nor that the two notch conventions are equivalent.

## Princess dress

Eight explanatory stages use the actual source bodice/skirt and exposed dress
seams, marks, construction lines and pre-rotation contour. The first skirt is
translated for side-by-side viewing; the registration stage aligns the fold
coordinates and applies the existing front lift. Subsequent stages reveal groups
of resolved engine geometry. They are not separate intermediate drafts or a
numerical simulation of dart rotation. The pre-rotation comparison is labeled.
The last stage uses `PrincessDress.laidOutPanels` and the engine's paired notches.

Page 5 photos are replaced by the drafting sequence. Page 7 retains its media
composition. The two pages intentionally no longer have identical mirrored bands.

## Playback and provenance

- Full Python source ranges remain in a scrollable solid-color panel; active
  ranges are highlighted and scrolled into view with each step.
- `update-sequence-source.py` regenerates the displayed verbatim source. If source
  line numbers change, update the step ranges in `drafting-film.js` as well.
- Play/pause, previous, next, restart and three tempos are available. Page 4 uses written rules rather than step buttons; page 5 retains direct step selection.
- Playback advances only while the chapter is visible and the document is active.
- Reduced-motion preference starts playback paused and disables drawing effects.
- Manual step selection pauses playback. Wheel scrolling the code pauses playback
  without forcing the reader back to the highlighted lines.

Browser checks cover all 43 basic-block steps; the earlier 8-stage dress sequence was also checked: nonempty geometry, finite SVG coordinates,
and nonempty code highlights. The unchanged page 8 remains the editable live
pattern demonstration; the two drafting films use the reference body.


## Four-block rule presentation

Page 4 uses the existing bodice, skirt, sleeve and trouser JavaScript engines.
The reference inputs and fixed shaping settings are explained in English;
bracketed formulas in basic-sequences.js render as red calculation spans.
There are 16 bodice, 7 skirt, 8 sleeve and 12 trouser stages. The sleeve receives
the actual front/back armhole arc lengths from the reference bodice. Skirt
length is 50 cm; sleeve length is 52 cm; trousers use the engine defaults.
The skirt's remaining waist takeout is explicitly not shown as completed darts.

The three columns remain rules, Python, geometry. Rule scrolling, code scrolling
and animation share the current step. Manual reading pauses autoplay. Hidden
blocks and offscreen players do not advance. Construction guides remain dashed
during their fade-in; outline strokes reveal continuously. Geometry is never
written back to the drafting engines or saved measurement stores.

Verified at desktop 1440 × 1000 and mobile 390 × 844: all 43 basic stages have
finite SVG coordinates, a single current rule, and nonempty source highlighting.
No page-4 step buttons or visible book references remain. Mobile document width
equals scroll width. Existing Validation suite: 17 tests passed.

## Dimension notation update

Page 4 now uses grey continuous reference lines, blue current geometry and black
completed outlines. This supersedes the earlier dashed-guide description above;
page 5 retains its existing styling. `drafting-notations.js` adds 108 notation
operations across the 43 steps without changing any engine geometry.

Each operation has a common moving marker, endpoint ticks, extension lines and
an offset label. Fractions use ticks along the measured path; angle arcs are
computed from their two directions. Curves use arc-length travel and tangent
guides where relevant. Skirt waist fractions measure horizontal spans, while
bodice notch fractions measure the actual armhole arcs. Short offsets use the
same marks, with labels farther from the crowded construction.

Operations within a step are staggered, then current outlines reveal as continuous
polylines. Dense steps extend their duration to give every operation reading time.
Pause/resume freezes the marker; hidden players suspend animation frames.
Reduced motion displays a settled annotation and the complete current geometry.
Written rules retain all explanations. Desktop and mobile browser checks covered
43 valid notation states, continuous strokes, readable offset labels and no
horizontal overflow; all 108 data operations were checked for finite coordinates.
