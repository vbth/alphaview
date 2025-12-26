/**
 * Charts Module
 * Updates: Removed "Handelstag:" prefix for 1d.
 */
let chart = null;
let areaSeries = null;
let sma50Series = null;
let sma200Series = null;
let currentCurrency = 'USD';

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

function calculateSMA_Data(sortedData, window) {
    let result = [];
    for (let i = 0; i < sortedData.length; i++) {
        if (i < window - 1) continue;
        let sum = 0;
        for (let j = 0; j < window; j++) sum += sortedData[i - j].value;
        result.push({ time: sortedData[i].time, value: sum / window });
    }
    return result;
}

function updateRangeInfo(startTs, endTs, range) {
    const el = document.getElementById('dynamic-range-text');
    if (!el) return;

    try {
        const start = new Date(startTs * 1000);
        const end = new Date(endTs * 1000);
        
        const fDate = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const fMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
        const fYear = (d) => d.getFullYear(); 
        const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

        let text = "";
        
        if (range === '1d') {
            // UPDATE: Nur Datum und Uhrzeit
            text = `${fDate(end)} <span class="opacity-50 ml-1 font-normal">(${fmtTime.format(end)})</span>`;
        } 
        else if (range === '5d' || range === '1W') {
            text = `${fDate(start)} – ${fDate(end)}`;
        } 
        else if (range === '1mo' || range === '6mo') {
            text = `${fMonthYear(start).replace('.','/')} – ${fMonthYear(end).replace('.','/')}`;
        } 
        else if (range === '1y') { 
            const y1 = fYear(start); 
            const y2 = fYear(end); 
            text = (y1 === y2) ? `${y1}` : `${y1} – ${y2}`; 
        } 
        else text = `${fYear(start)} – ${fYear(end)}`;
        
        el.innerHTML = text;
    } catch (err) { console.error(err); }
}

function updatePerformance(startVal, endVal) {
    const el = document.getElementById('chart-performance');
    if (!el || !startVal) return;
    const diff = endVal - startVal;
    const pct = (diff / startVal) * 100;
    const sign = pct >= 0 ? '+' : '';
    const colorClass = pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    el.innerHTML = `<span class="${colorClass}">${sign}${pct.toFixed(2).replace('.',',')}%</span>`;
}

export function renderChart(containerId, rawData, range = '1y', analysisData = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!window.LightweightCharts) {
        console.warn("Warte auf Chart Lib...");
        setTimeout(() => renderChart(containerId, rawData, range, analysisData), 200);
        return;
    }

    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    currentCurrency = rawData.meta.currency || 'USD';

    let cleanData = [];
    const timeSet = new Set(); 

    for(let i=0; i<timestamps.length; i++) {
        const t = timestamps[i];
        const p = prices[i];
        if(p !== null && p !== undefined && t !== null && t !== undefined) {
            if(!timeSet.has(t)) {
                timeSet.add(t);
                cleanData.push({ time: t, value: p });
            }
        }
    }
    cleanData.sort((a, b) => a.time - b.time);

    if(cleanData.length === 0) {
        container.innerHTML = '<div class="text-slate-400 p-10 text-center">Keine Daten verfügbar</div>';
        return;
    }

    updateRangeInfo(cleanData[0].time, cleanData[cleanData.length-1].time, range);
    updatePerformance(cleanData[0].value, cleanData[cleanData.length-1].value);

    if (chart) {
        try { chart.remove(); } catch(e) {}
        chart = null;
    }
    container.innerHTML = '';

    const isDark = document.documentElement.classList.contains('dark');
    const bg = 'transparent'; 
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
    const startPrice = cleanData[0].value;
    const endPrice = cleanData[cleanData.length - 1].value;
    const isBullish = endPrice >= startPrice;
    
    const mainColor = isBullish ? '#22c55e' : '#ef4444'; 
    const topColor = isBullish ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const bottomColor = isBullish ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    try {
        chart = window.LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight || 400,
            layout: { background: { type: 'solid', color: bg }, textColor: textColor, fontFamily: 'Inter, sans-serif' },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.2, bottom: 0.1 } },
            timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
            crosshair: { vertLine: { labelVisible: false }, horzLine: { labelVisible: false } },
            handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: true },
        });

        areaSeries = chart.addAreaSeries({
            lineColor: mainColor,
            topColor: topColor,
            bottomColor: bottomColor,
            lineWidth: 2,
            priceFormat: { type: 'custom', formatter: price => formatCurrencyValue(price, currentCurrency) },
        });
        areaSeries.setData(cleanData);

        const isIntraday = (range === '1d' || range === '5d' || range === '1W');
        if (!isIntraday && cleanData.length > 50) {
            sma50Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false });
            sma50Series.setData(calculateSMA_Data(cleanData, 50));
        }
        if (!isIntraday && cleanData.length > 200) {
            sma200Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false });
            sma200Series.setData(calculateSMA_Data(cleanData, 200));
        }

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) return;
            const newRect = entries[0].contentRect;
            if (newRect.width > 0 && newRect.height > 0) chart.applyOptions({ width: newRect.width, height: newRect.height });
        });
        resizeObserver.observe(container);
        
        chart.timeScale().fitContent();

    } catch(err) {
        console.error("Critical Chart Error:", err);
        container.innerHTML = `<div class="text-red-400 p-10 text-center text-sm">Chart Error: ${err.message}</div>`;
    }
}