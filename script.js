/* =========================================================
   MS MEDICAL
========================================================= */


/* =========================================================
   MS MEDICAL — AUTHENTICATION
========================================================= */

let currentRole = "";
let authMode = "login";

let pendingDoctorName =
    localStorage.getItem("selectedDoctor") || "";


/* OPEN / CLOSE MODAL */

function openLogin() {
    const modal = document.getElementById("loginModal");

    if (!modal) return;

    modal.classList.add("active");
    backToRoles();
}

function closeLogin() {
    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.classList.remove("active");
    }
}


/* ROLE SELECTION */

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


/* LOGIN / REGISTER SWITCH */

function switchAuthMode() {
    authMode = authMode === "login" ? "register" : "login";
    updateAuthForm();
}


/* UPDATE FORM */

function updateAuthForm() {
    const isRegister = authMode === "register";
    const isDoctor = currentRole === "doctor";

    document.getElementById("authTitle").textContent =
        isRegister ? "Create an account" : "Welcome back";

    document.getElementById("authDescription").textContent =
        isDoctor
            ? "Doctor account"
            : "Patient account";

    document.getElementById("nameField").hidden = !isRegister;
    document.getElementById("phoneField").hidden = !isRegister;

    document.getElementById("specialtyField").hidden =
        !(isRegister && isDoctor);

    document.getElementById("authName").required = isRegister;
    document.getElementById("authPhone").required = isRegister;

    document.getElementById("authSpecialty").required =
        isRegister && isDoctor;

    document.getElementById("authSubmit").textContent =
        isRegister ? "Register" : "Login";

    document.getElementById("authSwitchText").innerHTML =
        isRegister
            ? 'Already have an account? <span onclick="switchAuthMode()">Login</span>'
            : 'Don\'t have an account? <span onclick="switchAuthMode()">Create account</span>';

    showAuthMessage("");
}


/* MESSAGE */

function showAuthMessage(message, isError = false) {
    const element = document.getElementById("authMessage");

    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
}


/* PASSWORD HASH FOR THIS FRONTEND DEMO */

async function hashPassword(password) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error(
            "Please run the website using VS Code Live Server."
        );
    }

    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}


/* HANDLE FORM */

async function handleAuth(event) {
    event.preventDefault();

    const name =
        document.getElementById("authName").value.trim();

    const phone =
        document.getElementById("authPhone").value.trim();

    const email =
        document.getElementById("authEmail").value.trim().toLowerCase();

    const password =
        document.getElementById("authPassword").value;

    const specialty =
        document.getElementById("authSpecialty").value.trim();

    const users = JSON.parse(
        localStorage.getItem("msMedicalUsers") || "[]"
    );

    const user = users.find(
        item =>
            item.email === email &&
            item.role === currentRole
    );

    try {
        const passwordHash = await hashPassword(password);

        if (authMode === "register") {

            if (user) {
                showAuthMessage(
                    "An account with this email already exists.",
                    true
                );
                return;
            }

            const newUser = {
                id: Date.now(),
                name: name,
                phone: phone,
                email: email,
                passwordHash: passwordHash,
                role: currentRole,
                specialty: currentRole === "doctor" ? specialty : "",
                status: currentRole === "doctor"
                    ? "pending"
                    : "active"
            };

            users.push(newUser);

            localStorage.setItem(
                "msMedicalUsers",
                JSON.stringify(users)
            );

            if (currentRole === "doctor") {
                showAuthMessage(
                    "Your application has been submitted. Please wait for hospital administration approval."
                );
                return;
            }

            showAuthMessage(
                "Registration successful! You can now log in."
            );

            authMode = "login";
            updateAuthForm();

            document.getElementById("authEmail").value = email;
            return;
        }

        /* LOGIN */

        if (!user || user.passwordHash !== passwordHash) {
            showAuthMessage(
                "Incorrect email or password.",
                true
            );
            return;
        }

        if (
            user.role === "doctor" &&
            user.status !== "approved"
        ) {
            showAuthMessage(
                "Your doctor account is waiting for approval."
            );
            return;
        }

        localStorage.setItem(
            "msMedicalUser",
            JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            })
        );

        closeLogin();

        alert("Welcome to MS MEDICAL, " + user.name + "!");

        /* Continue the booking after patient login */

        if (
            user.role === "patient" &&
            pendingDoctorName
        ) {
            const doctorName = pendingDoctorName;

            pendingDoctorName = "";

            localStorage.removeItem("selectedDoctor");

            bookDoctor(doctorName);
        }

    } catch (error) {
        showAuthMessage(error.message, true);
    }
}


/* LOGOUT */

function logout() {
    localStorage.removeItem("msMedicalUser");
    alert("You have logged out.");
}


/* BOOKING */

function bookDoctor(doctorName) {
    const currentUser = JSON.parse(
        localStorage.getItem("msMedicalUser") || "null"
    );

    if (!currentUser) {
        pendingDoctorName = doctorName;

        localStorage.setItem(
            "selectedDoctor",
            doctorName
        );

        openLogin();
        return;
    }

    if (currentUser.role !== "patient") {
        alert("Only patient accounts can book appointments.");
        return;
    }

    alert(
        "Appointment booking for " +
        doctorName +
        " will open here."
    );
}


/* =========================================================
   55 DEMO DOCTORS
========================================================= */

const doctorNames = [

    "Anna Wilson",
    "Michael Brown",
    "Sofia Miller",
    "Daniel Carter",
    "Emma Davis",
    "James Anderson",
    "Olivia Taylor",
    "Noah Thomas",
    "Amelia Moore",
    "Liam Jackson",
    "Isabella White",
    "Ethan Harris",
    "Mia Martin",
    "Lucas Thompson",
    "Charlotte Garcia",
    "Henry Martinez",
    "Ava Robinson",
    "Benjamin Clark",
    "Emily Rodriguez",
    "Alexander Lewis",
    "Grace Lee",
    "William Walker",
    "Chloe Hall",
    "Samuel Allen",
    "Lily Young",
    "Jack King",
    "Ella Wright",
    "Henry Scott",
    "Zoe Green",
    "Leo Baker",
    "Nora Adams",
    "Oliver Nelson",
    "Aria Hill",
    "Mateo Campbell",
    "Maya Mitchell",
    "Daniel Roberts",
    "Eva Carter",
    "Max Phillips",
    "Sofia Evans",
    "David Turner",
    "Julia Torres",
    "Ryan Parker",
    "Clara Collins",
    "Adrian Edwards",
    "Alice Stewart",
    "Thomas Sanchez",
    "Elena Morris",
    "Victor Rogers",
    "Natalie Reed",
    "Oscar Cook",
    "Laura Morgan",
    "Peter Bell",
    "Sarah Murphy",
    "Mark Bailey",
    "Diana Cooper"

];


const specialties = [

    "Cardiology",
    "Neurology",
    "Pediatrics",
    "Dermatology",
    "Orthopedics",
    "Gastroenterology",
    "Ophthalmology",
    "ENT",
    "Gynecology",
    "Urology",
    "Endocrinology",
    "General Practice",
    "Surgery",
    "Psychiatry"

];


const doctors = doctorNames.map(
    (name, index) => {

        return {

            id: index + 1,

            name: "Dr. " + name,

            specialty:
                specialties[
                    index % specialties.length
                ],

            experience:
                5 + ((index * 3) % 16),

            image:
                "images/doctors/doctor-" +
                ((index % 6) + 1) +
                ".jpg"

        };

    }
);


/* ================= CATALOG ================= */

let filteredDoctors = [...doctors];

let currentPage = 1;

const doctorsPerPage = 12;


document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (
            document.getElementById("doctorGrid")
        ) {

            renderDoctors();

        }

    }
);


/* ================= FILTER ================= */

function filterDoctors() {

    const search =
        document
            .getElementById("doctorSearch")
            .value
            .toLowerCase()
            .trim();


    const specialty =
        document
            .getElementById("specialtyFilter")
            .value;


    filteredDoctors =
        doctors.filter(
            doctor => {

                const nameMatch =
                    doctor.name
                        .toLowerCase()
                        .includes(search);


                const specialtyMatch =
                    specialty === "all" ||
                    doctor.specialty === specialty;


                return (
                    nameMatch &&
                    specialtyMatch
                );

            }
        );


    currentPage = 1;

    renderDoctors();

}


/* ================= RENDER ================= */

function renderDoctors() {

    const grid =
        document.getElementById(
            "doctorGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = "";


    const start =
        (currentPage - 1) *
        doctorsPerPage;


    const end =
        start +
        doctorsPerPage;


    const pageDoctors =
        filteredDoctors.slice(
            start,
            end
        );


    if (
        pageDoctors.length === 0
    ) {

        grid.innerHTML = `

            <div class="no-results">

                <h3>
                    No doctors found
                </h3>

                <p>
                    Try changing your search or specialty.
                </p>

            </div>

        `;

        renderPagination();

        return;

    }


    pageDoctors.forEach(
        doctor => {

            const initials =
                doctor.name
                    .replace("Dr. ", "")
                    .split(" ")
                    .map(
                        word => word[0]
                    )
                    .join("");


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "catalog-card";


            card.innerHTML = `

                <div class="catalog-photo">

                    <img
                        src="${doctor.image}"
                        alt="${doctor.name}"
                        onerror="
                            this.style.display='none';
                            this.nextElementSibling.style.display='flex';
                        "
                    >

                    <div
                        class="catalog-avatar"
                        style="display:none"
                    >
                        ${initials}
                    </div>

                </div>


                <div class="catalog-info">

                    <div class="catalog-specialty">
                        ${doctor.specialty.toUpperCase()}
                    </div>

                    <h3>
                        ${doctor.name}
                    </h3>

                    <div class="catalog-experience">
                        ${doctor.experience}
                        years of experience
                    </div>


                    <div class="catalog-actions">

                        <button
                            class="profile-button"
                            onclick="openDoctorProfile(${doctor.id})"
                        >
                            View Profile
                        </button>

                        <button
                            class="book-button"
                            onclick="bookDoctor('${doctor.name}')"
                        >
                            Book
                        </button>

                    </div>

                </div>

            `;


            grid.appendChild(card);

        }
    );


    renderPagination();

}


/* ================= PAGINATION ================= */

function renderPagination() {

    const pagination =
        document.getElementById(
            "pagination"
        );


    if (!pagination) {
        return;
    }


    pagination.innerHTML = "";


    const totalPages =
        Math.ceil(
            filteredDoctors.length /
            doctorsPerPage
        );


    if (totalPages <= 1) {
        return;
    }


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "page-btn";


        if (
            page === currentPage
        ) {

            button.classList.add(
                "active"
            );

        }


        button.textContent =
            page;


        button.onclick =
            function () {

                currentPage = page;

                renderDoctors();

                window.scrollTo({
                    top: 300,
                    behavior: "smooth"
                });

            };


        pagination.appendChild(
            button
        );

    }

}


/* =========================================================
   DOCTOR PROFILE
========================================================= */

let selectedDoctor = null;


function openDoctorProfile(id) {

    selectedDoctor =
        doctors.find(
            doctor =>
                doctor.id === id
        );


    if (!selectedDoctor) {
        return;
    }


    document.getElementById(
        "profileName"
    ).textContent =
        selectedDoctor.name;


    document.getElementById(
        "profileSpecialty"
    ).textContent =
        selectedDoctor.specialty;


    document.getElementById(
        "profileExperience"
    ).textContent =
        selectedDoctor.experience +
        " years";


    document.getElementById(
        "profileDepartment"
    ).textContent =
        selectedDoctor.specialty;


    const photo =
        document.getElementById(
            "profilePhoto"
        );


    photo.innerHTML = `

        <img
            src="${selectedDoctor.image}"
            alt="${selectedDoctor.name}"
            onerror="
                this.style.display='none';
                this.parentElement.innerHTML='<strong>MS</strong>';
            "
        >

    `;


    document
        .getElementById("profileModal")
        .classList.add("active");

}


function closeDoctorProfile() {

    const modal =
        document.getElementById(
            "profileModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


function bookSelectedDoctor() {

    if (!selectedDoctor) {
        return;
    }


    closeDoctorProfile();


    bookDoctor(
        selectedDoctor.name
    );

}


/* ================= MODAL CLICK ================= */

window.addEventListener(
    "click",
    function (event) {

        const loginModal =
            document.getElementById(
                "loginModal"
            );


        const profileModal =
            document.getElementById(
                "profileModal"
            );


        if (
            event.target === loginModal
        ) {

            closeLogin();

        }


        if (
            event.target === profileModal
        ) {

            closeDoctorProfile();

        }

    }
);
