/**
 * API Module
 * Improved Search for ETFs
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
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const response = await fetch(requestUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Status ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('All proxies failed');
}

export async function fetchChartData(symbol, range = '1y', interval = '1d') {
    try {
        const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
        const data = await fetchViaProxy(targetUrl);

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('Invalid Data');
        }
        return data.chart.result[0];
    } catch (error) {
        console.error(`Fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function searchSymbol(query) {
    if (!query || query.length < 1) return [];

    try {
        // Wir holen 10 Ergebnisse, damit auch lokale Börsen (DE) dabei sind
        const targetUrl = `${BASE_URL_SEARCH}?q=${query}&quotesCount=10&newsCount=0`;
        const data = await fetchViaProxy(targetUrl);

        if (!data.quotes) return [];

        return data.quotes
            .filter(q => {
                // Wir wollen Aktien, ETFs, Fonds, Indizes und Krypto
                const validTypes = ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY', 'CURRENCY'];
                return q.isYahooFinance && validTypes.includes(q.quoteType);
            })
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname,
                type: q.quoteType, // z.B. ETF, EQUITY
                exchange: q.exchange, // z.B. GER (Xetra), NMS (Nasdaq)
                score: q.score // Relevanz
            }));

    } catch (error) {
        console.error('Search failed:', error);
        return [];
    }
}