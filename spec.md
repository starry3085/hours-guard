
# 📄 1. 需求

| 条目 | 内容 |
|---|---|
| 产品名 | Hours Guard (工时卫士) |
| 版本 | Web版 2.0.0 |
| 目标用户 | 对隐私极度敏感、不愿数据上云的上班族 |
| 核心场景 | 上班/下班各点一次按钮 → 月末一键导出数据 → 自行保存备份 |
| 功能列表 | ① 上班打卡 ② 下班打卡 ③ 历史记录编辑 ④ 月度统计 ⑤ 多格式导出 ⑥ 智能备份 |
| 非功能 | • 纯本地，无网络请求 • 包体积<500KB • PWA离线支持 • 响应式设计 |

---

# 🏗️ 2. 技术架构

## 2.1 Web应用架构

| 层级 | 技术 | 备注 |
|---|---|---|
| 前端 | HTML5 + CSS3 + ES6+ JavaScript | 现代Web技术栈 |
| UI | 响应式设计 + 现代扁平风格 | 无第三方依赖 |
| 存储 | localStorage + IndexedDB | 本地存储，支持大数据 |
| 导出 | JSON + CSV + 图片 | 多格式支持 |
| PWA | Service Worker + Manifest | 离线支持，可安装 |
| 部署 | Cloudflare Pages | 全球CDN，零成本 |

项目目录结构：
```
/
 ├─ index.html          # 单页面应用
 ├─ css/
 │  ├─ main.css         # 主样式
 │  ├─ desktop.css      # 桌面端样式
 │  └─ mobile.css       # 移动端样式
 ├─ js/
 │  ├─ app.js           # 应用核心
 │  ├─ storage.js       # 存储管理
 │  ├─ error.js         # 错误处理
 │  ├─ i18n.js          # 国际化
 │  └─ utils.js         # 工具函数
 ├─ manifest.json       # PWA配置
 └─ sw.js              # Service Worker
```

---

# 🔧 3. Web应用技术实现（已完成）

## 3.1 数据模型

```js
// localStorage: 'hoursGuard_records'
[
  {
    id: "2025-01-17",
    date: "2025-01-17",
    clockIn: "09:00",
    clockOut: "18:00",
    duration: 9,
    note: "",
    createdAt: "2025-01-17T09:00:00.000Z",
    updatedAt: "2025-01-17T18:00:00.000Z"
  }
]

// 配置存储
localStorage.setItem('hoursGuard_config', JSON.stringify({
  language: 'zh-CN',
  theme: 'light',
  autoBackup: true,
  notifications: false
}));
```

## 3.2 首次访问提醒

```js
// 首次访问显示隐私提醒
if (!localStorage.getItem('hoursGuard_privacyAccepted')) {
  showPrivacyModal();
}

function showPrivacyModal() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>隐私保护提醒</h3>
        <p>所有数据仅保存在您的浏览器本地，不会上传到任何服务器。</p>
        <p>建议定期导出备份文件以防数据丢失。</p>
        <button onclick="acceptPrivacy()">我知道了</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
```

## 3.3 核心功能实现

### 打卡功能
```js
class TimeTracker {
  clockIn() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    
    const records = this.getRecords();
    const existingRecord = records.find(r => r.date === today);
    
    if (existingRecord) {
      existingRecord.clockIn = time;
      existingRecord.updatedAt = now.toISOString();
    } else {
      records.push({
        id: today,
        date: today,
        clockIn: time,
        clockOut: null,
        duration: 0,
        note: '',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    }
    
    this.saveRecords(records);
    this.showNotification('上班打卡成功');
  }
  
  clockOut() {
    // 类似实现，处理下班打卡
  }
}
```

### 数据导出功能
```js
class DataExporter {
  exportToJSON() {
    const data = {
      records: this.getRecords(),
      config: this.getConfig(),
      exportTime: new Date().toISOString(),
      version: '2.0.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    this.downloadFile(blob, `hours-guard-backup-${this.getDateString()}.json`);
  }
  
  exportToCSV() {
    const records = this.getRecords();
    const csv = this.convertToCSV(records);
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadFile(blob, `hours-guard-data-${this.getDateString()}.csv`);
  }
}
```

## 3.4 PWA功能实现

### Service Worker
```js
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
  "icons": [
    {
      "src": "/assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## ✅ 4. 交付状态

### Web应用 (已完成 ✅)

| 功能模块 | 实现状态 | 部署状态 |
|---|---|---|
| 核心打卡功能 | ✅ 完成 | ✅ 在线 |
| 历史记录管理 | ✅ 完成 | ✅ 在线 |
| 月度统计分析 | ✅ 完成 | ✅ 在线 |
| 多格式导出 | ✅ 完成 | ✅ 在线 |
| 智能备份系统 | ✅ 完成 | ✅ 在线 |
| 错误处理系统 | ✅ 完成 | ✅ 在线 |
| PWA离线功能 | ✅ 完成 | ✅ 在线 |
| 响应式设计 | ✅ 完成 | ✅ 在线 |
| 国际化支持 | ✅ 完成 | ✅ 在线 |

**访问地址**: https://hours-guard.lightyearai.info

### 性能指标

| 指标 | 目标值 | 实际值 | 状态 |
|---|---|---|---|
| Lighthouse评分 | >90 | 95+ | ✅ |
| 首屏加载时间 | <3s | <2s | ✅ |
| 包体积 | <500KB | <400KB | ✅ |
| PWA评分 | 100 | 100 | ✅ |
| 离线功能 | 完整支持 | 完整支持 | ✅ |

---

### 🎯 项目总结

> **Hours Guard Web版**: 现代化工时记录工具，PWA支持，全球CDN部署，100%功能完整性  
> 
> 核心原则：0后端、0费用、纯本地存储、隐私优先的设计理念