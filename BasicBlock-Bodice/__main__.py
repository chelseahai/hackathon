"""Draft a women's basic bodice block and write SVG/HTML."""

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

from draft import BodyParams, draft_body
from render import write_html, write_svg


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Draft a women's basic bodice block from bust and back length (pp. 108–110)."
    )
    parser.add_argument("--bust", type=float, default=None, help="Bust B in cm")
    parser.add_argument("--back-length", type=float, default=None, help="Back length in cm")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("output"),
        help="Directory for BasicBlock-Bodice.svg and BasicBlock-Bodice.html",
    )
    args = parser.parse_args()

    stored = load_measurements(args.out / "measurements.json")
    params = BodyParams(
        bust=stored["bust"] if args.bust is None else args.bust,
        back_length=stored["backLength"] if args.back_length is None else args.back_length,
        seam_allowance=stored["seamAllowance"],
    )
    draft = draft_body(params)
    args.out.mkdir(parents=True, exist_ok=True)
    svg_path = write_svg(draft, args.out / "BasicBlock-Bodice.svg")
    html_path = write_html(draft, args.out / "BasicBlock-Bodice.html")
    save_measurements(
        {
            "bust": draft.params.bust,
            "backLength": draft.params.back_length,
            "seamAllowance": draft.params.seam_allowance,
            "frontAh": draft.front_armhole_len,
            "backAh": draft.back_armhole_len,
        },
        args.out / "measurements.json",
    )
    print(draft.report())
    print(f"  wrote {svg_path}")
    print(f"  wrote {html_path}")
    print(f"  wrote {args.out / 'measurements.json'}")


if __name__ == "__main__":
    main()
