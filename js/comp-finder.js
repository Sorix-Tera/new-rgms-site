// comp-finder.js
// Aggregates comps across all players, grouped by teams buckets and averaged winrate.

(function () {
  const CACHE = new Map(); // mode -> { rows: [], truncated: boolean, rowCount: number }

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  // ---------------- Regions filter (client-side on cached DB rows) ----------------
  // UI supports: All regions, R1–R20, R21–R40, R41+ (multi-select).
  // We intentionally do NOT store regions in the URL; only mode stays in URL (optional).

  const REGION_PRESETS = [
    { key: 'r1-20', label: 'R1–R20', min: 1, max: 20 },
    { key: 'r21-40', label: 'R21–R40', min: 21, max: 40 },
    { key: 'r41p', label: 'R41+', min: 41, max: Infinity },
  ];

  function parseRegionNumber(value) {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;

    // Accepts: "12", "R12", "r12", "region 12", "region12", etc.
    const m = String(value).toLowerCase().match(/(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  function getSelectedRegionKeys() {
    const allEl = qs('#cfRegionAll');
    const r1 = qs('#cfRegionR1_20');
    const r2 = qs('#cfRegionR21_40');
    const r3 = qs('#cfRegionR41P');

    // If UI isn't present, default to all regions
    if (!allEl || !r1 || !r2 || !r3) return new Set(['all']);

    if (allEl.checked) return new Set(['all']);

    const keys = new Set();
    if (r1.checked) keys.add('r1-20');
    if (r2.checked) keys.add('r21-40');
    if (r3.checked) keys.add('r41p');

    // Empty selection behaves as "All"
    if (keys.size === 0) return new Set(['all']);

    // If all presets selected, behave as "All"
    if (REGION_PRESETS.every(x => keys.has(x.key))) return new Set(['all']);

    return keys;
  }

  function setRegionSelection(keysSet) {
    const allEl = qs('#cfRegionAll');
    const r1 = qs('#cfRegionR1_20');
    const r2 = qs('#cfRegionR21_40');
    const r3 = qs('#cfRegionR41P');
    const labelEl = qs('#cfRegionsLabel');

    if (!allEl || !r1 || !r2 || !r3) return;

    const isAll = !keysSet || keysSet.size === 0 || keysSet.has('all');
    allEl.checked = isAll;

    r1.checked = isAll || keysSet.has('r1-20');
    r2.checked = isAll || keysSet.has('r21-40');
    r3.checked = isAll || keysSet.has('r41p');

    if (labelEl) {
      if (isAll) {
        labelEl.textContent = 'All regions';
      } else {
        const labels = REGION_PRESETS.filter(x => keysSet.has(x.key)).map(x => x.label);
        labelEl.textContent = labels.join(' + ') || 'All regions';
      }
    }
  }

  function rowMatchesRegionSelection(row, keysSet) {
    if (!keysSet || keysSet.size === 0 || keysSet.has('all')) return true;

    const regionN = parseRegionNumber(row?.region);
    if (regionN == null) return false;

    for (const preset of REGION_PRESETS) {
      if (!keysSet.has(preset.key)) continue;
      if (regionN >= preset.min && regionN <= preset.max) return true;
    }
    return false;
  }

  function filterRowsByRegions(rows, keysSet) {
    if (!Array.isArray(rows)) return [];
    if (!keysSet || keysSet.size === 0 || keysSet.has('all')) return rows;
    return rows.filter(r => rowMatchesRegionSelection(r, keysSet));
  }

  function initRegionsDropdown(onChange) {
    const btn = qs('#cfRegionsBtn');
    const menu = qs('#cfRegionsMenu');
    if (!btn || !menu) return;

    function close() {
      btn.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    }

    function open() {
      btn.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = menu.classList.contains('is-open');
      if (isOpen) close(); else open();
    });

    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('is-open')) return;
      const t = e.target;
      if (t === btn || btn.contains(t) || menu.contains(t)) return;
      close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    const allEl = qs('#cfRegionAll');
    const r1 = qs('#cfRegionR1_20');
    const r2 = qs('#cfRegionR21_40');
    const r3 = qs('#cfRegionR41P');

    function emit() {
      const keys = getSelectedRegionKeys();
      setRegionSelection(keys); // normalize + update label
      if (typeof onChange === 'function') onChange(keys);
    }

    if (allEl) {
      allEl.addEventListener('change', () => {
        if (allEl.checked) {
          setRegionSelection(new Set(['all']));
        } else {
          // If user unchecks All, default to all three ranges selected.
          setRegionSelection(new Set(['r1-20', 'r21-40', 'r41p']));
        }
        emit();
      });
    }

    [r1, r2, r3].filter(Boolean).forEach((el) => {
      el.addEventListener('change', () => {
        // If user toggles ranges, make sure All is off
        if (allEl) allEl.checked = false;
        emit();
      });
    });
  }

  function parseTeamsCount(value) {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const m = String(value).toLowerCase().match(/(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  function teamsBucketKey(teamsN) {
    if (!Number.isFinite(teamsN)) return null;
    if (teamsN <= 3) return '2-3';
    if (teamsN <= 5) return '4-5';
    return '6-7';
  }

  function parseHeroesList(heroesStr) {
    if (!heroesStr) return [];
    return heroesStr.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
  }

  function isUnknownName(name) {
    return !name || String(name).trim().toLowerCase() === 'unknown';
  }

  function iconUrlForHero(name) {
    const n = (name || '').trim().toLowerCase();
    if (!n || n === 'unknown') return 'icons/heroes2/unknown.png';
    return `icons/heroes2/${n}.jpg`;
  }

  function iconUrlForPet(name) {
    const n = (name || '').trim().toLowerCase();
    if (!n || n === 'unknown') return 'icons/pets/unknown.png';
    return `icons/pets/${n}.jpg`;
  }

  function densityKeyFromCount(n) {
    if (n <= 2) return 'red';
    if (n <= 6) return 'orange';
    return 'green';
  }

  function normalizeCompKey(heroesArr, petStr) {
    // Normalize for grouping: 5 heroes + pet, lowercase, unknown-filled.
    const h = (heroesArr || []).slice(0, 5).map(x => (x || '').trim().toLowerCase() || 'unknown');
    while (h.length < 5) h.push('unknown');
    const p = (petStr || '').trim().toLowerCase() || 'unknown';
    return `${h.join('|')}::${p}`;
  }

  function formatHeroesKeyForDisplay(compKey) {
    // compKey was built from heroes|...::pet
    const [heroesPart, petPart] = String(compKey).split('::');
    const heroes = (heroesPart || '').split('|').map(s => s.trim()).filter(Boolean);
    const pet = (petPart || '').trim();
    return { heroes, pet };
  }

  function groupAndAggregate(rows) {
    // For each teams bucket, group by comp, compute avg winrate and sample count.
    const buckets = {
      '2-3': new Map(),
      '4-5': new Map(),
      '6-7': new Map(),
    };

    let skippedNoTeams = 0;
    let skippedBadWinrate = 0;
    let skippedTooUnknown = 0;

    for (const r of rows || []) {
      const teamsN = parseTeamsCount(r.teams);
      const bucket = teamsBucketKey(teamsN);
      if (!bucket) {
        skippedNoTeams++;
        continue;
      }

      const heroesStr = (r.heroes || '').trim();
      const petStr = (r.pet || '').trim();

      const w = Number(r.winrate);
      if (!Number.isFinite(w)) {
        skippedBadWinrate++;
        continue;
      }

      let heroesArr = parseHeroesList(heroesStr).map(h => (h || '').trim().toLowerCase());
      heroesArr = heroesArr.slice(0, 5);
      while (heroesArr.length < 5) heroesArr.push('unknown');

      // Ignore comps that are entirely unknown (prevents garbage dominating)
      const unknownCount = heroesArr.filter(isUnknownName).length + (isUnknownName(petStr) ? 1 : 0);
      if (unknownCount >= 6) {
        skippedTooUnknown++;
        continue;
      }

      const key = normalizeCompKey(heroesArr, petStr);
      const map = buckets[bucket];
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { sum: w, n: 1 });
      } else {
        cur.sum += w;
        cur.n += 1;
      }
    }

    // Convert maps to sorted arrays
    const out = {};
    for (const k of Object.keys(buckets)) {
      const map = buckets[k];
      const arr = [];
      for (const [groupKey, agg] of map.entries()) {
        const { heroes, pet } = formatHeroesKeyForDisplay(groupKey);

        // Build a display string exactly like details (heroes separated by " - ")
        const heroesStr = heroes.join(' - ');
        const petStr = pet;

        const avg = agg.sum / agg.n;
        arr.push({
          heroes: heroesStr,
          pet: petStr,
          winrate: avg,
          n: agg.n,
          density: densityKeyFromCount(agg.n),
        });
      }

      // Sort by avg winrate desc
      arr.sort((a, b) => b.winrate - a.winrate);

      out[k] = arr;
    }

    return {
      buckets: out,
      skippedNoTeams,
      skippedBadWinrate,
      skippedTooUnknown,
    };
  }

  function getDensityFlags() {
    const showRed = !!qs('#cfShowRed')?.checked;
    const showOrange = !!qs('#cfShowOrange')?.checked;
    const showGreen = !!qs('#cfShowGreen')?.checked;
    return { red: showRed, orange: showOrange, green: showGreen };
  }

  function shouldShowDensity(comp, flags) {
    if (!comp) return false;
    if (comp.density === 'red') return !!flags.red;
    if (comp.density === 'orange') return !!flags.orange;
    if (comp.density === 'green') return !!flags.green;
    return true;
  }

  function renderCompsIntoGrid(gridEl, comps, densityFlags) {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const list = (comps || []).filter(c => shouldShowDensity(c, densityFlags));

    for (const comp of list) {
      const card = document.createElement('div');
      card.className = 'comp-card';

      // density glow class
      if (comp.density === 'red') card.classList.add('cf-glow-red');
      if (comp.density === 'orange') card.classList.add('cf-glow-orange');
      if (comp.density === 'green') card.classList.add('cf-glow-green');

      // Helpful tooltip (no extra UI clutter)
      card.title = `Avg winrate: ${comp.winrate.toFixed(1)}% · Samples: ${comp.n}`;

      const row = document.createElement('div');
      row.className = 'comp-row';

      const heroes = parseHeroesList(comp.heroes);
      while (heroes.length < 5) heroes.push('unknown');

      for (let i = 0; i < 5; i++) {
        const img = document.createElement('img');
        img.className = 'comp-icon';
        img.loading = 'lazy';
        img.alt = heroes[i] || 'unknown';
        img.src = iconUrlForHero(heroes[i]);
        img.onerror = () => { img.src = 'icons/heroes2/unknown.png'; };
        row.appendChild(img);
      }

      const petImg = document.createElement('img');
      petImg.className = 'comp-icon';
      petImg.loading = 'lazy';
      petImg.alt = comp.pet || 'unknown';
      petImg.src = iconUrlForPet(comp.pet);
      petImg.onerror = () => { petImg.src = 'icons/pets/unknown.png'; };
      row.appendChild(petImg);

      // Winrate badge
      const badge = document.createElement('div');
      badge.className = 'comp-winrate';
      badge.textContent = `${comp.winrate.toFixed(1)}%`;
      row.appendChild(badge);

      card.appendChild(row);
      gridEl.appendChild(card);
    }
  }

  async function fetchAllCompsRowsForMode(mode) {
    // Fetch all rows (paged) because the dataset can grow.
    // Note: Supabase has per-request limits; range paging avoids missing data.
    const PAGE_SIZE = 1000;
    const MAX_ROWS = 20000; // safety guard for client-side performance

    let rows = [];
    let from = 0;
    let truncated = false;

    while (from < MAX_ROWS) {
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabaseClient
        .from('comps')
        .select('heroes,pet,winrate,teams,region')
        .eq('mode', mode)
        .not('winrate', 'is', null)
        .range(from, to);

      if (error) {
        throw error;
      }

      const batch = Array.isArray(data) ? data : [];
      rows = rows.concat(batch);

      if (batch.length < PAGE_SIZE) {
        break; // done
      }

      from += PAGE_SIZE;
    }

    if (from >= MAX_ROWS) {
      truncated = true;
    }

    return { rows, truncated };
  }

  function getSelectedMode() {
    const sel = qs('#cfModeSelect');
    return sel ? sel.value : 'ts-forest';
  }

  function updateUrlMode(mode) {
    // Optional: mode in URL makes sharing/bookmarking convenient.
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    history.replaceState({}, '', url.toString());
  }

  async function ensureDataLoaded(mode, statusEl) {
    if (CACHE.has(mode)) return CACHE.get(mode);

    statusEl.textContent = 'Loading comps…';

    const { rows, truncated } = await fetchAllCompsRowsForMode(mode);

    const payload = { rows, truncated, rowCount: rows.length };
    CACHE.set(mode, payload);
    return payload;
  }

  async function renderForMode(mode) {
    const statusEl = qs('#cfLoadStatus');
    const grid23 = qs('#cfGrid23');
    const grid45 = qs('#cfGrid45');
    const grid67 = qs('#cfGrid67');

    if (!statusEl || !grid23 || !grid45 || !grid67) return;

    try {
      const payload = await ensureDataLoaded(mode, statusEl);

      const regionKeys = getSelectedRegionKeys();
      const filteredRows = filterRowsByRegions(payload.rows, regionKeys);
      const { buckets } = groupAndAggregate(filteredRows);

      const densityFlags = getDensityFlags();
      renderCompsIntoGrid(grid23, buckets['2-3'], densityFlags);
      renderCompsIntoGrid(grid45, buckets['4-5'], densityFlags);
      renderCompsIntoGrid(grid67, buckets['6-7'], densityFlags);

      const msg = payload.truncated
        ? `Loaded first ${payload.rowCount} rows (truncated for performance).`
        : `Loaded ${payload.rowCount} rows.`;

      statusEl.textContent = `Showing comps aggregated across all players for ${mode} (${qs('#cfRegionsLabel')?.textContent || 'All regions'}). ${msg}`;
    } catch (err) {
      console.error('Comp Finder error:', err);
      const statusEl2 = qs('#cfLoadStatus');
      if (statusEl2) statusEl2.textContent = 'Failed to load comps from Supabase.';
    }
  }

  function setActiveBucket(bucketKey) {
    // Tabs
    qsa('.cf-tab').forEach((btn) => {
      const k = btn.getAttribute('data-bucket');
      if (!k) return;

      const isActive = (k === bucketKey);
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');

      // Optional: manage tabindex for keyboard nav
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Panels
    qsa('.cf-panel').forEach((panel) => {
      const k = panel.getAttribute('data-bucket');
      if (!k) return;

      const isActive = (k === bucketKey);
      panel.classList.toggle('is-active', isActive);

      // Optional: hide inactive panels from assistive tech
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
  }


  function getInitialModeFromUrlOrDefault() {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('mode');
    return m || 'ts-forest';
  }

  // Public init
  window.initCompFinderPage = function initCompFinderPage() {
    const root = qs('#compFinderPage');
    if (!root) return;

    const initialMode = getInitialModeFromUrlOrDefault();

    // Mode select initial value (if URL mode exists)
    const modeSelect = qs('#cfModeSelect');
    if (modeSelect) {
      modeSelect.value = initialMode;
    }

    // Regions: default to "All regions" (filter is applied client-side on cached rows)
    setRegionSelection(new Set(['all']));
    initRegionsDropdown(() => {
      // Re-render using cached data (no refetch)
      const mode = getSelectedMode();
      renderForMode(mode);
    });

    // Tabs (if you use them)
    qsa('.cf-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const bucket = btn.getAttribute('data-bucket');
        if (!bucket) return;
        setActiveBucket(bucket);
      });
    });

    // Density checkboxes
    ['#cfShowRed', '#cfShowOrange', '#cfShowGreen'].forEach(sel => {
      const el = qs(sel);
      if (!el) return;
      el.addEventListener('change', () => {
        renderForMode(getSelectedMode());
      });
    });

    // Mode select
    if (modeSelect) {
      modeSelect.addEventListener('change', () => {
        const mode = getSelectedMode();
        updateUrlMode(mode);
        renderForMode(mode);
      });
    }

    // Default active tab
    setActiveBucket('2-3');

    // Initial render
    renderForMode(initialMode);
  };
})();