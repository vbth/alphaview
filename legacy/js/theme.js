/**
 * Modul: Theme
 * ============
 * Verwaltet den Hell/Dunkel-Modus.
 * - Speichert Präferenz im LocalStorage.
 * - Berücksichtigt Systemeinstellungen (prefers-color-scheme).
 */

// Initialisiert das Theme beim Start (Laden aus Storage oder System)
/**
 * Initialisiert das Farbschema der Anwendung beim Start.
 * Überprüft den LocalStorage auf gespeicherte Präferenzen ('light' oder 'dark').
 * Falls nichts gespeichert ist, wird die System-Einstellung (prefers-color-scheme) verwendet.
 * Setzt die CSS-Klasse 'dark' auf dem html-Element, falls erforderlich.
 * @returns {string} Das aktive Theme ('dark' oder 'light').
 */
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Wenn 'dark' gespeichert ist, oder keine Präferenz vorliegt aber das System 'dark' ist
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        return 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        return 'light';
    }
}

// Schaltet zwischen Hell- und Dunkelmodus um
/**
 * Wechselt das Farbschema zwischen Hell und Dunkel.
 * Aktualisiert die CSS-Klasse auf dem html-Element und speichert die neue
 * Einstellung dauerhaft im LocalStorage.
 * @returns {string} Das neu gesetzte Theme ('dark' oder 'light').
 */
export function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        return 'light';
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        return 'dark';
    }
}