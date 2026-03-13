(function () {
  const root = document.getElementById('aeCompBuilder');
  if (!root) return;

  const state = {
    slots: [null, null, null, null, null, null],
    submitting: false,
  };

  const slotEls = Array.from(root.querySelectorAll('.ae-slot'));
  const heroGrid = root.querySelector('#aeHeroGrid');
  const petGrid = root.querySelector('#aePetGrid');
  const damageInput = root.querySelector('#aeDamage');
  const sendBtn = root.querySelector('#aeSendBtn');
  const messageEl = root.querySelector('#aeBuilderMessage');
  const submitUrl = root.dataset.submitUrl || '/api/ae-comps';
  const tabs = Array.from(document.querySelectorAll('.ae-tab'));
  const panels = Array.from(document.querySelectorAll('.ae-tab-panel'));

  function setMessage(text, kind) {
    messageEl.textContent = text || '';
    messageEl.classList.remove('is-error', 'is-success');
    if (kind) messageEl.classList.add(kind);
  }

  function normalizeName(name) {
    return (name || '').trim();
  }

  function compareByName(a, b) {
    return normalizeName(a.dataset.name).localeCompare(normalizeName(b.dataset.name), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  }

  function sortIconGrid(grid) {
    const buttons = Array.from(grid.querySelectorAll('.ae-icon-btn')).sort(compareByName);
    buttons.forEach((btn) => grid.appendChild(btn));
  }

  function getIconButton(kind, name) {
    const grid = kind === 'pet' ? petGrid : heroGrid;
    return grid.querySelector(`.ae-icon-btn[data-kind="${kind}"][data-name="${CSS.escape(name)}"]`);
  }

  function updateLibraryStates() {
    const usedHeroes = new Set(state.slots.slice(0, 5).filter(Boolean).map((item) => item.name));
    const usedPet = state.slots[5]?.name || null;

    root.querySelectorAll('.ae-icon-btn').forEach((btn) => {
      const kind = btn.dataset.kind;
      const isSelected = kind === 'pet'
        ? usedPet === btn.dataset.name
        : usedHeroes.has(btn.dataset.name);
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  function createSlotMarkup(item) {
    return `
      <div class="ae-slot-content" draggable="true">
        <img src="${item.src}" alt="${item.name}" />
        <span class="ae-slot-name">${item.name}</span>
      </div>
    `;
  }

  function renderSlots() {
    slotEls.forEach((slotEl) => {
      const index = Number(slotEl.dataset.slotIndex);
      const item = state.slots[index];
      slotEl.classList.remove('has-item');
      slotEl.classList.remove('is-drop-target');
      slotEl.classList.remove('is-missing');

      if (!item) {
        slotEl.innerHTML = `<span class="ae-slot-label">${index === 5 ? 'Pet' : `Hero ${index + 1}`}</span>`;
        return;
      }

      slotEl.classList.add('has-item');
      slotEl.innerHTML = createSlotMarkup(item);

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
    if (kind === 'hero') {
      const existing = state.slots.slice(0, 5).find((item) => item?.name === name);
      if (existing) return;
      const emptySlot = firstEmptyHeroSlot();
      if (emptySlot === -1) return;
      state.slots[emptySlot] = { kind, name, src };
    } else {
      state.slots[5] = { kind, name, src };
    }

    renderSlots();
    clearValidation();
  }

  function removeItem(index) {
    state.slots[index] = null;
    renderSlots();
    clearValidation();
  }

  function swapOrMoveSlots(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const fromItem = state.slots[fromIndex];
    const toItem = state.slots[toIndex];
    const fromType = fromIndex === 5 ? 'pet' : 'hero';
    const toType = toIndex === 5 ? 'pet' : 'hero';

    if (!fromItem) return;
    if (fromType !== toType) return;
    state.slots[fromIndex] = toItem || null;
    state.slots[toIndex] = fromItem;
    renderSlots();
  }

  function clearValidation() {
    slotEls.forEach((el) => el.classList.remove('is-missing'));
    damageInput.parentElement.classList.remove('is-missing');
    setMessage('');
  }

  function validate() {
    let ok = true;

    for (let i = 0; i < state.slots.length; i += 1) {
      const missing = !state.slots[i];
      slotEls[i].classList.toggle('is-missing', missing);
      if (missing) ok = false;
    }

    const damageValue = damageInput.value.trim();
    const damageMissing = damageValue === '' || Number.isNaN(Number(damageValue));
    damageInput.parentElement.classList.toggle('is-missing', damageMissing);
    if (damageMissing) ok = false;

    if (!ok) {
      setMessage('Please fill all 5 hero slots, the pet slot, and the damage value.', 'is-error');
    }

    return ok;
  }

  async function submitViaSupabase(payload) {
    if (!window.supabase) return { handled: false };

    const { error } = await window.supabase
      .from('ae-comps')
      .insert([payload]);

    if (error) throw error;
    return { handled: true };
  }

  async function submitViaApi(payload) {
    const res = await fetch(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        detail = data.error || data.message || detail;
      } catch (_) {
        // ignore
      }
      throw new Error(detail);
    }
  }

  async function handleSubmit() {
    if (state.submitting) return;
    if (!validate()) return;

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
    setMessage('Saving...', '');

    try {
      const supabaseResult = await submitViaSupabase(payload);
      if (!supabaseResult.handled) {
        await submitViaApi(payload);
      }

      setMessage('Comp saved.', 'is-success');
    } catch (err) {
      console.error(err);
      setMessage(`Could not save comp: ${err.message || 'unknown error'}`, 'is-error');
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
    event.dataTransfer.setData('text/plain', slotEl.dataset.slotIndex);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onDragEnd() {
    slotEls.forEach((slot) => slot.classList.remove('is-drop-target'));
  }

  function onDragOver(event) {
    event.preventDefault();
    const slotEl = event.currentTarget;
    slotEl.classList.add('is-drop-target');
    event.dataTransfer.dropEffect = 'move';
  }

  function onDragLeave(event) {
    event.currentTarget.classList.remove('is-drop-target');
  }

  function onDrop(event) {
    event.preventDefault();
    const toIndex = Number(event.currentTarget.dataset.slotIndex);
    const fromIndex = Number(event.dataTransfer.getData('text/plain'));
    event.currentTarget.classList.remove('is-drop-target');
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return;
    swapOrMoveSlots(fromIndex, toIndex);
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
      });
    });
  }

  heroGrid.addEventListener('click', onGridClick);
  petGrid.addEventListener('click', onGridClick);
  slotEls.forEach((slotEl) => {
    slotEl.addEventListener('click', onSlotClick);
    slotEl.addEventListener('dragover', onDragOver);
    slotEl.addEventListener('dragleave', onDragLeave);
    slotEl.addEventListener('drop', onDrop);
  });
  sendBtn.addEventListener('click', handleSubmit);
  damageInput.addEventListener('input', () => {
    damageInput.parentElement.classList.remove('is-missing');
    if (messageEl.classList.contains('is-error')) setMessage('');
  });

  sortIconGrid(heroGrid);
  sortIconGrid(petGrid);
  renderSlots();
  initTabs();
})();
