/* =============================================================================
   Accru AI Hub - Claude usage and adoption dashboard
   Screen renderers

   Split out of the app file purely for readability. Same classic-script model.
   ============================================================================= */

(function () {
  'use strict';

  const A = window.ACCRU;
  const F = A.fmt;
  const P = A.products.length;
  let APP;

  /* Team table privacy. Banded activity is the default. Exact per-person spend
     is behind an explicit reveal, because a colleague's spend is not something
     a dashboard should volunteer. */
  let revealPeople = false;
  /* Firms table state */
  /* Country is hidden by default. The flag in the firm cell already carries it,
     and the column costs enough width to push Top product off the screen. It is
     one click away in the Columns menu. */
  let sortKey = 'cost', sortDir = -1, firmQuery = '', expanded = {},
      hiddenCols = { country: true };
  let limitFilter = 'risk';

  const BANDS = {
    high:    { label: 'High',    n: 4 },
    steady:  { label: 'Steady',  n: 3 },
    light:   { label: 'Light',   n: 2 },
    dormant: { label: 'Dormant', n: 0 }
  };
  function bandEl(b) {
    const d = BANDS[b] || BANDS.light;
    return '<span class="band ' + b + '"><span class="bars">' +
      '<i></i><i></i><i></i><i></i></span>' + d.label + '</span>';
  }

  /* ---------------------------------------------------------------------------
     Shared computations
     --------------------------------------------------------------------------- */
  function firmMetrics(f, r) {
    const agg = A.aggregate([f], r.from, r.to);
    const M = APP.measureDef();
    let peak = 0, last7 = 0, everActive = false;
    for (let i = r.from; i <= r.to; i++) {
      if (f.series[i].active > peak) peak = f.series[i].active;
      if (f.series[i].active) everActive = true;
      if (i > r.to - 7) last7 = Math.max(last7, f.series[i].active);
    }
    const daily = [];
    for (let i = r.from; i <= r.to; i++) daily.push(M.dayValue(f.series[i]));
    return {
      firm: f, agg: agg, peak: peak, last7: last7, everActive: everActive, daily: daily,
      value: M.total(agg),
      adoption: f.headcount ? peak / f.headcount : null,
      utilisation: f.seats ? peak / f.seats : null,
      perUser: peak ? agg.cost / peak : 0,
      limitPct: f.spendLimit ? monthToDate(f) / f.spendLimit : null
    };
  }

  /* A spend limit is a monthly control, so it is always measured against a whole
     calendar month rather than the scope period. Today is 3 September, which
     leaves the current month with two days of data, so the last complete month
     is the honest comparison. */
  const LIMIT_MONTH = '2026-08';
  function monthToDate(f) {
    let c = 0;
    for (let i = 0; i < A.meta.dayCount; i++) {
      if (A.dates[i].slice(0, 7) === LIMIT_MONTH) c += f.series[i].cost;
    }
    return c;
  }
  function projectedMonthEnd(f) {
    /* The comparison month is complete here, so the projection equals the actual.
       In production, with a partial month: monthToDate / elapsedDays * daysInMonth.
       Deliberately a straight line so a partner can reproduce it on paper. */
    return monthToDate(f);
  }

  function emptyState(icon, title, body, actionLabel, actionFn) {
    const wrap = document.createElement('div');
    wrap.className = 'empty';
    wrap.innerHTML = '<i class="ph ' + icon + '" aria-hidden="true"></i>' +
      '<h3>' + title + '</h3><p>' + body + '</p>';
    if (actionLabel) {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary'; b.type = 'button'; b.textContent = actionLabel;
      b.addEventListener('click', actionFn);
      wrap.appendChild(b);
    }
    return wrap;
  }

  /* Any screen scoped to a period, country or firm with nothing in it needs a
     designed answer rather than a grid of zeros. */
  function scopeBlocker() {
    const r = APP.range();
    if (r.empty) {
      return emptyState('ph-clock-counter-clockwise', 'No data before 1 January 2026',
        'The Claude Analytics API holds nothing earlier than 1 January 2026, so year on year ' +
        'comparison will not be possible until 2027. Pick a later period.',
        'Show year to date', function () {
          APP.state.period = 'ytd'; APP.writeURL(true); APP.renderAll();
        });
    }
    const list = APP.scopedFirms();
    if (!list.length) {
      return emptyState('ph-buildings', 'No firms in this scope',
        'Nothing matches the current country and firm combination.',
        'Clear the scope', function () {
          APP.state.c = 'all'; APP.state.firm = 'all'; APP.writeURL(true); APP.renderAll();
        });
    }
    const anyLive = list.some(function (f) { return f.live; });
    if (!anyLive) {
      const one = list.length === 1 ? list[0] : null;
      return emptyState('ph-hourglass-medium',
        one ? one.name + ' has not started using Claude yet' : 'No activity in this scope yet',
        one
          ? 'The firm holds ' + one.seats + ' provisioned licences but nobody has signed in. ' +
            (one.groups.length
              ? 'Its group <code>' + one.groups[0] + '</code> exists in the directory and is ready.'
              : 'It has no group in the Claude directory yet, so even once people sign in their ' +
                'usage will not be attributed to the firm.')
          : 'These firms are provisioned but nobody has signed in yet. The rollout is still ' +
            'in progress, so this is expected to change week to week.',
        'Back to the whole group', function () {
          APP.state.c = 'all'; APP.state.firm = 'all'; APP.writeURL(true); APP.renderAll();
        });
    }
    return null;
  }

  /* ===========================================================================
     Group overview
     =========================================================================== */
  function renderGroup() {
    const host = document.getElementById('view-group');
    const r = APP.range(), pr = APP.priorRange();
    const M = APP.measureDef();
    const list = APP.scopedFirms();

    const kpis = document.getElementById('kpis');
    const blocker = scopeBlocker();
    ['trendChart', 'scatterChart', 'productBars', 'productTree', 'modelChart', 'skillsChart', 'calChart']
      .forEach(function (id) { const c = APP.chart(id); if (c) c.clear(); });

    if (blocker) {
      kpis.innerHTML = '';
      kpis.style.display = 'none';
      let holder = document.getElementById('groupEmpty');
      if (!holder) {
        holder = document.createElement('div');
        holder.id = 'groupEmpty'; holder.className = 'panel';
        kpis.parentNode.insertBefore(holder, kpis.nextSibling);
      }
      holder.innerHTML = ''; holder.appendChild(blocker);
      host.querySelectorAll('.panel').forEach(function (p) {
        if (p.id !== 'groupEmpty') p.style.display = 'none';
      });
      host.querySelectorAll('.grid2').forEach(function (g) { g.style.display = 'none'; });
      return;
    }
    kpis.style.display = '';
    const ge = document.getElementById('groupEmpty'); if (ge) ge.remove();
    host.querySelectorAll('.panel').forEach(function (p) { p.style.display = ''; });
    host.querySelectorAll('.grid2').forEach(function (g) { g.style.display = ''; });

    const agg = A.aggregate(list, r.from, r.to);
    const prev = pr.empty ? null : A.aggregate(list, pr.from, pr.to);
    const licences = list.reduce(function (s, f) { return s + f.seats; }, 0);
    const scopeName = APP.state.firm !== 'all' ? A.firmById(APP.state.firm).name
      : APP.state.c !== 'all' ? A.countryByCode(APP.state.c).name : 'the whole group';

    document.getElementById('groupLede').innerHTML =
      'Claude usage across ' + APP.esc(scopeName) + ', ' +
      F.date(A.dates[r.from]) + ' to ' + F.date(A.dates[r.to]) + '. ' +
      agg.liveFirms + ' of ' + list.length + ' firms have signed in.';

    /* ---- KPI strip ---- */
    const dailyTotal = APP.dailyBy(list, r.from, r.to, 'total').data.total;
    const dailyCost = [];
    for (let i = r.from; i <= r.to; i++) dailyCost.push(agg.daily[i - r.from]);
    const dailyActive = agg.dailyActive;
    const dailyMsgs = [], dailyTok = [], dailyLive = [];
    for (let i = r.from; i <= r.to; i++) {
      let mg = 0, tk = 0, lv = 0;
      list.forEach(function (f) {
        const d = f.series[i];
        mg += d.msgs; tk += d.tok;
        if (f.live && f.startIdx != null && i >= f.startIdx) lv++;
      });
      dailyMsgs.push(mg); dailyTok.push(tk); dailyLive.push(lv);
    }

    const cards = [
      {
        label: M.label + ' in period', value: M.fmt(M.total(agg)),
        sub: prev ? APP.deltaEl(M.total(agg), M.total(prev)) + ' against the previous ' +
          (r.to - r.from + 1) + ' days' : 'no prior period',
        spark: dailyTotal, tip: M.total(agg) > 0 ? M.fmtLong(M.total(agg)) : ''
      },
      {
        label: 'Active users', value: F.num(agg.activeUsers),
        sub: 'of ' + F.num(licences) + ' licences \u00b7 ' + F.pct(agg.activeUsers / licences, 0) + ' adoption',
        spark: dailyActive
      },
      {
        label: 'Cost per active user', value: agg.activeUsers ? F.moneyExact(agg.cost / agg.activeUsers) : '-',
        sub: 'across ' + (r.to - r.from + 1) + ' days',
        spark: dailyActive.map(function (v, i) { return v ? dailyCost[i] / v : 0; })
      },
      {
        label: 'Messages', value: F.compact(agg.msgs),
        sub: F.compact(agg.sess) + ' Claude Code sessions',
        spark: dailyMsgs
      },
      {
        label: 'Tokens', value: F.compact(agg.tok),
        sub: agg.cost ? F.compact(agg.tok / agg.cost) + ' per dollar' : '-',
        spark: dailyTok
      },
      {
        label: 'Firms live', value: agg.liveFirms + ' of ' + list.length,
        sub: (list.length - agg.liveFirms) + ' provisioned, not yet signed in',
        spark: dailyLive
      }
    ];

    kpis.innerHTML = cards.map(function (c) {
      return '<div class="kpi"><div class="k-lbl">' + c.label + '</div>' +
        '<div class="k-val" title="' + (c.tip || '') + '">' + c.value + '</div>' +
        '<div class="k-sub">' + c.sub + '</div>' +
        (c.spark ? APP.sparkline(c.spark, { w: 150, h: 30 }) : '') + '</div>';
    }).join('');

    /* ---- Trend ---- */
    renderTrend(list, r, M);

    /* ---- Country rollup ---- */
    renderCountryRollup(list, r, pr, M);

    /* ---- Adoption against cost ---- */
    renderScatter(list, r);

    /* ---- Product and model mix ---- */
    renderProductMix(list, r, M, agg);
    renderModelMix(agg);
    renderSkills();

    /* ---- Calendar ---- */
    renderCalendar(list);
  }

  let trendStack = 'country';
  let trendGrain = null; /* null means follow the range length */
  function renderTrend(list, r, M) {
    APP.buildSeg(document.getElementById('trendStack'), [
      { id: 'country', label: 'By country' },
      { id: 'product', label: 'By product' },
      { id: 'total', label: 'Total' }
    ], trendStack, function (v) { trendStack = v; renderTrend(list, APP.range(), APP.measureDef()); });

    /* Accounting work is weekly, so a long range shown daily is a sawtooth of
       weekday peaks and empty weekends. Default to weeks past two months and
       let the reader drop to days when they want the detail. */
    const span = r.to - r.from + 1;
    const grain = trendGrain || (span > 62 ? 'week' : 'day');
    APP.buildSeg(document.getElementById('trendGrain'), [
      { id: 'day', label: 'Daily' },
      { id: 'week', label: 'Weekly' }
    ], grain, function (v) { trendGrain = v; renderTrend(list, APP.range(), APP.measureDef()); });

    const dim = trendStack;
    let res = APP.dailyBy(list, r.from, r.to, dim);
    if (grain === 'week') res = APP.toWeekly(res);
    const weekly = !!res.weekly;
    const dates = res.dates;

    document.getElementById('trendTitle').textContent = M.label + ' over time';
    document.getElementById('trendHint').textContent =
      (weekly ? 'Grouped into calendar weeks, which is how the work itself falls. '
              : 'One point per day. Weekends read as troughs. ') +
      (APP.state.measure === 'spend'
        ? 'Cost inside the shaded band is still reconciling and will move.'
        : 'Engagement figures are final the day after, so nothing here will change.');

    let series;
    if (dim === 'total') {
      series = [{
        name: M.label, type: 'line', smooth: 0.2, showSymbol: false,
        lineStyle: { width: 2, color: '#b8501c' },
        areaStyle: { color: 'rgba(184,80,28,.14)' },
        data: res.data.total
      }];
    } else if (dim === 'country') {
      series = A.countries.filter(function (c) {
        return res.data[c.code].some(function (v) { return v > 0; });
      }).map(function (c, i) {
        return {
          name: c.name, type: 'line', stack: 's', smooth: 0.2, showSymbol: false,
          lineStyle: { width: 1, color: c.hue, type: ['solid', 'dashed', 'dotted', 'solid'][i % 4] },
          areaStyle: { color: c.hue, opacity: 0.82 },
          emphasis: { focus: 'series' },
          data: res.data[c.code]
        };
      });
    } else {
      series = A.products.map(function (p, i) {
        return {
          name: p.name, type: 'line', stack: 's', smooth: 0.2, showSymbol: false,
          lineStyle: { width: 1, color: p.hue, type: ['solid', 'dashed', 'dotted', 'solid', 'dashed'][i % 5] },
          areaStyle: { color: p.hue, opacity: 0.82 },
          emphasis: { focus: 'series' },
          data: res.data[p.id]
        };
      });
    }

    /* The unsettled cost window. Marked on the chart itself rather than in a
       footnote, because a figure that is going to move should say so where it
       is read. */
    const unsettledStart = Math.max(A.meta.settledIndex + 1, r.from);
    if (series.length && APP.state.measure === 'spend' && unsettledStart <= r.to) {
      /* Snap the band to a real category value, otherwise ECharts drops it. */
      const startLabel = dates.filter(function (d) { return d >= A.dates[unsettledStart]; })[0]
        || dates[dates.length - 1];
      series[series.length - 1].markArea = {
        silent: true,
        itemStyle: { color: 'rgba(143,47,43,.07)' },
        label: {
          show: true, position: 'insideTop', color: '#8f2f2b', fontSize: 11, fontWeight: 600,
          formatter: 'Still reconciling'
        },
        data: [[{ xAxis: startLabel }, { xAxis: dates[dates.length - 1] }]]
      };
    }

    APP.draw('trendChart', {
      grid: { left: 62, right: 22, top: 44, bottom: 74 },
      legend: { show: dim !== 'total', top: 0, left: 0 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#6f6659' } },
        formatter: function (ps) {
          if (!ps.length) return '';
          let sum = 0;
          ps.forEach(function (p) { sum += p.value || 0; });
          let s = '<b>' + (weekly ? 'Week of ' : '') + F.date(ps[0].axisValue) + '</b>';
          if (unsettledStart <= r.to && A.dates.indexOf(ps[0].axisValue) > A.meta.settledIndex
              && APP.state.measure === 'spend') {
            s += ' <span style="color:#8f2f2b">still reconciling</span>';
          }
          s += '<br/>';
          ps.slice().reverse().forEach(function (p) {
            s += p.marker + p.seriesName + ' <b>' + M.fmt(p.value) + '</b><br/>';
          });
          if (ps.length > 1) s += '<span style="color:#6f6659">Total ' + M.fmt(sum) + '</span>';
          return s;
        }
      },
      xAxis: { type: 'category', data: dates, boundaryGap: false,
        axisLabel: { formatter: function (v) { return F.dateShort(v); } } },
      yAxis: { type: 'value', name: M.axis, nameTextStyle: { color: APP.MUTED, fontSize: 11, align: 'left' },
        nameGap: 14, axisLabel: { formatter: function (v) { return M.fmt(v); } } },
      dataZoom: [
        { type: 'inside', throttle: 60 },
        { type: 'slider', height: 26, bottom: 14, borderColor: APP.RULE,
          fillerColor: 'rgba(184,80,28,.12)', handleStyle: { color: '#b8501c' },
          dataBackground: { lineStyle: { color: '#c9c2b4' }, areaStyle: { color: '#e3ded4' } },
          textStyle: { color: APP.MUTED, fontSize: 10 } }
      ],
      series: series
    });
  }

  function renderCountryRollup(list, r, pr, M) {
    const host = document.getElementById('countryRollup');
    const rows = A.countries.map(function (c) {
      const sub = list.filter(function (f) { return f.country === c.code; });
      const agg = A.aggregate(sub, r.from, r.to);
      const prevAgg = pr.empty ? null : A.aggregate(sub, pr.from, pr.to);
      const daily = APP.dailyBy(sub, r.from, r.to, 'total').data.total;
      return {
        c: c, sub: sub, value: M.total(agg), prev: prevAgg ? M.total(prevAgg) : null,
        agg: agg, daily: daily
      };
    });
    const total = rows.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    /* Rank now against rank in the previous window, so a country that is moving
       shows it. Sorted by the current measure, as the panel hint promises. */
    const rankNow = rows.slice().sort(function (a, b) { return b.value - a.value; })
      .map(function (x) { return x.c.code; });
    const rankPrev = rows.slice().sort(function (a, b) { return (b.prev || 0) - (a.prev || 0); })
      .map(function (x) { return x.c.code; });

    rows.sort(function (a, b) { return b.value - a.value; });

    host.innerHTML = rows.map(function (x) {
      const move = rankPrev.indexOf(x.c.code) - rankNow.indexOf(x.c.code);
      /* Period over period change carries more than rank movement, which barely
         moves across four countries. Rank is shown only when it actually shifts. */
      const rankNote = !x.prev || move === 0 ? 'against the previous period'
        : move > 0 ? 'up ' + move + ' in rank' : 'down ' + (-move) + ' in rank';
      const moveEl = APP.deltaEl(x.value, x.prev);
      const share = x.value / total;
      return '<div class="wl-row rollup-row" role="button" tabindex="0" data-cc="' + x.c.code + '">' +
        '<div class="nm">' + APP.flagEl(x.c.code) + '<span>' + x.c.name + '</span></div>' +
        '<div>' + APP.sparkline(x.daily, { w: 240, h: 30, stroke: x.c.hue }) +
          '<div style="height:6px;background:var(--surface-sunken);border-radius:2px;margin-top:2px">' +
          '<div style="height:6px;border-radius:2px;width:' + (share * 100).toFixed(1) + '%;background:' +
          x.c.hue + '"></div></div></div>' +
        '<div class="num" style="text-align:right;font-weight:600">' + M.fmt(x.value) +
          '<div style="font-size:.76rem;color:var(--ink-muted);font-weight:400">' +
          F.pct(share, 0) + ' of scope</div></div>' +
        '<div class="num" style="text-align:right">' + F.num(x.agg.activeUsers) +
          '<div style="font-size:.76rem;color:var(--ink-muted)">active</div></div>' +
        '<div style="text-align:right;white-space:nowrap;font-size:.84rem">' + moveEl +
          '<div style="font-size:.72rem;color:var(--ink-muted);font-weight:400;white-space:normal">' +
          rankNote + '</div></div>' +
        '</div>';
    }).join('');

    host.querySelectorAll('[data-cc]').forEach(function (el) {
      function go() {
        APP.state.c = el.getAttribute('data-cc'); APP.state.firm = 'all';
        APP.writeURL(true); APP.renderAll();
      }
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
  }

  function renderScatter(list, r) {
    /* Adoption needs a headcount. Firms without one are left out entirely rather
       than plotted at zero, which would libel them. */
    const pts = list.filter(function (f) { return f.live && f.headcount; })
      .map(function (f) { return firmMetrics(f, r); })
      .filter(function (m) { return m.peak > 0; });

    const byCountry = A.countries.map(function (c) {
      return {
        name: c.name, type: 'scatter',
        symbolSize: function (d) { return Math.max(9, Math.sqrt(d[2]) * 3.1); },
        itemStyle: { color: c.hue, opacity: 0.78, borderColor: '#fff', borderWidth: 1 },
        emphasis: { focus: 'series', label: { show: true, formatter: function (p) { return p.data[3]; },
          position: 'top', color: APP.INK, fontSize: 11, fontWeight: 600 } },
        data: pts.filter(function (m) { return m.firm.country === c.code; })
          .map(function (m) { return [m.adoption * 100, m.perUser, m.firm.seats, m.firm.name]; })
      };
    }).filter(function (s) { return s.data.length; });

    const avgAdopt = pts.reduce(function (s, m) { return s + m.adoption * 100; }, 0) / (pts.length || 1);
    const avgCost = pts.reduce(function (s, m) { return s + m.perUser; }, 0) / (pts.length || 1);

    APP.draw('scatterChart', {
      grid: { left: 66, right: 26, top: 40, bottom: 52 },
      legend: { top: 0, left: 0 },
      tooltip: {
        trigger: 'item',
        formatter: function (p) {
          return '<b>' + p.data[3] + '</b><br/>' +
            'Adoption ' + F.pct(p.data[0] / 100, 0) + ' of headcount<br/>' +
            'Cost per active user ' + F.moneyExact(p.data[1]) + '<br/>' +
            '<span style="color:#6f6659">' + p.data[2] + ' licences</span>';
        }
      },
      xAxis: {
        type: 'value', name: 'Adoption, share of headcount', nameLocation: 'middle', nameGap: 30,
        nameTextStyle: { color: APP.MUTED, fontSize: 11 },
        axisLabel: { formatter: '{value}%' }
      },
      yAxis: {
        type: 'value', name: 'Cost per active user', nameTextStyle: { color: APP.MUTED, fontSize: 11 },
        nameGap: 14, axisLabel: { formatter: function (v) { return F.money(v); } }
      },
      series: byCountry.concat([{
        name: 'Scope average', type: 'scatter', data: [], silent: true,
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: '#a89f8f', type: 'dashed', width: 1 },
          label: { color: APP.MUTED, fontSize: 10, formatter: function (p) { return p.name; } },
          data: [{ xAxis: avgAdopt, name: 'average adoption' }, { yAxis: avgCost, name: 'average cost' }]
        }
      }])
    });
  }

  function renderProductMix(list, r, M, agg) {
    const rows = A.countries.filter(function (c) {
      return list.some(function (f) { return f.country === c.code && f.live; });
    });
    const series = A.products.map(function (p, pi) {
      return {
        name: p.name, type: 'bar', stack: 'x', barWidth: 20,
        itemStyle: { color: p.hue },
        emphasis: { focus: 'series' },
        label: {
          show: true, formatter: function (d) { return d.value >= 9 ? Math.round(d.value) + '%' : ''; },
          color: '#fff', fontSize: 10, fontWeight: 600
        },
        data: rows.map(function (c) {
          const a = A.aggregate(list.filter(function (f) { return f.country === c.code; }), r.from, r.to);
          const tot = a.byProduct.reduce(function (s, v) { return s + v; }, 0) || 1;
          return a.byProduct[pi] / tot * 100;
        })
      };
    });

    APP.draw('productBars', {
      grid: { left: 84, right: 16, top: 30, bottom: 6, containLabel: false },
      legend: { top: 0, left: 0, itemGap: 12, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: function (ps) {
          let s = '<b>' + ps[0].axisValue + '</b><br/>';
          ps.forEach(function (p) { s += p.marker + p.seriesName + ' <b>' + p.value.toFixed(1) + '%</b><br/>'; });
          return s;
        } },
      xAxis: { type: 'value', max: 100, show: false },
      yAxis: { type: 'category', data: rows.map(function (c) { return c.name; }),
        axisLine: { show: false }, axisLabel: { fontSize: 11 } },
      series: series
    });

    const totalP = agg.byProduct.reduce(function (s, v) { return s + v; }, 0) || 1;
    APP.draw('productTree', {
      tooltip: {
        formatter: function (p) {
          return '<b>' + p.name + '</b><br/>' + F.moneyExact(p.value) + '<br/>' +
            '<span style="color:#6f6659">' + F.pct(p.value / totalP, 0) + ' of scope spend</span>';
        }
      },
      series: [{
        type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false },
        top: 4, bottom: 4, left: 0, right: 0,
        itemStyle: { borderColor: '#fff', borderWidth: 2, gapWidth: 2 },
        label: {
          show: true, position: 'insideTopLeft', color: '#fff', fontSize: 12, fontWeight: 600,
          formatter: function (p) {
            return p.name + '\n' + F.money(p.value) + '  ' + F.pct(p.value / totalP, 0);
          }
        },
        data: A.products.map(function (p, i) {
          return { name: p.name, value: agg.byProduct[i], itemStyle: { color: p.hue } };
        }).filter(function (d) { return d.value > 0; })
      }]
    });
  }

  function renderModelMix(agg) {
    const total = agg.byModel.reduce(function (s, v) { return s + v; }, 0) || 1;
    APP.draw('modelChart', {
      grid: { left: 82, right: 78, top: 12, bottom: 8 },
      tooltip: { trigger: 'item', formatter: function (p) {
        return '<b>' + p.name + '</b><br/>' + F.moneyExact(p.value) + ' \u00b7 ' + F.pct(p.value / total, 0);
      } },
      xAxis: { type: 'value', show: false, max: Math.max.apply(null, agg.byModel) * 1.28 },
      yAxis: { type: 'category', axisLine: { show: false },
        data: A.models.map(function (m) { return m.name; }).reverse(),
        axisLabel: { fontSize: 12 } },
      series: [{
        type: 'bar', barWidth: 22,
        data: A.models.map(function (m, i) {
          return { value: agg.byModel[i], itemStyle: { color: m.hue, borderRadius: [0, 3, 3, 0] } };
        }).reverse(),
        label: {
          show: true, position: 'right', color: APP.INK, fontSize: 11, fontWeight: 600,
          formatter: function (p) { return F.money(p.value) + '  ' + F.pct(p.value / total, 0); }
        }
      }]
    });
  }

  function renderSkills() {
    const top = A.skills.slice(0, 7);
    const max = top[0].users;
    APP.draw('skillsChart', {
      grid: { left: 148, right: 92, top: 26, bottom: 6 },
      title: { text: 'Most adopted skills', left: 0, top: 0,
        textStyle: { fontSize: 12, fontWeight: 600, color: APP.INK, fontFamily: 'Raleway' } },
      tooltip: { trigger: 'item', formatter: function (p) {
        const s = top[top.length - 1 - p.dataIndex];
        return '<b>' + s.name + '</b><br/>' + s.users + ' users across ' + s.firms + ' firms<br/>' +
          '<span style="color:#6f6659">Built in ' + A.countryByCode(s.origin).name +
          (s.inHub ? '' : ' \u00b7 not yet in the Hub catalogue') + '</span>';
      } },
      xAxis: { type: 'value', show: false, max: max * 1.3 },
      yAxis: { type: 'category', axisLine: { show: false }, axisLabel: { fontSize: 11 },
        data: top.map(function (s) { return s.name; }).reverse() },
      series: [{
        type: 'bar', barWidth: 13,
        data: top.slice().reverse().map(function (s) {
          return { value: s.users,
            itemStyle: { color: s.inHub ? '#b8501c' : '#a89f8f', borderRadius: [0, 3, 3, 0] } };
        }),
        label: { show: true, position: 'right', color: APP.MUTED, fontSize: 11,
          formatter: function (p) {
            const s = top[top.length - 1 - p.dataIndex];
            return s.users + ' users' + (s.inHub ? '' : '  (not in Hub)');
          } }
      }]
    });
  }

  function renderCalendar(list) {
    const data = [];
    let max = 0;
    for (let i = 0; i < A.meta.dayCount; i++) {
      let v = 0;
      list.forEach(function (f) { v += f.series[i].active; });
      if (v > max) max = v;
      data.push([A.dates[i], v]);
    }
    APP.draw('calChart', {
      tooltip: {
        formatter: function (p) {
          return '<b>' + F.date(p.data[0]) + '</b><br/>' + F.num(p.data[1]) + ' active users';
        }
      },
      visualMap: {
        min: 0, max: max || 1, calculable: false, orient: 'horizontal',
        left: 'right', top: 0, itemWidth: 12, itemHeight: 90,
        text: [F.num(max), '0'], textStyle: { color: APP.MUTED, fontSize: 10 },
        inRange: { color: APP.SEQUENTIAL }
      },
      calendar: {
        top: 44, left: 42, right: 22, cellSize: ['auto', 15],
        range: [A.dates[0], A.dates[A.meta.dayCount - 1]],
        itemStyle: { color: '#f3f0ea', borderWidth: 2, borderColor: '#fff' },
        splitLine: { show: false },
        yearLabel: { show: false },
        dayLabel: { nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          color: APP.MUTED, fontSize: 10 },
        monthLabel: { color: APP.MUTED, fontSize: 11,
          nameMap: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: data }]
    });
  }

  /* ===========================================================================
     Firms league table
     =========================================================================== */
  const COLUMNS = [
    { k: 'exp',     label: '',              always: true,  sortable: false },
    { k: 'name',    label: 'Firm',          always: true,  sortable: true },
    { k: 'country', label: 'Country',       sortable: true },
    { k: 'seats',   label: 'Licences',      sortable: true, r: true },
    { k: 'active',  label: 'Active users',  sortable: true, r: true },
    { k: 'adopt',   label: 'Adoption',      sortable: true, r: true },
    { k: 'cost',    label: 'Spend',         sortable: true, r: true },
    { k: 'limit',   label: 'Limit',         sortable: true, r: true },
    { k: 'limitpct',label: 'Against limit', sortable: true, r: true },
    { k: 'peruser', label: 'Per active user', sortable: true, r: true },
    { k: 'trend',   label: 'Trend',         sortable: false, r: true },
    { k: 'top',     label: 'Top product',   sortable: true }
  ];

  function renderFirms() {
    const r = APP.range();
    const blocker = scopeBlocker();
    const body = document.getElementById('firmBody');
    const head = document.getElementById('firmHead');

    if (blocker) {
      head.innerHTML = '';
      body.innerHTML = '<tr><td colspan="12"></td></tr>';
      body.querySelector('td').appendChild(blocker);
      document.getElementById('firmCount').textContent = '';
      return;
    }

    let rows = APP.scopedFirms().map(function (f) { return firmMetrics(f, r); });
    if (firmQuery) {
      const q = firmQuery.toLowerCase();
      rows = rows.filter(function (m) {
        return m.firm.name.toLowerCase().indexOf(q) !== -1 ||
          m.firm.groups.join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }

    const M = APP.measureDef();
    const accessors = {
      name: function (m) { return m.firm.name.toLowerCase(); },
      country: function (m) { return m.firm.country; },
      seats: function (m) { return m.firm.seats; },
      active: function (m) { return m.peak; },
      adopt: function (m) { return m.adoption == null ? -1 : m.adoption; },
      cost: function (m) { return m.value; },
      limit: function (m) { return m.firm.spendLimit || -1; },
      limitpct: function (m) { return m.limitPct == null ? -1 : m.limitPct; },
      peruser: function (m) { return m.perUser; },
      top: function (m) {
        const i = m.agg.byProduct.indexOf(Math.max.apply(null, m.agg.byProduct));
        return A.products[i] ? A.products[i].name : '';
      }
    };
    const acc = accessors[sortKey] || accessors.cost;
    rows.sort(function (a, b) {
      const x = acc(a), y = acc(b);
      if (x < y) return -sortDir;
      if (x > y) return sortDir;
      return a.firm.name.localeCompare(b.firm.name);
    });

    document.getElementById('firmCount').textContent =
      rows.length + ' of ' + APP.scopedFirms().length + ' firms';

    /* Header */
    head.innerHTML = COLUMNS.filter(function (c) { return !hiddenCols[c.k]; }).map(function (c) {
      if (!c.sortable) return '<th' + (c.r ? ' class="r"' : '') + '><span class="sr">' +
        (c.label || 'Expand') + '</span>' + (c.label ? '<span aria-hidden="true" style="display:block;' +
        'padding:11px 14px;font-size:.71rem;letter-spacing:.05em;text-transform:uppercase">' +
        c.label + '</span>' : '') + '</th>';
      const isSorted = sortKey === c.k;
      const icon = isSorted ? (sortDir === 1 ? 'ph-sort-ascending' : 'ph-sort-descending') : 'ph-arrows-down-up';
      return '<th class="' + (c.r ? 'r' : '') + '"' +
        (isSorted ? ' aria-sort="' + (sortDir === 1 ? 'ascending' : 'descending') + '"' : '') + '>' +
        '<button type="button" data-sort="' + c.k + '">' + c.label +
        '<i class="ph ' + icon + '" aria-hidden="true"></i></button></th>';
    }).join('');

    head.querySelectorAll('[data-sort]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.getAttribute('data-sort');
        if (sortKey === k) sortDir = -sortDir;
        else { sortKey = k; sortDir = (k === 'name' || k === 'country' || k === 'top') ? 1 : -1; }
        renderFirms();
      });
    });

    /* Rows */
    const vis = COLUMNS.filter(function (c) { return !hiddenCols[c.k]; });
    body.innerHTML = rows.map(function (m) {
      const f = m.firm;
      const topI = m.agg.byProduct.indexOf(Math.max.apply(null, m.agg.byProduct));
      const cells = {
        exp: '<button class="rowbtn" type="button" data-exp="' + f.id + '" ' +
          'aria-expanded="' + (!!expanded[f.id]) + '" aria-label="Show product split for ' +
          APP.esc(f.name) + '"><i class="ph ' + (expanded[f.id] ? 'ph-caret-down' : 'ph-caret-right') +
          '" aria-hidden="true"></i></button>',
        name: '<div class="firmcell">' + APP.flagEl(f.country) +
          '<b>' + APP.esc(f.name) + '</b>' +
          (f.duplicateGroups ? '<i class="ph ph-copy" title="Two groups in the directory, rolled up here" ' +
            'style="color:var(--warning)"></i>' : '') +
          (f.partial ? '<i class="ph ph-warning" title="Some staff sit in no group, so their usage is not counted here" ' +
            'style="color:var(--danger)"></i>' : '') +
          (!f.groups.length ? '<i class="ph ph-link-break" title="No group in the Claude directory" ' +
            'style="color:var(--danger)"></i>' : '') + '</div>',
        country: '<span style="white-space:nowrap">' + A.countryByCode(f.country).name + '</span>',
        seats: '<span class="num">' + F.num(f.seats) + '</span>',
        active: f.live ? '<span class="num">' + F.num(m.peak) + '</span>'
          : '<span class="p-mute pill">Not live</span>',
        adopt: m.adoption == null
          ? '<span class="num" title="Accru has not supplied a headcount for this firm">-</span>'
          : '<span class="num">' + F.pct(m.adoption, 0) + '</span>',
        cost: '<span class="num">' + M.fmt(m.value) + '</span>',
        limit: f.spendLimit ? '<span class="num">' + F.moneyExact(f.spendLimit) + '</span>'
          : '<span class="num">-</span>',
        limitpct: limitBullet(m),
        peruser: m.peak ? '<span class="num">' + F.moneyExact(m.perUser) + '</span>'
          : '<span class="num">-</span>',
        trend: f.live ? APP.sparkline(m.daily, { w: 88, h: 26 }) : '',
        top: f.live && m.agg.byProduct[topI] > 0
          ? '<span class="chip">' + A.products[topI].name + '</span>' : ''
      };
      let tr = '<tr' + (expanded[f.id] ? ' class="open"' : '') + '>' +
        vis.map(function (c) {
          return '<td class="' + (c.r ? 'r ' : '') + '">' + cells[c.k] + '</td>';
        }).join('') + '</tr>';
      if (expanded[f.id]) tr += subRow(m, vis.length);
      return tr;
    }).join('');

    body.querySelectorAll('[data-exp]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.getAttribute('data-exp');
        expanded[id] = !expanded[id];
        renderFirms();
      });
    });
    body.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        APP.state.firm = b.getAttribute('data-open');
        APP.state.view = 'firm';
        APP.writeURL(true); APP.renderAll();
      });
    });

    /* Column visibility */
    APP.buildSelect(document.getElementById('colSel'), {
      items: COLUMNS.filter(function (c) { return !c.always; }).map(function (c) {
        return { id: c.k, label: (hiddenCols[c.k] ? '\u2007\u2007 ' : '\u2713 ') + c.label };
      }),
      value: '__none', align: 'right',
      onPick: function (k) { hiddenCols[k] = !hiddenCols[k]; renderFirms(); }
    });
    document.getElementById('colSel').querySelector('button').innerHTML =
      '<i class="ph ph-columns" aria-hidden="true"></i><span>Columns</span>' +
      '<i class="ph ph-caret-down" aria-hidden="true"></i>';

    const filt = document.getElementById('firmFilter');
    if (filt.value !== firmQuery) filt.value = firmQuery;
    filt.oninput = function () { firmQuery = filt.value; renderFirms(); };

    document.getElementById('copyTable').onclick = function () {
      const header = vis.filter(function (c) { return c.k !== 'exp' && c.k !== 'trend'; })
        .map(function (c) { return c.label; }).join('\t');
      const lines = rows.map(function (m) {
        const f = m.firm;
        const topI = m.agg.byProduct.indexOf(Math.max.apply(null, m.agg.byProduct));
        const map = {
          name: f.name, country: A.countryByCode(f.country).name, seats: f.seats,
          active: f.live ? m.peak : 0,
          adopt: m.adoption == null ? '' : (m.adoption * 100).toFixed(1) + '%',
          cost: Math.round(m.value), limit: f.spendLimit || '',
          limitpct: m.limitPct == null ? '' : (m.limitPct * 100).toFixed(0) + '%',
          peruser: m.peak ? m.perUser.toFixed(2) : '',
          top: A.products[topI] && m.agg.byProduct[topI] > 0 ? A.products[topI].name : ''
        };
        return vis.filter(function (c) { return c.k !== 'exp' && c.k !== 'trend'; })
          .map(function (c) { return map[c.k]; }).join('\t');
      });
      APP.copyText([header].concat(lines).join('\n'),
        rows.length + ' rows copied. Paste straight into Excel or Sheets.');
    };
  }

  function limitBullet(m) {
    if (m.limitPct == null) return '<span class="num">-</span>';
    const pct = m.limitPct;
    const cls = pct >= 1 ? 'over' : pct >= 0.85 ? 'warn' : '';
    const w = Math.min(100, pct * 100);
    return '<div class="bullet ' + cls + '">' +
      '<span class="track"><span class="fill" style="width:' + w.toFixed(1) + '%"></span>' +
      '<span class="marker" style="right:0"></span></span>' +
      '<span class="pctv">' + F.pct(pct, 0) + '</span></div>';
  }

  function subRow(m, span) {
    const f = m.firm;
    const total = m.agg.byProduct.reduce(function (s, v) { return s + v; }, 0) || 1;
    const bars = A.products.map(function (p, i) {
      const share = m.agg.byProduct[i] / total;
      return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">' +
        '<span style="width:104px;font-size:.83rem">' + p.name + '</span>' +
        '<span style="flex:1;height:9px;background:var(--surface-sunken);border-radius:2px;max-width:280px">' +
        '<span style="display:block;height:9px;border-radius:2px;width:' + (share * 100).toFixed(1) +
        '%;background:' + p.hue + '"></span></span>' +
        '<span class="num" style="font-size:.83rem;width:74px;text-align:right">' +
        F.moneyExact(m.agg.byProduct[i]) + '</span>' +
        '<span class="num" style="font-size:.83rem;color:var(--ink-muted);width:46px;text-align:right">' +
        F.pct(share, 0) + '</span></div>';
    }).join('');

    const notes = [];
    if (f.duplicateGroups) notes.push('Two groups in the directory, <code>' +
      f.groups.join('</code> and <code>') + '</code>, both rolled into this row.');
    if (f.partial) notes.push('Staff outside <code>' + f.groups[0] + '</code> sit in no group. ' +
      'Groups <code>' + f.missingGroups.join('</code> and <code>') + '</code> were never created, ' +
      'so that usage lands in Unattributed.');
    if (!f.groups.length) notes.push('No group exists in the Claude directory, so no usage can be ' +
      'attributed to this firm at all.');
    if (f.headcount == null) notes.push('Accru has not supplied a headcount, so adoption cannot be ' +
      'computed. Seats are known from the group.');

    return '<tr class="subrow"><td colspan="' + span + '">' +
      '<div style="display:flex;gap:40px;flex-wrap:wrap;align-items:flex-start">' +
      '<div style="min-width:340px"><b style="font-size:.8rem;letter-spacing:.05em;' +
      'text-transform:uppercase;color:var(--ink-muted);display:block;margin-bottom:9px">' +
      'Spend by product</b>' + bars + '</div>' +
      '<div style="min-width:260px;font-size:.85rem">' +
      '<b style="font-size:.8rem;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-muted);' +
      'display:block;margin-bottom:9px">Directory</b>' +
      '<div style="color:var(--ink-muted);margin-bottom:8px">' +
      (f.groups.length ? 'Groups: <code>' + f.groups.join('</code> <code>') + '</code>' : 'No group') +
      '</div>' +
      (notes.length ? '<ul style="margin:0;padding-left:17px;color:var(--ink-muted)"><li>' +
        notes.join('</li><li>') + '</li></ul>' : '') +
      '<button class="btn btn-secondary" type="button" data-open="' + f.id +
      '" style="margin-top:12px"><i class="ph ph-arrow-right" aria-hidden="true"></i> ' +
      'Open firm view</button>' +
      '</div></div></td></tr>';
  }

  /* ===========================================================================
     Spend limits
     =========================================================================== */
  function renderLimits() {
    const host = document.getElementById('watchlist');
    APP.buildSeg(document.getElementById('limitFilter'), [
      { id: 'risk', label: 'At risk' },
      { id: 'all', label: 'All firms' }
    ], limitFilter, function (v) { limitFilter = v; renderLimits(); });

    let rows = APP.scopedFirms().filter(function (f) { return f.spendLimit; })
      .map(function (f) {
        const mtd = monthToDate(f), proj = projectedMonthEnd(f);
        return { f: f, mtd: mtd, proj: proj, limit: f.spendLimit, pct: proj / f.spendLimit };
      })
      .sort(function (a, b) { return b.pct - a.pct; });

    const atRisk = rows.filter(function (x) { return x.pct >= 0.8; });
    document.getElementById('limitsHint').textContent =
      atRisk.length + ' of ' + rows.length + ' firms are at 80 percent of their limit or above, ' +
      'measured on August 2026, the last complete month.';

    if (limitFilter === 'risk') rows = atRisk;

    if (!rows.length) {
      host.innerHTML = '';
      host.appendChild(emptyState('ph-check-circle', 'Nothing approaching a limit',
        'Every firm in this scope is comfortably inside its Claude group spend limit.',
        'Show all firms', function () { limitFilter = 'all'; renderLimits(); }));
      return;
    }

    /* Each bar is normalised to its own limit, not to a shared scale. The point
       of this page is how close a firm is to its own ceiling, and a shared axis
       makes a small firm at 130 percent look safer than a large firm at 60.
       Absolute magnitude is carried by the figures beside each bar. */
    const MARK = 72; /* where the limit sits, as a percentage of track width */

    host.innerHTML = rows.map(function (x) {
      const cls = x.pct >= 1 ? 'p-down' : x.pct >= 0.9 ? 'p-warn' : 'p-ok';
      const label = x.pct >= 1 ? 'Over limit' : x.pct >= 0.9 ? 'Close to limit' : 'Within limit';
      const headroom = x.limit - x.proj;
      const usedW = Math.min(x.pct, 1) * MARK;
      const overW = x.pct > 1 ? Math.min((x.pct - 1) * MARK, 100 - MARK) : 0;
      return '<div class="wl-row">' +
        '<div class="nm">' + APP.flagEl(x.f.country) +
          '<button class="btn btn-ghost" type="button" data-open="' + x.f.id +
          '" style="padding:2px 4px;font-weight:600">' + APP.esc(x.f.name) + '</button></div>' +
        '<div class="wl-bar" role="img" aria-label="' + APP.esc(x.f.name) + ' spent ' +
          F.moneyExact(x.mtd) + ', which is ' + F.pct(x.pct, 0) + ' of its ' +
          F.moneyExact(x.limit) + ' limit">' +
          '<span class="used" style="width:' + usedW.toFixed(1) + '%"></span>' +
          (overW ? '<span class="proj" style="left:' + MARK + '%;width:' +
            overW.toFixed(1) + '%"></span>' : '') +
          '<span class="lim" style="left:' + MARK + '%"></span>' +
        '</div>' +
        '<div class="num" style="text-align:right">' + F.moneyExact(x.proj) +
          '<div style="font-size:.76rem;color:var(--ink-muted)">of ' + F.moneyExact(x.limit) + '</div></div>' +
        '<div style="text-align:right"><span class="pill ' + cls + '">' + label + '</span>' +
          '<div class="num" style="font-size:.76rem;color:var(--ink-muted);margin-top:3px">' +
          (headroom >= 0 ? F.moneyExact(headroom) + ' headroom' : F.moneyExact(-headroom) + ' over') +
          '</div></div>' +
        '</div>';
    }).join('');

    host.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        APP.state.firm = b.getAttribute('data-open');
        APP.state.view = 'firm';
        APP.writeURL(true); APP.renderAll();
      });
    });
  }

  /* ===========================================================================
     Data coverage
     =========================================================================== */
  function renderCoverage() {
    const cv = A.coverage;
    document.getElementById('freshness').innerHTML = [
      ['Engagement data', 'Final to ' + F.date(A.meta.engagementFinalTo),
        'Finalised at 10:00 UTC the following day.'],
      ['Cost data', 'Settled to ' + F.date(A.meta.costSettledTo),
        'Later figures revise for up to 30 days.'],
      ['History starts', F.date(A.meta.dataStart), 'The API holds nothing earlier.'],
      ['Plan', A.meta.plan, 'Cost figures are real spend, not usage credits.']
    ].map(function (x) {
      return '<div><b>' + x[0] + '</b><span style="font-weight:600">' + x[1] + '</span>' +
        '<div style="color:var(--ink-muted);font-size:.8rem">' + x[2] + '</div></div>';
    }).join('');

    const offListLive = cv.offListGroups.filter(function (g) { return g.members > 0; });
    const items = [
      {
        icon: 'ph-user-minus', tone: 'var(--danger)',
        title: 'Unattributed usage',
        fig: F.num(cv.unattributed.users) + ' people',
        body: 'These accounts sit in no group at all, so their spend of ' +
          F.moneyExact(cv.unattributed.cost) + ' cannot be attributed to any firm. It is included in ' +
          'group totals and excluded from every firm row.',
        list: ['Includes staff at ' + Object.keys(cv.partialGroups)[0] +
          ' in Norway and the United Kingdom, whose groups were never created.']
      },
      {
        icon: 'ph-list-plus', tone: 'var(--warning)',
        title: 'Groups not on the Accru register',
        fig: offListLive.length + ' groups, ' + F.num(cv.offListUsers) + ' people',
        body: 'These groups exist in the live Claude directory and are being billed, but they are not ' +
          'on the reference list of member firms. Their spend of roughly ' + F.money(cv.offListCost) +
          ' has nowhere to land until someone confirms whether they belong to the group.',
        list: cv.offListGroups.map(function (g) {
          return '<code>' + g.group + '</code> ' +
            (g.members ? g.members + ' members' : 'empty');
        })
      },
      {
        icon: 'ph-copy', tone: 'var(--warning)',
        title: 'Duplicate and split groups',
        fig: '4 cases',
        body: 'Handled correctly, but flagged in case any of it is unintentional.',
        list: [
          '<code>' + cv.duplicateGroup.name + '</code> exists twice under two group IDs (<code>' +
            cv.duplicateGroup.ids.join('</code>, <code>') + '</code>). Counted once.',
          'Three firms hold two groups each. Both roll into one firm row: ' +
            A.firms.filter(function (f) { return f.duplicateGroups; })
              .map(function (f) { return f.name; }).join(', ') + '.'
        ]
      },
      {
        icon: 'ph-link-break', tone: 'var(--danger)',
        title: 'Firms with no group',
        fig: cv.noGroup.length + ' firms',
        body: 'On the Accru register but absent from the Claude directory. No usage can be attributed ' +
          'to them, and they will show as not live indefinitely until a group is provisioned.',
        list: cv.noGroup
      },
      {
        icon: 'ph-users', tone: 'var(--warning)',
        title: 'Missing headcount',
        fig: cv.missingHeadcount.length + ' firms',
        body: 'The API reports seat counts at organisation level only. Narrowed to one group those ' +
          'fields come back empty by design, so licence utilisation needs a headcount from Accru. ' +
          'Adoption renders as a dash for these firms, never as zero.',
        list: cv.missingHeadcount
      },
      {
        icon: 'ph-hourglass-medium', tone: 'var(--ink-muted)',
        title: 'Provisioned but not yet signed in',
        fig: A.firms.filter(function (f) { return !f.live; }).length + ' firms',
        body: 'Expected during rollout. These firms hold licences and appear in every list with a ' +
          'designed empty state rather than a row of zeros.',
        list: null
      }
    ];

    document.getElementById('coverage').innerHTML = items.map(function (x) {
      return '<div class="cov-item">' +
        '<h3><i class="ph ' + x.icon + '" style="color:' + x.tone + '" aria-hidden="true"></i>' +
        x.title + '</h3>' +
        '<div class="fig">' + x.fig + '</div>' +
        '<p>' + x.body + '</p>' +
        (x.list ? '<ul><li>' + x.list.join('</li><li>') + '</li></ul>' : '') +
        '</div>';
    }).join('');
  }

  /* ===========================================================================
     My firm
     =========================================================================== */
  function renderFirmView() {
    const host = document.getElementById('firmContent');
    const p = APP.persona();
    const fid = p.scope === 'group'
      ? (APP.state.firm !== 'all' ? APP.state.firm : null)
      : p.firm;

    if (!fid) {
      document.getElementById('firmLede').textContent =
        'Pick a firm in the scope bar to see its own view, or open one from the Firms table.';
      host.innerHTML = '';
      host.appendChild(emptyState('ph-buildings', 'No firm selected',
        'This screen is what a managing partner sees when they sign in. As the group persona you ' +
        'can preview any firm by selecting it in the scope bar.',
        'Preview Lindqvist & Söderberg', function () {
          APP.state.firm = 'lindqvist-soderberg';
          APP.state.c = 'SE';
          APP.writeURL(true); APP.renderAll();
        }));
      return;
    }

    const f = A.firmById(fid);
    const r = APP.range();
    const M = APP.measureDef();
    const m = firmMetrics(f, r);

    document.getElementById('firmLede').innerHTML = p.scope === 'group'
      ? 'Previewing what ' + APP.esc(f.name) + ' sees. A firm reader cannot change country or firm, ' +
        'and cannot reach the group screens at all.'
      : 'Your firm\u2019s Claude usage and spend, ' + F.date(A.dates[r.from]) + ' to ' +
        F.date(A.dates[r.to]) + '.';

    if (!f.live) {
      host.innerHTML = '';
      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.appendChild(emptyState('ph-hourglass-medium', f.name + ' has not started yet',
        f.seats + ' licences are provisioned' +
        (f.groups.length ? ' and the group <code>' + f.groups[0] + '</code> is ready in the directory'
          : ', but no group exists in the Claude directory yet') +
        '. Nothing will appear here until the first person signs in. During rollout this is normal.'));
      host.appendChild(panel);
      return;
    }

    const mtd = monthToDate(f), proj = projectedMonthEnd(f);
    const pct = f.spendLimit ? proj / f.spendLimit : null;
    const limitCls = pct == null ? 'p-mute' : pct >= 1 ? 'p-down' : pct >= 0.9 ? 'p-warn' : 'p-ok';
    const limitTxt = pct == null ? 'No limit set' : pct >= 1 ? 'Over limit' : pct >= 0.9 ? 'Close to limit' : 'Within limit';

    /* Licence utilisation. The API cannot give this per firm, so headcount comes
       from Accru and the funnel degrades honestly when it is missing. */
    const everActive = f.people.filter(function (x) { return x.band !== 'dormant'; }).length;
    const funnel = [
      { l: 'Headcount', v: f.headcount, note: f.headcount ? 'supplied by Accru' : 'not supplied' },
      { l: 'Licences assigned', v: f.seats, note: 'from the Claude group' },
      { l: 'Signed in at least once', v: everActive, note: 'ever active' },
      { l: 'Active in this period', v: m.peak, note: 'peak day' },
      { l: 'Active in the last week', v: m.last7, note: 'peak day' }
    ];
    const fmax = f.headcount || f.seats;

    host.innerHTML =
      '<div class="panel">' +
        '<div class="firmhead">' +
          APP.flagEl(f.country) +
          '<div style="flex:1;min-width:240px">' +
            '<h2 style="font-size:1.4rem">' + APP.esc(f.name) + '</h2>' +
            '<div class="meta">' +
              '<div><b>Country</b><span>' + A.countryByCode(f.country).name + '</span></div>' +
              '<div><b>Claude groups</b><span>' + (f.groups.length
                ? f.groups.map(function (g) { return '<code>' + g + '</code>'; }).join(' ')
                : 'none') + '</span></div>' +
              '<div><b>Live since</b><span>' + F.date(f.liveFrom) + '</span></div>' +
              '<div><b>Headcount</b><span>' + (f.headcount || 'not supplied') + '</span></div>' +
            '</div>' +
            (f.duplicateGroups ? '<div class="privacy-note" style="margin-top:14px;margin-bottom:0">' +
              '<i class="ph ph-info" aria-hidden="true"></i><div>This firm holds two groups in the ' +
              'Claude directory. Both are counted here, once each.</div></div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="stat-row">' +
          '<div class="stat"><b>' + M.label + ' in period</b><div class="v">' + M.fmt(m.value) + '</div>' +
            '<div class="s">' + F.date(A.dates[r.from]) + ' to ' + F.date(A.dates[r.to]) + '</div></div>' +
          '<div class="stat"><b>August against limit</b><div class="v">' +
            (pct == null ? '-' : F.pct(pct, 0)) + '</div><div class="s">' +
            F.moneyExact(mtd) + (f.spendLimit ? ' of ' + F.moneyExact(f.spendLimit) : '') + '</div></div>' +
          '<div class="stat"><b>Active users</b><div class="v">' + F.num(m.peak) + '</div>' +
            '<div class="s">of ' + f.seats + ' licences</div></div>' +
          '<div class="stat"><b>Cost per active user</b><div class="v">' +
            (m.peak ? F.moneyExact(m.perUser) : '-') + '</div>' +
            '<div class="s">across the period</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="grid2">' +
        '<div class="panel"><header><div><h2>Spend against limit</h2>' +
          '<div class="hint">The limit is set on the Claude group, in August 2026.</div></div>' +
          '<div class="tools"><span class="pill ' + limitCls + '">' + limitTxt + '</span></div></header>' +
          '<div class="body">' +
            (f.spendLimit
              ? '<div class="wl-bar" style="height:34px" role="img" aria-label="Spent ' +
                F.moneyExact(mtd) + ' of a ' + F.moneyExact(f.spendLimit) + ' limit">' +
                '<span class="used" style="width:' +
                  Math.min(100, mtd / (Math.max(proj, f.spendLimit) * 1.08) * 100).toFixed(1) + '%"></span>' +
                (proj > f.spendLimit ? '<span class="proj" style="left:' +
                  (f.spendLimit / (Math.max(proj, f.spendLimit) * 1.08) * 100).toFixed(1) + '%;width:' +
                  ((proj - f.spendLimit) / (Math.max(proj, f.spendLimit) * 1.08) * 100).toFixed(1) +
                  '%"></span>' : '') +
                '<span class="lim" style="left:' +
                  (f.spendLimit / (Math.max(proj, f.spendLimit) * 1.08) * 100).toFixed(1) + '%"></span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;margin-top:12px;font-size:.87rem">' +
                '<span>Spent <b class="num">' + F.moneyExact(mtd) + '</b></span>' +
                '<span>Limit <b class="num">' + F.moneyExact(f.spendLimit) + '</b></span>' +
                '<span class="num" style="color:' + (pct >= 1 ? 'var(--danger)' : 'var(--ink-muted)') + '">' +
                  (pct >= 1 ? F.moneyExact(proj - f.spendLimit) + ' over'
                    : F.moneyExact(f.spendLimit - proj) + ' headroom') + '</span></div>'
              : '<p style="color:var(--ink-muted);font-size:.9rem;margin:0">No spend limit is set on ' +
                'this firm\u2019s Claude group. Ask the group administrator to set one before usage grows.</p>') +
          '</div></div>' +
        '<div class="panel"><header><div><h2>Licence utilisation</h2>' +
          '<div class="hint">Where the licences you are paying for actually go.</div></div></header>' +
          '<div class="body">' + funnel.map(function (x, i) {
            const val = x.v == null ? null : x.v;
            const w = val == null ? 0 : Math.max(4, val / fmax * 100);
            const hue = ['#722322', '#a04a3a', '#dc6834', '#e89468', '#f0c4a8'][i];
            return '<div class="funnel-row"><span class="fl">' + x.l + '</span>' +
              (val == null
                ? '<span class="fn">not available</span>'
                : '<span class="fb" style="width:' + w.toFixed(1) + '%;background:' + hue +
                  (i > 2 ? ';color:#2b2523' : '') + '">' + F.num(val) + '</span>' +
                  '<span class="fn">' + x.note + '</span>') +
              '</div>';
          }).join('') +
          (f.headcount ? '' : '<div class="privacy-note"><i class="ph ph-info" aria-hidden="true"></i>' +
            '<div>Accru has not supplied a headcount for this firm, so the top of the funnel is ' +
            'unknown. Everything below it is measured, not estimated.</div></div>') +
          '</div></div>' +
      '</div>' +

      '<div class="panel"><header><div><h2>Trend against the group</h2>' +
        '<div class="hint">Your firm against the median member firm, per active user, so size does not distort it.</div></div></header>' +
        '<div class="body"><div class="chart" id="firmTrend" style="height:300px"></div></div></div>' +

      '<div class="panel"><header><div><h2>Your team</h2>' +
        '<div class="hint">Sorted by activity. Dormant licences are the ones worth acting on.</div></div>' +
        '<div class="tools">' +
          '<button class="btn btn-secondary" id="revealBtn" type="button">' +
          '<i class="ph ' + (revealPeople ? 'ph-eye-slash' : 'ph-eye') + '" aria-hidden="true"></i> ' +
          (revealPeople ? 'Hide exact figures' : 'Show exact figures') + '</button></div></header>' +
        '<div class="body" style="padding-bottom:0">' +
          '<div class="privacy-note"><i class="ph ph-shield-check" aria-hidden="true"></i><div>' +
          (revealPeople
            ? 'Exact per-person spend is visible. This is an administrator action and should be logged. ' +
              'Consider whether your works council or data protection notice permits it.'
            : 'Per-person activity is shown in bands by default. Exact spend per colleague is available ' +
              'to firm administrators but hidden here, because a dashboard should not volunteer it.') +
          '</div></div>' +
        '</div>' +
        '<div class="body flush"><div class="tablewrap" style="max-height:460px">' +
          '<table><caption class="sr">People at ' + APP.esc(f.name) + '</caption>' +
          '<thead><tr><th><span style="display:block;padding:11px 14px">Person</span></th>' +
          '<th><span style="display:block;padding:11px 14px">Role</span></th>' +
          '<th><span style="display:block;padding:11px 14px">Activity</span></th>' +
          '<th><span style="display:block;padding:11px 14px">Main product</span></th>' +
          '<th class="r"><span style="display:block;padding:11px 14px">Last active</span></th>' +
          (revealPeople ? '<th class="r"><span style="display:block;padding:11px 14px">Spend</span></th>' +
            '<th class="r"><span style="display:block;padding:11px 14px">Messages</span></th>' : '') +
          '</tr></thead><tbody>' +
          f.people.map(function (person) {
            const prod = person.topProduct
              ? A.products.filter(function (x) { return x.id === person.topProduct; })[0] : null;
            return '<tr>' +
              '<td><b>' + APP.esc(person.name) + '</b></td>' +
              '<td style="color:var(--ink-muted)">' + person.role + '</td>' +
              '<td>' + bandEl(person.band) + '</td>' +
              '<td>' + (prod ? '<span class="chip">' + prod.name + '</span>' : '') + '</td>' +
              '<td class="r num" style="color:var(--ink-muted)">' +
                (person.lastActive ? F.date(person.lastActive) : 'never') + '</td>' +
              (revealPeople
                ? '<td class="r num">' + (person.share ? F.moneyExact(m.agg.cost * person.share) : '-') + '</td>' +
                  '<td class="r num">' + (person.share ? F.num(m.agg.msgs * person.share) : '-') + '</td>'
                : '') +
              '</tr>';
          }).join('') +
          '</tbody></table></div></div>' +
        '<details class="prov"><summary><i class="ph ph-caret-right" aria-hidden="true"></i> ' +
        'Data source and behaviour</summary><dl class="pbody">' +
        '<dt>Endpoints</dt><dd><code>/analytics/users</code> per employee per day, ' +
        '<code>/analytics/user_cost_report</code> for spend.</dd>' +
        '<dt>Privacy</dt><dd>Bands are the default. Exact figures are an explicit, logged reveal. ' +
        'Decide the policy before launch, not after the first complaint.</dd>' +
        '<dt>Build note</dt><dd>Dormant means a licence assigned with no recorded activity. ' +
        'It is the cheapest saving available and should be surfaced first.</dd>' +
        '</dl></details>' +
      '</div>';

    document.getElementById('revealBtn').onclick = function () {
      revealPeople = !revealPeople; renderFirmView();
    };

    /* Firm against the median firm, normalised per active user. */
    const dates = A.dates.slice(r.from, r.to + 1);
    const mine = [], median = [];
    const peers = A.firms.filter(function (x) { return x.live; });
    for (let i = r.from; i <= r.to; i++) {
      const d = f.series[i];
      mine.push(d.active ? d.cost / d.active : 0);
      const vals = [];
      peers.forEach(function (x) {
        const dd = x.series[i];
        if (dd.active) vals.push(dd.cost / dd.active);
      });
      vals.sort(function (a, b) { return a - b; });
      median.push(vals.length ? vals[Math.floor(vals.length / 2)] : 0);
    }
    /* A single firm of this size has a very noisy daily figure. This chart answers
       "are we drifting against our peers", which is a question about the trend,
       so both lines are a trailing weekly mean. */
    const mineS = APP.movingAverage(mine, 7), medianS = APP.movingAverage(median, 7);
    APP.draw('firmTrend', {
      grid: { left: 60, right: 20, top: 36, bottom: 34 },
      legend: { top: 0, left: 0 },
      tooltip: { trigger: 'axis', formatter: function (ps) {
        let s = '<b>' + F.date(ps[0].axisValue) + '</b><br/>';
        ps.forEach(function (x) { s += x.marker + x.seriesName + ' <b>' + F.moneyExact(x.value) + '</b><br/>'; });
        return s;
      } },
      xAxis: { type: 'category', data: dates, boundaryGap: false,
        axisLabel: { formatter: function (v) { return F.dateShort(v); } } },
      yAxis: { type: 'value', name: 'Cost per active user per day, seven day average',
        nameTextStyle: { color: APP.MUTED, fontSize: 11 }, nameGap: 14,
        axisLabel: { formatter: function (v) { return F.money(v); } } },
      series: [
        { name: f.name, type: 'line', smooth: 0.3, showSymbol: false,
          lineStyle: { width: 2.2, color: '#b8501c' },
          areaStyle: { color: 'rgba(184,80,28,.12)' }, data: mineS },
        { name: 'Median member firm', type: 'line', smooth: 0.3, showSymbol: false,
          lineStyle: { width: 1.5, color: '#6f6659', type: 'dashed' }, data: medianS }
      ]
    });
  }

  /* ===========================================================================
     My usage
     =========================================================================== */
  function renderMe() {
    const host = document.getElementById('meContent');
    const p = APP.persona();
    const f = A.firmById(p.firm || 'lindqvist-soderberg');
    const r = APP.range();
    /* The signed-in person. For the group persona this is a preview of what an
       employee sees, using a real roster member. */
    const me = p.scope === 'self'
      ? (f.people.filter(function (x) { return x.name === p.name; })[0] || f.people[2])
      : f.people[2];
    const firmAgg = A.aggregate([f], r.from, r.to);

    document.getElementById('meLede').textContent = p.scope === 'self'
      ? 'Your own Claude activity, and how it sits against your firm.'
      : 'Previewing what an individual employee sees. Nobody else\u2019s figures are visible from here.';

    const myCost = firmAgg.cost * me.share;
    const myMsgs = firmAgg.msgs * me.share;
    const mySess = firmAgg.sess * me.share;
    const rank = f.people.filter(function (x) { return x.share > me.share; }).length + 1;

    /* Start from the firm's mix scaled to this person's share, then lift their
       stated main product so it is genuinely the largest. Computed before the
       markup so the headline sentence and the chart cannot disagree, and so both
       agree with the Main product column on the team table. */
    const base = A.products.map(function (prod, i) { return firmAgg.byProduct[i] * me.share; });
    const topIdx = A.products.map(function (x) { return x.id; }).indexOf(me.topProduct);
    if (topIdx !== -1) {
      const other = Math.max.apply(null, base.filter(function (v, i) { return i !== topIdx; }));
      base[topIdx] = Math.max(base[topIdx], other * 1.45);
    }
    const myProducts = A.products.map(function (prod, i) {
      return { name: prod.name, value: base[i], hue: prod.hue };
    });
    const mainProduct = myProducts.slice().sort(function (a, b) { return b.value - a.value; })[0];

    host.innerHTML =
      '<div class="panel"><div class="stat-row">' +
        '<div class="stat"><b>Your spend</b><div class="v">' + F.moneyExact(myCost) + '</div>' +
          '<div class="s">' + F.pct(me.share, 1) + ' of your firm</div></div>' +
        '<div class="stat"><b>Messages</b><div class="v">' + F.compact(myMsgs) + '</div>' +
          '<div class="s">' + F.num(mySess) + ' Claude Code sessions</div></div>' +
        '<div class="stat"><b>Activity level</b><div class="v" style="font-size:1.25rem;padding-top:6px">' +
          bandEl(me.band) + '</div><div class="s">' + rank + ' of ' + f.people.length + ' at your firm</div></div>' +
        '<div class="stat"><b>Last active</b><div class="v" style="font-size:1.25rem;padding-top:8px">' +
          (me.lastActive ? F.date(me.lastActive) : 'never') + '</div>' +
          '<div class="s">' + APP.esc(me.role) + '</div></div>' +
      '</div></div>' +

      '<div class="grid2">' +
        '<div class="panel"><header><div><h2>Your daily activity</h2>' +
          '<div class="hint">Since your firm went live on ' + F.date(f.liveFrom) + '.</div></div></header>' +
          '<div class="body"><div class="chart" id="meCal" style="height:200px"></div></div></div>' +
        '<div class="panel"><header><div><h2>Where your usage goes</h2>' +
          '<div class="hint">Your main surface is ' +
          (me.topProduct && mainProduct ? mainProduct.name : 'not yet established') +
          '.</div></div></header>' +
          '<div class="body"><div class="chart" id="meProduct" style="height:200px"></div></div></div>' +
      '</div>' +

      '<div class="panel"><header><div><h2>Worth trying next</h2>' +
        '<div class="hint">Skills used by colleagues with similar work, drawn from the Hub catalogue.</div></div></header>' +
        '<div class="body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">' +
        A.skills.filter(function (s) { return s.inHub; }).slice(0, 3).map(function (s) {
          return '<div style="border:1px solid var(--rule);border-radius:var(--r-card);padding:16px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<b style="font-family:Gelasio,serif;color:var(--brand-red);font-size:1.05rem">' +
            APP.esc(s.name) + '</b>' + APP.flagEl(s.origin) + '</div>' +
            '<div style="font-size:.85rem;color:var(--ink-muted);margin-bottom:12px">' +
            F.num(s.users) + ' people across ' + s.firms + ' firms use this.</div>' +
            '<a href="index.html" class="btn btn-secondary" style="text-decoration:none">' +
            '<i class="ph ph-arrow-right" aria-hidden="true"></i> Open in the Hub</a></div>';
        }).join('') +
        '</div>' +
        '<details class="prov"><summary><i class="ph ph-caret-right" aria-hidden="true"></i> ' +
        'Data source and behaviour</summary><dl class="pbody">' +
        '<dt>Endpoint</dt><dd><code>/analytics/skills</code> joined to the Hub asset catalogue.</dd>' +
        '<dt>Why it is here</dt><dd>This is the link back to the Hub\u2019s actual purpose. A usage ' +
        'dashboard that only reports is a cost centre. One that routes people to the next useful ' +
        'asset is part of the product.</dd>' +
        '</dl></details>' +
      '</div>';

    /* Personal calendar, derived from the firm curve scaled by this person's share. */
    const data = [];
    let max = 0;
    for (let i = 0; i < A.meta.dayCount; i++) {
      const d = f.series[i];
      const v = d.active ? Math.round(d.msgs * me.share * (1 + (i % 5) * 0.06)) : 0;
      if (v > max) max = v;
      data.push([A.dates[i], v]);
    }
    APP.draw('meCal', {
      tooltip: { formatter: function (x) {
        return '<b>' + F.date(x.data[0]) + '</b><br/>' + F.num(x.data[1]) + ' messages';
      } },
      visualMap: { min: 0, max: max || 1, show: false, inRange: { color: APP.SEQUENTIAL } },
      calendar: {
        top: 26, left: 40, right: 16, cellSize: ['auto', 13],
        range: [A.dates[0], A.dates[A.meta.dayCount - 1]],
        itemStyle: { color: '#f3f0ea', borderWidth: 2, borderColor: '#fff' },
        splitLine: { show: false }, yearLabel: { show: false },
        dayLabel: { nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], color: APP.MUTED, fontSize: 9 },
        monthLabel: { color: APP.MUTED, fontSize: 10,
          nameMap: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: data }]
    });

    const tot = myProducts.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    APP.draw('meProduct', {
      grid: { left: 92, right: 82, top: 8, bottom: 8 },
      tooltip: { trigger: 'item', formatter: function (x) {
        return '<b>' + x.name + '</b><br/>' + F.pct(x.value / tot, 0) + ' of your usage';
      } },
      xAxis: { type: 'value', show: false, max: Math.max.apply(null, myProducts.map(function (x) { return x.value; })) * 1.35 },
      yAxis: { type: 'category', axisLine: { show: false }, axisLabel: { fontSize: 11 },
        data: myProducts.map(function (x) { return x.name; }).reverse() },
      series: [{
        type: 'bar', barWidth: 16,
        data: myProducts.slice().reverse().map(function (x) {
          return { value: x.value, itemStyle: { color: x.hue, borderRadius: [0, 3, 3, 0] } };
        }),
        label: { show: true, position: 'right', color: APP.MUTED, fontSize: 11,
          formatter: function (x) { return F.pct(x.value / tot, 0); } }
      }]
    });
  }

  /* ===========================================================================
     Handoff notes
     =========================================================================== */
  function renderNotes() {
    document.getElementById('notes').innerHTML =
      '<h3>What this prototype is</h3>' +
      '<p>A clickable design specification, not an application. Every screen, state, metric ' +
      'definition and edge case is intended to be implemented as shown. The data is invented, ' +
      'the structure is not.</p>' +

      '<h3>The URL contract</h3>' +
      '<p>Scope lives in the URL so a view can be pasted into Teams and land on the same screen. ' +
      'Back and forward work, and the last-used scope should persist to the user profile.</p>' +
      '<p><code>?view=group&amp;c=SE&amp;firm=lindqvist-soderberg&amp;period=p90&amp;measure=spend&amp;as=firm</code></p>' +
      '<ul>' +
      '<li><code>view</code> one of <code>group</code>, <code>firms</code>, <code>limits</code>, ' +
        '<code>coverage</code>, <code>firm</code>, <code>me</code>, <code>notes</code></li>' +
      '<li><code>c</code> country code or <code>all</code>. <code>firm</code> firm slug or <code>all</code></li>' +
      '<li><code>period</code> one of the presets. Production should also accept explicit ' +
        '<code>from</code> and <code>to</code> dates</li>' +
      '<li><code>as</code> is a prototype affordance only. In production the persona comes from ' +
        'Entra group membership and must be enforced server side</li>' +
      '</ul>' +

      '<h3>Permissions</h3>' +
      '<p>Scope is a lens for the group persona and a wall for everyone else. A firm reader is pinned ' +
      'to their own firm, cannot change the country or firm control, and cannot reach the group ' +
      'screens. Enforce this on the server. The disabled control in the UI is a convenience, not a ' +
      'security boundary.</p>' +
      '<table><thead><tr><th>Persona</th><th>Sees</th><th>Cannot see</th></tr></thead><tbody>' +
      '<tr><td>Group, Head of AI</td><td>Everything, all four countries</td><td>Nothing withheld</td></tr>' +
      '<tr><td>Firm administrator</td><td>Own firm aggregate, own team, own spend limit, group median as ' +
        'a benchmark</td><td>Other firms by name, group totals, the firms table</td></tr>' +
      '<tr><td>Employee</td><td>Own usage, own firm aggregate</td><td>Named colleagues, spend limits, ' +
        'anything group level</td></tr>' +
      '</tbody></table>' +

      '<h3>Metric definitions</h3>' +
      '<table><thead><tr><th>Metric</th><th>Definition</th><th>Source</th></tr></thead><tbody>' +
      '<tr><td>Active users</td><td>Peak daily active within the period. Not a distinct count across ' +
        'days, which the API does not provide per group.</td><td><code>/analytics/users</code></td></tr>' +
      '<tr><td>Adoption</td><td>Active users divided by headcount. Renders as a dash when headcount is ' +
        'missing, never zero.</td><td>Derived, needs Accru headcount</td></tr>' +
      '<tr><td>Licence utilisation</td><td>Active users divided by assigned seats. Always available, ' +
        'unlike adoption.</td><td><code>read:rbac_groups</code></td></tr>' +
      '<tr><td>Spend</td><td>Real currency. The Accru plan is usage based, so cost endpoints report ' +
        'actual spend rather than usage credits.</td><td><code>/analytics/user_cost_report</code></td></tr>' +
      '<tr><td>Cost per active user</td><td>Period spend divided by peak daily active. The fairest ' +
        'cross-firm comparison, because it removes firm size.</td><td>Derived</td></tr>' +
      '<tr><td>Against limit</td><td>Spend in the last complete calendar month divided by the group ' +
        'spend limit.</td><td><code>read:spend_limits</code></td></tr>' +
      '</tbody></table>' +

      '<h3>Refresh and revision</h3>' +
      '<ul>' +
      '<li>Engagement data for a day is final at 10:00 UTC the following day. Run the daily pull ' +
        'shortly after.</li>' +
      '<li>Cost is revised for up to 30 days. Re-pull the trailing month on every run rather than ' +
        'appending. Recent figures will move for a few weeks before settling.</li>' +
      '<li>Anything invoicing-grade uses figures at least 30 days old. The dashboard marks the ' +
        'unsettled window on the trend chart rather than hiding it.</li>' +
      '<li>The rate limit is 60 requests per minute organisation-wide and cannot be raised. Steady ' +
        'state is roughly 12 to 15 requests per day, so it is not a constraint. The historical ' +
        'backfill is around 2,000 requests and completes in about 35 minutes.</li>' +
      '<li>No history before 1 January 2026. Do not build a year-on-year toggle before 2027.</li>' +
      '</ul>' +

      '<h3>Attribution rules</h3>' +
      '<ul>' +
      '<li>The live Claude directory is the source of truth for groups. The Accru register is the ' +
        'source of truth for firm names and countries.</li>' +
      '<li>Where a firm holds two groups, both roll into one firm row. Do not present them separately.</li>' +
      '<li>Where a group is duplicated under two IDs, count it once.</li>' +
      '<li>Usage from accounts in no group goes to an explicit Unattributed bucket. It is included in ' +
        'group totals and excluded from every firm row. Never silently drop it and never spread it ' +
        'proportionally.</li>' +
      '<li>Recompute the reconciliation on every run. Groups appear and disappear during rollout, and ' +
        'a stale mapping misattributes spend without saying so.</li>' +
      '</ul>' +

      '<h3>Design system</h3>' +
      '<ul>' +
      '<li>All tokens come from the <a href="index.html">v0.3 design system</a>. Nothing new is ' +
        'invented except the chart palette, which is specified in section 11 of the UX spec.</li>' +
      '<li>Country hues are fixed across every chart so the eye learns them. Norway deep red, Sweden ' +
        'orange, Denmark green, United Kingdom stone.</li>' +
      '<li>Colour is never the only signal. Stacked series carry distinct line styles, statuses carry ' +
        'a text label, and every chart has a tooltip with the figure in words.</li>' +
      '<li>All figures use tabular numerals. One date format, <code>12 Jun 2026</code>, everywhere.</li>' +
      '<li>Charts are Apache ECharts 5 in this prototype. Any equivalent library is fine in ' +
        'production. The theme block at the top of the app file is the part worth porting.</li>' +
      '</ul>' +

      '<h3>Accessibility</h3>' +
      '<p>WCAG 2.2 AA is a legal requirement in all four countries, so it is a build requirement here. ' +
      'Sorting, menus and the persona switcher are keyboard operable, focus uses the two-tone ' +
      '<code>:focus-visible</code> ring, hit targets are at least 44px, and chart animation is ' +
      'disabled under <code>prefers-reduced-motion</code>. Every chart needs a table alternative in ' +
      'production. The Copy as TSV control is the first step, not the whole answer.</p>' +

      '<h3>Open questions for Accru</h3>' +
      '<ul>' +
      '<li>Per-person spend visibility inside a firm. Bands are the default here. Confirm what works ' +
        'councils and data protection notices permit in each of the four countries before launch.</li>' +
      '<li>Headcount per member firm. Without it, adoption cannot be computed and the licence ' +
        'utilisation funnel is missing its top row.</li>' +
      '<li>The seven off-register groups holding 74 people. Include them, or exclude them explicitly.</li>' +
      '<li>Whether the two firms with no group are to be provisioned, and whether the missing country ' +
        'groups for the split firm should be created.</li>' +
      '</ul>';
  }

  /* ===========================================================================
     Router
     =========================================================================== */
  function renderAll() {
    APP = window.ACCRU_APP;
    APP.renderNav();
    APP.renderScopeBar();

    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('on'); });
    const el = document.getElementById('view-' + APP.state.view);
    if (el) el.classList.add('on');

    switch (APP.state.view) {
      case 'group':    renderGroup(); break;
      case 'firms':    renderFirms(); break;
      case 'limits':   renderLimits(); break;
      case 'coverage': renderCoverage(); break;
      case 'firm':     renderFirmView(); break;
      case 'me':       renderMe(); break;
      case 'notes':    renderNotes(); break;
    }

    /* Charts created while hidden have no size. Resize once the view is on. */
    requestAnimationFrame(function () {
      ['trendChart', 'scatterChart', 'productBars', 'productTree', 'modelChart', 'skillsChart',
       'calChart', 'firmTrend', 'meCal', 'meProduct'].forEach(function (id) {
        const c = APP.chart(id);
        const node = document.getElementById(id);
        if (c && node && node.offsetParent !== null) c.resize();
      });
    });
  }

  window.ACCRU_VIEWS = { renderAll: renderAll };
})();
