# 2608-01

Women's patterns in two layers: basic blocks, then garment designs converted from those blocks.

```
BasicBlock-Bodice/
BasicBlock-Sleeve/
BasicBlock-Skirt/
BasicBlock-Trousers/
GarmentDesign-PrincessLineDress/
Export-DXF/
shared/
web/
```

Python geometry lives in each folder as `draft.py` (Python cannot import a hyphenated module name). Run from the repo root:

```
python BasicBlock-Bodice
python BasicBlock-Sleeve
python BasicBlock-Skirt
python BasicBlock-Trousers
python GarmentDesign-PrincessLineDress
```

Cuttable DXF export lives in `Export-DXF/` (see `Export-DXF/HOW-IT-WORKS.txt`). The princess line dress writes a `.dxf` next to its SVG/HTML, and the live dress page has Export DXF.

The live pages are under `web/`:

- [BasicBlock-Bodice.html](web/BasicBlock-Bodice.html)
- [BasicBlock-Sleeve.html](web/BasicBlock-Sleeve.html)
- [BasicBlock-Skirt.html](web/BasicBlock-Skirt.html)
- [BasicBlock-Trousers.html](web/BasicBlock-Trousers.html)
- [GarmentDesign-PrincessLineDress.html](web/GarmentDesign-PrincessLineDress.html)
