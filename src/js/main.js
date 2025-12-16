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
