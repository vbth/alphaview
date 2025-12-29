/**
 * App Module
 * Main Controller
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol, removeSymbol, updateQuantity, updateUrl, updateExtraUrl } from './store.js';
import { renderAppSkeleton, createStockCardHTML, createErrorCardHTML, renderSearchResults, formatMoney, updateSortUI } from './ui.js';
import { renderChart } from './charts.js';
import { ASSET_TYPES, DEFAULT_ASSET_STYLE } from './config.js';

const state = {
    searchDebounce: null,
    currentSymbol: null,
    currentRange: '1y',
    currentDashboardRange: '1d',
    dashboardData: [],
    eurUsdRate: 1.08,
    sortField: 'value',
    sortDirection: 'desc'
};

const rootEl = document.getElementById('app-root');
const themeBtn = document.getElementById('theme-toggle');
const modal = document.getElementById('chart-modal');
const modalFullname = document.getElementById('modal-fullname');
const modalSymbol = document.getElementById('modal-symbol');
const modalExchange = document.getElementById('modal-exchange');
const modalType = document.getElementById('modal-type');
const modalTrend = document.getElementById('modal-trend');
const modalVol = document.getElementById('modal-vol');
const closeModalBtns = [document.getElementById('close-modal'), document.getElementById('close-modal-btn')];
const rangeBtns = document.querySelectorAll('.chart-range-btn');

// --- LIFECYCLE & CORE ---

async function loadDashboard() {
    const watchlist = getWatchlist();
    const gridEl = document.getElementById('dashboard-grid');
    const emptyStateEl = document.getElementById('empty-state');
    const summaryEl = document.getElementById('portfolio-summary');
    const dashRangeBtns = document.querySelectorAll('.dash-range-btn');

    dashRangeBtns.forEach(btn => {
        const r = btn.dataset.range;
        if (r === state.currentDashboardRange) {
            btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-700');
            btn.classList.add('bg-slate-100', 'dark:bg-slate-600', 'text-primary', 'dark:text-white');
        } else {
            btn.classList.add('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-700');
            btn.classList.remove('bg-slate-100', 'dark:bg-slate-600', 'text-primary', 'dark:text-white');
        }
        btn.onclick = () => { state.currentDashboardRange = r; loadDashboard(); };
    });

    if (!gridEl) return;
    if (watchlist.length === 0) {
        gridEl.innerHTML = '';
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        if (summaryEl) summaryEl.classList.add('hidden');
        return;
    }
    if (emptyStateEl) emptyStateEl.classList.add('hidden');
    if (summaryEl) summaryEl.classList.remove('hidden');

    if (state.dashboardData.length === 0) gridEl.innerHTML = '<div class="col-span-full text-center text-slate-400 py-8 animate-pulse">Lade Kurse & Wechselkurse...</div>';

    try {
        state.dashboardData = await fetchPortfolioData(watchlist, state.currentDashboardRange);
        renderDashboardGrid();
    } catch (criticalError) {
        console.error("Dashboard Error:", criticalError);
    }
}

async function fetchPortfolioData(watchlist, dashboardRange) {
    try {
        let rateData = null;
        try { rateData = await fetchChartData('EURUSD=X', '5d', '1d'); } catch (e) { }

        const stockPromises = watchlist.map(async (item) => {
            try {
                let interval = '1d';
                let apiRange = dashboardRange;
                if (apiRange === '1W') { apiRange = '5d'; interval = '15m'; }
                if (apiRange === '1d') interval = '5m';
                if (apiRange === '1mo') interval = '1d';

                const rawData = await fetchChartData(item.symbol, apiRange, interval);
                if (!rawData) return null;

                const analysis = analyze(rawData);
                analysis.qty = item.qty;
                analysis.url = item.url;

                if (!analysis.url) {
                    analysis.url = `https://finance.yahoo.com/quote/${item.symbol}`;
                    updateUrl(item.symbol, analysis.url);
                }

                if (!item.extraUrl) {
                    if (analysis.type === 'ETF' || analysis.type === 'MUTUALFUND') {
                        analysis.extraUrl = `https://finance.yahoo.com/quote/${item.symbol}/holdings`;
                    } else {
                        analysis.extraUrl = `https://finance.yahoo.com/quote/${item.symbol}/news`;
                    }
                    updateExtraUrl(item.symbol, analysis.extraUrl);
                } else {
                    analysis.extraUrl = item.extraUrl;
                }

                return analysis;
            } catch (e) {
                console.warn(`Error fetching ${item.symbol}:`, e);
                return { symbol: item.symbol, error: true, errorMsg: e.message };
            }
        });

        const stockResults = await Promise.all(stockPromises);

        if (rateData && rateData.indicators && rateData.indicators.quote[0].close) {
            const closes = rateData.indicators.quote[0].close;
            const currentRate = closes.filter(c => c).pop();
            if (currentRate) state.eurUsdRate = currentRate;
        }

        return stockResults; // Return all, including errors
    } catch (e) {
        console.error("Fetch Data Error:", e);
        return [];
    }
}

// --- RENDERING ---

function renderDashboardGrid() {
    const gridEl = document.getElementById('dashboard-grid');
    const totalEurEl = document.getElementById('total-balance-eur');
    const totalUsdEl = document.getElementById('total-balance-usd');
    const totalPosEl = document.getElementById('total-positions');
    if (!totalEurEl) return;

    let totalEUR = 0;
    const preparedData = state.dashboardData.map(item => {
        if (item.error) return item; // Skip calc for errors

        let valEur = item.price * item.qty;
        if (item.currency === 'USD') valEur /= state.eurUsdRate;
        totalEUR += valEur;
        return { ...item, valEur };
    });

    const totalUSD = totalEUR * state.eurUsdRate;

    preparedData.sort((a, b) => {
        // Errors at the bottom
        if (a.error && !b.error) return 1;
        if (!a.error && b.error) return -1;
        if (a.error && b.error) return 0;

        let valA, valB;
        if (state.sortField === 'name') {
            valA = a.name.toLowerCase(); valB = b.name.toLowerCase();
            if (state.sortDirection === 'asc') return valA.localeCompare(valB);
            return valB.localeCompare(valA);
        } else if (state.sortField === 'performance') {
            valA = a.changePercent; valB = b.changePercent;
            if (state.sortDirection === 'asc') return valA - valB;
            return valB - valA;
        } else {
            valA = a.valEur; valB = b.valEur;
            if (state.sortDirection === 'asc') return valA - valB;
            return valB - valA;
        }
    });

    updateSortUI(state.sortField, state.sortDirection);

    if (totalEurEl) totalEurEl.textContent = formatMoney(totalEUR, 'EUR');
    if (totalUsdEl) totalUsdEl.textContent = formatMoney(totalUSD, 'USD');
    if (totalPosEl) totalPosEl.textContent = state.dashboardData.length;

    gridEl.innerHTML = preparedData.map(data => {
        if (data.error) return createErrorCardHTML(data.symbol, data.errorMsg);
        return createStockCardHTML(data, data.qty, data.url, data.extraUrl, totalEUR, state.eurUsdRate);
    }).join('');
}

function initDashboardEvents() {
    const gridEl = document.getElementById('dashboard-grid');
    if (!gridEl) return;

    // Klick-Events (Modal & Delete)
    gridEl.addEventListener('click', (e) => {
        const target = e.target;

        // Delete Button
        const deleteBtn = target.closest('[data-action="delete"]');
        if (deleteBtn) {
            e.stopPropagation();
            const sym = deleteBtn.dataset.symbol;
            if (confirm(`${sym} entfernen?`)) {
                removeSymbol(sym);
                loadDashboard();
            }
            return;
        }

        // Klicks auf Karten (Modal), aber nicht auf Inputs/Links
        const card = target.closest('.stock-card');
        if (card && !target.closest('input') && !target.closest('a') && !target.closest('button')) {
            openModal(card.dataset.symbol);
        }
    });

    // Change-Events (Inputs)
    gridEl.addEventListener('change', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const symbol = target.dataset.symbol;
        if (!action || !symbol) return;

        if (action === 'qty') {
            const newQty = parseFloat(target.value);
            if (isNaN(newQty) || newQty < 0) return;
            updateQuantity(symbol, newQty);
            const item = state.dashboardData.find(d => d.symbol === symbol);
            if (item) item.qty = newQty;
            renderDashboardGrid();
        }
        else if (action === 'url') {
            const newUrl = target.value;
            updateUrl(symbol, newUrl);
            const item = state.dashboardData.find(d => d.symbol === symbol);
            if (item) item.url = newUrl;
            renderDashboardGrid();
        }
        else if (action === 'extraUrl') {
            const newUrl = target.value;
            updateExtraUrl(symbol, newUrl);
            const item = state.dashboardData.find(d => d.symbol === symbol);
            if (item) item.extraUrl = newUrl;
            renderDashboardGrid();
        }
    });

    // Stop Propagation auf Inputs (damit Klicks im Input nicht das Modal öffnen)
    gridEl.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') e.stopPropagation();
    });
}

async function openModal(symbol) {
    if (!modal) return;
    state.currentSymbol = symbol;
    state.currentRange = '1y';
    modalFullname.textContent = 'Lade Daten...';
    modalSymbol.textContent = symbol;
    modalExchange.textContent = '...';
    modalType.textContent = '...';
    const rangeText = document.getElementById('dynamic-range-text');
    if (rangeText) rangeText.textContent = 'Lade...';
    if (modalVol) modalVol.textContent = '---';
    if (modalTrend) modalTrend.textContent = '---';
    modal.classList.remove('hidden');
    updateRangeButtonsUI('1y');
    await loadChartForModal(symbol, '1y');
}
function closeModal() { if (modal) modal.classList.add('hidden'); state.currentSymbol = null; }
function updateRangeButtonsUI(activeRange) {
    rangeBtns.forEach(btn => {
        const range = btn.dataset.range;
        if (range === activeRange) {
            btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-50');
            btn.classList.add('bg-slate-100', 'dark:bg-slate-600', 'text-primary', 'dark:text-white');
        } else {
            btn.classList.add('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-700');
            btn.classList.remove('bg-slate-100', 'dark:bg-slate-600', 'text-primary', 'dark:text-white');
        }
    });
}
async function loadChartForModal(symbol, requestedRange) {
    const canvasId = 'main-chart';
    const canvas = document.getElementById(canvasId);
    if (canvas) canvas.style.opacity = '0.5';
    try {
        let interval = '1d';
        let apiRange = requestedRange;
        if (requestedRange === '1mo') { apiRange = '1y'; interval = '1d'; }
        else if (requestedRange === '6mo') { apiRange = '2y'; interval = '1d'; }
        else if (requestedRange === '1y') { apiRange = '2y'; interval = '1d'; }
        else if (requestedRange === '5y') { apiRange = '10y'; interval = '1wk'; }
        else if (requestedRange === 'max') { apiRange = 'max'; interval = '1wk'; }
        else if (requestedRange === '1d') { apiRange = '1d'; interval = '5m'; }
        else if (requestedRange === '1W' || requestedRange === '5d') { apiRange = '5d'; interval = '15m'; }

        const rawData = await fetchChartData(symbol, apiRange, interval);
        if (rawData) {
            const analysis = analyze(rawData);
            renderChart(canvasId, rawData, requestedRange, analysis);
            if (rawData.meta) {
                if (modalExchange) modalExchange.textContent = rawData.meta.exchangeName || rawData.meta.exchangeTimezoneName || 'N/A';
                const rawType = rawData.meta.instrumentType || 'EQUITY';
                if (modalType) modalType.textContent = TYPE_TRANSLATIONS[rawType] || rawType;
                const fullName = rawData.meta.longName || rawData.meta.shortName || symbol;
                if (modalFullname) modalFullname.textContent = fullName;
                if (analysis) {
                    if (modalVol) modalVol.textContent = analysis.volatility ? analysis.volatility.toFixed(1) + '%' : 'n/a';
                    if (modalTrend) {
                        const t = analysis.trend;
                        let color = 'text-slate-900 dark:text-slate-200';
                        let icon = '';
                        if (t === 'bullish') { color = 'text-green-600'; icon = '▲ '; }
                        if (t === 'bearish') { color = 'text-red-600'; icon = '▼ '; }
                        modalTrend.innerHTML = `<span class="${color}">${icon}${t.toUpperCase()}</span>`;
                    }
                }
            }
        }
    } catch (e) { console.error(e); if (modalFullname) modalFullname.textContent = "Fehler"; }
    finally { if (canvas) canvas.style.opacity = '1'; }
}

rangeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!state.currentSymbol) return;
        const range = btn.dataset.range;
        state.currentRange = range;
        updateRangeButtonsUI(range);
        loadChartForModal(state.currentSymbol, range);
    });
});

// --- SEARCH ---

function initSearch() {
    const input = document.getElementById('header-search-input');
    const resultsContainer = document.getElementById('header-search-results');

    if (!input || !resultsContainer) return;

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#header-search-input') && !e.target.closest('#header-search-results')) {
            resultsContainer.classList.add('hidden');
        }
    });

    resultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.search-item');
        if (item) {
            const symbol = item.dataset.symbol;
            if (symbol) {
                addSymbol(symbol);
                input.value = '';
                resultsContainer.classList.add('hidden');
                loadDashboard();
            }
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim().toUpperCase();
            if (val.length > 0) {
                addSymbol(val);
                input.value = '';
                resultsContainer.classList.add('hidden');
                loadDashboard();
            }
        }
    });

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(state.searchDebounce);

        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        state.searchDebounce = setTimeout(async () => {
            const results = await searchSymbol(query);
            renderSearchResults(results, resultsContainer);
        }, 500);
    });
}

// --- DATA MANAGEMENT & EXPORTS ---

function initDataManagement() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-input');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = localStorage.getItem('alphaview_portfolio');
            if (!data || data === '[]') { alert('Dein Depot ist leer.'); return; }
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().slice(0, 10);
            a.download = `alphaview_depot_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => {
            if (localStorage.getItem('alphaview_portfolio') && localStorage.getItem('alphaview_portfolio') !== '[]') {
                if (!confirm('Achtung: Dies überschreibt dein aktuelles Depot! Fortfahren?')) return;
            }
            importInput.click();
        });
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    if (Array.isArray(json)) {
                        localStorage.setItem('alphaview_portfolio', JSON.stringify(json));
                        alert('Depot erfolgreich importiert!');
                        location.reload();
                    } else { alert('Ungültiges Dateiformat.'); }
                } catch (err) { alert('Fehler beim Lesen der Datei.'); }
            };
            reader.readAsText(file);
        });
    }
}

function initCopyFeatures() {
    const copyBtn = document.getElementById('copy-list-btn');
    const copyUrlsBtn = document.getElementById('copy-urls-btn');

    // AI CONTEXT KOPIEREN (Privacy-First: Nur % Anteile, Performance & Trend)
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!state.dashboardData || state.dashboardData.length === 0) { alert("Keine Daten."); return; }

            let totalValueEUR = 0;
            const items = state.dashboardData.map(item => {
                let valEur = item.price * item.qty;
                if (item.currency === 'USD') valEur /= state.eurUsdRate;
                totalValueEUR += valEur;
                return { ...item, valEur };
            });

            if (totalValueEUR === 0) totalValueEUR = 1;

            items.sort((a, b) => b.valEur - a.valEur);

            let text = "### AI ANALYSIS CONTEXT (PORTFOLIO)\n\n";
            text += "| Asset | Symbol | Weight | Perf 1Y | Volatility | Trend | Research |\n";
            text += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";

            items.forEach(i => {
                const percent = (i.valEur / totalValueEUR) * 100;
                const safeSymbol = i.symbol.split('.')[0].toLowerCase();
                const marketWatchUrl = (i.type === 'ETF' || i.type === 'MUTUALFUND')
                    ? `https://www.marketwatch.com/investing/fund/${safeSymbol}`
                    : `https://www.marketwatch.com/investing/stock/${safeSymbol}`;

                text += `| ${i.name} | ${i.symbol} | ${percent.toFixed(1)}% | ${i.changePercent.toFixed(1)}% | ${i.volatility.toFixed(1)}% | ${i.trend.toUpperCase()} | [MW](${marketWatchUrl}) |\n`;
            });

            text += "\n> [!NOTE]\n> Prices and absolute portfolio values are excluded for privacy.";

            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> AI Context Kopiert!';
                setTimeout(() => copyBtn.innerHTML = originalText, 2000);
            }).catch(err => alert('Fehler beim Kopieren.'));
        });
    }

    // LINKS KOPIEREN (MarketWatch Deep Links für AI Analysis)
    if (copyUrlsBtn) {
        copyUrlsBtn.addEventListener('click', () => {
            if (!state.dashboardData || state.dashboardData.length === 0) { alert("Keine Daten."); return; }
            let text = "### AI DEEP RESEARCH LINKS\n\n";
            const items = [...state.dashboardData].sort((a, b) => a.symbol.localeCompare(b.symbol));

            items.forEach(i => {
                const safeSymbol = i.symbol.split('.')[0].toLowerCase();
                text += `**${i.name} (${i.symbol})**\n`;

                if (i.type === 'ETF' || i.type === 'MUTUALFUND') {
                    text += `- Overview: https://www.marketwatch.com/investing/fund/${safeSymbol}\n`;
                    text += `- Holdings: https://www.marketwatch.com/investing/fund/${safeSymbol}/holdings\n`;
                } else {
                    text += `- Overview: https://www.marketwatch.com/investing/stock/${safeSymbol}\n`;
                    text += `- Profile: https://www.marketwatch.com/investing/stock/${safeSymbol}/company-profile\n`;
                }
                text += `\n`;
            });

            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyUrlsBtn.innerHTML;
                copyUrlsBtn.innerHTML = '<i class="fa-solid fa-check"></i> MW-Links kopiert!';
                setTimeout(() => copyUrlsBtn.innerHTML = originalText, 2000);
            });
        });
    }
}

function initSorting() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.sort;
            if (state.sortField === field) state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            else { state.sortField = field; state.sortDirection = (field === 'name') ? 'asc' : 'desc'; }
            renderDashboardGrid();
        });
    });
}

// --- BOOTSTRAP ---

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

document.addEventListener('DOMContentLoaded', () => {
    const currentTheme = initTheme();
    const updateIcon = (mode) => {
        const icon = themeBtn?.querySelector('i');
        if (icon) {
            if (mode === 'dark') { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
            else { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
        }
    };

    updateIcon(currentTheme);
    if (themeBtn) themeBtn.addEventListener('click', () => updateIcon(toggleTheme()));

    renderAppSkeleton(rootEl);
    closeModalBtns.forEach(btn => btn?.addEventListener('click', closeModal));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    initSearch();
    initSorting();
    initDataManagement();
    initCopyFeatures();
    initDashboardEvents();

    loadDashboard();
});