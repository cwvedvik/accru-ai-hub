/* =============================================================================
   Accru AI Hub - Claude usage and adoption dashboard
   Mock data layer

   ILLUSTRATIVE DATA. Every firm name, person and figure below is invented.
   Nothing here comes from the live Claude Enterprise organisation.

   -----------------------------------------------------------------------------
   Field provenance: where each figure comes from in production
   -----------------------------------------------------------------------------
   meta.licences, meta.pendingInvites   /analytics/summaries      assigned seats, pending invites
   day.active                           /analytics/summaries      daily active users (org level)
                                        /analytics/users          rolled up per group for firm level
   day.msgs                             /analytics/users          chat messages per user per day
   day.sess                             /analytics/users          Claude Code sessions per user per day
   day.tok                              /analytics/user_usage_report   token consumption per user
   day.cost, day.pc[]                   /analytics/user_cost_report    cost per user, attributed by group
   model mix                            /analytics/cost_report    org totals broken down by model
   product mix                          /analytics/usage_report   org totals broken down by product
   firm.groups                          /analytics/users .group   plus read:rbac_groups for the directory
   firm.spendLimit                      read:spend_limits         set at group level
   firm.headcount                       NOT AVAILABLE FROM THE API. Supplied by Accru.
                                        The API returns seat counts at org level only; narrowed to a
                                        single group those fields come back empty by design.
   skills[]                             /analytics/skills

   Refresh cadence modelled below:
   engagement for a given day is final at 10:00 UTC the following day, so the last
   complete engagement day is yesterday. Cost is revised for up to 30 days as late
   events reconcile, so anything inside the trailing 30 days is marked unsettled.
   ============================================================================= */

(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------------
     Seeded pseudo-random number generator.
     One stream, consumed in a fixed order, so every reload renders identically.
     --------------------------------------------------------------------------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(0x5f3a91c7);
  const between = (lo, hi) => lo + rand() * (hi - lo);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const chance = (p) => rand() < p;

  /* Box-Muller, clamped, for organic spreads that are not uniform noise. */
  function gauss(mean, sd) {
    const u = Math.max(rand(), 1e-9);
    const v = Math.max(rand(), 1e-9);
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------------------------------------------------------------------------
     Calendar
     --------------------------------------------------------------------------- */
  const DATA_START = '2026-01-01';   // the API holds nothing earlier
  const TODAY = '2026-09-03';
  const ENGAGEMENT_FINAL_TO = '2026-09-02'; // yesterday, finalised at 10:00 UTC today
  const COST_SETTLED_TO = '2026-08-04';     // 30 days of revision behind the engagement edge

  function toDate(s) {
    const p = s.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function toISO(d) {
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(a, b) {
    return Math.round((toDate(b) - toDate(a)) / 86400000);
  }

  const DAY_COUNT = daysBetween(DATA_START, ENGAGEMENT_FINAL_TO) + 1; // 245
  const DATES = [];
  const DOW = [];
  for (let i = 0; i < DAY_COUNT; i++) {
    const d = new Date(toDate(DATA_START).getTime() + i * 86400000);
    DATES.push(toISO(d));
    DOW.push(d.getUTCDay()); // 0 Sunday, 6 Saturday
  }
  const SETTLED_INDEX = daysBetween(DATA_START, COST_SETTLED_TO); // last fully settled cost day

  /* ---------------------------------------------------------------------------
     Reference dimensions
     --------------------------------------------------------------------------- */
  const COUNTRIES = [
    { code: 'NO', name: 'Norway',         hue: '#722322', flag: 'no' },
    { code: 'SE', name: 'Sweden',         hue: '#dc6834', flag: 'se' },
    { code: 'DK', name: 'Denmark',        hue: '#3d6b4a', flag: 'dk' },
    { code: 'UK', name: 'United Kingdom', hue: '#6f6659', flag: 'gb' }
  ];

  /* Per-product daily cost per active user, in USD, before firm intensity.
     share is the fraction of a firm's active users who touch that product on a
     given day. Claude Code reaches few people but costs the most per head. */
  const PRODUCTS = [
    { id: 'chat',   name: 'Claude chat', hue: '#722322', rate: 2.28, share: 0.94 },
    { id: 'code',   name: 'Claude Code', hue: '#dc6834', rate: 6.00, share: 0.21 },
    { id: 'cowork', name: 'Cowork',      hue: '#3d6b4a', rate: 2.00, share: 0.34 },
    { id: 'office', name: 'Office',      hue: '#6f6659', rate: 1.22, share: 0.47 },
    { id: 'design', name: 'Design',      hue: '#a04a3a', rate: 2.05, share: 0.11 }
  ];
  const P = PRODUCTS.length;

  /* Model mix is reported per product by /analytics/cost_report.
     Code leans on Opus, everyday chat leans on Sonnet, batch work on Haiku. */
  const MODELS = [
    { id: 'opus',   name: 'Opus 4.6',   hue: '#722322', mix: [0.21, 0.58, 0.24, 0.09, 0.31] },
    { id: 'sonnet', name: 'Sonnet 4.6', hue: '#dc6834', mix: [0.66, 0.37, 0.62, 0.58, 0.61] },
    { id: 'haiku',  name: 'Haiku 4.5',  hue: '#3d6b4a', mix: [0.13, 0.05, 0.14, 0.33, 0.08] }
  ];

  /* ---------------------------------------------------------------------------
     Firm directory. 71 invented firms, locale-appropriate.
     hc = headcount supplied by Accru. null means Accru has not supplied it yet,
          so licence utilisation cannot be computed and must render as a dash.
     --------------------------------------------------------------------------- */
  const FIRM_SEED = [
    // Norway
    ['Bjørnstad Regnskap', 'NO', 34], ['Fjordvik Revisjon', 'NO', 61],
    ['Nordal & Sæther', 'NO', 22], ['Haugtun Økonomi', 'NO', 17],
    ['Vestby Regnskapshus', 'NO', 48], ['Kvernland Revisjon', 'NO', 29],
    ['Sundfør & Partnere', 'NO', 73], ['Almli Regnskap', 'NO', 13],
    ['Trondhjem Revisorgruppen', 'NO', 56], ['Lysaker Økonomitjenester', 'NO', 26],
    ['Berghaug Regnskap', 'NO', null], ['Storøy Revisjon', 'NO', 19],
    ['Rypdal & Aune', 'NO', 41], ['Nordmark Regnskapsbyrå', 'NO', 31],
    ['Eikeland Revisjon', 'NO', 24], ['Skarvang Økonomi', 'NO', 11],
    ['Holtane Regnskap', 'NO', 37], ['Vikhammer Revisjon', 'NO', 15],
    ['Grimsrud Regnskap', 'NO', 28], ['Åsheim Revisjon', 'NO', 44],
    // Sweden
    ['Lindqvist & Söderberg', 'SE', 67], ['Vallmo Redovisning', 'SE', 23],
    ['Ekhagen Revisionsbyrå', 'SE', 39], ['Strandberg & Nyman', 'SE', 52],
    ['Tallhöjden Ekonomi', 'SE', 18], ['Wibergs Redovisning', 'SE', 30],
    ['Klarälven Revision', 'SE', 46], ['Nordsken Redovisning', 'SE', 14],
    ['Åkerlund & Sjögren', 'SE', 58], ['Björkvik Ekonomibyrå', 'SE', 21],
    ['Grönlid Revision', 'SE', null], ['Malmsten & Frost', 'SE', 35],
    ['Rosengren Redovisning', 'SE', 27], ['Sundhagen Revisionsbyrå', 'SE', 42],
    ['Almroth Ekonomi', 'SE', 16], ['Vinterberg Redovisning', 'SE', 33],
    ['Hägerstrand Revision', 'SE', 25], ['Kvarnholmen Ekonomi', 'SE', 49],
    ['Torslanda Redovisning', 'SE', 12], ['Ödmann & Kvist', 'SE', 20],
    // Denmark
    ['Dalgaard & Lynge', 'DK', 54], ['Nørrebro Revision', 'DK', 32],
    ['Kjærsgaard Regnskab', 'DK', 19], ['Hvidsten & Brix', 'DK', 43],
    ['Vestergaard Revisionsfirma', 'DK', 26], ['Møllehøj Regnskab', 'DK', 15],
    ['Strandby Revision', 'DK', 38], ['Blichfeldt & Toft', 'DK', 22],
    ['Aarhus Revisorhuset', 'DK', 63], ['Frederikslund Økonomi', 'DK', null],
    ['Holmgaard Regnskab', 'DK', 29], ['Skovgaard & Riis', 'DK', 47],
    ['Egedal Revision', 'DK', 17], ['Rosenholm Revision', 'DK', 24],
    ['Bagsværd Regnskab', 'DK', 36],
    // United Kingdom
    ['Marchmont & Hale', 'UK', 71], ['Pennington Clarke', 'UK', 45],
    ['Kestrel Accountancy', 'UK', 58], ['Bradshaw Fenwick', 'UK', 27],
    ['Whitmore & Gale', 'UK', 34], ['Ashcombe Partners', 'UK', 19],
    ['Ravensworth Accountants', 'UK', 41], ['Thornleigh & Co', 'UK', 23],
    ['Calder Vale Accountancy', 'UK', 31], ['Merrick Stone', 'UK', 52],
    ['Harbury Financial', 'UK', 16], ['Stanhope & Reeve', 'UK', 38],
    ['Ellerby Accountancy', 'UK', 21], ['Fairhaven Partners', 'UK', 29],
    ['Netherby Accountancy', 'UK', 26], ['Ludworth & Payne', 'UK', 33]
  ];

  function slug(name) {
    return name.toLowerCase()
      .replace(/å|ä|æ/g, 'a').replace(/ø|ö/g, 'o').replace(/é/g, 'e')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* ---------------------------------------------------------------------------
     Directory reconciliation. These are the deliberate edge cases the dashboard
     has to render honestly rather than quietly averaging away.
     --------------------------------------------------------------------------- */

  /* Three firms hold two groups each in the directory. Both resolve to one firm. */
  const DOUBLE_GROUPED = {
    'Bjørnstad Regnskap':    ['bjornstad-regnskap', 'bjornstadr'],
    'Lindqvist & Söderberg': ['lindqvist-soderberg', 'lqs-koncern'],
    'Dalgaard & Lynge':      ['dalgaard-lynge', 'dl-revision']
  };

  /* On the reference list against three country groups, but only the Danish
     group exists in the directory. Norwegian and British staff sit in no group,
     so their usage cannot be attributed to the firm. */
  const PARTIAL_GROUPS = {
    'Kestrel Accountancy': { present: ['DK-kestrel'], missing: ['NO-kestrel', 'UK-kestrel'] }
  };

  /* On the reference list, no group in the directory at all. */
  const NO_GROUP = ['Netherby Accountancy', 'Torslanda Redovisning'];

  /* Not yet live. Provisioned but nobody has signed in, or not provisioned yet.
     Claude rollout is still in progress, so this set is expected to shrink weekly. */
  const NOT_LIVE = [
    'Skarvang Økonomi', 'Vikhammer Revisjon', 'Storøy Revisjon', 'Almli Regnskap',
    'Nordsken Redovisning', 'Almroth Ekonomi', 'Ödmann & Kvist', 'Torslanda Redovisning',
    'Møllehøj Regnskab', 'Egedal Revision', 'Rosenholm Revision', 'Kjærsgaard Regnskab',
    'Harbury Financial', 'Ellerby Accountancy', 'Ashcombe Partners', 'Netherby Accountancy',
    'Berghaug Regnskap', 'Grönlid Revision', 'Frederikslund Økonomi'
  ];

  /* Firms whose rollout date is pinned rather than drawn from the wave lottery.
     These carry the narrative: the firm-level persona needs a full history, and
     every firm on the tight-spend-limit list needs enough run rate to be worth
     watching. Left to chance, half of them land in August with nothing to show. */
  const PINNED_START = {
    'Lindqvist & Söderberg': 5,   'Marchmont & Hale': 11,
    'Sundfør & Partnere': 8,      'Aarhus Revisorhuset': 20,
    'Klarälven Revision': 30,     'Merrick Stone': 42,
    'Fjordvik Revisjon': 15,      'Bagsværd Regnskab': 25,
    'Pennington Clarke': 6,       'Vestby Regnskapshus': 18
  };

  /* Groups that exist in the live directory but are not on Accru's reference list.
     Their usage is real and is being billed, it just has nowhere to land. */
  const OFF_LIST_GROUPS = [
    { group: 'sporrong-eriksson',  members: 27, country: 'SE' },
    { group: 'solregn-ekonomi',    members: 17, country: 'SE' },
    { group: 'tre-hander',         members: 12, country: 'SE' },
    { group: 'signas-redovisning', members: 8,  country: 'SE' },
    { group: 'adrevicor',          members: 6,  country: 'DK' },
    { group: 'ahlgren-co',         members: 2,  country: 'SE' },
    { group: 'revisorernas-hus',   members: 2,  country: 'SE' },
    { group: 'wsa-tax',            members: 0,  country: 'UK' }
  ];

  /* The central team group was created twice under two different group IDs.
     Membership is identical, so counting both would double the central team. */
  const DUPLICATE_GROUP = {
    name: 'EID-App-Claude-central-team',
    ids: ['grp_7c41ba90', 'grp_e83d2f16'],
    members: 23
  };

  /* ---------------------------------------------------------------------------
     Build the firm records
     --------------------------------------------------------------------------- */
  const firms = FIRM_SEED.map(function (row, idx) {
    const name = row[0], country = row[1], hc = row[2];
    const id = slug(name);
    const live = NOT_LIVE.indexOf(name) === -1;

    let groups;
    if (DOUBLE_GROUPED[name]) groups = DOUBLE_GROUPED[name].slice();
    else if (PARTIAL_GROUPS[name]) groups = PARTIAL_GROUPS[name].present.slice();
    else if (NO_GROUP.indexOf(name) !== -1) groups = [];
    else groups = [country + '-' + id];

    /* Rollout date. Pilot firms from January, the long tail through the spring
       and summer. Firms that are not live get no start date at all. */
    let startIdx = null;
    if (live) {
      const wave = rand();
      if (wave < 0.14) startIdx = Math.floor(between(0, 12));        // January pilot
      else if (wave < 0.34) startIdx = Math.floor(between(38, 72));  // February and March
      else if (wave < 0.62) startIdx = Math.floor(between(78, 132)); // spring
      else if (wave < 0.86) startIdx = Math.floor(between(150, 196));// early summer
      else startIdx = Math.floor(between(200, 232));                 // recent arrivals
      if (PINNED_START[name] != null) startIdx = PINNED_START[name];
    }

    /* Seat allocation. Not every head gets a licence, and headcount is sometimes
       missing entirely, in which case seats are still known from the group. */
    const base = hc == null ? Math.round(between(14, 55)) : hc;
    const seats = live ? Math.max(3, Math.round(base * between(0.71, 1.0))) : Math.round(base * between(0.45, 0.9));

    /* Per-firm behaviour. Intensity drives spend per active user, ceiling drives
       how much of the firm ever becomes active. Both are heavy-tailed. */
    const intensity = Math.max(0.34, gauss(1, 0.42));
    const ceiling = Math.min(0.93, Math.max(0.12, gauss(0.56, 0.19)));

    /* Product bias. A handful of firms are genuinely Claude Code heavy, which is
       what makes the spend distribution interesting rather than flat. */
    const codeHeavy = chance(0.15);
    const bias = PRODUCTS.map(function (p, i) {
      if (i === 1) return codeHeavy ? between(1.8, 3.0) : between(0.22, 0.95);
      return Math.max(0.2, gauss(1, 0.3));
    });

    return {
      id: id,
      name: name,
      country: country,
      groups: groups,
      headcount: hc,
      seats: seats,
      live: live,
      startIdx: startIdx,
      liveFrom: startIdx == null ? null : DATES[startIdx],
      intensity: intensity,
      ceiling: ceiling,
      codeHeavy: codeHeavy,
      bias: bias,
      partial: !!PARTIAL_GROUPS[name],
      missingGroups: PARTIAL_GROUPS[name] ? PARTIAL_GROUPS[name].missing.slice() : [],
      duplicateGroups: !!DOUBLE_GROUPED[name],
      series: null,
      people: []
    };
  });

  /* ---------------------------------------------------------------------------
     Daily series per firm

     Shape per day: { active, msgs, sess, tok, cost, pc[5], pa[5] }
       pc = cost per product, pa = active users per product
     --------------------------------------------------------------------------- */
  const JULY_DIP = { NO: 0.38, SE: 0.44, DK: 0.47, UK: 0.79 };

  function rampFactor(dayIdx, startIdx) {
    /* Logistic adoption curve from first sign-in, reaching the firm ceiling over
       roughly nine weeks. Nobody switches an office on overnight. */
    const t = dayIdx - startIdx;
    if (t < 0) return 0;
    return 1 / (1 + Math.exp(-(t - 27) / 11));
  }

  firms.forEach(function (f) {
    const series = new Array(DAY_COUNT);
    for (let i = 0; i < DAY_COUNT; i++) {
      const day = { active: 0, msgs: 0, sess: 0, tok: 0, cost: 0, pc: [0, 0, 0, 0, 0], pa: [0, 0, 0, 0, 0] };
      series[i] = day;

      if (!f.live || i < f.startIdx) continue;

      const dow = DOW[i];
      const weekend = dow === 0 || dow === 6;
      const month = +DATES[i].slice(5, 7);

      let factor = rampFactor(i, f.startIdx) * f.ceiling;
      if (weekend) factor *= between(0.07, 0.16);
      if (month === 7) factor *= JULY_DIP[f.country];
      if (month === 8 && +DATES[i].slice(8, 10) < 12) factor *= between(0.66, 0.83);
      /* Year-end and quarterly filing weeks push activity up, not down. */
      if (month === 1 && +DATES[i].slice(8, 10) > 20) factor *= between(1.06, 1.22);
      if (month === 4 && +DATES[i].slice(8, 10) < 16) factor *= between(1.04, 1.19);

      const active = Math.round(f.seats * factor * between(0.86, 1.14));
      if (active <= 0) continue;
      day.active = active;

      let cost = 0;
      for (let p = 0; p < P; p++) {
        const pActive = Math.round(active * PRODUCTS[p].share * f.bias[p] * between(0.72, 1.18));
        const capped = Math.min(pActive, active);
        if (capped <= 0) continue;
        day.pa[p] = capped;
        const c = capped * PRODUCTS[p].rate * f.intensity * between(0.68, 1.44);
        day.pc[p] = c;
        cost += c;
      }
      day.cost = cost;
      day.msgs = Math.round(day.pa[0] * between(9, 21) + day.pa[2] * between(3, 8));
      day.sess = Math.round(day.pa[1] * between(1.4, 3.2));
      day.tok = Math.round(cost * between(41000, 78000));
    }
    f.series = series;
  });

  /* ---------------------------------------------------------------------------
     People. Per-firm rosters with period aggregates for the team table.
     Activity is heavy-tailed: a few power users carry most of the spend.
     --------------------------------------------------------------------------- */
  const NAMES = {
    NO: {
      first: ['Ingrid', 'Håkon', 'Marte', 'Sindre', 'Kristin', 'Even', 'Solveig', 'Torbjørn', 'Ane', 'Vegard', 'Randi', 'Ola', 'Guro', 'Bjarte', 'Live', 'Eirik', 'Maja', 'Trygve'],
      last: ['Haugen', 'Moland', 'Bjørkli', 'Nesheim', 'Sandvik', 'Ødegård', 'Lunde', 'Fjeld', 'Rustad', 'Vik', 'Aasen', 'Bruvoll', 'Skarsbø', 'Tangen']
    },
    SE: {
      first: ['Annika', 'Fredrik', 'Elsa', 'Gustav', 'Maja', 'Oskar', 'Linnea', 'Hampus', 'Siri', 'Måns', 'Tove', 'Emil', 'Ingela', 'Viktor', 'Alva', 'Nils', 'Ronja', 'Albin'],
      last: ['Wretman', 'Hallberg', 'Sjöstrand', 'Öberg', 'Lundgren', 'Frisk', 'Bergkvist', 'Norell', 'Hedin', 'Palmgren', 'Åström', 'Ryberg', 'Falk', 'Winther']
    },
    DK: {
      first: ['Mette', 'Kasper', 'Freja', 'Rasmus', 'Signe', 'Mikkel', 'Astrid', 'Jeppe', 'Karla', 'Villads', 'Nanna', 'Oscar', 'Ida', 'Frederik', 'Josefine', 'Anton'],
      last: ['Kjeldsen', 'Bramsen', 'Thygesen', 'Krogh', 'Nybo', 'Dalsgaard', 'Ravn', 'Bisgaard', 'Winther', 'Holst', 'Overgaard', 'Bech', 'Riis', 'Lindhardt']
    },
    UK: {
      first: ['Priya', 'Callum', 'Nadia', 'Rory', 'Imogen', 'Dev', 'Bethan', 'Marcus', 'Saoirse', 'Yusuf', 'Freya', 'Tomas', 'Aisling', 'Leon', 'Harriet', 'Omar'],
      last: ['Whitcombe', 'Okafor', 'Braithwaite', 'Ellery', 'Nasrallah', 'Pemberton', 'Grierson', 'Adeyemi', 'Rowntree', 'Kaur', 'Fairhurst', 'Considine', 'Mbeki', 'Waverley']
    }
  };

  const ROLES = ['Partner', 'Director', 'Senior manager', 'Manager', 'Senior associate', 'Associate', 'Payroll specialist', 'Tax adviser', 'Audit senior', 'Bookkeeper'];

  firms.forEach(function (f) {
    if (!f.live) return;
    const roster = Math.max(1, Math.round(f.seats * between(0.92, 1)));
    const pool = NAMES[f.country];
    const used = {};
    /* Distribute the firm's total period cost across the roster on a Pareto-ish
       curve, so the table shows a handful of heavy users and a long quiet tail. */
    const weights = [];
    let wsum = 0;
    for (let i = 0; i < roster; i++) {
      const w = Math.pow(rand(), 2.7) * (chance(0.09) ? between(3, 7) : 1) + 0.02;
      weights.push(w); wsum += w;
    }

    /* Surnames repeat in a real 50-person firm, but three of the same name in the
       top five reads as a generator bug. Cap each surname at two per roster. */
    const surnameCount = {};
    for (let i = 0; i < roster; i++) {
      let name, first, last, guard = 0;
      do {
        first = pick(pool.first); last = pick(pool.last);
        name = first + ' ' + last;
        guard++;
      } while ((used[name] || (surnameCount[last] || 0) >= 2) && guard < 60);
      used[name] = true;
      surnameCount[last] = (surnameCount[last] || 0) + 1;

      /* Share of the firm's activity, not an absolute figure. The team table
         multiplies this by whatever period the scope bar is showing, so the
         numbers move with the date range instead of being frozen at lifetime. */
      const share = weights[i] / wsum;
      /* Dormant users hold a licence and have never signed in. Real, and the
         single most actionable row in the table. */
      const dormant = share < 0.0012 || chance(0.045);
      const lastIdx = dormant ? null : Math.min(DAY_COUNT - 1, Math.round(DAY_COUNT - 1 - Math.pow(rand(), 3) * 46));

      let band;
      if (dormant) band = 'dormant';
      else if (share > 0.055) band = 'high';
      else if (share > 0.018) band = 'steady';
      else band = 'light';

      const topProduct = f.codeHeavy && share > 0.03 && chance(0.7) ? 'code'
        : chance(0.62) ? 'chat' : pick(['cowork', 'office', 'code', 'design']);

      f.people.push({
        name: name,
        role: i === 0 ? 'Partner' : pick(ROLES),
        band: band,
        share: dormant ? 0 : share,
        lastActive: lastIdx == null ? null : DATES[lastIdx],
        topProduct: dormant ? null : topProduct,
        group: f.groups.length ? f.groups[i % f.groups.length] : null
      });
    }
    f.people.sort(function (a, b) { return b.share - a.share; });

    /* Every firm of any size has licences nobody has touched. Guarantee the state
       exists rather than leaving it to the seed, since it is the row a managing
       partner most needs to see. */
    if (roster >= 18) {
      const want = Math.max(3, Math.round(roster * between(0.06, 0.13)));
      let have = f.people.filter(function (p) { return p.band === 'dormant'; }).length;
      for (let i = f.people.length - 1; i >= 0 && have < want; i--) {
        if (f.people[i].band === 'dormant') continue;
        f.people[i].band = 'dormant';
        f.people[i].share = 0;
        f.people[i].lastActive = null;
        f.people[i].topProduct = null;
        have++;
      }
    }
  });

  /* ---------------------------------------------------------------------------
     Spend limits, read from read:spend_limits at group level.
     Most are comfortable. A deliberate handful are tight enough to matter, which
     is what gives the watchlist something real to say.
     --------------------------------------------------------------------------- */
  const TIGHT = [
    'lindqvist-soderberg', 'marchmont-hale', 'sundfor-partnere', 'aarhus-revisorhuset',
    'klaralven-revision', 'merrick-stone', 'fjordvik-revisjon', 'bagsvard-regnskab',
    'pennington-clarke', 'vestby-regnskapshus'
  ];

  firms.forEach(function (f) {
    if (!f.live) { f.spendLimit = null; return; }
    /* Run rate from the last full calendar month, August. */
    let aug = 0;
    for (let i = 0; i < DAY_COUNT; i++) if (DATES[i].slice(0, 7) === '2026-08') aug += f.series[i].cost;
    if (aug < 1) { f.spendLimit = null; return; }
    /* Tight limits were set early in the rollout against a much smaller run rate
       and have not been revisited. Some are already breached. */
    let mult = TIGHT.indexOf(f.id) !== -1 ? between(0.88, 1.12) : between(1.3, 2.4);
    /* The firm-level persona is pinned over its limit so the breach state is
       always demonstrable, whatever the rest of the seed does. */
    if (f.id === 'lindqvist-soderberg') mult = 0.89;
    /* Limits are set by a human, so they land on round but untidy numbers. */
    f.spendLimit = Math.round(aug * mult / 250) * 250;
  });

  /* ---------------------------------------------------------------------------
     Skill adoption, from /analytics/skills, cross-referenced with the Hub catalogue
     --------------------------------------------------------------------------- */
  const SKILLS = [
    { name: 'Bankavstemming', origin: 'NO', users: 412, firms: 31, inHub: true },
    { name: 'VAT return review', origin: 'UK', users: 358, firms: 27, inHub: true },
    { name: 'Årsoppgjør checklist', origin: 'NO', users: 301, firms: 24, inHub: true },
    { name: 'Momsdeklaration', origin: 'SE', users: 287, firms: 22, inHub: true },
    { name: 'Client onboarding pack', origin: 'UK', users: 244, firms: 29, inHub: true },
    { name: 'Fortnox export cleanup', origin: 'SE', users: 196, firms: 15, inHub: true },
    { name: 'Lønnskjøring kontroll', origin: 'NO', users: 173, firms: 18, inHub: false },
    { name: 'Årsrapport draft', origin: 'DK', users: 154, firms: 13, inHub: true },
    { name: 'Tripletex reconciliation', origin: 'NO', users: 138, firms: 11, inHub: true },
    { name: 'Audit sampling notes', origin: 'UK', users: 97, firms: 9, inHub: false },
    { name: 'Xero journal review', origin: 'UK', users: 84, firms: 8, inHub: true },
    { name: 'Kildeskat opgørelse', origin: 'DK', users: 61, firms: 6, inHub: false }
  ];

  /* ---------------------------------------------------------------------------
     Unattributed usage. Employees whose account sits in no group at all, so the
     API returns their spend but nothing tells us which firm to bill it to.
     Includes the Kestrel staff in Norway and the UK whose groups were never made.
     --------------------------------------------------------------------------- */
  const unattributed = { users: 61, cost: 0, series: new Array(DAY_COUNT) };
  for (let i = 0; i < DAY_COUNT; i++) {
    const ramp = 1 / (1 + Math.exp(-(i - 118) / 30));
    const weekend = DOW[i] === 0 || DOW[i] === 6;
    const c = unattributed.users * ramp * between(1.6, 3.4) * (weekend ? 0.11 : 1);
    unattributed.series[i] = c;
    unattributed.cost += c;
  }

  const offListUsers = OFF_LIST_GROUPS.reduce(function (s, g) { return s + g.members; }, 0);
  const offListCost = offListUsers * between(148, 168) * 4.1;

  /* ---------------------------------------------------------------------------
     Aggregation API
     --------------------------------------------------------------------------- */
  function clampIdx(i) { return Math.max(0, Math.min(DAY_COUNT - 1, i)); }

  function indexOfDate(iso) {
    return clampIdx(daysBetween(DATA_START, iso));
  }

  function selectFirms(opts) {
    opts = opts || {};
    return firms.filter(function (f) {
      if (opts.firm && opts.firm !== 'all' && f.id !== opts.firm) return false;
      if (opts.country && opts.country !== 'all' && f.country !== opts.country) return false;
      return true;
    });
  }

  /* Aggregate a set of firms over an inclusive day-index range. */
  function aggregate(list, fromIdx, toIdx) {
    const n = toIdx - fromIdx + 1;
    const out = {
      cost: 0, msgs: 0, sess: 0, tok: 0,
      byProduct: new Array(P).fill(0),
      byProductActive: new Array(P).fill(0),
      byModel: new Array(MODELS.length).fill(0),
      daily: new Array(n), dailyActive: new Array(n), dates: new Array(n),
      peakActive: 0, activeUsers: 0, seats: 0, headcount: 0, headcountKnown: true,
      liveFirms: 0, firmCount: list.length
    };

    for (let k = 0; k < n; k++) { out.daily[k] = 0; out.dailyActive[k] = 0; out.dates[k] = DATES[fromIdx + k]; }

    list.forEach(function (f) {
      out.seats += f.seats;
      if (f.headcount == null) out.headcountKnown = false; else out.headcount += f.headcount;
      let firmActive = 0;
      for (let i = fromIdx; i <= toIdx; i++) {
        const d = f.series[i];
        if (!d.active) continue;
        const k = i - fromIdx;
        out.cost += d.cost; out.msgs += d.msgs; out.sess += d.sess; out.tok += d.tok;
        out.daily[k] += d.cost; out.dailyActive[k] += d.active;
        for (let p = 0; p < P; p++) { out.byProduct[p] += d.pc[p]; out.byProductActive[p] += d.pa[p]; }
        if (d.active > firmActive) firmActive = d.active;
      }
      if (firmActive > 0) { out.liveFirms++; out.activeUsers += firmActive; }
    });

    for (let k = 0; k < n; k++) if (out.dailyActive[k] > out.peakActive) out.peakActive = out.dailyActive[k];
    for (let p = 0; p < P; p++) {
      MODELS.forEach(function (m, mi) { out.byModel[mi] += out.byProduct[p] * m.mix[p]; });
    }
    return out;
  }

  /* Cost inside the trailing revision window is not yet final. */
  function unsettledFrom(fromIdx) {
    return Math.max(fromIdx, SETTLED_INDEX + 1);
  }

  /* ---------------------------------------------------------------------------
     Formatting. One date format and one number format everywhere, per UX spec 12.
     --------------------------------------------------------------------------- */
  const nf0 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const df = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const dfShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const fmt = {
    num: function (v) { return nf0.format(Math.round(v || 0)); },
    money: function (v) {
      v = v || 0;
      if (Math.abs(v) >= 1000000) return '$' + nf1.format(v / 1000000) + 'M';
      if (Math.abs(v) >= 10000) return '$' + nf0.format(Math.round(v / 1000)) + 'k';
      if (Math.abs(v) >= 1000) return '$' + nf1.format(v / 1000) + 'k';
      return '$' + nf0.format(v);
    },
    moneyExact: function (v) { return '$' + nf0.format(Math.round(v || 0)); },
    compact: function (v) {
      v = v || 0;
      if (Math.abs(v) >= 1000000000) return nf1.format(v / 1000000000) + 'B';
      if (Math.abs(v) >= 1000000) return nf1.format(v / 1000000) + 'M';
      if (Math.abs(v) >= 1000) return nf1.format(v / 1000) + 'k';
      return nf0.format(v);
    },
    /* Returns a dash, never a fake zero, when the input is unknown. */
    pct: function (v, dp) {
      if (v == null || !isFinite(v)) return '-';
      return (dp === 0 ? nf0 : nf1).format(v * 100) + '%';
    },
    delta: function (v) {
      if (v == null || !isFinite(v)) return '-';
      return (v > 0 ? '+' : '') + nf1.format(v * 100) + '%';
    },
    date: function (iso) { return df.format(toDate(iso)); },
    dateShort: function (iso) { return dfShort.format(toDate(iso)); }
  };

  /* ---------------------------------------------------------------------------
     Public surface
     --------------------------------------------------------------------------- */
  const licences = firms.reduce(function (s, f) { return s + f.seats; }, 0) + DUPLICATE_GROUP.members + offListUsers;

  global.ACCRU = {
    meta: {
      dataStart: DATA_START,
      today: TODAY,
      engagementFinalTo: ENGAGEMENT_FINAL_TO,
      costSettledTo: COST_SETTLED_TO,
      settledIndex: SETTLED_INDEX,
      dayCount: DAY_COUNT,
      licences: licences,
      pendingInvites: 187,
      plan: 'Enterprise, usage based',
      currency: 'USD'
    },
    dates: DATES,
    dow: DOW,
    countries: COUNTRIES,
    products: PRODUCTS,
    models: MODELS,
    firms: firms,
    skills: SKILLS,
    coverage: {
      unattributed: unattributed,
      offListGroups: OFF_LIST_GROUPS,
      offListUsers: offListUsers,
      offListCost: offListCost,
      duplicateGroup: DUPLICATE_GROUP,
      noGroup: NO_GROUP,
      partialGroups: PARTIAL_GROUPS,
      missingHeadcount: firms.filter(function (f) { return f.headcount == null; }).map(function (f) { return f.name; })
    },
    indexOfDate: indexOfDate,
    selectFirms: selectFirms,
    aggregate: aggregate,
    unsettledFrom: unsettledFrom,
    firmById: function (id) { return firms.filter(function (f) { return f.id === id; })[0] || null; },
    countryByCode: function (c) { return COUNTRIES.filter(function (x) { return x.code === c; })[0] || null; },
    fmt: fmt
  };
})(window);
