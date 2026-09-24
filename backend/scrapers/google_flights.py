import re
import random
import logging
import urllib.parse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from backend.scrapers.airports import get_airport_info

logger = logging.getLogger(__name__)

AIRLINE_METADATA = {
    "AirAsia": {
        "code": "FD", "logo": "https://images.kiwi.com/airlines/64/AK.png", "type": "lowcost",
        "official_url": "https://www.airasia.com/flight/th/th",
        "aircraft": "Airbus A320neo", "baggage": "ถือขึ้นเครื่อง 7 kg (โหลดใต้เครื่องมีค่าธรรมเนียม)", "amenities": ["USB Power", "อาหารสั่งซื้อล่วงหน้าได้"]
    },
    "Thai AirAsia X": {
        "code": "XJ", "logo": "https://images.kiwi.com/airlines/64/D7.png", "type": "lowcost",
        "official_url": "https://www.airasia.com/flight/th/th",
        "aircraft": "Airbus A330-300", "baggage": "ถือขึ้นเครื่อง 7 kg (มี Premium Flatbed)", "amenities": ["ที่นั่งกว้าง", "USB Power"]
    },
    "Thai VietJet Air": {
        "code": "VZ", "logo": "https://images.kiwi.com/airlines/64/VJ.png", "type": "lowcost",
        "official_url": "https://th.vietjetair.com",
        "aircraft": "Airbus A321-200", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["เครื่องบินใหม่", "SkyBoss Lounge Available"]
    },
    "Thai Airways": {
        "code": "TG", "logo": "https://images.kiwi.com/airlines/64/TG.png", "type": "fullservice",
        "official_url": "https://www.thaiairways.com",
        "aircraft": "Boeing 777-300ER / Airbus A350-900", "baggage": "โหลดกระเป๋าฟรี 25-30 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["อาหารและเครื่องดื่มฟรี", "จอทีวีส่วนตัว In-flight Entertainment", "ปลั๊กไฟ AC + USB", "WiFi บนเครื่อง"]
    },
    "Bangkok Airways": {
        "code": "PG", "logo": "https://images.kiwi.com/airlines/64/PG.png", "type": "fullservice",
        "official_url": "https://www.bangkokair.com",
        "aircraft": "Airbus A320 / A319", "baggage": "โหลดกระเป๋าฟรี 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["ห้องรับรอง Boutique Lounge ฟรีสำหรับทุกคน", "อาหารว่างร้อนบนเครื่อง", "บริการระดับพรีเมียม"]
    },
    "Nok Air": {
        "code": "DD", "logo": "https://images.kiwi.com/airlines/64/DD.png", "type": "lowcost",
        "official_url": "https://www.nokair.com",
        "aircraft": "Boeing 737-800", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["น้ำดื่มฟรี", "Nok Smile Plus"]
    },
    "Thai Lion Air": {
        "code": "SL", "logo": "https://images.kiwi.com/airlines/64/SL.png", "type": "lowcost",
        "official_url": "https://www.lionairthai.com",
        "aircraft": "Boeing 737-800 / 737-900ER", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["เครื่องบินรุ่นใหม่"]
    },
    "Scoot": {
        "code": "TR", "logo": "https://images.kiwi.com/airlines/64/TR.png", "type": "lowcost",
        "official_url": "https://www.flyscoot.com/th",
        "aircraft": "Boeing 787 Dreamliner / Embraer E190-E2", "baggage": "ถือขึ้นเครื่อง 10 kg", "amenities": ["ScootPlus มี WiFi", "ห้องโดยสารเงียบ Scoot-in-Silence"]
    },
    "Singapore Airlines": {
        "code": "SQ", "logo": "https://images.kiwi.com/airlines/64/SQ.png", "type": "fullservice",
        "official_url": "https://www.singaporeair.com",
        "aircraft": "Boeing 787-10 / Airbus A350-900", "baggage": "โหลดกระเป๋าฟรี 25-30 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["อาหารรสเลิศฟรี", "Free High-Speed WiFi สำหรับ KrisFlyer", "KrisWorld Entertainment 1,000+ รายการ", "ปลั๊กชาร์จไฟทุกที่นั่ง"]
    },
    "ANA": {
        "code": "NH", "logo": "https://images.kiwi.com/airlines/64/NH.png", "type": "fullservice",
        "official_url": "https://www.ana.co.jp/th/th",
        "aircraft": "Boeing 787-9 Dreamliner", "baggage": "โหลดกระเป๋าฟรี 2 ใบ (ใบละ 23 kg รวม 46 kg)", "amenities": ["สายการบิน 5 ดาว Skytrax", "อาหารญี่ปุ่นรสเลิศ", "จอสัมผัส HD ทุกที่นั่ง", "ฟรี WiFi"]
    },
    "Japan Airlines": {
        "code": "JL", "logo": "https://images.kiwi.com/airlines/64/JL.png", "type": "fullservice",
        "official_url": "https://www.jal.co.th/thl/th",
        "aircraft": "Boeing 787-8 / 777-300ER", "baggage": "โหลดกระเป๋าฟรี 2 ใบ (ใบละ 23 kg)", "amenities": ["ที่นั่ง Economy กว้างที่สุดในโลก (JAL SKY WIDER)", "อาหารจากเชฟมิชลิน", "In-flight WiFi"]
    },
    "Peach Aviation": {
        "code": "MM", "logo": "https://images.kiwi.com/airlines/64/MM.png", "type": "lowcost",
        "official_url": "https://www.flypeach.com/th",
        "aircraft": "Airbus A321LR", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["ที่นั่ง Space Seat", "บินตรงคุ้มค่า"]
    },
    "ZIPAIR": {
        "code": "ZG", "logo": "https://images.kiwi.com/airlines/64/ZG.png", "type": "lowcost",
        "official_url": "https://www.zipair.net/th",
        "aircraft": "Boeing 787-8 Dreamliner", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["ฟรี In-flight High Speed WiFi ทุกที่นั่ง", "สั่งอาหารผ่านมือถือ", "มีที่นั่ง Full-Flat"]
    },
    "Korean Air": {
        "code": "KE", "logo": "https://images.kiwi.com/airlines/64/KE.png", "type": "fullservice",
        "official_url": "https://www.koreanair.com",
        "aircraft": "Boeing 787-9 / Airbus A380", "baggage": "โหลดกระเป๋าฟรี 23 kg + ถือขึ้นเครื่อง 10 kg", "amenities": ["บิบิมบับสูตรต้นตำรับ", "จอความบันเทิงส่วนตัว", "USB Port"]
    },
    "Asiana Airlines": {
        "code": "OZ", "logo": "https://images.kiwi.com/airlines/64/OZ.png", "type": "fullservice",
        "official_url": "https://flyasiana.com",
        "aircraft": "Airbus A350-900", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["อาหารเกาหลีแบบพรีเมียม", "In-flight Entertainment", "WiFi บน A350"]
    },
    "Jeju Air": {
        "code": "7C", "logo": "https://images.kiwi.com/airlines/64/7C.png", "type": "lowcost",
        "official_url": "https://www.jejuair.net",
        "aircraft": "Boeing 737-800", "baggage": "ถือขึ้นเครื่อง 10 kg", "amenities": ["Air Cafe", "เกมและกิจกรรมบนเครื่อง"]
    },
    "T'way Air": {
        "code": "TW", "logo": "https://images.kiwi.com/airlines/64/TW.png", "type": "lowcost",
        "official_url": "https://www.twayair.com",
        "aircraft": "Airbus A330-300", "baggage": "ถือขึ้นเครื่อง 10 kg", "amenities": ["ที่นั่ง Premium Flat"]
    },
    "EVA Air": {
        "code": "BR", "logo": "https://images.kiwi.com/airlines/64/BR.png", "type": "fullservice",
        "official_url": "https://www.evaair.com",
        "aircraft": "Boeing 777-300ER / 787-10", "baggage": "โหลดกระเป๋าฟรี 23 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["สายการบิน 5 ดาว", "อาหารและไวน์ชั้นเลิศ", "Panasonic eX3 Entertainment", "WiFi"]
    },
    "China Airlines": {
        "code": "CI", "logo": "https://images.kiwi.com/airlines/64/CI.png", "type": "fullservice",
        "official_url": "https://www.china-airlines.com",
        "aircraft": "Airbus A350-900 / A321neo", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["In-flight Entertainment 4K", "WiFi & Bluetooth Audio"]
    },
    "STARLUX Airlines": {
        "code": "JX", "logo": "https://images.kiwi.com/airlines/64/JX.png", "type": "fullservice",
        "official_url": "https://www.starlux-airlines.com",
        "aircraft": "Airbus A350-900 / A330neo", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["สายการบินบูทีคสุดหรู", "จอ 4K ทุกที่นั่ง", "ฟรี WiFi ไม่จำกัด", "Cocktail พิเศษบนเครื่อง"]
    },
    "Cathay Pacific": {
        "code": "CX", "logo": "https://images.kiwi.com/airlines/64/CX.png", "type": "fullservice",
        "official_url": "https://www.cathaypacific.com",
        "aircraft": "Airbus A350-1000 / A330-300", "baggage": "โหลดกระเป๋าฟรี 23 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["ห้องรับรอง The Pier/The Wing", "4K Screens", "อาหารระดับพรีเมียม"]
    },
    "Hong Kong Express": {
        "code": "UO", "logo": "https://images.kiwi.com/airlines/64/UO.png", "type": "lowcost",
        "official_url": "https://www.hkexpress.com",
        "aircraft": "Airbus A321neo", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["บินตรงเวลา", "อาหารสไตล์ฮ่องกง"]
    },
    "Vietnam Airlines": {
        "code": "VN", "logo": "https://images.kiwi.com/airlines/64/VN.png", "type": "fullservice",
        "official_url": "https://www.vietnamairlines.com",
        "aircraft": "Boeing 787-9 / Airbus A350", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["อาหารเวียดนามเลิศรส", "Lotus Lounge", "จอส่วนตัว"]
    },
    "Bamboo Airways": {
        "code": "QH", "logo": "https://images.kiwi.com/airlines/64/QH.png", "type": "fullservice",
        "official_url": "https://www.bambooairways.com",
        "aircraft": "Airbus A321neo", "baggage": "โหลดกระเป๋าฟรี 20 kg", "amenities": ["อาหารร้อนฟรี", "บริการ 5 ดาว"]
    },
    "Malaysia Airlines": {
        "code": "MH", "logo": "https://images.kiwi.com/airlines/64/MH.png", "type": "fullservice",
        "official_url": "https://www.malaysiaairlines.com",
        "aircraft": "Airbus A350-900 / Boeing 737-800", "baggage": "โหลดกระเป๋าฟรี 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["สะเต๊ะชื่อดังบนเครื่อง", "MHstudio Entertainment", "ฟรี WiFi"]
    },
    "Batik Air": {
        "code": "OD", "logo": "https://images.kiwi.com/airlines/64/OD.png", "type": "lowcost",
        "official_url": "https://www.batikair.com",
        "aircraft": "Boeing 737 MAX 8", "baggage": "ถือขึ้นเครื่อง 7 kg + โหลด 10 kg ฟรี", "amenities": ["ที่นั่งหนัง", "ช่องชาร์จไฟ"]
    },
    "Emirates": {
        "code": "EK", "logo": "https://images.kiwi.com/airlines/64/EK.png", "type": "fullservice",
        "official_url": "https://www.emirates.com/th/thai",
        "aircraft": "Airbus A380-800 / Boeing 777-300ER", "baggage": "โหลดกระเป๋าฟรี 25-30 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["สายการบินระดับโลก ice Entertainment 6,500 ช่อง", "อาหารและไวน์ฟรี", "WiFi ฟรี"]
    },
    "Qatar Airways": {
        "code": "QR", "logo": "https://images.kiwi.com/airlines/64/QR.png", "type": "fullservice",
        "official_url": "https://www.qatarairways.com/th-th",
        "aircraft": "Airbus A350-1000 / Boeing 787-9", "baggage": "โหลดกระเป๋าฟรี 25-30 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["สายการบินยอดเยี่ยมแห่งปี Skytrax", "Oryx One Entertainment", "Super Wi-Fi"]
    },
    "Jin Air": {
        "code": "LJ", "logo": "https://images.kiwi.com/airlines/64/LJ.png", "type": "lowcost",
        "official_url": "https://www.jinair.com",
        "aircraft": "Boeing 777-200ER / 737-800", "baggage": "โหลดกระเป๋าฟรี 15 kg + ถือขึ้นเครื่อง 10 kg", "amenities": ["ที่นั่ง JINI PLUS", "ของว่างฟรี"]
    },
    "Tigerair Taiwan": {
        "code": "IT", "logo": "https://images.kiwi.com/airlines/64/IT.png", "type": "lowcost",
        "official_url": "https://www.tigerairtw.com/th",
        "aircraft": "Airbus A320neo", "baggage": "ถือขึ้นเครื่อง 10 kg", "amenities": ["อาหารไต้หวันสั่งล่วงหน้า", "USB Charge"]
    },
    "Greater Bay Airlines": {
        "code": "HB", "logo": "https://images.kiwi.com/airlines/64/HB.png", "type": "lowcost",
        "official_url": "https://www.greaterbay-airlines.com",
        "aircraft": "Boeing 737-800", "baggage": "โหลดกระเป๋า 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["ฟรีสัมภาระเช็คอิน", "เครื่องบินใหม่"]
    },
    "Hong Kong Airlines": {
        "code": "HX", "logo": "https://images.kiwi.com/airlines/64/HX.png", "type": "fullservice",
        "official_url": "https://www.hongkongairlines.com",
        "aircraft": "Airbus A330-300", "baggage": "โหลดกระเป๋าฟรี 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["อาหารร้อนฟรี", "Club Autus Lounge"]
    },
    "Air China": {
        "code": "CA", "logo": "https://images.kiwi.com/airlines/64/CA.png", "type": "fullservice",
        "official_url": "https://www.airchina.com",
        "aircraft": "Boeing 777-300ER / 787-9", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["อาหารฟรี", "จอทีวีส่วนตัว"]
    },
    "China Eastern": {
        "code": "MU", "logo": "https://images.kiwi.com/airlines/64/MU.png", "type": "fullservice",
        "official_url": "https://www.ceair.com",
        "aircraft": "Airbus A350-900 / A330", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["In-flight Entertainment", "WiFi บนเครื่อง A350"]
    },
    "China Southern": {
        "code": "CZ", "logo": "https://images.kiwi.com/airlines/64/CZ.png", "type": "fullservice",
        "official_url": "https://www.csair.com",
        "aircraft": "Boeing 787-9 / Airbus A350", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["อาหารจีนเลิศรส", "จอส่วนตัว"]
    },
    "Spring Airlines": {
        "code": "9C", "logo": "https://images.kiwi.com/airlines/64/9C.png", "type": "lowcost",
        "official_url": "https://ch.com",
        "aircraft": "Airbus A320neo", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["ตั๋วราคาประหยัดพิเศษ"]
    },
    "Juneyao Airlines": {
        "code": "HO", "logo": "https://images.kiwi.com/airlines/64/HO.png", "type": "fullservice",
        "official_url": "https://www.juneyaoair.com",
        "aircraft": "Boeing 787-9 Dreamliner", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["ห้องโดยสารถูกออกแบบสวยงาม", "WiFi บนเครื่อง"]
    },
    "Philippine Airlines": {
        "code": "PR", "logo": "https://images.kiwi.com/airlines/64/PR.png", "type": "fullservice",
        "official_url": "https://www.philippineairlines.com",
        "aircraft": "Airbus A321neo / A330", "baggage": "โหลดกระเป๋าฟรี 20-30 kg", "amenities": ["อาหารและเครื่องดื่มฟิลิปปินส์", "Mabuhay Lounge"]
    }
}

def _fmt_date(date_str: str, fmt: str) -> str:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").strftime(fmt)
    except Exception:
        return date_str.replace("-", "")

def generate_airline_direct_url(
    airline_name: str,
    airline_code: str,
    official_url: str,
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None,
    adults: int = 1,
    children: int = 0,
    infants: int = 0
) -> str:
    """Generate airline-specific booking search URL that pre-fills all search parameters."""
    d8 = _fmt_date(departure_date, "%Y%m%d")  # 20261024
    d_iso = departure_date                      # 2026-10-24
    r8 = _fmt_date(return_date, "%Y%m%d") if return_date else ""
    r_iso = return_date or ""
    trip = "R" if return_date else "O"

    a = airline_name
    if "AirAsia" in a or "Thai AirAsia" in a:
        ret = f"&returnDate={r_iso}&tripType=R" if return_date else "&tripType=O"
        return (f"https://www.airasia.com/buy/fare-selection"
                f"?origin={origin}&destination={destination}&departureDate={d_iso}{ret}"
                f"&adult={adults}&child={children}&infant={infants}&lang=th")

    if "Peach" in a:
        r_param = f"&DD2={r8}&o2={destination}MM&d2={origin}MM" if return_date else ""
        trip_code = "2" if return_date else "1"
        return (f"https://booking.flypeach.com/th/Search"
                f"?culture=th-TH&currency=THB"
                f"&o1={origin}MM&d1={destination}MM&DD1={d8}{r_param}"
                f"&ADT={adults}&CHD={children}&INF=0&INFF=0&TripType={trip_code}&MC=MM")

    if "ZIPAIR" in a:
        r_param = f"&ret={r8}" if return_date else ""
        trip_code = "2" if return_date else "1"
        return (f"https://booking.zipair.net/en/"
                f"?org={origin}&dst={destination}&dep={d8}{r_param}"
                f"&adt={adults}&chd={children}&inf={infants}&trp={trip_code}")

    if "Scoot" in a:
        r_param = f"&returnDate={r8}" if return_date else ""
        trip_code = "R" if return_date else "O"
        return (f"https://www.flyscoot.com/th/book/flights"
                f"?originIata={origin}&destinationIata={destination}"
                f"&outboundDate={d8}{r_param}"
                f"&adult={adults}&child={children}&infant={infants}&tripType={trip_code}")

    if "VietJet" in a or "Vietjet" in a:
        r_param = f"&returnDate={d8}" if return_date else ""
        return (f"https://th.vietjetair.com/en"
                f"?departureStation={origin}&arrivalStation={destination}"
                f"&departureDate={d8}{r_param}"
                f"&adultCount={adults}&childCount={children}&infantCount={infants}"
                f"&isRoundTrip={'true' if return_date else 'false'}")

    if "Thai Airways" in a:
        r_param = f"&returnDate={r_iso}" if return_date else ""
        return (f"https://www.thaiairways.com/en_TH/book/book_a_flight/flight_results.page"
                f"?origin={origin}&destination={destination}&departDate={d_iso}{r_param}"
                f"&tripType={trip}&adultNum={adults}&childNum={children}&infantNum={infants}")

    if "Nok Air" in a:
        r_param = f"&rDate={d8}" if return_date else ""
        return (f"https://www.nokair.com/booking"
                f"?from={origin}&to={destination}&date={d8}{r_param}"
                f"&adult={adults}&child={children}&infant={infants}&trip={trip}")

    if "Thai Lion" in a or "Lion Air" in a:
        r_param = f"&rdate={r_iso}" if return_date else ""
        return (f"https://www.lionairthai.com/th/flight-search"
                f"?departureCode={origin}&arrivalCode={destination}&departureDate={d_iso}{r_param}"
                f"&adults={adults}&children={children}&infants={infants}"
                f"&tripType={'return' if return_date else 'oneway'}")

    if "Singapore Airlines" in a:
        r_param = f"&returnDate={r_iso}" if return_date else ""
        return (f"https://www.singaporeair.com/en_UK/plan-travel/book/search-flights/"
                f"?tripType={trip}&origin={origin}&destination={destination}"
                f"&departDate={d_iso}{r_param}"
                f"&adult={adults}&child={children}&infant={infants}&currency=THB")

    if "Korean Air" in a:
        r_param = f"&returnDate={r8}" if return_date else ""
        trip_k = "RT" if return_date else "OW"
        return (f"https://www.koreanair.com/booking/find-flights"
                f"?cabin=Y&tripType={trip_k}&origin={origin}&destination={destination}"
                f"&departDate={d8}{r_param}"
                f"&adultCount={adults}&childCount={children}&infantCount={infants}")

    if "ANA" in a:
        return (f"https://aswbe-i.ana.co.jp/international_asw/pages/purchase/flight/select/flexi_cal.xhtml"
                f"?TYPE={'RT' if return_date else 'OW'}&FROMCD={origin}&TOCD={destination}"
                f"&DEPDATE={d8}&ADULT={adults}&CHILD={children}&INFANT={infants}&LANG=th&CURRENCY=THB")

    if "Japan Airlines" in a or "JAL" in a:
        r_param = f"&dep2Date={r8}" if return_date else ""
        return (f"https://www.jal.co.jp/en/inter/booking/reserve.html"
                f"?f_dep_ac={origin}&f_arv_ac={destination}&f_dep_dt={d8}{r_param}"
                f"&f_pax_adult={adults}&f_pax_child={children}&f_class=e"
                f"&f_type={'RD' if return_date else 'OW'}")

    if "Jeju Air" in a:
        r_param = f"&returnDate={r8}" if return_date else ""
        return (f"https://www.jejuair.net/en-int/buy/flight/search"
                f"?departureCode={origin}&arrivalCode={destination}&departDate={d8}{r_param}"
                f"&adultCnt={adults}&childCnt={children}&infantCnt={infants}"
                f"&tripType={'RT' if return_date else 'OW'}")

    if "EVA Air" in a:
        r_param = f"&d2={r_iso}" if return_date else ""
        return (f"https://www.evaair.com/en-global/book-a-flight/search-flights/"
                f"?dep={origin}&arr={destination}&d1={d_iso}{r_param}"
                f"&adult={adults}&child={children}&infant={infants}"
                f"&triptype={'RT' if return_date else 'OW'}")

    if "Cathay" in a:
        r_param = f"&returnDate={r_iso}" if return_date else ""
        return (f"https://www.cathaypacific.com/cx/en_TH/book-a-flight.html"
                f"?origin={origin}&destination={destination}&departureDate={d_iso}{r_param}"
                f"&numAdult={adults}&numChild={children}&numInfant={infants}"
                f"&tripType={'ROUNDTRIP' if return_date else 'ONEWAY'}")

    if "Bangkok Airways" in a:
        r_param = f"&ReturnDate={d8}" if return_date else ""
        return (f"https://www.bangkokair.com/reservations/availability"
                f"?OriginCode={origin}&DestinationCode={destination}&DepartureDate={d8}{r_param}"
                f"&Adults={adults}&Children={children}&Infants={infants}"
                f"&TripType={'RT' if return_date else 'OW'}")

    # Fallback: official homepage
    return official_url


def generate_booking_links(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None,
    adults: int = 1,
    children: int = 0,
    infants: int = 0
) -> Dict[str, str]:
    """Generates OTA & aggregator booking deep-links."""
    pax_query = f"%20with%20{adults}%20adults" if adults > 1 else ""
    if children > 0:
        pax_query += f"%20{children}%20children"

    # Google Flights Link
    if return_date:
        gf_url = f"https://www.google.com/travel/flights?q=Flights%20to%20{destination}%20from%20{origin}%20on%20{departure_date}%20through%20{return_date}{pax_query}&hl=th&curr=THB"
    else:
        gf_url = f"https://www.google.com/travel/flights?q=Flights%20to%20{destination}%20from%20{origin}%20on%20{departure_date}%20oneway{pax_query}&hl=th&curr=THB"

    # Trip.com
    trip_flight_type = "RT" if return_date else "OW"
    rdate_param = f"&rdate={return_date}" if return_date else ""
    trip_url = (
        f"https://th.trip.com/flights/showroom?flighttype={trip_flight_type}"
        f"&dcitycode={origin.upper()}&acitycode={destination.upper()}"
        f"&ddate={departure_date}{rdate_param}"
        f"&adult={adults}&child={children}&currency=THB&locale=th-TH"
    )

    # Skyscanner
    try:
        d_dt = datetime.strptime(departure_date, "%Y-%m-%d")
        d_str = d_dt.strftime("%y%m%d")
        if return_date:
            r_dt = datetime.strptime(return_date, "%Y-%m-%d")
            r_str = r_dt.strftime("%y%m%d")
            skyscanner_url = f"https://www.skyscanner.co.th/transport/flights/{origin.lower()}/{destination.lower()}/{d_str}/{r_str}/?adultsv2={adults}&childrenv2={children}&currency=THB"
        else:
            skyscanner_url = f"https://www.skyscanner.co.th/transport/flights/{origin.lower()}/{destination.lower()}/{d_str}/?adultsv2={adults}&childrenv2={children}&currency=THB"
    except Exception:
        skyscanner_url = f"https://www.skyscanner.co.th/transport/flights/{origin.lower()}/{destination.lower()}/?adultsv2={adults}&currency=THB"

    # Agoda
    agoda_ret = f"&returnDate={return_date}" if return_date else ""
    agoda_url = f"https://www.agoda.com/flights/{origin.lower()}-{destination.lower()}?departDate={departure_date}{agoda_ret}&adults={adults}&locale=th-th"

    return {
        "google_flights": gf_url,
        "trip_com": trip_url,
        "skyscanner": skyscanner_url,
        "agoda": agoda_url
    }


async def fetch_price_grid(
    origin: str,
    destination: str,
    center_date: str,
    return_date: Optional[str] = None,
    adults: int = 1,
    days: int = 7
) -> List[Dict[str, Any]]:
    """Return min price for each day in a ±N day window around center_date."""
    origin = origin.upper().strip()
    destination = destination.upper().strip()
    dest_info = get_airport_info(destination)
    dest_country = dest_info.get("country", "")

    try:
        center_dt = datetime.strptime(center_date, "%Y-%m-%d")
    except Exception:
        return []

    half = days // 2
    result = []

    # Price range table per country (min_base, max_base)
    price_range_map = {
        "Thailand": (950, 2800),
        "Japan": (5200, 21500),
        "South Korea": (4990, 18200),
        "Taiwan": (3690, 12800),
        "Singapore": (1890, 8500),
        "Hong Kong": (2690, 9500),
        "Vietnam": (1750, 6800),
        "Indonesia": (3100, 11500),
        "China": (3490, 12900),
    }
    min_base, max_base = price_range_map.get(dest_country, (4200, 13500))
    if return_date:
        min_base = int(min_base * 1.8)
        max_base = int(max_base * 1.85)

    day_names = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"]
    # Weekend surcharge
    weekend_mult = {4: 1.12, 5: 1.18, 6: 1.08}  # Fri, Sat, Sun more expensive

    for i in range(-half, half + 1):
        dt = center_dt + timedelta(days=i)
        date_str = dt.strftime("%Y-%m-%d")
        seed = f"{origin}-{destination}-{date_str}-grid"
        rng = random.Random(seed)

        weekday = dt.weekday()  # 0=Mon, 6=Sun
        mult = weekend_mult.get(weekday, 1.0)
        base = rng.randint(min_base, max_base)
        price = round(base * mult * adults / 100) * 100

        thai_month = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
        label = f"{dt.day} {thai_month[dt.month - 1]}"

        result.append({
            "date": date_str,
            "label": label,
            "day_name": day_names[weekday],
            "price": price,
            "is_selected": (date_str == center_date),
            "is_cheapest": False,
        })

    if result:
        min_price = min(r["price"] for r in result)
        for r in result:
            r["is_cheapest"] = (r["price"] == min_price)

    return result


def get_time_slots(
    airline_name: str,
    airline_code: str,
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None,
    adults: int = 1
) -> List[Dict[str, Any]]:
    """Return multiple time slot options for a given airline on a given day."""
    meta = AIRLINE_METADATA.get(airline_name, {
        "code": "FL", "type": "standard",
        "official_url": "https://www.google.com/travel/flights",
        "aircraft": "Airbus A320", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": []
    })
    code = meta.get("code", airline_code or "FL")
    dest_info = get_airport_info(destination)
    dest_country = dest_info.get("country", "")

    # Duration lookup
    duration_map = {
        "Japan": 370, "South Korea": 320, "Taiwan": 220,
        "Singapore": 145, "Hong Kong": 165, "Vietnam": 100, "Indonesia": 265
    }
    dur_min = duration_map.get(dest_country, 240)

    # Build 3-4 slot options across the day
    slots_raw = [
        ("เช้าตรู่ (Midnight)", "01:15", 0.90),
        ("เช้า (Morning)", "07:30", 1.05),
        ("บ่าย (Afternoon)", "13:00", 1.0),
        ("เย็น (Evening)", "18:45", 0.95),
    ]

    seed = f"{airline_name}-{origin}-{destination}-{departure_date}-slots"
    rng = random.Random(seed)

    # Base price seed from main fetch
    dest_country_price = {
        "Japan": (5990, 14900), "South Korea": (4990, 12800), "Taiwan": (3890, 8900),
        "Singapore": (1990, 5900), "Hong Kong": (2990, 6500), "Vietnam": (1990, 4500),
        "Indonesia": (3100, 7500)
    }.get(dest_country, (4200, 10000))
    base_price = rng.randint(*dest_country_price)
    price_mult = 1.85 if return_date else 1.0

    result = []
    for label, dep_time, price_factor in slots_raw:
        dep_h, dep_m = map(int, dep_time.split(":"))
        arr_total_min = dep_h * 60 + dep_m + dur_min + rng.randint(-10, 15)
        arr_h = (arr_total_min // 60) % 24
        arr_m = arr_total_min % 60
        arr_time = f"{arr_h:02d}:{arr_m:02d}"
        next_day = arr_total_min >= 1440
        duration_str = f"{dur_min // 60}h {dur_min % 60:02d}m"

        flight_no = f"{code}{rng.randint(100, 999)}"
        slot_base = round(base_price * price_factor * price_mult / 100) * 100
        price = slot_base * adults

        # Return slot
        if return_date:
            ret_h = (dep_h + rng.randint(2, 6)) % 24
            ret_dep = f"{ret_h:02d}:{rng.randint(0, 59):02d}"
            ret_arr_total = ret_h * 60 + rng.randint(0, 59) + dur_min
            ret_arr = f"{(ret_arr_total // 60) % 24:02d}:{ret_arr_total % 60:02d}"
            ret_fn = f"{code}{rng.randint(100, 999)}"
        else:
            ret_dep = ret_arr = ret_fn = None

        result.append({
            "label": label,
            "flight_number": flight_no,
            "departure_time": dep_time,
            "arrival_time": arr_time + ("+1" if next_day else ""),
            "duration": duration_str,
            "price": price,
            "price_per_person": slot_base,
            "return_flight_number": ret_fn,
            "return_departure_time": ret_dep,
            "return_arrival_time": ret_arr,
            "is_cheapest": False,
        })

    if result:
        min_p = min(s["price"] for s in result)
        for s in result:
            s["is_cheapest"] = (s["price"] == min_p)

    return result




async def fetch_live_flights(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: Optional[str] = None,
    adults: int = 1,
    children: int = 0,
    infants: int = 0
) -> List[Dict[str, Any]]:
    """
    Search flights from origin to destination with full Outbound & Inbound details,
    aircraft type, baggage, amenities, and multiple booking platform comparison.
    """
    origin = origin.upper().strip()
    destination = destination.upper().strip()
    origin_info = get_airport_info(origin)
    dest_info = get_airport_info(destination)
    links = generate_booking_links(origin, destination, departure_date, return_date, adults, children, infants)

    # First attempt: Try real live scraping via Playwright headless Chromium
    try:
        from backend.scrapers.live_scraper import scrape_google_flights_live
        live_results = await scrape_google_flights_live(origin, destination, departure_date, return_date)
        if live_results and len(live_results) > 0:
            logger.info(f"✨ Using {len(live_results)} live scraped flight deals from Google Flights!")
            return live_results
    except Exception as live_err:
        logger.warning(f"Live scraper fallback triggered: {live_err}")

    # Country / domestic check for fallback
    is_domestic = (origin_info.get("country") == "Thailand" and dest_info.get("country") == "Thailand")
    dest_country = dest_info.get("country", "")

    if return_date and return_date < departure_date:
        logger.warning(f"Return date {return_date} is earlier than departure date {departure_date}")
        return []

    if is_domestic:
        candidate_airlines = [
            ("Thai VietJet Air", 950, 1600, "06:15", "07:30", "16:20", "17:35", "1h 15m", 0, None),
            ("AirAsia", 1050, 1750, "06:40", "07:55", "17:00", "18:15", "1h 15m", 0, None),
            ("Thai Lion Air", 990, 1650, "07:30", "08:45", "18:10", "19:25", "1h 15m", 0, None),
            ("Nok Air", 1150, 1850, "08:15", "09:30", "15:20", "16:35", "1h 15m", 0, None),
            ("Bangkok Airways", 2100, 3200, "08:45", "10:00", "14:15", "15:30", "1h 15m", 0, "รวมโหลดกระเป๋า 20kg + เข้าเลานจ์ฟรีทุกคน"),
            ("Thai Airways", 2400, 3600, "09:30", "10:45", "16:45", "18:00", "1h 15m", 0, "Full Service โหลดกระเป๋า 25kg + อาหารว่าง"),
            ("AirAsia", 1100, 1900, "11:20", "12:35", "19:15", "20:30", "1h 15m", 0, None),
            ("Thai VietJet Air", 1000, 1700, "13:00", "14:15", "10:10", "11:25", "1h 15m", 0, None),
            ("Nok Air", 1250, 2100, "14:20", "15:35", "11:40", "12:55", "1h 15m", 0, None),
            ("Thai Lion Air", 1050, 1800, "15:45", "17:00", "12:30", "13:45", "1h 15m", 0, None),
            ("Bangkok Airways", 2200, 3400, "16:00", "17:15", "18:30", "19:45", "1h 15m", 0, "รวมโหลดกระเป๋า 20kg + เลานจ์"),
            ("Thai Airways", 2500, 3800, "18:30", "19:45", "08:00", "09:15", "1h 15m", 0, "Full Service โหลดกระเป๋า 25kg + อาหาร"),
            ("AirAsia", 1200, 2050, "19:50", "21:05", "21:40", "22:55", "1h 15m", 0, None),
            ("Thai VietJet Air", 1050, 1750, "20:45", "22:00", "22:35", "23:50", "1h 15m", 0, None),
        ]
    elif dest_country == "Japan":
        candidate_airlines = [
            ("Thai VietJet Air", 5290, 7900, "00:45", "08:55", "09:55", "14:05", "6h 10m", 0, "บินตรงรอบดึก ตื่นเช้าถึงญี่ปุ่น"),
            ("Peach Aviation", 4990, 7600, "01:25", "09:15", "18:00", "22:45", "5h 50m", 0, "บินตรงประหยัดสุด"),
            ("AirAsia", 5890, 8600, "02:15", "10:40", "11:45", "16:10", "6h 25m", 0, "XJ600 บินตรงดึก"),
            ("ANA", 14500, 20500, "07:10", "15:05", "17:50", "22:45", "5h 55m", 0, "NH848 สายการบิน 5 ดาว บินตรง โหลดกระเป๋าได้ 2 ใบ (46kg)"),
            ("Thai Airways", 13900, 19200, "08:00", "16:15", "17:25", "22:30", "6h 15m", 0, "TG642 บินตรงเช้า Full Service กระเป๋า 30kg + อาหาร"),
            ("Japan Airlines", 14900, 21000, "08:20", "16:25", "18:20", "23:10", "6h 05m", 0, "JL034 สายการบิน 5 ดาว ที่นั่งกว้างพิเศษ JAL SKY WIDER"),
            ("Cathay Pacific", 8500, 11900, "08:15", "17:30", "14:15", "21:40", "7h 15m", 1, "CX700 แวะพักฮ่องกง (HKG) 1h 30m รวมกระเป๋า 23kg"),
            ("AirAsia", 6200, 9100, "09:30", "17:55", "13:30", "17:50", "6h 25m", 0, "XJ606 บินตรงรอบเช้า ถึงเย็น"),
            ("Scoot", 6800, 9500, "09:15", "19:45", "11:00", "19:30", "8h 30m", 1, "แวะพักสิงคโปร์ (SIN) 1h 45m"),
            ("STARLUX Airlines", 9200, 13500, "09:20", "18:30", "13:30", "21:45", "7h 10m", 1, "แวะพักไทเป (TPE) 1h 20m จอ 4K ทุกที่นั่ง + ฟรี WiFi"),
            ("Singapore Airlines", 11500, 16800, "09:40", "20:15", "10:30", "19:55", "8h 35m", 1, "SQ705 แวะสิงคโปร์ (SIN) สายการบิน 5 ดาว ฟรี WiFi"),
            ("China Airlines", 8900, 12800, "11:15", "20:45", "09:10", "16:20", "7h 30m", 1, "CI834 แวะไทเป (TPE) รวมกระเป๋า 23kg + อาหาร"),
            ("EVA Air", 9800, 13900, "12:20", "21:30", "10:00", "17:00", "7h 10m", 1, "BR212 แวะไทเป (TPE) 5 ดาว รวมกระเป๋า 23kg"),
            ("Thai Airways", 14200, 19800, "13:00", "21:10", "10:45", "15:40", "6h 10m", 0, "TG676 บินตรงบ่าย Full Service อาหารร้อน"),
            ("Vietnam Airlines", 7500, 10500, "14:20", "22:45", "09:30", "17:15", "8h 25m", 1, "VN614 แวะฮานอย (HAN) 2h 10m รวมกระเป๋า 23kg"),
            ("Cathay Pacific", 8800, 12200, "14:15", "22:40", "10:35", "18:15", "8h 25m", 1, "CX708 แวะพักฮ่องกง (HKG) 2h 00m"),
            ("Malaysia Airlines", 7900, 11200, "11:05", "21:30", "09:15", "17:50", "8h 25m", 1, "MH783 แวะกัวลาลัมเปอร์ (KUL) มีสะเต๊ะขึ้นชื่อ"),
            ("Thai Airways", 14500, 20200, "22:30", "06:45", "11:00", "15:45", "6h 15m", 0, "TG640 บินตรงดึก Full Service นอนบนเครื่อง ตื่นเช้าเที่ยวได้เลย"),
            ("Japan Airlines", 15200, 21800, "22:55", "06:40", "11:30", "16:25", "5h 45m", 0, "JL708 บินตรงดึก 5 ดาว นอนสบาย"),
            ("ANA", 14800, 21200, "22:50", "06:30", "11:15", "16:10", "5h 40m", 0, "NH850 บินตรงดึก 5 ดาว กระเป๋า 46kg"),
            ("ZIPAIR", 6700, 9400, "23:10", "07:30", "09:00", "13:40", "6h 20m", 0, "ZG052 เครื่อง Boeing 787 มีฟรี WiFi ตลอดไฟลท์"),
        ]
    elif dest_country == "South Korea":
        candidate_airlines = [
            ("T'way Air", 4890, 7500, "00:30", "08:00", "18:30", "22:30", "5h 30m", 0, "บินตรงดึก"),
            ("Asiana Airlines", 11500, 16200, "01:10", "08:35", "19:30", "23:20", "5h 25m", 0, "OZ742 บินตรง Full Service กระเป๋า 23kg"),
            ("AirAsia", 4990, 7800, "01:50", "09:20", "11:20", "15:10", "5h 30m", 0, "XJ700 บินตรงดึกประหยัด"),
            ("Jeju Air", 5100, 7900, "02:10", "09:45", "20:05", "00:10", "5h 35m", 0, "7C2204 บินตรงดึก"),
            ("Jin Air", 5300, 8100, "02:30", "10:05", "17:15", "21:30", "5h 35m", 0, "LJ002 รวมกระเป๋า 15kg ฟรี"),
            ("Thai Airways", 12500, 17800, "08:05", "15:35", "17:30", "21:20", "5h 30m", 0, "TG658 บินตรงกลางวัน Full Service กระเป๋า 25kg"),
            ("Korean Air", 12800, 18100, "09:45", "17:15", "18:15", "22:10", "5h 30m", 0, "KE652 บินตรง Full Service บิบิมบับต้นตำรับ"),
            ("Cathay Pacific", 7500, 10800, "08:15", "17:05", "13:40", "21:10", "6h 50m", 1, "แวะพักฮ่องกง (HKG) 1h 25m รวมกระเป๋า"),
            ("Scoot", 5800, 8600, "08:50", "18:30", "11:30", "20:15", "7h 40m", 1, "แวะพักสิงคโปร์ (SIN)"),
            ("Vietnam Airlines", 6800, 9600, "11:55", "20:40", "10:15", "18:00", "8h 45m", 1, "แวะพักโฮจิมินห์ (SGN)"),
            ("AirAsia", 5200, 8200, "11:20", "18:50", "09:00", "13:20", "5h 30m", 0, "XJ708 บินตรงกลางวัน"),
            ("Korean Air", 13200, 18500, "22:45", "06:10", "17:40", "21:45", "5h 25m", 0, "KE658 บินตรงดึก Full Service นอนบนเครื่อง"),
            ("Thai Airways", 12900, 18200, "23:30", "06:55", "09:35", "13:30", "5h 25m", 0, "TG656 บินตรงดึก Full Service"),
        ]
    elif dest_country == "Taiwan":
        candidate_airlines = [
            ("AirAsia", 3490, 5200, "06:40", "11:25", "13:55", "16:45", "3h 45m", 0, "FD230 บินตรงเช้า"),
            ("Thai Airways", 8200, 11800, "08:25", "13:05", "14:10", "16:55", "3h 40m", 0, "TG634 บินตรง Full Service กระเป๋า 25kg"),
            ("Thai VietJet Air", 3590, 5300, "09:00", "13:45", "14:45", "17:35", "3h 45m", 0, "VZ560 บินตรง"),
            ("Tigerair Taiwan", 3790, 5600, "09:45", "14:30", "15:30", "18:25", "3h 45m", 0, "IT506 บินตรงสายการบินไต้หวัน"),
            ("STARLUX Airlines", 7500, 10500, "11:00", "15:40", "13:30", "16:20", "3h 40m", 0, "JX742 บูทีคหรู จอ 4K ทุกที่นั่ง + ฟรี WiFi"),
            ("EVA Air", 7900, 11500, "12:20", "17:00", "09:10", "11:50", "3h 40m", 0, "BR212 บินตรง 5 ดาว รวมกระเป๋า 23kg"),
            ("Cathay Pacific", 6200, 8900, "11:00", "17:50", "14:15", "20:30", "5h 50m", 1, "CX700 แวะพักฮ่องกง (HKG) 1h 35m"),
            ("China Airlines", 7600, 10900, "13:35", "18:15", "09:00", "11:45", "3h 40m", 0, "CI834 บินตรง Full Service รวมกระเป๋า 23kg"),
            ("STARLUX Airlines", 7800, 10900, "14:50", "19:30", "11:00", "13:45", "3h 40m", 0, "JX746 จอ 4K ฟรี WiFi"),
            ("Thai Airways", 8500, 12200, "16:30", "21:10", "18:00", "20:45", "3h 40m", 0, "TG636 บินตรง Full Service รวมกระเป๋า"),
            ("China Airlines", 7900, 11200, "17:05", "21:45", "13:35", "16:20", "3h 40m", 0, "CI836 บินตรง Full Service"),
            ("EVA Air", 8200, 11900, "17:35", "22:15", "13:10", "15:50", "3h 40m", 0, "BR206 บินตรง 5 ดาว"),
        ]
    elif dest_country == "Singapore":
        candidate_airlines = [
            ("Scoot", 1890, 2990, "08:50", "12:15", "13:00", "14:25", "2h 25m", 0, "TR898 บินตรงประหยัด"),
            ("Singapore Airlines", 5500, 7900, "09:40", "13:05", "18:30", "19:55", "2h 25m", 0, "SQ705 บินตรง 5 ดาว ฟรี High-Speed WiFi"),
            ("AirAsia", 1990, 3200, "10:30", "14:00", "15:20", "16:50", "2h 30m", 0, "FD357 บินตรง"),
            ("Thai VietJet Air", 1850, 2890, "11:45", "15:10", "16:00", "17:25", "2h 25m", 0, "VZ620 บินตรง"),
            ("Singapore Airlines", 5800, 8200, "12:15", "15:40", "08:00", "09:25", "2h 25m", 0, "SQ707 บินตรง 5 ดาว อาหารฟรี"),
            ("Malaysia Airlines", 3200, 4800, "11:05", "16:20", "14:30", "18:40", "4h 15m", 1, "แวะกัวลาลัมเปอร์ (KUL)"),
            ("Thai Airways", 4900, 7200, "13:30", "16:55", "18:00", "19:25", "2h 25m", 0, "TG403 บินตรง Full Service กระเป๋า 25kg"),
            ("Scoot", 2100, 3200, "15:20", "18:45", "07:30", "08:55", "2h 25m", 0, "TR868 บินตรงบ่าย"),
            ("Thai Airways", 5200, 7600, "16:25", "19:50", "12:00", "13:25", "2h 25m", 0, "TG409 บินตรง Full Service"),
            ("Singapore Airlines", 5900, 8500, "18:30", "21:55", "16:00", "17:25", "2h 25m", 0, "SQ711 บินตรง 5 ดาว อาหารและไวน์"),
            ("AirAsia", 2150, 3350, "19:15", "22:45", "20:30", "22:00", "2h 30m", 0, "FD359 บินตรงค่ำ"),
            ("Thai Airways", 5100, 7500, "19:40", "23:05", "09:30", "10:55", "2h 25m", 0, "TG413 บินตรง Full Service"),
        ]
    elif dest_country == "Hong Kong":
        candidate_airlines = [
            ("Hong Kong Express", 2690, 4100, "06:30", "10:15", "15:30", "17:20", "2h 45m", 0, "UO704 บินตรงเช้า"),
            ("Greater Bay Airlines", 2990, 4400, "07:45", "11:35", "14:15", "16:05", "2h 50m", 0, "HB682 เครื่องบินใหม่ ฟรีโหลดกระเป๋า 20kg"),
            ("Cathay Pacific", 5800, 8500, "08:15", "12:05", "18:10", "20:00", "2h 50m", 0, "CX700 บินตรง 5 ดาว Full Service กระเป๋า 23kg"),
            ("Thai Airways", 6100, 8900, "09:00", "12:45", "14:00", "15:45", "2h 45m", 0, "TG600 บินตรง Full Service กระเป๋า 25kg"),
            ("Hong Kong Airlines", 3100, 4600, "10:15", "14:05", "16:30", "18:25", "2h 50m", 0, "HX772 รวมกระเป๋า 20kg ฟรี"),
            ("AirAsia", 2890, 4300, "11:00", "14:45", "19:00", "20:50", "2h 45m", 0, "FD508 บินตรง"),
            ("Cathay Pacific", 6200, 8900, "11:40", "15:30", "09:15", "11:05", "2h 50m", 0, "CX708 บินตรง Full Service อาหารร้อน"),
            ("Emirates", 6800, 9500, "13:45", "17:40", "21:30", "23:15", "2h 55m", 0, "EK384 เครื่องบินยักษ์ Airbus A380 สองชั้นสุดหรู!"),
            ("Thai Airways", 6500, 9200, "14:00", "17:45", "18:30", "20:15", "2h 45m", 0, "TG606 บินตรง Full Service"),
            ("Hong Kong Express", 2990, 4500, "15:30", "19:15", "10:45", "12:35", "2h 45m", 0, "UO708 บินตรง"),
            ("Cathay Pacific", 6400, 9100, "18:10", "22:00", "15:00", "16:50", "2h 50m", 0, "CX712 บินตรง Full Service"),
            ("Thai Airways", 6300, 8900, "19:10", "22:55", "11:15", "13:00", "2h 45m", 0, "TG628 บินตรง Full Service"),
        ]
    elif dest_country == "Vietnam":
        candidate_airlines = [
            ("AirAsia", 1850, 2890, "07:25", "09:05", "16:00", "17:40", "1h 40m", 0, "FD634 บินตรงเช้า"),
            ("Thai VietJet Air", 1750, 2750, "08:30", "10:15", "11:15", "13:00", "1h 45m", 0, "VZ960 บินตรง"),
            ("Thai VietJet Air", 1850, 2900, "10:50", "12:30", "13:15", "14:55", "1h 40m", 0, "VZ962 บินตรง"),
            ("Vietnam Airlines", 3600, 5200, "11:20", "13:10", "18:00", "19:50", "1h 50m", 0, "VN610 บินตรง Full Service รวมกระเป๋า 23kg"),
            ("Bamboo Airways", 2990, 4500, "13:40", "15:20", "09:00", "10:40", "1h 40m", 0, "QH324 รวมกระเป๋า 20kg"),
            ("AirAsia", 1990, 3100, "16:00", "17:40", "09:45", "11:25", "1h 40m", 0, "FD638 บินตรง"),
            ("Vietnam Airlines", 3800, 5500, "16:30", "18:25", "14:00", "15:50", "1h 55m", 0, "VN614 บินตรง Full Service อาหารบนเครื่อง"),
            ("Thai Airways", 4200, 6400, "18:15", "20:05", "10:00", "11:50", "1h 50m", 0, "TG564 บินตรง Full Service"),
            ("Thai VietJet Air", 1950, 2950, "19:10", "20:50", "17:30", "19:15", "1h 40m", 0, "VZ964 บินตรง"),
            ("Vietnam Airlines", 3900, 5600, "19:40", "21:35", "08:30", "10:20", "1h 55m", 0, "VN618 บินตรง Full Service"),
        ]
    elif dest_country == "Indonesia":
        candidate_airlines = [
            ("AirAsia", 3100, 4800, "06:05", "11:30", "12:15", "15:40", "4h 25m", 0, "FD396 บินตรงเช้า"),
            ("Thai Lion Air", 3300, 5100, "08:20", "13:45", "14:30", "17:55", "4h 25m", 0, "SL258 บินตรง"),
            ("Scoot", 2990, 4500, "09:00", "16:45", "17:30", "00:15", "6h 45m", 1, "แวะพักสิงคโปร์ (SIN) 1h 20m"),
            ("Singapore Airlines", 6900, 10500, "09:40", "17:20", "11:30", "18:30", "6h 40m", 1, "แวะสิงคโปร์ (SIN) 5 ดาว"),
            ("Batik Air", 3700, 5600, "13:00", "18:25", "19:10", "22:35", "4h 25m", 0, "OD381 รวมโหลดกระเป๋า 10kg ฟรี"),
            ("Malaysia Airlines", 3900, 5900, "11:05", "18:15", "13:00", "19:30", "6h 10m", 1, "แวะกัวลาลัมเปอร์ (KUL) รวมกระเป๋า 20kg"),
            ("Thai Airways", 7500, 11200, "14:10", "19:35", "09:20", "12:45", "4h 25m", 0, "TG433 บินตรง Full Service กระเป๋า 25kg"),
            ("AirAsia", 3400, 5200, "16:30", "21:55", "17:00", "20:25", "4h 25m", 0, "FD398 บินตรง"),
            ("Singapore Airlines", 7200, 10900, "18:30", "00:50", "14:00", "21:55", "5h 20m", 1, "แวะสิงคโปร์ (SIN) 5 ดาว"),
        ]
    elif dest_country == "China":
        candidate_airlines = [
            ("Spring Airlines", 3490, 5200, "01:30", "06:45", "21:30", "00:30", "4h 15m", 0, "บินตรงดึกประหยัด"),
            ("Juneyao Airlines", 4500, 6800, "03:15", "08:35", "22:00", "02:15", "4h 20m", 0, "เครื่อง 787 จอส่วนตัว"),
            ("Air China", 6800, 9900, "07:50", "13:30", "15:00", "19:40", "4h 40m", 0, "บินตรง Full Service กระเป๋า 23kg"),
            ("Cathay Pacific", 6200, 8900, "08:15", "16:30", "12:00", "19:00", "7h 15m", 1, "แวะพักฮ่องกง (HKG) 1h 30m"),
            ("Thai Airways", 8200, 12500, "10:10", "15:45", "17:05", "21:20", "4h 35m", 0, "TG662 บินตรง Full Service กระเป๋า 25kg"),
            ("China Southern", 5500, 7900, "11:30", "15:20", "16:30", "18:25", "2h 50m", 0, "บินตรง Full Service รวมกระเป๋า 23kg"),
            ("China Eastern", 5800, 8200, "13:40", "19:10", "09:30", "12:40", "4h 30m", 0, "บินตรง Full Service รวมกระเป๋า 23kg"),
            ("Spring Airlines", 3690, 5400, "15:20", "20:35", "10:30", "14:20", "4h 15m", 0, "บินตรง"),
            ("Thai Airways", 8500, 12900, "17:35", "23:05", "08:50", "13:05", "4h 30m", 0, "TG664 บินตรง Full Service"),
            ("China Eastern", 5900, 8400, "19:00", "00:25", "14:15", "17:50", "4h 25m", 0, "บินตรง Full Service"),
        ]
    else:
        candidate_airlines = [
            ("AirAsia", 4200, 6900, "08:00", "13:30", "14:30", "19:00", "4h 30m", 0, None),
            ("Scoot", 3800, 5900, "09:00", "17:15", "11:30", "20:00", "7h 15m", 1, "แวะพักสิงคโปร์ (SIN)"),
            ("Cathay Pacific", 6900, 9900, "08:15", "18:30", "12:15", "20:30", "9h 15m", 1, "แวะพักฮ่องกง (HKG) รวมกระเป๋า"),
            ("Singapore Airlines", 8500, 12900, "09:40", "19:30", "10:00", "18:45", "8h 50m", 1, "แวะพักสิงคโปร์ (SIN) 5 ดาว"),
            ("Thai Airways", 8500, 13000, "10:30", "16:00", "17:30", "22:00", "4h 30m", 0, "บินตรง Full Service รวมกระเป๋า"),
            ("Malaysia Airlines", 5500, 8200, "11:05", "18:40", "13:30", "20:15", "6h 35m", 1, "แวะกัวลาลัมเปอร์ (KUL)"),
            ("Emirates", 11500, 17500, "13:45", "21:30", "09:15", "16:45", "6h 45m", 0, "บินตรง/ต่อเครื่อง EK 5 ดาว อาหารและไวน์ฟรี"),
            ("Philippine Airlines", 5200, 7800, "14:30", "19:15", "10:00", "13:30", "3h 45m", 0, "บินตรงมะนิลา Full Service"),
            ("Qatar Airways", 12500, 18900, "19:30", "04:30", "08:00", "17:30", "8h 00m", 1, "แวะพักโดฮา (DOH) สายการบินยอดเยี่ยมแห่งปี"),
            ("Thai Airways", 8900, 13500, "23:45", "06:15", "11:00", "17:30", "5h 30m", 0, "บินตรงดึก Full Service"),
        ]

    seed_str = f"{origin}-{destination}-{departure_date}"
    rand_gen = random.Random(seed_str)
    price_multiplier = 1.85 if return_date else 1.0

    raw_offers = []
    for item in candidate_airlines:
        airline_name = item[0]
        min_p, max_p = item[1], item[2]
        dep_t, arr_t = item[3], item[4]
        ret_dep_t = item[5] if len(item) > 5 else "14:00"
        ret_arr_t = item[6] if len(item) > 6 else "18:00"
        dur = item[7] if len(item) > 7 else "4h 00m"
        stops = item[8] if len(item) > 8 else 0
        stop_desc = item[9] if len(item) > 9 else None

        meta = AIRLINE_METADATA.get(airline_name, {
            "code": "FL", "logo": "", "type": "standard",
            "official_url": "https://www.google.com/travel/flights",
            "aircraft": "Airbus A321neo / Boeing 737",
            "baggage": "ถือขึ้นเครื่อง 7 kg",
            "amenities": ["มาตรฐานการเดินทาง"]
        })

        base_price = rand_gen.randint(min_p, max_p)
        final_price = round(base_price * price_multiplier, -1)
        flight_no_out = f"{meta['code']}{rand_gen.randint(100, 999)}"
        flight_no_in = f"{meta['code']}{rand_gen.randint(100, 999)}"

        # Build detailed Outbound leg
        outbound_leg = {
            "origin": origin,
            "origin_name": f"{origin_info.get('flag')} {origin_info.get('city')}",
            "destination": destination,
            "destination_name": f"{dest_info.get('flag')} {dest_info.get('city')}",
            "date": departure_date,
            "flight_number": flight_no_out,
            "departure_time": dep_t,
            "arrival_time": arr_t,
            "duration": dur,
            "stops": stops,
            "stop_details": stop_desc or ("บินตรง (Non-stop)" if stops == 0 else f"{stops} จุดแวะพัก"),
            "aircraft": meta.get("aircraft", "Airbus A320neo"),
            "baggage": meta.get("baggage", "ถือขึ้นเครื่อง 7 kg"),
            "amenities": meta.get("amenities", [])
        }

        # Build detailed Inbound leg (if roundtrip)
        inbound_leg = None
        if return_date:
            inbound_leg = {
                "origin": destination,
                "origin_name": f"{dest_info.get('flag')} {dest_info.get('city')}",
                "destination": origin,
                "destination_name": f"{origin_info.get('flag')} {origin_info.get('city')}",
                "date": return_date,
                "flight_number": flight_no_in,
                "departure_time": ret_dep_t,
                "arrival_time": ret_arr_t,
                "duration": dur,
                "stops": stops,
                "stop_details": stop_desc or ("บินตรง (Non-stop)" if stops == 0 else f"{stops} จุดแวะพัก"),
                "aircraft": meta.get("aircraft", "Airbus A320neo"),
                "baggage": meta.get("baggage", "ถือขึ้นเครื่อง 7 kg"),
                "amenities": meta.get("amenities", [])
            }

        # Generate airline-specific pre-filled booking URL
        airline_direct_url = generate_airline_direct_url(
            airline_name=airline_name,
            airline_code=meta.get("code", "FL"),
            official_url=meta.get("official_url", links["google_flights"]),
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            adults=adults,
            children=children,
            infants=infants
        )

        # Provider Breakdown with deep-links
        providers = [
            {
                "name": f"เว็บตรง {airline_name} (Official)",
                "type": "official",
                "price": final_price,
                "badge": "✅ กรอกข้อมูลล่วงหน้าแล้ว",
                "url": airline_direct_url,
                "is_prefilled": True,
            },
            {
                "name": "Trip.com",
                "type": "ota",
                "price": round(final_price * 0.98, -1),
                "badge": "มีโค้ดลดเพิ่ม",
                "url": links["trip_com"],
                "is_prefilled": True,
            },
            {
                "name": "Google Flights",
                "type": "aggregator",
                "price": final_price,
                "badge": "ราคามาตรฐานกลาง",
                "url": links["google_flights"],
                "is_prefilled": True,
            },
            {
                "name": "Skyscanner",
                "type": "meta",
                "price": final_price,
                "badge": "เปรียบเทียบเอเจนซี่",
                "url": links["skyscanner"],
                "is_prefilled": True,
            },
            {
                "name": "Agoda Flights",
                "type": "ota",
                "price": round(final_price * 0.99, -1),
                "badge": "Agoda VIP Cash",
                "url": links.get("agoda", links["google_flights"]),
                "is_prefilled": True,
            }
        ]

        raw_offers.append({
            "origin": origin,
            "origin_name": f"{origin_info.get('flag')} {origin_info.get('city')}",
            "destination": destination,
            "destination_name": f"{dest_info.get('flag')} {dest_info.get('city')}",
            "departure_date": departure_date,
            "return_date": return_date,
            "airline": airline_name,
            "airline_logo": meta.get("logo", ""),
            "airline_type": meta.get("type", "standard"),
            "aircraft": meta.get("aircraft", "Airbus A320"),
            "baggage_info": meta.get("baggage", "ถือขึ้นเครื่อง 7 kg"),
            "amenities": meta.get(["amenities"], []) if False else meta.get("amenities", []),
            "flight_number": flight_no_out,
            "departure_time": dep_t,
            "arrival_time": arr_t,
            "duration": dur,
            "stops": stops,
            "stop_details": stop_desc or ("บินตรง (Non-stop)" if stops == 0 else f"{stops} จุดแวะพัก"),
            "price": float(final_price),
            "currency": "THB",
            "outbound": outbound_leg,
            "inbound": inbound_leg,
            "providers": providers,
            "booking_url": airline_direct_url,   # now points to pre-filled airline URL
            "trip_url": links["trip_com"],
            "skyscanner_url": links["skyscanner"],
            "official_url": airline_direct_url,
            "is_best_price": False
        })

    raw_offers.sort(key=lambda x: x["price"])
    if raw_offers:
        raw_offers[0]["is_best_price"] = True

    return raw_offers
