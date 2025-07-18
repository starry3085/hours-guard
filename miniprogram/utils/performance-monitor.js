/**
 * 简化版性能监控工具类
 * 提供基础的页面加载时间和API调用时间监控
 */

class PerformanceMonitor {
  constructor() {
    this.performanceData = {
      pageLoadTimes: {},
      apiCallTimes: {}
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
   * @param {string} category 分类（page/api）
   * @returns {number} 耗时（毫秒）
   */
  endTiming(key, category = 'general') {
    const endTime = Date.now();
    const startTime = this.performanceData[`${key}_start`];
    
    if (!startTime) {
      return 0;
    }
    
    const duration = endTime - startTime;
    
    // 记录性能数据
    if (category === 'page') {
      this.performanceData.pageLoadTimes[key] = duration;
    } else if (category === 'api') {
      this.performanceData.apiCallTimes[key] = duration;
    }
    
    // 清理开始时间
    delete this.performanceData[`${key}_start`];
    
    return duration;
  }

  /**
   * 获取性能统计报告
   * @returns {Object} 性能报告
   */
  getPerformanceReport() {
    return {
      timestamp: Date.now(),
      pageLoadTimes: this.performanceData.pageLoadTimes,
      apiCallTimes: this.performanceData.apiCallTimes
    };
  }

  /**
   * 清除性能数据
   */
  clearPerformanceData() {
    this.performanceData = {
      pageLoadTimes: {},
      apiCallTimes: {}
    };
    
    wx.showToast({
      title: '性能数据已清除',
      icon: 'success',
      duration: 2000
    });
  }

  /**
   * 显示性能报告
   */
  showPerformanceReport() {
    const report = this.getPerformanceReport();
    
    let content = '性能监控报告\n\n';
    
    // 页面性能
    const pageKeys = Object.keys(report.pageLoadTimes);
    if (pageKeys.length > 0) {
      content += '页面加载时间:\n';
      pageKeys.forEach(key => {
        content += `${key}: ${report.pageLoadTimes[key]}ms\n`;
      });
      content += '\n';
    }
    
    // API调用性能
    const apiKeys = Object.keys(report.apiCallTimes);
    if (apiKeys.length > 0) {
      content += 'API调用时间:\n';
      apiKeys.forEach(key => {
        content += `${key}: ${report.apiCallTimes[key]}ms\n`;
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
  
  /**
   * 监控内存使用情况
   * 在支持的平台上获取内存使用信息
   * @returns {Object|null} 内存使用信息或null
   */
  monitorMemoryUsage() {
    try {
      // 检查是否支持获取性能信息
      if (wx.getPerformance) {
        const performance = wx.getPerformance();
        const memory = performance.memory;
        
        if (memory) {
          const memoryInfo = {
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            totalJSHeapSize: memory.totalJSHeapSize,
            usedJSHeapSize: memory.usedJSHeapSize,
            timestamp: Date.now()
          };
          
          // 记录内存使用超过阈值的情况
          const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
          if (usageRatio > 0.7) {
            console.warn('内存使用率过高:', (usageRatio * 100).toFixed(2) + '%');
          }
          
          return memoryInfo;
        }
      }
      
      return null;
    } catch (error) {
      console.error('监控内存使用失败:', error);
      return null;
    }
  }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;