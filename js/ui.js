/**
 * Modul: UI
 * =========
 * Verwaltet HTML-Rendering, Formatierung und UI-Updates.
 */
import { ASSET_TYPES, DEFAULT_ASSET_STYLE } from './config.js';

/**
 * Formatiert Geldbeträge lokalisiert.
 * Nutzt Intl.NumberFormat für korrekte Währungsdarstellung.
 * @param {number} val - Der Betrag.
 * @param {string} currency - Die Währung ('EUR' oder andere).
 * @returns {string} Formatierter String.
 */
export const formatMoney = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

/**
 * Formatiert Prozentwerte mit Vorzeichen und zwei Dezimalstellen.
 * @param {number} val - Der Prozentwert (z.B. 12.345).
 * @returns {string} Formatierter String (z.B. "+12,35%").
 */
const formatPercent = (val) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2).replace('.', ',')}%`;
};

/**
 * Aktualisiert den visuellen Zustand der Sortier-Buttons im Header.
 * Hebt das aktive Sortierfeld und die Richtung (Auf/Ab) hervor.
 * @param {string} activeField - Das aktuell sortierte Feld (z.B. 'value').
 * @param {string} direction - Die Sortierrichtung ('asc' oder 'desc').
 */
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

/**
 * Erzeugt das HTML-Grundgerüst für die App (Header, Stats, Toolbar, Grid).
 * Wird einmalig beim Start in das Root-Element injiziert.
 * @param {HTMLElement} container - Das Ziel-Element (i.d.R. #app-root).
 */
export function renderAppSkeleton(container) {
    container.innerHTML = `
        <!-- HEADER STATISTIKEN -->
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

        <!-- TOOLBAR (Mobil-Optimiert) -->
        <div class="mb-8 flex justify-center">
            <div class="flex flex-wrap justify-center bg-white dark:bg-dark-surface p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm gap-1" id="dashboard-range-controls">
                
                <!-- ZEITRAUM -->
                <button data-range="1d" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-600 text-primary dark:text-white transition-all">1T</button>
                <button data-range="1W" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1W</button>
                <button data-range="1mo" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1M</button>
                <button data-range="6mo" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">6M</button>
                <button data-range="1y" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">1J</button>
                <button data-range="5y" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">5J</button>
                <button data-range="max" class="dash-range-btn px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">MAX</button>

                <!-- TRENNER -->
                <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
                <div class="w-full h-px bg-slate-200 dark:bg-slate-700 my-1 md:hidden"></div> <!-- Mobile Divider -->

                <!-- SORTIERUNG -->
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

/**
 * Erstellt das HTML für eine einzelne Aktien-Karte (Stock Card).
 * Berechnet Positionswerte und Gewichtung für die Anzeige.
 * @param {Object} data - Das Analysedaten-Objekt des Assets.
 * @param {number} qty - Die gehaltene Stückzahl.
 * @param {string} url - Benutzerdefinierter Info-Link.
 * @param {string} extraUrl - Zweiter Benutzer-Link.
 * @param {number} totalPortfolioValueEUR - Gesamtwert des Portfolios (für %-Anteil).
 * @param {number} eurUsdRate - Aktueller EUR/USD Wechselkurs.
 * @returns {string} Der HTML-String der Karte.
 */
export function createStockCardHTML(data, qty, url, extraUrl, totalPortfolioValueEUR, eurUsdRate) {
    const isUp = data.change >= 0;
    const positionValueNative = data.price * qty;
    let positionValueEUR = (data.currency === 'USD') ? positionValueNative / eurUsdRate : positionValueNative;
    const weightPercent = totalPortfolioValueEUR > 0 ? (positionValueEUR / totalPortfolioValueEUR) * 100 : 0;

    return `
        <div class="stock-card group relative bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-primary/50 dark:hover:border-neon-accent/50 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full" data-symbol="${data.symbol}">
            <div class="p-5 flex flex-col flex-grow">
                ${renderCardHeader(data)}
                ${renderCardInfoBox(data, qty, url, extraUrl, positionValueNative, weightPercent)}
                ${renderCardFooter(data, isUp)}
            </div>
            <div class="h-1 w-full ${isUp ? 'bg-green-500' : 'bg-red-500'}"></div>
        </div>
    `;
}

/**
 * Interne Hilfsfunktion: Rendert den Kopfbereich einer Karte (Name, Symbol, Preis).
 * Wählt Badge-Farben basierend auf dem Asset-Typ.
 * @param {Object} data - Asset-Daten.
 * @returns {string} HTML-String.
 */
function renderCardHeader(data) {
    const rawStyle = ASSET_TYPES[data.type] || DEFAULT_ASSET_STYLE;
    // Fallback falls Label/Farbe fehlt
    const tStyle = {
        label: rawStyle.label || data.type || 'OTHER',
        color: rawStyle.color || DEFAULT_ASSET_STYLE.color
    };

    const colorClass = data.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

    // MarketWatch Link für Recherche
    const safeSymbol = data.symbol.split('.')[0].toLowerCase();
    const mwUrl = (data.type === 'ETF' || data.type === 'MUTUALFUND')
        ? `https://www.marketwatch.com/investing/fund/${safeSymbol}`
        : `https://www.marketwatch.com/investing/stock/${safeSymbol}`;

    // Index-Spezialbehandlung: Keine Währung, Keine Nachkommastellen
    let priceDisplay;
    if (data.type === 'INDEX') {
        priceDisplay = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(data.price);
    } else {
        priceDisplay = formatMoney(data.price, data.currency);
    }

    return `
        <div class="flex justify-between items-start mb-4 gap-4">
            <div class="flex-grow min-w-0 pr-2"> 
                <h3 class="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate" title="${data.name}">${data.name}</h3>
                <div class="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                    <span class="${tStyle.color} px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wide">${tStyle.label}</span>
                    <span class="font-bold text-slate-700 dark:text-slate-300 ml-1">${data.symbol}</span>
                    <a href="${mwUrl}" target="_blank" class="ml-1 text-slate-400 hover:text-primary transition-colors" title="MarketWatch Research">
                        <i class="fa-solid fa-microchip text-[10px]"></i>
                    </a>
                </div>
            </div>
            <div class="text-right whitespace-nowrap pt-1 ml-auto">
                <div class="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">${priceDisplay}</div>
                <div class="text-sm font-medium font-mono ${colorClass}">${formatPercent(data.changePercent)}</div>
            </div>
        </div>
    `;
}

/**
 * Interne Hilfsfunktion: Rendert den mittleren Info-Bereich (Inputs, Links, Werte).
 * Enthält Eingabefelder für Stückzahl und URLs.
 * @param {Object} data - Asset-Daten.
 * @param {number} qty - Stückzahl.
 * @param {string} url - Link 1.
 * @param {string} extraUrl - Link 2.
 * @param {number} positionValueNative - Wert in Originalwährung.
 * @param {number} weightPercent - Anteil am Portfolio in %.
 * @returns {string} HTML-String.
 */
function renderCardInfoBox(data, qty, url, extraUrl, positionValueNative, weightPercent) {
    let extraIcon = 'fa-newspaper';
    let extraPlaceholder = 'News-Link...';
    if (data.type === 'ETF' || data.type === 'MUTUALFUND') {
        extraIcon = 'fa-list-check';
        extraPlaceholder = 'Holdings-Link...';
    }

    const isIndex = data.type === 'INDEX';

    // Für Indizes blenden wir Kurswert und Stückzahl aus
    const valueRow = isIndex ? '' : `
        <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-coins text-slate-400 text-xs"></i>
                <label class="text-xs text-slate-500">Kurswert</label>
            </div>
            <div class="font-mono font-bold text-slate-900 dark:text-white text-right">
                ${formatMoney(positionValueNative, data.currency)}
            </div>
        </div>`;

    const qtyRow = isIndex ? '' : `
        <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-layer-group text-slate-400 text-xs"></i>
                <label class="text-xs text-slate-600 dark:text-slate-400">Stückzahl</label>
                <span class="ml-1 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                    ${weightPercent.toFixed(2).replace('.', ',')}%
                </span>
            </div>
            <input type="number" min="0" step="any" class="qty-input dashboard-action w-24 text-right text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-primary outline-none" value="${qty}" data-symbol="${data.symbol}" data-action="qty" placeholder="0">
        </div>`;

    return `
        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-100 dark:border-slate-700" onclick="event.stopPropagation()">
            ${valueRow}
            ${qtyRow}

            <div class="flex items-center gap-2 pt-1">
                <i class="fa-solid fa-link text-slate-400 text-xs"></i>
                <input type="text" class="url-input dashboard-action w-full text-xs bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 placeholder-slate-400" value="${url || ''}" data-symbol="${data.symbol}" data-action="url" placeholder="Info-Link">
                ${url ? `<a href="${url}" target="_blank" class="text-primary hover:text-blue-600" title="Öffnen"><i class="fa-solid fa-external-link-alt text-xs"></i></a>` : ''}
            </div>

            <div class="flex items-center gap-2 pt-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                <i class="fa-solid ${extraIcon} text-slate-400 text-xs w-4 text-center"></i>
                <input type="text" class="extra-url-input dashboard-action w-full text-xs bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 placeholder-slate-400" value="${extraUrl || ''}" data-symbol="${data.symbol}" data-action="extraUrl" placeholder="${extraPlaceholder}">
                ${extraUrl ? `<a href="${extraUrl}" target="_blank" class="text-primary hover:text-blue-600" title="Details"><i class="fa-solid fa-external-link-alt text-xs"></i></a>` : ''}
            </div>
        </div>
    `;
}

/**
 * Interne Hilfsfunktion: Rendert den Fußbereich der Karte (Trend, Volatilität, Löschen).
 * @param {Object} data - Asset-Daten.
 * @param {boolean} isUp - Ob die Gesamtperformance positiv ist.
 * @returns {string} HTML-String.
 */
function renderCardFooter(data, isUp) {
    const trendIcon = data.trend === 'bullish' ? 'fa-arrow-trend-up' : (data.trend === 'bearish' ? 'fa-arrow-trend-down' : 'fa-minus');
    return `
        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-auto border-t border-slate-50 dark:border-slate-800 pt-3">
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1"><i class="fa-solid ${trendIcon}"></i> ${data.trend}</div>
                <span class="text-slate-300 dark:text-slate-600">•</span>
                <div>Volatilität ${data.volatility.toFixed(1)}%</div>
            </div>
            <button type="button" class="delete-btn dashboard-action text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" data-symbol="${data.symbol}" data-action="delete" title="Entfernen">
                <i class="fa-solid fa-trash-can"></i> Entfernen
            </button>
        </div>
    `;
}

/**
 * Erzeugt eine Fehler-Karte für Assets, die nicht geladen werden konnten.
 * Erlaubt das Löschen des fehlerhaften Eintrags.
 * @param {string} symbol - Das Symbol, das Fehler verursacht hat.
 * @param {string} msg - Die Fehlermeldung.
 * @returns {string} HTML-String.
 */
export function createErrorCardHTML(symbol, msg) {
    return `
        <div class="stock-card relative bg-red-50 dark:bg-red-900/10 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-5 flex flex-col justify-between" data-symbol="${symbol}" style="min-height: 200px;">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-bold text-red-700 dark:text-red-400 tracking-tight">${symbol}</h3>
                    <i class="fa-solid fa-triangle-exclamation text-red-400"></i>
                </div>
                <p class="text-xs text-red-600 dark:text-red-300">Datenabruf fehlgeschlagen.</p>
                <div class="text-[10px] font-mono mt-1 text-red-400 break-words">${msg || 'Timeout / Network Error'}</div>
            </div>
            <div class="mt-4 border-t border-red-100 dark:border-red-800/50 pt-3 flex justify-between items-end">
                 <button type="button" class="delete-btn dashboard-action text-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5 px-2 py-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-xs" data-symbol="${symbol}" data-action="delete">
                    <i class="fa-solid fa-trash-can"></i> Entfernen
                </button>
                <a href="https://finance.yahoo.com/quote/${symbol}" target="_blank" class="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                    Check YF <i class="fa-solid fa-external-link-alt"></i>
                </a>
            </div>
        </div>
    `;
}

/**
 * Rendert die Suchergebnisse in das Dropdown-Menü.
 * Erzeugt HTML für jeden Treffer oder eine "Keine Ergebnisse"-Meldung.
 * @param {Array} results - Liste der gefundenen Assets.
 * @param {HTMLElement} container - Der Ziel-Container für das HTML.
 */
export function renderSearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = `<div class="p-4 text-sm text-slate-500 text-center">Keine Ergebnisse.</div>`;
        container.classList.remove('hidden');
        return;
    }
    container.innerHTML = results.map(item => {
        const rawStyle = ASSET_TYPES[item.type] || DEFAULT_ASSET_STYLE;
        const badge = {
            label: rawStyle.label || item.type || 'OTHER',
            color: rawStyle.color || DEFAULT_ASSET_STYLE.color
        };

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