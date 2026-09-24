# ✈️ AirPrice - Asian Flight Deals, Tracker & Auto-Booking Assistant

ระบบค้นหา เปรียบเทียบราคาตั๋วเครื่องบินในเอเชีย ติดตามประวัติราคา แจ้งเตือนราคาลดต่ำกว่างบผ่าน **Telegram / LINE Notify** และระบบช่วยจองอัตโนมัติ (**One-Click Booking & Auto-Fill Assistant**)

---

## 🚀 ฟีเจอร์หลัก (Key Features)

1. **✈️ Multi-Airline Search (เส้นทางยอดนิยมในเอเชีย)**:
   - ค้นหาราคาตั๋วทั้ง Low-Cost และ Full-Service (ญี่ปุ่น, เกาหลี, ไต้หวัน, สิงคโปร์, เวียดนาม, บาหลี, ฮ่องกง, และในประเทศ)
   - กรองตั๋วตามสายการบิน, บินตรง, จุดแวะพัก, และเรียงราคาถูกสุด
2. **⚡ One-Click Instant Booking**:
   - สร้างลิงก์ตรงไปยัง Google Flights, Trip.com, และ Skyscanner ให้กดจองได้ทันทีในคลิกเดียว
3. **🤖 Auto-Fill Booking Assistant**:
   - บันทึกข้อมูลผู้โดยสาร (ชื่อ-นามสกุล, วันเกิด, Passport, อีเมล, เบอร์โทร)
   - ช่วยกรอกข้อมูลบนหน้าเว็บจองตั๋วอัตโนมัติ เหลือเพียงขั้นตอนกด OTP ชำระเงิน
4. **🔔 Automated Price Drop Alerts**:
   - ตั้งงบราคาที่ต้องการ (Target Price)
   - ระบบสแกนราคาอัตโนมัติในเบื้องหลัง และแจ้งเตือนทันทีผ่าน **Telegram Bot**, **LINE Notify**, หรือ **Discord Webhook**
5. **📈 Price Trend & History**:
   - กราฟแนวโน้มราคาตั๋วเครื่องบินย้อนหลัง
6. **📥 Data Export**:
   - ส่งออกข้อมูลเป็น **Excel (.xlsx)** และ **CSV** ได้ทันที

---

## 🛠️ วิธีเริ่มต้นใช้งาน (Getting Started)

### 1. เข้าสู่โฟลเดอร์โปรเจกต์
```bash
cd /Users/krapong/Documents/AntiGravity/AIR-price
```

### 2. ติดตั้ง Dependencies (ทำครั้งแรก)
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. รันเซิร์ฟเวอร์
```bash
./venv/bin/python3 -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

### 4. เปิดใช้งานผ่านเบราว์เซอร์
เปิดเบราว์เซอร์แล้วไปที่:
👉 **`http://localhost:8000`**

---

## 📱 การตั้งค่าการแจ้งเตือน (Notification Setup)

สามารถตั้งค่า Token ผ่านหน้าเว็บแท็บ **"ตั้งค่าแจ้งเตือน"** หรือไฟล์ `.env`:

### Telegram Bot:
1. สร้างบอทกับ `@BotFather` บน Telegram เพื่อรับ **Bot Token**
2. ค้นหา Chat ID ของคุณผ่าน `@userinfobot`
3. นำ Token และ Chat ID มาใส่ในระบบ แล้วกดปุ่ม **"ทดสอบส่ง Telegram"**

### LINE Notify:
1. เข้าไปที่ [LINE Notify Service](https://notify-bot.line.me/) แล้วสร้าง Access Token
2. นำ Token มาใส่ในระบบ แล้วกดปุ่ม **"ทดสอบส่ง LINE"**
