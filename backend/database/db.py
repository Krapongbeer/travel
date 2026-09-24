from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class FlightOffer(Base):
    __tablename__ = "flight_offers"

    id = Column(Integer, primary_key=True, index=True)
    search_id = Column(String, index=True)
    origin = Column(String(10), index=True)
    origin_name = Column(String(100))
    destination = Column(String(10), index=True)
    destination_name = Column(String(100))
    departure_date = Column(String(20), index=True)
    return_date = Column(String(20), nullable=True)
    airline = Column(String(100), index=True)
    airline_logo = Column(String(255), nullable=True)
    flight_number = Column(String(50), nullable=True)
    departure_time = Column(String(30))
    arrival_time = Column(String(30))
    duration = Column(String(50))
    stops = Column(Integer, default=0)
    stop_details = Column(String(255), nullable=True)
    price = Column(Float, index=True)
    currency = Column(String(10), default="THB")
    booking_url = Column(Text)
    trip_url = Column(Text, nullable=True)
    skyscanner_url = Column(Text, nullable=True)
    is_best_price = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String(10), index=True)
    destination = Column(String(10), index=True)
    departure_date = Column(String(20), index=True)
    return_date = Column(String(20), nullable=True)
    lowest_price = Column(Float)
    average_price = Column(Float, nullable=True)
    airline = Column(String(100))
    currency = Column(String(10), default="THB")
    recorded_at = Column(DateTime, default=datetime.utcnow)

class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=True)
    origin = Column(String(10), index=True)
    destination = Column(String(10), index=True)
    departure_date = Column(String(20))
    return_date = Column(String(20), nullable=True)
    target_price = Column(Float)  # Alert when price <= target_price
    current_lowest_price = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    notify_telegram = Column(Boolean, default=True)
    notify_line = Column(Boolean, default=True)
    last_checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PassengerProfile(Base):
    __tablename__ = "passenger_profiles"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    title = Column(String(10), default="Mr") # Mr / Ms / Mrs
    date_of_birth = Column(String(20)) # YYYY-MM-DD
    gender = Column(String(10)) # M / F
    nationality = Column(String(50), default="Thai")
    passport_number = Column(String(50), nullable=True)
    passport_expiry = Column(String(20), nullable=True)
    email = Column(String(120))
    phone_number = Column(String(30))
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
