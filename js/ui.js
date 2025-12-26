/**
 * UI Module
 * Enhanced Search Results
 */

export const formatMoney = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

const formatPercent = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

export function renderAppSkeleton(container) {
    container.innerHTML = `
        <!-- PORTFOLIO HEADER -->
        <div id="portfolio-summary" class="hidden mb-8 bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gesamtdepotwert</h2>
                <div class="text-3xl font-bold text-slate-900 dark:text-white mt-1" id="total-balance">---</div>
            </div>
            <div class="text-right">
                <div class="text-xs text-slate-500">Positionen</div>
                <div class="text-xl font-mono font-medium dark:text-slate-200" id="total-positions">0</div>
            </div>
        </div>

        <!-- SEARCH -->
        <div class="mb-8 relative max-w-xl mx-auto">
            <div class="relative">
                <!-- Hinweis im Placeholder bzgl. WKN -->
                <input type="text" id="search-input" 
                    class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg pl-12 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-primary outline-none" 
                    placeholder="Suche Name, Symbol oder ISIN (Keine WKN)..." autocomplete="off">
                <i class="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400"></i>
                <div id="search-spinner" class="hidden absolute right-4 top-3.5"><i class="fa-solid fa-circle-notch fa-spin text-primary"></i></div>
            </div>
            <div id="search-results" class="hidden absolute w-full bg-white dark:bg-slate-800 mt-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden max-h-80 overflow-y-auto"></div>
        </div>

        <!-- GRID -->
        <div id="dashboard-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        
        <!-- EMPTY STATE -->
        <div id="empty-state" class="hidden text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4"><i class="fa-solid fa-layer-group text-slate-400 text-2xl"></i></div>
            <h3 class="text-lg font-medium text-slate-900 dark:text-white">Watchlist leer</h3>
            <p class="text-slate-500 max-w-sm mx-auto mt-2">Suche nach Firmennamen oder ETFs (z.B. "Vanguard").</p>
        </div>
    `;
}

export function createStockCardHTML(data, qty, totalPortfolioValue) {
    const isUp = data.change >= 0;
    const colorClass = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const trendIcon = data.trend === 'bullish' ? 'fa-arrow-trend-up' : (data.trend === 'bearish' ? 'fa-arrow-trend-down' : 'fa-minus');
    const positionValue = data.price * qty;
    const weightPercent = totalPortfolioValue > 0 ? (positionValue / totalPortfolioValue) * 100 : 0;

    return `
        <div class="stock-card group relative bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary/50 dark:hover:border-neon-accent/50 transition-all duration-300 cursor-pointer overflow-hidden" data-symbol="${data.symbol}">
            <button class="delete-btn absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10" data-symbol="${data.symbol}"><i class="fa-solid fa-times"></i></button>

            <div class="p-5">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">${data.symbol}</h3>
                        <div class="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                            <span class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${data.currency}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">${formatMoney(data.price, data.currency)}</div>
                        <div class="text-sm font-medium font-mono ${colorClass}">${formatPercent(data.changePercent)}</div>
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-100 dark:border-slate-700" onclick="event.stopPropagation()">
                    <div class="flex justify-between items-center mb-2">
                        <label class="text-xs text-slate-500 uppercase font-semibold">Menge</label>
                        <input type="number" min="0" step="any" class="qty-input w-20 text-right text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none" value="${qty}" data-symbol="${data.symbol}" placeholder="0">
                    </div>
                    <div class="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2">
                        <div class="text-xs text-slate-500">Wert</div>
                        <div class="font-mono font-bold text-slate-900 dark:text-white">${formatMoney(positionValue, data.currency)}</div>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <div class="text-xs text-slate-500">Anteil</div>
                        <div class="text-xs font-mono text-slate-400">${weightPercent.toFixed(1)}%</div>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div class="flex items-center gap-1"><i class="fa-solid ${trendIcon}"></i> ${data.trend}</div>
                    <div>Vol: ${data.volatility.toFixed(1)}%</div>
                </div>
            </div>
            <div class="h-1 w-full ${isUp ? 'bg-green-500' : 'bg-red-500'}"></div>
        </div>
    `;
}

// Map für schöne Typ-Anzeige in der Suche
const TYPE_BADGES = {
    'EQUITY': { label: 'AKTIE', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    'ETF': { label: 'ETF', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    'MUTUALFUND': { label: 'FONDS', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    'CRYPTOCURRENCY': { label: 'KRYPTO', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    'INDEX': { label: 'INDEX', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' }
};

export function renderSearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = `<div class="p-4 text-sm text-slate-500 text-center">Keine Ergebnisse. Versuche den Namen (z.B. "Vanguard").</div>`;
        container.classList.remove('hidden');
        return;
    }

    container.innerHTML = results.map(item => {
        const badge = TYPE_BADGES[item.type] || { label: item.type, color: 'bg-slate-100 text-slate-600' };
        
        return `
        <div class="search-item px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors group" data-symbol="${item.symbol}">
            <div class="flex justify-between items-center">
                <div class="flex-grow min-w-0 mr-4">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">${item.symbol}</span>
                        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}">${badge.label}</span>
                    </div>
                    <div class="text-xs text-slate-500 truncate" title="${item.name}">${item.name}</div>
                </div>
                <div class="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded whitespace-nowrap group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors">
                    ${item.exchange}
                </div>
            </div>
        </div>
    `}).join('');
    
    container.classList.remove('hidden');
}