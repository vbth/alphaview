/**
 * API Module
 * ==========
 * Kümmert sich um den Datenabruf via CORS Proxies.
 * FIX: Fallback für Fonds/Indizes, die keine Intraday-Daten haben.
 */

const PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url='
];

const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

async function fetchViaProxy(targetUrl) {
    let lastError = null;
    for (const proxyBase of PROXIES) {
        try {
            const requestUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(requestUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            const text = await response.text();
            if(!text) throw new Error("Leere Antwort");
            
            return JSON.parse(text);
        } catch (error) {
            lastError = error; 
        }
    }
    throw lastError || new Error('Alle Proxies nicht erreichbar');
}

/**
 * Holt Chart-Daten.
 * Mit eingebautem Fallback: Wenn Intraday (z.B. 5m) fehlschlägt,
 * probieren wir es mit Daily (1d), da Fonds oft keine Intraday-Daten haben.
 */
export async function fetchChartData(symbol, range = '1y', interval = '1d') {
    // 1. Erster Versuch: Mit den gewünschten Parametern
    try {
        const data = await tryFetch(symbol, range, interval);
        return data;
    } catch (error) {
        // 2. Fallback: Wenn wir Intraday wollten (z.B. 1d/5m), aber es fehlschlug,
        // probieren wir es mit '5d' und '1d', um zumindest Tageskurse zu bekommen.
        if (interval !== '1d' && interval !== '1wk' && interval !== '1mo') {
            // console.log(`Fallback für ${symbol}: Versuche Daily-Daten...`);
            try {
                // Wir nehmen '5d' als Range, damit wir sicher ein paar Kerzen für den Chart haben
                return await tryFetch(symbol, '5d', '1d'); 
            } catch (fallbackError) {
                // console.error(`Auch Fallback gescheitert für ${symbol}`);
                return null;
            }
        }
        
        console.error(`Fehler beim Abruf von ${symbol}:`, error);
        return null;
    }
}

/**
 * Hilfsfunktion für den eigentlichen Request
 */
async function tryFetch(symbol, range, interval) {
    const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
    const data = await fetchViaProxy(targetUrl);

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('Ungültige Datenstruktur');
    }
    return data.chart.result[0];
}

export async function searchSymbol(query) {
    if (!query || query.length < 1) return [];
    try {
        const targetUrl = `${BASE_URL_SEARCH}?q=${query}&quotesCount=10&newsCount=0`;
        const data = await fetchViaProxy(targetUrl);
        if (!data.quotes) return [];
        
        // Wir lassen alle gängigen Typen zu
        return data.quotes
            .filter(q => q.isYahooFinance && ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY', 'CURRENCY', 'FUTURE', 'OPTION'].includes(q.quoteType))
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