/* ==========================================================================
   UWork 客户端原型 · 交互
   ========================================================================== */
(function () {
  'use strict';

  const Store = window.UWorkStore;
  const DB = Store.db;
  const LEVELS = Store.levels;
  const PASSWORD = '123456';
  const CLIENT_VERSION = '1.5.0';
  const MESSAGE_READ_KEY = 'uwork.client.messages.read';
  const DEFAULT_WORKSPACE = 'default';
  const WORKSPACE_PRESETS = [
    { id: DEFAULT_WORKSPACE, name: '默认工作区', note: '未选择目录时的默认位置' },
    { id: '质量体系/8D 分析', name: '8D 分析', note: '质量体系' },
    { id: '质量体系/2026 内审', name: '2026 内审', note: '质量体系' },
    { id: '保密体系/涉密载体', name: '涉密载体', note: '保密体系' },
    { id: '产品研发/桌面端需求', name: '桌面端需求', note: '产品研发' }
  ];
  const DEFAULT_PERMISSION = 'workspace';
  const PERMISSIONS = [
    { id: 'read', name: '仅可查看', icon: 'shield', desc: '只读取内容，不创建或修改任何文件' },
    { id: 'workspace', name: '工作区内修改', icon: 'shield-pen', desc: '可在当前工作目录内创建、修改文件（默认）' },
    { id: 'full', name: '完全权限', icon: 'shield-alert', desc: '可读写工作目录外的文件，请谨慎使用' }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const icon = (name, cls = '') => '<svg class="icon ' + cls + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const pad = (num) => String(num).padStart(2, '0');
  const today = () => {
    const date = new Date();
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  };
  const nowTime = () => {
    const date = new Date();
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
  };

  const AGENTS = [
    {
      id: 'general', name: '通用办公', icon: 'sparkles', tone: 'tone-blue',
      desc: '公文写作、会议纪要、信息整理与日常协作',
      placeholder: '输入要处理的工作，或添加文件、知识库、技能与模板',
      intro: '日常写作、信息整理与跨系统协作'
    },
    {
      id: 'quality', name: '质量体系', icon: 'check-circle', tone: 'tone-amber',
      desc: '体系文件、内审外审、8D 分析与质量改进',
      placeholder: '描述质量问题，或添加体系文件、8D 报告与知识库目录',
      intro: '体系文件、内审与质量改进'
    },
    {
      id: 'security', name: '保密体系', icon: 'shield', tone: 'tone-emerald',
      desc: '保密制度、涉密载体、合规自查与风险提示',
      placeholder: '描述保密检查场景，或添加制度文件与知识库目录',
      intro: '保密制度、涉密载体与合规自查'
    },
    {
      id: 'product', name: '产品设计开发', icon: 'cube', tone: 'tone-violet',
      desc: '需求拆解、方案评审、设计输出与项目协同',
      placeholder: '描述产品需求，或添加需求文档、图纸与模板',
      intro: '需求拆解、设计评审与研发协同'
    }
  ];

  const SUGGESTIONS = {
    general: [
      '把这份会议记录整理成纪要并列出待办',
      '用公文格式写一份放假通知',
      '把这周的销售数据整理成周报',
      '帮我起草一份跨部门协作说明'
    ],
    quality: [
      '根据这份 8D 报告提炼根因与纠正措施',
      '帮我编制 2026 年度内审检查表',
      '对照 GJB 9001C 检查这份程序文件',
      '分析近期供应商质量问题并给出改进建议'
    ],
    security: [
      '对照保密制度做一次文档合规自查',
      '涉密载体借阅流程有哪些关键控制点',
      '检查这份知识库文档是否满足密级要求',
      '生成一份保密检查整改清单'
    ],
    product: [
      '把这个需求拆解成用户故事和验收标准',
      '评审这份结构设计输出的完整性',
      '输出产品需求规格说明书的目录结构',
      '整理技术评审会议的待办与责任人'
    ]
  };

  const state = {
    user: null,
    agent: 'general',
    view: 'home',
    modelId: 'm1',
    permission: DEFAULT_PERMISSION,
    workspace: DEFAULT_WORKSPACE,
    workspaces: WORKSPACE_PRESETS.slice(),
    recentSort: 'recent',
    sessionQuery: '',
    wsCollapsed: new Set(),
    wsExpanded: new Set(),
    sessions: [],
    currentSessionId: null,
    attachments: [],
    plusOpen: false,
    submenuKind: null,
    submenuAnchor: null,
    picker: null,
    preview: null,
    uploadFile: null,
    templateEditId: null,
    folderContext: null,
    kbQuery: '',
    kbTab: 'all',
    kbDetail: null,
    kbFolder: 'all',
    kbDocQuery: '',
    kbDocStatus: 'all',
    tplFolder: 'all',
    tplQuery: '',
    skillFolder: 'all',
    skillQuery: '',
    skillMenuOpen: false,
    connFolder: 'all',
    connQuery: '',
    pickerIndex: new Map(),
    clientVersion: CLIENT_VERSION,
    updateRelease: null,
    updateState: 'idle',
    updateProgress: 0,
    updateReadyVersion: null,
    updateTimer: null,
    messageOpenId: null,
    docPanelClosed: null,
    flowTimer: null
  };

  let submenuTimer = null;
  let toastTimer = null;

  const dom = {
    login: $('#login-screen'),
    app: $('#app'),
    composer: $('#composer'),
    prompt: $('#prompt'),
    send: $('#send-btn'),
    addBtn: $('#add-btn'),
    plus: $('#plus-menu'),
    submenu: $('#attach-submenu'),
    modelMenu: $('#model-menu'),
    modelBtn: $('#model-btn'),
    modelName: $('#model-name'),
    modelCtx: $('#model-ctx'),
    permissionBtn: $('#permission-btn'),
    permissionName: $('#permission-name'),
    permissionIco: $('#permission-ico'),
    permissionMenu: $('#permission-menu'),
    workspaceBtn: $('#workspace-btn'),
    workspaceName: $('#workspace-name'),
    workspaceMenu: $('#workspace-menu'),
    workspaceDirInput: $('#workspace-dir-input'),
    agentGrid: $('#agent-grid'),
    agentScope: $('#agent-scope-note'),
    docPanel: $('#doc-panel'),
    suggestions: $('#suggest-grid'),
    recent: $('#recent-list'),
    userPop: $('#user-pop'),
    clearancePop: $('#clearance-pop'),
    kbPicker: $('#kb-picker'),
    kbTree: $('#kb-picker-tree'),
    tplPicker: $('#template-picker'),
    tplTree: $('#template-picker-tree'),
    preview: $('#preview-dialog'),
    update: $('#update-dialog'),
    updateBody: $('#update-body'),
    updateActions: $('#update-actions'),
    updateCheckTime: $('#update-check-time'),
    messages: $('#message-dialog'),
    messageList: $('#message-list')
  };

  /* ------------------------------ 基础工具 ------------------------------ */
  function findKb(id) {
    return DB.knowledgeBases.find((kb) => kb.id === id) || null;
  }
  function findDoc(id) {
    for (const kb of DB.knowledgeBases) {
      const doc = kb.docs.find((item) => item.id === id);
      if (doc) return { doc, kb };
    }
    return null;
  }
  function findTemplate(id) {
    return DB.templates.find((item) => item.id === id) || null;
  }
  function visibleKbs() {
    return Store.visible(DB.knowledgeBases, state.user.level);
  }
  function visibleDocs(kb) {
    return Store.visible(kb.docs, state.user.level);
  }
  function visibleTemplates() {
    return Store.visible(DB.templates, state.user.level);
  }
  function levelBadge(code) {
    const level = Store.level(code);
    return '<span class="lvl" style="color:' + level.color + ';background:' + level.bg + '">' + esc(level.name) + '</span>';
  }

  /* ------------------------------ 连接器图标 ------------------------------ */
  const CONN_MARKS = {
    chat: '<path d="M4.6 7.4A2.4 2.4 0 0 1 7 5h10a2.4 2.4 0 0 1 2.4 2.4v6.2A2.4 2.4 0 0 1 17 16h-5.4L7.4 19v-3H7a2.4 2.4 0 0 1-2.4-2.4z"/><path d="M8.8 10.4h6.4"/>',
    doc: '<path d="M7.2 3.8h6.2l4.4 4.4v11.2a1.4 1.4 0 0 1-1.4 1.4H7.2a1.4 1.4 0 0 1-1.4-1.4V5.2a1.4 1.4 0 0 1 1.4-1.4z"/><path d="M13.4 3.9v4.5h4.4M8.8 12.6h6.4M8.8 16h4.4"/>',
    book: '<path d="M4.4 5.4a1 1 0 0 1 1-1H10a2 2 0 0 1 2 2v11.8a2 2 0 0 0-2-2H5.4a1 1 0 0 1-1-1z"/><path d="M19.6 5.4a1 1 0 0 0-1-1H14a2 2 0 0 0-2 2v11.8a2 2 0 0 1 2-2h4.6a1 1 0 0 0 1-1z"/>',
    flow: '<rect x="3.6" y="3.8" width="6.2" height="5" rx="1.4"/><rect x="14.2" y="15.2" width="6.2" height="5" rx="1.4"/><path d="M6.7 8.8v5.8a2.6 2.6 0 0 0 2.6 2.6h4.9"/>',
    cube: '<path d="M12 3.4 19.4 7.4v9.2L12 20.6 4.6 16.6V7.4z"/><path d="m4.8 7.5 7.2 3.9 7.2-3.9M12 11.4v9"/>',
    mail: '<rect x="3.6" y="5.6" width="16.8" height="12.8" rx="2.2"/><path d="m4.6 7.6 7.4 5.2 7.4-5.2"/>',
    code: '<path d="m9.2 7.6-4.4 4.4 4.4 4.4M14.8 7.6l4.4 4.4-4.4 4.4"/>',
    video: '<rect x="3.4" y="6.2" width="12.6" height="11.6" rx="2.4"/><path d="m16.4 11.2 4.2-2.6v6.8l-4.2-2.6z"/>',
    db: '<ellipse cx="12" cy="6.2" rx="7.2" ry="2.8"/><path d="M4.8 6.2v11.6c0 1.6 3.2 2.8 7.2 2.8s7.2-1.2 7.2-2.8V6.2"/><path d="M4.8 12c0 1.6 3.2 2.8 7.2 2.8s7.2-1.2 7.2-2.8"/>',
    clipboard: '<rect x="5.6" y="4.8" width="12.8" height="15" rx="2.2"/><path d="M9.4 4.8V3.6h5.2v1.2M9.2 12.4l2 2 3.8-3.8"/>',
    activity: '<path d="M3.4 12.4h4l2.4-6.2 4.2 12 2.4-5.8h4.2"/>',
    form: '<rect x="4.8" y="4.2" width="14.4" height="15.6" rx="2.2"/><path d="M8.4 9h7.2M8.4 12.6h7.2M8.4 16.2h4"/>',
    kanban: '<rect x="3.8" y="4.4" width="4.6" height="15.2" rx="1.6"/><rect x="9.7" y="4.4" width="4.6" height="10.4" rx="1.6"/><rect x="15.6" y="4.4" width="4.6" height="6.4" rx="1.6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6"/><path d="m15.2 15.2 4.2 4.2"/>',
    cloud: '<path d="M7.6 18.4h9.2a3.6 3.6 0 0 0 .4-7.2 5.4 5.4 0 0 0-10.3-1.4 4 4 0 0 0 .7 8.6z"/>',
    chart: '<path d="M4.4 19.4h15.2"/><path d="M7.4 19.2v-6.2M12 19.2V8.6M16.6 19.2v-9"/>',
    table: '<rect x="3.6" y="5.2" width="16.8" height="13.6" rx="2"/><path d="M3.6 10.2h16.8M9.4 10.2v8.6M15 10.2v8.6"/>',
    user: '<circle cx="12" cy="8.4" r="3.6"/><path d="M5.4 19.8c.9-3.4 3.5-5.4 6.6-5.4s5.7 2 6.6 5.4"/>',
    shield: '<path d="M12 3.4 19 6v6.2c0 3.9-2.9 6.7-7 8.4-4.1-1.7-7-4.5-7-8.4V6z"/><path d="m9.2 11.8 2 2 3.6-3.8"/>',
    link: '<path d="M10 14a3.6 3.6 0 0 0 5.1 0l2.4-2.4a3.6 3.6 0 0 0-5.1-5.1L11.2 7.6"/><path d="M14 10a3.6 3.6 0 0 0-5.1 0l-2.4 2.4a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2"/>'
  };

  function connectorTile(item, extra) {
    const mark = CONN_MARKS[item.mark] || CONN_MARKS.link;
    return '<span class="conn-tile' + (extra ? ' ' + extra : '') + '" style="--conn-brand:' + esc(item.brand || '#5b7cfa') + '" aria-hidden="true">' +
      '<svg class="conn-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + mark + '</svg>' +
    '</span>';
  }

  function connectorOn(item) {
    return item.status === '已连接';
  }

  /* 接入配置是否已就绪：就绪 → 显示开关（可反复开启/关闭）；未就绪 → 显示「连接」 */
  function connectorConfigured(item) {
    return item.configured !== false;
  }

  /* 只更新开关与容器状态，不重排队、不重渲染，避免点击后条目「消失」或跳位 */
  function refreshConnectorToggle(id) {
    const connector = (DB.connectors || []).find((item) => item.id === id);
    if (!connector) return;
    const on = connectorOn(connector);
    $$('[data-conn-toggle="' + id + '"]').forEach((btn) => {
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', String(on));
      btn.title = on ? '关闭连接' : '开启连接';
      btn.setAttribute('aria-label', connector.name + (on ? '：已开启，点击关闭' : '：已关闭，点击开启'));
    });
    const added = on && state.attachments.some((att) => att.key === 'connector:' + id);
    $$('[data-conn-row="' + id + '"]').forEach((row) => {
      row.classList.toggle('is-off', !on);
      row.classList.toggle('is-added', !!added);
    });
    $$('[data-conn-card="' + id + '"]').forEach((card) => {
      card.classList.toggle('is-off', !on);
      card.classList.toggle('is-on', on);
    });
    const pageCount = $('#conn-on-count');
    if (pageCount) pageCount.textContent = visibleConnectors().filter(connectorOn).length;
  }

  function connectorSwitch(item, extra) {
    const on = connectorOn(item);
    return '<button type="button" class="conn-switch' + (on ? ' is-on' : '') + (extra ? ' ' + extra : '') + '" role="switch" aria-checked="' + on + '"' +
      ' data-conn-toggle="' + item.id + '" title="' + (on ? '关闭连接' : '开启连接') + '"' +
      ' aria-label="' + esc(item.name) + (on ? '：已开启，点击关闭' : '：已关闭，点击开启') + '"><span class="conn-knob"></span></button>';
  }

  function connectorConnectBtn(item) {
    return '<button type="button" class="conn-connect" data-conn-connect="' + item.id + '" title="连接 ' + esc(item.name) + '">' +
      icon('link') + '<span>连接</span></button>';
  }

  function visibleConnectors() {
    return (DB.connectors || []).filter((item) => Store.canSee(state.user.level, item.level));
  }

  function syncConnNav() {
    const node = $('#nav-conn-count');
    if (!node) return;
    const list = visibleConnectors();
    node.textContent = list.filter(connectorOn).length;
  }

  function setConnectorStatus(id, on, options) {
    const connector = (DB.connectors || []).find((item) => item.id === id);
    if (!connector) return null;
    const opts = options || {};
    connector.status = on ? '已连接' : '未连接';
    connector.connectedAt = on ? (today() + ' ' + nowTime()) : null;
    Store.save();
    if (!on) removeAttachment('connector:' + connector.id);
    syncConnNav();
    if (!opts.quiet) toast((on ? '已开启连接：' : '已关闭连接：') + connector.name);
    return connector;
  }

  function fileIco(ext) {
    const value = String(ext || 'file').toLowerCase();
    return '<span class="file-ico is-' + esc(value) + '">' + esc(value.slice(0, 4).toUpperCase()) + '</span>';
  }
  function permBadge(kb) {
    if (kb.canEdit) {
      return '<span class="perm ' + (kb.mine ? 'perm-manage' : 'perm-edit') + '">' +
        icon(kb.mine ? 'check-circle' : 'edit') + (kb.mine ? '可管理' : '可编辑') + '</span>';
    }
    return '<span class="perm perm-view">' + icon('eye') + '仅查看</span>';
  }
  function folderDocs(kb, folderId) {
    const ids = new Set([folderId].concat(Store.descendants(kb.folders, folderId).map((folder) => folder.id)));
    return kb.docs.filter((doc) => ids.has(doc.folder));
  }
  function folderVisibleDocs(kb, folderId) {
    return visibleDocs(kb).filter((doc) => {
      if (folderId === 'all') return true;
      const ids = new Set([folderId].concat(Store.descendants(kb.folders, folderId).map((folder) => folder.id)));
      return ids.has(doc.folder);
    });
  }
  function templateFolderIds(folderId) {
    if (folderId === 'all') return null;
    return new Set([folderId].concat(Store.descendants(DB.templateFolders, folderId).map((folder) => folder.id)));
  }
  function templatesInFolder(folderId) {
    const visible = visibleTemplates();
    const ids = templateFolderIds(folderId);
    return ids ? visible.filter((item) => ids.has(item.folder)) : visible;
  }
  function agentMetaOf(id) {
    return (DB.agents || []).find((item) => item.id === id) || null;
  }

  /* 首页与顶部栏只展示被授权的智能体：个人单独授权 > 部门授权 > 全部可用。 */
  function visibleAgents() {
    const allowed = Store.agentsForUser ? Store.agentsForUser(state.user) : AGENTS;
    if (!allowed) return AGENTS.slice();
    const ids = new Set((allowed || []).map((agent) => agent.id));
    return AGENTS.filter((agent) => ids.has(agent.id)).map((agent) => {
      const meta = agentMetaOf(agent.id);
      return meta ? Object.assign({}, agent, {
        name: meta.name || agent.name,
        desc: meta.desc || agent.desc,
        icon: meta.icon || agent.icon,
        tone: meta.tone || agent.tone
      }) : agent;
    });
  }

  function agentOf(id) {
    const base = AGENTS.find((agent) => agent.id === id) || AGENTS[0];
    const meta = agentMetaOf(base.id);
    return meta ? Object.assign({}, base, {
      name: meta.name || base.name,
      desc: meta.desc || base.desc,
      icon: meta.icon || base.icon,
      tone: meta.tone || base.tone
    }) : base;
  }
  function currentSession() {
    return state.sessions.find((session) => session.id === state.currentSessionId) || null;
  }
  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.hidden = false;
    requestAnimationFrame(() => node.classList.add('is-show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      node.classList.remove('is-show');
      setTimeout(() => { if (!node.classList.contains('is-show')) node.hidden = true; }, 200);
    }, 2400);
  }
  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    dialog.close();
  }
  /* ------------------------------ 软件更新 ------------------------------ */
  function clientUpdatePolicy() {
    return DB.clientUpdatePolicy || { minVersion: '1.4.0', channel: '正式版', checkOnLaunch: true, interval: '每 6 小时' };
  }

  function compareClientVersion(a, b) {
    const normalize = (value) => {
      const pieces = String(value || '').trim().split('-');
      return { core: pieces[0].split('.').map((part) => parseInt(part, 10) || 0), pre: pieces[1] || '' };
    };
    const left = normalize(a);
    const right = normalize(b);
    const length = Math.max(left.core.length, right.core.length, 3);
    for (let index = 0; index < length; index += 1) {
      const diff = (left.core[index] || 0) - (right.core[index] || 0);
      if (diff) return diff;
    }
    if (left.pre === right.pre) return 0;
    if (!left.pre) return 1;
    if (!right.pre) return -1;
    return left.pre.localeCompare(right.pre);
  }

  function latestClientRelease() {
    const policy = clientUpdatePolicy();
    const list = (DB.clientReleases || []).filter((item) => item.status === '已发布' && item.channel === policy.channel);
    return list.sort((a, b) => compareClientVersion(b.version, a.version))[0] || null;
  }

  function updateAvailable() {
    const latest = latestClientRelease();
    return !!latest && compareClientVersion(latest.version, state.clientVersion) > 0;
  }

  function syncClientVersionUI() {
    const versionNode = $('#pop-version');
    if (versionNode) versionNode.textContent = 'v' + state.clientVersion;
    const dot = $('#update-dot');
    if (dot) dot.hidden = !(updateAvailable() && clientUpdatePolicy().checkOnLaunch !== false);
    const loginVersion = $('#login-version');
    if (loginVersion) loginVersion.textContent = 'UWork 智能体 v' + state.clientVersion + ' · 企业内部部署';
  }

  function openUpdateDialog() {
    state.updateRelease = latestClientRelease();
    const latestVersion = state.updateRelease ? state.updateRelease.version : null;
    if (state.updateState === 'ready' && state.updateReadyVersion !== latestVersion) {
      state.updateState = 'idle';
      state.updateProgress = 0;
      state.updateReadyVersion = null;
    }
    renderUpdateDialog();
    openDialog(dom.update);
  }

  function renderUpdateDialog() {
    if (!dom.updateBody || !dom.updateActions) return;
    const policy = clientUpdatePolicy();
    const release = state.updateRelease;
    const current = state.clientVersion;
    const hasUpdate = !!release && compareClientVersion(release.version, current) > 0;
    const forced = hasUpdate && (release.updateType === '强制更新' || compareClientVersion(current, policy.minVersion) < 0);
    const stage = state.updateState;
    const percent = Math.round(state.updateProgress);
    let html = '';
    if (!release) {
      html = '<div class="update-empty">' + icon('info') + '<b>暂无可用更新</b><p>管理员尚未发布「' + esc(policy.channel) + '」版本，请稍后再试。</p></div>';
    } else {
      html += '<div class="update-versions">' +
        '<div class="update-version"><span>当前版本</span><b>v' + esc(current) + '</b><small>已安装</small></div>' +
        '<span class="update-arrow">→</span>' +
        '<div class="update-version' + (hasUpdate ? ' is-new' : '') + '"><span>最新版本</span><b>v' + esc(release.version) + '</b><small>' + esc(release.channel) + ' · ' + esc(release.updateType) + '</small></div>' +
        (hasUpdate ? '<span class="update-pill">有新版本</span>' : '<span class="update-pill is-ok">' + icon('check') + '已是最新</span>') +
      '</div>';
      if (hasUpdate) {
        if (forced) {
          html += '<div class="update-banner">' + icon('alert') + '<span><b>强制更新：</b>' +
            (release.updateType === '强制更新' ? '该版本被标记为强制更新。' : '当前版本低于最低支持版本 v' + esc(policy.minVersion) + '。') +
            '完成更新后才能继续使用客户端，关闭后下次启动仍会提示。</span></div>';
        }
        html += '<ul class="update-notes">' + (release.notes || []).map((note) => '<li>' + esc(note) + '</li>').join('') + '</ul>';
        html += '<div class="update-meta">' + esc(release.platform) + ' · ' + esc(release.size) + ' · ' + esc(release.publishedAt) + ' 发布 · ' + esc(release.file) + '</div>';
        if (stage === 'downloading') {
          html += '<div class="update-progress"><div class="update-progress-head"><span>正在下载安装包…</span><b>' + percent + '%</b></div>' +
            '<div class="update-progress-track"><i style="width:' + percent + '%"></i></div></div>';
        } else if (stage === 'ready') {
          html += '<div class="update-ready"><span class="update-ready-ico">' + icon('check') + '</span>' +
            '<div><b>更新包已下载</b><small>重启客户端后完成安装，当前版本仍为 v' + esc(current) + '</small></div></div>';
        }
      } else {
        html += '<div class="update-latest">' + icon('check-circle') + '<div><b>当前已是最新版本</b><small>客户端会在下次启动时自动检查更新。</small></div></div>';
      }
    }
    dom.updateBody.innerHTML = html;
    let actions = '';
    if (!forced) actions += '<button type="button" class="btn" data-action="close-update">' + (hasUpdate ? '稍后' : '关闭') + '</button>';
    if (hasUpdate && stage === 'ready') {
      if (!forced) actions += '<button type="button" class="btn" data-action="update-later">稍后重启</button>';
      actions += '<button type="button" class="btn btn-primary" data-action="update-restart">立即重启</button>';
    } else if (hasUpdate) {
      actions += '<button type="button" class="btn btn-primary" data-action="update-now"' + (stage === 'downloading' ? ' disabled' : '') + '>' +
        (stage === 'downloading' ? '下载中 ' + percent + '%' : '立即更新') + '</button>';
    }
    dom.updateActions.innerHTML = actions;
    if (dom.updateCheckTime) dom.updateCheckTime.textContent = '检查于 ' + nowTime();
  }

  function startClientUpdate() {
    const release = state.updateRelease;
    if (!release || state.updateState === 'downloading') return;
    state.updateState = 'downloading';
    state.updateProgress = 0;
    renderUpdateDialog();
    clearInterval(state.updateTimer);
    state.updateTimer = setInterval(() => {
      state.updateProgress = Math.min(100, state.updateProgress + 10);
      if (state.updateProgress >= 100) {
        clearInterval(state.updateTimer);
        state.updateTimer = null;
        state.updateState = 'ready';
        state.updateReadyVersion = release.version;
      }
      renderUpdateDialog();
    }, 150);
  }

  function closeUpdateDialog() {
    if (state.updateTimer) {
      clearInterval(state.updateTimer);
      state.updateTimer = null;
    }
    if (state.updateState === 'downloading') {
      state.updateState = 'idle';
      state.updateProgress = 0;
    }
    closeDialog(dom.update);
  }

  function restartClientUpdate() {
    if (!state.updateRelease || state.updateState !== 'ready') return;
    state.clientVersion = state.updateRelease.version;
    state.updateState = 'idle';
    state.updateProgress = 0;
    state.updateReadyVersion = null;
    closeDialog(dom.update);
    syncClientVersionUI();
    toast('已更新到 v' + state.clientVersion + '（演示）');
  }

  /* ------------------------------ 消息中心 ------------------------------ */
  function messageReadStore() {
    try {
      const raw = window.localStorage.getItem(MESSAGE_READ_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function readMessageIds(userId) {
    const all = messageReadStore();
    return Array.isArray(all[userId]) ? all[userId] : [];
  }

  function saveMessageReads(userId, ids) {
    try {
      const all = messageReadStore();
      all[userId] = ids;
      window.localStorage.setItem(MESSAGE_READ_KEY, JSON.stringify(all));
    } catch (err) { /* ignore */ }
  }

  function visibleMessages() {
    if (!state.user) return [];
    return (DB.notices || [])
      .filter((item) => item.status === '已发布' && Store.canSee(state.user.level, item.level))
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        level: item.level,
        publisher: item.publisher,
        content: item.content,
        publishedAt: item.time
      }))
      .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  }

  function unreadMessages() {
    if (!state.user) return [];
    const read = new Set(readMessageIds(state.user.id));
    return visibleMessages().filter((item) => !read.has(item.id));
  }

  function shortMessageTime(value) {
    if (!value || value === '—') return '未发布';
    return String(value).replace(/^\d{4}-/, '');
  }

  function updateMessageSummary() {
    const summary = $('#message-summary');
    const readAll = $('#message-read-all');
    if (!state.user) return;
    const total = visibleMessages().length;
    const unread = unreadMessages().length;
    if (summary) summary.textContent = '共 ' + total + ' 条' + (unread ? ' · 未读 ' + unread + ' 条' : ' · 已全部读完');
    if (readAll) readAll.hidden = unread === 0;
  }

  function syncMessageBadges() {
    const count = unreadMessages().length;
    const side = $('#side-msg-count');
    if (side) {
      side.hidden = count === 0;
      side.textContent = count > 9 ? '9+' : String(count);
    }
    const top = $('#topbar-msg');
    if (top) top.classList.toggle('has-dot', count > 0);
    if (dom.messages && dom.messages.open) updateMessageSummary();
  }

  function renderMessageCenter() {
    if (!dom.messageList || !state.user) return;
    const list = visibleMessages();
    const read = new Set(readMessageIds(state.user.id));
    dom.messageList.innerHTML = list.length ? list.map((message) => {
      const isRead = read.has(message.id);
      const isOpen = state.messageOpenId === message.id;
      const level = Store.level(message.level);
      return '<button type="button" class="message-card' + (isRead ? '' : ' is-unread') + (isOpen ? ' is-open' : '') + '" data-action="toggle-message" data-id="' + message.id + '">' +
        '<span class="message-dot"' + (isRead ? ' hidden' : '') + '></span>' +
        '<span class="message-card-head">' +
          '<span class="message-type">' + esc(message.type) + '</span>' +
          '<span class="lvl" style="color:' + level.color + ';background:' + level.bg + '">' + esc(level.name) + '级</span>' +
          (message.pinned ? '<span class="message-pin">' + icon('pin') + '置顶</span>' : '') +
          '<span class="message-time">' + esc(shortMessageTime(message.publishedAt)) + '</span>' +
        '</span>' +
        '<b>' + esc(message.title) + '</b>' +
        '<span class="message-content">' + esc(message.content).replace(/\n/g, '<br>') + '</span>' +
      '</button>';
    }).join('') : '<div class="message-empty">' + icon('bell') + '<b>暂无通知公告</b><p>管理员发布通知公告后会显示在这里。</p></div>';
    updateMessageSummary();
  }

  function openMessageCenter() {
    if (!state.user) return;
    dom.userPop.hidden = true;
    state.messageOpenId = null;
    renderMessageCenter();
    openDialog(dom.messages);
    syncMessageBadges();
  }

  function toggleMessage(id) {
    if (!state.user) return;
    const message = visibleMessages().find((item) => item.id === id);
    if (!message) return;
    const read = readMessageIds(state.user.id);
    if (!read.includes(id)) {
      read.push(id);
      saveMessageReads(state.user.id, read);
    }
    state.messageOpenId = state.messageOpenId === id ? null : id;
    renderMessageCenter();
    syncMessageBadges();
  }

  function readAllMessages() {
    if (!state.user) return;
    const read = new Set(readMessageIds(state.user.id));
    visibleMessages().forEach((message) => read.add(message.id));
    saveMessageReads(state.user.id, Array.from(read));
    renderMessageCenter();
    syncMessageBadges();
  }

  function levelOptions(selected, maxRank) {
    const limit = maxRank || Store.rank(state.user.level);
    return LEVELS.filter((level) => level.rank <= limit).map((level) =>
      '<option value="' + level.code + '"' + (selected === level.code ? ' selected' : '') + '>' +
      esc(level.name) + '级</option>'
    ).join('');
  }
  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function extOf(name) {
    const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : 'file';
  }
  function chipMeta(kind) {
    const labels = { file: '本地', kb: '知识库', folder: '目录', doc: '文档', skill: '技能', connector: '连接器', template: '模板', tplfolder: '模板目录' };
    return labels[kind] || '附件';
  }
  function fieldOf(form, name) {
    return form.querySelector('[name="' + name + '"]');
  }
  function chipIcon(kind) {
    const map = { file: 'file', kb: 'book', folder: 'folder', doc: 'file', skill: 'sparkles', connector: 'link', template: 'file', tplfolder: 'folder' };
    return icon(map[kind] || 'file');
  }

  /* ------------------------------ 登录 ------------------------------ */
  const DEMO_SESSIONS = [
    {
      id: 'demo-1', title: '梳理 8D 报告的根因与纠正措施', agent: 'quality', when: '今天 10:24', at: Date.now() - 40 * 1000, workspace: '质量体系/8D 分析',
      question: '帮我梳理这份 8D 报告里的根因分析，并给出可执行的纠正措施。',
      attachments: [
        { key: 'doc:kb1d7', kind: 'doc', name: '8D 质量问题分析报告-壳体裂纹.docx', level: 'L3', meta: '文档', path: '质量体系知识库 / 质量问题案例' },
        { key: 'skill:s3', kind: 'skill', name: '质量8D分析', level: 'L3', meta: '技能' }
      ]
    },
    {
      id: 'demo-2', title: '编制 2026 年度内审计划', agent: 'quality', when: '今天 09:12', at: Date.now() - 68 * 60 * 1000, workspace: '质量体系/2026 内审',
      question: '依据 ISO 9001 和 GJB 9001C，帮我编制 2026 年度内审计划，包含审核范围与时间安排。',
      attachments: [
        { key: 'kb:kb1', kind: 'kb', name: '质量体系知识库', level: 'L3', meta: '知识库' },
        { key: 'template:t3', kind: 'template', name: '内审不符合项报告.docx', level: 'L3', meta: '模板' }
      ]
    },
    {
      id: 'demo-3', title: '检查文档是否满足保密要求', agent: 'security', when: '昨天 17:40', at: Date.now() - 20 * 3600 * 1000, workspace: '保密体系/涉密载体',
      question: '对照保密制度检查这份知识库文档的发布流程，指出可能的风险点。',
      attachments: [
        { key: 'folder:kb7f2', kind: 'folder', name: '涉密载体管理', level: 'L3', meta: '目录', path: '保密管理制度库 / 涉密载体管理' },
        { key: 'skill:s5', kind: 'skill', name: '保密合规自查', level: 'L3', meta: '技能' }
      ]
    },
    {
      id: 'demo-4', title: '拆解 UWork 桌面端需求', agent: 'product', when: '昨天 14:06', at: Date.now() - 26 * 3600 * 1000, workspace: '产品研发/桌面端需求',
      question: '把这份桌面端需求拆解成用户故事和验收标准，重点关注知识库选择与密级过滤。',
      attachments: [
        { key: 'doc:kb3d2', kind: 'doc', name: 'UWork 桌面端需求规格说明书.docx', level: 'L2', meta: '文档', path: '产品研发知识库 / 需求文档' }
      ]
    }
  ];

  function readSessionUser() {
    try {
      const id = window.sessionStorage.getItem('uwork.user');
      return id ? Store.userById(id) : null;
    } catch (err) { return null; }
  }
  function saveSessionUser(user) {
    try { window.sessionStorage.setItem('uwork.user', user.id); } catch (err) { /* ignore */ }
  }
  function clearSessionUser() {
    try { window.sessionStorage.removeItem('uwork.user'); } catch (err) { /* ignore */ }
  }

  function showLoginError(message) {
    const error = $('#login-error');
    error.textContent = message;
    error.hidden = false;
  }
  function hideLoginError() {
    $('#login-error').hidden = true;
  }

  function attemptLogin(event) {
    if (event) event.preventDefault();
    hideLoginError();
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value;
    if (!username) { showLoginError('请输入用户名'); return; }
    if (!password) { showLoginError('请输入密码'); return; }
    const user = Store.userByName(username);
    if (!user) { showLoginError('账号不存在，请使用企业账号登录'); return; }
    if (user.status !== '启用') { showLoginError('账号已被停用或锁定，请联系管理员'); return; }
    if (password !== PASSWORD) { showLoginError('密码错误，演示账号密码为 123456'); return; }
    const submit = $('#login-submit');
    submit.classList.add('is-loading');
    submit.querySelector('span').textContent = '正在进入工作台…';
    setTimeout(() => {
      submit.classList.remove('is-loading');
      submit.querySelector('span').textContent = '登录';
      enterApp(user);
    }, 420);
  }

  function enterApp(user, options) {
    const opts = options || {};
    state.user = user;
    saveSessionUser(user);
    const allowedAgents = visibleAgents().map((agent) => agent.id);
    state.sessions = DEMO_SESSIONS
      .filter((session) => !allowedAgents.length || allowedAgents.includes(session.agent))
      .map((session) => Object.assign({}, session, {
        attachments: (session.attachments || []).filter((item) => !item.level || Store.canSee(user.level, item.level))
      }));
    state.attachments = [];
    state.currentSessionId = null;
    state.agent = (allowedAgents[0]) || 'general';
    state.docPanelClosed = null;
    if (state.flowTimer) { clearTimeout(state.flowTimer); state.flowTimer = null; }
    state.workspace = DEFAULT_WORKSPACE;
    state.permission = DEFAULT_PERMISSION;
    state.kbDetail = null;
    const visibleModels = DB.models.filter((model) => model.status === '启用' && Store.canSee(user.level, model.level));
    state.modelId = (visibleModels.find((model) => model.isDefault) || visibleModels[0] || {}).id || 'm2';

    if (state.user.level === 'L1' || state.user.level === 'L2') {
      state.attachments = [];
    }

    dom.app.hidden = false;
    if (opts.instant) {
      dom.login.hidden = true;
    } else {
      dom.login.classList.add('is-leaving');
      setTimeout(() => {
        dom.login.hidden = true;
        dom.login.classList.remove('is-leaving');
      }, 260);
    }
    document.body.classList.add('is-app');

    updateUserUI();
    syncClientVersionUI();
    syncMessageBadges();
    const navKb = $('#nav-kb-count');
    if (navKb) navKb.textContent = visibleKbs().length;
    const navSkill = $('#nav-skill-count');
    if (navSkill) navSkill.textContent = visibleSkills().length;
    syncConnNav();
    populateSelects();
    renderAgents();
    renderSuggestions();
    renderRecent();
    renderChips();
    mountComposer();
    syncComposerModel();
    syncWorkspaceBtn();
    syncPermissionBtn();
    navigate('home', { silent: true });
    applyPreviewParams();
  }

  function logout() {
    clearSessionUser();
    clearFlowTimer();
    hideDocPanel();
    state.docPanelClosed = null;
    try { window.history.replaceState(null, '', window.location.pathname); } catch (err) { /* ignore */ }
    state.user = null;
    state.sessions = [];
    state.currentSessionId = null;
    state.attachments = [];
    state.kbDetail = null;
    closeAllOverlays();
    closeDialog(dom.kbPicker);
    closeDialog(dom.tplPicker);
    closeDialog(dom.preview);
    closeUpdateDialog();
    closeDialog(dom.messages);
    state.messageOpenId = null;
    dom.app.hidden = true;
    dom.login.hidden = false;
    dom.login.classList.remove('is-leaving');
    document.body.classList.remove('is-app');
    $('#login-password').value = PASSWORD;
    hideLoginError();
    $('#login-username').focus();
  }

  function updateUserUI() {
    const user = state.user;
    if (!user) return;
    const level = Store.level(user.level);
    const initial = user.name.slice(0, 1);
    $('#user-avatar').textContent = initial;
    $('#user-avatar-2').textContent = initial;
    $('#user-name').textContent = user.name;
    $('#user-name-2').textContent = user.name;
    $('#user-dept').textContent = user.dept;
    $('#user-level').textContent = level.name + '级';
    $('#user-account').textContent = user.username + '@uwork.cn';
    $('#user-level-pill').innerHTML = '<span class="lvl" style="color:' + level.color + ';background:' + level.bg + '">' + level.name + '级 · ' + esc(user.role) + '</span>';
    $('#clearance-text').textContent = level.name + '级';
    $('#clearance-pop-level').textContent = level.name + '级';
    const note = $('#composer-note');
    if (note) {
      note.innerHTML = icon('shield') + '当前账号 <b>' + esc(user.name) + '</b> · ' + level.name + '级，只会调用' + level.name + '及以下的知识与能力';
    }
  }

  function populateSelects() {
    const kbLevel = $('#new-kb-level');
    if (kbLevel) kbLevel.innerHTML = levelOptions(state.user.level === 'L3' ? 'L3' : 'L2');
    const tplLevel = $('#new-template-level');
    if (tplLevel) tplLevel.innerHTML = levelOptions('L2');
    const connLevel = $('#new-connector-level');
    if (connLevel) connLevel.innerHTML = levelOptions(state.user.level === 'L3' ? 'L3' : 'L2');
    const connFolder = $('#new-connector-folder');
    if (connFolder) {
      connFolder.innerHTML = (DB.connectorFolders || [])
        .filter((folder) => folder.id !== 'cf0')
        .map((folder) => {
          const trail = Store.folderTrail(DB.connectorFolders, folder.id);
          const label = new Array(trail.length).join('　') + folder.name;
          return '<option value="' + folder.id + '">' + esc(label) + '</option>';
        })
        .join('') + '<option value="cf0">未分类</option>';
    }
  }

  function applyPreviewParams() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const userParam = params.get('user');
    if (userParam) {
      const user = Store.userByName(userParam);
      if (user) {
        state.user = user;
        updateUserUI();
        populateSelects();
        renderChips();
      }
    }
    if (view === 'chat') {
      const sessionId = params.get('chat') || state.sessions[0] && state.sessions[0].id;
      openSession(sessionId);
    } else if (view === 'knowledge') {
      navigate('knowledge');
    } else if (view === 'templates') {
      navigate('templates');
    } else if (view === 'skills') {
      navigate('skills');
    } else if (view === 'connectors') {
      navigate('connectors');
    } else if (view === 'home') {
      navigate('home');
    }
    const categoryParam = params.get('cnf') || params.get('category');
    if (categoryParam && (DB.connectorFolders || []).some((folder) => folder.id === categoryParam)) {
      state.connFolder = categoryParam;
      if (state.view === 'connectors') renderConnectors();
    }
    const permissionParam = params.get('permission');
    if (permissionParam && PERMISSIONS.some((item) => item.id === permissionParam)) {
      state.permission = permissionParam;
      syncPermissionBtn();
    }
    if (params.get('kb')) openKb(params.get('kb'));
    if (params.get('dialog') === 'kb-picker') setTimeout(openKbPicker, 60);
    if (params.get('dialog') === 'template-picker') setTimeout(openTemplatePicker, 60);
    if (params.get('dialog') === 'new-kb') setTimeout(() => openDialog($('#new-kb-dialog')), 60);
    if (params.get('dialog') === 'new-template') setTimeout(openNewTemplateDialog, 60);
    if (params.get('dialog') === 'update') setTimeout(openUpdateDialog, 120);
    if (params.get('dialog') === 'messages') setTimeout(openMessageCenter, 120);
    if (params.get('dialog') === 'permission') setTimeout(openPermissionMenu, 120);
    if (params.get('dialog') === 'create-skill') setTimeout(createSkillWithAgent, 140);
    if (params.get('dialog') === 'skill-add') {
      setTimeout(() => {
        if (state.view !== 'skills') navigate('skills');
        openSkillMenu();
      }, 140);
    }
    if (params.get('dialog') === 'new-connector') setTimeout(openNewConnectorDialog, 140);
    if (params.get('dialog') === 'preview') {
      setTimeout(() => {
        const found = params.get('doc') ? findDoc(params.get('doc')) : null;
        if (found) openPreview(found.doc, { type: 'doc', kb: found.kb });
        else {
          const tpl = findTemplate(params.get('tpl') || 't1');
          if (tpl) openPreview(tpl, { type: 'template' });
        }
      }, 80);
    }
    const plusParam = params.get('plus');
    if (plusParam === '1') setTimeout(openPlus, 80);
    else if (plusParam) {
      setTimeout(() => {
        openPlus();
        choosePlus(plusParam);
      }, 120);
    }
    const flowParam = params.get('flow');
    if (flowParam === 'return') setTimeout(startReturnFlowDemo, 200);
  }

  function startReturnFlowDemo() {
    if (!state.user) return;
    if (state.view !== 'home') newChat();
    dom.prompt.value = '帮我填写退库申请单';
    autosizePrompt();
    syncSend();
    sendMessage();
  }

  /* ------------------------------ 导航 ------------------------------ */
  function navigate(view, options) {
    const opts = options || {};
    if (!state.user) return;
    state.view = view;
    ['home', 'chat', 'knowledge', 'templates', 'skills', 'connectors'].forEach((name) => {
      const section = $('#view-' + name);
      if (section) section.hidden = name !== view;
    });
    $$('.side-nav-item').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.view === view);
    });
    if (view === 'knowledge') {
      if (!state.kbDetail && !opts.keepDetail) { /* keep current */ }
      renderKnowledge();
    }
    if (view === 'templates') renderTemplates();
    if (view === 'skills') renderSkillsPage();
    if (view === 'connectors') renderConnectors();
    if (view === 'home') {
      renderAgents();
      renderSuggestions();
    }
    if (view === 'chat') renderChat();
    mountComposer();
    updateTopbar();
    closeAllOverlays();
    syncDocPanel();
    const scroller = $('#view-scroll');
    if (scroller) scroller.scrollTop = 0;
    closeSidebar();
  }

  function updateTopbar() {
    const title = $('#view-title');
    const main = $('.main');
    if (main) main.classList.toggle('is-home', state.view === 'home');
    const eyebrow = $('#top-eyebrow');
    const chip = $('#agent-chip');
    if (state.view === 'home') {
      eyebrow.textContent = 'UWork 工作台';
      title.textContent = '新会话';
      chip.hidden = false;
      $('#agent-chip-text').textContent = agentOf(state.agent).name;
    } else if (state.view === 'chat') {
      const session = currentSession();
      const agent = agentOf(session ? session.agent : state.agent);
      eyebrow.textContent = agent.name + '智能体';
      title.textContent = session ? session.title : '新会话';
      chip.hidden = false;
      $('#agent-chip-text').textContent = agent.name;
    } else if (state.view === 'knowledge') {
      eyebrow.textContent = '企业知识资产';
      title.textContent = state.kbDetail ? (findKb(state.kbDetail) || {}).name || '知识库' : '知识库';
      chip.hidden = true;
    } else if (state.view === 'templates') {
      eyebrow.textContent = '标准化工作方式';
      title.textContent = '文档模板';
      chip.hidden = true;
    } else if (state.view === 'skills') {
      eyebrow.textContent = '企业能力中心';
      title.textContent = '技能';
      chip.hidden = true;
    } else if (state.view === 'connectors') {
      eyebrow.textContent = '业务系统连接';
      title.textContent = '连接器';
      chip.hidden = true;
    }
  }

  function openSidebar() {
    dom.app.classList.add('is-drawer');
    $('#sidebar-scrim').hidden = false;
  }
  function closeSidebar() {
    dom.app.classList.remove('is-drawer');
    const scrim = $('#sidebar-scrim');
    if (scrim) scrim.hidden = true;
  }

  function closeAllOverlays() {
    closePlus();
    closeSkillMenu();
    hideModelMenu();
    hideWorkspaceMenu();
    hidePermissionMenu();
    hideDocPanel();
    dom.userPop.hidden = true;
    dom.clearancePop.hidden = true;
  }

  /* ------------------------------ 首页 ------------------------------ */
  function renderAgents() {
    const list = visibleAgents();
    if (dom.agentGrid) {
      dom.agentGrid.classList.toggle('is-scarce', list.length < AGENTS.length);
      dom.agentGrid.style.setProperty('--agent-cols', String(Math.max(1, Math.min(list.length, AGENTS.length))));
    }
    if (!list.length) {
      dom.agentGrid.innerHTML = '<div class="agent-empty">' + icon('shield') +
        '<b>当前账号暂未授权任何智能体</b><small>请联系管理员在管理端「系统管理 → 智能体权限」中，为你的部门或个人开启智能体。</small></div>';
      renderAgentScope(list);
      return;
    }
    if (!list.some((agent) => agent.id === state.agent)) state.agent = list[0].id;
    dom.agentGrid.innerHTML = list.map((agent) => {
      const active = state.agent === agent.id;
      return '<button type="button" class="agent-card' + (active ? ' is-active' : '') + '" data-agent="' + agent.id + '" role="radio" aria-checked="' + active + '">' +
        '<span class="agent-ico ' + agent.tone + '">' + icon(agent.icon) + '</span>' +
        '<span class="agent-copy"><b>' + agent.name + '</b><small>' + agent.desc + '</small></span>' +
        '<span class="agent-check">' + icon('check') + '</span>' +
        '</button>';
    }).join('');
    renderAgentScope(list);
  }

  function renderAgentScope(list) {
    if (!dom.agentScope) return;
    const agents = list || visibleAgents();
    const total = AGENTS.length;
    if (!agents.length) {
      dom.agentScope.innerHTML = icon('shield') + '当前账号 <b>0</b> / ' + total + ' 个智能体 · 请联系管理员授权';
      return;
    }
    if (agents.length >= total) {
      dom.agentScope.innerHTML = icon('shield') + '当前账号已授权全部 <b>' + total + '</b> 个智能体';
      return;
    }
    const override = Store.userAgentOverride ? Store.userAgentOverride(state.user.id) : null;
    const dep = Store.departmentOfUser ? Store.departmentOfUser(state.user) : null;
    const source = override ? '个人单独授权' : (dep ? dep.name + '授权' : '部门授权');
    dom.agentScope.innerHTML = icon('shield') +
      '当前账号可见 <b>' + agents.length + '</b> / ' + total + ' 个智能体 · ' + esc(source) +
      ' <span>其余智能体未授权，可在管理端「智能体权限」调整</span>';
  }

  function renderSuggestions() {
    const agent = agentOf(state.agent);
    $('#suggest-agent-label').textContent = agent.name;
    dom.suggestions.innerHTML = (SUGGESTIONS[agent.id] || SUGGESTIONS.general).map((text) =>
      '<button type="button" class="suggest-card" data-suggest="' + esc(text) + '">' +
        '<span class="suggest-ico">' + icon(agent.icon) + '</span>' +
        '<span>' + esc(text) + '</span>' +
        icon('chevron-right', 'arrow') +
      '</button>'
    ).join('');
  }

  function selectAgent(id) {
    if (!visibleAgents().some((agent) => agent.id === id)) {
      toast('该智能体未对当前账号授权，请联系管理员在「智能体权限」中开启');
      return;
    }
    state.agent = id;
    renderAgents();
    renderSuggestions();
    updateComposerPlaceholder();
    if (state.view === 'home' || state.view === 'chat') {
      $('#agent-chip-text').textContent = agentOf(id).name;
    }
    if (state.view === 'chat') { /* 已开始的会话不切换后台智能体，仅更新选择 */ }
  }

  function updateComposerPlaceholder() {
    dom.prompt.placeholder = agentOf(state.agent).placeholder;
  }

  /* ------------------------------ 输入框 ------------------------------ */
  function mountComposer() {
    if (!state.user) { dom.composer.hidden = true; return; }
    const homeMount = $('#composer-home');
    const chatMount = $('#composer-chat');
    if (state.view === 'home' && homeMount) {
      homeMount.appendChild(dom.composer);
      dom.composer.hidden = false;
    } else if (state.view === 'chat' && chatMount) {
      chatMount.appendChild(dom.composer);
      dom.composer.hidden = false;
    } else {
      dom.composer.hidden = true;
      closePlus();
    }
    updateComposerPlaceholder();
  }

  function autosizePrompt() {
    dom.prompt.style.height = 'auto';
    dom.prompt.style.height = Math.min(190, Math.max(58, dom.prompt.scrollHeight)) + 'px';
  }

  function syncSend() {
    const ready = !!dom.prompt.value.trim() || state.attachments.length > 0;
    dom.send.classList.toggle('is-ready', ready);
    const hint = $('#composer-hint');
    if (hint) hint.textContent = state.attachments.length ? state.attachments.length + ' 项引用 · Enter 发送' : 'Enter 发送';
  }

  function renderChips() {
    const wrap = $('#composer-chips');
    if (!state.attachments.length) {
      wrap.hidden = true;
      wrap.innerHTML = '';
      syncSend();
      return;
    }
    wrap.hidden = false;
    wrap.innerHTML = state.attachments.map((item) =>
      '<span class="chip" data-chip="' + esc(item.key) + '" title="' + esc(item.path || item.name) + '">' +
        '<span class="chip-type">' + chipIcon(item.kind) + '</span>' +
        '<span class="chip-name">' + esc(item.name) + '</span>' +
        '<span class="chip-meta">' + esc(item.meta || chipMeta(item.kind)) + '</span>' +
        '<button type="button" class="chip-x" data-chip-remove="' + esc(item.key) + '" aria-label="移除 ' + esc(item.name) + '">' + icon('x') + '</button>' +
      '</span>'
    ).join('');
    syncSend();
  }

  function addAttachment(item) {
    if (!item || !item.key) return false;
    if (state.attachments.some((current) => current.key === item.key)) return false;
    state.attachments.push(item);
    renderChips();
    return true;
  }

  function removeAttachment(key) {
    state.attachments = state.attachments.filter((item) => item.key !== key);
    renderChips();
    syncSend();
  }

  function toggleAttachment(item) {
    if (state.attachments.some((current) => current.key === item.key)) {
      removeAttachment(item.key);
      return false;
    }
    return addAttachment(item);
  }

  function setPrompt(text, focus) {
    dom.prompt.value = text;
    autosizePrompt();
    syncSend();
    if (focus !== false) {
      dom.prompt.focus();
      dom.prompt.setSelectionRange(dom.prompt.value.length, dom.prompt.value.length);
    }
  }

  function clearComposer() {
    dom.prompt.value = '';
    state.attachments = [];
    renderChips();
    autosizePrompt();
    syncSend();
  }

  /* ------------------------------ 加号菜单 ------------------------------ */
  // 弹层统一锚定到触发按钮：左边缘与按钮左边缘齐平，优先在按钮正上方展开
  function placeAnchoredMenu(menu, anchor, width) {
    if (!menu || !anchor) return;
    const gap = 10;
    const edge = 8;
    const rect = anchor.getBoundingClientRect();
    const maxWidth = Math.max(160, window.innerWidth - edge * 2);
    const menuWidth = Math.min(width, maxWidth);
    menu.style.width = menuWidth + 'px';
    // 水平方向：左边缘与按钮齐平，超出视口时向内收
    const left = Math.max(edge, Math.min(rect.left, window.innerWidth - menuWidth - edge));
    menu.style.left = left + 'px';
    // 垂直方向：按钮上方装得下就向上展开，否则翻到按钮下方
    const height = menu.offsetHeight;
    const spaceAbove = rect.top - gap - edge;
    const spaceBelow = window.innerHeight - rect.bottom - gap - edge;
    const up = height <= spaceAbove || spaceAbove >= spaceBelow;
    const top = up
      ? Math.max(edge, rect.top - gap - height)
      : Math.max(edge, Math.min(rect.bottom + gap, window.innerHeight - height - edge));
    menu.style.top = top + 'px';
    menu.style.transformOrigin = up ? 'bottom left' : 'top left';
  }
  function openPlus() {
    if (state.view !== 'home' && state.view !== 'chat') return;
    hidePermissionMenu();
    state.plusOpen = true;
    dom.plus.hidden = false;
    dom.addBtn.classList.add('is-open');
    dom.addBtn.setAttribute('aria-expanded', 'true');
    placeAnchoredMenu(dom.plus, dom.addBtn, 286);
  }
  function closePlus() {
    state.plusOpen = false;
    state.submenuKind = null;
    state.submenuAnchor = null;
    if (dom.plus) { dom.plus.hidden = true; dom.plus.removeAttribute('style'); }
    if (dom.submenu) dom.submenu.hidden = true;
    if (dom.addBtn) {
      dom.addBtn.classList.remove('is-open');
      dom.addBtn.setAttribute('aria-expanded', 'false');
    }
    $$('.plus-item').forEach((item) => item.classList.remove('is-hot'));
  }
  function togglePlus() {
    if (state.plusOpen) closePlus();
    else openPlus();
  }

  function choosePlus(kind) {
    if (kind === 'templates') {
      closePlus();
      openTemplatePicker();
      return;
    }
    if (kind === 'knowledge') {
      closePlus();
      openKbPicker();
      return;
    }
    const anchor = $('.plus-item[data-plus="' + kind + '"]');
    if (!anchor) return;
    if (state.submenuKind === kind && !dom.submenu.hidden) {
      hideSubmenu();
      return;
    }
    showSubmenu(kind, anchor);
  }

  function connectorRowHtml(item) {
    const on = connectorOn(item);
    const configured = connectorConfigured(item);
    const added = configured && on && state.attachments.some((att) => att.key === 'connector:' + item.id);
    return '<div class="conn-row' + (added ? ' is-added' : '') + (configured && !on ? ' is-off' : '') + '" data-conn-row="' + item.id + '" data-name="' + esc((item.name + ' ' + connectorPathText(item) + ' ' + (item.desc || '')).toLowerCase()) + '">' +
      '<button type="button" class="conn-row-main" data-conn-main="' + item.id + '" title="' +
        (!configured ? '点击连接 ' + esc(item.name)
          : (on ? '点击带入当前会话（已添加时再点可移出）' : esc(item.name) + ' 已关闭，打开右侧开关后可带入会话')) + '">' +
        connectorTile(item) +
        '<b>' + esc(item.name) + '</b>' +
      '</button>' +
      (configured ? connectorSwitch(item) : connectorConnectBtn(item)) +
    '</div>';
  }

  function paintConnectorMenu() {
    const list = $('#conn-menu-list');
    if (!list) return;
    const input = $('#conn-menu-search');
    const query = (input ? input.value : '').trim().toLowerCase();
    let items = visibleConnectors();
    if (query) {
      items = items.filter((item) => (item.name + ' ' + connectorPathText(item) + ' ' + (item.desc || '')).toLowerCase().includes(query));
    }
    /* 稳定分组：已开启 → 已配置待开启 → 未配置；组内保持原有顺序 */
    const group = (item) => (connectorOn(item) ? 0 : (connectorConfigured(item) ? 1 : 2));
    items = items.slice().sort((a, b) => group(a) - group(b));
    list.innerHTML = items.length ? items.map(connectorRowHtml).join('') : '<div class="sub-empty">没有匹配的连接器</div>';
  }

  function addConnectorToSession(connector) {
    const added = !state.attachments.some((item) => item.key === 'connector:' + connector.id);
    toggleAttachment({ key: 'connector:' + connector.id, kind: 'connector', name: connector.name, level: connector.level, meta: '连接器' });
    closePlus();
    toast(added ? '已添加连接器：' + connector.name : '已移除连接器：' + connector.name);
  }

  function toggleConnectorStatus(id) {
    const connector = (DB.connectors || []).find((item) => item.id === id);
    if (!connector) return;
    setConnectorStatus(id, !connectorOn(connector));
    /* 原位更新：开关只切换开启状态，列表位置不变 */
    refreshConnectorToggle(id);
  }

  function connectConnector(id) {
    const connector = setConnectorStatus(id, true, { quiet: true });
    if (!connector) return;
    connector.configured = true;
    Store.save();
    toast('已连接：' + connector.name + '，可在会话中直接调用');
    if (state.view === 'connectors') paintConnectorCards();
    paintConnectorMenu();
  }

  function showSubmenu(kind, anchor) {
    clearTimeout(submenuTimer);
    state.submenuKind = kind;
    state.submenuAnchor = anchor;
    $$('.plus-item').forEach((item) => item.classList.toggle('is-hot', item === anchor));
    if (kind === 'files') {
      dom.submenu.className = 'attach-submenu is-compact';
      dom.submenu.innerHTML =
        '<div class="sub-head"><b>添加文件</b><small>PDF / Office / 图片</small></div>' +
        '<div class="sub-list">' +
          '<button type="button" class="sub-row" data-sub-action="local-file">' +
            '<span class="sub-ico">' + icon('upload') + '</span>' +
            '<span class="sub-copy"><b>本地文件</b><small>从电脑选择文件上传</small></span>' +
            icon('chevron-right') +
          '</button>' +
        '</div>';
    } else if (kind === 'connectors') {
      dom.submenu.className = 'attach-submenu is-connectors';
      dom.submenu.innerHTML =
        '<div class="conn-menu">' +
          '<label class="conn-menu-search">' + icon('search') +
            '<input type="search" id="conn-menu-search" placeholder="搜索连接器" spellcheck="false" autocomplete="off">' +
          '</label>' +
          '<div class="conn-menu-list" id="conn-menu-list"></div>' +
          '<button type="button" class="conn-menu-foot" data-sub-action="manage-connectors">' +
            icon('arrow-up', 'conn-foot-ico') + '管理连接器' +
          '</button>' +
        '</div>';
      const connInput = $('#conn-menu-search');
      if (connInput) connInput.addEventListener('input', () => paintConnectorMenu());
      paintConnectorMenu();
    } else {
      /* 技能：搜索 + 已集成技能 + 从本地添加 / 管理技能 */
      dom.submenu.className = 'attach-submenu';
      const rows = visibleSkills().map((skill) => {
        const added = state.attachments.some((att) => att.key === 'skill:' + skill.id);
        const status = skillPathText(skill) + ' · v' + skill.version;
        return '<button type="button" class="sub-row' + (added ? ' is-added' : '') + '" data-pick-skill="' + skill.id + '" data-name="' + esc((skill.name + skill.desc + status).toLowerCase()) + '">' +
          '<span class="sub-ico">' + icon('sparkles') + '</span>' +
          '<span class="sub-copy"><b>' + esc(skill.name) + '</b><small>' + esc(skill.desc || status) + '</small></span>' +
          levelBadge(skill.level) +
        '</button>';
      }).join('');
      dom.submenu.innerHTML =
        '<div class="sub-head"><b>技能</b><small>按密级展示</small></div>' +
        '<label class="sub-search">' + icon('search') + '<input type="search" id="sub-skills-search" placeholder="搜索技能" spellcheck="false"></label>' +
        '<div class="sub-list" id="sub-skills-list">' + (rows || '<div class="sub-empty">没有匹配的技能</div>') + '</div>' +
        '<div class="sub-foot">' +
          '<button type="button" data-sub-action="add-local-skill">' + icon('upload') + '从本地添加技能</button>' +
          '<button type="button" data-sub-action="manage-skills">' + icon('settings') + '管理技能</button>' +
        '</div>';
      const input = $('#sub-skills-search');
      if (input) {
        input.addEventListener('input', () => {
          const query = input.value.trim().toLowerCase();
          $$('#sub-skills-list .sub-row').forEach((row) => {
            row.style.display = !query || row.dataset.name.includes(query) ? '' : 'none';
          });
        });
      }
    }
    dom.submenu.hidden = false;
    positionSubmenu(anchor);
  }

  function positionSubmenu(anchor) {
    const rect = anchor.getBoundingClientRect();
    const menuRect = dom.plus && !dom.plus.hidden ? dom.plus.getBoundingClientRect() : rect;
    const width = dom.submenu.offsetWidth;
    const height = dom.submenu.offsetHeight;
    let left = Math.max(rect.right, menuRect.right) + 8;
    if (left + width > window.innerWidth - 12) left = Math.max(12, Math.min(rect.left, menuRect.left) - width - 8);
    let top = rect.top - 10;
    if (top + height > window.innerHeight - 12) top = window.innerHeight - height - 12;
    if (top < 12) top = 12;
    dom.submenu.style.left = left + 'px';
    dom.submenu.style.top = top + 'px';
  }

  function hideSubmenu() {
    state.submenuKind = null;
    state.submenuAnchor = null;
    if (dom.submenu) dom.submenu.hidden = true;
    $$('.plus-item').forEach((item) => item.classList.remove('is-hot'));
  }

  function scheduleHideSubmenu() {
    clearTimeout(submenuTimer);
    submenuTimer = setTimeout(() => {
      if (!dom.submenu.matches(':hover')) hideSubmenu();
    }, 260);
  }

  /* ------------------------------ 模型选择 ------------------------------ */
  function syncComposerModel() {
    const model = DB.models.find((item) => item.id === state.modelId) || DB.models[0];
    if (!model) return;
    dom.modelName.textContent = model.name;
    dom.modelCtx.textContent = model.context;
  }
  function placeModelMenu() {
    if (!dom.modelMenu || dom.modelMenu.hidden) return;
    const btn = dom.modelBtn.getBoundingClientRect();
    const gap = 6;
    const edge = 8;
    const width = Math.min(308, window.innerWidth - edge * 2);
    dom.modelMenu.style.width = width + 'px';
    // 水平方向：右边缘与模型按钮对齐，并限制在视口内
    let left = btn.right - width;
    left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
    dom.modelMenu.style.left = left + 'px';
    // 垂直方向：按钮下方装得下就向下展开，装不下才翻到上方
    const height = dom.modelMenu.offsetHeight;
    const spaceBelow = window.innerHeight - btn.bottom - gap - edge;
    const spaceAbove = btn.top - gap - edge;
    const down = height <= spaceBelow + 32 || spaceBelow >= spaceAbove;
    const room = Math.max(160, down ? spaceBelow : spaceAbove);
    dom.modelMenu.style.maxHeight = room + 'px';
    let top = down ? btn.bottom + gap : btn.top - gap - Math.min(height, room);
    top = Math.max(edge, Math.min(top, window.innerHeight - Math.min(height, room) - edge));
    dom.modelMenu.style.top = top + 'px';
    dom.modelMenu.style.transformOrigin = down ? 'top right' : 'bottom right';
    dom.modelMenu.style.animationName = down ? 'popIn' : 'popInUp';
  }
  function toggleModelMenu() {
    if (!dom.modelMenu.hidden) { hideModelMenu(); return; }
    hidePermissionMenu();
    const models = DB.models.filter((model) => Store.canSee(state.user.level, model.level) && model.status === '启用');
    dom.modelMenu.innerHTML = '<div class="model-menu-head"><b>选择模型</b><span class="lvl" style="color:#2f6fed;background:#eaf1fe">按密级过滤</span></div>' +
      models.map((model) =>
        '<button type="button" class="model-option' + (model.id === state.modelId ? ' is-active' : '') + '" data-model-id="' + model.id + '">' +
          '<span class="model-spark">' + icon('sparkles') + '</span>' +
          '<span class="model-option-copy"><b>' + esc(model.name) + '</b><small>' + esc(model.desc) + ' · ' + esc(model.provider) + '</small></span>' +
          levelBadge(model.level) + icon('check', 'check') +
        '</button>'
      ).join('') +
      '<div class="model-menu-foot">模型可用范围由管理端「模型管理」统一配置</div>';
    dom.modelMenu.hidden = false;
    dom.modelBtn.classList.add('is-open');
    dom.modelBtn.setAttribute('aria-expanded', 'true');
    placeModelMenu();
  }
  function hideModelMenu() {
    if (!dom.modelMenu) return;
    dom.modelMenu.hidden = true;
    dom.modelMenu.removeAttribute('style');
    dom.modelBtn.classList.remove('is-open');
    dom.modelBtn.setAttribute('aria-expanded', 'false');
  }

  /* ------------------------------ 工作目录 ------------------------------ */
  function workspaceName(id) {
    const ws = state.workspaces.find((item) => item.id === id);
    if (ws) return ws.name;
    return id && id !== DEFAULT_WORKSPACE ? String(id).split('/').pop() : '默认工作区';
  }
  function workspaceOf(session) {
    return (session && session.workspace) || DEFAULT_WORKSPACE;
  }
  function syncWorkspaceBtn() {
    if (!dom.workspaceBtn) return;
    dom.workspaceName.textContent = workspaceName(state.workspace);
    dom.workspaceBtn.title = state.workspace === DEFAULT_WORKSPACE
      ? '工作目录：默认工作区（未选择目录时使用）'
      : '工作目录：' + state.workspace;
  }
  function renderWorkspaceMenu() {
    dom.workspaceMenu.innerHTML = '<div class="model-menu-head"><b>工作目录</b><span>新会话在该目录下进行</span></div>' +
      state.workspaces.map((ws) => {
        const count = state.sessions.filter((session) => workspaceOf(session) === ws.id).length;
        return '<button type="button" class="workspace-option' + (ws.id === state.workspace ? ' is-active' : '') + '" data-workspace="' + esc(ws.id) + '">' +
          '<span class="workspace-ico">' + icon('folder') + '</span>' +
          '<span class="workspace-option-copy"><b>' + esc(ws.name) + '</b><small>' + esc(ws.note || '本地目录') + (count ? ' · ' + count + ' 个会话' : '') + '</small></span>' +
          icon('check', 'check') +
        '</button>';
      }).join('') +
      '<button type="button" class="workspace-option" data-workspace-pick="1">' +
        '<span class="workspace-ico">' + icon('folder-plus') + '</span>' +
        '<span class="workspace-option-copy"><b>选择本地目录…</b><small>指定后新会话将在该目录中读写文件</small></span>' +
      '</button>' +
      '<div class="model-menu-foot">未选择目录时，文件读写发生在默认工作区</div>';
  }
  function placeWorkspaceMenu() {
    const btn = dom.workspaceBtn.getBoundingClientRect();
    const menu = dom.workspaceMenu;
    const gap = 10;
    const edge = 12;
    const width = Math.min(322, window.innerWidth - edge * 2);
    menu.style.width = width + 'px';
    menu.style.left = Math.max(edge, Math.min(btn.left, window.innerWidth - width - edge)) + 'px';
    const height = menu.offsetHeight;
    const spaceAbove = btn.top - edge;
    if (height > spaceAbove && btn.bottom + gap + height <= window.innerHeight - edge) {
      menu.style.top = (btn.bottom + gap) + 'px';
      return;
    }
    menu.style.top = Math.max(edge, btn.top - gap - height) + 'px';
  }
  function toggleWorkspaceMenu() {
    if (!dom.workspaceMenu.hidden) { hideWorkspaceMenu(); return; }
    hidePermissionMenu();
    renderWorkspaceMenu();
    dom.workspaceMenu.hidden = false;
    dom.workspaceBtn.classList.add('is-open');
    dom.workspaceBtn.setAttribute('aria-expanded', 'true');
    placeWorkspaceMenu();
  }
  function hideWorkspaceMenu() {
    if (!dom.workspaceMenu) return;
    dom.workspaceMenu.hidden = true;
    dom.workspaceMenu.removeAttribute('style');
    dom.workspaceBtn.classList.remove('is-open');
    dom.workspaceBtn.setAttribute('aria-expanded', 'false');
  }
  /* ------------------------------ 文件权限 ------------------------------ */
  function permissionOf(id) {
    return PERMISSIONS.find((item) => item.id === id) || PERMISSIONS[1];
  }
  function syncPermissionBtn() {
    if (!dom.permissionBtn) return;
    const permission = permissionOf(state.permission);
    dom.permissionName.textContent = permission.name;
    dom.permissionIco.innerHTML = icon(permission.icon);
    dom.permissionBtn.dataset.permission = permission.id;
    const tip = '文件权限：' + permission.name + ' · ' + permission.desc;
    dom.permissionBtn.setAttribute('title', tip);
    dom.permissionBtn.setAttribute('aria-label', tip);
  }
  function renderPermissionMenu() {
    const active = permissionOf(state.permission);
    dom.permissionMenu.innerHTML =
      '<div class="permission-menu-head"><b>文件权限</b><small>仅对本次会话生效</small></div>' +
      PERMISSIONS.map((permission) =>
        '<button type="button" class="permission-option' + (permission.id === active.id ? ' is-active' : '') + '" data-permission="' + permission.id + '" role="menuitemradio" aria-checked="' + (permission.id === active.id) + '">' +
          '<span class="permission-ico">' + icon(permission.icon) + '</span>' +
          '<span class="permission-copy"><b>' + esc(permission.name) + '</b><small>' + esc(permission.desc) + '</small></span>' +
          icon('check', 'check') +
        '</button>'
      ).join('') +
      '<div class="permission-note">' + icon('folder') + '当前工作目录：' + esc(workspaceName(state.workspace)) + '</div>';
  }
  function placePermissionMenu() {
    placeAnchoredMenu(dom.permissionMenu, dom.permissionBtn, 316);
  }
  function openPermissionMenu() {
    if (!dom.permissionMenu || !dom.permissionMenu.hidden || dom.composer.hidden) return;
    togglePermissionMenu();
  }
  function togglePermissionMenu() {
    if (!dom.permissionMenu.hidden) { hidePermissionMenu(); return; }
    hideModelMenu();
    hideWorkspaceMenu();
    closePlus();
    renderPermissionMenu();
    dom.permissionMenu.hidden = false;
    placePermissionMenu();
    dom.permissionBtn.classList.add('is-open');
    dom.permissionBtn.setAttribute('aria-expanded', 'true');
  }
  function hidePermissionMenu() {
    if (!dom.permissionMenu) return;
    dom.permissionMenu.hidden = true;
    dom.permissionMenu.removeAttribute('style');
    dom.permissionBtn.classList.remove('is-open');
    dom.permissionBtn.setAttribute('aria-expanded', 'false');
  }
  function selectPermission(id) {
    const permission = permissionOf(id);
    state.permission = permission.id;
    syncPermissionBtn();
    hidePermissionMenu();
    toast('已切换文件权限：' + permission.name + ' · ' + permission.desc);
  }

  function toggleSessionSearch() {
    const box = $('#ws-search');
    if (!box) return;
    const open = box.hidden;
    box.hidden = !open;
    if (open) {
      setTimeout(() => { const input = $('#ws-search-input'); if (input) input.focus(); }, 40);
    } else {
      state.sessionQuery = '';
      const input = $('#ws-search-input');
      if (input) input.value = '';
      renderRecent();
    }
  }
  function toggleRecentSort() {
    state.recentSort = state.recentSort === 'name' ? 'recent' : 'name';
    renderRecent();
    toast(state.recentSort === 'name' ? '工作区按名称排序' : '工作区按最近活动排序');
  }

  function selectWorkspace(id) {
    state.workspace = id || DEFAULT_WORKSPACE;
    syncWorkspaceBtn();
    hideWorkspaceMenu();
  }
  function pickWorkspaceDir() {
    hideWorkspaceMenu();
    if (!dom.workspaceDirInput) return;
    dom.workspaceDirInput.value = '';
    dom.workspaceDirInput.click();
  }
  function handleWorkspaceDirChange() {
    const files = dom.workspaceDirInput.files;
    if (!files || !files.length) return;
    const relative = files[0].webkitRelativePath || '';
    const root = (relative.split('/')[0] || '已选目录').trim();
    const id = 'dir:' + root;
    if (!state.workspaces.some((item) => item.id === id)) {
      state.workspaces.push({ id: id, name: root, note: '本地目录', manual: true });
    }
    selectWorkspace(id);
    toast('工作目录已设置为「' + root + '」');
  }

  /* ------------------------------ 会话 ------------------------------ */
  function relativeTime(at) {
    if (!at) return '';
    const diff = Date.now() - at;
    if (diff < 60 * 1000) return '刚刚';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return minutes + '分钟';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '小时';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + '天';
    return Math.floor(days / 30) + '个月';
  }

  const RECENT_PREVIEW = 5;

  function sessionTimeText(session) {
    return session.at ? relativeTime(session.at) : String(session.when || '').replace(/^(今天|昨天)\s*/, '');
  }

  function lastActivity(list) {
    return list.reduce((max, session) => Math.max(max, session.at || 0), 0);
  }

  function renderRecent() {
    if (!dom.recent) return;
    const query = state.sessionQuery.trim().toLowerCase();
    const groups = new Map();
    state.workspaces.forEach((ws) => groups.set(ws.id, []));
    state.sessions.forEach((session) => {
      const key = workspaceOf(session);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(session);
    });
    groups.forEach((list) => list.sort((a, b) => (b.at || 0) - (a.at || 0)));
    let order = Array.from(groups.keys());
    if (state.recentSort === 'name') {
      order.sort((a, b) => workspaceName(a).localeCompare(workspaceName(b), 'zh-Hans-CN'));
    } else {
      order.sort((a, b) => lastActivity(groups.get(b)) - lastActivity(groups.get(a)) || workspaceName(a).localeCompare(workspaceName(b), 'zh-Hans-CN'));
    }
    const html = order.map((key) => {
      const all = groups.get(key) || [];
      const meta = state.workspaces.find((ws) => ws.id === key);
      if (!all.length && !(meta && meta.manual)) return '';
      const list = query ? all.filter((session) => session.title.toLowerCase().includes(query)) : all;
      if (query && !list.length) return '';
      const collapsed = !query && state.wsCollapsed.has(key);
      const expanded = state.wsExpanded.has(key) || !!query;
      const visible = expanded ? list : list.slice(0, RECENT_PREVIEW);
      const hidden = list.length - visible.length;
      const isActiveGroup = list.some((session) => session.id === state.currentSessionId);
      const head = '<button type="button" class="ws-head' + (isActiveGroup ? ' is-active' : '') + '" data-ws-toggle="' + esc(key) + '" aria-expanded="' + (collapsed ? 'false' : 'true') + '">' +
        '<svg class="icon ws-chev"><use href="#i-chevron-down"/></svg>' +
        icon('folder', 'ws-folder') +
        '<span class="ws-name">' + esc(key === DEFAULT_WORKSPACE ? '默认工作区' : workspaceName(key)) + '</span>' +
        (all.length ? '<span class="ws-count">' + all.length + '</span>' : '') +
      '</button>';
      const sessions = collapsed ? '' : visible.map((session) =>
        '<button type="button" class="ws-session' + (state.currentSessionId === session.id ? ' is-active' : '') + '" data-session="' + session.id + '" title="' + esc(session.title) + '">' +
          '<span class="ws-session-title">' + esc(session.title) + '</span>' +
          '<span class="ws-session-time">' + esc(sessionTimeText(session)) + '</span>' +
        '</button>'
      ).join('');
      const more = collapsed ? '' : (hidden > 0
        ? '<button type="button" class="ws-more" data-ws-more="' + esc(key) + '">展开其余 ' + hidden + ' 个会话</button>'
        : (expanded && all.length > RECENT_PREVIEW && !query
          ? '<button type="button" class="ws-more" data-ws-more="' + esc(key) + '">收起</button>'
          : ''));
      const empty = !collapsed && !list.length && !query ? '<p class="ws-empty">暂无会话</p>' : '';
      return '<div class="ws-group' + (collapsed ? ' is-collapsed' : '') + '">' + head +
        '<div class="ws-sessions">' + sessions + more + empty + '</div>' +
      '</div>';
    }).join('');
    dom.recent.innerHTML = html || '<p class="recent-empty">' + (query ? '没有匹配的会话。' : '还没有会话，输入第一句话开始。') + '</p>';
  }

  function newChat() {
    state.currentSessionId = null;
    state.agent = 'general';
    state.permission = DEFAULT_PERMISSION;
    clearFlowTimer();
    state.docPanelClosed = null;
    hideDocPanel();
    syncPermissionBtn();
    clearComposer();
    renderChips();
    navigate('home');
    setTimeout(() => dom.prompt.focus(), 40);
  }

  function openSession(id) {
    const session = state.sessions.find((item) => item.id === id);
    if (!session) return;
    state.currentSessionId = session.id;
    state.agent = session.agent;
    state.attachments = [];
    state.workspace = workspaceOf(session);
    state.permission = session.permission || DEFAULT_PERMISSION;
    state.wsCollapsed.delete(state.workspace);
    syncWorkspaceBtn();
    syncPermissionBtn();
    navigate('chat');
    renderRecent();
    updateTopbar();
  }

  function sendMessage() {
    if (!state.user) return;
    const text = dom.prompt.value.trim();
    if (!text && !state.attachments.length) {
      dom.composer.style.animation = 'none';
      void dom.composer.offsetWidth;
      dom.composer.style.animation = 'shake 0.28s ease';
      toast('请输入工作内容，或先添加文件与知识库');
      dom.prompt.focus();
      return;
    }
    const attachments = state.attachments.slice();
    const first = attachments[0];
    const wantsReturnForm = /填写退库申请单/.test(text.replace(/\s/g, ''));
    const titleSource = wantsReturnForm ? '填写退库申请单' : (text || (first ? '关于「' + first.name + '」的工作' : '新会话'));
    const title = titleSource.length > 26 ? titleSource.slice(0, 26) + '…' : titleSource;
    const session = {
      id: 's-' + Date.now(),
      title: title,
      agent: state.agent,
      workspace: state.workspace,
      permission: state.permission,
      at: Date.now(),
      when: '今天 ' + nowTime(),
      question: text || '请根据我添加的内容开始工作。',
      attachments: attachments,
      typing: true
    };
    if (wantsReturnForm) session.flow = buildReturnFlow();
    state.sessions.unshift(session);
    state.currentSessionId = session.id;
    state.docPanelClosed = null;
    state.wsCollapsed.delete(state.workspace);
    clearComposer();
    renderRecent();
    navigate('chat');
    scrollChatToBottom();
    setTimeout(() => {
      session.typing = false;
      renderChat();
      if (session.flow) syncDocPanel();
      scrollChatToBottom();
    }, session.flow ? 1150 : 950);
  }

  function scrollChatToBottom() {
    const scroller = $('#chat-scroll');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  function staticChips(attachments) {
    if (!attachments || !attachments.length) return '';
    return '<div class="msg-attachments">' + attachments.map((item) =>
      '<span class="chip"><span class="chip-type">' + chipIcon(item.kind) + '</span><span class="chip-name">' + esc(item.name) + '</span></span>'
    ).join('') + '</div>';
  }

  function processHtml(session) {
    const attachments = session.attachments || [];
    const kbItems = attachments.filter((item) => ['kb', 'folder', 'doc'].includes(item.kind));
    const skills = attachments.filter((item) => item.kind === 'skill');
    const steps = [];
    if (attachments.length) steps.push('读取 <b>' + attachments.length + ' 项</b>引用内容');
    if (kbItems.length) steps.push('检索知识库：<b>' + esc(kbItems.map((item) => item.name).join('、').slice(0, 54)) + '</b>');
    if (skills.length) steps.push('调用技能：<b>' + esc(skills.map((item) => item.name).join('、')) + '</b>');
    const permission = permissionOf(session.permission || DEFAULT_PERMISSION);
    steps.push('以 <b>' + esc(permission.name) + '</b> 权限执行');
    steps.push('生成结构化答复并校验数据密级');
    return '<div class="process-card">' +
      '<div class="process-head">' + icon('check-circle') + '已完成 ' + steps.length + ' 个步骤<span class="process-time">用时 2.8s</span></div>' +
      '<ul class="process-steps">' + steps.map((step) => '<li><span class="step-dot"></span>' + step + '</li>').join('') + '</ul>' +
    '</div>';
  }

  function citationsHtml(session) {
    const attachments = (session.attachments || []).filter((item) => ['kb', 'folder', 'doc', 'template'].includes(item.kind));
    const items = attachments.length ? attachments : [
      { name: '质量手册（2026 版）.pdf' }, { name: 'ISO 9001 内审检查表.xlsx' }
    ];
    return '<div class="cite-line">引用来源' + items.slice(0, 4).map((item) =>
      '<button type="button" class="cite-chip" data-cite="' + esc(item.name) + '">' + icon('file') + esc(item.name) + '</button>'
    ).join('') + '</div>';
  }

  function buildAnswer(session) {
    const agent = agentOf(session.agent);
    const names = (session.attachments || []).map((item) => item.name);
    const source = names.length ? '《' + names.join('》《') + '》' : '企业知识库中的相关制度与模板';
    if (agent.id === 'quality') {
      return '<h3>8D 根因分析与纠正措施</h3>' +
        '<p>已结合 ' + esc(source) + ' 完成梳理。当前问题集中在<strong>壳体裂纹批次一致性</strong>，建议按以下结构汇报：</p>' +
        '<h4>一、问题描述</h4>' +
        '<p>2026 年 11 月批次抽检发现壳体接缝处出现细微裂纹，累计 3 件，初步判断与注塑参数波动和来料含水率有关。</p>' +
        '<h4>二、根因分析（5 Why）</h4>' +
        '<table><thead><tr><th>层级</th><th>分析结论</th><th>证据</th></tr></thead><tbody>' +
        '<tr><td>Why 1</td><td>壳体接缝强度不足</td><td>拉力测试低于标准 12%</td></tr>' +
        '<tr><td>Why 2</td><td>注塑保压时间偏短</td><td>设备参数记录 11 月 3 日有调整</td></tr>' +
        '<tr><td>Why 3</td><td>换模后未执行首件确认</td><td>当班首件检验记录缺失</td></tr>' +
        '<tr><td>Why 4</td><td>换模作业指导书缺少参数复核项</td><td>WI-07 第 4.2 节</td></tr>' +
        '</tbody></table>' +
        '<h4>三、纠正措施</h4>' +
        '<ol><li>立即对在制品与库存壳体进行 100% 外观与拉力复检，隔离风险批次。</li>' +
        '<li>修订换模作业指导书，增加保压时间、料筒温度的双人复核与首件确认。</li>' +
        '<li>将含水率检测纳入来料检验必检项，连续监控 3 个批次。</li>' +
        '<li>在质量例会上跟踪措施有效性，两周后关闭 8D。</li></ol>' +
        '<div class="callout">知识库中《ISO 9001 内审检查表.xlsx》尚未完成智能治理，建议先治理后再作为正式审核依据引用。</div>' +
        citationsHtml(session);
    }
    if (agent.id === 'security') {
      return '<h3>保密合规自查结论</h3>' +
        '<p>基于 ' + esc(source) + ' 对文档发布流程进行了检查，整体符合制度要求，有 3 个风险点需要关注：</p>' +
        '<h4>检查结果</h4>' +
        '<table><thead><tr><th>检查项</th><th>结论</th><th>建议</th></tr></thead><tbody>' +
        '<tr><td>文档密级标注</td><td>符合</td><td>保持创建时自动继承知识库密级</td></tr>' +
        '<tr><td>访问范围控制</td><td>基本符合</td><td>清理 2 个跨部门临时授权</td></tr>' +
        '<tr><td>涉密载体登记</td><td>待完善</td><td>补录 11 月外发文件登记记录</td></tr>' +
        '<tr><td>水印与下载审计</td><td>符合</td><td>继续保留下载二次确认</td></tr>' +
        '</tbody></table>' +
        '<h4>建议动作</h4>' +
        '<ol><li>本周内完成涉密载体登记补录，并核对借阅归还记录。</li>' +
        '<li>对机密级及以上文档开启“禁止截屏 + 动态水印”。</li>' +
        '<li>将本次自查结果归档到保密制度知识库的「自查与整改」目录。</li></ol>' +
        '<div class="callout">注意：当前账号为秘密级，机密及绝密内容未参与本次分析，结论仅覆盖秘密级及以下资料。</div>' +
        citationsHtml(session);
    }
    if (agent.id === 'product') {
      return '<h3>需求拆解与验收标准</h3>' +
        '<p>已将 ' + esc(source) + ' 中的核心诉求拆解为 3 个用户故事，建议按优先级迭代：</p>' +
        '<h4>用户故事</h4>' +
        '<table><thead><tr><th>优先级</th><th>用户故事</th><th>验收标准</th></tr></thead><tbody>' +
        '<tr><td>P0</td><td>作为员工，我可以在输入框中选择知识库目录或文档作为上下文</td><td>支持目录/文档多选；密级不足内容不可见；选择后以可移除标签展示</td></tr>' +
        '<tr><td>P0</td><td>作为知识库管理员，我可以对文档执行智能治理</td><td>治理后状态变为已治理；治理记录可审计；失败可重试</td></tr>' +
        '<tr><td>P1</td><td>作为新员工，我可以直接使用标准文档模板开始工作</td><td>模板按目录展示；支持预览；使用后自动带入对话</td></tr>' +
        '</tbody></table>' +
        '<h4>设计约束</h4>' +
        '<ul><li>所有选择器必须按账号密级过滤，前端不展示越权数据。</li>' +
        '<li>输入框中的引用项支持悬停显示移除按钮，键盘可操作。</li>' +
        '<li>模板与知识库统一走管理端配置，客户端只读消费。</li></ul>' +
        '<div class="callout">建议补充“空状态”和“密级不足”两种异常路径的原型，避免用户误以为数据丢失。</div>' +
        citationsHtml(session);
    }
    return '<h3>会议纪要与待办</h3>' +
      '<p>已根据 ' + esc(source) + ' 整理出可直接发送的会议纪要：</p>' +
      '<h4>一、会议结论</h4>' +
      '<ul><li>确认 UWork 客户端 1.5 版本于 11 月 28 日进入灰度，先覆盖质量管理部与产品研发部。</li>' +
      '<li>知识库与文档模板的密级沿用管理端配置，客户端只做展示与过滤。</li>' +
      '<li>灰度期间每周五收集一次使用反馈，由产品研发部统一汇总。</li></ul>' +
      '<h4>二、待办事项</h4>' +
      '<table><thead><tr><th>事项</th><th>负责人</th><th>截止时间</th></tr></thead><tbody>' +
      '<tr><td>完成质量体系知识库文档治理</td><td>张明</td><td>11 月 25 日</td></tr>' +
      '<tr><td>补充三个专业智能体的示例问答</td><td>李思</td><td>11 月 26 日</td></tr>' +
      '<tr><td>输出灰度用户操作手册</td><td>赵琳</td><td>11 月 27 日</td></tr>' +
      '</tbody></table>' +
      '<div class="callout">如需正式发文，可搭配「公文写作」技能与行政办公模板，一键生成红头文件格式。</div>' +
      citationsHtml(session);
  }

  function renderChat() {
    const session = currentSession();
    const inner = $('#chat-inner');
    if (!session || !inner) { if (inner) inner.innerHTML = ''; return; }
    if (session.flow) {
      inner.innerHTML = flowChatHtml(session);
      updateTopbar();
      renderRecent();
      return;
    }
    const agent = agentOf(session.agent);
    const typing = session.typing;
    inner.innerHTML =
      '<div class="chat-date">' + esc(session.when || '今天') + '</div>' +
      '<div class="msg msg-user"><div class="bubble"><p>' + esc(session.question) + '</p>' + staticChips(session.attachments) + '</div></div>' +
      '<div class="msg"><span class="msg-avatar"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="url(#uwork-grad)"/><path d="M13 10v11a7 7 0 0014 0V10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="30.5" cy="10.5" r="2.2" fill="#a9e4ff"/></svg></span>' +
        '<div class="msg-body">' +
          '<div class="msg-head"><b>' + agent.name + '智能体</b><span class="model-tag">' + esc((DB.models.find((model) => model.id === state.modelId) || {}).name || 'UWork-1.5-Pro') + '</span><span class="time">' + esc(nowTime()) + '</span></div>' +
          (typing
            ? '<div class="typing" aria-label="正在生成"><span></span><span></span><span></span></div>'
            : processHtml(session) + '<div class="answer">' + buildAnswer(session) +
              '<div class="answer-actions">' +
                '<button type="button" data-action="copy-answer">' + icon('file') + '复制</button>' +
                '<button type="button" data-action="regen-answer">' + icon('refresh') + '重新生成</button>' +
                '<button type="button" data-action="like-answer">' + icon('check') + '有帮助</button>' +
              '</div></div>') +
        '</div>' +
      '</div>';
    updateTopbar();
    renderRecent();
  }

  /* ======================== 填写退库申请单（交互流程） ======================== */
  const RETURN_TYPE_OPTIONS = ['退货', '多余领料', '参数不匹配', '错领'];

  function returnTemplate() {
    return DB.templates.find((item) => item.form === 'return') ||
      DB.templates.find((item) => /退库申请单/.test(item.name)) || null;
  }

  function findFlowTemplate(id) {
    return DB.templates.find((item) => item.id === id) || null;
  }

  function templateForFlow(flow) {
    return findFlowTemplate(flow.templateId) || returnTemplate();
  }

  function flowIsReturn(flow) {
    return flow.form === 'return';
  }

  function buildReturnFlow() {
    const tpl = returnTemplate();
    return {
      kind: 'return-form',
      stage: 'template',
      templateId: tpl ? tpl.id : 't14',
      templateName: tpl ? tpl.name : 'QR-8.6-12 A/0-退库申请单.docx',
      form: 'return',
      source: 'library',
      draft: {},
      values: null
    };
  }

  function clearFlowTimer() {
    if (state.flowTimer) {
      clearTimeout(state.flowTimer);
      state.flowTimer = null;
    }
  }

  function flowFieldSchema(flow) {
    if (flowIsReturn(flow)) {
      return [
        { name: 'taskNo', label: '任务单号', required: true, placeholder: '例如：TK-2026-1124-018' },
        { name: 'model', label: '产品型号', required: true, placeholder: '例如：UW-QM-2401 壳体组件' },
        { name: 'qty', label: '数量', required: true, type: 'number', placeholder: '例如：12' },
        { name: 'batch', label: '产品批次号', required: true, placeholder: '例如：B20261118-03' },
        { name: 'reason', label: '申请原因、内容说明', required: true, type: 'textarea', wide: true, placeholder: '说明退库原因、发现的问题与处理诉求' }
      ];
    }
    return [
      { name: 'subject', label: '文件主题', required: true, wide: true, placeholder: '例如：11 月质量例会会议纪要' },
      { name: 'content', label: '主要内容', required: true, type: 'textarea', wide: true, placeholder: '描述需要写入文档的主要内容' },
      { name: 'note', label: '补充说明', type: 'textarea', wide: true, placeholder: '可选，例如需要重点提示的事项' }
    ];
  }

  function flowAutoFields(flow) {
    const base = [
      { label: '所属部门', value: state.user.dept },
      { label: flowIsReturn(flow) ? '申请人' : '填写人', value: state.user.name },
      { label: '日期', value: today() }
    ];
    if (flowIsReturn(flow)) base.push({ label: '退库类型', value: '退货' });
    return base;
  }

  function flowSampleValues(flow) {
    if (flowIsReturn(flow)) {
      return {
        taskNo: 'TK-2026-1124-018',
        model: 'UW-QM-2401 壳体组件',
        qty: '12',
        batch: 'B20261118-03',
        reason: '装配过程中发现 12 件壳体接缝处存在轻微裂纹，经复检判定为来料批次一致性波动，现退回库房并申请换料。'
      };
    }
    return {
      subject: '11 月质量例会会议纪要',
      content: '会议确认壳体裂纹批次完成 100% 复检，修订换模作业指导书并增加首件确认，相关措施于 11 月 28 日前闭环。',
      note: ''
    };
  }

  function flowAvatar() {
    return '<span class="msg-avatar"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="url(#uwork-grad)"/><path d="M13 10v11a7 7 0 0014 0V10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="30.5" cy="10.5" r="2.2" fill="#a9e4ff"/></svg></span>';
  }

  function flowModelName() {
    return esc((DB.models.find((model) => model.id === state.modelId) || {}).name || 'UWork-1.5-Pro');
  }

  function flowMessage(agent, body) {
    return '<div class="msg">' + flowAvatar() +
      '<div class="msg-body">' +
        '<div class="msg-head"><b>' + esc(agent.name) + '智能体</b><span class="model-tag">' + flowModelName() + '</span><span class="time">' + esc(nowTime()) + '</span></div>' +
        body +
      '</div>' +
    '</div>';
  }

  function flowTyping() {
    return '<div class="typing" aria-label="正在生成"><span></span><span></span><span></span></div>';
  }

  function flowProcessCard(steps, time) {
    return '<div class="process-card">' +
      '<div class="process-head">' + icon('check-circle') + '已完成 ' + steps.length + ' 个步骤<span class="process-time">用时 ' + (time || '1.6s') + '</span></div>' +
      '<ul class="process-steps">' + steps.map((step) => '<li><span class="step-dot"></span>' + step + '</li>').join('') + '</ul>' +
    '</div>';
  }

  function flowTemplateCard(flow) {
    const tpl = templateForFlow(flow);
    const path = tpl ? Store.folderTrail(DB.templateFolders, tpl.folder).map((folder) => folder.name).join(' / ') : '质量管理 / 质量记录';
    return '<div class="flow-tpl-card">' +
      '<span class="flow-tpl-ico">' + icon('file') + '</span>' +
      '<span class="flow-tpl-copy"><b>' + esc(flow.templateName) + '</b><small>' + esc(path || '文档模板') +
        (tpl ? ' · ' + esc(tpl.size) + ' · ' + esc(tpl.owner) + ' 更新于 ' + esc(tpl.updated) : '') + '</small></span>' +
      (tpl ? levelBadge(tpl.level) : '') +
    '</div>';
  }

  function flowResumeButton(flow) {
    return '<button type="button" class="flow-resume" data-action="docflow-resume">' +
      icon(flow.stage === 'template' ? 'file' : 'clipboard') +
      (flow.stage === 'template' ? '打开模板选择' : '继续补充字段') +
    '</button>';
  }

  function flowCnDate(value) {
    const parts = String(value || '').split('-');
    if (parts.length === 3) return parts[0] + ' 年 ' + Number(parts[1]) + ' 月 ' + Number(parts[2]) + ' 日';
    return value || '';
  }

  function flowReturnSheet(flow) {
    const v = flow.values || {};
    const type = v.retType || '退货';
    return '<div class="form-sheet">' +
      '<div class="form-sheet-head"><div><b>退库申请单</b><small>RETURN APPLICATION FORM</small></div><span>编号：QR-8.6-12 A/0</span></div>' +
      '<table class="form-sheet-table">' +
        '<tr><th>申请部门</th><td>' + esc(v.dept || state.user.dept) + '</td><th>申请人</th><td>' + esc(v.applicant || state.user.name) + '</td><th>申请日期</th><td>' + esc(v.date || today()) + '</td></tr>' +
        '<tr><th>任务单号</th><td>' + esc(v.taskNo || '—') + '</td><th>产品型号</th><td>' + esc(v.model || '—') + '</td><th>数量</th><td>' + esc(v.qty || '—') + '</td></tr>' +
        '<tr><th>产品批次号</th><td>' + esc(v.batch || '—') + '</td><th>退库类型</th><td colspan="3"><span class="sheet-type">' +
          RETURN_TYPE_OPTIONS.map((item) => (item === type ? '☑ ' : '☐ ') + item).join('　') + '</span></td></tr>' +
        '<tr><th colspan="6" class="is-section">申请原因、内容说明</th></tr>' +
        '<tr><td colspan="6" class="sheet-reason">' + esc(v.reason || '—') + '</td></tr>' +
        '<tr><td colspan="6" class="sheet-line">申请人：' + esc(v.applicant || state.user.name) + '　　日期：' + flowCnDate(v.date || today()) + '</td></tr>' +
        '<tr><td colspan="6" class="sheet-line is-section-row">质量部检验</td></tr>' +
        '<tr><td colspan="6" class="sheet-line">质检员：______________　　日期：　　　年　　月　　日</td></tr>' +
        '<tr><td colspan="6" class="sheet-line is-section-row">申请部门部长审批</td></tr>' +
        '<tr><td colspan="6" class="sheet-line">批准人：______________　　日期：　　　年　　月　　日</td></tr>' +
        '<tr><td colspan="3" class="sheet-sign">申请人 / 交接人：' + esc(v.applicant || state.user.name) + '</td><td colspan="3" class="sheet-sign">库房管理员 / 接收人：______________</td></tr>' +
      '</table>' +
    '</div>';
  }

  function blankReturnSheet() {
    return '<div class="form-sheet is-blank">' +
      '<div class="form-sheet-head"><div><b>退库申请单</b><small>RETURN APPLICATION FORM</small></div><span>编号：QR-8.6-12 A/0</span></div>' +
      '<table class="form-sheet-table">' +
        '<tr><th>申请部门</th><td></td><th>申请人</th><td></td><th>申请日期</th><td></td></tr>' +
        '<tr><th>任务单号</th><td></td><th>产品型号</th><td></td><th>数量</th><td></td></tr>' +
        '<tr><th>产品批次号</th><td></td><th>退库类型</th><td colspan="3"><span class="sheet-type">' +
          RETURN_TYPE_OPTIONS.map((item) => '☐ ' + item).join('　') + '</span></td></tr>' +
        '<tr><th colspan="6" class="is-section">申请原因、内容说明</th></tr>' +
        '<tr><td colspan="6" class="sheet-reason"></td></tr>' +
        '<tr><td colspan="6" class="sheet-line">申请人：　　　　　　　　日期：　　　年　　月　　日</td></tr>' +
        '<tr><td colspan="6" class="sheet-line is-section-row">质量部检验</td></tr>' +
        '<tr><td colspan="6" class="sheet-line">质检员：______________　　日期：　　　年　　月　　日</td></tr>' +
        '<tr><td colspan="6" class="sheet-line is-section-row">申请部门部长审批</td></tr>' +
        '<tr><td colspan="6" class="sheet-line">批准人：______________　　日期：　　　年　　月　　日</td></tr>' +
        '<tr><td colspan="3" class="sheet-sign">申请人 / 交接人：</td><td colspan="3" class="sheet-sign">库房管理员 / 接收人：</td></tr>' +
      '</table></div>';
  }

  function flowGenericSheet(flow) {
    const v = flow.values || {};
    return '<div class="form-sheet">' +
      '<div class="form-sheet-head"><div><b>' + esc(String(flow.templateName || '文档').replace(/\.[^.]+$/, '')) + '</b><small>DOCUMENT</small></div><span>UWork 模板生成</span></div>' +
      '<table class="form-sheet-table"><tr><th>主题</th><td colspan="5">' + esc(v.subject || '—') + '</td></tr>' +
      '<tr><th colspan="6" class="is-section">主要内容</th></tr>' +
      '<tr><td colspan="6" class="sheet-reason">' + esc(v.content || '—') + '</td></tr>' +
      (v.note ? '<tr><th colspan="6" class="is-section">补充说明</th></tr><tr><td colspan="6" class="sheet-reason">' + esc(v.note) + '</td></tr>' : '') +
      '<tr><td colspan="3" class="sheet-sign">填写人：' + esc(v.applicant || state.user.name) + '</td><td colspan="3" class="sheet-sign">日期：' + esc(v.date || today()) + '</td></tr>' +
      '</table></div>';
  }

  function flowSheet(flow) {
    return flowIsReturn(flow) ? flowReturnSheet(flow) : flowGenericSheet(flow);
  }

  function flowChatHtml(session) {
    const flow = session.flow;
    const agent = agentOf(session.agent);
    const panelClosed = state.docPanelClosed === session.id;
    let html = '<div class="chat-date">' + esc(session.when || '今天') + '</div>' +
      '<div class="msg msg-user"><div class="bubble"><p>' + esc(session.question) + '</p>' + staticChips(session.attachments) + '</div></div>';

    const isReturn = flowIsReturn(flow);
    const firstBody = flowProcessCard([
      '识别意图：<b>填写退库申请单</b>',
      '检索企业文档模板库',
      '匹配模板：<b>' + esc(flow.templateName) + '</b>'
    ], '1.2s') +
      '<div class="answer">' +
        '<h3>已从模板库找到匹配模板</h3>' +
        '<p>从模板库里面找到了 <strong>【' + (isReturn ? '退库申请单' : String(flow.templateName).replace(/\.[^.]+$/, '')) + '】</strong>' +
          (isReturn ? '（QR-8.6-12 A/0）' : '') + '，是否使用这个模板？</p>' +
        flowTemplateCard(flow) +
        '<p class="flow-hint">' + (flow.stage === 'template'
          ? '请在输入框上方确认模板，也可以选择其他模板后再继续。'
          : '已使用该模板，接下来会解析字段并自动填写。') + '</p>' +
        (flow.stage === 'template' && panelClosed ? flowResumeButton(flow) : '') +
      '</div>';
    html += flowMessage(agent, firstBody);

    if (flow.stage !== 'template') {
      const fields = flowFieldSchema(flow);
      const auto = flowAutoFields(flow);
      const body = flowProcessCard([
        '载入模板：<b>' + esc(flow.templateName) + '</b>',
        isReturn ? '解析模板字段：<b>9 个</b>' : '解析模板字段：<b>4 个</b>',
        '自动填写：<b>' + auto.length + ' 个</b>',
        '等待补充：<b>' + fields.filter((field) => field.required).length + ' 个</b>'
      ], '1.8s') +
        '<div class="answer">' +
          '<h3>' + (isReturn ? '已按模板自动填写申请单' : '已按模板自动填写文档') + '</h3>' +
          '<p>已使用《' + esc(flow.templateName) + '》模板，自动带入 <b>' + auto.length + '</b> 个字段：' +
            auto.map((item) => item.label).join('、') + '。</p>' +
          '<p>还有 <b>' + fields.filter((field) => field.required).length + '</b> 个字段需要补充：' +
            fields.filter((field) => field.required).map((field) => field.label).join('、') + '。' +
            (flow.stage === 'fields' ? '请在输入框上方填写。' : '') + '</p>' +
          '<div class="flow-auto-row">' + auto.map((item) =>
            '<span class="flow-auto-chip"><small>' + esc(item.label) + '</small><b>' + esc(item.value) + '</b></span>'
          ).join('') + '</div>' +
          (flow.stage === 'fields' && panelClosed ? flowResumeButton(flow) : '') +
        '</div>';
      html += flowMessage(agent, session.typing ? flowTyping() : body);
    }

    if (flow.stage === 'done') {
      const doneBody = '<div class="flow-success">' +
          '<span class="flow-success-ico">' + icon('check') + '</span>' +
          '<div><b>填写完毕</b><small>' + esc(flow.templateName) + ' 已按模板填写完成，审批签字待线下完成。</small></div>' +
        '</div>' +
        '<div class="answer">' +
          '<h3>' + (isReturn ? '退库申请单已生成' : '文档已生成') + '</h3>' +
          '<p>' + (isReturn ? '申请部门、申请人、申请日期与退库类型由智能体自动填写，其余字段已按你的补充写入模板。' : '内容已按模板结构写入，可直接下载或提交审批。') + '</p>' +
          flowSheet(flow) +
          '<div class="flow-result-actions">' +
            '<button type="button" data-action="docflow-download">' + icon('download') + '下载 Word</button>' +
            '<button type="button" data-action="docflow-print">' + icon('print') + '打印</button>' +
            '<button type="button" data-action="docflow-copy">' + icon('file') + '复制内容</button>' +
            '<button type="button" class="is-primary" data-action="docflow-submit">' + icon('check-circle') + '提交审批</button>' +
          '</div>' +
          '<div class="cite-line">引用来源<button type="button" class="cite-chip" data-cite="' + esc(flow.templateName) + '">' + icon('file') + esc(flow.templateName) + '</button></div>' +
        '</div>';
      html += flowMessage(agent, doneBody);
    }
    return html;
  }

  /* ---------------------------- 输入框上方弹层 ---------------------------- */
  function hideDocPanel() {
    if (!dom.docPanel) return;
    dom.docPanel.hidden = true;
    dom.docPanel.innerHTML = '';
    dom.docPanel.removeAttribute('style');
  }

  function placeDocPanel() {
    const panel = dom.docPanel;
    if (!panel || panel.hidden || dom.composer.hidden) return;
    const rect = dom.composer.getBoundingClientRect();
    const width = Math.min(rect.width, 560);
    const left = rect.left + Math.max(0, (rect.width - width) / 2);
    panel.style.width = width + 'px';
    panel.style.left = Math.max(12, Math.min(left, window.innerWidth - width - 12)) + 'px';
    panel.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
    panel.style.maxHeight = Math.max(200, rect.top - 24) + 'px';
  }

  function syncDocPanel() {
    const session = currentSession();
    const active = state.view === 'chat' && session && session.flow &&
      (session.flow.stage === 'template' || session.flow.stage === 'fields') &&
      !session.typing && state.docPanelClosed !== session.id;
    if (!active) { hideDocPanel(); return; }
    renderDocPanel(session);
  }

  function docPanelHead(step, title, sub) {
    return '<div class="doc-panel-head">' +
      '<span class="doc-panel-step">' + step + '</span>' +
      '<div class="doc-panel-title"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></div>' +
      '<button type="button" class="icon-btn doc-panel-close" data-action="docflow-dismiss" aria-label="收起">' + icon('x') + '</button>' +
    '</div>';
  }

  function templateStageHtml(session) {
    const flow = session.flow;
    const lib = returnTemplate();
    const libName = lib ? lib.name : 'QR-8.6-12 A/0-退库申请单.docx';
    const libPath = lib ? Store.folderTrail(DB.templateFolders, lib.folder).map((folder) => folder.name).join(' / ') : '质量管理 / 质量记录';
    const libraryActive = flow.source !== 'picked';
    const picked = !libraryActive ? (findFlowTemplate(flow.templateId) || {}) : null;
    return docPanelHead('1 / 2', '选择文档模板', 'AI 已从模板库匹配到可用模板，确认后开始填写') +
      '<div class="doc-choice">' +
        '<button type="button" class="doc-choice-item' + (libraryActive ? ' is-active' : '') + '" data-action="docflow-pick-library">' +
          '<span class="doc-choice-radio"></span>' +
          '<span class="doc-choice-ico">' + icon('file') + '</span>' +
          '<span class="doc-choice-copy"><b>' + esc(libName) + '</b><small>' + esc(libPath) + ' · 模板库匹配结果</small></span>' +
          (lib ? levelBadge(lib.level) : '') +
        '</button>' +
        '<button type="button" class="doc-choice-item is-other' + (!libraryActive ? ' is-active' : '') + '" data-action="docflow-other">' +
          '<span class="doc-choice-radio"></span>' +
          '<span class="doc-choice-ico is-other">' + icon('folder') + '</span>' +
          '<span class="doc-choice-copy"><b>' + (picked ? esc(picked.name) : '其他模板') + '</b><small>' +
            (picked ? '已从模板库重新选择 · 点击可更换' : '从企业文档模板库中选择其他模板') + '</small></span>' +
          icon('chevron-right', 'doc-choice-go') +
        '</button>' +
      '</div>' +
      '<div class="doc-panel-foot">' +
        '<span class="doc-panel-note">' + icon('info') + '确认后 AI 会解析模板字段并自动填写</span>' +
        '<div class="doc-panel-actions">' +
          '<button type="button" class="btn" data-action="docflow-dismiss">取消</button>' +
          '<button type="button" class="btn btn-primary" data-action="docflow-use">确认使用</button>' +
        '</div>' +
      '</div>';
  }

  function fieldsStageHtml(session) {
    const flow = session.flow;
    const fields = flowFieldSchema(flow);
    const auto = flowAutoFields(flow);
    const draft = flow.draft || {};
    const inputs = fields.map((field) => {
      const value = draft[field.name] || '';
      const control = field.type === 'textarea'
        ? '<textarea name="' + field.name + '" rows="2" placeholder="' + esc(field.placeholder || '') + '">' + esc(value) + '</textarea>'
        : '<input name="' + field.name + '" type="' + (field.type === 'number' ? 'number' : 'text') + '" value="' + esc(value) + '" placeholder="' + esc(field.placeholder || '') + '" spellcheck="false">';
      return '<label class="doc-field' + (field.wide ? ' is-wide' : '') + '"><span>' + esc(field.label) + (field.required ? ' <i>*</i>' : '') + '</span>' + control + '</label>';
    }).join('');
    return docPanelHead('2 / 2', flowIsReturn(flow) ? '补充退库申请单信息' : '补充文档信息',
      'AI 已填写 ' + auto.length + ' 项，还需你补充 ' + fields.filter((field) => field.required).length + ' 项') +
      '<div class="doc-auto">' +
        '<span class="doc-auto-label">' + icon('sparkles') + 'AI 已填写</span>' +
        auto.map((item) => '<span class="doc-auto-chip"><small>' + esc(item.label) + '</small><b>' + esc(item.value) + '</b></span>').join('') +
      '</div>' +
      '<div class="doc-fields" id="doc-field-form">' + inputs + '</div>' +
      '<p class="doc-panel-error" hidden></p>' +
      '<div class="doc-panel-foot">' +
        '<button type="button" class="link-btn doc-sample" data-action="docflow-fill-sample">填入示例</button>' +
        '<div class="doc-panel-actions">' +
          '<button type="button" class="btn" data-action="docflow-dismiss">稍后补充</button>' +
          '<button type="button" class="btn btn-primary" data-action="docflow-confirm-fields">确认并生成</button>' +
        '</div>' +
      '</div>';
  }

  function renderDocPanel(session) {
    const panel = dom.docPanel;
    if (!panel) return;
    panel.innerHTML = session.flow.stage === 'template' ? templateStageHtml(session) : fieldsStageHtml(session);
    panel.hidden = false;
    placeDocPanel();
    if (session.flow.stage === 'template') {
      setTimeout(placeDocPanel, 0);
    }
  }

  function dismissDocPanel() {
    const session = currentSession();
    if (!session || !session.flow) return;
    state.docPanelClosed = session.id;
    hideDocPanel();
    renderChat();
  }

  function resumeFlowPanel() {
    const session = currentSession();
    if (!session || !session.flow) return;
    state.docPanelClosed = null;
    syncDocPanel();
    scrollChatToBottom();
  }

  function confirmFlowTemplate() {
    const session = currentSession();
    if (!session || !session.flow) return;
    const flow = session.flow;
    state.docPanelClosed = null;
    flow.stage = 'parsing';
    session.typing = true;
    hideDocPanel();
    renderChat();
    scrollChatToBottom();
    clearFlowTimer();
    state.flowTimer = setTimeout(() => {
      flow.stage = 'fields';
      session.typing = false;
      renderChat();
      syncDocPanel();
      scrollChatToBottom();
    }, 1250);
  }

  function selectLibraryTemplate() {
    const session = currentSession();
    if (!session || !session.flow) return;
    const tpl = returnTemplate();
    session.flow.templateId = tpl ? tpl.id : 't14';
    session.flow.templateName = tpl ? tpl.name : 'QR-8.6-12 A/0-退库申请单.docx';
    session.flow.form = 'return';
    session.flow.source = 'library';
    renderDocPanel(session);
  }

  function flowFirstPickedTemplate() {
    if (!state.picker || !state.pickerMeta) return null;
    const keys = pickerMaximalKeys();
    for (const key of keys) {
      const meta = state.pickerMeta.get(key);
      if (meta && meta.kind === 'tpl') {
        const found = findFlowTemplate(meta.key.replace(/^tpl:/, ''));
        if (found) return found;
      }
    }
    for (const key of keys) {
      const meta = state.pickerMeta.get(key);
      if (!meta || meta.kind !== 'tplfolder') continue;
      const hit = (meta.descendants || []).map((child) => state.pickerMeta.get(child)).find((child) => child && child.kind === 'tpl');
      if (hit) {
        const found = findFlowTemplate(hit.key.replace(/^tpl:/, ''));
        if (found) return found;
      }
    }
    return null;
  }

  function applyPickedFlowTemplate() {
    const session = currentSession();
    if (!session || !session.flow) return false;
    const tpl = flowFirstPickedTemplate();
    if (!tpl) { toast('请选择要使用的文档模板'); return false; }
    const library = returnTemplate();
    session.flow.templateId = tpl.id;
    session.flow.templateName = tpl.name;
    session.flow.form = tpl.form || 'generic';
    session.flow.source = library && tpl.id === library.id ? 'library' : 'picked';
    closeDialog(dom.tplPicker);
    syncDocPanel();
    toast('已选择模板：' + tpl.name);
    return true;
  }

  function fillFlowSample() {
    const session = currentSession();
    if (!session || !session.flow) return;
    const sample = flowSampleValues(session.flow);
    session.flow.draft = Object.assign({}, session.flow.draft, sample);
    Object.keys(sample).forEach((name) => {
      const input = dom.docPanel.querySelector('[name="' + name + '"]');
      if (input) input.value = sample[name];
    });
    const error = dom.docPanel.querySelector('.doc-panel-error');
    if (error) error.hidden = true;
  }

  function confirmFlowFields() {
    const session = currentSession();
    if (!session || !session.flow) return;
    const flow = session.flow;
    const fields = flowFieldSchema(flow);
    const values = {};
    const missing = [];
    fields.forEach((field) => {
      const input = dom.docPanel.querySelector('[name="' + field.name + '"]');
      const value = input ? String(input.value || '').trim() : '';
      if (field.required && !value) missing.push(field);
      values[field.name] = value;
    });
    const error = dom.docPanel.querySelector('.doc-panel-error');
    if (missing.length) {
      if (error) {
        error.hidden = false;
        error.textContent = '请补充：' + missing.map((field) => field.label).join('、');
      }
      const first = dom.docPanel.querySelector('[name="' + missing[0].name + '"]');
      if (first) first.focus();
      return;
    }
    flow.draft = Object.assign({}, flow.draft, values);
    flow.values = Object.assign({
      dept: state.user.dept,
      applicant: state.user.name,
      date: today()
    }, flowIsReturn(flow) ? { retType: '退货' } : {}, values);
    flow.stage = 'done-pending';
    state.docPanelClosed = null;
    hideDocPanel();
    session.typing = true;
    renderChat();
    scrollChatToBottom();
    clearFlowTimer();
    state.flowTimer = setTimeout(() => {
      flow.stage = 'done';
      session.typing = false;
      renderChat();
      scrollChatToBottom();
      toast(flowIsReturn(flow) ? '退库申请单已填写完毕' : '文档已按模板生成');
    }, 1000);
  }

  function copyFlowContent() {
    const sheet = document.querySelector('.form-sheet');
    const text = sheet ? sheet.innerText.trim() : '';
    if (navigator.clipboard && navigator.clipboard.writeText && text) {
      navigator.clipboard.writeText(text).then(() => toast('申请单内容已复制')).catch(() => toast('内容已复制（演示）'));
    } else {
      toast('申请单内容已复制（演示）');
    }
  }

  function downloadFlowDoc() {
    const session = currentSession();
    if (!session || !session.flow) return;
    const flow = session.flow;
    const sheet = document.querySelector('.form-sheet');
    if (!sheet) return;
    const name = String(flow.templateName || 'UWork 文档').replace(/\.docx?$/i, '');
    const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>' + esc(name) +
      '</title><style>body{font-family:"Microsoft YaHei",sans-serif;padding:32px;color:#1c1c1e}' +
      '.form-sheet-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1c1c1e;padding-bottom:10px;margin-bottom:0}' +
      '.form-sheet-head b{font-size:22px;letter-spacing:.08em}.form-sheet-head small{display:block;font-size:10px;color:#777;letter-spacing:.16em}' +
      '.form-sheet-table{width:100%;border-collapse:collapse;font-size:13px}' +
      '.form-sheet-table th,.form-sheet-table td{border:1px solid #333;padding:8px 10px;text-align:left;vertical-align:top}' +
      '.form-sheet-table th{background:#f4f5f7;width:96px;font-weight:600}' +
      '.form-sheet-table .is-section,.form-sheet-table .is-section-row{background:#f4f5f7;font-weight:600}' +
      '.sheet-reason{min-height:96px;line-height:1.7}.sheet-line{line-height:2}' +
      '</style></head><body>' + sheet.innerHTML + '</body></html>';
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name + '.doc';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('已下载：' + name + '.doc（原型演示）');
  }

  function printFlowDoc() {
    const sheet = document.querySelector('.form-sheet');
    if (!sheet) return;
    const win = window.open('', '_blank', 'width=880,height=960');
    if (!win) { toast('浏览器拦截了打印窗口，请允许弹出窗口'); return; }
    win.document.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>退库申请单</title>' +
      '<style>body{font-family:"Microsoft YaHei",sans-serif;padding:28px;color:#111}' +
      '.form-sheet-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:10px}' +
      '.form-sheet-head b{font-size:22px;letter-spacing:.08em}.form-sheet-head small{display:block;font-size:10px;color:#777;letter-spacing:.16em}' +
      '.form-sheet-table{width:100%;border-collapse:collapse;font-size:13px}' +
      '.form-sheet-table th,.form-sheet-table td{border:1px solid #333;padding:8px 10px;text-align:left;vertical-align:top}' +
      '.form-sheet-table th,.form-sheet-table .is-section,.form-sheet-table .is-section-row{background:#f4f5f7;font-weight:600}' +
      '.form-sheet-table th{width:96px}.sheet-reason{min-height:96px;line-height:1.7}.sheet-line{line-height:2}' +
      '@page{margin:12mm}</style></head><body>' + sheet.innerHTML + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 320);
  }

  function submitFlowDoc() {
    const session = currentSession();
    if (!session || !session.flow) return;
    const flow = session.flow;
    if (flow.submitted) { toast('该申请单已提交审批'); return; }
    const ok = window.confirm('提交后将进入审批流程：\n1. 申请部门部长审批\n2. 质量部检验\n3. 库房管理员接收\n\n确认提交？');
    if (!ok) return;
    flow.submitted = true;
    flow.submitAt = nowTime();
    renderChat();
    scrollChatToBottom();
    toast('已提交审批，当前审批人：部门部长');
  }

  function onDocFlowAction(action, el) {
    const session = currentSession();
    switch (action) {
      case 'docflow-pick-library':
        selectLibraryTemplate();
        break;
      case 'docflow-other':
        openTemplatePicker('docflow');
        break;
      case 'docflow-use':
        confirmFlowTemplate();
        break;
      case 'docflow-dismiss':
        dismissDocPanel();
        break;
      case 'docflow-resume':
        resumeFlowPanel();
        break;
      case 'docflow-fill-sample':
        fillFlowSample();
        break;
      case 'docflow-confirm-fields':
        confirmFlowFields();
        break;
      case 'docflow-download':
        downloadFlowDoc();
        break;
      case 'docflow-print':
        printFlowDoc();
        break;
      case 'docflow-copy':
        copyFlowContent();
        break;
      case 'docflow-submit':
        submitFlowDoc();
        break;
      case 'docflow-jump-session':
        if (session && el && el.dataset.session) {
          state.currentSessionId = el.dataset.session;
          renderChat();
        }
        break;
      default:
        break;
    }
  }

  /* ============================== 事件绑定 ============================== */
  function bindLogin() {
    $('#login-form').addEventListener('submit', attemptLogin);
    $('#pwd-toggle').addEventListener('click', () => {
      const input = $('#login-password');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      $('#pwd-toggle').setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
    });
    $$('.demo-user').forEach((button) => {
      button.addEventListener('click', () => {
        const user = Store.userByName(button.dataset.demoUser);
        if (!user) return;
        $('#login-username').value = user.username;
        $('#login-password').value = PASSWORD;
        hideLoginError();
        attemptLogin();
      });
    });
  }

  function bindComposer() {
    dom.prompt.addEventListener('input', () => {
      autosizePrompt();
      syncSend();
    });
    let composing = false;
    dom.prompt.addEventListener('compositionstart', () => { composing = true; });
    dom.prompt.addEventListener('compositionend', () => { composing = false; });
    dom.prompt.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !composing && !event.isComposing) {
        event.preventDefault();
        sendMessage();
      }
    });
    if (dom.docPanel) {
      dom.docPanel.addEventListener('input', (event) => {
        const session = currentSession();
        const field = event.target && event.target.name;
        if (!session || !session.flow || !field) return;
        session.flow.draft = session.flow.draft || {};
        session.flow.draft[field] = event.target.value;
        const error = dom.docPanel.querySelector('.doc-panel-error');
        if (error) error.hidden = true;
      });
      dom.docPanel.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.isComposing) return;
        if (event.target && event.target.tagName === 'TEXTAREA') return;
        const session = currentSession();
        if (!session || !session.flow || session.flow.stage !== 'fields') return;
        if (event.target && event.target.closest('#doc-field-form')) {
          event.preventDefault();
          confirmFlowFields();
        }
      });
    }
    dom.addBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePlus();
    });
    dom.plus.addEventListener('click', (event) => {
      const item = event.target.closest('[data-plus]');
      if (!item) return;
      event.stopPropagation();
      choosePlus(item.dataset.plus);
    });
    dom.plus.addEventListener('mouseover', (event) => {
      const item = event.target.closest('[data-plus]');
      if (!item) return;
      if (item.dataset.plus === 'templates' || item.dataset.plus === 'knowledge') { hideSubmenu(); return; }
      if (state.submenuKind !== item.dataset.plus) showSubmenu(item.dataset.plus, item);
      clearTimeout(submenuTimer);
    });
    dom.plus.addEventListener('mouseleave', scheduleHideSubmenu);
    dom.submenu.addEventListener('mouseenter', () => clearTimeout(submenuTimer));
    dom.submenu.addEventListener('mouseleave', scheduleHideSubmenu);
    dom.modelBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleModelMenu();
    });
    dom.modelMenu.addEventListener('click', (event) => {
      const option = event.target.closest('[data-model-id]');
      if (!option) return;
      state.modelId = option.dataset.modelId;
      syncComposerModel();
      hideModelMenu();
      toast('已切换模型：' + option.querySelector('b').textContent);
    });
    dom.workspaceBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleWorkspaceMenu();
    });
    dom.workspaceMenu.addEventListener('click', (event) => {
      const option = event.target.closest('[data-workspace]');
      if (option) { selectWorkspace(option.dataset.workspace); return; }
      if (event.target.closest('[data-workspace-pick]')) pickWorkspaceDir();
    });
    dom.permissionBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePermissionMenu();
    });
    dom.permissionMenu.addEventListener('click', (event) => {
      const option = event.target.closest('[data-permission]');
      if (!option) return;
      event.stopPropagation();
      selectPermission(option.dataset.permission);
    });
    dom.workspaceDirInput.addEventListener('change', handleWorkspaceDirChange);
    window.addEventListener('resize', hideWorkspaceMenu);
    window.addEventListener('resize', hidePermissionMenu);
    window.addEventListener('resize', hideModelMenu);
    window.addEventListener('resize', placeDocPanel);
    const viewScroll = $('#view-scroll');
    if (viewScroll) viewScroll.addEventListener('scroll', () => {
      if (!dom.workspaceMenu.hidden) hideWorkspaceMenu();
      if (!dom.permissionMenu.hidden) hidePermissionMenu();
      if (!dom.modelMenu.hidden) hideModelMenu();
      placeDocPanel();
    }, { passive: true });
    const chatScroll = $('#chat-scroll');
    if (chatScroll) chatScroll.addEventListener('scroll', () => {
      if (!dom.modelMenu.hidden) hideModelMenu();
      placeDocPanel();
    }, { passive: true });
    $('#local-file-input').addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []);
      files.forEach((file) => {
        addAttachment({
          key: 'file:' + file.name + ':' + file.size,
          kind: 'file',
          name: file.name,
          level: state.user.level,
          meta: formatSize(file.size),
          ext: extOf(file.name)
        });
      });
      if (files.length) toast(files.length + ' 个本地文件已添加');
      event.target.value = '';
    });
    $('#skill-pkg-input').addEventListener('change', (event) => {
      const file = (event.target.files || [])[0];
      installSkillPackage(file);
      event.target.value = '';
    });
  }

  function bindGlobalClicks() {
    document.addEventListener('click', (event) => {
      const navEl = event.target.closest('.side-nav-item[data-view]');
      if (navEl) {
        navigate(navEl.dataset.view);
        return;
      }
      const chipRemove = event.target.closest('[data-chip-remove]');
      if (chipRemove) {
        event.stopPropagation();
        removeAttachment(chipRemove.dataset.chipRemove);
        return;
      }
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        handleAction(actionEl.dataset.action, actionEl, event);
        return;
      }
      const plusItem = event.target.closest('[data-plus]');
      if (plusItem) { choosePlus(plusItem.dataset.plus); return; }
      const subAction = event.target.closest('[data-sub-action]');
      if (subAction) { handleSubAction(subAction.dataset.subAction); return; }
      const skillRow = event.target.closest('[data-pick-skill]');
      if (skillRow) {
        const skill = DB.skills.find((item) => item.id === skillRow.dataset.pickSkill);
        if (skill) {
          const added = !state.attachments.some((item) => item.key === 'skill:' + skill.id);
          toggleAttachment({ key: 'skill:' + skill.id, kind: 'skill', name: skill.name, level: skill.level, meta: '技能' });
          closePlus();
          toast(added ? '已添加技能：' + skill.name : '已移除技能：' + skill.name);
        }
        return;
      }
      const connToggle = event.target.closest('[data-conn-toggle]');
      if (connToggle) { toggleConnectorStatus(connToggle.dataset.connToggle); return; }
      const connConnect = event.target.closest('[data-conn-connect]');
      if (connConnect) { connectConnector(connConnect.dataset.connConnect); return; }
      const connMain = event.target.closest('[data-conn-main]');
      if (connMain) {
        const connector = (DB.connectors || []).find((item) => item.id === connMain.dataset.connMain);
        if (connector) {
          if (!connectorConfigured(connector)) connectConnector(connector.id);
          else if (connectorOn(connector)) addConnectorToSession(connector);
          else toast(connector.name + ' 已关闭，打开右侧开关后再带入会话');
        }
        return;
      }
      const agentEl = event.target.closest('[data-agent]');
      if (agentEl) { selectAgent(agentEl.dataset.agent); return; }
      const suggestEl = event.target.closest('[data-suggest]');
      if (suggestEl) { setPrompt(suggestEl.dataset.suggest); return; }
      const wsToggle = event.target.closest('[data-ws-toggle]');
      if (wsToggle) {
        const key = wsToggle.dataset.wsToggle;
        if (state.wsCollapsed.has(key)) state.wsCollapsed.delete(key);
        else state.wsCollapsed.add(key);
        renderRecent();
        return;
      }
      const wsMore = event.target.closest('[data-ws-more]');
      if (wsMore) {
        const key = wsMore.dataset.wsMore;
        if (state.wsExpanded.has(key)) state.wsExpanded.delete(key);
        else state.wsExpanded.add(key);
        renderRecent();
        return;
      }
      const sessionEl = event.target.closest('[data-session]');
      if (sessionEl) { openSession(sessionEl.dataset.session); return; }
      const kbEl = event.target.closest('[data-open-kb]');
      if (kbEl) { openKb(kbEl.dataset.openKb); return; }
      const kbTab = event.target.closest('[data-kbtab]');
      if (kbTab) {
        state.kbTab = kbTab.dataset.kbtab;
        $$('[data-kbtab]').forEach((tab) => tab.classList.toggle('is-active', tab === kbTab));
        paintKbGrid();
        return;
      }
      const kbFolder = event.target.closest('[data-kbfolder]');
      if (kbFolder) {
        state.kbFolder = kbFolder.dataset.kbfolder;
        state.kbDocQuery = '';
        state.kbDocStatus = 'all';
        renderKbDetail();
        return;
      }
      const govern = event.target.closest('[data-govern]');
      if (govern) { goGovern(govern.dataset.govern, govern); return; }
      const previewDoc = event.target.closest('[data-preview-doc]');
      if (previewDoc) {
        const found = findDoc(previewDoc.dataset.previewDoc);
        if (found) openPreview(found.doc, { type: 'doc', kb: found.kb });
        return;
      }
      const tplFolder = event.target.closest('[data-tplfolder]');
      if (tplFolder) {
        state.tplFolder = tplFolder.dataset.tplfolder;
        state.tplQuery = '';
        renderTemplates();
        return;
      }
      const previewTpl = event.target.closest('[data-preview-tpl]');
      if (previewTpl) {
        const tpl = findTemplate(previewTpl.dataset.previewTpl);
        if (tpl) openPreview(tpl, { type: 'template' });
        return;
      }
      const useTpl = event.target.closest('[data-use-tpl]');
      if (useTpl) { useTemplate(useTpl.dataset.useTpl); return; }
      const skillPick = event.target.closest('[data-skill-add-id]');
      if (skillPick) { addSkillFromPage(skillPick.dataset.skillAddId); return; }
      const skillMenuAction = event.target.closest('[data-skill-add]');
      if (skillMenuAction) {
        const kind = skillMenuAction.dataset.skillAdd;
        if (kind === 'upload') pickSkillPackage();
        else if (kind === 'create') createSkillWithAgent();
        return;
      }
      const skillDir = event.target.closest('[data-skf]');
      if (skillDir) {
        state.skillFolder = skillDir.dataset.skf;
        state.skillQuery = '';
        renderSkillsPage();
        return;
      }
      const connDir = event.target.closest('[data-cnf]');
      if (connDir) {
        state.connFolder = connDir.dataset.cnf;
        state.connQuery = '';
        renderConnectors();
        return;
      }
      if (!event.target.closest('.add-skill-wrap')) closeSkillMenu();
      const cite = event.target.closest('[data-cite]');
      if (cite) {
        const text = cite.dataset.cite;
        const found = (() => {
          for (const kb of DB.knowledgeBases) {
            const doc = kb.docs.find((item) => item.name === text);
            if (doc) return { doc, kb };
          }
          return null;
        })();
        if (found) openPreview(found.doc, { type: 'doc', kb: found.kb });
        else toast('演示文档：' + text);
        return;
      }
      const modelOption = event.target.closest('[data-model-id]');
      if (modelOption) { /* 由 modelMenu 冒泡处理 */ }
      if (!event.target.closest('#composer') && !event.target.closest('#attach-submenu')) closePlus();
      if (!event.target.closest('#model-btn') && !event.target.closest('#model-menu')) hideModelMenu();
      if (!event.target.closest('#workspace-btn') && !event.target.closest('#workspace-menu')) hideWorkspaceMenu();
      if (!event.target.closest('#permission-btn') && !event.target.closest('#permission-menu')) hidePermissionMenu();
      if (!event.target.closest('#user-card') && !event.target.closest('#user-pop')) dom.userPop.hidden = true;
      if (!event.target.closest('#clearance-pill') && !event.target.closest('#clearance-pop')) dom.clearancePop.hidden = true;
    });

    document.addEventListener('input', (event) => {
      const id = event.target.id;
      if (id === 'ws-search-input') {
        state.sessionQuery = event.target.value;
        renderRecent();
      } else if (id === 'kb-search') {
        state.kbQuery = event.target.value;
        paintKbGrid();
      } else if (id === 'doc-search') {
        state.kbDocQuery = event.target.value;
        paintDocRows();
      } else if (id === 'tpl-search') {
        state.tplQuery = event.target.value;
        paintTplRows();
      } else if (id === 'skill-search') {
        state.skillQuery = event.target.value;
        paintSkillCards();
      } else if (id === 'conn-search') {
        state.connQuery = event.target.value;
        paintConnectorCards();
      } else if (id === 'kb-picker-search') {
        state.picker.query = event.target.value;
        renderKbPicker(true);
      } else if (id === 'template-picker-search') {
        state.picker.query = event.target.value;
        renderTemplatePicker(true);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllOverlays();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        if (state.user) newChat();
      }
    });

    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (dialog === $('#new-template-dialog')) {
          state.uploadFile = null;
          state.templateEditId = null;
          $('#template-file-name').hidden = true;
          $('#template-drop').classList.remove('is-drag');
          $('#template-drop').hidden = false;
        }
        if (dialog === dom.update && state.updateTimer) {
          clearInterval(state.updateTimer);
          state.updateTimer = null;
          if (state.updateState === 'downloading') {
            state.updateState = 'idle';
            state.updateProgress = 0;
          }
        }
      });
    });

    $('#sidebar-scrim').addEventListener('click', closeSidebar);
  }

  function handleAction(action, el, event) {
    if (action.indexOf('docflow-') === 0) {
      event.preventDefault();
      onDocFlowAction(action, el);
      return;
    }
    switch (action) {
      case 'toggle-plus':
        event.stopPropagation();
        togglePlus();
        break;
      case 'send': sendMessage(); break;
      case 'toggle-model': event.stopPropagation(); toggleModelMenu(); break;
      case 'toggle-workspace': event.stopPropagation(); toggleWorkspaceMenu(); break;
      case 'toggle-permission': event.stopPropagation(); togglePermissionMenu(); break;
      case 'new-chat': newChat(); break;
      case 'open-sidebar': openSidebar(); break;
      case 'close-sidebar': closeSidebar(); break;
      case 'user-menu':
        event.stopPropagation();
        dom.userPop.hidden = !dom.userPop.hidden;
        dom.clearancePop.hidden = true;
        break;
      case 'clearance-info':
        event.stopPropagation();
        dom.clearancePop.hidden = !dom.clearancePop.hidden;
        dom.userPop.hidden = true;
        break;
      case 'logout': logout(); break;
      case 'switch-account': logout(); break;
      case 'account-info':
        dom.userPop.hidden = true;
        toast('账号 ' + state.user.username + ' · 密级 ' + Store.level(state.user.level).name + '级 · ' + state.user.dept);
        break;
      case 'help':
        toast('UWork 使用帮助：选择智能体 → 添加知识/技能 → 输入工作内容');
        break;
      case 'notifications':
        openMessageCenter();
        break;
      case 'open-messages':
        openMessageCenter();
        break;
      case 'close-messages':
        closeDialog(dom.messages);
        break;
      case 'read-all-messages':
        readAllMessages();
        break;
      case 'toggle-message':
        toggleMessage(el.dataset.id);
        break;
      case 'settings-note':
        dom.userPop.hidden = true;
        toast('偏好设置将在正式版开放');
        break;
      case 'check-update':
        dom.userPop.hidden = true;
        openUpdateDialog();
        break;
      case 'close-update':
        closeUpdateDialog();
        break;
      case 'update-now':
        startClientUpdate();
        break;
      case 'update-later':
        closeUpdateDialog();
        break;
      case 'update-restart':
        restartClientUpdate();
        break;
      case 'search-sessions':
        toggleSessionSearch();
        break;
      case 'sort-workspaces':
        toggleRecentSort();
        break;
      case 'add-workspace':
        pickWorkspaceDir();
        break;
      case 'voice':
        toast('语音输入为原型演示能力，正式版支持实时转写');
        break;
      case 'forgot':
        toast('请联系企业管理员重置密码');
        break;
      case 'close-kb-picker': closeDialog(dom.kbPicker); break;
      case 'kb-picker-confirm': confirmKbPicker(); break;
      case 'reset-kb-filter': state.kbQuery = ''; state.kbTab = 'all'; renderKnowledge(); break;
      case 'kb-picker-clear':
        state.picker.selected.clear();
        renderKbPicker();
        break;
      case 'close-template-picker': closeDialog(dom.tplPicker); break;
      case 'template-picker-confirm': confirmTemplatePicker(); break;
      case 'template-picker-clear':
        state.picker.selected.clear();
        renderTemplatePicker();
        break;
      case 'close-new-kb': closeDialog($('#new-kb-dialog')); break;
      case 'close-new-folder': closeDialog($('#new-folder-dialog')); break;
      case 'close-new-template': closeDialog($('#new-template-dialog')); break;
      case 'open-new-kb': openNewKbDialog(); break;
      case 'kb-back':
        state.kbDetail = null;
        navigate('knowledge');
        break;
      case 'new-folder': openNewFolderDialog('kb'); break;
      case 'new-template': openNewTemplateDialog(); break;
      case 'edit-template': openNewTemplateDialog(el.dataset.id); break;
      case 'tpl-new-folder': openNewFolderDialog('tpl'); break;
      case 'toggle-skill-add': toggleSkillMenu(); break;
      case 'new-connector': openNewConnectorDialog(); break;
      case 'close-new-connector': closeDialog($('#new-connector-dialog')); break;
      case 'close-preview': closeDialog(dom.preview); break;
      case 'preview-use-template': usePreviewTemplate(); break;
      case 'copy-answer':
        copyAnswerText();
        break;
      case 'regen-answer':
        toast('已重新生成一版答复（演示）');
        break;
      case 'like-answer':
        el.style.color = 'var(--ok)';
        toast('感谢反馈，已记录为有帮助');
        break;
      case 'clearance-switch': logout(); break;
      default: break;
    }
  }

  function handleSubAction(action) {
    if (action === 'local-file') {
      closePlus();
      $('#local-file-input').click();
    } else if (action === 'kb-picker') {
      closePlus();
      openKbPicker();
    } else if (action === 'manage-skills') {
      closePlus();
      navigate('skills');
    } else if (action === 'add-local-skill') {
      closePlus();
      pickSkillPackage();
    } else if (action === 'manage-connectors') {
      closePlus();
      state.connQuery = '';
      navigate('connectors');
    }
  }

  function copyAnswerText() {
    const answer = document.querySelector('.answer');
    if (!answer) return;
    const text = answer.innerText.replace(/复制|重新生成|有帮助/g, '').trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('答复已复制')).catch(() => toast('已复制答复（演示）'));
    } else {
      toast('已复制答复（演示）');
    }
  }

  function bindForms() {
    $('#new-kb-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.target;
      const name = fieldOf(form, 'name').value.trim();
      if (!name) { toast('请填写知识库名称'); fieldOf(form, 'name').focus(); return; }
      const kb = {
        id: 'kb-' + Date.now(),
        name: name,
        desc: fieldOf(form, 'desc').value.trim() || '暂无描述',
        level: fieldOf(form, 'level').value,
        owner: state.user.name,
        dept: state.user.dept,
        updated: today(),
        mine: true,
        canEdit: true,
        folders: [],
        docs: []
      };
      DB.knowledgeBases.unshift(kb);
      Store.save();
      closeDialog($('#new-kb-dialog'));
      form.reset();
      populateSelects();
      state.kbDetail = kb.id;
      state.kbFolder = 'all';
      navigate('knowledge');
      toast('知识库已创建：' + name);
    });

    $('#new-folder-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.target;
      const name = fieldOf(form, 'name').value.trim();
      if (!name) { toast('请填写目录名称'); fieldOf(form, 'name').focus(); return; }
      const context = state.folderContext || {};
      if (context.type === 'kb') {
        const kb = findKb(context.kbId);
        if (!kb) return;
        const folderId = 'folder-' + Date.now();
        kb.folders.push({ id: folderId, name: name, parent: fieldOf(form, 'parent').value || null });
        form.dataset.created = folderId;
        kb.updated = today();
      } else {
        const folder = { id: 'tplfolder-' + Date.now(), name: name, parent: fieldOf(form, 'parent').value || null, canEdit: true, owner: state.user.name };
        DB.templateFolders.push(folder);
        form.dataset.created = folder.id;
      }
      Store.save();
      closeDialog($('#new-folder-dialog'));
      form.reset();
      if (context.type === 'kb') {
        state.kbFolder = form.dataset.created || state.kbFolder;
        renderKbDetail();
      } else {
        state.tplFolder = form.dataset.created || state.tplFolder;
        renderTemplates();
      }
      toast('目录已创建：' + name);
    });

    $('#new-template-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.target;
      const name = fieldOf(form, 'name').value.trim();
      if (!name) { toast('请填写模板名称'); fieldOf(form, 'name').focus(); return; }
      if (state.templateEditId) {
        const template = findTemplate(state.templateEditId);
        if (!template) return;
        template.name = name;
        template.folder = fieldOf(form, 'folder').value || null;
        template.level = fieldOf(form, 'level').value;
        template.updated = today();
        Store.save();
        closeDialog($('#new-template-dialog'));
        state.templateEditId = null;
        form.reset();
        $('#template-drop').hidden = false;
        renderTemplates();
        toast('模板已更新：' + name);
        return;
      }
      if (!state.uploadFile) { toast('请先选择要上传的模板文件'); return; }
      const file = state.uploadFile;
      const template = {
        id: 'tpl-' + Date.now(),
        name: name,
        folder: fieldOf(form, 'folder').value || null,
        ext: extOf(file.name),
        size: formatSize(file.size),
        level: fieldOf(form, 'level').value,
        owner: state.user.name,
        updated: today()
      };
      DB.templates.unshift(template);
      Store.save();
      closeDialog($('#new-template-dialog'));
      state.uploadFile = null;
      form.reset();
      $('#template-file-name').hidden = true;
      renderTemplates();
      toast('模板已保存：' + name);
    });

    const connForm = $('#new-connector-form');
    connForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.target;
      const name = fieldOf(form, 'name').value.trim();
      if (!name) { toast('请填写连接器名称'); fieldOf(form, 'name').focus(); return; }
      const endpoint = fieldOf(form, 'endpoint').value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      if (!endpoint) { toast('请填写接入地址'); fieldOf(form, 'endpoint').focus(); return; }
      if ((DB.connectors || []).some((item) => item.name === name)) {
        toast('已存在同名连接器，换个名称试试');
        fieldOf(form, 'name').focus();
        return;
      }
      const folderId = (fieldOf(form, 'folder') ? fieldOf(form, 'folder').value : '') || 'cf0';
      const folder = (DB.connectorFolders || []).find((item) => item.id === folderId);
      const connector = {
        id: 'conn-' + Date.now(),
        name: name,
        folder: folder ? folder.id : 'cf0',
        category: folder ? folder.name : '未分类',
        level: fieldOf(form, 'level').value,
        configured: true,
        status: '已连接',
        endpoint: endpoint,
        desc: fieldOf(form, 'desc').value.trim() || '自定义接入的业务系统',
        auth: fieldOf(form, 'auth').value,
        brand: '#5b7cfa',
        mark: 'link',
        custom: true,
        owner: state.user.name,
        connectedAt: today() + ' ' + nowTime()
      };
      DB.connectors.unshift(connector);
      Store.save();
      closeDialog($('#new-connector-dialog'));
      form.reset();
      state.connQuery = '';
      state.connFolder = connector.folder;
      if (state.view === 'connectors') renderConnectors();
      else navigate('connectors');
      toast('自定义连接器已创建：' + name);
    });

    const templateInput = $('#template-file');
    const drop = $('#template-drop');
    drop.addEventListener('click', () => templateInput.click());
    templateInput.addEventListener('change', () => {
      if (templateInput.files && templateInput.files[0]) setUploadFile(templateInput.files[0]);
    });
    drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('is-drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      drop.classList.remove('is-drag');
      if (event.dataTransfer.files && event.dataTransfer.files[0]) setUploadFile(event.dataTransfer.files[0]);
    });
  }

  function setUploadFile(file) {
    const ext = extOf(file.name);
    if (!['doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
      toast('仅支持 Word（doc/docx）与 Excel（xls/xlsx）模板');
      return;
    }
    state.uploadFile = file;
    const label = $('#template-file-name');
    label.textContent = file.name + ' · ' + formatSize(file.size);
    label.hidden = false;
    const nameInput = fieldOf($('#new-template-form'), 'name');
    if (!nameInput.value.trim()) nameInput.value = file.name;
  }

  function bindPickerEvents() {
    const bindTree = (tree) => {
      tree.addEventListener('click', (event) => {
        const caret = event.target.closest('[data-toggle-node]');
        if (caret) {
          const key = caret.dataset.toggleNode;
          if (state.picker.expanded.has(key)) state.picker.expanded.delete(key);
          else state.picker.expanded.add(key);
          if (state.picker.type === 'kb') renderKbPicker();
          else renderTemplatePicker();
          return;
        }
        const row = event.target.closest('.tree-node');
        if (!row || event.target.matches('input')) return;
        const key = row.dataset.nodeKey;
        const checked = state.picker.selected.has(key);
        togglePickerNode(key, !checked);
        if (state.picker.type === 'kb') renderKbPicker();
        else renderTemplatePicker();
      });
      tree.addEventListener('change', (event) => {
        if (!event.target.matches('input[type="checkbox"]')) return;
        togglePickerNode(event.target.dataset.checkNode, event.target.checked);
        if (state.picker.type === 'kb') renderKbPicker();
        else renderTemplatePicker();
      });
    };
    bindTree(dom.kbTree);
    bindTree(dom.tplTree);
  }

  /* ============================== 知识库选择器 ============================== */
  function docPath(kb, doc) {
    const trail = Store.folderTrail(kb.folders, doc.folder).map((folder) => folder.name);
    return [kb.name].concat(trail).join(' / ');
  }

  function prepareKbPickerMeta() {
    const meta = new Map();
    visibleKbs().forEach((kb) => {
      const docs = visibleDocs(kb);
      const kbKey = 'kb:' + kb.id;
      const descendants = [];
      meta.set(kbKey, {
        key: kbKey, kind: 'kb', name: kb.name, level: kb.level,
        parentKey: null, descendants: descendants, path: kb.name
      });
      const addFolder = (folder, parentKey) => {
        const key = 'folder:' + folder.id;
        const childKeys = [];
        kb.folders.filter((item) => item.parent === folder.id).forEach((child) => {
          childKeys.push.apply(childKeys, addFolder(child, key));
        });
        docs.filter((doc) => doc.folder === folder.id).forEach((doc) => {
          const docKey = 'doc:' + doc.id;
          meta.set(docKey, {
            key: docKey, kind: 'doc', name: doc.name, level: doc.level,
            parentKey: key, descendants: [], path: docPath(kb, doc), ext: doc.ext
          });
          childKeys.push(docKey);
        });
        meta.set(key, {
          key: key, kind: 'folder', name: folder.name, level: kb.level,
          parentKey: parentKey, descendants: childKeys.slice(),
          path: kb.name + ' / ' + folder.name, kbName: kb.name
        });
        return [key].concat(childKeys);
      };
      kb.folders.filter((folder) => !folder.parent).forEach((folder) => {
        descendants.push.apply(descendants, addFolder(folder, kbKey));
      });
      docs.filter((doc) => !doc.folder).forEach((doc) => {
        const docKey = 'doc:' + doc.id;
        meta.set(docKey, {
          key: docKey, kind: 'doc', name: doc.name, level: doc.level,
          parentKey: kbKey, descendants: [], path: docPath(kb, doc), ext: doc.ext
        });
        descendants.push(docKey);
      });
    });
    return meta;
  }

  function includedKbDocs(kb, query) {
    const docs = visibleDocs(kb);
    if (!query) return docs;
    return docs.filter((doc) => {
      if (kb.name.toLowerCase().includes(query)) return true;
      if (doc.name.toLowerCase().includes(query)) return true;
      return Store.folderTrail(kb.folders, doc.folder).some((folder) => folder.name.toLowerCase().includes(query));
    });
  }

  function pickerRow(options) {
    const checked = state.picker.selected.has(options.key);
    const expanded = state.picker.expanded.has(options.key) || !!state.picker.query;
    const hasChildren = !!options.hasChildren;
    return '<div class="tree-node' + (checked ? ' is-selected' : '') + '" data-node-key="' + esc(options.key) + '" style="padding-left:' + (8 + options.depth * 18) + 'px">' +
      '<span class="tree-caret' + (hasChildren ? '' : ' is-hidden') + (expanded ? ' is-open' : '') + '" data-toggle-node="' + esc(options.key) + '">' + icon('chevron-right') + '</span>' +
      '<input type="checkbox" data-check-node="' + esc(options.key) + '"' + (checked ? ' checked' : '') + ' aria-label="选择 ' + esc(options.name) + '">' +
      '<span class="node-ico ' + (options.kind === 'kb' ? 'is-kb' : options.kind === 'folder' || options.kind === 'tplfolder' ? 'is-folder' : '') + '">' +
        icon(options.kind === 'kb' ? 'book' : options.kind === 'folder' || options.kind === 'tplfolder' ? 'folder' : 'file') +
      '</span>' +
      '<span class="node-name">' + esc(options.name) + (options.count ? ' <span class="node-count">' + esc(options.count) + '</span>' : '') + '</span>' +
      (options.level ? '<span class="node-lvl">' + levelBadge(options.level) + '</span>' : '') +
    '</div>';
  }

  function openKbPicker() {
    if (!state.user) return;
    state.picker = { type: 'kb', selected: new Set(), expanded: new Set(visibleKbs().map((kb) => 'kb:' + kb.id)), query: '' };
    state.pickerMeta = prepareKbPickerMeta();
    $('#kb-picker-search').value = '';
    $('#kb-picker-cleared').innerHTML = icon('shield') + Store.level(state.user.level).name + '级 · 已过滤';
    renderKbPicker();
    openDialog(dom.kbPicker);
    setTimeout(() => { const input = $('#kb-picker-search'); if (input) input.focus(); }, 80);
  }

  function renderKbPicker() {
    if (!state.picker || state.picker.type !== 'kb') return;
    const query = state.picker.query.trim().toLowerCase();
    const parts = ['<div class="picker-note">' + icon('shield') + '当前账号 ' + esc(state.user.name) + ' · ' + Store.level(state.user.level).name + '级，仅展示该密级及以下的知识库内容。</div>'];
    let count = 0;
    visibleKbs().forEach((kb) => {
      const docs = includedKbDocs(kb, query);
      if (query && !docs.length) return;
      const kbKey = 'kb:' + kb.id;
      const rootChildren = [];
      const addFolder = (folder, depth, target) => {
        const subtree = docs.filter((doc) => {
          const ids = new Set([folder.id].concat(Store.descendants(kb.folders, folder.id).map((item) => item.id)));
          return ids.has(doc.folder);
        });
        if (!subtree.length) return;
        const childHtml = [];
        kb.folders.filter((item) => item.parent === folder.id).forEach((child) => addFolder(child, depth + 1, childHtml));
        docs.filter((doc) => doc.folder === folder.id).forEach((doc) => {
          childHtml.push(pickerRow({ key: 'doc:' + doc.id, depth: depth + 1, name: doc.name, kind: 'doc', level: doc.level }));
        });
        target.push(pickerRow({
          key: 'folder:' + folder.id, depth: depth, name: folder.name,
          kind: 'folder', count: subtree.length + ' 篇', hasChildren: childHtml.length > 0
        }));
        if ((state.picker.expanded.has('folder:' + folder.id) || !!query) && childHtml.length) {
          target.push('<div>' + childHtml.join('') + '</div>');
        }
      };
      kb.folders.filter((folder) => !folder.parent).forEach((folder) => addFolder(folder, 1, rootChildren));
      docs.filter((doc) => !doc.folder).forEach((doc) => {
        rootChildren.push(pickerRow({ key: 'doc:' + doc.id, depth: 1, name: doc.name, kind: 'doc', level: doc.level }));
      });
      const expanded = state.picker.expanded.has(kbKey) || !!query;
      parts.push(pickerRow({
        key: kbKey, depth: 0, name: kb.name,
        kind: 'kb', level: kb.level, count: docs.length + ' 篇',
        hasChildren: rootChildren.length > 0
      }));
      if (expanded && rootChildren.length) parts.push('<div>' + rootChildren.join('') + '</div>');
      count += 1;
    });
    dom.kbTree.innerHTML = count ? parts.join('') : parts.join('') + '<div class="picker-empty">没有匹配的知识库内容</div>';
    updatePickerCount();
  }

  function togglePickerNode(key, checked) {
    if (!state.picker || !state.pickerMeta) return;
    const meta = state.pickerMeta.get(key);
    if (!meta) return;
    const single = state.picker.type === 'tpl' && state.pickerContext === 'docflow';
    let parentKey = meta.parentKey;
    while (parentKey) {
      state.picker.selected.delete(parentKey);
      const parent = state.pickerMeta.get(parentKey);
      parentKey = parent ? parent.parentKey : null;
    }
    if (checked) {
      if (single) {
        state.picker.selected.clear();
        if (meta.kind === 'tplfolder') {
          const hit = (meta.descendants || []).map((child) => state.pickerMeta.get(child)).find((child) => child && child.kind === 'tpl');
          if (hit) {
            state.picker.selected.add(hit.key);
            (hit.descendants || []).forEach((item) => state.picker.selected.add(item));
          }
        } else {
          state.picker.selected.add(key);
        }
      } else {
        state.picker.selected.add(key);
        (meta.descendants || []).forEach((item) => state.picker.selected.add(item));
      }
    } else {
      state.picker.selected.delete(key);
      (meta.descendants || []).forEach((item) => state.picker.selected.delete(item));
    }
    updatePickerCount();
  }

  function pickerMaximalKeys() {
    if (!state.picker || !state.pickerMeta) return [];
    const selected = state.picker.selected;
    return Array.from(selected).filter((key) => {
      const meta = state.pickerMeta.get(key);
      let parentKey = meta ? meta.parentKey : null;
      while (parentKey) {
        if (selected.has(parentKey)) return false;
        const parent = state.pickerMeta.get(parentKey);
        parentKey = parent ? parent.parentKey : null;
      }
      return !!meta;
    });
  }

  function updatePickerCount() {
    const count = pickerMaximalKeys().length;
    if (state.picker && state.picker.type === 'kb') $('#kb-picker-count').textContent = count;
    if (state.picker && state.picker.type === 'tpl') $('#template-picker-count').textContent = count;
  }

  function confirmKbPicker() {
    const keys = pickerMaximalKeys();
    let added = 0;
    keys.forEach((key) => {
      const meta = state.pickerMeta.get(key);
      if (!meta) return;
      const kindMap = { kb: 'kb', folder: 'folder', doc: 'doc' };
      const metaLabel = { kb: '知识库', folder: '目录', doc: '文档' };
      const item = {
        key: key, kind: kindMap[meta.kind], name: meta.name, level: meta.level,
        meta: metaLabel[meta.kind], path: meta.path, ext: meta.ext
      };
      if (addAttachment(item)) added += 1;
    });
    closeDialog(dom.kbPicker);
    if (added) toast('已添加 ' + added + ' 项知识库内容');
    else if (keys.length) toast('所选内容已在引用中');
    syncSend();
  }

  /* ============================== 知识库页面 ============================== */
  function renderKnowledge() {
    if (!state.user) return;
    if (state.kbDetail) {
      const kb = findKb(state.kbDetail);
      if (!kb || !Store.canSee(state.user.level, kb.level)) {
        state.kbDetail = null;
      } else {
        renderKbDetail();
        return;
      }
    }
    const visible = visibleKbs();
    const navCount = $('#nav-kb-count');
    if (navCount) navCount.textContent = visible.length;
    const hiddenKbs = DB.knowledgeBases.length - visible.length;
    const hiddenDocs = DB.knowledgeBases.reduce((total, kb) => {
      if (!Store.canSee(state.user.level, kb.level)) return total;
      return total + (kb.docs.length - visibleDocs(kb).length);
    }, 0);
    const level = Store.level(state.user.level);
    $('#knowledge-root').innerHTML =
      '<div class="page">' +
        '<div class="page-head">' +
          '<div>' +
            '<div class="page-kicker">KNOWLEDGE BASE</div>' +
            '<h1>知识库</h1>' +
            '<p>这里是你能访问的企业知识资产。可以对有权限的知识库维护目录与文档，并对文档执行智能治理。</p>' +
          '</div>' +
          '<div class="page-actions">' +
            '<label class="search-field">' + icon('search') + '<input type="search" id="kb-search" placeholder="搜索知识库" value="' + esc(state.kbQuery) + '" spellcheck="false"></label>' +
            '<button type="button" class="btn btn-primary" data-action="open-new-kb">' + icon('plus') + '新建知识库</button>' +
          '</div>' +
        '</div>' +
        '<div class="page-toolbar">' +
          '<div class="tabs">' +
            '<button type="button" class="tab-item' + (state.kbTab === 'all' ? ' is-active' : '') + '" data-kbtab="all">全部</button>' +
            '<button type="button" class="tab-item' + (state.kbTab === 'mine' ? ' is-active' : '') + '" data-kbtab="mine">我创建的</button>' +
            '<button type="button" class="tab-item' + (state.kbTab === 'view' ? ' is-active' : '') + '" data-kbtab="view">仅可查看</button>' +
          '</div>' +
          '<span class="clearance-inline">' + icon('shield') + '当前 ' + level.name + '级，可见 ' + visible.length + ' 个知识库</span>' +
          '<span class="toolbar-spacer"></span>' +
          '<span class="clearance-inline" id="kb-result-count"></span>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-action="reset-kb-filter">重置</button>' +
        '</div>' +
        '<div class="kb-grid" id="kb-grid"></div>' +
        '<div id="kb-empty" hidden></div>' +
        (hiddenKbs || hiddenDocs ? '<div class="filtered-note">' + icon('lock') +
          '按密级过滤：另有 <b>' + hiddenKbs + '</b> 个知识库、<b>' + hiddenDocs + '</b> 篇文档高于你的账号密级（' + level.name + '级），未在当前页面展示。' +
        '</div>' : '') +
      '</div>';
    paintKbGrid();
  }

  function paintKbGrid() {
    const grid = $('#kb-grid');
    if (!grid) return;
    const query = state.kbQuery.trim().toLowerCase();
    let list = visibleKbs();
    if (state.kbTab === 'mine') list = list.filter((kb) => kb.mine);
    if (state.kbTab === 'view') list = list.filter((kb) => !kb.canEdit);
    if (query) {
      list = list.filter((kb) => (kb.name + kb.desc + kb.owner).toLowerCase().includes(query));
    }
    grid.innerHTML = list.map((kb, index) => {
      const docs = visibleDocs(kb);
      const hidden = kb.docs.length - docs.length;
      const tone = ['tone-amber', 'tone-blue', 'tone-emerald', 'tone-violet'][index % 4];
      return '<button type="button" class="kb-card" data-open-kb="' + kb.id + '">' +
        '<span class="kb-card-top"><span class="kb-ico ' + tone + '">' + icon('book') + '</span>' + levelBadge(kb.level) + '</span>' +
        '<h3>' + esc(kb.name) + '</h3>' +
        '<p>' + esc(kb.desc) + '</p>' +
        '<span class="kb-meta">' +
          '<span>' + icon('file') + docs.length + ' 篇文档' + (hidden ? '（' + hidden + ' 篇受限）' : '') + '</span>' +
          '<span>' + icon('clock') + '更新 ' + esc(kb.updated) + '</span>' +
        '</span>' +
        '<span class="kb-card-foot">' + permBadge(kb) +
          '<span class="kb-owner">' + esc(kb.owner) + '</span>' +
          '<span class="kb-enter">进入' + icon('chevron-right') + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
    const count = $('#kb-result-count');
    if (count) count.textContent = '共 ' + list.length + ' 个知识库';
    const empty = $('#kb-empty');
    if (empty) {
      if (!list.length) {
        empty.hidden = false;
        empty.innerHTML = '<div class="empty-state"><span class="empty-ico">' + icon('book') + '</span><h3>没有找到知识库</h3><p>' + (query ? '换个关键词试试，或新建一个知识库。' : '你还没有可访问的知识库，可以新建一个。') + '</p></div>';
      } else empty.hidden = true;
    }
  }

  function openKb(id) {
    const kb = findKb(id);
    if (!kb) return;
    if (!Store.canSee(state.user.level, kb.level)) {
      toast('该知识库密级高于你的账号密级，无法访问');
      return;
    }
    state.kbDetail = id;
    state.kbFolder = 'all';
    state.kbDocQuery = '';
    state.kbDocStatus = 'all';
    navigate('knowledge');
  }

  function renderKbDetail() {
    const kb = findKb(state.kbDetail);
    if (!kb) { state.kbDetail = null; renderKnowledge(); return; }
    if (!Store.canSee(state.user.level, kb.level)) {
      state.kbDetail = null;
      renderKnowledge();
      toast('该知识库密级高于你的账号密级');
      return;
    }
    const docs = visibleDocs(kb);
    const hiddenDocs = kb.docs.length - docs.length;
    const governed = docs.filter((doc) => doc.governed).length;
    const pending = docs.length - governed;
    const tone = 'tone-amber';
    const selectedFolder = state.kbFolder === 'all' ? null : kb.folders.find((folder) => folder.id === state.kbFolder);
    const title = selectedFolder ? selectedFolder.name : '全部文档';
    const currentDocs = folderVisibleDocs(kb, state.kbFolder);
    let tree = '<button type="button" class="tree-row' + (state.kbFolder === 'all' ? ' is-active' : '') + '" data-kbfolder="all">' +
      icon('layers') + '<span class="tree-label">全部文档</span><span class="tree-count">' + docs.length + '</span></button>';
    const walk = (parent, depth) => {
      kb.folders.filter((folder) => folder.parent === parent).forEach((folder) => {
        const count = Store.visible(folderDocs(kb, folder.id), state.user.level).length;
        tree += '<button type="button" class="tree-row' + (state.kbFolder === folder.id ? ' is-active' : '') + '" data-kbfolder="' + folder.id + '" style="padding-left:' + (8 + depth * 16) + 'px">' +
          icon('folder') + '<span class="tree-label">' + esc(folder.name) + '</span><span class="tree-count">' + count + '</span></button>';
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 1);
    $('#knowledge-root').innerHTML =
      '<div class="page">' +
        '<button type="button" class="back-link" data-action="kb-back">' + icon('arrow-left') + '返回知识库</button>' +
        '<div class="detail-head">' +
          '<div class="detail-title">' +
            '<span class="kb-ico ' + tone + '">' + icon('book') + '</span>' +
            '<div>' +
              '<h1>' + esc(kb.name) + '</h1>' +
              '<p>' + esc(kb.desc) + '</p>' +
              '<div class="detail-meta">' + levelBadge(kb.level) + permBadge(kb) +
                '<span>' + icon('user') + esc(kb.owner) + ' · ' + esc(kb.dept) + '</span>' +
                '<span>' + icon('clock') + '更新于 ' + esc(kb.updated) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="detail-actions">' +
            '<button type="button" class="btn" data-action="new-folder" ' + (kb.canEdit ? '' : 'disabled title="你对该知识库只有查看权限"') + '>' +
              icon(kb.canEdit ? 'folder-plus' : 'lock') + '新建目录</button>' +
            '<button type="button" class="btn btn-soft" disabled title="文档由管理端上传，客户端仅消费">' + icon('info') + '文档由管理端维护</button>' +
          '</div>' +
        '</div>' +
        '<div class="detail-stats">' +
          '<div class="stat-box"><b>' + docs.length + '</b><span>可见文档</span></div>' +
          '<div class="stat-box is-ok"><b>' + governed + '</b><span>已智能治理</span></div>' +
          '<div class="stat-box is-warn"><b>' + pending + '</b><span>待治理</span></div>' +
          '<div class="stat-box"><b>' + kb.folders.length + '</b><span>目录层级</span></div>' +
        '</div>' +
        (kb.canEdit ? '' : '<div class="readonly-banner">' + icon('lock') + '你对本知识库只有查看权限。目录与文档由 <b>' + esc(kb.owner) + '</b> 维护，待治理文档需管理员处理。</div>') +
        (hiddenDocs ? '<div class="filtered-note" style="margin:-4px 0 14px">' + icon('shield') + '另有 <b>' + hiddenDocs + '</b> 篇文档高于你的账号密级，未展示。</div>' : '') +
        '<div class="detail-layout">' +
          '<aside class="tree-card">' +
            '<div class="tree-head"><span>目录结构</span>' +
              (kb.canEdit ? '<button type="button" class="mini-btn" data-action="new-folder" aria-label="新建目录">' + icon('plus') + '</button>' : '') +
            '</div>' +
            '<div class="kb-tree">' + tree + '</div>' +
          '</aside>' +
          '<section class="docs-card">' +
            '<div class="docs-toolbar">' +
              '<div><h2>' + esc(title) + ' <span id="doc-count-label" class="muted">' + currentDocs.length + ' 篇</span></h2><p>' + (kb.canEdit ? '可执行智能治理，治理后即可被智能体稳定引用' : '只读视图 · 智能治理由知识库管理员执行') + '</p></div>' +
              '<div class="status-tabs" id="doc-status-tabs">' +
                '<button type="button" class="status-tab' + (state.kbDocStatus === 'all' ? ' is-active' : '') + '" data-docstatus="all">全部</button>' +
                '<button type="button" class="status-tab' + (state.kbDocStatus === 'pending' ? ' is-active' : '') + '" data-docstatus="pending">待治理</button>' +
                '<button type="button" class="status-tab' + (state.kbDocStatus === 'done' ? ' is-active' : '') + '" data-docstatus="done">已治理</button>' +
              '</div>' +
              '<label class="search-field">' + icon('search') + '<input type="search" id="doc-search" placeholder="搜索文档" value="' + esc(state.kbDocQuery) + '" spellcheck="false"></label>' +
            '</div>' +
            '<div class="table-wrap"><table class="data-table"><thead><tr><th>文档名称</th><th>密级</th><th>智能治理</th><th>更新时间</th><th>操作</th></tr></thead><tbody id="doc-tbody"></tbody></table></div>' +
            '<div class="table-empty" id="doc-empty" hidden>没有符合条件的文档</div>' +
          '</section>' +
        '</div>' +
      '</div>';
    paintDocRows();
    const statusTabs = $('#doc-status-tabs');
    if (statusTabs) {
      statusTabs.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-docstatus]');
        if (!tab) return;
        state.kbDocStatus = tab.dataset.docstatus;
        $('[data-docstatus]', statusTabs).forEach((item) => item.classList.toggle('is-active', item === tab));
        paintDocRows();
      });
    }
  }

  function paintDocRows() {
    const kb = findKb(state.kbDetail);
    const tbody = $('#doc-tbody');
    if (!kb || !tbody) return;
    let docs = folderVisibleDocs(kb, state.kbFolder);
    const query = state.kbDocQuery.trim().toLowerCase();
    if (query) docs = docs.filter((doc) => doc.name.toLowerCase().includes(query));
    if (state.kbDocStatus === 'pending') docs = docs.filter((doc) => !doc.governed);
    if (state.kbDocStatus === 'done') docs = docs.filter((doc) => doc.governed);
    tbody.innerHTML = docs.map((doc) =>
      '<tr>' +
        '<td><button type="button" class="doc-name" data-preview-doc="' + doc.id + '">' + fileIco(doc.ext) +
          '<span class="doc-name-copy"><b>' + esc(doc.name) + '</b><small>' + esc(doc.size) + ' · ' + esc(doc.owner) + '</small></span></button></td>' +
        '<td>' + levelBadge(doc.level) + '</td>' +
        '<td>' + (doc.governed
          ? '<span class="gov-status is-done">' + icon('check-circle') + '已治理</span>'
          : (kb.canEdit
            ? '<button type="button" class="gov-btn" data-govern="' + doc.id + '">' + icon('sparkles') + '智能治理</button>'
            : '<span class="gov-status is-wait" title="仅知识库管理员可执行">' + icon('lock') + '待治理</span>')) + '</td>' +
        '<td class="muted">' + esc(doc.updated) + '</td>' +
        '<td><div class="row-actions"><button type="button" class="row-btn" data-preview-doc="' + doc.id + '">' + icon('eye') + '预览</button></div></td>' +
      '</tr>'
    ).join('');
    const label = $('#doc-count-label');
    if (label) label.textContent = docs.length + ' 篇';
    const empty = $('#doc-empty');
    if (empty) empty.hidden = docs.length > 0;
  }

  function goGovern(docId, button) {
    const kb = findKb(state.kbDetail);
    if (!kb) return;
    if (!kb.canEdit) { toast('你对该知识库只有查看权限'); return; }
    const doc = kb.docs.find((item) => item.id === docId);
    if (!doc || doc.governed) return;
    button.classList.add('is-loading');
    button.innerHTML = icon('refresh') + '治理中…';
    setTimeout(() => {
      doc.governed = true;
      kb.updated = today();
      Store.save();
      renderKbDetail();
      toast('《' + doc.name + '》已完成智能治理，可被智能体引用');
    }, 1100);
  }

  /* ============================== 新建知识库 / 目录 ============================== */
  function openNewKbDialog() {
    const form = $('#new-kb-form');
    form.reset();
    populateSelects();
    openDialog($('#new-kb-dialog'));
    setTimeout(() => fieldOf(form, 'name').focus(), 60);
  }

  function folderOptionsHtml(folders, selected, parentId, depth) {
    const level = depth || 0;
    return folders.filter((folder) => folder.parent === (parentId || null)).map((folder) =>
      '<option value="' + folder.id + '"' + (selected === folder.id ? ' selected' : '') + '>' +
        new Array(level + 1).join('　') + esc(folder.name) + '</option>' +
        folderOptionsHtml(folders, selected, folder.id, level + 1)
    ).join('');
  }

  function openNewFolderDialog(type) {
    if (type === 'kb') {
      const kb = findKb(state.kbDetail);
      if (!kb) return;
      if (!kb.canEdit) { toast('你对该知识库只有查看权限'); return; }
      state.folderContext = { type: 'kb', kbId: kb.id };
      $('#new-folder-sub').textContent = '在《' + kb.name + '》中创建目录，可继续添加子目录。';
      $('#new-folder-parent').innerHTML = '<option value="">根目录</option>' + folderOptionsHtml(kb.folders, state.kbFolder !== 'all' ? state.kbFolder : '', null, 0);
    } else {
      state.folderContext = { type: 'tpl' };
      $('#new-folder-sub').textContent = '文档模板按目录层级组织，创建后可上传 Word / Excel 模板。';
      const editable = DB.templateFolders.filter((folder) => folder.canEdit);
      $('#new-folder-parent').innerHTML = '<option value="">根目录</option>' + folderOptionsHtml(editable, state.tplFolder !== 'all' ? state.tplFolder : '', null, 0);
    }
    const form = $('#new-folder-form');
    form.reset();
    delete form.dataset.created;
    if (type === 'kb') {
      const kb = findKb(state.kbDetail);
      if (kb && state.kbFolder !== 'all') $('#new-folder-parent').value = state.kbFolder;
    }
    openDialog($('#new-folder-dialog'));
    setTimeout(() => fieldOf(form, 'name').focus(), 60);
  }

  /* ============================== 文档模板选择器 ============================== */
  function prepareTemplatePickerMeta() {
    const meta = new Map();
    const visible = visibleTemplates();
    const addFolder = (folder, parentKey) => {
      const key = 'tplfolder:' + folder.id;
      const childKeys = [];
      DB.templateFolders.filter((item) => item.parent === folder.id).forEach((child) => {
        childKeys.push.apply(childKeys, addFolder(child, key));
      });
      visible.filter((item) => item.folder === folder.id).forEach((template) => {
        const tplKey = 'tpl:' + template.id;
        meta.set(tplKey, {
          key: tplKey, kind: 'tpl', name: template.name, level: template.level,
          parentKey: key, descendants: [], ext: template.ext,
          path: [folder.name, template.name].join(' / ')
        });
        childKeys.push(tplKey);
      });
      meta.set(key, {
        key: key, kind: 'tplfolder', name: folder.name, level: 'L1',
        parentKey: parentKey, descendants: childKeys.slice(), path: folder.name
      });
      return [key].concat(childKeys);
    };
    DB.templateFolders.filter((folder) => !folder.parent).forEach((folder) => addFolder(folder, null));
    return meta;
  }

  function templateIncludedIds(query) {
    const visible = visibleTemplates();
    if (!query) return new Set(visible.map((item) => item.id));
    return new Set(visible.filter((template) => {
      if (template.name.toLowerCase().includes(query)) return true;
      return Store.folderTrail(DB.templateFolders, template.folder).some((folder) => folder.name.toLowerCase().includes(query));
    }).map((item) => item.id));
  }

  function openTemplatePicker(context) {
    if (!state.user) return;
    state.pickerContext = context === 'docflow' ? 'docflow' : 'attach';
    state.picker = {
      type: 'tpl', selected: new Set(),
      expanded: new Set(DB.templateFolders.filter((folder) => !folder.parent).map((folder) => 'tplfolder:' + folder.id)),
      query: ''
    };
    state.pickerMeta = prepareTemplatePickerMeta();
    $('#template-picker-search').value = '';
    $('#template-picker-title').textContent = state.pickerContext === 'docflow' ? '选择要使用的模板' : '选择文档模板';
    $('#template-picker-sub').textContent = state.pickerContext === 'docflow'
      ? '选中一个模板后点击「使用该模板」，AI 将按该模板解析字段并自动填写。'
      : '支持选择整个目录或单个模板，使用时自动带入标准格式。';
    const confirm = $('#template-picker-confirm');
    if (confirm) confirm.textContent = state.pickerContext === 'docflow' ? '使用该模板' : '确定';
    renderTemplatePicker();
    openDialog(dom.tplPicker);
    setTimeout(() => { const input = $('#template-picker-search'); if (input) input.focus(); }, 80);
  }

  function renderTemplatePicker() {
    if (!state.picker || state.picker.type !== 'tpl') return;
    const query = state.picker.query.trim().toLowerCase();
    const included = templateIncludedIds(query);
    const visible = visibleTemplates().filter((item) => included.has(item.id));
    const parts = ['<div class="picker-note">' + icon('shield') + '仅展示你有权使用的模板目录与模板文件，可按目录或单个模板勾选。</div>'];
    let rendered = 0;
    const folderHas = (folder) => {
      const ids = new Set([folder.id].concat(Store.descendants(DB.templateFolders, folder.id).map((item) => item.id)));
      return visible.some((item) => ids.has(item.folder));
    };
    const addFolder = (folder, depth, target) => {
      if (!folderHas(folder)) return;
      const key = 'tplfolder:' + folder.id;
      const childHtml = [];
      DB.templateFolders.filter((item) => item.parent === folder.id).forEach((child) => addFolder(child, depth + 1, childHtml));
      visible.filter((item) => item.folder === folder.id).forEach((template) => {
        childHtml.push(pickerRow({ key: 'tpl:' + template.id, depth: depth + 1, name: template.name, kind: 'tpl', level: template.level }));
      });
      const ids = new Set([folder.id].concat(Store.descendants(DB.templateFolders, folder.id).map((item) => item.id)));
      const count = visible.filter((item) => ids.has(item.folder)).length;
      target.push(pickerRow({
        key: key, depth: depth, name: folder.name, kind: 'tplfolder',
        count: count + ' 个', hasChildren: childHtml.length > 0
      }));
      if ((state.picker.expanded.has(key) || !!query) && childHtml.length) {
        target.push('<div>' + childHtml.join('') + '</div>');
      }
      rendered += 1;
    };
    DB.templateFolders.filter((folder) => !folder.parent).forEach((folder) => addFolder(folder, 0, parts));
    dom.tplTree.innerHTML = rendered ? parts.join('') : parts.join('') + '<div class="picker-empty">没有匹配的模板</div>';
    updatePickerCount();
  }

  function confirmTemplatePicker() {
    if (state.pickerContext === 'docflow') {
      applyPickedFlowTemplate();
      return;
    }
    const keys = pickerMaximalKeys();
    let added = 0;
    keys.forEach((key) => {
      const meta = state.pickerMeta.get(key);
      if (!meta) return;
      const item = {
        key: key, kind: meta.kind === 'tplfolder' ? 'tplfolder' : 'template',
        name: meta.name, level: meta.level,
        meta: meta.kind === 'tplfolder' ? '模板目录' : '模板',
        path: meta.path, ext: meta.ext
      };
      if (addAttachment(item)) added += 1;
    });
    closeDialog(dom.tplPicker);
    if (added) toast('已添加 ' + added + ' 个文档模板');
    else if (keys.length) toast('所选模板已在引用中');
    syncSend();
  }

  /* ============================== 文档模板页面 ============================== */
  function renderTemplates() {
    if (!state.user) return;
    const visible = visibleTemplates();
    const hidden = DB.templates.length - visible.length;
    const level = Store.level(state.user.level);
    const selected = state.tplFolder === 'all' ? null : DB.templateFolders.find((folder) => folder.id === state.tplFolder);
    if (state.tplFolder !== 'all' && !selected) state.tplFolder = 'all';
    const canEdit = state.tplFolder === 'all' ? true : !!(selected && selected.canEdit);
    const currentList = templatesInFolder(state.tplFolder);
    const folderHas = (folder) => {
      const ids = new Set([folder.id].concat(Store.descendants(DB.templateFolders, folder.id).map((item) => item.id)));
      return visible.some((item) => ids.has(item.folder));
    };
    let tree = '<button type="button" class="tree-row' + (state.tplFolder === 'all' ? ' is-active' : '') + '" data-tplfolder="all">' +
      icon('layers') + '<span class="tree-label">全部模板</span><span class="tree-count">' + visible.length + '</span></button>';
    const walk = (parent, depth) => {
      DB.templateFolders.filter((folder) => folder.parent === parent).forEach((folder) => {
        if (!folderHas(folder) && !folder.canEdit) return;
        const count = templatesInFolder(folder.id).length;
        tree += '<button type="button" class="tree-row' + (state.tplFolder === folder.id ? ' is-active' : '') + '" data-tplfolder="' + folder.id + '" style="padding-left:' + (8 + depth * 16) + 'px">' +
          icon('folder') + '<span class="tree-label">' + esc(folder.name) + '</span>' +
          (folder.canEdit ? '' : icon('lock', 'lock-ico')) +
          '<span class="tree-count">' + count + '</span></button>';
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 1);
    $('#templates-root').innerHTML =
      '<div class="page">' +
        '<div class="page-head">' +
          '<div>' +
            '<div class="page-kicker">DOCUMENT TEMPLATE</div>' +
            '<h1>文档模板</h1>' +
            '<p>按目录层级管理标准模板。你可以使用全部可见模板，仅能编辑有权限的目录与模板。</p>' +
          '</div>' +
          '<div class="page-actions">' +
            '<label class="search-field">' + icon('search') + '<input type="search" id="tpl-search" placeholder="搜索模板" value="' + esc(state.tplQuery) + '" spellcheck="false"></label>' +
            '<button type="button" class="btn" data-action="tpl-new-folder" ' + (canEdit ? '' : 'disabled title="当前目录只读"') + '>' + icon('folder-plus') + '新建目录</button>' +
            '<button type="button" class="btn btn-primary" data-action="new-template" ' + (canEdit ? '' : 'disabled title="当前目录只读"') + '>' + icon('upload') + '新建模板</button>' +
          '</div>' +
        '</div>' +
        '<div class="tpl-layout">' +
          '<aside class="tree-card">' +
            '<div class="tpl-side-head"><span>目录层级</span><span class="clearance-inline">' + icon('shield') + level.name + '级</span></div>' +
            '<div class="tpl-tree" id="tpl-tree">' + tree + '</div>' +
          '</aside>' +
          '<section class="docs-card">' +
            '<div class="docs-toolbar">' +
              '<div><h2>' + esc(selected ? selected.name : '全部模板') + ' <span id="tpl-count-label" class="muted">' + currentList.length + ' 个</span></h2><p>' + (canEdit ? '可预览模板，或直接带入对话使用' : '只读目录 · 可预览与使用，不能编辑') + '</p></div>' +
              '<span class="toolbar-spacer"></span>' +
              '<span class="clearance-inline">' + icon('info') + '模板名称默认使用文件名</span>' +
            '</div>' +
            (canEdit ? '' : '<div class="tpl-info">' + icon('lock') + '目录「' + esc(selected ? selected.name : '') + '」由 ' + esc(selected ? selected.owner : '管理员') + ' 维护，你只有查看权限。</div>') +
            '<div class="table-wrap"><table class="data-table"><thead><tr><th>模板名称</th><th>格式</th><th>密级</th><th>更新时间</th><th>操作</th></tr></thead><tbody id="tpl-tbody"></tbody></table></div>' +
            '<div class="table-empty" id="tpl-empty" hidden>没有符合条件的模板</div>' +
          '</section>' +
        '</div>' +
        (hidden ? '<div class="filtered-note">' + icon('shield') + '另有 <b>' + hidden + '</b> 个模板高于你的账号密级（' + level.name + '级），未展示。</div>' : '') +
      '</div>';
    paintTplRows();
  }

  function paintTplRows() {
    const tbody = $('#tpl-tbody');
    if (!tbody) return;
    let list = templatesInFolder(state.tplFolder);
    const query = state.tplQuery.trim().toLowerCase();
    if (query) list = list.filter((item) => item.name.toLowerCase().includes(query));
    tbody.innerHTML = list.map((item) => {
      const folder = DB.templateFolders.find((entry) => entry.id === item.folder);
      const canEdit = !!(folder && folder.canEdit);
      return '<tr>' +
        '<td><button type="button" class="doc-name" data-preview-tpl="' + item.id + '">' + fileIco(item.ext) +
          '<span class="doc-name-copy"><b>' + esc(item.name) + '</b><small>' + esc(item.size) + ' · ' + esc(item.owner) + '</small></span></button></td>' +
        '<td>' + esc(item.ext.toUpperCase()) + '</td>' +
        '<td>' + levelBadge(item.level) + '</td>' +
        '<td class="muted">' + esc(item.updated) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="row-btn" data-preview-tpl="' + item.id + '">' + icon('eye') + '预览</button>' +
          '<button type="button" class="row-btn" data-use-tpl="' + item.id + '">' + icon('sparkles') + '使用</button>' +
          (canEdit ? '<button type="button" class="row-btn" data-action="edit-template" data-id="' + item.id + '">' + icon('edit') + '编辑</button>' :
            '<span class="row-btn" title="该模板所在目录只有查看权限" style="opacity:.55">' + icon('lock') + '只读</span>') +
        '</div></td>' +
      '</tr>';
    }).join('');
    const label = $('#tpl-count-label');
    if (label) label.textContent = list.length + ' 个';
    const empty = $('#tpl-empty');
    if (empty) empty.hidden = list.length > 0;
  }

  function useTemplate(id) {
    const template = findTemplate(id);
    if (!template) return;
    if (!Store.canSee(state.user.level, template.level)) { toast('该模板密级高于你的账号密级'); return; }
    const added = addAttachment({
      key: 'template:' + template.id, kind: 'template', name: template.name,
      level: template.level, meta: '模板', ext: template.ext
    });
    navigate('home');
    toast(added ? '已添加模板：' + template.name : '该模板已在输入框引用中');
    setTimeout(() => dom.prompt.focus(), 80);
  }

  function usePreviewTemplate() {
    if (!state.preview || state.preview.type !== 'template') return;
    const item = state.preview.item;
    closeDialog(dom.preview);
    useTemplate(item.id);
  }

  function openNewTemplateDialog(editId) {
    const form = $('#new-template-form');
    const editing = editId ? findTemplate(editId) : null;
    state.templateEditId = editing ? editing.id : null;
    form.reset();
    state.uploadFile = null;
    $('#template-file-name').hidden = true;
    $('#template-drop').classList.remove('is-drag');
    $('#template-drop').hidden = !!editing;
    $('#new-template-title').textContent = editing ? '编辑文档模板' : '新建文档模板';
    $('#new-template-sub').textContent = editing
      ? '修改模板名称、分类与数据密级。如需替换文件，请关闭后重新上传。'
      : '上传 Word 或 Excel 模板，保存后会在客户端模板库中展示。';
    const editable = DB.templateFolders.filter((folder) => folder.canEdit);
    const fallback = DB.templateFolders.some((folder) => folder.id === 'tf0') ? 'tf0' : '';
    const selected = editing ? (editing.folder || fallback) :
      (state.tplFolder !== 'all' && DB.templateFolders.some((folder) => folder.id === state.tplFolder && folder.canEdit) ? state.tplFolder : fallback);
    $('#new-template-folder').innerHTML = '<option value="' + fallback + '">未分类</option>' + folderOptionsHtml(editable.filter((folder) => folder.id !== fallback), selected, null, 0);
    $('#new-template-level').innerHTML = levelOptions(editing ? editing.level : 'L2');
    if (editing) {
      fieldOf(form, 'name').value = editing.name;
      fieldOf(form, 'folder').value = editing.folder || (DB.templateFolders.some((folder) => folder.id === 'tf0') ? 'tf0' : '');
      fieldOf(form, 'level').value = editing.level;
    }
    openDialog($('#new-template-dialog'));
    setTimeout(() => fieldOf(form, 'name').focus(), 60);
  }

  /* ============================== 技能页面 ============================== */
  function visibleSkills() {
    return (DB.skills || []).filter((item) => item.status === '启用' && Store.canSee(state.user.level, item.level));
  }
  function skillFolderOf(skill) {
    return (DB.skillFolders || []).find((folder) => folder.id === (skill && skill.folder)) || null;
  }
  function skillTrail(skill) {
    const folder = skillFolderOf(skill);
    return folder ? Store.folderTrail(DB.skillFolders, folder.id) : [];
  }
  function skillPathText(skill) {
    const trail = skillTrail(skill);
    return trail.length ? trail.map((item) => item.name).join(' / ') : '未分类';
  }
  function skillFolderIds(folderId) {
    if (folderId === 'all') return null;
    return new Set([folderId].concat(Store.descendants(DB.skillFolders, folderId).map((folder) => folder.id)));
  }
  function skillsInSkillFolder(folderId, list) {
    const source = list || visibleSkills();
    const ids = skillFolderIds(folderId);
    return ids ? source.filter((item) => ids.has(item.folder)) : source;
  }
  function skillTone(name) {
    const tones = ['tone-blue', 'tone-amber', 'tone-emerald', 'tone-violet'];
    let sum = 0;
    for (let index = 0; index < String(name || '').length; index += 1) sum += name.charCodeAt(index);
    return tones[sum % tones.length];
  }
  function sortSkills(list) {
    return list.slice().sort((a, b) => (Number(!!b.featured) - Number(!!a.featured)) || (b.runs || 0) - (a.runs || 0));
  }

  function skillAddButton(skill, extraClass) {
    const added = state.attachments.some((item) => item.key === 'skill:' + skill.id);
    return '<button type="button" class="skill-add-btn' + (added ? ' is-added' : '') + (extraClass ? ' ' + extraClass : '') + '" data-skill-add-id="' + skill.id + '" title="' +
      (added ? '已添加到当前会话' : '添加到当前会话') + '" aria-label="' + (added ? '移除 ' : '添加 ') + esc(skill.name) + '">' +
      icon(added ? 'check' : 'plus') + '</button>';
  }

  function renderSkillsPage() {
    if (!state.user) return;
    const all = visibleSkills();
    const everySkill = DB.skills || [];
    const hiddenLevel = everySkill.filter((item) => !Store.canSee(state.user.level, item.level)).length;
    const disabled = everySkill.filter((item) => Store.canSee(state.user.level, item.level) && item.status !== '启用').length;
    const navCount = $('#nav-skill-count');
    if (navCount) navCount.textContent = all.length;
    const level = Store.level(state.user.level);

    if (state.skillFolder !== 'all' && !(DB.skillFolders || []).some((folder) => folder.id === state.skillFolder)) {
      state.skillFolder = 'all';
    }
    const active = state.skillFolder === 'all' ? null : (DB.skillFolders || []).find((folder) => folder.id === state.skillFolder);
    const activeTop = active ? (active.parent ? (DB.skillFolders || []).find((folder) => folder.id === active.parent) : active) : null;
    const topFolders = (DB.skillFolders || []).filter((folder) => !folder.parent && folder.id !== 'sf0');
    const children = activeTop ? (DB.skillFolders || []).filter((folder) => folder.parent === activeTop.id) : [];

    const dirTabs = '<button type="button" class="skill-dir-tab' + (!activeTop ? ' is-active' : '') + '" data-skf="all">全部</button>' +
      topFolders.map((folder) =>
        '<button type="button" class="skill-dir-tab' + (activeTop && activeTop.id === folder.id ? ' is-active' : '') + '" data-skf="' + folder.id + '">' +
          esc(folder.name) + '<span>' + skillsInSkillFolder(folder.id, all).length + '</span>' +
        '</button>'
      ).join('');
    const subTabs = children.length
      ? '<div class="skill-subdirs">' +
          '<button type="button" class="skill-subdir' + (active && active.id === activeTop.id ? ' is-active' : '') + '" data-skf="' + activeTop.id + '">全部</button>' +
          children.map((folder) =>
            '<button type="button" class="skill-subdir' + (active && active.id === folder.id ? ' is-active' : '') + '" data-skf="' + folder.id + '">' +
              esc(folder.name) + '</button>'
          ).join('') +
        '</div>'
      : '';

    $('#skills-root').innerHTML =
      '<div class="page skill-page">' +
        '<div class="page-head">' +
          '<div>' +
            '<div class="page-kicker">SKILL CENTER</div>' +
            '<h1>技能</h1>' +
            '<p>这里展示管理端预集成并授权给你的专业技能。点击卡片右上角的「+」即可带入当前会话，也可以上传或创建自己的技能。</p>' +
          '</div>' +
          '<div class="page-actions">' +
            '<label class="search-field">' + icon('search') + '<input type="search" id="skill-search" placeholder="搜索技能、目录" value="' + esc(state.skillQuery) + '" spellcheck="false"></label>' +
            '<span class="skill-integrated">' + icon('check-circle') + '已集成 <b>' + all.length + '</b></span>' +
            '<div class="add-skill-wrap">' +
              '<button type="button" id="skill-add-btn" class="btn btn-primary" data-action="toggle-skill-add" aria-haspopup="menu" aria-expanded="false">' +
                icon('plus') + '添加技能' + icon('chevron-down', 'tiny') +
              '</button>' +
              '<div class="add-skill-menu" id="skill-add-menu" role="menu" hidden>' +
                '<button type="button" role="menuitem" data-skill-add="upload">' + icon('upload') + '上传技能</button>' +
                '<button type="button" role="menuitem" data-skill-add="create">' + icon('sparkles') + '创建技能</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<section class="skill-market" id="skill-market">' +
          '<div class="skill-section-head">' +
            '<div><h2>推荐</h2><p>全部由管理端预集成，按目录与密级开放</p></div>' +
          '</div>' +
          '<div class="skill-dirs">' + dirTabs + '</div>' +
          subTabs +
          '<div class="skill-grid" id="skill-grid"></div>' +
          '<div id="skill-empty" hidden></div>' +
        '</section>' +

        (hiddenLevel || disabled
          ? '<div class="filtered-note">' + icon('shield') +
              '按密级与状态过滤：另有 <b>' + hiddenLevel + '</b> 个技能高于你的账号密级（' + level.name + '级）' +
              (disabled ? '、<b>' + disabled + '</b> 个技能已停用' : '') + '，未在当前页面展示。' +
            '</div>'
          : '') +
      '</div>';
    paintSkillCards();
  }

  function paintSkillCards() {
    const grid = $('#skill-grid');
    if (!grid) return;
    const query = state.skillQuery.trim().toLowerCase();
    let list = skillsInSkillFolder(state.skillFolder);
    if (query) {
      list = list.filter((item) => (item.name + ' ' + (item.desc || '') + ' ' + skillPathText(item)).toLowerCase().includes(query));
    }
    list = sortSkills(list);
    grid.innerHTML = list.map((skill) => {
      const folder = skillFolderOf(skill);
      return '<article class="skill-card">' +
        '<div class="skill-card-top">' +
          '<span class="skill-ico ' + skillTone(skill.name) + '">' + esc(String(skill.name || '').slice(0, 1)) + '</span>' +
          skillAddButton(skill) +
        '</div>' +
        '<h3>' + esc(skill.name) + (skill.local ? '<span class="skill-local">本地</span>' : '') + '</h3>' +
        '<p>' + esc(skill.desc || '') + '</p>' +
        '<div class="skill-card-meta">' +
          '<span>' + icon('sparkles') + Number(skill.runs || 0).toLocaleString('zh-CN') + ' 次</span>' +
          '<span>v' + esc(skill.version) + '</span>' +
        '</div>' +
        '<div class="skill-card-foot">' +
          '<span class="skill-dir" title="' + esc(skillPathText(skill)) + '">' + icon('folder') + esc(folder ? folder.name : '未分类') + '</span>' +
          levelBadge(skill.level) +
        '</div>' +
      '</article>';
    }).join('');
    const empty = $('#skill-empty');
    if (empty) {
      if (!list.length) {
        empty.hidden = false;
        empty.innerHTML = '<div class="empty-state"><span class="empty-ico">' + icon('sparkles') + '</span>' +
          '<h3>没有找到技能</h3>' +
          '<p>' + (query ? '换个关键词，或切换到其他目录看看。' : '该目录下暂无技能，可以上传或创建技能。') + '</p></div>';
      } else {
        empty.hidden = true;
      }
    }
  }

  function openSkillMenu() {
    const menu = $('#skill-add-menu');
    if (!menu) return;
    state.skillMenuOpen = true;
    menu.hidden = false;
    const btn = $('#skill-add-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
  function closeSkillMenu() {
    state.skillMenuOpen = false;
    const menu = $('#skill-add-menu');
    if (menu) menu.hidden = true;
    const btn = $('#skill-add-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  function toggleSkillMenu() {
    if (state.skillMenuOpen) closeSkillMenu();
    else openSkillMenu();
  }

  function pickSkillPackage() {
    closeSkillMenu();
    const input = $('#skill-pkg-input');
    if (input) input.click();
  }

  function installSkillPackage(file) {
    if (!file) return;
    const ext = extOf(file.name);
    if (!['zip', 'skill'].includes(ext)) {
      toast('技能包仅支持 .zip / .skill 格式');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast('单个技能包不超过 200 MB');
      return;
    }
    const base = String(file.name).replace(/\.(zip|skill)$/i, '').replace(/[\s._-]*v?\d+(?:\.\d+){1,3}$/i, '').trim();
    const matched = String(file.name).match(/v?(\d+(?:\.\d+){1,3})(?=\.(?:zip|skill)$)/i);
    const name = base || '本地技能';
    DB.skills.push({
      id: 'skill-local-' + Date.now(),
      name: name,
      folder: 'sf0',
      category: '未分类',
      level: state.user.level,
      version: matched ? matched[1] : '1.0.0',
      status: '启用',
      desc: '本机上传的技能包，仅在当前设备可用',
      runs: 0,
      local: true,
      pkg: { name: file.name, size: formatSize(file.size), uploaded: today() + ' ' + nowTime() }
    });
    Store.save();
    state.skillFolder = 'sf0';
    state.skillQuery = '';
    renderSkillsPage();
    toast('技能包已安装：' + name + '（本地技能）');
  }

  function createSkillWithAgent() {
    closeSkillMenu();
    if (!state.attachments.some((item) => item.key === 'skill:skill-creator')) {
      addAttachment({
        key: 'skill:skill-creator', kind: 'skill', name: 'skill-creator',
        level: 'L1', meta: '技能', path: '内置技能 · 创建技能'
      });
    }
    navigate('home');
    setPrompt('请帮我创建一个可以实现「……」的 skill', true);
    toast('已进入创建技能模式，补全「……」后发送即可');
  }

  function addSkillFromPage(id) {
    const skill = (DB.skills || []).find((item) => item.id === id);
    if (!skill) return;
    if (!Store.canSee(state.user.level, skill.level)) {
      toast('该技能密级高于你的账号密级');
      return;
    }
    const key = 'skill:' + skill.id;
    const added = !state.attachments.some((item) => item.key === key);
    toggleAttachment({ key: key, kind: 'skill', name: skill.name, level: skill.level, meta: '技能', path: skillPathText(skill) });
    toast(added ? '已添加技能：' + skill.name : '已移除技能：' + skill.name);
    $$('[data-skill-add-id="' + id + '"]').forEach((btn) => {
      btn.classList.toggle('is-added', added);
      btn.innerHTML = icon(added ? 'check' : 'plus');
      btn.title = added ? '已添加到当前会话' : '添加到当前会话';
    });
  }

  /* ============================== 连接器页 ============================== */
  /* 分类：与技能目录同构的两级结构，展示方式与技能页保持一致 */
  function connectorFolderOf(item) {
    return (DB.connectorFolders || []).find((folder) => folder.id === (item && item.folder)) || null;
  }
  function connectorPathText(item) {
    const folder = connectorFolderOf(item);
    return folder ? Store.folderTrail(DB.connectorFolders, folder.id).map((node) => node.name).join(' / ') : '未分类';
  }
  function connectorFolderIds(folderId) {
    if (folderId === 'all') return null;
    return new Set([folderId].concat(Store.descendants(DB.connectorFolders, folderId).map((folder) => folder.id)));
  }
  function connectorsInFolder(folderId, list) {
    const source = list || visibleConnectors();
    const ids = connectorFolderIds(folderId);
    return ids ? source.filter((item) => ids.has(item.folder)) : source;
  }

  function connectorAddBtn(item) {
    return '<button type="button" class="conn-add" data-conn-connect="' + item.id + '" title="连接 ' + esc(item.name) + '"' +
      ' aria-label="连接 ' + esc(item.name) + '">' + icon('plus') + '</button>';
  }

  function connectorCardHtml(item) {
    const on = connectorOn(item);
    const configured = connectorConfigured(item);
    const endpoint = String(item.endpoint || '').replace(/^https?:\/\//i, '');
    const path = connectorPathText(item);
    return '<article class="conn-card' + (on ? ' is-on' : '') + (configured && !on ? ' is-off' : '') + '" data-conn-card="' + item.id + '" data-name="' +
      esc((item.name + ' ' + path + ' ' + (item.desc || '') + ' ' + endpoint).toLowerCase()) + '">' +
      '<div class="conn-card-head">' +
        connectorTile(item, 'lg') +
        '<div class="conn-card-copy">' +
          '<h3>' + esc(item.name) + (item.custom ? '<span class="conn-custom">自定义</span>' : '') + '</h3>' +
          '<small title="' + esc(path) + '">' + esc(path) + '</small>' +
        '</div>' +
        (configured ? connectorSwitch(item) : connectorAddBtn(item)) +
      '</div>' +
      '<p>' + esc(item.desc || '暂无说明') + '</p>' +
      '<div class="conn-card-foot">' +
        '<span class="conn-endpoint" title="' + esc(endpoint) + '">' + icon('link') + esc(endpoint || '—') + '</span>' +
        levelBadge(item.level) +
      '</div>' +
    '</article>';
  }

  function renderConnectors() {
    if (!state.user) return;
    const all = visibleConnectors();
    const hidden = (DB.connectors || []).filter((item) => !Store.canSee(state.user.level, item.level)).length;
    const level = Store.level(state.user.level);
    syncConnNav();
    const root = $('#connectors-root');
    if (!root) return;

    if (state.connFolder !== 'all' && !(DB.connectorFolders || []).some((folder) => folder.id === state.connFolder)) {
      state.connFolder = 'all';
    }
    const active = state.connFolder === 'all' ? null : (DB.connectorFolders || []).find((folder) => folder.id === state.connFolder);
    const activeTop = active ? (active.parent ? (DB.connectorFolders || []).find((folder) => folder.id === active.parent) : active) : null;
    const topFolders = (DB.connectorFolders || []).filter((folder) => !folder.parent && folder.id !== 'cf0');
    const children = activeTop ? (DB.connectorFolders || []).filter((folder) => folder.parent === activeTop.id) : [];

    const dirTabs = '<button type="button" class="skill-dir-tab' + (!activeTop ? ' is-active' : '') + '" data-cnf="all">全部<span>' + all.length + '</span></button>' +
      topFolders.map((folder) =>
        '<button type="button" class="skill-dir-tab' + (activeTop && activeTop.id === folder.id ? ' is-active' : '') + '" data-cnf="' + folder.id + '" title="' + esc(folder.desc || folder.name) + '">' +
          esc(folder.name) + '<span>' + connectorsInFolder(folder.id, all).length + '</span>' +
        '</button>'
      ).join('');
    const subTabs = children.length
      ? '<div class="skill-subdirs">' +
          '<button type="button" class="skill-subdir' + (active && active.id === activeTop.id ? ' is-active' : '') + '" data-cnf="' + activeTop.id + '">全部</button>' +
          children.map((folder) =>
            '<button type="button" class="skill-subdir' + (active && active.id === folder.id ? ' is-active' : '') + '" data-cnf="' + folder.id + '" title="' + esc(folder.desc || folder.name) + '">' +
              esc(folder.name) +
            '</button>'
          ).join('') +
        '</div>'
      : '';

    root.innerHTML =
      '<div class="page conn-page">' +
        '<div class="page-head">' +
          '<div>' +
            '<div class="page-kicker">CONNECTOR HUB</div>' +
            '<h1>连接器</h1>' +
            '<p>这里展示管理端预置并授权给你的业务系统连接。开启后可在会话中直接调用，关闭后不再读取任何业务数据；也可以自定义接入内部系统。</p>' +
          '</div>' +
          '<div class="page-actions">' +
            '<label class="search-field">' + icon('search') +
              '<input type="search" id="conn-search" placeholder="搜索连接器、分类" value="' + esc(state.connQuery) + '" spellcheck="false" autocomplete="off">' +
            '</label>' +
            '<span class="conn-summary">' + icon('check-circle') + '已开启 <b id="conn-on-count">' + all.filter(connectorOn).length + '</b> / ' + all.length + '</span>' +
            '<button type="button" class="btn btn-primary" data-action="new-connector">' + icon('plus') + '自定义连接器</button>' +
          '</div>' +
        '</div>' +
        '<section class="conn-market">' +
          '<div class="skill-section-head">' +
            '<div><h2>' + esc(active ? active.name : '全部分类') + '</h2><p>' +
              (active ? '分类路径：' + esc(Store.folderTrail(DB.connectorFolders, active.id).map((folder) => folder.name).join(' / ')) : '全部由管理端预集成，按分类与密级开放') +
            '</p></div>' +
          '</div>' +
          '<div class="skill-dirs conn-dirs">' + dirTabs + '</div>' +
          subTabs +
          '<div class="conn-grid" id="conn-grid"></div>' +
          '<div id="conn-empty" hidden></div>' +
        '</section>' +
        (hidden
          ? '<div class="filtered-note">' + icon('shield') +
              '按密级过滤：另有 <b>' + hidden + '</b> 个连接器高于你的账号密级（' + level.name + '级），未在当前页面展示。' +
            '</div>'
          : '') +
      '</div>';
    paintConnectorCards();
  }

  function paintConnectorCards() {
    const grid = $('#conn-grid');
    if (!grid) return;
    const query = state.connQuery.trim().toLowerCase();
    let list = connectorsInFolder(state.connFolder);
    if (query) {
      list = list.filter((item) => (item.name + ' ' + connectorPathText(item) + ' ' + (item.desc || '') + ' ' + (item.endpoint || '')).toLowerCase().includes(query));
    }
    const groupOf = (item) => (connectorOn(item) ? 0 : (connectorConfigured(item) ? 1 : 2));
    list = list.slice().sort((a, b) => (groupOf(a) - groupOf(b)) || a.name.localeCompare(b.name, 'zh-Hans-CN'));
    grid.innerHTML = list.map(connectorCardHtml).join('');
    const onCount = $('#conn-on-count');
    if (onCount) onCount.textContent = visibleConnectors().filter(connectorOn).length;
    const empty = $('#conn-empty');
    if (empty) {
      if (!list.length) {
        empty.hidden = false;
        empty.innerHTML = '<div class="empty-state"><span class="empty-ico">' + icon('link') + '</span>' +
          '<h3>没有找到连接器</h3>' +
          '<p>' + (query ? '换个关键词试试，或切换到其他分类看看。' : (state.connFolder === 'all' ? '管理端暂未给你授权连接器。' : '该分类下暂无连接器，可以切换分类或自定义接入。')) + '</p></div>';
      } else {
        empty.hidden = true;
      }
    }
    syncConnNav();
  }

  function openNewConnectorDialog() {
    if (!state.user) return;
    populateSelects();
    const form = $('#new-connector-form');
    if (form) form.reset();
    openDialog($('#new-connector-dialog'));
    setTimeout(() => {
      const input = form ? fieldOf(form, 'name') : null;
      if (input) input.focus();
    }, 80);
  }

  /* ============================== 预览 ============================== */
  function openPreview(item, context) {
    const ctx = context || {};
    const type = ctx.type || (item.governed !== undefined ? 'doc' : 'template');
    let path = '';
    if (type === 'doc' && ctx.kb) path = docPath(ctx.kb, item);
    if (type === 'template') {
      const trail = Store.folderTrail(DB.templateFolders, item.folder).map((folder) => folder.name);
      path = trail.join(' / ');
    }
    state.preview = { item: item, type: type, context: ctx };
    $('#preview-title').textContent = item.name;
    $('#preview-sub').textContent = (path ? path + ' · ' : '') + (type === 'template' ? '文档模板预览' : '知识库文档预览');
    $('#preview-meta').innerHTML = levelBadge(item.level) +
      '<span class="muted">' + esc(item.size || '—') + '</span>' +
      '<span class="muted">所有者 ' + esc(item.owner || '—') + '</span>' +
      '<span class="muted">更新于 ' + esc(item.updated || '—') + '</span>' +
      (type === 'doc' ? (item.governed ? '<span class="gov-status is-done">' + icon('check-circle') + '已治理</span>' : '<span class="gov-status is-wait">' + icon('alert') + '待治理</span>') : '');
    $('#preview-body').innerHTML = previewBody(item, type);
    $('#preview-watermark').textContent = 'UWork · ' + state.user.name + ' · ' + Store.level(state.user.level).name + '级 · ' + today();
    $('#preview-use-btn').hidden = type !== 'template';
    openDialog(dom.preview);
  }

  function previewBody(item, type) {
    const title = String(item.name || '').replace(/\.[^.]+$/, '');
    const ext = String(item.ext || '').toLowerCase();
    if (type === 'template') {
      if (item.form === 'return') return blankReturnSheet();
      return '<h3>' + esc(title) + '</h3>' +
        '<p><strong>模板用途：</strong>用于规范' + esc(title.replace(/模板|表/g, '')) + '的编写格式，填写完成后可作为正式工作输出。</p>' +
        '<h4>一、适用范围</h4><p>适用于公司各部门开展相关业务时的标准记录，使用前请确认数据密级与填写权限。</p>' +
        '<h4>二、填写说明</h4>' +
        '<table><thead><tr><th>字段</th><th>填写要求</th><th>是否必填</th></tr></thead><tbody>' +
        '<tr><td>基本信息</td><td>按模板表头填写部门、日期、责任人</td><td>是</td></tr>' +
        '<tr><td>正文内容</td><td>按章节结构填写，保持术语一致</td><td>是</td></tr>' +
        '<tr><td>审批意见</td><td>由部门负责人或授权人签署</td><td>' + (ext === 'xlsx' ? '否' : '是') + '</td></tr>' +
        '</tbody></table>' +
        '<h4>三、注意事项</h4><p>模板受密级控制，请勿通过非授权渠道外发。使用后如有修改建议，请联系模板所有者。</p>';
    }
    if (['xls', 'xlsx'].includes(ext)) {
      return '<h3>' + esc(title) + '</h3>' +
        '<p><strong>摘要：</strong>该表格用于质量体系运行数据的记录与统计，包含目标、责任人、完成情况和验证结论。</p>' +
        '<h4>一、数据表</h4>' +
        '<table><thead><tr><th>序号</th><th>检查项</th><th>责任人</th><th>完成情况</th></tr></thead><tbody>' +
        '<tr><td>1</td><td>体系文件完整性检查</td><td>张明</td><td>已完成</td></tr>' +
        '<tr><td>2</td><td>内审计划执行情况</td><td>王芳</td><td>进行中</td></tr>' +
        '<tr><td>3</td><td>不符合项闭环率</td><td>李思</td><td>92%</td></tr>' +
        '</tbody></table><p>注：以上为原型演示数据，正式文档以知识库最新版本为准。</p>';
    }
    return '<h3>' + esc(title) + '</h3>' +
      '<p><strong>摘要：</strong>本文件用于规范相关业务流程，明确职责、输入输出和记录要求，是 UWork 智能体回答业务问题时的重要依据。</p>' +
      '<h4>一、目的</h4><p>确保相关工作按照公司制度与体系要求执行，保证过程可追溯、结果可验证。</p>' +
      '<h4>二、适用范围</h4><p>适用于公司各部门及相关岗位在授权范围内的业务活动。涉及高密级内容时，应遵循最小授权原则。</p>' +
      '<h4>三、职责</h4><p>业务部门负责执行与记录，质量管理部门负责监督与检查，保密办公室负责涉密内容的合规审查。</p>' +
      '<h4>四、工作要求</h4><p>1. 使用前确认文件版本与密级；2. 按模板完整填写记录；3. 发现异常及时上报并留存证据；4. 定期评审文件适用性。</p>' +
      '<p style="margin-top:18px;color:#8b94a7;font-size:11px">— 预览结束，完整内容请在管理端知识库中查看 —</p>';
  }





  boot();

  function boot() {
    bindLogin();
    bindComposer();
    bindGlobalClicks();
    bindForms();
    bindPickerEvents();
    autosizePrompt();
    syncSend();
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === '1') {
      Store.reset();
      try { window.localStorage.removeItem(MESSAGE_READ_KEY); } catch (err) { /* ignore */ }
      window.location.replace(window.location.pathname);
      return;
    }
    const forceLogin = params.get('login') === '1';
    const auto = params.get('auto') === '1' || params.has('view') || params.has('dialog');
    const saved = readSessionUser();
    const savedActive = saved && saved.status === '启用' ? saved : null;
    const user = forceLogin ? null : (savedActive || (auto ? Store.userByName(params.get('user') || 'zhangming') : null));
    if (params.get('user')) {
      const requested = Store.userByName(params.get('user'));
      if (requested) {
        enterApp(requested, { instant: auto });
        return;
      }
    }
    if (user) enterApp(user, { instant: auto });
    else {
      dom.app.hidden = true;
      dom.login.hidden = false;
    }
  }

})();
