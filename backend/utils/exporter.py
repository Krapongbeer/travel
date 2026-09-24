import io
from typing import List, Dict, Any
import pandas as pd

def export_flights_to_excel(flights: List[Dict[str, Any]]) -> bytes:
    """Export flight search results to a styled Excel (.xlsx) file in-memory."""
    if not flights:
        df = pd.DataFrame(columns=["Origin", "Destination", "Date", "Airline", "Flight No", "Departure", "Arrival", "Stops", "Price (THB)", "Booking Link"])
    else:
        rows = []
        for f in flights:
            rows.append({
                "ต้นทาง (Origin)": f.get("origin"),
                "ปลายทาง (Destination)": f.get("destination"),
                "วันเดินทางไป": f.get("departure_date"),
                "วันเดินทางกลับ": f.get("return_date") or "-",
                "สายการบิน (Airline)": f.get("airline"),
                "เที่ยวบิน (Flight No)": f.get("flight_number") or "-",
                "เวลาออก": f.get("departure_time"),
                "เวลาถึง": f.get("arrival_time"),
                "ระยะเวลา": f.get("duration"),
                "จำนวนจุดแวะพัก": "บินตรง" if f.get("stops") == 0 else f"{f.get('stops')} จุดแวะพัก",
                "ราคา (THB)": f.get("price"),
                "ลิงก์จองตรง (Booking Link)": f.get("booking_url")
            })
        df = pd.DataFrame(rows)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Flight Deals")
        
        # Adjust column widths
        worksheet = writer.sheets["Flight Deals"]
        for col in worksheet.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = col[0].column_letter
            worksheet.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

    return output.getvalue()

def export_flights_to_csv(flights: List[Dict[str, Any]]) -> str:
    """Export flight search results to CSV format."""
    if not flights:
        return ""
    rows = []
    for f in flights:
        rows.append({
            "Origin": f.get("origin"),
            "Destination": f.get("destination"),
            "Departure Date": f.get("departure_date"),
            "Return Date": f.get("return_date") or "",
            "Airline": f.get("airline"),
            "Flight No": f.get("flight_number") or "",
            "Departure Time": f.get("departure_time"),
            "Arrival Time": f.get("arrival_time"),
            "Duration": f.get("duration"),
            "Stops": f.get("stops", 0),
            "Price_THB": f.get("price"),
            "Booking_URL": f.get("booking_url")
        })
    df = pd.DataFrame(rows)
    return df.to_csv(index=False, encoding="utf-8-sig")
