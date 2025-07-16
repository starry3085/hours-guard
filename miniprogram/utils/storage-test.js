/**
 * 存储管理器测试工具
 * 用于验证存储功能的正确性
 */

const storageManager = require('./storage');

class StorageTest {
  constructor() {
    this.testResults = [];
  }

  // 运行所有测试
  runAllTests() {
    console.log('开始存储管理器测试...');
    
    this.testDataValidation();
    this.testSafeStorage();
    this.testBackupRestore();
    this.testStorageOptimization();
    this.testHealthCheck();
    
    this.printResults();
    return this.testResults;
  }

  // 测试数据验证
  testDataValidation() {
    console.log('测试数据验证功能...');
    
    // 测试有效数据
    const validData = [
      { date: '2025-07-16', on: '09:00', off: '18:00' },
      { date: '2025-07-17', on: '09:30' }
    ];
    
    const isValid = storageManager.validateRecordsData(validData);
    this.addResult('数据验证 - 有效数据', isValid, true);
    
    // 测试无效数据
    const invalidData = [
      { date: 'invalid-date', on: '09:00' },
      { on: '09:00' } // 缺少日期
    ];
    
    const isInvalid = storageManager.validateRecordsData(invalidData);
    this.addResult('数据验证 - 无效数据', isInvalid, false);
  }

  // 测试安全存储
  testSafeStorage() {
    console.log('测试安全存储功能...');
    
    const testKey = 'test_storage_key';
    const testData = { test: 'data', timestamp: Date.now() };
    
    // 测试写入
    const writeSuccess = storageManager.safeSetStorage(testKey, testData);
    this.addResult('安全存储 - 写入', writeSuccess, true);
    
    // 测试读取
    const readData = storageManager.safeGetStorage(testKey, null);
    const readSuccess = JSON.stringify(readData) === JSON.stringify(testData);
    this.addResult('安全存储 - 读取', readSuccess, true);
    
    // 清理测试数据
    try {
      wx.removeStorageSync(testKey);
    } catch (error) {
      console.warn('清理测试数据失败:', error);
    }
  }

  // 测试备份恢复
  testBackupRestore() {
    console.log('测试备份恢复功能...');
    
    const testRecords = [
      { date: '2025-07-16', on: '09:00', off: '18:00' },
      { date: '2025-07-17', on: '09:30', off: '18:30' }
    ];
    
    // 创建备份
    storageManager.createBackup(testRecords);
    
    // 检查备份是否存在
    const backupData = storageManager.safeGetStorage('backupData', null);
    const backupExists = backupData && backupData.records && backupData.records.length === 2;
    this.addResult('备份功能 - 创建备份', backupExists, true);
    
    // 测试从备份恢复
    const restoredData = storageManager.tryRestoreFromBackup();
    const restoreSuccess = restoredData && restoredData.length === 2;
    this.addResult('备份功能 - 恢复数据', restoreSuccess, true);
  }

  // 测试存储优化
  testStorageOptimization() {
    console.log('测试存储优化功能...');
    
    // 创建包含重复数据的测试记录
    const duplicateRecords = [
      { date: '2025-07-16', on: '09:00', off: '18:00' },
      { date: '2025-07-16', on: '09:30', off: '18:30' }, // 重复日期
      { date: '2025-07-17', on: '09:00', off: '18:00' }
    ];
    
    // 保存测试数据
    storageManager.safeSetStorage('records', duplicateRecords);
    
    // 执行优化
    const optimized = storageManager.optimizeStorage();
    
    // 检查优化结果
    const optimizedRecords = storageManager.safeGetStorage('records', []);
    const optimizationSuccess = optimizedRecords.length < duplicateRecords.length;
    
    this.addResult('存储优化 - 去重功能', optimizationSuccess, true);
    
    // 恢复原始数据（如果存在）
    const originalRecords = storageManager.safeGetStorage('records', []);
    if (originalRecords.length === 0) {
      storageManager.safeSetStorage('records', []);
    }
  }

  // 测试健康检查
  testHealthCheck() {
    console.log('测试健康检查功能...');
    
    const healthReport = storageManager.checkStorageHealth();
    
    // 检查报告结构
    const hasRequiredFields = healthReport.hasOwnProperty('isHealthy') &&
                             healthReport.hasOwnProperty('issues') &&
                             healthReport.hasOwnProperty('suggestions');
    
    this.addResult('健康检查 - 报告结构', hasRequiredFields, true);
    
    // 检查数组类型
    const hasArrays = Array.isArray(healthReport.issues) &&
                     Array.isArray(healthReport.suggestions);
    
    this.addResult('健康检查 - 数据类型', hasArrays, true);
  }

  // 添加测试结果
  addResult(testName, actual, expected) {
    const passed = actual === expected;
    this.testResults.push({
      name: testName,
      passed: passed,
      actual: actual,
      expected: expected
    });
    
    console.log(`${passed ? '✓' : '✗'} ${testName}: ${passed ? '通过' : '失败'}`);
  }

  // 打印测试结果
  printResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n=== 测试结果汇总 ===');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${failedTests}`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n失败的测试:');
      this.testResults.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.name}: 期望 ${result.expected}, 实际 ${result.actual}`);
      });
    }
  }

  // 获取测试统计
  getTestStats() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0
    };
  }
}

// 导出测试类
module.exports = StorageTest;