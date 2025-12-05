// Verifica usuário logado
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        // se não estiver logado, manda pra página de login
        window.location.href = "index.html";
    }
});
