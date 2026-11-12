import { store } from "./state.js";

const VERSION = "1.3";
const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const $ = (sel) => document.querySelector(sel);

async function loadDefaults() {
  const [weekRes, tablesRes] = await Promise.all([
    fetch("data/defaultWeek.json"),
    fetch("data/tables.json"),
  ]);
  return {
    pairs: (await weekRes.json()).pairs,
    tables: (await tablesRes.json()).tables,
  };
}

function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(d) {
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
}

function ingList(meal) {
  return meal.ingredients
    .map((ing) => `${ing.name} (${ing.qty})`)
    .join(" · ");
}

function pairCard(pair) {
  const div = document.createElement("div");
  div.className = "card";
  div.dataset.pairId = pair.id;
  div.innerHTML = `
    <div class="card-title">${pair.label}</div>
    <div class="card-meal">🍽️ ${pair.lunch.name}<br><span class="card-ing">${ingList(pair.lunch)}</span></div>
    <div class="card-meal">🌙 ${pair.dinner.name}<br><span class="card-ing">${ingList(pair.dinner)}</span></div>`;
  return div;
}

function weekDaysHtml(week, withToggles) {
  const start = mondayOf(week.startDate);
  return DAYS.map((name, i) => {
    const pairId = week.days[i];
    const pair = store.pairs.find((p) => p.id === pairId);
    const dayDate = new Date(start.getTime() + i * 864e5);
    const isToday = mondayOf(new Date()).getTime() === start.getTime() &&
      new Date().getDay() === ((i + 1) % 7);
    const done = withToggles && week.done.includes(i);
    return `<div class="day" style="margin-bottom:10px" ${done ? 'data-done="1"' : ""}>
      <div class="day-header">
        <span class="day-name">${name} ${dayDate.getDate()}/${dayDate.getMonth() + 1}${isToday ? " • oggi" : ""}</span>
        ${withToggles ? `<button class="done-toggle ${done ? "checked" : ""}" data-day="${i}">${done ? "Fatto ✓" : "Segna fatto"}</button>` : ""}
      </div>
      ${pair ? `
        <div class="meal"><span class="label">Pranzo</span>${pair.lunch.name}<br><span class="card-ing">${ingList(pair.lunch)}</span></div>
        <div class="meal"><span class="label">Cena</span>${pair.dinner.name}<br><span class="card-ing">${ingList(pair.dinner)}</span></div>` : `<div class="meal" style="color:var(--muted)">Riposo</div>`}
    </div>`;
  }).join("");
}

function accordion(title, bodyHtml, open, empty) {
  const box = document.createElement("div");
  box.className = "accordion";
  box.innerHTML = `
    <button class="acc-header">${title} <span class="acc-arrow">${open ? "▲" : "▼"}</span></button>
    <div class="acc-body ${open ? "" : "hidden"}">${empty || bodyHtml}</div>`;
  box.querySelector(".acc-header").addEventListener("click", () => {
    const body = box.querySelector(".acc-body");
    const isHidden = body.classList.toggle("hidden");
    box.querySelector(".acc-arrow").textContent = isHidden ? "▼" : "▲";
  });
  return box;
}

function renderWeek() {
  const grid = $("#week-grid");
  grid.innerHTML = "";

  const week = store.activeWeek;
  if (week && week.days.some(Boolean)) {
    const start = mondayOf(week.startDate);
    grid.appendChild(accordion(
      `📅 Settimana attuale (${fmtDate(start)} — ${fmtDate(new Date(start.getTime() + 6 * 864e5))})`,
      weekDaysHtml(week, true),
      true
    ));
  } else {
    grid.appendChild(accordion("📅 Settimana attuale", "", true,
      `<p class="hint">Nessuna settimana attiva. Compila la prossima settimana nella sezione Programma.</p>`));
  }

  const next = store.planning;
  if (next && next.days.some(Boolean)) {
    const start = mondayOf(next.startDate);
    grid.appendChild(accordion(
      `🗓️ Prossima settimana (${fmtDate(start)} — ${fmtDate(new Date(start.getTime() + 6 * 864e5))})`,
      weekDaysHtml(next, false),
      false
    ));
  }

  grid.querySelectorAll(".done-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const i = +btn.dataset.day;
      const done = store.activeWeek.done;
      const idx = done.indexOf(i);
      if (idx >= 0) done.splice(idx, 1);
      else done.push(i);
      store.save();
      renderWeek();
    })
  );
}

function renderPlanner() {
  const grid = $("#planner-grid");
  grid.innerHTML = "";
  DAYS.forEach((name, i) => {
    const pairId = store.planning.days[i];
    const pair = store.pairs.find((p) => p.id === pairId);
    const day = document.createElement("div");
    day.className = "day day-tappable";
    day.dataset.slot = i;
    day.innerHTML = `<div class="day-header"><span class="day-name">${name}</span></div>`;
    if (pair) day.appendChild(pairCard(pair));
    else day.insertAdjacentHTML("beforeend", `<div class="meal" style="color:var(--muted)">— vuoto —</div>`);
    day.addEventListener("click", () => openDayPicker(i));
    grid.appendChild(day);
  });
}

function openDayPicker(i) {
  const days = store.planning.days;
  const current = days[i];
  askModal(
    DAYS[i],
    current ? "Sostituisci o rimuovi la card di questo giorno" : "Quale coppia vuoi inserire?",
    store.pairs.map((p) => ({
      label: `${days[i] === p.id ? "✓ " : ""}${p.label}`,
      action: () => {
        days[i] = p.id;
        store.save();
        renderPlanner();
      },
    })).concat(
      current
        ? [
            {
              label: "🗑️ Rimuovi card",
              action: () => {
                days[i] = null;
                store.save();
                renderPlanner();
              },
            },
          ]
        : []
    )
  );
}

function renderTables() {
  const c = $("#tables-container");
  c.innerHTML = "";
  if (!store.tables.length) {
    c.innerHTML = `<p class="hint">Nessuna tabella disponibile.</p>`;
    return;
  }
  store.tables.forEach((t) => {
    const h = document.createElement("h3");
    h.textContent = t.title;
    c.appendChild(h);
    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr>${t.columns.map((col) => `<th>${col}</th>`).join("")}</tr></thead>
      <tbody>${t.rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody>`;
    c.appendChild(table);
  });
}

function renderShopping() {
  const ul = $("#shopping-list");
  ul.innerHTML = "";
  const items = store.shopping.filter((i) => !i.checked);
  if (!items.length) {
    ul.innerHTML = `<p class="hint">Nessun articolo nella lista della spesa. Tocca "Genera da settimana attiva" o valida il calendario nella sezione Programma.</p>`;
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <input type="checkbox" aria-label="${item.name}">
      <span>${item.name}</span>
      <span class="qty">${item.qty}</span>`;
    li.querySelector("input").addEventListener("change", () => {
      item.checked = true;
      store.save();
      li.classList.add("removing");
      setTimeout(renderShopping, 350);
    });
    ul.appendChild(li);
  });
}

const SHOPPING_EXCLUDED = ["olio di oliva"];
const PIZZA_PAIR_ID = "sabato-pizza";
const PIZZA_INGREDIENTS = [
  { name: "Farina", qty: "1 kg" },
  { name: "Lievito di birra fresco", qty: "1 cubetto" },
  { name: "Mozzarella", qty: "250 gr" },
];

function parseQty(qty) {
  const m = String(qty).trim().match(/^(\d+)\s*(kg|gr|g|ml|l)\b/);
  if (m) {
    const n = +m[1];
    const unit = m[2] === "g" ? "gr" : m[2];
    return { n: unit === "kg" ? n * 1000 : unit === "l" ? n * 1000 : n, unit: unit === "kg" || unit === "l" ? "gr" : unit };
  }
  const p = String(qty).trim().match(/^(\d+)\s*\(/);
  if (p) return { n: +p[1], unit: "pezzi" };
  const c = String(qty).trim().match(/^(\d+)\s*cubetto/);
  if (c) return { n: +c[1], unit: "cubetti" };
  return null;
}

function aggregateQty(values) {
  const parsed = values.map(parseQty);
  if (parsed.length && parsed.every(Boolean)) {
    const sums = new Map();
    parsed.forEach((p) => sums.set(p.unit, (sums.get(p.unit) || 0) + p.n));
    return [...sums.entries()]
      .map(([unit, total]) =>
        unit === "gr" && total >= 1000
          ? `${(total / 1000).toLocaleString("it-IT")} kg`
          : `${total} ${unit}`
      )
      .join(" + ");
  }
  return [...new Set(values)].join(" + ");
}

function buildShoppingList(week) {
  const map = new Map();
  const hasPizza = week.days.includes(PIZZA_PAIR_ID);
  week.days.forEach((pairId) => {
    const pair = store.pairs.find((p) => p.id === pairId);
    if (!pair) return;
    [pair.lunch, pair.dinner].forEach((meal) =>
      meal.ingredients.forEach((ing) => {
        if (SHOPPING_EXCLUDED.some((x) => ing.name.toLowerCase().includes(x))) return;
        if (hasPizza && ing.name.toLowerCase().startsWith("pizza")) return;
        const key = ing.name.toLowerCase();
        const cur = map.get(key) || { name: ing.name, qtys: [], checked: false };
        cur.qtys.push(ing.qty);
        map.set(key, cur);
      })
    );
  });
  if (hasPizza) {
    PIZZA_INGREDIENTS.forEach((ing) => {
      const key = ing.name.toLowerCase();
      const cur = map.get(key) || { name: ing.name, qtys: [], checked: false };
      cur.qtys.push(ing.qty);
      map.set(key, cur);
    });
  }
  return [...map.values()].map(({ name, qtys, checked }) => ({
    name,
    qty: aggregateQty(qtys),
    checked,
  }));
}

function askModal(title, text, choices) {
  $("#modal-title").textContent = title;
  $("#modal-text").textContent = text;
  const actions = $("#modal-actions");
  actions.innerHTML = "";
  choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = c.label;
    btn.addEventListener("click", () => {
      $("#modal").classList.add("hidden");
      c.action();
    });
    actions.appendChild(btn);
  });
  $("#modal").classList.remove("hidden");
}

function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(`#view-${name}`).classList.remove("hidden");
  document.querySelectorAll("#bottom-nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name)
  );
  if (name === "week") renderWeek();
  if (name === "planner") renderPlanner();
  if (name === "tables") renderTables();
  if (name === "shopping") renderShopping();
}

function nextMonday() {
  const m = mondayOf(new Date());
  return new Date(m.getTime() + 7 * 864e5);
}

function rolloverIfNeeded() {
  const thisMonday = mondayOf(new Date()).getTime();
  const activeStart = store.activeWeek ? mondayOf(store.activeWeek.startDate).getTime() : null;
  if (activeStart === null || activeStart >= thisMonday) return;
  if (store.activeWeek.days.some(Boolean)) store.history.push(store.activeWeek);
  if (store.planning.days.some(Boolean)) {
    store.activeWeek = { ...store.planning, done: [] };
    store.shopping = buildShoppingList(store.activeWeek);
  } else {
    store.activeWeek = { startDate: new Date(thisMonday).toISOString(), days: Array(7).fill(null), done: [] };
  }
  store.planning = { startDate: nextMonday().toISOString(), days: Array(7).fill(null) };
  store.save();
}

function init(defaults) {
  store.init(defaults);

  if (!store.activeWeek || !store.activeWeek.days.some(Boolean)) {
    store.activeWeek = {
      startDate: mondayOf(new Date()).toISOString(),
      days: ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"],
      done: [],
    };
    store.save();
  }
  if (!store.planning || !store.planning.days) {
    store.planning = { startDate: nextMonday().toISOString(), days: Array(7).fill(null) };
    store.save();
  }
  rolloverIfNeeded();

  document.querySelectorAll("#bottom-nav button").forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view))
  );

  $("#btn-auto").addEventListener("click", () => {
    askModal(
      "Compilazione automatica",
      "Quale versione del sabato vuoi usare?",
      [
        {
          label: "🍕 Con pizza",
          action: () => autoFill("sabato-pizza"),
        },
        {
          label: "🥗 Senza pizza",
          action: () => autoFill("sabato"),
        },
      ]
    );
  });

  function autoFill(saturdayId) {
    const order = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", saturdayId, "domenica"];
    store.planning = {
      startDate: nextMonday().toISOString(),
      days: order,
    };
    store.save();
    renderPlanner();
    toast("Prossima settimana compilata");
  }

  $("#btn-manual").addEventListener("click", () => {
    store.planning = {
      startDate: nextMonday().toISOString(),
      days: Array(7).fill(null),
    };
    store.save();
    renderPlanner();
    toast("Prossima settimana svuotata: tocca i giorni per compilare");
  });

  $("#btn-shopping-build").addEventListener("click", () => {
    store.shopping = buildShoppingList(store.activeWeek);
    store.save();
    renderShopping();
    toast("Lista rigenerata");
  });

  $("#btn-shopping-export").addEventListener("click", async () => {
    const text = store.shopping
      .filter((i) => !i.checked)
      .map((i) => `- ${i.name} (${i.qty})`)
      .join("\n");
    if (!text) {
      toast("Lista vuota");
      return;
    }
    if (navigator.share) {
      try { await navigator.share({ title: "Lista della spesa", text }); return; } catch (e) {}
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Lista copiata negli appunti");
    } catch (e) {
      toast("Copia non disponibile");
    }
  });

  $("#app-version").textContent = `v${VERSION}`;
  switchView("week");
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

loadDefaults().then(init);
