/**
 * Charts Module
 * Final Fix: Date Range Text & Axis Formatting
 */
let chartInstance = null;

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

// KW Berechnung
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Wochen-Grenzen (Mo-Fr)
function getWeekBounds(date) {
    const d = new Date(date);
    const day = d.getDay() || 7; 
    if (day !== 1) d.setHours(-24 * (day - 1));
    const monday = new Date(d);
    const friday = new Date(d);
    friday.setDate(monday.getDate() + 4);
    return { monday, friday };
}

// Text Update (Badge)
function updateRangeInfo(labels, range) {
    const el = document.getElementById('dynamic-range-text');
    
    if (!el) {
        console.error("Badge Element 'dynamic-range-text' nicht gefunden!");
        return;
    }
    
    if (!labels || labels.length === 0) {
        el.textContent = "Keine Daten";
        return;
    }

    try {
        const start = labels[0];
        const end = labels[labels.length - 1];
        
        const fDate = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const fMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
        const fYear = (d) => d.getFullYear(); 
        const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

        let text = "";

        // Logik für den Text
        if (range === '1d') {
            text = `Handelstag: ${fDate(end)} <span class="opacity-50 ml-1 font-normal">(${fmtTime.format(end)})</span>`;
        } 
        else if (range === '5d') {
            const kw = getWeekNumber(end);
            const bounds = getWeekBounds(end);
            text = `KW ${kw} (${fDate(bounds.monday)} – ${fDate(bounds.friday)})`;
        } 
        else if (range === '1mo' || range === '6mo') {
            text = `${fMonthYear(start).replace('.','/')} – ${fMonthYear(end).replace('.','/')}`;
        } 
        else if (range === '1y') {
            const y1 = fYear(start);
            const y2 = fYear(end);
            text = (y1 === y2) ? `${y1}` : `${y1} – ${y2}`;
        } 
        else {
            // 5y, 10y, max
            text = `${fYear(start)} – ${fYear(end)}`;
        }
        
        // Text in das HTML Element schreiben
        el.innerHTML = text;
        console.log("Range Text updated to:", text); // Debug Log

    } catch (err) {
        console.error("Error formatting date:", err);
        el.textContent = "Datum Fehler";
    }
}

export function renderChart(canvasId, rawData, range = '1y') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    const currency = rawData.meta.currency || 'USD';

    // Dates erstellen
    const labels = timestamps.map(t => new Date(t * 1000));

    // 1. Text aktualisieren
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
                            // Tooltip
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
                            
                            // 1T -> Uhrzeit
                            if (range === '1d') {
                                return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
                            }
                            // 1W -> Wochentag + Datum (HIER WAR DAS PROBLEM BEHOBEN)
                            if (range === '5d') {
                                return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' });
                            }
                            
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                    }
                },
                y: { display: true, position: 'right', grid: { color: 'rgba(200, 200, 200, 0.05)', borderDash: [5, 5] }, ticks: { color: '#94a3b8', callback: function(value) { return formatCurrencyValue(value, currency); } } }
            }
        }
    });
}