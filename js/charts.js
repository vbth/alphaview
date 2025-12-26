/**
 * Charts Module
 * Fixes: X-Axis Labels for Week View & Dynamic Range Text
 */
let chartInstance = null;

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

// KW Berechner
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Text Update Logik (Badge)
function updateRangeInfo(labels, range) {
    // Neue ID nutzen!
    const el = document.getElementById('dynamic-range-text');
    if (!el || labels.length === 0) return;

    const start = labels[0];
    const end = labels[labels.length - 1];
    
    const fDate = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); // 12.10.2023
    const fDateShort = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }); // 12.10.
    const fMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }); // 10.2023
    const fYear = (d) => d.getFullYear(); 

    let text = "";

    switch(range) {
        case '1d':
            text = fDate(end); // "24.10.2023"
            break;
        case '5d':
            const kw = getWeekNumber(end);
            // "KW 42 (16.10.2023 bis 20.10.2023)"
            text = `KW ${kw} (${fDate(start)} bis ${fDate(end)})`;
            break;
        case '1mo':
        case '6mo':
            // "10/2023 – 04/2024" (Slash Look)
            text = `${fMonthYear(start).replace('.','/')} – ${fMonthYear(end).replace('.','/')}`;
            break;
        case '1y':
            const y1 = fYear(start);
            const y2 = fYear(end);
            text = (y1 === y2) ? `${y1}` : `${y1} bis ${y2}`;
            break;
        default:
            // "2020 bis 2025"
            text = `${fYear(start)} bis ${fYear(end)}`;
            break;
    }
    el.textContent = text;
}

export function renderChart(canvasId, rawData, range = '1y') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    const currency = rawData.meta.currency || 'USD';

    const labels = timestamps.map(t => new Date(t * 1000));
    updateRangeInfo(labels, range);

    if (chartInstance) chartInstance.destroy();

    const startPrice = prices.find(p => p !== null) || 0;
    const endPrice = prices[prices.length - 1] || startPrice;
    const isBullish = endPrice >= startPrice;
    
    const lineColor = isBullish ? '#22c55e' : '#ef4444'; 
    const gradientColor = ctx.createLinearGradient(0, 0, 0, 400);
    gradientColor.addColorStop(0, isBullish ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)');
    gradientColor.addColorStop(1, 'rgba(15, 23, 42, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kurs',
                data: prices,
                borderColor: lineColor,
                backgroundColor: gradientColor,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.1,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
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
                            // Tooltip: Immer volles Datum + Uhrzeit bei kurzen Zeiträumen
                            if (range === '1d' || range === '5d') {
                                return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
                            }
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
                        color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 6,
                        callback: function(val, index) {
                            const d = labels[index];
                            if (!d) return '';
                            
                            // X-ACHSE FIX:
                            // 1T: Uhrzeit (10:00)
                            if (range === '1d') return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
                            
                            // 1W: Wochentag + Datum (Mo 12.10.) -> HIER WAR DER FEHLER
                            if (range === '5d') {
                                return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                            }
                            
                            // Rest: Datum (12.10.23)
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                    }
                },
                y: { display: true, position: 'right', grid: { color: 'rgba(200, 200, 200, 0.05)', borderDash: [5, 5] }, ticks: { color: '#94a3b8', callback: function(value) { return formatCurrencyValue(value, currency); } } }
            }
        }
    });
}