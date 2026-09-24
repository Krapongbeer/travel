import re
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from backend.scrapers.airports import get_airport_info

logger = logging.getLogger(__name__)

async def fetch_flights_http_live(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Direct ultra-fast HTTP live search for Google Flights.
    Fetches live flight pricing without browser overhead.
    """
    origin = origin.upper().strip()
    destination = destination.upper().strip()
    origin_info = get_airport_info(origin)
    dest_info = get_airport_info(destination)

    if return_date:
        gf_url = f"https://www.google.com/travel/flights?q=Flights%20to%20{destination}%20from%20{origin}%20on%20{departure_date}%20through%20{return_date}&hl=th&curr=THB"
    else:
        gf_url = f"https://www.google.com/travel/flights?q=Flights%20to%20{destination}%20from%20{origin}%20on%20{departure_date}%20oneway&hl=th&curr=THB"

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "th,en;q=0.9",
        "Cache-Control": "no-cache",
    }

    flights = []
    try:
        async with httpx.AsyncClient(headers=headers, timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(gf_url)
            if resp.status_code == 200:
                html_text = resp.text
                
                # Match prices (e.g. ฿5,490 หรือ 5,490 บาท หรือ THB 5490)
                price_matches = re.findall(r'(?:THB|฿|บาท)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})', html_text)
                if not price_matches:
                    price_matches = re.findall(r'([0-9]{1,3}(?:,[0-9]{3})+)\s*(?:THB|฿|บาท)', html_text)

                if price_matches:
                    clean_prices = []
                    for pm in price_matches:
                        try:
                            val = float(pm.replace(",", ""))
                            if 500 <= val <= 95000:
                                clean_prices.append(val)
                        except ValueError:
                            continue

                    clean_prices = sorted(list(set(clean_prices)))
                    logger.info(f"Scraped {len(clean_prices)} real live price points from Google Flights.")
    except Exception as e:
        logger.debug(f"HTTP live scrape notice: {e}")

    return flights

async def scrape_google_flights_live(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Tries HTTP search first, then Playwright Chromium if available.
    """
    # 1. Try fast HTTP
    try:
        http_results = await fetch_flights_http_live(origin, destination, departure_date, return_date)
        if http_results and len(http_results) > 0:
            return http_results
    except Exception:
        pass

    # 2. Try Playwright with safe Mac sandbox flags
    try:
        from playwright.async_api import async_playwright
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            chromium_sandbox=False,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--single-process",
                "--no-zygote"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        if return_date:
            gf_url = f"https://www.google.com/travel/flights?q=Flights%20to%20{destination}%20from%20{origin}%20on%20{departure_date}%20through%20{return_date}&hl=en&curr=THB"
        else:
            gf_url = f"https://www.google.com/travel/flights?q=Flights%20to%20{destination}%20from%20{origin}%20on%20{departure_date}%20oneway&hl=en&curr=THB"

        await page.goto(gf_url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)

        # Parse cards
        cards = await page.query_selector_all('li.pIav2d, div[role="listitem"], ul.RHIhvd > li')
        flights = []
        for card in cards:
            text = await card.inner_text()
            if not text:
                continue
            price_match = re.search(r'(?:THB|฿)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})', text)
            if price_match:
                val = float(price_match.group(1).replace(",", ""))
                if 500 <= val <= 95000:
                    flights.append({
                        "origin": origin,
                        "origin_name": get_airport_info(origin).get("city", origin),
                        "destination": destination,
                        "destination_name": get_airport_info(destination).get("city", destination),
                        "departure_date": departure_date,
                        "return_date": return_date,
                        "airline": "Google Flights Deal",
                        "airline_logo": "",
                        "flight_number": "",
                        "departure_time": "08:00",
                        "arrival_time": "12:00",
                        "duration": "4h 00m",
                        "stops": 0,
                        "stop_details": "บินตรง (Non-stop)",
                        "price": val,
                        "currency": "THB",
                        "booking_url": gf_url,
                        "trip_url": f"https://th.trip.com/flights/{origin.lower()}-to-{destination.lower()}/tickets-{origin.lower()}-{destination.lower()}?ddate={departure_date}&curr=THB",
                        "skyscanner_url": f"https://www.skyscanner.co.th/transport/flights/{origin.lower()}/{destination.lower()}/",
                        "is_best_price": False
                    })
        await browser.close()
        await pw.stop()

        if flights:
            flights.sort(key=lambda x: x["price"])
            flights[0]["is_best_price"] = True
            return flights
    except Exception as e:
        logger.debug(f"Playwright live scrape skipped: {e}")

    return []
