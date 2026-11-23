/**
 * UWork 原型共享数据层
 * - 首次加载使用 shared/uwork-data.js 的 seed
 * - 之后改动写入 localStorage，客户端与管理端同源打开时形成同一套数据闭环
 * - 所有可见性判断都通过 canSee(userLevel, itemLevel)
 */
(function () {
  const KEY = 'uwork.prototype.db.v3';

  function deepClone(value) {
    if (value === undefined) return value;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (err) { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  const seed = window.UWORK_SEED || {};

  function readSaved() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.meta || parsed.meta.version !== seed.meta.version) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  const db = readSaved() || deepClone(seed);
  Object.keys(seed).forEach((key) => {
    if (key !== 'meta' && db[key] === undefined) db[key] = deepClone(seed[key]);
  });

  /**
   * 兼容旧数据：技能从「扁平分类」升级为「目录层级」。
   * 早期 localStorage 中的技能只有 category，没有 folder，这里补上目录归属。
   */
  (function migrateSkillFolders() {
    const folders = db.skillFolders;
    if (!Array.isArray(folders) || !folders.length) return;
    const legacy = {
      '办公写作': 'sf11', '质量管理': 'sf21', '保密管理': 'sf31',
      '法务合规': 'sf32', '产品研发': 'sf41', '数据分析': 'sf5', '通用能力': 'sf6'
    };
    const ids = new Set(folders.map((folder) => folder.id));
    const byName = new Map(folders.map((folder) => [folder.name, folder]));
    (db.skills || []).forEach((skill) => {
      if (skill.folder && ids.has(skill.folder)) return;
      const mapped = legacy[skill.category];
      if (mapped && ids.has(mapped)) {
        skill.folder = mapped;
      } else {
        const match = byName.get(skill.category) || byName.get('未分类');
        skill.folder = match ? match.id : folders[0].id;
      }
      const folder = folders.find((item) => item.id === skill.folder);
      if (folder) skill.category = folder.name;
    });
  })();

  /**
   * 兼容旧数据：连接器补齐品牌色与图形标记，并一次性并入新增的预置连接器。
   * 早期 localStorage 中的连接器只有名称/分类/状态，客户端无法渲染品牌图标。
   */
  (function migrateConnectors() {
    if (!Array.isArray(db.connectors)) db.connectors = [];
    const presets = Array.isArray(seed.connectors) ? seed.connectors : [];
    const look = new Map(presets.map((item) => [item.id, item]));
    let patched = false;
    db.connectors.forEach((connector) => {
      const preset = look.get(connector.id);
      if (!connector.brand) { connector.brand = (preset && preset.brand) || '#5b7cfa'; patched = true; }
      if (!connector.mark) { connector.mark = (preset && preset.mark) || 'link'; patched = true; }
      /* 旧数据只有「已连接/未连接」，没有区分「已配置」与「已开启」：
         管理端预置的按预置值还原，用户自建或曾经开通过的视为已配置，
         这样关闭开关时只会置灰，不会退回「连接」按钮。 */
      if (typeof connector.configured !== 'boolean') {
        connector.configured = connector.status === '已连接' || !preset || preset.configured === true;
        patched = true;
      }
    });
    if (db.meta.connectorSeed !== 2) {
      const ids = new Set(db.connectors.map((connector) => connector.id));
      presets.forEach((preset) => {
        if (ids.has(preset.id)) return;
        db.connectors.push(deepClone(preset));
        ids.add(preset.id);
      });
      db.meta.connectorSeed = 2;
      patched = true;
    }
    if (patched) save();
  })();

  /**
   * 兼容旧数据：连接器从「扁平分类」升级为「分类层级」。
   * 早期 localStorage 中的连接器只有 category，没有 folder，这里补上分类归属，
   * 分类名与客户端、管理端展示保持一致（category 同步为所属分类名，便于搜索）。
   */
  (function migrateConnectorFolders() {
    const folders = db.connectorFolders;
    if (!Array.isArray(folders) || !folders.length) return;
    const legacy = {
      '即时通讯': 'cf11', '会议': 'cf12', '邮件': 'cf13',
      '协同办公': 'cf1',
      '在线文档': 'cf21', '知识库': 'cf22', '文件存储': 'cf23',
      '研发管理': 'cf31', '代码托管': 'cf32',
      '经营财务': 'cf41', '客户管理': 'cf42', '工商数据': 'cf43', '合同签署': 'cf44',
      '质量管理': 'cf51', '生产制造': 'cf52', '供应链': 'cf53',
      '数据分析': 'cf61', '表单收集': 'cf62',
      '人力资源': 'cf7', '自定义': 'cf0'
    };
    const ids = new Set(folders.map((folder) => folder.id));
    const byName = new Map(folders.map((folder) => [folder.name, folder]));
    let patched = false;
    (db.connectors || []).forEach((connector) => {
      if (connector.folder && ids.has(connector.folder)) return;
      const mapped = legacy[connector.category];
      const match = (mapped && ids.has(mapped)) ? folders.find((folder) => folder.id === mapped) : (byName.get(connector.category) || byName.get('未分类'));
      connector.folder = match ? match.id : folders[0].id;
      if (match) connector.category = match.name;
      patched = true;
    });
    if (patched) save();
  })();

  const levels = (db.levels && db.levels.length) ? db.levels : (window.UWORK_LEVELS || []).slice();

  function save() {
    try {
      db.meta.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
      window.localStorage.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      /* 原型允许在 file:// 下无持久化运行 */
    }
  }

  function reset() {
    const fresh = deepClone(seed);
    Object.keys(db).forEach((key) => { delete db[key]; });
    Object.assign(db, fresh);
    save();
  }

  function level(code) {
    return levels.find((item) => item.code === code) || levels[0] || { code: 'L1', name: '公开', rank: 1, color: '#1f8f4e', bg: '#e9f7ef' };
  }

  function rank(code) {
    return level(code).rank;
  }

  function canSee(userLevel, itemLevel) {
    return rank(itemLevel) <= rank(userLevel);
  }

  function visible(items, userLevel) {
    return (items || []).filter((item) => canSee(userLevel, item.level));
  }

  function userByName(username) {
    if (!username) return null;
    const key = String(username).trim().toLowerCase();
    return (db.users || []).find((user) => user.username.toLowerCase() === key || user.name === username.trim()) || null;
  }

  function userById(id) {
    return (db.users || []).find((user) => user.id === id) || null;
  }

  function foldersOf(collection, parent) {
    return (collection || []).filter((folder) => (folder.parent || null) === (parent || null));
  }

  function folderTrail(collection, id) {
    const map = new Map((collection || []).map((folder) => [folder.id, folder]));
    const trail = [];
    let current = map.get(id);
    while (current) {
      trail.unshift(current);
      current = current.parent ? map.get(current.parent) : null;
    }
    return trail;
  }

  function descendants(collection, id) {
    const out = [];
    const walk = (parentId) => {
      (collection || []).filter((folder) => folder.parent === parentId).forEach((folder) => {
        out.push(folder);
        walk(folder.id);
      });
    };
    walk(id);
    return out;
  }

  let seq = 0;
  function uid(prefix) {
    seq += 1;
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + seq;
  }

  function extOf(name) {
    const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : 'file';
  }

  window.UWorkStore = {
    db,
    levels,
    save,
    reset,
    level,
    rank,
    canSee,
    visible,
    userByName,
    userById,
    foldersOf,
    folderTrail,
    descendants,
    uid,
    extOf,
    clone: deepClone
  };
})();
