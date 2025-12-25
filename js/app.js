/**
 * AlphaView Main Controller
 * Step 6: Interactive Time Ranges
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol, removeSymbol } from './store.js';
import { renderAppSkeleton, createStockCardHTML, renderSearchResults } from './ui.js';
import { renderChart } from './charts.js';

// Global State
const state = {
    searchDebounce: null,
    currentSymbol: null, // Für Modal State
    currentRange: '1y'   // Default Range
};

// DOM Elements
const rootEl = document.getElementById('app-root');
const themeBtn = document.getElementById('theme-toggle');

// Modal Elements
const modal = document.getElementById('chart-modal');
const modalSymbol = document.getElementById('modal-symbol');
const closeModalBtns = [document.getElementById('close-modal'), document.getElementById('close-modal-btn')];
const rangeBtns = document.querySelectorAll('.chart-range-btn');

// --- MODAL & CHART LOGIC ---

function openModal(symbol) {
    if(!modal) return;
    state.currentSymbol = symbol;
    state.currentRange = '1y'; // Reset auf Default beim Öffnen
    
    modalSymbol.textContent = symbol;
    modal.classList.remove('hidden');
    
    // Buttons resetten (1Y aktiv setzen)
    updateRangeButtonsUI('1y');

    // Chart laden
    loadChartForModal(symbol, '1y');
}

function closeModal() {
    if(modal) modal.classList.add('hidden');
    state.currentSymbol = null;
}

// UI Helfer für Buttons
function updateRangeButtonsUI(activeRange) {
    rangeBtns.forEach(btn => {
        const range = btn.dataset.range;
        // Styles zurücksetzen
        btn.classList.remove('bg-white', 'dark:bg-slate-600', 'text-primary', 'dark:text-white', 'shadow-sm');
        btn.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-white');
        
        // Active Style setzen
        if(range === activeRange) {
            btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-white');
            btn.classList.add('bg-white', 'dark:bg-slate-600', 'text-primary', 'dark:text-white', 'shadow-sm');
        }
    });
}

async function loadChartForModal(symbol, range) {
    const canvasId = 'main-chart';
    
    // Kleiner visueller Indikator, dass geladen wird (Opazität)
    const canvas = document.getElementById(canvasId);
    if(canvas) canvas.style.opacity = '0.5';

    try {
        // Interval Logik: Bei 1M/6M nehmen wir 1d, bei 5Y/MAX nehmen wir 1wk oder 1mo für Speed
        let interval = '1d';
        if (range === '5y' || range === 'max') interval = '1wk';

        const rawData = await fetchChartData(symbol, range, interval);
        
        if(rawData) {
            renderChart(canvasId, rawData);
        }
    } catch (e) {
        console.error("Chart load failed", e);
    } finally {
        if(canvas) canvas.style.opacity = '1';
    }
}

// Event Listener für Range Buttons
rangeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if(!state.currentSymbol) return;
        const range = btn.dataset.range;
        
        state.currentRange = range;
        updateRangeButtonsUI(range);
        loadChartForModal(state.currentSymbol, range);
    });
});


// --- CORE LOGIC (Watchlist & Search) ---

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

    if (!gridEl) return;

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
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sym = e.currentTarget.dataset.symbol;
            if(confirm(`${sym} entfernen?`)) {
                removeSymbol(sym);
                loadDashboard();
            }
        });
    });

    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', (e) => {
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
    // Theme
    const currentTheme = initTheme();
    updateThemeIcon(currentTheme);
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            updateThemeIcon(toggleTheme());
        });
    }

    // UI
    renderAppSkeleton(rootEl);
    
    // Modal Events
    closeModalBtns.forEach(btn => btn?.addEventListener('click', closeModal));
    if(modal) {
        modal.addEventListener('click', (e) => {
            if(e.target === modal) closeModal();
        });
    }

    // Init
    initSearch();
    loadDashboard();
});