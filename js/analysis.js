/**
 * Analysis Module
 * Calculates financial metrics (Volatility, SMA, Returns).
 */

export function analyze(chartResult) {
    const prices = extractPrices(chartResult);
    const meta = chartResult.meta;
    
    if (prices.length < 2) return null;

    const currentPrice = prices[prices.length - 1];
    const prevClose = meta.chartPreviousClose || prices[prices.length - 2];
    
    const change = currentPrice - prevClose;
    const changePercent = (change / prevClose) * 100;

    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    
    let trend = 'neutral';
    if (currentPrice > sma50 && currentPrice > sma200) trend = 'bullish';
    if (currentPrice < sma50 && currentPrice < sma200) trend = 'bearish';

    const returns = calculateDailyReturns(prices);
    const stdDev = calculateStdDev(returns);
    const volatility = stdDev * Math.sqrt(252) * 100;

    // HIER: Versuche den vollen Namen zu finden
    // Yahoo liefert oft 'shortName' (z.B. "Apple Inc.") oder 'longName'.
    // Fallback ist das Symbol.
    const fullName = meta.shortName || meta.longName || meta.symbol;

    return {
        symbol: meta.symbol,
        name: fullName, // <--- NEU
        price: currentPrice,
        currency: meta.currency,
        change: change,
        changePercent: changePercent,
        trend: trend,
        volatility: volatility,
        sma50: sma50,
        sma200: sma200,
        timestamp: new Date().toLocaleTimeString()
    };
}

function extractPrices(chartResult) {
    const adjClose = chartResult.indicators.adjclose?.[0]?.adjclose;
    const close = chartResult.indicators.quote[0].close;
    const prices = adjClose || close;
    return prices.filter(p => p !== null && p !== undefined);
}

function calculateSMA(data, window) {
    if (data.length < window) return null;
    const slice = data.slice(-window);
    return slice.reduce((a, b) => a + b, 0) / window;
}

function calculateDailyReturns(prices) {
    let returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    return returns;
}

function calculateStdDev(data) {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    return Math.sqrt(variance);
}