// nc-box-comps.js
// "My NC Comps" — finds the 6 lowest-time comps (one per round, unique heroes+pets)
// from the database that match the player's box + optional merc.
//
// Algorithm (inspired by ae-comps.js buildTopBoxes):
//   1. Fetch all nc_round + nc_heroes rows.
//   2. JS-side filter: keep only comps where every hero is owned at >= required SI/Furn.
//   3. Build a flat list of all valid comps sorted by time_boss ASC.
//   4. DFS with pruning: pick 6 non-overlapping comps (unique heroes+pets, one per round)
//      that minimise total time_boss. Uses an optimistic lower-bound per unused round
//      to prune branches early.

(function () {
  const STORAGE_KEY = 'yourBox';
  const ROUNDS      = [1, 2, 3, 4, 5, 6];

  // ── Utility ────────────────────────────────────────────────────────────────

  function qs(sel, root = document) { return root.querySelector(sel); }

  function toIconSlug(name) {
    return (name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function formatTime(val) {
    if (val == null || Number.isNaN(Number(val))) return '—';
    return `${Number(val).toFixed(2)}s`;
  }

  // ── Box helpers ────────────────────────────────────────────────────────────

  function loadBox() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  // Returns a Map: lowerCaseName -> { si, furn }  (owned heroes only)
  function buildEffectiveBox(mercData) {
    const stored = loadBox();
    const box = new Map();

    for (const [hero, data] of Object.entries(stored)) {
      const isOwned = typeof data.owned === 'boolean' ? data.owned : true;
      if (!isOwned) continue;
      box.set(hero.toLowerCase(), {
        si:   data.si   ?? 0,
        furn: data.furn ?? 0,
      });
    }

    if (mercData && mercData.name) {
      box.set(mercData.name.toLowerCase(), {
        si:   mercData.si   ?? 0,
        furn: mercData.furn ?? 0,
      });
    }

    return box;
  }

  // ── Pet blacklist ──────────────────────────────────────────────────────────

  const blacklistedPets = new Set();

  function renderPetTags(root) {
    const container = qs('#nbcPetBlTags', root);
    if (!container) return;
    container.innerHTML = '';

    for (const pet of [...blacklistedPets].sort()) {
      const tag = document.createElement('span');
      tag.className = 'nbc-pet-tag';

      const label = document.createElement('span');
      label.className = 'nbc-pet-tag-label';
      label.textContent = pet;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'nbc-pet-tag-remove';
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Re-add ${pet}`);
      removeBtn.title = `Re-add ${pet}`;
      removeBtn.textContent = '\u00d7';

      removeBtn.addEventListener('click', () => {
        blacklistedPets.delete(pet);
        const sel = qs('#nbcPetBlSelect', root);
        if (sel) {
          const opt = sel.querySelector(`option[value="${pet}"]`);
          if (opt) opt.disabled = false;
        }
        renderPetTags(root);
      });

      tag.appendChild(label);
      tag.appendChild(removeBtn);
      container.appendChild(tag);
    }
  }

  function initPetBlacklist(root) {
    const select = qs('#nbcPetBlSelect', root);
    const btn    = qs('#nbcPetBlBtn', root);
    if (!select || !btn) return;

    btn.addEventListener('click', () => {
      const pet = select.value;
      if (!pet || blacklistedPets.has(pet.toLowerCase())) return;
      blacklistedPets.add(pet.toLowerCase());
      const opt = select.querySelector(`option[value="${pet}"]`);
      if (opt) opt.disabled = true;
      select.value = '';
      renderPetTags(root);
    });
  }

  // ── Merc UI ────────────────────────────────────────────────────────────────

  function readMerc(root) {
    const panel = qs('.nbc-merc-panel', root);
    if (!panel || !panel.classList.contains('is-open')) return null;

    const nameInput = qs('#nbcMercHero', root);
    const name = (nameInput ? nameInput.value : '').trim();
    if (!name) return null;

    return {
      name,
      si:   parseInt(qs('#nbcMercSi',   root)?.value ?? '0',  10),
      furn: parseInt(qs('#nbcMercFurn', root)?.value ?? '0',  10),
      engr: parseInt(qs('#nbcMercEngr', root)?.value ?? '0',  10),
    };
  }

  // ── JS-side filtering ──────────────────────────────────────────────────────

  function compMatchesBox(heroes, box) {
    for (const h of heroes) {
      if (h.type === 'pet') continue;
      const owned = box.get(h.name.toLowerCase());
      if (!owned)                      return false;
      if (owned.si   < (h.si   ?? 0)) return false;
      if (owned.furn < (h.furn ?? 0)) return false;
    }
    return true;
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function fetchAllData() {
    const rounds = await fetchPaginated(
      supabaseClient
        .from('nc_round')
        .select('id, nc_id, round, comp_key, comp, time_boss, nc(name, region, rank)')
        .not('time_boss', 'is', null)
        .order('round',     { ascending: true })
        .order('time_boss', { ascending: true })
    );

    const heroes = await fetchPaginated(
      supabaseClient
        .from('nc_heroes')
        .select('nc_id, round, name, si, furn, type')
    );

    return { rounds, heroes };
  }

  async function fetchPaginated(baseQuery) {
    const PAGE = 1000;
    let from = 0;
    let all  = [];
    while (true) {
      const { data, error } = await baseQuery.range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  // ── Solver ─────────────────────────────────────────────────────────────────

  function solve(validComps, bestPerRound) {
    let bestResult = new Map();
    let bestCount  = 0;
    let bestTotal  = Infinity;
    const n        = validComps.length;

    const fillableRounds = new Set(validComps.map(c => c.round));
    const maxFillable    = fillableRounds.size;

    function isBetter(count, total) {
      if (count > bestCount) return true;
      if (count === bestCount && total < bestTotal) return true;
      return false;
    }

    function dfs(idx, usedNames, usedRounds, chosen, currentTotal) {
      const filledCount = usedRounds.size;

      if (filledCount === maxFillable) {
        if (isBetter(filledCount, currentTotal)) {
          bestCount  = filledCount;
          bestTotal  = currentTotal;
          bestResult = new Map(chosen);
        }
        return;
      }

      if (bestCount === maxFillable) {
        let lowerBound = currentTotal;
        for (const r of ROUNDS) {
          if (usedRounds.has(r)) continue;
          if (!fillableRounds.has(r)) continue;
          const best = bestPerRound.get(r);
          if (best != null) lowerBound += best;
        }
        if (lowerBound >= bestTotal) return;
      }

      if (idx >= n) {
        if (isBetter(filledCount, currentTotal)) {
          bestCount  = filledCount;
          bestTotal  = currentTotal;
          bestResult = new Map(chosen);
        }
        return;
      }

      for (let i = idx; i < n; i++) {
        const c = validComps[i];

        if (usedRounds.has(c.round)) continue;

        let conflict = false;
        for (const name of c.nameSet) {
          if (usedNames.has(name)) { conflict = true; break; }
        }
        if (conflict) continue;

        if (bestCount === maxFillable && currentTotal + c.time_boss >= bestTotal) continue;

        for (const name of c.nameSet) usedNames.add(name);
        usedRounds.add(c.round);
        chosen.set(c.round, c);

        dfs(i + 1, usedNames, usedRounds, chosen, currentTotal + c.time_boss);

        for (const name of c.nameSet) usedNames.delete(name);
        usedRounds.delete(c.round);
        chosen.delete(c.round);
      }

      if (isBetter(filledCount, currentTotal)) {
        bestCount  = filledCount;
        bestTotal  = currentTotal;
        bestResult = new Map(chosen);
      }
    }

    dfs(0, new Set(), new Set(), new Map(), 0);

    return ROUNDS.map(r => bestResult.get(r) ?? null);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  function makeHeroIcon(hero) {
    const isPet = hero.type === 'pet';
    const slug  = toIconSlug(hero.name);
    const base  = isPet ? 'icons/pets' : 'icons/heroes2';

    const wrap = document.createElement('div');
    wrap.className = 'nbc-icon-wrap';

    const img = document.createElement('img');
    img.className = 'nbc-icon-img' + (isPet ? ' is-pet' : '');
    img.src     = `${base}/${slug}.jpg`;
    img.alt     = hero.name;
    img.title   = hero.name;
    img.loading = 'lazy';

    img.addEventListener('error', () => {
      if (!img.dataset.tryPng) {
        img.dataset.tryPng = '1';
        img.src = `${base}/${slug}.png`;
        return;
      }
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = 'icons/heroes2/unknown.png';
        return;
      }
      img.style.display = 'none';
    });

    wrap.appendChild(img);

    if (!isPet) {
      const badges = document.createElement('div');
      badges.className = 'nbc-icon-badges';

      if (hero.si != null) {
        const b = document.createElement('span');
        b.className = 'nbc-badge si';
        b.textContent = `SI${hero.si}`;
        badges.appendChild(b);
      }
      if (hero.furn != null) {
        const b = document.createElement('span');
        b.className = 'nbc-badge furn';
        b.textContent = `F${hero.furn}`;
        badges.appendChild(b);
      }

      wrap.appendChild(badges);
    }

    return wrap;
  }

  function makeCompCard(round, comp) {
    const card = document.createElement('article');
    card.className = 'nbc-card';

    if (!comp) {
      card.classList.add('nbc-card-empty');
      const roundBadge = document.createElement('span');
      roundBadge.className = 'nbc-card-round';
      roundBadge.textContent = `R${round}`;
      const label = document.createElement('div');
      label.className = 'nbc-card-empty-label';
      label.textContent = 'No valid comp';
      card.appendChild(roundBadge);
      card.appendChild(label);
      return card;
    }

    const header = document.createElement('div');
    header.className = 'nbc-card-header';

    const roundBadge = document.createElement('span');
    roundBadge.className = 'nbc-card-round';
    roundBadge.textContent = `R${round}`;

    const time = document.createElement('div');
    time.className = 'nbc-card-time';
    time.textContent = formatTime(comp.time_boss);

    header.appendChild(roundBadge);
    header.appendChild(time);

    const player = document.createElement('div');
    player.className = 'nbc-card-player';
    player.innerHTML =
      `<strong>${comp.player_name ?? '—'}</strong>` +
      ` &middot; Region ${comp.region ?? '—'}` +
      ` &middot; Rank ${comp.rank ?? '?'}`;

    const iconsRow = document.createElement('div');
    iconsRow.className = 'nbc-icons-row';
    const heroUnits = (comp.heroes || []).filter(h => h.type !== 'pet');
    const petUnits  = (comp.heroes || []).filter(h => h.type === 'pet');
    for (const h of heroUnits) iconsRow.appendChild(makeHeroIcon(h));
    for (const p of petUnits)  iconsRow.appendChild(makeHeroIcon(p));

    card.appendChild(header);
    card.appendChild(player);
    card.appendChild(iconsRow);

    return card;
  }

  function renderResults(root, resultComps) {
    const grid = qs('#nbcResultsGrid', root);
    if (!grid) return;
    grid.innerHTML = '';
    ROUNDS.forEach((r, idx) => {
      grid.appendChild(makeCompCard(r, resultComps[idx] ?? null));
    });
  }

  function setStatus(root, msg) {
    const el = qs('#nbcStatus', root);
    if (el) el.textContent = msg;
  }

  // ── Main flow ──────────────────────────────────────────────────────────────

  async function findComps(root) {
    if (typeof supabaseClient === 'undefined') {
      setStatus(root, 'Supabase client is not available.');
      return;
    }

    const btn = qs('#nbcFindBtn', root);
    if (btn) btn.disabled = true;

    const merc = readMerc(root);
    const box  = buildEffectiveBox(merc);

    if (box.size === 0) {
      setStatus(root, 'Your box is empty — go to "Your Box" and set your hero investments first.');
      if (btn) btn.disabled = false;
      return;
    }

    setStatus(root, 'Fetching comp data…');

    try {
      const { rounds: roundRows, heroes: heroRows } = await fetchAllData();

      setStatus(root, `Fetched ${roundRows.length} comps — filtering…`);
      await new Promise(resolve => setTimeout(resolve, 0));

      const heroMap = new Map();
      for (const h of heroRows) {
        const key = `${h.nc_id}:${h.round}`;
        if (!heroMap.has(key)) heroMap.set(key, []);
        heroMap.get(key).push(h);
      }

      const validComps = [];
      const countByRound = {};
      for (const r of ROUNDS) countByRound[r] = 0;

      for (const row of roundRows) {
        const r = row.round;
        if (!ROUNDS.includes(r)) continue;

        const heroes = heroMap.get(`${row.nc_id}:${r}`);
        if (!heroes || heroes.length === 0) continue;
        if (!compMatchesBox(heroes, box)) continue;

        const hasBannedPet = heroes.some(
          h => h.type === 'pet' && blacklistedPets.has(h.name.toLowerCase())
        );
        if (hasBannedPet) continue;

        const nc = row.nc || {};
        validComps.push({
          nc_id:       row.nc_id,
          round:       r,
          time_boss:   row.time_boss,
          comp_key:    row.comp_key,
          comp:        row.comp,
          player_name: nc.name   ?? '—',
          region:      nc.region ?? null,
          rank:        nc.rank   ?? null,
          heroes,
          nameSet: new Set(heroes.map(h => h.name.toLowerCase())),
        });

        countByRound[r]++;
      }

      validComps.sort((a, b) => (a.time_boss ?? Infinity) - (b.time_boss ?? Infinity));

      const bestPerRound = new Map();
      for (const c of validComps) {
        if (!bestPerRound.has(c.round)) {
          bestPerRound.set(c.round, c.time_boss);
        }
      }

      if (validComps.length === 0) {
        setStatus(root, 'No comps match your box. Try adding a merc or adjusting your investments.');
        renderResults(root, new Array(6).fill(null));
        if (btn) btn.disabled = false;
        return;
      }

      setStatus(root, 'Solving…');
      await new Promise(resolve => setTimeout(resolve, 0));

      const result = solve(validComps, bestPerRound);

      const validCount = result.filter(Boolean).length;
      if (validCount === 0) {
        setStatus(root, 'Could not find non-overlapping comps with your current box.');
      } else {
        const totalTime = result
          .filter(Boolean)
          .reduce((acc, c) => acc + (c.time_boss || 0), 0);
        setStatus(root, `Found ${validCount}/6 rounds · Total time: ${formatTime(totalTime)}`);
      }

      renderResults(root, result);

    } catch (err) {
      console.error('Error in findComps:', err);
      setStatus(root, 'Unexpected error — check the console for details.');
    }

    if (btn) btn.disabled = false;
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    const root = qs('#nbcPage');
    if (!root) return;

    const toggle = qs('#nbcMercToggle', root);
    const panel  = qs('.nbc-merc-panel', root);

    if (toggle && panel) {
      toggle.addEventListener('click', () => {
        const open = panel.classList.toggle('is-open');
        toggle.classList.toggle('is-active', open);
        toggle.textContent = open ? '− Remove merc' : '+ Add a merc';
      });
    }

    initPetBlacklist(root);

    const findBtn = qs('#nbcFindBtn', root);
    if (findBtn) {
      findBtn.addEventListener('click', () => findComps(root));
    }
  });

})();