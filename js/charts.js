/**
 * Charts Module
 * Renders interactive charts using Chart.js.
 * Updated: Specific Date Range Formatting in Badge.
 */
let chartInstance = null;

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Logik für den Text im Badge (oben)
function updateRangeInfo(labels, range) {
    const el = document.getElementById('chart-date-range');
    if (!el || labels.length === 0) return;

    const start = labels[0];
    const end = labels[labels.length - 1];
    
    // Formatter
    const fDate = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }); // TT.MM.JJJJ
    const fMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }); // MM.JJJJ
    const fYear = (d) => d.getFullYear(); // JJJJ

    let text = "";

    switch(range) {
        case '1d':
            // Format: TT.MM.JJJJ
            text = fDate(end);
            break;
        case '5d':
            // Format: KWXX TT.MM.JJJJ - TT.MM.JJJJ
            const kw = getWeekNumber(end);
            text = `KW${kw} ${fDate(start)} bis ${fDate(end)}`;
            break;
        case '1mo':
        case '6mo':
            // Format: MM/JJJJ - MM/JJJJ
            // replace '.' mit '/' für den gewünschten Look
            text = `${fMonthYear(start).replace('.','/')} – ${fMonthYear(end).replace('.','/')}`;
            break;
        case '1y':
            // Format: JJJJ oder JJJJ - JJJJ
            const y1 = fYear(start);
            const y2 = fYear(end);
            text = (y1 === y2) ? `${y1}` : `${y1} bis ${y2}`;
            break;
        default:
            // 5y, 10y, max -> Format: JJJJ - JJJJ
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
                            // Tooltip Formatierung (behalten wie vorher für gute UX)
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
                        color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 6,
                        callback: function(val, index) {
                            const d = labels[index];
                            if (!d) return '';
                            // Achsenbeschriftung (behalten wie vorher)
                            if (range === '1d') return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
                            if (range === '5d') return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' });
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                    }
                },
                y: { display: true, position: 'right', grid: { color: 'rgba(200, 200, 200, 0.05)', borderDash: [5, 5] }, ticks: { color: '#94a3b8', callback: function(value) { return formatCurrencyValue(value, currency); } } }
            }
        }
    });
}