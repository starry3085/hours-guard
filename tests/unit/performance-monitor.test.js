/**
 * 简化版性能监控器单元测试
 */

const { describe, it, beforeEach, afterEach, expect, mock } = require('./test-framework');

// 模拟微信API
global.wx = {
  showToast: mock(),
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
      expect(performanceMonitor.performanceData.pageLoadTimes['test_operation']).toBeDefined();
    });

    it('应该处理未找到开始时间的情况', () => {
      const duration = performanceMonitor.endTiming('nonexistent_operation', 'page');
      
      expect(duration).toBe(0);
    });
  });

  describe('性能报告', () => {
    it('应该生成性能报告', () => {
      // 添加一些测试数据
      performanceMonitor.startTiming('test_page');
      performanceMonitor.endTiming('test_page', 'page');
      
      performanceMonitor.startTiming('test_api');
      performanceMonitor.endTiming('test_api', 'api');
      
      const report = performanceMonitor.getPerformanceReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.pageLoadTimes).toBeDefined();
      expect(report.apiCallTimes).toBeDefined();
      expect(report.pageLoadTimes.test_page).toBeDefined();
      expect(report.apiCallTimes.test_api).toBeDefined();
    });
  });

  describe('数据清理', () => {
    it('应该清除性能数据', () => {
      // 添加一些数据
      performanceMonitor.startTiming('test_page');
      performanceMonitor.endTiming('test_page', 'page');
      
      performanceMonitor.clearPerformanceData();
      
      expect(Object.keys(performanceMonitor.performanceData.pageLoadTimes).length).toBe(0);
      expect(Object.keys(performanceMonitor.performanceData.apiCallTimes).length).toBe(0);
      expect(wx.showToast.calls).toHaveLength(1);
    });
  });

  describe('性能报告显示', () => {
    it('应该显示性能报告', () => {
      // 添加一些测试数据
      performanceMonitor.startTiming('test_page');
      performanceMonitor.endTiming('test_page', 'page');
      
      wx.showModal.mockReturnValue(undefined);
      
      performanceMonitor.showPerformanceReport();
      
      expect(wx.showModal.calls).toHaveLength(1);
      
      const modalCall = wx.showModal.calls[0][0];
      expect(modalCall.title).toBe('性能监控');
      expect(modalCall.content).toContain('性能监控报告');
    });
  });
});