# 打卡黑匣子 Lite

纯本地、无网络请求的上下班打卡工具小程序，专为对隐私极度敏感的用户设计。

## 功能特点

- 上班/下班打卡
- 本月工时统计
- 导出PDF报表
- 纯本地存储，无网络请求
- 包体小于1MB

## 自动化测试

本项目使用Vitest + miniprogram-automator + Gitee Go进行自动化测试。

### 测试目标

| 场景 | 断言 |
|---|---|
| 上班打卡 | Storage 新增/更新 on |
| 下班打卡 | Storage 新增/更新 off |
| 统计页 | 页面文本含「09:31」 |
| 导出 PDF | 本地临时文件非空 |
| 数据清除 | 空态文案出现 |

### 测试目录结构

```
/tests
   ├─ vitest.config.ts
   ├─ setup.ts
   ├─ e2e
   │   ├─ index.spec.ts   # 打卡功能测试
   │   ├─ stat.spec.ts    # 统计功能测试
   │   └─ export.spec.ts  # 导出功能测试
   └─ unit
       └─ storage.spec.ts # 本地存储测试
```

### 运行测试

```bash
# 安装依赖
npm install

# 终端运行测试
npm run test

# 浏览器查看测试结果
npm run test:ui
```

### CI/CD

项目使用Gitee Go自动化流水线，每次提交代码或PR时自动运行测试。 