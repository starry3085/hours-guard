# Hours Guard Web - 工作时间记录器

> **注意**: 这是 Hours Guard 的 Web/PWA 版本，已从微信小程序重构为跨平台 Web 应用。

一个简单、高效的PWA工作时间记录应用，支持中英文双语，完全离线运行。

## 🆕 重构亮点

### ✅ 已完成重构目标
- **脱离微信小程序生态** - 完全基于Web技术栈
- **响应式设计** - 适配手机、平板、桌面设备
- **功能完整性** - 保持原有所有功能
- **中英文双语** - 完整国际化支持
- **MVP原则** - 最小可用产品
- **零服务器依赖** - 纯前端应用

### 🎯 新增功能
- **PWA支持** - 可安装为桌面/移动应用
- **键盘快捷键** - 支持Ctrl+I/O/E快捷操作
- **通知系统** - 操作反馈提示
- **深色模式** - 自动适配系统主题
- **更丰富的导出** - 图片和CSV格式
- **更好的性能** - 优化的渲染和数据处理

## 🚀 功能特性

### 核心功能
- ✅ **实时打卡** - 上班/下班一键打卡
- ✅ **工作统计** - 今日工作时长统计
- ✅ **历史记录** - 完整的工作记录历史
- ✅ **月度汇总** - 月度工作天数和时长统计
- ✅ **数据导出** - 支持CSV和图片格式导出

### 技术特性
- ✅ **双语支持** - 中英文界面切换
- ✅ **PWA支持** - 可安装为桌面/移动应用
- ✅ **离线运行** - 无需网络连接
- ✅ **响应式设计** - 适配各种设备尺寸
- ✅ **键盘快捷键** - 支持Ctrl+I/O/E
- ✅ **通知系统** - 操作反馈提示

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **存储**: IndexedDB (本地存储)
- **国际化**: 自定义i18n管理器
- **PWA**: Service Worker + Web App Manifest
- **样式**: CSS Grid + Flexbox + CSS变量
- **导出**: Canvas API + Blob

## 📱 安装使用

### 在线使用
1. 访问部署地址 (待部署)
2. 点击浏览器地址栏的安装按钮
3. 按照提示完成PWA安装

### 本地开发

```bash
# 克隆项目
git clone https://gitee.com/starry3085/hours-guard.git
cd hours-guard

# 启动本地服务器
cd public
npx serve .

# 访问 http://localhost:3000
```

## 🎯 使用方法

### 打卡操作
1. **上班打卡**: 点击"上班打卡"按钮或按 `Ctrl+I`
2. **下班打卡**: 点击"下班打卡"按钮或按 `Ctrl+O`
3. **查看状态**: 实时显示当前工作状态

### 数据查看
- **今日统计**: 显示今日工作详情
- **历史记录**: 展开查看所有打卡记录
- **月度统计**: 显示本月工作汇总

### 数据导出
1. 点击"导出数据"按钮或按 `Ctrl+E`
2. 选择导出格式：
   - **CSV格式**: 用于Excel分析
   - **图片格式**: 用于分享和存档
3. 下载生成的文件

### 语言切换
点击右上角的语言切换按钮进行中英文切换

## ⌨️ 快捷键

| 快捷键 | 功能说明 |
|--------|----------|
| `Ctrl + I` | 上班打卡 |
| `Ctrl + O` | 下班打卡 |
| `Ctrl + E` | 打开导出对话框 |
| `Esc` | 关闭任何对话框 |

## 📁 项目结构

```
hours-guard/
├── public/                    # Web应用目录
│   ├── index.html            # 主页面
│   ├── manifest.json         # PWA配置文件
│   ├── sw.js                # Service Worker
│   ├── css/
│   │   ├── main.css         # 主样式文件
│   │   ├── mobile.css       # 移动端优化
│   │   └── desktop.css      # 桌面端优化
│   ├── js/
│   │   ├── app-complete.js  # 完整应用逻辑
│   │   ├── storage.js       # IndexedDB存储
│   │   ├── i18n.js         # 国际化管理
│   │   ├── export.js       # 导出功能
│   │   └── notification.js # 通知系统
│   └── assets/icons/       # 应用图标
├── WEB_REFACTORING_PLAN.md  # 重构计划文档
├── WEB_DEPLOYMENT_PLAN.md   # 部署计划文档
└── README.md               # 原始小程序文档
```

## 🔧 开发说明

### 添加新语言
编辑 `public/js/i18n.js` 文件，在 `translations` 对象中添加新的语言配置。

### 自定义样式
- 主样式: `public/css/main.css`
- 移动端: `public/css/mobile.css`
- 桌面端: `public/css/desktop.css`

### 数据存储结构
```javascript
{
  id: "timestamp",           // 唯一标识
  date: "YYYY-MM-DD",        // 日期
  clockIn: "ISO timestamp",  // 上班时间
  clockOut: "ISO timestamp", // 下班时间
  duration: "HH:MM",         // 工作时长
  createdAt: "ISO timestamp" // 创建时间
}
```

## 🌐 部署方案

### 推荐部署方案

#### 1. Cloudflare Pages (免费)
1. Fork 项目到 GitHub
2. 登录 [Cloudflare Pages](https://pages.cloudflare.com)
3. 连接 GitHub 仓库
4. 设置：
   - 构建命令: `echo "Static site"`
   - 发布目录: `public`
5. 部署完成

#### 2. GitHub Pages (免费)
1. Fork 项目到 GitHub
2. 进入仓库 Settings > Pages
3. 设置 Source 为 `main` 分支 `/public` 目录
4. 访问 `https://yourusername.github.io/hours-guard`

#### 3. Vercel (免费)
1. 导入 GitHub 项目到 [Vercel](https://vercel.com)
2. 设置 Framework Preset 为 "Other"
3. 设置 Output Directory 为 `public`
4. 部署

#### 4. 国内部署方案
- **阿里云OSS** + CDN
- **腾讯云COS** + CDN
- **七牛云** 静态托管
- **又拍云** 静态托管

## 🔄 从微信小程序迁移说明

### 主要变化
1. **存储方式**: `wx.setStorageSync` → `IndexedDB`
2. **UI框架**: 微信小程序 → 纯HTML/CSS/JS
3. **打包方式**: 小程序包 → 静态Web文件
4. **运行环境**: 微信客户端 → 浏览器
5. **新增功能**: PWA支持、键盘快捷键、通知系统

### 数据兼容性
- 原小程序数据无法直接迁移
- 支持导出CSV格式便于数据迁移
- 新格式更通用，支持跨平台使用

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境要求
- Node.js >= 14
- 现代浏览器 (Chrome, Firefox, Safari, Edge)

### 开发命令
```bash
# 本地开发
cd public && npx serve .

# 代码检查
# 使用现代浏览器开发者工具

# 测试响应式设计
# 使用浏览器设备模拟器
```

## 📞 联系方式

- **项目地址**: [https://gitee.com/starry3085/hours-guard](https://gitee.com/starry3085/hours-guard)
- **问题反馈**: 通过 Gitee Issues
- **邮箱**: meko.h@qq.com

---

**🎉 重构完成！** 从微信小程序成功迁移到跨平台Web应用，支持PWA安装，提供更好的用户体验。