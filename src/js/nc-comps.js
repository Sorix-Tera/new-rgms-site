// nc-comps.js
// - Comps view uses RPC: nc_comps_agg(p_round, p_force, p_blacklist, p_pet, p_blacklist_pet)
// - Leaderboard view uses RPC: nc_leaderboard_rows(p_round, p_force, p_pet)
// - Hero input autocomplete via <datalist id="ncHeroList"> populated from RPC nc_distinct_heroes (type=hero)
// - Pet input autocomplete via <datalist id="ncPetList"> populated from RPC nc_distinct_pets (type=pet)

(function () {
  const RPC_COMPS = "nc_comps_agg";
  const RPC_LB = "nc_leaderboard_rows";
  const RPC_HEROES = "nc_distinct_heroes";
  const RPC_PETS = "nc_distinct_pets";

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function normalizeName(name) {
    return (name || "").trim();
  }

  function toIconSlug(name) {
    return normalizeName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function parseCompUnits(compStr) {
    const raw = (compStr || "").trim();
    if (!raw) return [];
    return raw.split(" - ").map((s) => s.trim()).filter(Boolean);
  }

  function formatTime(val) {
    if (val == null || Number.isNaN(val)) return "—";
    return `${Number(val).toFixed(2)}s`;
  }

  function debounce(fn, waitMs) {
    let t = null;
    return function (...args) {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn.apply(this, args), waitMs);
    };
  }

  function setActiveView(root, view) {
    qsa(".nc-tab", root).forEach((btn) => {
      const isActive = btn.getAttribute("data-view") === view;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });

    qsa(".nc-panel", root).forEach((panel) => {
      const isActive = panel.getAttribute("data-view") === view;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  function setActiveRound(root, round) {
    qsa(".nc-round-tab", root).forEach((btn) => {
      const isActive = btn.getAttribute("data-round") === String(round);
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });
  }

  function getSelectedRound(root) {
    const active = qs(".nc-round-tab.is-active", root);
    return active ? Number(active.getAttribute("data-round")) : 1;
  }

  function setActiveLbRound(root, round) {
    qsa(".nc-lb-round-btn", root).forEach((btn) => {
      const isActive = btn.getAttribute("data-round") === String(round);
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });
  }

  function getLeaderboardRound(root) {
    const active = qs(".nc-lb-round-btn.is-active", root);
    return active ? Number(active.getAttribute("data-round")) : 1;
  }

  // -------------------------
  // Autocomplete lists
  // -------------------------

  async function rpcListNames(rpcName) {
    if (typeof supabaseClient === "undefined") {
      throw new Error("supabaseClient is not available");
    }
    const { data, error } = await supabaseClient.rpc(rpcName);
    if (error) throw error;
    return (data || []).map((r) => normalizeName(r.name)).filter(Boolean);
  }

  function fillDatalist(root, id, names) {
    const dl = qs(`#${id}`, root);
    if (!dl) return;
    dl.innerHTML = "";
    for (const name of names) {
      const opt = document.createElement("option");
      opt.value = name;
      dl.appendChild(opt);
    }
  }

  let listsLoaded = false;

  async function ensureLists(root) {
    if (listsLoaded) return;
    try {
      const [heroes, pets] = await Promise.all([
        rpcListNames(RPC_HEROES),
        rpcListNames(RPC_PETS),
      ]);
      fillDatalist(root, "ncHeroList", heroes);
      fillDatalist(root, "ncPetList", pets);
    } catch (e) {
      console.error("Failed loading autocomplete lists:", e);
    } finally {
      listsLoaded = true;
    }
  }

  // -------------------------
  // Filter readers
  // -------------------------

  function readCompsForce(root) {
    const panel = qs("#ncPanelComps", root);
    if (!panel) return [];

    const rows = qsa(".nc-filter-col-force .nc-force-row", panel);
    const out = [];

    for (const row of rows) {
      const hero = normalizeName(qs(".nc-force-hero", row)?.value || "");
      const si = (qs(".nc-force-si", row)?.value || "").trim();
      const furn = (qs(".nc-force-furn", row)?.value || "").trim();
      if (!hero) continue;
      out.push({ hero, si, furn });
    }
    return out;
  }

  function readCompsBlacklist(root) {
    const panel = qs("#ncPanelComps", root);
    if (!panel) return [];

    const inputs = qsa(".nc-blacklist-hero", panel);
    const names = inputs.map((i) => normalizeName(i.value)).filter(Boolean);

    const seen = new Set();
    const out = [];
    for (const n of names) {
      const key = n.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(n);
      }
    }
    return out;
  }

  function readCompsPet(root) {
    const panel = qs("#ncPanelComps", root);
    if (!panel) return "";
    return normalizeName(qs(".nc-pet-input", panel)?.value || "");
  }

  function readCompsBlacklistPet(root) {
    const panel = qs("#ncPanelComps", root);
    if (!panel) return "";
    return normalizeName(qs(".nc-blacklist-pet", panel)?.value || "");
  }

  function readLeaderboardForce(root) {
    const panel = qs("#ncPanelLeaderboard", root);
    if (!panel) return [];

    const rows = qsa(".nc-leaderboard-row", panel);
    const out = [];
    for (const row of rows) {
      const hero = normalizeName(qs(".nc-lb-hero", row)?.value || "");
      const si = (qs(".nc-lb-si", row)?.value || "").trim();
      const furn = (qs(".nc-lb-furn", row)?.value || "").trim();
      if (!hero) continue;
      out.push({ hero, si, furn });
    }
    return out;
  }

  function readLeaderboardPet(root) {
    const panel = qs("#ncPanelLeaderboard", root);
    if (!panel) return "";
    return normalizeName(qs(".nc-lb-pet", panel)?.value || "");
  }

  // -------------------------
  // Status helpers
  // -------------------------

  function setStatus(root, msg) {
    const el = qs("#ncCompsStatus", root);
    if (el) el.textContent = msg || "";
  }

  function setLbStatus(root, msg) {
    const el = qs("#ncLbStatus", root);
    if (el) el.textContent = msg || "";
  }

  // -------------------------
  // Rendering helpers
  // -------------------------

  function makeIconImg({ name, kind, sizePx }) {
    const slug = toIconSlug(name);
    const img = document.createElement("img");
    const base = kind === "pet" ? "icons/pets" : "icons/heroes2";
    img.src = `${base}/${slug}.jpg`;

    img.alt = name;
    img.title = name;
    img.loading = "lazy";
    img.style.width = `${sizePx}px`;
    img.style.height = `${sizePx}px`;
    img.style.borderRadius = "10px";
    img.style.objectFit = "cover";
    img.style.border = "1px solid rgba(255,255,255,0.10)";
    img.style.background = "rgba(255,255,255,0.02)";

    img.addEventListener("error", () => {
      if (img.dataset.tryPng !== "1") {
        img.dataset.tryPng = "1";
        img.src = `${base}/${slug}.png`;
        return;
      }
      if (img.dataset.fallback !== "1") {
        img.dataset.fallback = "1";
        img.src = "icons/heroes2/unknown.png";
        img.alt = "Unknown";
        img.title = "Unknown";
        return;
      }
      img.style.display = "none";
    });

    return img;
  }

  function renderComps(root, compRows) {
    const results = qs("#ncCompsResults", root);
    if (!results) return;

    results.innerHTML = "";
    results.style.display = "grid";
    results.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    results.style.gap = "0.9rem";
    results.style.marginTop = "0.9rem";

    if (!compRows || compRows.length === 0) return;

    for (const item of compRows) {
      const units = parseCompUnits(item.comp);
      const heroUnits = units.slice(0, Math.max(0, units.length - 1));
      const petUnit = units.length >= 1 ? units[units.length - 1] : null;

      const card = document.createElement("article");
      card.style.background = "rgba(5, 6, 10, 0.85)";
      card.style.border = "1px solid rgba(255, 255, 255, 0.06)";
      card.style.borderRadius = "var(--radius-lg)";
      card.style.boxShadow = "var(--shadow-soft)";
      card.style.padding = "0.85rem 0.95rem";

      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.alignItems = "center";
      top.style.justifyContent = "space-between";
      top.style.gap = "0.8rem";
      top.style.marginBottom = "0.55rem";

      const time = document.createElement("div");
      time.style.fontWeight = "900";
      time.style.whiteSpace = "nowrap";
      time.textContent = `Avg: ${formatTime(item.avg_time)} Best: ${formatTime(item.best_time)}`;

      const sample = document.createElement("div");
      sample.style.color = "var(--text-muted)";
      sample.style.fontSize = "0.85rem";
      sample.style.whiteSpace = "nowrap";
      sample.textContent = `${item.run_count ?? 0} runs`;

      top.appendChild(time);
      top.appendChild(sample);

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.gap = "0.45rem";
      row.style.alignItems = "center";
      row.style.flexWrap = "nowrap";

      for (const h of heroUnits) row.appendChild(makeIconImg({ name: h, kind: "hero", sizePx: 42 }));
      if (petUnit) row.appendChild(makeIconImg({ name: petUnit, kind: "pet", sizePx: 42 }));

      card.appendChild(top);
      card.appendChild(row);
      results.appendChild(card);
    }
  }

  function renderLeaderboard(root, rows) {
    const table = qs("#ncLbTable", root);
    const tbody = table?.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    for (const r of rows || []) {
      const tr = document.createElement("tr");

      const tdRank = document.createElement("td");
      tdRank.textContent = r.rank ?? "—";

      const tdRegion = document.createElement("td");
      tdRegion.textContent = r.region ?? "—";

      const tdName = document.createElement("td");
      tdName.textContent = r.name ?? "—";

      const tdComp = document.createElement("td");
      const units = parseCompUnits(r.comp);
      const heroUnits = units.slice(0, Math.max(0, units.length - 1));
      const petUnit = units.length >= 1 ? units[units.length - 1] : null;

      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.gap = "0.35rem";
      wrap.style.alignItems = "center";
      wrap.style.flexWrap = "nowrap";

      for (const h of heroUnits) wrap.appendChild(makeIconImg({ name: h, kind: "hero", sizePx: 28 }));
      if (petUnit) wrap.appendChild(makeIconImg({ name: petUnit, kind: "pet", sizePx: 28 }));

      tdComp.appendChild(wrap);

      const tdTime = document.createElement("td");
      tdTime.textContent = formatTime(r.time_boss);

      tr.appendChild(tdRank);
      tr.appendChild(tdRegion);
      tr.appendChild(tdName);
      tr.appendChild(tdComp);
      tr.appendChild(tdTime);

      tbody.appendChild(tr);
    }
  }

  // -------------------------
  // Data loading
  // -------------------------

  let lastCompsToken = 0;
  let lastLbToken = 0;

  async function loadComps(root) {
    const token = ++lastCompsToken;

    if (typeof supabaseClient === "undefined") {
      setStatus(root, "Supabase client is not available on this page.");
      return;
    }

    const round = getSelectedRound(root);
    const force = readCompsForce(root);
    const blacklist = readCompsBlacklist(root);
    const pet = readCompsPet(root);
    const blacklistPet = readCompsBlacklistPet(root);

    setStatus(root, "Loading comps...");
    const results = qs("#ncCompsResults", root);
    if (results) results.innerHTML = "";

    try {
      const { data, error } = await supabaseClient.rpc(RPC_COMPS, {
        p_round: round,
        p_force: force,
        p_blacklist: blacklist,
        p_pet: pet,
        p_blacklist_pet: blacklistPet,
      });

      if (token !== lastCompsToken) return;

      if (error) {
        console.error("Comps RPC error:", error);
        setStatus(root, "Error loading comps from Supabase (RPC).");
        return;
      }

      const rows = data || [];
      if (rows.length === 0) {
        setStatus(root, "No comps match these filters.");
        renderComps(root, []);
        return;
      }

      setStatus(root, "");
      renderComps(root, rows);
    } catch (err) {
      console.error("Error loading comps:", err);
      setStatus(root, "Error loading comps from Supabase.");
    }
  }

  async function loadLeaderboard(root) {
    const token = ++lastLbToken;

    if (typeof supabaseClient === "undefined") {
      setLbStatus(root, "Supabase client is not available on this page.");
      return;
    }

    const round = getLeaderboardRound(root);
    const force = readLeaderboardForce(root);
    const pet = readLeaderboardPet(root);

    setLbStatus(root, "Loading leaderboard...");
    renderLeaderboard(root, []);

    try {
      const { data, error } = await supabaseClient.rpc(RPC_LB, {
        p_round: round,
        p_force: force,
        p_pet: pet,
      });

      if (token !== lastLbToken) return;

      if (error) {
        console.error("Leaderboard RPC error:", error);
        setLbStatus(root, "Error loading leaderboard from Supabase (RPC).");
        return;
      }

      const rows = data || [];
      if (rows.length === 0) {
        setLbStatus(root, "No results match these filters.");
        renderLeaderboard(root, rows);
        return;
      }

      setLbStatus(root, "");
      renderLeaderboard(root, rows);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
      setLbStatus(root, "Error loading leaderboard from Supabase.");
    }
  }

  function bindPanelFilters(panel, handler) {
    const inputs = qsa("input, select", panel);
    for (const el of inputs) {
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const root = qs("#ncCompsPage");
    if (!root) return;

    await ensureLists(root);

    const debouncedComps = debounce(() => loadComps(root), 250);
    const debouncedLb = debounce(() => loadLeaderboard(root), 250);

    // View tabs
    qsa(".nc-tab", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const view = btn.getAttribute("data-view");
        if (!view) return;
        setActiveView(root, view);
        if (view === "leaderboard") loadLeaderboard(root);
      });
    });

    // Comps round tabs
    qsa(".nc-round-tab", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const round = btn.getAttribute("data-round");
        if (!round) return;
        setActiveRound(root, round);
        loadComps(root);
      });
    });

    // Leaderboard round buttons
    qsa(".nc-lb-round-btn", root).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const round = btn.getAttribute("data-round");
        if (!round) return;
        setActiveLbRound(root, round);
        loadLeaderboard(root);
      });
    });

    // Bind filters
    const compsPanel = qs("#ncPanelComps", root);
    if (compsPanel) bindPanelFilters(compsPanel, debouncedComps);

    const lbPanel = qs("#ncPanelLeaderboard", root);
    if (lbPanel) bindPanelFilters(lbPanel, debouncedLb);

    // Defaults
    setActiveView(root, "comps");
    setActiveRound(root, "1");
    setActiveLbRound(root, "1");

    // Initial load
    loadComps(root);
  });
})();