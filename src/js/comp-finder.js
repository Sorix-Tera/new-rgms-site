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

  function isMediumOrHighLegend(comp) {
      // Legend tiers: Low <=2 (red), Medium 3-6 (orange), High >=7 (green)
      return !!comp && (comp.density === 'orange' || comp.density === 'green');
    }
  
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
  
  function computeSelectedCompKeysGreedy(compsSorted, maxSelect, excludedHeroes = new Set()) {
    // Your current behavior, but also enforcing unique pets (new requirement).
    const selectedKeys = new Set();
    const usedHeroes = new Set();
    const usedPets = new Set();
    let picked = 0;
  
    if (!Array.isArray(compsSorted) || maxSelect <= 0) return selectedKeys;
  
    for (const comp of compsSorted) {
      if (picked >= maxSelect) break;
      if (!isMediumOrHighLegend(comp)) continue;
  
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
    // 1) If <= maxSelect eligible, keep current method (greedy).
    // 2) Else try to find EXACTLY maxSelect disjoint comps (unique heroes + unique pets),
    //    maximizing total winrate.
    // 3) If not found, fallback to greedy.
  
    if (!Array.isArray(compsSorted) || maxSelect <= 0) return new Set();
  
    // Keep only Medium/High legend as required
    const eligible = compsSorted.filter(isMediumOrHighLegend);
  
    // Rule (1): if only maxSelect or fewer, keep existing behavior
    if (eligible.length <= maxSelect) {
      return computeSelectedCompKeysGreedy(eligible, maxSelect);
    }
  
    // Optional additional “reason” to preserve responsiveness:
    // cap candidates so we don’t explode combinatorially on very large datasets.
    // (Tune these caps based on your dataset size / browser targets.)
    const CANDIDATE_CAP = (maxSelect === 5) ? 70 : 110;
  
    // De-duplicate identical comps by compKey (keep best winrate)
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
        // Precompute sets for faster conflict checks
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
  
    // If we capped too hard and now there aren't enough candidates to even choose k
    if (candidates.length < maxSelect) {
      return computeSelectedCompKeysGreedy(eligible, maxSelect, excludedHeroes);
    }
  
    // Branch-and-bound search for best EXACT set of size maxSelect
    let bestPick = null;
    let bestSum = -Infinity;
  
    const usedHeroes = new Set();
    const usedPets = new Set();
    const picked = [];
  
    // Precompute a simple upper-bound prefix to prune faster:
    // ub(i, remaining) = sum of top `remaining` wins from i onward (ignores conflicts).
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
  
    function conflicts(comp) {
      // Excluded heroes: if candidate contains any excluded hero, it is invalid
      for (const h of comp._heroSet) {
        if (excludedHeroes.has(h)) return true;
      }
    
      // pets must be unique; ignore unknown
      if (comp._petNorm !== 'unknown' && usedPets.has(comp._petNorm)) return true;
    
      // selected heroes must be unique
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
  
      // Not enough candidates left to reach size k
      if (picked.length + (candidates.length - i) < maxSelect) return;
  
      // Upper-bound pruning (even if we took the next best `remainingToPick`, can we beat bestSum?)
      const ub = sum + upperBound(i, remainingToPick);
      if (ub <= bestSum) return;
  
      const comp = candidates[i];
  
      // Try include branch first (because candidates are sorted by winrate desc)
      if (!conflicts(comp)) {
        addComp(comp);
        dfs(i + 1, sum + comp._win);
        removeComp(comp);
      }
  
      // Exclude branch
      dfs(i + 1, sum);
    }
  
    dfs(0, 0);
  
    // Rule (2): If we found an exact-size solution, use it
    if (bestPick && bestPick.length === maxSelect) {
      const keys = new Set(bestPick.map(c => c._key));
      return keys;
    }
  
    // Rule (2 fallback): If exact k not found, revert to current greedy behavior
    return computeSelectedCompKeysGreedy(eligible, maxSelect, excludedHeroes);
  }

  function renderCompsIntoGrid(gridEl, comps, densityFlags, selectMax, excludedHeroes) {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const list = (comps || []).filter(c => shouldShowDensity(c, densityFlags));
    const selectedKeys = computeSelectedCompKeys(list, selectMax, excludedHeroes);

    for (const comp of list) {
      const card = document.createElement('div');
      card.className = 'comp-card';

      // Selected highlight (top comps, unique heroes, medium/high legend)
      const compKey = (() => {
        let h = parseHeroesList(comp.heroes).map(x => (x || '').trim().toLowerCase());
        h = h.slice(0, 5);
        while (h.length < 5) h.push('unknown');
        return normalizeCompKey(h, comp.pet);
      })();
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
      const excludedHeroes = getExcludedHeroesFromUI();
      renderCompsIntoGrid(grid23, buckets['2-3'], densityFlags, 0, excludedHeroes);
      renderCompsIntoGrid(grid45, buckets['4-5'], densityFlags, 5, excludedHeroes);
      renderCompsIntoGrid(grid67, buckets['6-7'], densityFlags, 7, excludedHeroes);

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

    qsa('input.hero-exclusion').forEach(cb => {
      cb.addEventListener('change', () => {
        const mode = getSelectedMode();      // whatever you currently use
        renderForMode(mode);
      });
    });
    // Default active tab
    setActiveBucket('2-3');

    // Initial render
    renderForMode(initialMode);
  };
})();
