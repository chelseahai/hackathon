"""Draft a women's basic skirt block and write SVG/HTML."""

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

from draft import SkirtParams, draft_skirt
from render import write_html, write_svg


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Draft a women's basic skirt block from hip, waist, and length (p. 115)."
    )
    parser.add_argument("--hip", type=float, default=None, help="Hip H in cm")
    parser.add_argument("--waist", type=float, default=None, help="Waist W in cm")
    parser.add_argument("--length", type=float, default=None, help="Skirt length in cm")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("output"),
        help="Directory for BasicBlock-Skirt.svg and BasicBlock-Skirt.html",
    )
    args = parser.parse_args()

    stored = load_measurements(args.out / "measurements.json")
    params = SkirtParams(
        hip=stored["hip"] if args.hip is None else args.hip,
        waist=stored["waist"] if args.waist is None else args.waist,
        skirt_length=stored["skirtLength"] if args.length is None else args.length,
        seam_allowance=stored["seamAllowance"],
    )
    draft = draft_skirt(params)
    args.out.mkdir(parents=True, exist_ok=True)
    svg_path = write_svg(draft, args.out / "BasicBlock-Skirt.svg")
    html_path = write_html(draft, args.out / "BasicBlock-Skirt.html")
    save_measurements(
        {
            "hip": draft.params.hip,
            "waist": draft.params.waist,
            "skirtLength": draft.params.skirt_length,
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
