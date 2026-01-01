/**
 * Modul: App
 * ==========
 * Haupt-Controller der Anwendung. 
 * Verknüpft State, UI, API und Events.
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

// --- LEBENSZYKLUS & KERNLOGIK ---

/**
 * Lädt die Hauptansicht des Dashboards.
 * Liest die Watchlist, prüft auf leeren Zustand, lädt aktuelle Marktdaten
 * und stößt das Rendering an.
 * Aktualisiert zudem die UI der Zeitfenster-Buttons.
 */
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

/**
 * Ruft die Portfolio-Daten für alle Symbole in der Watchlist ab.
 * Holt zusätzlich den aktuellen EUR/USD-Wechselkurs.
 * Führt für jedes Asset eine Analyse durch und ergänzt fehlende URLs.
 * Sammelt Fehler-Ergebnisse separat, um das UI nicht zu blockieren.
 * 
 * @param {Array} watchlist - Liste der zu ladenden Assets.
 * @param {string} dashboardRange - Der anzuzeigende Zeitraum (z.B. '1d', '1y').
 * @returns {Promise<Array>} Liste der Analyse-Ergebnisse (und Fehler).
 */
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
                if (!rawData) {
                    return { symbol: item.symbol, error: true, errorMsg: "Keine Daten (API)." };
                }

                const analysis = analyze(rawData);

                if (!analysis) {
                    return { symbol: item.symbol, error: true, errorMsg: "Zu wenig Datenpunkte für Analyse." };
                }

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

        return stockResults; // Gibt alle Ergebnisse zurück, auch Fehlerobjekte
    } catch (e) {
        console.error("Fetch Data Error:", e);
        return [];
    }
}

// --- UI-RENDERING ---

/**
 * Rendert das Grid mit den Aktien-Karten (Stock Cards).
 * Berechnet Gesamtsummen (EUR/USD) und sortiert die Liste basierend auf den Einstellungen.
 * Aktualisiert die Header-Statistiken.
 */
function renderDashboardGrid() {
    const gridEl = document.getElementById('dashboard-grid');
    const totalEurEl = document.getElementById('total-balance-eur');
    const totalUsdEl = document.getElementById('total-balance-usd');
    const totalPosEl = document.getElementById('total-positions');
    if (!totalEurEl) return;

    let totalEUR = 0;
    const preparedData = state.dashboardData.map(item => {
        if (item.error) return item; // Überspringe Berechnung bei Fehlern

        let valEur = item.price * item.qty;
        if (item.currency === 'USD') valEur /= state.eurUsdRate;
        totalEUR += valEur;
        return { ...item, valEur };
    });

    const totalUSD = totalEUR * state.eurUsdRate;

    preparedData.sort((a, b) => {
        // Fehlerhafte Einträge nach unten sortieren
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

/**
 * Initialisiert Event-Listener für das Dashboard-Grid (Delegation).
 * Behandelt Klicks auf 'Löschen', 'Karten' (öffnen Modal) und Änderungen an Inputs (Stückzahl/URL).
 * Verhindert Event-Bubbling bei Klicks auf interaktive Elemente.
 */
function initDashboardEvents() {
    const gridEl = document.getElementById('dashboard-grid');
    if (!gridEl) return;

    // Klick-Events (Modal & Delete)
    gridEl.addEventListener('click', (e) => {
        const target = e.target;

        // Löschen-Button
        const deleteBtn = target.closest('[data-action="delete"]');
        if (deleteBtn) {
            e.stopPropagation();
            const sym = deleteBtn.dataset.symbol;
            // 2-Step Delete Logic ( UX improvement over window.confirm )
            if (deleteBtn.dataset.confirmState === 'active') {
                removeSymbol(sym);
                loadDashboard();
            } else {
                // Save original state
                const originalHtml = deleteBtn.innerHTML;
                const originalClasses = deleteBtn.className;

                // Set confirm state
                deleteBtn.dataset.confirmState = 'active';
                deleteBtn.innerHTML = '<i class="fa-solid fa-check"></i> Bestätigen?';
                deleteBtn.className = 'delete-btn dashboard-action text-white bg-red-600 hover:bg-red-700 flex items-center gap-1.5 px-2 py-1 rounded shadow-sm transition-all';

                // Auto-reset after 3 seconds
                setTimeout(() => {
                    if (deleteBtn && deleteBtn.isConnected && deleteBtn.dataset.confirmState === 'active') {
                        deleteBtn.dataset.confirmState = 'inactive';
                        deleteBtn.innerHTML = originalHtml;
                        deleteBtn.className = originalClasses;
                    }
                }, 3000);
            }
            return;
        }

        // Retry Button
        const retryBtn = target.closest('[data-action="retry"]');
        if (retryBtn) {
            e.stopPropagation();
            const sym = retryBtn.dataset.symbol;
            retryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
            // Force re-fetch by calling update (or just reload dashboard, simpler)
            loadDashboard();
            return;
        }

        // Klicks auf Karten (Modal), aber nicht auf Inputs/Links
        const card = target.closest('.stock-card');
        if (card && !target.closest('input') && !target.closest('a') && !target.closest('button')) {
            openModal(card.dataset.symbol);
        }
    });

    // Änderungs-Events (Eingabefelder)
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

/**
 * Öffnet das Detail-Modal für ein bestimmtes Asset.
 * Setzt den Modal-Status zurück, lädt Chart-Daten und zeigt das Modal an.
 * @param {string} symbol - Das anzuzeigende Tickersymbol.
 */
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
/**
 * Schließt das Chart-Modal und setzt die aktuelle Selektion zurück.
 */
function closeModal() { if (modal) modal.classList.add('hidden'); state.currentSymbol = null; }
/**
 * Aktualisiert die "Active"-Klasse der Zeitbereichs-Buttons im Modal.
 * @param {string} activeRange - Der aktuell gewählte Zeitraum.
 */
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
/**
 * Lädt die Chart-Daten für das Modal und rendert den Chart.
 * Wählt das passende Daten-Intervall basierend auf dem gewählten Zeitraum.
 * Aktualisiert Metadaten im Modal (Trend, Volatilität, Börse).
 * @param {string} symbol - Das Symbol.
 * @param {string} requestedRange - Der gewünschte Zeitraum (z.B. '5y').
 */
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
            // Initial render without type optimization (will be re-rendered a few lines down once type is parsed)
            // Or better: parse type first.
            // We can just call renderChart once below.
            // Let's defer renderChart until we know the type.

            if (rawData.meta) {
                if (modalExchange) modalExchange.textContent = rawData.meta.exchangeName || rawData.meta.exchangeTimezoneName || 'N/A';
                const rawType = rawData.meta.instrumentType || 'EQUITY';
                const isIndex = rawType === 'INDEX';
                const typeStyle = ASSET_TYPES[rawType] || DEFAULT_ASSET_STYLE;
                if (modalType) modalType.textContent = typeStyle.label || rawType;

                // Re-Render Chart with type info to handle currency formatting
                if (isIndex) {
                    renderChart(canvasId, rawData, requestedRange, analysis, true);
                } else {
                    renderChart(canvasId, rawData, requestedRange, analysis, false);
                }

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

// --- SUCHE ---

/**
 * Initialisiert die Suchfunktion im Header.
 * Behandelt Eingabe-Debouncing, API-Suche und Auswahl von Ergebnissen.
 * Schließt Ergebnisse bei Klick außerhalb.
 */
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

// --- DATEN-MANAGEMENT & EXPORTE ---

/**
 * Initialisiert Export- und Import-Funktionen für das Portfolio (JSON).
 * Behandelt Datei-Upload und Download.
 */
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
                if (importBtn.dataset.confirmState === 'active') {
                    // Zweiter Klick -> Ausführen
                    importInput.click();
                    // Reset Button State Immediately
                    importBtn.dataset.confirmState = 'inactive';
                    importBtn.style.width = ''; // Remove fixed width
                    importBtn.innerHTML = '<i class="fa-solid fa-file-import"></i> <span>Depot laden</span>';
                    importBtn.className = 'bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2';
                } else {
                    // Erster Klick -> Warnung
                    const originalHtml = importBtn.innerHTML;
                    const originalClasses = importBtn.className;
                    const originalWidth = importBtn.offsetWidth; // Capture current width

                    importBtn.dataset.confirmState = 'active';
                    importBtn.style.width = `${originalWidth}px`; // Lock width
                    importBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Sicher?</span>'; // Shortened text to fit better
                    importBtn.className = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2';

                    setTimeout(() => {
                        if (importBtn.dataset.confirmState === 'active') {
                            importBtn.dataset.confirmState = 'inactive';
                            importBtn.style.width = ''; // Unlock width
                            importBtn.innerHTML = originalHtml;
                            importBtn.className = originalClasses;
                        }
                    }, 4000);
                }
            } else {
                importInput.click();
            }
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

/**
 * Initialisiert die Funktionen zum Kopieren von Analysedaten in die Zwischenablage.
 * Bietet zwei Modi: "AI Context" (Zusammenfassung) und "Research Links" (MarketWatch).
 */
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

            let text = "| Asset | Symbol | Weight | Perf | Volatility | Trend |\n";
            text += "| :--- | :--- | :--- | :--- | :--- | :--- |\n";

            items.forEach(i => {
                const percent = (i.valEur / totalValueEUR) * 100;
                text += `| ${i.name} | ${i.symbol} | ${percent.toFixed(1)}% | ${i.changePercent.toFixed(1)}% | ${i.volatility.toFixed(1)}% | ${i.trend.toUpperCase()} |\n`;
            });

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

/**
 * Initialisiert die Sortier-Buttons im Dashboard-Header.
 * Erlaubt Umschalten zwischen Name, Wert, Anteil und Performance (auf/ab).
 */
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

// --- INITIALISIERUNG ---

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

    // PROXY WARMUP: Fire a silent request to wake up cold proxies
    fetchChartData('AAPL', '1d', '1d').then(() => console.log('Proxy Warmup Complete')).catch(() => { });

    loadDashboard();
});