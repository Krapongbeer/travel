// AirPrice Interactive App Logic

// Sanitization & Security Helpers (OWASP XSS & Privacy Protection)
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function maskPassport(str) {
    if (!str) return 'ไม่ระบุ';
    const s = String(str).trim();
    if (s.length <= 4) return s;
    return s.slice(0, 2) + '*'.repeat(Math.max(3, s.length - 4)) + s.slice(-2);
}

function clearAllLocalData() {
    if (!confirm("⚠️ คุณต้องการลบข้อมูลผู้โดยสาร รายการเฝ้าราคา และ Token การตั้งค่าทั้งหมดที่บันทึกไว้ในเบราว์เซอร์เครื่องนี้ใช่หรือไม่?")) return;
    localStorage.removeItem("airprice_passengers");
    localStorage.removeItem("airprice_watchlists");
    localStorage.removeItem("airprice_settings");
    sessionStorage.clear();
    showToast("ล้างข้อมูลส่วนตัวในเบราว์เซอร์เรียบร้อยแล้ว", "success");
    loadPassengers();
    loadWatchlists();
    loadSettings();
}

let currentOffers = [];
let allAirports = [];
let priceChartInstance = null;
let currentSearchQuery = null;

// Initialize when DOM ready
document.addEventListener("DOMContentLoaded", async () => {
    initDefaultDates();
    await loadAirports();
    await loadWatchlists();
    await loadPassengers();
    await loadSettings();
    // Auto-search default route
    performSearch("BKK", "NRT", document.getElementById("dep-date").value, document.getElementById("ret-date").value);
});

function initDefaultDates() {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    const nextMonthReturn = new Date(nextMonth);
    nextMonthReturn.setDate(nextMonth.getDate() + 5);

    const depInput = document.getElementById("dep-date");
    const retInput = document.getElementById("ret-date");

    const todayStr = today.toISOString().split("T")[0];
    const depStr = nextMonth.toISOString().split("T")[0];
    const retStr = nextMonthReturn.toISOString().split("T")[0];

    depInput.value = depStr;
    retInput.value = retStr;
    depInput.min = todayStr;
    retInput.min = depStr; // Return date must not be before departure date

    // Event listener when departure date changes
    depInput.addEventListener("change", () => {
        const selectedDep = depInput.value;
        if (!selectedDep) return;
        retInput.min = selectedDep;
        if (retInput.value && retInput.value < selectedDep) {
            const d = new Date(selectedDep);
            d.setDate(d.getDate() + 5);
            retInput.value = d.toISOString().split("T")[0];
            showToast("📅 ปรับวันเดินทางกลับให้เป็นหลังจากวันเดินทางไปอัตโนมัติ", "info");
        }
    });

    // Event listener when return date changes
    retInput.addEventListener("change", () => {
        if (depInput.value && retInput.value && retInput.value < depInput.value) {
            showToast("⚠️ วันเดินทางกลับต้องไม่ย้อนหลังวันเดินทางไป", "error");
            const d = new Date(depInput.value);
            d.setDate(d.getDate() + 5);
            retInput.value = d.toISOString().split("T")[0];
        }
    });
}

function toggleReturnType(isRound) {
    const retContainer = document.getElementById("ret-date-container");
    if (isRound) {
        retContainer.classList.remove("opacity-40", "pointer-events-none");
    } else {
        retContainer.classList.add("opacity-40", "pointer-events-none");
    }
}

function switchTab(tabName) {
    const tabs = ['search', 'watchlist', 'passenger', 'settings'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const view = document.getElementById(`view-${t}`);
        if (t === tabName) {
            btn.className = "px-3 py-2 rounded-lg text-sm font-semibold transition bg-blue-600 text-white shadow-sm flex items-center space-x-1.5";
            view.classList.remove("hidden");
        } else {
            btn.className = "px-3 py-2 rounded-lg text-sm font-semibold transition text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center space-x-1.5";
            view.classList.add("hidden");
        }
    });

    if (tabName === 'watchlist') loadWatchlists();
    if (tabName === 'passenger') loadPassengers();
    if (tabName === 'settings') loadSettings();
}

async function loadAirports() {
    try {
        const res = await fetch("/api/airports");
        if (!res.ok) throw new Error("API unavailable");
        const data = await res.json();
        allAirports = data.airports || [];
    } catch (e) {
        if (typeof ASIAN_AIRPORTS_DATA !== "undefined") {
            allAirports = Object.entries(ASIAN_AIRPORTS_DATA).map(([code, a]) => ({
                code, ...a
            }));
        }
    }

    const destSelect = document.getElementById("dest-select");
    if (!destSelect) return;
    destSelect.innerHTML = "";

    // Group by country
    const groups = {};
    allAirports.forEach(a => {
        if (!groups[a.country]) groups[a.country] = [];
        groups[a.country].push(a);
    });

    for (const [country, airports] of Object.entries(groups)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = country;
        airports.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a.code;
            opt.textContent = `${a.flag} ${a.city} (${a.code})`;
            if (a.code === "NRT") opt.selected = true;
            optgroup.appendChild(opt);
        });
        destSelect.appendChild(optgroup);
    }
}

function setPreset(fromCode, toCode) {
    document.getElementById("origin-select").value = fromCode;
    document.getElementById("dest-select").value = toCode;
    const form = document.getElementById("search-form");
    form.dispatchEvent(new Event("submit"));
}

async function handleSearch(e) {
    if (e) e.preventDefault();
    const origin = document.getElementById("origin-select").value;
    const dest = document.getElementById("dest-select").value;
    const depDate = document.getElementById("dep-date").value;
    const isRound = document.querySelector('input[name="trip_type"]:checked').value === "round";
    const retDate = isRound ? document.getElementById("ret-date").value : null;
    const adults = parseInt(document.getElementById("pax-select").value || "1");

    if (isRound && retDate && depDate) {
        if (retDate < depDate) {
            showToast("⚠️ วันเดินทางกลับต้องไม่ย้อนหลังวันเดินทางไป กรุณาเลือกวันที่ถูกต้อง", "error");
            document.getElementById("ret-date").focus();
            return;
        }
    }

    await performSearch(origin, dest, depDate, retDate, adults);
}

function populateAirlineFilter(offers) {
    const airlineSelect = document.getElementById("filter-airline");
    if (!airlineSelect) return;
    const currentVal = airlineSelect.value;
    const airlineCounts = {};
    offers.forEach(o => {
        airlineCounts[o.airline] = (airlineCounts[o.airline] || 0) + 1;
    });

    airlineSelect.innerHTML = `<option value="all">✈️ ทุกสายการบิน (${offers.length} เที่ยวบิน)</option>`;
    Object.keys(airlineCounts).sort().forEach(airline => {
        const count = airlineCounts[airline];
        const opt = document.createElement("option");
        opt.value = airline;
        opt.textContent = `${airline} (${count})`;
        if (airline === currentVal) opt.selected = true;
        airlineSelect.appendChild(opt);
    });
}

async function performSearch(origin, destination, departureDate, returnDate, adults = 1) {
    currentSearchQuery = { 
        origin, 
        destination, 
        departure_date: departureDate, 
        return_date: returnDate,
        adults: adults,
        children: 0,
        infants: 0
    };

    // Clear any previously selected flight
    clearSelectedFlight();
    
    document.getElementById("loading-spinner").classList.remove("hidden");
    document.getElementById("results-wrapper").classList.add("hidden");

    let data = null;
    try {
        const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentSearchQuery)
        });
        if (res.ok) {
            data = await res.json();
        } else {
            const errData = await res.json().catch(() => ({}));
            if (errData.detail) throw new Error(errData.detail);
            throw new Error("API unavailable");
        }
    } catch (apiErr) {
        if (apiErr.message && apiErr.message.includes("ย้อนหลัง")) {
            showToast(apiErr.message, "error");
            document.getElementById("loading-spinner").classList.add("hidden");
            return;
        }
        // Seamless fallback to client engine on GitHub Pages or static host
        if (typeof searchFlightsClient === "function") {
            data = searchFlightsClient(origin, destination, departureDate, returnDate, adults);
        } else {
            console.error("Search failed", apiErr);
            showToast(apiErr.message || "เกิดข้อผิดพลาดในการค้นหาตั๋ว", "error");
            document.getElementById("loading-spinner").classList.add("hidden");
            return;
        }
    }

    currentOffers = data?.offers || [];
    populateAirlineFilter(currentOffers);
    renderStats(data);
    applyFilters();

    // Load date grid and price chart in parallel
    await Promise.all([
        loadDateGrid(origin, destination, departureDate, returnDate, adults),
        loadPriceChart(origin, destination, departureDate)
    ]);

    document.getElementById("loading-spinner").classList.add("hidden");
    document.getElementById("results-wrapper").classList.remove("hidden");
}


function renderStats(data) {
    const offers = data.offers || [];
    const pax = data.total_passengers || 1;
    if (offers.length > 0) {
        const lowest = offers[0];
        const displayPrice = lowest.price_total || (lowest.price * pax);
        document.getElementById("stat-lowest-price").textContent = `${displayPrice.toLocaleString()} ฿`;
        document.getElementById("stat-lowest-airline").textContent = pax > 1 ? `ราคารวม ${pax} ท่าน (${lowest.price.toLocaleString()} ฿/คน) • ${lowest.airline}` : `โดย ${lowest.airline}`;
        
        const directCount = offers.filter(o => o.stops === 0).length;
        document.getElementById("stat-direct-count").textContent = `${directCount} เที่ยวบิน`;
        document.getElementById("stat-total-count").textContent = `${offers.length} เที่ยวบิน`;
    }
}

function renderOffers(offers, pax = 1) {
    const container = document.getElementById("flight-cards-container");
    container.innerHTML = "";

    if (offers.length === 0) {
        container.innerHTML = `<div class="bg-white p-8 rounded-xl text-center text-slate-500">ไม่พบเที่ยวบินในเงื่อนไขที่เลือก</div>`;
        return;
    }

    offers.forEach((flight, idx) => {
        const card = document.createElement("div");
        card.className = `bg-white rounded-2xl border ${flight.is_best_price ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-slate-200/80'} shadow-sm overflow-hidden transition-all`;

        const stopsBadge = flight.stops === 0 
            ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">บินตรง (Non-stop)</span>`
            : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">${flight.stops} จุดแวะพัก (${flight.stop_details})</span>`;

        const bestBadge = flight.is_best_price 
            ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white badge-glow mr-1.5">🔥 ถูกที่สุด</span>`
            : ``;

        const pricePerPerson = flight.price;
        const priceTotal = flight.price_total || (flight.price * pax);

        const outLeg = flight.outbound || {
            departure_time: flight.departure_time,
            arrival_time: flight.arrival_time,
            flight_number: flight.flight_number || 'Direct',
            aircraft: flight.aircraft || 'Airbus A320 / Boeing 737',
            baggage: flight.baggage_info || 'ถือขึ้นเครื่อง 7 kg',
            amenities: flight.amenities || []
        };
        const inLeg = flight.inbound;
        const providers = flight.providers || [];

        card.innerHTML = `
            <!-- Main Card Header & Summary -->
            <div class="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
                <div class="flex items-start sm:items-center space-x-4">
                    <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-1 flex-shrink-0">
                        ${flight.airline_logo ? `<img src="${encodeURI(flight.airline_logo)}" alt="${escapeHtml(flight.airline)}" class="w-full h-full object-contain">` : `<i class="fa-solid fa-plane text-blue-500 text-xl"></i>`}
                    </div>
                    <div class="space-y-1">
                        <div class="flex items-center flex-wrap gap-1">
                            ${bestBadge}
                            <h4 class="font-bold text-slate-800 text-base">${escapeHtml(flight.airline)}</h4>
                            <span class="text-xs text-slate-400 font-mono">(${escapeHtml(outLeg.flight_number)})</span>
                        </div>
                        <div class="flex items-center flex-wrap gap-2 text-xs text-slate-500">
                            <span><i class="fa-regular fa-clock mr-1"></i>${escapeHtml(flight.duration)}</span>
                            <span>•</span>
                            ${stopsBadge}
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]"><i class="fa-solid fa-plane-up mr-1 text-blue-500"></i>${escapeHtml(outLeg.aircraft)}</span>
                        </div>
                    </div>
                </div>

                <!-- Times & Route Details -->
                <div class="flex items-center space-x-6 px-2">
                    <div class="text-left">
                        <div class="text-lg font-black text-slate-800">${escapeHtml(outLeg.departure_time)}</div>
                        <div class="text-xs font-semibold text-slate-500">${escapeHtml(flight.origin)}</div>
                    </div>
                    <div class="flex flex-col items-center px-2">
                        <span class="text-[10px] text-slate-400 font-medium">${escapeHtml(flight.duration)}</span>
                        <div class="w-24 sm:w-32 h-0.5 bg-slate-200 relative my-1">
                            <i class="fa-solid fa-plane text-[10px] text-blue-500 absolute left-1/2 -top-1.5 -translate-x-1/2"></i>
                        </div>
                        <span class="text-[10px] text-slate-400">${flight.stops === 0 ? 'บินตรง' : 'แวะพัก'}</span>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-black text-slate-800">${escapeHtml(outLeg.arrival_time)}</div>
                        <div class="text-xs font-semibold text-slate-500">${escapeHtml(flight.destination)}</div>
                    </div>
                </div>

                <!-- Price & Booking CTA Buttons -->
                <div class="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 gap-2">
                    <div class="text-left lg:text-right">
                        <span class="text-2xl font-black text-slate-900">${priceTotal.toLocaleString()} <span class="text-xs font-semibold text-slate-500">THB</span></span>
                        <div class="text-[11px] text-slate-500">
                            ${pax > 1 ? `<span class="text-blue-600 font-bold">${pricePerPerson.toLocaleString()} ฿/คน</span> (${pax} ท่าน)` : (flight.return_date ? 'ราคารวมไป-กลับ' : 'ราคาเที่ยวเดียว')}
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                        <!-- Time Slots Button -->
                        <button onclick="loadTimeSlots(${idx})" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded-lg border border-amber-200 transition flex items-center space-x-1">
                            <i class="fa-solid fa-clock"></i>
                            <span>เปลี่ยนเวลา</span>
                        </button>
                        <button onclick="toggleFlightDetails(${idx})" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center space-x-1">
                            <i class="fa-solid fa-circle-info"></i>
                            <span>รายละเอียด</span>
                            <i class="fa-solid fa-chevron-down text-[10px] ml-0.5" id="chevron-${idx}"></i>
                        </button>
                        <!-- Select Flight Button -->
                        <button onclick="selectFlight(${idx})" id="select-btn-${idx}" class="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5">
                            <i class="fa-solid fa-check"></i>
                            <span>เลือกเที่ยวบินนี้</span>
                        </button>
                        <!-- Book & Checkout CTA -->
                        <button onclick="openBookingCheckoutModal(${idx})" title="เลือกช่องทางชำระเงินและออกตั๋วทันที" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition flex items-center space-x-1.5 cursor-pointer">
                            <i class="fa-solid fa-credit-card"></i>
                            <span>จองและจ่ายเงิน</span>
                        </button>
                    </div>
                </div>

            </div>

            <!-- Expanded Details & Multi-Provider Drawer -->
            <div id="details-drawer-${idx}" class="hidden border-t border-slate-100 bg-slate-50/80 p-5 space-y-4">
                <!-- Flight Legs Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Outbound Leg -->
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                        <div class="flex items-center justify-between border-b pb-2">
                            <span class="text-xs font-bold text-blue-700 flex items-center">
                                <i class="fa-solid fa-plane-departure mr-1.5"></i> ขาไป (Outbound Flight)
                            </span>
                            <span class="text-xs font-mono font-bold text-slate-600">${outLeg.flight_number}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs text-slate-700">
                            <div>
                                <div class="font-bold text-sm text-slate-800">${outLeg.departure_time}</div>
                                <div class="text-[11px] text-slate-500">${flight.origin_name || flight.origin}</div>
                            </div>
                            <div class="text-center text-[11px] text-slate-400">
                                <div>${outLeg.duration}</div>
                                <i class="fa-solid fa-arrow-right-long text-blue-400"></i>
                                <div>${outLeg.stop_details}</div>
                            </div>
                            <div class="text-right">
                                <div class="font-bold text-sm text-slate-800">${outLeg.arrival_time}</div>
                                <div class="text-[11px] text-slate-500">${flight.destination_name || flight.destination}</div>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                            <div>✈️ <strong>รุ่นเครื่องบิน:</strong> ${outLeg.aircraft}</div>
                            <div>🧳 <strong>สัมภาระ:</strong> ${outLeg.baggage}</div>
                            ${outLeg.amenities && outLeg.amenities.length > 0 ? `<div>✨ <strong>สิ่งอำนวยความสะดวก:</strong> ${outLeg.amenities.join(' • ')}</div>` : ''}
                        </div>
                    </div>

                    <!-- Return Leg (if available) -->
                    ${inLeg ? `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                        <div class="flex items-center justify-between border-b pb-2">
                            <span class="text-xs font-bold text-emerald-700 flex items-center">
                                <i class="fa-solid fa-plane-arrival mr-1.5"></i> ขากลับ (Inbound Flight)
                            </span>
                            <span class="text-xs font-mono font-bold text-slate-600">${inLeg.flight_number}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs text-slate-700">
                            <div>
                                <div class="font-bold text-sm text-slate-800">${inLeg.departure_time}</div>
                                <div class="text-[11px] text-slate-500">${flight.destination_name || flight.destination}</div>
                            </div>
                            <div class="text-center text-[11px] text-slate-400">
                                <div>${inLeg.duration}</div>
                                <i class="fa-solid fa-arrow-right-long text-emerald-400"></i>
                                <div>${inLeg.stop_details}</div>
                            </div>
                            <div class="text-right">
                                <div class="font-bold text-sm text-slate-800">${inLeg.arrival_time}</div>
                                <div class="text-[11px] text-slate-500">${flight.origin_name || flight.origin}</div>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                            <div>✈️ <strong>รุ่นเครื่องบิน:</strong> ${inLeg.aircraft}</div>
                            <div>🧳 <strong>สัมภาระ:</strong> ${inLeg.baggage}</div>
                            ${inLeg.amenities && inLeg.amenities.length > 0 ? `<div>✨ <strong>สิ่งอำนวยความสะดวก:</strong> ${inLeg.amenities.join(' • ')}</div>` : ''}
                        </div>
                    </div>
                    ` : `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-xs text-slate-400">
                        ตั๋วเที่ยวเดียว (One-way trip) ไม่มีขากลับ
                    </div>
                    `}
                </div>

                <!-- Provider Comparison & Direct Booking Buttons -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <div class="flex items-center justify-between border-b pb-2">
                        <span class="text-xs font-bold text-slate-800">
                            🌐 เลือกเว็บไซต์/ผู้ให้บริการที่ต้องการไปจอง (Compare & Select Booking Provider)
                        </span>
                        <span class="text-[11px] text-slate-400">คลิกเพื่อไปหน้าจองทันที</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                        ${providers.map(p => `
                            <div class="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border ${p.is_prefilled ? 'border-emerald-200' : 'border-slate-200'} flex items-center justify-between transition">
                                <div>
                                    <div class="text-xs font-bold text-slate-800">${p.name}</div>
                                    <div class="text-[11px] ${p.is_prefilled ? 'text-emerald-600' : 'text-amber-600'} font-semibold">${p.badge || ''}</div>
                                    <div class="text-sm font-black text-slate-900 mt-0.5">${(p.price * pax).toLocaleString()} THB</div>
                                </div>
                                <div class="flex flex-col space-y-1">
                                    <a href="${p.url}" target="_blank" rel="noopener" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition text-center shadow-xs flex items-center space-x-1">
                                        ${p.is_prefilled ? '<i class="fa-solid fa-rocket text-[9px]"></i>' : ''}
                                        <span>${p.is_prefilled ? 'ไปจองเลย ✓' : 'ไปจองเว็บนี้'}</span>
                                    </a>
                                    <button onclick="launchAutoBooking('${p.url}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition">
                                        🤖 Auto-Fill
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleFlightDetails(idx) {
    const drawer = document.getElementById(`details-drawer-${idx}`);
    const chevron = document.getElementById(`chevron-${idx}`);
    if (drawer.classList.contains("hidden")) {
        drawer.classList.remove("hidden");
        if (chevron) chevron.className = "fa-solid fa-chevron-up text-[10px] ml-0.5";
    } else {
        drawer.classList.add("hidden");
        if (chevron) chevron.className = "fa-solid fa-chevron-down text-[10px] ml-0.5";
    }
}



function parseDurationMinutes(durStr) {
    if (!durStr) return 9999;
    const hMatch = durStr.match(/(\d+)\s*h/);
    const mMatch = durStr.match(/(\d+)\s*m/);
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    const m = mMatch ? parseInt(mMatch[1]) : 0;
    return h * 60 + m;
}

function applyFilters() {
    const airlineFilter = document.getElementById("filter-airline")?.value || "all";
    const stopsFilter = document.getElementById("filter-stops")?.value || "all";
    const timeFilter = document.getElementById("filter-time")?.value || "all";
    const typeFilter = document.getElementById("filter-type")?.value || "all";
    const sortBy = document.getElementById("sort-by")?.value || "price_asc";

    let filtered = [...currentOffers];

    // Filter by airline
    if (airlineFilter !== "all") {
        filtered = filtered.filter(f => f.airline === airlineFilter);
    }

    // Filter by stops
    if (stopsFilter !== "all") {
        const stopsNum = parseInt(stopsFilter);
        filtered = filtered.filter(f => f.stops <= stopsNum);
    }

    // Filter by departure time of outbound leg
    if (timeFilter !== "all") {
        filtered = filtered.filter(f => {
            const time = f.departure_time || f.outbound?.departure_time || "00:00";
            const hour = parseInt(time.split(":")[0]);
            if (timeFilter === "early") return hour >= 0 && hour < 6;
            if (timeFilter === "morning") return hour >= 6 && hour < 12;
            if (timeFilter === "afternoon") return hour >= 12 && hour < 18;
            if (timeFilter === "night") return hour >= 18 && hour < 24;
            return true;
        });
    }

    // Filter by airline type (Full Service vs Low-Cost)
    if (typeFilter !== "all") {
        filtered = filtered.filter(f => {
            const type = f.airline_type || "standard";
            if (typeFilter === "fullservice") return type === "fullservice";
            if (typeFilter === "lowcost") return type === "lowcost";
            return true;
        });
    }

    // Sorting
    if (sortBy === "price_asc") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "dep_early") {
        filtered.sort((a, b) => (a.departure_time || "").localeCompare(b.departure_time || ""));
    } else if (sortBy === "dep_late") {
        filtered.sort((a, b) => (b.departure_time || "").localeCompare(a.departure_time || ""));
    } else if (sortBy === "duration_asc") {
        filtered.sort((a, b) => parseDurationMinutes(a.duration) - parseDurationMinutes(b.duration));
    }

    const pax = currentSearchQuery?.adults || 1;
    renderOffers(filtered, pax);

    // Update stats count to reflect filtered set
    const directCount = filtered.filter(o => o.stops === 0).length;
    const directEl = document.getElementById("stat-direct-count");
    const totalEl = document.getElementById("stat-total-count");
    if (directEl) directEl.textContent = `${directCount} เที่ยวบิน`;
    if (totalEl) totalEl.textContent = `${filtered.length} เที่ยวบิน (จาก ${currentOffers.length})`;
}

function resetFilters() {
    if (document.getElementById("filter-airline")) document.getElementById("filter-airline").value = "all";
    if (document.getElementById("filter-stops")) document.getElementById("filter-stops").value = "all";
    if (document.getElementById("filter-time")) document.getElementById("filter-time").value = "all";
    if (document.getElementById("filter-type")) document.getElementById("filter-type").value = "all";
    if (document.getElementById("sort-by")) document.getElementById("sort-by").value = "price_asc";
    applyFilters();
    showToast("รีเซ็ตตัวกรองทั้งหมดแล้ว", "info");
}

async function loadPriceChart(origin, destination, departureDate) {
    let history = [];
    try {
        const res = await fetch(`/api/history?origin=${origin}&destination=${destination}`);
        if (res.ok) {
            history = await res.json();
        }
    } catch (e) {
        // Fallback for GitHub Pages static mode
    }

    try {
        const chartEl = document.getElementById("priceChart");
        if (!chartEl) return;
        const ctx = chartEl.getContext("2d");

        // Generate mockup labels if fresh
        const labels = (Array.isArray(history) && history.length > 0) ? history.map(h => h.recorded_at) : ['1 สัปดาห์ก่อน', '5 วันก่อน', '3 วันก่อน', 'เมื่อวาน', 'วันนี้'];
        const prices = (Array.isArray(history) && history.length > 0) ? history.map(h => h.lowest_price) : [
            currentOffers[0] ? Math.round(currentOffers[0].price * 1.15) : 7500,
            currentOffers[0] ? Math.round(currentOffers[0].price * 1.10) : 7200,
            currentOffers[0] ? Math.round(currentOffers[0].price * 1.05) : 6800,
            currentOffers[0] ? Math.round(currentOffers[0].price * 1.02) : 6200,
            currentOffers[0] ? currentOffers[0].price : 5990
        ];

        if (priceChartInstance) {
            priceChartInstance.destroy();
        }

        priceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `ราคาต่ำสุด ${origin} ➜ ${destination} (THB)`,
                    data: prices,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: '#f1f5f9' },
                        ticks: { callback: v => `${v.toLocaleString()} ฿` }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Failed to load price chart", e);
    }
}

// --- Watchlist Functions ---
function openTrackModal() {
    if (!currentSearchQuery) return;
    document.getElementById("modal-route-text").textContent = `${currentSearchQuery.origin} ✈ ${currentSearchQuery.destination}`;
    document.getElementById("modal-date-text").textContent = currentSearchQuery.return_date 
        ? `${currentSearchQuery.departure_date} ถึง ${currentSearchQuery.return_date}`
        : currentSearchQuery.departure_date;
    
    // Suggest target price (10% lower than current lowest)
    if (currentOffers.length > 0) {
        document.getElementById("modal-target-price").value = Math.round(currentOffers[0].price * 0.9);
    }
    document.getElementById("modal-track").classList.remove("hidden");
}

function closeTrackModal() {
    document.getElementById("modal-track").classList.add("hidden");
}

// LocalStorage Fallback Helpers for Watchlist and Passengers
function getLocalPassengers() {
    try { return JSON.parse(localStorage.getItem("airprice_passengers") || "[]"); } catch (e) { return []; }
}
function setLocalPassengers(list) {
    try { localStorage.setItem("airprice_passengers", JSON.stringify(list)); } catch (e) {}
}

function getLocalWatchlists() {
    try { return JSON.parse(localStorage.getItem("airprice_watchlists") || "[]"); } catch (e) { return []; }
}
function setLocalWatchlists(list) {
    try { localStorage.setItem("airprice_watchlists", JSON.stringify(list)); } catch (e) {}
}

async function submitWatchlist(e) {
    e.preventDefault();
    const targetPrice = parseFloat(document.getElementById("modal-target-price").value);
    const notifyTg = document.getElementById("modal-notify-tg").checked;
    const notifyLine = document.getElementById("modal-notify-line").checked;

    const item = {
        id: Date.now(),
        origin: currentSearchQuery.origin,
        destination: currentSearchQuery.destination,
        departure_date: currentSearchQuery.departure_date,
        return_date: currentSearchQuery.return_date,
        target_price: targetPrice,
        current_lowest_price: currentOffers[0] ? currentOffers[0].price : targetPrice,
        notify_telegram: notifyTg,
        notify_line: notifyLine,
        last_checked_at: new Date().toLocaleTimeString('th-TH')
    };

    try {
        const res = await fetch("/api/watchlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error("API not available");
        const data = await res.json();
        if (data.success) {
            showToast("เพิ่มการเฝ้าราคาสำเร็จ! ระบบจะแจ้งเตือนเมื่อราคาหลุดงบ", "success");
            closeTrackModal();
            await loadWatchlists();
        }
    } catch (e) {
        const list = getLocalWatchlists();
        list.push(item);
        setLocalWatchlists(list);
        showToast("เพิ่มการเฝ้าราคาสำเร็จ! (จัดเก็บในเบราว์เซอร์)", "success");
        closeTrackModal();
        await loadWatchlists();
    }
}
async function loadWatchlists() {
    let isBackendConnected = false;
    let list = [];
    try {
        const res = await fetch("/api/watchlists");
        if (res.ok) {
            list = await res.json();
            isBackendConnected = true;
        } else {
            throw new Error();
        }
    } catch (e) {
        list = getLocalWatchlists();
        isBackendConnected = false;
    }
        
    const badge = document.getElementById("watchlist-badge");
    if (list.length > 0) {
        badge.textContent = list.length;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }

    const container = document.getElementById("watchlist-container");
    container.innerHTML = "";

    // Architecture Status Header
    const statusDiv = document.createElement("div");
    statusDiv.className = `col-span-full p-3 rounded-xl border text-xs flex items-center justify-between flex-wrap gap-2 ${
        isBackendConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
    }`;
    statusDiv.innerHTML = `
        <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full ${isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
            <span class="font-bold">${
                isBackendConnected 
                    ? 'ระบบตรวจราคาอัตโนมัติ (Backend Online): ระบบกำลังรัน Background Scheduler ตรวจเช็คราคาทุก 6 ชม.'
                    : 'โหมด GitHub Pages (Client-Only): บันทึกในเบราว์เซอร์เครื่องนี้ กด "ตรวจเช็คราคาทันที" เพื่ออัปเดตราคา'
            }</span>
        </div>
        <div class="flex items-center space-x-1.5">
            <button onclick="clearAllLocalData()" class="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-lg border border-slate-200 text-[11px]">
                <i class="fa-solid fa-broom mr-1"></i>ล้างข้อมูลในเครื่อง
            </button>
        </div>
    `;
    container.appendChild(statusDiv);

    if (list.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "col-span-full bg-white p-8 rounded-2xl text-center text-slate-500 border border-slate-200";
        emptyDiv.textContent = 'ยังไม่มีรายการเฝ้าราคา คลิกค้นหาตั๋วแล้วกด "ตั้งแจ้งเตือนราคานี้" ได้เลยครับ';
        container.appendChild(emptyDiv);
        return;
    }

    list.forEach(w => {
        const card = document.createElement("div");
        card.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative";
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <h4 class="font-bold text-slate-800 text-base">${escapeHtml(w.origin)} ✈ ${escapeHtml(w.destination)}</h4>
                    <p class="text-xs text-slate-500">📅 ${escapeHtml(w.departure_date)} ${w.return_date ? 'ถึง ' + escapeHtml(w.return_date) : '(เที่ยวเดียว)'}</p>
                </div>
                <button onclick="deleteWatchlist(${w.id})" class="text-slate-400 hover:text-red-500 p-1" title="ลบรายการนี้">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                    <span class="text-slate-400">งบเป้าหมาย:</span>
                    <div class="font-bold text-emerald-600 text-sm">${(w.target_price || 0).toLocaleString()} THB</div>
                </div>
                <div>
                    <span class="text-slate-400">ราคาล่าสุด:</span>
                    <div class="font-bold text-slate-700 text-sm">${w.current_lowest_price ? w.current_lowest_price.toLocaleString() + ' THB' : 'รอตรวจสอบ'}</div>
                </div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>เช็คล่าสุด: ${escapeHtml(w.last_checked_at || 'กำลังรอตรวจ')}</span>
                <div class="flex items-center space-x-1.5">
                    ${w.notify_telegram ? '<i class="fa-brands fa-telegram text-sky-500 text-xs" title="แจ้งเตือน Telegram"></i>' : ''}
                    ${w.notify_line ? '<i class="fa-brands fa-line text-emerald-500 text-xs" title="แจ้งเตือน LINE"></i>' : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteWatchlist(id) {
    if (!confirm("คุณต้องการลบรายการเฝ้าราคานี้ใช่หรือไม่?")) return;
    try {
        const res = await fetch(`/api/watchlists/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("API unavailable");
        showToast("ลบรายการเฝ้าราคาแล้ว", "success");
        await loadWatchlists();
    } catch (e) {
        let list = getLocalWatchlists();
        list = list.filter(w => w.id !== id);
        setLocalWatchlists(list);
        showToast("ลบรายการเฝ้าราคาแล้ว", "success");
        await loadWatchlists();
    }
}

async function checkWatchlistNow() {
    showToast("กำลังสั่งตรวจเช็คราคาตั๋วทั้งหมด...", "info");
    try {
        const res = await fetch("/api/watchlists/check-now", { method: "POST" });
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                showToast("สแกนราคาเสร็จสิ้น!", "success");
                await loadWatchlists();
                return;
            }
        }
    } catch (e) {}

    // Client fallback: update local watchlists timestamp and latest prices
    const list = getLocalWatchlists();
    list.forEach(w => {
        w.last_checked_at = new Date().toISOString();
        if (typeof searchFlightsClient === "function") {
            const results = searchFlightsClient(w.origin, w.destination, w.departure_date, w.return_date, 1);
            if (results && results.length > 0) {
                w.current_price = results[0].price;
            }
        }
    });
    setLocalWatchlists(list);
    await loadWatchlists();
    showToast("ตรวจเช็คราคาล่าสุดเรียบร้อยแล้ว!", "success");
}

// --- Passenger Profiles & Auto-Booking ---
async function savePassenger(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById("p-title").value,
        first_name: document.getElementById("p-firstname").value.trim(),
        last_name: document.getElementById("p-lastname").value.trim(),
        date_of_birth: document.getElementById("p-dob").value,
        gender: document.getElementById("p-gender").value,
        nationality: document.getElementById("p-nationality").value.trim(),
        passport_number: document.getElementById("p-passport").value.trim(),
        email: document.getElementById("p-email").value.trim(),
        phone_number: document.getElementById("p-phone").value.trim(),
        is_default: true
    };

    try {
        const res = await fetch("/api/passengers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("API unavailable");
        const data = await res.json();
        if (data.success) {
            showToast("บันทึกข้อมูลผู้โดยสารสำเร็จ พร้อมใช้งาน Auto-Fill", "success");
            await loadPassengers();
        }
    } catch (e) {
        const list = getLocalPassengers();
        payload.id = Date.now();
        list.push(payload);
        setLocalPassengers(list);
        showToast("บันทึกข้อมูลผู้โดยสารสำเร็จ (จัดเก็บในเบราว์เซอร์)", "success");
        await loadPassengers();
    }
}

async function loadPassengers() {
    let list = [];
    try {
        const res = await fetch("/api/passengers");
        if (!res.ok) throw new Error("API unavailable");
        list = await res.json();
    } catch (e) {
        list = getLocalPassengers();
    }

    const container = document.getElementById("passenger-list");
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 py-3">ยังไม่มีข้อมูลผู้โดยสารที่บันทึกไว้ กรุณากรอกแบบฟอร์มด้านบน (สามารถบันทึกได้หลายคน)</div>`;
        return;
    }

    // Update Bookmarklet drag button
    try {
        const scriptRes = await fetch("/api/autobook/script");
        if (scriptRes.ok) {
            const scriptData = await scriptRes.json();
            const bmLink = document.getElementById("bookmarklet-link");
            if (bmLink && scriptData.script) {
                bmLink.href = `javascript:(function(){${scriptData.script.replace(/\n\s*/g, ' ')}})()`;
            }
        } else {
            throw new Error();
        }
    } catch (bmErr) {
        if (list.length > 0 && typeof generateClientAutofillScript === "function") {
            const script = generateClientAutofillScript(list);
            const bmLink = document.getElementById("bookmarklet-link");
            if (bmLink) {
                bmLink.href = `javascript:(function(){${script.replace(/\n\s*/g, ' ')}})()`;
            }
        }
    }

    // Add master button to copy script for all passengers and privacy clear button
    const headerDiv = document.createElement("div");
    headerDiv.className = "flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 mb-3";
    headerDiv.innerHTML = `
        <span class="text-xs font-bold text-slate-600">👥 บันทึกไว้ทั้งหมด ${list.length} ท่าน</span>
        <div class="flex items-center space-x-2">
            <button onclick="clearAllLocalData()" title="ลบข้อมูลที่บันทึกไว้ในเบราว์เซอร์เครื่องนี้ทั้งหมด" class="text-xs px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition flex items-center space-x-1">
                <i class="fa-solid fa-broom"></i>
                <span>ล้างข้อมูลในเครื่อง</span>
            </button>
            <button onclick="copyAutoFillBookmarklet()" class="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition flex items-center space-x-1">
                <i class="fa-solid fa-users"></i>
                <span>คัดลอก Script ทั้งคณะ (${list.length} คน)</span>
            </button>
        </div>
    `;
    container.appendChild(headerDiv);

    list.forEach((p, idx) => {
        const item = document.createElement("div");
        item.className = "p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between";
        const masked = maskPassport(p.passport_number);
        item.innerHTML = `
            <div>
                <div class="font-bold text-sm text-slate-800">
                    <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-bold mr-1.5">ผู้โดยสาร #${idx + 1}</span>
                    ${escapeHtml(p.title)} ${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}
                </div>
                <div class="text-xs text-slate-500 mt-1">
                    พาสปอร์ต: <span class="font-mono font-bold text-slate-700" title="คลิกปุ่ม Script เพื่อคัดลอกเลขจริง">${escapeHtml(masked)}</span> • 
                    เกิด: ${escapeHtml(p.date_of_birth || '-')} • 
                    อีเมล: ${escapeHtml(p.email || '-')} • 
                    โทร: ${escapeHtml(p.phone_number || '-')}
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="copyAutoFillBookmarklet(${p.id})" title="คัดลอก Script สำหรับคนนี้" class="text-xs px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition flex items-center space-x-1">
                    <i class="fa-solid fa-code"></i>
                    <span>Script</span>
                </button>
                <button onclick="deletePassenger(${p.id})" title="ลบผู้โดยสารนี้" class="text-xs p-2 text-slate-400 hover:text-red-600 rounded-lg transition">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function deletePassenger(id) {
    if (!confirm("ต้องการลบข้อมูลผู้โดยสารท่านนี้ใช่หรือไม่?")) return;
    try {
        const res = await fetch(`/api/passengers/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("API unavailable");
        showToast("ลบข้อมูลผู้โดยสารเรียบร้อยแล้ว", "success");
        await loadPassengers();
    } catch (e) {
        let list = getLocalPassengers();
        list = list.filter(p => p.id !== id);
        setLocalPassengers(list);
        showToast("ลบข้อมูลผู้โดยสารเรียบร้อยแล้ว", "success");
        await loadPassengers();
    }
}


async function openBookingCheckoutModal(idx) {
    if (idx === undefined || idx === null) {
        idx = selectedFlightIdx !== null ? selectedFlightIdx : 0;
    }
    const flight = currentOffers[idx];
    if (!flight) return;

    selectedFlightIdx = idx;
    selectFlight(idx);

    const q = currentSearchQuery;
    const pax = q?.adults || 1;
    const totalPrice = flight.price_total || (flight.price * pax);

    // Update flight summary in modal
    const airlineTag = document.getElementById("checkout-airline-tag");
    if (airlineTag) airlineTag.textContent = `${flight.airline} (${flight.flight_number || 'Direct'})`;

    const totalEl = document.getElementById("checkout-total-price");
    if (totalEl) totalEl.textContent = `${totalPrice.toLocaleString()} THB`;

    const routeEl = document.getElementById("checkout-route-text");
    if (routeEl) routeEl.textContent = `${flight.origin} ✈ ${flight.destination} (${pax} ผู้โดยสาร)`;

    const timeEl = document.getElementById("checkout-time-text");
    if (timeEl) timeEl.textContent = `${flight.departure_time} → ${flight.arrival_time} (${flight.duration})`;

    const dateEl = document.getElementById("checkout-date-text");
    if (dateEl) dateEl.textContent = `เดินทาง: ${flight.departure_date}${flight.return_date ? ` · กลับ: ${flight.return_date}` : ' (เที่ยวเดียว)'}`;

    const airlineBtn = document.getElementById("checkout-airline-name");
    if (airlineBtn) airlineBtn.textContent = `เว็บตรงสายการบิน ${flight.airline}`;

    // Get passengers (API or LocalStorage)
    let passList = [];
    try {
        const res = await fetch("/api/passengers");
        if (res.ok) passList = await res.json();
    } catch (e) {}

    if (passList.length === 0) {
        passList = getLocalPassengers();
    }

    const paxSummaryEl = document.getElementById("modal-pax-summary");
    if (paxSummaryEl) {
        if (passList.length === 0) {
            paxSummaryEl.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-amber-700 font-bold">⚠️ ยังไม่มีข้อมูลผู้โดยสารในระบบ</span>
                    <button onclick="closeAutoFillModal(); switchTab('passengers')" class="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px]">
                        + เพิ่มข้อมูลผู้โดยสาร
                    </button>
                </div>
                <div class="mt-1 text-slate-500 text-[11px]">หากไม่ได้เพิ่ม สามารถกดไปหน้าชำระเงินและพิมพ์ชื่อบนเว็บออกตั๋วได้เช่นกัน</div>
            `;
        } else {
            const summary = passList.map((p, i) => `#${i+1} <strong>${escapeHtml(p.first_name)} ${escapeHtml(p.last_name)}</strong> (${escapeHtml(p.nationality || 'THAI')} · พาสปอร์ต: ${escapeHtml(maskPassport(p.passport_number))})`).join('<br>');
            paxSummaryEl.innerHTML = summary;
        }
    }

    // Prepare scripts in session
    let scriptCode = "";
    if (typeof generateClientAutofillScript === "function") {
        scriptCode = generateClientAutofillScript(passList);
    }
    sessionStorage.setItem('airprice_autofill_script', scriptCode);
    sessionStorage.setItem('airprice_target_url', flight.booking_url);
    window.currentCheckoutFlight = flight;

    // Show modal
    document.getElementById("modal-autofill-guide").classList.remove("hidden");
}

function proceedToCheckout(channel) {
    const flight = window.currentCheckoutFlight || (selectedFlightIdx !== null ? currentOffers[selectedFlightIdx] : null);
    if (!flight) return;

    let targetUrl = "";
    if (channel === "trip") {
        targetUrl = flight.trip_url || (typeof generateBookingLinksClient === "function" ? generateBookingLinksClient(flight.origin, flight.destination, flight.departure_date, flight.return_date, flight.total_passengers || 1).trip_com : flight.booking_url);
    } else if (channel === "google") {
        targetUrl = (typeof generateBookingLinksClient === "function" ? generateBookingLinksClient(flight.origin, flight.destination, flight.departure_date, flight.return_date, flight.total_passengers || 1).google_flights : flight.booking_url);
    } else {
        targetUrl = flight.official_url || flight.booking_url;
    }

    // Auto-copy passenger data to clipboard for easy pasting
    copyPassengerQuickText(false);

    // Open booking page directly (not inside setTimeout or async, avoiding popup blocker)
    window.open(targetUrl, '_blank');
    closeAutoFillModal();
    showToast("🚀 กำลังพาไปหน้าชำระเงิน และคัดลอกข้อมูลผู้โดยสารเรียบร้อย!", "success");
}

function copyPassengerQuickText(showNotification = true) {
    const list = getLocalPassengers();
    if (!list || list.length === 0) {
        if (showNotification) showToast("ยังไม่มีข้อมูลผู้โดยสาร กรุณาเพิ่มข้อมูลก่อน", "warning");
        return;
    }

    const text = list.map((p, idx) => {
        return `[ผู้โดยสาร ${idx + 1}]
ชื่อ-นามสกุล: ${p.title || ''} ${p.first_name} ${p.last_name}
วันเกิด: ${p.date_of_birth || '-'}
เพศ: ${p.gender || '-'}
สัญชาติ: ${p.nationality || 'THAI'}
เลขพาสปอร์ต: ${p.passport_number || '-'}
วันหมดอายุพาสปอร์ต: ${p.passport_expiry || '-'}
อีเมล: ${p.email || '-'}
เบอร์โทร: ${p.phone_number || '-'}`;
    }).join("\n\n");

    try {
        navigator.clipboard.writeText(text);
        if (showNotification) {
            showToast("📋 คัดลอกข้อมูลผู้โดยสารทั้งหมดลง Clipboard แล้ว!", "success");
        }
    } catch (e) {}
}

async function launchAutoBooking(bookingUrl) {
    if (selectedFlightIdx !== null) {
        openBookingCheckoutModal(selectedFlightIdx);
    } else {
        openBookingCheckoutModal(0);
    }
}

function closeAutoFillModal() {
    document.getElementById("modal-autofill-guide").classList.add("hidden");
}

async function copyCurrentScript(showNotification = true) {
    try {
        const res = await fetch("/api/autobook/script");
        if (res.ok) {
            const data = await res.json();
            if (data.script) {
                navigator.clipboard.writeText(data.script);
                if (showNotification) {
                    showToast("คัดลอก Script Auto-Fill สำหรับผู้โดยสารทุกคนแล้ว!", "success");
                }
                return;
            }
        }
    } catch (e) {}

    // Client fallback
    const list = getLocalPassengers();
    if (list.length > 0 && typeof generateClientAutofillScript === "function") {
        const script = generateClientAutofillScript(list);
        navigator.clipboard.writeText(script);
        if (showNotification) {
            showToast("คัดลอก Script Auto-Fill สำหรับผู้โดยสารทุกคนแล้ว!", "success");
        }
    } else {
        showToast("ยังไม่มีข้อมูลผู้โดยสาร กรุณากรอกและบันทึกข้อมูลก่อน", "warning");
    }
}

async function copyAutoFillBookmarklet(passengerId) {
    try {
        const url = passengerId ? `/api/autobook/script?passenger_id=${passengerId}` : `/api/autobook/script`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.script) {
                navigator.clipboard.writeText(data.script);
                showToast("คัดลอก Script Auto-Fill ลง Clipboard แล้ว!", "success");
                return;
            }
        }
    } catch (e) {}

    // Client fallback
    let list = getLocalPassengers();
    if (passengerId) {
        list = list.filter(p => p.id === passengerId);
    }
    if (list.length > 0 && typeof generateClientAutofillScript === "function") {
        const script = generateClientAutofillScript(list);
        navigator.clipboard.writeText(script);
        showToast("คัดลอก Script Auto-Fill ลง Clipboard แล้ว!", "success");
    } else {
        showToast("ยังไม่มีข้อมูลผู้โดยสาร กรุณากรอกและบันทึกข้อมูลก่อน", "warning");
    }
}


// --- Data Export ---
async function exportData(format) {
    if (!currentSearchQuery) return;
    showToast(`กำลังสร้างไฟล์ ${format.toUpperCase()}...`, "info");
    
    try {
        const url = format === 'excel' ? '/api/export/excel' : '/api/export/csv';
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentSearchQuery)
        });
        if (!response.ok) throw new Error("API not available");
        const blob = await response.blob();
        downloadBlob(blob, `flights_${currentSearchQuery.origin}_${currentSearchQuery.destination}.${format === 'excel' ? 'xlsx' : 'csv'}`);
        showToast(`ดาวน์โหลดไฟล์ ${format.toUpperCase()} เรียบร้อยแล้ว`, "success");
    } catch (e) {
        // Client-side CSV export
        const csvContent = generateClientCsv(currentOffers);
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `flights_${currentSearchQuery.origin}_${currentSearchQuery.destination}.csv`);
        showToast(`ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว`, "success");
    }
}

function downloadBlob(blob, filename) {
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function generateClientCsv(offers) {
    const headers = ["สายการบิน", "เที่ยวบิน", "เวลาออกเดินทาง", "เวลาถึง", "ระยะเวลา", "จุดแวะพัก", "รายละเอียด", "ราคา (THB)", "ลิงก์จอง"];
    const rows = offers.map(o => [
        `"${o.airline}"`,
        `"${o.flight_number || ''}"`,
        `"${o.departure_time}"`,
        `"${o.arrival_time}"`,
        `"${o.duration}"`,
        `"${o.stops}"`,
        `"${o.stop_details || ''}"`,
        `"${o.price}"`,
        `"${o.booking_url}"`
    ]);
    return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

// --- Settings & Notifications ---
async function loadSettings() {
    let cfg = {};
    try {
        const res = await fetch("/api/settings");
        if (res.ok) {
            cfg = await res.json();
        }
    } catch (e) {}

    // Fallback to localStorage
    if (!cfg.telegram_bot_token && !cfg.telegram_chat_id && !cfg.line_notify_token && !cfg.discord_webhook_url) {
        try {
            cfg = JSON.parse(localStorage.getItem("airprice_settings") || "{}");
        } catch (e) {}
    }

    if (cfg.telegram_bot_token) document.getElementById("cfg-tg-token").value = cfg.telegram_bot_token;
    if (cfg.telegram_chat_id) document.getElementById("cfg-tg-chat").value = cfg.telegram_chat_id;
    if (cfg.line_notify_token) document.getElementById("cfg-line-token").value = cfg.line_notify_token;
    if (cfg.discord_webhook_url) document.getElementById("cfg-discord-url").value = cfg.discord_webhook_url;
}

async function saveSettings(e) {
    e.preventDefault();
    const payload = {
        telegram_bot_token: document.getElementById("cfg-tg-token").value.trim(),
        telegram_chat_id: document.getElementById("cfg-tg-chat").value.trim(),
        line_notify_token: document.getElementById("cfg-line-token").value.trim(),
        discord_webhook_url: document.getElementById("cfg-discord-url").value.trim(),
    };

    // Always persist to localStorage for client-side support
    localStorage.setItem("airprice_settings", JSON.stringify(payload));

    try {
        const res = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                showToast("บันทึกการตั้งค่า Token เรียบร้อยแล้ว", "success");
                return;
            }
        }
    } catch (e) {}
    showToast("บันทึกการตั้งค่าลงเครื่อง (Local Browser) เรียบร้อยแล้ว", "success");
}

async function testNotification(channel) {
    showToast(`กำลังส่งข้อความทดสอบไปยัง ${channel.toUpperCase()}...`, "info");
    try {
        const res = await fetch("/api/alerts/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                showToast(`ส่งการแจ้งเตือน ${channel.toUpperCase()} สำเร็จ!`, "success");
                return;
            } else {
                showToast(`ส่งไม่สำเร็จ: ${data.error || 'กรุณาตรวจสอบ Token'}`, "error");
                return;
            }
        }
    } catch (e) {}
    showToast(`โหมด GitHub Pages (Client-Side): ระบบบันทึก Token แล้ว การส่ง Alert ต้องเชื่อมกับเซิร์ฟเวอร์ Backend หรือบอทแจ้งเตือน`, "info");
}

function showToast(msg, type = 'info') {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-xs sm:text-sm font-bold flex items-center space-x-2 text-white transition-all duration-300 ${
        type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800'
    }`;
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 4000);
}

// ============================================================
//  DATE PRICE GRID
// ============================================================
async function loadDateGrid(origin, destination, centerDate, returnDate, adults) {
    const strip = document.getElementById("date-grid-strip");
    if (!strip) return;
    strip.innerHTML = `<div class="text-xs text-slate-400 py-3 px-4 animate-pulse">กำลังโหลด...</div>`;
    try {
        const retParam = returnDate ? `&return_date=${returnDate}` : "";
        const res = await fetch(`/api/price-grid?origin=${origin}&destination=${destination}&center_date=${centerDate}&adults=${adults}&days=9${retParam}`);
        if (!res.ok) throw new Error("API not available");
        const data = await res.json();
        renderDateGrid(data.grid || [], origin, destination, returnDate, adults);
    } catch (e) {
        if (typeof fetchPriceGridClient === "function") {
            const grid = fetchPriceGridClient(origin, destination, centerDate, returnDate, adults, 9);
            renderDateGrid(grid, origin, destination, returnDate, adults);
        } else {
            strip.innerHTML = `<div class="text-xs text-slate-400 py-3 px-4">ไม่สามารถโหลดราคาวันใกล้เคียงได้</div>`;
        }
    }
}

function renderDateGrid(grid, origin, destination, returnDate, adults) {
    const strip = document.getElementById("date-grid-strip");
    if (!strip || !grid.length) return;

    const thaiMonth = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    strip.innerHTML = grid.map(d => {
        const isSelected = d.is_selected;
        const isCheapest = d.is_cheapest;
        const price = d.price ? d.price.toLocaleString() : "-";
        return `
            <button onclick="changeDateFromGrid('${d.date}', '${origin}', '${destination}', ${adults})"
                class="flex-shrink-0 flex flex-col items-center justify-between px-3 py-2.5 rounded-xl border-2 min-w-[76px] transition cursor-pointer
                    ${isSelected
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : isCheapest
                            ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }">
                <div class="text-[10px] font-semibold ${isSelected ? 'text-blue-200' : 'text-slate-400'}">${d.day_name}</div>
                <div class="text-xs font-bold mt-0.5">${d.label}</div>
                <div class="text-sm font-black mt-1 ${isSelected ? 'text-white' : isCheapest ? 'text-emerald-600' : 'text-slate-800'}">${price}฿</div>
                ${isCheapest && !isSelected ? '<div class="text-[9px] font-bold text-emerald-600 mt-0.5 bg-emerald-100 px-1.5 rounded-full">ถูกสุด!</div>' : ''}
                ${isSelected ? '<div class="text-[9px] font-bold text-blue-200 mt-0.5">เลือกอยู่</div>' : ''}
            </button>
        `;
    }).join("");
}

async function changeDateFromGrid(newDate, origin, destination, adults) {
    const depInput = document.getElementById("dep-date");
    const retInput = document.getElementById("ret-date");
    if (depInput) {
        depInput.value = newDate;
        if (retInput) retInput.min = newDate;
    }

    const isRound = document.querySelector('input[name="trip_type"]:checked')?.value === "round";
    let retDate = isRound ? retInput?.value : null;

    if (isRound && retDate && retDate < newDate) {
        const d = new Date(newDate);
        d.setDate(d.getDate() + 5);
        retDate = d.toISOString().split("T")[0];
        if (retInput) retInput.value = retDate;
        showToast("📅 ปรับวันเดินทางกลับให้เป็นหลังจากวันเดินทางไปอัตโนมัติ", "info");
    }

    // Re-run search with new date
    await performSearch(origin, destination, newDate, retDate, adults);
}

// ============================================================
//  FLIGHT SELECTION
// ============================================================
let selectedFlightIdx = null;

function selectFlight(idx) {
    const flight = currentOffers[idx];
    if (!flight) return;

    // Deselect previous
    if (selectedFlightIdx !== null && selectedFlightIdx !== idx) {
        const prevBtn = document.getElementById(`select-btn-${selectedFlightIdx}`);
        const prevCard = prevBtn?.closest(".bg-white.rounded-2xl");
        if (prevBtn) {
            prevBtn.className = "px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5";
            prevBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>เลือกเที่ยวบินนี้</span>`;
        }
        if (prevCard) prevCard.classList.remove("ring-2", "ring-emerald-400");
    }

    selectedFlightIdx = idx;

    // Mark this card as selected
    const btn = document.getElementById(`select-btn-${idx}`);
    const card = btn?.closest(".bg-white.rounded-2xl");
    if (btn) {
        btn.className = "px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 ring-2 ring-emerald-400";
        btn.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>✅ เลือกแล้ว</span>`;
    }
    if (card) card.classList.add("ring-2", "ring-emerald-400");

    // Update sticky bar
    const pax = currentSearchQuery?.adults || 1;
    const totalPrice = flight.price_total || (flight.price * pax);
    document.getElementById("sfb-summary").textContent =
        `${flight.airline} · ${flight.outbound?.flight_number || flight.flight_number} · ${flight.outbound?.departure_time}→${flight.outbound?.arrival_time}`;
    document.getElementById("sfb-price").textContent = `${totalPrice.toLocaleString()} ฿`;

    const bar = document.getElementById("selected-flight-bar");
    bar.classList.remove("hidden");

    showToast(`✅ เลือก ${flight.airline} แล้ว! กด "จองเลย!" ด้านล่างได้เลย`, "success");
}

function clearSelectedFlight() {
    if (selectedFlightIdx !== null) {
        const btn = document.getElementById(`select-btn-${selectedFlightIdx}`);
        const card = btn?.closest(".bg-white.rounded-2xl");
        if (btn) {
            btn.className = "px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5";
            btn.innerHTML = `<i class="fa-solid fa-check"></i><span>เลือกเที่ยวบินนี้</span>`;
        }
        if (card) card.classList.remove("ring-2", "ring-emerald-400");
    }
    selectedFlightIdx = null;
    document.getElementById("selected-flight-bar").classList.add("hidden");
}

function bookSelected() {
    if (selectedFlightIdx === null) return;
    openBookingCheckoutModal(selectedFlightIdx);
}

function autoFillSelected() {
    if (selectedFlightIdx === null) return;
    openBookingCheckoutModal(selectedFlightIdx);
}

// ============================================================
//  TIME SLOTS
// ============================================================
async function loadTimeSlots(idx) {
    const flight = currentOffers[idx];
    if (!flight) return;

    const q = currentSearchQuery;
    document.getElementById("ts-airline-name").textContent = flight.airline + " — เลือกช่วงเวลาบิน";
    document.getElementById("ts-route-info").textContent =
        `${q?.origin} → ${q?.destination} · ${q?.departure_date}${q?.return_date ? ' (ไป-กลับ)' : ' (เที่ยวเดียว)'}`;
    document.getElementById("timeslots-grid").innerHTML =
        `<div class="text-center py-8 text-slate-400 text-sm animate-pulse">กำลังโหลดตารางเวลา...</div>`;
    document.getElementById("modal-timeslots").classList.remove("hidden");

    try {
        const retParam = q?.return_date ? `&return_date=${q.return_date}` : "";
        const url = `/api/time-slots?airline=${encodeURIComponent(flight.airline)}&origin=${q.origin}&destination=${q.destination}&departure_date=${q.departure_date}&adults=${q.adults || 1}${retParam}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("API not available");
        const data = await res.json();
        renderTimeSlots(idx, data.slots || []);
    } catch (e) {
        if (typeof getTimeSlotsClient === "function") {
            const slots = getTimeSlotsClient(flight.airline, q.origin, q.destination, q.departure_date, q.return_date, q.adults || 1);
            renderTimeSlots(idx, slots);
        } else {
            document.getElementById("timeslots-grid").innerHTML =
                `<div class="text-center py-8 text-red-500 text-sm">ไม่สามารถโหลดตารางเวลาได้</div>`;
        }
    }
}

function renderTimeSlots(offerIdx, slots) {
    window.currentTimeSlots = slots || [];
    const grid = document.getElementById("timeslots-grid");
    if (!slots.length) {
        grid.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm">ไม่พบข้อมูลตารางเวลา</div>`;
        return;
    }

    const q = currentSearchQuery;
    const pax = q?.adults || 1;

    grid.innerHTML = slots.map((s, si) => {
        const isCheapest = s.is_cheapest;
        return `
            <button onclick="selectTimeSlot(${offerIdx}, ${si})" class="w-full text-left p-4 rounded-xl border-2 transition ${isCheapest ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 bg-white hover:bg-blue-50/50'}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl ${isCheapest ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center">
                            <i class="fa-solid fa-plane ${isCheapest ? 'text-emerald-600' : 'text-blue-500'}"></i>
                        </div>
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="text-xs font-bold text-slate-500">${s.label}</span>
                                ${isCheapest ? '<span class="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full">ถูกสุด!</span>' : ''}
                            </div>
                            <div class="flex items-center space-x-2 mt-0.5">
                                <span class="text-base font-black text-slate-800">${s.departure_time}</span>
                                <span class="text-slate-300">→</span>
                                <span class="text-base font-black text-slate-800">${s.arrival_time}</span>
                                <span class="text-[11px] text-slate-400 font-medium">${s.duration}</span>
                            </div>
                            <div class="text-[11px] text-slate-400 font-mono mt-0.5">${s.flight_number}
                                ${s.return_flight_number ? ` · กลับ: ${s.return_flight_number} ${s.return_departure_time}→${s.return_arrival_time}` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-black ${isCheapest ? 'text-emerald-600' : 'text-slate-800'}">${s.price.toLocaleString()} ฿</div>
                        ${pax > 1 ? `<div class="text-[11px] text-slate-400">${s.price_per_person.toLocaleString()} ฿/คน</div>` : ''}
                        <div class="mt-1 text-[11px] font-bold text-blue-600">คลิกเพื่อเลือกเวลานี้ →</div>
                    </div>
                </div>
            </button>
        `;
    }).join("");
}

function selectTimeSlot(offerIdx, slotIdx) {
    const flight = currentOffers[offerIdx];
    if (!flight || !window.currentTimeSlots || !window.currentTimeSlots[slotIdx]) return;
    const slot = window.currentTimeSlots[slotIdx];

    const pax = currentSearchQuery?.adults || 1;
    const pricePerPerson = slot.price_per_person || Math.round(slot.price / pax);
    const totalPrice = slot.price;

    // Immediately update flight model
    flight.departure_time = slot.departure_time;
    flight.arrival_time = slot.arrival_time;
    flight.duration = slot.duration;
    flight.flight_number = slot.flight_number;
    flight.price = pricePerPerson;
    flight.price_per_person = pricePerPerson;
    flight.price_total = totalPrice;

    if (!flight.outbound) {
        flight.outbound = {};
    }
    flight.outbound.departure_time = slot.departure_time;
    flight.outbound.arrival_time = slot.arrival_time;
    flight.outbound.duration = slot.duration;
    flight.outbound.flight_number = slot.flight_number;

    if (slot.return_flight_number && flight.inbound) {
        flight.inbound.departure_time = slot.return_departure_time;
        flight.inbound.arrival_time = slot.return_arrival_time;
        flight.inbound.flight_number = slot.return_flight_number;
    }

    // Close drawer and re-render flight cards with updated time & price
    closeTimeSlotsModal();
    renderOffers(currentOffers);
    selectFlight(offerIdx);
    showToast(`✅ เปลี่ยนเที่ยวบินเป็น ${slot.flight_number} เวลา ${slot.departure_time} - ${slot.arrival_time} ยอด ${totalPrice.toLocaleString()} ฿ เรียบร้อย!`, "success");
}

function closeTimeSlotsModal() {
    document.getElementById("modal-timeslots").classList.add("hidden");
}

