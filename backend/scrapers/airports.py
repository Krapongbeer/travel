# Comprehensive dataset for major Asian airports & hubs

ASIAN_AIRPORTS = {
    # Thailand (Domestic & International)
    "BKK": {"city": "Bangkok (Suvarnabhumi)", "name": "Suvarnabhumi Airport", "country": "Thailand", "flag": "🇹🇭"},
    "DMK": {"city": "Bangkok (Don Mueang)", "name": "Don Mueang International", "country": "Thailand", "flag": "🇹🇭"},
    "CNX": {"city": "Chiang Mai", "name": "Chiang Mai International", "country": "Thailand", "flag": "🇹🇭"},
    "HKT": {"city": "Phuket", "name": "Phuket International", "country": "Thailand", "flag": "🇹🇭"},
    "KBV": {"city": "Krabi", "name": "Krabi Airport", "country": "Thailand", "flag": "🇹🇭"},
    "HDY": {"city": "Hat Yai", "name": "Hat Yai International", "country": "Thailand", "flag": "🇹🇭"},
    "USM": {"city": "Koh Samui", "name": "Samui Airport", "country": "Thailand", "flag": "🇹🇭"},
    "UTH": {"city": "Udon Thani", "name": "Udon Thani Airport", "country": "Thailand", "flag": "🇹🇭"},
    "CEI": {"city": "Chiang Rai", "name": "Mae Fah Luang - Chiang Rai", "country": "Thailand", "flag": "🇹🇭"},

    # Japan
    "NRT": {"city": "Tokyo (Narita)", "name": "Narita International", "country": "Japan", "flag": "🇯🇵"},
    "HND": {"city": "Tokyo (Haneda)", "name": "Tokyo Haneda", "country": "Japan", "flag": "🇯🇵"},
    "KIX": {"city": "Osaka (Kansai)", "name": "Kansai International", "country": "Japan", "flag": "🇯🇵"},
    "FUK": {"city": "Fukuoka", "name": "Fukuoka Airport", "country": "Japan", "flag": "🇯🇵"},
    "CTS": {"city": "Sapporo (Chitose)", "name": "New Chitose Airport", "country": "Japan", "flag": "🇯🇵"},
    "OKA": {"city": "Okinawa (Naha)", "name": "Naha Airport", "country": "Japan", "flag": "🇯🇵"},
    "NGO": {"city": "Nagoya (Chubu)", "name": "Chubu Centrair", "country": "Japan", "flag": "🇯🇵"},

    # South Korea
    "ICN": {"city": "Seoul (Incheon)", "name": "Incheon International", "country": "South Korea", "flag": "🇰🇷"},
    "GMP": {"city": "Seoul (Gimpo)", "name": "Gimpo International", "country": "South Korea", "flag": "🇰🇷"},
    "PUS": {"city": "Busan", "name": "Gimhae International", "country": "South Korea", "flag": "🇰🇷"},
    "CJU": {"city": "Jeju Island", "name": "Jeju International", "country": "South Korea", "flag": "🇰🇷"},

    # Taiwan
    "TPE": {"city": "Taipei (Taoyuan)", "name": "Taiwan Taoyuan", "country": "Taiwan", "flag": "🇹🇼"},
    "TSA": {"city": "Taipei (Songshan)", "name": "Taipei Songshan", "country": "Taiwan", "flag": "🇹🇼"},
    "KHH": {"city": "Kaohsiung", "name": "Kaohsiung International", "country": "Taiwan", "flag": "🇹🇼"},

    # Singapore & Malaysia
    "SIN": {"city": "Singapore", "name": "Singapore Changi Airport", "country": "Singapore", "flag": "🇸🇬"},
    "KUL": {"city": "Kuala Lumpur", "name": "Kuala Lumpur International", "country": "Malaysia", "flag": "🇲🇾"},
    "PEN": {"city": "Penang", "name": "Penang International", "country": "Malaysia", "flag": "🇲🇾"},
    "BKI": {"city": "Kota Kinabalu", "name": "Kota Kinabalu International", "country": "Malaysia", "flag": "🇲🇾"},

    # Hong Kong & Macau
    "HKG": {"city": "Hong Kong", "name": "Hong Kong International", "country": "Hong Kong", "flag": "🇭🇰"},
    "MFM": {"city": "Macau", "name": "Macau International", "country": "Macau", "flag": "🇲🇴"},

    # Vietnam
    "SGN": {"city": "Ho Chi Minh City", "name": "Tan Son Nhat International", "country": "Vietnam", "flag": "🇻🇳"},
    "HAN": {"city": "Hanoi", "name": "Noi Bai International", "country": "Vietnam", "flag": "🇻🇳"},
    "DAD": {"city": "Da Nang", "name": "Da Nang International", "country": "Vietnam", "flag": "🇻🇳"},
    "PQC": {"city": "Phu Quoc", "name": "Phu Quoc International", "country": "Vietnam", "flag": "🇻🇳"},

    # Indonesia & Philippines
    "DPS": {"city": "Bali (Denpasar)", "name": "Ngurah Rai International", "country": "Indonesia", "flag": "🇮🇩"},
    "CGK": {"city": "Jakarta", "name": "Soekarno-Hatta International", "country": "Indonesia", "flag": "🇮🇩"},
    "MNL": {"city": "Manila", "name": "Ninoy Aquino International", "country": "Philippines", "flag": "🇵🇭"},
    "CEB": {"city": "Cebu", "name": "Mactan-Cebu International", "country": "Philippines", "flag": "🇵🇭"},

    # China
    "PVG": {"city": "Shanghai (Pudong)", "name": "Shanghai Pudong International", "country": "China", "flag": "🇨🇳"},
    "PKX": {"city": "Beijing (Daxing)", "name": "Beijing Daxing International", "country": "China", "flag": "🇨🇳"},
    "CAN": {"city": "Guangzhou", "name": "Guangzhou Baiyun International", "country": "China", "flag": "🇨🇳"},
    "CTU": {"city": "Chengdu", "name": "Chengdu Tianfu International", "country": "China", "flag": "🇨🇳"},
    "KMG": {"city": "Kunming", "name": "Kunming Changshui International", "country": "China", "flag": "🇨🇳"},
}

POPULAR_ROUTES = [
    {"from": "BKK", "to": "NRT", "title": "กรุงเทพฯ ✈ โตเกียว (Narita)", "region": "Japan"},
    {"from": "BKK", "to": "KIX", "title": "กรุงเทพฯ ✈ โอซาก้า (Kansai)", "region": "Japan"},
    {"from": "BKK", "to": "FUK", "title": "กรุงเทพฯ ✈ ฟุกุโอกะ", "region": "Japan"},
    {"from": "BKK", "to": "ICN", "title": "กรุงเทพฯ ✈ โซล (Incheon)", "region": "South Korea"},
    {"from": "BKK", "to": "TPE", "title": "กรุงเทพฯ ✈ ไทเป (Taoyuan)", "region": "Taiwan"},
    {"from": "DMK", "to": "SIN", "title": "กรุงเทพฯ ✈ สิงคโปร์", "region": "Singapore"},
    {"from": "BKK", "to": "HKG", "title": "กรุงเทพฯ ✈ ฮ่องกง", "region": "Hong Kong"},
    {"from": "DMK", "to": "DAD", "title": "กรุงเทพฯ ✈ ดานัง (Da Nang)", "region": "Vietnam"},
    {"from": "DMK", "to": "DPS", "title": "กรุงเทพฯ ✈ บาหลี (Bali)", "region": "Indonesia"},
    {"from": "DMK", "to": "CNX", "title": "กรุงเทพฯ ✈ เชียงใหม่", "region": "Thailand Domestic"},
    {"from": "BKK", "to": "HKT", "title": "กรุงเทพฯ ✈ ภูเก็ต", "region": "Thailand Domestic"},
]

def get_airport_info(code: str) -> dict:
    code = code.upper().strip()
    return ASIAN_AIRPORTS.get(code, {
        "city": code,
        "name": f"Airport {code}",
        "country": "International",
        "flag": "✈️"
    })
