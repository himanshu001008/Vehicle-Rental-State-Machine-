/* ============================================================
   DriveEasy – Vehicle Rental System | Main JavaScript
   OOP State Machine + LocalStorage + Admin Panel + Charts
   ============================================================ */

"use strict";

// ─────────────────────────────────────────────
// 1. CONSTANTS & STATE MACHINE DEFINITIONS
// ─────────────────────────────────────────────

const STATES = Object.freeze({
    AVAILABLE: "available",
    RESERVED: "reserved",
    RENTED: "rented",
    MAINTENANCE: "maintenance",
});

const TYPE_ICONS = {
    Car: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17H5a2 2 0 0 1-2-2V7l2-4h10l2 4h4.5a.5.5 0 0 1 .5.5V15a2 2 0 0 1-2 2Z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>`,
    Bike: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/><path d="M15 6c0-1.1.9-2 2-2h1a2 2 0 0 1 2 2v5h-5V6Z"/><path d="M9 13V6"/><path d="M5 13h14"/></svg>`,
    Scooter: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="16" r="3"/><circle cx="6" cy="16" r="3"/><path d="M6 13V5a1 1 0 0 1 1-1h5a1 1 0 0 1 .94.66l1.06 3H6Z"/><path d="M14 13h7"/><path d="M6 13h8"/></svg>`,
};
const STATE_ICONS_SVG = {
    [STATES.AVAILABLE]: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    [STATES.RESERVED]: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    [STATES.RENTED]: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    [STATES.MAINTENANCE]: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
};

// ─────────────────────────────────────────────
// 2. VEHICLE CLASS – OOP + STATE MACHINE
// ─────────────────────────────────────────────

class Vehicle {
    /**
     * @param {string} id
     * @param {string} name
     * @param {string} type  – Car | Bike | Scooter
     * @param {number} price – price per day in ₹
     * @param {string} state – one of STATES
     */
    constructor(id, name, type, price, state = STATES.AVAILABLE, img = "") {
        this.id = id;
        this.name = name;
        this.type = type;
        this.price = price;
        this.state = state;
        this.img = img;
    }

    // ── Transition: Available → Reserved
    reserveVehicle() {
        if (this.state !== STATES.AVAILABLE) {
            throw new Error(`Cannot reserve "${this.name}". It is currently ${this.state}.`);
        }
        this.state = STATES.RESERVED;
    }

    // ── Transition: Reserved → Rented
    rentVehicle() {
        if (this.state !== STATES.RESERVED) {
            throw new Error(`Cannot rent "${this.name}". It must be reserved first (currently: ${this.state}).`);
        }
        this.state = STATES.RENTED;
    }

    // ── Transition: Rented → Available
    returnVehicle() {
        if (this.state !== STATES.RENTED) {
            throw new Error(`Cannot return "${this.name}". It is not currently rented (currently: ${this.state}).`);
        }
        this.state = STATES.AVAILABLE;
    }

    // ── Transition: Any → Maintenance
    sendToMaintenance() {
        if (this.state === STATES.MAINTENANCE) {
            throw new Error(`"${this.name}" is already under maintenance.`);
        }
        this.state = STATES.MAINTENANCE;
    }

    // ── Transition: Maintenance → Available
    makeAvailable() {
        if (this.state === STATES.AVAILABLE) {
            throw new Error(`"${this.name}" is already available.`);
        }
        this.state = STATES.AVAILABLE;
    }
}

// ─────────────────────────────────────────────
// 3. APP STATE
// ─────────────────────────────────────────────

let vehicles = [];        // Array<Vehicle>
let rentalHistory = [];   // Array<{icon,title,detail,time}>
let nextId = 1;

// ─────────────────────────────────────────────
// 4. LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────

const LS_VEHICLES = "driveEasy_vehicles";
const LS_HISTORY = "driveEasy_history";
const LS_NEXT_ID = "driveEasy_nextId";

function saveToLocalStorage() {
    localStorage.setItem(LS_VEHICLES, JSON.stringify(vehicles));
    localStorage.setItem(LS_HISTORY, JSON.stringify(rentalHistory));
    localStorage.setItem(LS_NEXT_ID, nextId);
}

function loadFromLocalStorage() {
    const savedVehicles = localStorage.getItem(LS_VEHICLES);
    const savedHistory = localStorage.getItem(LS_HISTORY);
    const savedNextId = localStorage.getItem(LS_NEXT_ID);

    if (savedVehicles) {
        // Restore plain objects back into Vehicle instances
        vehicles = JSON.parse(savedVehicles).map(v =>
            new Vehicle(v.id, v.name, v.type, v.price, v.state, v.img || "")
        );
    } else {
        // Seed default vehicles
        vehicles = [
            new Vehicle("V001", "Honda City", "Car", 1500, "available", "images/honda-city.jpg"),
            new Vehicle("V002", "Maruti Swift", "Car", 1200, "available", "images/maruti-swift.jpg"),
            new Vehicle("V003", "Toyota Fortuner", "Car", 3500, "available", "images/toyota-fortuner.jpg"),
            new Vehicle("V004", "Royal Enfield 350", "Bike", 700, "available", "images/royal-enfield.jpg"),
            new Vehicle("V005", "Bajaj Pulsar 150", "Bike", 500, "available", "images/bajaj-pulsar.jpg"),
            new Vehicle("V006", "KTM Duke 390", "Bike", 900, "available", "images/ktm-duke.jpg"),
            new Vehicle("V007", "Honda Activa", "Scooter", 350, "available", "images/honda-activa.jpg"),
            new Vehicle("V008", "TVS Jupiter", "Scooter", 300, "available", "images/tvs-jupiter.jpg"),
            new Vehicle("V009", "Suzuki Access", "Scooter", 380, "maintenance", "images/suzuki-access.jpg"),
        ];
    }

    if (savedHistory) rentalHistory = JSON.parse(savedHistory);
    if (savedNextId) nextId = parseInt(savedNextId, 10);
}

// ─────────────────────────────────────────────
// 5. NOTIFICATION SYSTEM
// ─────────────────────────────────────────────

let notifTimer = null;

/**
 * Show a notification popup
 * @param {string} message
 * @param {'success'|'error'|'warning'} type
 */
function showNotification(message, type = "success") {
    const notif = document.getElementById("notification");
    const icon = document.getElementById("notif-icon");
    const msgEl = document.getElementById("notif-message");

    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    };
    icon.innerHTML = icons[type] || icons.success;
    msgEl.textContent = message;

    notif.className = `notification ${type}`;
    notif.classList.add("show");

    if (notifTimer) clearTimeout(notifTimer);
    notifTimer = setTimeout(() => notif.classList.remove("show"), 3500);
}

// ─────────────────────────────────────────────
// 6. RENDERING HELPERS
// ─────────────────────────────────────────────

/** Capitalize first letter */
function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

/** Format current date/time */
function now() {
    return new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

/**
 * Add a record to rentalHistory
 * @param {string} icon
 * @param {string} title
 * @param {string} detail
 */
function addHistoryRecord(iconKey, title, detail) {
    rentalHistory.unshift({ iconKey, title, detail, time: now() });
    if (rentalHistory.length > 100) rentalHistory.pop(); // keep last 100
    saveToLocalStorage();
    renderHistory();
}

// ─────────────────────────────────────────────
// 7. RENDER VEHICLE CARDS
// ─────────────────────────────────────────────

let currentFilter = "all";
let currentSearch = "";

function renderVehicleGrid() {
    const grid = document.getElementById("vehicleGrid");
    const noResult = document.getElementById("no-results");
    grid.innerHTML = "";

    let filtered = vehicles.filter(v => {
        const matchType = currentFilter === "all" || v.type === currentFilter;
        const matchSearch = v.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
            v.type.toLowerCase().includes(currentSearch.toLowerCase());
        return matchType && matchSearch;
    });

    if (filtered.length === 0) {
        noResult.classList.remove("hidden");
        return;
    }
    noResult.classList.add("hidden");

    filtered.forEach(v => {
        const card = document.createElement("div");
        card.className = "vehicle-card";
        card.dataset.id = v.id;

        const isActionable = v.state === STATES.AVAILABLE;
        const stateLabel = cap(v.state);
        const imgSrc = v.img || "";
        const hasImg = imgSrc.length > 0;

        card.innerHTML = `
      <div class="vehicle-card-header${hasImg ? " vehicle-image" : ""}"${hasImg ? ` style="background-image:url('${imgSrc}')"` : ""}>
        <span class="vehicle-card-badge badge-${v.state}">${STATE_ICONS_SVG[v.state]} ${stateLabel}</span>
      </div>
      <div class="vehicle-card-body">
        <div class="vehicle-name">${v.name}</div>
        <div class="vehicle-type">${TYPE_ICONS[v.type] || ""} ${v.type}</div>
        <div class="vehicle-price">₹${v.price.toLocaleString("en-IN")} <span>per day</span></div>
        <div class="vehicle-state-indicator">
          <span class="state-dot ${v.state}"></span>
          <span>${stateLabel}</span>
        </div>
      </div>
      <div class="vehicle-card-footer">
        <button
          class="btn ${isActionable ? "btn-primary" : "btn-outline"} btn-full"
          data-action="quick-rent"
          data-id="${v.id}"
          ${!isActionable ? "disabled" : ""}
          aria-label="${isActionable ? "Rent " + v.name : v.name + " is " + stateLabel}"
        >
          ${isActionable
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Rent Now`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Not Available`}
        </button>
      </div>
    `;
        grid.appendChild(card);
    });
}

// ─────────────────────────────────────────────
// 8. RENDER SELECT DROPDOWNS
// ─────────────────────────────────────────────

const TYPE_LABELS = { Car: "Car", Bike: "Bike", Scooter: "Scooter" };

function populateSelects() {
    // Rent section – available or reserved
    const rentSel = document.getElementById("rentVehicleSelect");
    const prev = rentSel.value;
    rentSel.innerHTML = '<option value="">-- Choose a vehicle --</option>';
    vehicles
        .filter(v => v.state === STATES.AVAILABLE || v.state === STATES.RESERVED)
        .forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.id;
            opt.textContent = `${TYPE_LABELS[v.type] || v.type} – ${v.name} (${cap(v.state)}) – ₹${v.price}/day`;
            rentSel.appendChild(opt);
        });
    if (prev) rentSel.value = prev;

    // Return section – rented vehicles only
    const retSel = document.getElementById("returnVehicleSelect");
    const prevRet = retSel.value;
    retSel.innerHTML = '<option value="">-- Choose a rented vehicle --</option>';
    vehicles
        .filter(v => v.state === STATES.RENTED)
        .forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.id;
            opt.textContent = `${TYPE_LABELS[v.type] || v.type} – ${v.name}`;
            retSel.appendChild(opt);
        });
    if (prevRet) retSel.value = prevRet;

    // Admin select – all vehicles
    const adminSel = document.getElementById("adminVehicleSelect");
    const prevAdmin = adminSel.value;
    adminSel.innerHTML = '<option value="">-- Select a vehicle --</option>';
    vehicles.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.id} | ${TYPE_LABELS[v.type] || v.type} – ${v.name} [${cap(v.state)}]`;
        adminSel.appendChild(opt);
    });
    if (prevAdmin) adminSel.value = prevAdmin;
}

// ─────────────────────────────────────────────
// 9. RENDER STATUS TABLE
// ─────────────────────────────────────────────

function renderStatusTable() {
    const tbody = document.getElementById("statusTableBody");
    tbody.innerHTML = "";
    vehicles.forEach(v => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td><code>${v.id}</code></td>
      <td><strong>${v.name}</strong></td>
      <td>${TYPE_LABELS[v.type] || v.type}</td>
      <td>₹${v.price.toLocaleString("en-IN")}</td>
      <td><span class="state-tag ${v.state}">${STATE_ICONS_SVG[v.state]} ${cap(v.state)}</span></td>
    `;
        tbody.appendChild(tr);
    });
}

// ─────────────────────────────────────────────
// 10. RENDER STATUS STATS
// ─────────────────────────────────────────────

function countByState(state) { return vehicles.filter(v => v.state === state).length; }

const STAT_SVG_ICONS = {
    total: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17H5a2 2 0 0 1-2-2V7l2-4h10l2 4h4.5a.5.5 0 0 1 .5.5V15a2 2 0 0 1-2 2Z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>`,
    available: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    reserved: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    rented: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    maintenance: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    history: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
};

function renderStatusStats() {
    const el = document.getElementById("statusStats");
    const stats = [
        { key: "total", label: "Total", value: vehicles.length, bg: "#EFF6FF", color: "#2563EB" },
        { key: "available", label: "Available", value: countByState(STATES.AVAILABLE), bg: "#ECFDF5", color: "#10B981" },
        { key: "reserved", label: "Reserved", value: countByState(STATES.RESERVED), bg: "#FFFBEB", color: "#F59E0B" },
        { key: "rented", label: "Rented", value: countByState(STATES.RENTED), bg: "#EFF6FF", color: "#2563EB" },
        { key: "maintenance", label: "Maintenance", value: countByState(STATES.MAINTENANCE), bg: "#FEF2F2", color: "#EF4444" },
    ];
    el.innerHTML = stats.map(s => `
    <div class="status-stat-card">
      <div class="status-stat-icon" style="background:${s.bg};color:${s.color}">${STAT_SVG_ICONS[s.key]}</div>
      <div class="status-stat-number" style="color:${s.color}">${s.value}</div>
      <div class="status-stat-label">${s.label}</div>
    </div>
  `).join("");
}

// ─────────────────────────────────────────────
// 11. RENDER ADMIN ANALYTICS + CHART
// ─────────────────────────────────────────────

function renderAnalyticsCards() {
    const el = document.getElementById("analyticsCards");
    const data = [
        { key: "total", label: "Total Vehicles", value: vehicles.length, bg: "#EFF6FF", color: "#2563EB" },
        { key: "available", label: "Available", value: countByState(STATES.AVAILABLE), bg: "#ECFDF5", color: "#10B981" },
        { key: "reserved", label: "Reserved", value: countByState(STATES.RESERVED), bg: "#FFFBEB", color: "#F59E0B" },
        { key: "rented", label: "Rented", value: countByState(STATES.RENTED), bg: "#EFF6FF", color: "#2563EB" },
        { key: "maintenance", label: "Maintenance", value: countByState(STATES.MAINTENANCE), bg: "#FEF2F2", color: "#EF4444" },
        { key: "history", label: "Total Rentals", value: rentalHistory.filter(h => h.title.startsWith("Rented")).length, bg: "#F0F9FF", color: "#0EA5E9" },
    ];
    el.innerHTML = data.map(d => `
    <div class="analytics-card">
      <div class="analytics-icon" style="background:${d.bg};color:${d.color}">${STAT_SVG_ICONS[d.key]}</div>
      <div>
        <div class="analytics-value">${d.value}</div>
        <div class="analytics-label">${d.label}</div>
      </div>
    </div>
  `).join("");
}

function renderChart() {
    const container = document.getElementById("chartContainer");
    const totalVehicles = vehicles.length || 1; // avoid div by 0

    const bars = [
        { label: "Available", value: countByState(STATES.AVAILABLE), color: "#22c55e" },
        { label: "Reserved", value: countByState(STATES.RESERVED), color: "#f59e0b" },
        { label: "Rented", value: countByState(STATES.RENTED), color: "#4f6df5" },
        { label: "Maintenance", value: countByState(STATES.MAINTENANCE), color: "#ef4444" },
        { label: "Total", value: vehicles.length, color: "#8b5cf6" },
    ];

    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const chartHeight = 160; // px

    container.innerHTML = bars.map(b => {
        const barH = Math.max((b.value / maxVal) * chartHeight, b.value > 0 ? 8 : 0);
        return `
      <div class="chart-bar-group">
        <div class="chart-bar" style="height:${barH}px; background:${b.color}; width:100%; max-width:90px;">
          <span class="chart-bar-value">${b.value}</span>
        </div>
        <span class="chart-bar-label">${b.label}</span>
      </div>
    `;
    }).join("");
}

// ─────────────────────────────────────────────
// 12. RENDER RENTAL HISTORY
// ─────────────────────────────────────────────

const HISTORY_ICON_SVGS = {
    reserve: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`, bg: "#FFFBEB", color: "#F59E0B" },
    rent: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`, bg: "#EFF6FF", color: "#2563EB" },
    return_: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`, bg: "#ECFDF5", color: "#10B981" },
    maintenance: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`, bg: "#FEF2F2", color: "#EF4444" },
    add: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`, bg: "#ECFDF5", color: "#10B981" },
    remove: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`, bg: "#FEF2F2", color: "#EF4444" },
    available: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`, bg: "#ECFDF5", color: "#10B981" },
    default: { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`, bg: "#F1F5F9", color: "#64748B" },
};

function getHistoryIcon(iconKey) {
    return HISTORY_ICON_SVGS[iconKey] || HISTORY_ICON_SVGS.default;
}

function renderHistory() {
    const el = document.getElementById("historyList");
    if (rentalHistory.length === 0) {
        el.innerHTML = '<p class="history-empty">No rental history yet. Make your first rental!</p>';
        return;
    }
    el.innerHTML = rentalHistory.map(h => {
        const ic = getHistoryIcon(h.iconKey || "default");
        return `
    <div class="history-item">
      <div class="history-icon" style="background:${ic.bg};color:${ic.color}">${ic.svg}</div>
      <div class="history-content">
        <div class="history-title">${h.title}</div>
        <div class="history-detail">${h.detail}</div>
      </div>
      <div class="history-time">${h.time}</div>
    </div>
  `;
    }).join("");
}

// ─────────────────────────────────────────────
// 13. UPDATE HERO STATS
// ─────────────────────────────────────────────

function updateHeroStats() {
    document.getElementById("stat-total").textContent = vehicles.length;
    document.getElementById("stat-available").textContent = countByState(STATES.AVAILABLE);
}

// ─────────────────────────────────────────────
// 14. MASTER RENDER — call this after every state change
// ─────────────────────────────────────────────

function renderAll() {
    renderVehicleGrid();
    populateSelects();
    renderStatusTable();
    renderStatusStats();
    renderAnalyticsCards();
    renderChart();
    renderHistory();
    updateHeroStats();
    updateCostPreview();
}

// ─────────────────────────────────────────────
// 15. COST PREVIEW
// ─────────────────────────────────────────────

function updateCostPreview() {
    const selId = document.getElementById("rentVehicleSelect").value;
    const days = parseInt(document.getElementById("rentalDays").value, 10) || 1;
    const costEl = document.getElementById("estimatedCost");

    if (!selId) { costEl.textContent = "₹0"; return; }
    const v = vehicles.find(v => v.id === selId);
    if (!v) { costEl.textContent = "₹0"; return; }
    costEl.textContent = `₹${(v.price * days).toLocaleString("en-IN")}`;
}

// ─────────────────────────────────────────────
// 16. RETURN SUMMARY
// ─────────────────────────────────────────────

function updateReturnSummary() {
    const selId = document.getElementById("returnVehicleSelect").value;
    const el = document.getElementById("returnSummary");
    if (!selId) { el.innerHTML = '<p style="color:var(--text-muted)">Select a rented vehicle to see details.</p>'; return; }
    const v = vehicles.find(v => v.id === selId);
    if (!v) { el.innerHTML = ""; return; }
    el.innerHTML = `
    <p><strong>${v.name}</strong> &mdash; ${v.type}</p>
    <p style="margin-top:6px;color:var(--text-secondary)">Daily Rate: ₹${v.price.toLocaleString("en-IN")}</p>
    <p style="margin-top:4px;color:var(--success);font-weight:600">Ready to return</p>
  `;
}

// ─────────────────────────────────────────────
// 17. GENERATE NEW ID
// ─────────────────────────────────────────────

function generateId() {
    const id = `V${String(nextId).padStart(3, "0")}`;
    nextId++;
    return id;
}

// ─────────────────────────────────────────────
// 18. EVENT: RESERVE VEHICLE
// ─────────────────────────────────────────────

function handleReserve() {
    const selId = document.getElementById("rentVehicleSelect").value;
    if (!selId) { showNotification("Please select a vehicle first.", "warning"); return; }

    const v = vehicles.find(v => v.id === selId);
    if (!v) return;

    try {
        v.reserveVehicle();
        addHistoryRecord("reserve", `Reserved: ${v.name}`, `${v.type} reserved for upcoming rental.`);
        saveToLocalStorage();
        renderAll();
        showNotification(`${v.name} has been reserved. Now click "Confirm Rent" to finalize.`);
    } catch (err) {
        showNotification(err.message, "error");
    }
}

// ─────────────────────────────────────────────
// 19. EVENT: RENT VEHICLE
// ─────────────────────────────────────────────

function handleRent() {
    const selId = document.getElementById("rentVehicleSelect").value;
    const name = document.getElementById("renterName").value.trim();
    const days = parseInt(document.getElementById("rentalDays").value, 10) || 1;
    if (!selId) { showNotification("Please select a vehicle first.", "warning"); return; }
    if (!name) { showNotification("Please enter your name.", "warning"); return; }

    const v = vehicles.find(v => v.id === selId);
    if (!v) return;

    try {
        v.rentVehicle();
        const cost = v.price * days;
        addHistoryRecord(
            "rent",
            `Rented: ${v.name}`,
            `Rented by ${name} for ${days} day(s). Total: ₹${cost.toLocaleString("en-IN")}`
        );
        saveToLocalStorage();
        renderAll();
        showNotification(`${v.name} rented to ${name} for ${days} day(s). Total: ₹${cost.toLocaleString("en-IN")}`);
    } catch (err) {
        showNotification(err.message, "error");
    }
}

// ─────────────────────────────────────────────
// 20. EVENT: RETURN VEHICLE
// ─────────────────────────────────────────────

function handleReturn() {
    const selId = document.getElementById("returnVehicleSelect").value;
    if (!selId) { showNotification("Please select a vehicle to return.", "warning"); return; }

    const v = vehicles.find(v => v.id === selId);
    if (!v) return;

    try {
        v.returnVehicle();
        addHistoryRecord("return_", `Returned: ${v.name}`, `${v.type} returned and now available again.`);
        saveToLocalStorage();
        renderAll();
        showNotification(`${v.name} returned successfully and is now available.`);
    } catch (err) {
        showNotification(err.message, "error");
    }
}

// ─────────────────────────────────────────────
// 21. EVENT: QUICK RENT FROM CARD (scroll to rent section)
// ─────────────────────────────────────────────

function handleQuickRent(vehicleId) {
    const rentSel = document.getElementById("rentVehicleSelect");
    document.getElementById("rent").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
        rentSel.value = vehicleId;
        updateCostPreview();
        showNotification("Vehicle selected! Fill in your details below.", "success");
    }, 500);
}

// ─────────────────────────────────────────────
// 22. ADMIN: ADD VEHICLE
// ─────────────────────────────────────────────

function handleAddVehicle() {
    const name = document.getElementById("newVehicleName").value.trim();
    const type = document.getElementById("newVehicleType").value;
    const price = parseInt(document.getElementById("newVehiclePrice").value, 10);

    if (!name) { showNotification("Please enter a vehicle name.", "warning"); return; }
    if (!price || price < 1) { showNotification("Please enter a valid price.", "warning"); return; }

    const v = new Vehicle(generateId(), name, type, price, STATES.AVAILABLE);
    vehicles.push(v);
    addHistoryRecord("add", `Added: ${v.name}`, `${type} added to fleet. ₹${price}/day`);
    saveToLocalStorage();
    renderAll();
    showNotification(`${name} added to the fleet.`);

    // Clear inputs
    document.getElementById("newVehicleName").value = "";
    document.getElementById("newVehiclePrice").value = "";
}

// ─────────────────────────────────────────────
// 23. ADMIN: REMOVE VEHICLE
// ─────────────────────────────────────────────

function handleAdminRemove() {
    const selId = document.getElementById("adminVehicleSelect").value;
    if (!selId) { showNotification("Please select a vehicle.", "warning"); return; }

    vehicles = vehicles.filter(v => v.id !== selId);
    addHistoryRecord("remove", `Removed: Vehicle ${selId}`, "Vehicle removed from fleet by admin.");
    saveToLocalStorage();
    renderAll();
    showNotification(`Vehicle removed from fleet.`, "warning");
    document.getElementById("adminVehicleSelect").value = "";
}

// ─────────────────────────────────────────────
// 24. ADMIN: SET MAINTENANCE
// ─────────────────────────────────────────────

function handleAdminMaintenance() {
    const selId = document.getElementById("adminVehicleSelect").value;
    if (!selId) { showNotification("Please select a vehicle.", "warning"); return; }

    const v = vehicles.find(v => v.id === selId);
    if (!v) return;

    try {
        v.sendToMaintenance();
        addHistoryRecord("maintenance", `Maintenance: ${v.name}`, "Vehicle sent to maintenance by admin.");
        saveToLocalStorage();
        renderAll();
        showNotification(`${v.name} is now under maintenance.`, "warning");
    } catch (err) {
        showNotification(err.message, "error");
    }
}

// ─────────────────────────────────────────────
// 25. ADMIN: MAKE AVAILABLE
// ─────────────────────────────────────────────

function handleAdminMakeAvailable() {
    const selId = document.getElementById("adminVehicleSelect").value;
    if (!selId) { showNotification("Please select a vehicle.", "warning"); return; }

    const v = vehicles.find(v => v.id === selId);
    if (!v) return;

    try {
        v.makeAvailable();
        addHistoryRecord("available", `Available: ${v.name}`, "Vehicle made available by admin.");
        saveToLocalStorage();
        renderAll();
        showNotification(`${v.name} is now available for rental.`);
    } catch (err) {
        showNotification(err.message, "error");
    }
}

// ─────────────────────────────────────────────
// 26. DARK / LIGHT MODE
// ─────────────────────────────────────────────

function applyThemeIcon(theme) {
    const moon = document.getElementById("icon-moon");
    const sun = document.getElementById("icon-sun");
    if (moon && sun) {
        moon.style.display = theme === "dark" ? "none" : "block";
        sun.style.display = theme === "dark" ? "block" : "none";
    }
}

function initTheme() {
    const saved = localStorage.getItem("driveEasy_theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    applyThemeIcon(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("driveEasy_theme", next);
    applyThemeIcon(next);
}

// ─────────────────────────────────────────────
// 27. ACTIVE NAV LINK ON SCROLL
// ─────────────────────────────────────────────

function initScrollSpy() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");

    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                navLinks.forEach(l => l.classList.remove("active"));
                const active = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
                if (active) active.classList.add("active");
            }
        });
    }, { rootMargin: "-50% 0px -50% 0px" });

    sections.forEach(s => observer.observe(s));
}

// ─────────────────────────────────────────────
// 28. SCROLL PROGRESS BAR
// ─────────────────────────────────────────────

function initScrollProgress() {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.prepend(bar);

    window.addEventListener("scroll", () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
        bar.style.width = `${progress}%`;
    }, { passive: true });
}

// ─────────────────────────────────────────────
// 29. NAVBAR SCROLL EFFECT
// ─────────────────────────────────────────────

function initNavbarScroll() {
    const navbar = document.getElementById("navbar");
    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 20);
    }, { passive: true });
}

// ─────────────────────────────────────────────
// 30. HAMBURGER MENU
// ─────────────────────────────────────────────

function initHamburger() {
    const btn = document.getElementById("hamburger");
    const links = document.getElementById("nav-links");

    btn.addEventListener("click", () => {
        const isOpen = links.classList.toggle("open");
        btn.classList.toggle("active", isOpen);
        btn.setAttribute("aria-expanded", isOpen);
    });

    // Close on link click
    links.querySelectorAll("a").forEach(a =>
        a.addEventListener("click", () => {
            links.classList.remove("open");
            btn.classList.remove("active");
            btn.setAttribute("aria-expanded", false);
        })
    );
}

// ─────────────────────────────────────────────
// 31. CLEAR HISTORY
// ─────────────────────────────────────────────

function handleClearHistory() {
    if (!confirm("Are you sure you want to clear all rental history?")) return;
    rentalHistory = [];
    saveToLocalStorage();
    renderHistory();
    showNotification("Rental history cleared.", "warning");
}

// ─────────────────────────────────────────────
// 32. BIND ALL EVENT LISTENERS
// ─────────────────────────────────────────────

function bindEvents() {
    // Theme toggle
    document.getElementById("themeToggle").addEventListener("click", toggleTheme);

    // Hamburger
    initHamburger();

    // Vehicle Grid – delegated click for "Rent Now" quick-action buttons
    document.getElementById("vehicleGrid").addEventListener("click", e => {
        const btn = e.target.closest("[data-action='quick-rent']");
        if (btn) handleQuickRent(btn.dataset.id);
    });

    // Search input
    document.getElementById("searchInput").addEventListener("input", e => {
        currentSearch = e.target.value;
        renderVehicleGrid();
    });

    // Filter tabs
    document.querySelectorAll(".filter-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".filter-tab").forEach(t => {
                t.classList.remove("active");
                t.setAttribute("aria-selected", "false");
            });
            tab.classList.add("active");
            tab.setAttribute("aria-selected", "true");
            currentFilter = tab.dataset.filter;
            renderVehicleGrid();
        });
    });

    // Rent form
    document.getElementById("btnReserve").addEventListener("click", handleReserve);
    document.getElementById("btnRent").addEventListener("click", handleRent);
    document.getElementById("rentVehicleSelect").addEventListener("change", updateCostPreview);
    document.getElementById("rentalDays").addEventListener("input", updateCostPreview);

    // Return form
    document.getElementById("btnReturn").addEventListener("click", handleReturn);
    document.getElementById("returnVehicleSelect").addEventListener("change", updateReturnSummary);

    // Admin
    document.getElementById("btnAddVehicle").addEventListener("click", handleAddVehicle);
    document.getElementById("btnAdminRemove").addEventListener("click", handleAdminRemove);
    document.getElementById("btnAdminMaintenance").addEventListener("click", handleAdminMaintenance);
    document.getElementById("btnAdminAvailable").addEventListener("click", handleAdminMakeAvailable);

    // History
    document.getElementById("btnClearHistory").addEventListener("click", handleClearHistory);
}

// ─────────────────────────────────────────────
// 33. INIT – Entry Point
// ─────────────────────────────────────────────

function init() {
    initTheme();
    loadFromLocalStorage();
    bindEvents();
    initScrollSpy();
    initScrollProgress();
    initNavbarScroll();
    renderAll();
    updateReturnSummary();

    console.log("[DriveEasy] Vehicle Rental System initialized.");
    console.log(`   Loaded ${vehicles.length} vehicle(s) from storage.`);
}

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", init);
