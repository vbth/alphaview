/**
 * Theme Module
 * ============
 * Verwaltet den Light/Dark Mode der Anwendung.
 * - Speichert Präferenz im LocalStorage.
 * - Prüft System-Einstellungen (prefers-color-scheme).
 */

// Initialisiert das Theme beim Start
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Wenn 'dark' gespeichert ist ODER keine Speicherung vorliegt und System dunkel ist
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        return 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        return 'light';
    }
}

// Schaltet zwischen Hell und Dunkel um
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