/**
 * Store Module
 * Manages Portfolio in LocalStorage.
 * Final Version: Full Exports
 */
const STORAGE_KEY = 'alphaview_portfolio';

function getPortfolio() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    let data = JSON.parse(json);
    if (data.length > 0) {
        let changed = false;
        data = data.map(item => {
            if (typeof item === 'string') { changed = true; return { symbol: item, qty: 0, url: '', extraUrl: '' }; }
            if (item.url === undefined) { changed = true; item.url = ''; }
            if (item.extraUrl === undefined) { changed = true; item.extraUrl = ''; }
            return item;
        });
        if (changed) savePortfolio(data);
    }
    return data;
}

function savePortfolio(portfolio) { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); }

export function getWatchlist() { return getPortfolio(); }

export function addSymbol(symbol) {
    const portfolio = getPortfolio();
    const upperSymbol = symbol.toUpperCase();
    if (!portfolio.find(p => p.symbol === upperSymbol)) {
        portfolio.push({ symbol: upperSymbol, qty: 0, url: '', extraUrl: '' });
        savePortfolio(portfolio);
        return true;
    }
    return false;
}

export function removeSymbol(symbol) {
    const newPortfolio = getPortfolio().filter(p => p.symbol !== symbol);
    savePortfolio(newPortfolio);
}

export function updateQuantity(symbol, quantity) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.qty = parseFloat(quantity) || 0;
        savePortfolio(portfolio);
    }
}

export function updateUrl(symbol, url) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.url = url ? url.trim() : '';
        savePortfolio(portfolio);
    }
}

export function updateExtraUrl(symbol, url) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.extraUrl = url ? url.trim() : '';
        savePortfolio(portfolio);
    }
}