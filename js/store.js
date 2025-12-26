/**
 * Store Module
 * ============
 * Verwaltet das Portfolio im LocalStorage des Browsers.
 * - Speichert Symbole, Mengen und URLs.
 * - Führt Datenmigrationen durch, wenn sich das Format ändert.
 */

const STORAGE_KEY = 'alphaview_portfolio';

// Lädt das Portfolio
function getPortfolio() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    let data = JSON.parse(json);
    
    // MIGRATION: Stellt sicher, dass alte Datenformate auf das neue Objekt-Format aktualisiert werden
    if (data.length > 0) {
        let changed = false;
        data = data.map(item => {
            // Fall 1: Altes Format war nur ein String "AAPL"
            if (typeof item === 'string') { 
                changed = true; 
                return { symbol: item, qty: 0, url: '' }; 
            }
            // Fall 2: Objekt existiert, aber URL fehlt
            if (item.url === undefined) { 
                changed = true; 
                return { ...item, url: '' }; 
            }
            return item;
        });
        if(changed) savePortfolio(data);
    }
    return data;
}

// Speichert das Portfolio
function savePortfolio(portfolio) { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); 
}

// Exportierte Getter Funktion
export function getWatchlist() { return getPortfolio(); }

// Symbol hinzufügen
export function addSymbol(symbol) {
    const portfolio = getPortfolio();
    const upperSymbol = symbol.toUpperCase();
    // Duplikate vermeiden
    if (!portfolio.find(p => p.symbol === upperSymbol)) {
        portfolio.push({ symbol: upperSymbol, qty: 0, url: '' });
        savePortfolio(portfolio);
        return true;
    }
    return false;
}

// Symbol entfernen
export function removeSymbol(symbol) {
    const newPortfolio = getPortfolio().filter(p => p.symbol !== symbol);
    savePortfolio(newPortfolio);
}

// Menge aktualisieren
export function updateQuantity(symbol, quantity) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.qty = parseFloat(quantity) || 0;
        savePortfolio(portfolio);
    }
}

// URL aktualisieren (Neu)
export function updateUrl(symbol, url) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.url = url ? url.trim() : '';
        savePortfolio(portfolio);
    }
}