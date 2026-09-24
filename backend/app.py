import os
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from backend.config import BASE_DIR
from backend.database.db import get_db, init_db
from backend.database import crud
from backend.scrapers.airports import ASIAN_AIRPORTS, POPULAR_ROUTES, get_airport_info
from backend.scrapers.google_flights import fetch_live_flights, fetch_price_grid, get_time_slots
from backend.alerts.notifier import send_telegram_alert, send_line_alert, send_discord_alert
from backend.alerts.scheduler import start_scheduler, shutdown_scheduler, check_watchlist_prices
from backend.autobooking.autofill import generate_autofill_script, launch_autofill_browser
from backend.utils.exporter import export_flights_to_excel, export_flights_to_csv
from backend.utils.security import decrypt_passport, mask_passport

# Setup Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Initialize DB
init_db()

app = FastAPI(
    title="AirPrice - Asian Flight Deals & Auto-Tracker",
    description="Search, track, alert and auto-fill flight bookings for Asian destinations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup & Shutdown Events
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up AirPrice server...")
    try:
        start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler could not be started: {e}")

@app.on_event("shutdown")
def shutdown_event():
    shutdown_scheduler()

# --- Pydantic Schemas ---
class SearchRequest(BaseModel):
    origin: str
    destination: str
    departure_date: str
    return_date: Optional[str] = None
    adults: int = 1
    children: int = 0
    infants: int = 0

class WatchlistCreate(BaseModel):
    title: Optional[str] = None
    origin: str
    destination: str
    departure_date: str
    return_date: Optional[str] = None
    target_price: float
    notify_telegram: bool = True
    notify_line: bool = True

class PassengerCreate(BaseModel):
    first_name: str
    last_name: str
    title: str = "Mr"
    date_of_birth: str
    gender: str = "M"
    nationality: str = "Thai"
    passport_number: Optional[str] = None
    passport_expiry: Optional[str] = None
    email: str
    phone_number: str
    is_default: bool = False

class AutoBookLaunchRequest(BaseModel):
    booking_url: str
    passenger_ids: Optional[List[int]] = None


class SettingsUpdate(BaseModel):
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    line_notify_token: Optional[str] = None
    discord_webhook_url: Optional[str] = None

class TestAlertRequest(BaseModel):
    channel: str  # 'telegram' | 'line' | 'discord'


# --- API Endpoints ---

@app.get("/api/airports")
def get_airports():
    """Get list of Asian airports and popular routes."""
    airport_list = [
        {"code": code, **info}
        for code, info in ASIAN_AIRPORTS.items()
    ]
    return {
        "airports": airport_list,
        "popular_routes": POPULAR_ROUTES
    }

@app.post("/api/search")
async def search_flights(req: SearchRequest, db: Session = Depends(get_db)):
    """Search flight offers across Asian routes and save history."""
    if not req.origin or not req.destination or not req.departure_date:
        raise HTTPException(status_code=400, detail="Missing required search parameters.")

    if req.return_date and req.return_date < req.departure_date:
        raise HTTPException(
            status_code=400,
            detail="วันเดินทางกลับต้องไม่ย้อนหลังวันเดินทางไป (Return date cannot be earlier than departure date)"
        )

    total_pax = max(1, req.adults + req.children + req.infants)
    search_id = f"{req.origin}_{req.destination}_{req.departure_date}_{int(datetime.utcnow().timestamp())}"
    offers = await fetch_live_flights(
        origin=req.origin,
        destination=req.destination,
        departure_date=req.departure_date,
        return_date=req.return_date,
        adults=req.adults,
        children=req.children,
        infants=req.infants
    )

    # Calculate total price if multiple passengers
    for offer in offers:
        offer["price_per_person"] = offer["price"]
        offer["price_total"] = offer["price"] * total_pax
        offer["adults"] = req.adults
        offer["children"] = req.children
        offer["infants"] = req.infants
        offer["total_passengers"] = total_pax

    if offers:
        # Save to flight_offers
        crud.save_flight_offers(db, offers, search_id)

        # Record lowest price history
        lowest = offers[0]
        crud.record_price_history(
            db=db,
            origin=req.origin,
            destination=req.destination,
            departure_date=req.departure_date,
            return_date=req.return_date,
            lowest_price=lowest["price"],
            airline=lowest["airline"]
        )

    return {
        "search_id": search_id,
        "origin": get_airport_info(req.origin),
        "destination": get_airport_info(req.destination),
        "departure_date": req.departure_date,
        "return_date": req.return_date,
        "adults": req.adults,
        "children": req.children,
        "infants": req.infants,
        "total_passengers": total_pax,
        "total_results": len(offers),
        "lowest_price": offers[0]["price"] if offers else None,
        "offers": offers
    }

@app.get("/api/history")
def get_history(origin: str, destination: str, departure_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Get price history for trend graphs."""
    history = crud.get_price_history(db, origin, destination, departure_date)

@app.get("/api/price-grid")
async def get_price_grid(
    origin: str,
    destination: str,
    center_date: str,
    return_date: Optional[str] = None,
    adults: int = 1,
    days: int = 7
):
    """Get price for ±days/2 days around center_date — powers the date price strip."""
    grid = await fetch_price_grid(
        origin=origin.upper(),
        destination=destination.upper(),
        center_date=center_date,
        return_date=return_date,
        adults=adults,
        days=days
    )
    return {"grid": grid, "center_date": center_date}

@app.get("/api/time-slots")
def get_time_slots_api(
    airline: str,
    airline_code: str = "",
    origin: str = "BKK",
    destination: str = "NRT",
    departure_date: str = "",
    return_date: Optional[str] = None,
    adults: int = 1
):
    """Get available time slots for a specific airline on a specific day."""
    slots = get_time_slots(
        airline_name=airline,
        airline_code=airline_code,
        origin=origin.upper(),
        destination=destination.upper(),
        departure_date=departure_date,
        return_date=return_date,
        adults=adults
    )
    return {"slots": slots, "airline": airline, "date": departure_date}

@app.get("/api/history")
def get_history(origin: str, destination: str, departure_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Get price history for trend graphs."""
    history = crud.get_price_history(db, origin, destination, departure_date)
    return [
        {
            "id": h.id,
            "origin": h.origin,
            "destination": h.destination,
            "departure_date": h.departure_date,
            "lowest_price": h.lowest_price,
            "airline": h.airline,
            "recorded_at": h.recorded_at.strftime("%Y-%m-%d %H:%M")
        }
        for h in history
    ]

# --- Watchlists ---
@app.get("/api/watchlists")
def list_watchlists(db: Session = Depends(get_db)):
    items = crud.get_all_watchlists(db)
    return [
        {
            "id": w.id,
            "title": w.title,
            "origin": w.origin,
            "destination": w.destination,
            "departure_date": w.departure_date,
            "return_date": w.return_date,
            "target_price": w.target_price,
            "current_lowest_price": w.current_lowest_price,
            "is_active": w.is_active,
            "notify_telegram": w.notify_telegram,
            "notify_line": w.notify_line,
            "last_checked_at": w.last_checked_at.strftime("%Y-%m-%d %H:%M") if w.last_checked_at else None,
            "created_at": w.created_at.strftime("%Y-%m-%d")
        }
        for w in items
    ]

@app.post("/api/watchlists")
def add_watchlist(req: WatchlistCreate, db: Session = Depends(get_db)):
    item = crud.create_watchlist(
        db=db,
        origin=req.origin,
        destination=req.destination,
        departure_date=req.departure_date,
        return_date=req.return_date,
        target_price=req.target_price,
        title=req.title,
        notify_telegram=req.notify_telegram,
        notify_line=req.notify_line
    )
    return {"success": True, "id": item.id}

@app.delete("/api/watchlists/{watchlist_id}")
def remove_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    success = crud.delete_watchlist(db, watchlist_id)
    return {"success": success}

@app.post("/api/watchlists/check-now")
async def trigger_price_check():
    """Manually trigger background price checker right now."""
    await check_watchlist_prices()
    return {"success": True, "message": "Triggered price scan for active watchlists."}

# --- Passenger Profiles & Auto-Booking ---
@app.get("/api/passengers")
def list_passengers(db: Session = Depends(get_db)):
    profiles = crud.get_passenger_profiles(db)
    result = []
    for p in profiles:
        result.append({
            "id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "title": p.title,
            "date_of_birth": p.date_of_birth,
            "gender": p.gender,
            "nationality": p.nationality,
            "passport_number": mask_passport(decrypt_passport(p.passport_number)),  # masked for display
            "passport_expiry": p.passport_expiry,
            "email": p.email,
            "phone_number": p.phone_number,
            "is_default": p.is_default,
        })
    return result

@app.post("/api/passengers")
def add_passenger(req: PassengerCreate, db: Session = Depends(get_db)):
    profile = crud.save_passenger_profile(db, req.dict())
    return {"success": True, "id": profile.id}

@app.delete("/api/passengers/{passenger_id}")
def delete_passenger(passenger_id: int, db: Session = Depends(get_db)):
    success = crud.delete_passenger_profile(db, passenger_id)
    return {"success": success}

@app.get("/api/autobook/script")
def get_autofill_bookmarklet(passenger_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Generate Auto-fill script for browser bookmarklet (single or all passengers)."""
    profiles = crud.get_passenger_profiles(db)
    if passenger_id:
        target_passengers = [p for p in profiles if p.id == passenger_id]
    else:
        target_passengers = profiles

    if not target_passengers:
        p_list = [{
            "first_name": "SOMCHAI",
            "last_name": "DEEDEE",
            "email": "user@example.com",
            "phone_number": "0812345678",
            "passport_number": "",
            "date_of_birth": "",
            "gender": "M"
        }]
    else:
        p_list = [
            {
                "first_name": p.first_name,
                "last_name": p.last_name,
                "email": p.email,
                "phone_number": p.phone_number,
                "passport_number": decrypt_passport(p.passport_number) or "",  # DECRYPT for autofill
                "date_of_birth": p.date_of_birth or "",
                "gender": p.gender or "M"
            }
            for p in target_passengers
        ]

    script = generate_autofill_script(p_list)
    return {"script": script, "passenger_count": len(p_list)}

@app.post("/api/autobook/launch")
async def launch_autofill(req: AutoBookLaunchRequest, db: Session = Depends(get_db)):
    """Launch automated browser with Multi-Passenger Auto-fill helper."""
    profiles = crud.get_passenger_profiles(db)
    if req.passenger_ids:
        target_passengers = [p for p in profiles if p.id in req.passenger_ids]
    else:
        target_passengers = profiles

    p_list = [
        {
            "first_name": p.first_name,
            "last_name": p.last_name,
            "email": p.email,
            "phone_number": p.phone_number,
            "passport_number": decrypt_passport(p.passport_number) or "",  # DECRYPT for autofill
            "date_of_birth": p.date_of_birth or "",
            "gender": p.gender or "M"
        }
        for p in target_passengers
    ]
    result = await launch_autofill_browser(req.booking_url, p_list)
    return result



# --- Data Export ---
@app.post("/api/export/excel")
async def export_excel(req: SearchRequest):
    offers = await fetch_live_flights(req.origin, req.destination, req.departure_date, req.return_date)
    excel_bytes = export_flights_to_excel(offers)
    filename = f"flights_{req.origin}_{req.destination}_{req.departure_date}.xlsx"
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/api/export/csv")
async def export_csv(req: SearchRequest):
    offers = await fetch_live_flights(req.origin, req.destination, req.departure_date, req.return_date)
    csv_str = export_flights_to_csv(offers)
    filename = f"flights_{req.origin}_{req.destination}_{req.departure_date}.csv"
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- System Settings & Test Alerts ---
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    return {
        "telegram_bot_token": crud.get_setting(db, "TELEGRAM_BOT_TOKEN"),
        "telegram_chat_id": crud.get_setting(db, "TELEGRAM_CHAT_ID"),
        "line_notify_token": crud.get_setting(db, "LINE_NOTIFY_TOKEN"),
        "discord_webhook_url": crud.get_setting(db, "DISCORD_WEBHOOK_URL")
    }

@app.post("/api/settings")
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db)):
    if req.telegram_bot_token is not None:
        crud.set_setting(db, "TELEGRAM_BOT_TOKEN", req.telegram_bot_token)
    if req.telegram_chat_id is not None:
        crud.set_setting(db, "TELEGRAM_CHAT_ID", req.telegram_chat_id)
    if req.line_notify_token is not None:
        crud.set_setting(db, "LINE_NOTIFY_TOKEN", req.line_notify_token)
    if req.discord_webhook_url is not None:
        crud.set_setting(db, "DISCORD_WEBHOOK_URL", req.discord_webhook_url)
    return {"success": True, "message": "Settings updated successfully."}

@app.post("/api/alerts/test")
async def test_alert(req: TestAlertRequest, db: Session = Depends(get_db)):
    tg_token = crud.get_setting(db, "TELEGRAM_BOT_TOKEN")
    tg_chat_id = crud.get_setting(db, "TELEGRAM_CHAT_ID")
    line_token = crud.get_setting(db, "LINE_NOTIFY_TOKEN")
    discord_url = crud.get_setting(db, "DISCORD_WEBHOOK_URL")

    test_booking = "https://www.google.com/travel/flights"

    if req.channel == "telegram":
        if not tg_token or not tg_chat_id:
            return {"success": False, "error": "Telegram Token or Chat ID not configured"}
        res = await send_telegram_alert(
            token=tg_token,
            chat_id=tg_chat_id,
            title="ทดสอบระบบแจ้งเตือน",
            origin="BKK",
            destination="NRT",
            departure_date=datetime.now().strftime("%Y-%m-%d"),
            airline="AirAsia",
            price=5990,
            booking_url=test_booking
        )
        return {"success": res}

    elif req.channel == "line":
        if not line_token:
            return {"success": False, "error": "LINE Notify Token not configured"}
        res = await send_line_alert(
            token=line_token,
            title="ทดสอบแจ้งเตือนตั๋วราคาถูก",
            origin="BKK",
            destination="NRT",
            departure_date=datetime.now().strftime("%Y-%m-%d"),
            airline="AirAsia",
            price=5990,
            booking_url=test_booking
        )
        return {"success": res}

    elif req.channel == "discord":
        if not discord_url:
            return {"success": False, "error": "Discord Webhook not configured"}
        res = await send_discord_alert(
            webhook_url=discord_url,
            origin="BKK",
            destination="NRT",
            departure_date=datetime.now().strftime("%Y-%m-%d"),
            airline="AirAsia",
            price=5990,
            booking_url=test_booking
        )
        return {"success": res}

    return {"success": False, "error": "Invalid channel specified"}

# Serve Frontend static assets & UI
frontend_path = BASE_DIR / "frontend"
if frontend_path.exists():
    app.mount("/frontend", StaticFiles(directory=str(frontend_path)), name="frontend")
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")

@app.get("/")
def serve_index():
    root_index = BASE_DIR / "index.html"
    if root_index.exists():
        return FileResponse(str(root_index))
    frontend_index = BASE_DIR / "frontend" / "index.html"
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    return {"message": "AirPrice API is running. Frontend not found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
