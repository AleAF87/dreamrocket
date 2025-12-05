import { auth, provider } from "./firebase-config.js";
import { signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Login com Google
document.getElementById("googleLoginBtn")?.addEventListener("click", () => {
    signInWithPopup(auth, provider)
        .then(() => {
            window.location.href = "dashboard.html";
        })
        .catch(err => {
            console.error("Erro no login:", err);
            alert("Falha ao fazer login!");
        });
});

// Função de proteção de página (nova!)
export function protectPage() {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "index.html";
        }
    });
}