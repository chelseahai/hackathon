"""Refresh verbatim code used by the drafting films after editing Python sources."""
from pathlib import Path
import json

here = Path(__file__).resolve().parent
repo = here.parents[1]

def extract(path, first, last):
    lines = (repo / path).read_text(encoding="utf-8").splitlines()
    return {"path": path, "start": first, "lines": lines[first-1:last]}

data = {
    "body": extract("BasicBlock-Bodice/draft.py", 451, 537),
    "skirt": extract("BasicBlock-Skirt/draft.py", 379, 437),
    "sleeve": extract("BasicBlock-Sleeve/draft.py", 344, 425),
    "trousers": extract("BasicBlock-Trousers/draft.py", 626, 866),
    "dress": extract("GarmentDesign-PrincessLineDress/draft.py", 688, 1255),
}
(here / "sequence-source.js").write_text(
    "/* Verbatim source excerpts. Regenerate with update-sequence-source.py. */\n"
    + "window.SequenceSource = " + json.dumps(data, ensure_ascii=False) + ";\n",
    encoding="utf-8",
)
