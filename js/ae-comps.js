(function () {
  const root = document.getElementById('aeCompBuilder');
  if (!root) return;

  const HEROES = [{"name":"aantandra","src":"/icons/heroes2/aantandra.jpg"},{"name":"aathalia","src":"/icons/heroes2/aathalia.jpg"},{"name":"abaden","src":"/icons/heroes2/abaden.jpg"},{"name":"abelinda","src":"/icons/heroes2/abelinda.jpg"},{"name":"abrutus","src":"/icons/heroes2/abrutus.jpg"},{"name":"adrian","src":"/icons/heroes2/adrian.jpg"},{"name":"aeironn","src":"/icons/heroes2/aeironn.jpg"},{"name":"aestrilda","src":"/icons/heroes2/aestrilda.jpg"},{"name":"aezizh","src":"/icons/heroes2/aezizh.jpg"},{"name":"afawkes","src":"/icons/heroes2/afawkes.jpg"},{"name":"ainz","src":"/icons/heroes2/ainz.jpg"},{"name":"alaro","src":"/icons/heroes2/alaro.jpg"},{"name":"albedo","src":"/icons/heroes2/albedo.jpg"},{"name":"alna","src":"/icons/heroes2/alna.jpg"},{"name":"alucius","src":"/icons/heroes2/alucius.jpg"},{"name":"alvida","src":"/icons/heroes2/alvida.jpg"},{"name":"alyca","src":"/icons/heroes2/alyca.jpg"},{"name":"anasta","src":"/icons/heroes2/anasta.jpg"},{"name":"angelo","src":"/icons/heroes2/angelo.jpg"},{"name":"ankhira","src":"/icons/heroes2/ankhira.jpg"},{"name":"anoki","src":"/icons/heroes2/anoki.jpg"},{"name":"antandra","src":"/icons/heroes2/antandra.jpg"},{"name":"apippa","src":"/icons/heroes2/apippa.jpg"},{"name":"arden","src":"/icons/heroes2/arden.jpg"},{"name":"arkadios","src":"/icons/heroes2/arkadios.jpg"},{"name":"arthur","src":"/icons/heroes2/arthur.jpg"},{"name":"asafiya","src":"/icons/heroes2/asafiya.jpg"},{"name":"ashemira","src":"/icons/heroes2/ashemira.jpg"},{"name":"askriath","src":"/icons/heroes2/askriath.jpg"},{"name":"asolise","src":"/icons/heroes2/asolise.jpg"},{"name":"astar","src":"/icons/heroes2/astar.jpg"},{"name":"atalene","src":"/icons/heroes2/atalene.jpg"},{"name":"athalia","src":"/icons/heroes2/athalia.jpg"},{"name":"athane","src":"/icons/heroes2/athane.jpg"},{"name":"atheus","src":"/icons/heroes2/atheus.jpg"},{"name":"athoran","src":"/icons/heroes2/athoran.jpg"},{"name":"audrae","src":"/icons/heroes2/audrae.jpg"},{"name":"aurelia","src":"/icons/heroes2/aurelia.jpg"},{"name":"baden","src":"/icons/heroes2/baden.jpg"},{"name":"begris","src":"/icons/heroes2/begris.jpg"},{"name":"belinda","src":"/icons/heroes2/belinda.jpg"},{"name":"bloodsnarl","src":"/icons/heroes2/bloodsnarl.jpg"},{"name":"bronn","src":"/icons/heroes2/bronn.jpg"},{"name":"brutus","src":"/icons/heroes2/brutus.jpg"},{"name":"cassius","src":"/icons/heroes2/cassius.jpg"},{"name":"cecilia","src":"/icons/heroes2/cecilia.jpg"},{"name":"cha","src":"/icons/heroes2/cha.jpg"},{"name":"cr","src":"/icons/heroes2/cr.jpg"},{"name":"crassio","src":"/icons/heroes2/crassio.jpg"},{"name":"daemia","src":"/icons/heroes2/daemia.jpg"},{"name":"daimon","src":"/icons/heroes2/daimon.jpg"},{"name":"desira","src":"/icons/heroes2/desira.jpg"},{"name":"dgwyneth","src":"/icons/heroes2/dgwyneth.jpg"},{"name":"dreaf","src":"/icons/heroes2/dreaf.jpg"},{"name":"drez","src":"/icons/heroes2/drez.jpg"},{"name":"edwin","src":"/icons/heroes2/edwin.jpg"},{"name":"eironn","src":"/icons/heroes2/eironn.jpg"},{"name":"eletha","src":"/icons/heroes2/eletha.jpg"},{"name":"elthara","src":"/icons/heroes2/elthara.jpg"},{"name":"eluard","src":"/icons/heroes2/eluard.jpg"},{"name":"emilia","src":"/icons/heroes2/emilia.jpg"},{"name":"envydiel","src":"/icons/heroes2/envydiel.jpg"},{"name":"eorin","src":"/icons/heroes2/eorin.jpg"},{"name":"estrilda","src":"/icons/heroes2/estrilda.jpg"},{"name":"eugene","src":"/icons/heroes2/eugene.jpg"},{"name":"ezio","src":"/icons/heroes2/ezio.jpg"},{"name":"ezizh","src":"/icons/heroes2/ezizh.jpg"},{"name":"fane","src":"/icons/heroes2/fane.jpg"},{"name":"fawkes","src":"/icons/heroes2/fawkes.jpg"},{"name":"ferael","src":"/icons/heroes2/ferael.jpg"},{"name":"flora","src":"/icons/heroes2/flora.jpg"},{"name":"framton","src":"/icons/heroes2/framton.jpg"},{"name":"gavus","src":"/icons/heroes2/gavus.jpg"},{"name":"geralt","src":"/icons/heroes2/geralt.jpg"},{"name":"ginneas","src":"/icons/heroes2/ginneas.jpg"},{"name":"golus","src":"/icons/heroes2/golus.jpg"},{"name":"gorok","src":"/icons/heroes2/gorok.jpg"},{"name":"gorren","src":"/icons/heroes2/gorren.jpg"},{"name":"gorvo","src":"/icons/heroes2/gorvo.jpg"},{"name":"gourgue","src":"/icons/heroes2/gourgue.jpg"},{"name":"granit","src":"/icons/heroes2/granit.jpg"},{"name":"grezhul","src":"/icons/heroes2/grezhul.jpg"},{"name":"gwyneth","src":"/icons/heroes2/gwyneth.jpg"},{"name":"haelia","src":"/icons/heroes2/haelia.jpg"},{"name":"haelus","src":"/icons/heroes2/haelus.jpg"},{"name":"hendrik","src":"/icons/heroes2/hendrik.jpg"},{"name":"hildwin","src":"/icons/heroes2/hildwin.jpg"},{"name":"hodgkin","src":"/icons/heroes2/hodgkin.jpg"},{"name":"hogan","src":"/icons/heroes2/hogan.jpg"},{"name":"icariel","src":"/icons/heroes2/icariel.jpg"},{"name":"ira","src":"/icons/heroes2/ira.jpg"},{"name":"isabella","src":"/icons/heroes2/isabella.jpg"},{"name":"ivan","src":"/icons/heroes2/ivan.jpg"},{"name":"izold","src":"/icons/heroes2/izold.jpg"},{"name":"jerome","src":"/icons/heroes2/jerome.jpg"},{"name":"joan","src":"/icons/heroes2/joan.jpg"},{"name":"joker","src":"/icons/heroes2/joker.jpg"},{"name":"kaelon","src":"/icons/heroes2/kaelon.jpg"},{"name":"kalene","src":"/icons/heroes2/kalene.jpg"},{"name":"kalthin","src":"/icons/heroes2/kalthin.jpg"},{"name":"kaz","src":"/icons/heroes2/kaz.jpg"},{"name":"kelthur","src":"/icons/heroes2/kelthur.jpg"},{"name":"khasos","src":"/icons/heroes2/khasos.jpg"},{"name":"khazard","src":"/icons/heroes2/khazard.jpg"},{"name":"knox","src":"/icons/heroes2/knox.jpg"},{"name":"kregor","src":"/icons/heroes2/kregor.jpg"},{"name":"kren","src":"/icons/heroes2/kren.jpg"},{"name":"laios","src":"/icons/heroes2/laios.jpg"},{"name":"lan","src":"/icons/heroes2/lan.jpg"},{"name":"lavatune","src":"/icons/heroes2/lavatune.jpg"},{"name":"leofric","src":"/icons/heroes2/leofric.jpg"},{"name":"leonardo","src":"/icons/heroes2/leonardo.jpg"},{"name":"lethos","src":"/icons/heroes2/lethos.jpg"},{"name":"leviathan","src":"/icons/heroes2/leviathan.jpg"},{"name":"liberta","src":"/icons/heroes2/liberta.jpg"},{"name":"lorsan","src":"/icons/heroes2/lorsan.jpg"},{"name":"lucilla","src":"/icons/heroes2/lucilla.jpg"},{"name":"lucius","src":"/icons/heroes2/lucius.jpg"},{"name":"lucretia","src":"/icons/heroes2/lucretia.jpg"},{"name":"lyca","src":"/icons/heroes2/lyca.jpg"},{"name":"lysander","src":"/icons/heroes2/lysander.jpg"},{"name":"maetria","src":"/icons/heroes2/maetria.jpg"},{"name":"malkrie","src":"/icons/heroes2/malkrie.jpg"},{"name":"marcille","src":"/icons/heroes2/marcille.jpg"},{"name":"mehira","src":"/icons/heroes2/mehira.jpg"},{"name":"melion","src":"/icons/heroes2/melion.jpg"},{"name":"melusina","src":"/icons/heroes2/melusina.jpg"},{"name":"merek","src":"/icons/heroes2/merek.jpg"},{"name":"merlin","src":"/icons/heroes2/merlin.jpg"},{"name":"mezoth","src":"/icons/heroes2/mezoth.jpg"},{"name":"mira","src":"/icons/heroes2/mira.jpg"},{"name":"mirael","src":"/icons/heroes2/mirael.jpg"},{"name":"misha","src":"/icons/heroes2/misha.jpg"},{"name":"mishka","src":"/icons/heroes2/mishka.jpg"},{"name":"morael","src":"/icons/heroes2/morael.jpg"},{"name":"morrow","src":"/icons/heroes2/morrow.jpg"},{"name":"mortas","src":"/icons/heroes2/mortas.jpg"},{"name":"morvus","src":"/icons/heroes2/morvus.jpg"},{"name":"mulan","src":"/icons/heroes2/mulan.jpg"},{"name":"nakoruru","src":"/icons/heroes2/nakoruru.jpg"},{"name":"nara","src":"/icons/heroes2/nara.jpg"},{"name":"naroko","src":"/icons/heroes2/naroko.jpg"},{"name":"nemora","src":"/icons/heroes2/nemora.jpg"},{"name":"nevanthi","src":"/icons/heroes2/nevanthi.jpg"},{"name":"niru","src":"/icons/heroes2/niru.jpg"},{"name":"numisu","src":"/icons/heroes2/numisu.jpg"},{"name":"nyla","src":"/icons/heroes2/nyla.jpg"},{"name":"oden","src":"/icons/heroes2/oden.jpg"},{"name":"ogi","src":"/icons/heroes2/ogi.jpg"},{"name":"oku","src":"/icons/heroes2/oku.jpg"},{"name":"olgath","src":"/icons/heroes2/olgath.jpg"},{"name":"orthros","src":"/icons/heroes2/orthros.jpg"},{"name":"oscar","src":"/icons/heroes2/oscar.jpg"},{"name":"palmer","src":"/icons/heroes2/palmer.jpg"},{"name":"peggy","src":"/icons/heroes2/peggy.jpg"},{"name":"pippa","src":"/icons/heroes2/pippa.jpg"},{"name":"prince","src":"/icons/heroes2/prince.jpg"},{"name":"pulina","src":"/icons/heroes2/pulina.jpg"},{"name":"queen","src":"/icons/heroes2/queen.jpg"},{"name":"raine","src":"/icons/heroes2/raine.jpg"},{"name":"raku","src":"/icons/heroes2/raku.jpg"},{"name":"randle","src":"/icons/heroes2/randle.jpg"},{"name":"raoul","src":"/icons/heroes2/raoul.jpg"},{"name":"rem","src":"/icons/heroes2/rem.jpg"},{"name":"respen","src":"/icons/heroes2/respen.jpg"},{"name":"rigby","src":"/icons/heroes2/rigby.jpg"},{"name":"rimuru","src":"/icons/heroes2/rimuru.jpg"},{"name":"robin","src":"/icons/heroes2/robin.jpg"},{"name":"rosaline","src":"/icons/heroes2/rosaline.jpg"},{"name":"rowan","src":"/icons/heroes2/rowan.jpg"},{"name":"safiya","src":"/icons/heroes2/safiya.jpg"},{"name":"saitama","src":"/icons/heroes2/saitama.jpg"},{"name":"salaki","src":"/icons/heroes2/salaki.jpg"},{"name":"satrana","src":"/icons/heroes2/satrana.jpg"},{"name":"saurus","src":"/icons/heroes2/saurus.jpg"},{"name":"saveas","src":"/icons/heroes2/saveas.jpg"},{"name":"scarlet","src":"/icons/heroes2/scarlet.jpg"},{"name":"seirus","src":"/icons/heroes2/seirus.jpg"},{"name":"selene","src":"/icons/heroes2/selene.jpg"},{"name":"serenmira","src":"/icons/heroes2/serenmira.jpg"},{"name":"sezis","src":"/icons/heroes2/sezis.jpg"},{"name":"shaltear","src":"/icons/heroes2/shaltear.jpg"},{"name":"shemira","src":"/icons/heroes2/shemira.jpg"},{"name":"shuna","src":"/icons/heroes2/shuna.jpg"},{"name":"silas","src":"/icons/heroes2/silas.jpg"},{"name":"silvina","src":"/icons/heroes2/silvina.jpg"},{"name":"simona","src":"/icons/heroes2/simona.jpg"},{"name":"sion","src":"/icons/heroes2/sion.jpg"},{"name":"sjw","src":"/icons/heroes2/sjw.jpg"},{"name":"skreg","src":"/icons/heroes2/skreg.jpg"},{"name":"skriath","src":"/icons/heroes2/skriath.jpg"},{"name":"skylan","src":"/icons/heroes2/skylan.jpg"},{"name":"solise","src":"/icons/heroes2/solise.jpg"},{"name":"sonja","src":"/icons/heroes2/sonja.jpg"},{"name":"steixius","src":"/icons/heroes2/steixius.jpg"},{"name":"talene","src":"/icons/heroes2/talene.jpg"},{"name":"talimar","src":"/icons/heroes2/talimar.jpg"},{"name":"tamrus","src":"/icons/heroes2/tamrus.jpg"},{"name":"tarnos","src":"/icons/heroes2/tarnos.jpg"},{"name":"tasi","src":"/icons/heroes2/tasi.jpg"},{"name":"tavriel","src":"/icons/heroes2/tavriel.jpg"},{"name":"thali","src":"/icons/heroes2/thali.jpg"},{"name":"thane","src":"/icons/heroes2/thane.jpg"},{"name":"theowyn","src":"/icons/heroes2/theowyn.jpg"},{"name":"thesku","src":"/icons/heroes2/thesku.jpg"},{"name":"thoran","src":"/icons/heroes2/thoran.jpg"},{"name":"tidus","src":"/icons/heroes2/tidus.jpg"},{"name":"titus","src":"/icons/heroes2/titus.jpg"},{"name":"torne","src":"/icons/heroes2/torne.jpg"},{"name":"treznor","src":"/icons/heroes2/treznor.jpg"},{"name":"trishea","src":"/icons/heroes2/trishea.jpg"},{"name":"tsumiki","src":"/icons/heroes2/tsumiki.jpg"},{"name":"twins","src":"/icons/heroes2/twins.jpg"},{"name":"ukyo","src":"/icons/heroes2/ukyo.jpg"},{"name":"ulmus","src":"/icons/heroes2/ulmus.jpg"},{"name":"ulric","src":"/icons/heroes2/ulric.jpg"},{"name":"umbriel","src":"/icons/heroes2/umbriel.jpg"},{"name":"vedan","src":"/icons/heroes2/vedan.jpg"},{"name":"veithael","src":"/icons/heroes2/veithael.jpg"},{"name":"velufira","src":"/icons/heroes2/velufira.jpg"},{"name":"vika","src":"/icons/heroes2/vika.jpg"},{"name":"villanelle","src":"/icons/heroes2/villanelle.jpg"},{"name":"vurk","src":"/icons/heroes2/vurk.jpg"},{"name":"vyloris","src":"/icons/heroes2/vyloris.jpg"},{"name":"walker","src":"/icons/heroes2/walker.jpg"},{"name":"warek","src":"/icons/heroes2/warek.jpg"},{"name":"wukong","src":"/icons/heroes2/wukong.jpg"},{"name":"yennefer","src":"/icons/heroes2/yennefer.jpg"},{"name":"zaphrael","src":"/icons/heroes2/zaphrael.jpg"},{"name":"zikis","src":"/icons/heroes2/zikis.jpg"},{"name":"zohra","src":"/icons/heroes2/zohra.jpg"},{"name":"zolrath","src":"/icons/heroes2/zolrath.jpg"}];
  const PETS = [{"name":"bellbellow","src":"/icons/pets/bellbellow.jpg"},{"name":"bellbellow_1","src":"/icons/pets/bellbellow_1.jpg"},{"name":"chest","src":"/icons/pets/chest.jpg"},{"name":"chest_1","src":"/icons/pets/chest_1.jpg"},{"name":"dragon","src":"/icons/pets/dragon.jpg"},{"name":"dragon_1","src":"/icons/pets/dragon_1.jpg"},{"name":"dreary","src":"/icons/pets/dreary.jpg"},{"name":"feline","src":"/icons/pets/feline.jpg"},{"name":"feline_1","src":"/icons/pets/feline_1.jpg"},{"name":"fire","src":"/icons/pets/fire.jpg"},{"name":"fire_1","src":"/icons/pets/fire_1.jpg"},{"name":"fox","src":"/icons/pets/fox.jpg"},{"name":"fox_1","src":"/icons/pets/fox_1.jpg"},{"name":"ghost","src":"/icons/pets/ghost.jpg"},{"name":"ghost_1","src":"/icons/pets/ghost_1.jpg"},{"name":"grassy","src":"/icons/pets/grassy.jpg"},{"name":"ibis","src":"/icons/pets/ibis.jpg"},{"name":"ibis_1","src":"/icons/pets/ibis_1.jpg"},{"name":"ice","src":"/icons/pets/ice.jpg"},{"name":"ice_1","src":"/icons/pets/ice_1.jpg"},{"name":"lion","src":"/icons/pets/lion.jpg"},{"name":"lion_1","src":"/icons/pets/lion_1.jpg"},{"name":"owl","src":"/icons/pets/owl.jpg"},{"name":"owl_1","src":"/icons/pets/owl_1.jpg"},{"name":"panda","src":"/icons/pets/panda.jpg"},{"name":"panda_1","src":"/icons/pets/panda_1.jpg"},{"name":"pegasus","src":"/icons/pets/pegasus.jpg"},{"name":"pegasus_1","src":"/icons/pets/pegasus_1.jpg"},{"name":"phanta","src":"/icons/pets/phanta.jpg"},{"name":"phanta_1","src":"/icons/pets/phanta_1.jpg"},{"name":"polar","src":"/icons/pets/polar.jpg"},{"name":"polar_1","src":"/icons/pets/polar_1.jpg"},{"name":"rabbit","src":"/icons/pets/rabbit.jpg"},{"name":"radish","src":"/icons/pets/radish.jpg"},{"name":"radish_1","src":"/icons/pets/radish_1.jpg"},{"name":"ridge","src":"/icons/pets/ridge.jpg"},{"name":"ridge_1","src":"/icons/pets/ridge_1.jpg"},{"name":"roamer","src":"/icons/pets/roamer.jpg"},{"name":"roamer_1","src":"/icons/pets/roamer_1.jpg"},{"name":"rock","src":"/icons/pets/rock.jpg"},{"name":"rock_1","src":"/icons/pets/rock_1.jpg"},{"name":"savage","src":"/icons/pets/savage.jpg"},{"name":"savage_1","src":"/icons/pets/savage_1.jpg"},{"name":"seal","src":"/icons/pets/seal.jpg"},{"name":"seal_1","src":"/icons/pets/seal_1.jpg"},{"name":"spooder","src":"/icons/pets/spooder.jpg"},{"name":"spooder_1","src":"/icons/pets/spooder_1.jpg"},{"name":"talismane","src":"/icons/pets/talismane.jpg"},{"name":"talismane_1","src":"/icons/pets/talismane_1.jpg"},{"name":"thistlekin","src":"/icons/pets/thistlekin.jpg"},{"name":"thistlekin_1","src":"/icons/pets/thistlekin_1.jpg"},{"name":"tufty","src":"/icons/pets/tufty.jpg"}];

  const state = {
    slots: [null, null, null, null, null, null],
    submitting: false,
  };

  const slotEls = Array.from(root.querySelectorAll('.ae-slot'));
  const heroGrid = root.querySelector('#aeHeroGrid');
  const petGrid = root.querySelector('#aePetGrid');
  const heroCountEl = document.getElementById('aeHeroCount');
  const petCountEl = document.getElementById('aePetCount');
  const damageInput = root.querySelector('#aeDamage');
  const sendBtn = root.querySelector('#aeSendBtn');
  const messageEl = root.querySelector('#aeBuilderMessage');
  const tabs = Array.from(document.querySelectorAll('.ae-tab'));
  const panels = Array.from(document.querySelectorAll('.ae-tab-panel'));

  function setMessage(text, kind) {
    messageEl.textContent = text || '';
    messageEl.classList.remove('is-error', 'is-success');
    if (kind) messageEl.classList.add(kind);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function compareByName(a, b) {
    return a.name.localeCompare(b.name, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  }

  function buildIconButton(item, kind) {
    return `
      <button
        type="button"
        class="ae-icon-btn"
        data-kind="${kind}"
        data-name="${escapeHtml(item.name)}"
        data-src="${escapeHtml(item.src)}"
        aria-label="Add ${escapeHtml(item.name)}"
        title="${escapeHtml(item.name)}"
      >
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <span>${escapeHtml(item.name)}</span>
      </button>
    `;
  }

  function renderLibraries() {
    heroGrid.innerHTML = HEROES.slice().sort(compareByName).map((item) => buildIconButton(item, 'hero')).join('');
    petGrid.innerHTML = PETS.slice().sort(compareByName).map((item) => buildIconButton(item, 'pet')).join('');
    heroCountEl.textContent = String(HEROES.length);
    petCountEl.textContent = String(PETS.length);
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
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name)}" />
        <span class="ae-slot-name">${escapeHtml(item.name)}</span>
      </div>
    `;
  }

  function renderSlots() {
    slotEls.forEach((slotEl) => {
      const index = Number(slotEl.dataset.slotIndex);
      const item = state.slots[index];
      slotEl.classList.remove('has-item', 'is-drop-target', 'is-missing');

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

    if (!fromItem || fromType !== toType) return;

    state.slots[fromIndex] = toItem || null;
    state.slots[toIndex] = fromItem;
    renderSlots();
  }

  function clearValidation() {
    slotEls.forEach((el) => el.classList.remove('is-missing'));
    damageInput.parentElement.classList.remove('is-missing');
    if (messageEl.classList.contains('is-error')) setMessage('');
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

  async function handleSubmit() {
    if (state.submitting) return;
    if (!validate()) return;
    if (typeof supabaseClient === 'undefined') {
      setMessage('Supabase client is not available.', 'is-error');
      return;
    }

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
    setMessage('Saving...');

    try {
      const { error } = await supabaseClient
        .from('ae-comps')
        .insert([payload]);

      if (error) throw error;
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

  renderLibraries();
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

  renderSlots();
  initTabs();
})();
