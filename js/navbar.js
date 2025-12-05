import { auth } from './firebase-config.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

export default function initNavbar() {
    // Monitorar estado de autenticação
    onAuthStateChanged(auth, (user) => {
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        
        if (user) {
            // Usuário está logado
            if (authButtons) authButtons.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'block';
                updateUserInfo(user);
            }
        } else {
            // Usuário não está logado
            if (authButtons) authButtons.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
        }
    });
    
    // Configurar logout
    setupLogoutButton();
}

function updateUserInfo(user) {
    // Nome do usuário
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.displayName || 'Usuário';
    }
    
    // Email do usuário
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement) {
        userEmailElement.textContent = user.email || '';
    }
    
    // Avatar - SIMPLIFICADO
    const avatarContainer = document.getElementById('avatarContainer');
    if (avatarContainer) {
        avatarContainer.innerHTML = ''; // Limpa qualquer conteúdo anterior
        
        if (user.photoURL) {
            // Usuário tem imagem de perfil
            const img = document.createElement('img');
            img.src = user.photoURL;
            img.alt = user.displayName || 'Avatar do usuário';
            img.className = 'user-avatar';
            img.style.cssText = 'width: 40px; height: 40px; border-radius: 50%; object-fit: cover;';
            avatarContainer.appendChild(img);
        } else {
            // Usuário não tem imagem - mostrar inicial
            const initialDiv = document.createElement('div');
            
            // Obter inicial do nome ou email
            let initial = '?';
            if (user.displayName) {
                initial = user.displayName.charAt(0).toUpperCase();
            } else if (user.email) {
                initial = user.email.charAt(0).toUpperCase();
            }
            
            initialDiv.textContent = initial;
            initialDiv.className = 'avatar-initial';
            initialDiv.style.cssText = `
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: #0a192f;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 18px;
            `;
            
            avatarContainer.appendChild(initialDiv);
        }
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Logout failed:', err);
            alert('Falha ao deslogar. Veja console.');
        }
    });
    
    // Configurar logout também pelo avatar (se clicar no avatar)
    const avatarContainer = document.getElementById('avatarContainer');
    if (avatarContainer) {
        avatarContainer.addEventListener('click', () => {
            logoutBtn.click(); // Aciona o mesmo evento do botão Sair
        });
        avatarContainer.style.cursor = 'pointer';
        avatarContainer.title = 'Clique para sair';
    }
}

// Função global para login (opcional - se precisar do botão no navbar)
window.loginGoogle = async function() {
    try {
        // Importação dinâmica para evitar erros de importação circular
        const { provider } = await import('./firebase-config.js');
        const { signInWithPopup } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');
        
        await signInWithPopup(auth, provider);
        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error('Erro no login:', err);
        alert('Falha ao fazer login!');
    }
}