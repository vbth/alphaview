/**
 * Store Module
 * Manages the Portfolio/Watchlist in LocalStorage.
 */

const STORAGE_KEY = 'alphaview_portfolio';

// Initiale Datenstruktur laden oder erstellen
function getPortfolio() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : []; // Array von Symbol-Strings ['AAPL', 'MSFT']
}

function savePortfolio(portfolio) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

/**
 * Fügt ein Symbol zur Watchlist hinzu.
 * Verhindert Duplikate.
 */
export function addSymbol(symbol) {
    const portfolio = getPortfolio();
    const upperSymbol = symbol.toUpperCase();
    
    if (!portfolio.includes(upperSymbol)) {
        portfolio.push(upperSymbol);
        savePortfolio(portfolio);
        return true; // Added
    }
    return false; // Already exists
}

/**
 * Entfernt ein Symbol aus der Watchlist.
 */
export function removeSymbol(symbol) {
    let portfolio = getPortfolio();
    const upperSymbol = symbol.toUpperCase();
    
    const newPortfolio = portfolio.filter(s => s !== upperSymbol);
    savePortfolio(newPortfolio);
}

/**
 * Gibt die aktuelle Watchlist zurück.
 */
export function getWatchlist() {
    return getPortfolio();
}