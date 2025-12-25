/**
 * Charts Module
 * Enhanced with Axes and Formatting
 */
let chartInstance = null;

export function renderChart(canvasId, rawData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    const currency = rawData.meta.currency || ''; // Währung aus Metadaten (z.B. USD, EUR)

    // Labels formatieren (Datum)
    const labels = timestamps.map(t => {
        const date = new Date(t * 1000);
        return date; // Wir geben das Date Object weiter, Chart.js formatiert es besser via Callback
    });

    if (chartInstance) {
        chartInstance.destroy();
    }

    // Farben
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const isBullish = endPrice >= startPrice;
    
    const lineColor = isBullish ? '#22c55e' : '#ef4444'; // Green vs Red
    const gradientColor = isBullish ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, // Date Objects
            datasets: [{
                label: 'Price',
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
                    callbacks: {
                        label: function(context) {
                            return ` ${context.parsed.y.toFixed(2)} ${currency}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true, // X-Achse anzeigen
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8', // Slate-400
                        maxTicksLimit: 6, // Nicht zu viele Labels
                        callback: function(val, index) {
                            // Intelligente Datumsformatierung
                            const date = this.getLabelForValue(val);
                            // Da labels hier Date-Objects sind (oder timestamps), formatieren wir sie kurz
                            const d = new Date(labels[index]); 
                            return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                        }
                    }
                },
                y: {
                    display: true, // Y-Achse anzeigen
                    position: 'right',
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return value.toFixed(1) + ' ' + currency; // Z.B. "150.5 USD"
                        }
                    }
                }
            }
        }
    });
}