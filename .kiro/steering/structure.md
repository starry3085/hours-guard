# 项目结构

## 目录组织

### 根目录
- `miniprogram/`: 小程序主目录，包含所有应用代码
- `node_modules/`: Node.js依赖目录（仅用于开发工具）
- `tests/`: 测试相关文件
- 配置文件: `project.config.json`, `package.json`, `tsconfig.json`等

### 小程序目录 (`miniprogram/`)
- `app.js`: 小程序全局入口文件
- `app.json`: 小程序全局配置文件
- `app.wxss`: 小程序全局样式文件
- `pages/`: 小程序页面目录
- `utils/`: 工具类目录
- `images/`: 图片资源目录

### 页面结构 (`miniprogram/pages/`)
- `index/`: 打卡主页
- `stat/`: 统计页面
- `export/`: 导出页面
- `debug/`: 调试页面

每个页面目录包含四个文件:
- `.js`: 页面逻辑
- `.wxml`: 页面结构（类似HTML）
- `.wxss`: 页面样式（类似CSS）
- `.json`: 页面配置

### 工具类 (`miniprogram/utils/`)
- `storage.js`: 存储管理工具
- `error-handler.js`: 错误处理工具
- `performance-monitor.js`: 性能监控工具
- `adaptation.js`: 屏幕适配工具

## 架构模式
项目采用微信小程序标准的MVVM架构:
- Model: 数据存储在本地存储中
- View: WXML和WXSS定义界面
- ViewModel: JS文件处理业务逻辑和数据绑定

## 数据流
1. 用户操作触发事件
2. 事件处理函数更新数据
3. 数据变化通过setData反映到视图
4. 数据持久化到本地存储

## 命名规范
- **文件命名**: 小写字母，单词间用连字符分隔 (例如: `error-handler.js`)
- **变量命名**: 驼峰命名法 (例如: `storageManager`)
- **常量命名**: 全大写，单词间用下划线分隔 (例如: `MAX_RETRY_COUNT`)
- **函数命名**: 动词开头的驼峰命名法 (例如: `handleError()`)

## 代码风格
- 使用2空格缩进
- 使用分号结束语句
- 使用单引号表示字符串
- 使用ES6特性（箭头函数、模板字符串等）
- 注释使用中文，与用户界面语言保持一致