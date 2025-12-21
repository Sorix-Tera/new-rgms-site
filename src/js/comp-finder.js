// comp-finder.js
// Aggregates comps across all players, grouped by teams buckets and averaged winrate.

(function () {
  const CACHE = new Map(); // mode -> { rows: [], truncated: boolean, rowCount: number }

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


// ---- Regions filtering (Comp Finder) ----
// UI offers presets: R1–R20, R21–R40, R41+ (multi-select). "All regions" means no filtering.

const REGION_PRESETS = [
  { key: 'r1-20', label: 'R1–R20', min: 1, max: 20 },
  { key: 'r21-40', label: 'R21–R40', min: 21, max: 40 },
  { key: 'r41p', label: 'R41+',  min: 41, max: Infinity },
];

function parseRegionNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const m = String(value).match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function getRegionsFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const raw = (p.get('regions') || '').trim().toLowerCase();
  if (!raw || raw === 'all') return new Set(['all']);

  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  const keys = new Set(parts);

  // If user provided all 3 presets, treat as all
  const allPresetKeys = REGION_PRESETS.map(x => x.key);
  const hasAllPresets = allPresetKeys.every(k => keys.has(k));
  if (hasAllPresets) return new Set(['all']);

  // Ignore unknown keys (safety)
  const valid = new Set(REGION_PRESETS.map(x => x.key));
  const cleaned = new Set();
  for (const k of keys) {
    if (valid.has(k)) cleaned.add(k);
  }
  return cleaned.size ? cleaned : new Set(['all']);
}

function updateUrlRegions(keysSet) {
  const url = new URL(window.location.href);

  const isAll = !keysSet || keysSet.size === 0 || keysSet.has('all');
  if (isAll) {
    url.searchParams.delete('regions');
  } else {
    url.searchParams.set('regions', Array.from(keysSet).join(','));
  }
  history.replaceState({}, '', url.toString());
}

function getSelectedRegionKeys() {
  const allEl = qs('#cfRegionAll');
  const r1 = qs('#cfRegionR1_20');
  const r2 = qs('#cfRegionR21_40');
  const r3 = qs('#cfRegionR41P');

  // If UI is missing, default to all
  if (!allEl || !r1 || !r2 || !r3) return new Set(['all']);

  if (allEl.checked) return new Set(['all']);

  const keys = new Set();
  if (r1.checked) keys.add('r1-20');
  if (r2.checked) keys.add('r21-40');
  if (r3.checked) keys.add('r41p');

  if (keys.size === 0) return new Set(['all']); // treat empty as all
  if (REGION_PRESETS.every(x => keys.has(x.key))) return new Set(['all']); // all presets -> all
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

  const shouldCheckAllPresets = isAll;
  r1.checked = shouldCheckAllPresets || keysSet.has('r1-20');
  r2.checked = shouldCheckAllPresets || keysSet.has('r21-40');
  r3.checked = shouldCheckAllPresets || keysSet.has('r41p');

  // Label
  if (labelEl) {
    if (isAll) {
      labelEl.textContent = 'All regions';
    } else {
      const labels = REGION_PRESETS
        .filter(x => keysSet.has(x.key))
        .map(x => x.label);
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
  if (!rows || !Array.isArray(rows)) return [];
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
    if (isOpen) close();
    else open();
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

  // Checkbox logic
  const allEl = qs('#cfRegionAll');
  const presetEls = [qs('#cfRegionR1_20'), qs('#cfRegionR21_40'), qs('#cfRegionR41P')].filter(Boolean);

  function syncFromUI() {
    const keys = getSelectedRegionKeys();
    setRegionSelection(keys);
    updateUrlRegions(keys);
    if (typeof onChange === 'function') onChange(keys);
  }

  if (allEl) {
    allEl.addEventListener('change', () => {
      if (allEl.checked) {
        // all -> check everything
        setRegionSelection(new Set(['all']));
      } else {
        // if user unchecks "all", keep all presets checked by default
        setRegionSelection(new Set(['r1-20', 'r21-40', 'r41p']));
      }
      syncFromUI();
    });
  }

  presetEls.forEach(el => {
    el.addEventListener('change', () => {
      // if any preset is unchecked, uncheck "all"
      if (allEl) allEl.checked = false;

      // if all presets checked, treat as all
      const keys = getSelectedRegionKeys();
      setRegionSelection(keys);
      updateUrlRegions(keys);
      if (typeof onChange === 'function') onChange(keys);
    });
  });
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

  // Public init
  window.initCompFinderPage = function initCompFinderPage() {
    const root = qs('#compFinderPage');
    if (!root) return;

    // Initial mode
    const modeFromUrl = getModeFromUrl();
    const initialMode = modeFromUrl || getSelectedMode();
    setSelectedMode(initialMode);
    updateUrlMode(initialMode);

// Regions: init from URL + hook changes
const regionsFromUrl = getRegionsFromUrl();
setRegionSelection(regionsFromUrl);
updateUrlRegions(regionsFromUrl);
initRegionsDropdown(() => {
  // Re-render using cached data (no refetch)
  const mode = getSelectedMode();
  renderForMode(mode);
});


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
