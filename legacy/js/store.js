/**
 * Modul: Store (LocalStorage)
 * ===========================
 * Verwaltet das Portfolio und die Watchlist im Browser-Speicher.
 * Schlüssel: 'alphaview_portfolio'
 */
const STORAGE_KEY = 'alphaview_portfolio';

/**
 * Lädt die aktuelle Watchlist aus dem LocalStorage.
 * Falls keine Daten vorhanden sind oder ein Fehler beim Parsen auftritt,
 * wird eine leere Liste zurückgegeben.
 * @returns {Array} Das Array der gespeicherten Portfolio-Objekte.
 */
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

/**
 * Speichert die übergebene Watchlist im LocalStorage.
 * Die Daten werden als JSON-String unter dem Schlüssel 'alphaview_portfolio' abgelegt.
 * @param {Array} list - Die zu speichernde Liste von Portfolio-Objekten.
 */
function savePortfolio(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/**
 * Gibt eine Kopie der aktuellen Watchlist zurück.
 * Dient als öffentlicher Zugriffspunkt für andere Module, um die Daten zu lesen.
 * @returns {Array} Die aktuelle Liste der Wertpapiere.
 */
export function getWatchlist() {
    return getPortfolio();
}

/**
 * Fügt ein neues Wertpapier-Symbol zur Watchlist hinzu, falls es noch nicht existiert.
 * Das Symbol wird in Großbuchstaben umgewandelt und mit Standardwerten gespeichert.
 * @param {string} symbol - Das hinzuzufügende Tickersymbol.
 * @returns {boolean} True, wenn das Symbol hinzugefügt wurde, False, wenn es bereits existierte.
 */
export function addSymbol(symbol) {
    const list = getPortfolio();
    if (!list.find(item => item.symbol === symbol)) {
        list.unshift({ symbol, qty: 0, url: '', extraUrl: '' }); // Add to TOP
        savePortfolio(list);
        return true;
    }
    return false;
}

/**
 * Entfernt ein Symbol aus der Watchlist.
 * Filtert die Liste und entfernt den Eintrag, der dem übergebenen Symbol entspricht.
 * Die Änderungen werden sofort gespeichert.
 * @param {string} symbol - Das zu entfernende Tickersymbol.
 */
export function removeSymbol(symbol) {
    const newPortfolio = getPortfolio().filter(p => p.symbol !== symbol);
    savePortfolio(newPortfolio);
}

/**
 * Aktualisiert die gehaltene Menge (Stückzahl) eines Wertpapiers.
 * Sucht das Symbol in der Liste und aktualisiert den 'qty'-Wert (Quantity).
 * @param {string} symbol - Das betroffene Tickersymbol.
 * @param {number} quantity - Die neue Stückzahl.
 */
export function updateQuantity(symbol, quantity) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.qty = parseFloat(quantity) || 0;
        savePortfolio(portfolio);
    }
}

/**
 * Speichert eine benutzerdefinierte URL (z.B. Info-Link) zu einem Symbol.
 * Ermöglicht dem Nutzer, wichtige Links direkt beim Wertpapier zu hinterlegen.
 * @param {string} symbol - Das Tickersymbol.
 * @param {string} url - Die zu speichernde URL.
 */
export function updateUrl(symbol, url) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.url = url ? url.trim() : '';
        savePortfolio(portfolio);
    }
}

/**
 * Speichert eine zweite, spezifische URL (z.B. Holdings oder News) zu einem Symbol.
 * Dient als zusätzlicher Recherche-Link für ETFs oder Aktien.
 * @param {string} symbol - Das Tickersymbol.
 * @param {string} url - Die zweite zu speichernde URL.
 */
export function updateExtraUrl(symbol, url) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.extraUrl = url ? url.trim() : '';
        savePortfolio(portfolio);
    }
}