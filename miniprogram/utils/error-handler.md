# 错误处理模块文档

## 概述

错误处理模块提供统一的错误处理、用户提示和基本恢复功能，符合微信小程序官方规范和最佳实践。该模块专注于轻量化实现，提供必要的错误分类、友好提示和简单的日志记录功能。

## 功能特点

- **错误分类**：自动识别和分类常见错误类型
- **用户友好提示**：根据错误类型显示适当的用户提示
- **错误日志**：记录错误信息，便于调试和问题追踪
- **重试机制**：提供简单的异步操作重试功能
- **轻量化设计**：符合微信小程序轻量化原则

## 错误类型

模块支持以下错误类型：

| 错误类型 | 描述 | 用户提示 |
|---------|------|---------|
| STORAGE_ERROR | 存储相关错误 | 数据保存失败，请检查存储空间 |
| NETWORK_ERROR | 网络相关错误 | 网络连接异常，请检查网络设置 |
| VALIDATION_ERROR | 数据验证错误 | 数据格式错误，请检查输入 |
| SYSTEM_ERROR | 系统级错误 | 操作失败，请重试 |

## 使用方法

### 基本错误处理

```javascript
try {
  // 可能出错的代码
} catch (error) {
  errorHandler.handleError(error, '操作上下文');
}
```

### 显示模态框错误

```javascript
try {
  // 可能出错的代码
} catch (error) {
  errorHandler.handleError(error, '操作上下文', { 
    showModal: true,
    showToast: false
  });
}
```

### 静默错误处理

```javascript
try {
  // 可能出错的代码
} catch (error) {
  errorHandler.handleError(error, '操作上下文', { silent: true });
}
```

### 带恢复策略的错误处理

```javascript
try {
  // 可能出错的代码
} catch (error) {
  errorHandler.handleError(error, '操作上下文', { 
    recovery: (errorInfo) => {
      // 执行恢复操作
      console.log('执行恢复策略', errorInfo.type);
    }
  });
}
```

### 带重试的异步操作

```javascript
try {
  const result = await errorHandler.withRetry(async () => {
    // 异步操作
    return await wx.request({
      url: 'example.com/api',
      method: 'GET'
    });
  }, {
    maxRetries: 2,
    context: '网络请求'
  });
  
  // 处理成功结果
  console.log(result);
} catch (error) {
  // 处理最终失败
  console.error('操作失败', error);
}
```

### 获取错误日志

```javascript
const errorLogs = errorHandler.getErrorLogs(10); // 获取最近10条错误日志
console.log(errorLogs);
```

### 清除错误日志

```javascript
errorHandler.clearErrorLogs();
```

## API 参考

### handleError(error, context, options)

处理错误并显示用户友好的提示。

**参数：**
- `error` (Error|string): 错误对象或错误信息
- `context` (string): 错误发生的上下文
- `options` (Object): 处理选项
  - `silent` (boolean): 是否不显示提示，默认为 false
  - `showModal` (boolean): 是否显示模态框，默认为 false
  - `showToast` (boolean): 是否显示轻提示，默认为 true
  - `duration` (number): 轻提示显示时长，默认为 2000ms
  - `recovery` (Function): 错误恢复策略函数

**返回值：**
- (Object): 解析后的错误信息对象

### parseError(error, context)

解析错误信息。

**参数：**
- `error` (Error|string): 错误对象或错误信息
- `context` (string): 错误发生的上下文

**返回值：**
- (Object): 解析后的错误信息对象

### categorizeError(errorInfo)

错误分类和用户消息生成。

**参数：**
- `errorInfo` (Object): 错误信息对象

### showUserFriendlyMessage(errorInfo, options)

显示用户友好的错误提示。

**参数：**
- `errorInfo` (Object): 错误信息对象
- `options` (Object): 显示选项
  - `showModal` (boolean): 是否显示模态框，默认为 false
  - `showToast` (boolean): 是否显示轻提示，默认为 true
  - `duration` (number): 轻提示显示时长，默认为 2000ms

### logError(errorInfo)

记录错误日志。

**参数：**
- `errorInfo` (Object): 错误信息对象

### getErrorLogs(limit)

获取错误日志。

**参数：**
- `limit` (number): 获取数量限制，默认为 10

**返回值：**
- (Array): 错误日志列表

### clearErrorLogs()

清除错误日志。

**返回值：**
- (boolean): 是否成功

### withRetry(asyncFn, options)

带重试机制的异步操作包装器。

**参数：**
- `asyncFn` (Function): 异步函数
- `options` (Object): 选项
  - `maxRetries` (number): 最大重试次数，默认为 2
  - `context` (string): 错误上下文

**返回值：**
- (Promise): 执行结果

## 最佳实践

1. **提供明确的上下文**：在调用 `handleError` 时提供明确的上下文信息，便于定位问题
2. **适当使用重试**：对网络请求等不稳定操作使用 `withRetry` 提高成功率
3. **定期清理日志**：避免日志占用过多存储空间
4. **合理设置提示方式**：根据错误严重程度选择合适的提示方式（Toast 或 Modal）

## 注意事项

1. 错误处理模块设计为轻量级，符合微信小程序的官方规范
2. 日志记录功能仅保存最近的错误信息，不会占用过多存储空间
3. 重试机制使用简单的延迟策略，适用于大多数场景
4. 所有错误日志仅保存在本地，不会上传到服务器

## 与旧版本的区别

新版错误处理模块进行了以下优化：

1. 移除了复杂的系统诊断功能
2. 简化了错误分类和处理逻辑
3. 减少了存储使用和计算复杂度
4. 更符合微信小程序的轻量化设计理念

这些变更使模块更加专注于核心功能，提高了性能和可维护性。