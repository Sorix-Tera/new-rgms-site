// your-box.js — Hero box investment tracker
// Stores hero investments in localStorage as a flat JSON object.
// Key: "yourBox" → { heroName: { si, furn, engr }, ... }

(function () {
  const STORAGE_KEY = 'yourBox';

  // Valid option sets
  const SI_OPTIONS   = [29, 30, 40, 50];   // 29 = "<30", stored as 29
  const FURN_OPTIONS = [0, 3, 9];
  const ENGR_OPTIONS = [0, 30, 60, 80];

  const SI_LABELS   = { 29: '<30', 30: '30', 40: '40', 50: '50' };

  // Full hero list (alphabetical, from icons/heroes2/)
  const HEROES = [
    'aantandra','aathalia','abaden','abelinda','abrutus','adrian','aeironn',
    'aestrilda','aezizh','afawkes','ainz','alaro','albedo','alna','alucius',
    'alvida','alyca','anasta','angelo','ankhira','anoki','antandra','apippa',
    'arden','arkadios','arthur','asafiya','ashemira','askriath','asolise',
    'astar','atalene','athalia','athane','atheus','athoran','audrae','aurelia',
    'baden','begris','belinda','bloodsnarl','bronn','brutus','cassius','cecilia',
    'cha','crassio','daemia','daimon','desira','dgwyneth','dracula','dreaf',
    'drez','edwin','eironn','eletha','elthara','eluard','emilia','envydiel',
    'eorin','estrilda','eugene','ezio','ezizh','fane','fawkes','ferael','flora',
    'framton','gavus','geralt','ginneas','golus','gorok','gorren','gorvo',
    'gourgue','granit','grezhul','gwyneth','haelia','haelus','harvey','hendrik',
    'hildwin','hodgkin','hogan','icariel','ira','isabella','ivan','izold',
    'jerome','joan','joker','kaelon','kalene','kalthin','kaz','kelthur',
    'khasos','khazard','knox','kregor','kren','laios','lan','lavatune','leofric',
    'leonardo','lethos','leviathan','liberta','lorsan','lucilla','lucius',
    'lucretia','lyca','lysander','maetria','malkrie','marcille','mehira',
    'melion','melusina','merek','merlin','mezoth','mira','mirael','misha',
    'mishka','morael','morrow','mortas','morvus','mulan','nakoruru','nara',
    'naroko','nemora','nevanthi','niru','numisu','nyla','oden','odysseus','ogi',
    'oku','olgath','orthros','oscar','palmer','peggy','pippa','prince','pulina',
    'queen','raine','raku','randle','raoul','rem','respen','rigby','rimuru',
    'robin','rosaline','rowan','safiya','saitama','salaki','satrana','saurus',
    'saveas','scarlet','seirus','selene','serenmira','sezis','shaltear',
    'shemira','shuna','silas','silvina','simona','sion','sjw','skreg','skriath',
    'skylan','solise','sonja','steixius','talene','talimar','tamrus','tarnos',
    'tasi','tavriel','thali','thane','theowyn','thesku','thoran','tidus','titus',
    'torne','treznor','trishea','tsumiki','twins','ukyo','ulmus','ulric',
    'umbriel','vedan','veithael','velufira','vika','villanelle','vurk','vyloris',
    'walker','warek','wukong','yennefer','zaphrael','zikis','zohra','zolrath',
  ];

  // ── Storage helpers ───────────────────────────────────────────────────────

  function loadBox() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveBox(box) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(box));
    } catch (e) {
      console.error('yourBox: could not save to localStorage', e);
    }
  }

  function getHeroData(box, hero) {
    return box[hero] || { si: 29, furn: 0, engr: 0 };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function buildSelectEl(name, options, labelMap, currentValue, onChange) {
    const sel = document.createElement('select');
    sel.className = 'yb-select';
    sel.setAttribute('aria-label', name);

    options.forEach((val) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = labelMap ? (labelMap[val] ?? val) : val;
      if (val === currentValue) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => onChange(Number(sel.value)));
    return sel;
  }

  function buildHeroCard(hero, data, box) {
    const card = document.createElement('div');
    card.className = 'yb-card';
    card.dataset.hero = hero;

    // Determine extension (most are .jpg, unknown is .png)
    const ext = (hero === 'unknown') ? 'png' : 'jpg';

    const img = document.createElement('img');
    img.className = 'yb-hero-img';
    img.src = `icons/heroes2/${hero}.${ext}`;
    img.alt = hero;
    img.loading = 'lazy';
    img.width = 56;
    img.height = 56;

    const name = document.createElement('div');
    name.className = 'yb-hero-name';
    name.textContent = hero;

    const fields = document.createElement('div');
    fields.className = 'yb-fields';

    function makeField(labelText, options, labelMap, key, currentVal) {
      const wrap = document.createElement('div');
      wrap.className = 'yb-field';

      const lbl = document.createElement('span');
      lbl.className = 'yb-field-label';
      lbl.textContent = labelText;

      const sel = buildSelectEl(labelText, options, labelMap, currentVal, (val) => {
        box[hero] = getHeroData(box, hero);
        box[hero][key] = val;
        saveBox(box);
        updateCardHighlight(card, box[hero]);
      });

      wrap.appendChild(lbl);
      wrap.appendChild(sel);
      return wrap;
    }

    fields.appendChild(makeField('SI',   SI_OPTIONS,   SI_LABELS, 'si',   data.si));
    fields.appendChild(makeField('Furn', FURN_OPTIONS, null,       'furn', data.furn));
    fields.appendChild(makeField('Engr', ENGR_OPTIONS, null,       'engr', data.engr));

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(fields);

    updateCardHighlight(card, data);
    return card;
  }

  // Cards with any non-minimum investment get a subtle golden highlight
  function updateCardHighlight(card, data) {
    const isInvested = data.si > 29 || data.furn > 0 || data.engr > 0;
    card.classList.toggle('yb-card--invested', isInvested);
  }

  function renderGrid(box, filter) {
    const grid = document.getElementById('ybGrid');
    const noResults = document.getElementById('ybNoResults');
    if (!grid) return;

    grid.innerHTML = '';
    const q = (filter || '').toLowerCase().trim();
    let count = 0;

    HEROES.forEach((hero) => {
      if (q && !hero.includes(q)) return;
      count++;
      const data = getHeroData(box, hero);
      const card = buildHeroCard(hero, data, box);
      grid.appendChild(card);
    });

    noResults.style.display = count === 0 ? '' : 'none';
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  function exportBox(box) {
    const json = JSON.stringify(box, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-box.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBox(file, onDone) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          alert('Invalid file: expected a JSON object.');
          return;
        }
        // Sanitize: only keep known heroes and valid values
        const clean = {};
        HEROES.forEach((hero) => {
          if (parsed[hero]) {
            const d = parsed[hero];
            clean[hero] = {
              si:   SI_OPTIONS.includes(d.si)     ? d.si   : 29,
              furn: FURN_OPTIONS.includes(d.furn) ? d.furn : 0,
              engr: ENGR_OPTIONS.includes(d.engr) ? d.engr : 0,
            };
          }
        });
        saveBox(clean);
        onDone(clean);
      } catch {
        alert('Could not parse the file. Make sure it is a valid JSON export from this page.');
      }
    };
    reader.readAsText(file);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    const box = loadBox();
    renderGrid(box, '');

    // Search
    const searchEl = document.getElementById('ybSearch');
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        renderGrid(loadBox(), searchEl.value);
      });
    }

    // Export
    const exportBtn = document.getElementById('ybExport');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => exportBox(loadBox()));
    }

    // Import
    const importBtn = document.getElementById('ybImport');
    const fileInput = document.getElementById('ybFileInput');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        importBox(file, (newBox) => {
          const q = searchEl ? searchEl.value : '';
          renderGrid(newBox, q);
        });
        fileInput.value = '';
      });
    }

    // Reset all
    const resetBtn = document.getElementById('ybResetAll');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!confirm('Reset all heroes to minimum values? This cannot be undone.')) return;
        saveBox({});
        const q = searchEl ? searchEl.value : '';
        renderGrid({}, q);
      });
    }
  });
})();
