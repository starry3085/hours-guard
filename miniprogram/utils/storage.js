/**
 * 数据存储管理工具类
 * 提供统一的数据存储、验证、备份和恢复功能
 */

class StorageManager {
  constructor() {
    this.storageKeys = {
      records: 'records',
      hasShownWarning: 'hasShownWarning',
      backupData: 'backupData',
      lastBackupTime: 'lastBackupTime',
      storageVersion: 'storageVersion'
    };
    
    this.currentVersion = '1.0.0';
    this.maxRetries = 3;
    this.backupInterval = 24 * 60 * 60 * 1000; // 24小时
  }

  /**
   * 安全读取存储数据
   * @param {string} key 存储键
   * @param {*} defaultValue 默认值
   * @returns {*} 存储的数据或默认值
   */
  safeGetStorage(key, defaultValue = null) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const data = wx.getStorageSync(key);
        
        // 验证数据完整性
        if (key === this.storageKeys.records) {
          return this.validateRecordsData(data) ? data : (defaultValue || []);
        }
        
        return data !== '' ? data : defaultValue;
        
      } catch (error) {
        retries++;
        console.error(`读取存储失败 (尝试 ${retries}/${this.maxRetries}):`, error);
        
        if (retries >= this.maxRetries) {
          // 尝试从备份恢复
          if (key === this.storageKeys.records) {
            return this.tryRestoreFromBackup() || (defaultValue || []);
          }
          return defaultValue;
        }
        
        // 短暂延迟后重试
        this.sleep(100 * retries);
      }
    }
    
    return defaultValue;
  }

  /**
   * 安全写入存储数据
   * @param {string} key 存储键
   * @param {*} data 要存储的数据
   * @returns {boolean} 是否成功
   */
  safeSetStorage(key, data) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        // 数据验证
        if (key === this.storageKeys.records && !this.validateRecordsData(data)) {
          console.error('记录数据验证失败:', data);
          return false;
        }
        
        // 创建备份（仅对重要数据）
        if (key === this.storageKeys.records) {
          this.createBackup(data);
        }
        
        // 写入数据
        wx.setStorageSync(key, data);
        
        // 验证写入是否成功
        const verification = wx.getStorageSync(key);
        if (JSON.stringify(verification) === JSON.stringify(data)) {
          return true;
        } else {
          throw new Error('数据写入验证失败');
        }
        
      } catch (error) {
        retries++;
        console.error(`写入存储失败 (尝试 ${retries}/${this.maxRetries}):`, error);
        
        if (retries >= this.maxRetries) {
          // 显示用户友好的错误提示
          wx.showToast({
            title: '数据保存失败，请重试',
            icon: 'none',
            duration: 2000
          });
          return false;
        }
        
        // 短暂延迟后重试
        this.sleep(100 * retries);
      }
    }
    
    return false;
  }

  /**
   * 验证记录数据格式
   * @param {Array} data 记录数据
   * @returns {boolean} 是否有效
   */
  validateRecordsData(data) {
    if (!Array.isArray(data)) {
      return false;
    }
    
    return data.every(record => {
      // 检查必需字段
      if (!record || typeof record !== 'object' || !record.date) {
        return false;
      }
      
      // 验证日期格式 YYYY-MM-DD
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(record.date)) {
        return false;
      }
      
      // 验证时间格式 HH:MM（如果存在）
      const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (record.on && !timePattern.test(record.on)) {
        return false;
      }
      if (record.off && !timePattern.test(record.off)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 创建数据备份
   * @param {Array} records 记录数据
   */
  createBackup(records) {
    try {
      const now = Date.now();
      const lastBackupTime = this.safeGetStorage(this.storageKeys.lastBackupTime, 0);
      
      // 检查是否需要备份（避免频繁备份）
      if (now - lastBackupTime < this.backupInterval) {
        return;
      }
      
      const backupData = {
        records: records,
        timestamp: now,
        version: this.currentVersion
      };
      
      wx.setStorageSync(this.storageKeys.backupData, backupData);
      wx.setStorageSync(this.storageKeys.lastBackupTime, now);
      
      console.log('数据备份成功:', new Date(now).toLocaleString());
      
    } catch (error) {
      console.error('创建备份失败:', error);
    }
  }

  /**
   * 尝试从备份恢复数据
   * @returns {Array|null} 恢复的记录数据
   */
  tryRestoreFromBackup() {
    try {
      const backupData = wx.getStorageSync(this.storageKeys.backupData);
      
      if (backupData && backupData.records && this.validateRecordsData(backupData.records)) {
        console.log('从备份恢复数据成功:', new Date(backupData.timestamp).toLocaleString());
        
        // 显示恢复提示
        wx.showToast({
          title: '已从备份恢复数据',
          icon: 'success',
          duration: 2000
        });
        
        return backupData.records;
      }
      
    } catch (error) {
      console.error('从备份恢复失败:', error);
    }
    
    return null;
  }

  /**
   * 获取存储使用情况
   * @returns {Object} 存储信息
   */
  getStorageInfo() {
    try {
      const info = wx.getStorageInfoSync();
      const records = this.safeGetStorage(this.storageKeys.records, []);
      
      return {
        totalSize: info.currentSize,
        limitSize: info.limitSize,
        recordCount: records.length,
        usagePercent: ((info.currentSize / info.limitSize) * 100).toFixed(2),
        keys: info.keys
      };
      
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return {
        totalSize: 0,
        limitSize: 10240, // 默认10MB
        recordCount: 0,
        usagePercent: '0',
        keys: []
      };
    }
  }

  /**
   * 清理过期数据
   * @param {number} daysToKeep 保留天数
   * @returns {number} 清理的记录数
   */
  cleanupOldData(daysToKeep = 365) {
    try {
      const records = this.safeGetStorage(this.storageKeys.records, []);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
      
      const filteredRecords = records.filter(record => record.date >= cutoffDateStr);
      const cleanedCount = records.length - filteredRecords.length;
      
      if (cleanedCount > 0) {
        this.safeSetStorage(this.storageKeys.records, filteredRecords);
        console.log(`清理了 ${cleanedCount} 条过期记录`);
      }
      
      return cleanedCount;
      
    } catch (error) {
      console.error('清理数据失败:', error);
      return 0;
    }
  }

  /**
   * 数据压缩优化
   * @returns {boolean} 是否成功
   */
  optimizeStorage() {
    try {
      const records = this.safeGetStorage(this.storageKeys.records, []);
      
      // 去重（基于日期）
      const uniqueRecords = [];
      const dateSet = new Set();
      
      records.forEach(record => {
        if (!dateSet.has(record.date)) {
          dateSet.add(record.date);
          uniqueRecords.push({
            date: record.date,
            on: record.on || undefined,
            off: record.off || undefined
          });
        }
      });
      
      // 按日期排序
      uniqueRecords.sort((a, b) => a.date.localeCompare(b.date));
      
      const optimizedCount = records.length - uniqueRecords.length;
      
      if (optimizedCount > 0 || JSON.stringify(records) !== JSON.stringify(uniqueRecords)) {
        this.safeSetStorage(this.storageKeys.records, uniqueRecords);
        console.log(`存储优化完成，去重 ${optimizedCount} 条记录`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('存储优化失败:', error);
      return false;
    }
  }

  /**
   * 检查存储健康状态
   * @returns {Object} 健康状态报告
   */
  checkStorageHealth() {
    const report = {
      isHealthy: true,
      issues: [],
      suggestions: []
    };
    
    try {
      // 检查存储使用率
      const info = this.getStorageInfo();
      if (parseFloat(info.usagePercent) > 80) {
        report.isHealthy = false;
        report.issues.push('存储使用率过高');
        report.suggestions.push('建议清理历史数据或导出备份');
      }
      
      // 检查数据完整性
      const records = this.safeGetStorage(this.storageKeys.records, []);
      if (!this.validateRecordsData(records)) {
        report.isHealthy = false;
        report.issues.push('数据格式异常');
        report.suggestions.push('建议重新初始化数据');
      }
      
      // 检查备份状态
      const lastBackupTime = this.safeGetStorage(this.storageKeys.lastBackupTime, 0);
      const daysSinceBackup = (Date.now() - lastBackupTime) / (24 * 60 * 60 * 1000);
      if (daysSinceBackup > 7) {
        report.issues.push('备份时间过久');
        report.suggestions.push('建议手动创建备份');
      }
      
    } catch (error) {
      report.isHealthy = false;
      report.issues.push('存储检查异常');
      report.suggestions.push('请重启应用');
      console.error('存储健康检查失败:', error);
    }
    
    return report;
  }

  /**
   * 延迟函数
   * @param {number} ms 毫秒数
   */
  sleep(ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // 忙等待
    }
  }

  /**
   * 手动触发备份
   * @returns {boolean} 是否成功
   */
  manualBackup() {
    try {
      const records = this.safeGetStorage(this.storageKeys.records, []);
      this.createBackup(records);
      
      wx.showToast({
        title: '备份创建成功',
        icon: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('手动备份失败:', error);
      wx.showToast({
        title: '备份失败',
        icon: 'none'
      });
      return false;
    }
  }

  /**
   * 重置所有数据
   * @returns {boolean} 是否成功
   */
  resetAllData() {
    try {
      // 创建最后一次备份
      const records = this.safeGetStorage(this.storageKeys.records, []);
      if (records.length > 0) {
        this.createBackup(records);
      }
      
      // 清除主要数据
      wx.removeStorageSync(this.storageKeys.records);
      wx.removeStorageSync(this.storageKeys.hasShownWarning);
      
      wx.showToast({
        title: '数据重置成功',
        icon: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('数据重置失败:', error);
      wx.showToast({
        title: '重置失败',
        icon: 'none'
      });
      return false;
    }
  }
}

// 创建单例实例
const storageManager = new StorageManager();

module.exports = storageManager;