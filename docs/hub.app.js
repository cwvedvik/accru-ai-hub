/* =============================================================================
   Accru AI Hub — Connectors & Agents prototype
   Hash router, connect/disconnect, canvas attach, copy URL.
   Classic script, no modules — opens straight from disk.
   ============================================================================= */

(function () {
  'use strict';

  const D = function () { return window.HUB_DATA; };
  const V = function () { return window.HUB_VIEWS; };
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    search: '',
    filter: 'all',
    showForm: false,
    draftAgent: null,
    pendingConnect: null
  };

  function parseHash() {
    const raw = (location.hash || '#/connectors').replace(/^#/, '');
    const parts = raw.split('/').filter(Boolean);
    const view = parts[0] || 'connectors';
    const id = parts[1] || '';
    const qIdx = id.indexOf('?');
    let cleanId = id;
    let attach = '';
    if (qIdx !== -1) {
      cleanId = id.slice(0, qIdx);
    }
    const query = raw.split('?')[1] || '';
    if (query) {
      const sp = new URLSearchParams(query);
      attach = sp.get('attach') || '';
    }
    return { view: view, id: cleanId, attach: attach };
  }

  function emptyAgent(attach) {
    return {
      id: 'new',
      name: '',
      status: 'draft',
      summary: '',
      instructions: '',
      connectorIds: attach ? [attach] : [],
      updated: 'Today'
    };
  }

  function cloneAgent(a) {
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      summary: a.summary,
      instructions: a.instructions,
      connectorIds: (a.connectorIds || []).slice(),
      updated: a.updated
    };
  }

  function todayLabel() {
    return '21 Sep 2026';
  }

  function randomId() {
    return 'c_' + Math.random().toString(16).slice(2, 8);
  }

  function slugify(name) {
    const s = String(name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return s || 'agent';
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('on'); }, 2800);
  }

  function copyText(text, okMsg) {
    function done() { toast(okMsg || 'Copied.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        window.prompt('Copy this URL', text);
      });
    } else {
      window.prompt('Copy this URL', text);
    }
  }

  /* ---------- Canvas links ---------- */
  function drawHubLinks() {
    const stage = document.getElementById('hubStage');
    const svg = document.getElementById('hubLinks');
    const hub = document.getElementById('hubCenter');
    if (!stage || !svg || !hub) return;
    const sr = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + Math.round(sr.width) + ' ' + Math.round(sr.height));
    svg.setAttribute('width', String(Math.round(sr.width)));
    svg.setAttribute('height', String(Math.round(sr.height)));
    const hr = hub.getBoundingClientRect();
    const hx = hr.left + hr.width / 2 - sr.left;
    const hy = hr.top + hr.height / 2 - sr.top;
    const nodes = stage.querySelectorAll('[data-orbit]');
    let parts = '';
    nodes.forEach(function (n) {
      const r = n.getBoundingClientRect();
      const x = r.left + r.width / 2 - sr.left;
      const y = r.top + r.height / 2 - sr.top;
      const on = n.classList.contains('is-attached');
      parts += '<line class="' + (on ? 'on' : '') + '" x1="' + hx.toFixed(1) + '" y1="' + hy.toFixed(1)
        + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" />';
    });
    svg.innerHTML = parts;
  }

  function renderNav(route) {
    document.querySelectorAll('#nav [data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === route.view);
    });
    const search = document.getElementById('globalSearch');
    if (route.view === 'connectors' && !route.id) {
      search.placeholder = 'Search connectors';
      if (document.activeElement !== search) search.value = state.search;
    } else if (route.view === 'agents' && !route.id) {
      search.placeholder = 'Search agents';
    } else {
      search.placeholder = 'Search…';
    }
    renderRole();
  }

  function currentRole() {
    const id = D().role || 'admin';
    const list = D().ROLES;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  function renderRole() {
    const seg = document.getElementById('roleSeg');
    if (!seg) return;
    const role = currentRole();
    let html = '';
    D().ROLES.forEach(function (r) {
      html += '<button type="button" data-action="role" data-role="' + r.id + '" aria-pressed="'
        + (r.id === role.id ? 'true' : 'false') + '">' + r.title + '</button>';
    });
    seg.innerHTML = html;
    const nameEl = document.getElementById('whoName');
    const metaEl = document.getElementById('whoMeta');
    const avEl = document.getElementById('whoAvatar');
    if (nameEl) nameEl.textContent = role.name;
    if (metaEl) metaEl.textContent = role.title + ' · ' + role.firm;
    if (avEl) avEl.textContent = role.initials;
  }

  function hydrateDraft(route) {
    if (route.view !== 'agents' || !route.id) {
      state.draftAgent = null;
      return;
    }
    if (route.id === 'new') {
      if (!state.draftAgent || state.draftAgent.id !== 'new') {
        const attach = route.attach && D().isActivated(route.attach) ? route.attach : '';
        state.draftAgent = emptyAgent(attach);
      } else if (route.attach && D().isActivated(route.attach)
          && state.draftAgent.connectorIds.indexOf(route.attach) === -1) {
        state.draftAgent.connectorIds.push(route.attach);
      }
      return;
    }
    const existing = D().agentById(route.id);
    if (existing) {
      if (!state.draftAgent || state.draftAgent.id !== existing.id) {
        state.draftAgent = cloneAgent(existing);
      }
      if (route.attach && D().isActivated(route.attach)
          && state.draftAgent.connectorIds.indexOf(route.attach) === -1) {
        state.draftAgent.connectorIds.push(route.attach);
      }
    } else {
      state.draftAgent = emptyAgent(route.attach);
      state.draftAgent.id = route.id;
    }
  }

  function render() {
    const route = parseHash();
    if (route.view === 'connectors' && !route.id) state.showForm = false;
    hydrateDraft(route);
    renderNav(route);
    const root = document.getElementById('view');
    root.innerHTML = V().render(route, state);
    if (document.getElementById('hubStage')) {
      requestAnimationFrame(drawHubLinks);
    }
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /* ---------- Connect flow ---------- */
  function readForm(form) {
    const data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked ? (el.value || '1') : '';
      else data[el.name] = el.value;
    });
    return data;
  }

  function validate(connector, data) {
    const missing = [];
    (connector.fields || []).forEach(function (f) {
      if (f.readonly) return;
      if (f.required && !String(data[f.id] || '').trim()) missing.push(f.label);
    });
    return missing;
  }

  function finishConnect(connector, data) {
    const id = randomId();
    const name = (data.name || ('My ' + connector.name)).trim();
    const mcpUrl = connector.auth === 'byo_mcp' && data.remoteUrl
      ? 'https://hub.accru.partners/mcp/custom/' + id
      : 'https://hub.accru.partners/mcp/' + connector.id + '/' + id;
    D().connections.push({
      id: id,
      connectorId: connector.id,
      name: name,
      status: 'connected',
      created: todayLabel(),
      mcpUrl: mcpUrl
    });
    state.showForm = false;
    closeModal();
    render();
    toast(connector.name + ' is connected. Copy the MCP URL or use it in an agent.');
  }

  function openModal(html) {
    const scrim = document.getElementById('scrim');
    const modal = document.getElementById('modal');
    modal.innerHTML = html;
    scrim.hidden = false;
    const btn = modal.querySelector('button, [href]');
    if (btn) btn.focus();
  }

  function closeModal() {
    const scrim = document.getElementById('scrim');
    scrim.hidden = true;
    document.getElementById('modal').innerHTML = '';
  }

  function startConnect(connector, data, opts) {
    opts = opts || {};
    if (!opts.skipFields) {
      const missing = validate(connector, data);
      const err = document.getElementById('formError');
      if (missing.length) {
        if (err) {
          err.hidden = false;
          err.textContent = 'Fill in ' + missing.join(' and ') + ' to continue.';
        }
        return;
      }
      if (err) err.hidden = true;
    }

    if (connector.authorize) {
      state.pendingConnect = { connector: connector, data: data };
      openModal(
        '<h2 id="modalTitle">' + V().esc(connector.authorize.title) + '</h2>' +
        '<p>' + V().esc(connector.authorize.body) + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn btn-primary" data-action="authorize-ok">Continue</button>' +
        '<button type="button" class="btn btn-ghost" data-action="authorize-cancel">Cancel</button>' +
        '</div>'
      );
      return;
    }
    finishConnect(connector, data);
  }

  function saveFortnoxApp(form) {
    const data = readForm(form);
    const err = document.getElementById('formError');
    const missing = [];
    if (!data.reviewed) missing.push('the scope review tick');
    if (!String(data.clientId || '').trim()) missing.push('Client ID');
    const existing = D().firmApp('fortnox');
    if (!existing && !String(data.clientSecret || '').trim()) missing.push('Client secret');
    if (missing.length) {
      if (err) {
        err.hidden = false;
        err.textContent = 'Fill in ' + missing.join(' and ') + ' to continue.';
      }
      return;
    }
    const role = currentRole();
    D().firmApps.fortnox = {
      clientId: String(data.clientId).trim(),
      secretSaved: true,
      scopes: data.scopes || D().connectorById('fortnox').defaultScopes,
      savedBy: role.name,
      savedAt: todayLabel()
    };
    state.showForm = false;
    render();
    toast('Fortnox app saved for Accru Stockholm. Employees can now authorize their own user.');
  }

  function authorizeOk() {
    const pending = state.pendingConnect;
    if (!pending) { closeModal(); return; }
    const modal = document.getElementById('modal');
    modal.innerHTML = '<h2 id="modalTitle">Connecting…</h2><p>Talking to ' + V().esc(pending.connector.name) + '. This is mocked in the prototype.</p>';
    setTimeout(function () {
      finishConnect(pending.connector, pending.data);
      state.pendingConnect = null;
    }, REDUCED ? 0 : 900);
  }

  function collectDraftFields() {
    if (!state.draftAgent) return;
    const nameEl = document.querySelector('[data-field="name"]');
    const instEl = document.querySelector('[data-field="instructions"]');
    if (nameEl) state.draftAgent.name = nameEl.value;
    if (instEl) state.draftAgent.instructions = instEl.value;
  }

  function saveAgent() {
    collectDraftFields();
    const a = state.draftAgent;
    if (!a) return;
    if (!String(a.name || '').trim()) {
      toast('Give the agent a name before saving.');
      const nameEl = document.querySelector('[data-field="name"]');
      if (nameEl) nameEl.focus();
      return;
    }
    var used = (a.connectorIds || []).map(function (id) {
      const c = D().connectorById(id);
      return c ? c.name : id;
    }).filter(Boolean).join(', ');
    a.summary = a.summary || ('Uses ' + (used || 'no connectors yet') + '.');
    a.updated = todayLabel();
    a.status = a.status || 'draft';
    if (a.id === 'new') {
      a.id = slugify(a.name);
      let unique = a.id;
      let n = 2;
      while (D().agentById(unique)) { unique = a.id + '-' + n; n++; }
      a.id = unique;
      D().agents.unshift(a);
      state.draftAgent = cloneAgent(a);
      history.replaceState(null, '', '#/agents/' + a.id);
    } else {
      const existing = D().agentById(a.id);
      if (existing) {
        existing.name = a.name;
        existing.instructions = a.instructions;
        existing.connectorIds = a.connectorIds.slice();
        existing.updated = a.updated;
        existing.summary = a.summary;
        existing.status = a.status;
      } else {
        D().agents.unshift(a);
      }
    }
    render();
    toast('Saved in this tab only. Production would persist the agent against your connections.');
  }

  /* ---------- Clicks ---------- */
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-action], [data-hash], a[href^="#/"]');
    if (!t) {
      if (e.target === document.getElementById('scrim')) {
        state.pendingConnect = null;
        closeModal();
      }
      return;
    }

    if (t.matches('a[href^="#/"]') && !t.getAttribute('data-action')) return;

    const action = t.getAttribute('data-action');

    if (t.getAttribute('data-hash') && (!action || action === 'go')) {
      e.preventDefault();
      go(t.getAttribute('data-hash'));
      return;
    }

    if (action === 'filter') {
      state.filter = t.getAttribute('data-filter');
      render();
      return;
    }

    if (action === 'reveal') {
      const input = document.getElementById(t.getAttribute('data-for'));
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      t.textContent = show ? 'Hide' : 'Show';
      return;
    }

    if (action === 'role') {
      D().role = t.getAttribute('data-role');
      state.showForm = false;
      render();
      return;
    }

    if (action === 'connect') {
      e.preventDefault();
      const form = document.getElementById('connectForm');
      const id = t.getAttribute('data-connector') || (form && form.getAttribute('data-connector'));
      const connector = D().connectorById(id);
      if (!form || !connector) return;
      startConnect(connector, readForm(form));
      return;
    }

    if (action === 'connect-user') {
      const connector = D().connectorById(t.getAttribute('data-connector'));
      if (!connector || !D().firmApp(connector.id)) {
        toast('An admin still needs to save the Fortnox app credentials.');
        return;
      }
      const role = currentRole();
      startConnect(connector, { name: role.name + ' · Fortnox' }, { skipFields: true });
      return;
    }

    if (action === 'authorize-ok') { authorizeOk(); return; }
    if (action === 'authorize-cancel') { state.pendingConnect = null; closeModal(); return; }

    if (action === 'copy-url') {
      const url = t.getAttribute('data-url') || '';
      const mcp = url.indexOf('/mcp/') !== -1;
      copyText(url, mcp
        ? 'MCP URL copied. Paste it into Claude as a custom connector.'
        : 'Redirect URI copied. Paste it into the Fortnox app.');
      return;
    }

    if (action === 'disconnect') {
      const id = t.getAttribute('data-connection');
      if (t.getAttribute('data-confirm') !== '1') {
        t.setAttribute('data-confirm', '1');
        t.textContent = 'Confirm disconnect';
        return;
      }
      const list = D().connections;
      let idx = -1;
      for (let i = 0; i < list.length; i++) if (list[i].id === id) { idx = i; break; }
      if (idx !== -1) {
        const removed = list[idx];
        list.splice(idx, 1);
        D().agents.forEach(function (a) {
          if (!D().isActivated(removed.connectorId)) {
            a.connectorIds = (a.connectorIds || []).filter(function (cid) { return cid !== removed.connectorId; });
          }
        });
        if (state.draftAgent && !D().isActivated(removed.connectorId)) {
          state.draftAgent.connectorIds = state.draftAgent.connectorIds.filter(function (cid) {
            return cid !== removed.connectorId;
          });
        }
        toast(removed.name + ' disconnected. The MCP URL stops working.');
      }
      render();
      return;
    }

    if (action === 'toggle-form') {
      state.showForm = !state.showForm;
      const id = parseHash().id;
      if (id && id !== 'fortnox' && !D().connectionsFor(id).length) state.showForm = true;
      render();
      return;
    }

    if (action === 'show-form') {
      state.showForm = true;
      render();
      return;
    }

    if (action === 'use-in-agent') {
      const cid = t.getAttribute('data-connector');
      go('#/agents/swedish-bookkeeping?attach=' + encodeURIComponent(cid));
      return;
    }

    if (action === 'toggle-attach') {
      collectDraftFields();
      const cid = t.getAttribute('data-connector');
      if (!state.draftAgent) return;
      if (!D().isActivated(cid)) {
        toast('Connect ' + (D().connectorById(cid) || {}).name + ' first.');
        return;
      }
      const ids = state.draftAgent.connectorIds;
      const at = ids.indexOf(cid);
      if (at === -1) ids.push(cid); else ids.splice(at, 1);
      render();
      return;
    }

    if (action === 'need-connect') {
      const cid = t.getAttribute('data-connector');
      const c = D().connectorById(cid);
      toast('Connect ' + (c ? c.name : 'this tool') + ' first. Opening the connector page.');
      go('#/connectors/' + cid);
      return;
    }

    if (action === 'save-agent') { saveAgent(); return; }

    if (action === 'try-agent') {
      collectDraftFields();
      toast('A chat surface is not in this prototype. In production this would open the agent against the attached MCPs.');
      return;
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'connectForm') {
      e.preventDefault();
      const id = e.target.getAttribute('data-connector');
      const connector = D().connectorById(id);
      if (!connector) return;
      startConnect(connector, readForm(e.target));
    }
    if (e.target && e.target.id === 'fortnoxAppForm') {
      e.preventDefault();
      saveFortnoxApp(e.target);
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'globalSearch') {
      const route = parseHash();
      if (route.view === 'connectors' && !route.id) {
        state.search = e.target.value;
        render();
      }
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-field') && state.draftAgent) {
      const field = e.target.getAttribute('data-field');
      if (field === 'name' || field === 'instructions') state.draftAgent[field] = e.target.value;
      if (field === 'name') {
        const title = document.querySelector('h1.title');
        if (title && state.draftAgent.id === 'new') {
          title.textContent = e.target.value.trim() || 'New agent';
        }
      }
    }
  });

  window.addEventListener('hashchange', function () {
    const route = parseHash();
    if (!(route.view === 'connectors' && route.id)) state.showForm = false;
    render();
  });

  window.addEventListener('resize', function () {
    if (document.getElementById('hubStage')) drawHubLinks();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('globalSearch').focus();
    }
    if (e.key === 'Escape' && !document.getElementById('scrim').hidden) {
      state.pendingConnect = null;
      closeModal();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    if (!location.hash) location.replace('#/connectors');
    else render();
  });
})();
