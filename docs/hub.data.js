/* =============================================================================
   Accru AI Hub — Connectors & Agents prototype
   Seeded catalogue, credential schemas, mock connections, sample agents.

   Buildless on purpose. Classic script, no modules. All data is invented for
   design review. Nothing here is a live credential or a live MCP.
   ============================================================================= */

(function () {
  'use strict';

  const AUTH_LABELS = {
    oauth_credentials: 'Client ID + secret',
    oauth_button: 'OAuth',
    api_key: 'API key',
    agreement: 'App secret + grant',
    byo_mcp: 'MCP URL'
  };

  const CONNECTORS = [
    {
      id: 'fortnox',
      name: 'Fortnox',
      origin: 'SE',
      originLabel: 'Sweden',
      category: 'accounting',
      auth: 'oauth_credentials',
      icon: 'ph-receipt',
      logo: 'fortnox-logo.svg',
      job: 'Swedish bookkeeping — invoices, vouchers, customers and the ledger.',
      hero: true,
      setupOnce: true,
      defaultScopes: 'companyinformation bookkeeping customer invoice supplierinvoice supplier payment article order offer project costcenter currency price settings archive connectfile',
      redirectUri: 'https://hub.accru.partners/connectors/fortnox/callback',
      findHelp: 'A delegated admin registers an app in Fortnox (Administrera → Integrationer → API) and pastes the Client ID and Client Secret here once for the firm. After that, every employee only signs in with their own Fortnox user. Accru never sees Fortnox passwords.',
      capabilities: [
        'List and read invoices',
        'Create and post vouchers',
        'Look up customers and suppliers',
        'Read the chart of accounts'
      ],
      tools: [
        { id: 'invoices.list', label: 'List invoices' },
        { id: 'vouchers.create', label: 'Create voucher' },
        { id: 'customers.lookup', label: 'Look up customer' },
        { id: 'suppliers.list', label: 'List suppliers' },
        { id: 'accounts.chart', label: 'Chart of accounts' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'My Fortnox', hint: 'Use the client or company name if you connect more than one.' },
        { id: 'clientId', label: 'Client ID', type: 'text', required: true, autocomplete: 'off' },
        { id: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
        { id: 'redirectUri', label: 'Redirect URL', type: 'text', readonly: true, value: 'https://hub.accru.partners/connectors/fortnox/callback', hint: 'Paste this into the Fortnox app. Accru fills it for you.' }
      ],
      connectLabel: 'Authorize with Fortnox',
      authorize: {
        title: 'Authorize Fortnox',
        body: 'You will sign in to Fortnox and allow Accru AI Hub to read invoices, vouchers and customers for this company. Accru never sees your Fortnox password.'
      }
    },
    {
      id: 'tripletex',
      name: 'Tripletex',
      origin: 'NO',
      originLabel: 'Norway',
      category: 'accounting',
      auth: 'api_key',
      icon: 'ph-calculator',
      job: 'Norwegian bookkeeping, invoicing, payroll and project time.',
      findHelp: 'In Tripletex: Brukerinnstillinger → API-tilgang. Create an employee token with the ledgers and invoices this agent should see.',
      capabilities: ['Invoices and reminders', 'Timesheets and projects', 'Accounts and VAT'],
      tools: [
        { id: 'invoices.list', label: 'List invoices' },
        { id: 'time.list', label: 'List timesheets' },
        { id: 'projects.list', label: 'List projects' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'My Tripletex' },
        { id: 'employeeToken', label: 'Employee token', type: 'password', required: true }
      ],
      connectLabel: 'Connect Tripletex'
    },
    {
      id: 'poweroffice',
      name: 'PowerOffice Go',
      origin: 'NO',
      originLabel: 'Norway',
      category: 'accounting',
      auth: 'oauth_button',
      icon: 'ph-buildings',
      job: 'Norwegian practice ledger, client books and reporting.',
      findHelp: 'No keys to paste. Sign in with your PowerOffice account and pick the client you work in.',
      capabilities: ['Client ledgers', 'Vouchers', 'Reports'],
      tools: [
        { id: 'clients.list', label: 'List clients' },
        { id: 'vouchers.list', label: 'List vouchers' },
        { id: 'reports.run', label: 'Run report' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'My PowerOffice' }
      ],
      connectLabel: 'Continue with PowerOffice',
      authorize: {
        title: 'Continue with PowerOffice',
        body: 'PowerOffice will ask which client company to share with Accru AI Hub. You can add another client as a second connection later.'
      }
    },
    {
      id: 'economic',
      name: 'e-conomic',
      origin: 'DK',
      originLabel: 'Denmark',
      category: 'accounting',
      auth: 'agreement',
      icon: 'ph-chart-pie',
      job: 'Danish bookkeeping — invoices, journals and the visma e-conomic agreement.',
      findHelp: 'From the e-conomic developer portal: create an app, copy App Secret ID and App Secret, then generate an Agreement Grant Token for the company.',
      capabilities: ['Invoices', 'Journals', 'Customers'],
      tools: [
        { id: 'invoices.list', label: 'List invoices' },
        { id: 'journals.list', label: 'List journals' },
        { id: 'customers.list', label: 'List customers' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'My e-conomic' },
        { id: 'appSecretId', label: 'App Secret ID', type: 'text', required: true },
        { id: 'appSecret', label: 'App Secret', type: 'password', required: true },
        { id: 'agreementGrant', label: 'Agreement Grant Token', type: 'password', required: true }
      ],
      connectLabel: 'Connect e-conomic'
    },
    {
      id: 'xero',
      name: 'Xero',
      origin: 'UK',
      originLabel: 'United Kingdom',
      category: 'accounting',
      auth: 'oauth_button',
      icon: 'ph-globe',
      job: 'UK and group practice books, bank rec and reporting.',
      findHelp: 'No keys to paste. Sign in with Xero and tick the organisations this agent may use.',
      capabilities: ['Invoices and bills', 'Bank reconciliation', 'Reports'],
      tools: [
        { id: 'invoices.list', label: 'List invoices' },
        { id: 'bank.rec', label: 'Bank transactions' },
        { id: 'reports.run', label: 'Run report' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'My Xero' }
      ],
      connectLabel: 'Continue with Xero',
      authorize: {
        title: 'Continue with Xero',
        body: 'Xero will ask which organisation to connect. Accru stores the grant, not your Xero password.'
      }
    },
    {
      id: 'visma',
      name: 'Visma eAccounting',
      origin: 'NO',
      originLabel: 'Nordic',
      category: 'accounting',
      auth: 'oauth_button',
      icon: 'ph-bank',
      job: 'Visma eAccounting for Norwegian and Swedish client books.',
      findHelp: 'Sign in with Visma and approve the Accru integration for the company you need.',
      capabilities: ['Vouchers', 'Invoices', 'Contacts'],
      tools: [
        { id: 'vouchers.list', label: 'List vouchers' },
        { id: 'invoices.list', label: 'List invoices' },
        { id: 'contacts.list', label: 'List contacts' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'Visma eAccounting' }
      ],
      connectLabel: 'Continue with Visma',
      authorize: {
        title: 'Continue with Visma',
        body: 'Approve Accru AI Hub in the Visma consent screen. You can reconnect if the grant expires.'
      }
    },
    {
      id: 'microsoft365',
      name: 'Microsoft 365',
      origin: '',
      originLabel: 'Group',
      category: 'productivity',
      auth: 'oauth_button',
      icon: 'ph-envelope-simple',
      job: 'Mail, calendar and SharePoint for the firm — the everyday office layer.',
      findHelp: 'Sign in with your Accru Microsoft account. The Hub already knows your tenant from Entra.',
      capabilities: ['Read mail (when you ask)', 'Calendar', 'SharePoint and OneDrive files you can already open'],
      tools: [
        { id: 'mail.search', label: 'Search mail' },
        { id: 'calendar.list', label: 'List calendar' },
        { id: 'files.search', label: 'Search files' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'Accru Stockholm' }
      ],
      connectLabel: 'Continue with Microsoft',
      authorize: {
        title: 'Continue with Microsoft',
        body: 'Use your normal Accru work login. The Hub requests only the mail, calendar and files scopes this agent needs.'
      }
    },
    {
      id: 'custom',
      name: 'Your own MCP',
      origin: '',
      originLabel: 'Custom',
      category: 'custom',
      auth: 'byo_mcp',
      icon: 'ph-plugs-connected',
      job: 'Paste a streamable MCP URL you already host — an escape hatch for tools we have not built yet.',
      findHelp: 'Any MCP server that speaks streamable HTTP. The Hub wraps it with your Accru login so you are not handing a raw secret to Claude.',
      capabilities: ['Whatever tools the remote MCP advertises'],
      tools: [
        { id: 'proxy', label: 'Tools advertised by the remote MCP' }
      ],
      fields: [
        { id: 'name', label: 'Connection name', type: 'text', required: true, value: 'My MCP' },
        { id: 'remoteUrl', label: 'Streamable MCP URL', type: 'url', required: true, placeholder: 'https://mcp.example.com/sse' },
        { id: 'bearer', label: 'Bearer token (optional)', type: 'password', required: false, hint: 'Only if the remote server expects one. Stored in the Hub vault, not in the URL you copy into Claude.' }
      ],
      connectLabel: 'Add MCP'
    }
  ];

  const ROLES = [
    { id: 'admin', name: 'Sarah Whitfield', title: 'Delegated admin', firm: 'Accru Stockholm', initials: 'SW' },
    { id: 'employee', name: 'Viktor Norell', title: 'Accountant', firm: 'Accru Stockholm', initials: 'VN' }
  ];

  /* Firm-level OAuth app. Admin saves this once; employees never see the secret. */
  const firmApps = {
    /* fortnox starts empty so the Connect Fortnox form is the first thing you see. */
  };

  /* Session state. Mutated by the prototype; never persisted. */
  const connections = [
    {
      id: 'c_m36501',
      connectorId: 'microsoft365',
      name: 'Accru Stockholm',
      status: 'connected',
      created: '12 Sep 2026',
      mcpUrl: 'https://hub.accru.partners/mcp/microsoft365/c_m36501'
    },
    {
      id: 'c_visma1',
      connectorId: 'visma',
      name: 'Visma eAccounting',
      status: 'needs_attention',
      created: '2 Aug 2026',
      mcpUrl: 'https://hub.accru.partners/mcp/visma/c_visma1',
      attention: 'The Visma grant expired. Reconnect to keep this MCP live.'
    }
  ];

  const agents = [
    {
      id: 'swedish-bookkeeping',
      name: 'Swedish bookkeeping assistant',
      status: 'draft',
      summary: 'Drafts voucher suggestions from Fortnox once that connector is attached.',
      instructions: 'You are a bookkeeping assistant for a Swedish Accru practice.\n\nUse Fortnox to look up customers, list open invoices and propose voucher lines. Never post a voucher until the user confirms the account codes. Reply in Swedish unless asked otherwise. Cite the Fortnox invoice or customer number you used.',
      connectorIds: [],
      updated: '19 Sep 2026'
    }
  ];

  function connectorById(id) {
    for (let i = 0; i < CONNECTORS.length; i++) if (CONNECTORS[i].id === id) return CONNECTORS[i];
    return null;
  }

  function connectionsFor(id) {
    return connections.filter(function (c) { return c.connectorId === id; });
  }

  function statusOf(id) {
    const cs = connectionsFor(id);
    if (cs.some(function (c) { return c.status === 'needs_attention'; })) return 'needs_attention';
    if (cs.some(function (c) { return c.status === 'connected'; })) return 'connected';
    if (firmApps[id]) return 'app_ready';
    return 'disconnected';
  }

  function firmApp(id) {
    return firmApps[id] || null;
  }

  function isActivated(id) {
    const s = statusOf(id);
    return s === 'connected' || s === 'needs_attention';
  }

  function agentById(id) {
    for (let i = 0; i < agents.length; i++) if (agents[i].id === id) return agents[i];
    return null;
  }

  window.HUB_DATA = {
    AUTH_LABELS: AUTH_LABELS,
    CONNECTORS: CONNECTORS,
    ROLES: ROLES,
    role: 'admin',
    firmApps: firmApps,
    connections: connections,
    agents: agents,
    firmApp: firmApp,
    connectorById: connectorById,
    connectionsFor: connectionsFor,
    statusOf: statusOf,
    isActivated: isActivated,
    agentById: agentById
  };
})();
