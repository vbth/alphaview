/**
 * Modul: Analyse
 * ==============
 * Berechnet finanzielle Metriken wie Performance, Trend und Volatilität.
 * Transformiert Rohdaten für die UI-Darstellung.
 */

/**
 * Führt eine technische Analyse auf Basis der abgerufenen Chart-Daten durch.
 * Extrahiert Preise, berechnet Performance, gleitende Durchschnitte (SMA 50/200),
 * Trend-Signal und Volatilität.
 * Kombiniert diese Metriken mit Metadaten (Name, Währung) für die UI.
 * 
 * @param {Object} chartResult - Das Rohdaten-Objekt der Yahoo API.
 * @returns {Object|null} Das Analyse-Ergebnis-Objekt oder null bei fehlenden Daten.
 */
export function analyze(chartResult) {
    const prices = extractPrices(chartResult);
    const meta = chartResult.meta;

    // Ohne Preise keine Analyse
    if (!prices || prices.length < 1) return null;

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
    // Wenn nur 1 Datenpunkt und keine Vorjahresdaten: Change ist 0
    if (prices.length === 1 && !meta.chartPreviousClose) refPrice = currentPrice;

    const changePercent = (refPrice !== 0 && refPrice !== currentPrice) ? (change / refPrice) * 100 : 0;

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
/**
 * Extrahiert die Schlusskurse (oder Adjusted Close) aus der komplexen Yahoo-Response-Struktur.
 * Filtert ungültige Werte (null/undefined) heraus.
 * @param {Object} chartResult - Das Rohdaten-Objekt.
 * @returns {Array<number>} Ein Array von Preiswerten.
 */
function extractPrices(chartResult) {
    const adjClose = chartResult.indicators.adjclose?.[0]?.adjclose;
    const close = chartResult.indicators.quote[0].close;

    // Versuche erst AdjClose, aber nur wenn valide Daten enthalten sind
    let arr = adjClose;
    let valid = (arr && arr.length > 0) ? arr.filter(p => p !== null && p !== undefined) : [];

    // Wenn AdjClose leer ist, nimm Close
    if (valid.length === 0 && close) {
        arr = close;
    }

    if (!arr) return [];
    return arr.filter(p => p !== null && p !== undefined);
}

// Berechnet einfachen Durchschnitt
/**
 * Berechnet den Simple Moving Average (SMA).
 * Nimmt den Durchschnitt der letzten 'window' Preise.
 * Gibt null zurück, wenn nicht genügend Datenpunkte vorhanden sind.
 * @param {Array<number>} data - Die Preisdaten.
 * @param {number} window - Das Zeitfenster (z.B. 50 oder 200).
 * @returns {number|null} Der aktuelle SMA-Wert oder null.
 */
function calculateSMA(data, window) {
    if (data.length < window) return null;
    // Nimmt nur die letzten 'window' Tage für den aktuellen Wert
    return data.slice(-window).reduce((a, b) => a + b, 0) / window;
}

// Berechnet tägliche logarithmische Renditen (für Volatilität)
/**
 * Berechnet die stetigen Renditen (Log Returns) aus einer Preisreihe.
 * Wird als Basis für die Volatilitätsberechnung benötigt.
 * @param {Array<number>} prices - Die Preisdaten.
 * @returns {Array<number>} Ein Array der logarithmischen Renditen.
 */
function calculateDailyReturns(prices) {
    let returns = [];
    for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i - 1]));
    return returns;
}

// Berechnet Standardabweichung
/**
 * Berechnet die Standardabweichung (Volatilität) einer Datenreihe.
 * Wird verwendet, um das Risiko eines Wertpapiers einzuschätzen.
 * @param {Array<number>} data - Die Rendite-Daten.
 * @returns {number} Die Standardabweichung.
 */
function calculateStdDev(data) {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
}