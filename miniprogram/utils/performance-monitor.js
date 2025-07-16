/**
 * 性能监控工具类
 * 提供应用性能监控、内存使用监控和性能优化建议
 */

class PerformanceMonitor {
  constructor() {
    this.performanceData = {
      pageLoadTimes: new Map(),
      apiCallTimes: new Map(),
      memoryUsage: [],
      renderTimes: new Map()
    };
    
    this.maxDataPoints = 100; // 最大数据点数量
    this.warningThresholds = {
      pageLoadTime: 3000, // 页面加载时间警告阈值（毫秒）
      apiCallTime: 5000,  // API调用时间警告阈值（毫秒）
      memoryUsage: 50     // 内存使用率警告阈值（MB）
    };
  }

  /**
   * 开始性能计时
   * @param {string} key 计时键名
   * @returns {number} 开始时间戳
   */
  startTiming(key) {
    const startTime = Date.now();
    this.performanceData[`${key}_start`] = startTime;
    return startTime;
  }

  /**
   * 结束性能计时
   * @param {string} key 计时键名
   * @param {string} category 分类（page/api/render）
   * @returns {number} 耗时（毫秒）
   */
  endTiming(key, category = 'general') {
    const endTime = Date.now();
    const startTime = this.performanceData[`${key}_start`];
    
    if (!startTime) {
      console.warn(`性能监控：未找到 ${key} 的开始时间`);
      return 0;
    }
    
    const duration = endTime - startTime;
    
    // 记录性能数据
    this.recordPerformanceData(key, duration, category);
    
    // 清理开始时间
    delete this.performanceData[`${key}_start`];
    
    // 检查是否超过警告阈值
    this.checkPerformanceWarning(key, duration, category);
    
    return duration;
  }

  /**
   * 记录性能数据
   * @param {string} key 键名
   * @param {number} duration 耗时
   * @param {string} category 分类
   */
  recordPerformanceData(key, duration, category) {
    let dataMap;
    
    switch (category) {
      case 'page':
        dataMap = this.performanceData.pageLoadTimes;
        break;
      case 'api':
        dataMap = this.performanceData.apiCallTimes;
        break;
      case 'render':
        dataMap = this.performanceData.renderTimes;
        break;
      default:
        return;
    }
    
    if (!dataMap.has(key)) {
      dataMap.set(key, []);
    }
    
    const dataArray = dataMap.get(key);
    dataArray.push({
      duration,
      timestamp: Date.now()
    });
    
    // 限制数据点数量
    if (dataArray.length > this.maxDataPoints) {
      dataArray.shift();
    }
  }

  /**
   * 检查性能警告
   * @param {string} key 键名
   * @param {number} duration 耗时
   * @param {string} category 分类
   */
  checkPerformanceWarning(key, duration, category) {
    let threshold;
    
    switch (category) {
      case 'page':
        threshold = this.warningThresholds.pageLoadTime;
        break;
      case 'api':
        threshold = this.warningThresholds.apiCallTime;
        break;
      default:
        return;
    }
    
    if (duration > threshold) {
      console.warn(`性能警告：${key} 耗时 ${duration}ms，超过阈值 ${threshold}ms`);
      
      // 记录性能问题
      this.recordPerformanceIssue(key, duration, category, threshold);
    }
  }

  /**
   * 记录性能问题
   * @param {string} key 键名
   * @param {number} duration 耗时
   * @param {string} category 分类
   * @param {number} threshold 阈值
   */
  recordPerformanceIssue(key, duration, category, threshold) {
    try {
      const issues = wx.getStorageSync('performanceIssues') || [];
      
      issues.push({
        key,
        duration,
        category,
        threshold,
        timestamp: Date.now(),
        severity: duration > threshold * 2 ? 'high' : 'medium'
      });
      
      // 限制问题记录数量
      if (issues.length > 50) {
        issues.splice(0, issues.length - 50);
      }
      
      wx.setStorageSync('performanceIssues', issues);
    } catch (error) {
      console.error('记录性能问题失败:', error);
    }
  }

  /**
   * 监控内存使用情况
   */
  monitorMemoryUsage() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const storageInfo = wx.getStorageInfoSync();
      
      const memoryData = {
        timestamp: Date.now(),
        storageUsed: storageInfo.currentSize,
        storageLimit: storageInfo.limitSize,
        storageUsagePercent: (storageInfo.currentSize / storageInfo.limitSize * 100).toFixed(2),
        platform: systemInfo.platform,
        system: systemInfo.system
      };
      
      this.performanceData.memoryUsage.push(memoryData);
      
      // 限制内存数据点数量
      if (this.performanceData.memoryUsage.length > this.maxDataPoints) {
        this.performanceData.memoryUsage.shift();
      }
      
      // 检查内存使用警告
      if (storageInfo.currentSize > this.warningThresholds.memoryUsage * 1024) {
        console.warn(`内存使用警告：当前使用 ${storageInfo.currentSize}KB，超过阈值 ${this.warningThresholds.memoryUsage}MB`);
      }
      
      return memoryData;
    } catch (error) {
      console.error('监控内存使用失败:', error);
      return null;
    }
  }

  /**
   * 获取性能统计报告
   * @returns {Object} 性能报告
   */
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      pageLoadTimes: this.getAveragePerformance(this.performanceData.pageLoadTimes),
      apiCallTimes: this.getAveragePerformance(this.performanceData.apiCallTimes),
      renderTimes: this.getAveragePerformance(this.performanceData.renderTimes),
      memoryUsage: this.getLatestMemoryUsage(),
      issues: this.getPerformanceIssues(),
      suggestions: this.generateOptimizationSuggestions()
    };
    
    return report;
  }

  /**
   * 获取平均性能数据
   * @param {Map} dataMap 性能数据映射
   * @returns {Object} 平均性能数据
   */
  getAveragePerformance(dataMap) {
    const result = {};
    
    for (const [key, dataArray] of dataMap.entries()) {
      if (dataArray.length > 0) {
        const totalDuration = dataArray.reduce((sum, item) => sum + item.duration, 0);
        const avgDuration = totalDuration / dataArray.length;
        const maxDuration = Math.max(...dataArray.map(item => item.duration));
        const minDuration = Math.min(...dataArray.map(item => item.duration));
        
        result[key] = {
          average: Math.round(avgDuration),
          max: maxDuration,
          min: minDuration,
          count: dataArray.length,
          latest: dataArray[dataArray.length - 1].duration
        };
      }
    }
    
    return result;
  }

  /**
   * 获取最新内存使用情况
   * @returns {Object} 内存使用数据
   */
  getLatestMemoryUsage() {
    if (this.performanceData.memoryUsage.length === 0) {
      return this.monitorMemoryUsage();
    }
    
    return this.performanceData.memoryUsage[this.performanceData.memoryUsage.length - 1];
  }

  /**
   * 获取性能问题列表
   * @returns {Array} 性能问题列表
   */
  getPerformanceIssues() {
    try {
      return wx.getStorageSync('performanceIssues') || [];
    } catch (error) {
      console.error('获取性能问题失败:', error);
      return [];
    }
  }

  /**
   * 生成优化建议
   * @returns {Array} 优化建议列表
   */
  generateOptimizationSuggestions() {
    const suggestions = [];
    const issues = this.getPerformanceIssues();
    const memoryUsage = this.getLatestMemoryUsage();
    
    // 基于性能问题生成建议
    const pageIssues = issues.filter(issue => issue.category === 'page');
    if (pageIssues.length > 0) {
      suggestions.push('页面加载较慢，建议优化页面初始化逻辑和减少同步操作');
    }
    
    const apiIssues = issues.filter(issue => issue.category === 'api');
    if (apiIssues.length > 0) {
      suggestions.push('数据操作耗时较长，建议优化存储操作和添加缓存机制');
    }
    
    // 基于内存使用生成建议
    if (memoryUsage && parseFloat(memoryUsage.storageUsagePercent) > 80) {
      suggestions.push('存储空间使用率较高，建议清理历史数据或优化数据结构');
    }
    
    // 基于性能数据生成建议
    const pagePerf = this.getAveragePerformance(this.performanceData.pageLoadTimes);
    for (const [key, data] of Object.entries(pagePerf)) {
      if (data.average > this.warningThresholds.pageLoadTime) {
        suggestions.push(`${key} 页面平均加载时间较长，建议优化页面逻辑`);
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push('应用性能表现良好，继续保持');
    }
    
    return suggestions;
  }

  /**
   * 清除性能数据
   */
  clearPerformanceData() {
    this.performanceData = {
      pageLoadTimes: new Map(),
      apiCallTimes: new Map(),
      memoryUsage: [],
      renderTimes: new Map()
    };
    
    try {
      wx.removeStorageSync('performanceIssues');
      console.log('性能数据已清除');
    } catch (error) {
      console.error('清除性能数据失败:', error);
    }
  }

  /**
   * 页面性能装饰器
   * @param {string} pageName 页面名称
   * @returns {Function} 装饰器函数
   */
  pagePerformanceDecorator(pageName) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const monitor = getApp().performanceMonitor;
        if (monitor) {
          monitor.startTiming(`${pageName}_${propertyKey}`);
        }
        
        try {
          const result = await originalMethod.apply(this, args);
          
          if (monitor) {
            monitor.endTiming(`${pageName}_${propertyKey}`, 'page');
          }
          
          return result;
        } catch (error) {
          if (monitor) {
            monitor.endTiming(`${pageName}_${propertyKey}`, 'page');
          }
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * 显示性能报告
   */
  showPerformanceReport() {
    const report = this.getPerformanceReport();
    
    let content = '性能监控报告\n\n';
    
    // 内存使用情况
    if (report.memoryUsage) {
      content += `存储使用: ${report.memoryUsage.storageUsagePercent}%\n`;
      content += `(${report.memoryUsage.storageUsed}KB / ${report.memoryUsage.storageLimit}KB)\n\n`;
    }
    
    // 页面性能
    const pageKeys = Object.keys(report.pageLoadTimes);
    if (pageKeys.length > 0) {
      content += '页面加载时间:\n';
      pageKeys.forEach(key => {
        const data = report.pageLoadTimes[key];
        content += `${key}: 平均${data.average}ms\n`;
      });
      content += '\n';
    }
    
    // 优化建议
    if (report.suggestions.length > 0) {
      content += '优化建议:\n';
      report.suggestions.forEach((suggestion, index) => {
        content += `${index + 1}. ${suggestion}\n`;
      });
    }
    
    wx.showModal({
      title: '性能监控',
      content: content,
      showCancel: true,
      confirmText: '确定',
      cancelText: '清除数据',
      success: (res) => {
        if (!res.confirm && res.cancel) {
          this.clearPerformanceData();
        }
      }
    });
  }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;