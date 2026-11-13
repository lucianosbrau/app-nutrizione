# CONTINUITÀ — App Nutrizione

Documento di continuità del progetto. Scopo: permettere a qualunque agente (o persona) di riprendere il lavoro senza perdere il contesto. **Leggere tutto questo file prima di toccare il codice.**

## 1. Presentazione del progetto

Webapp (PWA) per la gestione dei pasti di una dieta prescritta da una nutrizionista. Il proprietario **non è un programmatore**, usa l'app **solo da telefono** (mai da PC), e su GitHub sa fare: merge di una PR e attivazione di GitHub Pages. Tutto il resto è a carico dell'agente.

Requisiti originali:
- Dieta settimanale tipo fornita via foto: solo **pranzi e cene** (colazione e merende escluse). Il pranzo e la cena di un giorno formano una **coppia inseparabile** (card).
- I giorni si possono ruotare tra loro, ma le coppie restano accoppiate.
- 4 sezioni originarie: settimana in corso con spunta pasto effettuato; programmazione settimanale; tabelle informative; lista della spesa con rimozione di ciò che si ha a casa ed esportazione.
- PWA **senza backend**: dati solo sul dispositivo (localStorage), offline totale, pubblicata su GitHub Pages.

## 2. Architettura

- Repo: `lucianosbrau/app-nutrizione` (pubblica; la decisione sulla privacy è documentata in §4.7).
- Stack: HTML/CSS/JS vanilla, moduli ES, service worker (`sw.js`, cache-first), manifest. **Zero dipendenze, zero build.**
- Pubblicazione: GitHub Pages da `main` (root) → `https://lucianosbrau.github.io/app-nutrizione/`
- File chiave:
  - `index.html` — 5 viste + barra di navigazione + modale generica (`#modal`)
  - `css/style.css` — stile (carte bianche, verde #2e7d32, accoriani, modale scrollabile)
  - `js/app.js` — tutta la logica di presentazione (render viste, selettori giorno, aggregazione spesa, rollover lunedì)
  - `js/state.js` — store con persistenza su `localStorage` (chiave `nutrizione-app-v1`)
  - `data/menus.json` — menu mensili; `data/tables.json` — tabelle informative
- Modello dati:
  - `menus`: array di `{id, name, pairs[8]}` — ogni pair: `{id, label, lunch:{name, ingredients:[{name, qty}]}, dinner:{...}}`. Etichette A–G; sabato varianti `F.1` (id `sabato`) e `F.2` (id `sabato-pizza`).
  - `activeMenuId` — menu di default corrente (attivazione manuale).
  - `activeWeek` / `planning` (prossima settimana) / `history[]`: `{startDate, menuId, days[7] (pair id o null), done[]}`. **Ogni settimana registra il suo menu**: lo storico mostra sempre le card del mese giusto.
  - `shopping[]`: `{name, qty, checked}` — checked = già a casa.
- Regole di business:
  - Una card può comparire **una sola volta per settimana**: nel selettore della settimana attuale, scegliere una card già usata = **scambio dei due giorni**; la sostituzione direttta è possibile solo con card non usate.
  - Rollover automatico: all'apertura, se il lunedì della settimana attuale è passato, la attuale va in `history`, la `planning` diventa attuale (e la spesa si rigenera), la programmazione si azzera per la settimana dopo.
  - Spesa: aggregazione ingredienti della settimana attuale per nome; quantità sommate **per misura** (gr/ml totali, pezzi e cubetti contati, ≥1000 gr mostrato in kg); **olio di oliva sempre escluso**; se la settimana contiene `sabato-pizza`, la pizza non viene comprata ma si aggiungono farina 1 kg, lievito di birra fresco 1 cubetto, mozzarella 250 gr; le spunte fatte si conservano quando la lista si rigenera.

## 3. Flusso operativo consolidato

1. L'agente lavora su un branch `vibe/<slug>-1a55af`, apre una **PR verso `main`** con descrizione completa (Summary + Verification).
2. **Il merge lo fa sempre il proprietario** (pulsante verde). L'ambiente agente ha un blocco di policy su merge e chiamate API mutanti: non insistere, non tentare bypass; chiedere al proprietario.
3. Dopo il merge, GitHub Pages pubblica da solo in ~1-2 minuti. Verificare la versione online con fetch di `js/app.js` (cache-buster `?v=<timestamp>`) cercando `VERSION = "..."`.
4. Il proprietario verifica sul telefono guardando la versione mostrata nell'header (es. `v1.7`).

**Convenzioni tecniche obbligatorie:**
- A ogni modifica funzionale: bumpare `VERSION` in `js/app.js`, `CACHE` in `sw.js` **e** la `version` in `version.json` (il file serve al controllo di auto-aggiornamento: l'app lo interroga a ogni apertura e, se il server ha una versione diversa, forza l'aggiornamento del service worker e si ricarica). Se il bump va perso in un merge (conflitto di riga), le PWA installate continuano a servire la versione vecchia: è già successo (PR #7/#8), fare attenzione.
- Service worker cache-first: senza cambio di `CACHE` gli utenti installati non vedono gli update.
- Nessun commento nel codice; stile esistente; nessuna dipendenza nuova.
- Messaggi UI in italiano, tono semplice.

## 4. Registro delle decisioni (perché le cose sono così)

1. **PWA senza backend**: scelta del proprietario. Conseguenze note e accettate: dati solo sul dispositivo (nessun sync tra dispositivi), nessun account. Possibile futuro: export/import JSON manuale.
2. **Coppia pranzo+cena inseparabile**: la nutrizionista li ha accoppiati; le card non si separano mai.
3. **Solo pranzo/cena**: colazione e merende esclusi su richiesta esplicita.
4. **Drag & drop rimosso** (PR #5): sostituito da tap sul giorno → selettore card. Il drag era fragile su touch; il proprietario l'ha ritirato volontariamente.
5. **Etichette A–G** invece dei nomi dei giorni (PR #5): le card si chiamano A, B, C, D, E, F.1 (sabato senza pizza), F.2 (sabato pizza), G. Il selettore mostra lettera + riepilogo pranzo · cena.
6. **Rollover del lunedì** (PR #7): la programmazione È la prossima settimana; il lunedì mattina il passaggio è automatico. Il vecchio pulsante "Valida settimana" è stato rimosso perché ridondante.
7. **Repo pubblica**: il proprietario ha valutato la privacy — nel codice non ci sono nomi né dati personali (solo piatti e quantità) — e ha scelto di restare pubblico (GitHub Pages gratuito richiede repo pubblica su piano free). Eventuali dati personali NON vanno mai nei file della repo: solo nel localStorage del telefono.
8. **Menu mensili** (PR #10): ogni mese = 8 nuove coppie, fornite via foto dalla nutrizionista. Attivazione **manuale** del nuovo menu (non automatica il 1°). Etichette A–G ripartono da zero ogni mese. Quinta sezione "Menu" per lo storico e il cambio default.
9. **Spesa con quantità sommate** (PR #4 + affinamenti): ogni ingrediente è un item unico; quantità aggregate per misura; misure miste mostrate entrambe ("100 gr + 2 pezzi"); non sommabili elencate ("q.b.").
10. **Fix tastiera** (PR #10): la PWA apriva la tastiera all'avvio; risolto con blur del focus attivo su pageshow/visibilitychange/focusout + `interactive-widget=resizes-content`.

## 5. Come aggiungere il Mese 2 (o successivi)

1. Il proprietario invia le foto dei nuovi menù (in chat o nella cartella Drive "app dieta Ludovica" — cartella pubblica "chiunque abbia il link" per consentire il download diretto; foto dei soli pranzo/cene, 8 coppie).
2. Trascriverle con OCR e **far confermare i contenuti al proprietario prima del merge** (l'OCR può sbagliare: es. "Jocca" era stata letta male).
3. Aggiungere in `data/menus.json` un oggetto `{id: "mese-2", name: "Mese 2", pairs: [...]}` con le stesse convenzioni: 8 coppie, etichette A–G, varianti sabato con id `sabato` / `sabato-pizza` (se esistono entrambe, la compilazione automatica chiederà pizza/senza pizza).
4. Bumpare VERSION e CACHE, PR, merge del proprietario.
5. Nell'app comparirà il banner "nuovo menu disponibile" in Settimana; il proprietario attiva manualmente dalla sezione Menu. La programmazione della prossima settimana riparte pulita sul nuovo menu.

## 6. Stato attuale (aggiornare a ogni consegna)

- Versione app: **1.8** — cache service worker **nutrizione-v9**
- PR fuse: #1–#10. PR in volo al momento della scrittura: **#11** (documentazione) e **#12** (chiusura finestre con ✕ + tasto BACK che naviga le viste invece di uscire dall'app) — se non fuse, farne il merge col proprietario.
- Funzioni attive: settimana attuale/prossima con accoriani e scambio card, spunta pasti, rollover lunedì, programmazione prossima settimana, tabelle equivalenti, spesa aggregata con esportazione, storico menu con attivazione manuale, banner nuovo menu, chiusura finestre con ✕ e tasto BACK che naviga la cronologia delle viste (non esce dall'app).
- Font: si è scelto di **rimandare** la decisione (candidate: Nunito, Poppins, Inter, Manrope — self-hosted per restare offline). Idee di design di riferimento: schermate "foodvisor" (sfondi pastello per sezione, card bianche arrotondate, accenti teal) — la cartella Drive contiene la foto di riferimento.
- Idee parcheggiate: export/import backup JSON dei dati; tema scuro; grafica foodvisor.

## 7. Errori passati da non ripetere

- **Bump di versione/cache perso in merge** (PR #7): quando due PR toccano `VERSION`/`CACHE`, il merge può tenere il valore vecchio → utenti installati bloccati sulla versione precedente. Controllare sempre dopo il merge che `main` abbia versione e cache aggiornate.
- **Bug del primo avvio** (PR #3): `store.activeWeek` poteva essere `null` e un errore JS bloccava l'intera app (navigazione inclusa). Sempre difendere i caricamenti da stato vuoto.
- **OCR**: verificare con il proprietario i termini ambigui (brand come "Jocca", grammature).
