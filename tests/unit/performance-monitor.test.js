/**
 * 性能监控器单元测试
 */

const { describe, it, beforeEach, afterEach, expect, mock } = require('./test-framework');

// 模拟微信API
global.wx = {
  getSystemInfoSync: mock(() => ({
    platform: 'devtools',
    system: 'Windows 10',
    pixelRatio: 2
  })),
  getStorageInfoSync: mock(() => ({
    currentSize: 100,
    limitSize: 10240
  })),
  getStorageSync: mock(() => []),
  setStorageSync: mock(),
  removeStorageSync: mock(),
  showModal: mock()
};

// 导入性能监控器
const PerformanceMonitor = require('../../miniprogram/utils/performance-monitor');

describe('性能监控器测试', () => {
  let performanceMonitor;
  
  beforeEach(() => {
    // 重置模拟函数
    Object.keys(wx).forEach(key => {
      if (wx[key].calls) {
        wx[key].calls = [];
      }
    });
    
    // 创建新的性能监控器实例
    performanceMonitor = new (require('../../miniprogram/utils/performance-monitor').constructor)();
  });

  describe('性能计时', () => {
    it('应该能够开始和结束计时', () => {
      const startTime = performanceMonitor.startTiming('test_operation');
      
      expect(startTime).toBeGreaterThan(0);
      expect(performanceMonitor.performanceData['test_operation_start']).toBeDefined();
      
      // 模拟一些延迟
      const endTime = Date.now() + 100;
      jest.spyOn(Date, 'now').mockReturnValue(endTime);
      
      const duration = performanceMonitor.endTiming('test_operation', 'page');
      
      expect(duration).toBeGreaterThan(0);
      expect(performanceMonitor.performanceData['test_operation_start']).toBeUndefined();
    });

    it('应该处理未找到开始时间的情况', () => {
      const duration = performanceMonitor.endTiming('nonexistent_operation', 'page');
      
      expect(duration).toBe(0);
    });

    it('应该记录性能数据', () => {
      performanceMonitor.recordPerformanceData('test_page', 1000, 'page');
      
      const pageData = performanceMonitor.performanceData.pageLoadTimes.get('test_page');
      expect(pageData).toHaveLength(1);
      expect(pageData[0].duration).toBe(1000);
    });

    it('应该限制数据点数量', () => {
      // 添加超过最大数量的数据点
      for (let i = 0; i < 150; i++) {
        performanceMonitor.recordPerformanceData('test_page', i, 'page');
      }
      
      const pageData = performanceMonitor.performanceData.pageLoadTimes.get('test_page');
      expect(pageData.length).toBeLessThanOrEqual(performanceMonitor.maxDataPoints);
    });
  });

  describe('性能警告', () => {
    it('应该检测页面加载时间过长', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.checkPerformanceWarning('slow_page', 5000, 'page');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('性能警告：slow_page 耗时 5000ms')
      );
      
      consoleSpy.mockRestore();
    });

    it('应该记录性能问题', () => {
      wx.setStorageSync.mockReturnValue(undefined);
      
      performanceMonitor.recordPerformanceIssue('slow_operation', 4000, 'api', 3000);
      
      const storageCalls = wx.setStorageSync.calls.filter(call => 
        call[0] === 'performanceIssues'
      );
      expect(storageCalls).toHaveLength(1);
    });
  });

  describe('内存监控', () => {
    it('应该监控内存使用情况', () => {
      const memoryData = performanceMonitor.monitorMemoryUsage();
      
      expect(memoryData).toBeDefined();
      expect(memoryData.storageUsed).toBe(100);
      expect(memoryData.storageLimit).toBe(10240);
      expect(memoryData.storageUsagePercent).toBeDefined();
      expect(performanceMonitor.performanceData.memoryUsage).toHaveLength(1);
    });

    it('应该检测内存使用警告', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      wx.getStorageInfoSync.mockReturnValue({
        currentSize: 60 * 1024, // 60MB，超过阈值
        limitSize: 100 * 1024
      });
      
      performanceMonitor.monitorMemoryUsage();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('内存使用警告')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('性能报告', () => {
    it('应该生成性能报告', () => {
      // 添加一些测试数据
      performanceMonitor.recordPerformanceData('test_page', 1000, 'page');
      performanceMonitor.recordPerformanceData('test_page', 1500, 'page');
      performanceMonitor.recordPerformanceData('test_api', 2000, 'api');
      
      const report = performanceMonitor.getPerformanceReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.pageLoadTimes).toBeDefined();
      expect(report.apiCallTimes).toBeDefined();
      expect(report.memoryUsage).toBeDefined();
      expect(report.suggestions).toBeDefined();
    });

    it('应该计算平均性能数据', () => {
      const testData = new Map();
      testData.set('test_operation', [
        { duration: 1000, timestamp: Date.now() },
        { duration: 2000, timestamp: Date.now() },
        { duration: 1500, timestamp: Date.now() }
      ]);
      
      const avgData = performanceMonitor.getAveragePerformance(testData);
      
      expect(avgData.test_operation.average).toBe(1500);
      expect(avgData.test_operation.max).toBe(2000);
      expect(avgData.test_operation.min).toBe(1000);
      expect(avgData.test_operation.count).toBe(3);
    });

    it('应该生成优化建议', () => {
      // 模拟性能问题
      wx.getStorageSync.mockReturnValue([
        { category: 'page', severity: 'high' },
        { category: 'api', severity: 'medium' }
      ]);
      
      // 模拟高内存使用
      wx.getStorageInfoSync.mockReturnValue({
        currentSize: 9000,
        limitSize: 10240
      });
      
      const suggestions = performanceMonitor.generateOptimizationSuggestions();
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('页面加载'))).toBeTruthy();
      expect(suggestions.some(s => s.includes('存储空间'))).toBeTruthy();
    });
  });

  describe('数据清理', () => {
    it('应该清除性能数据', () => {
      // 添加一些数据
      performanceMonitor.recordPerformanceData('test', 1000, 'page');
      performanceMonitor.monitorMemoryUsage();
      
      wx.removeStorageSync.mockReturnValue(undefined);
      
      performanceMonitor.clearPerformanceData();
      
      expect(performanceMonitor.performanceData.pageLoadTimes.size).toBe(0);
      expect(performanceMonitor.performanceData.memoryUsage).toHaveLength(0);
      expect(wx.removeStorageSync.calls).toHaveLength(1);
    });
  });

  describe('性能报告显示', () => {
    it('应该显示性能报告', () => {
      wx.showModal.mockReturnValue(undefined);
      
      performanceMonitor.showPerformanceReport();
      
      expect(wx.showModal.calls).toHaveLength(1);
      
      const modalCall = wx.showModal.calls[0][0];
      expect(modalCall.title).toBe('性能监控');
      expect(modalCall.content).toContain('性能监控报告');
    });
  });
});