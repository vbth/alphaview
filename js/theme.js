/**
 * Theme Management Module
 * Handles Light/Dark mode logic and LocalStorage persistence.
 */

// Initialisiert das Theme beim Laden der Seite
export function initTheme() {
    // Prüfen, ob Theme im LocalStorage gespeichert ist
    const savedTheme = localStorage.getItem('theme');
    
    // Prüfen, ob das System Dark Mode bevorzugt
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        return 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        return 'light';
    }
}

// Wechselt das Theme und speichert die Präferenz
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