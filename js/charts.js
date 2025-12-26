/**
 * Charts Module
 * Updates: Logic to only show SMAs on daily+ charts.
 */
let chartInstance = null;

function calculateSMA_Array(data, window) {
    let sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < window - 1) { sma.push(null); continue; }
        let sum = 0;
        for (let j = 0; j < window; j++) sum += data[i - j];
        sma.push(sum / window);
    }
    return sma;
}

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

function updateRangeInfo(labels, range) {
    const el = document.getElementById('dynamic-range-text');
    if (!el) return;
    if (!labels || labels.length === 0) { el.textContent = "Keine Daten"; return; }

    try {
        const start = labels[0];
        const end = labels[labels.length - 1];
        
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
        
        el.innerHTML = text;
    } catch (err) { console.error(err); }
}

function updatePerformance(prices) {
    const el = document.getElementById('chart-performance');
    if (!el || prices.length < 2) return;
    const start = prices.find(p => p !== null) || 0;
    const end = prices[prices.length - 1] || start;
    if (start === 0) return;
    const diff = end - start;
    const pct = (diff / start) * 100;
    const sign = pct >= 0 ? '+' : '';
    const colorClass = pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    el.innerHTML = `<span class="${colorClass}">${sign}${pct.toFixed(2)}%</span>`;
}

export function renderChart(canvasId, rawData, range = '1y', analysisData = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    const currency = rawData.meta.currency || 'USD';

    const labels = timestamps.map(t => new Date(t * 1000));
    updateRangeInfo(labels, range);
    updatePerformance(prices);

    if (chartInstance) chartInstance.destroy();

    const startPrice = prices.find(p => p !== null) || 0;
    const endPrice = prices[prices.length - 1] || startPrice;
    const isBullish = endPrice >= startPrice;
    
    const lineColor = isBullish ? '#22c55e' : '#ef4444'; 
    const gradientColor = ctx.createLinearGradient(0, 0, 0, 400);
    gradientColor.addColorStop(0, isBullish ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)');
    gradientColor.addColorStop(1, 'rgba(15, 23, 42, 0)');

    const datasets = [{
        label: 'Kurs',
        data: prices,
        borderColor: lineColor,
        backgroundColor: gradientColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.1,
        spanGaps: true,
        order: 1
    }];

    // SMA LINIEN (Nur bei sinnvollen Zeiträumen)
    const isIntraday = (range === '1d' || range === '5d');
    
    if (!isIntraday && prices.length > 50) {
        datasets.push({
            label: 'SMA 50',
            data: calculateSMA_Array(prices, 50),
            borderColor: '#3b82f6',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.4,
            spanGaps: true,
            order: 2
        });
    }

    if (!isIntraday && prices.length > 200) {
        datasets.push({
            label: 'SMA 200',
            data: calculateSMA_Array(prices, 200),
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.4,
            spanGaps: true,
            order: 3
        });
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 10, right: 10, left: 0, bottom: 0 } },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } }, 
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#fff',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const d = labels[context[0].dataIndex];
                            if (range === '1d' || range === '5d') return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        },
                        label: function(context) { return formatCurrencyValue(context.parsed.y, currency); }
                    }
                }
            },
            scales: {
                x: {
                    display: true, grid: { display: false },
                    ticks: {
                        color: '#94a3b8', padding: 10, maxRotation: 0, autoSkip: true, maxTicksLimit: 6,
                        callback: function(val, index) {
                            const d = labels[index];
                            if (!d) return '';
                            if (range === '1d') return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
                            if (range === '5d') return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' });
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                    }
                },
                y: { 
                    display: true, position: 'right', grid: { color: 'rgba(200, 200, 200, 0.05)', borderDash: [5, 5] }, 
                    ticks: { color: '#94a3b8', padding: 10, callback: function(value) { return formatCurrencyValue(value, currency); } } 
                }
            }
        }
    });
}