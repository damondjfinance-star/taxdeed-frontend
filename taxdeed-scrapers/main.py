import sys
import json
from pathlib import Path

if sys.version_info >= (3, 13):
    print(
        f"WARNING: Python {sys.version_info.major}.{sys.version_info.minor} detected.\n"
        "psycopg and several other dependencies require Python 3.11 or 3.12.\n"
        "Run: py -3.12 main.py  (or install Python 3.12 from python.org)"
    )
    sys.exit(1)

from adapters.realaution import RealAuctionAdapter

ADAPTER_MAP = {
    "realaution": RealAuctionAdapter,
}


def main() -> None:
    counties_path = Path(__file__).parent / "counties.json"
    counties = json.loads(counties_path.read_text())

    for county_config in counties:
        platform = county_config.get("platform")
        adapter_cls = ADAPTER_MAP.get(platform)

        if adapter_cls is None:
            print(f"[SKIP] No adapter for platform '{platform}' ({county_config.get('county')})")
            continue

        print(f"[START] Scraping {county_config['county']} via {platform}...")
        try:
            adapter_cls().run(county_config)
        except Exception as exc:
            print(f"[ERROR] {county_config['county']}: {exc}")


if __name__ == "__main__":
    main()
