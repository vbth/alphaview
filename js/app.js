/**
 * AlphaView Main Controller
 */
import { initTheme, toggleTheme } from './theme.js';

// DOM Elements
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('i');

// Helper: Update Theme Icon based on current mode
function updateThemeIcon(mode) {
    if (mode === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('AlphaView booting up...');

    // 1. Theme Initialisierung
    const currentTheme = initTheme();
    updateThemeIcon(currentTheme);

    // 2. Event Listeners
    themeBtn.addEventListener('click', () => {
        const newTheme = toggleTheme();
        updateThemeIcon(newTheme);
    });

    // TODO: Load Dashboard (Schritt 2)
    setTimeout(() => {
        // Simulieren, dass die App bereit ist (Lade-Indikator entfernen wir später)
        console.log('System ready.');
    }, 500);
});