/**
 * Charts Module
 * Fixed: ISO Week Calculation & Range Text Logic
 */
let chartInstance = null;

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

// Korrekte ISO 8601 Kalenderwoche
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Berechnet Montag und Freitag basierend auf einem Datum
function getWeekBounds(date) {
    const d = new Date(date);
    const day = d.getDay() || 7; // Mo=1 ... So=7
    if (day !== 1) d.setHours(-24 * (day - 1)); // Zurück zum Montag
    
    const monday = new Date(d);
    const friday = new Date(d);
    friday.setDate(monday.getDate() + 4); // +4 Tage = Freitag
    
    return { monday, friday };
}

function updateRangeInfo(labels, range) {
    const el = document.getElementById('chart-date-range');
    if (!el || labels.length === 0) return;

    const start = labels[0];
    const end = labels[labels.length - 1]; // Nehmen wir das Enddatum als Referenz für die KW
    
    const fDate = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
    const fYear = (d) => d.getFullYear(); 
    const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

    let text = "";

    switch(range) {
        case '1d':
            // "Handelstag: 22.12.2025 (Stand: 17:30)"
            text = `Handelstag: ${fDate(end)} <span class="text-slate-400 ml-2 text-xs font-normal">(${fmtTime.format(end)})</span>`;
            break;
        case '5d':
            // Echte Kalenderwoche berechnen (Mo - Fr)
            const kw = getWeekNumber(end);
            const bounds = getWeekBounds(end);
            
            // Format: "KW 52 (22.12.2025 - 26.12.2025)"
            text = `KW ${kw} (${fDate(bounds.monday)} – ${fDate(bounds.friday)})`;
            break;
        case '1mo':
        case '6mo':
            text = `${fMonthYear(start).replace('.','/')} – ${fMonthYear(end).replace('.','/')}`;
            break;
        case '1y':
            const y1 = fYear(start);
            const y2 = fYear(end);
            text = (y1 === y2) ? `${y1}` : `${y1} – ${y2}`;
            break;
        default:
            text = `${fYear(start)} – ${fYear(end)}`;
            break;
    }
    // Icon davor setzen für Optik
    el.innerHTML = `<i class="fa-regular fa-calendar-days mr-2 opacity-70"></i>${text}`;
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
                            
                            if (range === '1d') return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute:'2-digit' });
                            
                            // 1W -> Wochentag + Datum (z.B. Mo 22.12.)
                            if (range === '5d') return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                            
                            return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
                        }
                    }
                },
                y: { display: true, position: 'right', grid: { color: 'rgba(200, 200, 200, 0.05)', borderDash: [5, 5] }, ticks: { color: '#94a3b8', callback: function(value) { return formatCurrencyValue(value, currency); } } }
            }
        }
    });
}