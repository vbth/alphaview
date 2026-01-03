/**
 * Modul: API
 * ==========
 * Verwaltet Datenabrufe von Yahoo Finance über verschiedene Proxies.
 * Implementiert Fallback-Strategien für maximale Zuverlässigkeit bei Fonds/ETFs.
 */

// Liste von CORS-Proxies für höhere Ausfallsicherheit
const PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest='
];

const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

/**
 * Führt einen HTTP-Request über eine Liste von Proxies aus.
 * Versucht sequenziell, die URL über jeden definierten Proxy abzurufen,
 * bis ein erfolgreicher Request (Status 200 + gültiges JSON) erfolgt.
 * Beinhaltet einen Timeout-Mechanismus für langsame Antworten.
 * @param {string} targetUrl - Die abzurufende Ziel-URL.
 * @returns {Promise<Object>} Das geparste JSON-Ergebnis des Requests.
 * @throws {Error} Wenn alle Proxies fehlschlagen.
 */
async function fetchViaProxy(targetUrl) {
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Versuche alle Proxies in der Liste durch
        for (const proxyBase of PROXIES) {
            try {
                const requestUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s Fail-Fast Timeout

                const response = await fetch(requestUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Status ${response.status}`);

                const text = await response.text();
                if (!text || text.trim().length === 0) throw new Error("Leere Antwort");

                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error("Kein JSON");
                }
            } catch (error) {
                lastError = error;
                // console.warn(`Proxy ${proxyBase} failed: ${error.message}`);
            }
        }

        // Wenn wir hier sind, haben alle Proxies in diesem Versuch versagt.
        // Wenn es nicht der letzte Versuch ist, warten wir kurz (Exponential Backoff).
        if (attempt < MAX_RETRIES) {
            const delay = 1000 * attempt; // 1s, 2s...
            // console.log(`Alle Proxies fehlgeschlagen. Warte ${delay}ms vor Versuch ${attempt + 1}...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError || new Error('Alle Proxies und Retries fehlgeschlagen');
}

/**
 * Ruft Chart-Daten ab (mit Caching und Fallback-Strategie).
 * 
 * Strategie:
 * 1. Prüfe Session-Cache (TTL: 5 Min)
 * 2. Versuch: Angefragter Zeitraum & Intervall
 * 3. Fallback (wenn Intraday fehlschlägt): 5 Tage Daily
 * 4. Notfall-Fallback (oft nötig für Fonds): 1 Monat Daily
 * 
 * @param {string} symbol - Das Tickersymbol (z.B. "AAPL", "btc-usd")
 * @param {string} range - Zeitraum (1d, 5d, 1mo, 1y, etc.)
 * @param {string} interval - Datenintervall (5m, 15m, 1d, 1wk)
 */
export async function fetchChartData(symbol, range = '1y', interval = '1d') {
    const cacheKey = `alphaview_cache_${symbol}_${range}_${interval}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 Min TTL
            return data;
        }
    }

    try {
        const data = await tryFetch(symbol, range, interval);
        sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
        return data;
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
                } catch (finalErr) {
                    console.error(`Alle Versuche gescheitert für ${symbol}`);
                    return null;
                }
            }
        }
        return null;
    }
}

/**
 * Hilfsfunktion für den eigentlichen Chart-Daten-Abruf.
 * Konstruiert die Yahoo Finance URL und führt den Abruf über Proxies durch.
 * Prüft anschließend die Integrität der empfangenen Datenstruktur.
 * @param {string} symbol - Das Tickersymbol.
 * @param {string} range - Der Zeitraum.
 * @param {string} interval - Das Intervall.
 * @returns {Promise<Object>} Das 'result'-Objekt der Yahoo Chart API.
 */
async function tryFetch(symbol, range, interval) {
    const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
    const data = await fetchViaProxy(targetUrl);

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('Ungültige Datenstruktur');
    }

    // VALIDIERUNG: Prüfen, ob echte Datenpunkte (Preise) enthalten sind.
    // Yahoo liefert manchmal leere Arrays oder Arrays voller 'null' für Intraday bei Fonds.
    const res = data.chart.result[0];
    const quote = res.indicators.quote[0];
    const hasPrices = quote.close && quote.close.some(p => p !== null && p !== undefined);

    // Wir akzeptieren auch Fälle OHNE historische Kurse, solange wir einen aktuellen Preis in den Metadaten haben.
    // Das ist wichtig für exotische Fonds (z.B. UIV7.SG), die oft leere Charts liefern.
    const hasCurrentPrice = res.meta && (res.meta.regularMarketPrice !== undefined || res.meta.chartPreviousClose !== undefined);

    if (!hasPrices && !hasCurrentPrice) {
        throw new Error('Keine Preisdaten enthalten');
    }

    return res;
}

/**
 * Sucht nach Wertpapieren über die Yahoo Finance Auto-Complete API.
 * Wird für die Suchleiste im Header verwendet.
 * Filtert Ergebnisse, um relevantere Treffer (Aktien, ETFs, Fonds) zu bevorzugen.
 * @param {string} query - Der Suchbegriff.
 * @returns {Promise<Array>} Eine Liste von gefundenen Wertpapieren (Symbol, Name, Typ).
 */
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