# Hours Guard Web版部署计划

## 🎯 项目重构与部署目标

**项目名称**: Hours Guard (工时卫士) Web版  
**代码仓库**: Gitee主仓库 + GitHub镜像  
**部署平台**: Cloudflare Pages  
**域名配置**: 
- 主域名: `hours-guard.pages.dev`
- 自定义域名: `hours-guard.lightyearai.info`

## 🏗️ 技术架构调整

### 1. 技术栈（保持MVP极简）
- **前端**: 纯HTML5 + CSS3 + JavaScript (ES6+)
- **构建工具**: 无需构建，纯静态文件
- **部署**: Cloudflare Wrangler CLI
- **版本控制**: Git (Gitee主仓库)

### 2. 项目结构优化
```
hours-guard-web/
├── public/                    # 静态资源目录
│   ├── index.html            # 主页面
│   ├── css/
│   │   ├── main.css          # 主样式
│   │   ├── mobile.css        # 移动端优化
│   │   └── desktop.css       # 桌面端优化
│   ├── js/
│   │   ├── app.js            # 主应用逻辑
│   │   ├── storage.js        # 存储管理
│   │   ├── i18n.js           # 国际化
│   │   ├── export.js         # 导出功能
│   │   └── utils.js          # 工具函数
│   ├── assets/
│   │   ├── icons/            # 图标资源
│   │   └── manifest/         # PWA清单文件
│   ├── manifest.json         # PWA配置
│   ├── sw.js                 # Service Worker
│   ├── _headers              # Cloudflare Headers配置
│   └── _redirects            # Cloudflare重定向配置
├── wrangler.toml             # Cloudflare Wrangler配置
├── .gitignore               # Git忽略文件
├── README.md                # 项目说明
└── LICENSE                  # 开源协议
```

## 📁 代码仓库管理

### 1. Gitee主仓库配置
- **仓库地址**: https://gitee.com/[starry3085]/hours-guard-web
- **主要分支**: main (生产环境)
- **开发分支**: develop
- **功能分支**: feature/*

### 2. GitHub镜像配置
- **镜像仓库**: https://github.com/[starry3085]/hours-guard-web
- **同步方式**: Gitee自动镜像到GitHub
- **更新频率**: 每次push到Gitee时自动同步

### 3. .gitignore配置
```gitignore
# Dependencies
node_modules/
.npm

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Cloudflare
.wrangler/
```

## ☁️ Cloudflare Pages部署配置

### 1. Wrangler配置文件 (wrangler.toml)
```toml
name = "hours-guard"
compatibility_date = "2024-01-01"

[build]
command = ""

[build.upload]
directory = "./public"
format = "service-worker"

[[build.upload.rules]]
globs = ["**/*.js"]
type = "ESModule"

[[build.upload.rules]]
globs = ["**/*.css"]
type = "Style"

[site]
bucket = "./public"

[env.production]
name = "hours-guard"

[env.staging]
name = "hours-guard-staging"
```

### 2. 静态文件Headers配置 (public/_headers)
```
# Security headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self';

# Cache static assets
/static/*
  Cache-Control: public, max-age=31536000, immutable

# Cache CSS and JS
/*.css
  Cache-Control: public, max-age=31536000
/*.js
  Cache-Control: public, max-age=31536000

# Cache images
/assets/*
  Cache-Control: public, max-age=31536000

# HTML files - shorter cache
/*.html
  Cache-Control: public, max-age=3600

# Service worker - no cache
/sw.js
  Cache-Control: no-cache
```

### 3. 重定向配置 (public/_redirects)
```
# SPA路由支持
/*    /index.html   200

# 旧域名重定向（如需要）
# https://old-domain.com/* https://hours-guard.lightyearai.info/:splat 301
```

## 🚀 部署流程

### 1. 本地开发环境设置
```bash
# 安装Wrangler CLI
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 初始化项目
wrangler init hours-guard --site

# 本地开发服务器
wrangler dev
```

### 2. 部署命令
```bash
# 开发环境部署
wrangler publish --env staging

# 生产环境部署
wrangler publish --env production

# 或者使用简写命令
wrangler deploy
```

### 3. 一键部署脚本
创建 `deploy.sh` 文件：
```bash
#!/bin/bash

echo "🚀 开始部署 Hours Guard Web版..."

# 检查是否有未提交的更改
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 有未提交的更改，请先提交代码"
    git status
    exit 1
fi

# 推送到Gitee
echo "📤 推送到Gitee..."
git push origin main

# 等待GitHub镜像同步
echo "⏳ 等待GitHub镜像同步..."
sleep 5

# 部署到Cloudflare Pages
echo "☁️ 部署到Cloudflare Pages..."
wrangler deploy

echo "✅ 部署完成！"
echo "🔗 访问地址: https://hours-guard.lightyearai.info"
```

## 🌐 域名配置

### 1. Cloudflare Pages自定义域名设置
1. 登录Cloudflare Dashboard
2. 选择Pages项目 "hours-guard"
3. 进入"自定义域"设置
4. 添加自定义域名: `hours-guard.lightyearai.info`
5. 配置DNS记录（自动或手动）

### 2. DNS配置示例
```
# CNAME记录
Type: CNAME
Name: hours-guard
Target: hours-guard.pages.dev
TTL: Auto
Proxy: Enabled (橙色云)
```

### 3. SSL/TLS配置
- SSL模式: Full (严格)
- 始终使用HTTPS: 开启
- 自动HTTPS重写: 开启

## 📱 功能实现检查清单

### 核心功能迁移
- [ ] 打卡功能（上班/下班）
- [ ] 历史记录查看
- [ ] 月度统计
- [ ] 数据导出（CSV/图片）
- [ ] 本地数据存储

### 响应式设计
- [ ] 移动端适配（320px+）
- [ ] 平板适配（768px+）
- [ ] 桌面端适配（1024px+）
- [ ] 触摸和鼠标交互

### 国际化
- [ ] 中英文双语支持
- [ ] 浏览器语言自动检测
- [ ] 手动语言切换
- [ ] 日期格式本地化

### PWA功能
- [ ] Service Worker注册
- [ ] 离线访问支持
- [ ] 添加到主屏幕
- [ ] 应用图标和启动画面

## 🔧 开发工具配置

### 1. VS Code配置
创建 `.vscode/settings.json`：
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.html": "html"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

### 2. 浏览器开发工具
- Chrome DevTools: 移动设备模拟
- Lighthouse: PWA和性能审计
- Web Vitals: 性能监控

## 📊 监控和分析

### 1. Cloudflare Analytics
- 访问量统计
- 性能监控
- 错误追踪
- 地理位置分析

### 2. 自定义监控
- 页面加载时间
- 功能使用统计（匿名）
- 错误日志收集

## 🔄 持续集成/部署

### 1. GitHub Actions（可选）
创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: hours-guard
        directory: public
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Gitee Pages备份（可选）
- 作为Cloudflare的备用部署
- 国内访问加速

## 📋 部署验证清单

### 部署后检查
- [ ] 主域名访问正常
- [ ] 自定义域名访问正常
- [ ] HTTPS证书有效
- [ ] 移动端访问正常
- [ ] 桌面端访问正常
- [ ] 离线功能正常
- [ ] 多语言切换正常
- [ ] 数据导出功能正常

### 性能检查
- [ ] 页面加载时间 < 3秒
- [ ] Lighthouse评分 > 90
- [ ] Core Web Vitals通过
- [ ] 缓存策略有效

## 🆘 故障排除指南

### 常见问题
1. **域名解析问题**: 检查DNS配置和TTL
2. **SSL证书问题**: 检查Cloudflare SSL设置
3. **缓存问题**: 清除Cloudflare缓存
4. **构建失败**: 检查wrangler.toml配置

### 调试命令
```bash
# 检查Wrangler配置
wrangler config list

# 查看部署日志
wrangler tail

# 清除缓存
wrangler purge --everything

# 检查DNS
nslookup hours-guard.lightyearai.info
```

## 🎯 下一步行动计划

### 第1阶段：基础框架（1天）
- [ ] 初始化Git仓库并推送到Gitee
- [ ] 配置Cloudflare Pages项目
- [ ] 创建基础HTML结构和样式
- [ ] 配置Wrangler和部署流程

### 第2阶段：核心功能（2天）
- [ ] 实现打卡功能
- [ ] 实现数据存储
- [ ] 实现统计功能
- [ ] 实现导出功能

### 第3阶段：优化和发布（1天）
- [ ] 完成国际化
- [ ] 优化响应式设计
- [ ] 添加PWA功能
- [ ] 全面测试和发布

---

**备注**: 本计划严格遵循MVP原则，使用最简技术栈实现完整功能，确保快速上线和后续可扩展性。