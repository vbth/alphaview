/**
 * Charts Module
 * Updates: Draws SMA50 and SMA200 lines.
 */
let chartInstance = null;

// Helper: Berechnet SMA Array für den Chart
function calculateSMA_Array(data, window) {
    let sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < window - 1) {
            sma.push(null); // Noch nicht genug Daten
            continue;
        }
        let sum = 0;
        for (let j = 0; j < window; j++) {
            sum += data[i - j];
        }
        sma.push(sum / window);
    }
    return sma;
}

// ... (formatCurrencyValue, updateRangeInfo, updatePerformance bleiben gleich) ...

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

    // DATASETS DEFINITION
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
        order: 1 // Kurs liegt ganz oben
    }];

    // SMA LINIEN HINZUFÜGEN (Nur wenn genug Daten da sind)
    if (prices.length > 50) {
        const sma50Data = calculateSMA_Array(prices, 50);
        datasets.push({
            label: 'SMA 50',
            data: sma50Data,
            borderColor: '#3b82f6', // Blau
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.4, // Weichere Kurve
            spanGaps: true,
            order: 2
        });
    }

    if (prices.length > 200) {
        const sma200Data = calculateSMA_Array(prices, 200);
        datasets.push({
            label: 'SMA 200',
            data: sma200Data,
            borderColor: '#f59e0b', // Orange/Gelb
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
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { 
                    display: true, // Legende anzeigen damit man weiß was SMA ist
                    labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } }
                }, 
                tooltip: {
                    // ... (Tooltip Logik bleibt gleich)
                }
            },
            scales: {
                // ... (Scales Logik bleibt gleich)
            }
        }
    });
}