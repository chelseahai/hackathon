"""Draft a princess line dress and write SVG/HTML."""

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

from draft import DressParams, draft_princess_dress
from render import write_dxf, write_html, write_svg


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Draft a princess line dress from the basic bodice and skirt blocks."
    )
    parser.add_argument("--bust", type=float, default=None, help="Bust B in cm")
    parser.add_argument("--back-length", type=float, default=None, help="Back length in cm")
    parser.add_argument("--waist", type=float, default=None, help="Waist W in cm")
    parser.add_argument("--hip", type=float, default=None, help="Hip H in cm")
    parser.add_argument("--length", type=float, default=None, help="Dress length from the waist in cm")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("output"),
        help="Directory for GarmentDesign-PrincessLineDress.svg and .html",
    )
    args = parser.parse_args()

    stored = load_measurements(args.out / "measurements.json")
    params = DressParams(
        bust=stored["bust"] if args.bust is None else args.bust,
        back_length=stored["backLength"] if args.back_length is None else args.back_length,
        waist=stored["waist"] if args.waist is None else args.waist,
        hip=stored["hip"] if args.hip is None else args.hip,
        dress_length=stored["dressLength"] if args.length is None else args.length,
        seam_allowance=stored["seamAllowance"],
    )
    draft = draft_princess_dress(params)
    args.out.mkdir(parents=True, exist_ok=True)
    svg_path = write_svg(draft, args.out / "GarmentDesign-PrincessLineDress.svg")
    html_path = write_html(draft, args.out / "GarmentDesign-PrincessLineDress.html")
    dxf_path = write_dxf(draft, args.out / "GarmentDesign-PrincessLineDress.dxf")
    save_measurements(
        {
            "bust": draft.params.bust,
            "backLength": draft.params.back_length,
            "waist": draft.params.waist,
            "hip": draft.params.hip,
            "dressLength": draft.params.dress_length,
            "seamAllowance": draft.params.seam_allowance,
        },
        args.out / "measurements.json",
    )
    print(draft.report())
    print(f"  wrote {svg_path}")
    print(f"  wrote {html_path}")
    print(f"  wrote {dxf_path}")
    print(f"  wrote {args.out / 'measurements.json'}")


if __name__ == "__main__":
    main()
