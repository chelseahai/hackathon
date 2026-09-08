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
import json

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
    parser.add_argument("--config", type=Path, help="Saved browser/Python configuration JSON")
    for flag in ("waist-ease", "hip-ease", "hem-fullness", "seam-allowance"):
        parser.add_argument("--" + flag, type=float, help="Centimetres")
    parser.add_argument("--hem-distribution", type=float, nargs=4,
                        metavar=("BACK_SIDE", "BACK_PRINCESS", "FRONT_SIDE", "FRONT_PRINCESS"))
    args = parser.parse_args()

    stored = load_measurements(args.out / "measurements.json")
    config_path = args.config or args.out / "princess-dress-configuration.json"
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.exists() else {}
    if args.config and not args.config.exists():
        parser.error("Configuration file does not exist")
    if config and (config.get("schemaVersion") != 1 or config.get("units") != "cm"
                   or config.get("ruleVersion") != "princess-dress/design-v1"):
        parser.error("Unsupported configuration version or units")
    names = {"bust":"bust", "backLength":"back_length", "waist":"waist", "hip":"hip",
             "dressLength":"dress_length", "waistEase":"waist_ease", "hipEase":"hip_ease",
             "hemFullness":"hem_fullness", "hemDistribution":"hem_distribution",
             "seamAllowance":"seam_allowance"}
    values = {names[k]:stored[k] for k in ("bust","backLength","waist","hip")}
    for group, keys in {"body":["bust","backLength","waist","hip"],
                        "design":["dressLength","waistEase","hipEase","hemFullness","hemDistribution"],
                        "construction":["seamAllowance"]}.items():
        for k,v in config.get(group,{}).items():
            if k not in keys:
                parser.error("Unknown configuration field: " + group + "." + k)
            values[names[k]]=v
    for key in ("bust","back_length","waist","hip","waist_ease","hip_ease",
                "hem_fullness","hem_distribution","seam_allowance"):
        if getattr(args,key) is not None:
            values[key]=getattr(args,key)
    if args.length is not None:
        values["dress_length"]=args.length
    params = DressParams(**values)
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
        },
        args.out / "measurements.json",
    )
    config = {"schemaVersion":1, "ruleVersion":"princess-dress/design-v1", "units":"cm",
              "body":{k:getattr(params,names[k]) for k in ("bust","backLength","waist","hip")},
              "design":{k:getattr(params,names[k]) for k in ("dressLength","waistEase","hipEase","hemFullness","hemDistribution")},
              "construction":{"seamAllowance":params.seam_allowance},
              "validation":{"physicalFit":"unverified", "geometry":"Not independently checked; run Validation/run.py"}}
    (args.out / "princess-dress-configuration.json").write_text(json.dumps(config,indent=2)+"\n",encoding="utf-8")
    print(draft.report())
    print(f"  wrote {svg_path}")
    print(f"  wrote {html_path}")
    print(f"  wrote {dxf_path}")
    print(f"  wrote {args.out / 'measurements.json'}")


if __name__ == "__main__":
    main()
