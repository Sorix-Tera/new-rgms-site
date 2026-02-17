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
    { key: 'r1-22', label: 'R1–R22', min: 1, max: 22 },
    { key: 'r23-40', label: 'R23–R40', min: 23, max: 40 },
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
    const r1 = qs('#cfRegionR1_22');
    const r2 = qs('#cfRegionR23_40');
    const r3 = qs('#cfRegionR41P');

    // If UI isn't present, default to all regions
    if (!allEl || !r1 || !r2 || !r3) return new Set(['all']);

    if (allEl.checked) return new Set(['all']);

    const keys = new Set();
    if (r1.checked) keys.add('r1-22');
    if (r2.checked) keys.add('r23-40');
    if (r3.checked) keys.add('r41p');

    // Empty selection behaves as "All"
    if (keys.size === 0) return new Set(['all']);

    // If all presets selected, behave as "All"
    if (REGION_PRESETS.every(x => keys.has(x.key))) return new Set(['all']);

    return keys;
  }

  function setRegionSelection(keysSet) {
    const allEl = qs('#cfRegionAll');
    const r1 = qs('#cfRegionR1_22');
    const r2 = qs('#cfRegionR23_40');
    const r3 = qs('#cfRegionR41P');
    const labelEl = qs('#cfRegionsLabel');

    if (!allEl || !r1 || !r2 || !r3) return;

    const isAll = !keysSet || keysSet.size === 0 || keysSet.has('all');
    allEl.checked = isAll;

    r1.checked = isAll || keysSet.has('r1-22');
    r2.checked = isAll || keysSet.has('r23-40');
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
    const r1 = qs('#cfRegionR1_22');
    const r2 = qs('#cfRegionR23_40');
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
          setRegionSelection(new Set(['r1-22', 'r23-40', 'r41p']));
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
    // Comp Finder grouping: 5 heroes (ORDER-INDEPENDENT) + pet, lowercase, unknown-filled.
    // Display order is handled separately (we keep the first-seen hero order for rendering).
    const h = (heroesArr || []).slice(0, 5).map(x => (x || '').trim().toLowerCase() || 'unknown');
    while (h.length < 5) h.push('unknown');
    h.sort();
    const p = (petStr || '').trim().toLowerCase() || 'unknown';
    return `${h.join('|')}::${p}`;
  }

  function formatHeroesKeyForDisplay(compKey) {
    // compKey was built from sorted heroes|...::pet
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

      // Keep original hero order for display (first seen wins), but group ignoring hero order.
      let heroesArrDisplay = parseHeroesList(heroesStr).map(h => (h || '').trim().toLowerCase());
      heroesArrDisplay = heroesArrDisplay.slice(0, 5);
      while (heroesArrDisplay.length < 5) heroesArrDisplay.push('unknown');

      const heroesArrKey = heroesArrDisplay.slice(); // will be sorted inside normalizeCompKey

      // Ignore comps that are entirely unknown (prevents garbage dominating)
      const unknownCount = heroesArrDisplay.filter(isUnknownName).length + (isUnknownName(petStr) ? 1 : 0);
      if (unknownCount >= 6) {
        skippedTooUnknown++;
        continue;
      }

      const key = normalizeCompKey(heroesArrKey, petStr);
      const map = buckets[bucket];
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          sum: w,
          n: 1,
          displayHeroes: heroesArrDisplay,
          displayPet: (petStr || '').trim().toLowerCase() || 'unknown',
        });
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
        // Display uses the first-seen hero order for this group.
        const heroesStr = (agg.displayHeroes || []).join(' - ');
        const petStr = agg.displayPet || 'unknown';

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

  // ---------------- Recommended selection helpers ----------------

  function normHeroId(x) {
    return (x || '').toString().trim().toLowerCase();
  }

  function getExcludedHeroesFromUI() {
    // Optional feature: if the page contains "hero exclusion" checkboxes,
    // we treat checked heroes as unavailable.
    const set = new Set();
    qsa('input.hero-exclusion:checked').forEach((cb) => {
      const id = normHeroId(cb.value);
      if (id) set.add(id);
    });
    return set;
  }

  function compKeyFromComp(comp) {
    let heroes = parseHeroesList(comp?.heroes).map(h => normHeroId(h) || 'unknown');
    heroes = heroes.slice(0, 5);
    while (heroes.length < 5) heroes.push('unknown');
    return normalizeCompKey(heroes, comp?.pet);
  }

  function compHeroesSet(comp) {
    const set = new Set();
    let heroes = parseHeroesList(comp?.heroes).map(h => normHeroId(h) || 'unknown');
    heroes = heroes.slice(0, 5);
    while (heroes.length < 5) heroes.push('unknown');
    heroes.forEach((h) => {
      if (h && h !== 'unknown') set.add(h);
    });
    return set;
  }

  function compPetNorm(comp) {
    return normHeroId(comp?.pet) || 'unknown';
  }

  function computeSelectedCompKeysGreedy(compsSorted, maxSelect, excludedHeroes = new Set()) {
    // Greedy best-first selection with uniqueness constraints.
    const selectedKeys = new Set();
    const usedHeroes = new Set();
    const usedPets = new Set();
    let picked = 0;

    if (!Array.isArray(compsSorted) || !Number.isFinite(maxSelect) || maxSelect <= 0) return selectedKeys;

    for (const comp of compsSorted) {
      if (picked >= maxSelect) break;

      const heroesSet = compHeroesSet(comp);
      const pet = compPetNorm(comp);

      // Exclusions
      let excluded = false;
      for (const h of heroesSet) {
        if (excludedHeroes.has(h)) { excluded = true; break; }
      }
      if (excluded) continue;

      // Uniqueness
      let overlaps = false;
      for (const h of heroesSet) {
        if (usedHeroes.has(h)) { overlaps = true; break; }
      }
      if (overlaps) continue;
      if (pet !== 'unknown' && usedPets.has(pet)) continue;

      const key = compKeyFromComp(comp);
      selectedKeys.add(key);

      for (const h of heroesSet) usedHeroes.add(h);
      if (pet !== 'unknown') usedPets.add(pet);

      picked++;
    }

    return selectedKeys;
  }

  function computeSelectedCompKeys(compsSorted, maxSelect, excludedHeroes = new Set()) {
    // Goal: pick EXACTLY maxSelect comps (5 or 7) when possible, maximizing total average winrate,
    // with unique heroes AND unique pets.
    // Fallback rules:
    // 1) If there are maxSelect comps or fewer, keep greedy behavior.
    // 2) If exact selection cannot be found within reasonable bounds, fallback to greedy.

    if (!Array.isArray(compsSorted) || !Number.isFinite(maxSelect) || maxSelect <= 0) return new Set();

    if (compsSorted.length <= maxSelect) {
      return computeSelectedCompKeysGreedy(compsSorted, maxSelect, excludedHeroes);
    }

    // Candidate cap keeps the exact search responsive.
    const CANDIDATE_CAP = (maxSelect === 5) ? 90 : 140;

    // De-duplicate identical comps by unordered heroes+pet key; keep best winrate.
    const bestByKey = new Map();
    for (const comp of compsSorted) {
      const key = compKeyFromComp(comp);
      const win = Number(comp?.winrate) || 0;
      const prev = bestByKey.get(key);
      if (!prev || win > prev._win) {
        bestByKey.set(key, {
          ...comp,
          _key: key,
          _win: win,
          _heroes: compHeroesSet(comp),
          _pet: compPetNorm(comp),
        });
      }
    }

    const candidates = Array.from(bestByKey.values())
      .sort((a, b) => b._win - a._win)
      .slice(0, CANDIDATE_CAP);

    if (candidates.length < maxSelect) {
      return computeSelectedCompKeysGreedy(compsSorted, maxSelect, excludedHeroes);
    }

    // Precompute wins for a simple upper bound (ignores conflicts)
    const wins = candidates.map(c => c._win);
    function upperBound(fromIndex, remaining) {
      let s = 0;
      for (let i = 0; i < remaining; i++) {
        const idx = fromIndex + i;
        if (idx >= wins.length) break;
        s += wins[idx];
      }
      return s;
    }

    let bestPick = null;
    let bestSum = -Infinity;

    const usedHeroes = new Set();
    const usedPets = new Set();
    const picked = [];

    function conflicts(comp) {
      // Excluded heroes
      for (const h of comp._heroes) {
        if (excludedHeroes.has(h)) return true;
      }
      // Unique pets
      if (comp._pet !== 'unknown' && usedPets.has(comp._pet)) return true;
      // Unique heroes
      for (const h of comp._heroes) {
        if (usedHeroes.has(h)) return true;
      }
      return false;
    }

    function addComp(comp) {
      picked.push(comp);
      if (comp._pet !== 'unknown') usedPets.add(comp._pet);
      for (const h of comp._heroes) usedHeroes.add(h);
    }

    function removeComp(comp) {
      picked.pop();
      if (comp._pet !== 'unknown') usedPets.delete(comp._pet);
      for (const h of comp._heroes) usedHeroes.delete(h);
    }

    function dfs(i, sum) {
      const remainingToPick = maxSelect - picked.length;
      if (remainingToPick === 0) {
        if (sum > bestSum) {
          bestSum = sum;
          bestPick = picked.slice();
        }
        return;
      }

      if (i >= candidates.length) return;

      // Not enough candidates left to reach exact size
      if (picked.length + (candidates.length - i) < maxSelect) return;

      // Upper bound pruning
      const ub = sum + upperBound(i, remainingToPick);
      if (ub <= bestSum) return;

      const comp = candidates[i];

      // Include first (candidates are sorted by winrate desc)
      if (!conflicts(comp)) {
        addComp(comp);
        dfs(i + 1, sum + comp._win);
        removeComp(comp);
      }

      // Exclude
      dfs(i + 1, sum);
    }

    dfs(0, 0);

    if (bestPick && bestPick.length === maxSelect) {
      return new Set(bestPick.map(c => c._key));
    }

    return computeSelectedCompKeysGreedy(compsSorted, maxSelect, excludedHeroes);
  }

  function renderCompsIntoGrid(gridEl, comps, densityFlags, selectMax, recommendedOnly, excludedHeroes) {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const all = (comps || []);
    // Minimum sample threshold for recommendations
    const MIN_RECO_SAMPLES = 3;

    // Only comps with enough samples are eligible for "recommended" picking
    const eligibleForReco = all.filter(c => (Number(c?.n) || 0) >= MIN_RECO_SAMPLES);
    const selectedKeys = (selectMax > 0)
      ? computeSelectedCompKeys(eligibleForReco, selectMax, excludedHeroes)
      : new Set();

    // When "recommended only" is enabled, show only selected comps (ignores density filters).
    const list = recommendedOnly
      ? (selectMax > 0 ? all.filter(c => selectedKeys.has(compKeyFromComp(c))) : [])
      : all.filter(c => shouldShowDensity(c, densityFlags));

    for (const comp of list) {
      const card = document.createElement('div');
      card.className = 'comp-card';

      // Selected highlight
      const compKey = compKeyFromComp(comp);
      if (selectedKeys.has(compKey)) card.classList.add('selected');

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
      const recommendedOnly = !!qs('#cfRecoOnly')?.checked;
      const excludedHeroes = getExcludedHeroesFromUI();
      renderCompsIntoGrid(grid23, buckets['2-3'], densityFlags, 0, recommendedOnly, excludedHeroes);
      renderCompsIntoGrid(grid45, buckets['4-5'], densityFlags, 5, recommendedOnly, excludedHeroes);
      renderCompsIntoGrid(grid67, buckets['6-7'], densityFlags, 7, recommendedOnly, excludedHeroes);

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

    // Recommended-only toggle
    const recoOnlyEl = qs('#cfRecoOnly');
    if (recoOnlyEl) {
      recoOnlyEl.addEventListener('change', () => {
        renderForMode(getSelectedMode());
      });
    }

    // Optional: hero exclusions (if present)
    qsa('input.hero-exclusion').forEach((cb) => {
      cb.addEventListener('change', () => {
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
