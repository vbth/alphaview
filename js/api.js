/**
 * API Module
 * Handles network requests with Multi-Proxy Failover strategy.
 */

// Liste von CORS Proxies nach Priorität
const PROXIES = [
    'https://corsproxy.io/?',              // Stabil, schnell
    'https://api.allorigins.win/raw?url=', // Guter Fallback
    // 'https://thingproxy.freeboard.io/fetch/' // Notfall-Option (langsam)
];

const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

/**
 * Versucht eine URL über verschiedene Proxies abzurufen.
 */
async function fetchViaProxy(targetUrl) {
    let lastError = null;

    for (const proxyBase of PROXIES) {
        try {
            // URL zusammenbauen
            const requestUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
            // console.log(`Attempting via: ${proxyBase}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s Timeout pro Proxy

            const response = await fetch(requestUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Status ${response.status}`);
            }

            const data = await response.json();
            return data; // Erfolg!

        } catch (error) {
            // console.warn(`Proxy failed: ${proxyBase}`, error);
            lastError = error;
            // Loop läuft weiter zum nächsten Proxy
        }
    }
    
    // Wenn wir hier ankommen, haben alle Proxies versagt
    throw lastError || new Error('All proxies failed');
}

/**
 * Holt Historische Daten.
 */
export async function fetchChartData(symbol, range = '1y', interval = '1d') {
    try {
        const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
        
        const data = await fetchViaProxy(targetUrl);

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('Invalid Data Structure from Yahoo');
        }

        return data.chart.result[0];

    } catch (error) {
        console.error(`Fetch Chart Data Failed for ${symbol}:`, error);
        return null;
    }
}

/**
 * Sucht nach Symbolen.
 */
export async function searchSymbol(query) {
    if (!query || query.length < 1) return [];

    try {
        const targetUrl = `${BASE_URL_SEARCH}?q=${query}&quotesCount=5&newsCount=0`;
        
        const data = await fetchViaProxy(targetUrl);

        if (!data.quotes) return [];

        return data.quotes
            .filter(q => q.isYahooFinance)
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname,
                type: q.quoteType,
                exchange: q.exchange
            }));

    } catch (error) {
        console.error('Search Failed:', error);
        return [];
    }
}