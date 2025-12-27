/**
 * API Module
 * ==========
 * Datenabruf mit mehrstufigem Fallback für Fonds.
 */

// Mehr Proxies für höhere Zuverlässigkeit
const PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest='
];

const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

async function fetchViaProxy(targetUrl) {
    let lastError = null;
    for (const proxyBase of PROXIES) {
        try {
            const requestUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
            // Timeout etwas erhöht für langsame Fonds-Daten
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(requestUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            const text = await response.text();
            if(!text || text.trim().length === 0) throw new Error("Leere Antwort");
            
            try {
                return JSON.parse(text);
            } catch(e) {
                throw new Error("Kein JSON");
            }
        } catch (error) {
            lastError = error; 
        }
    }
    throw lastError || new Error('Alle Proxies fehlgeschlagen');
}

/**
 * Holt Chart-Daten mit aggressiverem Fallback für Fonds.
 */
export async function fetchChartData(symbol, range = '1y', interval = '1d') {
    try {
        // 1. Versuch: Exakt was angefordert wurde (z.B. 1d/5m)
        return await tryFetch(symbol, range, interval);
    } catch (error) {
        // Wenn kein Intraday (1d, 5d) möglich ist -> Fallback
        if (interval !== '1d' && interval !== '1wk' && interval !== '1mo') {
            try {
                // 2. Fallback: 5 Tage Daily (Standard-Fallback)
                return await tryFetch(symbol, '5d', '1d'); 
            } catch (fallbackError) {
                try {
                    // 3. Notfall-Fallback: 1 Monat Daily (Fonds haben oft Datenlücken)
                    return await tryFetch(symbol, '1mo', '1d');
                } catch(finalErr) {
                    console.error(`Alle Versuche gescheitert für ${symbol}`);
                    return null;
                }
            }
        }
        return null;
    }
}

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
        
        return data.quotes
            .filter(q => q.isYahooFinance) // Filter gelockert, um mehr Fonds zu finden
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                type: q.quoteType || 'UNKNOWN',
                exchange: q.exchange
            }));
    } catch (error) {
        console.error("Suchfehler:", error);
        return [];
    }
}