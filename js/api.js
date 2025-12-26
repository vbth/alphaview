/**
 * API Module
 * ==========
 * Kümmert sich um den Datenabruf.
 * - Nutzt CORS-Proxies, um Yahoo Finance Daten im Browser abzurufen.
 * - Implementiert Timeouts, damit die App nicht hängen bleibt.
 */

// Liste von Proxies, falls einer ausfällt
const PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url='
];

// Yahoo Finance Endpunkte
const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

/**
 * Helfer: Versucht eine URL über verschiedene Proxies abzurufen.
 */
async function fetchViaProxy(targetUrl) {
    let lastError = null;
    
    // Probiere jeden Proxy nacheinander
    for (const proxyBase of PROXIES) {
        try {
            const requestUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
            
            // Timeout Controller (bricht nach 8 Sek ab)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(requestUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            // Text holen und parsen (sicherer als direkt .json())
            const text = await response.text();
            if(!text) throw new Error("Leere Antwort");
            
            return JSON.parse(text);
        } catch (error) {
            lastError = error; // Fehler merken und nächsten Proxy versuchen
        }
    }
    // Wenn alle Proxies fehlschlagen
    throw lastError || new Error('Alle Proxies nicht erreichbar');
}

/**
 * Holt Chart-Daten für ein Symbol.
 * @param {string} symbol - Ticker (z.B. AAPL)
 * @param {string} range - Zeitraum (1d, 5d, 1mo...)
 * @param {string} interval - Intervall (1m, 15m, 1d...)
 */
export async function fetchChartData(symbol, range = '1y', interval = '1d') {
    try {
        const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
        const data = await fetchViaProxy(targetUrl);

        // Validierung der Yahoo-Datenstruktur
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('Ungültige Datenstruktur');
        }
        return data.chart.result[0];
    } catch (error) {
        console.error(`Fehler beim Abruf von ${symbol}:`, error);
        return null;
    }
}

/**
 * Sucht nach Symbolen (Autocomplete).
 */
export async function searchSymbol(query) {
    if (!query || query.length < 1) return [];
    try {
        const targetUrl = `${BASE_URL_SEARCH}?q=${query}&quotesCount=10&newsCount=0`;
        const data = await fetchViaProxy(targetUrl);
        if (!data.quotes) return [];
        
        // Filtert irrelevante Ergebnisse raus
        return data.quotes
            .filter(q => q.isYahooFinance && ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY', 'CURRENCY'].includes(q.quoteType))
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname,
                type: q.quoteType,
                exchange: q.exchange
            }));
    } catch (error) {
        console.error("Suchfehler:", error);
        return [];
    }
}