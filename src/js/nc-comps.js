// nc-comps.js
// Implements:
// - Top tabs (Comps / Leaderboard)
// - Round tabs (R1..R6)
// - Comps view data display from Supabase via RPC:
//     public.nc_comps_agg(p_round, p_force, p_blacklist)
// - Hero icon rendering from /icons/heroes2 (lowercased/sanitized) with fallback unknown.png

(function () {
  const RPC_COMPS = "nc_comps_agg";
  const TABLE_HEROES = "nc_heroes";

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function normalizeHeroName(name) {
    return (name || "").trim();
  }

  // Icons in /icons/heroes2 use a "lowercase + stripped" convention.
  function heroToIconSlug(name) {
    return normalizeHeroName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function parseCompHeroes(compStr) {
    // Example: "Liberta - Lucilla - Orthos - Palmer - Marcille"
    const raw = (compStr || "").trim();
    if (!raw) return [];
    return raw.split(" - ").map((s) => s.trim()).filter(Boolean);
  }

  function formatAvgTime(val) {
    if (val == null || Number.isNaN(val)) return "—";
    return `${Number(val).toFixed(2)}s`;
  }

  function setActiveView(root, view) {
    const tabs = qsa(".nc-tab", root);
    tabs.forEach((btn) => {
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
    const roundTabs = qsa(".nc-round-tab", root);
    roundTabs.forEach((btn) => {
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

  function readForceConstraints(root) {
    // 5 rows of (hero, si, furn); only rows with hero filled count.
    const rows = qsa("#ncPanelComps .nc-filter-col-force .nc-filter-row", root);
    const out = [];

    for (const row of rows) {
      const hero = normalizeHeroName(qs(".nc-force-hero", row)?.value || "");
      const si = (qs(".nc-force-si", row)?.value || "").trim();
      const furn = (qs(".nc-force-furn", row)?.value || "").trim();

      if (!hero) continue;
      out.push({ hero, si, furn });
    }
    return out;
  }

  function readBlacklist(root) {
    const inputs = qsa("#ncPanelComps .nc-blacklist-hero", root);
    const names = inputs
      .map((i) => normalizeHeroName(i.value))
      .filter(Boolean);

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

  async function fetchDistinctHeroes() {
    const seen = new Set();
    const names = [];

    const { data, error } = await supabaseClient
      .from(TABLE_HEROES)
      .select("name")
      .limit(5000);

    if (error) throw error;

    for (const row of data || []) {
      const n = normalizeHeroName(row.name);
      if (!n) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(n);
    }

    names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return names;
  }

  function fillHeroDatalist(root, heroNames) {
    const dl = qs("#ncHeroList", root);
    if (!dl) return;
    dl.innerHTML = "";
    for (const name of heroNames) {
      const opt = document.createElement("option");
      opt.value = name;
      dl.appendChild(opt);
    }
  }

  function setStatus(root, msg) {
    const el = qs("#ncCompsStatus", root);
    if (el) el.textContent = msg || "";
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
      const heroes = parseCompHeroes(item.comp);

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
      time.textContent = formatAvgTime(item.avg_time);

      const sample = document.createElement("div");
      sample.style.color = "var(--text-muted)";
      sample.style.fontSize = "0.85rem";
      sample.style.whiteSpace = "nowrap";
      sample.textContent = `${item.run_count ?? 0} runs`;

      top.appendChild(time);
      top.appendChild(sample);

      const heroRow = document.createElement("div");
      heroRow.style.display = "flex";
      heroRow.style.gap = "0.45rem";
      heroRow.style.alignItems = "center";
      heroRow.style.flexWrap = "nowrap";

      for (const h of heroes) {
        const slug = heroToIconSlug(h);

        const img = document.createElement("img");
        img.src = `icons/heroes2/${slug}.jpg`;
        img.alt = h;
        img.title = h;
        img.loading = "lazy";
        img.style.width = "42px";
        img.style.height = "42px";
        img.style.borderRadius = "12px";
        img.style.objectFit = "cover";
        img.style.border = "1px solid rgba(255,255,255,0.10)";
        img.style.background = "rgba(255,255,255,0.02)";

        // If missing .jpg, fallback to unknown.png (requested)
        img.addEventListener("error", () => {
          if (img.dataset.fallback === "1") {
            // unknown.png also missing? hide it.
            img.style.display = "none";
            return;
          }
          img.dataset.fallback = "1";
          img.src = "icons/heroes2/unknown.png";
          img.alt = "Unknown";
          img.title = "Unknown";
        });

        heroRow.appendChild(img);
      }

      const compText = document.createElement("div");
      compText.style.marginTop = "0.55rem";
      compText.style.color = "var(--text-muted)";
      compText.style.fontSize = "0.85rem";
      compText.textContent = item.comp;

      card.appendChild(top);
      card.appendChild(heroRow);
      card.appendChild(compText);

      results.appendChild(card);
    }

    // Responsive: collapse to one column on small screens
    const mq = window.matchMedia("(max-width: 900px)");
    const applyMq = () => {
      results.style.gridTemplateColumns = mq.matches ? "1fr" : "repeat(2, minmax(0, 1fr))";
    };
    applyMq();
    mq.addEventListener?.("change", applyMq);
  }

  function debounce(fn, waitMs) {
    let t = null;
    return function (...args) {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn.apply(this, args), waitMs);
    };
  }

  let heroNamesLoaded = false;
  let lastLoadToken = 0;

  async function loadComps(root) {
    const token = ++lastLoadToken;

    if (typeof supabaseClient === "undefined") {
      setStatus(root, "Supabase client is not available on this page.");
      return;
    }

    const round = getSelectedRound(root);
    const force = readForceConstraints(root);
    const blacklist = readBlacklist(root);

    // Load hero datalist once
    if (!heroNamesLoaded) {
      try {
        setStatus(root, "Loading hero list...");
        const names = await fetchDistinctHeroes();
        if (token !== lastLoadToken) return;
        fillHeroDatalist(root, names);
      } catch (e) {
        console.error("Failed loading distinct heroes:", e);
      } finally {
        heroNamesLoaded = true;
      }
    }

    setStatus(root, "Loading comps...");
    const results = qs("#ncCompsResults", root);
    if (results) results.innerHTML = "";

    try {
      // RPC does filtering + grouping + avg(time_boss) server-side
      const { data, error } = await supabaseClient.rpc(RPC_COMPS, {
        p_round: round,
        p_force: force,          // json array [{hero, si, furn}, ...]
        p_blacklist: blacklist,  // text[]
      });

      if (token !== lastLoadToken) return;

      if (error) {
        console.error("RPC error:", error);
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

  document.addEventListener("DOMContentLoaded", () => {
    const root = qs("#ncCompsPage");
    if (!root) return;

    // Top view tabs
    const viewTabs = qsa(".nc-tab", root);
    viewTabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const view = btn.getAttribute("data-view");
        if (!view) return;
        setActiveView(root, view);
      });
    });

    // Round tabs
    const roundTabs = qsa(".nc-round-tab", root);
    roundTabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const round = btn.getAttribute("data-round");
        if (!round) return;
        setActiveRound(root, round);
        loadComps(root);
      });
    });

    // Filter changes (Comps view)
    const debouncedLoad = debounce(() => loadComps(root), 250);

    qsa("#ncPanelComps .nc-filter-col-force input, #ncPanelComps .nc-filter-col-force select", root)
      .forEach((el) => el.addEventListener("input", debouncedLoad));

    qsa("#ncPanelComps .nc-filter-col-blacklist input", root)
      .forEach((el) => el.addEventListener("input", debouncedLoad));

    // Defaults
    setActiveView(root, "comps");
    setActiveRound(root, "1");

    // Initial load
    loadComps(root);
  });
})();
