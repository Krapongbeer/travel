from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database.db import FlightOffer, PriceHistory, Watchlist, PassengerProfile, SystemSetting
from backend.utils.security import encrypt_passport, decrypt_passport, mask_passport

# --- Flight Offers ---
def save_flight_offers(db: Session, offers: List[dict], search_id: str) -> List[FlightOffer]:
    saved = []
    for item in offers:
        offer = FlightOffer(
            search_id=search_id,
            origin=item.get("origin"),
            origin_name=item.get("origin_name"),
            destination=item.get("destination"),
            destination_name=item.get("destination_name"),
            departure_date=item.get("departure_date"),
            return_date=item.get("return_date"),
            airline=item.get("airline"),
            airline_logo=item.get("airline_logo"),
            flight_number=item.get("flight_number"),
            departure_time=item.get("departure_time"),
            arrival_time=item.get("arrival_time"),
            duration=item.get("duration"),
            stops=item.get("stops", 0),
            stop_details=item.get("stop_details"),
            price=item.get("price"),
            currency=item.get("currency", "THB"),
            booking_url=item.get("booking_url"),
            trip_url=item.get("trip_url"),
            skyscanner_url=item.get("skyscanner_url"),
            is_best_price=item.get("is_best_price", False)
        )
        db.add(offer)
        saved.append(offer)
    db.commit()
    return saved

def get_latest_search_offers(db: Session, origin: str, destination: str, departure_date: str, limit: int = 50) -> List[FlightOffer]:
    return db.query(FlightOffer).filter(
        FlightOffer.origin == origin,
        FlightOffer.destination == destination,
        FlightOffer.departure_date == departure_date
    ).order_by(FlightOffer.price.asc()).limit(limit).all()

# --- Price History ---
def record_price_history(db: Session, origin: str, destination: str, departure_date: str, lowest_price: float, airline: str, return_date: Optional[str] = None, average_price: Optional[float] = None):
    history = PriceHistory(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        lowest_price=lowest_price,
        average_price=average_price,
        airline=airline,
        recorded_at=datetime.utcnow()
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history

def get_price_history(db: Session, origin: str, destination: str, departure_date: Optional[str] = None, limit: int = 30) -> List[PriceHistory]:
    query = db.query(PriceHistory).filter(
        PriceHistory.origin == origin,
        PriceHistory.destination == destination
    )
    if departure_date:
        query = query.filter(PriceHistory.departure_date == departure_date)
    return query.order_by(PriceHistory.recorded_at.asc()).limit(limit).all()

# --- Watchlists ---
def create_watchlist(db: Session, origin: str, destination: str, departure_date: str, target_price: float, return_date: Optional[str] = None, title: Optional[str] = None, notify_telegram: bool = True, notify_line: bool = True) -> Watchlist:
    item = Watchlist(
        title=title or f"{origin} ✈ {destination} ({departure_date})",
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        target_price=target_price,
        notify_telegram=notify_telegram,
        notify_line=notify_line,
        is_active=True
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def get_all_watchlists(db: Session, active_only: bool = False) -> List[Watchlist]:
    query = db.query(Watchlist)
    if active_only:
        query = query.filter(Watchlist.is_active == True)
    return query.order_by(desc(Watchlist.created_at)).all()

def delete_watchlist(db: Session, watchlist_id: int) -> bool:
    item = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False

def update_watchlist_check(db: Session, watchlist_id: int, lowest_price: float):
    item = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if item:
        item.current_lowest_price = lowest_price
        item.last_checked_at = datetime.utcnow()
        db.commit()

# --- Passenger Profiles ---
def save_passenger_profile(db: Session, data: dict) -> PassengerProfile:
    if data.get("is_default"):
        db.query(PassengerProfile).update({"is_default": False})
    
    # Encrypt passport before storing
    if data.get("passport_number"):
        data = dict(data)  # copy to avoid mutating caller's dict
        data["passport_number"] = encrypt_passport(data["passport_number"])
    
    profile = PassengerProfile(**data)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def get_passenger_profiles(db: Session) -> List[PassengerProfile]:
    return db.query(PassengerProfile).order_by(desc(PassengerProfile.is_default), desc(PassengerProfile.created_at)).all()

def delete_passenger_profile(db: Session, passenger_id: int) -> bool:
    item = db.query(PassengerProfile).filter(PassengerProfile.id == passenger_id).first()
    if item:
        db.delete(item)
        db.commit()
        return True
    return False

def get_default_passenger(db: Session) -> Optional[PassengerProfile]:

    return db.query(PassengerProfile).filter(PassengerProfile.is_default == True).first()

# --- System Settings ---
def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return setting.value if setting else default

def set_setting(db: Session, key: str, value: str, description: str = ""):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if setting:
        setting.value = value
        if description:
            setting.description = description
    else:
        setting = SystemSetting(key=key, value=value, description=description)
        db.add(setting)
    db.commit()
