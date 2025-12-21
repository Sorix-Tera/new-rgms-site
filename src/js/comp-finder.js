// comp-finder.js
// Aggregates comps across all players, grouped by teams buckets and averaged winrate.

(function () {
  const CACHE = new Map(); // mode -> { rows: [], truncated: boolean, rowCount: number, bucketsAll: {..}, statsAll: {...} }

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function parseTeamsCount(value) {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const m = String(value).toLowerCase().match(/(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  function teamsBucketKey(n) {
    if (n == null) return null;
    if (n <= 3) return '2-3';
    if (n <= 5) return '4-5';
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

  function shouldShowDensity(densityKey, flags) {
    if (densityKey === 'red') return flags.red;
    if (densityKey === 'orange') return flags.orange;
    if (densityKey === 'green') return flags.green;
    return true;
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

  function groupAndAggregate(rows) {
    const groupedByBucket = {
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

      const unknownCount = heroesArr.filter(h => isUnknownName(h)).length;
      if (unknownCount > 2) {
        skippedTooUnknown++;
        continue;
      }

      const groupKey = `${heroesStr}||${petStr}`;
      const map = groupedByBucket[bucket];

      const cur = map.get(groupKey);
      if (!cur) {
        map.set(groupKey, { heroes: heroesStr, pet: petStr, sum: w, n: 1 });
      } else {
        cur.sum += w;
        cur.n += 1;
      }
    }

    function mapToArray(map) {
      return Array.from(map.values()).map(x => ({
        heroes: x.heroes,
        pet: x.pet,
        winrate: x.sum / x.n,
        n: x.n,
        density: densityKeyFromCount(x.n),
      }));
    }

    const buckets = {
      '2-3': mapToArray(groupedByBucket['2-3']),
      '4-5': mapToArray(groupedByBucket['4-5']),
      '6-7': mapToArray(groupedByBucket['6-7']),
    };

    // Sort each bucket by average winrate desc
    buckets['2-3'].sort((a, b) => b.winrate - a.winrate);
    buckets['4-5'].sort((a, b) => b.winrate - a.winrate);
    buckets['6-7'].sort((a, b) => b.winrate - a.winrate);

    return { buckets, stats: { skippedNoTeams, skippedBadWinrate, skippedTooUnknown } };
  }

  function renderCompsIntoGrid(gridEl, comps, densityFlags) {
    const frag = document.createDocumentFragment();

    for (const comp of comps) {
      if (!shouldShowDensity(comp.density, densityFlags)) continue;

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

      const wr = document.createElement('span');
      wr.className = 'comp-winrate';
      wr.textContent = `${comp.winrate.toFixed(1)}%`;
      row.appendChild(wr);

      card.appendChild(row);
      frag.appendChild(card);
    }

    gridEl.innerHTML = '';
    gridEl.appendChild(frag);
  }

  function setActiveBucket(bucketKey) {
    qsa('.cf-tab').forEach(btn => {
      const isActive = btn.getAttribute('data-bucket') === bucketKey;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    qsa('.cf-panel').forEach(panel => {
      const isActive = panel.getAttribute('data-bucket') === bucketKey;
      panel.classList.toggle('is-active', isActive);
    });
  }

  function getDensityFlags() {
    const red = !!qs('#cfShowRed')?.checked;
    const orange = !!qs('#cfShowOrange')?.checked;
    const green = !!qs('#cfShowGreen')?.checked;
    return { red, orange, green };
  }

  function getSelectedMode() {
    const sel = qs('#cfModeSelect');
    return sel ? sel.value : 'ts-forest';
  }

  function setSelectedMode(mode) {
    const sel = qs('#cfModeSelect');
    if (!sel) return;
    sel.value = mode;
  }

  function getModeFromUrl() {
    const p = new URLSearchParams(window.location.search);
    return p.get('mode');
  }

  function updateUrlMode(mode) {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    history.replaceState({}, '', url.toString());
  }

  // ---------- Regions (multi-select) ----------

  const REGION_RANGES = [
    { key: 'r1-20', label: 'R1–R20', min: 1, max: 20 },
    { key: 'r21-40', label: 'R21–R40', min: 21, max: 40 },
    { key: 'r41plus', label: 'R41+', min: 41, max: Infinity },
  ];

  function parseRegionNumber(value) {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const m = String(value).match(/(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  function getRegionParamKeysFromUrl() {
    const p = new URLSearchParams(window.location.search);
    const raw = (p.get('regions') || '').trim();
    if (!raw) return null; // null => all regions
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.includes('all')) return null;
    // keep only known keys
    const known = new Set(REGION_RANGES.map(r => r.key));
    const keys = parts.filter(k => known.has(k));
    return keys.length ? keys : null;
  }

  function updateUrlRegions(keysOrNull) {
    const url = new URL(window.location.href);
    if (!keysOrNull || keysOrNull.length === 0) {
      url.searchParams.delete('regions');
    } else {
      url.searchParams.set('regions', keysOrNull.join(','));
    }
    history.replaceState({}, '', url.toString());
  }

  function getRegionEls() {
    return {
      dropdown: qs('#cfRegionDropdown'),
      summary: qs('#cfRegionSummary'),
      all: qs('#cfRegionAll'),
      ranges: qsa('.cf-region-range'),
    };
  }

  function setRegionUiToAll() {
    const { all, ranges } = getRegionEls();
    if (all) all.checked = true;
    for (const cb of ranges) cb.checked = true;
    updateRegionSummaryText();
  }

  function setRegionUiToKeys(keys) {
    const { all, ranges } = getRegionEls();
    const set = new Set(keys || []);
    if (all) all.checked = false;
    for (const cb of ranges) cb.checked = set.has(cb.value);
    // If none selected, fall back to all
    const any = ranges.some(cb => cb.checked);
    if (!any) {
      setRegionUiToAll();
      return;
    }
    // If all ranges selected, treat as all
    const every = ranges.every(cb => cb.checked);
    if (every) {
      setRegionUiToAll();
      return;
    }
    updateRegionSummaryText();
  }

  function getRegionSelection() {
    const { all, ranges } = getRegionEls();
    const checkedRanges = ranges.filter(cb => cb.checked).map(cb => cb.value);

    const allSelected = (all && all.checked) || checkedRanges.length === 0 || checkedRanges.length === REGION_RANGES.length;
    if (allSelected) {
      return { isAll: true, keys: null, label: 'All regions' };
    }

    const labels = REGION_RANGES
      .filter(r => checkedRanges.includes(r.key))
      .map(r => r.label);

    return { isAll: false, keys: checkedRanges, label: labels.join(', ') };
  }

  function updateRegionSummaryText() {
    const { summary } = getRegionEls();
    if (!summary) return;
    const sel = getRegionSelection();
    summary.textContent = sel.label;
  }

  function normalizeRegionUiAfterChange(changedKey) {
    const { all, ranges } = getRegionEls();
    if (!all) return;

    if (changedKey === 'all') {
      // All toggled => apply to all range checkboxes
      for (const cb of ranges) cb.checked = all.checked;
      // Never allow "none" => if unchecked, re-check all
      const any = ranges.some(cb => cb.checked);
      if (!any) {
        all.checked = true;
        for (const cb of ranges) cb.checked = true;
      }
      updateRegionSummaryText();
      return;
    }

    // A range changed
    const every = ranges.every(cb => cb.checked);
    const any = ranges.some(cb => cb.checked);

    if (!any) {
      // Don't allow empty selection
      setRegionUiToAll();
      return;
    }

    // If all ranges checked => go back to All
    if (every) {
      setRegionUiToAll();
      return;
    }

    // Otherwise ensure "All" is unchecked
    all.checked = false;
    updateRegionSummaryText();
  }

  function rowMatchesSelectedRegions(row, regionSel) {
    if (!regionSel || regionSel.isAll) return true;

    const n = parseRegionNumber(row && row.region);
    if (n == null) return false;

    for (const key of regionSel.keys || []) {
      const r = REGION_RANGES.find(x => x.key === key);
      if (!r) continue;
      if (n >= r.min && n <= r.max) return true;
    }
    return false;
  }

  function initRegionUi() {
    const { dropdown, all, ranges } = getRegionEls();
    if (!dropdown || !all || !ranges.length) return;

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.open) return;
      if (!dropdown.contains(e.target)) dropdown.removeAttribute('open');
    });

    // Apply URL param (if any)
    const keys = getRegionParamKeysFromUrl();
    if (!keys) setRegionUiToAll();
    else setRegionUiToKeys(keys);

    all.addEventListener('change', () => {
      normalizeRegionUiAfterChange('all');
      const sel = getRegionSelection();
      updateUrlRegions(sel.isAll ? null : sel.keys);
      renderForMode(getSelectedMode());
    });

    for (const cb of ranges) {
      cb.addEventListener('change', () => {
        normalizeRegionUiAfterChange(cb.value);
        const sel = getRegionSelection();
        updateUrlRegions(sel.isAll ? null : sel.keys);
        renderForMode(getSelectedMode());
      });
    }
  }


  async function ensureDataLoaded(mode, statusEl) {
    if (CACHE.has(mode)) return CACHE.get(mode);

    statusEl.textContent = 'Loading comps…';

    const { rows, truncated } = await fetchAllCompsRowsForMode(mode);
    const { buckets, stats } = groupAndAggregate(rows);

    const payload = {
      rows,
      truncated,
      rowCount: rows.length,
      bucketsAll: buckets,
      statsAll: stats,
    };

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

      const regionSel = getRegionSelection();
      let bucketsToRender = payload.bucketsAll;
      let rowsUsed = payload.rowCount;

      // If a region subset is selected, re-aggregate from cached raw rows
      if (regionSel && !regionSel.isAll) {
        const filtered = (payload.rows || []).filter(r => rowMatchesSelectedRegions(r, regionSel));
        rowsUsed = filtered.length;
        bucketsToRender = groupAndAggregate(filtered).buckets;
      }

      const densityFlags = getDensityFlags();
      renderCompsIntoGrid(grid23, bucketsToRender['2-3'], densityFlags);
      renderCompsIntoGrid(grid45, bucketsToRender['4-5'], densityFlags);
      renderCompsIntoGrid(grid67, bucketsToRender['6-7'], densityFlags);

      const baseMsg = payload.truncated
        ? `Loaded first ${payload.rowCount} rows (truncated for performance).`
        : `Loaded ${payload.rowCount} rows.`;

      const regionMsg = (regionSel && !regionSel.isAll)
        ? ` Regions: ${regionSel.label} (using ${rowsUsed} rows).`
        : ` Regions: All regions.`;

      statusEl.textContent = `Showing comps aggregated across all players for ${mode}. ${baseMsg}${regionMsg}`;
    } catch (err) {
      console.error('Comp Finder error:', err);
      const statusEl2 = qs('#cfLoadStatus');
      if (statusEl2) statusEl2.textContent = 'Failed to load comps from Supabase.';
    }
  }

  // Public init
  window.initCompFinderPage = function initCompFinderPage() {
    const root = qs('#compFinderPage');
    if (!root) return;

    // Initial mode
    const modeFromUrl = getModeFromUrl();
    const initialMode = modeFromUrl || getSelectedMode();
    setSelectedMode(initialMode);
    updateUrlMode(initialMode);

    // Regions multi-select (reads URL param if present)
    initRegionUi();

    // Tabs
    qsa('.cf-tab').forEach(btn => {
      btn.addEventListener('click', () => {
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
    const modeSelect = qs('#cfModeSelect');
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
