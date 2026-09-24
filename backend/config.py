import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/flights.db")

# Notification Settings
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
LINE_NOTIFY_TOKEN = os.getenv("LINE_NOTIFY_TOKEN", "")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

# Tracking & Scheduler Configuration
DEFAULT_TRACK_INTERVAL_HOURS = int(os.getenv("TRACK_INTERVAL_HOURS", "6"))
CURRENCY = os.getenv("DEFAULT_CURRENCY", "THB")
LOCALE = os.getenv("DEFAULT_LOCALE", "th-TH")
