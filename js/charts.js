/**
 * Charts Module
 * German Formatting & Layout
 */
let chartInstance = null;

export function renderChart(canvasId, rawData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    const currency = rawData.meta.currency || '';

    // Konvertiere Timestamps in Date Objekte
    const labels = timestamps.map(t => new Date(t * 1000));

    if (chartInstance) {
        chartInstance.destroy();
    }

    // Farben Logik
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const isBullish = endPrice >= startPrice;
    
    const lineColor = isBullish ? '#22c55e' : '#ef4444'; 
    const gradientColor = ctx.createLinearGradient(0, 0, 0, 400);
    gradientColor.addColorStop(0, isBullish ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)');
    gradientColor.addColorStop(1, 'rgba(15, 23, 42, 0)'); // Fade out

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
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
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
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('de-DE', { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'
                            });
                        },
                        label: function(context) {
                            return `${context.parsed.y.toFixed(2)} ${currency}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 6,
                        callback: function(val, index) {
                            const date = this.getLabelForValue(val);
                            const d = new Date(labels[index]); 
                            // Deutsche Formatierung: 24.10.23
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                    }
                },
                y: {
                    display: true,
                    position: 'right',
                    grid: {
                        color: 'rgba(200, 200, 200, 0.05)',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return value.toFixed(1) + ' ' + currency;
                        }
                    }
                }
            }
        }
    });
}