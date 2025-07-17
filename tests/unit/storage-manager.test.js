/**
 * 存储管理器单元测试
 */

const { describe, it, beforeEach, afterEach, expect, mock } = require('./test-framework');

// 模拟微信API
global.wx = {
  getStorageSync: mock(),
  setStorageSync: mock(),
  removeStorageSync: mock(),
  getStorageInfoSync: mock(() => ({
    currentSize: 100,
    limitSize: 10240,
    keys: ['records', 'hasShownWarning']
  })),
  showToast: mock()
};

// 导入存储管理器
const StorageManager = require('../../miniprogram/utils/storage');

describe('存储管理器测试', () => {
  let storageManager;
  
  beforeEach(() => {
    // 重置模拟函数
    wx.getStorageSync.calls = [];
    wx.setStorageSync.calls = [];
    wx.removeStorageSync.calls = [];
    wx.showToast.calls = [];
    
    // 创建新的存储管理器实例
    storageManager = new (require('../../miniprogram/utils/storage').constructor)();
  });

  describe('数据读取', () => {
    it('应该能够安全读取存储数据', () => {
      // 模拟返回数据
      wx.getStorageSync.mockReturnValue([
        { date: '2024-01-01', on: '09:00', off: '18:00' }
      ]);
      
      const result = storageManager.safeGetStorage('records', []);
      
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-01');
      expect(wx.getStorageSync.calls).toHaveLength(1);
    });

    it('应该在读取失败时返回默认值', () => {
      // 模拟抛出异常
      wx.getStorageSync = mock(() => {
        throw new Error('存储读取失败');
      });
      
      const result = storageManager.safeGetStorage('records', []);
      
      expect(result).toEqual([]);
    });

    it('应该验证记录数据格式', () => {
      const validData = [
        { date: '2024-01-01', on: '09:00', off: '18:00' }
      ];
      
      const invalidData = [
        { date: 'invalid-date', on: '09:00', off: '18:00' }
      ];
      
      expect(storageManager.validateRecordsData(validData)).toBeTruthy();
      expect(storageManager.validateRecordsData(invalidData)).toBeFalsy();
    });
  });

  describe('数据写入', () => {
    it('应该能够安全写入存储数据', async () => {
      const testData = [
        { date: '2024-01-01', on: '09:00', off: '18:00' }
      ];
      
      // 模拟写入成功
      wx.setStorageSync.mockReturnValue(undefined);
      wx.getStorageSync.mockReturnValue(testData);
      
      const result = await storageManager.safeSetStorage('records', testData);
      
      expect(result).toBeTruthy();
      expect(wx.setStorageSync.calls).toHaveLength(1);
    });

    it('应该在数据验证失败时拒绝写入', async () => {
      const invalidData = [
        { date: 'invalid-date', on: '09:00', off: '18:00' }
      ];
      
      const result = await storageManager.safeSetStorage('records', invalidData);
      
      expect(result).toBeFalsy();
      expect(wx.setStorageSync.calls).toHaveLength(0);
    });
  });

  describe('数据验证', () => {
    it('应该验证有效的记录数据', () => {
      const validData = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-02', on: '08:30' },
        { date: '2024-01-03', off: '17:30' }
      ];
      
      expect(storageManager.validateRecordsData(validData)).toBeTruthy();
    });

    it('应该拒绝无效的记录数据', () => {
      const invalidData = [
        { date: '2024-13-01', on: '09:00', off: '18:00' }, // 无效月份
        { date: '2024-01-01', on: '25:00', off: '18:00' }, // 无效时间
        { on: '09:00', off: '18:00' }, // 缺少日期
        null // 空值
      ];
      
      invalidData.forEach(data => {
        expect(storageManager.validateRecordsData([data])).toBeFalsy();
      });
    });

    it('应该验证日期格式', () => {
      const validDates = ['2024-01-01', '2024-12-31', '2023-02-28'];
      const invalidDates = ['2024-1-1', '24-01-01', '2024/01/01', 'invalid'];
      
      validDates.forEach(date => {
        expect(storageManager.datePattern.test(date)).toBeTruthy();
      });
      
      invalidDates.forEach(date => {
        expect(storageManager.datePattern.test(date)).toBeFalsy();
      });
    });

    it('应该验证时间格式', () => {
      const validTimes = ['09:00', '18:30', '00:00', '23:59'];
      const invalidTimes = ['9:00', '25:00', '12:60', 'invalid'];
      
      validTimes.forEach(time => {
        expect(storageManager.timePattern.test(time)).toBeTruthy();
      });
      
      invalidTimes.forEach(time => {
        expect(storageManager.timePattern.test(time)).toBeFalsy();
      });
    });
  });

  describe('数据优化', () => {
    it('应该能够去重记录', () => {
      const duplicateData = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-01', on: '09:30', off: '18:30' }, // 重复日期
        { date: '2024-01-02', on: '09:00', off: '18:00' }
      ];
      
      wx.getStorageSync.mockReturnValue(duplicateData);
      wx.setStorageSync.mockReturnValue(undefined);
      
      const result = storageManager.optimizeStorage();
      
      expect(result).toBeTruthy();
      expect(wx.setStorageSync.calls).toHaveLength(1);
    });

    it('应该能够清理过期数据', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400天前
      const oldDateStr = oldDate.toISOString().slice(0, 10);
      
      const mixedData = [
        { date: oldDateStr, on: '09:00', off: '18:00' }, // 过期数据
        { date: '2024-01-01', on: '09:00', off: '18:00' }  // 新数据
      ];
      
      wx.getStorageSync.mockReturnValue(mixedData);
      wx.setStorageSync.mockReturnValue(undefined);
      
      const cleanedCount = storageManager.cleanupOldData(365);
      
      expect(cleanedCount).toBe(1);
    });
  });

  describe('存储健康检查', () => {
    it('应该检测存储使用率过高', () => {
      wx.getStorageInfoSync.mockReturnValue({
        currentSize: 9000, // 高使用率
        limitSize: 10240,
        keys: ['records']
      });
      
      wx.getStorageSync.mockReturnValue([]);
      
      const report = storageManager.checkStorageHealth();
      
      expect(report.isHealthy).toBeFalsy();
      expect(report.issues).toContain('存储使用率过高');
    });

    it('应该检测数据格式异常', () => {
      wx.getStorageInfoSync.mockReturnValue({
        currentSize: 100,
        limitSize: 10240,
        keys: ['records']
      });
      
      // 模拟无效数据
      wx.getStorageSync.mockReturnValue([
        { date: 'invalid-date', on: '09:00' }
      ]);
      
      const report = storageManager.checkStorageHealth();
      
      expect(report.isHealthy).toBeFalsy();
      expect(report.issues).toContain('数据格式异常');
    });
  });

  describe('备份和恢复', () => {
    it('应该创建数据备份', () => {
      const testData = [
        { date: '2024-01-01', on: '09:00', off: '18:00' }
      ];
      
      wx.setStorageSync.mockReturnValue(undefined);
      
      storageManager.createBackup(testData);
      
      // 验证备份调用
      const backupCalls = wx.setStorageSync.calls.filter(call => 
        call[0] === 'backupData'
      );
      expect(backupCalls).toHaveLength(1);
    });

    it('应该能够从备份恢复数据', () => {
      const backupData = {
        records: [{ date: '2024-01-01', on: '09:00', off: '18:00' }],
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      wx.getStorageSync.mockReturnValue(backupData);
      wx.showToast.mockReturnValue(undefined);
      
      const restored = storageManager.tryRestoreFromBackup();
      
      expect(restored).toEqual(backupData.records);
      expect(wx.showToast.calls).toHaveLength(1);
    });
  });
});