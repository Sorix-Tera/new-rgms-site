// nc-comps.js
// Implements:
// - Top tabs (Comps / Leaderboard)
// - Round tabs (R1..R6)
// - Comps view data display from Supabase:
//     nc_round filtered by round and optional force/blacklist filters (via nc_heroes),
//     then group by comp and avg(time_boss), order asc,
//     render 2-column layout (row-wise left->right).

(function () {
  const TABLE_ROUND = "nc_round";
  const TABLE_HEROES = "nc_heroes";

  // Supabase .in() has practical limits; keep chunks reasonable.
  const IN_CHUNK = 900;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function normalizeHeroName(name) {
    return (name || "").trim();
  }

  // Icons in /src/icons/heroes2 look like: albedo.jpg, aathalia.jpg, etc.
  // We'll lower + strip to [a-z0-9] to match that convention.
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
    // Keep simple for now; we can change to mm:ss later if you prefer.
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

    // distinct, case-insensitive distinct
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

  function buildSiPredicate(siChoice) {
    // User confirmed:
    // SI 40 => >=40
    // SI 30 => >=30
    // SI <30 => <30
    const v = (siChoice || "").trim();
    if (!v) return null;
    if (v === "40") return (x) => x != null && Number(x) >= 40;
    if (v === "30") return (x) => x != null && Number(x) >= 30;
    if (v === "<30") return (x) => x != null && Number(x) < 30;
    return null;
  }

  function buildFurnPredicate(furnChoice) {
    // Furn 9 => >=9 ; 3 => >=3 ; 0 => ==0 (as discussed earlier)
    const v = (furnChoice || "").trim();
    if (!v) return null;
    if (v === "9") return (x) => x != null && Number(x) >= 9;
    if (v === "3") return (x) => x != null && Number(x) >= 3;
    if (v === "0") return (x) => x != null && Number(x) === 0;
    return null;
  }

  function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  function intersectSets(a, b) {
    // Returns new Set of intersection
    if (!a) return new Set(b);
    const out = new Set();
    for (const v of a) if (b.has(v)) out.add(v);
    return out;
  }

  async function fetchDistinctHeroes() {
    // Supabase doesn't always do DISTINCT nicely in JS client across all setups.
    // We'll fetch names (paged) and dedupe in JS.
    const seen = new Set();
    const names = [];

    // Try a single large fetch first; if your table is huge, we can revisit.
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

    // Sort alpha for datalist usability
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

  async function fetchNcIdsForForceConstraint(round, constraint) {
    // constraint: { hero, si, furn }
    // We filter on nc_heroes rows for that round and that hero name.
    // Then apply SI/Furn predicates in JS because it’s easy and avoids tricky query branching.
    // (If performance ever matters, we can push it into SQL.)
    const hero = constraint.hero;

    const { data, error } = await supabaseClient
      .from(TABLE_HEROES)
      .select("nc_id, si, furn, name")
      .eq("round", round)
      .ilike("name", hero);

    if (error) throw error;

    const siPred = buildSiPredicate(constraint.si);
    const furnPred = buildFurnPredicate(constraint.furn);

    const ids = new Set();
    for (const row of data || []) {
      if (siPred && !siPred(row.si)) continue;
      if (furnPred && !furnPred(row.furn)) continue;
      ids.add(row.nc_id);
    }
    return ids;
  }

  async function fetchNcIdsToExcludeForBlacklist(round, blacklistNames) {
    if (!blacklistNames || blacklistNames.length === 0) return new Set();

    // Query rows matching any blacklisted hero in that round, collect nc_id
    // Supabase doesn't have ilike-any built in; we'll do OR chaining.
    // Example: or=(name.ilike.Albedo,name.ilike.Ainz)
    const orParts = blacklistNames.map((n) => `name.ilike.${escapeOrValue(n)}`);
    const orExpr = orParts.join(",");

    const { data, error } = await supabaseClient
      .from(TABLE_HEROES)
      .select("nc_id,name")
      .eq("round", round)
      .or(orExpr);

    if (error) throw error;

    const ids = new Set();
    for (const row of data || []) ids.add(row.nc_id);
    return ids;
  }

  function escapeOrValue(val) {
    // Supabase OR syntax is touchy; keep it simple by escaping commas and parentheses.
    // Also, ilike patterns: if user types % it becomes wildcard; that's probably fine.
    return String(val).replace(/,/g, "\\,").replace(/\)/g, "\\)").replace(/\(/g, "\\(");
  }

  async function fetchNcRoundRows(round, allowedNcIds /* Set or null */) {
    // Returns rows: { comp, time_boss }
    // If allowedNcIds is null => fetch all rows for that round
    if (!allowedNcIds) {
      const { data, error } = await supabaseClient
        .from(TABLE_ROUND)
        .select("comp, time_boss")
        .eq("round", round);

      if (error) throw error;
      return data || [];
    }

    const ids = Array.from(allowedNcIds);
    if (ids.length === 0) return [];

    const chunks = chunkArray(ids, IN_CHUNK);
    const all = [];

    for (const chunk of chunks) {
      const { data, error } = await supabaseClient
        .from(TABLE_ROUND)
        .select("comp, time_boss, nc_id")
        .eq("round", round)
        .in("nc_id", chunk);

      if (error) throw error;
      all.push(...(data || []));
    }
    return all;
  }

  function computeAvgByComp(rows) {
    // rows: { comp, time_boss }
    const agg = new Map(); // comp -> {sum, count}
    for (const r of rows) {
      const comp = (r.comp || "").trim();
      if (!comp) continue;
      const t = r.time_boss;
      if (t == null || Number.isNaN(t)) continue;

      const cur = agg.get(comp) || { sum: 0, count: 0 };
      cur.sum += Number(t);
      cur.count += 1;
      agg.set(comp, cur);
    }

    const out = [];
    for (const [comp, v] of agg.entries()) {
      out.push({
        comp,
        avg: v.count ? v.sum / v.count : null,
        count: v.count,
      });
    }

    out.sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));
    return out;
  }

  function renderComps(root, compAverages) {
    const results = qs("#ncCompsResults", root);
    if (!results) return;

    // Basic 2-column responsive grid using inline styles to avoid touching CSS right now.
    results.innerHTML = "";
    results.style.display = "grid";
    results.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
    results.style.gap = "0.9rem";
    results.style.marginTop = "0.9rem";

    if (!compAverages || compAverages.length === 0) {
      // Keep area empty but provide no-results feedback via status; nothing to render.
      return;
    }

    for (const item of compAverages) {
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
      time.textContent = formatAvgTime(item.avg);

      const sample = document.createElement("div");
      sample.style.color = "var(--text-muted)";
      sample.style.fontSize = "0.85rem";
      sample.style.whiteSpace = "nowrap";
      sample.textContent = `${item.count} runs`;

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

        // If the icon doesn't exist, avoid broken-image ugliness:
        img.addEventListener("error", () => {
          img.style.display = "none";
        });

        heroRow.appendChild(img);
      }

      // Optional: show the raw comp string (useful for debugging icon mismatches)
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

  function setStatus(root, msg) {
    const el = qs("#ncCompsStatus", root);
    if (el) el.textContent = msg || "";
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

    // Ensure hero datalist loaded once
    if (!heroNamesLoaded) {
      try {
        const names = await fetchDistinctHeroes();
        if (token !== lastLoadToken) return;
        fillHeroDatalist(root, names);
        heroNamesLoaded = true;
      } catch (e) {
        console.error("Failed loading distinct heroes:", e);
        // Not fatal for comps rendering
        heroNamesLoaded = true;
      }
    }

    setStatus(root, "Loading comps...");
    const results = qs("#ncCompsResults", root);
    if (results) results.innerHTML = "";

    try {
      // Compute allowed nc_ids from force constraints (AND = intersection)
      let allowedSet = null;

      for (const c of force) {
        const ids = await fetchNcIdsForForceConstraint(round, c);
        if (token !== lastLoadToken) return;
        allowedSet = intersectSets(allowedSet, ids);
        if (allowedSet.size === 0) break;
      }

      // Exclude any nc_ids containing blacklisted heroes for that round
      if (blacklist.length > 0) {
        const exclude = await fetchNcIdsToExcludeForBlacklist(round, blacklist);
        if (token !== lastLoadToken) return;

        if (allowedSet == null) {
          // If no force constraints, we can't “subtract from all” without knowing universe of ids.
          // We'll handle blacklist by filtering comps after fetching all nc_round rows for the round.
          // (This is correct because you said blacklist excludes comps where hero appears in the comp.)
        } else {
          for (const id of exclude) allowedSet.delete(id);
        }
      }

      let rows;

      if (allowedSet == null) {
        // No force constraints:
        // Fetch all comps for the round
        rows = await fetchNcRoundRows(round, null);
        if (token !== lastLoadToken) return;

        // Apply blacklist at comp-string level (your requirement)
        if (blacklist.length > 0) {
          const bl = new Set(blacklist.map((x) => x.toLowerCase()));
          rows = (rows || []).filter((r) => {
            const heroes = parseCompHeroes(r.comp).map((h) => h.toLowerCase());
            for (const h of heroes) if (bl.has(h)) return false;
            return true;
          });
        }
      } else {
        // Force constraints present: allowedSet is explicit (possibly empty)
        rows = await fetchNcRoundRows(round, allowedSet);
        if (token !== lastLoadToken) return;

        // (Optional) also enforce blacklist at comp-string level (extra safety)
        if (blacklist.length > 0) {
          const bl = new Set(blacklist.map((x) => x.toLowerCase()));
          rows = (rows || []).filter((r) => {
            const heroes = parseCompHeroes(r.comp).map((h) => h.toLowerCase());
            for (const h of heroes) if (bl.has(h)) return false;
            return true;
          });
        }
      }

      // Group and compute averages
      const avgByComp = computeAvgByComp(rows);

      if (token !== lastLoadToken) return;

      if (!avgByComp || avgByComp.length === 0) {
        setStatus(root, "No comps match these filters.");
        renderComps(root, []);
        return;
      }

      setStatus(root, "");
      renderComps(root, avgByComp);
    } catch (err) {
      console.error("Error loading comps:", err);
      setStatus(root, "Error loading comps from Supabase.");
    }
  }

  function debounce(fn, waitMs) {
    let t = null;
    return function (...args) {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn.apply(this, args), waitMs);
    };
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

    // Filter changes
    const debouncedLoad = debounce(() => loadComps(root), 250);

    // Force side inputs/selects
    qsa("#ncPanelComps .nc-filter-col-force input, #ncPanelComps .nc-filter-col-force select", root)
      .forEach((el) => el.addEventListener("input", debouncedLoad));

    // Blacklist side inputs
    qsa("#ncPanelComps .nc-filter-col-blacklist input", root)
      .forEach((el) => el.addEventListener("input", debouncedLoad));

    // Defaults
    setActiveView(root, "comps");
    setActiveRound(root, "1");

    // Initial load
    loadComps(root);
  });
})();
