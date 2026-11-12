# App Nutrizione

PWA per la gestione dei pasti della dieta settimanale. Senza backend: tutti i dati utente vivono nel `localStorage` del telefono e l'app funziona offline (service worker).

> Documentazione completa del progetto e flusso decisionale: **[CONTINUITA.md](CONTINUITA.md)** — leggere quel file prima di qualsiasi modifica.

## Sezioni (barra di navigazione in basso)

1. **Settimana** — settimana attuale (espandibile, con spunta "Segna fatto") e prossima settimana programmata. Toccando un giorno della settimana attuale si apre la schermata di scambio: altri giorni (swap) o card non ancora usate. Al lunedì mattina la settimana passata va nello storico e la programmazione diventa l'attuale.
2. **Programma** — compilazione della **prossima** settimana: automatica (con scelta pizza/senza pizza se il menu ha entrambe le varianti del sabato) o manuale, toccando i giorni.
3. **Tabelle** — tabelle informative (equivalenti di formaggi, carni, pesce, cereali).
4. **Spesa** — lista generata dalla settimana attuale: ingredienti unici con quantità sommate per misura (gr/ml totalizzati, pezzi contati, kg sopra 1000 gr), olio escluso, spunta di rimozione per ciò che si ha a casa, esportazione via share/clipboard.
5. **Menu** — storico dei menu mensili (Mese 1, Mese 2, …): ogni menu è un set di 8 coppie pranzo+cena etichettate A–G (F.1 = sabato senza pizza, F.2 = sabato pizza). Attivazione manuale del menu di default.

## Pubblicazione

GitHub Pages: branch `main`, cartella root → https://lucianosbrau.github.io/app-nutrizione/

Dal telefono: Condividi → Aggiungi a schermata Home per installarla come app.

## Dati

- `data/menus.json` — menu mensili, ognuno con 8 coppie pranzo+cena (nome piatti + ingredienti con quantità)
- `data/tables.json` — tabelle informative

## Sviluppo

HTML/CSS/JS vanilla, zero dipendenze, nessun build. Per provarla in locale: `python3 -m http.server` (i moduli ES e il service worker non funzionano da `file://`).

**Convenzioni obbligatorie:**
- A ogni modifica bumpare `VERSION` in `js/app.js` e `CACHE` in `sw.js` (se si dimentica, le PWA installate continuano a servire la versione vecchia dalla cache)
- Flusso collaborativo: l'agente prepara branch + PR, il proprietario fa il merge
