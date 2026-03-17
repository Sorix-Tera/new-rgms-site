document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("aeMapPage");
  const viewport = document.getElementById("aeMapViewport");
  const countEl = document.getElementById("aeMapCount");
  const clearBtn = document.getElementById("aeMapClear");
  const resetViewBtn = document.getElementById("aeMapResetView");

  if (!page || !viewport || !countEl || !clearBtn || !resetViewBtn) return;

  const HEX_RX = 31.2;
  const HEX_RY = 27.8;
  const ORIGIN_X = 0;
  const ORIGIN_Y = 0;

  const MAP_SRC = "icons/ae_map.jpeg";
  const STORAGE_KEY = "ae-map-selected-v1";

  const sqrt3 = Math.sqrt(3);
  const selected = new Set();

  let imgW = 0;
  let imgH = 0;

  let stage;
  let overlay;
  let selectedLayer;
  let hitbox;
  let status;

  let fitScale = 1;
  let scale = 1;
  let minScale = 1;
  let maxScale = 1;
  let tx = 0;
  let ty = 0;

  let isDragging = false;
  let pointerMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let startTx = 0;
  let startTy = 0;

  const img = new Image();
  img.src = MAP_SRC;
  img.alt = "Abyssal Expedition map";
  img.className = "ae-map-image";
  img.draggable = false;

  function key(q, r) {
    return `${q},${r}`;
  }

  function parseKey(k) {
    const [q, r] = k.split(",").map(Number);
    return { q, r };
  }

  function cubeRound(qf, rf) {
    let x = qf;
    let z = rf;
    let y = -x - z;

    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return { q: rx, r: rz };
  }

  function hexToPixel(q, r) {
    return {
      x: ORIGIN_X + HEX_RX * sqrt3 * (q + r / 2),
      y: ORIGIN_Y + HEX_RY * 1.5 * r,
    };
  }

  function pixelToHex(x, y) {
    const px = x - ORIGIN_X;
    const py = y - ORIGIN_Y;
  
    const qf = (px / (sqrt3 * HEX_RX)) - (py / (3 * HEX_RY));
    const rf = (2 * py) / (3 * HEX_RY);
  
    return cubeRound(qf, rf);
  }

  function hexPoints(q, r) {
    const c = hexToPixel(q, r);
    const pts = [];
  
    for (let i = 0; i < 6; i++) {
      const angle = ((60 * i) - 30) * Math.PI / 180;
      const x = c.x + HEX_RX * Math.cos(angle);
      const y = c.y + HEX_RY * Math.sin(angle);
      pts.push(`${x},${y}`);
    }
  
    return pts.join(" ");
  }

  function clampPan() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;

    if (scaledW <= vw) {
      tx = (vw - scaledW) / 2;
    } else {
      const minTx = vw - scaledW;
      tx = Math.max(minTx, Math.min(0, tx));
    }

    if (scaledH <= vh) {
      ty = (vh - scaledH) / 2;
    } else {
      const minTy = vh - scaledH;
      ty = Math.max(minTy, Math.min(0, ty));
    }
  }

  function applyTransform() {
    clampPan();
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;

    if (status) {
      status.textContent = `Zoom: ${(scale / fitScale).toFixed(2)}×`;
    }
  }

  function updateCount() {
    countEl.textContent = String(selected.size);
  }

  function saveSelection() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
  }

  function loadSelection() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      arr.forEach((k) => selected.add(String(k)));
    } catch (_) {}
  }

  function renderSelected() {
    selectedLayer.innerHTML = "";

    selected.forEach((k) => {
      const { q, r } = parseKey(k);
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", hexPoints(q, r));
      poly.setAttribute("class", "ae-map-selected");
      selectedLayer.appendChild(poly);
    });

    updateCount();
    saveSelection();
  }

  function resetView() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    fitScale = Math.min(vw / imgW, vh / imgH);
    minScale = fitScale;
    maxScale = fitScale * 15;
    scale = fitScale;

    tx = (vw - imgW * scale) / 2;
    ty = (vh - imgH * scale) / 2;

    applyTransform();
  }

  function screenToMap(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    const x = (clientX - rect.left - tx) / scale;
    const y = (clientY - rect.top - ty) / scale;
    return { x, y };
  }

  function zoomAt(clientX, clientY, factor) {
    const oldScale = scale;
    let newScale = scale * factor;

    if (newScale < minScale) newScale = minScale;
    if (newScale > maxScale) newScale = maxScale;
    if (newScale === oldScale) return;

    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const mapX = (px - tx) / oldScale;
    const mapY = (py - ty) / oldScale;

    scale = newScale;
    tx = px - mapX * scale;
    ty = py - mapY * scale;

    applyTransform();
  }

  function toggleHexAt(clientX, clientY) {
    const p = screenToMap(clientX, clientY);
    const { q, r } = pixelToHex(p.x, p.y);
    const k = key(q, r);

    if (selected.has(k)) {
      selected.delete(k);
    } else {
      selected.add(k);
    }

    renderSelected();
  }

  function handlePointerUp(e) {
    if (!isDragging) return;

    isDragging = false;
    viewport.classList.remove("is-dragging");

    if (!pointerMoved) {
      toggleHexAt(e.clientX, e.clientY);
    }
  }

  img.addEventListener("load", () => {
    imgW = img.naturalWidth;
    imgH = img.naturalHeight;

    viewport.classList.remove("ae-map-loading");
    viewport.innerHTML = "";

    stage = document.createElement("div");
    stage.className = "ae-map-stage";
    stage.style.width = `${imgW}px`;
    stage.style.height = `${imgH}px`;

    overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    overlay.setAttribute("class", "ae-map-overlay");
    overlay.setAttribute("width", imgW);
    overlay.setAttribute("height", imgH);
    overlay.setAttribute("viewBox", `0 0 ${imgW} ${imgH}`);

    selectedLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    overlay.appendChild(selectedLayer);

    hitbox = document.createElement("div");
    hitbox.className = "ae-map-hitbox";

    status = document.createElement("div");
    status.className = "ae-map-status";

    stage.appendChild(img);
    stage.appendChild(overlay);
    stage.appendChild(hitbox);
    viewport.appendChild(stage);
    viewport.appendChild(status);

    loadSelection();
    renderSelected();
    resetView();

    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        zoomAt(e.clientX, e.clientY, factor);
      },
      { passive: false }
    );

    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;

      isDragging = true;
      pointerMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      startTx = tx;
      startTy = ty;

      viewport.classList.add("is-dragging");
      viewport.setPointerCapture?.(e.pointerId);
    });

    viewport.addEventListener("pointermove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        pointerMoved = true;
      }

      tx = startTx + dx;
      ty = startTy + dy;
      applyTransform();
    });

    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", () => {
      isDragging = false;
      viewport.classList.remove("is-dragging");
    });

    clearBtn.addEventListener("click", () => {
      selected.clear();
      renderSelected();
    });

    resetViewBtn.addEventListener("click", () => {
      resetView();
    });

    window.addEventListener("resize", () => {
      const zoomRatio = scale / fitScale;
      resetView();
      scale = Math.min(maxScale, Math.max(minScale, fitScale * zoomRatio));
      clampPan();
      applyTransform();
    });
  });

  img.addEventListener("error", () => {
    viewport.classList.remove("ae-map-loading");
    viewport.innerHTML = `<div style="padding:20px;color:#fff;">Failed to load map image: ${MAP_SRC}</div>`;
  });
});
