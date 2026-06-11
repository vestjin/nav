# 项目分析

## 💡 改进方向

- [ ] **PWA** — 加 manifest + service worker，支持安装到桌面、完全离线
- [ ] **多 Gist 切换** — 工作/生活/学习 多个 Gist
- [ ] **拖拽排序** — `@dnd-kit` 或原生 HTML5 drag（增加 \~10KB）
- [ ] **暗色模式** — 加 `@media (prefers-color-scheme: dark)` 切换
- [ ] **导入 HTML 书签** — 解析 Chrome/Firefox 导出的 bookmarks.html
- [ ] **快捷键直达** — 输入 `gh` 回车直达 GitHub
- [ ]  **图标本地缓存** — 把抓到的 favicon 转 base64 存 localStorage
- [ ] **分组折叠** — 分类可收起/展开

## 📊 总体概览

| 项目    | 数据                                                                               |
| ----- | -------------------------------------------------------------------------------- |
| 文件数   | 4 个                                                                              |
| 总大小   | **44 KB** （data.js 2.5KB + index.html 5.3KB + script.js 25.1KB + style.css 12KB） |
| 外部依赖  | **0**（无 CDN、无 npm 包）                                                             |
| 部署方式  | 纯静态，可直接 GitHub Pages                                                             |
| 浏览器兼容 | 现代浏览器（Chrome/Edge/Firefox/Safari 最新版）                                            |

## 🏗️ 架构

```
nav/
├── index.html  (5.3 KB)   - 页面骨架，含两个弹窗和 Toast
├── style.css   (12 KB)    - 护眼米黄主题，CSS 变量驱动
├── data.js     (2.5 KB)   - 出厂默认书签（~20 项）
└── script.js   (25 KB)    - 所有交互逻辑（IIFE 闭包）
```

**无构建步骤** — 浏览器直接打开 `index.html` 就能跑，调试方便。

## ✅ 已实现功能

### 基础能力

- 增 / 删 / 改书签（弹窗表单 + 卡片悬停按钮）
- 实时搜索过滤（书签名 / URL / 分类 / 标题）
- 导入 / 导出 JSON
- 键盘快捷键：`Ctrl/⌘+K` 聚焦搜索，`Esc` 关闭弹窗
- 移动端响应式（卡片网格自适应）

### 自动抓取

- **Favicon** — 走 `google.com/s2/favicons?domain=...`，无 CORS 问题（`<img>` 加载）
- **页面标题** — 3 个 CORS 代理依次尝试（`allorigins` → `codetabs` → `corsproxy`）
- **抓取缓存** — localStorage 存 7 天，避免重复请求
- **并发控制** — 4 线程 `runWithConcurrency`，避免一次性打爆代理

### 护眼主题

- 米黄背景 `#f1ecdf` + 浅米白卡片 `#fbf8f0`
- 暖深灰文字 `#3b352c`（非纯黑，降低对比刺激）
- 主色草绿 `#6f9472`
- 零 `backdrop-filter` / 模糊光球 / 复杂动画 → 加载快、省 GPU

### 云同步（GitHub Gist）

- 用户私有 Gist 存储书签
- 自动推送：增删改后 1.5s 防抖上传
- 自动拉取：切回标签 / 窗口聚焦时同步
- 状态指示器：⏳ / ✓ / ⚠ 直观显示
- 防"删除闪回"：`pendingPush` 守卫机制
- 防"推送期间改动丢失"：`queuedDuringSync` 队列
- 首次启用自动创建私有 Gist

### 计数展示

- 顶部总数（搜索时显示 "5 / 23" 格式）
- 每个分类计数（搜索时显示 "2 / 5"）
- 数字等宽（`tabular-nums`），变化不抖动

## 🔒 数据流

```
首次打开
  └─→ localStorage 有数据？── 是 → 用 localStorage
                  │
                  否 → 读 window.DEFAULT_BOOKMARKS（data.js）
                  
用户增删改
  └─→ 写 localStorage
  └─→ 重渲染
  └─→ schedulePush()（若启用同步）
        └─→ 1.5s 后 → 推 Gist
        
切回标签 / 聚焦
  └─→ doPull()（若启用同步 + 无 pendingPush）
        └─→ 覆盖 localStorage
        └─→ 重渲染
```

## ⚠️ 已知限制

| 项                | 现状                     | 原因                                        |
| ---------------- | ---------------------- | ----------------------------------------- |
| `file://` 抓取标题失败 | 已知                     | Chrome/Edge 禁止 `file://` 调 `fetch(https)` |
| 离线首次打开           | 用 data.js 兜底           | 合理降级                                      |
| 多设备冲突            | Last-write-wins        | 简单可靠，未做版本号合并                              |
| 抓取代理失效           | 3 个代理依次试               | 已最大化容错                                    |
| Token 安全         | 存 localStorage         | 浏览器侧加密有限，建议用 fine-grained token           |
| 书签体积上限           | Gist 文件 1MB / 卡片几百项无压力 | 超出需切 raw\_url 拉取，已实现                      |
| 无 PWA 离线         | 未做                     | 需 service worker，可后续加                     |

## 🚀 性能特征

- **首屏阻塞 JS**：几乎为 0（IIFE 立即执行但只绑定事件）
- **元数据抓取**：`requestIdleCallback` 延迟到空闲期，不阻塞首绘
- **图片**：`decoding="async"`，无 `loading="lazy"`（20 张小图 lazy 更慢）
- **CSS**：`backdrop-filter: none`，无 `box-shadow` 大模糊，复合层少
- **总资源**：4 个文件，gzip 后预计 < 15 KB


## 🎯 项目亮点

- **零依赖、零构建**：双击 HTML 就能用
- **数据完全可移植**：导出 JSON 就能备份/迁移
- **多设备同步无需服务器**：GitHub Gist 兼任 KV 存储
- **轻量但完整**：增删改查、搜索、同步、抓取、缓存、导入导出全有
- **离线兜底**：data.js 当 seed，localStorage 当主存储，Gist 当备份

***

**总结**：**结构清晰、依赖极少、加载飞快**的纯静态导航页。核心逻辑都在一个 IIFE 闭包里，state 集中（`bookmarks` / `meta` / `syncConfig`），扩展点明确。需要新增功能基本只需要动 1-2 个文件。
