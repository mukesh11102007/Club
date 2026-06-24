import { CLUBS_DATA } from './data/clubs.js';

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

// ==========================================
// 2. MOCK DATABASE (LOCALSTORAGE)
// ==========================================
function initDatabase() {
  const localData = localStorage.getItem(DB_KEY);
  if (localData) {
    clubsState = JSON.parse(localData);
    // Sync any missing clubs from CLUBS_DATA (safety check)
    CLUBS_DATA.forEach(club => {
      if (!clubsState.find(c => c.id === club.id)) {
        clubsState.push({
          ...club,
          slotsRemaining: Math.floor(Math.random() * 45) + 15 // Start with realistic random slots remaining
        });
      }
    });
  } else {
    // First run initialization with realistic capacities
    clubsState = CLUBS_DATA.map(club => {
      // Set random starting capacities (e.g. 45/80 slots remaining)
      let initialSlots = MAX_SLOTS;
      if (club.id === 'rotaract') initialSlots = 45; // Exactly match user's prompt example
      else if (club.id === 'robotics') initialSlots = 1; // Great for concurrency testing
      else if (club.id === 'toast-masters') initialSlots = 0; // Starts full to demonstrate "Club Full" state
      else {
        initialSlots = Math.floor(Math.random() * 55) + 10; // Between 10 and 65 slots left
      }

      return {
        ...club,
        slotsRemaining: initialSlots,
        weeklyUpdate: '' // Placeholder for weekly update text
      };
    });
    saveDatabase();
  }

// Initialize Users Database (no pre-seeded accounts)
const usersLocalData = localStorage.getItem(USERS_DB_KEY);
if (usersLocalData) {
  usersState = JSON.parse(usersLocalData);
} else {
  usersState = []; // empty list for future registrations
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(usersState));
}

  // Initialize Bookings Database
  const bookingsLocalData = localStorage.getItem(BOOKINGS_DB_KEY);
  if (bookingsLocalData) {
    bookingsState = JSON.parse(bookingsLocalData);
  } else {
    bookingsState = [];
    localStorage.setItem(BOOKINGS_DB_KEY, JSON.stringify(bookingsState));
  }

  // Initialize User Session
  const sessionUserEmail = localStorage.getItem(USER_SESSION_KEY);
  if (sessionUserEmail) {
    const foundUser = usersState.find(u => u.email.toLowerCase() === sessionUserEmail.toLowerCase());
    if (foundUser) {
      currentUser = foundUser;
      updateAuthUI();
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

function executeTransaction(details) {
  // Hide loader
  fullPageLoader.style.display = 'none';

  // Read current real-time database state (simulated atomic fetch)
  const clubIndex = clubsState.findIndex(c => c.id === selectedClubId);
  if (clubIndex === -1) {
    showToast("System Error", "The selected club could not be located in database registries.", "error");
    return;
  }

  const club = clubsState[clubIndex];

  // 1. CONCURRENCY EXCEPTION CHECK
  // Trigger conflict if user enabled race simulation OR if slots ran out in the interim
  if (simulatedRaceCondition || club.slotsRemaining <= 0) {
    // Dynamic error handling for race condition
    showToast(
      "Booking Conflict (Error 409)",
      `Slot Conflict Detected: Another transaction reserved the last slot for ${club.name} simultaneously. Your booking request was cancelled.`,
      "error"
    );

    // Set slot to 0 to simulate real-time out-of-sync update
    club.slotsRemaining = 0;
    saveDatabase();
    renderOverviewGrid();
    updateBookingPageView(selectedClubId);
    return;
  }

  // Check if student has already booked a slot in this club
  if (currentUser) {
    const alreadyBooked = bookingsState.some(
      b => b.clubId === selectedClubId && b.studentEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (alreadyBooked) {
      showToast("Duplicate Booking", `You have already registered for a membership slot in ${club.name}.`, "error");
      switchView('overview');
      return;
    }
  }

  // 2. SUCCESS TRANSACTION COMMITTAL
  // Decrement slot
  club.slotsRemaining -= 1;
  saveDatabase();
  renderOverviewGrid();

  // Generate confirmation ticket parameters
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const code = club.name.slice(0, 3).toUpperCase();
  const bookingId = `CS-${code}-${randNum}-${MAX_SLOTS - club.slotsRemaining}`;
  const now = new Date();
  const bookingTimeString = now.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) + ', ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Save booking details to bookingsState
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

  bookingsState.push(newBooking);
  localStorage.setItem(BOOKINGS_DB_KEY, JSON.stringify(bookingsState));

  renderTicket(details, club, bookingId, bookingTimeString);
  switchView('confirmation');
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
  
  // Admin login: accept any email with the designated domain and a fixed password
  const ADMIN_DOMAIN = '@snsct.org';
  const ADMIN_PASSWORD = 'snsct@123';
  if (identifier.endsWith(ADMIN_DOMAIN) && password === ADMIN_PASSWORD) {
    // Create minimal admin user object
    currentUser = {
      email: identifier,
      name: identifier.split('@')[0],
      id: 'ADMIN',
      role: 'admin'
    };
    localStorage.setItem(USER_SESSION_KEY, currentUser.email);
    updateAuthUI();
    showToast('Admin Login Successful', `Welcome, ${currentUser.name}! Redirecting to dashboard.`, 'success');
    switchView('admin');
    return;
  }
  // If not matching admin criteria, show error
  showToast('Authentication Failed', 'Incorrect admin email or password. Please try again.', 'error');
  passwordInput.closest('.form-group').classList.add('invalid');
}

// ==========================================
// B. ADMIN DASHBOARD RENDERER
// ==========================================
function renderAdminDashboard() {
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

  // Update top statistics
  const totalSlotsFilled = clubsState.reduce((sum, c) => sum + (MAX_SLOTS - c.slotsRemaining), 0);
  const totalSlotsRemaining = clubsState.reduce((sum, c) => sum + c.slotsRemaining, 0);
  adminStatTotalRegistrations.textContent = bookingsState.length;
  adminStatTotalSlotsBooked.textContent = totalSlotsFilled;
  adminStatSlotsRemaining.textContent = totalSlotsRemaining;

  renderAdminTable();

  // Wire up search and filter listeners (only once)
  adminSearchInput.oninput = renderAdminTable;
  adminClubFilter.onchange = renderAdminTable;
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

  filtered.forEach(booking => {
    const club = clubsState.find(c => c.id === booking.clubId) || {
      name: booking.clubName || 'Unknown Club',
      category: 'General',
      accentColor: 'var(--accent-teal)',
      icon: '🎟️'
    };

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
      <td class="attendance-cell">
        <input type="checkbox" class="attendance-checkbox" data-booking-id="${escapeHtml(booking.bookingId)}"${booking.attendance ? ' checked' : ''} />
      </td>
      <td class="actions-cell">
        <div class="action-btn-group">
          <button class="btn-table-action btn-table-view" title="View Ticket" data-booking-id="${escapeHtml(booking.bookingId)}">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn-table-action btn-table-delete" title="Cancel Registration" data-booking-id="${escapeHtml(booking.bookingId)}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
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

  adminTableBody.querySelectorAll('.attendance-checkbox').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const bId = e.target.getAttribute('data-booking-id');
      const b = bookingsState.find(x => x.bookingId === bId);
      if(b) { b.attendance = e.target.checked; localStorage.setItem(BOOKINGS_DB_KEY, JSON.stringify(bookingsState)); }
    });
  });

  adminTableBody.querySelectorAll('.btn-table-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookingId = btn.getAttribute('data-booking-id');
      const idx = bookingsState.findIndex(b => b.bookingId === bookingId);
      if (idx === -1) return;

      const booking = bookingsState[idx];
      // Restore the slot count
      const clubIdx = clubsState.findIndex(c => c.id === booking.clubId);
      if (clubIdx !== -1 && clubsState[clubIdx].slotsRemaining < MAX_SLOTS) {
        clubsState[clubIdx].slotsRemaining += 1;
        saveDatabase();
        renderOverviewGrid();
      }
      bookingsState.splice(idx, 1);
      localStorage.setItem(BOOKINGS_DB_KEY, JSON.stringify(bookingsState));

      showToast("Registration Cancelled",
        `Slot for ${booking.studentName} in ${booking.clubName} has been released.`, "info");
      renderAdminDashboard();
    });
  });
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



