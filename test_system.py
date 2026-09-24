import asyncio
from backend.scrapers.airports import ASIAN_AIRPORTS, POPULAR_ROUTES
from backend.scrapers.google_flights import fetch_live_flights, generate_booking_links
from backend.utils.exporter import export_flights_to_excel, export_flights_to_csv
from backend.database.db import SessionLocal, init_db
from backend.database import crud
from backend.autobooking.autofill import generate_autofill_script, generate_multi_autofill_script

async def test_all():
    print("========================================")
    print("✈️ Testing Multi-Passenger Features")
    print("========================================")

    # 1. Multi-passenger Flight Search & Deep-link
    print("1. Searching flights for 3 passengers (Adults=3): BKK -> NRT...")
    offers = await fetch_live_flights("BKK", "NRT", "2026-10-25", "2026-10-30", adults=3)
    assert len(offers) > 0, "No flight offers returned"
    print(f"   ✅ Found {len(offers)} offers. Lowest: {offers[0]['price']:,} THB/person (Total for 3: {offers[0]['price']*3:,} THB)")
    print(f"   ⚡ Multi-passenger Booking Link: {offers[0]['booking_url']}")
    assert "3%20adults" in offers[0]['booking_url'], "Adults count missing in Google Flights URL"

    # 2. Multi-passenger Profile Database & Auto-Fill
    init_db()
    db = SessionLocal()
    try:
        p1 = crud.save_passenger_profile(db, {
            "title": "Mr",
            "first_name": "SOMCHAI",
            "last_name": "DEEDEE",
            "date_of_birth": "1990-01-01",
            "gender": "M",
            "nationality": "Thai",
            "passport_number": "AA1111111",
            "email": "somchai@example.com",
            "phone_number": "0811111111",
            "is_default": True
        })
        p2 = crud.save_passenger_profile(db, {
            "title": "Mrs",
            "first_name": "SOMYING",
            "last_name": "DEEDEE",
            "date_of_birth": "1992-02-02",
            "gender": "F",
            "nationality": "Thai",
            "passport_number": "BB2222222",
            "email": "somchai@example.com",
            "phone_number": "0811111111",
            "is_default": False
        })
        p3 = crud.save_passenger_profile(db, {
            "title": "Mr",
            "first_name": "JUNIOR",
            "last_name": "DEEDEE",
            "date_of_birth": "2018-05-15",
            "gender": "M",
            "nationality": "Thai",
            "passport_number": "CC3333333",
            "email": "somchai@example.com",
            "phone_number": "0811111111",
            "is_default": False
        })

        profiles = crud.get_passenger_profiles(db)
        print(f"   ✅ Saved {len(profiles)} passenger profiles in DB.")

        # Test Multi-passenger Auto-Fill Script
        p_list = [
            {"first_name": p.first_name, "last_name": p.last_name, "passport_number": p.passport_number, "date_of_birth": p.date_of_birth, "email": p.email, "phone_number": p.phone_number}
            for p in profiles[:3]
        ]
        script = generate_multi_autofill_script(p_list)
        assert "SOMCHAI" in script and "SOMYING" in script and "JUNIOR" in script, "Multi-passenger script failed"
        print("   ✅ Multi-passenger Auto-Fill script generated successfully for all 3 passengers!")

    finally:
        db.close()

    print("\n🎉 MULTI-PASSENGER VERIFICATION PASSED!")

if __name__ == "__main__":
    asyncio.run(test_all())
