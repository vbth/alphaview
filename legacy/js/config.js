/**
 * Modul: Konfiguration
 * ====================
 * Zentralisiert Konstanten, Anlagetypen und Badge-Styles.
 */
export const ASSET_TYPES = {
    'EQUITY': {
        label: 'AKTIE',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-800'
    },
    'ETF': {
        label: 'ETF',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-800'
    },
    'MUTUALFUND': {
        label: 'FONDS',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-200 dark:border-orange-800'
    },
    'CRYPTOCURRENCY': {
        label: 'KRYPTO',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800'
    },
    'INDEX': {
        label: 'INDEX',
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
    },
    'CURRENCY': {
        label: 'DEVISEN',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
    },
    'FUTURE': {
        label: 'FUTURE',
        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
    },
    'OPTION': {
        label: 'OPTION',
        color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border-pink-200 dark:border-pink-800'
    }
};

export const DEFAULT_ASSET_STYLE = {
    label: 'OTHER',
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
};

export const API_CONSTANTS = {
    DEFAULT_RANGE: '1y',
    DEFAULT_INTERVAL: '1d',
    CACHE_TTL_MS: 5 * 60 * 1000 // 5 Minuten
};
