/* =========================================================
 *  个人导航页 - 主逻辑
 *  - 自动抓取 favicon 与页面标题
 *  - 本地存储用户增删的书签
 *  - 支持搜索 / 导入 / 导出 / 刷新
 * ========================================================= */
(function () {
  'use strict';

  const LS_KEY = 'personal-nav-bookmarks-v1';
  const LS_META = 'personal-nav-meta-v1'; // 抓取缓存：{ id: {title, icon, ts} }
  const LS_ENGINE = 'personal-nav-engine-v1';
  const LS_SYNC = 'personal-nav-sync-v1';  // { token, gistId, enabled, lastSync }
  const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 天

  // 预置搜索引擎
  const ENGINES = {
    bing:       { name: 'Bing',       url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
    google:     { name: 'Google',     url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    duckduckgo: { name: 'DuckDuckGo', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
    yandex:     { name: 'Yandex',     url: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}` },
  };

  // ---------- 工具 ----------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const showToast = (msg, ms = 1800) => {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.add('hidden'), ms);
  };

  const uid = () => 'bm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const safeHost = (url) => {
    try { return new URL(url).host; } catch { return url; }
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  // ---------- 存储 ----------
  const loadBookmarks = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return (window.DEFAULT_BOOKMARKS || []).map((b) => ({ ...b }));
  };

  const saveBookmarks = (list) => {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  };

  const loadMeta = () => {
    try { return JSON.parse(localStorage.getItem(LS_META)) || {}; }
    catch { return {}; }
  };
  const saveMeta = (m) => localStorage.setItem(LS_META, JSON.stringify(m));

  // ---------- 抓取 ----------
  // 1) favicon：使用 Google 的 favicon 服务（通过 <img> 加载，无 CORS 问题）
  //    失败时回退到 /favicon.ico
  const buildFaviconUrl = (pageUrl) => {
    const host = safeHost(pageUrl);
    if (!host) return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  };

  // 2) 标题：通过 CORS 代理抓取 HTML 解析 <title>
  //    兼容多个代理，按顺序尝试
  const TITLE_PROXIES = [
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  const extractTitle = (html) => {
    if (!html) return '';
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (m) return m[1].trim();
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i);
    if (og) return og[1].trim();
    return '';
  };

  const fetchTitle = async (pageUrl) => {
    for (const build of TITLE_PROXIES) {
      try {
        const endpoint = build(pageUrl);
        const res = await fetch(endpoint, { method: 'GET' });
        if (!res.ok) continue;
        const ct = res.headers.get('content-type') || '';
        let html = '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          html = data.contents || data.body || data || '';
        } else {
          html = await res.text();
        }
        const title = extractTitle(typeof html === 'string' ? html : '');
        if (title) return title;
      } catch (e) {
        // 当前代理失败，尝试下一个
      }
    }
    return '';
  };

  /**
   * 抓取并写回 meta 缓存
   * 返回 { title, icon }
   */
  const enrichBookmark = async (bm, force = false) => {
    const meta = loadMeta();
    const cached = meta[bm.id];
    const needTitle = force || !bm.name || !cached || !cached.title || Date.now() - (cached.ts || 0) > CACHE_TTL;
    const needIcon  = force || !bm.icon || !cached || !cached.icon  || Date.now() - (cached.ts || 0) > CACHE_TTL;

    let title = bm.name || (cached && cached.title) || safeHost(bm.url);
    let icon  = bm.icon  || (cached && cached.icon)  || buildFaviconUrl(bm.url);

    if (needTitle) {
      const t = await fetchTitle(bm.url);
      if (t) title = t;
    }
    if (needIcon) {
      icon = buildFaviconUrl(bm.url);
    }

    meta[bm.id] = {
      title,
      icon,
      ts: Date.now(),
    };
    saveMeta(meta);
    return { title, icon };
  };

  // ---------- 渲染 ----------
  let bookmarks = loadBookmarks();

  const render = (filter = '') => {
    const container = $('#navContainer');
    const kw = filter.trim().toLowerCase();

    const filtered = bookmarks.filter((b) => {
      if (!kw) return true;
      return (
        (b.name || '').toLowerCase().includes(kw) ||
        b.url.toLowerCase().includes(kw) ||
        (b.category || '').toLowerCase().includes(kw)
      );
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty">${
        kw ? '没有匹配的书签' : '暂无书签，点击右上角 ＋ 添加一个吧'
      }</div>`;
      updateTotalCount(0, filtered.length, kw);
      return;
    }

    // 计数：分类内显示"当前可见 / 该分类总数"（搜索时）
    const groups = {};
    bookmarks.forEach((b) => {
      const cat = b.category || '未分类';
      (groups[cat] = groups[cat] || { all: [], shown: [] }).all.push(b);
    });
    filtered.forEach((b) => {
      const cat = b.category || '未分类';
      groups[cat].shown.push(b);
    });

    const meta = loadMeta();
    const sortedCats = Object.keys(groups).sort((a, b) => {
      // "常用" 排第一
      if (a === '常用') return -1;
      if (b === '常用') return 1;
      return a.localeCompare(b, 'zh-CN');
    });

    container.innerHTML = sortedCats
      .map((cat) => {
        const items = groups[cat].shown
          .map((bm) => {
            const m = meta[bm.id] || {};
            const displayName = bm.name || m.title || safeHost(bm.url);
            const iconUrl    = bm.icon || m.icon || buildFaviconUrl(bm.url);
            const firstChar  = (displayName || '?').trim().charAt(0).toUpperCase();
            return `
              <a class="card" href="${escapeHtml(bm.url)}" target="_blank" rel="noopener noreferrer" data-id="${bm.id}" title="${escapeHtml(bm.name || safeHost(bm.url))}">
                <div class="card-icon">
                  <img src="${escapeHtml(iconUrl)}" alt="" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                  <div class="fallback" style="display:none">${escapeHtml(firstChar)}</div>
                </div>
                <div class="card-name">${escapeHtml(displayName)}</div>
                <div class="card-url">${escapeHtml(safeHost(bm.url))}</div>
                <div class="card-actions">
                  <button type="button" data-action="edit" data-id="${bm.id}" title="编辑">✎</button>
                  <button type="button" data-action="del"  data-id="${bm.id}" title="删除">🗑</button>
                </div>
              </a>`;
          })
          .join('');
        return `
          <section class="category">
            <div class="category-header">
              <div class="category-title">${escapeHtml(cat)}</div>
              <div class="category-count">${
                kw
                  ? `${groups[cat].shown.length} / ${groups[cat].all.length}`
                  : groups[cat].all.length
              }</div>
            </div>
            <div class="cards">${items}</div>
          </section>`;
      })
      .join('');

    updateTotalCount(bookmarks.length, filtered.length, kw);
  };

  // 更新顶部总数：搜索时显示 "5 / 23" 形式
  const updateTotalCount = (total, shown, kw) => {
    const el = $('#totalCount');
    if (!el) return;
    if (kw && total > 0) {
      el.textContent = `${shown} / ${total}`;
      el.title = `显示 ${shown} 项，共 ${total} 项`;
    } else {
      el.textContent = String(total);
      el.title = `共 ${total} 项书签`;
    }
  };

  // ---------- 卡片事件（编辑/删除） ----------
  const onCardAction = (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    // 阻止冒泡到外层 <a> 触发导航
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const bm = bookmarks.find((b) => b.id === id);
    if (!bm) return;
    if (action === 'edit') openModal(bm);
    if (action === 'del') {
      if (confirm(`确定要删除 “${bm.name || safeHost(bm.url)}” 吗？`)) {
        bookmarks = bookmarks.filter((b) => b.id !== id);
        saveBookmarks(bookmarks);
        render($('#searchInput').value);
        showToast('已删除');
        schedulePush();
      }
    }
  };

  // ---------- 弹窗 ----------
  const openModal = (bm) => {
    $('#modalTitle').textContent = bm ? '编辑书签' : '添加书签';
    $('#bmId').value         = bm ? bm.id : '';
    $('#bmName').value       = bm ? bm.name || '' : '';
    $('#bmUrl').value        = bm ? bm.url || '' : '';
    $('#bmCategory').value   = bm ? bm.category || '' : '';
    $('#bmIcon').value       = bm ? bm.icon || '' : '';
    refreshCategoryDatalist();
    $('#modal').classList.remove('hidden');
    setTimeout(() => $('#bmUrl').focus(), 50);
  };
  const closeModal = () => $('#modal').classList.add('hidden');

  const refreshCategoryDatalist = () => {
    const cats = Array.from(new Set(bookmarks.map((b) => b.category).filter(Boolean)));
    $('#categoryList').innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">`).join('');
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();
    const id   = $('#bmId').value;
    const name = $('#bmName').value.trim();
    const url  = $('#bmUrl').value.trim();
    const cat  = $('#bmCategory').value.trim() || '未分类';
    const icon = $('#bmIcon').value.trim();

    if (!url) { showToast('请输入网址'); return; }
    try { new URL(url); } catch { showToast('网址格式不正确'); return; }

    if (id) {
      const bm = bookmarks.find((b) => b.id === id);
      if (bm) { bm.name = name; bm.url = url; bm.category = cat; bm.icon = icon; }
    } else {
      bookmarks.push({ id: uid(), name, url, category: cat, icon });
    }
    saveBookmarks(bookmarks);
    closeModal();
    render($('#searchInput').value);
    showToast('已保存');
    schedulePush();
    // 异步抓取新书签的元数据
    enrichAll(false);
  };

  // ---------- 导入 / 导出 ----------
  const exportData = () => {
    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nav-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('已导出 JSON');
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('格式错误');
        // 合并：按 url 去重
        const map = new Map(bookmarks.map((b) => [b.url, b]));
        arr.forEach((b) => {
          if (!b || !b.url) return;
          if (!map.has(b.url)) {
            map.set(b.url, { id: b.id || uid(), name: b.name || '', url: b.url, category: b.category || '未分类', icon: b.icon || '' });
          }
        });
        bookmarks = Array.from(map.values());
        saveBookmarks(bookmarks);
        render($('#searchInput').value);
        enrichAll(false);
        showToast(`已导入，共 ${bookmarks.length} 项`);
        schedulePush();
      } catch (err) {
        showToast('导入失败：' + err.message);
      }
    };
    input.click();
  };

  // ---------- 批量抓取 ----------
  // 并发抓取，控制并发数避免代理限流
  const runWithConcurrency = async (items, limit, fn) => {
    const results = new Array(items.length);
    let idx = 0;
    const workers = Array.from({ length: limit }, async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        try { results[i] = await fn(items[i], i); }
        catch (e) { results[i] = null; }
      }
    });
    await Promise.all(workers);
    return results;
  };

  const enrichAll = async (force = false) => {
    showToast('开始抓取元数据…');
    await runWithConcurrency(bookmarks, 4, (bm) => enrichBookmark(bm, force));
    render($('#searchInput').value);
    showToast('抓取完成');
  };

  // =========================================================
  //  云同步（GitHub Gist）
  // =========================================================
  const GIST_API = 'https://api.github.com';
  const GIST_FILE = 'nav-bookmarks.json';

  const loadSyncConfig = () => {
    try { return JSON.parse(localStorage.getItem(LS_SYNC)) || {}; }
    catch { return {}; }
  };
  const saveSyncConfig = (c) => localStorage.setItem(LS_SYNC, JSON.stringify(c));

  const setSyncIndicator = (state, text) => {
    const el = $('#syncIndicator');
    if (!el) return;
    el.className = 'sync-indicator' + (state ? ' ' + state : '');
    el.textContent = text || '';
    el.title = text || '';
  };

  const setSyncStatus = (text, cls) => {
    const el = $('#syncStatus');
    if (!el) return;
    el.className = 'sync-status' + (cls ? ' ' + cls : '');
    el.textContent = text;
  };

  const gistRequest = async (path, method = 'GET', body) => {
    const cfg = loadSyncConfig();
    if (!cfg.token) throw new Error('请先填写 GitHub Token');
    const res = await fetch(GIST_API + path, {
      method,
      headers: {
        'Authorization': 'token ' + cfg.token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || ('HTTP ' + res.status));
    }
    return res.json();
  };

  const createGist = async (bookmarks) => {
    const data = await gistRequest('/gists', 'POST', {
      description: 'Personal Nav - Bookmarks',
      public: false,
      files: { [GIST_FILE]: { content: JSON.stringify(bookmarks, null, 2) } },
    });
    return data.id;
  };

  const pullFromGist = async () => {
    const cfg = loadSyncConfig();
    if (!cfg.token) throw new Error('请先配置 Token');
    if (!cfg.gistId) throw new Error('没有 Gist ID，请先保存设置');
    const data = await gistRequest('/gists/' + cfg.gistId);
    const file = data.files[GIST_FILE];
    if (!file) return null;
    let content = file.content || '';
    // 内容过长会被截断，需用 raw_url 二次拉取
    if (!content && file.truncated && file.raw_url) {
      const res = await fetch(file.raw_url, {
        headers: { 'Authorization': 'token ' + cfg.token },
      });
      if (!res.ok) throw new Error('拉取 raw 内容失败 HTTP ' + res.status);
      content = await res.text();
    }
    if (!content) return null;
    const arr = JSON.parse(content);
    if (!Array.isArray(arr)) throw new Error('Gist 内容不是书签数组');
    return arr;
  };

  const pushToGist = async (bookmarks) => {
    const cfg = loadSyncConfig();
    if (!cfg.token) throw new Error('请先配置 Token');
    if (!cfg.gistId) {
      cfg.gistId = await createGist(bookmarks);
      saveSyncConfig(cfg);
      const idEl = $('#ghGistId');
      if (idEl) idEl.value = cfg.gistId;
    } else {
      await gistRequest('/gists/' + cfg.gistId, 'PATCH', {
        files: { [GIST_FILE]: { content: JSON.stringify(bookmarks, null, 2) } },
      });
    }
    cfg.lastSync = Date.now();
    saveSyncConfig(cfg);
  };

  let pushTimer = null;
  let syncing = false;
  let pendingPush = false;   // 本地有未推送的变更，期间禁止拉取覆盖
  let queuedDuringSync = false;

  const schedulePush = () => {
    if (!loadSyncConfig().enabled) return;
    pendingPush = true;
    if (syncing) {
      // 当前正在推送，把这次改动排队，等当前推送结束后再推一次
      queuedDuringSync = true;
      return;
    }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(executeScheduledPush, 1500);
  };

  const executeScheduledPush = async () => {
    if (!loadSyncConfig().enabled) {
      pendingPush = false;
      return;
    }
    if (syncing) {
      queuedDuringSync = true;
      return;
    }
    syncing = true;
    setSyncIndicator('syncing', '⏳');
    try {
      await pushToGist(bookmarks);
      setSyncIndicator('synced', '✓');
      setTimeout(() => setSyncIndicator('', ''), 1500);
      pendingPush = false; // 推送成功，本地与云端一致
    } catch (err) {
      setSyncIndicator('error', '⚠');
      setSyncStatus('推送失败：' + err.message, 'error');
      // 推送失败保留 pendingPush=true，避免被拉取覆盖
    } finally {
      syncing = false;
      if (queuedDuringSync) {
        queuedDuringSync = false;
        schedulePush();
      }
    }
  };

  const doPull = async (silent = false, force = false) => {
    if (syncing) return;
    if (pendingPush && !force) {
      // 本地有未推送的改动，不允许拉取覆盖（防删除"闪回"）
      if (!silent) setSyncStatus('本地有未推送的修改，请先推送或等待…', 'busy');
      return;
    }
    syncing = true;
    setSyncIndicator('syncing', '⏳');
    setSyncStatus('正在拉取…', 'busy');
    try {
      const remote = await pullFromGist();
      // 拉取过程中用户可能又改了本地，再检查一次
      if (pendingPush && !force) {
        if (!silent) setSyncStatus('本地有新修改，已取消本次拉取', 'busy');
        return;
      }
      if (remote === null) {
        if (!silent) setSyncStatus('Gist 为空', '');
      } else if (remote.length === 0) {
        if (!silent) setSyncStatus('Gist 中无书签', '');
      } else {
        bookmarks = remote;
        saveBookmarks(bookmarks);
        render($('#searchInput').value);
        pendingPush = false; // 拉取后以云端为准
        if (!silent) showToast('已从 Gist 拉取 ' + bookmarks.length + ' 项');
      }
      setSyncIndicator('synced', '✓');
      setSyncStatus('已同步 · ' + new Date(loadSyncConfig().lastSync || Date.now()).toLocaleString('zh-CN'), 'ok');
      setTimeout(() => setSyncIndicator('', ''), 1500);
    } catch (err) {
      setSyncIndicator('error', '⚠');
      setSyncStatus('拉取失败：' + err.message, 'error');
      if (!silent) showToast('拉取失败：' + err.message);
    } finally {
      syncing = false;
    }
  };

  const doPush = async () => {
    if (syncing) return;
    syncing = true;
    setSyncIndicator('syncing', '⏳');
    setSyncStatus('正在推送…', 'busy');
    try {
      await pushToGist(bookmarks);
      setSyncIndicator('synced', '✓');
      setSyncStatus('已同步 · ' + new Date().toLocaleString('zh-CN'), 'ok');
      showToast('已推送到 Gist');
      setTimeout(() => setSyncIndicator('', ''), 1500);
    } catch (err) {
      setSyncIndicator('error', '⚠');
      setSyncStatus('推送失败：' + err.message, 'error');
      showToast('推送失败：' + err.message);
    } finally {
      syncing = false;
    }
  };

  const openSettings = () => {
    const cfg = loadSyncConfig();
    $('#ghToken').value = cfg.token || '';
    $('#ghGistId').value = cfg.gistId || '';
    $('#enableSync').checked = !!cfg.enabled;
    if (cfg.lastSync) {
      setSyncStatus('上次同步：' + new Date(cfg.lastSync).toLocaleString('zh-CN'), 'ok');
    } else if (cfg.token) {
      setSyncStatus('已配置 Token', '');
    } else {
      setSyncStatus('未配置', '');
    }
    $('#settingsModal').classList.remove('hidden');
  };
  const closeSettings = () => $('#settingsModal').classList.add('hidden');

  const saveSettings = (e) => {
    if (e) e.preventDefault();
    const cfg = loadSyncConfig();
    cfg.token = $('#ghToken').value.trim();
    cfg.gistId = $('#ghGistId').value.trim();
    cfg.enabled = $('#enableSync').checked;
    saveSyncConfig(cfg);
    showToast('设置已保存');
    if (cfg.enabled && cfg.token) {
      // 第一次启用且没 Gist：先推一次创建
      if (!cfg.gistId) doPush();
      else doPull();
    } else {
      setSyncIndicator('', '');
    }
  };

  // ---------- 事件绑定 ----------
  const bindEvents = () => {
    // 引擎切换
    const engineSel = $('#webEngine');
    const savedEngine = localStorage.getItem(LS_ENGINE);
    if (savedEngine && ENGINES[savedEngine]) engineSel.value = savedEngine;
    engineSel.addEventListener('change', () => {
      localStorage.setItem(LS_ENGINE, engineSel.value);
    });

    // 网页搜索
    $('#webSearch').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#webQuery').value.trim();
      if (!q) { $('#webQuery').focus(); return; }
      const engine = ENGINES[engineSel.value] ? engineSel.value : 'bing';
      window.open(ENGINES[engine].url(q), '_blank', 'noopener,noreferrer');
    });

    $('#searchInput').addEventListener('input', (e) => {
      const has = !!e.target.value;
      $('#clearSearch').classList.toggle('hidden', !has);
      render(e.target.value);
    });

    $('#clearSearch').addEventListener('click', () => {
      $('#searchInput').value = '';
      $('#clearSearch').classList.add('hidden');
      render('');
      $('#searchInput').focus();
    });

    $('#addBtn').addEventListener('click', () => openModal(null));
    $('#cancelBtn').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') closeModal();
    });
    $('#bookmarkForm').addEventListener('submit', onFormSubmit);

    $('#importBtn').addEventListener('click', importData);
    $('#exportBtn').addEventListener('click', exportData);
    $('#refreshBtn').addEventListener('click', () => enrichAll(true));

    // 同步设置
    $('#syncBtn').addEventListener('click', openSettings);
    $('#cancelSettings').addEventListener('click', closeSettings);
    $('#settingsModal').addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') closeSettings();
    });
    $('#settingsForm').addEventListener('submit', saveSettings);
    $('#pullNow').addEventListener('click', () => {
      // 手动拉取：即便有未推送的修改也允许（用户明确操作）
      if (pendingPush) {
        if (!confirm('本地有未推送的修改，拉取会覆盖它们。是否继续？')) return;
      }
      doPull(false, true);
    });
    $('#pushNow').addEventListener('click', () => doPush());

    // 委托：卡片上的编辑/删除
    $('#navContainer').addEventListener('click', onCardAction);

    // ESC 关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeSettings();
      }
      // Ctrl/⌘ + K 聚焦书签搜索
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#searchInput').focus();
        $('#searchInput').select();
      }
    });

    // 切回标签页时拉取一次（多设备同步关键）
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && loadSyncConfig().enabled) doPull(true);
    });
    window.addEventListener('focus', () => {
      if (loadSyncConfig().enabled) doPull(true);
    });

    $('#year').textContent = new Date().getFullYear();
  };

  // ---------- 启动 ----------
  const init = () => {
    bindEvents();
    render('');
    // 启动时若已启用同步，先拉取最新数据
    if (loadSyncConfig().enabled && loadSyncConfig().token) {
      doPull(true);
    }
    // 首屏渲染后再异步抓取元数据，避免阻塞首绘
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => enrichAll(false), { timeout: 1500 });
    } else {
      setTimeout(() => enrichAll(false), 300);
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
