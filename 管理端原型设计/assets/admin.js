/* ==========================================================================
   UWork 管理端原型 · 交互
   ========================================================================== */
(function () {
  'use strict';

  const Store = window.UWorkStore;
  const DB = Store.db;
  const LEVELS = Store.levels;
  const LEVEL_TONES = [
    { value: 'blue', label: '蓝色', color: '#2f6fed', bg: '#eaf1fe' },
    { value: 'green', label: '绿色', color: '#1f8f4e', bg: '#e9f7ef' },
    { value: 'amber', label: '橙色', color: '#b87400', bg: '#fff4e0' },
    { value: 'red', label: '红色', color: '#d9480f', bg: '#fff0e8' },
    { value: 'crimson', label: '深红', color: '#c92a2a', bg: '#fdecec' },
    { value: 'violet', label: '紫色', color: '#7c3aed', bg: '#f3eefe' },
    { value: 'cyan', label: '青色', color: '#0e7490', bg: '#e6f6fa' },
    { value: 'slate', label: '灰色', color: '#475569', bg: '#eef1f5' }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const icon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const pad = (num) => String(num).padStart(2, '0');
  const today = () => {
    const date = new Date();
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  };
  const nowStamp = () => {
    const date = new Date();
    return today() + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  };

  const VIEW_META = {
    kb: { parent: '内容运营', title: '知识库', kicker: 'KNOWLEDGE' },
    'kb-detail': { parent: '知识库', title: '知识库详情', kicker: 'KNOWLEDGE' },
    templates: { parent: '内容运营', title: '文档模板', kicker: 'TEMPLATE' },
    models: { parent: '能力配置', title: '模型管理', kicker: 'MODEL' },
    skills: { parent: '能力配置', title: '技能管理', kicker: 'SKILL' },
    connectors: { parent: '能力配置', title: '连接器管理', kicker: 'CONNECTOR' },
    updates: { parent: '能力配置', title: '软件更新', kicker: 'CLIENT UPDATE' },
    'sys-users': { parent: '系统管理', title: '用户管理', kicker: 'SYSTEM' },
    'sys-roles': { parent: '系统管理', title: '角色管理', kicker: 'SYSTEM' },
    'sys-levels': { parent: '系统管理', title: '密级管理', kicker: 'SYSTEM · SECURITY' },
    'sys-menus': { parent: '系统管理', title: '菜单管理', kicker: 'SYSTEM' },
    'sys-depts': { parent: '系统管理', title: '部门管理', kicker: 'SYSTEM' },
    'sys-posts': { parent: '系统管理', title: '岗位管理', kicker: 'SYSTEM' },
    'sys-dicts': { parent: '系统管理', title: '字典管理', kicker: 'SYSTEM' },
    'sys-params': { parent: '系统管理', title: '参数设置', kicker: 'SYSTEM' },
    'sys-notices': { parent: '平台治理', title: '通知公告', kicker: 'NOTICE' },
    'sys-audit': { parent: '平台治理', title: '审计日志', kicker: 'AUDIT' },
  };

  const state = {
    view: 'kb',
    kbDetail: null,
    kbFolder: 'all',
    kbQuery: '',
    kbLevel: 'all',
    docQuery: '',
    docStatus: 'all',
    tplFolder: 'all',
    tplQuery: '',
    modelQuery: '',
    modelStatus: 'all',
    skillQuery: '',
    skillFolder: 'all',
    connectorQuery: '',
    connectorFolder: 'all',
    releaseQuery: '',
    releaseStatus: 'all',
    userQuery: '',
    userLevel: 'all',
    userStatus: 'all',
    roleQuery: '',
    menuQuery: '',
    deptQuery: '',
    postQuery: '',
    dictQuery: '',
    paramQuery: '',
    noticeQuery: '',
    noticeStatus: 'all',
    auditQuery: '',
    auditType: 'all',
    auditAction: 'all',
    uploadMode: null,
    uploadContext: null,
    uploadFile: null,
    formSubmit: null,
    formFields: [],
    formFile: null,
    formFileCurrent: null,
    formFileAutoName: '',
    formFileAutoVersion: '',
    confirmAction: null
  };

  let toastTimer = null;

  /* ------------------------------ 通用工具 ------------------------------ */
  function fieldOf(form, name) {
    return form.querySelector('[name="' + name + '"]');
  }
  function levelInfo(code) {
    return Store.level(code);
  }
  function levelBadge(code) {
    const level = levelInfo(code);
    return '<span class="lvl" style="color:' + level.color + ';background:' + level.bg + '">' + esc(level.name) + '</span>';
  }
  function userOptions() {
    return DB.users.filter((user) => user.status === '启用').map((user) => ({
      value: user.id,
      label: user.name,
      meta: user.dept + ' · ' + levelInfo(user.level).name + '级'
    }));
  }
  function kbOwnerIds(kb) {
    return Array.isArray(kb && kb.owners) ? kb.owners.filter(Boolean) : [];
  }
  function userNamesOf(ids) {
    return (ids || []).map((id) => (DB.users.find((user) => user.id === id) || {}).name).filter(Boolean);
  }
  function kbOwnerLabel(kb) {
    const names = userNamesOf(kbOwnerIds(kb));
    return names.length ? names.join('、') : '所有人';
  }
  function statusBadge(status) {
    const map = {
      '启用': 'is-on', '已连接': 'is-on', '已发布': 'is-on', '成功': 'is-on',
      '停用': 'is-off', '未连接': 'is-off', '草稿': 'is-off',
      '锁定': 'is-warn', '连接异常': 'is-error', '拒绝': 'is-error', '失败': 'is-error'
    };
    return '<span class="status ' + (map[status] || 'is-off') + '">' + esc(status) + '</span>';
  }
  function fileIco(ext) {
    const value = String(ext || 'file').toLowerCase();
    return '<span class="file-ico is-' + esc(value) + '">' + esc(value.slice(0, 4).toUpperCase()) + '</span>';
  }
  function avatar(name) {
    const map = { '张明': '张', '李思': '李', '王芳': '王', '陈浩': '陈', '系统管理员': '管', '赵琳': '赵', '孙琦': '孙', '刘洋': '刘' };
    return map[name] || String(name || '?').slice(0, 1);
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
    }, 2500);
  }
  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }
  function levelOptions(selected, includeAll) {
    const all = includeAll ? '<option value="all">全部密级</option>' : '';
    return all + LEVELS.map((level) =>
      '<option value="' + level.code + '"' + (selected === level.code ? ' selected' : '') + '>' + esc(level.name) + '级</option>'
    ).join('');
  }
  function rankOfLevelName(name, fallback) {
    const level = LEVELS.find((item) => item.name === name);
    return level ? level.rank : fallback;
  }
  function simpleOptions(values, selected) {
    return values.map((value) => '<option value="' + esc(value) + '"' + (selected === value ? ' selected' : '') + '>' + esc(value) + '</option>').join('');
  }
  function countDocs(kb) {
    return kb.docs.length;
  }
  function folderDocCount(kb, folderId) {
    const ids = new Set([folderId].concat(Store.descendants(kb.folders, folderId).map((folder) => folder.id)));
    return kb.docs.filter((doc) => ids.has(doc.folder)).length;
  }
  function templateFolderCount(folderId) {
    const ids = new Set([folderId].concat(Store.descendants(DB.templateFolders, folderId).map((folder) => folder.id)));
    return DB.templates.filter((item) => ids.has(item.folder)).length;
  }
  function templatesInFolder(folderId) {
    if (folderId === 'all') return DB.templates;
    const ids = new Set([folderId].concat(Store.descendants(DB.templateFolders, folderId).map((folder) => folder.id)));
    return DB.templates.filter((item) => ids.has(item.folder));
  }
  function skillFolderCount(folderId) {
    const ids = new Set([folderId].concat(Store.descendants(DB.skillFolders, folderId).map((folder) => folder.id)));
    return DB.skills.filter((item) => ids.has(item.folder)).length;
  }
  function skillsInFolder(folderId) {
    if (folderId === 'all') return DB.skills;
    const ids = new Set([folderId].concat(Store.descendants(DB.skillFolders, folderId).map((folder) => folder.id)));
    return DB.skills.filter((item) => ids.has(item.folder));
  }
  function skillFolderOf(skill) {
    return DB.skillFolders.find((folder) => folder.id === (skill && skill.folder)) || null;
  }
  function skillFolderPath(skill) {
    const folder = skillFolderOf(skill);
    return folder ? Store.folderTrail(DB.skillFolders, folder.id).map((item) => item.name).join(' / ') : '未分类';
  }
  function skillFolderOptions(selected) {
    return [{ value: 'sf0', label: '未分类' }].concat(
      DB.skillFolders.filter((folder) => folder.id !== 'sf0').map((folder) => ({
        value: folder.id,
        label: new Array(Store.folderTrail(DB.skillFolders, folder.id).length).join('　') + folder.name
      }))
    ).map((option) => (option.value === selected ? Object.assign({}, option, { selected: true }) : option));
  }
  function connectorFolderCount(folderId) {
    const ids = new Set([folderId].concat(Store.descendants(DB.connectorFolders, folderId).map((folder) => folder.id)));
    return DB.connectors.filter((item) => ids.has(item.folder)).length;
  }
  function connectorsInFolder(folderId) {
    if (folderId === 'all') return DB.connectors;
    const ids = new Set([folderId].concat(Store.descendants(DB.connectorFolders, folderId).map((folder) => folder.id)));
    return DB.connectors.filter((item) => ids.has(item.folder));
  }
  function connectorFolderOf(connector) {
    return DB.connectorFolders.find((folder) => folder.id === (connector && connector.folder)) || null;
  }
  function connectorFolderPath(connector) {
    const folder = connectorFolderOf(connector);
    return folder ? Store.folderTrail(DB.connectorFolders, folder.id).map((item) => item.name).join(' / ') : '未分类';
  }
  function connectorFolderOptions(selected) {
    return [{ value: 'cf0', label: '未分类' }].concat(
      DB.connectorFolders.filter((folder) => folder.id !== 'cf0').map((folder) => ({
        value: folder.id,
        label: new Array(Store.folderTrail(DB.connectorFolders, folder.id).length).join('　') + folder.name
      }))
    ).map((option) => (option.value === selected ? Object.assign({}, option, { selected: true }) : option));
  }
  function docsInFolder(kb, folderId) {
    if (folderId === 'all') return kb.docs;
    const ids = new Set([folderId].concat(Store.descendants(kb.folders, folderId).map((folder) => folder.id)));
    return kb.docs.filter((doc) => ids.has(doc.folder));
  }
  function fileExt(name) {
    const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : 'file';
  }
  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function fileBaseName(fileName) {
    return String(fileName || '').replace(/\.zip$/i, '')
      .replace(/[\s._-]*v?\d+(?:\.\d+){1,3}$/i, '').trim();
  }
  function fileVersionOf(fileName) {
    const match = String(fileName || '').match(/[\s._-]v?(\d+(?:\.\d+){1,3})(?=\.zip$)/i);
    return match ? match[1] : '';
  }
  function folderTrailText(collection, id) {
    return Store.folderTrail(collection, id).map((folder) => folder.name).join(' / ');
  }

  /* ------------------------------ 路由 ------------------------------ */
  function navigate(view, options) {
    const opts = options || {};
    if (!VIEW_META[view]) return;
    state.view = view;
    if (view === 'kb') {
      state.kbDetail = null;
      state.kbQuery = '';
      state.kbLevel = 'all';
    }
    if (view === 'templates') {
      state.tplFolder = 'all';
      state.tplQuery = '';
    }
    if (view === 'skills') {
      state.skillFolder = 'all';
      state.skillQuery = '';
    }
    if (view === 'connectors') {
      state.connectorFolder = 'all';
      state.connectorQuery = '';
    }
    renderView();
    updateChrome();
    if (!opts.keepScroll) $('#content-scroll').scrollTop = 0;
    closeSidebar();
  }

  function openKb(id) {
    const kb = DB.knowledgeBases.find((item) => item.id === id);
    if (!kb) return;
    state.kbDetail = id;
    state.kbFolder = 'all';
    state.docQuery = '';
    state.docStatus = 'all';
    state.view = 'kb-detail';
    writeAudit('知识库', '查看', kb.name, '进入知识库详情');
    renderView();
    updateChrome();
    $('#content-scroll').scrollTop = 0;
  }

  function currentKb() {
    return DB.knowledgeBases.find((item) => item.id === state.kbDetail) || null;
  }

  function updateChrome() {
    const meta = VIEW_META[state.view] || VIEW_META.kb;
    const kb = state.kbDetail ? currentKb() : null;
    const title = state.view === 'kb-detail' && kb ? kb.name : meta.title;
    const parent = state.view === 'kb-detail' ? '知识库' : meta.parent;
    $('#crumb-parent').textContent = parent;
    $('#crumb-current').textContent = title;
    const tag = $('#tag-current');
    if (tag) tag.textContent = title;
    document.title = 'UWork 管理端 · ' + title;
    $$('.nav-item').forEach((item) => {
      const view = item.dataset.view;
      item.classList.toggle('is-active', view === state.view || (state.view === 'kb-detail' && view === 'kb'));
    });
    $$('.sub-item').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.view === state.view);
    });
    if (state.view.indexOf('sys-') === 0) setSystemOpen(true);
    refreshNavCounts();
  }

  function refreshNavCounts() {
    const kbCount = $('#nav-kb-count');
    if (kbCount) kbCount.textContent = DB.knowledgeBases.length;
    const tplCount = $('#nav-tpl-count');
    if (tplCount) tplCount.textContent = DB.templates.length;
  }

  function setSystemOpen(open) {
    $('#system-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    $('#system-nav').hidden = !open;
  }
  function toggleSystem() {
    const open = $('#system-toggle').getAttribute('aria-expanded') !== 'false';
    setSystemOpen(!open);
  }
  function openSidebar() {
    $('#admin').classList.add('is-drawer');
    $('#sidebar-scrim').hidden = false;
  }
  function closeSidebar() {
    $('#admin').classList.remove('is-drawer');
    $('#sidebar-scrim').hidden = true;
  }

  function renderView() {
    const root = $('#view-root');
    switch (state.view) {
      case 'kb': renderKbList(root); break;
      case 'kb-detail': renderKbDetail(root); break;
      case 'templates': renderTemplates(root); break;
      case 'models': renderModels(root); break;
      case 'skills': renderSkills(root); break;
      case 'connectors': renderConnectors(root); break;
      case 'updates': renderUpdates(root); break;
      case 'sys-users': renderUsers(root); break;
      case 'sys-roles': renderRoles(root); break;
      case 'sys-levels': renderLevels(root); break;
      case 'sys-menus': renderMenus(root); break;
      case 'sys-depts': renderDepts(root); break;
      case 'sys-posts': renderPosts(root); break;
      case 'sys-dicts': renderDicts(root); break;
      case 'sys-params': renderParams(root); break;
      case 'sys-notices': renderNotices(root); break;
      case 'sys-audit': renderAudit(root); break;
      default: renderKbList(root);
    }
  }

  /* ------------------------------ 页面通用组件 ------------------------------ */
  function pageHead(kicker, title, desc, actions) {
    return '<div class="page-head">' +
      '<div><div class="page-kicker">' + esc(kicker) + '</div><h1>' + esc(title) + '</h1><p>' + esc(desc) + '</p></div>' +
      '<div class="page-actions">' + (actions || '') + '</div>' +
    '</div>';
  }

  function statGrid(items) {
    return '<div class="stat-grid">' + items.map((item) =>
      '<div class="stat-card"><span class="stat-ico ' + item.tone + '">' + icon(item.icon) + '</span>' +
        '<div><b>' + esc(item.value) + '</b><span>' + esc(item.label) + '</span></div>' +
        (item.trend ? '<span class="stat-trend">' + esc(item.trend) + '</span>' : '') +
      '</div>'
    ).join('') + '</div>';
  }

  function searchBox(id, placeholder, value) {
    return '<span class="search-box">' + icon('search') +
      '<input type="search" id="' + id + '" placeholder="' + esc(placeholder) + '" value="' + esc(value || '') + '" spellcheck="false"></span>';
  }

  function selectFilter(label, id, optionsHtml) {
    return '<label class="filter-item"><span>' + esc(label) + '</span><span class="select-wrap"><select id="' + id + '">' + optionsHtml + '</select></span></label>';
  }

  function filterActions(resetId) {
    return '<div class="filter-actions">' +
      '<button type="button" class="btn btn-primary" data-action="apply-filter">查询</button>' +
      '<button type="button" class="btn" data-action="reset-filter" data-target="' + esc(resetId) + '">重置</button>' +
    '</div>';
  }

  function emptyTableRow(colspan, text) {
    return '<tr><td colspan="' + colspan + '"><div class="table-empty"><span class="empty-ico">' + icon('database') + '</span><h3>暂无数据</h3><p>' + esc(text || '尝试调整筛选条件，或新建一条记录。') + '</p></div></td></tr>';
  }

  function tableFooter(id, total) {
    return '<div class="table-footer"><span>共 <b id="' + id + '">' + total + '</b> 条记录</span><span>数据实时同步至客户端</span></div>';
  }

  function countByLevel(items, level) {
    return items.filter((item) => item.level === level).length;
  }
  function canSee(userLevel, itemLevel) {
    return Store.canSee(userLevel, itemLevel);
  }

  /* ============================== 知识库列表 ============================== */
  function renderKbList(root) {
    const kbs = DB.knowledgeBases;
    const docs = kbs.reduce((total, kb) => total + kb.docs.length, 0);
    const pending = kbs.reduce((total, kb) => total + kb.docs.filter((doc) => !doc.governed).length, 0);
    const high = kbs.filter((kb) => Store.rank(kb.level) >= rankOfLevelName('机密', 4)).length;
    root.innerHTML =
      pageHead('KNOWLEDGE', '知识库', '管理企业知识库与目录层级，上传资料、执行智能治理，并按数据密级控制客户端可见范围。',
        '<button type="button" class="btn btn-primary" data-action="new-kb">' + icon('plus') + '新建知识库</button>') +
      statGrid([
        { label: '知识库总数', value: kbs.length, icon: 'book', tone: 'tone-blue', trend: '已接入客户端' },
        { label: '知识文档', value: docs, icon: 'file', tone: 'tone-violet' },
        { label: '待智能治理', value: pending, icon: 'sparkles', tone: 'tone-amber', trend: pending ? '待处理' : '全部完成' },
        { label: '机密及以上', value: high, icon: 'lock', tone: 'tone-emerald' }
      ]) +
      '<div class="filter-card">' +
        '<label class="filter-item"><span>知识库</span>' + searchBox('kb-search', '搜索名称、描述或负责人', state.kbQuery) + '</label>' +
        selectFilter('数据密级', 'kb-level', levelOptions(state.kbLevel, true)) +
        '<div class="filter-actions"><span class="muted" style="align-self:center;margin-right:6px">共 ' + kbs.length + ' 个知识库</span>' +
          '<button type="button" class="btn" data-action="reset-filter" data-target="kb">重置</button></div>' +
      '</div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>知识库列表</h2><p>点击名称进入知识库，维护目录与文档</p></div>' +
          '<span class="tag tag-blue">' + icon('shield') + '密级自动继承</span>' +
        '</div>' +
        '<div class="table-wrap"><table class="admin-table">' +
          '<thead><tr><th>知识库名称</th><th>数据密级</th><th>文档数</th><th>所属部门</th><th>负责人</th><th>最近更新</th><th>操作</th></tr></thead>' +
          '<tbody id="kb-tbody"></tbody>' +
        '</table></div>' +
        tableFooter('kb-total', kbs.length) +
      '</section>';
    paintKbRows();
  }

  function paintKbRows() {
    const tbody = $('#kb-tbody');
    if (!tbody) return;
    const query = state.kbQuery.trim().toLowerCase();
    let list = DB.knowledgeBases.slice();
    if (state.kbLevel !== 'all') list = list.filter((kb) => kb.level === state.kbLevel);
    if (query) list = list.filter((kb) => (kb.name + kb.desc + kbOwnerLabel(kb) + kb.dept).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((kb) =>
      '<tr>' +
        '<td><button type="button" class="cell-main cell-button" data-action="open-kb" data-id="' + kb.id + '">' +
          '<span class="cell-ico tone-amber">' + icon('book') + '</span>' +
          '<span class="cell-copy"><b>' + esc(kb.name) + '</b><small>' + esc(kb.desc) + '</small></span>' +
        '</button></td>' +
        '<td>' + levelBadge(kb.level) + '</td>' +
        '<td><span class="tag">' + countDocs(kb) + ' 篇</span></td>' +
        '<td><span class="muted">' + esc(kb.dept) + '</span></td>' +
        '<td>' + (kbOwnerIds(kb).length
          ? '<span class="muted">' + esc(kbOwnerLabel(kb)) + '</span>'
          : '<span class="tag tag-green" title="未设置负责人，所有人可编辑">' + icon('users') + '所有人</span>') + '</td>' +
        '<td><span class="muted">' + esc(kb.updated) + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="link-action" data-action="open-kb" data-id="' + kb.id + '">进入</button>' +
          '<button type="button" class="icon-action" data-action="edit-kb" data-id="' + kb.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-kb" data-id="' + kb.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(7, '没有匹配的知识库，换个关键词或新建一个。');
    const total = $('#kb-total');
    if (total) total.textContent = list.length;
  }

  /* ============================== 知识库详情 ============================== */
  function renderKbDetail(root) {
    const kb = currentKb();
    if (!kb) { navigate('kb'); return; }
    const docs = kb.docs;
    const governed = docs.filter((doc) => doc.governed).length;
    const pending = docs.length - governed;
    const selectedFolder = state.kbFolder === 'all' ? null : kb.folders.find((folder) => folder.id === state.kbFolder);
    let tree = '<button type="button" class="tree-item' + (state.kbFolder === 'all' ? ' is-active' : '') + '" data-kb-folder="all">' +
      icon('list') + '<span class="label">全部文档</span><span class="count">' + docs.length + '</span></button>' +
      '<div class="tree-divider"></div>';
    const walk = (parent, depth) => {
      kb.folders.filter((folder) => folder.parent === parent).forEach((folder) => {
        tree += '<button type="button" class="tree-item' + (state.kbFolder === folder.id ? ' is-active' : '') + '" data-kb-folder="' + folder.id + '" style="padding-left:' + (7 + depth * 14) + 'px">' +
          icon('file') + '<span class="label">' + esc(folder.name) + '</span><span class="count">' + folderDocCount(kb, folder.id) + '</span></button>';
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 0);
    const title = selectedFolder ? selectedFolder.name : '全部文档';
    root.innerHTML =
      '<button type="button" class="back-link" data-action="back-kb">' + icon('arrow-left') + '返回知识库列表</button>' +
      '<div class="detail-head">' +
        '<div class="detail-title">' +
          '<span class="cell-ico tone-amber" style="width:40px;height:40px;border-radius:10px">' + icon('book') + '</span>' +
          '<div><h1>' + esc(kb.name) + '</h1><p>' + esc(kb.desc) + '</p>' +
            '<div class="detail-meta">' + levelBadge(kb.level) +
              '<span>' + icon('user') + '负责人 ' + esc(kbOwnerLabel(kb)) + ' · ' + esc(kb.dept) + '</span>' +
              (kbOwnerIds(kb).length
                ? '<span class="tag">' + icon('lock') + '仅负责人可编辑</span>'
                : '<span class="tag tag-green">' + icon('users') + '所有人可编辑</span>') +
              '<span>' + icon('file') + docs.length + ' 篇文档</span>' +
              '<span>' + icon('clock') + '更新于 ' + esc(kb.updated) + '</span>' +
              '<span class="tag tag-green">' + icon('check-circle') + governed + ' 篇已治理</span>' +
              (pending ? '<span class="tag tag-amber">' + icon('alert') + pending + ' 篇待治理</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="detail-actions">' +
          '<button type="button" class="btn" data-action="edit-kb" data-id="' + kb.id + '">' + icon('edit') + '编辑</button>' +
          '<button type="button" class="btn" data-action="upload-doc" data-id="' + kb.id + '">' + icon('upload') + '上传资料</button>' +
          '<button type="button" class="btn btn-primary" data-action="new-kb-folder" data-id="' + kb.id + '">' + icon('folder-plus') + '新建目录</button>' +
        '</div>' +
      '</div>' +
      '<div class="split-layout">' +
        '<aside class="tree-panel">' +
          '<div class="tree-panel-head"><span>目录层级</span><button type="button" class="icon-action" data-action="new-kb-folder" data-id="' + kb.id + '" title="新建目录">' + icon('plus') + '</button></div>' +
          '<div class="tree-list">' + tree + '</div>' +
        '</aside>' +
        '<section class="card">' +
          '<div class="card-head">' +
            '<div><h2>' + esc(title) + '</h2><p>文档上传后按密级同步到客户端，未治理文档不会被智能体引用</p></div>' +
            searchBox('doc-search', '搜索文档名称', state.docQuery) +
            '<span class="select-wrap"><select id="doc-status">' +
              '<option value="all"' + (state.docStatus === 'all' ? ' selected' : '') + '>全部状态</option>' +
              '<option value="pending"' + (state.docStatus === 'pending' ? ' selected' : '') + '>待治理</option>' +
              '<option value="done"' + (state.docStatus === 'done' ? ' selected' : '') + '>已治理</option>' +
            '</select></span>' +
            '<button type="button" class="btn btn-sm" data-action="upload-doc" data-id="' + kb.id + '">' + icon('upload') + '上传</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="admin-table">' +
            '<thead><tr><th>文档名称</th><th>类型</th><th>密级</th><th>智能治理</th><th>上传人</th><th>更新时间</th><th>操作</th></tr></thead>' +
            '<tbody id="kb-doc-tbody"></tbody>' +
          '</table></div>' +
          '<div class="table-footer"><span>共 <b id="kb-doc-total">' + docs.length + '</b> 篇文档</span><span class="muted">支持 PDF / Word / Excel / PPT / TXT / MD / 图片</span></div>' +
        '</section>' +
      '</div>';
    paintKbDocs();
  }

  function paintKbDocs() {
    const kb = currentKb();
    const tbody = $('#kb-doc-tbody');
    if (!kb || !tbody) return;
    let list = docsInFolder(kb, state.kbFolder);
    const query = state.docQuery.trim().toLowerCase();
    if (query) list = list.filter((doc) => doc.name.toLowerCase().includes(query));
    if (state.docStatus !== 'all') list = list.filter((doc) => state.docStatus === 'done' ? doc.governed : !doc.governed);
    tbody.innerHTML = list.length ? list.map((doc) =>
      '<tr>' +
        '<td><div class="file-cell">' + fileIco(doc.ext) +
          '<span class="cell-copy"><b>' + esc(doc.name) + '</b><small>' + esc(doc.size) + ' · ' + esc(folderTrailText(kb.folders, doc.folder) || '根目录') + '</small></span>' +
        '</div></td>' +
        '<td><span class="tag">' + esc(doc.ext.toUpperCase()) + '</span></td>' +
        '<td>' + levelBadge(doc.level) + '</td>' +
        '<td>' + (doc.governed
          ? '<span class="gov is-done">' + icon('check-circle') + '已治理</span>'
          : '<button type="button" class="link-action" data-action="govern-doc" data-id="' + doc.id + '">' + icon('sparkles') + ' 智能治理</button>') + '</td>' +
        '<td><span class="muted">' + esc(doc.owner) + '</span></td>' +
        '<td><span class="muted">' + esc(doc.updated) + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-action" data-action="preview-doc" data-id="' + doc.id + '" title="预览">' + icon('eye') + '</button>' +
          '<button type="button" class="icon-action" data-action="download-doc" data-id="' + doc.id + '" title="下载">' + icon('download') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-doc" data-id="' + doc.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(7, '当前目录没有文档，点击“上传资料”添加。');
    const total = $('#kb-doc-total');
    if (total) total.textContent = list.length;
  }

  /* ============================== 文档模板 ============================== */
  function renderTemplates(root) {
    const total = DB.templates.length;
    const folders = DB.templateFolders.length;
    const selected = state.tplFolder === 'all' ? null : DB.templateFolders.find((folder) => folder.id === state.tplFolder);
    let tree = '<button type="button" class="tree-item' + (state.tplFolder === 'all' ? ' is-active' : '') + '" data-tpl-folder="all">' +
      icon('list') + '<span class="label">全部模板</span><span class="count">' + total + '</span></button><div class="tree-divider"></div>';
    const walk = (parent, depth) => {
      DB.templateFolders.filter((folder) => folder.parent === parent).forEach((folder) => {
        tree += '<button type="button" class="tree-item' + (state.tplFolder === folder.id ? ' is-active' : '') + '" data-tpl-folder="' + folder.id + '" style="padding-left:' + (7 + depth * 14) + 'px">' +
          icon('file') + '<span class="label">' + esc(folder.name) + '</span>' +
          (folder.dept ? '<span class="folder-dept" title="仅 ' + esc(folder.dept) + ' 可见">' + icon('shield') + '</span>' : '') +
          (folder.canEdit ? '' : '<span class="folder-lock" title="只读目录">' + icon('lock') + '</span>') +
          '<span class="count">' + templateFolderCount(folder.id) + '</span></button>';
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 0);
    root.innerHTML =
      pageHead('TEMPLATE', '文档模板', '按目录层级维护标准 Word / Excel 模板。上传后自动同步到客户端，可被智能体带入对话。',
        '<button type="button" class="btn" data-action="new-tpl-folder">' + icon('folder-plus') + '新建目录</button>' +
        '<button type="button" class="btn btn-primary" data-action="upload-template">' + icon('upload') + '上传模板</button>') +
      statGrid([
        { label: '模板总数', value: total, icon: 'file', tone: 'tone-blue' },
        { label: '目录层级', value: folders, icon: 'folder-plus', tone: 'tone-violet' },
        { label: 'Word 模板', value: DB.templates.filter((item) => ['doc', 'docx'].includes(item.ext)).length, icon: 'file', tone: 'tone-amber' },
        { label: 'Excel 模板', value: DB.templates.filter((item) => ['xls', 'xlsx'].includes(item.ext)).length, icon: 'grid', tone: 'tone-emerald' }
      ]) +
      '<div class="split-layout">' +
        '<aside class="tree-panel">' +
          '<div class="tree-panel-head"><span>模板目录</span><button type="button" class="icon-action" data-action="new-tpl-folder" title="新建目录">' + icon('plus') + '</button></div>' +
          '<div class="tree-list">' + tree + '</div>' +
        '</aside>' +
        '<section class="card">' +
          '<div class="card-head"><div><h2>' + esc(selected ? selected.name : '全部模板') + '</h2><p>' + (selected
            ? '目录所有者：' + esc(selected.owner) + ' · 可见部门：' + esc(selected.dept || '所有部门')
            : '展示所有目录下的模板') + '</p></div>' +
            searchBox('tpl-search', '搜索模板名称', state.tplQuery) +
          '</div>' +
          '<div class="table-wrap"><table class="admin-table">' +
            '<thead><tr><th>模板名称</th><th>分类</th><th>格式</th><th>密级</th><th>更新时间</th><th>操作</th></tr></thead>' +
            '<tbody id="tpl-tbody"></tbody>' +
          '</table></div>' +
          '<div class="table-footer"><span>共 <b id="tpl-total">' + total + '</b> 个模板</span><span class="muted">模板名称默认使用上传文件名</span></div>' +
        '</section>' +
      '</div>';
    paintTplRows();
  }

  function paintTplRows() {
    const tbody = $('#tpl-tbody');
    if (!tbody) return;
    let list = templatesInFolder(state.tplFolder);
    const query = state.tplQuery.trim().toLowerCase();
    if (query) list = list.filter((item) => item.name.toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((item) => {
      const folder = DB.templateFolders.find((folderItem) => folderItem.id === item.folder);
      return '<tr>' +
        '<td><div class="file-cell">' + fileIco(item.ext) +
          '<span class="cell-copy"><b>' + esc(item.name) + '</b><small>' + esc(item.size) + ' · ' + esc(item.owner) + '</small></span>' +
        '</div></td>' +
        '<td><span class="muted">' + esc(folder ? folder.name : '未分类') + '</span></td>' +
        '<td><span class="tag">' + esc(item.ext.toUpperCase()) + '</span></td>' +
        '<td>' + levelBadge(item.level) + '</td>' +
        '<td><span class="muted">' + esc(item.updated) + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="link-action" data-action="edit-template" data-id="' + item.id + '">编辑</button>' +
          '<button type="button" class="icon-action" data-action="download-template" data-id="' + item.id + '" title="下载">' + icon('download') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-template" data-id="' + item.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') : emptyTableRow(6, '当前目录没有模板，点击“上传模板”添加。');
    const total = $('#tpl-total');
    if (total) total.textContent = list.length;
  }


  function templateFolderOptions(selected) {
    const options = [];
    const walk = (parent, depth) => {
      DB.templateFolders.filter((folder) => (folder.parent || null) === parent).forEach((folder) => {
        options.push({ value: folder.id, label: new Array(depth + 1).join('　') + folder.name });
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 0);
    return options.map((option) => {
      if (option.value === selected) return { value: option.value, label: option.label, selected: true };
      return option;
    });
  }

  function editTemplateForm(id) {
    const template = DB.templates.find((item) => item.id === id);
    if (!template) return;
    openForm({
      title: '编辑文档模板',
      sub: template.name,
      submitText: '保存修改',
      fields: [
        { name: 'name', label: '模板名称', required: true, wide: true },
        { name: 'folder', label: '所属分类', type: 'select', options: templateFolderOptions(template.folder) },
        { name: 'level', label: '数据密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) }
      ],
      values: template,
      onSubmit: function (values) {
        template.name = values.name;
        template.folder = values.folder || 'tf0';
        template.level = values.level;
        template.updated = today();
        writeAudit('文档模板', '编辑', template.name, '数据密级 ' + levelInfo(template.level).name + '级');
        Store.save();
        renderTemplates($('#view-root'));
        updateChrome();
        toast('模板已更新：' + template.name);
        return true;
      }
    });
  }

  function deleteTemplate(id) {
    const template = DB.templates.find((item) => item.id === id);
    if (!template) return;
    askConfirm('删除模板', '确定删除模板《' + template.name + '》吗？删除后客户端将不可用。', () => {
      const templateFolder = DB.templateFolders.find((item) => item.id === template.folder);
      DB.templates = DB.templates.filter((item) => item.id !== id);
      writeAudit('文档模板', '删除', template.name, '分类「' + (templateFolder ? templateFolder.name : '未分类') + '」');
      Store.save();
      renderTemplates($('#view-root'));
      updateChrome();
      toast('模板已删除');
    });
  }

  /* ============================== 上传与弹窗 ============================== */
  function openUpload(mode, context) {
    const ctx = context || {};
    state.uploadMode = mode;
    state.uploadContext = ctx;
    state.uploadFile = null;
    const isTemplate = mode === 'template';
    $('#upload-title').textContent = isTemplate ? '上传文档模板' : '上传知识库资料';
    $('#upload-sub').textContent = isTemplate
      ? '拖入 Word 或 Excel 模板，选择分类与密级后即可同步到客户端。'
      : '拖入 PDF、Office、文本或图片文件，上传后可在知识库中查看与治理。';
    $('#upload-accept-text').textContent = isTemplate
      ? '支持 .doc / .docx / .xls / .xlsx，单个文件不超过 200 MB'
      : '支持 PDF、Word、Excel、PPT、TXT、MD、PNG、JPG，单个文件不超过 200 MB';
    $('#upload-submit').textContent = isTemplate ? '确认上传模板' : '确认上传资料';
    $('#upload-file').setAttribute('accept', isTemplate ? '.doc,.docx,.xls,.xlsx' : '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg');
    const form = $('#upload-form');
    form.reset();
    $('#upload-file-name').hidden = true;
    $('#upload-error').hidden = true;
    const folderSelect = $('#upload-folder');
    if (isTemplate) {
      $('#upload-folder-label').textContent = '所属分类';
      $('#upload-hint').textContent = '上传后同步至客户端文档模板库';
      folderSelect.innerHTML = '<option value="tf0">未分类</option>' + folderOptionsHtml(DB.templateFolders.filter((folder) => folder.id !== 'tf0'), ctx.folder || '', null, 0);
      $('#upload-level').innerHTML = levelOptions(ctx.level || 'L2');
    } else {
      const kb = DB.knowledgeBases.find((item) => item.id === ctx.kbId);
      $('#upload-folder-label').textContent = '所属目录';
      $('#upload-hint').textContent = '上传后可在右侧文档列表查看';
      folderSelect.innerHTML = '<option value="">根目录</option>' + folderOptionsHtml(kb ? kb.folders : [], ctx.folder || (state.kbFolder !== 'all' ? state.kbFolder : ''), null, 0);
      $('#upload-level').innerHTML = levelOptions(ctx.level || (kb ? kb.level : 'L2'));
    }
    if (ctx.folder) folderSelect.value = ctx.folder;
    openDialog($('#upload-dialog'));
    setTimeout(() => fieldOf($('#upload-form'), 'name').focus(), 60);
  }

  function folderOptionsHtml(folders, selected, parentId, depth) {
    const level = depth || 0;
    return folders.filter((folder) => folder.parent === (parentId || null)).map((folder) =>
      '<option value="' + folder.id + '"' + (selected === folder.id ? ' selected' : '') + '>' +
        new Array(level + 1).join('　') + esc(folder.name) + '</option>' +
        folderOptionsHtml(folders, selected, folder.id, level + 1)
    ).join('');
  }

  function setUploadFile(file) {
    if (!file) return;
    const ext = fileExt(file.name);
    const allowed = state.uploadMode === 'template'
      ? ['doc', 'docx', 'xls', 'xlsx']
      : ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'png', 'jpg', 'jpeg'];
    if (!allowed.includes(ext)) {
      toast(state.uploadMode === 'template' ? '模板仅支持 doc / docx / xls / xlsx' : '不支持该文件格式');
      return;
    }
    state.uploadFile = file;
    const label = $('#upload-file-name');
    label.textContent = file.name + ' · ' + formatSize(file.size);
    label.hidden = false;
    const nameInput = fieldOf($('#upload-form'), 'name');
    if (!nameInput.value.trim()) nameInput.value = file.name;
    $('#upload-error').hidden = true;
  }

  function submitUpload(event) {
    event.preventDefault();
    const form = event.target;
    const error = $('#upload-error');
    error.hidden = true;
    if (!state.uploadFile) {
      error.textContent = '请先选择要上传的文件';
      error.hidden = false;
      return;
    }
    const name = String(fieldOf(form, 'name').value || '').trim() || state.uploadFile.name;
    const level = fieldOf(form, 'level').value;
    const folder = fieldOf(form, 'folder').value || null;
    const ext = fileExt(state.uploadFile.name);
    if (state.uploadMode === 'template') {
      DB.templates.unshift({
        id: 'tpl-' + Date.now(),
        name: name,
        folder: folder,
        ext: ext,
        size: formatSize(state.uploadFile.size),
        level: level,
        owner: '系统管理员',
        updated: today()
      });
      const tplFolder = DB.templateFolders.find((item) => item.id === folder);
      writeAudit('文档模板', '新增', name, '分类「' + (tplFolder ? tplFolder.name : '未分类') + '」 · ' + levelInfo(level).name + '级');
      Store.save();
      closeDialog($('#upload-dialog'));
      state.uploadFile = null;
      renderTemplates($('#view-root'));
      updateChrome();
      toast('模板已上传：' + name);
      return;
    }
    const kb = DB.knowledgeBases.find((item) => item.id === state.uploadContext.kbId);
    if (!kb) return;
    kb.docs.push({
      id: 'doc-' + Date.now(),
      name: name,
      folder: folder,
      ext: ext,
      size: formatSize(state.uploadFile.size),
      level: level,
      governed: false,
      owner: '系统管理员',
      updated: today()
    });
    kb.updated = today();
    writeAudit('知识文档', '新增', name, '知识库「' + kb.name + '」 · ' + levelInfo(level).name + '级');
    Store.save();
    closeDialog($('#upload-dialog'));
    state.uploadFile = null;
    renderKbDetail($('#view-root'));
    updateChrome();
    toast('资料已上传：' + name + '，当前待治理');
  }

  /* ------------------------------ 通用表单 ------------------------------ */
  function fileAcceptText(field) {
    return String(field.accept || '.zip').split(',').map((item) => item.trim()).filter(Boolean).join(' / ');
  }

  function fileFieldHtml(field) {
    const file = state.formFile;
    const current = !!file && !file.fresh;
    const filled = !!file;
    const acceptText = fileAcceptText(field);
    const lead = filled
      ? '<span class="pkg-badge">' + esc(fileExt(file.name).toUpperCase().slice(0, 4)) + '</span>'
      : '<span class="pkg-ico">' + icon(field.icon || 'upload') + '</span>';
    const copy = filled
      ? '<span class="pkg-copy"><b>' + esc(file.name) + '</b><small>' + esc(file.size || '—') + ' · ' +
          (current ? (field.currentText || '当前文件，点击可替换') : '已选择，保存后生效') + '</small></span>'
      : '<span class="pkg-copy"><b>' + esc(field.dropTitle || '拖入文件，或点击选择') + '</b><small>' +
          esc(field.dropHint || '仅支持 ' + acceptText + ' 格式') + '</small></span>';
    return '<div class="field wide pkg-field" data-file-field>' +
      '<div class="pkg-label"><span>' + esc(field.label) + (field.required ? ' <i>*</i>' : '') + '</span>' +
        (filled && !current ? '<button type="button" class="link-action" data-action="clear-form-file">移除</button>' : '') +
      '</div>' +
      '<div class="pkg-drop' + (filled ? ' is-filled' : '') + '" id="form-file-drop" role="button" tabindex="0" aria-label="上传' + esc(field.label) + '">' +
        lead + copy +
        '<span class="pkg-action">' + (filled ? '更换' : '选择文件') + '</span>' +
        '<input type="file" id="form-file-input" accept="' + esc(field.accept || '.zip') + '" hidden>' +
      '</div>' +
      '<p class="pkg-error" id="form-file-error" role="alert" hidden></p>' +
      (field.help ? '<span class="pkg-help">' + esc(field.help) + '</span>' : '') +
    '</div>';
  }

  function currentFileField() {
    return (state.formFields || []).find((item) => item.type === 'file');
  }

  function paintFileField() {
    const field = currentFileField();
    const holder = document.querySelector('[data-file-field]');
    if (!field || !holder) return;
    holder.outerHTML = fileFieldHtml(field);
  }

  function setFormFile(file) {
    if (!file) return;
    const field = currentFileField();
    if (!field) return;
    const error = document.querySelector('#form-file-error');
    const fail = (message) => {
      if (error) { error.textContent = message; error.hidden = false; }
      const drop = document.querySelector('#form-file-drop');
      if (drop) drop.classList.add('is-error');
    };
    const accept = String(field.accept || '.zip').split(',').map((item) => item.trim().replace(/^\./, '').toLowerCase());
    if (!accept.includes(fileExt(file.name))) {
      fail(field.label + '仅支持 ' + fileAcceptText(field) + ' 格式，请重新选择');
      return;
    }
    const maxSize = field.maxSize || 200;
    if (file.size > maxSize * 1024 * 1024) {
      fail(field.label + '不能超过 ' + maxSize + ' MB，请重新选择');
      return;
    }
    state.formFile = { name: file.name, size: formatSize(file.size), fresh: true };
    paintFileField();
    const body = document.querySelector('#form-body');
    if (field.autoFill) {
      const nameInput = body && fieldOf(body, 'name');
      const base = fileBaseName(file.name);
      if (nameInput && base && (!nameInput.value.trim() || nameInput.value.trim() === state.formFileAutoName)) {
        nameInput.value = base;
        state.formFileAutoName = base;
      }
      const versionInput = body && fieldOf(body, 'version');
      const version = fileVersionOf(file.name);
      if (versionInput && version && (!versionInput.value.trim() || versionInput.value.trim() === '1.0.0' || versionInput.value.trim() === state.formFileAutoVersion)) {
        versionInput.value = version;
        state.formFileAutoVersion = version;
      }
    }
    const formError = document.querySelector('#form-error');
    if (formError) formError.hidden = true;
  }

  function clearFormFile() {
    const field = currentFileField();
    state.formFile = state.formFileCurrent ? Object.assign({}, state.formFileCurrent, { fresh: false }) : null;
    paintFileField();
    if (!field || !field.autoFill) return;
    const body = document.querySelector('#form-body');
    const nameInput = body && fieldOf(body, 'name');
    if (nameInput && state.formFileAutoName && nameInput.value.trim() === state.formFileAutoName) {
      nameInput.value = '';
      state.formFileAutoName = '';
    }
    const versionInput = body && fieldOf(body, 'version');
    if (versionInput && state.formFileAutoVersion && versionInput.value.trim() === state.formFileAutoVersion) {
      versionInput.value = '1.0.0';
      state.formFileAutoVersion = '';
    }
  }

  function multiOption(field, value) {
    return (field.options || []).find((option) => String(option.value) === String(value));
  }

  function multiChipsHtml(field, ids) {
    if (!ids.length) return '<span class="multi-placeholder">' + esc(field.placeholder || '未选择') + '</span>';
    return ids.map((id) => {
      const option = multiOption(field, id);
      return '<span class="multi-chip">' + esc(option ? option.label : id) +
        '<button type="button" data-action="remove-multi" data-value="' + esc(id) + '" aria-label="移除">' + icon('x') + '</button></span>';
    }).join('');
  }

  function multiFieldHtml(field, value) {
    const ids = String(value || '').split(',').filter(Boolean);
    const options = (field.options || []).map((option) =>
      '<button type="button" class="multi-option' + (ids.indexOf(String(option.value)) >= 0 ? ' is-checked' : '') + '" data-action="toggle-multi-option" data-value="' + esc(option.value) + '">' +
        '<span class="multi-check">' + icon('check') + '</span>' +
        '<b>' + esc(option.label) + '</b>' +
        (option.meta ? '<small>' + esc(option.meta) + '</small>' : '') +
      '</button>').join('');
    return '<div class="field' + (field.wide ? ' wide' : '') + '" data-multi-field="' + field.name + '">' +
      '<span>' + esc(field.label) + (field.required ? ' <i>*</i>' : '') + '</span>' +
      '<div class="multi-select">' +
        '<button type="button" class="multi-trigger" data-action="toggle-multi" aria-expanded="false">' +
          '<span class="multi-chips" data-multi-chips>' + multiChipsHtml(field, ids) + '</span>' +
          icon('chevron-down') +
        '</button>' +
        '<div class="multi-panel" hidden>' + options + '</div>' +
      '</div>' +
      '<input type="hidden" name="' + field.name + '" value="' + esc(ids.join(',')) + '">' +
      (field.help ? '<span class="muted" style="font-size:9.5px">' + esc(field.help) + '</span>' : '') +
    '</div>';
  }

  function closeMultiPanels() {
    $$('[data-multi-field] .multi-panel').forEach((panel) => { panel.hidden = true; });
    $$('[data-multi-field] .multi-trigger').forEach((btn) => { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); });
  }

  function currentMultiField(wrapper) {
    const name = wrapper.dataset.multiField;
    return (state.formFields || []).find((field) => field.name === name) || { options: [] };
  }

  function paintMultiField(wrapper) {
    const field = currentMultiField(wrapper);
    const hidden = wrapper.querySelector('input[type="hidden"]');
    const ids = String(hidden.value || '').split(',').filter(Boolean);
    wrapper.querySelector('[data-multi-chips]').innerHTML = multiChipsHtml(field, ids);
    wrapper.querySelectorAll('.multi-option').forEach((option) => {
      option.classList.toggle('is-checked', ids.indexOf(String(option.dataset.value)) >= 0);
    });
  }

  function toggleMultiPanel(btn) {
    const panel = btn.parentElement.querySelector('.multi-panel');
    const open = panel.hidden;
    closeMultiPanels();
    panel.hidden = !open;
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleMultiOption(option) {
    const wrapper = option.closest('[data-multi-field]');
    if (!wrapper) return;
    const hidden = wrapper.querySelector('input[type="hidden"]');
    const ids = String(hidden.value || '').split(',').filter(Boolean);
    const value = String(option.dataset.value);
    const index = ids.indexOf(value);
    if (index >= 0) ids.splice(index, 1);
    else ids.push(value);
    hidden.value = ids.join(',');
    paintMultiField(wrapper);
  }

  function removeMultiChip(btn) {
    const wrapper = btn.closest('[data-multi-field]');
    if (!wrapper) return;
    const hidden = wrapper.querySelector('input[type="hidden"]');
    hidden.value = String(hidden.value || '').split(',').filter((id) => id !== btn.dataset.value).join(',');
    paintMultiField(wrapper);
  }

  function fieldHtml(field, values) {
    if (field.type === 'file') return fileFieldHtml(field);
    if (field.type === 'multi') {
      const multiValue = values && values[field.name] !== undefined ? values[field.name] : (field.value !== undefined ? field.value : '');
      return multiFieldHtml(field, multiValue);
    }
    const value = values && values[field.name] !== undefined ? values[field.name] : (field.value !== undefined ? field.value : '');
    const wide = field.wide ? ' wide' : '';
    let control = '';
    if (field.type === 'select') {
      const options = (field.options || []).map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return '<option value="' + esc(optionValue) + '"' + (String(value) === String(optionValue) ? ' selected' : '') + '>' + esc(optionLabel) + '</option>';
      }).join('');
      control = '<span class="input-wrap"><select name="' + field.name + '">' + options + '</select></span>';
    } else if (field.type === 'textarea') {
      control = '<span class="input-wrap"><textarea name="' + field.name + '" rows="' + (field.rows || 3) + '" placeholder="' + esc(field.placeholder || '') + '">' + esc(value) + '</textarea></span>';
    } else {
      control = '<span class="input-wrap"><input name="' + field.name + '" type="' + (field.type || 'text') + '" value="' + esc(value) + '" placeholder="' + esc(field.placeholder || '') + '"></span>';
    }
    return '<label class="field' + wide + '"><span>' + esc(field.label) + (field.required ? ' <i>*</i>' : '') + '</span>' +
      control + (field.help ? '<span class="muted" style="font-size:9.5px">' + esc(field.help) + '</span>' : '') +
    '</label>';
  }

  function openForm(options) {
    state.formSubmit = options.onSubmit;
    state.formFields = options.fields;
    $('#form-title').textContent = options.title;
    $('#form-sub').textContent = options.sub || '';
    $('#form-submit').textContent = options.submitText || '保存';
    $('#form-fields').innerHTML = options.fields.map((field) => fieldHtml(field, options.values)).join('');
    $('#form-error').hidden = true;
    openDialog($('#form-dialog'));
    const first = $('#form-fields input:not([type="file"]), #form-fields textarea, #form-fields select');
    if (first) setTimeout(() => first.focus(), 60);
  }

  function setFormError(message) {
    const error = $('#form-error');
    error.textContent = message;
    error.hidden = false;
  }

  function submitForm(event) {
    event.preventDefault();
    const form = event.target;
    const values = {};
    state.formFields.forEach((field) => {
      if (field.type === 'file') {
        values[field.name] = state.formFile ? state.formFile.name : '';
        return;
      }
      const control = fieldOf(form, field.name);
      values[field.name] = control ? String(control.value || '').trim() : '';
      if (field.type === 'textarea') values[field.name] = control ? control.value.trim() : '';
    });
    $('#form-error').hidden = true;
    for (const field of state.formFields) {
      if (field.required && !values[field.name]) {
        if (field.type === 'file') {
          setFormError(field.requiredMessage || '请上传「' + field.label + '」');
          const drop = document.querySelector('#form-file-drop');
          if (drop) {
            drop.classList.add('is-error');
            drop.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            drop.focus({ preventScroll: true });
          }
          return;
        }
        setFormError('请填写「' + field.label + '」');
        const control = fieldOf(form, field.name);
        if (control) control.focus();
        return;
      }
    }
    if (!state.formSubmit) return;
    const result = state.formSubmit(values);
    if (result === false) return;
    closeDialog($('#form-dialog'));
  }

  function askConfirm(title, message, onOk, options) {
    const opts = options || {};
    $('#confirm-title').textContent = title;
    $('#confirm-message').textContent = message;
    $('#confirm-ok').textContent = opts.okText || '确认删除';
    $('#confirm-ok').className = 'btn ' + (opts.danger === false ? 'btn-primary' : 'btn-danger');
    const warn = $('#confirm-warn');
    if (opts.warn) { warn.textContent = opts.warn; warn.hidden = false; } else warn.hidden = true;
    const cancel = $('#confirm-cancel');
    if (cancel) cancel.hidden = !!opts.alert;
    state.confirmAction = onOk;
    openDialog($('#confirm-dialog'));
  }

  /* ============================== 模型管理 ============================== */
  function renderModels(root) {
    const models = DB.models;
    const enabled = models.filter((model) => model.status === '启用').length;
    const high = models.filter((model) => Store.rank(model.level) >= rankOfLevelName('秘密', 3)).length;
    const defaultModel = models.find((model) => model.isDefault);
    root.innerHTML =
      pageHead('MODEL', '模型管理', '维护客户端可使用的模型与默认模型。模型按密级开放，用户只能看到自己密级及以下的模型。',
        '<button type="button" class="btn btn-primary" data-action="new-model">' + icon('plus') + '新增模型</button>') +
      statGrid([
        { label: '模型总数', value: models.length, icon: 'cpu', tone: 'tone-blue' },
        { label: '已启用', value: enabled, icon: 'check-circle', tone: 'tone-emerald' },
        { label: '秘密及以上', value: high, icon: 'lock', tone: 'tone-amber' },
        { label: '当前默认', value: defaultModel ? defaultModel.name : '未设置', icon: 'sparkles', tone: 'tone-violet' }
      ]) +
      '<div class="filter-card">' +
        '<label class="filter-item"><span>模型</span>' + searchBox('model-search', '搜索模型名称、提供商或说明', state.modelQuery) + '</label>' +
        selectFilter('状态', 'model-status', '<option value="all"' + (state.modelStatus === 'all' ? ' selected' : '') + '>全部状态</option>' +
          '<option value="启用"' + (state.modelStatus === '启用' ? ' selected' : '') + '>启用</option>' +
          '<option value="停用"' + (state.modelStatus === '停用' ? ' selected' : '') + '>停用</option>') +
      '</div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>模型列表</h2><p>停用或删除后，客户端将不再展示该模型</p></div><span class="tag tag-blue">' + icon('shield') + '密级准入</span></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>模型名称</th><th>提供商</th><th>上下文</th><th>数据密级</th><th>状态</th><th>默认</th><th>操作</th></tr></thead><tbody id="model-tbody"></tbody></table></div>' +
        tableFooter('model-total', models.length) +
      '</section>';
    paintModelRows();
  }

  function paintModelRows() {
    const tbody = $('#model-tbody');
    if (!tbody) return;
    const query = state.modelQuery.trim().toLowerCase();
    let list = DB.models.slice();
    if (state.modelStatus !== 'all') list = list.filter((model) => model.status === state.modelStatus);
    if (query) list = list.filter((model) => (model.name + model.provider + model.desc).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((model) =>
      '<tr>' +
        '<td><div class="cell-main"><span class="cell-ico tone-blue">' + icon('cpu') + '</span><span class="cell-copy"><b>' + esc(model.name) + '</b><small>' + esc(model.desc) + '</small></span></div></td>' +
        '<td><span class="muted">' + esc(model.provider) + '</span></td>' +
        '<td><span class="tag">' + esc(model.context) + '</span></td>' +
        '<td>' + levelBadge(model.level) + '</td>' +
        '<td>' + statusBadge(model.status) + '</td>' +
        '<td>' + (model.isDefault ? '<span class="tag tag-green">默认</span>' : '<button type="button" class="link-action" data-action="default-model" data-id="' + model.id + '">设为默认</button>') + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="link-action" data-action="toggle-model" data-id="' + model.id + '">' + (model.status === '启用' ? '停用' : '启用') + '</button>' +
          '<button type="button" class="icon-action" data-action="edit-model" data-id="' + model.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-model" data-id="' + model.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(7, '没有匹配的模型。');
    const total = $('#model-total');
    if (total) total.textContent = list.length;
  }

  function openModelForm(id) {
    const model = id ? DB.models.find((item) => item.id === id) : null;
    openForm({
      title: model ? '编辑模型' : '新增模型',
      sub: '模型将同步到客户端模型选择器，并按数据密级过滤。',
      submitText: model ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '模型名称', required: true, wide: true, placeholder: '例如：UWork-1.5-Pro' },
        { name: 'provider', label: '提供商', placeholder: '例如：UWork 自研 / 本地部署' },
        { name: 'context', label: '上下文长度', placeholder: '例如：128K' },
        { name: 'level', label: '数据密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'status', label: '状态', type: 'select', options: ['启用', '停用'] },
        { name: 'desc', label: '说明', type: 'textarea', wide: true, rows: 3, placeholder: '描述模型适用场景' }
      ],
      values: model || { provider: 'UWork 自研', context: '128K', level: 'L2', status: '启用' },
      onSubmit: function (values) {
        if (model) {
          model.name = values.name;
          model.provider = values.provider || 'UWork 自研';
          model.context = values.context || '128K';
          model.level = values.level;
          model.status = values.status;
          model.desc = values.desc || '';
        } else {
          DB.models.push({
            id: 'model-' + Date.now(),
            name: values.name,
            provider: values.provider || 'UWork 自研',
            context: values.context || '128K',
            level: values.level,
            status: values.status,
            isDefault: false,
            desc: values.desc || ''
          });
        }
        Store.save();
        renderModels($('#view-root'));
        toast(model ? '模型已更新' : '模型已新增');
        return true;
      }
    });
  }

  function toggleModel(id) {
    const model = DB.models.find((item) => item.id === id);
    if (!model) return;
    model.status = model.status === '启用' ? '停用' : '启用';
    Store.save();
    paintModelRows();
    toast('模型 ' + model.name + ' 已' + model.status);
  }

  function setDefaultModel(id) {
    const model = DB.models.find((item) => item.id === id);
    if (!model) return;
    DB.models.forEach((item) => { item.isDefault = item.id === id; });
    if (model.status !== '启用') model.status = '启用';
    Store.save();
    renderModels($('#view-root'));
    toast('已将 ' + model.name + ' 设为默认模型');
  }

  function deleteModel(id) {
    const model = DB.models.find((item) => item.id === id);
    if (!model) return;
    askConfirm('删除模型', '确定删除模型《' + model.name + '》吗？客户端将立即不可用。', () => {
      DB.models = DB.models.filter((item) => item.id !== id);
      if (model.isDefault && DB.models.length) DB.models[0].isDefault = true;
      Store.save();
      renderModels($('#view-root'));
      toast('模型已删除');
    });
  }

  /* ============================== 技能管理 ============================== */
  function renderSkills(root) {
    const skills = DB.skills;
    const enabled = skills.filter((item) => item.status === '启用').length;
    const folderTotal = DB.skillFolders.filter((folder) => folder.id !== 'sf0').length;
    const runs = skills.reduce((total, item) => total + (item.runs || 0), 0);
    const selected = state.skillFolder === 'all' ? null : DB.skillFolders.find((folder) => folder.id === state.skillFolder);
    if (state.skillFolder !== 'all' && !selected) state.skillFolder = 'all';
    const currentList = skillsInFolder(state.skillFolder);
    let tree = '<button type="button" class="tree-item' + (state.skillFolder === 'all' ? ' is-active' : '') + '" data-skill-folder="all">' +
      icon('list') + '<span class="label">全部技能</span><span class="count">' + skills.length + '</span></button>' +
      '<div class="tree-divider"></div>';
    const walk = (parent, depth) => {
      DB.skillFolders.filter((folder) => (folder.parent || null) === parent && folder.id !== 'sf0').forEach((folder) => {
        tree += '<button type="button" class="tree-item' + (state.skillFolder === folder.id ? ' is-active' : '') + '" data-skill-folder="' + folder.id + '" style="padding-left:' + (7 + depth * 14) + 'px" title="' + esc(folder.desc || folder.name) + '">' +
          icon(depth === 0 ? 'grid' : 'file') + '<span class="label">' + esc(folder.name) + '</span>' +
          '<span class="count">' + skillFolderCount(folder.id) + '</span></button>';
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 0);
    const unclassified = DB.skillFolders.find((folder) => folder.id === 'sf0');
    if (unclassified) {
      tree += '<div class="tree-divider"></div>' +
        '<button type="button" class="tree-item' + (state.skillFolder === unclassified.id ? ' is-active' : '') + '" data-skill-folder="' + unclassified.id + '" title="' + esc(unclassified.desc || '') + '">' +
          icon('file') + '<span class="label">' + esc(unclassified.name) + '</span><span class="count">' + skillFolderCount(unclassified.id) + '</span>' +
        '</button>';
    }
    root.innerHTML =
      pageHead('SKILL', '技能管理', '维护客户端已集成的专业技能。技能按目录层级组织，上传 .zip 技能包后按密级开放，可启用、停用或替换版本。',
        '<button type="button" class="btn" data-action="new-skill-folder">' + icon('folder-plus') + '新建目录</button>' +
        '<button type="button" class="btn btn-primary" data-action="new-skill">' + icon('plus') + '新增技能</button>') +
      statGrid([
        { label: '技能总数', value: skills.length, icon: 'sparkles', tone: 'tone-blue' },
        { label: '已启用', value: enabled, icon: 'check-circle', tone: 'tone-emerald' },
        { label: '技能目录', value: folderTotal, icon: 'folder-plus', tone: 'tone-violet' },
        { label: '累计调用', value: runs.toLocaleString('zh-CN'), icon: 'activity', tone: 'tone-amber' }
      ]) +
      '<div class="split-layout">' +
        '<aside class="tree-panel">' +
          '<div class="tree-panel-head"><span>技能目录</span><button type="button" class="icon-action" data-action="new-skill-folder" title="新建目录">' + icon('plus') + '</button></div>' +
          '<div class="tree-list">' + tree + '</div>' +
          '<p class="tree-tip">' + icon('info') + '目录可多级嵌套，客户端按目录筛选技能。</p>' +
        '</aside>' +
        '<section class="card">' +
          '<div class="card-head">' +
            '<div><h2>' + esc(selected ? selected.name : '全部技能') + ' <span class="muted" style="font-weight:400">' + currentList.length + ' 个</span></h2><p>' +
              (selected
                ? '目录路径：' + esc(Store.folderTrail(DB.skillFolders, selected.id).map((folder) => folder.name).join(' / ')) + ' · ' + esc(selected.owner || '系统管理员') + ' 维护'
                : '按目录层级维护技能，停用后客户端不再展示') +
            '</p></div>' +
            searchBox('skill-search', '搜索技能名称、目录或说明', state.skillQuery) +
            (selected && selected.id !== 'sf0'
              ? '<button type="button" class="btn btn-sm" data-action="edit-skill-folder" data-id="' + selected.id + '">' + icon('edit') + '编辑目录</button>' +
                '<button type="button" class="btn btn-sm btn-danger" data-action="delete-skill-folder" data-id="' + selected.id + '">' + icon('trash') + '删除</button>'
              : '') +
          '</div>' +
          '<div class="table-wrap"><table class="admin-table"><thead><tr><th>技能名称</th><th>所属目录</th><th>版本</th><th>技能包</th><th>数据密级</th><th>状态</th><th>调用次数</th><th>操作</th></tr></thead><tbody id="skill-tbody"></tbody></table></div>' +
          tableFooter('skill-total', currentList.length) +
        '</section>' +
      '</div>';
    paintSkillRows();
  }

  function paintSkillRows() {
    const tbody = $('#skill-tbody');
    if (!tbody) return;
    const query = state.skillQuery.trim().toLowerCase();
    let list = skillsInFolder(state.skillFolder).slice();
    if (query) list = list.filter((item) => (item.name + item.category + item.desc + skillFolderPath(item) + (item.pkg ? item.pkg.name : '')).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((skill) =>
      '<tr>' +
        '<td><div class="cell-main"><span class="cell-ico tone-violet">' + icon('sparkles') + '</span><span class="cell-copy"><b>' + esc(skill.name) + '</b><small>' + esc(skill.desc) + '</small></span></div></td>' +
        '<td><span class="skill-path" title="' + esc(skillFolderPath(skill)) + '"><span class="tag">' + esc((skillFolderOf(skill) || {}).name || '未分类') + '</span><small>' + esc(Store.folderTrail(DB.skillFolders, skill.folder).slice(0, -1).map((folder) => folder.name).join(' / ') || '根目录') + '</small></span></td>' +
        '<td><span class="muted">v' + esc(skill.version) + '</span></td>' +
        '<td>' + (skill.pkg
          ? '<div class="pkg-cell" title="' + esc(skill.pkg.name) + ' · ' + esc(skill.pkg.size || '') + ' · 上传于 ' + esc(skill.pkg.uploaded || '') + '"><span class="pkg-badge sm">ZIP</span><span class="pkg-cell-copy"><b>' + esc(skill.pkg.name) + '</b><small>' + esc(skill.pkg.size || '') + '</small></span></div>'
          : '<span class="muted">未上传</span>') + '</td>' +
        '<td>' + levelBadge(skill.level) + '</td>' +
        '<td>' + statusBadge(skill.status) + '</td>' +
        '<td><span class="tag">' + Number(skill.runs || 0).toLocaleString('zh-CN') + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="link-action" data-action="toggle-skill" data-id="' + skill.id + '">' + (skill.status === '启用' ? '停用' : '启用') + '</button>' +
          '<button type="button" class="icon-action" data-action="edit-skill" data-id="' + skill.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-skill" data-id="' + skill.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(8, '当前目录没有技能，可切换目录或新增技能。');
    const total = $('#skill-total');
    if (total) total.textContent = list.length;
  }

  function openSkillFolderForm(id) {
    const editing = id ? DB.skillFolders.find((folder) => folder.id === id) : null;
    if (editing && editing.id === 'sf0') { toast('「未分类」为系统目录，不可编辑'); return; }
    const blocked = new Set(editing ? [editing.id].concat(Store.descendants(DB.skillFolders, editing.id).map((folder) => folder.id)) : []);
    const parents = DB.skillFolders.filter((folder) => !blocked.has(folder.id) && folder.id !== 'sf0');
    openForm({
      title: editing ? '编辑技能目录' : '新建技能目录',
      sub: editing ? '调整目录名称与上级目录，已归属的技能会随之移动。' : '技能目录支持多级嵌套，客户端按目录筛选技能。',
      submitText: editing ? '保存修改' : '创建目录',
      fields: [
        { name: 'name', label: '目录名称', required: true, wide: true, placeholder: '例如：质量问题分析' },
        { name: 'parent', label: '上级目录', type: 'select', options: [{ value: '', label: '一级目录（根）' }].concat(parents.map((folder) => ({
          value: folder.id,
          label: new Array(Store.folderTrail(DB.skillFolders, folder.id).length).join('　') + folder.name
        }))) },
        { name: 'owner', label: '维护部门', placeholder: '例如：质量管理部' },
        { name: 'desc', label: '目录说明', type: 'textarea', wide: true, rows: 2, placeholder: '说明该目录收纳哪类技能' }
      ],
      values: editing
        ? { name: editing.name, parent: editing.parent || '', owner: editing.owner || '', desc: editing.desc || '' }
        : { parent: state.skillFolder !== 'all' && state.skillFolder !== 'sf0' ? state.skillFolder : '' },
      onSubmit: function (values) {
        const name = values.name.trim();
        if (!name) { setFormError('请填写目录名称'); return false; }
        const siblings = DB.skillFolders.filter((folder) => (folder.parent || null) === (values.parent || null) && folder.id !== (editing ? editing.id : ''));
        if (siblings.some((folder) => folder.name === name)) {
          setFormError('同级目录下已存在「' + name + '」，请换个名称');
          return false;
        }
        if (editing) {
          editing.name = name;
          editing.parent = values.parent || null;
          editing.owner = values.owner || editing.owner || '系统管理员';
          editing.desc = values.desc || '';
          writeAudit('技能目录', '编辑', name, '上级目录：' + (values.parent ? folderTrailText(DB.skillFolders, values.parent) : '根目录'));
          Store.save();
          renderSkills($('#view-root'));
          toast('目录已更新：' + name);
          return true;
        }
        const folder = {
          id: Store.uid('sf'),
          name: name,
          parent: values.parent || null,
          owner: values.owner || '系统管理员',
          desc: values.desc || ''
        };
        DB.skillFolders.push(folder);
        state.skillFolder = folder.id;
        writeAudit('技能目录', '新增', folder.name, folder.parent ? '上级目录：' + folderTrailText(DB.skillFolders, folder.parent) : '一级目录');
        Store.save();
        renderSkills($('#view-root'));
        toast('目录已创建：' + name);
        return true;
      }
    });
  }

  function deleteSkillFolder(id) {
    const folder = DB.skillFolders.find((item) => item.id === id);
    if (!folder) return;
    if (folder.id === 'sf0') { toast('「未分类」为系统目录，不可删除'); return; }
    const childCount = Store.descendants(DB.skillFolders, id).length;
    const skillCount = skillFolderCount(id);
    if (childCount || skillCount) {
      toast('目录下还有 ' + skillCount + ' 个技能、' + childCount + ' 个子目录（含下级），请先移走后删除');
      return;
    }
    askConfirm('删除技能目录', '确定删除技能目录《' + folder.name + '》吗？', () => {
      DB.skillFolders = DB.skillFolders.filter((item) => item.id !== id);
      state.skillFolder = folder.parent || 'all';
      writeAudit('技能目录', '删除', folder.name, '目录已删除');
      Store.save();
      renderSkills($('#view-root'));
      toast('目录已删除');
    });
  }


  function openSkillForm(id) {
    const skill = id ? DB.skills.find((item) => item.id === id) : null;
    const defaultFolder = skill
      ? (skill.folder || 'sf0')
      : (state.skillFolder !== 'all' ? state.skillFolder : 'sf0');
    const folderNameOf = (folderId) => {
      const folder = DB.skillFolders.find((item) => item.id === folderId);
      return folder ? folder.name : '未分类';
    };
    state.formFileCurrent = skill && skill.pkg ? Object.assign({}, skill.pkg) : null;
    state.formFile = state.formFileCurrent ? Object.assign({}, state.formFileCurrent, { fresh: false }) : null;
    state.formFileAutoName = '';
    state.formFileAutoVersion = '';
    openForm({
      title: skill ? '编辑技能' : '新增技能',
      sub: '上传 .zip 技能包并选择所属目录后，技能将出现在客户端技能页，用户可按目录筛选与密级使用。',
      submitText: skill ? '保存修改' : '确认新增',
      fields: [
        { name: 'pkg', label: '技能包', type: 'file', accept: '.zip', maxSize: 200, autoFill: true,
          required: !skill, wide: true, requiredMessage: '请上传技能包（.zip 文件）',
          dropTitle: '拖入技能包，或点击选择', dropHint: '仅支持 .zip 格式，点击或拖入即可上传',
          currentText: '当前技能包，点击可替换',
          help: '技能包为 .zip 压缩文件，包内需包含 skill.json（技能名称、版本与提示词），单个不超过 200 MB' },
        { name: 'name', label: '技能名称', required: true, wide: true, placeholder: '例如：质量8D分析' },
        { name: 'folder', label: '所属目录', type: 'select', options: skillFolderOptions(defaultFolder), help: '客户端技能页按该目录层级筛选' },
        { name: 'version', label: '版本号', placeholder: '例如：1.0.0' },
        { name: 'level', label: '数据密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'status', label: '状态', type: 'select', options: ['启用', '停用'] },
        { name: 'desc', label: '技能说明', type: 'textarea', wide: true, rows: 3, placeholder: '描述技能能力与适用场景' }
      ],
      values: skill || { folder: defaultFolder, version: '1.0.0', level: 'L2', status: '启用' },
      onSubmit: function (values) {
        const pkg = state.formFile ? {
          name: state.formFile.name,
          size: state.formFile.size || '',
          uploaded: state.formFile.fresh ? nowStamp() : (state.formFile.uploaded || nowStamp())
        } : null;
        const folderId = values.folder || 'sf0';
        const folderName = folderNameOf(folderId);
        if (skill) {
          skill.name = values.name;
          skill.folder = folderId;
          skill.category = folderName;
          skill.version = values.version || '1.0.0';
          skill.level = values.level;
          skill.status = values.status;
          skill.desc = values.desc || '';
          skill.pkg = pkg;
          writeAudit('技能', '编辑', skill.name, '目录「' + skillFolderPath(skill) + '」 · ' + levelInfo(skill.level).name + '级');
        } else {
          const created = {
            id: 'skill-' + Date.now(),
            name: values.name,
            folder: folderId,
            category: folderName,
            version: values.version || '1.0.0',
            level: values.level,
            status: values.status,
            desc: values.desc || '',
            runs: 0,
            pkg: pkg
          };
          DB.skills.push(created);
          writeAudit('技能', '新增', created.name, '目录「' + skillFolderPath(created) + '」 · ' + levelInfo(created.level).name + '级');
        }
        state.formFile = null;
        state.formFileCurrent = null;
        state.formFileAutoName = '';
        state.formFileAutoVersion = '';
        Store.save();
        renderSkills($('#view-root'));
        toast(skill ? '技能已更新' : '技能已新增');
        return true;
      }
    });
  }

  function toggleSkill(id) {
    const skill = DB.skills.find((item) => item.id === id);
    if (!skill) return;
    skill.status = skill.status === '启用' ? '停用' : '启用';
    Store.save();
    paintSkillRows();
    toast('技能 ' + skill.name + ' 已' + skill.status);
  }

  function deleteSkill(id) {
    const skill = DB.skills.find((item) => item.id === id);
    if (!skill) return;
    askConfirm('删除技能', '确定删除技能《' + skill.name + '》吗？', () => {
      DB.skills = DB.skills.filter((item) => item.id !== id);
      writeAudit('技能', '删除', skill.name, '目录「' + skillFolderPath(skill) + '」');
      Store.save();
      renderSkills($('#view-root'));
      toast('技能已删除');
    });
  }

  /* ============================== 连接器管理 ============================== */
  function renderConnectors(root) {
    const connectors = DB.connectors;
    const connected = connectors.filter((item) => item.status === '已连接').length;
    const folderTotal = DB.connectorFolders.filter((folder) => folder.id !== 'cf0').length;
    const high = connectors.filter((item) => Store.rank(item.level) >= rankOfLevelName('秘密', 3)).length;
    const selected = state.connectorFolder === 'all' ? null : DB.connectorFolders.find((folder) => folder.id === state.connectorFolder);
    if (state.connectorFolder !== 'all' && !selected) state.connectorFolder = 'all';
    const currentList = connectorsInFolder(state.connectorFolder);

    let tree = '<button type="button" class="tree-item' + (state.connectorFolder === 'all' ? ' is-active' : '') + '" data-connector-folder="all">' +
      icon('list') + '<span class="label">全部连接器</span><span class="count">' + connectors.length + '</span></button>' +
      '<div class="tree-divider"></div>';
    const walk = (parent, depth) => {
      DB.connectorFolders.filter((folder) => (folder.parent || null) === parent && folder.id !== 'cf0').forEach((folder) => {
        tree += '<button type="button" class="tree-item' + (state.connectorFolder === folder.id ? ' is-active' : '') + '" data-connector-folder="' + folder.id + '" style="padding-left:' + (7 + depth * 14) + 'px" title="' + esc(folder.desc || folder.name) + '">' +
          icon(depth === 0 ? 'grid' : 'file') + '<span class="label">' + esc(folder.name) + '</span>' +
          '<span class="count">' + connectorFolderCount(folder.id) + '</span></button>';
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 0);
    const unclassified = DB.connectorFolders.find((folder) => folder.id === 'cf0');
    if (unclassified) {
      tree += '<div class="tree-divider"></div>' +
        '<button type="button" class="tree-item' + (state.connectorFolder === unclassified.id ? ' is-active' : '') + '" data-connector-folder="' + unclassified.id + '" title="' + esc(unclassified.desc || '') + '">' +
          icon('file') + '<span class="label">' + esc(unclassified.name) + '</span><span class="count">' + connectorFolderCount(unclassified.id) + '</span>' +
        '</button>';
    }

    root.innerHTML =
      pageHead('CONNECTOR', '连接器管理', '维护客户端可以接入的业务系统。连接器按分类层级组织，状态与密级将直接影响客户端的可连接列表。',
        '<button type="button" class="btn" data-action="new-connector-folder">' + icon('folder-plus') + '新建分类</button>' +
        '<button type="button" class="btn btn-primary" data-action="new-connector">' + icon('plus') + '新增连接器</button>') +
      statGrid([
        { label: '连接器总数', value: connectors.length, icon: 'link', tone: 'tone-blue' },
        { label: '已连接', value: connected, icon: 'check-circle', tone: 'tone-emerald' },
        { label: '接入分类', value: folderTotal, icon: 'grid', tone: 'tone-violet' },
        { label: '秘密及以上', value: high, icon: 'lock', tone: 'tone-amber' }
      ]) +
      '<div class="split-layout">' +
        '<aside class="tree-panel">' +
          '<div class="tree-panel-head"><span>连接器分类</span><button type="button" class="icon-action" data-action="new-connector-folder" title="新建分类">' + icon('plus') + '</button></div>' +
          '<div class="tree-list">' + tree + '</div>' +
          '<p class="tree-tip">' + icon('info') + '分类可多级嵌套，客户端按分类筛选连接器。' + '</p>' +
        '</aside>' +
        '<section class="card">' +
          '<div class="card-head">' +
            '<div><h2>' + esc(selected ? selected.name : '全部连接器') + ' <span class="muted" style="font-weight:400">' + currentList.length + ' 个</span></h2><p>' +
              (selected
                ? '分类路径：' + esc(Store.folderTrail(DB.connectorFolders, selected.id).map((folder) => folder.name).join(' / ')) + ' · ' + esc(selected.owner || '系统管理员') + ' 维护'
                : '按分类层级维护连接器，未连接或已停用的连接器不会出现在客户端') +
            '</p></div>' +
            searchBox('connector-search', '搜索名称、分类或接入地址', state.connectorQuery) +
            (selected && selected.id !== 'cf0'
              ? '<button type="button" class="btn btn-sm" data-action="edit-connector-folder" data-id="' + selected.id + '">' + icon('edit') + '编辑分类</button>' +
                '<button type="button" class="btn btn-sm btn-danger" data-action="delete-connector-folder" data-id="' + selected.id + '">' + icon('trash') + '删除</button>'
              : '') +
          '</div>' +
          '<div class="table-wrap"><table class="admin-table"><thead><tr><th>连接器</th><th>所属分类</th><th>接入地址</th><th>数据密级</th><th>状态</th><th>操作</th></tr></thead><tbody id="connector-tbody"></tbody></table></div>' +
          tableFooter('connector-total', currentList.length) +
        '</section>' +
      '</div>';
    paintConnectorRows();
  }

  function paintConnectorRows() {
    const tbody = $('#connector-tbody');
    if (!tbody) return;
    const query = state.connectorQuery.trim().toLowerCase();
    let list = connectorsInFolder(state.connectorFolder).slice();
    if (query) list = list.filter((item) => (item.name + ' ' + item.category + ' ' + connectorFolderPath(item) + ' ' + item.endpoint + ' ' + item.desc).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((connector) =>
      '<tr>' +
        '<td><div class="cell-main"><span class="cell-ico tone-emerald">' + icon('link') + '</span><span class="cell-copy"><b>' + esc(connector.name) + '</b><small>' + esc(connector.desc) + '</small></span></div></td>' +
        '<td><span class="skill-path" title="' + esc(connectorFolderPath(connector)) + '"><span class="tag">' + esc((connectorFolderOf(connector) || {}).name || '未分类') + '</span><small>' + esc(Store.folderTrail(DB.connectorFolders, connector.folder).slice(0, -1).map((folder) => folder.name).join(' / ') || '根目录') + '</small></span></td>' +
        '<td><span class="muted" style="font-family:var(--mono)">' + esc(connector.endpoint) + '</span></td>' +
        '<td>' + levelBadge(connector.level) + '</td>' +
        '<td>' + statusBadge(connector.status) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="link-action" data-action="toggle-connector" data-id="' + connector.id + '">' + (connector.status === '已连接' ? '断开' : '连接') + '</button>' +
          '<button type="button" class="icon-action" data-action="edit-connector" data-id="' + connector.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-connector" data-id="' + connector.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(6, '当前分类没有连接器，可切换分类或新增连接器。');
    const total = $('#connector-total');
    if (total) total.textContent = list.length;
  }

  function openConnectorFolderForm(id) {
    const editing = id ? DB.connectorFolders.find((folder) => folder.id === id) : null;
    if (editing && editing.id === 'cf0') { toast('「未分类」为系统分类，不可编辑'); return; }
    const blocked = new Set(editing ? [editing.id].concat(Store.descendants(DB.connectorFolders, editing.id).map((folder) => folder.id)) : []);
    const parents = DB.connectorFolders.filter((folder) => !blocked.has(folder.id) && folder.id !== 'cf0');
    openForm({
      title: editing ? '编辑连接器分类' : '新建连接器分类',
      sub: editing ? '调整分类名称与上级分类，已归属的连接器会随之移动。' : '连接器分类支持多级嵌套，客户端按分类筛选连接器。',
      submitText: editing ? '保存修改' : '创建分类',
      fields: [
        { name: 'name', label: '分类名称', required: true, wide: true, placeholder: '例如：即时通讯' },
        { name: 'parent', label: '上级分类', type: 'select', options: [{ value: '', label: '一级分类（根）' }].concat(parents.map((folder) => ({
          value: folder.id,
          label: new Array(Store.folderTrail(DB.connectorFolders, folder.id).length).join('　') + folder.name
        }))) },
        { name: 'owner', label: '维护部门', placeholder: '例如：信息技术部' },
        { name: 'desc', label: '分类说明', type: 'textarea', wide: true, rows: 2, placeholder: '说明该分类收纳哪类连接器' }
      ],
      values: editing
        ? { name: editing.name, parent: editing.parent || '', owner: editing.owner || '', desc: editing.desc || '' }
        : { parent: state.connectorFolder !== 'all' && state.connectorFolder !== 'cf0' ? state.connectorFolder : '' },
      onSubmit: function (values) {
        const name = values.name.trim();
        if (!name) { setFormError('请填写分类名称'); return false; }
        const siblings = DB.connectorFolders.filter((folder) => (folder.parent || null) === (values.parent || null) && folder.id !== (editing ? editing.id : ''));
        if (siblings.some((folder) => folder.name === name)) {
          setFormError('同级分类下已存在「' + name + '」，请换个名称');
          return false;
        }
        if (editing) {
          editing.name = name;
          editing.parent = values.parent || null;
          editing.owner = values.owner || editing.owner || '系统管理员';
          editing.desc = values.desc || '';
          writeAudit('连接器分类', '编辑', name, '上级分类：' + (values.parent ? folderTrailText(DB.connectorFolders, values.parent) : '根目录'));
          Store.save();
          renderConnectors($('#view-root'));
          toast('分类已更新：' + name);
          return true;
        }
        const folder = {
          id: Store.uid('cf'),
          name: name,
          parent: values.parent || null,
          owner: values.owner || '系统管理员',
          desc: values.desc || ''
        };
        DB.connectorFolders.push(folder);
        state.connectorFolder = folder.id;
        writeAudit('连接器分类', '新增', folder.name, folder.parent ? '上级分类：' + folderTrailText(DB.connectorFolders, folder.parent) : '一级分类');
        Store.save();
        renderConnectors($('#view-root'));
        toast('分类已创建：' + name);
        return true;
      }
    });
  }

  function deleteConnectorFolder(id) {
    const folder = DB.connectorFolders.find((item) => item.id === id);
    if (!folder) return;
    if (folder.id === 'cf0') { toast('「未分类」为系统分类，不可删除'); return; }
    const childCount = Store.descendants(DB.connectorFolders, id).length;
    const connectorCount = connectorFolderCount(id);
    if (childCount || connectorCount) {
      toast('分类下还有 ' + connectorCount + ' 个连接器、' + childCount + ' 个子分类（含下级），请先移走后删除');
      return;
    }
    const folderPath = folderTrailText(DB.connectorFolders, folder.id);
    askConfirm('删除连接器分类', '确定删除分类《' + folder.name + '》吗？', () => {
      DB.connectorFolders = DB.connectorFolders.filter((item) => item.id !== id);
      state.connectorFolder = folder.parent || 'all';
      writeAudit('连接器分类', '删除', folder.name, folderPath);
      Store.save();
      renderConnectors($('#view-root'));
      toast('分类已删除：' + folder.name);
    });
  }

  function openConnectorForm(id) {
    const connector = id ? DB.connectors.find((item) => item.id === id) : null;
    const defaultFolder = connector ? connector.folder : (state.connectorFolder !== 'all' ? state.connectorFolder : 'cf0');
    openForm({
      title: connector ? '编辑连接器' : '新增连接器',
      sub: '连接器用于访问企业业务系统，客户端只会展示密级允许的连接器。',
      submitText: connector ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '连接器名称', required: true, wide: true, placeholder: '例如：企业微信' },
        { name: 'folder', label: '所属分类', type: 'select', options: connectorFolderOptions(defaultFolder), help: '客户端连接器页按该分类层级筛选' },
        { name: 'endpoint', label: '接入地址', placeholder: '例如：qy.weixin.qq.com' },
        { name: 'level', label: '数据密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'status', label: '连接状态', type: 'select', options: ['已连接', '未连接'] },
        { name: 'desc', label: '连接器说明', type: 'textarea', wide: true, rows: 3, placeholder: '描述可访问的业务能力' }
      ],
      values: connector || { folder: openConnectorFolderDefault(), endpoint: '', level: 'L2', status: '已连接' },
      onSubmit: function (values) {
        const folder = DB.connectorFolders.find((item) => item.id === values.folder) || DB.connectorFolders[0];
        if (connector) {
          connector.name = values.name;
          connector.folder = folder.id;
          connector.category = folder.name;
          connector.endpoint = values.endpoint || '—';
          connector.level = values.level;
          connector.status = values.status;
          connector.desc = values.desc || '';
        } else {
          DB.connectors.push({
            id: 'connector-' + Date.now(),
            name: values.name,
            folder: folder.id,
            category: folder.name,
            endpoint: values.endpoint || '—',
            level: values.level,
            configured: true,
            status: values.status,
            desc: values.desc || '',
            brand: '#5b7cfa',
            mark: 'link'
          });
        }
        Store.save();
        renderConnectors($('#view-root'));
        toast(connector ? '连接器已更新' : '连接器已新增');
        return true;
      }
    });
  }

  function openConnectorFolderDefault() {
    return state.connectorFolder !== 'all' ? state.connectorFolder : 'cf0';
  }

  function toggleConnector(id) {
    const connector = DB.connectors.find((item) => item.id === id);
    if (!connector) return;
    connector.status = connector.status === '已连接' ? '未连接' : '已连接';
    Store.save();
    paintConnectorRows();
    toast(connector.name + ' 已' + connector.status);
  }

  function deleteConnector(id) {
    const connector = DB.connectors.find((item) => item.id === id);
    if (!connector) return;
    askConfirm('删除连接器', '确定删除连接器《' + connector.name + '》吗？', () => {
      DB.connectors = DB.connectors.filter((item) => item.id !== id);
      Store.save();
      renderConnectors($('#view-root'));
      toast('连接器已删除');
    });
  }

  /* ============================== 软件更新 ============================== */
  function versionParts(value) {
    const text = String(value || '').trim();
    const pieces = text.split('-');
    return { core: pieces[0].split('.').map((part) => parseInt(part, 10) || 0), pre: pieces[1] || '' };
  }

  function compareClientVersion(a, b) {
    const left = versionParts(a);
    const right = versionParts(b);
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

  function isValidVersion(value) {
    return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(value || '').trim());
  }

  function clientReleases() {
    return DB.clientReleases || [];
  }

  function latestPublished(channel) {
    const list = clientReleases().filter((item) => item.status === '已发布' && (!channel || item.channel === channel));
    return list.sort((a, b) => compareClientVersion(b.version, a.version))[0] || null;
  }

  function updatePolicy() {
    return DB.clientUpdatePolicy || { minVersion: '1.4.0', channel: '正式版', checkOnLaunch: true, interval: '每 6 小时' };
  }

  function renderUpdates(root) {
    const releases = clientReleases();
    const policy = updatePolicy();
    const latest = latestPublished(policy.channel || '正式版');
    const published = releases.filter((item) => item.status === '已发布').length;
    const drafts = releases.filter((item) => item.status === '草稿').length;
    const downloads = releases.reduce((total, item) => total + (item.downloads || 0), 0);
    root.innerHTML =
      pageHead('CLIENT · UPDATE', '软件更新', '发布客户端安装包并维护更新策略。客户端启动或手动检查时比较版本号，按策略提示或强制更新。',
        '<button type="button" class="btn" data-action="edit-update-policy">' + icon('sliders') + '更新策略</button>' +
        '<button type="button" class="btn btn-primary" data-action="new-release">' + icon('plus') + '发布新版本</button>') +
      statGrid([
        { label: '最新' + (policy.channel || '正式版'), value: latest ? 'v' + latest.version : '—', icon: 'download', tone: 'tone-blue' },
        { label: '已发布版本', value: published, icon: 'check-circle', tone: 'tone-emerald' },
        { label: '累计下载', value: downloads.toLocaleString('zh-CN'), icon: 'activity', tone: 'tone-amber' },
        { label: '待发布草稿', value: drafts, icon: 'edit', tone: 'tone-violet' }
      ]) +
      '<div class="filter-card">' +
        '<label class="filter-item"><span>版本</span>' + searchBox('release-search', '搜索版本号、平台或更新说明', state.releaseQuery) + '</label>' +
        selectFilter('状态', 'release-status', '<option value="all"' + (state.releaseStatus === 'all' ? ' selected' : '') + '>全部状态</option>' +
          ['已发布', '草稿', '已下架'].map((status) => '<option value="' + status + '"' + (state.releaseStatus === status ? ' selected' : '') + '>' + status + '</option>').join('')) +
      '</div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>版本列表</h2><p>发布后客户端下次检查更新时生效，下架后自动回退到渠道内的上一个版本</p></div><span class="tag tag-blue">' + icon('refresh') + '自动更新</span></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>版本号</th><th>渠道</th><th>平台</th><th>更新方式</th><th>状态</th><th>发布时间</th><th>下载量</th><th>操作</th></tr></thead><tbody id="release-tbody"></tbody></table></div>' +
        tableFooter('release-total', releases.length) +
      '</section>';
    paintReleaseRows();
  }

  function paintReleaseRows() {
    const tbody = $('#release-tbody');
    if (!tbody) return;
    const query = state.releaseQuery.trim().toLowerCase();
    const policy = updatePolicy();
    const latest = latestPublished(policy.channel || '正式版');
    let list = clientReleases().slice().sort((a, b) => compareClientVersion(b.version, a.version));
    if (state.releaseStatus !== 'all') list = list.filter((item) => item.status === state.releaseStatus);
    if (query) list = list.filter((item) => (item.version + item.channel + item.platform + (item.notes || []).join('')).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((release) => {
      const actions = [];
      if (release.status === '草稿') actions.push('<button type="button" class="link-action" data-action="publish-release" data-id="' + release.id + '">发布</button>');
      if (release.status === '已发布') actions.push('<button type="button" class="link-action" data-action="unpublish-release" data-id="' + release.id + '">下架</button>');
      if (release.status === '已下架') actions.push('<button type="button" class="link-action" data-action="publish-release" data-id="' + release.id + '">重新发布</button>');
      actions.push('<button type="button" class="icon-action" data-action="edit-release" data-id="' + release.id + '" title="编辑">' + icon('edit') + '</button>');
      actions.push('<button type="button" class="icon-action is-danger" data-action="delete-release" data-id="' + release.id + '" title="删除">' + icon('trash') + '</button>');
      return '<tr>' +
        '<td><div class="release-version-cell"><b>v' + esc(release.version) + '</b>' + (latest && latest.id === release.id ? '<span class="tag tag-green">最新</span>' : '') + '</div><small>' + esc(release.file) + ' · ' + esc(release.size) + '</small></td>' +
        '<td><span class="tag ' + (release.channel === '正式版' ? 'tag-blue' : 'tag-amber') + '">' + esc(release.channel) + '</span></td>' +
        '<td><span class="muted">' + esc(release.platform) + '</span></td>' +
        '<td>' + (release.updateType === '强制更新' ? '<span class="tag tag-red">强制更新</span>' : '<span class="tag">可选更新</span>') + '</td>' +
        '<td>' + statusBadge(release.status) + '</td>' +
        '<td><span class="muted">' + esc(release.publishedAt) + '</span></td>' +
        '<td><span class="tag">' + Number(release.downloads || 0).toLocaleString('zh-CN') + '</span></td>' +
        '<td><div class="row-actions">' + actions.join('') + '</div></td>' +
      '</tr>';
    }).join('') : emptyTableRow(8, '没有匹配的版本。');
    const total = $('#release-total');
    if (total) total.textContent = list.length;
  }

  function openReleaseForm(id) {
    const release = id ? clientReleases().find((item) => item.id === id) : null;
    state.formFileCurrent = release ? { name: release.file, size: release.size, fresh: false } : null;
    state.formFile = state.formFileCurrent ? Object.assign({}, state.formFileCurrent) : null;
    state.formFileAutoName = '';
    state.formFileAutoVersion = '';
    const fields = [
      { name: 'version', label: '版本号', required: true, placeholder: '例如：1.6.0', help: '语义化版本，如 1.6.0；灰度版本可带后缀' },
      { name: 'channel', label: '发布渠道', type: 'select', options: ['正式版', '灰度版'] },
      { name: 'platform', label: '客户端平台', type: 'select', options: ['Windows', 'macOS', '全平台'] },
      { name: 'updateType', label: '更新方式', type: 'select', options: ['可选更新', '强制更新'] }
    ];
    if (!release) fields.push({ name: 'publish', label: '发布状态', type: 'select', options: ['立即发布', '保存草稿'], wide: true, help: '草稿不会出现在客户端检查结果中' });
    fields.push(
      { name: 'installer', label: '安装包', type: 'file', accept: '.exe,.msi,.dmg,.zip', maxSize: 500, autoFill: false,
        required: true, wide: true, requiredMessage: '请上传客户端安装包',
        dropTitle: '拖入安装包，或点击选择', dropHint: '支持 .exe / .msi / .dmg / .zip，单个不超过 500 MB',
        currentText: '当前安装包，点击可替换',
        help: '安装包仅保存文件名与大小用于演示，不会写入真实文件' },
      { name: 'notes', label: '更新说明', type: 'textarea', wide: true, rows: 4, required: true, placeholder: '每行一条，例如：\n新增软件更新管理\n优化启动速度' }
    );
    openForm({
      title: release ? '编辑版本 v' + release.version : '发布新版本',
      sub: '发布后客户端启动或手动检查时会比较版本号，并提示下载安装包。',
      submitText: release ? '保存修改' : '确认发布',
      fields: fields,
      values: release
        ? { version: release.version, channel: release.channel, platform: release.platform, updateType: release.updateType, notes: (release.notes || []).join('\n') }
        : { channel: '正式版', platform: 'Windows', updateType: '可选更新', publish: '立即发布', notes: '' },
      onSubmit: function (values) {
        const version = String(values.version || '').trim().replace(/^v/i, '');
        if (!isValidVersion(version)) { setFormError('版本号格式不正确，请使用 1.6.0 或 1.7.0-beta.1 这样的格式'); return false; }
        if (clientReleases().some((item) => item.version === version && (!release || item.id !== release.id))) {
          setFormError('版本号 v' + version + ' 已存在，请使用新的版本号');
          return false;
        }
        const notes = String(values.notes || '').split('\n').map((line) => line.trim()).filter(Boolean);
        if (!notes.length) { setFormError('请填写至少一条更新说明'); return false; }
        if (!state.formFile) { setFormError('请上传客户端安装包'); return false; }
        const publishNow = !release && values.publish === '立即发布';
        if (publishNow) {
          const latest = latestPublished(values.channel);
          if (latest && compareClientVersion(version, latest.version) <= 0) {
            setFormError('版本号需高于' + values.channel + '当前最新版本 v' + latest.version);
            return false;
          }
        }
        if (release && release.status === '已发布') {
          const others = clientReleases().filter((item) => item.status === '已发布' && item.channel === values.channel && item.id !== release.id);
          const highest = others.sort((a, b) => compareClientVersion(b.version, a.version))[0];
          if (highest && compareClientVersion(version, highest.version) <= 0) {
            setFormError('已发布版本号需高于同渠道其他版本 v' + highest.version);
            return false;
          }
        }
        const payload = {
          version: version,
          channel: values.channel,
          platform: values.platform,
          updateType: values.updateType,
          file: state.formFile.name,
          size: state.formFile.size,
          notes: notes
        };
        if (release) {
          Object.assign(release, payload);
        } else {
          clientReleases().unshift(Object.assign({
            id: 'rel-' + Date.now(),
            status: publishNow ? '已发布' : '草稿',
            publishedAt: publishNow ? nowStamp() : '—',
            downloads: 0
          }, payload));
        }
        state.formFile = null;
        state.formFileCurrent = null;
        state.formFileAutoName = '';
        state.formFileAutoVersion = '';
        Store.save();
        renderUpdates($('#view-root'));
        toast(release ? '版本信息已更新' : (publishNow ? 'v' + version + ' 已发布' : 'v' + version + ' 已保存为草稿'));
        return true;
      }
    });
  }

  function publishRelease(id) {
    const release = clientReleases().find((item) => item.id === id);
    if (!release) return;
    if (release.status === '已发布') return;
    const latest = latestPublished(release.channel);
    if (latest && compareClientVersion(release.version, latest.version) <= 0) {
      toast('版本号需高于' + release.channel + '当前最新版本 v' + latest.version);
      return;
    }
    askConfirm('发布版本', '确定将 v' + release.version + ' 发布到' + release.channel + '吗？发布后客户端检查更新时将收到该版本。', () => {
      release.status = '已发布';
      release.publishedAt = nowStamp();
      Store.save();
      renderUpdates($('#view-root'));
      toast('v' + release.version + ' 已发布');
    }, { okText: '确认发布', danger: false });
  }

  function unpublishRelease(id) {
    const release = clientReleases().find((item) => item.id === id);
    if (!release) return;
    askConfirm('下架版本', '确定下架 v' + release.version + ' 吗？客户端下次检查时会回退到渠道内的上一个版本。', () => {
      release.status = '已下架';
      Store.save();
      renderUpdates($('#view-root'));
      toast('v' + release.version + ' 已下架');
    }, { okText: '确认下架', danger: false });
  }

  function deleteRelease(id) {
    const release = clientReleases().find((item) => item.id === id);
    if (!release) return;
    if (release.status === '已发布') { toast('请先下架该版本，再执行删除'); return; }
    askConfirm('删除版本', '确定删除 v' + release.version + ' 的发布记录吗？删除后不可恢复。', () => {
      DB.clientReleases = clientReleases().filter((item) => item.id !== id);
      Store.save();
      renderUpdates($('#view-root'));
      toast('版本记录已删除');
    });
  }

  function openUpdatePolicyForm() {
    const policy = updatePolicy();
    openForm({
      title: '更新策略',
      sub: '客户端会按此策略检查更新；低于最低支持版本时必须更新后才能继续使用。',
      submitText: '保存策略',
      fields: [
        { name: 'minVersion', label: '最低支持版本', required: true, placeholder: '例如：1.4.0', help: '低于该版本的客户端将被强制更新' },
        { name: 'channel', label: '客户端更新渠道', type: 'select', options: ['正式版', '灰度版'] },
        { name: 'checkOnLaunch', label: '启动时检查', type: 'select', options: ['开启', '关闭'] },
        { name: 'interval', label: '检查频率', type: 'select', options: ['每次启动', '每 6 小时', '每天一次'] }
      ],
      values: { minVersion: policy.minVersion, channel: policy.channel, checkOnLaunch: policy.checkOnLaunch === false ? '关闭' : '开启', interval: policy.interval },
      onSubmit: function (values) {
        const minVersion = String(values.minVersion || '').trim().replace(/^v/i, '');
        if (!isValidVersion(minVersion)) { setFormError('最低支持版本格式不正确，请使用 1.4.0 这样的格式'); return false; }
        const latest = latestPublished(values.channel);
        if (latest && compareClientVersion(minVersion, latest.version) > 0) {
          setFormError('最低支持版本不能高于' + values.channel + '最新版本 v' + latest.version);
          return false;
        }
        DB.clientUpdatePolicy = {
          minVersion: minVersion,
          channel: values.channel,
          checkOnLaunch: values.checkOnLaunch !== '关闭',
          interval: values.interval
        };
        Store.save();
        renderUpdates($('#view-root'));
        toast('更新策略已保存');
        return true;
      }
    });
  }


  /* ============================== 用户管理 ============================== */
  function deptOptions(selected) {
    const walk = (parent, depth) => DB.departments.filter((dep) => dep.parent === parent).map((dep) =>
      '<option value="' + esc(dep.name) + '"' + (selected === dep.name ? ' selected' : '') + '>' +
        new Array(depth + 1).join('　') + esc(dep.name) + '</option>' +
        walk(dep.id, depth + 1)
    ).join('');
    return walk(null, 0);
  }

  function renderUsers(root) {
    const users = DB.users;
    const active = users.filter((user) => user.status === '启用').length;
    const privileged = users.filter((user) => Store.rank(user.level) >= rankOfLevelName('秘密', 3)).length;
    const depts = Array.from(new Set(users.map((user) => user.dept))).length;
    root.innerHTML =
      pageHead('SYSTEM · USER', '用户管理', '维护企业用户、部门、角色与数据密级。用户密级决定客户端能看到的知识、模板与能力。',
        '<button type="button" class="btn btn-primary" data-action="new-user">' + icon('plus') + '新增用户</button>') +
      statGrid([
        { label: '用户总数', value: users.length, icon: 'users', tone: 'tone-blue' },
        { label: '启用账号', value: active, icon: 'check-circle', tone: 'tone-emerald' },
        { label: '秘密及以上', value: privileged, icon: 'shield', tone: 'tone-amber' },
        { label: '覆盖部门', value: depts, icon: 'building', tone: 'tone-violet' }
      ]) +
      '<div class="filter-card">' +
        '<label class="filter-item"><span>用户</span>' + searchBox('user-search', '搜索姓名、账号、部门或角色', state.userQuery) + '</label>' +
        selectFilter('数据密级', 'user-level', levelOptions(state.userLevel, true)) +
        selectFilter('状态', 'user-status', '<option value="all"' + (state.userStatus === 'all' ? ' selected' : '') + '>全部状态</option>' +
          '<option value="启用"' + (state.userStatus === '启用' ? ' selected' : '') + '>启用</option>' +
          '<option value="停用"' + (state.userStatus === '停用' ? ' selected' : '') + '>停用</option>') +
      '</div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>用户列表</h2><p>修改密级会立即影响该账号在客户端的可见内容</p></div><span class="tag tag-amber">' + icon('info') + '客户端需重新登录生效</span></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>用户</th><th>部门</th><th>角色</th><th>岗位</th><th>数据密级</th><th>状态</th><th>最近登录</th><th>操作</th></tr></thead><tbody id="user-tbody"></tbody></table></div>' +
        tableFooter('user-total', users.length) +
      '</section>';
    paintUserRows();
  }

  function paintUserRows() {
    const tbody = $('#user-tbody');
    if (!tbody) return;
    const query = state.userQuery.trim().toLowerCase();
    let list = DB.users.slice();
    if (state.userLevel !== 'all') list = list.filter((user) => user.level === state.userLevel);
    if (state.userStatus !== 'all') list = list.filter((user) => user.status === state.userStatus);
    if (query) list = list.filter((user) => (user.name + user.username + user.dept + user.role + user.position).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((user) =>
      '<tr>' +
        '<td><div class="avatar-cell"><span class="avatar">' + avatar(user.name) + '</span><span class="cell-copy"><b>' + esc(user.name) + '</b><small>' + esc(user.username) + '@uwork.cn</small></span></div></td>' +
        '<td><span class="muted">' + esc(user.dept) + '</span></td>' +
        '<td><span class="tag">' + esc(user.role) + '</span></td>' +
        '<td><span class="muted">' + esc(user.position) + '</span></td>' +
        '<td>' + levelBadge(user.level) + '</td>' +
        '<td>' + statusBadge(user.status) + '</td>' +
        '<td><span class="muted">' + esc(user.lastLogin || '—') + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="link-action" data-action="toggle-user" data-id="' + user.id + '">' + (user.status === '启用' ? '停用' : '启用') + '</button>' +
          '<button type="button" class="icon-action" data-action="edit-user" data-id="' + user.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-user" data-id="' + user.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(8, '没有匹配的用户。');
    const total = $('#user-total');
    if (total) total.textContent = list.length;
  }

  function openUserForm(id) {
    const user = id ? DB.users.find((item) => item.id === id) : null;
    openForm({
      title: user ? '编辑用户' : '新增用户',
      sub: '数据密级必须与岗位密级匹配，客户端按此过滤知识、模板与能力。',
      submitText: user ? '保存修改' : '确认新增',
      fields: [
        { name: 'username', label: '登录账号', required: true, placeholder: '例如：zhangming' },
        { name: 'name', label: '姓名', required: true, placeholder: '例如：张明' },
        { name: 'dept', label: '所属部门', type: 'select', options: DB.departments.filter((dep) => !dep.parent).map((dep) => dep.name) },
        { name: 'role', label: '角色', type: 'select', options: DB.roles.map((role) => role.name) },
        { name: 'position', label: '岗位', type: 'select', options: DB.positions.map((post) => post.name) },
        { name: 'level', label: '数据密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'status', label: '账号状态', type: 'select', options: ['启用', '停用'] },
        { name: 'phone', label: '手机号', placeholder: '138 **** 0000' },
        { name: 'email', label: '邮箱', wide: true, placeholder: 'name@uwork.cn' }
      ],
      values: user || { dept: '质量管理部', role: '普通员工', position: '质量工程师', level: 'L2', status: '启用', phone: '', email: '' },
      onSubmit: function (values) {
        const duplicate = DB.users.find((item) => item.username === values.username && (!user || item.id !== user.id));
        if (duplicate) { setFormError('登录账号已存在，请更换'); return false; }
        if (user) {
          user.username = values.username;
          user.name = values.name;
          user.dept = values.dept;
          user.role = values.role;
          user.position = values.position;
          user.level = values.level;
          user.status = values.status;
          user.phone = values.phone;
          user.email = values.email;
        } else {
          DB.users.push({
            id: 'user-' + Date.now(),
            username: values.username,
            name: values.name,
            dept: values.dept,
            role: values.role,
            position: values.position,
            level: values.level,
            status: values.status,
            phone: values.phone,
            email: values.email,
            lastLogin: '—'
          });
        }
        Store.save();
        renderUsers($('#view-root'));
        toast(user ? '用户已更新' : '用户已新增');
        return true;
      }
    });
  }

  function toggleUser(id) {
    const user = DB.users.find((item) => item.id === id);
    if (!user) return;
    if (user.username === 'admin') { toast('超级管理员账号不允许停用'); return; }
    user.status = user.status === '启用' ? '停用' : '启用';
    Store.save();
    paintUserRows();
    toast('用户 ' + user.name + ' 已' + user.status);
  }

  function deleteUser(id) {
    const user = DB.users.find((item) => item.id === id);
    if (!user) return;
    if (user.username === 'admin') { toast('超级管理员账号不允许删除'); return; }
    askConfirm('删除用户', '确定删除用户《' + user.name + '》吗？该账号将无法登录客户端。', () => {
      DB.users = DB.users.filter((item) => item.id !== id);
      Store.save();
      renderUsers($('#view-root'));
      toast('用户已删除');
    });
  }

  /* ============================== 角色管理 ============================== */
  function renderRoles(root) {
    const roles = DB.roles;
    root.innerHTML =
      pageHead('SYSTEM · ROLE', '角色管理', '配置角色权限范围与数据密级上限，用于批量管理用户可见内容。',
        '<button type="button" class="btn btn-primary" data-action="new-role">' + icon('plus') + '新增角色</button>') +
      '<div class="filter-card"><label class="filter-item"><span>角色</span>' + searchBox('role-search', '搜索角色名称、编码或说明', state.roleQuery) + '</label></div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>角色列表</h2><p>角色决定用户可执行的管理动作与数据范围</p></div></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>角色名称</th><th>角色编码</th><th>数据范围</th><th>密级上限</th><th>用户数</th><th>状态</th><th>操作</th></tr></thead><tbody id="role-tbody"></tbody></table></div>' +
        tableFooter('role-total', roles.length) +
      '</section>';
    paintRoleRows();
  }

  function paintRoleRows() {
    const tbody = $('#role-tbody');
    if (!tbody) return;
    const query = state.roleQuery.trim().toLowerCase();
    const list = DB.roles.filter((role) => !query || (role.name + role.code + role.desc).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((role) =>
      '<tr>' +
        '<td><span class="cell-copy"><b>' + esc(role.name) + '</b><small>' + esc(role.desc) + '</small></span></td>' +
        '<td><span class="tag">' + esc(role.code) + '</span></td>' +
        '<td><span class="muted">' + esc(role.scope) + '</span></td>' +
        '<td>' + levelBadge(role.level) + '</td>' +
        '<td><span class="tag">' + role.users + '</span></td>' +
        '<td>' + statusBadge(role.status) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-action" data-action="edit-role" data-id="' + role.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-role" data-id="' + role.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(7, '没有匹配的角色。');
    const total = $('#role-total');
    if (total) total.textContent = list.length;
  }

  function openRoleForm(id) {
    const role = id ? DB.roles.find((item) => item.id === id) : null;
    openForm({
      title: role ? '编辑角色' : '新增角色',
      sub: '数据范围与密级上限共同决定角色可见的数据。',
      submitText: role ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '角色名称', required: true, wide: true, placeholder: '例如：知识库管理员' },
        { name: 'code', label: '角色编码', required: true, placeholder: '例如：kb_admin' },
        { name: 'scope', label: '数据范围', type: 'select', options: ['全部数据', '本部门及下级部门', '本部门', '本人', '只读全部'] },
        { name: 'level', label: '密级上限', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'status', label: '状态', type: 'select', options: ['启用', '停用'] },
        { name: 'desc', label: '角色说明', type: 'textarea', wide: true, rows: 2 }
      ],
      values: role || { scope: '本部门', level: 'L3', status: '启用' },
      onSubmit: function (values) {
        if (role) {
          role.name = values.name;
          role.code = values.code;
          role.scope = values.scope;
          role.level = values.level;
          role.status = values.status;
          role.desc = values.desc || '';
        } else {
          DB.roles.push({
            id: 'role-' + Date.now(), name: values.name, code: values.code,
            scope: values.scope, level: values.level, users: 0,
            status: values.status, desc: values.desc || ''
          });
        }
        Store.save();
        renderRoles($('#view-root'));
        toast(role ? '角色已更新' : '角色已新增');
        return true;
      }
    });
  }

  function deleteRole(id) {
    const role = DB.roles.find((item) => item.id === id);
    if (!role) return;
    if (role.code === 'super_admin') { toast('超级管理员角色不允许删除'); return; }
    askConfirm('删除角色', '确定删除角色《' + role.name + '》吗？已分配该角色的用户将失去对应权限。', () => {
      DB.roles = DB.roles.filter((item) => item.id !== id);
      Store.save();
      renderRoles($('#view-root'));
      toast('角色已删除');
    });
  }

  /* ============================== 密级管理 ============================== */
  function levelDocCount(code) {
    return DB.knowledgeBases.reduce((total, kb) => total + (kb.docs || []).filter((doc) => doc.level === code).length, 0);
  }

  function levelRefs(code) {
    const refs = [];
    const add = (label, items) => {
      const count = items.filter((item) => item.level === code).length;
      if (count) refs.push({ label: label, count: count });
    };
    add('用户', DB.users);
    add('角色', DB.roles);
    add('岗位', DB.positions);
    add('知识库', DB.knowledgeBases);
    const docs = levelDocCount(code);
    if (docs) refs.push({ label: '知识文档', count: docs });
    add('文档模板', DB.templates);
    add('模型', DB.models);
    add('技能', DB.skills);
    add('连接器', DB.connectors);
    add('通知公告', DB.notices);
    return refs;
  }

  function levelTone(level) {
    const tone = LEVEL_TONES.find((item) => item.color.toLowerCase() === String(level.color || '').toLowerCase());
    return tone ? tone.value : LEVEL_TONES[0].value;
  }

  function nextLevelCode() {
    let index = 1;
    const used = new Set(LEVELS.map((item) => item.code));
    while (used.has('L' + index)) index += 1;
    return 'L' + index;
  }

  function commitLevels(list) {
    list.forEach((level, index) => { level.rank = index + 1; });
    LEVELS.length = 0;
    list.forEach((level) => LEVELS.push(level));
  }

  function renderLevels(root) {
    const ordered = LEVELS.slice().sort((a, b) => a.rank - b.rank);
    const rows = ordered.map((level) =>
      '<tr>' +
        '<td>' + levelBadge(level.code) + '</td>' +
        '<td><span class="muted">' + esc(level.desc || '—') + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-action" data-action="edit-level" data-id="' + level.code + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-level" data-id="' + level.code + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('');
    root.innerHTML =
      pageHead('SYSTEM · SECURITY', '密级管理', '密级是数据的可见性标签，可自行新增、编辑与删除；标签被引用时不可删除，客户端按标签顺序过滤内容。',
        '<button type="button" class="btn btn-primary" data-action="new-level">' + icon('plus') + '新增密级</button>' +
        '<a class="btn" href="../' + encodeURI('客户端原型设计/index.html') + '?auto=1&user=zhangming" target="_blank" rel="noopener">' + icon('eye') + '打开客户端验证</a>') +
      '<section class="card">' +
        '<div class="card-head"><div><h2>密级列表</h2><p>按级别顺序排列，级别越高可见范围越小</p></div></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>密级名称</th><th>描述</th><th>操作</th></tr></thead><tbody>' + (rows || emptyTableRow(3, '还没有密级，先新增一个。')) + '</tbody></table></div>' +
        tableFooter('level-total', ordered.length) +
      '</section>';
  }

  function openLevelForm(code) {
    const level = code ? LEVELS.find((item) => item.code === code) : null;
    const ordered = LEVELS.slice().sort((a, b) => a.rank - b.rank);
    const position = level ? ordered.findIndex((item) => item.code === level.code) + 1 : ordered.length + 1;
    const tone = level ? levelTone(level) : LEVEL_TONES[LEVELS.length % LEVEL_TONES.length].value;
    openForm({
      title: level ? '编辑密级' : '新增密级',
      sub: level ? '调整级别顺序会改变该密级下用户与数据的可见范围。' : '密级是数据可见性标签，新增后会出现在所有密级选择项中。',
      submitText: level ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '密级名称', required: true, wide: true, placeholder: '例如：商密' },
        { name: 'order', label: '级别顺序', type: 'number', placeholder: String(position), help: '数字越大可见范围越小，1 为最开放；列表按此顺序排列' },
        { name: 'tone', label: '标签颜色', type: 'select', options: LEVEL_TONES.map((item) => ({ value: item.value, label: item.label })), help: '用于密级徽标配色' },
        { name: 'desc', label: '密级说明', type: 'textarea', wide: true, rows: 3, placeholder: '描述该标签适用的数据范围' }
      ],
      values: { name: level ? level.name : '', order: position, tone: tone, desc: level ? level.desc : '' },
      onSubmit: function (values) {
        const name = String(values.name || '').replace(/级$/, '').trim();
        if (!name) { setFormError('请填写「密级名称」'); return false; }
        if (LEVELS.some((item) => item.name === name && (!level || item.code !== level.code))) {
          setFormError('已存在同名密级「' + name + '」，请更换');
          return false;
        }
        const limit = level ? LEVELS.length : LEVELS.length + 1;
        const order = Number(values.order);
        if (!Number.isInteger(order) || order < 1 || order > limit) {
          setFormError('级别顺序需为 1 ~ ' + limit + ' 之间的整数');
          return false;
        }
        const palette = LEVEL_TONES.find((item) => item.value === values.tone) || LEVEL_TONES[0];
        const list = LEVELS.slice().sort((a, b) => a.rank - b.rank);
        if (level) {
          list.splice(list.findIndex((item) => item.code === level.code), 1);
          list.splice(order - 1, 0, level);
          level.name = name;
          level.desc = values.desc || '';
          level.color = palette.color;
          level.bg = palette.bg;
        } else {
          list.splice(order - 1, 0, {
            code: nextLevelCode(),
            name: name,
            rank: 0,
            color: palette.color,
            bg: palette.bg,
            desc: values.desc || ''
          });
        }
        commitLevels(list);
        Store.save();
        renderLevels($('#view-root'));
        toast(level ? '密级已更新' : '密级「' + name + '级」已新增');
        return true;
      }
    });
  }

  function deleteLevel(code) {
    const level = LEVELS.find((item) => item.code === code);
    if (!level) return;
    if (LEVELS.length <= 1) {
      askConfirm('无法删除密级', '至少需要保留一个密级标签，无法删除最后一个密级。', null, { okText: '知道了', danger: false, alert: true });
      return;
    }
    const refs = levelRefs(code);
    if (refs.length) {
      const total = refs.reduce((sum, item) => sum + item.count, 0);
      askConfirm('无法删除密级', '「' + level.name + '级」已被 ' + total + ' 个对象引用：' +
        refs.map((item) => item.label + ' ' + item.count).join(' · ') +
        '。请先调整这些对象的密级后再删除。', null, { okText: '知道了', danger: false, alert: true });
      return;
    }
    askConfirm('删除密级', '确定删除密级标签「' + level.name + '级」吗？删除后会从所有密级选项中移除。', () => {
      const list = LEVELS.filter((item) => item.code !== code).sort((a, b) => a.rank - b.rank);
      commitLevels(list);
      Store.save();
      renderLevels($('#view-root'));
      toast('密级「' + level.name + '级」已删除');
    });
  }

  /* ============================== 菜单管理 ============================== */
  function flattenMenus() {
    const out = [];
    const walk = (parent, depth) => {
      DB.menus.filter((menu) => (menu.parent || null) === parent).sort((a, b) => a.order - b.order).forEach((menu) => {
        out.push({ menu: menu, depth: depth });
        walk(menu.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  }

  function renderMenus(root) {
    root.innerHTML =
      pageHead('SYSTEM · MENU', '菜单管理', '配置管理端菜单层级、路由与权限标识。系统管理固定放在一级菜单最后。',
        '<button type="button" class="btn btn-primary" data-action="new-menu">' + icon('plus') + '新增菜单</button>') +
      '<div class="filter-card"><label class="filter-item"><span>菜单</span>' + searchBox('menu-search', '搜索菜单名称、路径或权限标识', state.menuQuery) + '</label></div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>菜单树</h2><p>系统管理下的 8 个二级菜单在此维护</p></div></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>菜单名称</th><th>路由路径</th><th>类型</th><th>权限标识</th><th>排序</th><th>状态</th><th>操作</th></tr></thead><tbody id="menu-tbody"></tbody></table></div>' +
        tableFooter('menu-total', DB.menus.length) +
      '</section>';
    paintMenuRows();
  }

  function paintMenuRows() {
    const tbody = $('#menu-tbody');
    if (!tbody) return;
    const query = state.menuQuery.trim().toLowerCase();
    const rows = flattenMenus();
    const list = rows.filter((row) => !query || (row.menu.name + row.menu.path + row.menu.perm).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((row) => {
      const menu = row.menu;
      return '<tr>' +
        '<td><span class="indent-name" style="padding-left:' + (row.depth * 18) + 'px">' +
          (row.depth ? '<span class="tree-guide">└</span>' : '') +
          '<span class="cell-copy"><b>' + esc(menu.name) + '</b></span>' +
        '</span></td>' +
        '<td><span class="muted" style="font-family:var(--mono)">' + esc(menu.path) + '</span></td>' +
        '<td><span class="tag ' + (menu.type === '目录' ? 'tag-blue' : '') + '">' + esc(menu.type) + '</span></td>' +
        '<td><span class="tag">' + esc(menu.perm || '—') + '</span></td>' +
        '<td><span class="muted">' + menu.order + '</span></td>' +
        '<td>' + statusBadge(menu.status) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-action" data-action="edit-menu" data-id="' + menu.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-menu" data-id="' + menu.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') : emptyTableRow(7, '没有匹配的菜单。');
    const total = $('#menu-total');
    if (total) total.textContent = list.length;
  }

  function openMenuForm(id) {
    const menu = id ? DB.menus.find((item) => item.id === id) : null;
    const parentOptions = [{ value: '', label: '无（一级菜单）' }].concat(
      flattenMenus().filter((row) => !menu || row.menu.id !== menu.id).map((row) => ({
        value: row.menu.id,
        label: new Array(row.depth + 1).join('　') + row.menu.name
      }))
    );
    openForm({
      title: menu ? '编辑菜单' : '新增菜单',
      sub: '菜单排序数字越小越靠前，系统管理应保持在最后。',
      submitText: menu ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '菜单名称', required: true, placeholder: '例如：用户管理' },
        { name: 'parent', label: '上级菜单', type: 'select', options: parentOptions },
        { name: 'path', label: '路由路径', placeholder: '/system/users' },
        { name: 'type', label: '菜单类型', type: 'select', options: ['目录', '菜单'] },
        { name: 'perm', label: '权限标识', placeholder: '例如：sys:user' },
        { name: 'order', label: '排序', type: 'number', placeholder: '1' },
        { name: 'status', label: '状态', type: 'select', options: ['启用', '停用'], wide: true }
      ],
      values: menu || { parent: '', type: '菜单', order: DB.menus.length + 1, status: '启用' },
      onSubmit: function (values) {
        if (menu) {
          menu.name = values.name;
          menu.parent = values.parent || null;
          menu.path = values.path || '/';
          menu.type = values.type;
          menu.perm = values.perm;
          menu.order = Number(values.order) || 1;
          menu.status = values.status;
        } else {
          DB.menus.push({
            id: 'menu-' + Date.now(), name: values.name, parent: values.parent || null,
            path: values.path || '/', type: values.type, perm: values.perm,
            order: Number(values.order) || 1, status: values.status
          });
        }
        Store.save();
        renderMenus($('#view-root'));
        toast(menu ? '菜单已更新' : '菜单已新增');
        return true;
      }
    });
  }

  function deleteMenu(id) {
    const menu = DB.menus.find((item) => item.id === id);
    if (!menu) return;
    if (DB.menus.some((item) => item.parent === id)) { toast('请先删除下级菜单'); return; }
    askConfirm('删除菜单', '确定删除菜单《' + menu.name + '》吗？', () => {
      DB.menus = DB.menus.filter((item) => item.id !== id);
      Store.save();
      renderMenus($('#view-root'));
      updateChrome();
      toast('菜单已删除');
    });
  }

  /* ============================== 部门管理 ============================== */
  function flattenDepts() {
    const out = [];
    const walk = (parent, depth) => {
      DB.departments.filter((dep) => (dep.parent || null) === parent).forEach((dep) => {
        out.push({ dep: dep, depth: depth });
        walk(dep.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  }

  function renderDepts(root) {
    root.innerHTML =
      pageHead('SYSTEM · DEPARTMENT', '部门管理', '维护企业组织架构。部门将用于用户归属与知识库可见范围。',
        '<button type="button" class="btn btn-primary" data-action="new-dept">' + icon('plus') + '新增部门</button>') +
      '<div class="filter-card"><label class="filter-item"><span>部门</span>' + searchBox('dept-search', '搜索部门名称或负责人', state.deptQuery) + '</label></div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>部门树</h2><p>支持多级组织架构</p></div></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>部门名称</th><th>负责人</th><th>人数</th><th>上级部门</th><th>操作</th></tr></thead><tbody id="dept-tbody"></tbody></table></div>' +
        tableFooter('dept-total', DB.departments.length) +
      '</section>';
    paintDeptRows();
  }

  function paintDeptRows() {
    const tbody = $('#dept-tbody');
    if (!tbody) return;
    const query = state.deptQuery.trim().toLowerCase();
    const rows = flattenDepts();
    const list = rows.filter((row) => !query || (row.dep.name + row.dep.leader).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((row) => {
      const dep = row.dep;
      const parent = DB.departments.find((item) => item.id === dep.parent);
      return '<tr>' +
        '<td><span class="indent-name" style="padding-left:' + (row.depth * 18) + 'px">' + (row.depth ? '<span class="tree-guide">└</span>' : '') + '<span class="cell-copy"><b>' + esc(dep.name) + '</b></span></span></td>' +
        '<td><span class="muted">' + esc(dep.leader) + '</span></td>' +
        '<td><span class="tag">' + dep.count + ' 人</span></td>' +
        '<td><span class="muted">' + esc(parent ? parent.name : '—') + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-action" data-action="edit-dept" data-id="' + dep.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-dept" data-id="' + dep.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') : emptyTableRow(5, '没有匹配的部门。');
    const total = $('#dept-total');
    if (total) total.textContent = list.length;
  }

  function openDeptForm(id) {
    const dep = id ? DB.departments.find((item) => item.id === id) : null;
    const parentOptions = [{ value: '', label: '无（一级部门）' }].concat(
      flattenDepts().filter((row) => !dep || row.dep.id !== dep.id).map((row) => ({
        value: row.dep.id,
        label: new Array(row.depth + 1).join('　') + row.dep.name
      }))
    );
    openForm({
      title: dep ? '编辑部门' : '新增部门',
      sub: '部门负责人会显示在知识库与模板归属信息中。',
      submitText: dep ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '部门名称', required: true, wide: true },
        { name: 'parent', label: '上级部门', type: 'select', options: parentOptions },
        { name: 'leader', label: '负责人', placeholder: '例如：张明' },
        { name: 'count', label: '人数', type: 'number', placeholder: '0' }
      ],
      values: dep || { parent: '', count: 1 },
      onSubmit: function (values) {
        if (dep) {
          dep.name = values.name;
          dep.parent = values.parent || null;
          dep.leader = values.leader || '—';
          dep.count = Number(values.count) || 0;
        } else {
          DB.departments.push({
            id: 'dep-' + Date.now(), name: values.name, parent: values.parent || null,
            leader: values.leader || '—', count: Number(values.count) || 0
          });
        }
        Store.save();
        renderDepts($('#view-root'));
        toast(dep ? '部门已更新' : '部门已新增');
        return true;
      }
    });
  }

  function deleteDept(id) {
    const dep = DB.departments.find((item) => item.id === id);
    if (!dep) return;
    if (DB.departments.some((item) => item.parent === id)) { toast('请先删除下级部门'); return; }
    if (DB.users.some((user) => user.dept === dep.name)) { toast('该部门下仍有用户，请先调整用户归属'); return; }
    askConfirm('删除部门', '确定删除部门《' + dep.name + '》吗？', () => {
      DB.departments = DB.departments.filter((item) => item.id !== id);
      Store.save();
      renderDepts($('#view-root'));
      toast('部门已删除');
    });
  }

  /* ============================== 岗位管理 ============================== */
  function renderPosts(root) {
    root.innerHTML =
      pageHead('SYSTEM · POSITION', '岗位管理', '维护岗位名称、所属部门与岗位密级，新用户可直接选择岗位。',
        '<button type="button" class="btn btn-primary" data-action="new-post">' + icon('plus') + '新增岗位</button>') +
      '<div class="filter-card"><label class="filter-item"><span>岗位</span>' + searchBox('post-search', '搜索岗位名称或部门', state.postQuery) + '</label></div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>岗位列表</h2><p>岗位密级用于校验用户密级合理性</p></div></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>岗位名称</th><th>所属部门</th><th>岗位密级</th><th>在岗人数</th><th>状态</th><th>操作</th></tr></thead><tbody id="post-tbody"></tbody></table></div>' +
        tableFooter('post-total', DB.positions.length) +
      '</section>';
    paintPostRows();
  }

  function paintPostRows() {
    const tbody = $('#post-tbody');
    if (!tbody) return;
    const query = state.postQuery.trim().toLowerCase();
    const list = DB.positions.filter((post) => !query || (post.name + post.dept).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((post) =>
      '<tr>' +
        '<td><span class="cell-copy"><b>' + esc(post.name) + '</b></span></td>' +
        '<td><span class="muted">' + esc(post.dept) + '</span></td>' +
        '<td>' + levelBadge(post.level) + '</td>' +
        '<td><span class="tag">' + post.count + ' 人</span></td>' +
        '<td>' + statusBadge(post.status) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-action" data-action="edit-post" data-id="' + post.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-post" data-id="' + post.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(6, '没有匹配的岗位。');
    const total = $('#post-total');
    if (total) total.textContent = list.length;
  }

  function openPostForm(id) {
    const post = id ? DB.positions.find((item) => item.id === id) : null;
    openForm({
      title: post ? '编辑岗位' : '新增岗位',
      sub: '岗位密级应与岗位实际接触的数据密级保持一致。',
      submitText: post ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '岗位名称', required: true, wide: true, placeholder: '例如：质量工程师' },
        { name: 'dept', label: '所属部门', type: 'select', options: DB.departments.filter((dep) => !dep.parent).map((dep) => dep.name) },
        { name: 'level', label: '岗位密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'count', label: '在岗人数', type: 'number' },
        { name: 'status', label: '状态', type: 'select', options: ['启用', '停用'], wide: true }
      ],
      values: post || { dept: '质量管理部', level: 'L2', count: 1, status: '启用' },
      onSubmit: function (values) {
        if (post) {
          post.name = values.name;
          post.dept = values.dept;
          post.level = values.level;
          post.count = Number(values.count) || 0;
          post.status = values.status;
        } else {
          DB.positions.push({
            id: 'post-' + Date.now(), name: values.name, dept: values.dept,
            level: values.level, count: Number(values.count) || 0, status: values.status
          });
        }
        Store.save();
        renderPosts($('#view-root'));
        toast(post ? '岗位已更新' : '岗位已新增');
        return true;
      }
    });
  }

  function deletePost(id) {
    const post = DB.positions.find((item) => item.id === id);
    if (!post) return;
    askConfirm('删除岗位', '确定删除岗位《' + post.name + '》吗？', () => {
      DB.positions = DB.positions.filter((item) => item.id !== id);
      Store.save();
      renderPosts($('#view-root'));
      toast('岗位已删除');
    });
  }

  /* ============================== 字典管理 ============================== */
  function renderDicts(root) {
    root.innerHTML =
      pageHead('SYSTEM · DICTIONARY', '字典管理', '维护系统下拉选项与枚举值，密级、文档类型、知识库权限等均由此驱动。',
        '<button type="button" class="btn btn-primary" data-action="new-dict">' + icon('plus') + '新增字典</button>') +
      '<div class="filter-card"><label class="filter-item"><span>字典</span>' + searchBox('dict-search', '搜索字典名称、编码或字典项', state.dictQuery) + '</label></div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>字典列表</h2><p>修改后立即生效到相关选择器</p></div></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>字典名称</th><th>字典编码</th><th>字典项</th><th>状态</th><th>备注</th><th>操作</th></tr></thead><tbody id="dict-tbody"></tbody></table></div>' +
        tableFooter('dict-total', DB.dicts.length) +
      '</section>';
    paintDictRows();
  }

  function paintDictRows() {
    const tbody = $('#dict-tbody');
    if (!tbody) return;
    const query = state.dictQuery.trim().toLowerCase();
    const list = DB.dicts.filter((dict) => !query || (dict.name + dict.code + dict.remark + dict.items.join('')).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((dict) =>
      '<tr>' +
        '<td><span class="cell-copy"><b>' + esc(dict.name) + '</b><small>' + esc(dict.code) + '</small></span></td>' +
        '<td><span class="tag">' + esc(dict.code) + '</span></td>' +
        '<td><div class="dict-items">' + dict.items.slice(0, 6).map((item) => '<span class="tag">' + esc(item) + '</span>').join('') +
          (dict.items.length > 6 ? '<span class="tag">+' + (dict.items.length - 6) + '</span>' : '') + '</div></td>' +
        '<td>' + statusBadge(dict.status) + '</td>' +
        '<td><span class="muted">' + esc(dict.remark) + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-action" data-action="edit-dict" data-id="' + dict.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-dict" data-id="' + dict.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(6, '没有匹配的字典。');
    const total = $('#dict-total');
    if (total) total.textContent = list.length;
  }

  function openDictForm(id) {
    const dict = id ? DB.dicts.find((item) => item.id === id) : null;
    openForm({
      title: dict ? '编辑字典' : '新增字典',
      sub: '字典项使用中文顿号、逗号或换行分隔。',
      submitText: dict ? '保存修改' : '确认新增',
      fields: [
        { name: 'name', label: '字典名称', required: true, placeholder: '例如：数据密级' },
        { name: 'code', label: '字典编码', required: true, placeholder: '例如：data_level' },
        { name: 'items', label: '字典项', type: 'textarea', wide: true, rows: 3, placeholder: '公开、内部、秘密、机密、绝密' },
        { name: 'status', label: '状态', type: 'select', options: ['启用', '停用'] },
        { name: 'remark', label: '备注', wide: true }
      ],
      values: dict ? Object.assign({}, dict, { items: dict.items.join('、') }) : { status: '启用' },
      onSubmit: function (values) {
        const items = values.items.split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean);
        if (!items.length) { setFormError('请至少填写一个字典项'); return false; }
        if (dict) {
          dict.name = values.name;
          dict.code = values.code;
          dict.items = items;
          dict.status = values.status;
          dict.remark = values.remark || '';
        } else {
          DB.dicts.push({
            id: 'dict-' + Date.now(), name: values.name, code: values.code,
            items: items, status: values.status, remark: values.remark || ''
          });
        }
        Store.save();
        renderDicts($('#view-root'));
        toast(dict ? '字典已更新' : '字典已新增');
        return true;
      }
    });
  }

  function deleteDict(id) {
    const dict = DB.dicts.find((item) => item.id === id);
    if (!dict) return;
    askConfirm('删除字典', '确定删除字典《' + dict.name + '》吗？引用该字典的选择器将失去选项。', () => {
      DB.dicts = DB.dicts.filter((item) => item.id !== id);
      Store.save();
      renderDicts($('#view-root'));
      toast('字典已删除');
    });
  }

  /* ============================== 参数设置 ============================== */
  function renderParams(root) {
    root.innerHTML =
      pageHead('SYSTEM · PARAMETER', '参数设置', '维护系统级参数，包括上传限制、智能治理策略、安全水印与登录锁定。',
        '<span class="tag tag-blue">' + icon('info') + '修改即时生效</span>') +
      '<div class="filter-card"><label class="filter-item"><span>参数</span>' + searchBox('param-search', '搜索参数名称、键或值', state.paramQuery) + '</label></div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>系统参数</h2><p>参数值会同步影响客户端上传、治理与安全提示</p></div></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>参数名称</th><th>参数键</th><th>参数值</th><th>分组</th><th>备注</th><th>操作</th></tr></thead><tbody id="param-tbody"></tbody></table></div>' +
        tableFooter('param-total', DB.params.length) +
      '</section>';
    paintParamRows();
  }

  function paintParamRows() {
    const tbody = $('#param-tbody');
    if (!tbody) return;
    const query = state.paramQuery.trim().toLowerCase();
    const list = DB.params.filter((param) => !query || (param.name + param.key + param.value + param.group).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((param) =>
      '<tr>' +
        '<td><span class="cell-copy"><b>' + esc(param.name) + '</b></span></td>' +
        '<td><span class="tag" style="font-family:var(--mono)">' + esc(param.key) + '</span></td>' +
        '<td><span class="tag tag-blue">' + esc(param.value) + '</span></td>' +
        '<td><span class="muted">' + esc(param.group) + '</span></td>' +
        '<td><span class="muted">' + esc(param.remark) + '</span></td>' +
        '<td><div class="row-actions"><button type="button" class="icon-action" data-action="edit-param" data-id="' + param.id + '" title="编辑">' + icon('edit') + '</button></div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(6, '没有匹配的参数。');
    const total = $('#param-total');
    if (total) total.textContent = list.length;
  }

  function openParamForm(id) {
    const param = DB.params.find((item) => item.id === id);
    if (!param) return;
    openForm({
      title: '编辑参数',
      sub: param.key,
      submitText: '保存修改',
      fields: [
        { name: 'value', label: '参数值', required: true, wide: true },
        { name: 'remark', label: '备注', type: 'textarea', wide: true, rows: 2 }
      ],
      values: param,
      onSubmit: function (values) {
        param.value = values.value;
        param.remark = values.remark || '';
        Store.save();
        renderParams($('#view-root'));
        toast('参数已更新');
        return true;
      }
    });
  }

  /* ============================== 通知公告 ============================== */
  function renderNotices(root) {
    root.innerHTML =
      pageHead('NOTICE · CENTER', '通知公告', '发布面向客户端的通知公告。已发布通知会出现在客户端左下角的消息中心，并按数据密级过滤。',
        '<button type="button" class="btn btn-primary" data-action="new-notice">' + icon('plus') + '发布通知</button>') +
      '<div class="filter-card">' +
        '<label class="filter-item"><span>通知</span>' + searchBox('notice-search', '搜索标题、发布人或内容', state.noticeQuery) + '</label>' +
        selectFilter('状态', 'notice-status', '<option value="all"' + (state.noticeStatus === 'all' ? ' selected' : '') + '>全部状态</option>' +
          '<option value="已发布"' + (state.noticeStatus === '已发布' ? ' selected' : '') + '>已发布</option>' +
          '<option value="草稿"' + (state.noticeStatus === '草稿' ? ' selected' : '') + '>草稿</option>') +
        '<div class="filter-actions"><button type="button" class="btn" data-action="reset-filter" data-target="notice">重置</button></div>' +
      '</div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>通知列表</h2><p>已发布通知按密级推送到客户端，草稿仅管理端可见</p></div><span class="tag tag-blue">' + icon('bell') + '客户端消息中心</span></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>通知标题</th><th>类型</th><th>密级</th><th>发布人</th><th>发布时间</th><th>状态</th><th>操作</th></tr></thead><tbody id="notice-tbody"></tbody></table></div>' +
        tableFooter('notice-total', DB.notices.length) +
      '</section>';
    paintNoticeRows();
  }

  function paintNoticeRows() {
    const tbody = $('#notice-tbody');
    if (!tbody) return;
    const query = state.noticeQuery.trim().toLowerCase();
    let list = DB.notices.slice();
    if (state.noticeStatus !== 'all') list = list.filter((notice) => notice.status === state.noticeStatus);
    if (query) list = list.filter((notice) => (notice.title + notice.publisher + notice.content).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((notice) =>
      '<tr>' +
        '<td><span class="cell-copy"><b>' + esc(notice.title) + '</b><small>' + esc(String(notice.content).slice(0, 40)) + (String(notice.content).length > 40 ? '…' : '') + '</small></span></td>' +
        '<td><span class="tag">' + esc(notice.type) + '</span></td>' +
        '<td>' + levelBadge(notice.level) + '</td>' +
        '<td><span class="muted">' + esc(notice.publisher) + '</span></td>' +
        '<td><span class="muted">' + esc(notice.time) + '</span></td>' +
        '<td>' + statusBadge(notice.status) + '</td>' +
        '<td><div class="row-actions">' +
          (notice.status === '草稿' ? '<button type="button" class="link-action" data-action="publish-notice" data-id="' + notice.id + '">发布</button>' : '') +
          '<button type="button" class="icon-action" data-action="edit-notice" data-id="' + notice.id + '" title="编辑">' + icon('edit') + '</button>' +
          '<button type="button" class="icon-action is-danger" data-action="delete-notice" data-id="' + notice.id + '" title="删除">' + icon('trash') + '</button>' +
        '</div></td>' +
      '</tr>'
    ).join('') : emptyTableRow(7, '没有匹配的通知。');
    const total = $('#notice-total');
    if (total) total.textContent = list.length;
  }

  function openNoticeForm(id) {
    const notice = id ? DB.notices.find((item) => item.id === id) : null;
    const wasPublished = notice ? notice.status === '已发布' : false;
    openForm({
      title: notice ? '编辑通知' : '发布通知',
      sub: '草稿状态不会在客户端展示，发布后按密级可见。',
      submitText: notice ? '保存修改' : '创建通知',
      fields: [
        { name: 'title', label: '通知标题', required: true, wide: true },
        { name: 'type', label: '通知类型', type: 'select', options: ['版本更新', '制度通知', '产品公告', '运维通知'] },
        { name: 'level', label: '数据密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'publisher', label: '发布人', placeholder: '例如：产品研发部' },
        { name: 'status', label: '状态', type: 'select', options: ['已发布', '草稿'] },
        { name: 'content', label: '通知内容', type: 'textarea', wide: true, rows: 5 }
      ],
      values: notice || { type: '产品公告', level: 'L2', publisher: '信息技术部', status: '草稿' },
      onSubmit: function (values) {
        if (notice) {
          notice.title = values.title;
          notice.type = values.type;
          notice.level = values.level;
          notice.publisher = values.publisher || '信息技术部';
          notice.status = values.status;
          notice.content = values.content || '';
          if (values.status === '已发布' && !wasPublished) notice.time = nowStamp();
        } else {
          DB.notices.unshift({
            id: 'notice-' + Date.now(), title: values.title, type: values.type,
            level: values.level, publisher: values.publisher || '信息技术部',
            time: nowStamp(), status: values.status, content: values.content || ''
          });
        }
        Store.save();
        renderNotices($('#view-root'));
        toast(notice ? '通知已更新' : '通知已创建');
        return true;
      }
    });
  }

  function publishNotice(id) {
    const notice = DB.notices.find((item) => item.id === id);
    if (!notice) return;
    notice.status = '已发布';
    notice.time = nowStamp();
    Store.save();
    paintNoticeRows();
    toast('通知已发布：' + notice.title);
  }

  function deleteNotice(id) {
    const notice = DB.notices.find((item) => item.id === id);
    if (!notice) return;
    askConfirm('删除通知', '确定删除通知《' + notice.title + '》吗？', () => {
      DB.notices = DB.notices.filter((item) => item.id !== id);
      Store.save();
      renderNotices($('#view-root'));
      toast('通知已删除');
    });
  }

  /* ============================== 日志审计 ============================== */
  const AUDIT_TYPES = ['知识库', '知识文档', '文档模板', '模板目录', '技能', '技能目录'];
  const AUDIT_ACTIONS = ['新增', '编辑', '删除', '查看'];

  function writeAudit(type, action, target, detail) {
    if (!Array.isArray(DB.auditLogs)) DB.auditLogs = [];
    DB.auditLogs.unshift({
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      time: nowStamp(),
      user: '系统管理员',
      type: type,
      action: action,
      target: target || '—',
      detail: detail || ''
    });
    if (DB.auditLogs.length > 300) DB.auditLogs.length = 300;
    Store.save();
  }

  function auditTone(action) {
    if (action === '删除') return 'tag-red';
    if (action === '新增') return 'tag-green';
    if (action === '编辑') return 'tag-amber';
    return '';
  }

  function renderAudit(root) {
    const logs = DB.auditLogs || [];
    const kbCount = logs.filter((item) => item.type === '知识库').length;
    const docCount = logs.filter((item) => item.type === '知识文档').length;
    const tplCount = logs.filter((item) => ['文档模板', '模板目录', '技能', '技能目录'].includes(item.type)).length;
    root.innerHTML =
      pageHead('AUDIT', '审计日志', '知识库与文档模板的新增、编辑、删除与查看都会留痕，可按对象类型、操作与关键词追溯。',
        '<span class="tag">' + icon('lock') + '只读审计</span>') +
      statGrid([
        { label: '审计记录', value: logs.length, icon: 'activity', tone: 'tone-blue' },
        { label: '知识库操作', value: kbCount, icon: 'book', tone: 'tone-emerald' },
        { label: '文档操作', value: docCount, icon: 'file', tone: 'tone-amber' },
        { label: '模板与技能操作', value: tplCount, icon: 'grid', tone: 'tone-violet' }
      ]) +
      '<div class="filter-card">' +
        '<label class="filter-item"><span>审计</span>' + searchBox('audit-search', '搜索对象名称、操作人或详情', state.auditQuery) + '</label>' +
        selectFilter('对象类型', 'audit-type', '<option value="all"' + (state.auditType === 'all' ? ' selected' : '') + '>全部类型</option>' +
          AUDIT_TYPES.map((type) => '<option value="' + type + '"' + (state.auditType === type ? ' selected' : '') + '>' + type + '</option>').join('')) +
        selectFilter('操作', 'audit-action', '<option value="all"' + (state.auditAction === 'all' ? ' selected' : '') + '>全部操作</option>' +
          AUDIT_ACTIONS.map((action) => '<option value="' + action + '"' + (state.auditAction === action ? ' selected' : '') + '>' + action + '</option>').join('')) +
        '<div class="filter-actions"><button type="button" class="btn" data-action="reset-filter" data-target="audit">重置</button></div>' +
      '</div>' +
      '<section class="card">' +
        '<div class="card-head"><div><h2>审计记录</h2><p>按时间倒序排列，仅可查看与导出，不提供修改</p></div><span class="tag tag-blue">' + icon('activity') + '内容操作留痕</span></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>时间</th><th>操作人</th><th>对象类型</th><th>对象</th><th>操作</th><th>详情</th></tr></thead><tbody id="audit-tbody"></tbody></table></div>' +
        tableFooter('audit-total', logs.length) +
      '</section>';
    paintAuditRows();
  }

  function paintAuditRows() {
    const tbody = $('#audit-tbody');
    if (!tbody) return;
    const query = state.auditQuery.trim().toLowerCase();
    let list = (DB.auditLogs || []).slice();
    if (state.auditType !== 'all') list = list.filter((item) => item.type === state.auditType);
    if (state.auditAction !== 'all') list = list.filter((item) => item.action === state.auditAction);
    if (query) list = list.filter((item) => (item.target + item.detail + item.user + item.type).toLowerCase().includes(query));
    tbody.innerHTML = list.length ? list.map((item) =>
      '<tr>' +
        '<td><span class="muted">' + esc(item.time) + '</span></td>' +
        '<td><span class="muted">' + esc(item.user) + '</span></td>' +
        '<td><span class="tag">' + esc(item.type) + '</span></td>' +
        '<td><span class="cell-copy"><b>' + esc(item.target) + '</b></span></td>' +
        '<td><span class="tag ' + auditTone(item.action) + '">' + esc(item.action) + '</span></td>' +
        '<td><span class="muted">' + esc(item.detail || '—') + '</span></td>' +
      '</tr>'
    ).join('') : emptyTableRow(6, '没有匹配的审计记录，换个筛选条件试试。');
    const total = $('#audit-total');
    if (total) total.textContent = list.length;
  }


  /* ------------------------------ 初始化 ------------------------------ */
  function migrateOwners() {
    let changed = false;
    DB.knowledgeBases.forEach((kb) => {
      if (Array.isArray(kb.owners)) return;
      const matched = DB.users.find((user) => user.name === kb.owner);
      kb.owners = matched ? [matched.id] : [];
      changed = true;
    });
    if (changed) Store.save();
  }

  function boot() {
    bindEvents();
    migrateOwners();
    refreshNavCounts();
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === '1') {
      Store.reset();
      try { window.localStorage.removeItem('uwork.client.messages.read'); } catch (err) { /* ignore */ }
      window.location.replace(window.location.pathname);
      return;
    }
    const view = params.get('view');
    const kbId = params.get('kb');
    if (view === 'kb-detail' || (view === 'kb' && kbId)) {
      openKb(kbId || 'kb1');
    } else if (view && VIEW_META[view]) {
      navigate(view);
    } else {
      navigate('kb');
    }
    if (params.get('dialog') === 'new-kb') setTimeout(() => openKbForm(), 80);
    if (view === 'skills' && params.get('folder')) {
      state.skillFolder = params.get('folder');
      renderSkills($('#view-root'));
    }
    if (view === 'skills' && params.get('dialog') === 'skill-folder') setTimeout(() => openSkillFolderForm(), 120);
    if (params.get('dialog') === 'skill') setTimeout(() => openSkillForm(), 120);
    if (view === 'connectors' && params.get('folder')) {
      state.connectorFolder = params.get('folder');
      renderConnectors($('#view-root'));
    }
    if (view === 'connectors' && params.get('dialog') === 'connector-folder') setTimeout(() => openConnectorFolderForm(), 120);
    if (view === 'connectors' && params.get('dialog') === 'connector') setTimeout(() => openConnectorForm(), 120);
    if (params.get('dialog') === 'level') setTimeout(() => openLevelForm(), 120);
    if (params.get('dialog') === 'upload') {
      setTimeout(() => {
        if (params.get('mode') === 'template') openUpload('template', {});
        else openUpload('doc', { kbId: params.get('kb') || 'kb1' });
      }, 80);
    }
    if (params.get('system') === 'closed') setSystemOpen(false);
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-multi-field]')) closeMultiPanels();
      const pkgDrop = event.target.closest('.pkg-drop');
      if (pkgDrop) {
        const fileInput = document.querySelector('#form-file-input');
        if (fileInput) { event.preventDefault(); fileInput.click(); }
        return;
      }
      const nav = event.target.closest('[data-view]');
      if (nav) { navigate(nav.dataset.view); return; }
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) { handleAction(actionEl.dataset.action, actionEl, event); return; }
      const kbFolder = event.target.closest('[data-kb-folder]');
      if (kbFolder) {
        state.kbFolder = kbFolder.dataset.kbFolder;
        state.docQuery = '';
        state.docStatus = 'all';
        renderKbDetail($('#view-root'));
        return;
      }
      const tplFolder = event.target.closest('[data-tpl-folder]');
      if (tplFolder) {
        state.tplFolder = tplFolder.dataset.tplFolder;
        state.tplQuery = '';
        renderTemplates($('#view-root'));
        return;
      }
      const skillFolder = event.target.closest('[data-skill-folder]');
      if (skillFolder) {
        state.skillFolder = skillFolder.dataset.skillFolder;
        state.skillQuery = '';
        renderSkills($('#view-root'));
        return;
      }
      const connectorFolder = event.target.closest('[data-connector-folder]');
      if (connectorFolder) {
        state.connectorFolder = connectorFolder.dataset.connectorFolder;
        state.connectorQuery = '';
        renderConnectors($('#view-root'));
        return;
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target.closest && event.target.closest('#form-body')) {
        const formError = $('#form-error');
        if (formError) formError.hidden = true;
      }
      const id = event.target.id;
      const value = event.target.value;
      if (id === 'kb-search') { state.kbQuery = value; paintKbRows(); }
      else if (id === 'doc-search') { state.docQuery = value; paintKbDocs(); }
      else if (id === 'tpl-search') { state.tplQuery = value; paintTplRows(); }
      else if (id === 'model-search') { state.modelQuery = value; paintModelRows(); }
      else if (id === 'skill-search') { state.skillQuery = value; paintSkillRows(); }
      else if (id === 'connector-search') { state.connectorQuery = value; paintConnectorRows(); }
      else if (id === 'release-search') { state.releaseQuery = value; paintReleaseRows(); }
      else if (id === 'user-search') { state.userQuery = value; paintUserRows(); }
      else if (id === 'role-search') { state.roleQuery = value; paintRoleRows(); }
      else if (id === 'menu-search') { state.menuQuery = value; paintMenuRows(); }
      else if (id === 'dept-search') { state.deptQuery = value; paintDeptRows(); }
      else if (id === 'post-search') { state.postQuery = value; paintPostRows(); }
      else if (id === 'dict-search') { state.dictQuery = value; paintDictRows(); }
      else if (id === 'param-search') { state.paramQuery = value; paintParamRows(); }
      else if (id === 'notice-search') { state.noticeQuery = value; paintNoticeRows(); }
      else if (id === 'audit-search') { state.auditQuery = value; paintAuditRows(); }
    });

    document.addEventListener('change', (event) => {
      if (event.target.closest && event.target.closest('#form-body')) {
        const formError = $('#form-error');
        if (formError) formError.hidden = true;
      }
      const id = event.target.id;
      if (id === 'form-file-input') { setFormFile(event.target.files && event.target.files[0]); return; }
      if (id === 'kb-level') { state.kbLevel = event.target.value; paintKbRows(); }
      else if (id === 'doc-status') { state.docStatus = event.target.value; paintKbDocs(); }
      else if (id === 'model-status') { state.modelStatus = event.target.value; paintModelRows(); }
      else if (id === 'release-status') { state.releaseStatus = event.target.value; paintReleaseRows(); }
      else if (id === 'user-level') { state.userLevel = event.target.value; paintUserRows(); }
      else if (id === 'user-status') { state.userStatus = event.target.value; paintUserRows(); }
      else if (id === 'notice-status') { state.noticeStatus = event.target.value; paintNoticeRows(); }
      else if (id === 'audit-type') { state.auditType = event.target.value; paintAuditRows(); }
      else if (id === 'audit-action') { state.auditAction = event.target.value; paintAuditRows(); }
    });

    $('#form-body').addEventListener('submit', submitForm);
    $('#upload-form').addEventListener('submit', submitUpload);

    $('#upload-file').addEventListener('change', (event) => {
      if (event.target.files && event.target.files[0]) setUploadFile(event.target.files[0]);
    });
    const drop = $('#upload-drop');
    drop.addEventListener('click', () => $('#upload-file').click());
    drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('is-drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-drag'));
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      drop.classList.remove('is-drag');
      if (event.dataTransfer.files && event.dataTransfer.files[0]) setUploadFile(event.dataTransfer.files[0]);
    });

    document.addEventListener('dragover', (event) => {
      const pkgDrop = event.target.closest && event.target.closest('.pkg-drop');
      if (!pkgDrop) return;
      event.preventDefault();
      pkgDrop.classList.add('is-drag');
    });
    document.addEventListener('dragleave', (event) => {
      const pkgDrop = event.target.closest && event.target.closest('.pkg-drop');
      if (pkgDrop && !pkgDrop.contains(event.relatedTarget)) pkgDrop.classList.remove('is-drag');
    });
    document.addEventListener('drop', (event) => {
      const pkgDrop = event.target.closest && event.target.closest('.pkg-drop');
      if (!pkgDrop) return;
      event.preventDefault();
      pkgDrop.classList.remove('is-drag');
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) setFormFile(file);
    });
    document.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.classList && event.target.classList.contains('pkg-drop')) {
        event.preventDefault();
        const fileInput = document.querySelector('#form-file-input');
        if (fileInput) fileInput.click();
      }
    });

    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
    $('#sidebar-scrim').addEventListener('click', closeSidebar);
    $('#confirm-ok').addEventListener('click', () => {
      const action = state.confirmAction;
      closeDialog($('#confirm-dialog'));
      state.confirmAction = null;
      if (typeof action === 'function') action();
    });
  }

  function handleAction(action, el, event) {
    const id = el.dataset.id;
    switch (action) {
      case 'toggle-system': toggleSystem(); break;
      case 'open-sidebar': openSidebar(); break;
      case 'close-sidebar': closeSidebar(); break;
      case 'refresh': renderView(); updateChrome(); toast('数据已刷新'); break;
      case 'notice': navigate('sys-notices'); break;
      case 'about': toast('UWork 管理端 v1.5.0 · 企业智能体运营平台'); break;
      case 'go-levels': navigate('sys-levels'); break;
      case 'apply-filter': toast('已按当前条件筛选'); break;
      case 'reset-filter': resetFilter(el.dataset.target); break;
      case 'close-form': closeDialog($('#form-dialog')); closeMultiPanels(); break;
      case 'toggle-multi': if (event) event.preventDefault(); toggleMultiPanel(el); break;
      case 'toggle-multi-option': if (event) event.preventDefault(); toggleMultiOption(el); break;
      case 'remove-multi': if (event) event.preventDefault(); removeMultiChip(el); break;
      case 'close-upload': closeDialog($('#upload-dialog')); break;
      case 'close-confirm': closeDialog($('#confirm-dialog')); break;
      case 'back-kb': navigate('kb'); break;

      case 'new-kb': openKbForm(); break;
      case 'edit-kb': editKbForm(id); break;
      case 'delete-kb': deleteKb(id); break;
      case 'open-kb': openKb(id); break;
      case 'upload-doc': openUpload('doc', { kbId: id || state.kbDetail, folder: state.kbFolder !== 'all' ? state.kbFolder : '' }); break;
      case 'new-kb-folder': openFolderForm('kb', id); break;
      case 'govern-doc': governDoc(id); break;
      case 'delete-doc': deleteDoc(id); break;
      case 'preview-doc': previewDoc(id); break;
      case 'download-doc': toast('已开始下载（演示）：' + findDocName(id)); break;

      case 'new-tpl-folder': openFolderForm('tpl'); break;
      case 'upload-template': openUpload('template', { folder: state.tplFolder !== 'all' ? state.tplFolder : '' }); break;
      case 'delete-template': deleteTemplate(id); break;
      case 'edit-template': editTemplateForm(id); break;
      case 'download-template': toast('已开始下载模板（演示）'); break;

      case 'new-model': openModelForm(); break;
      case 'edit-model': openModelForm(id); break;
      case 'delete-model': deleteModel(id); break;
      case 'toggle-model': toggleModel(id); break;
      case 'default-model': setDefaultModel(id); break;

      case 'new-skill': openSkillForm(); break;
      case 'edit-skill': openSkillForm(id); break;
      case 'new-skill-folder': openSkillFolderForm(); break;
      case 'edit-skill-folder': openSkillFolderForm(id); break;
      case 'delete-skill-folder': deleteSkillFolder(id); break;
      case 'clear-form-file': clearFormFile(); break;
      case 'delete-skill': deleteSkill(id); break;
      case 'toggle-skill': toggleSkill(id); break;

      case 'new-connector': openConnectorForm(); break;
      case 'edit-connector': openConnectorForm(id); break;
      case 'delete-connector': deleteConnector(id); break;
      case 'toggle-connector': toggleConnector(id); break;
      case 'new-connector-folder': openConnectorFolderForm(); break;
      case 'edit-connector-folder': openConnectorFolderForm(id); break;
      case 'delete-connector-folder': deleteConnectorFolder(id); break;

      case 'new-release': openReleaseForm(); break;
      case 'edit-release': openReleaseForm(id); break;
      case 'publish-release': publishRelease(id); break;
      case 'unpublish-release': unpublishRelease(id); break;
      case 'delete-release': deleteRelease(id); break;
      case 'edit-update-policy': openUpdatePolicyForm(); break;


      case 'new-user': openUserForm(); break;
      case 'edit-user': openUserForm(id); break;
      case 'delete-user': deleteUser(id); break;
      case 'toggle-user': toggleUser(id); break;
      case 'new-role': openRoleForm(); break;
      case 'edit-role': openRoleForm(id); break;
      case 'delete-role': deleteRole(id); break;
      case 'new-level': openLevelForm(); break;
      case 'edit-level': openLevelForm(id); break;
      case 'delete-level': deleteLevel(id); break;
      case 'new-menu': openMenuForm(); break;
      case 'edit-menu': openMenuForm(id); break;
      case 'delete-menu': deleteMenu(id); break;
      case 'new-dept': openDeptForm(); break;
      case 'edit-dept': openDeptForm(id); break;
      case 'delete-dept': deleteDept(id); break;
      case 'new-post': openPostForm(); break;
      case 'edit-post': openPostForm(id); break;
      case 'delete-post': deletePost(id); break;
      case 'new-dict': openDictForm(); break;
      case 'edit-dict': openDictForm(id); break;
      case 'delete-dict': deleteDict(id); break;
      case 'edit-param': openParamForm(id); break;
      case 'new-notice': openNoticeForm(); break;
      case 'edit-notice': openNoticeForm(id); break;
      case 'delete-notice': deleteNotice(id); break;
      case 'publish-notice': publishNotice(id); break;
      default: break;
    }
  }

  function resetFilter(target) {
    if (target === 'kb') { state.kbQuery = ''; state.kbLevel = 'all'; renderKbList($('#view-root')); }
    else if (target === 'user') { state.userQuery = ''; state.userLevel = 'all'; state.userStatus = 'all'; renderUsers($('#view-root')); }
    else if (target === 'notice') { state.noticeQuery = ''; state.noticeStatus = 'all'; renderNotices($('#view-root')); }
    else if (target === 'audit') { state.auditQuery = ''; state.auditType = 'all'; state.auditAction = 'all'; renderAudit($('#view-root')); }
    else toast('筛选已重置');
  }

  function findDoc(id) {
    for (const kb of DB.knowledgeBases) {
      const doc = kb.docs.find((item) => item.id === id);
      if (doc) return { doc: doc, kb: kb };
    }
    return null;
  }
  function findDocName(id) {
    const found = findDoc(id);
    return found ? found.doc.name : '文件';
  }

  function previewDoc(id) {
    const found = findDoc(id);
    if (!found) return;
    const doc = found.doc;
    const level = levelInfo(doc.level);
    openForm({
      title: doc.name,
      sub: '知识库：' + found.kb.name + ' · ' + (folderTrailText(found.kb.folders, doc.folder) || '根目录'),
      submitText: '知道了',
      fields: [
        { name: 'meta', label: '文档信息', type: 'textarea', rows: 2, value: '类型：' + doc.ext.toUpperCase() + ' ｜ 大小：' + doc.size + ' ｜ 上传人：' + doc.owner + '\n密级：' + level.name + '级 ｜ 智能治理：' + (doc.governed ? '已治理' : '待治理') },
        { name: 'content', label: '内容摘要', type: 'textarea', rows: 8, value: '本文件用于规范相关业务流程，明确职责、输入输出和记录要求。\n\n一、目的\n确保工作按照公司制度与体系要求执行，过程可追溯、结果可验证。\n\n二、适用范围\n适用于公司各部门及相关岗位在授权范围内的业务活动。\n\n三、工作要求\n1. 使用前确认文件版本与密级；\n2. 按模板完整填写记录；\n3. 发现异常及时上报并留存证据。' }
      ],
      onSubmit: function () { return true; }
    });
    $('#form-submit').textContent = '关闭';
  }

  function governDoc(id) {
    const found = findDoc(id);
    if (!found) return;
    found.doc.governed = true;
    found.doc.updated = today();
    found.kb.updated = today();
    writeAudit('知识文档', '编辑', found.doc.name, '执行智能治理 · 知识库「' + found.kb.name + '」');
    Store.save();
    renderKbDetail($('#view-root'));
    updateChrome();
    toast('《' + found.doc.name + '》已完成智能治理');
  }

  function deleteDoc(id) {
    const found = findDoc(id);
    if (!found) return;
    askConfirm('删除文档', '确定删除《' + found.doc.name + '》吗？删除后客户端将立即不可见。', () => {
      found.kb.docs = found.kb.docs.filter((doc) => doc.id !== id);
      found.kb.updated = today();
      writeAudit('知识文档', '删除', found.doc.name, '知识库「' + found.kb.name + '」');
      Store.save();
      renderKbDetail($('#view-root'));
      updateChrome();
      toast('文档已删除');
    });
  }

  /* ------------------------------ 知识库表单 ------------------------------ */
  function openKbForm(kb) {
    const editing = !!kb;
    openForm({
      title: editing ? '编辑知识库' : '新建知识库',
      sub: editing ? '修改知识库名称、描述或数据密级。' : '录入知识库名称与描述，确认后即可创建。',
      submitText: editing ? '保存修改' : '确认新建',
      fields: [
        { name: 'name', label: '知识库名称', required: true, wide: true, placeholder: '例如：质量体系知识库' },
        { name: 'desc', label: '知识库描述', type: 'textarea', wide: true, rows: 3, placeholder: '说明知识库包含的内容与使用场景' },
        { name: 'dept', label: '所属部门', type: 'select', options: DB.departments.filter((dep) => !dep.parent).map((dep) => dep.name) },
        { name: 'level', label: '数据密级', type: 'select', options: LEVELS.map((level) => ({ value: level.code, label: level.name + '级' })) },
        { name: 'owners', label: '负责人', type: 'multi', wide: true, options: userOptions(),
          placeholder: '未选择负责人 · 所有人可编辑',
          help: '只有负责人可以编辑该知识库；不选择负责人时，所有有权限的员工都能编辑' }
      ],
      values: editing ? kb : { dept: '质量管理部', level: 'L2', owners: '' },
      onSubmit: function (values) {
        const ownerIds = String(values.owners || '').split(',').filter(Boolean);
        const ownerNames = userNamesOf(ownerIds);
        const ownerLabel = ownerNames.length ? ownerNames.join('、') : '所有人';
        if (editing) {
          kb.name = values.name;
          kb.desc = values.desc || '暂无描述';
          kb.dept = values.dept;
          kb.level = values.level;
          kb.owners = ownerIds;
          kb.owner = ownerLabel;
          kb.updated = today();
          writeAudit('知识库', '编辑', kb.name, '负责人 ' + ownerLabel + ' · ' + levelInfo(kb.level).name + '级 · ' + kb.dept);
          Store.save();
          if (state.view === 'kb-detail') renderKbDetail($('#view-root'));
          else renderKbList($('#view-root'));
          updateChrome();
          toast('知识库已更新');
          return true;
        }
        const newKb = {
          id: 'kb-' + Date.now(),
          name: values.name,
          desc: values.desc || '暂无描述',
          level: values.level,
          owner: ownerLabel,
          owners: ownerIds,
          dept: values.dept,
          updated: today(),
          mine: false,
          canEdit: true,
          folders: [],
          docs: []
        };
        DB.knowledgeBases.unshift(newKb);
        writeAudit('知识库', '新增', newKb.name, '所属部门 ' + newKb.dept + ' · ' + levelInfo(newKb.level).name + '级 · 负责人 ' + newKb.owner);
        Store.save();
        renderKbList($('#view-root'));
        updateChrome();
        toast('知识库已创建：' + newKb.name);
        return true;
      }
    });
  }

  function editKbForm(id) {
    const kb = DB.knowledgeBases.find((item) => item.id === id);
    if (kb) openKbForm(kb);
  }

  function deleteKb(id) {
    const kb = DB.knowledgeBases.find((item) => item.id === id);
    if (!kb) return;
    askConfirm('删除知识库', '确定删除知识库《' + kb.name + '》吗？其中的 ' + kb.docs.length + ' 篇文档也会一并移除。', () => {
      DB.knowledgeBases = DB.knowledgeBases.filter((item) => item.id !== id);
      writeAudit('知识库', '删除', kb.name, '同时移除 ' + kb.docs.length + ' 篇文档');
      Store.save();
      state.kbDetail = null;
      navigate('kb');
      toast('知识库已删除');
    }, { warn: '该操作会同步移除客户端中该知识库的全部内容。' });
  }

  function openFolderForm(type, id) {
    const isKb = type === 'kb';
    let folders = [];
    let title = isKb ? '新建知识库目录' : '新建模板目录';
    let contextId = id;
    if (isKb) {
      const kb = DB.knowledgeBases.find((item) => item.id === (id || state.kbDetail));
      if (!kb) return;
      contextId = kb.id;
      folders = kb.folders;
    } else {
      folders = DB.templateFolders;
    }
    const fields = [
      { name: 'name', label: '目录名称', required: true, wide: true, placeholder: '例如：2027 年度质量目标' },
      { name: 'parent', label: '上级目录', type: 'select', wide: isKb, options: [{ value: '', label: '根目录' }].concat(folders.map((folder) => ({ value: folder.id, label: new Array(Store.folderTrail(folders, folder.id).length).join('　') + folder.name }))) }
    ];
    if (!isKb) {
      fields.push({
        name: 'dept', label: '所属部门', type: 'select',
        options: [{ value: '', label: '不限制（所有部门可见）' }].concat(DB.departments.filter((dep) => !dep.parent).map((dep) => ({ value: dep.name, label: dep.name }))),
        help: '仅所属部门成员可以查看该目录下的模板；不选择时所有部门可见'
      });
    }
    openForm({
      title: title,
      sub: isKb ? '目录可多级嵌套，用于组织知识库文档。' : '模板目录用于对标准模板分类，可限定可见部门。',
      fields: fields,
      values: { parent: '', dept: '' },
      onSubmit: function (values) {
        const folder = {
          id: 'folder-' + Date.now(),
          name: values.name,
          parent: values.parent || null
        };
        if (isKb) {
          const kb = DB.knowledgeBases.find((item) => item.id === contextId);
          if (!kb) return false;
          kb.folders.push(folder);
          kb.updated = today();
          state.kbFolder = folder.id;
          writeAudit('知识库', '编辑', kb.name, '新增目录「' + folder.name + '」');
          Store.save();
          renderKbDetail($('#view-root'));
          updateChrome();
        } else {
          folder.canEdit = true;
          folder.owner = '系统管理员';
          folder.dept = values.dept || '';
          DB.templateFolders.push(folder);
          state.tplFolder = folder.id;
          writeAudit('模板目录', '新增', folder.name, folder.dept ? '可见部门：' + folder.dept : '所有部门可见');
          Store.save();
          renderTemplates($('#view-root'));
        }
        toast('目录已创建：' + values.name);
        return true;
      }
    });
  }

  boot();
})();
