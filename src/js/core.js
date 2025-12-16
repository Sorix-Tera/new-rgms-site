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
