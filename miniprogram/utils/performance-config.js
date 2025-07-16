/**
 * 性能优化配置文件
 * 集中管理所有性能相关的配置和常量
 */

const PerformanceConfig = {
  // 缓存配置
  cache: {
    // 数据缓存超时时间（毫秒）
    dataTimeout: 5 * 60 * 1000, // 5分钟
    // 最大缓存条目数
    maxCacheSize: 100,
    // 工作时长计算缓存大小
    workHoursCacheSize: 100
  },

  // 防抖配置
  debounce: {
    // 存储写入防抖时间（毫秒）
    storageWrite: 300,
    // 搜索输入防抖时间（毫秒）
    searchInput: 500,
    // 页面滚动防抖时间（毫秒）
    pageScroll: 100
  },

  // 性能监控配置
  monitoring: {
    // 性能数据最大保存数量
    maxDataPoints: 100,
    // 内存监控间隔（毫秒）
    memoryMonitorInterval: 5 * 60 * 1000, // 5分钟
    // 性能问题最大记录数
    maxPerformanceIssues: 50,
    // 警告阈值
    thresholds: {
      pageLoadTime: 3000,    // 页面加载时间（毫秒）
      apiCallTime: 5000,     // API调用时间（毫秒）
      memoryUsage: 50,       // 内存使用量（MB）
      storageUsage: 80       // 存储使用率（%）
    }
  },

  // 存储优化配置
  storage: {
    // 最大重试次数
    maxRetries: 3,
    // 重试延迟时间（毫秒）
    retryDelays: [100, 300, 1000],
    // 备份间隔（毫秒）
    backupInterval: 24 * 60 * 60 * 1000, // 24小时
    // 数据清理保留天数
    defaultRetentionDays: 365,
    // 存储健康检查间隔（毫秒）
    healthCheckInterval: 60 * 60 * 1000 // 1小时
  },

  // 代码质量配置
  codeQuality: {
    // 函数复杂度阈值
    thresholds: {
      maxFunctionLength: 50,        // 最大函数行数
      maxParameterCount: 5,         // 最大参数数量
      maxNestingLevel: 4,           // 最大嵌套层级
      maxCyclomaticComplexity: 10   // 最大圈复杂度
    },
    // 代码异味检测配置
    codeSmells: {
      minDuplicateLines: 3,         // 最小重复行数
      minMagicNumberValue: 10,      // 魔法数字最小值
      excludeCommonNumbers: [0, 1, 2, 10, 24, 60, 100, 1000] // 排除的常见数字
    }
  },

  // UI性能配置
  ui: {
    // 列表虚拟化阈值
    virtualListThreshold: 100,
    // 图片懒加载配置
    lazyLoad: {
      threshold: 100,              // 预加载距离（px）
      fadeInDuration: 300          // 淡入动画时长（毫秒）
    },
    // 动画配置
    animation: {
      defaultDuration: 300,        // 默认动画时长（毫秒）
      easing: 'ease-out'          // 默认缓动函数
    }
  },

  // 网络优化配置
  network: {
    // 请求超时时间（毫秒）
    timeout: 10000,
    // 最大并发请求数
    maxConcurrentRequests: 5,
    // 重试配置
    retry: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  },

  // 错误处理配置
  errorHandling: {
    // 最大错误日志数量
    maxErrorLogs: 50,
    // 错误上报配置
    reporting: {
      enabled: false,             // 是否启用错误上报
      batchSize: 10,              // 批量上报大小
      flushInterval: 30000        // 上报间隔（毫秒）
    }
  },

  // 开发模式配置
  development: {
    // 是否启用性能监控
    enablePerformanceMonitoring: true,
    // 是否启用代码质量检查
    enableCodeQualityCheck: true,
    // 是否显示性能警告
    showPerformanceWarnings: true,
    // 调试日志级别
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  },

  // 生产模式配置
  production: {
    // 是否启用性能监控
    enablePerformanceMonitoring: false,
    // 是否启用代码质量检查
    enableCodeQualityCheck: false,
    // 是否显示性能警告
    showPerformanceWarnings: false,
    // 调试日志级别
    logLevel: 'error'
  }
};

/**
 * 获取当前环境配置
 * @returns {Object} 环境配置
 */
function getCurrentConfig() {
  // 在小程序中，可以通过 __wxConfig 或其他方式判断环境
  const isDevelopment = typeof __wxConfig !== 'undefined' && __wxConfig.debug;
  
  return {
    ...PerformanceConfig,
    environment: isDevelopment ? PerformanceConfig.development : PerformanceConfig.production
  };
}

/**
 * 性能优化工具函数
 */
const PerformanceUtils = {
  /**
   * 防抖函数
   * @param {Function} func 要防抖的函数
   * @param {number} delay 延迟时间
   * @returns {Function} 防抖后的函数
   */
  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * 节流函数
   * @param {Function} func 要节流的函数
   * @param {number} limit 时间限制
   * @returns {Function} 节流后的函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 延迟执行
   * @param {number} ms 延迟时间（毫秒）
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 批量处理数据
   * @param {Array} data 数据数组
   * @param {Function} processor 处理函数
   * @param {number} batchSize 批次大小
   * @returns {Promise} 处理结果
   */
  async batchProcess(data, processor, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
      
      // 让出执行权，避免阻塞主线程
      if (i + batchSize < data.length) {
        await this.delay(0);
      }
    }
    
    return results;
  },

  /**
   * 内存友好的数组处理
   * @param {Array} array 数组
   * @param {Function} callback 回调函数
   * @param {number} chunkSize 块大小
   */
  async processArrayInChunks(array, callback, chunkSize = 100) {
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      await callback(chunk, i);
      
      // 让出执行权
      await this.delay(0);
    }
  },

  /**
   * 安全的JSON解析
   * @param {string} jsonString JSON字符串
   * @param {*} defaultValue 默认值
   * @returns {*} 解析结果
   */
  safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('JSON解析失败:', error);
      return defaultValue;
    }
  },

  /**
   * 安全的JSON字符串化
   * @param {*} obj 对象
   * @param {string} defaultValue 默认值
   * @returns {string} JSON字符串
   */
  safeJsonStringify(obj, defaultValue = '{}') {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.warn('JSON字符串化失败:', error);
      return defaultValue;
    }
  },

  /**
   * 深拷贝对象（性能优化版本）
   * @param {*} obj 要拷贝的对象
   * @returns {*} 拷贝结果
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    
    return obj;
  }
};

module.exports = {
  PerformanceConfig,
  getCurrentConfig,
  PerformanceUtils
};