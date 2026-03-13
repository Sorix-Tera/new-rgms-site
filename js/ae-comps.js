(function () {
  const HERO_NAMES = ["aantandra","aathalia","abaden","abelinda","abrutus","adrian","aeironn","aestrilda","aezizh","afawkes","ainz","alaro","albedo","alna","alucius","alvida","alyca","anasta","angelo","ankhira","anoki","antandra","apippa","arden","arkadios","arthur","asafiya","ashemira","askriath","asolise","astar","atalene","athalia","athane","atheus","athoran","audrae","aurelia","baden","begris","belinda","bloodsnarl","bronn","brutus","cassius","cecilia","cha","cr","crassio","daemia","daimon","desira","dgwyneth","dreaf","drez","edwin","eironn","eletha","elthara","eluard","emilia","envydiel","eorin","estrilda","eugene","ezio","ezizh","fane","fawkes","ferael","flora","framton","gavus","geralt","ginneas","golus","gorok","gorren","gorvo","gourgue","granit","grezhul","gwyneth","haelia","haelus","harvey","hendrik","hildwin","hodgkin","hogan","icariel","ira","isabella","ivan","izold","jerome","joan","joker","kaelon","kalene","kalthin","kaz","kelthur","khasos","khazard","knox","kregor","kren","laios","lan","lavatune","leofric","leonardo","lethos","leviathan","liberta","lorsan","lucilla","lucius","lucretia","lyca","lysander","maetria","malkrie","marcille","mehira","melion","melusina","merek","merlin","mezoth","mira","mirael","misha","mishka","morael","morrow","mortas","morvus","mulan","nakoruru","nara","naroko","nemora","nevanthi","niru","numisu","nyla","oden","odysseus","ogi","oku","olgath","orthros","oscar","palmer","peggy","pippa","prince","pulina","queen","raine","raku","randle","raoul","rem","respen","rigby","rimuru","robin","rosaline","rowan","safiya","saitama","salaki","satrana","saurus","saveas","scarlet","seirus","selene","serenmira","sezis","shaltear","shemira","shuna","silas","silvina","simona","sion","sjw","skreg","skriath","skylan","solise","sonja","steixius","talene","talimar","tamrus","tarnos","tasi","tavriel","thali","thane","theowyn","thesku","thoran","tidus","titus","torne","treznor","trishea","tsumiki","twins","ukyo","ulmus","ulric","umbriel","vedan","veithael","velufira","vika","villanelle","vurk","vyloris","walker","warek","wukong","yennefer","zaphrael","zikis","zohra","zolrath"];
  const PET_NAMES = ["bellbellow","chest","dragon","dreary","feline","fire","fox","ghost","grassy","ibis","ice","lion","owl","panda","pegasus","phanta","polar","rabbit","radish","ridge","roamer","rock","savage","seal","spooder","talismane","thistlekin","tufty"];

  const HEROES = HERO_NAMES.map((name) => ({
    name,
    src: `icons/heroes2/${name}.jpg`,
  }));

  const PETS = PET_NAMES.map((name) => ({
    name,
    src: `icons/pets/${name}.jpg`,
  }));

  const page = document.getElementById('aePage');
  if (!page) return;

  const builderRoot = document.getElementById('aeCompBuilder');
  const finderRoot = document.getElementById('aeCompFinder');

  const tabs = Array.from(document.querySelectorAll('.ae-tab'));
  const panels = Array.from(document.querySelectorAll('.ae-panel'));

  const state = {
    slots: [null, null, null, null, null, null],
    submitting: false,
    finderLoaded: false,
    finderLoading: false,
    dragFromIndex: null,
  };

  const slotEls = builderRoot ? Array.from(builderRoot.querySelectorAll('.ae-slot')) : [];
  const heroGrid = builderRoot ? builderRoot.querySelector('#aeHeroGrid') : null;
  const petGrid = builderRoot ? builderRoot.querySelector('#aePetGrid') : null;
  const damageInput = builderRoot ? builderRoot.querySelector('#aeDamage') : null;
  const sendBtn = builderRoot ? builderRoot.querySelector('#aeSendBtn') : null;
  const builderMessageEl = builderRoot ? builderRoot.querySelector('#aeBuilderMessage') : null;

  const finderStatusEl = document.getElementById('aeFinderStatus');
  const finderBoxesEl = document.getElementById('aeFinderBoxes');
  const finderBestTotalEl = document.getElementById('aeFinderBestTotal');

  function fmtB(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${num.toFixed(1)}b`;
  }

  function setBuilderMessage(text, kind = '') {
    if (!builderMessageEl) return;
    builderMessageEl.textContent = text || '';
    builderMessageEl.classList.remove('is-error', 'is-success');
    if (kind) builderMessageEl.classList.add(kind);
  }

  function setFinderStatus(text) {
    if (finderStatusEl) finderStatusEl.textContent = text || '';
  }

  function clearValidation() {
    slotEls.forEach((el) => el.classList.remove('is-missing', 'is-drop-target'));
    if (damageInput?.parentElement) {
      damageInput.parentElement.classList.remove('is-missing');
    }
    setBuilderMessage('');
  }

  function makeIconButton(item, kind) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ae-icon-btn';
    btn.dataset.kind = kind;
    btn.dataset.name = item.name;
    btn.dataset.src = item.src;
    btn.title = item.name;
    btn.setAttribute('aria-label', `Add ${item.name}`);
    btn.innerHTML = `<img src="${item.src}" alt="${item.name}" loading="lazy" />`;
    return btn;
  }

  function populateIconGrids() {
    if (!heroGrid || !petGrid) return;

    const heroFrag = document.createDocumentFragment();
    HEROES.forEach((hero) => heroFrag.appendChild(makeIconButton(hero, 'hero')));
    heroGrid.replaceChildren(heroFrag);

    const petFrag = document.createDocumentFragment();
    PETS.forEach((pet) => petFrag.appendChild(makeIconButton(pet, 'pet')));
    petGrid.replaceChildren(petFrag);
  }

  function updateLibraryStates() {
    const usedHeroes = new Set(
      state.slots.slice(0, 5).filter(Boolean).map((item) => item.name)
    );
    const usedPet = state.slots[5]?.name || null;

    builderRoot?.querySelectorAll('.ae-icon-btn').forEach((btn) => {
      const kind = btn.dataset.kind;
      const name = btn.dataset.name;
      const isSelected = kind === 'pet' ? usedPet === name : usedHeroes.has(name);
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  function renderSlots() {
    slotEls.forEach((slotEl) => {
      const index = Number(slotEl.dataset.slotIndex);
      const item = state.slots[index];

      slotEl.classList.remove('has-item', 'is-drop-target');

      if (!item) {
        slotEl.innerHTML = `
          <div class="ae-slot-empty">
            <span class="ae-slot-empty-label">${index === 5 ? 'Pet' : `Hero ${index + 1}`}</span>
          </div>
        `;
        return;
      }

      slotEl.classList.add('has-item');
      slotEl.innerHTML = `
        <div class="ae-slot-content" draggable="true">
          <img src="${item.src}" alt="${item.name}" />
        </div>
      `;

      const dragNode = slotEl.querySelector('.ae-slot-content');
      dragNode.addEventListener('dragstart', onDragStart);
      dragNode.addEventListener('dragend', onDragEnd);
    });

    updateLibraryStates();
  }

  function firstEmptyHeroSlot() {
    for (let i = 0; i < 5; i += 1) {
      if (!state.slots[i]) return i;
    }
    return -1;
  }

  function addItem(kind, name, src) {
    if (!name || !src) return;

    if (kind === 'hero') {
      if (state.slots.slice(0, 5).some((item) => item?.name === name)) return;
      const emptyIndex = firstEmptyHeroSlot();
      if (emptyIndex === -1) return;
      state.slots[emptyIndex] = { kind, name, src };
    } else if (kind === 'pet') {
      state.slots[5] = { kind, name, src };
    } else {
      return;
    }

    renderSlots();
    clearValidation();
  }

  function removeItem(index) {
    if (index < 0 || index > 5) return;
    state.slots[index] = null;
    renderSlots();
    clearValidation();
  }

  function swapOrMoveSlots(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) return;

    const fromItem = state.slots[fromIndex];
    if (!fromItem) return;

    const fromType = fromIndex === 5 ? 'pet' : 'hero';
    const toType = toIndex === 5 ? 'pet' : 'hero';
    if (fromType !== toType) return;

    const toItem = state.slots[toIndex] || null;
    state.slots[toIndex] = fromItem;
    state.slots[fromIndex] = toItem;

    renderSlots();
    clearValidation();
  }

  function validateBuilder() {
    let ok = true;

    for (let i = 0; i < 6; i += 1) {
      const missing = !state.slots[i];
      slotEls[i]?.classList.toggle('is-missing', missing);
      if (missing) ok = false;
    }

    const rawDamage = damageInput?.value?.trim() || '';
    const damageMissing = rawDamage === '' || Number.isNaN(Number(rawDamage));
    damageInput?.parentElement?.classList.toggle('is-missing', damageMissing);
    if (damageMissing) ok = false;

    if (!ok) {
      setBuilderMessage('Please fill all 5 hero slots, the pet slot, and the damage value.', 'is-error');
    }

    return ok;
  }

  async function handleSubmit() {
    if (state.submitting || !validateBuilder()) return;

    const payload = {
      hero1: state.slots[0].name,
      hero2: state.slots[1].name,
      hero3: state.slots[2].name,
      hero4: state.slots[3].name,
      hero5: state.slots[4].name,
      pet: state.slots[5].name,
      damage: Number(damageInput.value),
    };

    state.submitting = true;
    sendBtn.disabled = true;
    setBuilderMessage('Saving...');

    try {
      const { error } = await supabaseClient
        .from('ae-comps')
        .insert([payload]);

      if (error) throw error;

      setBuilderMessage('Comp saved.', 'is-success');
    } catch (err) {
      console.error(err);
      setBuilderMessage(`Could not save comp: ${err.message || 'unknown error'}`, 'is-error');
    } finally {
      state.submitting = false;
      sendBtn.disabled = false;
    }
  }

  function onGridClick(event) {
    const btn = event.target.closest('.ae-icon-btn');
    if (!btn) return;
    addItem(btn.dataset.kind, btn.dataset.name, btn.dataset.src);
  }

  function onSlotClick(event) {
    const slotEl = event.currentTarget;
    const index = Number(slotEl.dataset.slotIndex);
    if (!state.slots[index]) return;
    removeItem(index);
  }

  function onDragStart(event) {
    const slotEl = event.target.closest('.ae-slot');
    if (!slotEl) return;

    state.dragFromIndex = Number(slotEl.dataset.slotIndex);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(state.dragFromIndex));
  }

  function onDragEnd() {
    state.dragFromIndex = null;
    slotEls.forEach((el) => el.classList.remove('is-drop-target'));
  }

  function onDragOver(event) {
    const slotEl = event.currentTarget;
    const toIndex = Number(slotEl.dataset.slotIndex);
    const fromIndex = state.dragFromIndex;
    if (fromIndex == null) return;

    const fromType = fromIndex === 5 ? 'pet' : 'hero';
    const toType = toIndex === 5 ? 'pet' : 'hero';
    if (fromType !== toType) return;

    event.preventDefault();
    slotEl.classList.add('is-drop-target');
  }

  function onDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target');
  }

  function onDrop(event) {
    event.preventDefault();

    const slotEl = event.currentTarget;
    const toIndex = Number(slotEl.dataset.slotIndex);
    const raw = event.dataTransfer.getData('text/plain');
    const fromIndex = raw === '' ? state.dragFromIndex : Number(raw);

    slotEl.classList.remove('is-drop-target');
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return;
    swapOrMoveSlots(fromIndex, toIndex);
  }

  async function fetchAllAeComps() {
    const rows = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await supabaseClient
        .from('ae-comps')
        .select('hero1, hero2, hero3, hero4, hero5, pet, damage')
        .range(from, to);

      if (error) throw error;
      if (!data || !data.length) break;

      rows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    return rows;
  }

  function aggregateRows(rows) {
    const map = new Map();

    rows.forEach((row) => {
      const heroes = [row.hero1, row.hero2, row.hero3, row.hero4, row.hero5]
        .map((v) => String(v || '').trim().toLowerCase());

      const pet = String(row.pet || '').trim().toLowerCase();
      const damage = Number(row.damage);

      if (heroes.some((v) => !v) || !pet || !Number.isFinite(damage)) return;

      const key = [...heroes, pet].join('|');
      let entry = map.get(key);
      if (!entry) {
        entry = {
          id: key,
          heroes,
          pet,
          sum: 0,
          count: 0,
        };
        map.set(key, entry);
      }

      entry.sum += damage;
      entry.count += 1;
    });

    return Array.from(map.values())
      .map((entry) => {
        const items = new Set([...entry.heroes, entry.pet]);
        return {
          id: entry.id,
          heroes: entry.heroes,
          pet: entry.pet,
          avg: entry.sum / entry.count,
          count: entry.count,
          items,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }

  function buildTopBoxes(comps, desiredCount = 24) {
    const candidates = comps.slice(0, Math.min(comps.length, 90));
    const n = candidates.length;
    const prefix = new Array(n + 1).fill(0);

    for (let i = 0; i < n; i += 1) {
      prefix[i + 1] = prefix[i] + candidates[i].avg;
    }

    function optimistic(index, need) {
      const end = Math.min(n, index + need);
      return prefix[end] - prefix[index];
    }

    const best = [];
    const seen = new Set();

    function pushBox(box) {
      const signature = box.comps.map((comp) => comp.id).sort().join('||');
      if (seen.has(signature)) return;
      seen.add(signature);
      best.push({ ...box, signature });
      best.sort((a, b) => b.total - a.total);
      if (best.length > desiredCount) {
        const removed = best.pop();
        if (removed) seen.delete(removed.signature);
      }
    }

    function threshold() {
      return best.length >= desiredCount ? best[best.length - 1].total : -Infinity;
    }

    function dfs(startIndex, chosen, usedHeroes, usedPets, total) {
      const need = 6 - chosen.length;

      if (need === 0) {
        pushBox({ comps: chosen.slice(), total });
        return;
      }

      if (startIndex >= n) return;
      if (n - startIndex < need) return;
      if (total + optimistic(startIndex, need) < threshold()) return;

      for (let i = startIndex; i <= n - need; i += 1) {
        const comp = candidates[i];
        const bound = total + comp.avg + optimistic(i + 1, need - 1);
        if (bound < threshold()) continue;

        let compatible = !usedPets.has(comp.pet);
        if (compatible) {
          for (let h = 0; h < comp.heroes.length; h += 1) {
            if (usedHeroes.has(comp.heroes[h])) {
              compatible = false;
              break;
            }
          }
        }

        if (!compatible) continue;

        comp.heroes.forEach((hero) => usedHeroes.add(hero));
        usedPets.add(comp.pet);
        chosen.push(comp);

        dfs(i + 1, chosen, usedHeroes, usedPets, total + comp.avg);

        chosen.pop();
        usedPets.delete(comp.pet);
        comp.heroes.forEach((hero) => usedHeroes.delete(hero));
      }
    }

    dfs(0, [], new Set(), new Set(), 0);
    return best.sort((a, b) => b.total - a.total);
  }

  function iconSrc(kind, name) {
    return kind === 'pet'
      ? `/icons/pets/${name}.jpg`
      : `/icons/heroes2/${name}.jpg`;
  }

  function renderFinderBoxes(boxes) {
    if (!finderBoxesEl) return;

    if (!boxes.length) {
      finderBoxesEl.innerHTML = '<p class="ae-empty-note">No valid 6-comp boxes could be built from the saved data yet.</p>';
      if (finderBestTotalEl) finderBestTotalEl.textContent = '—';
      return;
    }

    if (finderBestTotalEl) finderBestTotalEl.textContent = fmtB(boxes[0].total);

    finderBoxesEl.innerHTML = boxes.map((box, boxIndex) => {
      const compsHtml = box.comps.map((comp) => {
        const heroHtml = comp.heroes
          .map((hero) => `<img src="${iconSrc('hero', hero)}" alt="${hero}" title="${hero}" loading="lazy" />`)
          .join('');
        const petHtml = `<img src="${iconSrc('pet', comp.pet)}" alt="${comp.pet}" title="${comp.pet}" loading="lazy" />`;

        return `
          <div class="ae-box-comp">
            <div class="ae-box-comp-icons">
              ${heroHtml}
              ${petHtml}
            </div>
            <div class="ae-box-comp-damage">${fmtB(comp.avg)}</div>
          </div>
        `;
      }).join('');

      return `
        <article class="ae-box">
          <div class="ae-box-head">
            <h3 class="ae-box-title">Box ${boxIndex + 1}</h3>
            <div class="ae-box-total">${fmtB(box.total)}</div>
          </div>
          <div class="ae-box-grid">
            ${compsHtml}
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadFinder() {
    if (state.finderLoaded || state.finderLoading) return;
    state.finderLoading = true;
    setFinderStatus('Loading saved comps...');

    try {
      const rows = await fetchAllAeComps();
      const aggregates = aggregateRows(rows);

      if (!aggregates.length) {
        renderFinderBoxes([]);
        setFinderStatus('No saved comps found yet.');
        state.finderLoaded = true;
        return;
      }

      setFinderStatus(`Loaded ${aggregates.length} unique comps. Building best boxes...`);
      const boxes = buildTopBoxes(aggregates, 24);
      renderFinderBoxes(boxes);
      setFinderStatus(`Showing ${boxes.length} highest-total boxes from ${aggregates.length} unique averaged comps.`);
      state.finderLoaded = true;
    } catch (err) {
      console.error(err);
      if (finderBestTotalEl) finderBestTotalEl.textContent = '—';
      if (finderBoxesEl) finderBoxesEl.innerHTML = '';
      setFinderStatus(`Could not load comp finder: ${err.message || 'unknown error'}`);
    } finally {
      state.finderLoading = false;
    }
  }

  function initTabs() {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;

        tabs.forEach((btn) => {
          const active = btn === tab;
          btn.classList.toggle('is-active', active);
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        panels.forEach((panel) => {
          const active = panel.dataset.panel === target;
          panel.classList.toggle('is-active', active);
          panel.hidden = !active;
        });

        if (target === 'finder') {
          loadFinder();
        }
      });
    });
  }

  function initBuilder() {
    if (!builderRoot) return;

    populateIconGrids();
    renderSlots();

    heroGrid?.addEventListener('click', onGridClick);
    petGrid?.addEventListener('click', onGridClick);

    slotEls.forEach((slotEl) => {
      slotEl.addEventListener('click', onSlotClick);
      slotEl.addEventListener('dragover', onDragOver);
      slotEl.addEventListener('dragleave', onDragLeave);
      slotEl.addEventListener('drop', onDrop);
    });

    damageInput?.addEventListener('input', () => {
      damageInput.parentElement?.classList.remove('is-missing');
      setBuilderMessage('');
    });

    sendBtn?.addEventListener('click', handleSubmit);
  }

  function init() {
    initTabs();
    initBuilder();
  }

  init();
})();
