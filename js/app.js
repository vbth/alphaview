/**
 * App Module
 * Main Controller: Coordinates Logic, UI, and Events.
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol, removeSymbol, updateQuantity } from './store.js';
import { renderAppSkeleton, createStockCardHTML, renderSearchResults, formatMoney } from './ui.js';
import { renderChart } from './charts.js';

const state = { searchDebounce: null, currentSymbol: null, currentRange: '1y', dashboardData: [], eurUsdRate: 1.08 };
const rootEl = document.getElementById('app-root');
const themeBtn = document.getElementById('theme-toggle');
const modal = document.getElementById('chart-modal');
const modalFullname = document.getElementById('modal-fullname');
const modalSymbol = document.getElementById('modal-symbol');
const modalExchange = document.getElementById('modal-exchange');
const modalType = document.getElementById('modal-type');
const closeModalBtns = [document.getElementById('close-modal'), document.getElementById('close-modal-btn')];
const rangeBtns = document.querySelectorAll('.chart-range-btn');
const TYPE_TRANSLATIONS = { 'EQUITY': 'AKTIE', 'ETF': 'ETF', 'MUTUALFUND': 'FONDS', 'INDEX': 'INDEX', 'CRYPTOCURRENCY': 'KRYPTO', 'CURRENCY': 'DEVISEN', 'FUTURE': 'FUTURE', 'OPTION': 'OPTION' };

async function loadDashboard() {
    const watchlist = getWatchlist();
    const gridEl = document.getElementById('dashboard-grid');
    const emptyStateEl = document.getElementById('empty-state');
    const summaryEl = document.getElementById('portfolio-summary');

    if (!gridEl) return;
    if (watchlist.length === 0) {
        gridEl.innerHTML = '';
        if(emptyStateEl) emptyStateEl.classList.remove('hidden');
        if(summaryEl) summaryEl.classList.add('hidden');
        return;
    }
    if(emptyStateEl) emptyStateEl.classList.add('hidden');
    if(summaryEl) summaryEl.classList.remove('hidden');
    if(!gridEl.hasChildNodes()) gridEl.innerHTML = '<div class="col-span-full text-center text-slate-400 py-8 animate-pulse">Lade Kurse & Wechselkurse...</div>';

    try {
        let rateData = null;
        try { rateData = await fetchChartData('EURUSD=X', '5d', '1d'); } catch (e) {}
        
        const stockPromises = watchlist.map(async (item) => {
            try {
                const rawData = await fetchChartData(item.symbol, '1y', '1d');
                if (!rawData) return null;
                const analysis = analyze(rawData);
                analysis.qty = item.qty; 
                return analysis;
            } catch (e) { return null; }
        });

        const stockResults = await Promise.all(stockPromises);
        if(rateData && rateData.indicators && rateData.indicators.quote[0].close) {
            const closes = rateData.indicators.quote[0].close;
            const currentRate = closes.filter(c => c).pop();
            if(currentRate) state.eurUsdRate = currentRate;
        }

        state.dashboardData = stockResults.filter(r => r !== null);
        renderDashboardGrid();
    } catch (criticalError) { console.error("Dashboard Error:", criticalError); }
}

function renderDashboardGrid() {
    const gridEl = document.getElementById('dashboard-grid');
    const totalEurEl = document.getElementById('total-balance-eur');
    const totalUsdEl = document.getElementById('total-balance-usd');
    const totalPosEl = document.getElementById('total-positions');

    if (!totalEurEl) return;
    let totalEUR = 0;

    state.dashboardData.forEach(item => {
        const rawValue = item.price * item.qty;
        if (item.currency === 'EUR') totalEUR += rawValue;
        else if (item.currency === 'USD') totalEUR += (rawValue / state.eurUsdRate);
        else totalEUR += rawValue;
    });

    const totalUSD = totalEUR * state.eurUsdRate;
    if(totalEurEl) totalEurEl.textContent = formatMoney(totalEUR, 'EUR');
    if(totalUsdEl) totalUsdEl.textContent = formatMoney(totalUSD, 'USD');
    if(totalPosEl) totalPosEl.textContent = state.dashboardData.length;

    gridEl.innerHTML = state.dashboardData
        .map(data => createStockCardHTML(data, data.qty, totalEUR, state.eurUsdRate))
        .join('');
    attachDashboardEvents();
}

function attachDashboardEvents() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sym = e.currentTarget.dataset.symbol;
            if(confirm(`${sym} entfernen?`)) { removeSymbol(sym); loadDashboard(); }
        });
    });
    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.closest('.delete-btn')) return;
            openModal(e.currentTarget.dataset.symbol);
        });
    });
    document.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const sym = e.target.dataset.symbol;
            const newQty = parseFloat(e.target.value);
            if(isNaN(newQty) || newQty < 0) return;
            updateQuantity(sym, newQty);
            const item = state.dashboardData.find(d => d.symbol === sym);
            if(item) item.qty = newQty;
            renderDashboardGrid();
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    });
}

async function openModal(symbol) {
    if(!modal) return;
    state.currentSymbol = symbol;
    state.currentRange = '1y'; 
    modalFullname.textContent = 'Lade Daten...';
    modalSymbol.textContent = symbol;
    modalExchange.textContent = '...';
    modalType.textContent = '...';
    
    // WICHTIG: Hier auch die ID "dynamic-range-text"
    const rangeText = document.getElementById('dynamic-range-text');
    if(rangeText) rangeText.textContent = 'Lade...';
    
    modal.classList.remove('hidden');
    updateRangeButtonsUI('1y');
    await loadChartForModal(symbol, '1y');
}

function closeModal() { if(modal) modal.classList.add('hidden'); state.currentSymbol = null; }

function updateRangeButtonsUI(activeRange) {
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

async function loadChartForModal(symbol, requestedRange) {
    const canvasId = 'main-chart';
    const canvas = document.getElementById(canvasId);
    if(canvas) canvas.style.opacity = '0.5';
    try {
        let interval = '1d';
        if (requestedRange === '1d') interval = '5m';
        else if (requestedRange === '5d') interval = '15m';
        else if (requestedRange === '1mo' || requestedRange === '3mo') interval = '1d';
        else if (requestedRange === '5y' || requestedRange === '10y') interval = '1wk';
        else if (requestedRange === 'max') interval = '1mo';

        const rawData = await fetchChartData(symbol, requestedRange, interval);
        if(rawData) {
            renderChart(canvasId, rawData, requestedRange);
            if(rawData.meta) {
                if(modalExchange) modalExchange.textContent = rawData.meta.exchangeName || rawData.meta.exchangeTimezoneName || 'N/A';
                const rawType = rawData.meta.instrumentType || 'EQUITY';
                if(modalType) modalType.textContent = TYPE_TRANSLATIONS[rawType] || rawType;
                const fullName = rawData.meta.longName || rawData.meta.shortName || symbol;
                if(modalFullname) modalFullname.textContent = fullName; 
            }
        }
    } catch (e) { console.error(e); if(modalFullname) modalFullname.textContent = "Fehler"; } 
    finally { if(canvas) canvas.style.opacity = '1'; }
}

rangeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if(!state.currentSymbol) return;
        const range = btn.dataset.range;
        state.currentRange = range;
        updateRangeButtonsUI(range);
        loadChartForModal(state.currentSymbol, range);
    });
});

function initSearch() {
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const spinner = document.getElementById('search-spinner');
    if(!input) return;
    document.addEventListener('click', (e) => { if (!e.target.closest('#search-input') && !e.target.closest('#search-results')) resultsContainer.classList.add('hidden'); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim().toUpperCase();
            if (val.length > 0) {
                if(addSymbol(val)) console.log(`Added: ${val}`);
                input.value = '';
                resultsContainer.classList.add('hidden');
                loadDashboard();
            }
        }
    });
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(state.searchDebounce);
        if (query.length < 2) { resultsContainer.classList.add('hidden'); return; }
        spinner.classList.remove('hidden');
        state.searchDebounce = setTimeout(async () => {
            const results = await searchSymbol(query);
            spinner.classList.add('hidden');
            renderSearchResults(results, resultsContainer);
            document.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', () => {
                    addSymbol(item.dataset.symbol);
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
    const updateIcon = (mode) => { const icon = themeBtn?.querySelector('i'); if(icon) { if (mode === 'dark') { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); } else { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); } } };
    updateIcon(currentTheme);
    if(themeBtn) themeBtn.addEventListener('click', () => updateIcon(toggleTheme()));
    renderAppSkeleton(rootEl);
    closeModalBtns.forEach(btn => btn?.addEventListener('click', closeModal));
    if(modal) modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
    initSearch();
    loadDashboard();
});