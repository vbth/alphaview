/**
 * AlphaView Main Controller
 * Step 5: Full App with Charts
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol, removeSymbol } from './store.js';
import { renderAppSkeleton, createStockCardHTML, renderSearchResults } from './ui.js';
import { renderChart } from './charts.js';

// Global State
const state = {
    searchDebounce: null
};

// DOM Elements
const rootEl = document.getElementById('app-root');
const themeBtn = document.getElementById('theme-toggle');

// Modal Elements
const modal = document.getElementById('chart-modal');
const modalSymbol = document.getElementById('modal-symbol');
const closeModalBtns = [document.getElementById('close-modal'), document.getElementById('close-modal-btn')];

// --- MODAL LOGIC ---
function openModal(symbol) {
    if(!modal) return;
    modalSymbol.textContent = symbol;
    modal.classList.remove('hidden');
    
    // Chart laden
    loadChartForModal(symbol);
}

function closeModal() {
    if(modal) modal.classList.add('hidden');
}

async function loadChartForModal(symbol) {
    const canvasId = 'main-chart';
    try {
        // Daten holen (1 Jahr)
        const rawData = await fetchChartData(symbol, '1y', '1d');
        if(rawData) {
            renderChart(canvasId, rawData);
        }
    } catch (e) {
        console.error("Chart load failed", e);
    }
}

// --- CORE LOGIC ---

function updateThemeIcon(mode) {
    const icon = themeBtn.querySelector('i');
    if(!icon) return;
    if (mode === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

async function loadDashboard() {
    const watchlist = getWatchlist();
    const gridEl = document.getElementById('dashboard-grid');
    const emptyStateEl = document.getElementById('empty-state');

    if (!gridEl) return; // Sicherheitscheck

    if (watchlist.length === 0) {
        gridEl.innerHTML = '';
        if(emptyStateEl) emptyStateEl.classList.remove('hidden');
        return;
    }

    if(emptyStateEl) emptyStateEl.classList.add('hidden');
    
    if(!gridEl.hasChildNodes()) {
        gridEl.innerHTML = '<div class="col-span-full text-center text-slate-400 py-8 animate-pulse">Lade Kurse...</div>';
    }

    const promises = watchlist.map(async (symbol) => {
        try {
            const rawData = await fetchChartData(symbol, '1y', '1d');
            if (!rawData) return null;
            return analyze(rawData);
        } catch (e) {
            console.error(e);
            return null;
        }
    });

    const results = await Promise.all(promises);
    
    gridEl.innerHTML = results
        .filter(r => r !== null)
        .map(data => createStockCardHTML(data))
        .join('');

    attachDashboardEvents();
}

function attachDashboardEvents() {
    // Delete Events
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stoppt Klick zum Modal
            const sym = e.currentTarget.dataset.symbol;
            if(confirm(`${sym} entfernen?`)) {
                removeSymbol(sym);
                loadDashboard();
            }
        });
    });

    // Card Click Events (Open Modal)
    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Wenn wir den Delete-Button getroffen haben, abbrechen
            if(e.target.closest('.delete-btn')) return;
            
            const sym = e.currentTarget.dataset.symbol;
            openModal(sym);
        });
    });
}

function initSearch() {
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const spinner = document.getElementById('search-spinner');

    if(!input) return;

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

        state.searchDebounce = setTimeout(async () => {
            const results = await searchSymbol(query);
            spinner.classList.add('hidden');
            renderSearchResults(results, resultsContainer);

            document.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', () => {
                    const symbol = item.dataset.symbol;
                    addSymbol(symbol);
                    input.value = '';
                    resultsContainer.classList.add('hidden');
                    loadDashboard();
                });
            });
        }, 500);
    });
}

// APP START
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App v5 init');
    
    // Theme
    const currentTheme = initTheme();
    updateThemeIcon(currentTheme);
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            updateThemeIcon(toggleTheme());
        });
    }

    // UI Structure
    renderAppSkeleton(rootEl);