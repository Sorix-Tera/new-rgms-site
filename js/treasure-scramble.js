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
