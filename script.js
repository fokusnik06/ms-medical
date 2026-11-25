/* =========================================================
   MS MEDICAL — CORE SCRIPT
   (doctors data, access codes, auth, booking, catalog)
========================================================= */

const STORAGE = {
    users: "msMedicalUsers",
    session: "msMedicalUser",
    appointments: "msMedicalAppointments",
    pendingDoctor: "selectedDoctor"
};

/* ---------- helpers ---------- */

function readJSON(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null || value === undefined ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function pad(number) {
    return String(number).padStart(2, "0");
}

function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function getCurrentUser() {
    return readJSON(STORAGE.session, null);
}

function getUsers() {
    return readJSON(STORAGE.users, []);
}

function getAppointments() {
    return readJSON(STORAGE.appointments, []);
}

function saveAppointments(list) {
    writeJSON(STORAGE.appointments, list);
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("visible"), 10);
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
    }, 3800);
}


/* =========================================================
   55 DOCTORS + PERSONAL ACCESS CODES
========================================================= */

const doctorNames = [
    "Anna Wilson", "Michael Brown", "Sofia Miller", "Daniel Carter",
    "Emma Davis", "James Anderson", "Olivia Taylor", "Noah Thomas",
    "Amelia Moore", "Liam Jackson", "Isabella White", "Ethan Harris",
    "Mia Martin", "Lucas Thompson", "Charlotte Garcia", "Henry Martinez",
    "Ava Robinson", "Benjamin Clark", "Emily Rodriguez", "Alexander Lewis",
    "Grace Lee", "William Walker", "Chloe Hall", "Samuel Allen",
    "Lily Young", "Jack King", "Ella Wright", "Henry Scott",
    "Zoe Green", "Leo Baker", "Nora Adams", "Oliver Nelson",
    "Aria Hill", "Mateo Campbell", "Maya Mitchell", "Daniel Roberts",
    "Eva Carter", "Max Phillips", "Sofia Evans", "David Turner",
    "Julia Torres", "Ryan Parker", "Clara Collins", "Adrian Edwards",
    "Alice Stewart", "Thomas Sanchez", "Elena Morris", "Victor Rogers",
    "Natalie Reed", "Oscar Cook", "Laura Morgan", "Peter Bell",
    "Sarah Murphy", "Mark Bailey", "Diana Cooper"
];

const specialties = [
    "Cardiology", "Neurology", "Pediatrics", "Dermatology",
    "Orthopedics", "Gastroenterology", "Ophthalmology", "ENT",
    "Gynecology", "Urology", "Endocrinology", "General Practice",
    "Surgery", "Psychiatry"
];

/* Fixed code for every doctor, e.g. MS-01-XXXX.
   The same doctor always gets the same code. */
function makeDoctorCode(id, name) {
    let hash = 5381;
    const source = name + "|ms-medical|" + id;

    for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) + hash + source.charCodeAt(i)) >>> 0;
    }

    const tail = hash.toString(36).toUpperCase().padStart(4, "0").slice(-4);

    return "MS-" + pad(id) + "-" + tail;
}

const doctors = doctorNames.map((name, index) => ({
    id: index + 1,
    name: "Dr. " + name,
    specialty: specialties[index % specialties.length],
    experience: 5 + ((index * 3) % 16),
    image: "images/doctors/doctor-" + ((index % 6) + 1) + ".jpg",
    code: makeDoctorCode(index + 1, name)
}));

function findDoctorByName(name) {
    return doctors.find(doctor => doctor.name === name);
}


/* =========================================================
   INJECTED MODALS (same on every page)
========================================================= */

const AUTH_MODAL_HTML = `
<div class="modal" id="loginModal">
    <div class="modal-content auth-content">

        <button class="modal-close" onclick="closeLogin()" aria-label="Close">×</button>

        <div class="section-label">MS MEDICAL</div>

        <div id="rolePanel">
            <h2>Welcome to MS MEDICAL</h2>
            <p class="modal-description">Choose your account type</p>

            <div class="auth-role-buttons">
                <button type="button" class="modal-button" onclick="selectRole('patient')">I am a Patient</button>
                <button type="button" class="modal-button" onclick="selectRole('doctor')">I am a Doctor</button>
            </div>
        </div>

        <div id="authPanel" hidden>
            <h2 id="authTitle">Welcome back</h2>
            <p class="modal-description" id="authDescription"></p>

            <form id="authForm" onsubmit="handleAuth(event)">

                <div id="codeField" hidden>
                    <input id="authCode" type="text" placeholder="Doctor access code (MS-00-XXXX)"
                           autocomplete="off" oninput="previewDoctorCode()">
                    <p class="code-hint" id="codeHint"></p>
                </div>

                <div id="nameField" hidden>
                    <input id="authName" type="text" placeholder="Full name">
                </div>

                <div id="phoneField" hidden>
                    <input id="authPhone" type="tel" placeholder="Phone number">
                </div>

                <input id="authEmail" type="email" placeholder="Email address" required>
                <input id="authPassword" type="password" placeholder="Password (min. 8 characters)" minlength="8" required>

                <button type="submit" class="modal-button" id="authSubmit">Login</button>
            </form>

            <p class="register-text" id="authSwitchText"></p>

            <p class="register-text">
                <span onclick="backToRoles()">← Back to role selection</span>
            </p>
        </div>

        <p id="authMessage" class="auth-message" aria-live="polite"></p>

    </div>
</div>`;

const BOOKING_MODAL_HTML = `
<div class="modal" id="bookingModal">
    <div class="modal-content booking-content">

        <button class="modal-close" onclick="closeBooking()" aria-label="Close">×</button>

        <div class="section-label">BOOK AN APPOINTMENT</div>

        <h2 id="bookingDoctorName"></h2>
        <p class="modal-description" id="bookingDoctorSpecialty"></p>

        <form id="bookingForm" onsubmit="submitBooking(event)">

            <label class="field-label" for="bookingDate">Date (Mon – Fri)</label>
            <input type="date" id="bookingDate" required onchange="updateSlots()">

            <label class="field-label" for="bookingTime">Time</label>
            <select id="bookingTime" required></select>

            <label class="field-label" for="bookingReason">Reason for visit</label>
            <textarea id="bookingReason" rows="3" maxlength="300"
                      placeholder="Briefly describe your symptoms or the reason for the visit" required></textarea>

            <button type="submit" class="modal-button">Send request</button>
        </form>

        <p id="bookingMessage" class="auth-message" aria-live="polite"></p>

    </div>
</div>`;

function ensureModals() {
    /* replace any old login modal so every page uses the same one */
    const oldLogin = document.getElementById("loginModal");
    if (oldLogin) oldLogin.remove();

    document.body.insertAdjacentHTML(
        "beforeend",
        AUTH_MODAL_HTML + BOOKING_MODAL_HTML
    );
}


/* =========================================================
   AUTHENTICATION
========================================================= */

let currentRole = "";
let authMode = "login";
let pendingDoctorName = localStorage.getItem(STORAGE.pendingDoctor) || "";

function openLogin() {
    const user = getCurrentUser();

    /* already logged in: go where the person needs to be */
    if (user) {
        window.location.href =
            user.role === "doctor" ? "dashboard.html" : "doctor.html";
        return;
    }

    const modal = document.getElementById("loginModal");
    if (!modal) return;

    modal.classList.add("active");
    backToRoles();
}

function closeLogin() {
    const modal = document.getElementById("loginModal");
    if (modal) modal.classList.remove("active");
}

function selectRole(role) {
    currentRole = role;
    authMode = "login";

    document.getElementById("rolePanel").hidden = true;
    document.getElementById("authPanel").hidden = false;

    updateAuthForm();
}

function backToRoles() {
    currentRole = "";

    document.getElementById("rolePanel").hidden = false;
    document.getElementById("authPanel").hidden = true;

    showAuthMessage("");
}

function switchAuthMode() {
    authMode = authMode === "login" ? "register" : "login";
    updateAuthForm();
}

function updateAuthForm() {
    const isRegister = authMode === "register";
    const isDoctor = currentRole === "doctor";

    document.getElementById("authTitle").textContent =
        isRegister ? "Create an account" : "Welcome back";

    document.getElementById("authDescription").textContent =
        isDoctor
            ? (isRegister
                ? "Enter the personal access code issued by hospital administration."
                : "Doctor account")
            : "Patient account";

    /* doctor name & specialty come from the access code */
    document.getElementById("codeField").hidden = !(isRegister && isDoctor);
    document.getElementById("nameField").hidden = !(isRegister && !isDoctor);
    document.getElementById("phoneField").hidden = !isRegister;

    document.getElementById("authCode").required = isRegister && isDoctor;
    document.getElementById("authName").required = isRegister && !isDoctor;
    document.getElementById("authPhone").required = isRegister;

    document.getElementById("authSubmit").textContent =
        isRegister ? "Register" : "Login";

    document.getElementById("authSwitchText").innerHTML =
        isRegister
            ? 'Already have an account? <span onclick="switchAuthMode()">Login</span>'
            : 'Don\'t have an account? <span onclick="switchAuthMode()">Create account</span>';

    document.getElementById("codeHint").textContent = "";
    showAuthMessage("");
}

function showAuthMessage(message, isError = false) {
    const element = document.getElementById("authMessage");
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
}

function findDoctorByCode(rawCode) {
    const code = rawCode.trim().toUpperCase();
    return doctors.find(doctor => doctor.code === code);
}

/* live check while typing the code */
function previewDoctorCode() {
    const hint = document.getElementById("codeHint");
    const value = document.getElementById("authCode").value;

    hint.className = "code-hint";

    if (!value.trim()) {
        hint.textContent = "";
        return;
    }

    const doctor = findDoctorByCode(value);

    if (!doctor) {
        hint.textContent = "Code not recognised yet.";
        return;
    }

    const taken = getUsers().some(
        user => user.role === "doctor" && user.doctorId === doctor.id
    );

    if (taken) {
        hint.textContent = "This code is already registered.";
        hint.classList.add("bad");
        return;
    }

    hint.textContent = "✓ " + doctor.name + " — " + doctor.specialty;
    hint.classList.add("good");
}

async function hashPassword(password) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error("Please run the website using VS Code Live Server.");
    }

    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function handleAuth(event) {
    event.preventDefault();

    const name = document.getElementById("authName").value.trim();
    const phone = document.getElementById("authPhone").value.trim();
    const email = document.getElementById("authEmail").value.trim().toLowerCase();
    const password = document.getElementById("authPassword").value;
    const code = document.getElementById("authCode").value;

    const users = getUsers();

    const user = users.find(
        item => item.email === email && item.role === currentRole
    );

    try {
        const passwordHash = await hashPassword(password);

        /* ---------- REGISTER ---------- */

        if (authMode === "register") {

            if (user) {
                showAuthMessage("An account with this email already exists.", true);
                return;
            }

            let newUser;

            if (currentRole === "doctor") {
                const doctor = findDoctorByCode(code);

                if (!doctor) {
                    showAuthMessage("Invalid access code. Ask hospital administration for your code.", true);
                    return;
                }

                const taken = users.some(
                    item => item.role === "doctor" && item.doctorId === doctor.id
                );

                if (taken) {
                    showAuthMessage("This access code is already used by another account.", true);
                    return;
                }

                newUser = {
                    id: Date.now(),
                    doctorId: doctor.id,
                    name: doctor.name,
                    phone: phone,
                    email: email,
                    passwordHash: passwordHash,
                    role: "doctor",
                    specialty: doctor.specialty,
                    status: "approved"
                };
            } else {
                newUser = {
                    id: Date.now(),
                    name: name,
                    phone: phone,
                    email: email,
                    passwordHash: passwordHash,
                    role: "patient",
                    status: "active"
                };
            }

            users.push(newUser);
            writeJSON(STORAGE.users, users);

            showAuthMessage(
                currentRole === "doctor"
                    ? "Account created for " + newUser.name + ". You can log in now."
                    : "Registration successful! You can now log in."
            );

            authMode = "login";
            updateAuthForm();

            document.getElementById("authEmail").value = email;
            showAuthMessage(
                currentRole === "doctor"
                    ? "Account created for " + newUser.name + ". You can log in now."
                    : "Registration successful! You can now log in."
            );
            return;
        }

        /* ---------- LOGIN ---------- */

        if (!user || user.passwordHash !== passwordHash) {
            showAuthMessage("Incorrect email or password.", true);
            return;
        }

        if (user.role === "doctor" && user.status !== "approved") {
            showAuthMessage("Your doctor account is not active. Contact hospital administration.", true);
            return;
        }

        writeJSON(STORAGE.session, {
            id: user.id,
            doctorId: user.doctorId || null,
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            role: user.role,
            specialty: user.specialty || ""
        });

        closeLogin();
        updateNavbar();

        if (user.role === "doctor") {
            window.location.href = "dashboard.html";
            return;
        }

        showToast("Welcome, " + user.name + "!");

        /* continue the booking the patient started before logging in */
        if (pendingDoctorName) {
            const doctorName = pendingDoctorName;

            pendingDoctorName = "";
            localStorage.removeItem(STORAGE.pendingDoctor);

            bookDoctor(doctorName);
        }

    } catch (error) {
        showAuthMessage(error.message, true);
    }
}

function logout() {
    localStorage.removeItem(STORAGE.session);
    window.location.href = "index.html";
}

/* navbar button: Login / My cabinet / Log out */
function updateNavbar() {
    const button = document.querySelector(".login-nav");
    if (!button) return;

    const user = getCurrentUser();
    const onDashboard = /dashboard\.html$/.test(window.location.pathname);

    if (!user) {
        button.textContent = "Login";
        button.onclick = openLogin;
        return;
    }

    if (onDashboard) {
        button.textContent = "Log out";
        button.onclick = logout;
    } else {
        button.textContent = "My cabinet";
        button.onclick = () => { window.location.href = "dashboard.html"; };
    }
}


/* =========================================================
   BOOKING
========================================================= */

let bookingDoctor = null;

function buildSlots() {
    const slots = [];

    for (let hour = 9; hour < 17; hour++) {
        slots.push(pad(hour) + ":00");
        slots.push(pad(hour) + ":30");
    }

    return slots;
}

function bookDoctor(doctorName) {
    const doctor = findDoctorByName(doctorName);

    if (!doctor) {
        showToast("Doctor not found.");
        return;
    }

    const user = getCurrentUser();

    if (!user) {
        pendingDoctorName = doctorName;
        localStorage.setItem(STORAGE.pendingDoctor, doctorName);

        const modal = document.getElementById("loginModal");
        modal.classList.add("active");
        selectRole("patient");
        showAuthMessage("Log in or create a patient account to book " + doctorName + ".");
        return;
    }

    if (user.role !== "patient") {
        showToast("Only patient accounts can book appointments.");
        return;
    }

    openBooking(doctor);
}

function openBooking(doctor) {
    bookingDoctor = doctor;

    document.getElementById("bookingDoctorName").textContent = doctor.name;
    document.getElementById("bookingDoctorSpecialty").textContent =
        doctor.specialty + " · " + doctor.experience + " years of experience";

    const dateInput = document.getElementById("bookingDate");
    dateInput.min = todayISO();
    dateInput.value = "";

    document.getElementById("bookingReason").value = "";
    setBookingMessage("");
    updateSlots();

    document.getElementById("bookingModal").classList.add("active");
}

function closeBooking() {
    const modal = document.getElementById("bookingModal");
    if (modal) modal.classList.remove("active");
}

function setBookingMessage(message, isError = false) {
    const element = document.getElementById("bookingMessage");
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
}

function isSlotTaken(doctorId, date, time) {
    return getAppointments().some(
        item =>
            item.doctorId === doctorId &&
            item.date === date &&
            item.time === time &&
            (item.status === "pending" || item.status === "confirmed")
    );
}

function isWeekend(dateString) {
    const day = new Date(dateString + "T00:00:00").getDay();
    return day === 0 || day === 6;
}

function updateSlots() {
    const dateValue = document.getElementById("bookingDate").value;
    const timeSelect = document.getElementById("bookingTime");

    setBookingMessage("");

    if (!dateValue || !bookingDoctor) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">Choose a date first</option>';
        return;
    }

    if (isWeekend(dateValue)) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">The doctor works Mon – Fri</option>';
        return;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isToday = dateValue === todayISO();

    let html = '<option value="">Select a time</option>';
    let freeCount = 0;

    buildSlots().forEach(slot => {
        const [hour, minute] = slot.split(":").map(Number);

        if (isToday && hour * 60 + minute <= nowMinutes) return;

        const busy = isSlotTaken(bookingDoctor.id, dateValue, slot);
        if (!busy) freeCount++;

        html += '<option value="' + slot + '"' + (busy ? " disabled" : "") + ">" +
            slot + (busy ? " — booked" : "") + "</option>";
    });

    timeSelect.innerHTML = html;
    timeSelect.disabled = false;

    if (freeCount === 0) {
        setBookingMessage("No free times on this day. Please choose another date.", true);
    }
}

function submitBooking(event) {
    event.preventDefault();

    const user = getCurrentUser();

    if (!user || user.role !== "patient" || !bookingDoctor) {
        setBookingMessage("Please log in as a patient first.", true);
        return;
    }

    const date = document.getElementById("bookingDate").value;
    const time = document.getElementById("bookingTime").value;
    const reason = document.getElementById("bookingReason").value.trim();

    if (!date || !time || !reason) {
        setBookingMessage("Please fill in all fields.", true);
        return;
    }

    if (isWeekend(date)) {
        setBookingMessage("The doctor works Mon – Fri.", true);
        return;
    }

    if (date < todayISO()) {
        setBookingMessage("Please choose a future date.", true);
        return;
    }

    if (isSlotTaken(bookingDoctor.id, date, time)) {
        setBookingMessage("This time was just booked. Please choose another.", true);
        updateSlots();
        return;
    }

    const list = getAppointments();

    const patientBusy = list.some(
        item =>
            item.patientId === user.id &&
            item.date === date &&
            item.time === time &&
            (item.status === "pending" || item.status === "confirmed")
    );

    if (patientBusy) {
        setBookingMessage("You already have an appointment at this time.", true);
        return;
    }

    list.push({
        id: Date.now() + "-" + Math.floor(Math.random() * 1000),
        doctorId: bookingDoctor.id,
        doctorName: bookingDoctor.name,
        specialty: bookingDoctor.specialty,
        patientId: user.id,
        patientName: user.name,
        patientPhone: user.phone || "",
        patientEmail: user.email,
        date: date,
        time: time,
        reason: reason,
        status: "pending",
        createdAt: new Date().toISOString()
    });

    saveAppointments(list);

    const doctorName = bookingDoctor.name;

    closeBooking();
    showToast("Request sent to " + doctorName + ". Waiting for confirmation.");
}


/* =========================================================
   DOCTOR CATALOG
========================================================= */

let filteredDoctors = [...doctors];
let currentPage = 1;
const doctorsPerPage = 12;

function filterDoctors() {
    const search = document.getElementById("doctorSearch").value.toLowerCase().trim();
    const specialty = document.getElementById("specialtyFilter").value;

    filteredDoctors = doctors.filter(doctor => {
        const nameMatch = doctor.name.toLowerCase().includes(search);
        const specialtyMatch = specialty === "all" || doctor.specialty === specialty;

        return nameMatch && specialtyMatch;
    });

    currentPage = 1;
    renderDoctors();
}

function renderDoctors() {
    const grid = document.getElementById("doctorGrid");
    if (!grid) return;

    grid.innerHTML = "";

    const start = (currentPage - 1) * doctorsPerPage;
    const pageDoctors = filteredDoctors.slice(start, start + doctorsPerPage);

    if (pageDoctors.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <h3>No doctors found</h3>
                <p>Try changing your search or specialty.</p>
            </div>`;

        renderPagination();
        return;
    }

    pageDoctors.forEach(doctor => {
        const initials = doctor.name
            .replace("Dr. ", "")
            .split(" ")
            .map(word => word[0])
            .join("");

        const card = document.createElement("article");
        card.className = "catalog-card";

        card.innerHTML = `
            <div class="catalog-photo">
                <img src="${doctor.image}" alt="${doctor.name}"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="catalog-avatar" style="display:none">${initials}</div>
            </div>

            <div class="catalog-info">
                <div class="catalog-specialty">${doctor.specialty.toUpperCase()}</div>
                <h3>${doctor.name}</h3>
                <div class="catalog-experience">${doctor.experience} years of experience</div>

                <div class="catalog-actions">
                    <button class="profile-button" onclick="openDoctorProfile(${doctor.id})">View Profile</button>
                    <button class="book-button" onclick="bookDoctor('${doctor.name}')">Book</button>
                </div>
            </div>`;

        grid.appendChild(card);
    });

    renderPagination();
}

function renderPagination() {
    const pagination = document.getElementById("pagination");
    if (!pagination) return;

    pagination.innerHTML = "";

    const totalPages = Math.ceil(filteredDoctors.length / doctorsPerPage);
    if (totalPages <= 1) return;

    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement("button");

        button.className = "page-btn";
        if (page === currentPage) button.classList.add("active");

        button.textContent = page;

        button.onclick = function () {
            currentPage = page;
            renderDoctors();
            window.scrollTo({ top: 300, behavior: "smooth" });
        };

        pagination.appendChild(button);
    }
}


/* =========================================================
   DOCTOR PROFILE MODAL
========================================================= */

let selectedDoctor = null;

function openDoctorProfile(id) {
    selectedDoctor = doctors.find(doctor => doctor.id === id);
    if (!selectedDoctor) return;

    document.getElementById("profileName").textContent = selectedDoctor.name;
    document.getElementById("profileSpecialty").textContent = selectedDoctor.specialty;
    document.getElementById("profileExperience").textContent = selectedDoctor.experience + " years";
    document.getElementById("profileDepartment").textContent = selectedDoctor.specialty;

    document.getElementById("profilePhoto").innerHTML = `
        <img src="${selectedDoctor.image}" alt="${selectedDoctor.name}"
             onerror="this.style.display='none'; this.parentElement.innerHTML='<strong>MS</strong>';">`;

    document.getElementById("profileModal").classList.add("active");
}

function closeDoctorProfile() {
    const modal = document.getElementById("profileModal");
    if (modal) modal.classList.remove("active");
}

function bookSelectedDoctor() {
    if (!selectedDoctor) return;

    closeDoctorProfile();
    bookDoctor(selectedDoctor.name);
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    ensureModals();
    updateNavbar();

    if (document.getElementById("doctorGrid")) {
        renderDoctors();
    }
});

window.addEventListener("click", function (event) {
    ["loginModal", "bookingModal"].forEach(id => {
        const modal = document.getElementById(id);

        if (modal && event.target === modal) {
            modal.classList.remove("active");
        }
    });

    const profileModal = document.getElementById("profileModal");

    if (profileModal && event.target === profileModal) {
        closeDoctorProfile();
    }
});


/* =========================================================
   CABINET (doctor + patient)
========================================================= */


let doctorFilter = "pending";

const STATUS_LABELS = {
    pending: "Awaiting confirmation",
    confirmed: "Confirmed",
    declined: "Declined",
    completed: "Completed",
    cancelled: "Cancelled"
};

document.addEventListener("DOMContentLoaded", renderDashboard);

/* another tab changed the data (e.g. a patient just booked) */
window.addEventListener("storage", function (event) {
    if (event.key === STORAGE.appointments || event.key === STORAGE.session) {
        renderDashboard();
    }
});

function formatDate(dateString) {
    return new Date(dateString + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function sortByDateTime(list) {
    return [...list].sort((a, b) =>
        (a.date + a.time).localeCompare(b.date + b.time)
    );
}

function statusBadge(status) {
    return '<span class="status-badge status-' + status + '">' +
        STATUS_LABELS[status] + "</span>";
}

function renderDashboard() {
    const root = document.getElementById("dashboardRoot");
    if (!root) return;

    const user = getCurrentUser();

    if (!user) {
        root.innerHTML = `
            <div class="dash-empty">
                <h2>Please log in</h2>
                <p>Log in to see your cabinet.</p>
                <button class="modal-button dash-login" onclick="openLogin()">Log in</button>
            </div>`;
        return;
    }

    if (user.role === "doctor") {
        renderDoctorView(root, user);
    } else {
        renderPatientView(root, user);
    }
}


/* =========================================================
   DOCTOR VIEW
========================================================= */

function renderDoctorView(root, user) {
    const all = sortByDateTime(
        getAppointments().filter(item => item.doctorId === user.doctorId)
    );

    const groups = {
        pending: all.filter(a => a.status === "pending"),
        confirmed: all.filter(a => a.status === "confirmed"),
        history: all.filter(a =>
            ["completed", "declined", "cancelled"].includes(a.status)
        ),
        all: all
    };

    const today = todayISO();
    const todayCount = groups.confirmed.filter(a => a.date === today).length;

    const list = groups[doctorFilter] || groups.all;

    const tabs = [
        ["pending", "New requests"],
        ["confirmed", "Confirmed"],
        ["history", "History"],
        ["all", "All"]
    ].map(([key, label]) =>
        '<button class="dash-tab' + (doctorFilter === key ? " active" : "") +
        '" onclick="setDoctorFilter(\'' + key + '\')">' + label +
        ' <span>' + groups[key].length + "</span></button>"
    ).join("");

    const cards = list.length
        ? list.map(doctorCard).join("")
        : '<div class="dash-empty small"><p>No appointments in this list yet.</p></div>';

    root.innerHTML = `
        <div class="dash-head">
            <div>
                <div class="section-label">DOCTOR CABINET</div>
                <h1>${escapeHtml(user.name)}</h1>
                <p>${escapeHtml(user.specialty)}</p>
            </div>
        </div>

        <div class="dash-stats">
            <div><strong>${groups.pending.length}</strong><span>New requests</span></div>
            <div><strong>${todayCount}</strong><span>Confirmed today</span></div>
            <div><strong>${groups.confirmed.length}</strong><span>Upcoming confirmed</span></div>
            <div><strong>${all.length}</strong><span>Total appointments</span></div>
        </div>

        <div class="dash-tabs">${tabs}</div>

        <div class="appt-list">${cards}</div>`;
}

function setDoctorFilter(filter) {
    doctorFilter = filter;
    renderDashboard();
}

function doctorCard(appt) {
    let actions = "";

    if (appt.status === "pending") {
        actions = `
            <button class="appt-btn primary" onclick="setAppointmentStatus('${appt.id}', 'confirmed')">Confirm</button>
            <button class="appt-btn danger" onclick="setAppointmentStatus('${appt.id}', 'declined')">Decline</button>`;
    } else if (appt.status === "confirmed") {
        actions = `
            <button class="appt-btn primary" onclick="setAppointmentStatus('${appt.id}', 'completed')">Mark as completed</button>
            <button class="appt-btn danger" onclick="setAppointmentStatus('${appt.id}', 'cancelled')">Cancel</button>`;
    }

    return `
        <article class="appt-card">
            <div class="appt-when">
                <strong>${appt.time}</strong>
                <span>${formatDate(appt.date)}</span>
            </div>

            <div class="appt-main">
                <h3>${escapeHtml(appt.patientName)}</h3>
                <p class="appt-contact">
                    ${appt.patientPhone ? escapeHtml(appt.patientPhone) + " · " : ""}${escapeHtml(appt.patientEmail)}
                </p>
                <p class="appt-reason">${escapeHtml(appt.reason)}</p>
            </div>

            <div class="appt-side">
                ${statusBadge(appt.status)}
                <div class="appt-actions">${actions}</div>
            </div>
        </article>`;
}

function setAppointmentStatus(id, status) {
    const user = getCurrentUser();
    if (!user) return;

    const list = getAppointments();
    const appt = list.find(item => item.id === id);

    if (!appt) return;

    /* a doctor can change only their own appointments,
       a patient can only cancel their own */
    const isOwnerDoctor = user.role === "doctor" && appt.doctorId === user.doctorId;
    const isOwnerPatient =
        user.role === "patient" && appt.patientId === user.id && status === "cancelled";

    if (!isOwnerDoctor && !isOwnerPatient) return;

    appt.status = status;
    saveAppointments(list);

    renderDashboard();
}


/* =========================================================
   PATIENT VIEW
========================================================= */

function renderPatientView(root, user) {
    const mine = sortByDateTime(
        getAppointments().filter(item => item.patientId === user.id)
    );

    const cards = mine.length
        ? mine.map(patientCard).join("")
        : `<div class="dash-empty small">
               <p>You have no appointments yet.</p>
               <a href="doctor.html" class="btn-primary">Find a doctor</a>
           </div>`;

    root.innerHTML = `
        <div class="dash-head">
            <div>
                <div class="section-label">PATIENT CABINET</div>
                <h1>${escapeHtml(user.name)}</h1>
                <p>${escapeHtml(user.email)}</p>
            </div>
            <a href="doctor.html" class="btn-primary">Book a new appointment</a>
        </div>

        <h2 class="dash-subtitle">My appointments</h2>

        <div class="appt-list">${cards}</div>`;
}

function patientCard(appt) {
    const canCancel = appt.status === "pending" || appt.status === "confirmed";

    return `
        <article class="appt-card">
            <div class="appt-when">
                <strong>${appt.time}</strong>
                <span>${formatDate(appt.date)}</span>
            </div>

            <div class="appt-main">
                <h3>${escapeHtml(appt.doctorName)}</h3>
                <p class="appt-contact">${escapeHtml(appt.specialty)}</p>
                <p class="appt-reason">${escapeHtml(appt.reason)}</p>
            </div>

            <div class="appt-side">
                ${statusBadge(appt.status)}
                <div class="appt-actions">
                    ${canCancel
                        ? `<button class="appt-btn danger" onclick="setAppointmentStatus('${appt.id}', 'cancelled')">Cancel</button>`
                        : ""}
                </div>
            </div>
        </article>`;
}