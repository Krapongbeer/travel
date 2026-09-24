import logging
from typing import Optional, Dict, Any
import httpx
from backend.config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, LINE_NOTIFY_TOKEN, DISCORD_WEBHOOK_URL

logger = logging.getLogger(__name__)

async def send_telegram_alert(
    token: str,
    chat_id: str,
    title: str,
    origin: str,
    destination: str,
    departure_date: str,
    airline: str,
    price: float,
    booking_url: str,
    return_date: Optional[str] = None,
    trip_url: Optional[str] = None
) -> bool:
    """Send structured price alert with 1-click booking inline buttons via Telegram Bot."""
    if not token or not chat_id:
        logger.warning("Telegram Bot Token or Chat ID not configured.")
        return False

    trip_type = f"ไป-กลับ ({departure_date} ถึง {return_date})" if return_date else f"เที่ยวเดียว ({departure_date})"
    
    message_text = (
        f"🚨 *แจ้งเตือนตั๋วเครื่องบินราคาถูก!*\n\n"
        f"✈️ *เส้นทาง:* `{origin}` ➜ `{destination}`\n"
        f"📅 *วันเดินทาง:* {trip_type}\n"
        f"🏢 *สายการบิน:* {airline}\n"
        f"💰 *ราคาพิเศษ:* *{price:,.0f} THB*\n\n"
        f"⚡ _ราคาลงต่ำกว่างบที่ตั้งไว้ กดปุ่มด้านล่างเพื่อจองตั๋วทันที_"
    )

    inline_keyboard = [
        [
            {"text": "⚡ จองทันทีบน Google Flights", "url": booking_url}
        ]
    ]
    if trip_url:
        inline_keyboard.append([
            {"text": "🌐 จองผ่าน Trip.com", "url": trip_url}
        ])

    payload = {
        "chat_id": chat_id,
        "text": message_text,
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": inline_keyboard
        }
    }

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                logger.info("Telegram notification sent successfully.")
                return True
            else:
                logger.error(f"Telegram API Error: {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to send Telegram alert: {e}")
        return False

async def send_line_alert(
    token: str,
    title: str,
    origin: str,
    destination: str,
    departure_date: str,
    airline: str,
    price: float,
    booking_url: str,
    return_date: Optional[str] = None
) -> bool:
    """Send LINE notification with price drop details and booking link."""
    if not token:
        logger.warning("LINE Token not configured.")
        return False

    trip_type = f"ไป-กลับ ({departure_date} - {return_date})" if return_date else f"เที่ยวเดียว ({departure_date})"
    message_text = (
        f"\n🚨 แจ้งเตือนตั๋วราคาถูก!\n"
        f"✈️ {origin} -> {destination}\n"
        f"📅 {trip_type}\n"
        f"🏢 สายการบิน: {airline}\n"
        f"💰 ราคา: {price:,.0f} THB\n"
        f"🔗 จองทันที: {booking_url}"
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    payload = {"message": message_text}

    url = "https://notify-api.line.me/api/notify"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, data=payload)
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send LINE alert: {e}")
        return False

async def send_discord_alert(
    webhook_url: str,
    origin: str,
    destination: str,
    departure_date: str,
    airline: str,
    price: float,
    booking_url: str,
    return_date: Optional[str] = None
) -> bool:
    """Send Discord Embed notification with 1-click booking."""
    if not webhook_url:
        return False

    trip_type = f"Round-trip ({departure_date} - {return_date})" if return_date else f"One-way ({departure_date})"
    payload = {
        "embeds": [
            {
                "title": f"🚨 Price Alert: {origin} ➜ {destination}",
                "description": f"ราคาตั๋วเครื่องบินลดลงเหลือ **{price:,.0f} THB**",
                "color": 3066993, # green
                "fields": [
                    {"name": "✈️ Airline", "value": airline, "inline": True},
                    {"name": "📅 Date", "value": trip_type, "inline": True},
                    {"name": "💰 Price", "value": f"{price:,.0f} THB", "inline": True},
                    {"name": "⚡ 1-Click Booking", "value": f"[คลิกเพื่อจองทันที]({booking_url})", "inline": False}
                ],
                "footer": {"text": "AirPrice Tracker • Asian Flight Deals"}
            }
        ]
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code in (200, 204)
    except Exception as e:
        logger.error(f"Failed to send Discord alert: {e}")
        return False
