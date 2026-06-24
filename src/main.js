import { CLUBS_DATA } from './data/clubs.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ==========================================
// 1. STATE INITIALIZATION
// ==========================================
const DB_KEY = 'clubsphere_db_v1';
const USERS_DB_KEY = 'clubsphere_users_v1';
const BOOKINGS_DB_KEY = 'clubsphere_bookings_v1';
const USER_SESSION_KEY = 'clubsphere_session_v1';

// ==========================================
// PRE-SEEDED DEMO ACCOUNTS (Add more here!)
// ==========================================
// No pre-seeded demo accounts; students will register themselves

let clubsState = [];
let usersState = [];
let bookingsState = [];
const MAX_SLOTS = 110; // Updated club capacity
let intendedClubId = null;
let selectedClubId = null;
let currentUser = null;

// Concurrency Settings State
let simulatedRaceCondition = false;
let simulatedLatency = true;

// DOM Elements
const views = {
  overview: document.getElementById('overview-view'),
  booking: document.getElementById('booking-view'),
  confirmation: document.getElementById('confirmation-view'),
  login: document.getElementById('login-view'),
  admin: document.getElementById('admin-view')
};

const navbarActions = document.querySelector('.navbar-actions');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const categoryFilter = document.getElementById('category-filter');
const categoryTags = document.querySelectorAll('.cat-tag');
const clubsGrid = document.getElementById('clubs-grid');
const emptySearchState = document.getElementById('empty-search-state');
const searchStatusBar = document.getElementById('search-status-bar');
const searchStatusText = document.getElementById('search-status-text');

// Concurrency Panel Elements
const concurrencyPanel = document.getElementById('concurrency-panel');
const concurrencyToggleBtn = document.getElementById('concurrency-toggle-btn');
const panelCloseBtn = document.getElementById('panel-close-btn');
const raceConditionCheckbox = document.getElementById('race-condition-checkbox');
const latencyCheckbox = document.getElementById('latency-checkbox');
const resetSlotsBtn = document.getElementById('reset-slots-btn');
const fillSlotsBtn = document.getElementById('fill-slots-btn');

// Booking Page Elements
const bookingClubIcon = document.getElementById('booking-club-icon');
const bookingClubCategory = document.getElementById('booking-club-category');
const bookingClubName = document.getElementById('booking-club-name');
const bookingClubTagline = document.getElementById('booking-club-tagline');
const bookingClubSlots = document.getElementById('booking-club-slots');
const bookingClubProgress = document.getElementById('booking-club-progress');
const formsAccentBanner = document.getElementById('forms-accent-banner');
const registrationForm = document.getElementById('club-registration-form');

// Confirmation Page Elements
const ticketClubCategory = document.getElementById('ticket-club-category');
const ticketClubName = document.getElementById('ticket-club-name');
const ticketStudentName = document.getElementById('ticket-student-name');
const ticketStudentId = document.getElementById('ticket-student-id');
const ticketStudentBranch = document.getElementById('ticket-student-branch');
const ticketStudentYear = document.getElementById('ticket-student-year');
const ticketStudentEmail = document.getElementById('ticket-student-email');
const ticketStudentPhone = document.getElementById('ticket-student-phone');
const ticketBookingId = document.getElementById('ticket-booking-id');
const ticketBookingTime = document.getElementById('ticket-booking-time');
const ticketBarcodeNum = document.getElementById('ticket-barcode-num');
const ticketHeaderGradient = document.getElementById('ticket-header-gradient');

// Loader & Toast
const fullPageLoader = document.getElementById('full-page-loader');
const systemToast = document.getElementById('system-toast');
const toastTitle = document.getElementById('toast-title');
const toastMessage = document.getElementById('toast-message');
const toastCloseBtn = document.getElementById('toast-close-btn');

// Auth DOM Elements
const navAuthContainer = document.getElementById('nav-auth-container');
const authLoggedOut = document.getElementById('auth-logged-out');
const authLoggedIn = document.getElementById('auth-logged-in');
const navUserAvatar = document.getElementById('nav-user-avatar');
const navUserName = document.getElementById('nav-user-name');
const userProfileTrigger = document.getElementById('user-profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');

const dropdownFullName = document.getElementById('dropdown-full-name');
const dropdownStudentId = document.getElementById('dropdown-student-id');
const dropdownEmail = document.getElementById('dropdown-email');
const dropdownAdminDashboardBtn = document.getElementById('dropdown-admin-dashboard-btn');
const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');

const navLoginBtn = document.getElementById('nav-login-btn');
const loginForm = document.getElementById('login-form');

// Admin Dashboard DOM Elements
const adminSearchInput = document.getElementById('admin-search-input');
const adminClubFilter = document.getElementById('admin-club-filter');
const adminTableBody = document.getElementById('admin-table-body');
const adminEmptyBookingsState = document.getElementById('admin-empty-bookings-state');

const adminStatTotalRegistrations = document.getElementById('admin-stat-total-registrations');
const adminStatTotalSlotsBooked = document.getElementById('admin-stat-total-slots-booked');
const adminStatSlotsRemaining = document.getElementById('admin-stat-slots-remaining');

const exportCsvBtn = document.getElementById('export-csv-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');

// ==========================================
// 2. MOCK DATABASE (LOCALSTORAGE)
// ==========================================
async function initDatabase() {
  try {
    const res = await fetch('http://localhost:3000/api/clubs');
    let data = await res.json();
    
    if (!data || data.length === 0) {
      // Seed backend
      const seedRes = await fetch('http://localhost:3000/api/clubs/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CLUBS_DATA.map(club => ({ ...club, slotsRemaining: MAX_SLOTS })))
      });
      if (seedRes.ok) {
        const fetchRes = await fetch('http://localhost:3000/api/clubs');
        data = await fetchRes.json();
      }
    }
    clubsState = data;
    updateAggregateCounters();
    renderOverviewGrid();
  } catch (error) {
    console.error('Error fetching clubs from backend:', error);
    showToast('Backend Connection Failed', 'Could not fetch clubs from database.', 'error');
  }

  // Initialize User Session
  const sessionData = localStorage.getItem(USER_SESSION_KEY);
  if (sessionData) {
    try {
      currentUser = JSON.parse(sessionData);
      updateAuthUI();
    } catch (e) {
      console.error(e);
    }
  }
}

function updateAuthUI() {
  if (currentUser) {
    authLoggedOut.style.display = 'none';
    authLoggedIn.style.display = 'block';

    // Admin avatar — always show shield icon
    navUserAvatar.textContent = '🛡';
    navUserName.textContent = 'Admin';

    dropdownFullName.textContent = currentUser.name;
    dropdownStudentId.textContent = 'System Administrator';
    dropdownEmail.textContent = currentUser.email;
  } else {
    authLoggedOut.style.display = 'flex';
    authLoggedIn.style.display = 'none';
    profileDropdown.classList.remove('show');
  }
}

function saveDatabase() {
  localStorage.setItem(DB_KEY, JSON.stringify(clubsState));
  updateAggregateCounters();
}

function resetAllSlots(toFull = true) {
  clubsState = CLUBS_DATA.map(club => {
    return {
      ...club,
      slotsRemaining: toFull ? MAX_SLOTS : 1 // Full or near-empty
    };
  });
  saveDatabase();
  renderOverviewGrid();

  if (views.booking.classList.contains('active') && selectedClubId) {
    updateBookingPageView(selectedClubId);
  }

  showToast(
    toFull ? "Database Reset" : "Database Stress Mode",
    toFull ? `All club available slots have been reset to ${MAX_SLOTS}.` : "All club available slots set to 1 for quick testing.",
    toFull ? "info" : "warning"
  );
}

function updateAggregateCounters() {
  const activeClubsCount = document.getElementById('total-clubs-count');
  const slotsRemainingCount = document.getElementById('total-slots-remaining');

  if (activeClubsCount && slotsRemainingCount) {
    activeClubsCount.textContent = clubsState.length;
    const totalRemaining = clubsState.reduce((sum, club) => sum + club.slotsRemaining, 0);
    slotsRemainingCount.textContent = totalRemaining;
  }
}

// ==========================================
// 3. SPA VIEW ROUTER
// ==========================================
function switchView(viewName) {
  // Guard admin view — only admin can access
  if (viewName === 'admin' && !currentUser) {
    switchView('login');
    showToast("Admin Access Required", "Please log in with admin credentials to access the dashboard.", "info");
    return;
  }

  // Hide all views, show selected
  Object.keys(views).forEach(key => {
    views[key].classList.remove('active');
  });

  // Small delay for fade transitions
  setTimeout(() => {
    views[viewName].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 100);

  // Manage navbar actions visibility (only show search/filter on Overview)
  if (viewName === 'overview') {
    navbarActions.style.display = 'flex';
  } else {
    navbarActions.style.display = 'none';
  }

  // If opening admin view, render the dashboard
  if (viewName === 'admin') {
    renderAdminDashboard();
  }
}

// ==========================================
// 4. HOME VIEW: SEARCH & FILTERS
// ==========================================
function getFilters() {
  return {
    search: searchInput.value.trim().toLowerCase(),
    category: categoryFilter.value
  };
}

function filterClubs() {
  const { search, category } = getFilters();

  const filtered = clubsState.filter(club => {
    // 1. Category Filter
    const matchesCategory = (category === 'All' || club.category === category);

    // 2. Search Keyword Filter (Name, category, tagline, description)
    const matchesSearch = !search ||
      club.name.toLowerCase().includes(search) ||
      club.category.toLowerCase().includes(search) ||
      club.tagline.toLowerCase().includes(search) ||
      club.description.toLowerCase().includes(search);

    return matchesCategory && matchesSearch;
  });

  // Update Status Bar
  if (search || category !== 'All') {
    searchStatusBar.style.display = 'flex';
    searchStatusText.textContent = `Found ${filtered.length} club${filtered.length === 1 ? '' : 's'} matching filter criteria.`;
  } else {
    searchStatusBar.style.display = 'none';
  }

  // Handle Empty State
  if (filtered.length === 0) {
    clubsGrid.style.display = 'none';
    emptySearchState.style.display = 'flex';
  } else {
    clubsGrid.style.display = 'grid';
    emptySearchState.style.display = 'none';
  }

  return filtered;
}

function syncCategoryControls(categoryValue) {
  categoryFilter.value = categoryValue;
  categoryTags.forEach(tag => {
    if (tag.getAttribute('data-category') === categoryValue) {
      tag.classList.add('active');
    } else {
      tag.classList.remove('active');
    }
  });
}

// ==========================================
// 5. RENDERING DYNAMIC CARDS
// ==========================================
function renderOverviewGrid() {
  const filteredClubs = filterClubs();
  clubsGrid.innerHTML = '';

  filteredClubs.forEach(club => {
    const isFull = club.slotsRemaining <= 0;
    const progressPercent = ((MAX_SLOTS - club.slotsRemaining) / MAX_SLOTS) * 100;

    // Determine progress bar and slot color class
    let progressClass = '';
    if (isFull) progressClass = 'full-slots';
    else if (club.slotsRemaining < 10) progressClass = 'low-slots';

    const card = document.createElement('div');
    card.className = `club-card ${isFull ? 'full-club' : ''}`;
    card.id = `card-${club.id}`;
    card.style.cursor = 'pointer';

    card.innerHTML = `
      <div class="club-card-banner" style="background: ${club.accentColor}"></div>
      <div class="club-card-avatar" style="background: ${club.accentColor}">${club.icon}</div>
      <div class="club-card-body">
        <span class="club-category-tag">${club.category}</span>
        <h3>${club.name}</h3>
        <p>${club.tagline}</p>
        
        <div class="club-card-slot-box">
          <div class="slot-progress-meta">
            <span class="slot-progress-title">Slot Status</span>
            <span class="slot-progress-count">
              <span id="slots-val-${club.id}">${club.slotsRemaining}</span>/${MAX_SLOTS} remaining
            </span>
          </div>
          <div class="slot-progress-bar-container">
            <div class="slot-progress-bar ${progressClass}" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <div class="club-card-footer">
          <div class="club-card-action">
            ${isFull
        ? `<button class="btn btn-outline" disabled><i class="fa-solid fa-ban"></i> Club Full</button>`
        : `<button class="btn btn-primary book-btn-trigger" data-id="${club.id}">Book Slot <i class="fa-solid fa-arrow-right-long"></i></button>`
      }
          </div>
        </div>
      </div>
    `;

    clubsGrid.appendChild(card);
    card.addEventListener('click', () => {
      if (!isFull) navigateToBooking(club.id);
    });
  });

  // Attach Event Listeners to Book Now buttons
  document.querySelectorAll('.book-btn-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clubId = btn.getAttribute('data-id');
      navigateToBooking(clubId);
    });
  });
}

// ==========================================
// 6. BOOKING FORM & VALIDATION
// ==========================================
function navigateToBooking(clubId) {
  selectedClubId = clubId;
  updateBookingPageView(clubId);
  switchView('booking');
}

function updateBookingPageView(clubId) {
  const club = clubsState.find(c => c.id === clubId);
  if (!club) return;

  bookingClubIcon.textContent = club.icon;
  bookingClubIcon.style.background = club.accentColor;
  bookingClubCategory.textContent = club.category;
  bookingClubName.textContent = club.name;
  bookingClubTagline.textContent = club.tagline;
  bookingClubSlots.textContent = club.slotsRemaining;
  formsAccentBanner.style.background = club.accentColor;

  const isFull = club.slotsRemaining <= 0;
  const progressPercent = ((MAX_SLOTS - club.slotsRemaining) / MAX_SLOTS) * 100;
  bookingClubProgress.style.width = `${progressPercent}%`;

  // Color classes for sidebar tracker
  bookingClubProgress.className = 'slot-progress-bar';
  bookingClubSlots.className = 'slots-num';
  if (isFull) {
    bookingClubProgress.classList.add('full-slots');
    bookingClubSlots.style.color = 'var(--text-muted)';
  } else if (club.slotsRemaining < 10) {
    bookingClubProgress.classList.add('low-slots');
    bookingClubSlots.style.color = 'var(--accent-red)';
  } else {
    bookingClubSlots.style.color = 'var(--accent-teal)';
  }

  // Handle Form state if full
  const submitBtn = document.getElementById('form-submit-btn');
  if (isFull) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Club Full - Booking Disabled`;
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Confirm Booking & Submit <i class="fa-solid fa-circle-check"></i>`;
  }

  // Clear inputs and error validation styles — students fill freely as guests
  registrationForm.reset();
  registrationForm.querySelectorAll('.form-group').forEach(group => {
    group.classList.remove('invalid', 'locked-field');
  });
  registrationForm.querySelectorAll('input').forEach(input => {
    input.readOnly = false;
  });
  registrationForm.querySelectorAll('select').forEach(sel => {
    sel.removeAttribute('disabled');
  });
}


function validateField(inputElement) {
  const group = inputElement.closest('.form-group');
  if (!group) return true;

  let isValid = true;
  const value = inputElement.value.trim();

  // Basic check for required
  if (inputElement.hasAttribute('required') && !value) {
    isValid = false;
  } else if (inputElement.type === 'email' && value) {
    // Email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    isValid = emailRegex.test(value);
  } else if (inputElement.type === 'tel' && value) {
    // Phone regex - 10 digits
    const phoneRegex = /^\d{10}$/;
    isValid = phoneRegex.test(value);
  }

  if (isValid) {
    group.classList.remove('invalid');
  } else {
    group.classList.add('invalid');
  }

  return isValid;
}

function validateAllFields() {
  let isAllValid = true;
  const inputs = registrationForm.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    if (!validateField(input)) {
      isAllValid = false;
    }
  });

  return isAllValid;
}

// Live Validation on input defocus
registrationForm.querySelectorAll('input, select, textarea').forEach(input => {
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => {
    const group = input.closest('.form-group');
    if (group && group.classList.contains('invalid')) {
      validateField(input);
    }
  });
});

// ==========================================
// 7. TRANSACTION PROCESSING & CONCURRENCY
// ==========================================
registrationForm.addEventListener('submit', function (e) {
  e.preventDefault();

  if (!validateAllFields()) {
    showToast("Validation Error", "Please resolve form errors highlighted in red before submitting.", "error");
    // Scroll to the first error
    const firstError = registrationForm.querySelector('.form-group.invalid');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Temporarily enable selects to let FormData serialize them
  const disabledSelects = registrationForm.querySelectorAll('select[disabled]');
  disabledSelects.forEach(sel => sel.removeAttribute('disabled'));

  // Load Form Data
  const formData = new FormData(registrationForm);
  
  // Re-disable selects
  disabledSelects.forEach(sel => sel.setAttribute('disabled', 'true'));

  const bookingDetails = {
    name: formData.get('studentName'),
    id: formData.get('studentId'),
    email: formData.get('studentEmail'),
    phone: formData.get('studentPhone'),
    year: formData.get('studentYear'),
    branch: formData.get('studentBranch'),
    sop: formData.get('sop'),
    skills: formData.get('skills')
  };

  // Simulate network latency if enabled
  if (simulatedLatency) {
    fullPageLoader.style.display = 'flex';
    setTimeout(() => {
      executeTransaction(bookingDetails);
    }, 1200);
  } else {
    executeTransaction(bookingDetails);
  }
});

async function executeTransaction(details) {
  // Hide loader
  fullPageLoader.style.display = 'none';

  const clubIndex = clubsState.findIndex(c => c.id === selectedClubId);
  if (clubIndex === -1) {
    showToast("System Error", "The selected club could not be located in database registries.", "error");
    return;
  }
  const club = clubsState[clubIndex];

  // 1. CONCURRENCY EXCEPTION CHECK (Client-side simulation)
  if (simulatedRaceCondition) {
    showToast(
      "Booking Conflict (Error 409)",
      `Slot Conflict Detected: Another transaction reserved the last slot for ${club.name} simultaneously. Your booking request was cancelled.`,
      "error"
    );
    club.slotsRemaining = 0;
    renderOverviewGrid();
    updateBookingPageView(selectedClubId);
    return;
  }

  // Generate confirmation ticket parameters
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const code = club.name.slice(0, 3).toUpperCase();
  const bookingId = `CS-${code}-${randNum}`;
  const now = new Date();
  const bookingTimeString = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ', ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const newBooking = {
    bookingId: bookingId,
    clubId: selectedClubId,
    clubName: club.name,
    studentName: details.name,
    studentId: details.id,
    studentEmail: details.email || (currentUser ? currentUser.email : ""),
    studentPhone: details.phone,
    studentYear: details.year,
    studentBranch: details.branch,
    bookingTime: bookingTimeString,
    sop: details.sop,
    skills: details.skills,
    attendance: false
  };

  try {
    const res = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking)
    });

    if (!res.ok) {
      const errorData = await res.json();
      if (res.status === 409) {
        showToast("Booking Conflict", "No slots remaining for this club.", "error");
        club.slotsRemaining = 0;
        renderOverviewGrid();
        updateBookingPageView(selectedClubId);
      } else if (res.status === 400 && errorData.error === 'Duplicate booking') {
        showToast("Duplicate Booking", `You have already registered for a membership slot in ${club.name}.`, "error");
      } else {
        showToast("Error", errorData.error || "An error occurred during booking.", "error");
      }
      return;
    }

    // 2. SUCCESS TRANSACTION COMMITTAL
    club.slotsRemaining -= 1;
    renderOverviewGrid();
    renderTicket(details, club, bookingId, bookingTimeString);
    switchView('confirmation');
  } catch (error) {
    console.error('Booking failed:', error);
    showToast("Network Error", "Failed to communicate with the server. Please try again later.", "error");
  }
}

function renderTicket(details, club, bookingId, timeStr) {
  ticketClubCategory.textContent = club.category;
  ticketClubName.textContent = club.name;
  ticketHeaderGradient.style.background = club.accentColor;

  ticketStudentName.textContent = details.name;
  ticketStudentId.textContent = details.id;
  ticketStudentBranch.textContent = details.branch;
  ticketStudentYear.textContent = details.year;
  ticketStudentEmail.textContent = details.email;
  ticketStudentPhone.textContent = details.phone;

  ticketBookingId.textContent = bookingId;
  ticketBookingTime.textContent = timeStr;
  ticketBarcodeNum.textContent = bookingId.replace(/-/g, '');
}

// ==========================================
// 8. TOAST NOTIFICATION ENGINE
// ==========================================
let toastTimeout = null;

function showToast(title, message, type = "error") {
  // Clear any active timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  // Custom Icon & Style Based on Type
  const iconElement = systemToast.querySelector('.toast-icon i');
  systemToast.className = 'toast-notification show';

  if (type === 'error') {
    systemToast.style.borderColor = 'var(--accent-red)';
    systemToast.style.boxShadow = 'var(--shadow-lg), var(--shadow-glow-red)';
    iconElement.className = 'fa-solid fa-triangle-exclamation';
    iconElement.style.color = 'var(--accent-red)';
  } else if (type === 'success') {
    systemToast.style.borderColor = 'var(--accent-green)';
    systemToast.style.boxShadow = 'var(--shadow-lg), 0 0 20px rgba(56, 239, 125, 0.25)';
    iconElement.className = 'fa-solid fa-circle-check';
    iconElement.style.color = 'var(--accent-green)';
  } else {
    // Info / Warning
    systemToast.style.borderColor = 'var(--accent-teal)';
    systemToast.style.boxShadow = 'var(--shadow-lg), var(--accent-teal-glow)';
    iconElement.className = 'fa-solid fa-circle-info';
    iconElement.style.color = 'var(--accent-teal)';
  }

  // Dismiss automatically in 6 seconds
  toastTimeout = setTimeout(hideToast, 6000);
}

function hideToast() {
  systemToast.classList.remove('show');
}

// ==========================================
// 9. EVENT LISTENERS
// ==========================================

// SPA View Navigation triggers
document.getElementById('nav-brand-logo').addEventListener('click', () => {
  switchView('overview');
});

document.getElementById('booking-back-btn').addEventListener('click', () => {
  switchView('overview');
});

document.getElementById('form-cancel-btn').addEventListener('click', () => {
  switchView('overview');
});

document.getElementById('conf-back-btn').addEventListener('click', () => {
  switchView('overview');
});

// Search functionality
searchInput.addEventListener('input', () => {
  if (searchInput.value.trim()) {
    searchClearBtn.style.display = 'block';
  } else {
    searchClearBtn.style.display = 'none';
  }
  renderOverviewGrid();
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.style.display = 'none';
  renderOverviewGrid();
});

// Filters functionality
categoryFilter.addEventListener('change', () => {
  syncCategoryControls(categoryFilter.value);
  renderOverviewGrid();
});

categoryTags.forEach(tag => {
  tag.addEventListener('click', () => {
    const category = tag.getAttribute('data-category');
    syncCategoryControls(category);
    renderOverviewGrid();
  });
});

document.getElementById('reset-search-link').addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.style.display = 'none';
  syncCategoryControls('All');
  renderOverviewGrid();
});

document.getElementById('empty-reset-btn').addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.style.display = 'none';
  syncCategoryControls('All');
  renderOverviewGrid();
});

// Concurrency Settings UI
concurrencyToggleBtn.addEventListener('click', () => {
  concurrencyPanel.classList.toggle('collapsed');
});

panelCloseBtn.addEventListener('click', () => {
  concurrencyPanel.classList.add('collapsed');
});

raceConditionCheckbox.addEventListener('change', (e) => {
  simulatedRaceCondition = e.target.checked;
  if (simulatedRaceCondition) {
    showToast(
      "Race Condition Trigger Active",
      "The next slot reservation attempt will simulate a concurrency collision on submission.",
      "warning"
    );
  }
});

latencyCheckbox.addEventListener('change', (e) => {
  simulatedLatency = e.target.checked;
});

resetSlotsBtn.addEventListener('click', () => resetAllSlots(true));
fillSlotsBtn.addEventListener('click', () => resetAllSlots(false));

toastCloseBtn.addEventListener('click', hideToast);

// Print Ticket function
document.getElementById('print-ticket-btn').addEventListener('click', () => {
  window.print();
});

// ==========================================
// A. LOGIN & SIGNUP HANDLERS
// ==========================================
// ==========================================
// A. ADMIN LOGIN HANDLER
// ==========================================
function handleLoginSubmit(e) {
  e.preventDefault();
  
  const identifierInput = document.getElementById('login-identifier');
  const passwordInput = document.getElementById('login-password');
  
  let valid = true;
  if (!identifierInput.value.trim()) {
    identifierInput.closest('.form-group').classList.add('invalid');
    valid = false;
  } else {
    identifierInput.closest('.form-group').classList.remove('invalid');
  }
  
  if (!passwordInput.value.trim()) {
    passwordInput.closest('.form-group').classList.add('invalid');
    valid = false;
  } else {
    passwordInput.closest('.form-group').classList.remove('invalid');
  }
  
  if (!valid) return;
  
  const identifier = identifierInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  
  // Admin login check
  const ADMIN_EMAIL = 'mukesh710017@gmail.com';
  const ADMIN_PASSWORD = 'mukesh@2198';
  
  // Staff login check
  const STAFF_DOMAIN = '@snsct.org';
  const STAFF_PASSWORD = 'snsct@123';

  if (identifier === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    currentUser = {
      email: identifier,
      name: 'Admin User',
      id: 'ADMIN',
      role: 'admin'
    };
  } else if (identifier.endsWith(STAFF_DOMAIN) && password === STAFF_PASSWORD) {
    currentUser = {
      email: identifier,
      name: identifier.split('@')[0],
      id: 'STAFF',
      role: 'staff'
    };
  } else {
    // If neither match, show error
    showToast('Authentication Failed', 'Incorrect email or password. Please try again.', 'error');
    passwordInput.closest('.form-group').classList.add('invalid');
    return;
  }

  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
  updateAuthUI();
  showToast('Login Successful', `Welcome, ${currentUser.name}! Redirecting to dashboard.`, 'success');
  switchView('admin');
}

// ==========================================
// B. ADMIN DASHBOARD RENDERER
// ==========================================
async function renderAdminDashboard() {
  // Seed the club filter dropdown
  const existingClubs = new Set();
  adminClubFilter.innerHTML = '<option value="All">All Clubs</option>';
  clubsState.forEach(club => {
    if (!existingClubs.has(club.id)) {
      existingClubs.add(club.id);
      const opt = document.createElement('option');
      opt.value = club.id;
      opt.textContent = club.name;
      adminClubFilter.appendChild(opt);
    }
  });

  // Ensure empty state is hidden and table is visible while loading
  adminEmptyBookingsState.style.display = 'none';
  adminTableBody.closest('.table-responsive-wrapper').style.display = '';

  try {
    const res = await fetch('http://localhost:3000/api/bookings');
    if (!res.ok) throw new Error('Response not ok');
    bookingsState = await res.json();
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    showToast('Dashboard Error', 'Could not fetch bookings from server. Is the backend running?', 'error');
    bookingsState = [];
  }

  // Update top statistics using actual booking count
  const totalRegistrations = bookingsState.length;
  const totalSlotsFilled = totalRegistrations;
  const totalSlotsRemaining = clubsState.reduce((sum, c) => sum + c.slotsRemaining, 0);
  adminStatTotalRegistrations.textContent = totalRegistrations;
  adminStatTotalSlotsBooked.textContent = totalSlotsFilled;
  adminStatSlotsRemaining.textContent = totalSlotsRemaining;

  renderAdminTable();

  // Wire up search and filter listeners (only once)
  adminSearchInput.oninput = renderAdminTable;
  adminClubFilter.onchange = renderAdminTable;
  
  // Wire export buttons
  exportCsvBtn.onclick = exportToExcel;
  exportPdfBtn.onclick = exportToPDF;
}

function renderAdminTable() {
  const query = adminSearchInput.value.trim().toLowerCase();
  const clubFilter = adminClubFilter.value;

  const filtered = bookingsState.filter(b => {
    const matchClub = clubFilter === 'All' || b.clubId === clubFilter;
    const matchSearch = !query ||
      b.studentName.toLowerCase().includes(query) ||
      b.studentId.toLowerCase().includes(query) ||
      (b.studentEmail && b.studentEmail.toLowerCase().includes(query));
    return matchClub && matchSearch;
  });

  adminTableBody.innerHTML = '';

  if (filtered.length === 0) {
    adminEmptyBookingsState.style.display = 'flex';
    adminTableBody.closest('.table-responsive-wrapper').style.display = 'none';
    return;
  }

  adminEmptyBookingsState.style.display = 'none';
  adminTableBody.closest('.table-responsive-wrapper').style.display = '';

  const isStaff = currentUser && currentUser.role === 'staff';

  filtered.forEach(booking => {
    const club = clubsState.find(c => c.id === booking.clubId) || {
      name: booking.clubName || 'Unknown Club',
      category: 'General',
      accentColor: 'var(--accent-teal)',
      icon: '🎟️'
    };

    const deleteButtonHtml = isStaff ? '' : `
      <button class="btn-table-action btn-table-delete" title="Cancel Registration" data-booking-id="${escapeHtml(booking.bookingId)}">
        <i class="fa-solid fa-trash-can"></i>
      </button>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="student-cell-name">${escapeHtml(booking.studentName)}</div>
        <span class="student-cell-id">${escapeHtml(booking.studentId)}</span>
        <div class="student-cell-contact">
          <a href="mailto:${escapeHtml(booking.studentEmail)}">${escapeHtml(booking.studentEmail || '—')}</a>
          <span>${escapeHtml(booking.studentPhone || '—')}</span>
        </div>
      </td>
      <td>
        <span class="club-cell-name" style="color:${club.accentColor}">${club.icon} ${escapeHtml(club.name)}</span>
        <span class="club-cell-tag">${escapeHtml(club.category || '')}</span>
        <span class="club-cell-booking-id">${escapeHtml(booking.bookingId)}</span>
      </td>
      <td>
        <div class="academic-cell">
          <strong>${escapeHtml(booking.studentYear || '—')}</strong>
          <span>${escapeHtml(booking.studentBranch || '—')}</span>
        </div>
      </td>
      <td class="sop-cell">
        <div class="sop-cell-text">${escapeHtml(booking.sop || '—')}</div>
        ${booking.skills ? `<span class="sop-cell-skills"><strong>Skills:</strong> ${escapeHtml(booking.skills)}</span>` : ''}
      </td>
      <td class="booking-time-cell" style="white-space:nowrap;font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(booking.bookingTime || '—')}</td>
      <td class="attendance-cell">
        <input type="checkbox" class="attendance-checkbox" data-booking-id="${escapeHtml(booking.bookingId)}"${booking.attendance ? ' checked' : ''} ${isStaff ? 'disabled' : ''} />
      </td>
      <td class="actions-cell">
        <div class="action-btn-group">
          <button class="btn-table-action btn-table-view" title="View Ticket" data-booking-id="${escapeHtml(booking.bookingId)}">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${deleteButtonHtml}
        </div>
      </td>
    `;
    adminTableBody.appendChild(tr);
  });

  // Wire action buttons
  adminTableBody.querySelectorAll('.btn-table-view').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookingId = btn.getAttribute('data-booking-id');
      const booking = bookingsState.find(b => b.bookingId === bookingId);
      if (!booking) return;
      const club = clubsState.find(c => c.id === booking.clubId) || {
        name: booking.clubName, category: 'General',
        accentColor: 'var(--accent-teal)', icon: '🎟️'
      };
      renderTicket({
        name: booking.studentName, id: booking.studentId,
        branch: booking.studentBranch, year: booking.studentYear,
        email: booking.studentEmail, phone: booking.studentPhone
      }, club, booking.bookingId, booking.bookingTime);
      switchView('confirmation');
    });
  });

  if (!isStaff) {
    adminTableBody.querySelectorAll('.attendance-checkbox').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const bId = e.target.getAttribute('data-booking-id');
        const checked = e.target.checked;
        const b = bookingsState.find(x => x.bookingId === bId);
        if(b) { 
          b.attendance = checked; 
          try {
            await fetch(`http://localhost:3000/api/bookings/${bId}/attendance`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ attendance: checked })
            });
          } catch(err) {
            console.error('Failed to update attendance:', err);
          }
        }
      });
    });

    adminTableBody.querySelectorAll('.btn-table-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const bookingId = btn.getAttribute('data-booking-id');
        try {
          const res = await fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            showToast("Registration Cancelled", "Slot has been released.", "info");
            renderAdminDashboard(); // Refresh data
            initDatabase(); // Refresh clubs state to update slots
          }
        } catch(err) {
          console.error('Failed to delete booking:', err);
        }
      });
    });
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// C. EXPORT LOGIC (EXCEL & PDF)
// ==========================================
function getExportData() {
  const query = adminSearchInput.value.trim().toLowerCase();
  const clubFilter = adminClubFilter.value;

  const exportList = bookingsState.filter(b => {
    const matchClub = clubFilter === 'All' || b.clubId === clubFilter;
    const matchSearch = !query ||
      b.studentName.toLowerCase().includes(query) ||
      b.studentId.toLowerCase().includes(query) ||
      (b.studentEmail && b.studentEmail.toLowerCase().includes(query));
    return matchClub && matchSearch;
  });

  return exportList.map(b => {
    const clubName = clubsState.find(c => c.id === b.clubId)?.name || b.clubName;
    return {
      'Student Name': b.studentName,
      'Student ID': b.studentId,
      'Email': b.studentEmail,
      'Phone': b.studentPhone,
      'Club Name': clubName,
      'Slot ID': b.bookingId,
      'Year': b.studentYear,
      'Branch': b.studentBranch,
      'Booking Time': b.bookingTime,
      'Attendance': b.attendance ? 'Present' : 'Absent',
      'Purpose': b.sop || '',
      'Skills': b.skills || ''
    };
  });
}

function exportToExcel() {
  const data = getExportData();
  if(data.length === 0) {
    showToast("Export Failed", "No records to export.", "error");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
  XLSX.writeFile(workbook, "Student_Registrations.xlsx");
}

function exportToPDF() {
  const data = getExportData();
  if(data.length === 0) {
    showToast("Export Failed", "No records to export.", "error");
    return;
  }

  const doc = new jsPDF('landscape');
  doc.text("Student Registration Records", 14, 15);
  
  const tableData = data.map(row => [
    row['Student Name'],
    row['Student ID'],
    row['Club Name'],
    row['Slot ID'],
    row['Booking Time'],
    row['Attendance']
  ]);

  autoTable(doc, {
    startY: 20,
    head: [['Name', 'ID', 'Club', 'Slot ID', 'Booking Time', 'Attendance']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [255, 65, 108] }
  });

  doc.save("Student_Registrations.pdf");
}

// ==========================================
// C. EVENT LISTENERS (Auth & Admin)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Admin Portal login button
  navLoginBtn.addEventListener('click', () => switchView('login'));

  // Profile dropdown toggle
  userProfileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (profileDropdown &&
        !profileDropdown.contains(e.target) &&
        !userProfileTrigger.contains(e.target)) {
      profileDropdown.classList.remove('show');
    }
  });

  // Dropdown — Go to Admin Dashboard
  dropdownAdminDashboardBtn.addEventListener('click', () => {
    profileDropdown.classList.remove('show');
    switchView('admin');
  });

  // Dropdown — Logout
  dropdownLogoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem(USER_SESSION_KEY);
    updateAuthUI();
    showToast("Logged Out", "Admin session ended.", "info");
    switchView('overview');
  });

  // Admin Dashboard back button
  document.getElementById('admin-back-btn').addEventListener('click', () => switchView('overview'));

  // Login form submit
  loginForm.addEventListener('submit', handleLoginSubmit);
});

// ==========================================
// 10. APP STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initDatabase();
  renderOverviewGrid();

  // Set initial checkbox values matching global JS flags
  raceConditionCheckbox.checked = simulatedRaceCondition;
  latencyCheckbox.checked = simulatedLatency;
});



