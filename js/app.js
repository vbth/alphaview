/**
 * App Module
 * Main Controller
 * Fix: Moved Sort Event Listeners to Init to prevent stacking/glitching.
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData, searchSymbol } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol, removeSymbol, updateQuantity, updateUrl, updateExtraUrl } from './store.js';
import { renderAppSkeleton, createStockCardHTML, renderSearchResults, formatMoney, updateSortUI } from './ui.js';
import { renderChart } from './charts.js';

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
const TYPE_TRANSLATIONS = { 'EQUITY': 'AKTIE', 'ETF': 'ETF', 'MUTUALFUND': 'FONDS', 'INDEX': 'INDEX', 'CRYPTOCURRENCY': 'KRYPTO', 'CURRENCY': 'DEVISEN', 'FUTURE': 'FUTURE', 'OPTION': 'OPTION' };

async function loadDashboard() {
    const watchlist = getWatchlist();
    const gridEl = document.getElementById('dashboard-grid');
    const emptyStateEl = document.getElementById('empty-state');
    const summaryEl = document.getElementById('portfolio-summary');
    const dashRangeBtns = document.querySelectorAll('.dash-range-btn');

    dashRangeBtns.forEach(btn => {
        const r = btn.dataset.range;
        if(r === state.currentDashboardRange) {
            btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-700');
            btn.classList.add('bg-slate-100', 'dark:bg-slate-600', 'text-primary', 'dark:text-white');
        } else {
            btn.classList.add('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-50', 'dark:hover:bg-slate-700');
            btn.classList.remove('bg-slate-100', 'dark:bg-slate-600', 'text-primary', 'dark:text-white');
        }
        // Fix: Remove old listener approach, re-assign onclick is safe here
        btn.onclick = () => { state.currentDashboardRange = r; loadDashboard(); };
    });

    if (!gridEl) return;
    if (watchlist.length === 0) {
        gridEl.innerHTML = '';
        if(emptyStateEl) emptyStateEl.classList.remove('hidden');
        if(summaryEl) summaryEl.classList.add('hidden');
        return;
    }
    if(emptyStateEl) emptyStateEl.classList.add('hidden');
    if(summaryEl) summaryEl.classList.remove('hidden');
    
    if(state.dashboardData.length === 0) gridEl.innerHTML = '<div class="col-span-full text-center text-slate-400 py-8 animate-pulse">Lade Kurse & Wechselkurse...</div>';

    try {
        let rateData = null;
        try { rateData = await fetchChartData('EURUSD=X', '5d', '1d'); } catch (e) {}
        
        const stockPromises = watchlist.map(async (item) => {
            try {
                let interval = '1d';
                let apiRange = state.currentDashboardRange;
                if(apiRange === '1W') { apiRange = '5d'; interval = '15m'; }
                if(apiRange === '1d') interval = '5m';
                if(apiRange === '1mo') interval = '1d';

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
    const preparedData = state.dashboardData.map(item => {
        let valEur = item.price * item.qty;
        if (item.currency === 'USD') valEur /= state.eurUsdRate;
        totalEUR += valEur;
        return { ...item, valEur };
    });

    const totalUSD = totalEUR * state.eurUsdRate;
    
    // Sortierung anwenden
    preparedData.sort((a, b) => {
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
    
    if(totalEurEl) totalEurEl.textContent = formatMoney(totalEUR, 'EUR');
    if(totalUsdEl) totalUsdEl.textContent = formatMoney(totalUSD, 'USD');
    if(totalPosEl) totalPosEl.textContent = state.dashboardData.length;
    
    gridEl.innerHTML = preparedData.map(data => 
        createStockCardHTML(data, data.qty, data.url, data.extraUrl, totalEUR, state.eurUsdRate)
    ).join('');
    
    // Nur DIESE Events müssen bei jedem Render neu gebunden werden, da die Elemente neu sind
    attachCardEvents(); 
}

function attachCardEvents() {
    // Buttons IN DEN KARTEN (müssen neu gebunden werden)
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm(`${e.currentTarget.dataset.symbol} entfernen?`)) { removeSymbol(e.currentTarget.dataset.symbol); loadDashboard(); }
        });
    });
    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'A' || e.target.closest('a') || e.target.closest('.delete-btn')) return;
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
    document.querySelectorAll('.url-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const sym = e.target.dataset.symbol;
            const newUrl = e.target.value;
            updateUrl(sym, newUrl);
            const item = state.dashboardData.find(d => d.symbol === sym);
            if(item) item.url = newUrl;
            renderDashboardGrid();
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    });
    document.querySelectorAll('.extra-url-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const sym = e.target.dataset.symbol;
            const newUrl = e.target.value;
            updateExtraUrl(sym, newUrl);
            const item = state.dashboardData.find(d => d.symbol === sym);
            if(item) item.extraUrl = newUrl;
            renderDashboardGrid();
        });
        input.addEventListener('click', (e) => e.stopPropagation());
    });
}

// ... Modal & Chart (unverändert) ...
async function openModal(symbol) {
    if(!modal) return;
    state.currentSymbol = symbol;
    state.currentRange = '1y'; 
    modalFullname.textContent = 'Lade Daten...';
    modalSymbol.textContent = symbol;
    modalExchange.textContent = '...';
    modalType.textContent = '...';
    const rangeText = document.getElementById('dynamic-range-text');
    if(rangeText) rangeText.textContent = 'Lade...';
    if(modalVol) modalVol.textContent = '---';
    if(modalTrend) modalTrend.textContent = '---';
    modal.classList.remove('hidden');
    updateRangeButtonsUI('1y');
    await loadChartForModal(symbol, '1y');
}
function closeModal() { if(modal) modal.classList.add('hidden'); state.currentSymbol = null; }
function updateRangeButtonsUI(activeRange) {
    rangeBtns.forEach(btn => {
        const range = btn.dataset.range;
        if(range === activeRange) {
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
    if(canvas) canvas.style.opacity = '0.5';
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
        if(rawData) {
            const analysis = analyze(rawData);
            renderChart(canvasId, rawData, requestedRange, analysis);
            if(rawData.meta) {
                if(modalExchange) modalExchange.textContent = rawData.meta.exchangeName || rawData.meta.exchangeTimezoneName || 'N/A';
                const rawType = rawData.meta.instrumentType || 'EQUITY';
                if(modalType) modalType.textContent = TYPE_TRANSLATIONS[rawType] || rawType;
                const fullName = rawData.meta.longName || rawData.meta.shortName || symbol;
                if(modalFullname) modalFullname.textContent = fullName; 
                if(analysis) {
                    if(modalVol) modalVol.textContent = analysis.volatility ? analysis.volatility.toFixed(1) + '%' : 'n/a';
                    if(modalTrend) {
                        const t = analysis.trend;
                        let color = 'text-slate-900 dark:text-slate-200';
                        let icon = '';
                        if(t === 'bullish') { color = 'text-green-600'; icon = '▲ '; }
                        if(t === 'bearish') { color = 'text-red-600'; icon = '▼ '; }
                        modalTrend.innerHTML = `<span class="${color}">${icon}${t.toUpperCase()}</span>`;
                    }
                }
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

// SUCHE: Angepasst für Header-Elemente
function initSearch() {
    // Neue IDs nutzen
    const input = document.getElementById('header-search-input');
    const resultsContainer = document.getElementById('header-search-results');
    // Spinner ist im Header nicht nötig / zu wenig Platz, wir entfernen ihn logisch oder nutzen ein Icon
    
    if(!input) return;

    // Click outside handler
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#header-search-input') && !e.target.closest('#header-search-results')) {
            resultsContainer.classList.add('hidden');
        }
    });

    // Enter Key
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

    // Input Key
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(state.searchDebounce);
        
        if (query.length < 2) { 
            resultsContainer.classList.add('hidden'); 
            return; 
        }

        // Suche starten
        state.searchDebounce = setTimeout(async () => {
            const results = await searchSymbol(query);
            // Render (nutzt existierende Funktion aus ui.js)
            renderSearchResults(results, resultsContainer);
            
            // Klick-Event für Ergebnisse
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// APP START
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

    // Export/Import
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-input');
    const copyBtn = document.getElementById('copy-list-btn');
    const copyUrlsBtn = document.getElementById('copy-urls-btn');
    
    // Sort Buttons Listener (EINMALIG HIER, NICHT IN RENDER LOOP)
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.sort;
            if (state.sortField === field) state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            else { state.sortField = field; state.sortDirection = (field === 'name') ? 'asc' : 'desc'; }
            renderDashboardGrid();
        });
    });

    // ... (Copy/Export Logic unchanged) ...
    if(copyBtn) {
        copyBtn.addEventListener('click', () => {
            if(!state.dashboardData || state.dashboardData.length === 0) { alert("Keine Daten."); return; }
            let totalValueEUR = 0;
            const items = state.dashboardData.map(item => {
                let valEur = item.price * item.qty;
                if(item.currency === 'USD') valEur /= state.eurUsdRate;
                totalValueEUR += valEur;
                return { ...item, valEur };
            });
            if(totalValueEUR === 0) totalValueEUR = 1;
            items.forEach(i => i.percent = (i.valEur / totalValueEUR) * 100);
            items.sort((a, b) => b.percent - a.percent);
            let text = "DEPOT-ZUSAMMENSETZUNG\n\n";
            items.forEach(i => {
                const safeName = i.name || i.symbol || "Unbekannt";
                const safeType = i.type || 'EQUITY';
                const typeName = TYPE_TRANSLATIONS[safeType] || safeType;
                text += `[${i.percent.toFixed(1).replace('.',',')}%] ${safeName} (${i.symbol}) – ${typeName}\n`;
            });
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Kopiert!';
                setTimeout(() => copyBtn.innerHTML = originalText, 2000);
            }).catch(err => alert('Fehler beim Kopieren.'));
        });
    }

    if(copyUrlsBtn) {
        copyUrlsBtn.addEventListener('click', () => {
            if(!state.dashboardData || state.dashboardData.length === 0) { alert("Keine Daten."); return; }
            let text = "";
            const items = [...state.dashboardData].sort((a,b) => a.symbol.localeCompare(b.symbol));
            let count = 0;
            items.forEach(i => {
                if(i.url && i.url.trim() !== '') { text += `${i.url}\n`; count++; }
                if(i.extraUrl && i.extraUrl.trim() !== '') { text += `${i.extraUrl}\n`; count++; }
            });
            if(count === 0) { alert("Keine URLs hinterlegt."); return; }
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyUrlsBtn.innerHTML;
                copyUrlsBtn.innerHTML = '<i class="fa-solid fa-check"></i> Kopiert!';
                setTimeout(() => copyUrlsBtn.innerHTML = originalText, 2000);
            });
        });
    }

    if(exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = localStorage.getItem('alphaview_portfolio');
            if(!data || data === '[]') { alert('Dein Depot ist leer.'); return; }
            const blob = new Blob([data], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().slice(0,10);
            a.download = `alphaview_depot_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if(importBtn && importInput) {
        importBtn.addEventListener('click', () => {
            if(localStorage.getItem('alphaview_portfolio') && localStorage.getItem('alphaview_portfolio') !== '[]') {
                if(!confirm('Achtung: Dies überschreibt dein aktuelles Depot! Fortfahren?')) return;
            }
            importInput.click();
        });
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    if(Array.isArray(json)) {
                        localStorage.setItem('alphaview_portfolio', JSON.stringify(json));
                        alert('Depot erfolgreich importiert!');
                        location.reload();
                    } else { alert('Ungültiges Dateiformat.'); }
                } catch(err) { alert('Fehler beim Lesen der Datei.'); }
            };
            reader.readAsText(file);
        });
    }
});