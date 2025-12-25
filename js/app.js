/**
 * AlphaView Main Controller
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { getWatchlist, addSymbol } from './store.js';

// DOM Elements
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('i');
const rootEl = document.getElementById('app-root');

// Helper: Update Theme Icon
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('AlphaView booting up...');

    // 1. Theme
    const currentTheme = initTheme();
    updateThemeIcon(currentTheme);

    themeBtn.addEventListener('click', () => {
        const newTheme = toggleTheme();
        updateThemeIcon(newTheme);
    });

    // 2. Integration Test (Temporär)
    // Wir prüfen, ob wir Daten für Apple bekommen
    console.log('Starting API Connection Test...');
    
    // Test: Portfolio initialisieren wenn leer
    const watchlist = getWatchlist();
    if (watchlist.length === 0) {
        console.log('Watchlist empty, adding AAPL for demo.');
        addSymbol('AAPL');
    }

    // Test: Datenabruf
    const demoSymbol = 'AAPL';
    const data = await fetchChartData(demoSymbol);

    if (data) {
        const price = data.meta.regularMarketPrice;
        const currency = data.meta.currency;
        const msg = `API Success: ${demoSymbol} is trading at ${price} ${currency}`;
        console.log(msg);
        
        // Temporäres Feedback im UI
        rootEl.innerHTML = `
            <div class="bg-green-100 dark:bg-green-900 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">System Online!</strong>
                <span class="block sm:inline">${msg}</span>
            </div>
            <div class="mt-4 text-slate-500 text-sm">
                Check Console (F12) for data object details.
            </div>
        `;
    } else {
        rootEl.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Connection Error!</strong>
                <span class="block sm:inline">Could not fetch data via CORS Proxy.</span>
            </div>
        `;
    }
});