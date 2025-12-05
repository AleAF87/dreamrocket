import { auth } from '/js/firebase-config.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

export default function initNavbar() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = '/index.html';
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Falha ao deslogar. Veja console.');
    }
  });
}
