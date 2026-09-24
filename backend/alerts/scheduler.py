import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from backend.database.db import SessionLocal
from backend.database.crud import get_all_watchlists, update_watchlist_check, record_price_history, get_setting
from backend.scrapers.google_flights import fetch_live_flights
from backend.alerts.notifier import send_telegram_alert, send_line_alert, send_discord_alert
from backend.config import DEFAULT_TRACK_INTERVAL_HOURS

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def check_watchlist_prices():
    """Background task: Scans all active watchlists and sends notifications when prices drop."""
    logger.info("🔍 Running automated price tracker for active watchlists...")
    db: Session = SessionLocal()
    try:
        watchlists = get_all_watchlists(db, active_only=True)
        if not watchlists:
            logger.info("No active watchlists to check.")
            return

        tg_token = get_setting(db, "TELEGRAM_BOT_TOKEN")
        tg_chat_id = get_setting(db, "TELEGRAM_CHAT_ID")
        line_token = get_setting(db, "LINE_NOTIFY_TOKEN")
        discord_webhook = get_setting(db, "DISCORD_WEBHOOK_URL")

        for item in watchlists:
            try:
                offers = await fetch_live_flights(
                    origin=item.origin,
                    destination=item.destination,
                    departure_date=item.departure_date,
                    return_date=item.return_date
                )
                if not offers:
                    continue

                best_offer = offers[0]
                lowest_price = best_offer["price"]
                airline = best_offer["airline"]
                booking_url = best_offer["booking_url"]
                trip_url = best_offer.get("trip_url")

                # Record history
                record_price_history(
                    db=db,
                    origin=item.origin,
                    destination=item.destination,
                    departure_date=item.departure_date,
                    return_date=item.return_date,
                    lowest_price=lowest_price,
                    airline=airline
                )

                # Update watchlist last checked
                update_watchlist_check(db, item.id, lowest_price)

                # Check if price meets target budget
                if lowest_price <= item.target_price:
                    logger.info(f"🎯 Target hit for {item.origin}->{item.destination}: {lowest_price} THB (Target: {item.target_price})")

                    if item.notify_telegram and tg_token and tg_chat_id:
                        await send_telegram_alert(
                            token=tg_token,
                            chat_id=tg_chat_id,
                            title=item.title,
                            origin=item.origin,
                            destination=item.destination,
                            departure_date=item.departure_date,
                            return_date=item.return_date,
                            airline=airline,
                            price=lowest_price,
                            booking_url=booking_url,
                            trip_url=trip_url
                        )

                    if item.notify_line and line_token:
                        await send_line_alert(
                            token=line_token,
                            title=item.title,
                            origin=item.origin,
                            destination=item.destination,
                            departure_date=item.departure_date,
                            return_date=item.return_date,
                            airline=airline,
                            price=lowest_price,
                            booking_url=booking_url
                        )

                    if discord_webhook:
                        await send_discord_alert(
                            webhook_url=discord_webhook,
                            origin=item.origin,
                            destination=item.destination,
                            departure_date=item.departure_date,
                            return_date=item.return_date,
                            airline=airline,
                            price=lowest_price,
                            booking_url=booking_url
                        )

            except Exception as e:
                logger.error(f"Error checking watchlist ID {item.id}: {e}")

    finally:
        db.close()

def start_scheduler():
    """Start background periodic price tracker."""
    if not scheduler.running:
        scheduler.add_job(
            check_watchlist_prices,
            "interval",
            hours=DEFAULT_TRACK_INTERVAL_HOURS,
            id="flight_price_tracker",
            replace_existing=True,
            next_run_time=datetime.now() # run immediately on startup
        )
        scheduler.start()
        logger.info(f"✅ Flight price tracker scheduler started (Interval: {DEFAULT_TRACK_INTERVAL_HOURS} hours)")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
