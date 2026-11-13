import { store } from "./state.js";

const VERSION = "1.12";
const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const $ = (sel) => document.querySelector(sel);

async function loadDefaults() {
  const [menusRes, tablesRes] = await Promise.all([
    fetch("data/menus.json"),
    fetch("data/tables.json"),
  ]);
  return {
    menus: (await menusRes.json()).menus,
    tables: (await tablesRes.json()).tables,
  };
}

function defaultWeekOrder() {
  const pairs = pairsOf(store.activeMenuId);
  const saturday = pairs.find((p) => p.id === "sabato-pizza") || pairs.find((p) => p.id === "sabato");
  return pairs
    .filter((p) => p.id !== "sabato" && p.id !== "sabato-pizza")
    .slice(0, 6)
    .map((p) => p.id)
    .reduce((acc, id, idx) => (idx === 5 ? acc.concat([saturday ? saturday.id : null, id]) : acc.concat([id])), []);
}

function pairsOf(menuId) {
  const menu = store.menus.find((m) => m.id === (menuId || store.activeMenuId));
  return menu ? menu.pairs : [];
}

function menuOf(week) {
  return (week && week.menuId) || store.activeMenuId;
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

function weekDaysHtml(week, withToggles, editable) {
  const start = mondayOf(week.startDate);
  return DAYS.map((name, i) => {
    const pairId = week.days[i];
    const pair = pairsOf(menuOf(week)).find((p) => p.id === pairId);
    const dayDate = new Date(start.getTime() + i * 864e5);
    const isToday = mondayOf(new Date()).getTime() === start.getTime() &&
      new Date().getDay() === ((i + 1) % 7);
    const done = withToggles && week.done.includes(i);
    return `<div class="day${editable ? " day-tappable" : ""}" style="margin-bottom:10px" ${done ? 'data-done="1"' : ""} ${editable ? `data-day="${i}"` : ""}>
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

  if (store.menus.some((m) => m.id !== store.activeMenuId)) {
    grid.insertAdjacentHTML("afterbegin",
      `<p class="hint" style="background:var(--green-light);padding:10px 14px;border-radius:var(--radius);margin-bottom:10px">📌 È disponibile un nuovo menu: attivalo quando vuoi dalla sezione Menu.</p>`);
  }

  const week = store.activeWeek;
  if (week && week.days.some(Boolean)) {
    const start = mondayOf(week.startDate);
    grid.appendChild(accordion(
      `📅 Settimana attuale (${fmtDate(start)} — ${fmtDate(new Date(start.getTime() + 6 * 864e5))})`,
      weekDaysHtml(week, true, true),
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
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = +btn.dataset.day;
      const done = store.activeWeek.done;
      const idx = done.indexOf(i);
      if (idx >= 0) done.splice(idx, 1);
      else done.push(i);
      store.save();
      renderWeek();
    })
  );

  grid.querySelectorAll("#week-grid > .accordion:first-child .day-tappable").forEach((day) =>
    day.addEventListener("click", () => openDayPicker(+day.dataset.day, "active"))
  );
}

function renderPlanner() {
  const grid = $("#planner-grid");
  grid.innerHTML = "";
  DAYS.forEach((name, i) => {
    const pairId = store.planning.days[i];
    const pair = pairsOf(menuOf(store.planning)).find((p) => p.id === pairId);
    const day = document.createElement("div");
    day.className = "day day-tappable";
    day.dataset.slot = i;
    day.innerHTML = `<div class="day-header"><span class="day-name">${name}</span></div>`;
    if (pair) day.appendChild(pairCard(pair));
    else day.insertAdjacentHTML("beforeend", `<div class="meal" style="color:var(--muted)">— vuoto —</div>`);
    day.addEventListener("click", () => openDayPicker(i, "planning"));
    grid.appendChild(day);
  });
}

function rebuildShoppingKeepingChecks() {
  const checkedNames = new Set(store.shopping.filter((i) => i.checked).map((i) => i.name.toLowerCase()));
  store.shopping = buildShoppingList(store.activeWeek).map((i) => ({
    ...i,
    checked: checkedNames.has(i.name.toLowerCase()),
  }));
}

function openDayPicker(i, target) {
  const isPlanning = target === "planning";
  const week = isPlanning ? store.planning : store.activeWeek;
  const days = week.days;
  const current = days[i];
  const afterChange = () => {
    store.save();
    if (isPlanning) renderPlanner();
    else {
      rebuildShoppingKeepingChecks();
      store.save();
      renderWeek();
    }
  };

  if (!isPlanning) {
    const dayChoices = days.map((pairId, j) => {
      const pair = pairsOf(menuOf(week)).find((p) => p.id === pairId);
      if (j === i || !pair) return null;
      return {
        label: `<strong>Scambia con ${DAYS[j]}</strong> — Card ${pair.label}<br><small>${pair.lunch.name} · ${pair.dinner.name}</small>`,
        action: () => {
          days[j] = current;
          days[i] = pairId;
          afterChange();
        },
      };
    }).filter(Boolean);
    const usedIds = new Set(days.filter(Boolean));
    const unusedChoices = pairsOf(menuOf(week))
      .filter((p) => !usedIds.has(p.id) && p.id !== current)
      .map((p) => ({
        label: `<strong>${p.label}</strong><br><small>${p.lunch.name} · ${p.dinner.name}</small>`,
        action: () => {
          days[i] = p.id;
          afterChange();
        },
      }));
    askModal(
      DAYS[i],
      current ? "Con quale giorno vuoi scambiarlo, o quale card vuoi inserire?" : "Quale card vuoi inserire?",
      dayChoices
        .concat(unusedChoices)
        .concat(
          current
            ? [
                {
                  label: "🗑️ Lascia il giorno a riposo",
                  action: () => {
                    days[i] = null;
                    afterChange();
                  },
                },
              ]
            : []
        )
    );
    return;
  }

  askModal(
    DAYS[i],
    current ? "Sostituisci o rimuovi la card di questo giorno" : "Quale coppia vuoi inserire?",
    pairsOf(menuOf(week)).map((p) => ({
      label: `${days[i] === p.id ? "✓ " : ""}<strong>${p.label}</strong><br><small>${p.lunch.name} · ${p.dinner.name}</small>`,
      action: () => {
        const other = days.indexOf(p.id);
        if (other >= 0 && other !== i) days[other] = current;
        days[i] = p.id;
        afterChange();
      },
    })).concat(
      current
        ? [
            {
              label: "🗑️ Rimuovi card",
              action: () => {
                days[i] = null;
                afterChange();
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

function renderMenus() {
  const c = $("#menus-container");
  c.innerHTML = "";
  [...store.menus].reverse().forEach((menu) => {
    const isActive = menu.id === store.activeMenuId;
    const body = `
      ${menu.pairs.map((p) => `
        <div class="card card-editable" data-menu="${menu.id}" data-pair="${p.id}">
          <div class="card-title">${p.label} <small style="font-weight:400;color:var(--muted)">✏️ modifica</small></div>
          <div class="card-meal">🍽️ ${p.lunch.name}</div>
          <div class="card-meal">🌙 ${p.dinner.name}</div>
        </div>`).join("")}
      ${isActive ? "" : `<button class="menu-activate" data-menu="${menu.id}">Imposta come menu di default</button>`}`;
    c.appendChild(accordion(
      `${menu.name}${isActive ? " ✓ attivo" : ""}`,
      body,
      false
    ));
  });
  c.querySelectorAll(".card-editable").forEach((card) =>
    card.addEventListener("click", () => openCardEditor(card.dataset.menu, card.dataset.pair))
  );
  c.querySelectorAll(".menu-activate").forEach((btn) =>
    btn.addEventListener("click", () => {
      store.activeMenuId = btn.dataset.menu;
      store.planning = { startDate: nextMonday().toISOString(), menuId: store.activeMenuId, days: Array(7).fill(null) };
      store.save();
      renderMenus();
      toast("Menu di default aggiornato: la programmazione ora usa il nuovo menu");
    })
  );
}

const UNITS = ["gr", "ml", "kg", "l", "pezzi", "cubetti", "q.b."];

function splitQty(qty) {
  const m = String(qty || "").trim().match(/^(\d+)\s*(kg|gr|g|ml|l|pezzi|cubetti)\b/);
  if (m) return { n: m[1], unit: m[2] === "g" ? "gr" : m[2] };
  if (/^\d+\s*\(/.test(String(qty || "").trim())) {
    const p = String(qty).match(/^(\d+)/);
    return { n: p[1], unit: "pezzi" };
  }
  if (/q\.b\./.test(String(qty || ""))) return { n: "", unit: "q.b." };
  return { n: "", unit: "" };
}

function composeQty(n, unit) {
  if (unit === "q.b.") return "q.b.";
  if (!unit) return n || "";
  return `${n || ""} ${unit}`.trim();
}

function openCardEditor(menuId, pairId) {
  const menu = store.menus.find((m) => m.id === menuId);
  const pair = menu && menu.pairs.find((p) => p.id === pairId);
  if (!pair) return;

  const mealBlock = (meal, mealKey) => `
    <div class="editor-meal">
      <label class="editor-label">${mealKey === "lunch" ? "🍽️ Pranzo" : "🌙 Cena"}</label>
      <input type="text" class="editor-name" data-meal="${mealKey}" value="${pair[mealKey].name}" autocomplete="off">
      <div class="editor-ings" data-meal="${mealKey}">
        ${pair[mealKey].ingredients.map((ing, idx) => ingRow(ing, mealKey, idx)).join("")}
      </div>
      <button class="editor-add" data-meal="${mealKey}">+ Aggiungi ingrediente</button>
    </div>`;

  const ingRow = (ing, mealKey, idx) => {
    const { n, unit } = splitQty(ing.qty);
    return `
      <div class="editor-row">
        <input type="text" class="ing-name" placeholder="Ingrediente" value="${ing.name}" autocomplete="off">
        <input type="text" inputmode="numeric" class="ing-qty" placeholder="Qtà" value="${n}" autocomplete="off">
        <select class="ing-unit">
          ${UNITS.map((u) => `<option value="${u}" ${u === unit ? "selected" : ""}>${u}</option>`).join("")}
          <option value="" ${!unit ? "selected" : ""}>altro</option>
        </select>
        <button class="ing-remove" aria-label="Rimuovi">✕</button>
      </div>`;
  };

  $("#modal-title").textContent = `Modifica card ${pair.label}`;
  $("#modal-text").innerHTML = mealBlock(pair.lunch, "lunch") + mealBlock(pair.dinner, "dinner");
  const actions = $("#modal-actions");
  actions.innerHTML = "";

  const save = document.createElement("button");
  save.textContent = "💾 Salva modifiche";
  save.addEventListener("click", () => {
    const readMeal = (mealKey) => {
      const name = $(`#modal-text .editor-name[data-meal="${mealKey}"]`).value.trim();
      const ingredients = [...$(`#modal-text .editor-ings[data-meal="${mealKey}"]`).querySelectorAll(".editor-row")]
        .map((row) => ({
          name: row.querySelector(".ing-name").value.trim(),
          qty: composeQty(row.querySelector(".ing-qty").value.trim(), row.querySelector(".ing-unit").value),
        }))
        .filter((ing) => ing.name);
      return { name, ingredients };
    };
    pair.lunch = readMeal("lunch");
    pair.dinner = readMeal("dinner");
    store.menusDirty = true;
    store.save();
    $("#modal").classList.add("hidden");
    modalOpen = false;
    history.back();
    renderMenus();
    toast("Card aggiornata");
  });
  actions.appendChild(save);

  $("#modal-text").querySelectorAll(".editor-add").forEach((btn) =>
    btn.addEventListener("click", () => {
      const mealKey = btn.dataset.meal;
      const empty = { name: "", qty: "" };
      const holder = $(`#modal-text .editor-ings[data-meal="${mealKey}"]`);
      holder.insertAdjacentHTML("beforeend", ingRow(empty, mealKey, -1));
      wireRow(holder.lastElementChild);
    })
  );

  const wireRow = (row) => {
    row.querySelector(".ing-remove").addEventListener("click", () => row.remove());
  };
  $("#modal-text").querySelectorAll(".editor-row").forEach(wireRow);

  const oldX = $("#modal .modal-close");
  if (oldX) oldX.remove();
  const x = document.createElement("button");
  x.className = "modal-close";
  x.textContent = "✕";
  x.setAttribute("aria-label", "Chiudi");
  x.addEventListener("click", hideModal);
  $("#modal .modal-box").insertBefore(x, $("#modal .modal-box").firstChild);

  modalOpen = true;
  history.pushState({ modal: true }, "");
  $("#modal").classList.remove("hidden");
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
      store.shoppingUndo.push(item.name);
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
    const pair = pairsOf(menuOf(week)).find((p) => p.id === pairId);
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

let modalOpen = false;

function hideModal() {
  if (!modalOpen) return;
  modalOpen = false;
  $("#modal").classList.add("hidden");
  history.back();
}

function askModal(title, text, choices) {
  $("#modal-title").textContent = title;
  $("#modal-text").textContent = text;
  const actions = $("#modal-actions");
  actions.innerHTML = "";
  choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.innerHTML = c.label;
    btn.addEventListener("click", () => {
      $("#modal").classList.add("hidden");
      modalOpen = false;
      history.back();
      c.action();
    });
    actions.appendChild(btn);
  });
  const oldX = $("#modal .modal-close");
  if (oldX) oldX.remove();
  const x = document.createElement("button");
  x.className = "modal-close";
  x.textContent = "✕";
  x.setAttribute("aria-label", "Chiudi");
  x.addEventListener("click", hideModal);
  $("#modal .modal-box").insertBefore(x, $("#modal .modal-box").firstChild);
  modalOpen = true;
  history.pushState({ modal: true }, "");
  $("#modal").classList.remove("hidden");
}

window.addEventListener("popstate", (e) => {
  if (modalOpen) {
    modalOpen = false;
    $("#modal").classList.add("hidden");
    return;
  }
  if (e.state && e.state.view) switchView(e.state.view, false);
});

function switchView(name, pushHistory = true) {
  if (pushHistory) history.pushState({ view: name }, "");

  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(`#view-${name}`).classList.remove("hidden");
  document.querySelectorAll("#bottom-nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name)
  );
  if (name === "week") renderWeek();
  if (name === "planner") renderPlanner();
  if (name === "tables") renderTables();
  if (name === "shopping") renderShopping();
  if (name === "menus") renderMenus();
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
    store.activeWeek = { startDate: new Date(thisMonday).toISOString(), menuId: store.activeMenuId, days: Array(7).fill(null), done: [] };
  }
  store.planning = { startDate: nextMonday().toISOString(), menuId: store.activeMenuId, days: Array(7).fill(null) };
  store.save();
}

function init(defaults) {
  store.init(defaults);

  if (!store.activeWeek || !store.activeWeek.days.some(Boolean)) {
    store.activeWeek = {
      startDate: mondayOf(new Date()).toISOString(),
      menuId: store.activeMenuId,
      days: defaultWeekOrder(),
      done: [],
    };
    store.save();
  }
  if (!store.planning || !store.planning.days) {
    store.planning = { startDate: nextMonday().toISOString(), menuId: store.activeMenuId, days: Array(7).fill(null) };
    store.save();
  }
  if (store.activeWeek && !store.activeWeek.menuId) store.activeWeek.menuId = store.activeMenuId;
  if (store.planning && !store.planning.menuId) store.planning.menuId = store.activeMenuId;
  store.history.forEach((w) => { if (!w.menuId) w.menuId = store.activeMenuId; });
  rolloverIfNeeded();

  document.querySelectorAll("#bottom-nav button").forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view))
  );

  $("#btn-auto").addEventListener("click", () => {
    const pairs = pairsOf(store.activeMenuId);
    const defaultSaturday = pairs.find((p) => p.id === "sabato-pizza") || pairs.find((p) => p.id === "sabato");
    autoFill(defaultSaturday ? defaultSaturday.id : null);
  });

  function autoFill(saturdayId) {
    const pairs = pairsOf(store.activeMenuId);
    const others = pairs.filter((p) => p.id !== "sabato" && p.id !== "sabato-pizza").map((p) => p.id);
    const days = others.slice(0, 5)
      .concat(saturdayId ? [saturdayId] : [])
      .concat(others.slice(5));
    store.planning = {
      startDate: nextMonday().toISOString(),
      menuId: store.activeMenuId,
      days,
    };
    store.save();
    renderPlanner();
    toast("Prossima settimana compilata");
  }

  $("#btn-manual").addEventListener("click", () => {
    store.planning = {
      startDate: nextMonday().toISOString(),
      menuId: store.activeMenuId,
      days: Array(7).fill(null),
    };
    store.save();
    renderPlanner();
    toast("Prossima settimana svuotata: tocca i giorni per compilare");
  });

  $("#btn-shopping-build").addEventListener("click", () => {
    store.shopping = buildShoppingList(store.activeWeek);
    store.shoppingUndo = [];
    store.save();
    renderShopping();
    toast("Lista rigenerata");
  });

  $("#btn-shopping-next").addEventListener("click", () => {
    if (!store.planning.days.some(Boolean)) {
      toast("La prossima settimana non è ancora programmata");
      return;
    }
    store.shopping = buildShoppingList(store.planning);
    store.shoppingUndo = [];
    store.save();
    renderShopping();
    toast("Lista generata dalla prossima settimana");
  });

  $("#btn-shopping-undo").addEventListener("click", () => {
    const lastName = store.shoppingUndo.pop();
    if (!lastName) {
      toast("Nessuna spunta da annullare");
      return;
    }
    const item = store.shopping.find((i) => i.name.toLowerCase() === lastName.toLowerCase());
    if (item) item.checked = false;
    store.save();
    renderShopping();
    toast(`Rimesso in lista: ${lastName}`);
  });

  $("#btn-shopping-clear").addEventListener("click", () => {
    store.shopping = [];
    store.shoppingUndo = [];
    store.save();
    renderShopping();
    toast("Lista della spesa cancellata");
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

function blurActive() {
  if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) {
    document.activeElement.blur();
  }
}

window.addEventListener("pageshow", blurActive);
window.addEventListener("focusout", () => setTimeout(blurActive, 0));
document.addEventListener("visibilitychange", () => { if (!document.hidden) blurActive(); });

loadDefaults().then(init).then(blurActive);
