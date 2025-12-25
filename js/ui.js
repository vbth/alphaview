/**
 * UI Module
 * Handles DOM rendering for Dashboard and Search.
 */

// Format Helpers
const formatMoney = (val, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);
const formatPercent = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

/**
 * Rendert das Hauptgerüst (Suchleiste + Grid Container)
 */
export function renderAppSkeleton(container) {
    container.innerHTML = `
        <!-- Search Section -->
        <div class="mb-8 relative max-w-xl mx-auto">
            <div class="relative">
                <input type="text" id="search-input" 
                    class="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg pl-12 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="Symbol suchen (z.B. MSFT, TSLA, BTC-USD)..." autocomplete="off">
                <i class="fa-solid fa-magnifying-glass absolute left-4 top-3.5 text-slate-400"></i>
                <div id="search-spinner" class="hidden absolute right-4 top-3.5">
                    <i class="fa-solid fa-circle-notch fa-spin text-primary"></i>
                </div>
            </div>
            <!-- Search Results Dropdown -->
            <div id="search-results" class="hidden absolute w-full bg-white dark:bg-slate-800 mt-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden max-h-80 overflow-y-auto"></div>
        </div>

        <!-- Dashboard Grid -->
        <div id="dashboard-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Cards will be injected here -->
        </div>
        
        <!-- Empty State (hidden by default) -->
        <div id="empty-state" class="hidden text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <i class="fa-solid fa-layer-group text-slate-400 text-2xl"></i>
            </div>
            <h3 class="text-lg font-medium text-slate-900 dark:text-white">Watchlist leer</h3>
            <p class="text-slate-500 max-w-sm mx-auto mt-2">Suche oben nach Symbolen, um dein Dashboard aufzubauen.</p>
        </div>
    `;
}

/**
 * Rendert eine einzelne Aktien-Karte (HTML String)
 */
export function createStockCardHTML(data) {
    const isUp = data.change >= 0;
    const colorClass = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const trendIcon = data.trend === 'bullish' ? 'fa-arrow-trend-up' : (data.trend === 'bearish' ? 'fa-arrow-trend-down' : 'fa-minus');
    const trendColor = data.trend === 'bullish' ? 'text-green-500' : (data.trend === 'bearish' ? 'text-red-500' : 'text-yellow-500');

    return `
        <div class="stock-card group relative bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary/50 dark:hover:border-neon-accent/50 transition-all duration-300 cursor-pointer overflow-hidden" data-symbol="${data.symbol}">
            
            <!-- Remove Button (Top Right) -->
            <button class="delete-btn absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10" data-symbol="${data.symbol}" title="Entfernen">
                <i class="fa-solid fa-times"></i>
            </button>

            <div class="p-5">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight">${data.symbol}</h3>
                        <div class="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                            <span class="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${data.currency}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                            ${formatMoney(data.price, data.currency)}
                        </div>
                        <div class="text-sm font-medium font-mono ${colorClass}">
                            ${formatPercent(data.changePercent)}
                        </div>
                    </div>
                </div>

                <!-- Mini Metrics -->
                <div class="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <i class="fa-solid ${trendIcon} ${trendColor} text-xs"></i>
                        </div>
                        <div class="text-xs">
                            <div class="text-slate-500">Trend</div>
                            <div class="font-medium dark:text-slate-300 capitalize">${data.trend}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <i class="fa-solid fa-bolt text-slate-400 text-xs"></i>
                        </div>
                        <div class="text-xs">
                            <div class="text-slate-500">Volatilität</div>
                            <div class="font-medium dark:text-slate-300 font-mono">${data.volatility.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Decoration Line -->
            <div class="h-1 w-full ${isUp ? 'bg-green-500' : 'bg-red-500'}"></div>
        </div>
    `;
}

/**
 * Rendert Suchergebnisse
 */
export function renderSearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = `<div class="p-4 text-sm text-slate-500 text-center">Keine Ergebnisse gefunden</div>`;
        container.classList.remove('hidden');
        return;
    }

    container.innerHTML = results.map(item => `
        <div class="search-item px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors" data-symbol="${item.symbol}">
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-bold text-slate-900 dark:text-white text-sm">${item.symbol}</div>
                    <div class="text-xs text-slate-500 truncate max-w-[200px]">${item.name}</div>
                </div>
                <div class="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded">
                    ${item.exchange}
                </div>
            </div>
        </div>
    `).join('');
    
    container.classList.remove('hidden');
}