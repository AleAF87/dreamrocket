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

function saveUserSession(userKey, userData) {
    sessionStorage.setItem("userKey", userKey);
    sessionStorage.setItem("userName", userData.nome || "Usuário");
    sessionStorage.setItem("userEmail", userData.email || "");
    sessionStorage.setItem("currentUserLevel", String(userData.nivel || 1));

    localStorage.setItem("userKey", userKey);
    localStorage.setItem("userName", userData.nome || "Usuário");
    localStorage.setItem("userEmail", userData.email || "");
}

export async function syncUserAccess(user, requiredLevel = 1) {
    const userKey = user?.uid || "";
    if (!userKey) {
        throw new Error("Chave do usuário não encontrada.");
    }

    const loginRef = ref(database, `login/${userKey}`);
    const usuarioRef = ref(database, `usuarios/${userKey}`);

    const [loginSnapshot, usuarioSnapshot] = await Promise.all([
        get(loginRef),
        get(usuarioRef)
    ]);

    if (!loginSnapshot.exists() || !usuarioSnapshot.exists()) {
        throw new Error("Acesso não autorizado. Novos cadastros estão bloqueados.");
    }

    const loginData = loginSnapshot.val() || {};
    const usuarioData = usuarioSnapshot.val() || {};

    const userData = {
        chave: userKey,
        uid: user.uid,
        nome: usuarioData.nome || loginData.nome || user.displayName || "Usuário",
        email: usuarioData.email || loginData.email || user.email || "",
        foto: usuarioData.foto || loginData.foto || user.photoURL || "",
        status: String(loginData.status || usuarioData.status || "").trim().toLowerCase(),
        nivel: Number(usuarioData.nivel || 1)
    };

    if (userData.status !== "ativo") {
        throw new Error("Seu cadastro não está ativo.");
    }

    if (!Number.isFinite(userData.nivel) || userData.nivel < 1 || userData.nivel > Number(requiredLevel)) {
        throw new Error("Seu cadastro não tem permissão para acessar o sistema.");
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
                reject(new Error("Usuário não autenticado"));
                return;
            }

            try {
                const access = await syncUserAccess(user, requiredLevel);

                resolve(access);
            } catch (error) {
                console.error("Erro ao verificar acesso:", error);
                await endUserSession();
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

export async function endUserSession() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao sair:", error);
    }

    clearUserData();
}

export async function logoutCurrentUser() {
    await endUserSession();
    redirectToLogin();
}
