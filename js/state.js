const KEY = "nutrizione-app-v1";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export const store = {
  menus: [],
  tables: [],
  activeWeek: null,
  planning: null,
  history: [],
  shopping: [],

  init(defaults) {
    const saved = load();
    this.menus = defaults.menus;
    this.activeMenuId = saved.activeMenuId || (this.menus[0] && this.menus[0].id);
    this.tables = defaults.tables;
    this.activeWeek = saved.activeWeek || null;
    this.history = saved.history || [];
    this.shopping = saved.shopping || [];
    this.planning = saved.planning || { startDate: new Date().toISOString(), days: Array(7).fill(null) };
  },

  save() {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        activeMenuId: this.activeMenuId,
        activeWeek: this.activeWeek,
        planning: this.planning,
        history: this.history,
        shopping: this.shopping,
      })
    );
  },
};
