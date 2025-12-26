/**
 * Charts Module
 * Engine: TradingView Lightweight Charts v4.2.0
 * Feature: Floating Tooltip (Date & Price at Cursor)
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

// UI Updates (Header Text & Performance Badge)
function updateHeaderInfo(startTs, endTs, startVal, endVal, range) {
    const dateEl = document.getElementById('dynamic-range-text');
    const perfEl = document.getElementById('chart-performance');
    
    if (dateEl) {
        try {
            const start = new Date(startTs * 1000);
            const end = new Date(endTs * 1000);
            const fDate = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const fMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
            const fYear = (d) => d.getFullYear(); 
            const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

            let text = "";
            if (range === '1d') text = `Handelstag: ${fDate(end)} <span class="opacity-50 ml-1 font-normal">(${fmtTime.format(end)})</span>`;
            else if (range === '5d') text = `${fDate(start)} – ${fDate(end)}`;
            else if (range === '1mo' || range === '6mo') text = `${fMonthYear(start).replace('.','/')} – ${fMonthYear(end).replace('.','/')}`;
            else if (range === '1y') { const y1 = fYear(start); const y2 = fYear(end); text = (y1 === y2) ? `${y1}` : `${y1} – ${y2}`; } 
            else text = `${fYear(start)} – ${fYear(end)}`;
            
            dateEl.innerHTML = text;
        } catch (e) {}
    }

    if (perfEl && startVal) {
        const diff = endVal - startVal;
        const pct = (diff / startVal) * 100;
        const sign = pct >= 0 ? '+' : '';
        const colorClass = pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        perfEl.innerHTML = `<span class="${colorClass}">${sign}${pct.toFixed(2).replace('.',',')}%</span>`;
    }
}

export function renderChart(containerId, rawData, range = '1y', analysisData = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!window.LightweightCharts) {
        setTimeout(() => renderChart(containerId, rawData, range, analysisData), 200);
        return;
    }

    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    currentCurrency = rawData.meta.currency || 'USD';

    // 1. DATA PREP
    let cleanData = [];
    const timeSet = new Set();
    for(let i=0; i<timestamps.length; i++) {
        const t = timestamps[i];
        const p = prices[i];
        if(p != null && t != null && !timeSet.has(t)) {
            timeSet.add(t);
            cleanData.push({ time: t, value: p });
        }
    }
    cleanData.sort((a, b) => a.time - b.time);

    if(cleanData.length === 0) {
        container.innerHTML = '<div class="text-slate-400 p-10 text-center">Keine Daten</div>';
        return;
    }

    updateHeaderInfo(
        cleanData[0].time, 
        cleanData[cleanData.length-1].time, 
        cleanData[0].value, 
        cleanData[cleanData.length-1].value, 
        range
    );

    // 2. CLEANUP
    if (chart) {
        try { chart.remove(); } catch(e) {}
        chart = null;
    }
    container.innerHTML = '';

    // 3. COLORS & TOOLTIP ELEMENT
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const startPrice = cleanData[0].value;
    const endPrice = cleanData[cleanData.length - 1].value;
    const isBullish = endPrice >= startPrice;
    const mainColor = isBullish ? '#22c55e' : '#ef4444'; 
    const topColor = isBullish ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const bottomColor = isBullish ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    // --- TOOLTIP ERSTELLEN ---
    const toolTip = document.createElement('div');
    toolTip.style = `position: absolute; display: none; padding: 8px; box-sizing: border-box; font-size: 12px; text-align: left; z-index: 1000; top: 12px; left: 12px; pointer-events: none; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-family: 'Inter', sans-serif;`;
    
    // Farbanpassung für Tooltip
    if(isDark) {
        toolTip.style.background = 'rgba(30, 41, 59, 0.9)'; // Slate-800
        toolTip.style.color = 'white';
        toolTip.style.border = '1px solid #334155';
    } else {
        toolTip.style.background = 'rgba(255, 255, 255, 0.95)';
        toolTip.style.color = 'black';
        toolTip.style.border = '1px solid #e2e8f0';
    }
    container.appendChild(toolTip);

    try {
        // 4. CHART
        chart = window.LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight || 400,
            layout: { background: { type: 'solid', color: 'transparent' }, textColor: textColor, fontFamily: 'Inter' },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.2, bottom: 0.1 } },
            timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
            crosshair: {
                vertLine: { width: 1, style: 3, color: textColor, labelVisible: false },
                horzLine: { width: 1, style: 3, color: textColor, labelVisible: false }
            },
            handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: true },
        });

        areaSeries = chart.addAreaSeries({
            lineColor: mainColor, topColor: topColor, bottomColor: bottomColor, lineWidth: 2,
            priceFormat: { type: 'custom', formatter: price => formatCurrencyValue(price, currentCurrency) },
        });
        areaSeries.setData(cleanData);

        // SMAs
        const isIntraday = (range === '1d' || range === '5d');
        if (!isIntraday && cleanData.length > 50) {
            sma50Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false });
            sma50Series.setData(calculateSMA_Data(cleanData, 50));
        }
        if (!isIntraday && cleanData.length > 200) {
            sma200Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, crosshairMarkerVisible: false, priceLineVisible: false });
            sma200Series.setData(calculateSMA_Data(cleanData, 200));
        }

        // --- CROSSHAIR MOVE HANDLER (Der Tooltip Code) ---
        chart.subscribeCrosshairMove(param => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > container.clientWidth ||
                param.point.y < 0 ||
                param.point.y > container.clientHeight
            ) {
                toolTip.style.display = 'none';
            } else {
                toolTip.style.display = 'block';
                const price = param.seriesData.get(areaSeries);
                
                // Datum formatieren
                const dateObj = new Date(param.time * 1000);
                let dateStr = '';
                if(range === '1d' || range === '5d') {
                    // Datum + Uhrzeit
                    dateStr = dateObj.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                } else {
                    // Nur Datum
                    dateStr = dateObj.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
                }

                if(price) {
                    const priceStr = formatCurrencyValue(price.value || price, currentCurrency);
                    toolTip.innerHTML = `<div style="font-weight: 600">${priceStr}</div><div style="color: ${isDark ? '#94a3b8' : '#64748b'}">${dateStr}</div>`;
                    
                    // Positionierung (Smart: nicht aus dem Bild laufen)
                    const toolTipWidth = 100; 
                    const toolTipHeight = 50; 
                    const toolTipMargin = 15;

                    let left = param.point.x + toolTipMargin;
                    let top = param.point.y + toolTipMargin;

                    if (left + toolTipWidth > container.clientWidth) left = param.point.x - toolTipWidth - toolTipMargin;
                    if (top + toolTipHeight > container.clientHeight) top = param.point.y - toolTipHeight - toolTipMargin;

                    toolTip.style.left = left + 'px';
                    toolTip.style.top = top + 'px';
                }
            }
        });

        // Resize
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) return;
            const r = entries[0].contentRect;
            if (r.width > 0 && r.height > 0) chart.applyOptions({ width: r.width, height: r.height });
        }).observe(container);
        
        chart.timeScale().fitContent();

    } catch(err) { console.error(err); }
}