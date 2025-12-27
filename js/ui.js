/**
 * UI Module
 * Final Layout: Unified Toolbar (Wrap), Search removed from Body.
 */
export const formatMoney = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

const formatPercent = (val) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2).replace('.', ',')}%`;
};

export function updateSortUI(activeField, direction) {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const icon = btn.querySelector('i');
        const field = btn.dataset.sort;
        
        btn.className = 'sort-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm';
        icon.className = 'fa-solid fa-sort text-slate-300 ml-1 pointer-events-none';

        if (field === activeField) {
            btn.className = 'sort-btn px-3 py-1.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-600 text-primary dark:text-white transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm';
            if (direction === 'asc') icon.className = 'fa-solid fa-arrow-up-long ml-1 pointer-events-none';
            else icon.className = 'fa-solid fa-arrow-down-long ml-1 pointer-events-none';
        }
    });
}

export function renderAppSkeleton(container) {
    container.innerHTML = `
        <!-- HEADER STATS -->
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

        <!-- UNIFIED TOOLBAR (Wrap on Mobile) -->
        <div class="mb-8 flex justify-center">
            <div class="flex flex-wrap justify-center bg-white dark:bg-dark-surface p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm gap-1" id="dashboard-range-controls">
                
                <!-- TIME -->
                <button data-range="1d" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-600 text-primary dark:text-white transition-all">1T</button>
                <button data-range="1W" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1W</button>
                <button data-range="1mo" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1M</button>
                <button data-range="6mo" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">6M</button>
                <button data-range="1y" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1J</button>
                <button data-range="5y" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">5J</button>
                <button data-range="max" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">MAX</button>

                <!-- DIVIDER -->
                <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
                <div class="w-full h-px bg-slate-200 dark:bg-slate-700 my-1 md:hidden"></div> <!-- Mobile Divider -->

                <!-- SORT -->
                <button class="sort-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1" data-sort="name">Name <i class="fa-solid fa-sort text-slate-300 ml-1 pointer-events-none"></i></button>
                <button class="sort-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1" data-sort="value">Wert <i class="fa-solid fa-sort text-slate-300 ml-1 pointer-events-none"></i></button>
                <button class="sort-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1" data-sort="percent">Anteil <i class="fa-solid fa-sort text-slate-300 ml-1 pointer-events-none"></i></button>
                <button class="sort-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1" data-sort="performance">Perf <i class="fa-solid fa-sort text-slate-300 ml-1 pointer-events-none"></i></button>
            </div>
        </div>

        <div id="dashboard-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        
        <div id="empty-state" class="hidden text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4"><i class="fa-solid fa-layer-group text-slate-400 text-2xl"></i></div>
            <h3 class="text-lg font-medium text-slate-900 dark:text-white">Watchlist leer</h3>
            <p class="text-slate-500 max-w-sm mx-auto mt-2">Suche oben nach Wertpapieren.</p>
        </div>
    `;
}

export function createStockCardHTML(data, qty, url, extraUrl, totalPortfolioValueEUR, eurUsdRate) {
    // 1. TYP MAPPING FÜR BADGES
    const typeStyles = {
        'EQUITY': { label: 'AKTIE', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-800' },
        'ETF': { label: 'ETF', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-800' },
        'MUTUALFUND': { label: 'FONDS', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-200 dark:border-orange-800' },
        'CRYPTOCURRENCY': { label: 'KRYPTO', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800' },
        'INDEX': { label: 'INDEX', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600' }
    };
    const tStyle = typeStyles[data.type] || { label: data.type || 'OTHER', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };

    const isUp = data.change >= 0;
    const colorClass = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const trendIcon = data.trend === 'bullish' ? 'fa-arrow-trend-up' : (data.trend === 'bearish' ? 'fa-arrow-trend-down' : 'fa-minus');
    const positionValueNative = data.price * qty;
    let positionValueEUR = positionValueNative;
    if (data.currency === 'USD') positionValueEUR = positionValueNative / eurUsdRate;
    const weightPercent = totalPortfolioValueEUR > 0 ? (positionValueEUR / totalPortfolioValueEUR) * 100 : 0;
    const safeUrl = url || '';
    const safeExtraUrl = extraUrl || '';

    let extraIcon = 'fa-newspaper'; 
    let extraPlaceholder = 'News-Link...';
    if (data.type === 'ETF' || data.type === 'MUTUALFUND') {
        extraIcon = 'fa-list-check'; 
        extraPlaceholder = 'Holdings-Link...';
    }

    return `
        <div class="stock-card group relative bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary/50 dark:hover:border-neon-accent/50 transition-all duration-300 cursor-pointer overflow-hidden" data-symbol="${data.symbol}">
            <div class="p-5">
                <div class="flex justify-between items-start mb-4 gap-4">
                    <div class="flex-grow min-w-0 pr-2"> 
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate" title="${data.name}">${data.name}</h3>
                        
                        <!-- 2. NEUER HEADER MIT BADGE -->
                        <div class="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                            <span class="${tStyle.color} px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wide">${tStyle.label}</span>
                            <span class="font-bold text-slate-700 dark:text-slate-300 ml-1">${data.symbol}</span>
                            <span class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">${data.currency}</span>
                        </div>
                    </div>
                    <div class="text-right whitespace-nowrap pt-1 ml-auto">
                        <div class="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">${formatMoney(data.price, data.currency)}</div>
                        <div class="text-sm font-medium font-mono ${colorClass}">${formatPercent(data.changePercent)}</div>
                    </div>
                </div>
                <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-100 dark:border-slate-700" onclick="event.stopPropagation()">
                    <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-chart-pie text-slate-400 text-xs"></i>
                            <!-- 3. KEIN PLUS MEHR VOR DEM PROZENTWERT -->
                            <div class="text-xs font-mono text-slate-500 dark:text-slate-300">${weightPercent.toFixed(2).replace('.', ',')}%</div>
                        </div>
                        <div class="font-mono font-bold text-slate-900 dark:text-white text-right">
                            ${formatMoney(positionValueNative, data.currency)}
                        </div>
                    </div>
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-layer-group text-slate-400 text-xs"></i>
                            <!-- 4. MENGE -> STÜCKZAHL GEÄNDERT -->
                            <label class="text-xs text-slate-600 dark:text-slate-400">Stückzahl</label>
                        </div>
                        <input type="number" min="0" step="any" class="qty-input w-24 text-right text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none" value="${qty}" data-symbol="${data.symbol}" placeholder="0">
                    </div>
                    <div class="flex items-center gap-2 pt-1">
                        <i class="fa-solid fa-link text-slate-400 text-xs"></i>
                        <input type="text" class="url-input w-full text-xs bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 placeholder-slate-400" value="${safeUrl}" data-symbol="${data.symbol}" placeholder="Info-Link einfügen">
                        ${safeUrl ? `<a href="${safeUrl}" target="_blank" class="text-primary hover:text-blue-600" title="Öffnen"><i class="fa-solid fa-external-link-alt text-xs"></i></a>` : ''}
                    </div>
                    <div class="flex items-center gap-2 pt-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                        <i class="fa-solid ${extraIcon} text-slate-400 text-xs w-4 text-center"></i>
                        <input type="text" class="extra-url-input w-full text-xs bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 placeholder-slate-400" value="${safeExtraUrl}" data-symbol="${data.symbol}" placeholder="${extraPlaceholder}">
                        ${safeExtraUrl ? `<a href="${safeExtraUrl}" target="_blank" class="text-primary hover:text-blue-600" title="Details"><i class="fa-solid fa-external-link-alt text-xs"></i></a>` : ''}
                    </div>
                </div>
                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-4 border-t border-slate-50 dark:border-slate-800 pt-3">
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1"><i class="fa-solid ${trendIcon}"></i> ${data.trend}</div>
                        <span class="text-slate-300 dark:text-slate-600">•</span>
                        <div>Volatilität ${data.volatility.toFixed(1)}%</div>
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