/**
 * 默认导航数据
 * 在这里维护你的默认书签集合
 * 字段说明：
 *   id      - 唯一标识（字符串）
 *   name    - 名称（留空时会自动抓取页面标题）
 *   url     - 目标网址
 *   icon    - 图标 URL（留空时自动抓取 favicon）
 *   category- 分类名称
 */
window.DEFAULT_BOOKMARKS = [
  // —— 常用 ——
  { id: 'bm-github',    name: 'GitHub',     url: 'https://github.com',     icon: '', category: '常用' },
  { id: 'bm-gitee',     name: 'Gitee',      url: 'https://gitee.com',      icon: '', category: '常用' },
  { id: 'bm-baidu',     name: '百度',       url: 'https://www.baidu.com',  icon: '', category: '常用' },
  { id: 'bm-bing',      name: 'Bing',       url: 'https://www.bing.com',   icon: '', category: '常用' },
  { id: 'bm-zhihu',     name: '知乎',       url: 'https://www.zhihu.com',  icon: '', category: '常用' },

  // —— 开发工具 ——
  { id: 'bm-mdn',       name: 'MDN',        url: 'https://developer.mozilla.org', icon: '', category: '开发' },
  { id: 'bm-stack',     name: 'StackOverflow', url: 'https://stackoverflow.com', icon: '', category: '开发' },
  { id: 'bm-caniuse',   name: 'Can I use',  url: 'https://caniuse.com',    icon: '', category: '开发' },
  { id: 'bm-regex101',  name: 'Regex101',   url: 'https://regex101.com',   icon: '', category: '开发' },
  { id: 'bm-jsfiddle',  name: 'JSFiddle',   url: 'https://jsfiddle.net',   icon: '', category: '开发' },
  { id: 'bm-codepen',   name: 'CodePen',    url: 'https://codepen.io',     icon: '', category: '开发' },

  // —— 学习 ——
  { id: 'bm-csdn',      name: 'CSDN',       url: 'https://www.csdn.net',   icon: '', category: '学习' },
  { id: 'bm-juejin',    name: '掘金',       url: 'https://juejin.cn',      icon: '', category: '学习' },
  { id: 'bm-runoob',    name: '菜鸟教程',   url: 'https://www.runoob.com', icon: '', category: '学习' },
  { id: 'bm-leetcode',  name: 'LeetCode',   url: 'https://leetcode.cn',    icon: '', category: '学习' },

  // —— 工具 ——
  { id: 'bm-cdnjs',     name: 'cdnjs',      url: 'https://cdnjs.com',      icon: '', category: '工具' },
  { id: 'bm-json',      name: 'JSON Tools', url: 'https://www.json.cn',    icon: '', category: '工具' },
  { id: 'bm-tinypng',   name: 'TinyPNG',    url: 'https://tinypng.com',    icon: '', category: '工具' },
  { id: 'bm-removebg',  name: 'remove.bg',  url: 'https://www.remove.bg',  icon: '', category: '工具' },
];
