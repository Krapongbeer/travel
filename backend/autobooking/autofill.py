import json
import logging
from typing import List, Dict, Any, Union, Optional

logger = logging.getLogger(__name__)

def generate_multi_autofill_script(passengers: List[Dict[str, Any]]) -> str:
    """
    Generates a multi-passenger client-side Auto-Fill script.
    Supports filling Passenger 1, Passenger 2, Passenger 3... in airline & OTA checkout pages.
    """
    if not passengers:
        return "// No passengers provided"

    passengers_json = json.dumps(passengers)

    js_code = f"""
    (function() {{
        const passengers = {passengers_json};
        console.log("✈️ AirPrice Multi-Passenger Auto-Fill running for " + passengers.length + " passengers:", passengers);

        function triggerEvents(el, val) {{
            if (!el) return;
            el.focus();
            el.value = val;
            el.dispatchEvent(new Event('input', {{ bubbles: true }}));
            el.dispatchEvent(new Event('change', {{ bubbles: true }}));
            el.dispatchEvent(new Event('blur', {{ bubbles: true }}));
        }}

        // Helper to query all elements matching multiple selectors
        function findInputs(patterns) {{
            let found = [];
            patterns.forEach(pat => {{
                document.querySelectorAll(pat).forEach(el => {{
                    if (!found.includes(el)) found.push(el);
                }});
            }});
            return found;
        }}

        // 1. Fill Primary Contact Info (from Passenger 1)
        const p1 = passengers[0];
        findInputs(['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]']).forEach(el => triggerEvents(el, p1.email));
        findInputs(['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[name*="mobile" i]']).forEach(el => triggerEvents(el, p1.phone_number || p1.phone));

        // 2. Query all field groups for passengers
        const firstNames = findInputs(['input[name*="first" i]', 'input[id*="first" i]', 'input[placeholder*="First" i]', 'input[aria-label*="First" i]']);
        const lastNames = findInputs(['input[name*="last" i]', 'input[id*="last" i]', 'input[placeholder*="Last" i]', 'input[aria-label*="Last" i]']);
        const passports = findInputs(['input[name*="passport" i]', 'input[id*="passport" i]', 'input[placeholder*="Passport" i]']);
        const dobs = findInputs(['input[name*="dob" i]', 'input[name*="birth" i]', 'input[id*="birth" i]']);

        passengers.forEach((p, idx) => {{
            const fn = p.first_name || p.firstName || '';
            const ln = p.last_name || p.lastName || '';
            const pass = p.passport_number || p.passport || '';
            const dob = p.date_of_birth || p.dob || '';

            if (firstNames[idx]) triggerEvents(firstNames[idx], fn);
            if (lastNames[idx]) triggerEvents(lastNames[idx], ln);
            if (passports[idx] && pass) triggerEvents(passports[idx], pass);
            if (dobs[idx] && dob) triggerEvents(dobs[idx], dob);
        }});

        alert("✅ AirPrice Auto-Fill กรอกข้อมูลผู้โดยสารทั้ง " + passengers.length + " ท่านเรียบร้อยแล้ว! กรุณาตรวจความถูกต้องและยืนยันการชำระเงิน");
    }})();
    """
    return js_code

def generate_autofill_script(passenger: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
    if isinstance(passenger, list):
        return generate_multi_autofill_script(passenger)
    return generate_multi_autofill_script([passenger])

async def launch_autofill_browser(booking_url: str, passengers: Union[Dict[str, Any], List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Uses Playwright to launch a visible browser window, navigate to the booking URL,
    and assist in filling out all passenger information.
    """
    if isinstance(passengers, dict):
        passengers = [passengers]

    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return {"success": False, "error": "Playwright is not installed."}

    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = await browser.new_context()
        page = await context.new_page()

        logger.info(f"Navigating to {booking_url} for {len(passengers)} passengers")
        await page.goto(booking_url, timeout=45000)

        # Inject autofill helper script
        script = generate_multi_autofill_script(passengers)
        await page.evaluate(script)

        return {"success": True, "message": f"Browser opened and auto-filled for {len(passengers)} passengers."}
    except Exception as e:
        logger.error(f"Auto-fill browser error: {e}")
        return {"success": False, "error": str(e)}
