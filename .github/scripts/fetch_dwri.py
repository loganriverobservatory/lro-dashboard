"""
Reads config/station_config.yaml, validates it, fetches live flow data from
Utah's Division of Water Rights (DVRT) for every active DWRi station, and
prints a single combined JSON document to stdout.

Usage:
  python .github/scripts/fetch_dwri.py                  # full run, prints JSON
  python .github/scripts/fetch_dwri.py --validate-only   # just check the config file

A bad edit to station_config.yaml causes this script to exit non-zero and
print nothing — the workflow that calls this script must NOT overwrite the
previously committed output file when that happens, so the site keeps
serving the last known-good data instead of breaking.
"""

import sys
import time
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests
import yaml

CONFIG_PATH = Path("config/station_config.yaml")
DVRT_URL = "https://www.waterrights.utah.gov/dvrtdb/realtime-chart.asp"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; LRO-Dashboard/1.0; +https://github.com/loganriverobservatory/lro-dashboard)",
}
HISTORY_DAYS = 2  # how far back to ask DVRT for readings (covers the 48hr sparkline window)
REQUEST_DELAY_SECONDS = 0.5  # politeness delay between stations — DVRT returns HTTP 500 if hit too fast


class ConfigError(Exception):
    """Raised when station_config.yaml fails validation."""


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def validate_config(config):
    """Check the human-edited config for common mistakes before touching anything else.
    Every message here is meant to be read by a non-developer editing the YAML directly."""
    errors = []

    waterway_names = {g["name"] for g in config.get("waterway_groups", [])}
    schematic_names = {g["name"] for g in config.get("schematic_groups", [])}

    seen_dwri_ids = set()
    for station in config.get("dwri_stations", []):
        label = f"DWRi station '{station.get('displayName', '?')}' (id {station.get('id', '?')})"

        station_id = station.get("id")
        if not isinstance(station_id, int):
            errors.append(f"{label}: id must be a number, got {station_id!r}")
        elif station_id in seen_dwri_ids:
            errors.append(f"{label}: duplicate id {station_id} — another station already uses it")
        else:
            seen_dwri_ids.add(station_id)

        if station.get("group") not in waterway_names:
            errors.append(
                f"{label}: group {station.get('group')!r} doesn't match any waterway_groups name "
                f"(expected one of: {sorted(waterway_names)})"
            )

        if station.get("schematicGroup") not in schematic_names:
            errors.append(
                f"{label}: schematicGroup {station.get('schematicGroup')!r} doesn't match any "
                f"schematic_groups name (expected one of: {sorted(schematic_names)})"
            )

        lat, lng = station.get("lat"), station.get("lng")
        if not (isinstance(lat, (int, float)) and 40 <= lat <= 43):
            errors.append(f"{label}: lat {lat!r} looks wrong (expected roughly 40-43 for northern Utah)")
        if not (isinstance(lng, (int, float)) and -113 <= lng <= -110):
            errors.append(f"{label}: lng {lng!r} looks wrong (expected roughly -113 to -110 for northern Utah)")

    seen_usgs_ids = set()
    for station in config.get("usgs_stations", []):
        label = f"USGS station '{station.get('displayName', '?')}' (id {station.get('id', '?')})"
        station_id = station.get("id")
        if station_id in seen_usgs_ids:
            errors.append(f"{label}: duplicate id {station_id}")
        else:
            seen_usgs_ids.add(station_id)

    if errors:
        raise ConfigError(
            f"station_config.yaml has {len(errors)} problem(s) - fix these and try again:\n  - "
            + "\n  - ".join(errors)
        )


def fetch_station_history(station_id):
    """Ask DVRT for the last couple days of readings for one station.

    DVRT's end_date is inclusive only through midnight (00:00) of that date,
    not through the end of it — so today's actual readings never come back
    unless end_date is set to tomorrow.
    """
    params = {
        "station_id": station_id,
        "f": "json",
        "begin_date": (date.today() - timedelta(days=HISTORY_DAYS)).isoformat(),
        "end_date": (date.today() + timedelta(days=1)).isoformat(),
    }
    response = requests.get(DVRT_URL, params=params, headers=HEADERS, timeout=10)
    response.raise_for_status()
    values = response.json().get("values", [])

    return [
        {"time": v["datetime"], "value": float(v["value"])}
        for v in values
        if v.get("value") not in (None, "")
    ]


def fetch_all_dwri_stations(stations):
    """Fetch live history for every active DWRi station. A single station failing
    doesn't take down the others — it just falls back to null/empty for that one."""
    results = []
    failures = 0

    for station in stations:
        entry = {
            "id": station["id"],
            "displayName": station["displayName"],
            "group": station["group"],
            "schematicGroup": station["schematicGroup"],
            "lat": station["lat"],
            "lng": station["lng"],
            "latestCfs": None,
            "latestTime": None,
            "history": [],
        }
        try:
            history = fetch_station_history(station["id"])
            if history:
                entry["history"] = history
                entry["latestCfs"] = history[-1]["value"]
                entry["latestTime"] = history[-1]["time"]
        except Exception as err:
            failures += 1
            print(f"WARNING: station {station['id']} ({station['displayName']}) failed: {err}", file=sys.stderr)

        results.append(entry)
        time.sleep(REQUEST_DELAY_SECONDS)

    if stations and failures == len(stations):
        raise RuntimeError("Every active DWRi station failed to fetch — DVRT is likely down. Refusing to write output.")

    return results


def build_output(config):
    active_dwri = [s for s in config.get("dwri_stations", []) if s.get("active", True)]
    active_usgs = [s for s in config.get("usgs_stations", []) if s.get("active", True)]

    return {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "waterwayGroups": config.get("waterway_groups", []),
        "schematicGroups": config.get("schematic_groups", []),
        "schematicLayout": config.get("schematic_layout", {}),
        "hiddenStations": config.get("hidden_stations", []),
        "displayNames": config.get("display_names", {}),
        "usgsStations": active_usgs,
        "dwriStations": fetch_all_dwri_stations(active_dwri),
    }


def main():
    validate_only = "--validate-only" in sys.argv

    config = load_config()
    validate_config(config)

    if validate_only:
        print("station_config.yaml is valid.")
        return

    output = build_output(config)
    sys.stdout.write(json.dumps(output, indent=2) + "\n")


if __name__ == "__main__":
    try:
        main()
    except (ConfigError, RuntimeError) as err:
        print(f"ERROR: {err}", file=sys.stderr)
        sys.exit(1)
