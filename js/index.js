import { auth, database, provider } from "./firebase-config.js";
import { onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { get, ref, serverTimestamp, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

function setPageReady() {
    document.body.classList.remove("auth-pending");
}

function getUserKey(user) {
    return user?.uid || "";
}

function saveUserSession(userKey, userData) {
    const level = Number(userData?.nivel || 1);

    sessionStorage.setItem("userKey", userKey);
    sessionStorage.setItem("userName", userData?.nome || "Usuario");
    sessionStorage.setItem("userEmail", userData?.email || "");
    sessionStorage.setItem("currentUserLevel", String(level));

    localStorage.setItem("userKey", userKey);
    localStorage.setItem("userName", userData?.nome || "Usuario");
    localStorage.setItem("userEmail", userData?.email || "");
}

async function syncUserStructure(user) {
    const userKey = getUserKey(user);
    if (!userKey) {
        throw new Error("Usuario invalido para autenticacao.");
    }

    const loginRef = ref(database, `login/${userKey}`);
    const usuarioRef = ref(database, `usuarios/${userKey}`);

    const [loginSnapshot, usuarioSnapshot] = await Promise.all([
        get(loginRef),
        get(usuarioRef)
    ]);

    const loginData = loginSnapshot.exists() ? (loginSnapshot.val() || {}) : {};
    const usuarioData = usuarioSnapshot.exists() ? (usuarioSnapshot.val() || {}) : {};

    const mergedData = {
        chave: userKey,
        nome: usuarioData.nome || loginData.nome || user.displayName || "Usuario",
        email: usuarioData.email || loginData.email || user.email || "",
        foto: usuarioData.foto || loginData.foto || user.photoURL || "",
        status: String(loginData.status || usuarioData.status || "ativo").trim().toLowerCase(),
        nivel: Number(usuarioData.nivel || 1)
    };

    const updates = {};
    updates[`login/${userKey}`] = {
        chave: userKey,
        nome: mergedData.nome,
        email: mergedData.email,
        foto: mergedData.foto,
        status: mergedData.status,
        ultimoAcesso: serverTimestamp()
    };
    updates[`usuarios/${userKey}`] = {
        chave: userKey,
        uid: user.uid,
        nome: mergedData.nome,
        email: mergedData.email,
        foto: mergedData.foto,
        nivel: mergedData.nivel,
        status: mergedData.status,
        ultimoAcesso: serverTimestamp()
    };

    await update(ref(database), updates);
    saveUserSession(userKey, mergedData);

    return { userKey, userData: mergedData };
}

async function loginWithGoogle() {
    const googleLoginBtn = document.getElementById("googleLoginBtn");

    try {
        if (googleLoginBtn) {
            googleLoginBtn.disabled = true;
            googleLoginBtn.textContent = "Entrando...";
        }

        const result = await signInWithPopup(auth, provider);
        const { userData } = await syncUserStructure(result.user);

        if (userData.status !== "ativo") {
            throw new Error("Seu cadastro nao esta ativo.");
        }

        window.location.href = "app.html";
    } catch (error) {
        console.error("Erro no login:", error);
        alert(error.message || "Falha ao fazer login.");
        setPageReady();
    } finally {
        if (googleLoginBtn) {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = `
                <svg class="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
            `;
        }
    }
}

export function redirectIfAuthenticated(targetPage = "app.html") {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();

            if (!user) {
                setPageReady();
                resolve(null);
                return;
            }

            try {
                await syncUserStructure(user);
                window.location.replace(targetPage);
            } catch (error) {
                console.error("Erro ao sincronizar sessao:", error);
                setPageReady();
            }

            resolve(user);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", loginWithGoogle);
    }

    redirectIfAuthenticated();
});
