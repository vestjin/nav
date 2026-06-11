# 个人导航页

> 轻量、零依赖、跨设备同步的个人导航首页。4 个文件，~44 KB，无构建步骤。

![license](https://img.shields.io/badge/license-MIT-green)
![deps](https://img.shields.io/badge/deps-0-success)

## ✨ 特性

- **零依赖、零构建** — 双击 `index.html` 就能用
- **多设备同步** — 通过 GitHub Gist 跨浏览器同步书签，**无需自建服务器**
- **自动抓取** — 自动获取 favicon 和页面标题，缓存 7 天
- **护眼主题** — 米黄配色，长时间使用不刺眼
- **极速加载** — 首屏 < 15 KB（gzip），无重动画
- **完整 CRUD** — 增删改查、搜索、导入导出
- **响应式** — 桌面 / 平板 / 手机自适应
- **隐私优先** — 数据存在你的浏览器或你的私有 Gist，不经过第三方

## 🚀 快速开始

### 本地预览

直接双击 `index.html`，或在 `nav/` 目录下运行：

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# 然后访问 http://localhost:8000
```

> 💡 `file://` 协议下抓取页面标题会被浏览器拦截（CORS），**用本地 http 服务即可解决**。Favicon 不受影响。

### 部署到 GitHub Pages

```bash
cd nav
git init
git add .
git commit -m "init: personal nav"
# 在 GitHub 创建仓库（例如 nav-page），然后：
git branch -M main
git remote add origin https://github.com/<你的用户名>/nav-page.git
git push -u origin main
```

进入仓库 **Settings → Pages → Build and deployment → Branch: `main` / `/ (root)` → Save**。

几分钟后即可访问 `https://<你的用户名>.github.io/nav-page/`。

## ☁️ 配置云同步（可选）

云同步让你的多设备 / 多浏览器共享同一份书签。

### 1. 创建 GitHub Token

访问 [New Token](https://github.com/settings/tokens/new?scopes=gist&description=Personal%20Nav%20Sync)，**只勾选 `gist` 权限**，生成后复制 Token（形如 `ghp_xxx…`）。

### 2. （推荐）填入默认 Gist ID

编辑 `script.js`，把：

```js
const DEFAULT_GIST_ID = '你的默认GistID';
```

替换成你自己的 Gist ID。**所有设备部署同一份代码 → 默认就同步到同一个 Gist。**

获取 Gist ID：
1. 访问 [gist.github.com](https://gist.github.com) → 创建新 Gist（内容随便，设为 **Secret**）
2. 创建后 URL 形如 `https://gist.github.com/<用户名>/abc123def456...`
3. `abc123def456...` 这部分就是 Gist ID

> 不想在代码里硬编码？保持 `DEFAULT_GIST_ID` 为空，用户在同步设置里填入自己的 Gist ID 即可。

### 3. 启用同步

打开网页 → 右上角 **☁** → 粘贴 Token → 勾选 ✅ 启用云同步 → 保存。

首次启用会自动创建 Gist（如果既无默认也无用户 ID）。

## ⌨️ 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl` / `⌘` + `K` | 聚焦书签搜索框 |
| `Esc` | 关闭弹窗 |
| `Enter`（网页搜索框） | 在选中引擎中搜索 |

## 📁 文件结构

```
nav/
├── index.html  ( 6 KB)   - 页面骨架，含搜索/同步/书签弹窗
├── style.css   (12 KB)   - 护眼主题，CSS 变量驱动，响应式
├── data.js     ( 3 KB)   - 默认书签（出厂种子，可自定义）
├── script.js   (28 KB)   - 所有交互逻辑（IIFE 闭包，无全局污染）
├── LICENSE
└── README.md
```

无构建工具、无 `node_modules`、无打包。

## 💾 数据存储

| 类型 | 存储位置 | 用途 |
| --- | --- | --- |
| 书签数据 | `localStorage[personal-nav-bookmarks-v1]` | 主存储 |
| 抓取缓存 | `localStorage[personal-nav-meta-v1]` | favicon + 标题，7 天 TTL |
| 引擎选择 | `localStorage[personal-nav-engine-v1]` | 上次用的搜索引擎 |
| 同步配置 | `localStorage[personal-nav-sync-v1]` | Token + Gist ID |
| 云端备份 | GitHub Gist（私有） | 多设备同步 |

**首次打开**：用 `data.js` 的 `DEFAULT_BOOKMARKS` 种子初始化 localStorage。
**之后**：所有操作直接写 localStorage，不再读 `data.js`。
**跨设备**：通过 Gist 同步（最后写入获胜策略）。

## 🔧 自定义

### 修改默认书签

编辑 `data.js`：

```js
window.DEFAULT_BOOKMARKS = [
  { id: 'bm-github', name: 'GitHub', url: 'https://github.com', icon: '', category: '常用' },
  // ... 自行增删
];
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 唯一字符串，建议 `bm-<slug>` 格式 |
| `name` |  | 留空则自动抓取页面标题 |
| `url` | ✅ | 目标网址 |
| `icon` |  | 留空则自动抓取 favicon |
| `category` |  | 分类名（影响分组） |

### 修改主题色

`style.css` 顶部 CSS 变量：

```css
:root {
  --bg:        #f1ecdf;   /* 页面背景 */
  --card:      #fbf8f0;   /* 卡片背景 */
  --text:      #3b352c;   /* 正文文字 */
  --text-dim:  #8a8273;   /* 次要文字 */
  --primary:   #6f9472;   /* 主色（草绿） */
  --border:    #e3dccb;   /* 边框 */
  --card-hover:#ede7d6;   /* 卡片悬停 */
  --danger:    #b06b5c;   /* 危险/删除 */
}
```

### 添加更多搜索引擎

`script.js` 中：

```js
const ENGINES = {
  bing:       { name: 'Bing',       url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  google:     { name: 'Google',     url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  duckduckgo: { name: 'DuckDuckGo', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  yandex:     { name: 'Yandex',     url: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}` },
  // 加新引擎：baidu: { name: '百度', url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
};
```

`index.html` 的 `<select id="webEngine">` 同步加 `<option value="baidu">百度</option>`。

## 🛡️ 安全说明

- **Token 存在你浏览器的 localStorage**，不上传到任何服务器
- 建议用 [Fine-grained token](https://github.com/settings/tokens?type=beta)，只授权当前账号的 `Gists: Read and write`
- 嫌麻烦随时在 GitHub → Settings → Tokens 撤销
- `data.js` 的默认书签是公开代码，**不要把私有的 Token / Gist ID 写进去**（虽然 Gist ID 不是秘密）

## 🐛 常见问题

<details>
<summary><b>本地 file:// 打开，抓不到页面标题？</b></summary>

浏览器禁止 `file://` 协议下 `fetch(https://…)`。用本地 http 服务（`python -m http.server`）即可。
</details>

<details>
<summary><b>删除书签后"闪回"又出现？</b></summary>

已修复。原因是 `confirm` 弹窗关闭触发 `focus` 事件 → 自动拉取旧 Gist 数据。代码用 `pendingPush` 守卫 + 推送期间变更排队机制解决。
</details>

<details>
<summary><b>Gist 同步失败，提示 401 / 404？</b></summary>

- **401**：Token 无效或过期，去 GitHub 重新生成
- **404**：Gist ID 不存在，或 Token 没访问权限（私有 Gist 必须是 Gist 所有者）
</details>

<details>
<summary><b>多设备冲突，最后写入的会覆盖另一台？</b></summary>

是。当前是 **last-write-wins** 策略。日常使用几乎不会冲突（推送 1.5s 防抖 + 切回标签自动拉取）。如对冲突敏感，编辑前在同步设置里点 ⬇ 拉取一次。
</details>

<details>
<summary><b>怎么彻底清空数据？</b></summary>

F12 打开控制台执行：
```js
localStorage.clear(); location.reload();
```
或用页面上的 ⬇ 导出 → 备份 JSON → ⬆ 导入。
</details>

## 🚧 路线图

- [ ] PWA：manifest + service worker，支持安装到桌面 / 完全离线
- [ ] 多 Gist 切换：工作 / 生活 / 学习 分组同步
- [ ] 拖拽排序：分类与卡片
- [ ] 暗色模式：`prefers-color-scheme: dark`
- [ ] 导入浏览器书签：解析 Chrome / Firefox 的 `bookmarks.html`
- [ ] 快捷键直达：输入 `gh` 回车直达 GitHub
- [ ] 图标本地缓存：favicon 转 base64 存 localStorage
- [ ] 分组折叠：分类可收起 / 展开

## 📜 许可

[MIT](./LICENSE) © 2026 vestfish
