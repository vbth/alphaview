/**
 * Charts Module
 * Fixed: Gaps & Axis Formatting
 */
let chartInstance = null;

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

// Intelligenter Datumsformatierer
function formatDateLabel(date, range) {
    // Wenn Intraday (1d) oder Kurze Woche (5d) -> Uhrzeit zeigen
    if (range === '1d' || range === '5d') {
        return new Intl.DateTimeFormat('de-DE', { 
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
        }).format(date);
    }
    // Sonst nur Datum
    return new Intl.DateTimeFormat('de-DE', { 
        day: '2-digit', month: '2-digit', year: '2-digit' 
    }).format(date);
}

export function renderChart(canvasId, rawData, range = '1y') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    const currency = rawData.meta.currency || 'USD';

    const labels = timestamps.map(t => new Date(t * 1000));

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
                spanGaps: true // WICHTIG: Verbindet Linien bei fehlenden Daten
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
                            const index = context[0].dataIndex;
                            return formatDateLabel(labels[index], range);
                        },
                        label: function(context) {
                            return formatCurrencyValue(context.parsed.y, currency);
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 6,
                        callback: function(val, index) {
                            // Zeige Uhrzeit nur bei 1d/5d
                            const d = labels[index];
                            if (!d) return '';
                            
                            if (range === '1d' || range === '5d') {
                                return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
                            }
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                    }
                },
                y: {
                    display: true,
                    position: 'right',
                    grid: { color: 'rgba(200, 200, 200, 0.05)', borderDash: [5, 5] },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) { return formatCurrencyValue(value, currency); }
                    }
                }
            }
        }
    });
}