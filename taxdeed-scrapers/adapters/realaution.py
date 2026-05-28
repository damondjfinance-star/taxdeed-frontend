import os
import re
import psycopg
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
from .base import BaseAdapter

load_dotenv()

UPSERT_SQL = """
    INSERT INTO auctions (
        parcel_id, county, platform, auction_date, opening_bid,
        property_address, auction_status, auction_url
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (parcel_id, county)
    DO UPDATE SET
        auction_date     = EXCLUDED.auction_date,
        opening_bid      = EXCLUDED.opening_bid,
        property_address = EXCLUDED.property_address,
        auction_status   = EXCLUDED.auction_status,
        auction_url      = EXCLUDED.auction_url,
        updated_at       = NOW();
"""


def _parse_bid(raw: str) -> float | None:
    cleaned = re.sub(r"[^\d.]", "", raw)
    return float(cleaned) if cleaned else None


class RealAuctionAdapter(BaseAdapter):
    def run(self, county_config: dict) -> None:
        county = county_config["county"]
        url = county_config["url"]

        listings = self._scrape(url, county)
        print(f"[{county}] Found {len(listings)} listings.")

        if listings:
            self._upsert(listings, county)

    def _scrape(self, url: str, county: str) -> list[dict]:
        listings = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=60_000)

            # RealAuction pages load auction rows in a table after JS renders.
            page.wait_for_selector("table.AUCTION_ITEM, .AUCTION_ITEM", timeout=30_000)

            rows = page.query_selector_all("table.AUCTION_ITEM tr, .AUCTION_ITEM")
            for row in rows:
                try:
                    listing = self._extract_row(page, row, url)
                    if listing:
                        listings.append(listing)
                except Exception as exc:
                    print(f"[{county}] Row parse error: {exc}")

            browser.close()

        return listings

    def _extract_row(self, page, row, base_url: str) -> dict | None:
        cells = row.query_selector_all("td")
        if len(cells) < 4:
            return None

        texts = [c.inner_text().strip() for c in cells]

        # Column order varies by county; fall back to positional defaults.
        auction_date     = texts[0] if len(texts) > 0 else ""
        parcel_id        = texts[1] if len(texts) > 1 else ""
        opening_bid_raw  = texts[2] if len(texts) > 2 else ""
        property_address = texts[3] if len(texts) > 3 else ""
        auction_status   = texts[4] if len(texts) > 4 else "scheduled"

        if not parcel_id:
            return None

        # Grab detail page link if present.
        link_el = row.query_selector("a[href]")
        auction_url = base_url
        if link_el:
            href = link_el.get_attribute("href") or ""
            auction_url = href if href.startswith("http") else base_url.rstrip("/") + "/" + href.lstrip("/")

        return {
            "auction_date":     auction_date or None,
            "parcel_id":        parcel_id,
            "opening_bid":      _parse_bid(opening_bid_raw),
            "property_address": property_address,
            "auction_status":   auction_status or "scheduled",
            "auction_url":      auction_url,
        }

    def _upsert(self, listings: list[dict], county: str) -> None:
        conn = psycopg.connect(os.environ["DATABASE_URL"])
        try:
            with conn:
                with conn.cursor() as cur:
                    for item in listings:
                        cur.execute(UPSERT_SQL, (
                            item["parcel_id"],
                            county,
                            "realaution",
                            item["auction_date"],
                            item["opening_bid"],
                            item["property_address"],
                            item["auction_status"],
                            item["auction_url"],
                        ))
            print(f"[{county}] Upserted {len(listings)} records.")
        finally:
            conn.close()
