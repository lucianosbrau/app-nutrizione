# App Nutrizione

PWA per la gestione dei pasti della dieta settimanale. Senza backend: tutti i dati sono salvati sul dispositivo (localStorage) e l'app funziona offline.

## Sezioni

- **Settimana** — la settimana in corso con possibilità di segnare i pasti effettuati.
- **Programma** — programmazione settimanale con compilazione automatica (coppie pranzo+cena come da piano della nutrizionista) o manuale, con drag & drop delle card. La validazione sposta la settimana in corso nello storico e genera la lista della spesa.
- **Tabelle** — tabelle informative estratte dal piano nutrizionale.
- **Spesa** — lista della spesa generata dalla settimana attiva, con spunta per gli ingredienti già a casa ed esportazione.

## Pubblicazione (GitHub Pages)

1. Repository → **Settings → Pages**.
2. Source: **Deploy from a branch**, branch `main`, cartella `/ (root)`.
3. L'app sarà disponibile su `https://lucianosbrau.github.io/app-nutrizione/`.

Dal browser del telefono: **Condividi → Aggiungi a schermata Home** per installarla come app.

## Dati

- `data/defaultWeek.json` — le 7 coppie pranzo+cena della settimana tipo (nome piatti e ingredienti con quantità).
- `data/tables.json` — le tabelle informative.

## Sviluppo

HTML/CSS/JS vanilla, nessuna dipendenza, nessun build. Per provarla in locale serve un server statico (es. `python3 -m http.server`), perché i moduli ES e il service worker non funzionano da `file://`.
