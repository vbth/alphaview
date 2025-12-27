Hier ist die bereinigte `README.md` ohne Icons/Badges.

---

# AlphaView - Professional Portfolio Analytics

AlphaView ist eine moderne, browserbasierte Portfolio-Analyse-App, die komplett ohne Backend oder Build-Prozesse auskommt ("No-Build"). Sie läuft direkt im Browser, speichert Daten lokal im `localStorage` und nutzt die Yahoo Finance API für Echtzeitkurse.

Die App ist optimiert für **GitHub Pages** und bietet ein professionelles UI, das an Bloomberg-Terminals oder moderne Broker-Apps erinnert.

## Features

### Dashboard & Portfolio
*   **Echtzeit-Kurse:** Daten von Aktien, ETFs, Fonds, Indizes und Krypto (via Yahoo Finance).
*   **Portfolio-Tracking:** Eingabe von Stückzahlen pro Position.
*   **Live-Bewertung:** Automatische Berechnung des Gesamtwerts in EUR (inkl. Währungsumrechnung USD -> EUR).
*   **Sortierung:** Sortieren nach Name, Wert oder Portfolio-Anteil.
*   **Zeiträume:** Interaktive Wechsel zwischen 1T, 1W, 1M, 6M, 1J, 5J, MAX für das gesamte Dashboard.

### Profi-Charts (TradingView Engine)
*   **Interaktive Charts:** Zoomen, Scrollen und Fadenkreuz (Crosshair).
*   **Technische Indikatoren:** Automatische Anzeige von **SMA 50** (Blau) und **SMA 200** (Gelb/Orange).
*   **Smart Zoom:** Lädt im Hintergrund mehr historische Daten, um Gleitende Durchschnitte korrekt zu berechnen, zoomt aber initial auf den relevanten Bereich.
*   **Performance:** Zeigt die prozentuale Veränderung für den gewählten Zeitraum an.
*   **Volatilität:** Berechnet die annualisierte Volatilität (Risiko).

### Tools & Management
*   **Lokale Datenspeicherung:** Keine Registrierung nötig. Daten bleiben im Browser.
*   **Export/Import:** Backup des Portfolios als JSON-Datei.
*   **Listen-Export:** Kopieren der Depot-Zusammensetzung oder aller Links in die Zwischenablage (für Excel/Notizen).
*   **Auto-Links:** Automatische Generierung von Links zu Yahoo Finance (News für Aktien, Holdings für ETFs).
*   **Responsive:** Funktioniert perfekt auf Desktop, Tablet und Smartphone.
*   **Dark Mode:** Automatischer "Bloomberg"-Style Dark Mode oder heller Modus.

## Tech Stack

Die App wurde bewusst minimalistisch und wartungsarm entwickelt:

*   **HTML5 / CSS3 / ES6+ JavaScript** (Kein Framework wie React/Vue nötig).
*   **Tailwind CSS** (via CDN) für das Styling.
*   **TradingView Lightweight Charts** (via CDN) für die Charts.
*   **FontAwesome** (via CDN) für Icons.
*   **Yahoo Finance API** (via CORS-Proxy `corsproxy.io` oder `allorigins.win`).

## Installation & Nutzung

Da es sich um eine statische Web-App handelt, ist keine Installation nötig.

### Option A: GitHub Pages (Empfohlen)
1.  Forke dieses Repository.
2.  Gehe in deinem Repo zu `Settings` -> `Pages`.
3.  Wähle den `main` Branch und speichere.
4.  Deine App ist unter `https://dein-user.github.io/AlphaView/` erreichbar.

### Option B: Lokal ausführen
1.  Klone das Repo oder lade die Dateien herunter.
2.  Öffne den Ordner.
3.  Starte einen lokalen Server (wichtig wegen ES Modules!):
    *   VS Code: "Live Server" Extension -> `Rechtsklick index.html -> Open with Live Server`.
    *   Python: `python -m http.server`
    *   PHP: `php -S localhost:8000`
4.  Öffne `http://localhost:5500` (oder entsprechenden Port) im Browser.

## Projektstruktur

```text
/
├── index.html       # Hauptdatei (Layout, Libs)
├── js/
│   ├── app.js       # Haupt-Controller (Logik, Events)
│   ├── api.js       # Datenabruf (Yahoo API, Proxy)
│   ├── charts.js    # Chart-Rendering (TradingView)
│   ├── analysis.js  # Mathe (SMA, Volatilität, Performance)
│   ├── store.js     # Datenbank (LocalStorage)
│   ├── ui.js        # HTML-Komponenten (Karten, Listen)
│   └── theme.js     # Dark/Light Mode Logik
└── README.md        # Dokumentation
```

## Disclaimer
Diese App nutzt inoffizielle APIs und CORS-Proxies. Die Verfügbarkeit der Daten hängt von Drittanbietern ab. Die Finanzdaten dienen nur zur Information und stellen keine Anlageberatung dar.

## Lizenz
Dieses Projekt steht unter der [CC0 1.0 Universal](LICENSE) Lizenz. Es ist gemeinfrei, du kannst den Code also nach Belieben kopieren, verändern und nutzen.
