"""Draft a women's basic sleeve block and write SVG/HTML."""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_PKG = Path(__file__).resolve().parent
for _p in (_PKG, _ROOT):
    _s = str(_p)
    if _s not in sys.path:
        sys.path.insert(0, _s)

import argparse

from shared.measurements import load as load_measurements
from shared.measurements import save as save_measurements

from draft import SleeveParams, draft_sleeve
from render import write_html, write_svg


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Draft a women's basic sleeve block from armhole and length (pp. 111–112)."
    )
    parser.add_argument("--front-ah", type=float, default=None, help="Front armhole A→C in cm")
    parser.add_argument("--back-ah", type=float, default=None, help="Back armhole B→C in cm")
    parser.add_argument("--ah", type=float, default=None, help="Total AH; default is front+back")
    parser.add_argument("--length", type=float, default=None, help="Sleeve length in cm")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("output"),
        help="Directory for BasicBlock-Sleeve.svg and BasicBlock-Sleeve.html",
    )
    args = parser.parse_args()

    stored = load_measurements(args.out / "measurements.json")
    params = SleeveParams(
        front_ah=stored["frontAh"] if args.front_ah is None else args.front_ah,
        back_ah=stored["backAh"] if args.back_ah is None else args.back_ah,
        sleeve_length=stored["sleeveLength"] if args.length is None else args.length,
        ah=args.ah,
        seam_allowance=stored["seamAllowance"],
    )
    draft = draft_sleeve(params)
    args.out.mkdir(parents=True, exist_ok=True)
    svg_path = write_svg(draft, args.out / "BasicBlock-Sleeve.svg")
    html_path = write_html(draft, args.out / "BasicBlock-Sleeve.html")
    save_measurements(
        {
            "frontAh": draft.params.front_ah,
            "backAh": draft.params.back_ah,
            "sleeveLength": draft.params.sleeve_length,
            "seamAllowance": draft.params.seam_allowance,
        },
        args.out / "measurements.json",
    )
    print(draft.report())
    print(f"  wrote {svg_path}")
    print(f"  wrote {html_path}")
    print(f"  wrote {args.out / 'measurements.json'}")


if __name__ == "__main__":
    main()
