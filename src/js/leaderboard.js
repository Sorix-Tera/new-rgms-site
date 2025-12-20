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
          <th>Region</th>
          <th>Time</th>
          <th>Last update</th>
        </tr>
      `;
    } else {
      thead.innerHTML = `
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Region</th>
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
        const regionStr = row.region || '—';
        const timeStr = row.content || '';
        const timeValue = parseTimeValue(timeStr);
        return {
          row,
          displayName,
          regionStr,
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
        const regionStr = row.region || '—';
        const dmgStr = row.content || '';
        const dmgValue = parseDamageValue(dmgStr);
        return {
          row,
          displayName,
          regionStr,
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

      const regionTd = document.createElement('td');
      regionTd.className = 'cr-td-region';
      regionTd.textContent = entry.regionStr || '—';
      tr.appendChild(regionTd);

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
