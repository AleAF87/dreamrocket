import { auth, provider } from "./firebase-config.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

document.getElementById("googleLoginBtn").addEventListener("click", () => {
    signInWithPopup(auth, provider)
        .then(() => {
            window.location.href = "dashboard.html"; // redireciona após logar
        })
        .catch(err => {
            console.error("Erro no login:", err);
            alert("Falha ao fazer login!");
        });
});

// Função de Logout
function logoutUser() {
    firebase.auth().signOut()
        .then(() => {
            console.log("Usuário deslogado.");
            window.location.href = "index.html"; // volta para login
        })
        .catch((error) => {
            console.error("Erro ao deslogar:", error);
        });
}
