/**
 * Analysis Module
 * ===============
 * Berechnet Metriken wie Performance, Trend und Volatilität.
 * Bereitet die Rohdaten für die Anzeige auf.
 */

export function analyze(chartResult) {
    const prices = extractPrices(chartResult);
    const meta = chartResult.meta;

    // Ohne Preise keine Analyse
    if (!prices || prices.length < 2) return null;

    const currentPrice = prices[prices.length - 1];

    // Performance Berechnung:
    // Standard: Startwert vs. Endwert des geladenen Zeitraums
    let refPrice = prices[0];

    // Ausnahme: Bei Intraday (1 Tag) nehmen wir den Schlusskurs vom Vortag (falls verfügbar)
    // damit die %-Anzeige logisch ist (Veränderung seit gestern).
    if (meta.range === '1d' && meta.chartPreviousClose) {
        refPrice = meta.chartPreviousClose;
    }

    const change = currentPrice - refPrice;
    const changePercent = (refPrice !== 0) ? (change / refPrice) * 100 : 0;

    // Gleitende Durchschnitte (Simple Moving Averages)
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);

    // Trend Bestimmung
    let trend = 'neutral';
    if (currentPrice > sma50 && currentPrice > sma200) trend = 'bullish'; // Über beiden Linien
    if (currentPrice < sma50 && currentPrice < sma200) trend = 'bearish'; // Unter beiden Linien

    // Volatilität (Jahresschwankung)
    const returns = calculateDailyReturns(prices);
    const stdDev = calculateStdDev(returns);
    const volatility = stdDev * Math.sqrt(252) * 100; // Annualisiert

    // Metadaten
    const fullName = meta.shortName || meta.longName || meta.symbol;
    const type = meta.instrumentType || 'EQUITY';

    return {
        symbol: meta.symbol,
        name: fullName,
        type: type,
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

// Extrahiert reine Preisdaten aus dem Yahoo-Objekt
function extractPrices(chartResult) {
    const adjClose = chartResult.indicators.adjclose?.[0]?.adjclose;
    const close = chartResult.indicators.quote[0].close;
    const arr = adjClose || close;
    if (!arr) return [];
    return arr.filter(p => p !== null && p !== undefined);
}

// Berechnet einfachen Durchschnitt
function calculateSMA(data, window) {
    if (data.length < window) return null;
    // Nimmt nur die letzten 'window' Tage für den aktuellen Wert
    return data.slice(-window).reduce((a, b) => a + b, 0) / window;
}

// Berechnet tägliche logarithmische Renditen (für Volatilität)
function calculateDailyReturns(prices) {
    let returns = [];
    for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i - 1]));
    return returns;
}

// Berechnet Standardabweichung
function calculateStdDev(data) {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
}