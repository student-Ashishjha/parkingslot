const state = {
    spots: {},
    currentModalSpot: null,
    revenue: 0,
    rates: { car: 5, motorcycle: 3, truck: 8 },
    totalSpots: 20  // Fixed number of spots
};

// Shorthand for document.getElementById
const $ = id => document.getElementById(id);

// Element references
const els = {
    username: $('username'),
    vehicleType: $('vehicle-type'),
    licensePlate: $('license-plate'),
    spot: $('spot'),
    entryTime: $('entry-time'),
    duration: $('duration'),
    priceInfo: $('price-info'),
    bookBtn: $('book-btn'),
    reserveBtn: $('reserve-btn'),
    parkingGrid: $('parking-grid'),
    modal: $('spot-modal'),
    modalContent: $('modal-content'),
    ticketContainer: $('ticket-container'),
    checkoutBtn: $('checkout-btn'),
    releaseReserveBtn: $('release-reserve-btn'),
    toast: $('toast'),
    availableCount: $('available-count'),
    occupiedCount: $('occupied-count'),
    reservedCount: $('reserved-count'),
    revenue: $('revenue'),
    searchInput: $('search-input'),
    searchBtn: $('search-btn'),
    logoutBtn: $('logout-btn')
};

// Helper functions
const capitalize = str => str && (str.charAt(0).toUpperCase() + str.slice(1));
const formatDateTime = date => date.toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
const calculateFee = (vehicleType, duration) => state.rates[vehicleType] * duration;

const showToast = (message, type) => {
    els.toast.textContent = message;
    els.toast.className = `toast ${type}`;
    els.toast.style.display = 'block';
    setTimeout(() => els.toast.style.display = 'none', 3000);
};

// Function to handle logout
function handleLogout() {
    showToast('Logging out...', 'success');
    setTimeout(() => {
        window.location.href = '/logout';
    }, 1000);
}

function renderSpots() {
    els.parkingGrid.innerHTML = '';
    Object.keys(state.spots).forEach(spotId => {
        const spot = state.spots[spotId];
        const el = document.createElement('div');
        el.className = `spot ${spot.status}`;

        let icon = '🅿️';
        if (spot.vehicle_type === 'car') icon = '🚗';
        else if (spot.vehicle_type === 'motorcycle') icon = '🏍️';
        else if (spot.vehicle_type === 'truck') icon = '🚙';

        el.innerHTML = `<div class="vehicle-icon">${icon}</div><div><b>Spot ${spotId}</b></div><div>${capitalize(spot.status)}</div>`;
        el.onclick = () => showSpotDetails(spotId);
        els.parkingGrid.appendChild(el);
    });
}

function updateSpotDropdown() {
    els.spot.innerHTML = '<option value="">Select spot</option>';
    Object.keys(state.spots)
        .filter(spotId => state.spots[spotId].status === 'available')
        .forEach(spotId => {
            els.spot.innerHTML += `<option value="${spotId}">Spot ${spotId}</option>`;
        });
    validateForm();
}

function showSpotDetails(id) {
    const spot = state.spots[id];
    state.currentModalSpot = id;

    els.modalContent.innerHTML = `
        <p><b>Spot:</b> ${id}</p>
        <p><b>Status:</b> ${capitalize(spot.status)}</p>
        ${spot.status !== 'available' ? `
            <p><b>Vehicle Type:</b> ${capitalize(spot.vehicle_type)}</p>
            <p><b>License Plate:</b> ${spot.license_plate}</p>
            <p><b>Entry Time:</b> ${formatDateTime(new Date(spot.entry_time))}</p>
            <p><b>Duration:</b> ${spot.duration} hour(s)</p>
            <p><b>Hourly Rate:</b> $${state.rates[spot.vehicle_type]}</p>
            <p><b>Total Fee:</b> $${(state.rates[spot.vehicle_type] * spot.duration).toFixed(2)}</p>
        ` : ''}
    `;

    // Show appropriate action buttons based on status
    els.checkoutBtn.style.display = spot.status === 'occupied' ? 'block' : 'none';
    els.releaseReserveBtn.style.display = spot.status === 'reserved' ? 'block' : 'none';

    if (spot.status === 'occupied') generateTicket(spot, id);
    else els.ticketContainer.innerHTML = '';

    els.modal.style.display = 'flex';
}

function generateTicket(spot, id) {
    const entryTime = new Date(spot.entry_time);
    const exitTime = new Date(entryTime.getTime() + spot.duration * 60 * 60 * 1000);
    const fee = calculateFee(spot.vehicle_type, spot.duration);

    els.ticketContainer.innerHTML = `
        <div class="ticket">
            <h3 style="text-align:center;margin-bottom:10px">PARKING TICKET</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <p><b>Spot:</b> ${id}</p>
                <p><b>Vehicle:</b> ${capitalize(spot.vehicle_type)}</p>
                <p><b>Plate:</b> ${spot.license_plate}</p>
                <p><b>Rate:</b> $${state.rates[spot.vehicle_type]}/hr</p>
                <p><b>Entry:</b> ${formatDateTime(entryTime)}</p>
                <p><b>Exit:</b> ${formatDateTime(exitTime)}</p>
            </div>
            <p style="text-align:center;margin-top:10px"><b>Total Fee: $${fee.toFixed(2)}</b></p>
        </div>
    `;
}

function validateForm() {
    const isValid = els.vehicleType.value && els.licensePlate.value &&
                  els.spot.value && els.entryTime.value && els.duration.value;

    els.bookBtn.disabled = !isValid;
    els.reserveBtn.disabled = !isValid;

    if (els.vehicleType.value && els.duration.value) {
        const rate = state.rates[els.vehicleType.value];
        const hours = parseInt(els.duration.value) || 0;
        const fee = rate * hours;
        els.priceInfo.textContent = `Parking fee: $${fee.toFixed(2)} ($${rate}/hour × ${hours} hours)`;
    } else {
        els.priceInfo.textContent = 'Select vehicle type and duration to see price';
    }

    return isValid;
}

function updateStats() {
    const counts = {available: 0, occupied: 0, reserved: 0};
    
    Object.values(state.spots).forEach(spot => {
        counts[spot.status]++;
    });

    els.availableCount.textContent = counts.available;
    els.occupiedCount.textContent = counts.occupied;
    els.reservedCount.textContent = counts.reserved;
    
    // Calculate revenue from occupied spots
    let totalRevenue = 0;
    Object.values(state.spots).forEach(spot => {
        if (spot.status === 'occupied' && spot.vehicle_type && spot.duration) {
            totalRevenue += calculateFee(spot.vehicle_type, spot.duration);
        }
    });
    
    state.revenue = totalRevenue;
    els.revenue.textContent = `$${state.revenue.toFixed(2)}`;
}

async function bookSlot(status) {
    if (!validateForm()) return;

    const spotId = els.spot.value;
    const vehicleType = els.vehicleType.value;
    const licensePlate = els.licensePlate.value;
    const entryTime = els.entryTime.value;
    const duration = parseInt(els.duration.value);

    // For mock implementation, directly update state
    state.spots[spotId] = {
        status: status,
        vehicle_type: vehicleType,
        license_plate: licensePlate,
        entry_time: entryTime,
        duration: duration
    };
    
    // Update UI
    renderSpots();
    updateSpotDropdown();
    updateStats();
    
    // Reset form
    els.vehicleType.value = '';
    els.licensePlate.value = '';
    els.spot.value = '';
    els.duration.value = '';
    els.priceInfo.textContent = 'Select vehicle type and duration to see price';

    showToast(`Slot ${status === 'reserved' ? 'reserved' : 'booked'} successfully!`, 'success');
}

function releaseSlot() {
    const id = state.currentModalSpot;
    if (!id) return;
    
    // FIX: Only release the specific slot
    state.spots[id] = {
        status: 'available',
        vehicle_type: null,
        license_plate: null,
        entry_time: null,
        duration: null
    };
    
    // Update UI
    renderSpots();
    updateSpotDropdown();
    updateStats();
    
    els.modal.style.display = 'none';
    showToast('Slot released successfully', 'success');
}

function searchSpots() {
    const query = els.searchInput.value.trim().toLowerCase();
    if (!query) return;

    const spotId = Object.keys(state.spots).find(id => 
        id === query || 
        (state.spots[id].license_plate && state.spots[id].license_plate.toLowerCase().includes(query))
    );

    if (spotId) {
        showSpotDetails(spotId);
    } else {
        showToast('No matching vehicle or spot found', 'error');
    }
}

function setupEvents() {
    // Set current date/time for entry time field
    els.entryTime.value = new Date().toISOString().slice(0, 16);

    // Event listeners
    els.logoutBtn.addEventListener('click', handleLogout);
    els.vehicleType.addEventListener('change', validateForm);
    [els.licensePlate, els.spot, els.entryTime, els.duration].forEach(el =>
        el.addEventListener('input', validateForm));
    
    els.bookBtn.addEventListener('click', () => bookSlot('occupied'));
    els.reserveBtn.addEventListener('click', () => bookSlot('reserved'));
    
    $('close-modal').addEventListener('click', () => els.modal.style.display = 'none');
    els.checkoutBtn.addEventListener('click', releaseSlot);
    els.releaseReserveBtn.addEventListener('click', releaseSlot);
    
    els.searchBtn.addEventListener('click', searchSpots);
    els.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchSpots(); });
    
    window.addEventListener('click', e => { 
        if (e.target === els.modal) {
            els.modal.style.display = 'none';
        }
    });
}

// Initialize mock data
function initMockData() {
    // Create parking spots
    for (let i = 1; i <= state.totalSpots; i++) {
        const status = Math.random() < 0.6 ? 'available' : (Math.random() < 0.5 ? 'occupied' : 'reserved');
        
        state.spots[i] = {
            status: status,
            vehicle_type: status !== 'available' ? ['car', 'motorcycle', 'truck'][Math.floor(Math.random() * 3)] : null,
            license_plate: status !== 'available' ? `ABC-${Math.floor(Math.random() * 9000) + 1000}` : null,
            entry_time: status !== 'available' ? new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 5).toISOString() : null,
            duration: status !== 'available' ? Math.floor(Math.random() * 5) + 1 : null
        };
    }
}

// Initialize application
function init() {
    initMockData();
    setupEvents();
    renderSpots();
    updateSpotDropdown();
    updateStats();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);