/* =============================================================================
   Accru AI Hub - Claude usage and adoption dashboard
   Prototype application layer

   Buildless on purpose. Classic scripts, no modules, so the file opens straight
   from disk. Everything a developer needs to reproduce this in production is
   either here or in the provenance panels on each screen.
   ============================================================================= */

(function () {
  'use strict';

  const A = window.ACCRU;
  const F = A.fmt;
  const P = A.products.length;
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===========================================================================
     1. Chart palette and ECharts theme

     The dashboard runs on a dark command surface rather than the light document
     surface of the design system. That is a deliberate divergence, argued in the
     handoff notes: this is an operations screen watched at a glance, not a page
     read start to finish, and luminous data on black is what makes a small
     change in a small chart catch the eye across a room.

     Every colour the charts use lives in this one object. Nothing downstream
     hardcodes a hex value, so retheming means editing this block and the token
     list in the stylesheet, and nothing else.
     =========================================================================== */
  const C = {
    ink: '#f4ece6',
    muted: '#ab958a',
    faint: '#7e6a60',
    rule: '#33261f',
    grid: 'rgba(255,138,76,.10)',      /* split lines, kept warm and very low */
    surface: '#1b1512',
    void: '#0d0a09',
    action: '#ff7a3c',
    actionSoft: 'rgba(255,122,60,.16)',
    heading: '#ffc9a3',
    success: '#3ddc97',
    warning: '#ffc247',
    danger: '#ff6257',
    dangerSoft: 'rgba(255,98,87,.07)',
    /* Categorical fallback. Series normally take their colour from the country,
       product or model record so the same entity is the same colour everywhere. */
    categorical: ['#ff7a3c', '#5cc8ff', '#2fd0b2', '#ffc247', '#c98bff', '#ff6b5e'],
    /* Heat ramp for the activity calendar. Starts just above the panel surface
       so an empty day reads as absence rather than as a low value. */
    sequential: ['#3a2519', '#5c3218', '#8f4718', '#c2601a', '#ee8a2b', '#ffc247'],
    calendarEmpty: '#1f1815'
  };
  /* Kept as loose bindings because the rest of the file already reads them. */
  const INK = C.ink, MUTED = C.muted, RULE = C.rule;
  const CATEGORICAL = C.categorical, SEQUENTIAL = C.sequential;

  echarts.registerTheme('accru', {
    color: CATEGORICAL,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Raleway, Calibri, Arial, sans-serif', color: C.ink },
    title: { textStyle: { fontFamily: 'Gelasio, Georgia, serif', color: C.heading } },
    grid: { borderColor: C.rule },
    categoryAxis: {
      axisLine: { lineStyle: { color: C.rule } },
      axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 11 },
      splitLine: { show: false }
    },
    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: C.grid, type: 'dashed' } }
    },
    legend: { textStyle: { color: C.muted, fontSize: 12 }, itemGap: 16, icon: 'roundRect',
      itemWidth: 12, itemHeight: 12, inactiveColor: C.faint },
    tooltip: {
      backgroundColor: 'rgba(20,16,14,.96)', borderColor: 'rgba(255,138,76,.34)', borderWidth: 1,
      textStyle: { color: C.ink, fontSize: 12 },
      extraCssText: 'box-shadow:0 12px 40px rgba(0,0,0,.66);backdrop-filter:blur(6px);' +
                    'border-radius:8px;font-variant-numeric:tabular-nums;'
    }
  });

  const charts = {};
  function chart(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    /* Panels that are rebuilt through innerHTML get a brand new container node.
       The cached instance is then bound to a detached element and silently stops
       drawing, so dispose it and start again. */
    const cached = charts[id];
    if (cached && cached.getDom() !== el) { cached.dispose(); delete charts[id]; }
    if (!charts[id]) charts[id] = echarts.init(el, 'accru', { renderer: 'canvas' });
    return charts[id];
  }
  function draw(id, option) {
    const c = chart(id);
    if (!c) return;
    option.animation = !REDUCED;
    if (!REDUCED) { option.animationDuration = 420; option.animationEasing = 'cubicOut'; }
    c.setOption(option, true);
  }
  window.addEventListener('resize', function () {
    Object.keys(charts).forEach(function (k) {
      const el = document.getElementById(k);
      if (el && el.offsetParent !== null) charts[k].resize();
    });
  });

  /* Trailing mean. Accounting work is weekly, so raw daily figures are a sawtooth
     of weekday peaks and near-empty weekends. A sparkline is a trend indicator,
     not a reading, so it is smoothed. Charts with axes stay unsmoothed. */
  function movingAverage(values, window) {
    const w = window || 7;
    const out = new Array(values.length);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= w) sum -= values[i - w];
      out[i] = sum / Math.min(i + 1, w);
    }
    return out;
  }

  /* Inline SVG sparkline. Used in the KPI strip and in the 71-row table, where
     a full chart instance per row would be absurd. */
  function sparkline(values, opts) {
    opts = opts || {};
    if (opts.smooth !== false) values = movingAverage(values, 7);
    const w = opts.w || 88, h = opts.h || 26, stroke = opts.stroke || C.action;
    if (!values || !values.length) return '';
    let max = -Infinity, min = Infinity;
    for (let i = 0; i < values.length; i++) { if (values[i] > max) max = values[i]; if (values[i] < min) min = values[i]; }
    if (max === min) { max = min + 1; }
    const step = values.length > 1 ? (w - 2) / (values.length - 1) : 0;
    let d = '', area = '';
    for (let i = 0; i < values.length; i++) {
      const x = (1 + i * step).toFixed(2);
      const y = (h - 2 - ((values[i] - min) / (max - min)) * (h - 4)).toFixed(2);
      d += (i ? 'L' : 'M') + x + ' ' + y;
    }
    area = d + 'L' + (1 + (values.length - 1) * step).toFixed(2) + ' ' + (h - 1) + 'L1 ' + (h - 1) + 'Z';
    return '<svg class="sparkcell" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h +
      '" aria-hidden="true" focusable="false">' +
      '<path d="' + area + '" fill="' + stroke + '" opacity=".20"/>' +
      '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="1.6" ' +
      'stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  /* ===========================================================================
     2. State and the URL contract
     Scope lives in the URL so a view can be pasted into Teams and land on
     exactly the same screen. Back and forward work.
     =========================================================================== */
  const PERIODS = [
    { id: 'p30',  label: 'Last 30 days',  from: function () { return Math.max(0, A.meta.dayCount - 30); }, to: function () { return A.meta.dayCount - 1; } },
    { id: 'p90',  label: 'Last 90 days',  from: function () { return Math.max(0, A.meta.dayCount - 90); }, to: function () { return A.meta.dayCount - 1; } },
    { id: 'aug',  label: 'August 2026',   from: function () { return A.indexOfDate('2026-08-01'); },       to: function () { return A.indexOfDate('2026-08-31'); } },
    { id: 'q3',   label: 'Q3 to date',    from: function () { return A.indexOfDate('2026-07-01'); },       to: function () { return A.meta.dayCount - 1; } },
    { id: 'ytd',  label: 'Year to date',  from: function () { return 0; },                                  to: function () { return A.meta.dayCount - 1; } },
    { id: 'h1',   label: 'First half',    from: function () { return 0; },                                  to: function () { return A.indexOfDate('2026-06-30'); } },
    { id: 'pre',  label: 'Before 2026',   from: function () { return -1; },                                 to: function () { return -1; } }
  ];

  const MEASURES = [
    { id: 'spend',    label: 'Spend' },
    { id: 'activity', label: 'Activity' },
    { id: 'tokens',   label: 'Tokens' }
  ];

  /* The three personas. Each one is a real reader of this dashboard, and the
     nav and the scope bar change to match what they are allowed to see. */
  const PERSONAS = [
    { id: 'group',    name: 'Espen Slyngstad',  role: 'Head of AI, Accru Partners Group', scope: 'group' },
    { id: 'firm',     name: 'Siri Åström',      role: 'Managing partner, Lindqvist & Söderberg', scope: 'firm', firm: 'lindqvist-soderberg' },
    { id: 'employee', name: 'Viktor Norell',    role: 'Payroll specialist, Lindqvist & Söderberg', scope: 'self', firm: 'lindqvist-soderberg' }
  ];

  const NAV = [
    { id: 'group',    label: 'Group overview', icon: 'ph-chart-line-up',   personas: ['group'] },
    { id: 'firms',    label: 'Firms',          icon: 'ph-buildings',       personas: ['group'] },
    { id: 'limits',   label: 'Spend limits',   icon: 'ph-gauge',           personas: ['group', 'firm'] },
    { id: 'coverage', label: 'Data coverage',  icon: 'ph-warning-diamond', personas: ['group'] },
    { id: 'firm',     label: 'My firm',        icon: 'ph-users-three',     personas: ['group', 'firm', 'employee'] },
    { id: 'me',       label: 'My usage',       icon: 'ph-user-focus',      personas: ['group', 'firm', 'employee'] },
    { id: 'notes',    label: 'Handoff notes',  icon: 'ph-notebook',        personas: ['group', 'firm', 'employee'] }
  ];

  const DEFAULTS = { view: 'group', c: 'all', firm: 'all', period: 'p90', measure: 'spend', as: 'group' };
  const state = Object.assign({}, DEFAULTS);

  function readURL() {
    const q = new URLSearchParams(location.search);
    Object.keys(DEFAULTS).forEach(function (k) {
      const v = q.get(k);
      if (v) state[k] = v;
    });
    /* Guard against a hand-edited URL naming something that does not exist. */
    if (!PERIODS.some(function (p) { return p.id === state.period; })) state.period = DEFAULTS.period;
    if (!MEASURES.some(function (m) { return m.id === state.measure; })) state.measure = DEFAULTS.measure;
    if (!PERSONAS.some(function (p) { return p.id === state.as; })) state.as = DEFAULTS.as;
    if (state.firm !== 'all' && !A.firmById(state.firm)) state.firm = 'all';
    if (state.c !== 'all' && !A.countryByCode(state.c)) state.c = 'all';
    applyPersonaLock();
    if (!visibleNav().some(function (n) { return n.id === state.view; })) state.view = visibleNav()[0].id;
  }

  function writeURL(push) {
    const q = new URLSearchParams();
    Object.keys(DEFAULTS).forEach(function (k) { if (state[k] !== DEFAULTS[k]) q.set(k, state[k]); });
    const url = location.pathname + (q.toString() ? '?' + q.toString() : '');
    if (push) history.pushState(null, '', url); else history.replaceState(null, '', url);
  }

  function persona() { return PERSONAS.filter(function (p) { return p.id === state.as; })[0]; }
  function visibleNav() {
    return NAV.filter(function (n) { return n.personas.indexOf(state.as) !== -1; });
  }
  /* A firm-level reader is pinned to their own firm. Scope is a lens for the
     group persona and a wall for everyone else, enforced independently of the UI. */
  function applyPersonaLock() {
    const p = persona();
    if (p.scope !== 'group') { state.firm = p.firm; state.c = A.firmById(p.firm).country; }
  }

  function period() { return PERIODS.filter(function (p) { return p.id === state.period; })[0]; }
  function range() {
    const p = period();
    return { from: p.from(), to: p.to(), empty: p.from() < 0 };
  }
  /* The immediately preceding window of equal length, for period-over-period deltas. */
  function priorRange() {
    const r = range();
    if (r.empty) return r;
    const len = r.to - r.from + 1;
    const to = r.from - 1;
    return { from: Math.max(0, to - len + 1), to: to, empty: to < 0 };
  }
  function scopedFirms() {
    return A.selectFirms({ country: state.c, firm: state.firm });
  }

  /* ===========================================================================
     3. Measure accessors
     One switch instead of three parallel code paths through every chart.
     =========================================================================== */
  function measureDef() {
    switch (state.measure) {
      case 'activity': return {
        label: 'Activity', unit: 'messages and sessions', axis: 'Messages and sessions',
        total: function (agg) { return agg.msgs + agg.sess; },
        fmt: F.compact, fmtLong: F.num,
        dayValue: function (d) { return d.msgs + d.sess; },
        productDay: function (d, p) { return d.pa[p]; },
        productTotal: function (agg, p) { return agg.byProductActive[p]; }
      };
      case 'tokens': return {
        label: 'Tokens', unit: 'tokens', axis: 'Tokens',
        total: function (agg) { return agg.tok; },
        fmt: F.compact, fmtLong: F.num,
        dayValue: function (d) { return d.tok; },
        /* Tokens are not reported per product, so the split is apportioned by cost
           and labelled as such wherever it is shown. */
        productDay: function (d, p) { return d.cost ? d.tok * (d.pc[p] / d.cost) : 0; },
        productTotal: function (agg, p) { return agg.cost ? agg.tok * (agg.byProduct[p] / agg.cost) : 0; }
      };
      default: return {
        label: 'Spend', unit: 'USD', axis: 'Spend (USD)',
        total: function (agg) { return agg.cost; },
        fmt: F.money, fmtLong: F.moneyExact,
        dayValue: function (d) { return d.cost; },
        productDay: function (d, p) { return d.pc[p]; },
        productTotal: function (agg, p) { return agg.byProduct[p]; }
      };
    }
  }

  /* Daily series broken down by product or by country, which aggregate() does
     not carry because it would triple its memory for one chart. */
  function dailyBy(list, from, to, dim) {
    const M = measureDef();
    const n = to - from + 1;
    const keys = dim === 'product' ? A.products.map(function (p) { return p.id; })
      : dim === 'country' ? A.countries.map(function (c) { return c.code; })
      : ['total'];
    const out = {};
    keys.forEach(function (k) { out[k] = new Array(n).fill(0); });

    list.forEach(function (f) {
      for (let i = from; i <= to; i++) {
        const d = f.series[i];
        if (!d.active) continue;
        const k = i - from;
        if (dim === 'product') {
          for (let p = 0; p < P; p++) out[A.products[p].id][k] += M.productDay(d, p);
        } else if (dim === 'country') {
          out[f.country][k] += M.dayValue(d);
        } else {
          out.total[k] += M.dayValue(d);
        }
      }
    });
    return { keys: keys, data: out, dates: A.dates.slice(from, to + 1) };
  }

  /* Roll daily buckets up into weeks. Sums, never averages, so the axis still
     reads as real money. Buckets align to the Monday on or before the range
     start, so week boundaries stay stable as the scope changes. */
  function toWeekly(res) {
    const first = A.dates.indexOf(res.dates[0]);
    const offset = (A.dow[first] + 6) % 7; // days since Monday
    const out = {}, dates = [];
    res.keys.forEach(function (k) { out[k] = []; });
    for (let i = -offset; i < res.dates.length; i += 7) {
      const lo = Math.max(0, i), hi = Math.min(res.dates.length, i + 7);
      if (hi <= lo) continue;
      dates.push(res.dates[lo]);
      res.keys.forEach(function (k) {
        let s = 0;
        for (let j = lo; j < hi; j++) s += res.data[k][j];
        out[k].push(s);
      });
    }
    return { keys: res.keys, data: out, dates: dates, weekly: true };
  }

  /* ===========================================================================
     4. Reusable controls
     =========================================================================== */
  function buildSelect(host, opts) {
    /* opts: { label, items:[{id,label,note,disabled}], value, onPick, filter }
       Disclosure button plus menu. Keyboard operable, closes on Escape and on
       outside click, and returns focus to the trigger. */
    host.className = 'selectish' + (opts.align === 'right' ? ' align-right' : '');
    host.innerHTML = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'listbox');
    host.appendChild(btn); host.appendChild(menu);

    function currentLabel() {
      const it = opts.items.filter(function (i) { return i.id === opts.value; })[0];
      return it ? (it.short || it.label) : opts.items[0].label;
    }
    function render() {
      btn.innerHTML = '<span>' + currentLabel() + '</span><i class="ph ph-caret-down" aria-hidden="true"></i>';
      if (opts.disabled) { btn.disabled = true; btn.style.opacity = '.55'; btn.style.cursor = 'not-allowed'; }
      menu.innerHTML = '';
      if (opts.filter) {
        const f = document.createElement('input');
        f.className = 'f'; f.type = 'search'; f.placeholder = opts.filter;
        f.setAttribute('aria-label', opts.filter);
        f.addEventListener('input', function () { paint(f.value.toLowerCase()); });
        f.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
        menu.appendChild(f);
      }
      const list = document.createElement('div');
      menu.appendChild(list);
      function paint(q) {
        list.innerHTML = '';
        opts.items.forEach(function (it) {
          if (it.sep) { const s = document.createElement('div'); s.className = 'sep'; list.appendChild(s); return; }
          if (q && it.label.toLowerCase().indexOf(q) === -1) return;
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('role', 'option');
          b.setAttribute('aria-checked', String(it.id === opts.value));
          b.setAttribute('aria-selected', String(it.id === opts.value));
          if (it.zero) b.className = 'zero';
          b.innerHTML = '<span>' + it.label + '</span>' +
            (it.note != null ? '<span class="c">' + it.note + '</span>' : '');
          b.addEventListener('click', function () {
            opts.value = it.id; close(); btn.focus(); opts.onPick(it.id);
          });
          list.appendChild(b);
        });
        if (!list.children.length) {
          list.innerHTML = '<div style="padding:10px;color:var(--ink-muted);font-size:.85rem">No match</div>';
        }
      }
      paint('');
    }
    function open() {
      host.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      /* Flip the menu leftwards if it would run off the right edge. Measured on
         open because it depends on the viewport, not on which control this is. */
      if (opts.align !== 'right') {
        host.classList.remove('align-right');
        const r = menu.getBoundingClientRect();
        if (r.right > document.documentElement.clientWidth - 8) host.classList.add('align-right');
      }
      const f = menu.querySelector('input.f'); if (f) f.focus();
    }
    function close() { host.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () { host.classList.contains('open') ? close() : open(); });
    host.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!host.contains(e.target)) close(); });
    render();
    return { setValue: function (v) { opts.value = v; render(); }, rerender: render };
  }

  function buildSeg(host, items, value, onPick) {
    host.innerHTML = '';
    items.forEach(function (it) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      b.setAttribute('aria-pressed', String(it.id === value));
      b.addEventListener('click', function () { onPick(it.id); });
      host.appendChild(b);
    });
  }

  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); },
        function () { toast('Copy failed. Select the text manually.'); });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Copy failed.'); }
      document.body.removeChild(ta);
    }
  }

  function flagEl(code) {
    const c = A.countryByCode(code);
    return '<span class="fi fi-' + c.flag + ' fis" style="display:inline-block;background-size:cover;' +
      'background-position:center" title="' + c.name + '"></span>';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function deltaEl(cur, prev) {
    if (!prev || !isFinite(prev) || prev === 0) return '<span class="delta flat">no prior period</span>';
    const d = (cur - prev) / prev;
    const cls = Math.abs(d) < 0.005 ? 'flat' : (d > 0 ? 'up' : 'down');
    const arrow = Math.abs(d) < 0.005 ? '' : (d > 0 ? '\u2191 ' : '\u2193 ');
    return '<span class="delta ' + cls + '">' + arrow + F.delta(d) + '</span>';
  }

  /* ===========================================================================
     5. Shell wiring
     =========================================================================== */
  function renderNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    visibleNav().forEach(function (n) {
      const a = document.createElement('a');
      a.href = '#' + n.id;
      a.innerHTML = '<i class="ph ' + n.icon + '" aria-hidden="true"></i><span>' + n.label + '</span>';
      if (n.id === state.view) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        state.view = n.id; writeURL(true); renderAll();
      });
      nav.appendChild(a);
    });
  }

  function renderScopeBar() {
    const p = persona();
    const locked = p.scope !== 'group';

    buildSelect(document.getElementById('personaSel'), {
      items: PERSONAS.map(function (x) {
        return { id: x.id, label: x.name + ' \u00b7 ' + x.role, short: x.name };
      }),
      value: state.as, align: 'right',
      onPick: function (v) {
        state.as = v; applyPersonaLock();
        if (!visibleNav().some(function (n) { return n.id === state.view; })) state.view = visibleNav()[0].id;
        writeURL(true); renderAll();
      }
    });

    const countryItems = [{ id: 'all', label: 'All countries', note: A.firms.length }].concat(
      A.countries.map(function (c) {
        const n = A.firms.filter(function (f) { return f.country === c.code; }).length;
        return { id: c.code, label: c.name, note: n };
      }));
    buildSelect(document.getElementById('countrySel'), {
      items: countryItems, value: state.c, disabled: locked,
      onPick: function (v) { state.c = v; state.firm = 'all'; writeURL(true); renderAll(); }
    });

    const pool = A.firms.filter(function (f) { return state.c === 'all' || f.country === state.c; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    const firmItems = [{ id: 'all', label: 'All firms', note: pool.length }, { sep: true }].concat(
      pool.map(function (f) {
        return { id: f.id, label: f.name, note: f.live ? f.seats + ' seats' : 'not live', zero: !f.live };
      }));
    buildSelect(document.getElementById('firmSel'), {
      items: firmItems, value: state.firm, disabled: locked, filter: 'Filter firms',
      onPick: function (v) { state.firm = v; writeURL(true); renderAll(); }
    });

    buildSelect(document.getElementById('periodSel'), {
      items: PERIODS.map(function (x) { return { id: x.id, label: x.label }; }),
      value: state.period,
      onPick: function (v) { state.period = v; writeURL(true); renderAll(); }
    });

    buildSeg(document.getElementById('measureSeg'), MEASURES, state.measure, function (v) {
      state.measure = v; writeURL(true); renderAll();
    });

    const dirty = Object.keys(DEFAULTS).some(function (k) {
      return k !== 'view' && k !== 'as' && state[k] !== DEFAULTS[k];
    });
    const clear = document.getElementById('clearScope');
    clear.hidden = !dirty || locked;
    clear.onclick = function () {
      state.c = DEFAULTS.c; state.firm = DEFAULTS.firm;
      state.period = DEFAULTS.period; state.measure = DEFAULTS.measure;
      writeURL(true); renderAll();
    };

    document.getElementById('copyLink').onclick = function () {
      copyText(location.href, 'View link copied. It opens on exactly this scope.');
    };
    document.getElementById('personaLbl').textContent = 'Viewing as';
  }

  /* =========================================================================== */
  window.ACCRU_APP = {
    state: state, PERIODS: PERIODS, MEASURES: MEASURES, PERSONAS: PERSONAS, NAV: NAV,
    measureDef: measureDef, dailyBy: dailyBy, toWeekly: toWeekly, movingAverage: movingAverage,
    range: range, priorRange: priorRange,
    scopedFirms: scopedFirms, persona: persona, period: period,
    draw: draw, chart: chart, sparkline: sparkline, toast: toast, copyText: copyText,
    flagEl: flagEl, esc: esc, deltaEl: deltaEl, renderNav: renderNav, renderScopeBar: renderScopeBar,
    writeURL: writeURL, readURL: readURL, visibleNav: visibleNav,
    C: C, CATEGORICAL: CATEGORICAL, SEQUENTIAL: SEQUENTIAL, INK: INK, MUTED: MUTED, RULE: RULE,
    REDUCED: REDUCED, applyPersonaLock: applyPersonaLock, buildSeg: buildSeg, buildSelect: buildSelect
  };

  /* renderAll is defined in the views file and assigned onto window. */
  function renderAll() { window.ACCRU_VIEWS.renderAll(); }
  window.ACCRU_APP.renderAll = renderAll;

  window.addEventListener('popstate', function () { readURL(); renderAll(); });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('globalSearch').focus();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    readURL();
    renderAll();
  });
})();
