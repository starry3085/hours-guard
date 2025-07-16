# 设计文档

## 概述

上下班打卡工具采用微信小程序原生框架开发，实现纯本地化的打卡记录管理。系统设计遵循简洁、高效、隐私优先的原则，通过本地存储确保用户数据安全，支持多种格式的文件导出功能。界面采用微信官方绿色白色配色和极简扁平设计风格，提供简洁易用的用户体验。

## 架构设计

### 整体架构

```
┌─────────────────────────────────────┐
│           微信小程序容器              │
├─────────────────────────────────────┤
│  UI层 (WXML + WXSS + 微信组件)      │
├─────────────────────────────────────┤
│  业务逻辑层 (JavaScript)             │
├─────────────────────────────────────┤
│  数据存储层 (wx.setStorageSync)      │
├─────────────────────────────────────┤
│  文件系统层 (多格式导出)              │
└─────────────────────────────────────┘
```

### 技术栈选择

| 层级 | 技术方案 | 选择理由 |
|------|----------|----------|
| 框架 | 微信小程序原生框架 | 无额外依赖，包体积最小，性能最优 |
| UI组件 | 微信官方组件 | 官方支持，样式统一，兼容性好 |
| 数据存储 | wx.setStorageSync | 纯本地存储，无网络请求，隐私安全 |
| 文件导出 | wx.getFileSystemManager + Canvas 2D | 支持多格式导出，符合官方规范 |
| 状态管理 | Page级别状态 | 简单场景，无需复杂状态管理 |
| 设计风格 | 微信官方绿色白色配色 + 极简扁平 | 符合微信生态，用户体验一致 |

## 组件和接口设计

### 页面结构

```
/miniprogram
├── app.js                 # 应用入口，首次启动提示
├── app.json              # 应用配置，页面路由，tabBar
├── pages/
│   ├── index/            # 打卡页面
│   │   ├── index.js      # 打卡逻辑，日期选择
│   │   ├── index.wxml    # 打卡界面布局
│   │   └── index.wxss    # 打卡页面样式
│   ├── stat/             # 统计页面
│   │   ├── stat.js       # 统计计算，记录编辑
│   │   ├── stat.wxml     # 统计列表展示
│   │   └── stat.wxss     # 统计页面样式
│   └── export/           # 导出页面
│       ├── export.js     # 多格式文件生成，文件分享
│       ├── export.wxml   # 导出界面布局
│       └── export.wxss   # 导出页面样式
```

### 核心组件设计

#### 1. 应用入口组件 (app.js)
```javascript
// 职责：应用初始化，首次启动风险提示
App({
  onLaunch() {
    // 检查是否首次启动
    // 显示数据本地存储风险提示
  }
})
```

#### 2. 打卡页面组件 (pages/index/)
```javascript
// 职责：打卡操作，日期选择，当日记录显示
Page({
  data: {
    today: '',           // 当前日期
    selectedDate: '',    // 选中日期
    todayRecord: {},     // 当日打卡记录
    currentTime: ''      // 当前时间
  },
  // 方法：setCurrentDate, loadTodayData, checkIn, checkOut, onDateChange
})
```

#### 3. 统计页面组件 (pages/stat/)
```javascript
// 职责：记录列表展示，统计计算，时间编辑
Page({
  data: {
    list: [],            // 打卡记录列表
    currentMonth: '',    // 当前月份
    weekHours: 0,        // 本周工作时长
    avgDailyHours: 0,    // 平均每日工作时长
    showPicker: false    // 时间选择器状态
  },
  // 方法：loadMonthData, onEditTime, updateRecord, getCurrentWeek
})
```

#### 4. 导出页面组件 (pages/export/)
```javascript
// 职责：多格式文件生成，文件分享，月份选择
Page({
  data: {
    selectedDate: '',    // 选中月份
    selectedMonth: '',   // 月份显示文本
    pdfPath: '',         // 文件路径
    isGenerating: false, // 生成状态
    recordCount: 0,      // 记录数量
    totalWorkHours: 0    // 总工作时长
  },
  // 方法：makeReport, generateCSV, generateImage, generateText, shareFile
})
```

## 数据模型设计

### 存储结构

#### 主要数据模型
```javascript
// 存储键：'records'
// 数据类型：Array<AttendanceRecord>
[
  {
    date: "2025-07-16",    // 日期 (YYYY-MM-DD)
    on: "09:30",           // 上班时间 (HH:mm)
    off: "18:45"           // 下班时间 (HH:mm)
  }
]

// 存储键：'hasShownWarning'
// 数据类型：Boolean
// 用途：标记是否已显示首次启动提示
```

#### 数据操作接口
```javascript
// 数据读取
const records = wx.getStorageSync('records') || [];

// 数据写入
wx.setStorageSync('records', records);

// 查找特定日期记录
const todayRecord = records.find(r => r.date === targetDate);

// 筛选月份记录
const monthRecords = records.filter(r => r.date.startsWith(monthPrefix));
```

### 数据验证规则

1. **日期格式**：严格遵循 YYYY-MM-DD 格式
2. **时间格式**：使用 HH:mm 24小时制格式
3. **数据完整性**：允许只有上班时间或只有下班时间的记录
4. **存储限制**：微信小程序本地存储上限10MB，预估可存储数万条记录

## 错误处理设计

### 错误分类和处理策略

#### 1. 数据存储错误
```javascript
try {
  wx.setStorageSync('records', records);
} catch (error) {
  wx.showToast({
    title: '存储失败，请重试',
    icon: 'none'
  });
}
```

#### 2. 文件生成错误
```javascript
// CSV文件生成错误
fs.writeFile({
  filePath: filePath,
  data: csvContent,
  encoding: 'utf8',
  success: () => { /* 成功处理 */ },
  fail: (err) => {
    wx.showToast({
      title: '文件生成失败',
      icon: 'none'
    });
    console.error('文件生成失败:', err);
  }
});

// Canvas图片生成错误
wx.canvasToTempFilePath({
  canvas,
  success: res => { /* 成功处理 */ },
  fail: err => {
    wx.showToast({
      title: '图片生成失败',
      icon: 'none'
    });
    console.error('图片生成错误:', err);
  }
});
```

#### 3. 文件分享错误
```javascript
wx.shareFileMessage({
  filePath: filePath,
  fileName: fileName,
  success: () => { /* 成功提示 */ },
  fail: err => {
    wx.showToast({
      title: '分享失败',
      icon: 'none'
    });
  }
});
```

#### 4. 用户操作错误
- 无数据导出：显示"无打卡数据"提示
- 未生成文件就分享：显示"请先生成文件"提示
- 时间计算异常：使用默认值或跳过计算
- 文件权限错误：引导用户授权或重试

## 测试策略

### 单元测试重点

1. **时间计算逻辑**
   - 正常工作时长计算
   - 跨日工作时长计算
   - 周工作时长统计
   - 平均工作时长计算

2. **数据存储操作**
   - 记录创建和更新
   - 数据读取和筛选
   - 存储异常处理

3. **多格式导出功能**
   - CSV文件生成和编码处理
   - Canvas图片绘制逻辑
   - 文本文件格式化
   - 不同数据量的处理

### 集成测试场景

1. **完整打卡流程**：上班打卡 → 下班打卡 → 查看统计 → 导出文件
2. **数据修改流程**：历史记录编辑 → 统计更新 → 文件重新生成
3. **边界情况测试**：空数据、大量数据、异常时间
4. **多格式导出测试**：CSV、图片、文本三种格式的完整流程

### 真机测试重点

1. **兼容性测试**：iOS和Android设备
2. **性能测试**：大量数据下的响应速度
3. **存储测试**：长期使用的数据积累
4. **文件导出测试**：不同设备的多格式文件生成和分享
5. **UI适配测试**：微信官方绿色白色配色在不同设备的显示效果

## 性能优化

### 数据处理优化

1. **懒加载**：统计页面数据仅在显示时加载
2. **缓存策略**：当月数据缓存，减少重复计算
3. **分页处理**：大量历史数据的分页显示

### 渲染优化

1. **列表渲染**：使用wx:key优化列表更新
2. **Canvas优化**：PDF生成使用离屏Canvas
3. **图片压缩**：适当的Canvas尺寸设置

### 存储优化

1. **数据清理**：提供历史数据清理功能
2. **压缩存储**：移除不必要的数据字段
3. **批量操作**：减少频繁的存储读写