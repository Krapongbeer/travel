// AirPrice Standalone Client Engine (for GitHub Pages and Offline/Client-side execution)

const ASIAN_AIRPORTS_DATA = {
    "BKK": {"city": "Bangkok (Suvarnabhumi)", "name": "Suvarnabhumi Airport", "country": "Thailand", "flag": "🇹🇭"},
    "DMK": {"city": "Bangkok (Don Mueang)", "name": "Don Mueang International", "country": "Thailand", "flag": "🇹🇭"},
    "CNX": {"city": "Chiang Mai", "name": "Chiang Mai International", "country": "Thailand", "flag": "🇹🇭"},
    "HKT": {"city": "Phuket", "name": "Phuket International", "country": "Thailand", "flag": "🇹🇭"},
    "KBV": {"city": "Krabi", "name": "Krabi Airport", "country": "Thailand", "flag": "🇹🇭"},
    "HDY": {"city": "Hat Yai", "name": "Hat Yai International", "country": "Thailand", "flag": "🇹🇭"},
    "USM": {"city": "Koh Samui", "name": "Samui Airport", "country": "Thailand", "flag": "🇹🇭"},
    "UTH": {"city": "Udon Thani", "name": "Udon Thani Airport", "country": "Thailand", "flag": "🇹🇭"},
    "CEI": {"city": "Chiang Rai", "name": "Mae Fah Luang - Chiang Rai", "country": "Thailand", "flag": "🇹🇭"},
    "NRT": {"city": "Tokyo (Narita)", "name": "Narita International", "country": "Japan", "flag": "🇯🇵"},
    "HND": {"city": "Tokyo (Haneda)", "name": "Tokyo Haneda", "country": "Japan", "flag": "🇯🇵"},
    "KIX": {"city": "Osaka (Kansai)", "name": "Kansai International", "country": "Japan", "flag": "🇯🇵"},
    "FUK": {"city": "Fukuoka", "name": "Fukuoka Airport", "country": "Japan", "flag": "🇯🇵"},
    "CTS": {"city": "Sapporo (Chitose)", "name": "New Chitose Airport", "country": "Japan", "flag": "🇯🇵"},
    "OKA": {"city": "Okinawa (Naha)", "name": "Naha Airport", "country": "Japan", "flag": "🇯🇵"},
    "NGO": {"city": "Nagoya (Chubu)", "name": "Chubu Centrair", "country": "Japan", "flag": "🇯🇵"},
    "ICN": {"city": "Seoul (Incheon)", "name": "Incheon International", "country": "South Korea", "flag": "🇰🇷"},
    "GMP": {"city": "Seoul (Gimpo)", "name": "Gimpo International", "country": "South Korea", "flag": "🇰🇷"},
    "PUS": {"city": "Busan", "name": "Gimhae International", "country": "South Korea", "flag": "🇰🇷"},
    "CJU": {"city": "Jeju Island", "name": "Jeju International", "country": "South Korea", "flag": "🇰🇷"},
    "TPE": {"city": "Taipei (Taoyuan)", "name": "Taiwan Taoyuan", "country": "Taiwan", "flag": "🇹🇼"},
    "TSA": {"city": "Taipei (Songshan)", "name": "Taipei Songshan", "country": "Taiwan", "flag": "🇹🇼"},
    "KHH": {"city": "Kaohsiung", "name": "Kaohsiung International", "country": "Taiwan", "flag": "🇹🇼"},
    "SIN": {"city": "Singapore", "name": "Singapore Changi Airport", "country": "Singapore", "flag": "🇸🇬"},
    "KUL": {"city": "Kuala Lumpur", "name": "Kuala Lumpur International", "country": "Malaysia", "flag": "🇲🇾"},
    "PEN": {"city": "Penang", "name": "Penang International", "country": "Malaysia", "flag": "🇲🇾"},
    "BKI": {"city": "Kota Kinabalu", "name": "Kota Kinabalu International", "country": "Malaysia", "flag": "🇲🇾"},
    "HKG": {"city": "Hong Kong", "name": "Hong Kong International", "country": "Hong Kong", "flag": "🇭🇰"},
    "MFM": {"city": "Macau", "name": "Macau International", "country": "Macau", "flag": "🇲🇴"},
    "SGN": {"city": "Ho Chi Minh City", "name": "Tan Son Nhat International", "country": "Vietnam", "flag": "🇻🇳"},
    "HAN": {"city": "Hanoi", "name": "Noi Bai International", "country": "Vietnam", "flag": "🇻🇳"},
    "DAD": {"city": "Da Nang", "name": "Da Nang International", "country": "Vietnam", "flag": "🇻🇳"},
    "PQC": {"city": "Phu Quoc", "name": "Phu Quoc International", "country": "Vietnam", "flag": "🇻🇳"},
    "DPS": {"city": "Bali (Denpasar)", "name": "Ngurah Rai International", "country": "Indonesia", "flag": "🇮🇩"},
    "CGK": {"city": "Jakarta", "name": "Soekarno-Hatta International", "country": "Indonesia", "flag": "🇮🇩"},
    "MNL": {"city": "Manila", "name": "Ninoy Aquino International", "country": "Philippines", "flag": "🇵🇭"},
    "CEB": {"city": "Cebu", "name": "Mactan-Cebu International", "country": "Philippines", "flag": "🇵🇭"},
    "PVG": {"city": "Shanghai (Pudong)", "name": "Shanghai Pudong International", "country": "China", "flag": "🇨🇳"},
    "PKX": {"city": "Beijing (Daxing)", "name": "Beijing Daxing International", "country": "China", "flag": "🇨🇳"},
    "CAN": {"city": "Guangzhou", "name": "Guangzhou Baiyun International", "country": "China", "flag": "🇨🇳"},
    "CTU": {"city": "Chengdu", "name": "Chengdu Tianfu International", "country": "China", "flag": "🇨🇳"},
    "KMG": {"city": "Kunming", "name": "Kunming Changshui International", "country": "China", "flag": "🇨🇳"}
};

const AIRLINE_METADATA_DATA = {
    "AirAsia": {
        "code": "FD", "logo": "https://images.kiwi.com/airlines/64/AK.png", "type": "lowcost",
        "official_url": "https://www.airasia.com/flight/th/th",
        "aircraft": "Airbus A320neo", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["USB Power", "อาหารสั่งซื้อล่วงหน้าได้"]
    },
    "Thai VietJet Air": {
        "code": "VZ", "logo": "https://images.kiwi.com/airlines/64/VJ.png", "type": "lowcost",
        "official_url": "https://th.vietjetair.com",
        "aircraft": "Airbus A321-200", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["เครื่องบินใหม่", "SkyBoss Lounge"]
    },
    "Thai Airways": {
        "code": "TG", "logo": "https://images.kiwi.com/airlines/64/TG.png", "type": "fullservice",
        "official_url": "https://www.thaiairways.com",
        "aircraft": "Boeing 777-300ER / Airbus A350-900", "baggage": "โหลดกระเป๋าฟรี 25-30 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["อาหารและเครื่องดื่มฟรี", "จอทีวีส่วนตัว In-flight Entertainment", "WiFi บนเครื่อง"]
    },
    "Bangkok Airways": {
        "code": "PG", "logo": "https://images.kiwi.com/airlines/64/PG.png", "type": "fullservice",
        "official_url": "https://www.bangkokair.com",
        "aircraft": "Airbus A320 / A319", "baggage": "โหลดกระเป๋าฟรี 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["ห้องรับรอง Boutique Lounge ฟรีสำหรับทุกคน", "อาหารว่างร้อนบนเครื่อง"]
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
        "aircraft": "Boeing 787 Dreamliner", "baggage": "ถือขึ้นเครื่อง 10 kg", "amenities": ["ScootPlus มี WiFi", "ห้องโดยสารเงียบ Scoot-in-Silence"]
    },
    "Singapore Airlines": {
        "code": "SQ", "logo": "https://images.kiwi.com/airlines/64/SQ.png", "type": "fullservice",
        "official_url": "https://www.singaporeair.com",
        "aircraft": "Boeing 787-10 / Airbus A350-900", "baggage": "โหลดกระเป๋าฟรี 25-30 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["อาหารรสเลิศฟรี", "Free High-Speed WiFi สำหรับ KrisFlyer", "KrisWorld Entertainment"]
    },
    "ANA": {
        "code": "NH", "logo": "https://images.kiwi.com/airlines/64/NH.png", "type": "fullservice",
        "official_url": "https://www.ana.co.jp/th/th",
        "aircraft": "Boeing 787-9 Dreamliner", "baggage": "โหลดกระเป๋าฟรี 2 ใบ (46 kg)", "amenities": ["สายการบิน 5 ดาว Skytrax", "อาหารญี่ปุ่นรสเลิศ", "จอสัมผัส HD ทุกที่นั่ง"]
    },
    "Japan Airlines": {
        "code": "JL", "logo": "https://images.kiwi.com/airlines/64/JL.png", "type": "fullservice",
        "official_url": "https://www.jal.co.th/thl/th",
        "aircraft": "Boeing 787-8 / 777-300ER", "baggage": "โหลดกระเป๋าฟรี 2 ใบ (ใบละ 23 kg)", "amenities": ["ที่นั่ง Economy กว้างที่สุด (JAL SKY WIDER)", "อาหารจากเชฟมิชลิน"]
    },
    "Peach Aviation": {
        "code": "MM", "logo": "https://images.kiwi.com/airlines/64/MM.png", "type": "lowcost",
        "official_url": "https://www.flypeach.com/th",
        "aircraft": "Airbus A321LR", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["ที่นั่ง Space Seat", "บินตรงคุ้มค่า"]
    },
    "ZIPAIR": {
        "code": "ZG", "logo": "https://images.kiwi.com/airlines/64/ZG.png", "type": "lowcost",
        "official_url": "https://www.zipair.net/th",
        "aircraft": "Boeing 787-8 Dreamliner", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["ฟรี High Speed WiFi ทุกที่นั่ง", "ที่นั่ง Full-Flat"]
    },
    "Korean Air": {
        "code": "KE", "logo": "https://images.kiwi.com/airlines/64/KE.png", "type": "fullservice",
        "official_url": "https://www.koreanair.com",
        "aircraft": "Boeing 787-9 / Airbus A380", "baggage": "โหลดกระเป๋าฟรี 23 kg + ถือขึ้นเครื่อง 10 kg", "amenities": ["บิบิมบับสูตรต้นตำรับ", "จอความบันเทิงส่วนตัว"]
    },
    "Asiana Airlines": {
        "code": "OZ", "logo": "https://images.kiwi.com/airlines/64/OZ.png", "type": "fullservice",
        "official_url": "https://flyasiana.com",
        "aircraft": "Airbus A350-900", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["อาหารเกาหลีแบบพรีเมียม", "In-flight Entertainment"]
    },
    "Jeju Air": {
        "code": "7C", "logo": "https://images.kiwi.com/airlines/64/7C.png", "type": "lowcost",
        "official_url": "https://www.jejuair.net",
        "aircraft": "Boeing 737-800", "baggage": "ถือขึ้นเครื่อง 10 kg", "amenities": ["Air Cafe", "เกมบนเครื่อง"]
    },
    "T'way Air": {
        "code": "TW", "logo": "https://images.kiwi.com/airlines/64/TW.png", "type": "lowcost",
        "official_url": "https://www.twayair.com",
        "aircraft": "Airbus A330-300", "baggage": "ถือขึ้นเครื่อง 10 kg", "amenities": ["ที่นั่ง Premium Flat"]
    },
    "Jin Air": {
        "code": "LJ", "logo": "https://images.kiwi.com/airlines/64/LJ.png", "type": "lowcost",
        "official_url": "https://www.jinair.com",
        "aircraft": "Boeing 777-200ER / 737-800", "baggage": "โหลดกระเป๋าฟรี 15 kg + ถือขึ้นเครื่อง 10 kg", "amenities": ["ที่นั่ง JINI PLUS", "ของว่างฟรี"]
    },
    "EVA Air": {
        "code": "BR", "logo": "https://images.kiwi.com/airlines/64/BR.png", "type": "fullservice",
        "official_url": "https://www.evaair.com",
        "aircraft": "Boeing 777-300ER / 787-10", "baggage": "โหลดกระเป๋าฟรี 23 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["สายการบิน 5 ดาว", "อาหารและไวน์ชั้นเลิศ", "WiFi"]
    },
    "China Airlines": {
        "code": "CI", "logo": "https://images.kiwi.com/airlines/64/CI.png", "type": "fullservice",
        "official_url": "https://www.china-airlines.com",
        "aircraft": "Airbus A350-900 / A321neo", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["In-flight Entertainment 4K", "WiFi & Bluetooth"]
    },
    "STARLUX Airlines": {
        "code": "JX", "logo": "https://images.kiwi.com/airlines/64/JX.png", "type": "fullservice",
        "official_url": "https://www.starlux-airlines.com",
        "aircraft": "Airbus A350-900 / A330neo", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["สายการบินบูทีคสุดหรู", "จอ 4K ทุกที่นั่ง", "ฟรี WiFi ไม่จำกัด"]
    },
    "Cathay Pacific": {
        "code": "CX", "logo": "https://images.kiwi.com/airlines/64/CX.png", "type": "fullservice",
        "official_url": "https://www.cathaypacific.com",
        "aircraft": "Airbus A350-1000 / A330-300", "baggage": "โหลดกระเป๋าฟรี 23 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["ห้องรับรอง The Pier", "4K Screens", "อาหารระดับพรีเมียม"]
    },
    "Hong Kong Express": {
        "code": "UO", "logo": "https://images.kiwi.com/airlines/64/UO.png", "type": "lowcost",
        "official_url": "https://www.hkexpress.com",
        "aircraft": "Airbus A321neo", "baggage": "ถือขึ้นเครื่อง 7 kg", "amenities": ["บินตรงเวลา", "อาหารสไตล์ฮ่องกง"]
    },
    "Greater Bay Airlines": {
        "code": "HB", "logo": "https://images.kiwi.com/airlines/64/HB.png", "type": "lowcost",
        "official_url": "https://www.greaterbay-airlines.com",
        "aircraft": "Boeing 737-800", "baggage": "โหลดกระเป๋า 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["ฟรีสัมภาระเช็คอิน", "เครื่องบินใหม่"]
    },
    "Hong Kong Airlines": {
        "code": "HX", "logo": "https://images.kiwi.com/airlines/64/HX.png", "type": "fullservice",
        "official_url": "https://www.hongkongairlines.com",
        "aircraft": "Airbus A330-300", "baggage": "โหลดกระเป๋าฟรี 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["อาหารร้อนฟรี"]
    },
    "Emirates": {
        "code": "EK", "logo": "https://images.kiwi.com/airlines/64/EK.png", "type": "fullservice",
        "official_url": "https://www.emirates.com/th/thai",
        "aircraft": "Airbus A380-800 / Boeing 777-300ER", "baggage": "โหลดกระเป๋าฟรี 25-30 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["เครื่องบินยักษ์ A380 สองชั้น", "ice Entertainment 6,500 ช่อง", "อาหารและไวน์ฟรี"]
    },
    "Vietnam Airlines": {
        "code": "VN", "logo": "https://images.kiwi.com/airlines/64/VN.png", "type": "fullservice",
        "official_url": "https://www.vietnamairlines.com",
        "aircraft": "Boeing 787-9 / Airbus A350", "baggage": "โหลดกระเป๋าฟรี 23 kg", "amenities": ["อาหารเวียดนามเลิศรส", "Lotus Lounge"]
    },
    "Bamboo Airways": {
        "code": "QH", "logo": "https://images.kiwi.com/airlines/64/QH.png", "type": "fullservice",
        "official_url": "https://www.bambooairways.com",
        "aircraft": "Airbus A321neo", "baggage": "โหลดกระเป๋าฟรี 20 kg", "amenities": ["อาหารร้อนฟรี", "บริการ 5 ดาว"]
    },
    "Malaysia Airlines": {
        "code": "MH", "logo": "https://images.kiwi.com/airlines/64/MH.png", "type": "fullservice",
        "official_url": "https://www.malaysiaairlines.com",
        "aircraft": "Airbus A350-900 / Boeing 737-800", "baggage": "โหลดกระเป๋าฟรี 20 kg + ถือขึ้นเครื่อง 7 kg", "amenities": ["สะเต๊ะชื่อดังบนเครื่อง", "MHstudio Entertainment"]
    },
    "Batik Air": {
        "code": "OD", "logo": "https://images.kiwi.com/airlines/64/OD.png", "type": "lowcost",
        "official_url": "https://www.batikair.com",
        "aircraft": "Boeing 737 MAX 8", "baggage": "ถือขึ้นเครื่อง 7 kg + โหลด 10 kg ฟรี", "amenities": ["ที่นั่งหนัง", "ช่องชาร์จไฟ"]
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
};

// Seed-based Pseudo-Random Number Generator
function createPrng(seedStr) {
    let h = 0xdeadbeef;
    for (let i = 0; i < seedStr.length; i++) {
        h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
    }
    return function(min, max) {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        const rand = ((h >>> 0) / 4294967296);
        return Math.floor(rand * (max - min + 1)) + min;
    };
}

function getAirportInfoClient(code) {
    code = (code || "").toUpperCase().trim();
    return ASIAN_AIRPORTS_DATA[code] || {
        city: code,
        name: `Airport ${code}`,
        country: "International",
        flag: "✈️"
    };
}

function generateAirlineDirectUrlClient(airlineName, airlineCode, officialUrl, origin, destination, depDate, retDate, adults = 1) {
    const d8 = (depDate || "").replace(/-/g, "");
    const r8 = (retDate || "").replace(/-/g, "");
    const dIso = depDate || "";
    const rIso = retDate || "";
    const trip = retDate ? "R" : "O";
    const a = airlineName || "";

    if (a.includes("AirAsia")) {
        const retParam = retDate ? `&returnDate=${rIso}&tripType=R` : "&tripType=O";
        return `https://www.airasia.com/buy/fare-selection?origin=${origin}&destination=${destination}&departureDate=${dIso}${retParam}&adult=${adults}&child=0&infant=0&lang=th`;
    }
    if (a.includes("Peach")) {
        const rParam = retDate ? `&DD2=${r8}&o2=${destination}MM&d2=${origin}MM` : "";
        const tripCode = retDate ? "2" : "1";
        return `https://booking.flypeach.com/th/Search?culture=th-TH&currency=THB&o1=${origin}MM&d1=${destination}MM&DD1=${d8}${rParam}&ADT=${adults}&CHD=0&INF=0&INFF=0&TripType=${tripCode}&MC=MM`;
    }
    if (a.includes("ZIPAIR")) {
        const rParam = retDate ? `&ret=${r8}` : "";
        const tripCode = retDate ? "2" : "1";
        return `https://booking.zipair.net/en/?org=${origin}&dst=${destination}&dep=${d8}${rParam}&adt=${adults}&chd=0&inf=0&trp=${tripCode}`;
    }
    if (a.includes("Scoot")) {
        const rParam = retDate ? `&returnDate=${r8}` : "";
        return `https://www.flyscoot.com/th/book/flights?originIata=${origin}&destinationIata=${destination}&outboundDate=${d8}${rParam}&adult=${adults}&child=0&infant=0&tripType=${trip}`;
    }
    if (a.includes("VietJet") || a.includes("Vietjet")) {
        const rParam = retDate ? `&returnDate=${d8}` : "";
        return `https://th.vietjetair.com/en?departureStation=${origin}&arrivalStation=${destination}&departureDate=${d8}${rParam}&adultCount=${adults}&childCount=0&infantCount=0&isRoundTrip=${retDate ? 'true' : 'false'}`;
    }
    if (a.includes("Thai Airways")) {
        const rParam = retDate ? `&returnDate=${rIso}` : "";
        return `https://www.thaiairways.com/en_TH/book/book_a_flight/flight_results.page?origin=${origin}&destination=${destination}&departDate=${dIso}${rParam}&tripType=${trip}&adultNum=${adults}&childNum=0&infantNum=0`;
    }
    if (a.includes("Singapore Airlines")) {
        const rParam = retDate ? `&returnDate=${rIso}` : "";
        return `https://www.singaporeair.com/en_UK/plan-travel/book/search-flights/?tripType=${trip}&origin=${origin}&destination=${destination}&departDate=${dIso}${rParam}&adult=${adults}&child=0&infant=0&currency=THB`;
    }
    if (a.includes("Korean Air")) {
        const rParam = retDate ? `&returnDate=${r8}` : "";
        return `https://www.koreanair.com/booking/find-flights?cabin=Y&tripType=${retDate ? 'RT' : 'OW'}&origin=${origin}&destination=${destination}&departDate=${d8}${rParam}&adultCount=${adults}&childCount=0&infantCount=0`;
    }
    if (a.includes("ANA")) {
        return `https://aswbe-i.ana.co.jp/international_asw/pages/purchase/flight/select/flexi_cal.xhtml?TYPE=${retDate ? 'RT' : 'OW'}&FROMCD=${origin}&TOCD=${destination}&DEPDATE=${d8}&ADULT=${adults}&CHILD=0&INFANT=0&LANG=th&CURRENCY=THB`;
    }
    if (a.includes("Japan Airlines") || a.includes("JAL")) {
        const rParam = retDate ? `&dep2Date=${r8}` : "";
        return `https://www.jal.co.jp/en/inter/booking/reserve.html?f_dep_ac=${origin}&f_arv_ac=${destination}&f_dep_dt=${d8}${rParam}&f_pax_adult=${adults}&f_pax_child=0&f_class=e&f_type=${retDate ? 'RD' : 'OW'}`;
    }
    if (a.includes("Cathay")) {
        const rParam = retDate ? `&returnDate=${rIso}` : "";
        return `https://www.cathaypacific.com/cx/en_TH/book-a-flight.html?origin=${origin}&destination=${destination}&departureDate=${dIso}${rParam}&numAdult=${adults}&numChild=0&numInfant=0&tripType=${retDate ? 'ROUNDTRIP' : 'ONEWAY'}`;
    }
    if (a.includes("EVA Air")) {
        const rParam = retDate ? `&d2=${rIso}` : "";
        return `https://www.evaair.com/en-global/book-a-flight/search-flights/?dep=${origin}&arr=${destination}&d1=${dIso}${rParam}&adult=${adults}&child=0&infant=0&triptype=${retDate ? 'RT' : 'OW'}`;
    }
    if (a.includes("Bangkok Airways")) {
        const rParam = retDate ? `&ReturnDate=${d8}` : "";
        return `https://www.bangkokair.com/reservations/availability?OriginCode=${origin}&DestinationCode=${destination}&DepartureDate=${d8}${rParam}&Adults=${adults}&Children=0&Infants=0&TripType=${retDate ? 'RT' : 'OW'}`;
    }

    return officialUrl || `https://www.google.com/travel/flights`;
}

function generateBookingLinksClient(origin, destination, depDate, retDate, adults = 1) {
    const paxQuery = adults > 1 ? `%20with%20${adults}%20adults` : "";
    const gfUrl = retDate
        ? `https://www.google.com/travel/flights?q=Flights%20to%20${destination}%20from%20${origin}%20on%20${depDate}%20through%20${retDate}${paxQuery}&hl=th&curr=THB`
        : `https://www.google.com/travel/flights?q=Flights%20to%20${destination}%20from%20${origin}%20on%20${depDate}%20oneway${paxQuery}&hl=th&curr=THB`;

    const tripType = retDate ? "RT" : "OW";
    const rdateParam = retDate ? `&rdate=${retDate}` : "";
    const tripUrl = `https://th.trip.com/flights/showroom?flighttype=${tripType}&dcitycode=${origin.toUpperCase()}&acitycode=${destination.toUpperCase()}&ddate=${depDate}${rdateParam}&adult=${adults}&child=0&currency=THB&locale=th-TH`;

    const d8 = depDate ? depDate.replace(/-/g, "").slice(2) : "";
    const r8 = retDate ? retDate.replace(/-/g, "").slice(2) : "";
    const skyDates = retDate ? `${d8}/${r8}/` : `${d8}/`;
    const skyscannerUrl = `https://www.skyscanner.co.th/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${skyDates}?adultsv2=${adults}&currency=THB`;

    const agodaRet = retDate ? `&returnDate=${retDate}` : "";
    const agodaUrl = `https://www.agoda.com/flights/${origin.toLowerCase()}-${destination.toLowerCase()}?departDate=${depDate}${agodaRet}&adults=${adults}&locale=th-th`;

    return {
        google_flights: gfUrl,
        trip_com: tripUrl,
        skyscanner: skyscannerUrl,
        agoda: agodaUrl
    };
}

function searchFlightsClient(origin, destination, departureDate, returnDate, adults = 1) {
    origin = (origin || "BKK").toUpperCase().trim();
    destination = (destination || "NRT").toUpperCase().trim();

    if (returnDate && returnDate < departureDate) {
        throw new Error("วันเดินทางกลับต้องไม่ย้อนหลังวันเดินทางไป (Return date cannot be earlier than departure date)");
    }

    const originInfo = getAirportInfoClient(origin);
    const destInfo = getAirportInfoClient(destination);
    const isDomestic = (originInfo.country === "Thailand" && destInfo.country === "Thailand");
    const destCountry = destInfo.country || "";
    const links = generateBookingLinksClient(origin, destination, departureDate, returnDate, adults);

    let candidates = [];
    if (isDomestic) {
        candidates = [
            ["Thai VietJet Air", 950, 1600, "06:15", "07:30", "16:20", "17:35", "1h 15m", 0, null],
            ["AirAsia", 1050, 1750, "06:40", "07:55", "17:00", "18:15", "1h 15m", 0, null],
            ["Thai Lion Air", 990, 1650, "07:30", "08:45", "18:10", "19:25", "1h 15m", 0, null],
            ["Nok Air", 1150, 1850, "08:15", "09:30", "15:20", "16:35", "1h 15m", 0, null],
            ["Bangkok Airways", 2100, 3200, "08:45", "10:00", "14:15", "15:30", "1h 15m", 0, "รวมโหลดกระเป๋า 20kg + เลานจ์ฟรี"],
            ["Thai Airways", 2400, 3600, "09:30", "10:45", "16:45", "18:00", "1h 15m", 0, "Full Service กระเป๋า 25kg + อาหารว่าง"],
            ["AirAsia", 1100, 1900, "11:20", "12:35", "19:15", "20:30", "1h 15m", 0, null],
            ["Thai VietJet Air", 1000, 1700, "13:00", "14:15", "10:10", "11:25", "1h 15m", 0, null],
            ["Nok Air", 1250, 2100, "14:20", "15:35", "11:40", "12:55", "1h 15m", 0, null],
            ["Thai Lion Air", 1050, 1800, "15:45", "17:00", "12:30", "13:45", "1h 15m", 0, null],
            ["Bangkok Airways", 2200, 3400, "16:00", "17:15", "18:30", "19:45", "1h 15m", 0, "รวมโหลดกระเป๋า 20kg + เลานจ์"],
            ["Thai Airways", 2500, 3800, "18:30", "19:45", "08:00", "09:15", "1h 15m", 0, "Full Service กระเป๋า 25kg + อาหาร"],
            ["AirAsia", 1200, 2050, "19:50", "21:05", "21:40", "22:55", "1h 15m", 0, null],
            ["Thai VietJet Air", 1050, 1750, "20:45", "22:00", "22:35", "23:50", "1h 15m", 0, null]
        ];
    } else if (destCountry === "Japan") {
        candidates = [
            ["Thai VietJet Air", 5290, 7900, "00:45", "08:55", "09:55", "14:05", "6h 10m", 0, "บินตรงรอบดึก ตื่นเช้าถึงญี่ปุ่น"],
            ["Peach Aviation", 4990, 7600, "01:25", "09:15", "18:00", "22:45", "5h 50m", 0, "บินตรงประหยัดสุด"],
            ["AirAsia", 5890, 8600, "02:15", "10:40", "11:45", "16:10", "6h 25m", 0, "XJ600 บินตรงดึก"],
            ["ANA", 14500, 20500, "07:10", "15:05", "17:50", "22:45", "5h 55m", 0, "NH848 สายการบิน 5 ดาว บินตรง กระเป๋า 46kg"],
            ["Thai Airways", 13900, 19200, "08:00", "16:15", "17:25", "22:30", "6h 15m", 0, "TG642 บินตรงเช้า Full Service กระเป๋า 30kg + อาหาร"],
            ["Japan Airlines", 14900, 21000, "08:20", "16:25", "18:20", "23:10", "6h 05m", 0, "JL034 สายการบิน 5 ดาว JAL SKY WIDER"],
            ["Cathay Pacific", 8500, 11900, "08:15", "17:30", "14:15", "21:40", "7h 15m", 1, "CX700 แวะพักฮ่องกง 1h 30m รวมกระเป๋า 23kg"],
            ["AirAsia", 6200, 9100, "09:30", "17:55", "13:30", "17:50", "6h 25m", 0, "XJ606 บินตรงรอบเช้า ถึงเย็น"],
            ["Scoot", 6800, 9500, "09:15", "19:45", "11:00", "19:30", "8h 30m", 1, "แวะพักสิงคโปร์ (SIN) 1h 45m"],
            ["STARLUX Airlines", 9200, 13500, "09:20", "18:30", "13:30", "21:45", "7h 10m", 1, "แวะไทเป (TPE) จอ 4K ทุกที่นั่ง + ฟรี WiFi"],
            ["Singapore Airlines", 11500, 16800, "09:40", "20:15", "10:30", "19:55", "8h 35m", 1, "SQ705 แวะสิงคโปร์ สายการบิน 5 ดาว ฟรี WiFi"],
            ["China Airlines", 8900, 12800, "11:15", "20:45", "09:10", "16:20", "7h 30m", 1, "CI834 แวะไทเป รวมกระเป๋า 23kg + อาหาร"],
            ["EVA Air", 9800, 13900, "12:20", "21:30", "10:00", "17:00", "7h 10m", 1, "BR212 แวะไทเป 5 ดาว รวมกระเป๋า 23kg"],
            ["Thai Airways", 14200, 19800, "13:00", "21:10", "10:45", "15:40", "6h 10m", 0, "TG676 บินตรงบ่าย Full Service อาหารร้อน"],
            ["Vietnam Airlines", 7500, 10500, "14:20", "22:45", "09:30", "17:15", "8h 25m", 1, "VN614 แวะฮานอย (HAN) รวมกระเป๋า 23kg"],
            ["Cathay Pacific", 8800, 12200, "14:15", "22:40", "10:35", "18:15", "8h 25m", 1, "CX708 แวะพักฮ่องกง 2h 00m"],
            ["Malaysia Airlines", 7900, 11200, "11:05", "21:30", "09:15", "17:50", "8h 25m", 1, "MH783 แวะกัวลาลัมเปอร์ (KUL) มีสะเต๊ะชื่อดัง"],
            ["Thai Airways", 14500, 20200, "22:30", "06:45", "11:00", "15:45", "6h 15m", 0, "TG640 บินตรงดึก Full Service นอนบนเครื่อง"],
            ["Japan Airlines", 15200, 21800, "22:55", "06:40", "11:30", "16:25", "5h 45m", 0, "JL708 บินตรงดึก 5 ดาว นอนสบาย"],
            ["ANA", 14800, 21200, "22:50", "06:30", "11:15", "16:10", "5h 40m", 0, "NH850 บินตรงดึก 5 ดาว กระเป๋า 46kg"],
            ["ZIPAIR", 6700, 9400, "23:10", "07:30", "09:00", "13:40", "6h 20m", 0, "ZG052 เครื่อง Boeing 787 มีฟรี WiFi ตลอดไฟลท์"]
        ];
    } else if (destCountry === "South Korea") {
        candidates = [
            ["T'way Air", 4890, 7500, "00:30", "08:00", "18:30", "22:30", "5h 30m", 0, "บินตรงดึก"],
            ["Asiana Airlines", 11500, 16200, "01:10", "08:35", "19:30", "23:20", "5h 25m", 0, "OZ742 บินตรง Full Service กระเป๋า 23kg"],
            ["AirAsia", 4990, 7800, "01:50", "09:20", "11:20", "15:10", "5h 30m", 0, "XJ700 บินตรงดึกประหยัด"],
            ["Jeju Air", 5100, 7900, "02:10", "09:45", "20:05", "00:10", "5h 35m", 0, "7C2204 บินตรงดึก"],
            ["Jin Air", 5300, 8100, "02:30", "10:05", "17:15", "21:30", "5h 35m", 0, "LJ002 รวมกระเป๋า 15kg ฟรี"],
            ["Thai Airways", 12500, 17800, "08:05", "15:35", "17:30", "21:20", "5h 30m", 0, "TG658 บินตรงกลางวัน Full Service กระเป๋า 25kg"],
            ["Korean Air", 12800, 18100, "09:45", "17:15", "18:15", "22:10", "5h 30m", 0, "KE652 บินตรง Full Service บิบิมบับต้นตำรับ"],
            ["Cathay Pacific", 7500, 10800, "08:15", "17:05", "13:40", "21:10", "6h 50m", 1, "แวะพักฮ่องกง 1h 25m รวมกระเป๋า"],
            ["Scoot", 5800, 8600, "08:50", "18:30", "11:30", "20:15", "7h 40m", 1, "แวะพักสิงคโปร์ (SIN)"],
            ["Vietnam Airlines", 6800, 9600, "11:55", "20:40", "10:15", "18:00", "8h 45m", 1, "แวะพักโฮจิมินห์ (SGN)"],
            ["AirAsia", 5200, 8200, "11:20", "18:50", "09:00", "13:20", "5h 30m", 0, "XJ708 บินตรงกลางวัน"],
            ["Korean Air", 13200, 18500, "22:45", "06:10", "17:40", "21:45", "5h 25m", 0, "KE658 บินตรงดึก Full Service นอนบนเครื่อง"],
            ["Thai Airways", 12900, 18200, "23:30", "06:55", "09:35", "13:30", "5h 25m", 0, "TG656 บินตรงดึก Full Service"]
        ];
    } else if (destCountry === "Taiwan") {
        candidates = [
            ["AirAsia", 3490, 5200, "06:40", "11:25", "13:55", "16:45", "3h 45m", 0, "FD230 บินตรงเช้า"],
            ["Thai Airways", 8200, 11800, "08:25", "13:05", "14:10", "16:55", "3h 40m", 0, "TG634 บินตรง Full Service กระเป๋า 25kg"],
            ["Thai VietJet Air", 3590, 5300, "09:00", "13:45", "14:45", "17:35", "3h 45m", 0, "VZ560 บินตรง"],
            ["Tigerair Taiwan", 3790, 5600, "09:45", "14:30", "15:30", "18:25", "3h 45m", 0, "IT506 บินตรงสายการบินไต้หวัน"],
            ["STARLUX Airlines", 7500, 10500, "11:00", "15:40", "13:30", "16:20", "3h 40m", 0, "JX742 บูทีคหรู จอ 4K ทุกที่นั่ง + ฟรี WiFi"],
            ["EVA Air", 7900, 11500, "12:20", "17:00", "09:10", "11:50", "3h 40m", 0, "BR212 บินตรง 5 ดาว รวมกระเป๋า 23kg"],
            ["Cathay Pacific", 6200, 8900, "11:00", "17:50", "14:15", "20:30", "5h 50m", 1, "CX700 แวะพักฮ่องกง 1h 35m"],
            ["China Airlines", 7600, 10900, "13:35", "18:15", "09:00", "11:45", "3h 40m", 0, "CI834 บินตรง Full Service รวมกระเป๋า 23kg"],
            ["STARLUX Airlines", 7800, 10900, "14:50", "19:30", "11:00", "13:45", "3h 40m", 0, "JX746 จอ 4K ฟรี WiFi"],
            ["Thai Airways", 8500, 12200, "16:30", "21:10", "18:00", "20:45", "3h 40m", 0, "TG636 บินตรง Full Service รวมกระเป๋า"],
            ["China Airlines", 7900, 11200, "17:05", "21:45", "13:35", "16:20", "3h 40m", 0, "CI836 บินตรง Full Service"],
            ["EVA Air", 8200, 11900, "17:35", "22:15", "13:10", "15:50", "3h 40m", 0, "BR206 บินตรง 5 ดาว"]
        ];
    } else {
        candidates = [
            ["AirAsia", 2490, 4200, "08:00", "12:30", "14:30", "18:30", "3h 30m", 0, "บินตรงประหยัด"],
            ["Scoot", 2890, 4800, "09:00", "15:15", "11:30", "18:00", "5h 15m", 1, "แวะพักสิงคโปร์ (SIN)"],
            ["Cathay Pacific", 6200, 9200, "08:15", "15:30", "12:15", "19:30", "6h 15m", 1, "แวะพักฮ่องกง (HKG) รวมกระเป๋า"],
            ["Singapore Airlines", 6900, 10500, "09:40", "16:30", "10:00", "16:45", "5h 50m", 1, "แวะพักสิงคโปร์ (SIN) 5 ดาว"],
            ["Thai Airways", 6500, 9900, "10:30", "15:00", "17:30", "21:00", "3h 30m", 0, "บินตรง Full Service รวมกระเป๋า"],
            ["Malaysia Airlines", 4500, 7200, "11:05", "17:40", "13:30", "19:15", "5h 35m", 1, "แวะกัวลาลัมเปอร์ (KUL)"],
            ["Emirates", 8500, 13500, "13:45", "20:30", "09:15", "15:45", "5h 45m", 0, "บินตรง/ต่อเครื่อง EK 5 ดาว"],
            ["Thai VietJet Air", 2590, 4100, "15:30", "19:45", "11:15", "15:30", "3h 15m", 0, "บินตรง"],
            ["Thai Airways", 7200, 10800, "18:15", "22:45", "08:00", "12:30", "3h 30m", 0, "TG บินตรง Full Service"]
        ];
    }

    const rng = createPrng(`${origin}-${destination}-${departureDate}`);
    const priceMultiplier = returnDate ? 1.85 : 1.0;

    const offers = candidates.map(c => {
        const airlineName = c[0];
        const minP = c[1], maxP = c[2];
        const depT = c[3], arrT = c[4];
        const retDepT = c[5] || "14:00";
        const retArrT = c[6] || "18:00";
        const dur = c[7] || "4h 00m";
        const stops = c[8] || 0;
        const stopDesc = c[9] || (stops === 0 ? "บินตรง (Non-stop)" : `${stops} จุดแวะพัก`);

        const meta = AIRLINE_METADATA_DATA[airlineName] || {
            code: "FL", logo: "", type: "standard",
            official_url: "https://www.google.com/travel/flights",
            aircraft: "Airbus A321neo / Boeing 737",
            baggage: "ถือขึ้นเครื่อง 7 kg",
            amenities: ["มาตรฐานการเดินทาง"]
        };

        const basePrice = rng(minP, maxP);
        const finalPrice = Math.round(basePrice * priceMultiplier / 10) * 10;
        const flightNoOut = `${meta.code}${rng(100, 999)}`;
        const flightNoIn = `${meta.code}${rng(100, 999)}`;

        const airlineDirectUrl = generateAirlineDirectUrlClient(
            airlineName, meta.code, meta.official_url,
            origin, destination, departureDate, returnDate, adults
        );

        const outboundLeg = {
            origin: origin,
            origin_name: `${originInfo.flag} ${originInfo.city}`,
            destination: destination,
            destination_name: `${destInfo.flag} ${destInfo.city}`,
            date: departureDate,
            flight_number: flightNoOut,
            departure_time: depT,
            arrival_time: arrT,
            duration: dur,
            stops: stops,
            stop_details: stopDesc,
            aircraft: meta.aircraft || "Airbus A320neo",
            baggage: meta.baggage || "ถือขึ้นเครื่อง 7 kg",
            amenities: meta.amenities || []
        };

        let inboundLeg = null;
        if (returnDate) {
            inboundLeg = {
                origin: destination,
                origin_name: `${destInfo.flag} ${destInfo.city}`,
                destination: origin,
                destination_name: `${originInfo.flag} ${originInfo.city}`,
                date: returnDate,
                flight_number: flightNoIn,
                departure_time: retDepT,
                arrival_time: retArrT,
                duration: dur,
                stops: stops,
                stop_details: stopDesc,
                aircraft: meta.aircraft || "Airbus A320neo",
                baggage: meta.baggage || "ถือขึ้นเครื่อง 7 kg",
                amenities: meta.amenities || []
            };
        }

        const providers = [
            {
                name: `เว็บตรง ${airlineName} (Official)`,
                type: "official",
                price: finalPrice,
                badge: "✅ กรอกข้อมูลล่วงหน้าแล้ว",
                url: airlineDirectUrl,
                is_prefilled: true
            },
            {
                name: "Trip.com",
                type: "ota",
                price: Math.round(finalPrice * 0.98 / 10) * 10,
                badge: "มีโค้ดลดเพิ่ม",
                url: links.trip_com,
                is_prefilled: true
            },
            {
                name: "Google Flights",
                type: "aggregator",
                price: finalPrice,
                badge: "ราคามาตรฐานกลาง",
                url: links.google_flights,
                is_prefilled: true
            },
            {
                name: "Skyscanner",
                type: "meta",
                price: finalPrice,
                badge: "เปรียบเทียบเอเจนซี่",
                url: links.skyscanner,
                is_prefilled: true
            },
            {
                name: "Agoda Flights",
                type: "ota",
                price: Math.round(finalPrice * 0.99 / 10) * 10,
                badge: "Agoda VIP Cash",
                url: links.agoda,
                is_prefilled: true
            }
        ];

        return {
            origin: origin,
            origin_name: `${originInfo.flag} ${originInfo.city}`,
            destination: destination,
            destination_name: `${destInfo.flag} ${destInfo.city}`,
            departure_date: departureDate,
            return_date: returnDate,
            airline: airlineName,
            airline_logo: meta.logo || "",
            airline_type: meta.type || "standard",
            aircraft: meta.aircraft || "Airbus A320",
            baggage_info: meta.baggage || "ถือขึ้นเครื่อง 7 kg",
            amenities: meta.amenities || [],
            flight_number: flightNoOut,
            departure_time: depT,
            arrival_time: arrT,
            duration: dur,
            stops: stops,
            stop_details: stopDesc,
            price: finalPrice,
            price_per_person: finalPrice,
            price_total: finalPrice * adults,
            total_passengers: adults,
            currency: "THB",
            outbound: outboundLeg,
            inbound: inboundLeg,
            providers: providers,
            booking_url: airlineDirectUrl,
            trip_url: links.trip_com,
            skyscanner_url: links.skyscanner,
            official_url: airlineDirectUrl,
            is_best_price: false
        };
    });

    offers.sort((a, b) => a.price - b.price);
    if (offers.length > 0) {
        offers[0].is_best_price = true;
    }

    return {
        origin: originInfo,
        destination: destInfo,
        departure_date: departureDate,
        return_date: returnDate,
        adults: adults,
        total_passengers: adults,
        total_results: offers.length,
        lowest_price: offers[0] ? offers[0].price : null,
        offers: offers
    };
}

function fetchPriceGridClient(origin, destination, centerDate, returnDate, adults = 1, days = 9) {
    const destInfo = getAirportInfoClient(destination);
    const destCountry = destInfo.country || "";
    const centerDt = new Date(centerDate);
    if (isNaN(centerDt.getTime())) return [];

    const half = Math.floor(days / 2);
    const priceRangeMap = {
        "Thailand": [950, 2800],
        "Japan": [5200, 21500],
        "South Korea": [4990, 18200],
        "Taiwan": [3690, 12800],
        "Singapore": [1890, 8500],
        "Hong Kong": [2690, 9500],
        "Vietnam": [1750, 6800],
        "Indonesia": [3100, 11500],
        "China": [3490, 12900]
    };

    let [minBase, maxBase] = priceRangeMap[destCountry] || [4200, 13500];
    if (returnDate) {
        minBase = Math.floor(minBase * 1.8);
        maxBase = Math.floor(maxBase * 1.85);
    }

    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const weekendMult = {5: 1.12, 6: 1.18, 0: 1.08}; // Fri, Sat, Sun

    const result = [];
    for (let i = -half; i <= half; i++) {
        const dt = new Date(centerDt);
        dt.setDate(centerDt.getDate() + i);
        const dateStr = dt.toISOString().split("T")[0];
        const rng = createPrng(`${origin}-${destination}-${dateStr}-grid`);

        const weekday = dt.getDay();
        const mult = weekendMult[weekday] || 1.0;
        const base = rng(minBase, maxBase);
        const price = Math.round(base * mult * adults / 100) * 100;
        const label = `${dt.getDate()} ${thaiMonths[dt.getMonth()]}`;

        result.push({
            date: dateStr,
            label: label,
            day_name: dayNames[weekday],
            price: price,
            is_selected: (dateStr === centerDate),
            is_cheapest: false
        });
    }

    if (result.length > 0) {
        const minP = Math.min(...result.map(r => r.price));
        result.forEach(r => {
            r.is_cheapest = (r.price === minP);
        });
    }

    return result;
}

function getTimeSlotsClient(airline, origin, destination, departureDate, returnDate, adults = 1) {
    const meta = AIRLINE_METADATA_DATA[airline] || {
        code: "FL", type: "standard",
        aircraft: "Airbus A320"
    };
    const code = meta.code || "FL";
    const destInfo = getAirportInfoClient(destination);
    const destCountry = destInfo.country || "";

    const durationMap = {
        "Japan": 370, "South Korea": 320, "Taiwan": 220,
        "Singapore": 145, "Hong Kong": 165, "Vietnam": 100, "Indonesia": 265
    };
    const durMin = durationMap[destCountry] || 240;

    const slotsRaw = [
        ["เช้าตรู่ (Midnight)", "01:15", 0.90],
        ["เช้า (Morning)", "07:30", 1.05],
        ["บ่าย (Afternoon)", "13:00", 1.00],
        ["เย็น (Evening)", "18:45", 0.95]
    ];

    const rng = createPrng(`${airline}-${origin}-${destination}-${departureDate}-slots`);
    const countryPrice = {
        "Japan": [5990, 14900], "South Korea": [4990, 12800], "Taiwan": [3890, 8900],
        "Singapore": [1990, 5900], "Hong Kong": [2990, 6500], "Vietnam": [1990, 4500],
        "Indonesia": [3100, 7500]
    }[destCountry] || [4200, 10000];

    const basePrice = rng(countryPrice[0], countryPrice[1]);
    const priceMult = returnDate ? 1.85 : 1.0;

    const result = slotsRaw.map(([label, depTime, priceFactor]) => {
        const [depH, depM] = depTime.split(":").map(Number);
        const arrTotalMin = depH * 60 + depM + durMin + rng(-10, 15);
        const arrH = Math.floor(arrTotalMin / 60) % 24;
        const arrM = arrTotalMin % 60;
        const arrTime = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
        const nextDay = arrTotalMin >= 1440;
        const durStr = `${Math.floor(durMin / 60)}h ${String(durMin % 60).padStart(2, '0')}m`;

        const flightNo = `${code}${rng(100, 999)}`;
        const slotBase = Math.round(basePrice * priceFactor * priceMult / 100) * 100;
        const price = slotBase * adults;

        let retDep = null, retArr = null, retFn = null;
        if (returnDate) {
            const retH = (depH + rng(2, 6)) % 24;
            retDep = `${String(retH).padStart(2, '0')}:${String(rng(0, 59)).padStart(2, '0')}`;
            const retArrTotal = retH * 60 + rng(0, 59) + durMin;
            retArr = `${String(Math.floor(retArrTotal / 60) % 24).padStart(2, '0')}:${String(retArrTotal % 60).padStart(2, '0')}`;
            retFn = `${code}${rng(100, 999)}`;
        }

        return {
            label: label,
            flight_number: flightNo,
            departure_time: depTime,
            arrival_time: arrTime + (nextDay ? "+1" : ""),
            duration: durStr,
            price: price,
            price_per_person: slotBase,
            return_flight_number: retFn,
            return_departure_time: retDep,
            return_arrival_time: retArr,
            is_cheapest: false
        };
    });

    if (result.length > 0) {
        const minP = Math.min(...result.map(s => s.price));
        result.forEach(s => {
            s.is_cheapest = (s.price === minP);
        });
    }

    return result;
}

// Generate client-side Multi-Passenger Auto-Fill script
function generateClientAutofillScript(passengers) {
    if (!passengers || passengers.length === 0) return "// No passengers provided";
    const passengersJson = JSON.stringify(passengers);
    return `(function() {
    const passengers = ${passengersJson};
    console.log("✈️ AirPrice Multi-Passenger Auto-Fill running for " + passengers.length + " passengers:", passengers);

    function triggerEvents(el, val) {
        if (!el) return;
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    function findInputs(patterns) {
        let found = [];
        patterns.forEach(pat => {
            document.querySelectorAll(pat).forEach(el => {
                if (!found.includes(el)) found.push(el);
            });
        });
        return found;
    }

    // 1. Primary Contact Info (Passenger 1)
    const p1 = passengers[0];
    findInputs(['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]']).forEach(el => triggerEvents(el, p1.email));
    findInputs(['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[name*="mobile" i]']).forEach(el => triggerEvents(el, p1.phone_number || p1.phone));

    // 2. Query all field groups
    const firstNames = findInputs(['input[name*="first" i]', 'input[id*="first" i]', 'input[placeholder*="First" i]', 'input[aria-label*="First" i]']);
    const lastNames = findInputs(['input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="Last" i]', 'input[aria-label*="Last" i]']);
    const passports = findInputs(['input[name*="passport" i]', 'input[id*="passport" i]', 'input[placeholder*="Passport" i]']);
    const dobs = findInputs(['input[name*="dob" i]', 'input[name*="birth" i]', 'input[id*="birth" i]']);

    passengers.forEach((p, idx) => {
        const fn = p.first_name || p.firstName || '';
        const ln = p.last_name || p.lastName || '';
        const pass = p.passport_number || p.passport || '';
        const dob = p.date_of_birth || p.dob || '';

        if (firstNames[idx]) triggerEvents(firstNames[idx], fn);
        if (lastNames[idx]) triggerEvents(lastNames[idx], ln);
        if (passports[idx] && pass) triggerEvents(passports[idx], pass);
        if (dobs[idx] && dob) triggerEvents(dobs[idx], dob);
    });

    alert("✅ AirPrice: กรอกข้อมูลผู้โดยสารสำเร็จ " + passengers.length + " ท่าน! ตรวจสอบความถูกต้องและดำเนินการชำระเงินได้ทันที");
})();`;
}

