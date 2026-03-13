
(function () {
  const HERO_FILES = ["aantandra.jpg", "aathalia.jpg", "abaden.jpg", "abelinda.jpg", "abrutus.jpg", "adrian.jpg", "aeironn.jpg", "aestrilda.jpg", "aezizh.jpg", "afawkes.jpg", "ainz.jpg", "alaro.jpg", "albedo.jpg", "alna.jpg", "alucius.jpg", "alvida.jpg", "alyca.jpg", "anasta.jpg", "angelo.jpg", "ankhira.jpg", "anoki.jpg", "antandra.jpg", "apippa.jpg", "arden.jpg", "arkadios.jpg", "arthur.jpg", "asafiya.jpg", "ashemira.jpg", "askriath.jpg", "asolise.jpg", "astar.jpg", "atalene.jpg", "athalia.jpg", "athane.jpg", "atheus.jpg", "athoran.jpg", "audrae.jpg", "aurelia.jpg", "baden.jpg", "begris.jpg", "belinda.jpg", "bloodsnarl.jpg", "bronn.jpg", "brutus.jpg", "cassius.jpg", "cecilia.jpg", "cha.jpg", "cr.jpg", "crassio.jpg", "daemia.jpg", "daimon.jpg", "desira.jpg", "dgwyneth.jpg", "dreaf.jpg", "drez.jpg", "edwin.jpg", "eironn.jpg", "eletha.jpg", "elthara.jpg", "eluard.jpg", "emilia.jpg", "envydiel.jpg", "eorin.jpg", "estrilda.jpg", "eugene.jpg", "ezio.jpg", "ezizh.jpg", "fane.jpg", "fawkes.jpg", "ferael.jpg", "flora.jpg", "framton.jpg", "gavus.jpg", "geralt.jpg", "ginneas.jpg", "golus.jpg", "gorok.jpg", "gorren.jpg", "gorvo.jpg", "gourgue.jpg", "granit.jpg", "grezhul.jpg", "gwyneth.jpg", "haelia.jpg", "haelus.jpg", "hendrik.jpg", "hildwin.jpg", "hodgkin.jpg", "hogan.jpg", "icariel.jpg", "ira.jpg", "isabella.jpg", "ivan.jpg", "izold.jpg", "jerome.jpg", "joan.jpg", "joker.jpg", "kaelon.jpg", "kalene.jpg", "kalthin.jpg", "kaz.jpg", "kelthur.jpg", "khasos.jpg", "khazard.jpg", "knox.jpg", "kregor.jpg", "kren.jpg", "laios.jpg", "lan.jpg", "lavatune.jpg", "leofric.jpg", "leonardo.jpg", "lethos.jpg", "leviathan.jpg", "liberta.jpg", "lorsan.jpg", "lucilla.jpg", "lucius.jpg", "lucretia.jpg", "lyca.jpg", "lysander.jpg", "maetria.jpg", "malkrie.jpg", "marcille.jpg", "mehira.jpg", "melion.jpg", "melusina.jpg", "merek.jpg", "merlin.jpg", "mezoth.jpg", "mira.jpg", "mirael.jpg", "misha.jpg", "mishka.jpg", "morael.jpg", "morrow.jpg", "mortas.jpg", "morvus.jpg", "mulan.jpg", "nakoruru.jpg", "nara.jpg", "naroko.jpg", "nemora.jpg", "nevanthi.jpg", "niru.jpg", "numisu.jpg", "nyla.jpg", "oden.jpg", "ogi.jpg", "oku.jpg", "olgath.jpg", "orthros.jpg", "oscar.jpg", "palmer.jpg", "peggy.jpg", "pippa.jpg", "prince.jpg", "pulina.jpg", "queen.jpg", "raine.jpg", "raku.jpg", "randle.jpg", "raoul.jpg", "rem.jpg", "respen.jpg", "rigby.jpg", "rimuru.jpg", "robin.jpg", "rosaline.jpg", "rowan.jpg", "safiya.jpg", "saitama.jpg", "salaki.jpg", "satrana.jpg", "saurus.jpg", "saveas.jpg", "scarlet.jpg", "seirus.jpg", "selene.jpg", "serenmira.jpg", "sezis.jpg", "shaltear.jpg", "shemira.jpg", "shuna.jpg", "silas.jpg", "silvina.jpg", "simona.jpg", "sion.jpg", "sjw.jpg", "skreg.jpg", "skriath.jpg", "skylan.jpg", "solise.jpg", "sonja.jpg", "steixius.jpg", "talene.jpg", "talimar.jpg", "tamrus.jpg", "tarnos.jpg", "tasi.jpg", "tavriel.jpg", "thali.jpg", "thane.jpg", "theowyn.jpg", "thesku.jpg", "thoran.jpg", "tidus.jpg", "titus.jpg", "torne.jpg", "treznor.jpg", "trishea.jpg", "tsumiki.jpg", "twins.jpg", "ukyo.jpg", "ulmus.jpg", "ulric.jpg", "umbriel.jpg", "vedan.jpg", "veithael.jpg", "velufira.jpg", "vika.jpg", "villanelle.jpg", "vurk.jpg", "vyloris.jpg", "walker.jpg", "warek.jpg", "wukong.jpg", "yennefer.jpg", "zaphrael.jpg", "zikis.jpg", "zohra.jpg", "zolrath.jpg", "harvey.jpg", "odysseus.jpg"];
  const PET_FILES = ["bellbellow.jpg", "bellbellow_1.jpg", "chest.jpg", "chest_1.jpg", "dragon.jpg", "dragon_1.jpg", "dreary.jpg", "feline.jpg", "feline_1.jpg", "fire.jpg", "fire_1.jpg", "fox.jpg", "fox_1.jpg", "ghost.jpg", "ghost_1.jpg", "grassy.jpg", "ibis.jpg", "ibis_1.jpg", "ice.jpg", "ice_1.jpg", "lion.jpg", "lion_1.jpg", "owl.jpg", "owl_1.jpg", "panda.jpg", "panda_1.jpg", "pegasus.jpg", "pegasus_1.jpg", "phanta.jpg", "phanta_1.jpg", "polar.jpg", "polar_1.jpg", "rabbit.jpg", "radish.jpg", "radish_1.jpg", "ridge.jpg", "ridge_1.jpg", "roamer.jpg", "roamer_1.jpg", "rock.jpg", "rock_1.jpg", "savage.jpg", "savage_1.jpg", "seal.jpg", "seal_1.jpg", "spooder.jpg", "spooder_1.jpg", "talismane.jpg", "talismane_1.jpg", "thistlekin.jpg", "thistlekin_1.jpg", "tufty.jpg", "unknown.png"];

  const page = document.getElementById('aeCompsPage');
  if (!page) return;

  const heroGrid = document.getElementById('aeHeroGrid');
  const petGrid = document.getElementById('aePetGrid');
  const slots = Array.from(document.querySelectorAll('.ae-slot'));
  const damageInput = document.getElementById('aeDamage');
  const sendBtn = document.getElementById('aeSendBtn');
  const messageEl = document.getElementById('aeMessage');
  const tabs = Array.from(document.querySelectorAll('.ae-tab'));
  const panels = Array.from(document.querySelectorAll('.ae-panel'));

  const state = {
    slots: Array(6).fill(null),
  };

  function fileToName(file) {
    return file.replace(/\.[^.]+$/, '');
  }

  function iconPath(kind, file) {
    return kind === 'hero' ? `/icons/heroes2/${file}` : `/icons/pets/${file}`;
  }

  function makeIconButton(kind, file) {
    const name = fileToName(file);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ae-icon-btn';
    btn.dataset.kind = kind;
    btn.dataset.name = name;
    btn.dataset.src = iconPath(kind, file);
    btn.title = name;

    const img = document.createElement('img');
    img.src = btn.dataset.src;
    img.alt = name;
    img.loading = 'lazy';
    btn.appendChild(img);

    return btn;
  }

  function populateIcons() {
    HERO_FILES.forEach((file) => heroGrid.appendChild(makeIconButton('hero', file)));
    PET_FILES.forEach((file) => petGrid.appendChild(makeIconButton('pet', file)));
  }

  function setMessage(text, kind = '') {
    messageEl.textContent = text || '';
    messageEl.classList.remove('is-error', 'is-success');
    if (kind) messageEl.classList.add(kind);
  }

  function clearValidation() {
    slots.forEach((slotEl) => slotEl.classList.remove('is-missing'));
    damageInput.classList.remove('is-missing');
  }

  function refreshUsedIcons() {
    const selected = new Set(state.slots.filter(Boolean).map((item) => `${item.kind}:${item.name}`));
    document.querySelectorAll('.ae-icon-btn').forEach((btn) => {
      const key = `${btn.dataset.kind}:${btn.dataset.name}`;
      btn.classList.toggle('is-used', selected.has(key));
    });
  }

  function renderSlots() {
    slots.forEach((slotEl, index) => {
      const item = state.slots[index];
      slotEl.classList.remove('is-filled');
      slotEl.innerHTML = '';
      if (!item) {
        const span = document.createElement('span');
        span.className = 'ae-slot-placeholder';
        span.textContent = slotEl.dataset.slotType === 'pet' ? 'Pet' : `Hero ${index + 1}`;
        slotEl.appendChild(span);
        slotEl.draggable = false;
        return;
      }

      slotEl.classList.add('is-filled');
      slotEl.draggable = true;

      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.name;
      slotEl.appendChild(img);

      const label = document.createElement('span');
      label.className = 'ae-slot-name';
      label.textContent = item.name;
      slotEl.appendChild(label);
    });
    refreshUsedIcons();
  }

  function firstEmptyHeroSlot() {
    for (let i = 0; i < 5; i += 1) {
      if (!state.slots[i]) return i;
    }
    return -1;
  }

  function addIcon(kind, name, src) {
    clearValidation();
    setMessage('');

    if (kind === 'hero') {
      if (state.slots.some((item) => item && item.kind === 'hero' && item.name === name)) return;
      const index = firstEmptyHeroSlot();
      if (index === -1) {
        setMessage('All 5 hero slots are already filled.', 'is-error');
        return;
      }
      state.slots[index] = { kind, name, src };
    } else {
      if (state.slots[5] && state.slots[5].name === name) return;
      state.slots[5] = { kind, name, src };
    }

    renderSlots();
  }

  function removeFromSlot(index) {
    if (!state.slots[index]) return;
    state.slots[index] = null;
    clearValidation();
    setMessage('');
    renderSlots();
  }

  function slotTypeForIndex(index) {
    return index === 5 ? 'pet' : 'hero';
  }

  function moveOrSwap(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const fromItem = state.slots[fromIndex];
    const toItem = state.slots[toIndex];
    if (!fromItem) return;

    const targetType = slotTypeForIndex(toIndex);
    if (fromItem.kind !== targetType) return;
    if (toItem && toItem.kind !== fromItem.kind) return;

    state.slots[fromIndex] = toItem || null;
    state.slots[toIndex] = fromItem;
    clearValidation();
    setMessage('');
    renderSlots();
  }

  function validate() {
    let ok = true;
    clearValidation();

    for (let i = 0; i < 6; i += 1) {
      if (!state.slots[i]) {
        slots[i].classList.add('is-missing');
        ok = false;
      }
    }

    const damage = damageInput.value.trim();
    if (!damage) {
      damageInput.classList.add('is-missing');
      ok = false;
    }

    if (!ok) {
      setMessage('Fill all 5 hero slots, the pet slot, and the damage field before sending.', 'is-error');
    }
    return ok;
  }

  async function submitComp() {
    if (!validate()) return;

    if (typeof supabaseClient === 'undefined') {
      setMessage('Supabase client is not available on this page.', 'is-error');
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

    sendBtn.disabled = true;
    setMessage('Sending...');

    try {
      const { error } = await supabaseClient.from('ae-comps').insert([payload]);
      if (error) throw error;

      setMessage('Comp saved.', 'is-success');
      state.slots = Array(6).fill(null);
      damageInput.value = '';
      clearValidation();
      renderSlots();
    } catch (error) {
      setMessage(error?.message || 'Failed to save comp.', 'is-error');
    } finally {
      sendBtn.disabled = false;
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
      });
    });
  }

  heroGrid.addEventListener('click', (event) => {
    const btn = event.target.closest('.ae-icon-btn');
    if (!btn) return;
    addIcon(btn.dataset.kind, btn.dataset.name, btn.dataset.src);
  });

  petGrid.addEventListener('click', (event) => {
    const btn = event.target.closest('.ae-icon-btn');
    if (!btn) return;
    addIcon(btn.dataset.kind, btn.dataset.name, btn.dataset.src);
  });

  slots.forEach((slotEl) => {
    slotEl.addEventListener('click', (event) => {
      if (event.target.closest('.ae-slot-name, img, .ae-slot-placeholder') || event.currentTarget === event.target) {
        const index = Number(slotEl.dataset.slotIndex);
        if (state.slots[index]) removeFromSlot(index);
      }
    });

    slotEl.addEventListener('dragstart', (event) => {
      if (!slotEl.draggable) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData('text/plain', slotEl.dataset.slotIndex);
      event.dataTransfer.effectAllowed = 'move';
    });

    slotEl.addEventListener('dragover', (event) => {
      event.preventDefault();
      slotEl.classList.add('is-drop-target');
    });

    slotEl.addEventListener('dragleave', () => {
      slotEl.classList.remove('is-drop-target');
    });

    slotEl.addEventListener('drop', (event) => {
      event.preventDefault();
      slotEl.classList.remove('is-drop-target');
      const fromIndex = Number(event.dataTransfer.getData('text/plain'));
      const toIndex = Number(slotEl.dataset.slotIndex);
      if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return;
      moveOrSwap(fromIndex, toIndex);
    });

    slotEl.addEventListener('dragend', () => {
      slots.forEach((slot) => slot.classList.remove('is-drop-target'));
    });
  });

  damageInput.addEventListener('input', () => {
    if (damageInput.value.trim()) damageInput.classList.remove('is-missing');
    if (messageEl.classList.contains('is-error')) setMessage('');
  });

  sendBtn.addEventListener('click', submitComp);

  populateIcons();
  renderSlots();
  initTabs();
})();
