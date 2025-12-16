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
