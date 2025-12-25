/**
 * AlphaView Main Controller
 * Step 4: Dashboard Logic & Search
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol, removeSymbol } from './store.js';
import { renderAppSkeleton, createStockCardHTML, renderSearchResults } from './ui.js';

// Global State
const state = {
    searchDebounce: null
};

// DOM Elements
const rootEl = document.getElementById('app-root');
const themeBtn = document.getElementById('theme-toggle');

// Helper
function updateThemeIcon(mode) {
    const icon = themeBtn.querySelector('i');
    if (mode === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

/**
 * Lädt alle Daten für die Watchlist und rendert das Grid
 */
async function loadDashboard() {
    const watchlist = getWatchlist();
    const gridEl = document.getElementById('dashboard-grid');
    const emptyStateEl = document.getElementById('empty-state');

    if (watchlist.length === 0) {
        gridEl.innerHTML = '';
        emptyStateEl.classList.remove('hidden');
        return;
    }

    emptyStateEl.classList.add('hidden');
    // Zeige Lade-Skelette oder behalte aktuellen Inhalt bei Refresh
    if(!gridEl.hasChildNodes()) {
        gridEl.innerHTML = '<div class="col-span-full text-center text-slate-400 py-8">Lade Kurse...</div>';
    }

    // Parallel Fetching für Performance
    const promises = watchlist.map(async (symbol) => {
        try {
            const rawData = await fetchChartData(symbol);
            if (!rawData) return null;
            return analyze(rawData);
        } catch (e) {
            console.error(`Error loading ${symbol}`, e);
            return null;
        }
    });

    const results = await Promise.all(promises);
    
    // Grid rendern
    gridEl.innerHTML = results
        .filter(r => r !== null) // Fehlerhafte rausfiltern
        .map(data => createStockCardHTML(data))
        .join('');

    // Event Listener für Delete Buttons hinzufügen
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Damit man nicht auf die Karte klickt
            const sym = e.currentTarget.dataset.symbol;
            if(confirm(`${sym} von Watchlist entfernen?`)) {
                removeSymbol(sym);
                loadDashboard(); // Refresh
            }
        });
    });

    // Event Listener für Karten-Klick (Vorbreitung für Chart View)
    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Ignorieren wenn wir auf Delete geklickt haben
            if(e.target.closest('.delete-btn')) return;
            const sym = e.currentTarget.dataset.symbol;
            alert(`Detail View für ${sym} kommt in Schritt 5!`);
        });
    });
}

/**
 * Handle Search Input
 */
function initSearch() {
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const spinner = document.getElementById('search-spinner');

    // Close results on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-input') && !e.target.closest('#search-results')) {
            resultsContainer.classList.add('hidden');
        }
    });

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        clearTimeout(state.searchDebounce);
        
        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        spinner.classList.remove('hidden');

        // Debounce API Calls (warten bis user fertig tippt)
        state.searchDebounce = setTimeout(async () => {
            const results = await searchSymbol(query);
            spinner.classList.add('hidden');
            renderSearchResults(results, resultsContainer);

            // Add Click Handlers to Results
            document.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', () => {
                    const symbol = item.dataset.symbol;
                    addSymbol(symbol); // In Store speichern
                    input.value = ''; // Reset Input
                    resultsContainer.classList.add('hidden'); // Hide Dropdown
                    loadDashboard(); // Grid neu laden
                });
            });
        }, 500); // 500ms warten
    });
}

// APP START
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init Theme
    const currentTheme = initTheme();
    updateThemeIcon(currentTheme);
    themeBtn.addEventListener('click', () => {
        updateThemeIcon(toggleTheme());
    });

    // 2. Render Basic UI
    renderAppSkeleton(rootEl);

    // 3. Init Logic
    initSearch();
    
    // 4. Initial Load (falls AAPL noch drin ist)
    loadDashboard();
});