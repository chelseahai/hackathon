# Math Dress presentation prototype

Open `index.html` through the repository's local server, at
`http://127.0.0.1:8768/web/presentation/`.

This is a separate, continuous 14-chapter presentation. The drafting application
and function-building checklist are unchanged. Chapters 4 and 8 now reuse the
existing browser drafting engines directly; other visual studies remain placeholders.

- `index.html`: chapter composition, provisional copy and media slots.
- `presentation.css`: Poppins, editorial layout, responsive stacking and motion.
- `presentation.js`: simple inline SVG stand-ins and prototype selection behavior.
- `project-live.js`: reference bodice construction stages and interactive dress inputs.
- `bodice-excerpts.js`: verbatim Python excerpts with source line numbers.

Replace `.media` contents with images or video while preserving the container's
proportions. The hero, reuse scene, runway and final scene are also media slots.
No generated photos or video are used. The chapter 4 bodice and chapter 8 dress
are calculated patterns. Other figures, patterns and matrix coordinates remain
illustrative placeholders, not physical test evidence.
The pipeline symbols are temporary glyphs rather than final logos.

The outcome explorer and fitting groups respond to hover, focus and click.
The matrix holds a selected figure at its illustrative position until another is
selected or “Return to the line” is pressed. Reduced-motion preferences disable
the transitions. Page 8 controls recalculate stitch outlines and garment widths.
They begin at the reference measurements, keep state local to this page, and do
not write to the drafting application's saved measurement or design stores.
Invalid engine combinations clear the graphic and show an error; these are
geometric demonstrations, not fit or sewability approvals. The full tools remain
available through separate links for bodice work and dress export.

Keep later media references and actual dataset values distinct from these stand-ins.
## Source relationship

`BasicBlock-Bodice/draft.py` identifies textbook pp. 108–110, matching the supplied
scans. Its browser counterpart is `web/BasicBlock-Bodice.js`. The dress engine
already uses that block and the basic skirt; no duplicate drafting equations
have been introduced in the presentation renderer.

Page 4 groups rules 1–6, 7–10, 11–12 and 13–16. Selected stages show cumulative
geometry at B=84 cm and back length=38 cm. Code excerpts are partial, verbatim
extracts, not complete standalone scripts. The curve sampling and the arc-length
notch convention are identified as implementation choices on the page.

Later integration may connect the outcome gallery and matrix to actual datasets.
