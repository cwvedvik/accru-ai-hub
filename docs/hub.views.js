/* =============================================================================
   Accru AI Hub — Connectors & Agents prototype
   View renderers. Classic script, no modules.
   ============================================================================= */

(function () {
  'use strict';

  const D = function () { return window.HUB_DATA; };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function authBadge(auth) {
    const label = D().AUTH_LABELS[auth] || auth;
    const cls = auth === 'api_key' ? 'k-key'
      : auth === 'byo_mcp' ? 'k-custom'
      : auth === 'agreement' || auth === 'oauth_credentials' ? 'k-secret'
      : 'k-oauth';
    return '<span class="badge ' + cls + '">' + esc(label) + '</span>';
  }

  function originChip(c) {
    if (!c.origin) return '<span class="chip">' + esc(c.originLabel) + '</span>';
    const cc = c.origin.toLowerCase();
    return '<span class="chip"><span class="fi fi-' + esc(cc) + '" aria-hidden="true"></span> '
      + esc(c.originLabel) + '</span>';
  }

  function statusPill(status) {
    if (status === 'connected') {
      return '<span class="pill p-ok"><span class="dot d-ok" aria-hidden="true"></span> Connected</span>';
    }
    if (status === 'needs_attention') {
      return '<span class="pill p-warn"><span class="dot d-warn" aria-hidden="true"></span> Needs attention</span>';
    }
    if (status === 'active') {
      return '<span class="pill p-ok"><span class="dot d-ok" aria-hidden="true"></span> Active</span>';
    }
    if (status === 'app_ready') {
      return '<span class="pill p-ready">App set up</span>';
    }
    if (status === 'draft') {
      return '<span class="pill p-info">Draft</span>';
    }
    return '<span class="pill p-off"><span class="dot d-off" aria-hidden="true"></span> Not connected</span>';
  }

  function healthLine(status) {
    if (status === 'connected') {
      return '<span class="health"><span class="dot d-ok"></span> Connected</span>';
    }
    if (status === 'needs_attention') {
      return '<span class="health"><span class="dot d-warn"></span> Needs attention</span>';
    }
    if (status === 'app_ready') {
      return '<span class="health"><span class="dot d-warn"></span> App set up · sign in</span>';
    }
    return '<span class="health"><span class="dot d-off"></span> Not connected</span>';
  }

  /* ---------- Catalogue ---------- */
  function catalogue(state) {
    const q = (state.search || '').trim().toLowerCase();
    const filter = state.filter || 'all';
    const items = D().CONNECTORS.filter(function (c) {
      const st = D().statusOf(c.id);
      if (filter === 'connected' && st !== 'connected') return false;
      if (filter === 'accounting' && c.category !== 'accounting') return false;
      if (filter === 'custom' && c.category !== 'custom') return false;
      if (!q) return true;
      return (c.name + ' ' + c.job + ' ' + c.originLabel).toLowerCase().indexOf(q) !== -1;
    });

    const chips = [
      { id: 'all', label: 'All' },
      { id: 'connected', label: 'Connected' },
      { id: 'accounting', label: 'Accounting systems' },
      { id: 'custom', label: 'Custom' }
    ];

    let html = '';
    html += '<div class="pagehead"><div>';
    html += '<div class="eyebrow">Your tools</div>';
    html += '<h1 class="title">Connectors</h1>';
    html += '<p class="lede">Connect the systems you already work in. Accru stands up an MCP for each one — use it in Claude, or attach it to an agent in the Hub.</p>';
    html += '</div></div>';

    html += '<div class="filters" role="group" aria-label="Filter connectors">';
    chips.forEach(function (ch) {
      html += '<button type="button" class="filter" data-action="filter" data-filter="' + ch.id + '" aria-pressed="'
        + (filter === ch.id ? 'true' : 'false') + '">' + esc(ch.label) + '</button>';
    });
    html += '</div>';

    if (!items.length) {
      html += '<div class="empty card pad"><i class="ph ph-magnifying-glass" aria-hidden="true"></i>';
      html += '<p>No connectors match that search. Try Fortnox, Xero, or Custom.</p></div>';
      return html;
    }

    html += '<div class="cards">';
    items.forEach(function (c) {
      const st = D().statusOf(c.id);
      const action = st === 'disconnected' ? 'Connect' : (st === 'app_ready' ? 'Sign in' : 'Manage');
      html += '<button type="button" class="ccard" data-action="go" data-hash="#/connectors/' + esc(c.id) + '">';
      html += '<div class="cc-top">';
      if (c.logo) {
        html += '<span class="cc-mark"><img src="' + esc(c.logo) + '" alt="" width="40" height="40" /></span>';
      } else {
        html += '<span class="cc-mark"><i class="ph ' + esc(c.icon) + '" aria-hidden="true"></i></span>';
      }
      html += authBadge(c.auth) + '</div>';
      html += '<div class="cc-title">' + esc(c.name) + '</div>';
      html += '<p class="cc-sum">' + esc(c.job) + '</p>';
      html += '<div class="cc-meta">' + originChip(c) + '</div>';
      html += '<div class="cc-foot">' + healthLine(st);
          html += '<span class="btn btn-sm ' + (st === 'disconnected' || st === 'app_ready' ? 'btn-primary' : 'btn-secondary') + '">' + action + '</span>';
      html += '</div></button>';
    });
    html += '</div>';
    return html;
  }

  /* ---------- Connector detail ---------- */
  function fieldInput(f) {
    const val = f.value != null ? f.value : '';
    const ph = f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '';
    const req = f.required ? ' required' : '';
    const ro = f.readonly ? ' readonly' : '';
    const ac = f.autocomplete ? ' autocomplete="' + esc(f.autocomplete) + '"' : ' autocomplete="off"';
    let html = '<div class="field">';
    html += '<label for="f-' + esc(f.id) + '">' + esc(f.label) + '</label>';
    if (f.type === 'password') {
      html += '<div class="pw-wrap">';
      html += '<input id="f-' + esc(f.id) + '" name="' + esc(f.id) + '" type="password"' + req + ac + ' />';
      html += '<button type="button" class="reveal" data-action="reveal" data-for="f-' + esc(f.id) + '">Show</button>';
      html += '</div>';
    } else {
      html += '<input id="f-' + esc(f.id) + '" name="' + esc(f.id) + '" type="' + esc(f.type || 'text') + '"'
        + ph + req + ro + ac + ' value="' + esc(val) + '" />';
    }
    if (f.hint) html += '<span class="hint">' + esc(f.hint) + '</span>';
    html += '</div>';
    return html;
  }

  function setupForm(c, opts) {
    opts = opts || {};
    let html = '<form id="connectForm" data-connector="' + esc(c.id) + '">';
    html += '<div id="formError" class="form-error" hidden></div>';
    c.fields.forEach(function (f) { html += fieldInput(f); });
    html += '<button type="submit" class="btn btn-primary">';
    html += '<i class="ph ph-plugs-connected" aria-hidden="true"></i> ' + esc(c.connectLabel);
    html += '</button>';
    if (opts.cancel) {
      html += ' <button type="button" class="btn btn-ghost" data-action="toggle-form">Cancel</button>';
    }
    html += '</form>';
    return html;
  }

  function mcpBlock(conn) {
    let html = '<div class="field"><label>Streamable MCP URL</label>';
    html += '<div class="mcp-box">';
    html += '<code id="mcpUrl">' + esc(conn.mcpUrl) + '</code>';
    html += '<button type="button" class="btn btn-secondary btn-sm" data-action="copy-url" data-url="'
      + esc(conn.mcpUrl) + '"><i class="ph ph-copy" aria-hidden="true"></i> Copy</button>';
    html += '</div>';
    html += '<span class="hint">Paste this into Claude as a custom connector. The Hub authenticates you; do not put secrets in the URL.</span>';
    html += '</div>';
    return html;
  }

  function connectionCard(c, conn) {
    let html = '<article class="conn-card">';
    html += '<header><div><b>' + esc(conn.name) + '</b>';
    html += '<div class="caption" style="font-size:.78rem;color:var(--ink-muted);margin-top:2px">Connected '
      + esc(conn.created) + '</div></div>';
    html += statusPill(conn.status) + '</header>';
    if (conn.attention) {
      html += '<p class="form-error" style="margin-top:0">' + esc(conn.attention) + '</p>';
    }
    html += mcpBlock(conn);
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">';
    html += '<button type="button" class="btn btn-primary btn-sm" data-action="use-in-agent" data-connector="'
      + esc(c.id) + '"><i class="ph ph-cpu" aria-hidden="true"></i> Use in an agent</button>';
    if (conn.status === 'needs_attention') {
      html += '<button type="button" class="btn btn-secondary btn-sm" data-action="show-form">Reconnect</button>';
    }
    html += '<button type="button" class="btn btn-danger btn-sm" data-action="disconnect" data-connection="'
      + esc(conn.id) + '">Disconnect</button>';
    html += '</div></article>';
    return html;
  }

  function currentRole() {
    const id = D().role || 'admin';
    const list = D().ROLES;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  function fortnoxConnectPage(c, state) {
    const role = currentRole();
    const isAdmin = role.id === 'admin';
    const app = D().firmApp(c.id);
    const conns = D().connectionsFor(c.id);
    const scopes = (app && app.scopes) || c.defaultScopes;
    const showAdminForm = isAdmin && (!app || state.showForm);

    let html = '<p class="crumb"><a href="#/connectors">Connectors</a> · Fortnox</p>';
    html += '<div class="vendor-head">';
    html += '<img src="fortnox-logo.svg" alt="" width="40" height="40" />';
    html += '<span class="vendor-name">Fortnox</span>';
    html += '</div>';
    html += '<div class="pagehead"><div>';
    html += '<h1 class="title">Connect Fortnox</h1>';
    html += '<p class="lede">Connect <b>Fortnox</b> with OAuth. A delegated admin registers the Fortnox app once for the firm and pastes the client ID and secret here — never in chat. After that, every employee only signs in with their own Fortnox user.</p>';
    html += '</div>' + statusPill(D().statusOf(c.id)) + '</div>';

    html += '<div class="split"><div>';

    if (app && !showAdminForm) {
      html += '<div class="firm-banner"><i class="ph ph-check-circle" aria-hidden="true"></i>';
      html += '<div>The Fortnox app is set up for <b>' + esc(role.firm) + '</b>';
      if (app.savedBy) html += ', saved by ' + esc(app.savedBy);
      if (app.savedAt) html += ' on ' + esc(app.savedAt);
      html += '. Employees can now authorize their own user. Secrets stay with the firm — they are not asked again.';
      html += '</div></div>';
    }

    conns.forEach(function (conn) { html += connectionCard(c, conn); });

    if (app && !showAdminForm) {
      html += '<div class="card pad" style="margin-bottom:var(--space-5)">';
      html += '<h2 style="font-size:1.125rem;margin-bottom:var(--space-3)">Connect your Fortnox user</h2>';
      html += '<p style="margin-bottom:var(--space-4);max-width:62ch">Sign in to Fortnox as yourself. Accru uses the firm’s app credentials in the background. You never paste a client secret.</p>';
      html += '<button type="button" class="btn btn-primary" data-action="connect-user" data-connector="fortnox">';
      html += '<i class="ph ph-plugs-connected" aria-hidden="true"></i> Authorize</button>';
      html += '</div>';
      if (isAdmin) {
        html += '<p style="margin-bottom:var(--space-5)"><button type="button" class="btn btn-ghost" data-action="toggle-form">Edit app credentials</button></p>';
      }
    }

    if (showAdminForm) {
      html += '<div class="card pad">';
      html += '<form id="fortnoxAppForm">';
      html += '<div id="formError" class="form-error" hidden></div>';

      html += '<div class="field"><label>Redirect URI (must match the Fortnox app)</label>';
      html += '<div class="uri-box"><code>' + esc(c.redirectUri) + '</code>';
      html += '<button type="button" class="btn btn-secondary btn-sm" data-action="copy-url" data-url="'
        + esc(c.redirectUri) + '"><i class="ph ph-copy" aria-hidden="true"></i> Copy</button></div>';
      html += '<span class="hint">Paste this into the Fortnox developer app. Accru fills it; do not change it.</span></div>';

      html += '<div class="field"><label for="f-scopes">Scopes to request</label>';
      html += '<textarea id="f-scopes" name="scopes" rows="4">' + esc(scopes) + '</textarea>';
      html += '<span class="hint">Space-separated. Edit freely — Fortnox’s own documentation is the authority.</span></div>';

      html += '<div class="scope-warn"><b>Review these scopes before you save.</b> They are what every employee in '
        + esc(role.firm) + ' will grant when they connect their Fortnox user: <code>'
        + esc(scopes) + '</code></div>';

      html += '<label class="check"><input type="checkbox" name="reviewed" value="1" /> I have reviewed the scopes above</label>';

      html += '<div class="field"><label for="f-clientId">Client ID</label>';
      html += '<input id="f-clientId" name="clientId" type="text" autocomplete="off" required value="'
        + esc(app && app.clientId ? app.clientId : '') + '" /></div>';

      html += '<div class="field"><label for="f-clientSecret">Client secret</label>';
      html += '<div class="pw-wrap"><input id="f-clientSecret" name="clientSecret" type="password" autocomplete="off" '
        + (app ? '' : 'required ') + '/>';
      html += '<button type="button" class="reveal" data-action="reveal" data-for="f-clientSecret">Show</button></div>';
      html += '<span class="hint">' + (app
        ? 'Leave blank to keep the secret already stored for the firm.'
        : 'Stored once for Accru Stockholm. Employees never see this field.') + '</span></div>';

      html += '<button type="submit" class="btn btn-primary">Save app credentials</button>';
      if (app) {
        html += ' <button type="button" class="btn btn-ghost" data-action="toggle-form">Cancel</button>';
      }
      html += '</form></div>';
    }

    if (!isAdmin && !app) {
      html += '<div class="empty card pad">';
      html += '<i class="ph ph-lock-simple" aria-hidden="true"></i>';
      html += '<h2 style="font-size:1.125rem;margin-bottom:8px">Waiting on your firm</h2>';
      html += '<p>A delegated admin at Accru Stockholm still needs to add the Fortnox Client ID and Client Secret. Switch the view in the top right to see that form, or ask your CEO / IT person to do it once.</p>';
      html += '</div>';
    }

    html += '<h3 style="font-size:1.125rem;margin:var(--space-6) 0 var(--space-3)">Add to Claude</h3>';
    html += '<ol class="steps">';
    html += '<li>The firm saves Client ID and Client Secret once (this page, delegated admin).</li>';
    html += '<li>You click <b>Authorize</b> and sign in to Fortnox as yourself.</li>';
    html += '<li>Copy the streamable MCP URL into Claude → Settings → Connectors.</li>';
    html += '</ol>';

    html += '</div>';
    html += '<aside class="card pad">';
    html += '<h2 style="font-size:1.125rem;margin-bottom:var(--space-3)">What this MCP can do</h2>';
    html += '<ul class="cap-list">';
    c.capabilities.forEach(function (cap) { html += '<li>' + esc(cap) + '</li>'; });
    html += '</ul>';
    html += '<details class="help"><summary>Where do I find the Client ID?</summary><p>' + esc(c.findHelp) + '</p></details>';
    html += '<div class="cc-meta">' + authBadge(c.auth) + originChip(c) + '</div>';
    html += '</aside></div>';
    return html;
  }

  function connectorDetail(id, state) {
    const c = D().connectorById(id);
    if (!c) {
      return '<p>Unknown connector. <a href="#/connectors">Back to connectors</a>.</p>';
    }
    if (c.id === 'fortnox') return fortnoxConnectPage(c, state);
    const conns = D().connectionsFor(id);
    const showForm = state.showForm || !conns.length;

    let html = '<p class="crumb"><a href="#/connectors">Connectors</a> · ' + esc(c.name) + '</p>';
    html += '<div class="pagehead"><div>';
    html += '<div class="eyebrow">' + esc(c.originLabel) + '</div>';
    html += '<h1 class="title">' + esc(c.name) + '</h1>';
    html += '<p class="lede">' + esc(c.job) + '</p>';
    html += '</div>' + statusPill(D().statusOf(id)) + '</div>';

    html += '<div class="split">';
    html += '<div>';

    if (conns.length) {
      conns.forEach(function (conn) { html += connectionCard(c, conn); });
      html += '<p style="margin-bottom:var(--space-4)">';
      html += '<button type="button" class="btn btn-secondary" data-action="toggle-form">';
      html += '<i class="ph ph-plus" aria-hidden="true"></i> Add another company</button></p>';
    }

    if (showForm) {
      html += '<div class="card pad">';
      html += '<h2 style="font-size:1.125rem;margin-bottom:var(--space-3)">'
        + (conns.length ? 'Another company' : 'Connect ' + esc(c.name)) + '</h2>';
      html += '<details class="help"><summary>Where do I find these?</summary>';
      html += '<p>' + esc(c.findHelp) + '</p></details>';
      html += setupForm(c, { cancel: !!conns.length });
      html += '</div>';
    }

    html += '<h3 style="font-size:1.125rem;margin:var(--space-6) 0 var(--space-3)">Add to Claude</h3>';
    html += '<ol class="steps">';
    html += '<li>Copy the streamable MCP URL from a connected company above. If you have not connected yet, do that first.</li>';
    html += '<li>In Claude, open <b>Settings → Connectors → Add custom connector</b>.</li>';
    html += '<li>Paste the URL. Claude talks to the Hub; the Hub talks to ' + esc(c.name) + ' with the credentials you just stored.</li>';
    html += '</ol>';

    html += '</div>';

    html += '<aside class="card pad">';
    html += '<h2 style="font-size:1.125rem;margin-bottom:var(--space-3)">What this MCP can do</h2>';
    html += '<ul class="cap-list">';
    c.capabilities.forEach(function (cap) { html += '<li>' + esc(cap) + '</li>'; });
    html += '</ul>';
    html += '<div class="cc-meta" style="margin-top:var(--space-4)">' + authBadge(c.auth) + originChip(c) + '</div>';
    html += '</aside></div>';
    return html;
  }

  /* ---------- Agents list ---------- */
  function agentsList() {
    let html = '<div class="pagehead"><div>';
    html += '<div class="eyebrow">Build</div>';
    html += '<h1 class="title">Agents</h1>';
    html += '<p class="lede">Give an agent a job, then attach the connectors you have already activated. The agent sits in the middle; the tools orbit it.</p>';
    html += '</div>';
    html += '<a class="btn btn-primary" href="#/agents/new"><i class="ph ph-plus" aria-hidden="true"></i> New agent</a>';
    html += '</div>';

    html += '<div class="cards">';
    D().agents.forEach(function (a) {
      const names = (a.connectorIds || []).map(function (id) {
        const c = D().connectorById(id);
        return c ? c.name : id;
      });
      html += '<button type="button" class="acard" data-action="go" data-hash="#/agents/' + esc(a.id) + '">';
      html += '<div class="cc-top"><span class="badge k-agent">Agent</span>' + statusPill(a.status) + '</div>';
      html += '<div class="cc-title">' + esc(a.name) + '</div>';
      html += '<p class="cc-sum">' + esc(a.summary || '') + '</p>';
      html += '<div class="cc-meta">';
      names.forEach(function (n) { html += '<span class="chip">' + esc(n) + '</span>'; });
      html += '</div>';
      html += '<div class="cc-foot"><span class="caption" style="font-size:.75rem;color:var(--ink-muted)">Updated '
        + esc(a.updated) + '</span>';
      html += '<span class="btn btn-sm btn-secondary">Open</span></div>';
      html += '</button>';
    });
    html += '</div>';
    return html;
  }

  /* ---------- Hub canvas ---------- */
  function orbitSlots(n) {
    if (n <= 0) return [];
    if (n === 1) return [{ top: 20, left: 50 }];
    if (n === 2) return [{ top: 22, left: 16 }, { top: 22, left: 84 }];
    if (n === 3) return [{ top: 16, left: 50 }, { top: 72, left: 16 }, { top: 72, left: 84 }];
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      out.push({ left: 50 + 40 * Math.cos(a), top: 48 + 38 * Math.sin(a) });
    }
    return out;
  }

  function agentCanvas(agent, state) {
    const attached = agent.connectorIds || [];
    const live = D().CONNECTORS.filter(function (c) { return D().isActivated(c.id); });
    const pending = D().CONNECTORS.filter(function (c) { return !D().isActivated(c.id); });
    const slots = orbitSlots(live.length);
    const count = attached.length;

    let html = '<p class="crumb"><a href="#/agents">Agents</a> · ' + esc(agent.name || 'New agent') + '</p>';
    html += '<div class="pagehead"><div>';
    html += '<div class="eyebrow">Hub canvas</div>';
    html += '<h1 class="title">' + (agent.id === 'new' ? 'New agent' : esc(agent.name)) + '</h1>';
    html += '<p class="lede">Click a connector to attach or detach it. Only activated connectors can be used. Disconnected tools wait in the tray underneath.</p>';
    html += '</div>' + statusPill(agent.status || 'draft') + '</div>';

    html += '<div class="hub-stage" id="hubStage">';
    html += '<svg class="hub-links" id="hubLinks" aria-hidden="true" focusable="false"></svg>';

    live.forEach(function (c, i) {
      const pos = slots[i] || { top: 20, left: 50 };
      const on = attached.indexOf(c.id) !== -1;
      const st = D().statusOf(c.id);
      const conn = D().connectionsFor(c.id)[0];
      html += '<button type="button" class="orbit-node' + (on ? ' is-attached' : '')
        + (st === 'needs_attention' ? ' is-warn' : '') + '" data-orbit data-action="toggle-attach" data-connector="'
        + esc(c.id) + '" style="top:' + pos.top + '%;left:' + pos.left + '%">';
      html += '<i class="ph ' + esc(c.icon) + '" aria-hidden="true"></i>';
      html += '<b>' + esc(c.name) + '</b>';
      html += '<span class="sub">' + esc(conn ? conn.name : '') + (on ? ' · attached' : ' · click to attach') + '</span>';
      html += '</button>';
    });

    html += '<div class="hub-center" id="hubCenter">';
    html += '<span class="cc-mark"><i class="ph ph-cpu" aria-hidden="true"></i></span>';
    html += '<input data-field="name" value="' + esc(agent.name || '') + '" placeholder="Name this agent" aria-label="Agent name" />';
    html += '<div class="hub-meta"><span class="num">' + count + '</span> connector'
      + (count === 1 ? '' : 's') + ' attached</div>';
    html += '</div></div>';

    html += '<div class="tray">';
    html += '<h3>Not connected yet</h3>';
    html += '<p>These tools cannot join the agent until you connect them. Nothing is silently available.</p>';
    html += '<div class="tray-row">';
    pending.forEach(function (c) {
      html += '<button type="button" class="tray-node" data-action="need-connect" data-connector="' + esc(c.id) + '">';
      html += '<i class="ph ' + esc(c.icon) + '" aria-hidden="true"></i> ' + esc(c.name)
        + ' · connect first</button>';
    });
    html += '</div></div>';

    html += '<div class="work">';
    html += '<div class="card pad">';
    html += '<h2 style="font-size:1.125rem;margin-bottom:var(--space-3)">Instructions</h2>';
    html += '<div class="field" style="margin:0">';
    html += '<label for="agentInstructions">What this agent should do</label>';
    html += '<textarea id="agentInstructions" data-field="instructions" rows="8">'
      + esc(agent.instructions || '') + '</textarea>';
    html += '<span class="hint">Plain language. Name the connectors it may use. Never ask it to post or send without confirmation.</span>';
    html += '</div></div>';

    html += '<div class="card pad">';
    html += '<h2 style="font-size:1.125rem;margin-bottom:var(--space-3)">Attached tools</h2>';
    if (!attached.length) {
      html += '<p style="font-size:.88rem;color:var(--ink-muted)">Nothing attached yet. Microsoft 365 is already connected — click it on the canvas. Fortnox appears there after a user has authorized.</p>';
    } else {
      html += '<ul class="tool-list">';
      attached.forEach(function (cid) {
        const c = D().connectorById(cid);
        if (!c) return;
        (c.tools || []).forEach(function (t) {
          html += '<li><input type="checkbox" checked disabled aria-hidden="true">';
          html += '<div><b>' + esc(t.label) + '</b><div style="font-size:.75rem;color:var(--ink-muted)">'
            + esc(c.name) + '</div></div></li>';
        });
      });
      html += '</ul>';
    }
    html += '</div></div>';

    html += '<div class="sticky-foot">';
    html += '<a class="btn btn-secondary" href="#/agents">Back</a>';
    html += '<button type="button" class="btn btn-primary" data-action="save-agent">Save agent</button>';
    html += '<button type="button" class="btn btn-ghost" data-action="try-agent">Try in Hub</button>';
    html += '</div>';
    return html;
  }

  /* ---------- Handoff ---------- */
  function handoff() {
    return (
      '<div class="pagehead"><div>' +
      '<div class="eyebrow">For developers</div>' +
      '<h1 class="title">Handoff notes</h1>' +
      '<p class="lede">What this prototype is arguing, what is mocked, and the contract a production build should honour. It is not a rewrite of the catalogue spec.</p>' +
      '</div></div>' +
      '<div class="card pad notes">' +

      '<h3>How this sits next to the existing Hub</h3>' +
      '<p>The v0.3 UX spec treats <b>Agents</b> as a kind under Browse — a published, two-key-approved asset in the catalogue. This prototype is a different surface: a <b>runtime workspace</b>. Employees connect their own tools, receive a streamable MCP URL, and compose agents from those connections. Catalogue Agents (Browse) and runtime Agents (this tab) should stay distinct until product review decides otherwise.</p>' +
      '<p>Suggested rail once this graduates: Home · Browse · <b>Connectors</b> · <b>Agents</b> · Training · … Scope bar stays off Connectors and Agents — connections are personal, not a country lens.</p>' +

      '<h3>User journey this UI is proving</h3>' +
      '<ol>' +
      '<li>Open Connectors as a <b>delegated admin</b>. Pick Fortnox.</li>' +
      '<li>Paste Client ID and Client Secret <b>once for the firm</b>, review scopes, save. Employees never see those fields.</li>' +
      '<li>Each employee clicks <b>Authorize</b> and signs in with their own Fortnox user.</li>' +
      '<li>Copy the streamable MCP URL into Claude, or attach Fortnox on the Agents canvas.</li>' +
      '</ol>' +
      '<p>Two vaults, one MCP. The firm holds the Fortnox app (client id/secret). Each employee holds their own OAuth grant. The MCP URL and the Hub agent consume the same per-user connection id.</p>' +

      '<h3>URL contract (proposed)</h3>' +
      '<div class="dp">' +
      '<div class="row"><span class="lbl">Prototype routing</span><span class="val"><code>#/connectors</code> · <code>#/connectors/{id}</code> · <code>#/agents</code> · <code>#/agents/{id}</code> · <code>#/handoff</code></span></div>' +
      '<div class="row"><span class="lbl">Streamable MCP</span><span class="val"><code>https://hub.accru.partners/mcp/{connector}/{connectionId}</code></span></div>' +
      '<div class="row"><span class="lbl">Example</span><span class="val"><code>https://hub.accru.partners/mcp/fortnox/c_8f2a91</code></span></div>' +
      '<div class="row"><span class="lbl">Auth to the Hub</span><span class="val">Bearer session from Entra SSO — not Fortnox secrets in the URL</span></div>' +
      '<div class="row"><span class="lbl">OAuth callback</span><span class="val"><code>/connectors/{id}/callback</code></span></div>' +
      '</div>' +

      '<h3>Auth patterns the setup form must support</h3>' +
      '<table>' +
      '<thead><tr><th>Pattern</th><th>Example</th><th>What the user types</th></tr></thead>' +
      '<tbody>' +
      '<tr><td>OAuth app once, then per-user grant</td><td>Fortnox</td><td>Admin: Client ID, Client Secret, scopes. Employee: Authorize only.</td></tr>' +
      '<tr><td>OAuth button only</td><td>Xero, PowerOffice, Microsoft 365, Visma</td><td>Connection name, then the vendor consent screen</td></tr>' +
      '<tr><td>API key / employee token</td><td>Tripletex</td><td>One secret</td></tr>' +
      '<tr><td>App secret + agreement grant</td><td>e-conomic</td><td>Three fields</td></tr>' +
      '<tr><td>Bring your own MCP</td><td>Custom</td><td>Remote streamable URL, optional bearer. Hub proxies it.</td></tr>' +
      '</tbody></table>' +
      '<p>Do not show unused OAuth jargon. Render only the fields in that connector’s schema. Multiple named connections per connector are first-class (an accountant with two Fortnox clients).</p>' +

      '<h3>What is mocked in this prototype</h3>' +
      '<ul>' +
      '<li>Every credential, MCP URL, and agent. Fortnox “Authorize” is a modal with a timer, not an OAuth redirect.</li>' +
      '<li>Copy works. Disconnect, attach, and save live in memory for this tab only.</li>' +
      '<li>Fortnox starts with no firm app and no user, so the Connect Fortnox form is the first screen. Microsoft 365 starts connected so the agent canvas is not empty. Visma starts as needs-attention.</li>' +
      '</ul>' +

      '<h3>What production must build</h3>' +
      '<ul>' +
      '<li>Secret store in two layers: firm-level app credentials (Client ID / Secret, admin-only) and per-user OAuth grants. Never log client secrets. Rotate and disconnect must revoke the vendor grant.</li>' +
      '<li>OAuth redirect per connector. Fortnox uses the firm’s stored confidential client; employees only complete the consent screen.</li>' +
      '<li>Streamable HTTP MCP gateway that binds <code>{connector}/{connectionId}</code> to the stored grant and the Accru-built MCP (Fortnox first).</li>' +
      '<li>Agent runtime that calls the same gateway. Publishing a Hub agent into Browse remains a separate, gated flow.</li>' +
      '</ul>' +

      '<h3>Out of scope here</h3>' +
      '<p>Real Fortnox OAuth, hosting MCP servers, encryption implementation, RAG, n8n-style flow canvases, dark theme, and rewriting <code>accru-ai-hub-ux-spec.md</code>. Update the spec after this UI is reviewed.</p>' +
      '</div>'
    );
  }

  function render(route, state) {
    if (route.view === 'connectors' && route.id) return connectorDetail(route.id, state);
    if (route.view === 'connectors') return catalogue(state);
    if (route.view === 'agents' && route.id) return agentCanvas(state.draftAgent, state);
    if (route.view === 'agents') return agentsList();
    if (route.view === 'handoff') return handoff();
    return catalogue(state);
  }

  window.HUB_VIEWS = {
    esc: esc,
    authBadge: authBadge,
    render: render,
    catalogue: catalogue,
    connectorDetail: connectorDetail,
    agentsList: agentsList,
    agentCanvas: agentCanvas,
    handoff: handoff,
    orbitSlots: orbitSlots
  };
})();
