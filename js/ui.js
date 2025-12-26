/**
 * UI Module
 * =========
 * Erzeugt HTML-Strings für das Dashboard, die Karten und die Suche.
 * Beinhaltet Formatierungsfunktionen für Geld und Prozent.
 */

// Formatiert Währung (Komma statt Punkt bei EUR)
export const formatMoney = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

// Formatiert Prozent (immer mit Komma)
const formatPercent = (val) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2).replace('.', ',')}%`;
};

// Erzeugt das Grundgerüst des Dashboards
export function renderAppSkeleton(container) {
    container.innerHTML = `
        <!-- HEADER STATS (Mobil linksbündig, Desktop zentriert/rechts) -->
        <div id="portfolio-summary" class="hidden mb-8 bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Gesamtdepotwert</h2>
                <div class="text-4xl font-bold text-slate-900 dark:text-white" id="total-balance-eur">---</div>
                <div class="text-lg font-mono font-medium text-slate-500 dark:text-slate-400 mt-1" id="total-balance-usd">---</div>
            </div>
            <div class="flex gap-8 text-left md:text-right w-full md:w-auto">
                <div>
                    <div class="text-xs text-slate-500">Positionen</div>
                    <div class="text-xl font-mono font-medium dark:text-slate-200" id="total-positions">0</div>
                </div>
            </div>
        </div>

        <!-- SUCHLEISTE -->
        <div class="mb-4 relative max-w-xl mx-auto">
            <div class="relative">
                <input type="text" id="search-input" class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg pl-12 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Suche Name oder Symbol..." autocomplete="off">
                <i class="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400"></i>
                <div id="search-spinner" class="hidden absolute right-4 top-3.5"><i class="fa-solid fa-circle-notch fa-spin text-primary"></i></div>
            </div>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 ml-1"><i class="fa-solid fa-circle-info mr-1"></i>Tipp: ETF nicht gefunden? Tippe das Kürzel (z.B. <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">EUNL.DE</code>) und drücke <strong>ENTER</strong>.</p>
            <div id="search-results" class="hidden absolute w-full bg-white dark:bg-slate-800 mt-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden max-h-80 overflow-y-auto"></div>
        </div>

        <!-- DASHBOARD ZEITRAUM STEUERUNG -->
        <div class="mb-8 flex justify-center overflow-x-auto no-scrollbar py-2">
            <div class="flex bg-white dark:bg-dark-surface p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" id="dashboard-range-controls">
                <button data-range="1d" class="dash-range-btn px-4 py-1.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-600 text-primary dark:text-white transition-all">1T</button>
                <button data-range="1W" class="dash-range-btn px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1W</button>
                <button data-range="1mo" class="dash-range-btn px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1M</button>
                <button data-range="6mo" class="dash-range-btn px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">6M</button>
                <button data-range="1y" class="dash-range-btn px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1J</button>
                <button data-range="5y" class="dash-range-btn px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">5J</button>
                <button data-range="max" class="dash-range-btn px-4 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">MAX</button>
            </div>
        </div>

        <!-- GRID CONTAINER -->
        <div id="dashboard-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        
        <!-- EMPTY STATE -->
        <div id="empty-state" class="hidden text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4"><i class="fa-solid fa-layer-group text-slate-400 text-2xl"></i></div>
            <h3 class="text-lg font-medium text-slate-900 dark:text-white">Watchlist leer</h3>
            <p class="text-slate-500 max-w-sm mx-auto mt-2">Suche oben nach Wertpapieren.</p>
        </div>
    `;
}

// Erzeugt eine einzelne Aktien-Karte
export function createStockCardHTML(data, qty, url, totalPortfolioValueEUR, eurUsdRate) {
    const isUp = data.change >= 0;
    const colorClass = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const trendIcon = data.trend === 'bullish' ? 'fa-arrow-trend-up' : (data.trend === 'bearish' ? 'fa-arrow-trend-down' : 'fa-minus');
    
    // Berechnungen für Wert und Gewichtung
    const positionValueNative = data.price * qty;
    let positionValueEUR = positionValueNative;
    if (data.currency === 'USD') positionValueEUR = positionValueNative / eurUsdRate;
    
    const weightPercent = totalPortfolioValueEUR > 0 ? (positionValueEUR / totalPortfolioValueEUR) * 100 : 0;
    const safeUrl = url || '';

    return `
        <div class="stock-card group relative bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary/50 dark:hover:border-neon-accent/50 transition-all duration-300 cursor-pointer overflow-hidden" data-symbol="${data.symbol}">
            <div class="p-5">
                <!-- HEADER -->
                <div class="flex justify-between items-start mb-4 gap-4">
                    <div class="flex-grow min-w-0 pr-2"> 
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate" title="${data.name}">${data.name}</h3>
                        <div class="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1"><span class="font-bold text-slate-700 dark:text-slate-300">${data.symbol}</span><span class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${data.currency}</span></div>
                    </div>
                    <div class="text-right whitespace-nowrap pt-1 mr-8">
                        <div class="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">${formatMoney(data.price, data.currency)}</div>
                        <div class="text-sm font-medium font-mono ${colorClass}">${formatPercent(data.changePercent)}</div>
                    </div>
                </div>

                <!-- INFO BOX (Eingabefelder) -->
                <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-100 dark:border-slate-700" onclick="event.stopPropagation()">
                    <!-- Wert & Anteil -->
                    <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-coins text-slate-400 text-xs"></i>
                            <div class="font-mono font-bold text-slate-900 dark:text-white">${formatMoney(positionValueNative, data.currency)}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-chart-pie text-slate-400 text-xs"></i>
                            <div class="text-xs font-mono text-slate-500 dark:text-slate-300">${formatPercent(weightPercent)}</div>
                        </div>
                    </div>
                    <!-- Menge -->
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-layer-group text-slate-400 text-xs"></i>
                            <label class="text-xs text-slate-500">Menge</label>
                        </div>
                        <input type="number" min="0" step="any" class="qty-input w-24 text-right text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none" value="${qty}" data-symbol="${data.symbol}" placeholder="0">
                    </div>
                    <!-- URL -->
                    <div class="flex items-center gap-2 pt-1">
                        <i class="fa-solid fa-link text-slate-400 text-xs"></i>
                        <input type="text" class="url-input w-full text-xs bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 placeholder-slate-400" value="${safeUrl}" data-symbol="${data.symbol}" placeholder="Info-Link...">
                        ${safeUrl ? `<a href="${safeUrl}" target="_blank" class="text-primary hover:text-blue-600" title="Öffnen"><i class="fa-solid fa-external-link-alt"></i></a>` : ''}
                    </div>
                </div>

                <!-- FOOTER (Metriken & Delete Link) -->
                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-50 dark:border-slate-800 pt-3">
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1"><i class="fa-solid ${trendIcon}"></i> ${data.trend}</div>
                        <span class="text-slate-300 dark:text-slate-600">•</span>
                        <div>VOLATILITÄT: ${data.volatility.toFixed(1)}%</div>
                    </div>
                    <button class="delete-btn text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" data-symbol="${data.symbol}" title="Entfernen">
                        <i class="fa-solid fa-trash-can"></i> Entfernen
                    </button>
                </div>
            </div>
            
            <div class="h-1 w-full ${isUp ? 'bg-green-500' : 'bg-red-500'}"></div>
        </div>
    `;
}

// Bunte Badges für die Suche
const TYPE_BADGES = { 'EQUITY': {label:'AKTIE',color:'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}, 'ETF': {label:'ETF',color:'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}, 'MUTUALFUND': {label:'FONDS',color:'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'}, 'CRYPTOCURRENCY': {label:'KRYPTO',color:'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}, 'INDEX': {label:'INDEX',color:'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'} };

export function renderSearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = `<div class="p-4 text-sm text-slate-500 text-center">Keine Ergebnisse.</div>`;
        container.classList.remove('hidden');
        return;
    }
    container.innerHTML = results.map(item => {
        const badge = TYPE_BADGES[item.type] || { label: item.type, color: 'bg-slate-100 text-slate-600' };
        return `
        <div class="search-item px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors group" data-symbol="${item.symbol}">
            <div class="flex justify-between items-center">
                <div class="flex-grow min-w-0 mr-4">
                    <div class="flex items-center gap-2 mb-0.5"><span class="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">${item.symbol}</span><span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}">${badge.label}</span></div>
                    <div class="text-xs text-slate-500 truncate" title="${item.name}">${item.name}</div>
                </div>
                <div class="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded whitespace-nowrap group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors">${item.exchange}</div>
            </div>
        </div>
    `}).join('');
    container.classList.remove('hidden');
}