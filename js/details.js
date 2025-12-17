// details.js (updated: TS comps summary is now split into 3 columns by teams bucket)
// Source base: your current file :contentReference[oaicite:0]{index=0}

async function initDetailPage() {
  const titleEl = document.getElementById('detailTitle');
  const subtitleEl = document.getElementById('detailSubtitle');
  const statusEl = document.getElementById('detailStatus');
  const nameEl = document.getElementById('detailPlayerName');
  const regionEl = document.getElementById('detailRegion');
  const metricLabelEl = document.getElementById('detailMetricLabel');
  const metricValueEl = document.getElementById('detailMetricValue');
  const lastUpdateEl = document.getElementById('detailLastUpdate');
  const chartCanvas = document.getElementById('detailChart');
  const screensGrid = document.getElementById('detailScreenshotsGrid');
  const screensStatusEl = document.getElementById('detailScreensStatus');

  const lightboxOverlay = document.getElementById('lightboxOverlay');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxNotes = document.getElementById('lightboxNotes');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxInner = document.querySelector('.lightbox-inner');

  function openLightbox(src, alt, captionText, notesText) {
    if (!lightboxOverlay || !lightboxImage) return;

    lightboxImage.src = src;
    lightboxImage.alt = alt || 'Screenshot';

    if (lightboxCaption) {
      lightboxCaption.textContent = captionText || '';
    }

    if (lightboxNotes) {
      const cleanNotes = (notesText || '').trim();
      if (cleanNotes) {
        lightboxNotes.style.display = 'block';
        lightboxNotes.innerHTML =
          `<span class="lightbox-notes-label">Notes</span>` +
          `<div class="lightbox-notes-text">${cleanNotes.replace(/\n/g, '<br/>')}</div>`;
        if (lightboxInner) {
          lightboxInner.classList.add('has-notes');
        }
      } else {
        lightboxNotes.style.display = 'none';
        lightboxNotes.textContent = '';
        if (lightboxInner) {
          lightboxInner.classList.remove('has-notes');
        }
      }
    }

    lightboxOverlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
  }

  function closeLightbox() {
    if (!lightboxOverlay || !lightboxImage) return;
    lightboxOverlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    lightboxImage.src = '';
    if (lightboxInner) {
      lightboxInner.classList.remove('has-notes');
    }
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === lightboxOverlay) {
        closeLightbox();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const field = params.get('field');
  const key = params.get('key');

  if (!mode || !field || !key) {
    statusEl.textContent = 'Missing parameters. This URL is incomplete.';
    return;
  }

  if (!['name', 'discord_id'].includes(field)) {
    statusEl.textContent = 'Invalid player identifier field.';
    return;
  }

  // Comps summary is only relevant for Treasure Scramble (ts-*) modes.
  // For other modes, hide the entire Summary section.
  const compsSectionEl = document.getElementById('detailCompsSection');
  if (typeof mode === 'string' && mode.startsWith('ts-')) {
    if (compsSectionEl) compsSectionEl.style.display = '';
    await loadAndRenderCompsSummary({ mode, field, value: key });
  } else {
    if (compsSectionEl) compsSectionEl.style.display = 'none';
  }

  const modeInfo = getModeInfo(mode);
  titleEl.textContent = `${modeInfo.mainLabel} · ${modeInfo.subLabel}`;
  subtitleEl.textContent = 'Loading player history...';

  try {
    const { data, error } = await supabaseClient
      .from('screenshots')
      .select('*')
      .eq('mode', mode)
      .eq(field, key)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error (detail):', error);
      statusEl.textContent = 'Error loading data from Supabase: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      statusEl.textContent = 'No entries found for this player and mode.';
      subtitleEl.textContent = 'No history to display.';
      return;
    }

    const latest = data[data.length - 1];
    const displayName = latest.name || latest.discord_name || key;
    const region = latest.region || '—';

    nameEl.textContent = displayName;
    regionEl.textContent = region;
    lastUpdateEl.textContent = formatDate(latest.created_at);
    statusEl.textContent = '';

    // Decide metric type based on mode group
    let metricLabel = 'Value';
    let parseFn = parseRankValue;
    let invertAxis = false;

    switch (modeInfo.mainCode) {
      case 'cr':
        metricLabel = 'Damage';
        parseFn = parseDamageValue;
        invertAxis = false; // higher damage = better
        break;
      case 'nc':
        metricLabel = 'Time (seconds)';
        parseFn = parseTimeValue;
        invertAxis = true; // smaller time = better
        break;
      case 'ts':
        metricLabel = 'Rank';
        parseFn = parseRankValue;
        invertAxis = true; // smaller rank = better
        break;
      default:
        metricLabel = 'Value';
        parseFn = parseRankValue;
        invertAxis = false;
    }

    metricLabelEl.textContent = metricLabel;
    metricValueEl.textContent = latest.content || '—';

    subtitleEl.textContent = `History for ${displayName} in ${modeInfo.mainLabel} · ${modeInfo.subLabel}`;

    // Build chart data: only last 20 records
    const graphRows = data.slice(-20);
    const labels = [];
    const values = [];

    graphRows.forEach((row) => {
      labels.push(formatDate(row.created_at));
      values.push(parseFn(row.content || '') ?? null);
    });

    if (chartCanvas && typeof Chart !== 'undefined') {
      const ctx = chartCanvas.getContext('2d');
      // eslint-disable-next-line no-unused-vars
      const isCR = modeInfo.mainCode === 'cr';
      const isNC = modeInfo.mainCode === 'nc';

      // eslint-disable-next-line no-unused-vars
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: metricLabel,
              data: values,
              tension: 0.2,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              display: true,
              ticks: {
                // show a label only every 3rd tick
                callback: function (value, index) {
                  if (index % 3 !== 0) return '';
                  if (this.getLabelForValue) {
                    return this.getLabelForValue(value);
                  }
                  return value;
                },
              },
            },
            y: {
              display: true,
              reverse: invertAxis,
              ticks: {
                callback: function (value) {
                  // CR: big damage numbers -> 226B, 12.3T, etc.
                  if (isCR) {
                    return formatDamageShort(value);
                  }
                  // NC: seconds -> mm:ss or hh:mm:ss
                  if (isNC) {
                    return formatSecondsAsClock(value);
                  }
                  // Default for TS and anything else
                  return value;
                },
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            pointLabelPlugin: {
              color: '#ddd',
              fontSize: 10,
              yOffset: 6,
              mode: modeInfo.mainCode,
            },
          },
        },
        plugins: [pointLabelPlugin],
      });
    }

    // Screenshots grid: last 50 screenshots (per image, most recent first)
    screensGrid.innerHTML = '';
    let count = 0;
    const rowsDesc = [...data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    outer: for (const row of rowsDesc) {
      const urls = getImageUrlsFromRow(row);
      const createdLabel = formatDate(row.created_at);
      const metricStr = row.content || '';
      const notes = row.message || '';

      for (const url of urls) {
        if (!url) continue;
        if (count >= 50) break outer;

        const card = document.createElement('article');
        card.className = 'entry-card';

        const thumbWrapper = document.createElement('div');
        thumbWrapper.className = 'entry-thumbnail-wrapper';

        const img = document.createElement('img');
        img.className = 'entry-thumbnail-img';
        img.src = url;
        img.alt = `${displayName} screenshot`;
        img.loading = 'lazy';
        thumbWrapper.appendChild(img);

        const badge = document.createElement('div');
        badge.className = 'entry-mode-badge';
        const badgePill = document.createElement('span');
        badgePill.className = 'badge-pill';
        badgePill.textContent = modeInfo.badgeShort;
        const badgeText = document.createElement('span');
        badgeText.textContent = modeInfo.subLabel || modeInfo.mainLabel;
        badge.appendChild(badgePill);
        badge.appendChild(badgeText);
        thumbWrapper.appendChild(badge);

        const mainDiv = document.createElement('div');
        mainDiv.className = 'entry-main';

        const dateDiv = document.createElement('div');
        dateDiv.className = 'entry-player';
        dateDiv.textContent = createdLabel;
        mainDiv.appendChild(dateDiv);

        const metaLine = document.createElement('div');
        metaLine.className = 'entry-meta-line';

        const metaLeft = document.createElement('div');
        metaLeft.className = 'entry-meta-left';

        if (region && region !== '—') {
          const regionSpan = document.createElement('span');
          regionSpan.className = 'pill-region';
          regionSpan.textContent = region;
          metaLeft.appendChild(regionSpan);
        }

        if (metricStr) {
          const metricSpan = document.createElement('span');
          metricSpan.className = 'pill-rank';
          metricSpan.textContent = metricStr;
          metaLeft.appendChild(metricSpan);
        }

        metaLine.appendChild(metaLeft);
        mainDiv.appendChild(metaLine);

        card.appendChild(thumbWrapper);
        card.appendChild(mainDiv);

        card.addEventListener('click', () => {
          const caption = metricStr ? `${createdLabel} · ${metricStr}` : createdLabel;
          openLightbox(url, img.alt, caption, notes);
        });

        screensGrid.appendChild(card);
        count++;
      }
    }

    if (count === 0) {
      screensStatusEl.textContent = 'No screenshots stored for this player in this mode yet.';
    } else {
      screensStatusEl.textContent =
        count === 1 ? 'Showing last screenshot.' : `Showing last ${count} screenshots.`;
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Unexpected error while loading player details.';
  }
}

async function loadAndRenderCompsSummary({ mode, field, value }) {
  const statusEl = document.getElementById('detailCompsStatus');
  const gridEl = document.getElementById('detailCompsGrid');
  const sectionEl = document.getElementById('detailCompsSection');
  if (!statusEl || !gridEl || !sectionEl) return;

  // Hide/clear until we know we have something
  gridEl.innerHTML = '';
  statusEl.textContent = 'Loading comps summary…';

  if (!mode) {
    statusEl.textContent = 'No mode found; comps summary unavailable.';
    return;
  }

  // If field=name => filter by name, else filter by discord_id
  const useName = (field || '').toLowerCase() === 'name';
  const filterCol = useName ? 'name' : 'discord_id';
  const filterVal = (value || '').trim();

  if (!filterVal) {
    statusEl.textContent = 'No player identifier found; comps summary unavailable.';
    return;
  }

  // Pull comps (NOW includes teams)
  // NOTE: requires comps.mode to exist
  let q = supabaseClient
    .from('comps')
    .select('heroes,pet,winrate,teams')
    .eq('mode', mode)
    .eq(filterCol, filterVal)
    .not('winrate', 'is', null);

  const { data, error } = await q;
  if (error) {
    console.error('Comps query error:', error);
    statusEl.textContent = 'Failed to load comps summary.';
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    statusEl.textContent = 'No comps found for this player.';
    return;
  }

  // Group by (teams bucket) + (heroes + pet), averaging winrate
  const groupedByBucket = {
    '2-3': new Map(),
    '4-5': new Map(),
    '6-7': new Map(),
  };

  let skippedNoTeams = 0;
  let skippedBadWinrate = 0;
  let skippedTooUnknown = 0;

  for (const r of rows) {
    const teamsN = parseTeamsCount(r.teams);
    const bucket = teamsBucketKey(teamsN);
    if (!bucket) {
      skippedNoTeams++;
      continue;
    }

    const heroesStr = (r.heroes || '').trim();
    const petStr = (r.pet || '').trim();

    // Parse winrate numeric; skip if not valid
    const w = Number(r.winrate);
    if (!Number.isFinite(w)) {
      skippedBadWinrate++;
      continue;
    }

    // Skip comps with too many UNKNOWN heroes (count after normalize-to-5)
    let heroesArr = parseHeroesList(heroesStr).map((h) => (h || '').trim().toLowerCase());

    // enforce exactly 5 slots (missing slots count as unknown)
    heroesArr = heroesArr.slice(0, 5);
    while (heroesArr.length < 5) heroesArr.push('unknown');

    const unknownCount = heroesArr.filter((h) => isUnknownName(h)).length;
    if (unknownCount > 2) {
      skippedTooUnknown++;
      continue;
    }

    const groupKey = `${heroesStr}||${petStr}`;
    const map = groupedByBucket[bucket];

    const cur = map.get(groupKey);
    if (!cur) {
      map.set(groupKey, { heroes: heroesStr, pet: petStr, sum: w, n: 1 });
    } else {
      cur.sum += w;
      cur.n += 1;
    }
  }

  const compsByBucket = {
    '2-3': mapToCompsArray(groupedByBucket['2-3']),
    '4-5': mapToCompsArray(groupedByBucket['4-5']),
    '6-7': mapToCompsArray(groupedByBucket['6-7']),
  };

  const totalUnique =
    compsByBucket['2-3'].length + compsByBucket['4-5'].length + compsByBucket['6-7'].length;

  if (totalUnique === 0) {
    statusEl.textContent =
      'No usable comps (teams/winrate/UNKNOWN filtering removed all).';
    return;
  }

  // Sort each bucket by winrate desc
  compsByBucket['2-3'].sort((a, b) => b.winrate - a.winrate);
  compsByBucket['4-5'].sort((a, b) => b.winrate - a.winrate);
  compsByBucket['6-7'].sort((a, b) => b.winrate - a.winrate);

  // Status line (kept concise but informative)
  const parts = [
    `2–3 teams: ${compsByBucket['2-3'].length}`,
    `4–5 teams: ${compsByBucket['4-5'].length}`,
    `6–7 teams: ${compsByBucket['6-7'].length}`,
  ];
  statusEl.textContent = `Showing unique comps, sorted by winrate.\n ${parts.join(' · ')}`;

  // Render as 3 columns with a small header above each column
  renderBucketedCompsGrid(gridEl, compsByBucket, {
    showEmptyMessage: true,
  });
}

// ---------- NEW: teams helpers ----------

function parseTeamsCount(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const m = String(value).toLowerCase().match(/(\d+)/);
  if (!m) return null;

  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function teamsBucketKey(n) {
  if (n == null) return null;
  if (n <= 3) return '2-3';
  if (n <= 5) return '4-5';
  return '6-7';
}

function mapToCompsArray(map) {
  if (!map || !(map instanceof Map)) return [];
  return Array.from(map.values()).map((x) => ({
    heroes: x.heroes,
    pet: x.pet,
    winrate: x.sum / x.n,
    n: x.n,
  }));
}

function renderBucketedCompsGrid(gridEl, compsByBucket, opts = {}) {
  const showEmptyMessage = !!opts.showEmptyMessage;

  gridEl.innerHTML = '';

  const columns = [
    { key: '2-3', title: '2–3 teams' },
    { key: '4-5', title: '4–5 teams' },
    { key: '6-7', title: '6–7 teams' },
  ];

  for (const col of columns) {
    const colWrap = document.createElement('div');
    colWrap.className = 'comps-bucket-col';

    const title = document.createElement('div');
    title.className = 'comps-bucket-title';
    title.textContent = col.title;

    const body = document.createElement('div');
    body.className = 'comps-bucket-body';

    colWrap.appendChild(title);
    colWrap.appendChild(body);

    const comps = (compsByBucket && compsByBucket[col.key]) || [];
    if (comps.length === 0) {
      if (showEmptyMessage) {
        const empty = document.createElement('div');
        empty.className = 'comps-bucket-empty';
        empty.textContent = 'No comps.';
        body.appendChild(empty);
      }
    } else {
      renderCompsGrid(body, comps);
    }

    gridEl.appendChild(colWrap);
  }
}

// ---------- existing helpers (unchanged) ----------

function parseHeroesList(heroesStr) {
  // Stored format: "hero1 - hero2 - hero3 - hero4 - hero5"
  // Use a tolerant split and trim.
  if (!heroesStr) return [];
  return heroesStr.split(/\s*-\s*/).map((s) => s.trim()).filter(Boolean);
}

function isUnknownName(name) {
  return !name || name.trim().toLowerCase() === 'unknown';
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

function renderCompsGrid(gridEl, comps) {
  const frag = document.createDocumentFragment();

  for (const comp of comps) {
    const card = document.createElement('div');
    card.className = 'comp-card';

    const row = document.createElement('div');
    row.className = 'comp-row';

    const heroes = parseHeroesList(comp.heroes);
    // Ensure exactly 5 slots if your string is malformed
    while (heroes.length < 5) heroes.push('unknown');

    for (let i = 0; i < 5; i++) {
      const img = document.createElement('img');
      img.className = 'comp-icon';
      img.loading = 'lazy';
      img.alt = heroes[i] || 'unknown';
      img.src = iconUrlForHero(heroes[i]);
      img.onerror = () => {
        img.src = 'icons/heroes2/unknown.png';
      };
      row.appendChild(img);
    }

    // Pet icon
    const petImg = document.createElement('img');
    petImg.className = 'comp-icon';
    petImg.loading = 'lazy';
    petImg.alt = comp.pet || 'unknown';
    petImg.src = iconUrlForPet(comp.pet);
    petImg.onerror = () => {
      petImg.src = 'icons/pets/unknown.png';
    };
    row.appendChild(petImg);

    // Winrate
    const wr = document.createElement('span');
    wr.className = 'comp-winrate';
    wr.textContent = `${comp.winrate.toFixed(1)}%`;
    row.appendChild(wr);

    card.appendChild(row);
    frag.appendChild(card);
  }

  gridEl.innerHTML = '';
  gridEl.appendChild(frag);
}
