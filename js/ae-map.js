(function () {
  const page = document.getElementById('aeMapPage');
  if (!page) return;

  const els = {
    image: document.getElementById('aeMapImage'),
    overlay: document.getElementById('aeMapOverlay'),
    selectedCount: document.getElementById('aeMapSelectedCount'),
    hexCount: document.getElementById('aeMapHexCount'),
    size: document.getElementById('aeMapSize'),
    sizeOut: document.getElementById('aeMapSizeOut'),
    originX: document.getElementById('aeMapOriginX'),
    originXOut: document.getElementById('aeMapOriginXOut'),
    originY: document.getElementById('aeMapOriginY'),
    originYOut: document.getElementById('aeMapOriginYOut'),
    opacity: document.getElementById('aeMapOpacity'),
    opacityOut: document.getElementById('aeMapOpacityOut'),
    clear: document.getElementById('aeMapClear'),
    save: document.getElementById('aeMapSave'),
    load: document.getElementById('aeMapLoad'),
    toggleGrid: document.getElementById('aeMapToggleGrid')
  };

  const STORAGE_KEY = 'ae-map-planner-v1';
  const state = {
    selected: new Set(),
    polygons: new Map(),
    showGrid: true,
    imageWidth: 0,
    imageHeight: 0
  };

  const NS = 'http://www.w3.org/2000/svg';

  function pointyHexPoints(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = ((60 * i) - 30) * Math.PI / 180;
      pts.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  function axialToPixel(q, r, size, originX, originY) {
    return {
      x: originX + size * Math.sqrt(3) * (q + r / 2),
      y: originY + size * 1.5 * r
    };
  }

  function tileKey(q, r) {
    return `${q},${r}`;
  }

  function setOutput(input, output, suffix = '') {
    output.textContent = `${input.value}${suffix}`;
  }

  function updateOutputs() {
    setOutput(els.size, els.sizeOut, ' px');
    setOutput(els.originX, els.originXOut, ' px');
    setOutput(els.originY, els.originYOut, ' px');
    setOutput(els.opacity, els.opacityOut, '%');
    els.overlay.style.opacity = String(Number(els.opacity.value) / 100);
  }

  function updateCounts() {
    els.selectedCount.textContent = String(state.selected.size);
    els.hexCount.textContent = String(state.polygons.size);
  }

  function applySelectionToPolygon(key) {
    const poly = state.polygons.get(key);
    if (!poly) return;
    poly.classList.toggle('is-selected', state.selected.has(key));
  }

  function toggleTile(key) {
    if (state.selected.has(key)) {
      state.selected.delete(key);
    } else {
      state.selected.add(key);
    }
    applySelectionToPolygon(key);
    updateCounts();
  }

  function renderGrid() {
    if (!state.imageWidth || !state.imageHeight) return;

    state.polygons.clear();
    els.overlay.innerHTML = '';

    const size = Number(els.size.value);
    const originX = Number(els.originX.value);
    const originY = Number(els.originY.value);

    const margin = size * 2;
    const qMin = Math.floor((-originX - margin) / (Math.sqrt(3) * size)) - 2;
    const qMax = Math.ceil((state.imageWidth - originX + margin) / (Math.sqrt(3) * size)) + 2;
    const rMin = Math.floor((-originY - margin) / (1.5 * size)) - 2;
    const rMax = Math.ceil((state.imageHeight - originY + margin) / (1.5 * size)) + 2;

    const frag = document.createDocumentFragment();

    for (let r = rMin; r <= rMax; r += 1) {
      for (let q = qMin; q <= qMax; q += 1) {
        const { x, y } = axialToPixel(q, r, size, originX, originY);
        if (x < -margin || x > state.imageWidth + margin || y < -margin || y > state.imageHeight + margin) {
          continue;
        }

        const key = tileKey(q, r);
        const poly = document.createElementNS(NS, 'polygon');
        poly.setAttribute('points', pointyHexPoints(x, y, size));
        poly.setAttribute('data-key', key);
        poly.setAttribute('class', 'ae-map-hex');
        if (state.selected.has(key)) poly.classList.add('is-selected');
        frag.appendChild(poly);
        state.polygons.set(key, poly);
      }
    }

    els.overlay.appendChild(frag);
    updateCounts();
  }

  function savePlan() {
    const payload = {
      size: Number(els.size.value),
      originX: Number(els.originX.value),
      originY: Number(els.originY.value),
      opacity: Number(els.opacity.value),
      showGrid: state.showGrid,
      selected: Array.from(state.selected)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadPlan() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw);
      if (typeof payload.size === 'number') els.size.value = String(payload.size);
      if (typeof payload.originX === 'number') els.originX.value = String(payload.originX);
      if (typeof payload.originY === 'number') els.originY.value = String(payload.originY);
      if (typeof payload.opacity === 'number') els.opacity.value = String(payload.opacity);
      state.showGrid = payload.showGrid !== false;
      state.selected = new Set(Array.isArray(payload.selected) ? payload.selected : []);
      els.overlay.classList.toggle('ae-map-hidden', !state.showGrid);
      updateOutputs();
      renderGrid();
    } catch (err) {
      console.error('Unable to load saved AE map plan.', err);
    }
  }

  function initImage() {
    state.imageWidth = els.image.naturalWidth;
    state.imageHeight = els.image.naturalHeight;

    els.overlay.setAttribute('viewBox', `0 0 ${state.imageWidth} ${state.imageHeight}`);
    els.overlay.setAttribute('width', state.imageWidth);
    els.overlay.setAttribute('height', state.imageHeight);

    if (!localStorage.getItem(STORAGE_KEY)) {
      els.size.value = '9';
      els.originX.value = '8';
      els.originY.value = '8';
      els.opacity.value = '75';
    }

    updateOutputs();
    loadPlan();
    renderGrid();
  }

  els.overlay.addEventListener('click', (event) => {
    const poly = event.target.closest('.ae-map-hex');
    if (!poly) return;
    toggleTile(poly.dataset.key);
  });

  [els.size, els.originX, els.originY, els.opacity].forEach((input) => {
    input.addEventListener('input', () => {
      updateOutputs();
      renderGrid();
    });
  });

  els.clear.addEventListener('click', () => {
    state.selected.clear();
    state.polygons.forEach((_, key) => applySelectionToPolygon(key));
    updateCounts();
  });

  els.save.addEventListener('click', savePlan);
  els.load.addEventListener('click', loadPlan);

  els.toggleGrid.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    els.overlay.classList.toggle('ae-map-hidden', !state.showGrid);
    els.toggleGrid.textContent = state.showGrid ? 'Hide grid' : 'Show grid';
  });

  if (els.image.complete) {
    initImage();
  } else {
    els.image.addEventListener('load', initImage, { once: true });
  }
})();
