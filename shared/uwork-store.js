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
