/**
 * AlphaView Main Controller
 * Step 7: Final Polish (German/Metadata)
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol, removeSymbol } from './store.js';
import { renderAppSkeleton, createStockCardHTML, renderSearchResults } from './ui.js';
import { renderChart } from './charts.js';

const state = {
    searchDebounce: null,
    currentSymbol: null,
    currentRange: '1y'
};

const rootEl = document.getElementById('app-root');
const themeBtn = document.getElementById('theme-toggle');

const modal = document.getElementById('chart-modal');
const modalFullname = document.getElementById('modal-fullname');
const modalSymbol = document.getElementById('modal-symbol');
const modalExchange = document.getElementById('modal-exchange');
const modalType = document.getElementById('modal-type');
const closeModalBtns = [document.getElementById('close-modal'), document.getElementById('close-modal-btn')];
const rangeBtns = document.querySelectorAll('.chart-range-btn');

// --- MODAL LOGIC ---

async function openModal(symbol) {
    if(!modal) return;
    state.currentSymbol = symbol;
    state.currentRange = '1y'; // Default ist 1 Jahr (Button "1J")
    
    // Reset UI Texts
    modalFullname.textContent = 'Lade Daten...';
    modalSymbol.textContent = symbol;
    modalExchange.textContent = '...';
    modalType.textContent = '...';
    
    modal.classList.remove('hidden');
    updateRangeButtonsUI('1y');

    // Chart & Metadata laden
    await loadChartForModal(symbol, '1y');
}

function closeModal() {
    if(modal) modal.classList.add('hidden');
    state.currentSymbol = null;
}

function updateRangeButtonsUI(activeRange) {
    // Map internal API range back to button range for highlighting
    // e.g. if we clicked '5y' (mapped to 3J), we want to highlight 3J button if that was the click source
    // Simple way: check data-range attribute
    rangeBtns.forEach(btn => {
        const range = btn.dataset.range;
        
        btn.classList.remove('bg-white', 'dark:bg-slate-600', 'text-primary', 'dark:text-white', 'shadow-sm');
        btn.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-white');
        
        if(range === activeRange) {
            btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-white');
            btn.classList.add('bg-white', 'dark:bg-slate-600', 'text-primary', 'dark:text-white', 'shadow-sm');
        }
    });
}

async function loadChartForModal(symbol, range) {
    const canvasId = 'main-chart';
    const canvas = document.getElementById(canvasId);
    if(canvas) canvas.style.opacity = '0.5';

    try {
        // Interval Optimierung
        let interval = '1d';
        if (range === '5y' || range === '10y' || range === 'max') interval = '1wk'; // Wöchentlich für lange Zeiträume

        const rawData = await fetchChartData(symbol, range, interval);
        
        if(rawData) {
            // 1. Chart rendern
            renderChart(canvasId, rawData);

            // 2. Metadaten updaten (falls vorhanden)
            if(rawData.meta) {
                // Yahoo liefert oft exchangeName und instrumentType
                modalExchange.textContent = rawData.meta.exchangeName || rawData.meta.exchangeTimezoneName || 'N/A';
                modalType.textContent = rawData.meta.instrumentType || 'STOCK';
                
                // Name suchen wir uns aus store oder fallback
                // Leider ist der volle Name im Chart-Objekt oft nicht enthalten, 
                // aber "shortName" manchmal schon in anderen Endpoints. 
                // Wir nutzen hier das Symbol als Fallback, da wir für den vollen Namen 
                // einen extra Request bräuchten, was die App verlangsamt.
                // Alternative: Wir nutzen die Währung als Indikator.
                const currency = rawData.meta.currency;
                modalFullname.textContent = `${symbol} (${currency})`; 
            }
        }
    } catch (e) {
        console.error("Chart load failed", e);
        if(modalFullname) modalFullname.textContent = "Fehler beim Laden";
    } finally {
        if(canvas) canvas.style.opacity = '1';
    }
}

// Event Listener
rangeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if(!state.currentSymbol) return;
        const range = btn.dataset.range;
        state.currentRange = range;
        updateRangeButtonsUI(range);
        loadChartForModal(state.currentSymbol, range);
    });
});

// --- CORE ---

function updateThemeIcon(mode) {
    const icon = themeBtn?.querySelector('i');
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
        gridEl.innerHTML = '<div class="col-span-full text-center text-slate-400 py-8 animate-pulse">Lade Watchlist...</div>';
    }

    const promises = watchlist.map(async (symbol) => {
        try {
            const rawData = await fetchChartData(symbol, '1y', '1d');
            if (!rawData) return null;
            return analyze(rawData);
        } catch (e) { return null; }
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

document.addEventListener('DOMContentLoaded', async () => {
    const currentTheme = initTheme();
    updateThemeIcon(currentTheme);
    if(themeBtn) {
        themeBtn.addEventListener('click', () => updateThemeIcon(toggleTheme()));
    }
    renderAppSkeleton(rootEl);
    closeModalBtns.forEach(btn => btn?.addEventListener('click', closeModal));
    if(modal) modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
    initSearch();
    loadDashboard();
});