"""Shared measurement bag for pattern blocks.

JSON keys match `web/shared.js` (camelCase). Python callers pass and receive
the same keys. Body publishes frontAh / backAh; sleeve reads them.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Mapping

VERSION = 1
DEFAULT_PATH = Path("output/measurements.json")

DEFAULTS: dict[str, float] = {
    "bust": 84.0,
    "backLength": 38.0,
    "sleeveLength": 52.0,
    "hip": 90.0,
    "waist": 68.0,
    "skirtLength": 60.0,
    "dressLength": 50.0,
    "trouserLength": 98.0,
    "rise": 26.0,
    "hem": 19.0,
    "seamAllowance": 1.0,
    "frontAh": 20.5,
    "backAh": 21.0,
}


def _round(n: float) -> float:
    return round(n, 4)


def load(path: Path | None = None) -> dict[str, float]:
    path = path or DEFAULT_PATH
    values = dict(DEFAULTS)
    if not path.is_file():
        return values
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return values
    if not isinstance(raw, dict) or raw.get("v") != VERSION:
        return values
    stored = raw.get("values")
    if not isinstance(stored, dict):
        return values
    for key in DEFAULTS:
        n = stored.get(key)
        if isinstance(n, (int, float)):
            values[key] = _round(float(n))
    return values


def save(values: Mapping[str, float], path: Path | None = None) -> Path:
    path = path or DEFAULT_PATH
    current = load(path)
    for key, n in values.items():
        if key in DEFAULTS:
            current[key] = _round(float(n))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"v": VERSION, "values": current}, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def merge(path: Path | None = None, **values: float | None) -> dict[str, float]:
    """Load the bag, overlay any non-None kwargs, and return the result."""
    current = load(path)
    for key, n in values.items():
        if n is not None and key in DEFAULTS:
            current[key] = _round(float(n))
    return current
