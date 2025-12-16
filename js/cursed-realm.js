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
