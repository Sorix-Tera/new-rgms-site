// Supabase client setup (frontend uses anon/publishable key)
const supabaseUrl = 'https://iggoyupokxegkwyzehgr.supabase.co';
const supabaseKey = 'sb_publishable__QRANZjpgKeukonOerHJqg_CgCVm07r';
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Mode mapping based on screenshots.mode (channel slug)
const modeMeta = {
  'cr-brute':   { mainCode: 'cr', mainLabel: 'Cursed Realm', subCode: 'brute',   subLabel: 'Brute',   badgeShort: 'CR' },
  'cr-dune':    { mainCode: 'cr', mainLabel: 'Cursed Realm', subCode: 'dune',    subLabel: 'Dune',    badgeShort: 'CR' },
  'cr-shemira': { mainCode: 'cr', mainLabel: 'Cursed Realm', subCode: 'shemira', subLabel: 'Shemira', badgeShort: 'CR' },
  'cr-nemora':  { mainCode: 'cr', mainLabel: 'Cursed Realm', subCode: 'nemora',  subLabel: 'Nemora',  badgeShort: 'CR' },
  'cr-kane':    { mainCode: 'cr', mainLabel: 'Cursed Realm', subCode: 'kane',    subLabel: 'Kane',    badgeShort: 'CR' },
  'cr-idre':    { mainCode: 'cr', mainLabel: 'Cursed Realm', subCode: 'idre',    subLabel: 'Idre',    badgeShort: 'CR' },

  'nightmare-corridor': { mainCode: 'nc', mainLabel: 'Nightmare Corridor', subCode: 'nc-base', subLabel: 'Nightmare', badgeShort: 'NC' },

  'ts-fire':    { mainCode: 'ts', mainLabel: 'Treasure Scramble', subCode: 'fire',    subLabel: 'Fire',    badgeShort: 'TS' },
  'ts-fog':     { mainCode: 'ts', mainLabel: 'Treasure Scramble', subCode: 'fog',     subLabel: 'Fog',     badgeShort: 'TS' },
  'ts-fountain':{ mainCode: 'ts', mainLabel: 'Treasure Scramble', subCode: 'fountain',subLabel: 'Fountain',badgeShort: 'TS' },
  'ts-frost':   { mainCode: 'ts', mainLabel: 'Treasure Scramble', subCode: 'frost',   subLabel: 'Frost',   badgeShort: 'TS' },
  'ts-forest':  { mainCode: 'ts', mainLabel: 'Treasure Scramble', subCode: 'forest',  subLabel: 'Forest',  badgeShort: 'TS' },
};

function getModeInfo(slug) {
  const m = modeMeta[slug];
  if (m) return m;
  return {
    mainCode: 'other',
    mainLabel: 'Unknown Mode',
    subCode: slug || '',
    subLabel: slug || 'Unknown',
    badgeShort: '?',
  };
}

// Format date nicely
function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Format large damage numbers as 226B, 12.3T, etc.
function formatDamageShort(value) {
  if (value == null || isNaN(value)) return '';
  const num = Number(value);
  const abs = Math.abs(num);

  if (abs >= 1e12) {
    const v = num / 1e12;
    return (abs >= 10 * 1e12 ? v.toFixed(0) : v.toFixed(1)) + 'T';
  }
  if (abs >= 1e9) {
    const v = num / 1e9;
    return (abs >= 10 * 1e9 ? v.toFixed(0) : v.toFixed(1)) + 'B';
  }
  if (abs >= 1e6) {
    const v = num / 1e6;
    return (abs >= 10 * 1e6 ? v.toFixed(0) : v.toFixed(1)) + 'M';
  }
  if (abs >= 1e3) {
    const v = num / 1e3;
    return (abs >= 10 * 1e3 ? v.toFixed(0) : v.toFixed(1)) + 'K';
  }

  return String(num);
}

// Format seconds as mm:ss or hh:mm:ss for axis labels
function formatSecondsAsClock(value) {
  if (value == null || isNaN(value)) return '';
  let sec = Math.round(Number(value));
  if (sec < 0) sec = 0;

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const mm = String(m).padStart(1, '0');
  const ss = String(s).padStart(2, '0');

  if (h > 0) {
    const hh = String(h);
    return `${hh}:${String(m).padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// Parse damage strings like "193b", "12.3 T", "950M" into a numeric value
function parseDamageValue(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();

  const match = s.match(/([\d.,]+)\s*([kmbt])?/);
  if (!match) return null;

  let num = parseFloat(match[1].replace(/,/g, ''));
  if (Number.isNaN(num)) return null;

  const suffix = match[2];
  const multMap = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  const mult = suffix ? (multMap[suffix] || 1) : 1;

  return num * mult;
}

// Parse time strings like "1:13", "1m13s", "1 min 13 sec", "73s" -> seconds (number)
function parseTimeValue(str) {
  if (!str) return null;
  let s = String(str).trim().toLowerCase();

  // Case 1: format "mm:ss" or "hh:mm:ss"
  if (s.includes(':')) {
    const parts = s.split(':').map((p) => p.trim());
    const nums = parts.map((p) => parseInt(p.replace(/\D/g, ''), 10));
    if (nums.some((n) => Number.isNaN(n))) return null;

    if (nums.length === 2) {
      const [mm, ss] = nums;
      return mm * 60 + ss;
    }
    if (nums.length === 3) {
      const [hh, mm, ss] = nums;
      return hh * 3600 + mm * 60 + ss;
    }
  }

  // Case 2: "1m13s", "1 min 13 sec", etc.
  let totalSeconds = 0;
  let matchedAny = false;

  const hoursMatch = s.match(/(\d+)\s*(h|hr|hrs|hour|hours)/);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
    matchedAny = true;
  }

  const minutesMatch = s.match(/(\d+)\s*(m|min|mins|minute|minutes)/);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
    matchedAny = true;
  }

  const secondsMatch = s.match(/(\d+)\s*(s|sec|secs|second|seconds)/);
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1], 10);
    matchedAny = true;
  }

  if (matchedAny) return totalSeconds;

  // Case 3: just a plain number => seconds
  const plain = parseInt(s.replace(/\D/g, ''), 10);
  if (!Number.isNaN(plain)) return plain;

  return null;
}

// Parse rank strings into typed info:
// - "1234", "#1234", "Rank 1234"      -> { kind: 'numeric', value: 1234 }
// - "Top 1%", "top 10%", "t1%" etc.   -> { kind: 'percent', value: 1 / 10 / ... }
// - anything else                     -> { kind: 'unknown', value: null }
function parseRankInfo(str) {
  if (!str) return { kind: 'unknown', value: null };

  const s = String(str).toLowerCase();
  const noSpace = s.replace(/\s/g, '');

  // Percent-style: look for a "number %"
  const percentMatch = s.match(/(\d+)\s*%/);
  const hasTopWord =
    s.includes('top') ||
    /^t\d+%$/.test(noSpace) ||          // "t10%"
    /^t\s*\d+%$/.test(s);               // "t 10%"

  if (percentMatch && hasTopWord) {
    const v = parseInt(percentMatch[1], 10);
    if (!Number.isNaN(v)) {
      return { kind: 'percent', value: v };
    }
  }

  // Otherwise, try a plain numeric rank
  const numMatch = s.match(/(\d+)/);
  if (numMatch) {
    const v = parseInt(numMatch[1], 10);
    if (!Number.isNaN(v)) {
      return { kind: 'numeric', value: v };
    }
  }

  return { kind: 'unknown', value: null };
}

// Generic numeric value for graphs etc.
// Numeric ranks stay as-is, percent ranks are mapped after them.
function parseRankValue(str) {
  const info = parseRankInfo(str);
  if (info.kind === 'numeric') return info.value;
  if (info.kind === 'percent') {
    // Map percent ranks after any realistic numeric ranks
    // (assume numeric ranks won't exceed 100000)
    return 100 + info.value;
  }
  return null;
}

// Normalize image URLs: support image_urls (json/jsonb), image_urls as string, or legacy image_url
function getImageUrlsFromRow(row) {
  let raw = row.image_urls ?? row.image_url ?? null;
  if (!raw) return [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [raw];
    } catch {
      return [raw];
    }
  }

  return [];
}

// Chart.js plugin to draw values above points
// Chart.js plugin to draw values above points
const pointLabelPlugin = {
  id: 'pointLabelPlugin',
  afterDatasetsDraw(chart, args, pluginOptions) {
    const { ctx } = chart;
    const fontSize = pluginOptions.fontSize || 10;
    const fontFamily =
      pluginOptions.fontFamily ||
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const color = pluginOptions.color || '#ddd';
    const yOffset = pluginOptions.yOffset || 4;
    const modeType = (pluginOptions && pluginOptions.mode) || 'default';

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((element, index) => {
        const value = dataset.data[index];
        if (value == null) return;

        // Use same formatting as axis
        let labelText = '';
        if (modeType === 'cr') {
          labelText = formatDamageShort(value);
        } else if (modeType === 'nc') {
          labelText = formatSecondsAsClock(value);
        } else {
          labelText = String(value);
        }

        if (!labelText) return;

        const pos = element.tooltipPosition();
        ctx.save();
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText, pos.x, pos.y - yOffset);
        ctx.restore();
      });
    });
  },
};


document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------------------------------------
  // NAV DROPDOWNS (mobile/touch): toggle .nav-open on tap/click
  // Keeps desktop hover behavior unchanged (CSS handles hover).
  // ------------------------------------------------------------
  (function initMobileNavDropdowns() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    // Only enable click/tap toggling on touch/coarse-pointer devices
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (!isTouch) return;

    const dropdowns = () => Array.from(nav.querySelectorAll('.nav-item-dropdown'));

    function closeAll(except = null) {
      dropdowns().forEach((dd) => {
        if (dd === except) return;
        dd.classList.remove('nav-open');
        const btn = dd.querySelector('.nav-dropdown-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    function findTrigger(target) {
      // Support either your current span trigger OR a button trigger (if you switched HTML)
      return (
        target.closest('.nav-dropdown-toggle') ||
        target.closest('.nav-item-dropdown > span')
      );
    }

    function toggleDropdown(dd, triggerEl) {
      const willOpen = !dd.classList.contains('nav-open');
      if (willOpen) {
        closeAll(dd);
        dd.classList.add('nav-open');
      } else {
        dd.classList.remove('nav-open');
      }

      if (triggerEl && triggerEl.classList && triggerEl.classList.contains('nav-dropdown-toggle')) {
        triggerEl.setAttribute('aria-expanded', String(willOpen));
      }
    }

    // Tap/click on trigger toggles
    nav.addEventListener('click', (e) => {
      const trigger = findTrigger(e.target);
      if (!trigger) return;

      const dd = trigger.closest('.nav-item-dropdown');
      if (!dd) return;

      e.preventDefault();
      e.stopPropagation();
      toggleDropdown(dd, trigger);
    });

    // Keyboard support for span triggers if you added tabindex/role
    nav.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const trigger = findTrigger(e.target);
      if (!trigger) return;

      const dd = trigger.closest('.nav-item-dropdown');
      if (!dd) return;

      e.preventDefault();
      e.stopPropagation();
      toggleDropdown(dd, trigger);
    });

    // Clicking a dropdown link closes all (then navigation proceeds)
    nav.addEventListener('click', (e) => {
      const link = e.target.closest('.nav-dropdown-menu a');
      if (!link) return;
      closeAll();
      // do not preventDefault here; allow navigation
    });

    // Tap/click outside closes
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) closeAll();
    });

    // Escape closes (harmless even if your lightbox also listens to Escape)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  })();

  // --- HOMEPAGE LOGIC ---
  const entriesGrid = document.getElementById('entriesGrid');
  const loadStatus = document.getElementById('loadStatus');
  const modeFilter = document.getElementById('modeFilter');
  const submodeFilter = document.getElementById('submodeFilter');
  const searchInput = document.getElementById('searchPlayer');
  const visibleCountBadge = document.getElementById('visibleCount');

  if (entriesGrid && loadStatus && modeFilter && submodeFilter && searchInput && visibleCountBadge) {
    const allSubOptions = Array.from(submodeFilter.querySelectorAll('option'));
    let cards = [];

    function updateSubmodeOptions() {
      const modeVal = modeFilter.value;
      submodeFilter.value = '';
      allSubOptions.forEach((opt) => {
        if (!opt.value) {
          opt.hidden = false;
          return;
        }
        const optMode = opt.dataset.mode;
        if (!modeVal) {
          opt.hidden = false;
        } else {
          opt.hidden = optMode !== modeVal;
        }
      });
    }

    function applyFilters() {
      const modeVal = modeFilter.value;
      const submodeVal = submodeFilter.value;
      const searchVal = searchInput.value.trim().toLowerCase();

      let visibleCount = 0;

      cards.forEach((card) => {
        const cardMode = card.dataset.mode;
        const cardSub = card.dataset.submode;
        const playerName = (card.dataset.player || '').toLowerCase();

        let visible = true;

        if (modeVal && cardMode !== modeVal) visible = false;
        if (submodeVal && cardSub !== submodeVal) visible = false;
        if (searchVal && !playerName.includes(searchVal)) visible = false;

        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      visibleCountBadge.textContent =
        visibleCount === 1 ? '1 entry' : `${visibleCount} entries`;
    }

    function createEntryCard(row) {
      const modeInfo = getModeInfo(row.mode);
      const displayName = row.name || row.discord_name || 'Unknown';

      const region = row.region || '—';
      const metric = row.content || '';

      const urls = getImageUrlsFromRow(row);
      const mainImageUrl = urls[0] || null;

      const createdLabel = formatDate(row.created_at);

      const article = document.createElement('article');
      article.className = 'entry-card';
      article.dataset.mode = modeInfo.mainCode;
      article.dataset.submode = modeInfo.subCode;
      article.dataset.player = displayName;
      article.dataset.playerId = row.discord_id || '';

      const thumbWrapper = document.createElement('div');
      thumbWrapper.className = 'entry-thumbnail-wrapper';

      if (mainImageUrl) {
        const img = document.createElement('img');
        img.className = 'entry-thumbnail-img';
        img.src = mainImageUrl;
        img.alt = `${displayName} screenshot`;
        img.loading = 'lazy';
        thumbWrapper.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'entry-thumbnail-placeholder';
        thumbWrapper.appendChild(placeholder);
      }

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

      const playerDiv = document.createElement('div');
      playerDiv.className = 'entry-player';
      playerDiv.textContent = displayName;
      mainDiv.appendChild(playerDiv);

      const metaLine = document.createElement('div');
      metaLine.className = 'entry-meta-line';

      const metaLeft = document.createElement('div');
      metaLeft.className = 'entry-meta-left';

      const regionSpan = document.createElement('span');
      regionSpan.className = 'pill-region';
      regionSpan.textContent = region;
      metaLeft.appendChild(regionSpan);

      if (metric) {
        const metricSpan = document.createElement('span');
        metricSpan.className = 'pill-rank';
        metricSpan.textContent = metric;
        metaLeft.appendChild(metricSpan);
      }

      const dateSpan = document.createElement('span');
      dateSpan.className = 'entry-meta-date';
      dateSpan.textContent = createdLabel;

      metaLine.appendChild(metaLeft);
      metaLine.appendChild(dateSpan);
      mainDiv.appendChild(metaLine);

      const footer = document.createElement('div');
      footer.className = 'entry-footer';

      const footerLabel = document.createElement('span');
      footerLabel.className = 'entry-footer-label';
      if (modeInfo.mainCode === 'nc') {
        footerLabel.textContent = 'Nightmare Corridor';
      } else if (modeInfo.mainCode === 'other') {
        footerLabel.textContent = modeInfo.subLabel;
      } else {
        footerLabel.textContent = `${modeInfo.mainLabel} · ${modeInfo.subLabel}`;
      }

      const linkSpan = document.createElement('span');
      linkSpan.className = 'entry-link';
      linkSpan.innerHTML = 'View details<span>↗</span>';

      footer.appendChild(footerLabel);
      footer.appendChild(linkSpan);

      article.appendChild(thumbWrapper);
      article.appendChild(mainDiv);
      article.appendChild(footer);

      // Go to player details for this mode
      article.addEventListener('click', () => {
        const modeSlug = row.mode || '';
        const keyField = row.name ? 'name' : 'discord_id';
        const keyValue = row.name || row.discord_id || '';
        if (!modeSlug || !keyValue) return;
        const url = `details.html?mode=${encodeURIComponent(
          modeSlug
        )}&field=${encodeURIComponent(keyField)}&key=${encodeURIComponent(keyValue)}`;
        window.location.href = url;
      });

      return article;
    }

    async function loadEntries() {
      loadStatus.textContent = 'Loading latest screenshots from Supabase...';

      try {
        const { data, error } = await supabaseClient
          .from('screenshots')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Supabase error:', error);
          loadStatus.textContent = 'Error loading data from Supabase: ' + error.message;
          return;
        }

        if (!data || data.length === 0) {
          loadStatus.textContent = 'No screenshots yet. Be the first to post in Discord!';
          visibleCountBadge.textContent = '0 entries';
          return;
        }

        loadStatus.textContent = '';
        entriesGrid.innerHTML = '';

        cards = data.map((row) => {
          const card = createEntryCard(row);
          entriesGrid.appendChild(card);
          return card;
        });

        applyFilters();
      } catch (err) {
        console.error(err);
        loadStatus.textContent = 'Unexpected error while loading data.';
      }
    }

    modeFilter.addEventListener('change', () => {
      updateSubmodeOptions();
      applyFilters();
    });
    submodeFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    updateSubmodeOptions();
    loadEntries();
  }



  // --- CONSOLIDATED LEADERBOARD PAGE (CR/TS/NC) ---

  const lbRoot = document.getElementById('leaderboardPage');
  const lbTable = document.getElementById('leaderboardTable');
  const lbSearchInput = document.getElementById('leaderboardSearchPlayer');
  const lbStats = document.getElementById('leaderboardStats');
  const lbStatus = document.getElementById('leaderboardLoadStatus');
  const lbTitle = document.getElementById('leaderboardTitle');
  const lbSubtitle = document.getElementById('leaderboardSubtitle');

  if (lbRoot && lbTable && lbSearchInput && lbStats && lbStatus && lbTitle && lbSubtitle) {
    initLeaderboardPage(lbTable, lbSearchInput, lbStats, lbStatus, lbTitle, lbSubtitle);
  }

  // --- CURSED REALM RANKING PAGES ---

  const crTable = document.getElementById('crRankingTable');
  const crMode = crTable?.dataset.crMode;
  const crSearchInput = document.getElementById('crSearchPlayer');
  const crStats = document.getElementById('crStats');
  const crStatus = document.getElementById('crLoadStatus');

  if (crTable && crMode && crSearchInput && crStats && crStatus) {
    initCursedRealmPage(crMode, crTable, crSearchInput, crStats, crStatus);
  }

  // --- NIGHTMARE CORRIDOR RANKING PAGE ---

  const ncTable = document.getElementById('ncRankingTable');
  const ncSearchInput = document.getElementById('ncSearchPlayer');
  const ncStats = document.getElementById('ncStats');
  const ncStatus = document.getElementById('ncLoadStatus');

  if (ncTable && ncSearchInput && ncStats && ncStatus) {
    initNightmarePage(ncTable, ncSearchInput, ncStats, ncStatus);
  }

  // --- TREASURE SCRAMBLE RANKING PAGES ---

  const tsTable = document.getElementById('tsRankingTable');
  const tsMode = tsTable?.dataset.tsMode;
  const tsSearchInput = document.getElementById('tsSearchPlayer');
  const tsStats = document.getElementById('tsStats');
  const tsStatus = document.getElementById('tsLoadStatus');

  if (tsTable && tsMode && tsSearchInput && tsStats && tsStatus) {
    initTreasurePage(tsMode, tsTable, tsSearchInput, tsStats, tsStatus);
  }

  // --- PLAYER DETAIL PAGE ---

  const detailRoot = document.getElementById('playerDetailPage');
  if (detailRoot) {
    initDetailPage();
  }
});


// Consolidated leaderboard page logic (CR/TS/NC) via leaderboard.html?mode=<slug>
async function initLeaderboardPage(table, searchInput, statsEl, statusEl, titleEl, subtitleEl) {
  const params = new URLSearchParams(window.location.search);
  let mode = (params.get('mode') || '').trim();

  // Default mode if none/invalid
  if (!modeMeta[mode]) {
    mode = 'cr-brute';
  }

  const info = getModeInfo(mode);

  // Title + subtitle
  if (info.mainCode === 'cr') {
    titleEl.textContent = `${info.mainLabel} · ${info.subLabel}`;
    subtitleEl.textContent =
      `Damage rankings for the ${info.subLabel} boss in Cursed Realm. Each account is listed once, using their latest submission.`;
  } else if (info.mainCode === 'ts') {
    titleEl.textContent = `${info.mainLabel} · ${info.subLabel}`;
    subtitleEl.textContent =
      `Rank-based leaderboard for the ${info.subLabel} field in Treasure Scramble. Each account is listed once, using their latest submission.`;
  } else if (info.mainCode === 'nc') {
    titleEl.textContent = 'Nightmare Corridor';
    subtitleEl.textContent =
      'Time rankings for Nightmare Corridor. Each account is listed once, using their latest submission.';
  } else {
    titleEl.textContent = 'Leaderboard';
    subtitleEl.textContent = 'Unknown mode. Please pick a mode from the header menu.';
  }

  // Build table header for the selected mode
  const thead = table.querySelector('thead');
  if (thead) {
    if (info.mainCode === 'ts') {
      thead.innerHTML = `
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Region</th>
          <th>Rank</th>
          <th>Last update</th>
        </tr>
      `;
    } else if (info.mainCode === 'nc') {
      thead.innerHTML = `
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Time</th>
          <th>Last update</th>
        </tr>
      `;
    } else {
      thead.innerHTML = `
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Damage</th>
          <th>Last update</th>
        </tr>
      `;
    }
  }

  statusEl.textContent = 'Loading rankings from Supabase...';

  try {
    const { data, error } = await supabaseClient
      .from('screenshots')
      .select('*')
      .eq('mode', mode)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Supabase error (Leaderboard):', error);
      statusEl.textContent = 'Error loading data from Supabase: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      statusEl.textContent = 'No submissions yet for this mode.';
      statsEl.textContent = '0 players';
      return;
    }

    // Keep latest row per account (keyed by explicit name if present, else discord id)
    const byKey = new Map();
    for (const row of data) {
      const key = row.name || row.discord_id;
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
      } else {
        const tNew = new Date(row.created_at).getTime();
        const tOld = new Date(existing.created_at).getTime();
        if (tNew > tOld) byKey.set(key, row);
      }
    }

    const rows = Array.from(byKey.values());
    let entries = [];

    if (info.mainCode === 'ts') {
      entries = rows.map((row) => {
        const displayName = row.name || row.discord_name || 'Unknown';
        const regionStr = row.region || '—';
        const rankStr = row.content || '';
        const rankInfo = parseRankInfo(rankStr);
        return {
          row,
          displayName,
          regionStr,
          metricStr: rankStr,
          kind: rankInfo.kind,   // numeric | percent | unknown
          value: rankInfo.value, // number|null
        };
      });

      const orderKind = { numeric: 0, percent: 1, unknown: 2 };

      entries.sort((a, b) => {
        const ak = orderKind[a.kind] ?? 2;
        const bk = orderKind[b.kind] ?? 2;
        if (ak !== bk) return ak - bk;

        const av = a.value;
        const bv = b.value;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return av - bv; // smaller is better
      });
    } else if (info.mainCode === 'nc') {
      entries = rows.map((row) => {
        const displayName = row.name || row.discord_name || 'Unknown';
        const timeStr = row.content || '';
        const timeValue = parseTimeValue(timeStr);
        return {
          row,
          displayName,
          metricStr: timeStr,
          value: timeValue,
        };
      });

      entries.sort((a, b) => {
        const av = a.value;
        const bv = b.value;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return av - bv; // smaller is better
      });
    } else {
      // CR / default: damage
      entries = rows.map((row) => {
        const displayName = row.name || row.discord_name || 'Unknown';
        const dmgStr = row.content || '';
        const dmgValue = parseDamageValue(dmgStr);
        return {
          row,
          displayName,
          metricStr: dmgStr,
          value: dmgValue,
        };
      });

      entries.sort((a, b) => {
        const av = a.value;
        const bv = b.value;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return bv - av; // larger is better
      });
    }

    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    entries.forEach((entry, index) => {
      const { row, displayName, metricStr } = entry;

      const tr = document.createElement('tr');
      tr.dataset.player = displayName.toLowerCase();
      tr.dataset.playerId = row.discord_id || '';

      const posTd = document.createElement('td');
      posTd.className = 'cr-td-rank';
      posTd.textContent = index + 1;

      const nameTd = document.createElement('td');
      nameTd.className = 'cr-td-name';
      nameTd.textContent = displayName;

      tr.appendChild(posTd);
      tr.appendChild(nameTd);

      if (info.mainCode === 'ts') {
        const regionTd = document.createElement('td');
        regionTd.className = 'cr-td-region';
        regionTd.textContent = entry.regionStr || '—';
        tr.appendChild(regionTd);
      }

      const metricTd = document.createElement('td');
      metricTd.className = 'cr-td-damage';
      metricTd.textContent = metricStr || '—';

      const updatedTd = document.createElement('td');
      updatedTd.className = 'cr-td-updated';
      updatedTd.textContent = formatDate(row.created_at);

      tr.appendChild(metricTd);
      tr.appendChild(updatedTd);

      tr.addEventListener('click', () => {
        const keyField = row.name ? 'name' : 'discord_id';
        const keyValue = row.name || row.discord_id || '';
        if (!mode || !keyValue) return;
        const url = `details.html?mode=${encodeURIComponent(mode)}&field=${encodeURIComponent(
          keyField
        )}&key=${encodeURIComponent(keyValue)}`;
        window.location.href = url;
      });

      tbody.appendChild(tr);
    });

    statsEl.textContent = entries.length === 1 ? '1 player' : `${entries.length} players`;
    statusEl.textContent = '';

    // Search filter
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      Array.from(tbody.querySelectorAll('tr')).forEach((tr) => {
        const name = tr.dataset.player || '';
        const visible = !q || name.includes(q);
        tr.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });
      statsEl.textContent = visibleCount === 1 ? '1 player' : `${visibleCount} players`;
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Unexpected error while loading data.';
  }
}


// Cursed Realm page logic
async function initCursedRealmPage(crMode, crTable, crSearchInput, crStats, crStatus) {
  crStatus.textContent = 'Loading rankings from Supabase...';

  try {
    const { data, error } = await supabaseClient
      .from('screenshots')
      .select('*')
      .eq('mode', crMode)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Supabase error (CR):', error);
      crStatus.textContent = 'Error loading data from Supabase: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      crStatus.textContent = 'No submissions yet for this boss.';
      crStats.textContent = '0 players';
      return;
    }

    const byKey = new Map();
    for (const row of data) {
      const key = row.name || row.discord_id;
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
      } else {
        const tNew = new Date(row.created_at).getTime();
        const tOld = new Date(existing.created_at).getTime();
        if (tNew > tOld) {
          byKey.set(key, row);
        }
      }
    }

    const entries = Array.from(byKey.values()).map((row) => {
      const displayName = row.name || row.discord_name || 'Unknown';
      const damageStr = row.content || '';
      const damageValue = parseDamageValue(damageStr);
      return {
        row,
        displayName,
        damageStr,
        damageValue,
      };
    });

    entries.sort((a, b) => {
      const av = a.damageValue;
      const bv = b.damageValue;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });

    const tbody = crTable.querySelector('tbody');
    tbody.innerHTML = '';

    entries.forEach((entry, index) => {
      const { row, displayName, damageStr } = entry;

      const tr = document.createElement('tr');
      tr.dataset.player = displayName.toLowerCase();
      tr.dataset.playerId = row.discord_id || '';

      const rankTd = document.createElement('td');
      rankTd.className = 'cr-td-rank';
      rankTd.textContent = index + 1;

      const nameTd = document.createElement('td');
      nameTd.className = 'cr-td-name';
      nameTd.textContent = displayName;

      const dmgTd = document.createElement('td');
      dmgTd.className = 'cr-td-damage';
      dmgTd.textContent = damageStr || '—';

      const updatedTd = document.createElement('td');
      updatedTd.className = 'cr-td-updated';
      updatedTd.textContent = formatDate(row.created_at);

      tr.appendChild(rankTd);
      tr.appendChild(nameTd);
      tr.appendChild(dmgTd);
      tr.appendChild(updatedTd);

      tr.addEventListener('click', () => {
        const keyField = row.name ? 'name' : 'discord_id';
        const keyValue = row.name || row.discord_id || '';
        if (!crMode || !keyValue) return;
        const url = `details.html?mode=${encodeURIComponent(
          crMode
        )}&field=${encodeURIComponent(keyField)}&key=${encodeURIComponent(keyValue)}`;
        window.location.href = url;
      });

      tbody.appendChild(tr);
    });

    crStats.textContent =
      entries.length === 1 ? '1 player' : `${entries.length} players`;
    crStatus.textContent = '';

    crSearchInput.addEventListener('input', () => {
      const q = crSearchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      Array.from(tbody.querySelectorAll('tr')).forEach((tr) => {
        const name = tr.dataset.player || '';
        const visible = !q || name.includes(q);
        tr.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });
      crStats.textContent =
        visibleCount === 1 ? '1 player' : `${visibleCount} players`;
    });
  } catch (err) {
    console.error(err);
    crStatus.textContent = 'Unexpected error while loading data.';
  }
}

// Nightmare Corridor page logic
async function initNightmarePage(ncTable, ncSearchInput, ncStats, ncStatus) {
  ncStatus.textContent = 'Loading rankings from Supabase...';

  try {
    const { data, error } = await supabaseClient
      .from('screenshots')
      .select('*')
      .eq('mode', 'nightmare-corridor')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Supabase error (NC):', error);
      ncStatus.textContent = 'Error loading data from Supabase: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      ncStatus.textContent = 'No submissions yet for Nightmare Corridor.';
      ncStats.textContent = '0 players';
      return;
    }

    const byKey = new Map();
    for (const row of data) {
      const key = row.name || row.discord_id;
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
      } else {
        const tNew = new Date(row.created_at).getTime();
        const tOld = new Date(existing.created_at).getTime();
        if (tNew > tOld) {
          byKey.set(key, row);
        }
      }
    }

    const entries = Array.from(byKey.values()).map((row) => {
      const displayName = row.name || row.discord_name || 'Unknown';
      const timeStr = row.content || '';
      const timeValue = parseTimeValue(timeStr);
      return {
        row,
        displayName,
        timeStr,
        timeValue,
      };
    });

    entries.sort((a, b) => {
      const av = a.timeValue;
      const bv = b.timeValue;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    });

    const tbody = ncTable.querySelector('tbody');
    tbody.innerHTML = '';

    entries.forEach((entry, index) => {
      const { row, displayName, timeStr } = entry;

      const tr = document.createElement('tr');
      tr.dataset.player = displayName.toLowerCase();
      tr.dataset.playerId = row.discord_id || '';

      const rankTd = document.createElement('td');
      rankTd.className = 'cr-td-rank';
      rankTd.textContent = index + 1;

      const nameTd = document.createElement('td');
      nameTd.className = 'cr-td-name';
      nameTd.textContent = displayName;

      const timeTd = document.createElement('td');
      timeTd.className = 'cr-td-damage';
      timeTd.textContent = timeStr || '—';

      const updatedTd = document.createElement('td');
      updatedTd.className = 'cr-td-updated';
      updatedTd.textContent = formatDate(row.created_at);

      tr.appendChild(rankTd);
      tr.appendChild(nameTd);
      tr.appendChild(timeTd);
      tr.appendChild(updatedTd);

      tr.addEventListener('click', () => {
        const keyField = row.name ? 'name' : 'discord_id';
        const keyValue = row.name || row.discord_id || '';
        const modeSlug = 'nightmare-corridor';
        if (!modeSlug || !keyValue) return;
        const url = `details.html?mode=${encodeURIComponent(
          modeSlug
        )}&field=${encodeURIComponent(keyField)}&key=${encodeURIComponent(keyValue)}`;
        window.location.href = url;
      });

      tbody.appendChild(tr);
    });

    ncStats.textContent =
      entries.length === 1 ? '1 player' : `${entries.length} players`;
    ncStatus.textContent = '';

    ncSearchInput.addEventListener('input', () => {
      const q = ncSearchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      Array.from(tbody.querySelectorAll('tr')).forEach((tr) => {
        const name = tr.dataset.player || '';
        const visible = !q || name.includes(q);
        tr.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });
      ncStats.textContent =
        visibleCount === 1 ? '1 player' : `${visibleCount} players`;
    });
  } catch (err) {
    console.error(err);
    ncStatus.textContent = 'Unexpected error while loading data.';
  }
}

// Treasure Scramble page logic
async function initTreasurePage(tsMode, tsTable, tsSearchInput, tsStats, tsStatus) {
  tsStatus.textContent = 'Loading rankings from Supabase...';

  try {
    const { data, error } = await supabaseClient
      .from('screenshots')
      .select('*')
      .eq('mode', tsMode)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Supabase error (TS):', error);
      tsStatus.textContent = 'Error loading data from Supabase: ' + error.message;
      return;
    }

    if (!data || data.length === 0) {
      tsStatus.textContent = 'No submissions yet for this Treasure Scramble field.';
      tsStats.textContent = '0 players';
      return;
    }

    const byKey = new Map();
    for (const row of data) {
      const key = row.name || row.discord_id;
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
      } else {
        const tNew = new Date(row.created_at).getTime();
        const tOld = new Date(existing.created_at).getTime();
        if (tNew > tOld) {
          byKey.set(key, row);
        }
      }
    }

    const entries = Array.from(byKey.values()).map((row) => {
      const displayName = row.name || row.discord_name || 'Unknown';
      const regionStr = row.region || '—';
      const rankStr = row.content || '';
    
      const rankInfo = parseRankInfo(rankStr);
    
      return {
        row,
        displayName,
        regionStr,
        rankStr,
        rankKind: rankInfo.kind,   // 'numeric' | 'percent' | 'unknown'
        rankValue: rankInfo.value, // number or null
      };
    });
    
    // Sort order (global logic for "ranking" semantics):
    // 1) numeric ranks (smaller number = better)
    // 2) percent ranks (smaller percent = better; Top 1% before Top 2%)
    // 3) unknown / unparsed last
    entries.sort((a, b) => {
      const orderKind = { numeric: 0, percent: 1, unknown: 2 };
    
      const ak = orderKind[a.rankKind] ?? 2;
      const bk = orderKind[b.rankKind] ?? 2;
    
      if (ak !== bk) return ak - bk;
    
      const av = a.rankValue;
      const bv = b.rankValue;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    });

    const tbody = tsTable.querySelector('tbody');
    tbody.innerHTML = '';

    entries.forEach((entry, index) => {
      const { row, displayName, regionStr, rankStr } = entry;

      const tr = document.createElement('tr');
      tr.dataset.player = displayName.toLowerCase();
      tr.dataset.playerId = row.discord_id || '';

      const posTd = document.createElement('td');
      posTd.className = 'cr-td-rank';
      posTd.textContent = index + 1;

      const nameTd = document.createElement('td');
      nameTd.className = 'cr-td-name';
      nameTd.textContent = displayName;

      const regionTd = document.createElement('td');
      regionTd.className = 'cr-td-region';
      regionTd.textContent = regionStr;

      const rankTd = document.createElement('td');
      rankTd.className = 'cr-td-damage';
      rankTd.textContent = rankStr || '—';

      const updatedTd = document.createElement('td');
      updatedTd.className = 'cr-td-updated';
      updatedTd.textContent = formatDate(row.created_at);

      tr.appendChild(posTd);
      tr.appendChild(nameTd);
      tr.appendChild(regionTd);
      tr.appendChild(rankTd);
      tr.appendChild(updatedTd);

      tr.addEventListener('click', () => {
        const keyField = row.name ? 'name' : 'discord_id';
        const keyValue = row.name || row.discord_id || '';
        if (!tsMode || !keyValue) return;
        const url = `details.html?mode=${encodeURIComponent(
          tsMode
        )}&field=${encodeURIComponent(keyField)}&key=${encodeURIComponent(keyValue)}`;
        window.location.href = url;
      });

      tbody.appendChild(tr);
    });

    tsStats.textContent =
      entries.length === 1 ? '1 player' : `${entries.length} players`;
    tsStatus.textContent = '';

    tsSearchInput.addEventListener('input', () => {
      const q = tsSearchInput.value.trim().toLowerCase();
      let visibleCount = 0;
      Array.from(tbody.querySelectorAll('tr')).forEach((tr) => {
        const name = tr.dataset.player || '';
        const visible = !q || name.includes(q);
        tr.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });
      tsStats.textContent =
        visibleCount === 1 ? '1 player' : `${visibleCount} players`;
    });
  } catch (err) {
    console.error(err);
    tsStatus.textContent = 'Unexpected error while loading data.';
  }
}

// Player detail page logic
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
  await loadAndRenderCompsSummary({ mode, field, value: key });
  
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
          const caption = metricStr
            ? `${createdLabel} · ${metricStr}`
            : createdLabel;
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
  const statusEl = document.getElementById("detailCompsStatus");
  const gridEl = document.getElementById("detailCompsGrid");
  const sectionEl = document.getElementById("detailCompsSection");
  if (!statusEl || !gridEl || !sectionEl) return;

  // Hide/clear until we know we have something
  gridEl.innerHTML = "";
  statusEl.textContent = "Loading comps summary…";

  if (!mode) {
    statusEl.textContent = "No mode found; comps summary unavailable.";
    return;
  }
  
  // If field=name => filter by name, else filter by discord_id
  const useName = (field || "").toLowerCase() === "name";
  const filterCol = useName ? "name" : "discord_id";
  const filterVal = (value || "").trim();

  if (!filterVal) {
    statusEl.textContent = "No player identifier found; comps summary unavailable.";
    return;
  }

  // Pull comps
  // NOTE: requires comps.mode to exist
  let q = supabaseClient
    .from("comps")
    .select("heroes,pet,winrate")
    .eq("mode", mode)
    .eq(filterCol, filterVal);

  const { data, error } = await q;
  if (error) {
    console.error("Comps query error:", error);
    statusEl.textContent = "Failed to load comps summary.";
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    statusEl.textContent = "No comps found for this player.";
    return;
  }

  // Group by heroes+pet, average winrate
  const grouped = new Map(); // key -> { heroes, pet, sum, n }
  for (const r of rows) {
    const heroesStr = (r.heroes || "").trim();
    const petStr = (r.pet || "").trim();

    // Parse winrate numeric; skip if not valid
    const w = Number(r.winrate);
    if (!Number.isFinite(w)) continue;

    // Skip comps with too many UNKNOWN heroes (count after normalize-to-5)
    let heroesArr = parseHeroesList(heroesStr).map(h => (h || "").trim().toLowerCase());
    
    // enforce exactly 5 slots (missing slots count as unknown)
    heroesArr = heroesArr.slice(0, 5);
    while (heroesArr.length < 5) heroesArr.push("unknown");
    
    const unknownCount = heroesArr.filter(h => isUnknownName(h)).length;
    if (unknownCount > 2) continue;

    const groupKey = `${heroesStr}||${petStr}`;
    const cur = grouped.get(groupKey);
    if (!cur) {
      grouped.set(groupKey, { heroes: heroesStr, pet: petStr, sum: w, n: 1 });
    } else {
      cur.sum += w;
      cur.n += 1;
    }
  }

  if (grouped.size === 0) {
    statusEl.textContent = "No usable comps (winrate/UNKNOWN filtering removed all).";
    return;
  }

  const comps = Array.from(grouped.values()).map(x => ({
    heroes: x.heroes,
    pet: x.pet,
    winrate: x.sum / x.n,
    n: x.n
  }));

  comps.sort((a, b) => b.winrate - a.winrate);

  statusEl.textContent = `Showing ${comps.length} unique comps (grouped by heroes + pet), sorted by winrate.`;
  renderCompsGrid(gridEl, comps);
}

function parseHeroesList(heroesStr) {
  // Stored format: "hero1 - hero2 - hero3 - hero4 - hero5"
  // Use a tolerant split and trim.
  if (!heroesStr) return [];
  return heroesStr.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
}

function isUnknownName(name) {
  return !name || name.trim().toLowerCase() === "unknown";
}

function iconUrlForHero(name) {
  const n = (name || "").trim().toLowerCase();
  if (!n || n === "unknown") return "icons/heroes2/unknown.png";
  return `icons/heroes2/${n}.jpg`;
}

function iconUrlForPet(name) {
  const n = (name || "").trim().toLowerCase();
  if (!n || n === "unknown") return "icons/pets/unknown.png";
  return `icons/pets/${n}.jpg`;
}

function renderCompsGrid(gridEl, comps) {
  const frag = document.createDocumentFragment();

  for (const comp of comps) {
    const card = document.createElement("div");
    card.className = "comp-card";

    const row = document.createElement("div");
    row.className = "comp-row";

    const heroes = parseHeroesList(comp.heroes);
    // Ensure exactly 5 slots if your string is malformed
    while (heroes.length < 5) heroes.push("unknown");

    for (let i = 0; i < 5; i++) {
      const img = document.createElement("img");
      img.className = "comp-icon";
      img.loading = "lazy";
      img.alt = heroes[i] || "unknown";
      img.src = iconUrlForHero(heroes[i]);
      img.onerror = () => { img.src = "icons/heroes2/unknown.png"; };
      row.appendChild(img);
    }

    // Pet icon
    const petImg = document.createElement("img");
    petImg.className = "comp-icon";
    petImg.loading = "lazy";
    petImg.alt = comp.pet || "unknown";
    petImg.src = iconUrlForPet(comp.pet);
    petImg.onerror = () => { petImg.src = "icons/pets/unknown.png"; };
    row.appendChild(petImg);

    // Winrate
    const wr = document.createElement("span");
    wr.className = "comp-winrate";
    wr.textContent = `${comp.winrate.toFixed(1)}%`;
    row.appendChild(wr);

    card.appendChild(row);
    frag.appendChild(card);
  }

  gridEl.innerHTML = "";
  gridEl.appendChild(frag);
}
