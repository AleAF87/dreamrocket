import { auth, database } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { get, ref, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

function redirectToLogin() {
    window.location.href = "index.html";
}

function clearUserData() {
    sessionStorage.removeItem("userKey");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userEmail");
    sessionStorage.removeItem("currentUserLevel");
    localStorage.removeItem("userKey");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
}

function getStoredUserKey(user) {
    return sessionStorage.getItem("userKey")
        || localStorage.getItem("userKey")
        || user?.uid
        || "";
}

function saveUserSession(userKey, userData) {
    sessionStorage.setItem("userKey", userKey);
    sessionStorage.setItem("userName", userData.nome || "Usuario");
    sessionStorage.setItem("userEmail", userData.email || "");
    sessionStorage.setItem("currentUserLevel", String(userData.nivel || 1));

    localStorage.setItem("userKey", userKey);
    localStorage.setItem("userName", userData.nome || "Usuario");
    localStorage.setItem("userEmail", userData.email || "");
}

async function syncUserAccess(user) {
    const userKey = getStoredUserKey(user);
    if (!userKey) {
        throw new Error("Chave do usuario nao encontrada.");
    }

    const loginRef = ref(database, `login/${userKey}`);
    const usuarioRef = ref(database, `usuarios/${userKey}`);

    const [loginSnapshot, usuarioSnapshot] = await Promise.all([
        get(loginRef),
        get(usuarioRef)
    ]);

    const loginData = loginSnapshot.exists() ? (loginSnapshot.val() || {}) : {};
    const usuarioData = usuarioSnapshot.exists() ? (usuarioSnapshot.val() || {}) : {};

    const userData = {
        chave: userKey,
        uid: user.uid,
        nome: usuarioData.nome || loginData.nome || user.displayName || "Usuario",
        email: usuarioData.email || loginData.email || user.email || "",
        foto: usuarioData.foto || loginData.foto || user.photoURL || "",
        status: String(loginData.status || usuarioData.status || "ativo").trim().toLowerCase(),
        nivel: Number(usuarioData.nivel || 1)
    };

    if (userData.status !== "ativo") {
        throw new Error(`Cadastro com status ${userData.status}`);
    }

    await update(ref(database), {
        [`login/${userKey}/ultimoAcesso`]: serverTimestamp(),
        [`usuarios/${userKey}/ultimoAcesso`]: serverTimestamp()
    });

    saveUserSession(userKey, userData);

    return { user, userData, userKey };
}

export function checkAuth(requiredLevel = 1) {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();

            if (!user) {
                clearUserData();
                redirectToLogin();
                reject(new Error("Usuario nao autenticado"));
                return;
            }

            try {
                const access = await syncUserAccess(user);

                if (Number(access.userData.nivel || 1) > Number(requiredLevel)) {
                    throw new Error(`Nivel insuficiente: ${access.userData.nivel} > ${requiredLevel}`);
                }

                resolve(access);
            } catch (error) {
                console.error("Erro ao verificar acesso:", error);
                clearUserData();
                redirectToLogin();
                reject(error);
            }
        });
    });
}

export async function loadNavbar() {
    const navbarContainer = document.getElementById("navbar");
    if (!navbarContainer) {
        return false;
    }

    if (navbarContainer.innerHTML.trim()) {
        return true;
    }

    try {
        const response = await fetch("components/navbar.html");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        navbarContainer.innerHTML = await response.text();

        const navbarModule = await import("./navbar.js");
        if (navbarModule?.default) {
            navbarModule.default();
        }

        return true;
    } catch (error) {
        console.error("Erro ao carregar navbar:", error);
        return false;
    }
}

export async function logoutCurrentUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao sair:", error);
    }

    clearUserData();
    redirectToLogin();
}
