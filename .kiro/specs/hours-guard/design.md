# 设计文档

## 概述

Hours Guard (工时卫士) 采用简洁的Web技术开发，实现纯本地化的工时记录管理。系统设计遵循MVP原则，通过浏览器本地存储确保用户数据安全，支持多种格式的文件导出功能。界面采用传统的标签页切换设计，避免过度工程化，专注核心功能。

## 架构设计

### 整体架构

```
┌─────────────────────────────────────┐
│           浏览器环境                  │
├─────────────────────────────────────┤
│  UI层 (HTML + CSS + 响应式设计)      │
├─────────────────────────────────────┤
│  业务逻辑层 (ES6+ JavaScript)        │
├─────────────────────────────────────┤
│  数据存储层 (localStorage + IndexedDB) │
├─────────────────────────────────────┤
│  PWA层 (Service Worker + Manifest)   │
├─────────────────────────────────────┤
│  文件系统层 (多格式导出)              │
└─────────────────────────────────────┘
```

### 技术栈选择

| 层级 | 技术方案 | 选择理由 |
|------|----------|----------|
| 框架 | 原生HTML5 + CSS3 + JavaScript | 无额外依赖，包体积最小，性能最优 |
| UI组件 | 原生Web组件 | 标准化，兼容性好，无第三方依赖 |
| 数据存储 | localStorage + IndexedDB | 纯本地存储，无网络请求，隐私安全 |
| 文件导出 | Blob API + Canvas API | 支持多格式导出，符合Web标准 |
| 状态管理 | 模块化状态管理 | 简单场景，基于观察者模式 |
| 设计风格 | 现代扁平设计 + 响应式布局 | 跨平台一致性，用户体验优秀 |
| PWA | Service Worker + Web App Manifest | 离线支持，可安装，原生体验 |

## 组件和接口设计

### 文件结构

```
/
├── index.html            # 单页面应用，包含所有功能
├── css/
│   ├── main.css          # 主样式文件
│   ├── desktop.css       # 桌面端样式
│   └── mobile.css        # 移动端样式
├── js/
│   ├── app.js            # 应用核心逻辑
│   ├── storage.js        # 存储管理模块
│   ├── error.js          # 错误处理模块
│   ├── i18n.js           # 国际化模块
│   └── utils.js          # 工具函数模块
├── assets/
│   └── icons/            # PWA图标资源
├── manifest.json         # PWA配置文件
└── sw.js                # Service Worker
```

### 核心模块设计

#### 1. 应用核心模块 (app.js)
```javascript
// 职责：应用初始化，标签页切换，状态管理
class HoursGuardApp {
  constructor() {
    this.currentTab = 'clock';
    this.records = [];
    this.config = {};
  }
  
  // 方法：init, switchTab, updateState, handleError
  switchTab(tabName) {
    // 简单的显示/隐藏逻辑
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
    });
    document.getElementById(tabName + '-tab').style.display = 'block';
    this.currentTab = tabName;
  }
}
```

#### 2. 存储管理模块 (storage.js)
```javascript
// 职责：数据持久化，备份管理，数据验证
class StorageManager {
  constructor() {
    this.storageKey = 'hoursGuard_records';
    this.configKey = 'hoursGuard_config';
    this.backupKey = 'hoursGuard_backup';
  }
  
  // 方法：save, load, backup, restore, validate
}
```

#### 3. 错误处理模块 (error.js)
```javascript
// 职责：错误捕获，用户提示，错误恢复
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.retryCount = 0;
  }
  
  // 方法：handleError, showUserMessage, retry, logError
}
```

#### 4. 国际化模块 (i18n.js)
```javascript
// 职责：多语言支持，本地化格式
class I18nManager {
  constructor() {
    this.currentLang = 'zh-CN';
    this.messages = {};
  }
  
  // 方法：detectLanguage, setLanguage, translate, formatDate
}
```

## 数据模型设计

### 存储结构

#### 主要数据模型
```javascript
// localStorage: 'hoursGuard_records'
// 数据类型：Array<WorkRecord>
[
  {
    id: "2025-01-17",           // 记录ID (YYYY-MM-DD)
    date: "2025-01-17",         // 日期 (YYYY-MM-DD)
    clockIn: "09:00",           // 上班时间 (HH:mm)
    clockOut: "18:00",          // 下班时间 (HH:mm)
    duration: 9,                // 工作时长（小时）
    note: "",                   // 备注信息
    createdAt: "2025-01-17T09:00:00.000Z", // 创建时间
    updatedAt: "2025-01-17T18:00:00.000Z"  // 更新时间
  }
]

// localStorage: 'hoursGuard_config'
// 数据类型：Object
{
  language: 'zh-CN',          // 界面语言
  theme: 'light',             // 主题模式
  autoBackup: true,           // 自动备份
  notifications: false,       // 通知设置
  dateFormat: 'YYYY-MM-DD',   // 日期格式
  timeFormat: '24h',          // 时间格式
  workingDays: [1,2,3,4,5],   // 工作日设置
  version: '2.0.0'            // 配置版本
}

// localStorage: 'hoursGuard_backup'
// 数据类型：Array<BackupRecord>
[
  {
    id: 1705478400000,        // 备份ID（时间戳）
    timestamp: "2025-01-17T10:00:00.000Z", // 备份时间
    records: [...],           // 记录数据备份
    config: {...},            // 配置数据备份
    version: "2.0.0",         // 数据版本
    size: 1024,               // 数据大小（字节）
    checksum: "abc123"        // 数据校验和
  }
]

// localStorage: 'hoursGuard_errorLog'
// 数据类型：Array<ErrorRecord>
[
  {
    id: 1705478400000,        // 错误ID（时间戳）
    timestamp: "2025-01-17T10:00:00.000Z", // 错误时间
    type: "storage_error",    // 错误类型
    message: "存储失败",       // 错误信息
    stack: "...",             // 错误堆栈
    userAgent: "...",         // 浏览器信息
    url: "...",               // 页面URL
    severity: "high"          // 严重程度
  }
]

// IndexedDB: 'hoursGuard_largeData'
// 用于存储大量历史数据和文件缓存
{
  objectStore: 'records',     // 记录存储
  objectStore: 'exports',     // 导出文件缓存
  objectStore: 'backups'      // 大容量备份
}
```

#### 数据操作接口
```javascript
// 数据读取
const records = JSON.parse(localStorage.getItem('hoursGuard_records') || '[]');

// 数据写入
localStorage.setItem('hoursGuard_records', JSON.stringify(records));

// 查找特定日期记录
const todayRecord = records.find(r => r.date === targetDate);

// 筛选月份记录
const monthRecords = records.filter(r => r.date.startsWith(monthPrefix));

// IndexedDB操作
const db = await openDB('hoursGuard_largeData', 1);
const tx = db.transaction('records', 'readwrite');
await tx.objectStore('records').add(record);
```

### 数据验证规则

1. **日期格式**：严格遵循 YYYY-MM-DD 格式
2. **时间格式**：使用 HH:mm 24小时制格式
3. **数据完整性**：允许只有上班时间或只有下班时间的记录
4. **存储限制**：localStorage约5-10MB，IndexedDB可存储更大数据量
5. **数据校验**：使用校验和验证数据完整性

## 用户界面设计

### 响应式设计

#### 断点设置
```css
/* 移动端 */
@media (max-width: 767px) {
  .container { padding: 1rem; }
  .button { font-size: 1rem; }
}

/* 平板端 */
@media (min-width: 768px) and (max-width: 1023px) {
  .container { padding: 2rem; }
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* 桌面端 */
@media (min-width: 1024px) {
  .container { max-width: 1200px; margin: 0 auto; }
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

#### 组件设计
```css
/* 按钮组件 */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
  transform: translateY(-1px);
}

/* 卡片组件 */
.card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

/* 表单组件 */
.form-group {
  margin-bottom: 1rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  font-size: 1rem;
}
```

### 交互设计

#### 动画效果
```css
/* 页面切换动画 */
.page-transition {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.page-enter {
  transform: translateX(100%);
  opacity: 0;
}

.page-enter-active {
  transform: translateX(0);
  opacity: 1;
}

/* 按钮点击反馈 */
.btn:active {
  transform: scale(0.98);
}

/* 加载动画 */
.loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## PWA功能设计

### Service Worker
```javascript
// sw.js
const CACHE_NAME = 'hours-guard-v2.0.0';
const urlsToCache = [
  '/',
  '/css/main.css',
  '/css/desktop.css',
  '/css/mobile.css',
  '/js/app.js',
  '/js/storage.js',
  '/js/error.js',
  '/js/i18n.js',
  '/js/utils.js'
];

// 安装事件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 获取事件
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### Web App Manifest
```json
{
  "name": "Hours Guard",
  "short_name": "工时卫士",
  "description": "隐私优先的工时记录工具",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4CAF50",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/assets/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 错误处理设计

### 错误分类和处理策略

#### 1. 存储错误
```javascript
try {
  localStorage.setItem('hoursGuard_records', JSON.stringify(records));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    this.handleStorageQuotaExceeded();
  } else {
    this.handleGenericStorageError(error);
  }
}
```

#### 2. 网络错误（PWA更新）
```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).catch(() => {
          // 离线时返回缓存的离线页面
          return caches.match('/offline.html');
        });
      })
  );
});
```

#### 3. 用户操作错误
```javascript
// 数据验证错误
function validateTimeInput(time) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    throw new ValidationError('时间格式不正确，请使用HH:mm格式');
  }
}

// 用户友好的错误提示
function showUserError(message, type = 'error') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
```

## 性能优化

### 数据处理优化

1. **虚拟滚动**：大量记录的列表渲染优化
2. **懒加载**：按需加载历史数据
3. **缓存策略**：计算结果缓存，避免重复计算
4. **防抖节流**：用户输入和滚动事件优化

### 渲染优化

1. **CSS优化**：使用CSS变量，减少重绘
2. **JavaScript优化**：避免强制同步布局
3. **图片优化**：使用WebP格式，适当压缩
4. **字体优化**：使用系统字体，减少加载时间

### 存储优化

1. **数据压缩**：JSON数据压缩存储
2. **分片存储**：大数据分片存储到IndexedDB
3. **清理策略**：自动清理过期数据和缓存
4. **备份优化**：增量备份，减少存储空间

## 测试策略

### 单元测试重点

1. **时间计算逻辑**
   - 正常工作时长计算
   - 跨日工作时长计算
   - 月度统计计算
   - 时区处理

2. **数据存储操作**
   - localStorage读写
   - IndexedDB操作
   - 数据验证和恢复
   - 备份和还原

3. **导出功能**
   - JSON格式导出
   - CSV格式导出
   - 图片报告生成
   - 文件下载

### 集成测试场景

1. **完整工作流程**：打卡 → 查看统计 → 编辑记录 → 导出数据
2. **PWA功能测试**：安装 → 离线使用 → 更新缓存
3. **多设备测试**：响应式布局 → 触摸交互 → 性能表现
4. **国际化测试**：语言切换 → 日期格式 → 文本显示

### 性能测试

1. **加载性能**：首屏加载时间 < 2秒
2. **运行性能**：操作响应时间 < 100ms
3. **内存使用**：长时间使用内存稳定
4. **存储性能**：大量数据读写性能

## 部署和监控

### 部署策略

1. **Cloudflare Pages**：全球CDN部署
2. **版本控制**：Git标签管理版本
3. **自动部署**：推送触发自动部署
4. **回滚机制**：快速回滚到稳定版本

### 监控指标

1. **性能监控**：Core Web Vitals指标
2. **错误监控**：JavaScript错误收集
3. **用户行为**：功能使用统计（匿名）
4. **可用性监控**：服务可用性检查