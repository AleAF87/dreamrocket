// IMPORTS DO FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// CONFIG DO FIREBASE
export const firebaseConfig = {
    apiKey: "AIzaSyAnch8gMY5On_A9Jt4VciOy9VemgEwzIx8",
    authDomain: "dream-rocket.firebaseapp.com",
    projectId: "dream-rocket",
    storageBucket: "dream-rocket.firebasestorage.app",
    messagingSenderId: "399548009812",
    appId: "1:399548009812:web:b5ca4473e995c0f408ccc1",
    measurementId: "G-7HV1L3JKWW"
};

// INICIALIZA O APP
const app = initializeApp(firebaseConfig);

// AUTH + PROVIDER
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// REALTIME DATABASE
export const db = getDatabase(app, "https://dream-rocket-default-rtdb.firebaseio.com/");
