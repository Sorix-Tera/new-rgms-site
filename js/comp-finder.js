// comp-finder.js
// Aggregates comps across all players, groups by (5 heroes + pet), computes avg winrate,
// and renders three tabs: 2-3 teams, 4-5 teams, 6-7 teams.
// Supports region filtering, density/legend filtering (display only), exclusions (missing heroes),
// and recommended selection (exact-k when possible) with a "recommended-only" toggle.

(() => {
  // ---------- small DOM helpers ----------
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- configuration ----------
  const SUPABASE_TABLE = 'screenshots';
  const MAX_ROWS_PER_MODE = 5000; // protective cap for client-side aggregation

  // Map the human UI modes to your screenshots.mode values
  const MODES = [
    { id: 'ts-forest', label: 'Treasure Scramble (Forest)', key: 'ts-forest' },
    { id: 'ts-desert', label: 'Treasure Scramble (Desert)', key: 'ts-desert' },
    { id: 'ts-mountain', label: 'Treasure Scramble (Mountain)', key: 'ts-mountain' },
    { id: 'ts-swamp', label: 'Treasure Scramble (Swamp)', key: 'ts-swamp' },
    { id: 'ts-snow', label: 'Treasure Scramble (Snow)', key: 'ts-snow' },
    { id: 'nc', label: 'Nightmare Corridor', key: 'nc' },
    { id: 'cr', label: 'Cursed Realm', key: 'cr' },
  ];

  // ---------- parsing / normalization ----------
  function parseHeroesList(heroesStr) {
    // Heroes are stored as "A - B - C - D - E"
    if (!heroesStr) return [];
    return String(heroesStr)
      .split('-')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function isUnknownName(name) {
    const n = String(name || '').trim().toLowerCase();
    return !n || n === 'unknown' || n === 'null' || n === 'n/a';
  }

  function normalizeCompKey(heroesArr, petStr) {
    // Comp Finder grouping key:
    // - Exactly 5 heroes (lowercased, unknown-filled)
    // - HERO ORDER DOES NOT MATTER: we sort heroes to make the key order-independent
    // - Pet included (lowercased)
    const hRaw = (heroesArr || []).slice(0, 5).map(x => (x || '').trim().toLowerCase() || 'unknown');
    while (hRaw.length < 5) hRaw.push('unknown');

    // Sort for order-independent grouping (keep 'unknown' last for stability)
    const h = hRaw.slice().sort((a, b) => {
      const au = a === 'unknown';
      const bu = b === 'unknown';
      if (au && !bu) return 1;
      if (!au && bu) return -1;
      return a.localeCompare(b);
    });

    const p = (petStr || '').trim().toLowerCase() || 'unknown';
    return `${h.join('|')}::${p}`;
  }

  function compKeyOfComp(comp) {
    // Must be consistent with normalizeCompKey (order-independent heroes + pet)
    const heroesArr = parseHeroesList(comp?.heroes || '').map(h => (h || '').trim().toLowerCase());
    const petStr = comp?.pet || '';
    return normalizeCompKey(heroesArr, petStr);
  }

  function isRecoOnlyEnabled() {
    const el = document.getElementById('cfRecoOnly');
    return !!el && el.checked === true;
  }

  function formatHeroesKeyForDisplay(compKey) {
    // compKey was built from heroes|...::pet
    const [heroesPart, petPart] = String(compKey).split('::');
    const heroes = (heroesPart || '').split('|').map(s => s.trim()).filter(Boolean);
    const pet = (petPart || '').trim();
    return { heroes, pet };
  }

  function parseTeamsCount(teamsVal) {
    const n = Number(teamsVal);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
    const s = String(teamsVal || '').trim();
    const m = s.match(/(\d+)/);
    return m ? Number(m[1]) : NaN;
  }

  function teamsBucketKey(n) {
    if (!Number.isFinite(n)) return null;
    if (n >= 2 && n <= 3) return '2-3';
    if (n >= 4 && n <= 5) return '4-5';
    if (n >= 6 && n <= 7) return '6-7';
    return null;
  }

  function densityKeyFromCount(n) {
    // purely for display filtering
    if (n >= 7) return 'green';
    if (n >= 3) return 'orange';
    return 'red';
  }

  // ---------- icons ----------
  function iconUrlForHero(heroName) {
    const name = String(heroName || '').trim();
    if (!name) return 'icons/heroes2/unknown.png';
    return `icons/heroes2/${name}.png`;
  }

  function iconUrlForPet(petName) {
    const name = String(petName || '').trim();
    if (!name) return 'icons/pets/unknown.png';
    return `icons/pets/${name}.png`;
  }

  // ---------- region handling ----------
  function getSelectedRegionKeys() {
    // UI expects a dropdown with checkboxes (all/regions)
    // We store selection in a hidden state via setRegionSelection().
    return window.__cfRegionSelection || new Set(['all']);
  }

  function setRegionSelection(setKeys) {
    window.__cfRegionSelection = setKeys;
  }

  function filterRowsByRegions(rows, regionKeys) {
    if (!regionKeys || regionKeys.size === 0 || regionKeys.has('all')) return rows || [];
    const keysSet = new Set(Array.from(regionKeys).map(k => String(k || '').trim().toLowerCase()));
    return (rows || []).filter(r => keysSet.has(String(r.region || '').trim().toLowerCase()));
  }

  function initRegionsDropdown(onChange) {
    const btn = qs('#cfRegionsBtn');
    const panel = qs('#cfRegionsPanel');
    if (!btn || !panel) return;

    const closePanel = () => panel.classList.remove('is-open');
    const openPanel = () => panel.classList.add('is-open');
    const togglePanel = () => panel.classList.toggle('is-open');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      togglePanel();
    });

    document.addEventListener('click', (e) => {
      if (!panel.classList.contains('is-open')) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      closePanel();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });

    // default selection
    const all = panel.querySelector('input[value="all"]');
    if (all) all.checked = true;

    function updateLabelFromSelection(keys) {
      const label = qs('#cfRegionsLabel');
      if (!label) return;
      if (!keys || keys.size === 0 || keys.has('all')) {
        label.textContent = 'All regions';
        return;
      }
      label.textContent = `${keys.size} region${keys.size > 1 ? 's' : ''}`;
    }

    function readSelectionFromUI() {
      const checked = new Set();
      qsa('input[type="checkbox"]', panel).forEach(cb => {
        if (cb.checked) checked.add(String(cb.value || '').trim().toLowerCase());
      });

      // If "all" is checked, force only "all"
      if (checked.has('all')) return new Set(['all']);
      if (checked.size === 0) return new Set(['all']);
      return checked;
    }

    // Checkbox behavior:
    // - checking "all" unchecks others
    // - checking any other unchecks "all"
    qsa('input[type="checkbox"]', panel).forEach(cb => {
      cb.addEventListener('change', () => {
        const v = String(cb.value || '').trim().toLowerCase();
        if (v === 'all' && cb.checked) {
          qsa('input[type="checkbox"]', panel).forEach(x => {
            if (String(x.value).trim().toLowerCase() !== 'all') x.checked = false;
          });
        } else if (v !== 'all' && cb.checked) {
          const allCb = panel.querySelector('input[value="all"]');
          if (allCb) allCb.checked = false;
        }

        const keys = readSelectionFromUI();
        setRegionSelection(keys);
        updateLabelFromSelection(keys);
        if (typeof onChange === 'function') onChange();
      });
    });

    // initial label
    const keys = readSelectionFromUI();
    setRegionSelection(keys);
    updateLabelFromSelection(keys);
  }

  // ---------- density filters (display only) ----------
  function getDensityFlags() {
    const red = qs('#cfShowRed')?.checked !== false;
    const orange = qs('#cfShowOrange')?.checked !== false;
    const green = qs('#cfShowGreen')?.checked !== false;
    return { red, orange, green };
  }

  function shouldShowDensity(comp, flags) {
    if (!flags) return true;
    if (comp.density === 'red') return !!flags.red;
    if (comp.density === 'orange') return !!flags.orange;
    if (comp.density === 'green') return !!flags.green;
    return true;
  }

  // ---------- exclusions (missing heroes) ----------
  function normHeroId(x) {
    return (x || '').toString().trim().toLowerCase();
  }

  function getExcludedHeroesFromUI() {
    const set = new Set();
    document.querySelectorAll('input.hero-exclusion:checked').forEach(cb => {
      const id = normHeroId(cb.value);
      if (id) set.add(id);
    });
    return set;
  }

  // ---------- recommendation selection ----------
  function computeSelectedCompKeysGreedy(compsSorted, maxSelect, excludedHeroes = new Set()) {
    // Greedy: take best winrate first, enforcing unique heroes + unique pets.
    const selectedKeys = new Set();
    const usedHeroes = new Set();
    const usedPets = new Set();
    let picked = 0;

    if (!Array.isArray(compsSorted) || maxSelect <= 0) return selectedKeys;

    for (const comp of compsSorted) {
      if (picked >= maxSelect) break;

      // Normalize heroes/pet
      let heroes = parseHeroesList(comp.heroes).map(h => (h || '').trim().toLowerCase());
      heroes = heroes.slice(0, 5);

      const heroExcluded = heroes.some(h => h && h !== 'unknown' && excludedHeroes.has(h));
      if (heroExcluded) continue;

      while (heroes.length < 5) heroes.push('unknown');

      const pet = ((comp.pet || '').trim().toLowerCase()) || 'unknown';

      // Enforce uniqueness (ignore 'unknown')
      const heroOverlap = heroes.some(h => h && h !== 'unknown' && usedHeroes.has(h));
      const petOverlap = (pet !== 'unknown' && usedPets.has(pet));
      if (heroOverlap || petOverlap) continue;

      const compKey = normalizeCompKey(heroes, comp.pet);
      selectedKeys.add(compKey);

      for (const h of heroes) if (h && h !== 'unknown') usedHeroes.add(h);
      if (pet !== 'unknown') usedPets.add(pet);

      picked++;
    }

    return selectedKeys;
  }

  function computeSelectedCompKeys(compsSorted, maxSelect, excludedHeroes = new Set()) {
    // Exact-k preference:
    // 1) If total comps <= maxSelect, keep greedy behavior.
    // 2) Else try to find EXACTLY maxSelect disjoint comps (unique heroes + unique pets),
    //    maximizing total winrate.
    // 3) If not found, fallback to greedy.

    if (!Array.isArray(compsSorted) || maxSelect <= 0) return new Set();

    // Eligible comps for recommendation (no minimum sample filter)
    const eligible = (compsSorted || []).slice();

    if (eligible.length <= maxSelect) {
      return computeSelectedCompKeysGreedy(eligible, maxSelect, excludedHeroes);
    }

    // Cap candidates for responsiveness
    const CANDIDATE_CAP = (maxSelect === 5) ? 70 : 110;

    // De-duplicate by compKey (keep best winrate)
    const bestByKey = new Map();
    for (const comp of eligible) {
      let heroes = parseHeroesList(comp.heroes).map(h => (h || '').trim().toLowerCase());
      heroes = heroes.slice(0, 5);
      while (heroes.length < 5) heroes.push('unknown');

      const key = normalizeCompKey(heroes, comp.pet);
      const win = Number(comp.winrate) || 0;

      const prev = bestByKey.get(key);
      if (!prev || win > prev._win) {
        bestByKey.set(key, { ...comp, _key: key, _win: win });
      }
    }

    // Sort by winrate desc and keep top N candidates
    const candidates = Array.from(bestByKey.values())
      .sort((a, b) => (b._win - a._win))
      .slice(0, CANDIDATE_CAP)
      .map(c => {
        let heroes = parseHeroesList(c.heroes).map(h => (h || '').trim().toLowerCase());
        heroes = heroes.slice(0, 5);
        while (heroes.length < 5) heroes.push('unknown');

        const heroSet = new Set(heroes.filter(h => h && h !== 'unknown'));
        const pet = ((c.pet || '').trim().toLowerCase()) || 'unknown';

        return {
          ...c,
          _heroSet: heroSet,
          _petNorm: pet,
        };
      });

    if (candidates.length < maxSelect) {
      return computeSelectedCompKeysGreedy(eligible, maxSelect, excludedHeroes);
    }

    // Upper bound helper (ignores conflicts)
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
      for (const h of comp._heroSet) {
        if (excludedHeroes.has(h)) return true;
      }

      // Unique pets (ignore unknown)
      if (comp._petNorm !== 'unknown' && usedPets.has(comp._petNorm)) return true;

      // Unique heroes
      for (const h of comp._heroSet) {
        if (usedHeroes.has(h)) return true;
      }
      return false;
    }

    function addComp(comp) {
      picked.push(comp);
      if (comp._petNorm !== 'unknown') usedPets.add(comp._petNorm);
      for (const h of comp._heroSet) usedHeroes.add(h);
    }

    function removeComp(comp) {
      picked.pop();
      if (comp._petNorm !== 'unknown') usedPets.delete(comp._petNorm);
      for (const h of comp._heroSet) usedHeroes.delete(h);
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

      // Not enough candidates left to reach k
      if (picked.length + (candidates.length - i) < maxSelect) return;

      // Branch-and-bound pruning
      const ub = sum + upperBound(i, remainingToPick);
      if (ub <= bestSum) return;

      const comp = candidates[i];

      // Include first (better pruning since sorted)
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

    // Fallback
    return computeSelectedCompKeysGreedy(eligible, maxSelect, excludedHeroes);
  }

  // ---------- aggregation ----------
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
        // Store display order from first-seen comp for this group
        map.set(key, { sum: w, n: 1, displayHeroes: heroesStr, displayPet: petStr });
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

        // Display order: keep the first observed hero ordering for this group (Comp Finder only).
        const heroesStr = (agg && agg.displayHeroes) ? agg.displayHeroes : heroes.join(' - ');
        const petStr = (agg && agg.displayPet) ? agg.displayPet : pet;

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

  // ---------- fetching / caching ----------
  function getSelectedMode() {
    const sel = qs('#cfModeSelect');
    if (!sel) return 'ts-forest';
    return String(sel.value || '').trim() || 'ts-forest';
  }

  function updateUrlMode(mode) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    } catch (_) {
      // ignore
    }
  }

  function getInitialModeFromUrlOrDefault() {
    try {
      const url = new URL(window.location.href);
      const m = url.searchParams.get('mode');
      return m || 'ts-forest';
    } catch (_) {
      return 'ts-forest';
    }
  }

  async function fetchRowsForMode(modeKey) {
    if (!window.supabaseClient) {
      throw new Error('Supabase client not initialized (core.js).');
    }

    // Pull only what we need for comp finder
    const { data, error } = await window.supabaseClient
      .from(SUPABASE_TABLE)
      .select('mode,created_at,region,teams,heroes,pet,winrate')
      .eq('mode', modeKey)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS_PER_MODE);

    if (error) throw error;

    return {
      rows: data || [],
      rowCount: (data || []).length,
      truncated: (data || []).length >= MAX_ROWS_PER_MODE,
    };
  }

  async function ensureDataLoaded(modeKey, statusEl) {
    window.__cfCache = window.__cfCache || new Map();
    const cache = window.__cfCache;

    if (cache.has(modeKey)) return cache.get(modeKey);

    statusEl.textContent = 'Loading…';

    const payload = await fetchRowsForMode(modeKey);
    cache.set(modeKey, payload);
    return payload;
  }

  // ---------- rendering ----------
  function setActiveBucket(bucketKey) {
    const tabs = qsa('.cf-tab');
    const panels = qsa('.cf-panel');

    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.bucket === bucketKey));
    panels.forEach(p => p.classList.toggle('is-active', p.dataset.bucket === bucketKey));
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
      const excludedHeroes = getExcludedHeroesFromUI();

      renderCompsIntoGrid(grid23, buckets['2-3'], densityFlags, 0, excludedHeroes);
      renderCompsIntoGrid(grid45, buckets['4-5'], densityFlags, 5, excludedHeroes);
      renderCompsIntoGrid(grid67, buckets['6-7'], densityFlags, 7, excludedHeroes);

      const msg = payload.truncated
        ? `Loaded first ${payload.rowCount} rows (truncated for performance).`
        : `Loaded ${payload.rowCount} rows.`;

      statusEl.textContent =
        `Showing comps aggregated across all players (${qs('#cfRegionsLabel')?.textContent || 'All regions'}). ${msg}`;
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error loading comp data.';
    }
  }

  function renderCompsIntoGrid(gridEl, comps, densityFlags, selectMax, excludedHeroes) {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const all = Array.isArray(comps) ? comps : [];

    // Always recompute recommendations from ALL comps in the bucket (not restricted by legend/show flags).
    const selectedKeys = computeSelectedCompKeys(all, selectMax, excludedHeroes);

    // Toggle: show only recommended comps (selectedKeys) when enabled.
    const recoOnly = isRecoOnlyEnabled();

    let list;
    if (recoOnly) {
      // Only show selected comps (and ignore density filters).
      if (!selectMax || selectedKeys.size === 0) {
        list = [];
      } else {
        list = all.filter(c => selectedKeys.has(compKeyOfComp(c)));
      }
    } else {
      // Normal browsing: respect density/show filters.
      list = all.filter(c => shouldShowDensity(c, densityFlags));
    }

    for (const comp of list) {
      const card = document.createElement('div');
      card.className = 'comp-card';

      // Highlight if selected
      const key = compKeyOfComp(comp);
      if (selectedKeys.has(key)) card.classList.add('selected');

      // Helpful tooltip
      const avgWin = Number(comp.winrate);
      const samples = Number(comp.n);
      if (Number.isFinite(avgWin) && Number.isFinite(samples)) {
        card.title = `Avg winrate: ${avgWin.toFixed(1)}% · Samples: ${samples}`;
      }

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

      const badge = document.createElement('div');
      badge.className = 'comp-winrate';
      badge.textContent = `${(Number.isFinite(avgWin) ? avgWin : 0).toFixed(1)}%`;
      row.appendChild(badge);

      card.appendChild(row);
      gridEl.appendChild(card);
    }
  }

  // ---------- init ----------
  function initCompFinderPage() {
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
      renderForMode(getSelectedMode());
    });

    // Tabs
    qsa('.cf-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const bucket = btn.getAttribute('data-bucket');
        if (!bucket) return;
        setActiveBucket(bucket);
      });
    });

    // Default active tab
    setActiveBucket('2-3');

    // Density checkboxes (display only)
    ['#cfShowRed', '#cfShowOrange', '#cfShowGreen'].forEach(sel => {
      const el = qs(sel);
      if (!el) return;
      el.addEventListener('change', () => {
        renderForMode(getSelectedMode());
      });
    });

    // Recommended-only toggle
    const recoOnly = qs('#cfRecoOnly');
    if (recoOnly) {
      recoOnly.checked = recoOnly.checked === true; // explicit default is OFF in markup
      recoOnly.addEventListener('change', () => {
        renderForMode(getSelectedMode());
      });
    }

    // Mode select
    if (modeSelect) {
      modeSelect.addEventListener('change', () => {
        const mode = getSelectedMode();
        updateUrlMode(mode);
        renderForMode(mode);
      });
    }

    // Missing heroes (exclusions)
    qsa('input.hero-exclusion').forEach(cb => {
      cb.addEventListener('change', () => {
        renderForMode(getSelectedMode());
      });
    });

    // Initial render
    renderForMode(initialMode);
  }

  initCompFinderPage();
})();
