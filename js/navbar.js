import { logoutCurrentUser } from "./auth-check.js";

function updateUserInfo() {
    const userName = sessionStorage.getItem("userName") || localStorage.getItem("userName") || "Usuario";
    const userEmail = sessionStorage.getItem("userEmail") || localStorage.getItem("userEmail") || "";

    const userNameElement = document.getElementById("userName");
    const userEmailElement = document.getElementById("userEmail");
    const avatarContainer = document.getElementById("avatarContainer");
    const userGreetingDropdown = document.getElementById("userGreetingDropdown");

    if (userNameElement) {
        userNameElement.textContent = userName;
    }

    if (userEmailElement) {
        userEmailElement.textContent = userEmail;
    }

    if (avatarContainer) {
        const initial = (userName || userEmail || "U").charAt(0).toUpperCase();
        avatarContainer.innerHTML = `<div class="avatar-initial">${initial}</div>`;
    }

    if (userGreetingDropdown) {
        userGreetingDropdown.title = userEmail || userName;
    }
}

function setupDropdown() {
    const dropdownWrapper = document.getElementById("userInfo");
    const dropdownToggle = document.getElementById("userGreetingDropdown");
    const logoutLink = document.getElementById("navLogout");
    const contasCasaWrapper = document.getElementById("navContasCasa");
    const contasCasaToggle = document.getElementById("navContasCasaToggle");

    if (!dropdownWrapper || !dropdownToggle) {
        return;
    }

    if (dropdownToggle.dataset.bound !== "true") {
        dropdownToggle.dataset.bound = "true";
        dropdownToggle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropdownWrapper.classList.toggle("open");
        });
    }

    if (logoutLink && logoutLink.dataset.bound !== "true") {
        logoutLink.dataset.bound = "true";
        logoutLink.addEventListener("click", async (event) => {
            event.preventDefault();
            logoutLink.textContent = "Saindo...";
            await logoutCurrentUser();
        });
    }

    if (contasCasaWrapper && contasCasaToggle && contasCasaToggle.dataset.bound !== "true") {
        contasCasaToggle.dataset.bound = "true";
        contasCasaToggle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            contasCasaWrapper.classList.toggle("open");
        });
    }

    if (!document.body.dataset.userDropdownBound) {
        document.body.dataset.userDropdownBound = "true";
        document.addEventListener("click", (event) => {
            const activeDropdown = document.getElementById("userInfo");
            const contasCasaDropdown = document.getElementById("navContasCasa");
            if (!activeDropdown) {
                return;
            }

            if (!activeDropdown.contains(event.target)) {
                activeDropdown.classList.remove("open");
            }

            if (contasCasaDropdown && !contasCasaDropdown.contains(event.target)) {
                contasCasaDropdown.classList.remove("open");
            }
        });
    }
}

function setupAvatarShortcut() {
    const avatarContainer = document.getElementById("avatarContainer");
    const dropdownToggle = document.getElementById("userGreetingDropdown");

    if (!avatarContainer || !dropdownToggle || avatarContainer.dataset.bound === "true") {
        return;
    }

    avatarContainer.dataset.bound = "true";
    avatarContainer.style.cursor = "pointer";
    avatarContainer.title = "Abrir menu";
    avatarContainer.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropdownToggle.click();
    });
}

function updateNavbarActiveMenu(pageUrl = "dashboard.html") {
    document.querySelectorAll(".nav-center a").forEach((link) => {
        const isActive = link.getAttribute("href") === pageUrl;
        link.classList.toggle("active", isActive);
    });

    document.querySelectorAll(".nav-dropdown-menu a").forEach((link) => {
        const isActive = link.getAttribute("href") === pageUrl;
        link.classList.toggle("active", isActive);
    });

    const contasCasaLinks = ["contas_casa_saida.html", "contas_casa_entrada.html"];
    const contasCasaWrapper = document.getElementById("navContasCasa");
    if (contasCasaWrapper) {
        contasCasaWrapper.classList.toggle("active", contasCasaLinks.includes(pageUrl));
    }
}

function hideRestrictedNavbarItems() {
    const userLevel = Number(sessionStorage.getItem("currentUserLevel") || localStorage.getItem("currentUserLevel") || 1);

    document.querySelectorAll("[data-required-level]").forEach((element) => {
        const requiredLevel = Number(element.getAttribute("data-required-level") || 1);
        element.style.display = userLevel > requiredLevel ? "none" : "";
    });
}

export default function initNavbar() {
    updateUserInfo();
    setupDropdown();
    setupAvatarShortcut();
    updateNavbarActiveMenu(sessionStorage.getItem("dreamrocket:last-spa-page") || "dashboard.html");
    hideRestrictedNavbarItems();
}

window.updateNavbarActiveMenu = updateNavbarActiveMenu;
