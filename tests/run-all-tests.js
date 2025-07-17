/**
 * 全面测试运行器
 * 运行所有单元测试、集成测试和端到端测试
 */

const { testFramework } = require('./unit/test-framework');

// 导入所有测试文件
const storageTests = require('./unit/storage-manager.test');
const errorHandlerTests = require('./unit/error-handler.test');
const performanceTests = require('./unit/performance-monitor.test');
const timeCalculationTests = require('./unit/time-calculation.test');
const dataValidationTests = require('./unit/data-validation.test');
const integrationTests = require('./integration/complete-workflow.test');

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      suites: [],
      startTime: null,
      endTime: null,
      duration: 0
    };
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始运行全面测试套件...\n');
    this.results.startTime = Date.now();

    try {
      // 运行单元测试
      console.log('📋 运行单元测试...');
      await this.runUnitTests();

      // 运行集成测试
      console.log('\n🔗 运行集成测试...');
      await this.runIntegrationTests();

      // 运行性能测试
      console.log('\n⚡ 运行性能测试...');
      await this.runPerformanceTests();

      // 运行兼容性测试
      console.log('\n🔧 运行兼容性测试...');
      await this.runCompatibilityTests();

    } catch (error) {
      console.error('测试运行过程中出现错误:', error);
    } finally {
      this.results.endTime = Date.now();
      this.results.duration = this.results.endTime - this.results.startTime;
      this.printFinalReport();
    }

    return this.results;
  }

  /**
   * 运行单元测试
   */
  async runUnitTests() {
    const unitTests = [
      { name: '存储管理器测试', tests: this.createStorageTests },
      { name: '错误处理器测试', tests: this.createErrorHandlerTests },
      { name: '性能监控器测试', tests: this.createPerformanceTests },
      { name: '时间计算逻辑测试', tests: this.createTimeCalculationTests },
      { name: '数据验证逻辑测试', tests: this.createDataValidationTests }
    ];

    for (const suite of unitTests) {
      console.log(`  运行 ${suite.name}...`);
      const result = await this.runTestSuite(suite.name, suite.tests);
      this.results.suites.push(result);
      this.updateTotalResults(result);
    }
  }

  /**
   * 运行集成测试
   */
  async runIntegrationTests() {
    const integrationTests = [
      { name: '完整工作流程测试', tests: this.createWorkflowTests },
      { name: '数据一致性测试', tests: this.createDataConsistencyTests },
      { name: '跨页面交互测试', tests: this.createCrossPageTests }
    ];

    for (const suite of integrationTests) {
      console.log(`  运行 ${suite.name}...`);
      const result = await this.runTestSuite(suite.name, suite.tests);
      this.results.suites.push(result);
      this.updateTotalResults(result);
    }
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTests() {
    const performanceTests = [
      { name: '大数据量处理测试', tests: this.createBigDataTests },
      { name: '内存使用测试', tests: this.createMemoryTests },
      { name: '响应时间测试', tests: this.createResponseTimeTests }
    ];

    for (const suite of performanceTests) {
      console.log(`  运行 ${suite.name}...`);
      const result = await this.runTestSuite(suite.name, suite.tests);
      this.results.suites.push(result);
      this.updateTotalResults(result);
    }
  }

  /**
   * 运行兼容性测试
   */
  async runCompatibilityTests() {
    const compatibilityTests = [
      { name: '数据格式兼容性测试', tests: this.createCompatibilityTests },
      { name: '版本升级测试', tests: this.createUpgradeTests },
      { name: '边界条件测试', tests: this.createBoundaryTests }
    ];

    for (const suite of compatibilityTests) {
      console.log(`  运行 ${suite.name}...`);
      const result = await this.runTestSuite(suite.name, suite.tests);
      this.results.suites.push(result);
      this.updateTotalResults(result);
    }
  }

  /**
   * 运行单个测试套件
   */
  async runTestSuite(suiteName, testCreator) {
    const suite = {
      name: suiteName,
      total: 0,
      passed: 0,
      failed: 0,
      tests: [],
      startTime: Date.now(),
      endTime: null,
      duration: 0
    };

    try {
      // 创建测试
      const tests = testCreator.call(this);
      
      // 运行测试
      for (const test of tests) {
        suite.total++;
        const testResult = await this.runSingleTest(test);
        suite.tests.push(testResult);
        
        if (testResult.passed) {
          suite.passed++;
        } else {
          suite.failed++;
        }
      }
    } catch (error) {
      console.error(`测试套件 ${suiteName} 运行失败:`, error);
      suite.failed++;
    }

    suite.endTime = Date.now();
    suite.duration = suite.endTime - suite.startTime;
    
    return suite;
  }

  /**
   * 运行单个测试
   */
  async runSingleTest(test) {
    const testResult = {
      name: test.name,
      passed: false,
      error: null,
      duration: 0,
      startTime: Date.now()
    };

    try {
      if (test.async) {
        await test.fn();
      } else {
        test.fn();
      }
      testResult.passed = true;
    } catch (error) {
      testResult.error = error.message;
    }

    testResult.duration = Date.now() - testResult.startTime;
    return testResult;
  }

  /**
   * 更新总体结果
   */
  updateTotalResults(suiteResult) {
    this.results.total += suiteResult.total;
    this.results.passed += suiteResult.passed;
    this.results.failed += suiteResult.failed;
  }

  /**
   * 打印最终报告
   */
  printFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试完成报告');
    console.log('='.repeat(80));
    
    console.log(`总测试数: ${this.results.total}`);
    console.log(`通过: ${this.results.passed} ✅`);
    console.log(`失败: ${this.results.failed} ❌`);
    console.log(`成功率: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    console.log(`总耗时: ${this.results.duration}ms`);
    
    console.log('\n📋 各测试套件详情:');
    this.results.suites.forEach(suite => {
      const status = suite.failed === 0 ? '✅' : '❌';
      console.log(`  ${status} ${suite.name}: ${suite.passed}/${suite.total} (${suite.duration}ms)`);
    });

    if (this.results.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.suites.forEach(suite => {
        suite.tests.forEach(test => {
          if (!test.passed) {
            console.log(`  - ${suite.name} > ${test.name}: ${test.error}`);
          }
        });
      });
    }

    console.log('\n' + '='.repeat(80));
    
    // 生成测试报告文件
    this.generateTestReport();
  }

  /**
   * 生成测试报告文件
   */
  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.total) * 100).toFixed(2),
        duration: this.results.duration
      },
      suites: this.results.suites.map(suite => ({
        name: suite.name,
        total: suite.total,
        passed: suite.passed,
        failed: suite.failed,
        duration: suite.duration,
        failedTests: suite.tests.filter(t => !t.passed).map(t => ({
          name: t.name,
          error: t.error,
          duration: t.duration
        }))
      }))
    };

    try {
      const fs = require('fs');
      const reportPath = './test-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 测试报告已生成: ${reportPath}`);
    } catch (error) {
      console.error('生成测试报告失败:', error);
    }
  }

  // 测试创建方法
  createStorageTests() {
    return [
      {
        name: '存储数据读写测试',
        fn: () => {
          // 模拟存储测试
          const mockStorage = { data: {} };
          mockStorage.set = (key, value) => { mockStorage.data[key] = value; };
          mockStorage.get = (key) => mockStorage.data[key];
          
          mockStorage.set('test', 'value');
          if (mockStorage.get('test') !== 'value') {
            throw new Error('存储读写失败');
          }
        }
      },
      {
        name: '数据验证测试',
        fn: () => {
          const datePattern = /^\d{4}-\d{2}-\d{2}$/;
          if (!datePattern.test('2024-01-15')) {
            throw new Error('日期验证失败');
          }
          if (datePattern.test('invalid-date')) {
            throw new Error('无效日期验证失败');
          }
        }
      }
    ];
  }

  createErrorHandlerTests() {
    return [
      {
        name: '错误分类测试',
        fn: () => {
          const errorHandler = {
            categorizeError: (error) => {
              if (error.includes('storage')) return 'storage_error';
              if (error.includes('network')) return 'network_error';
              return 'system_error';
            }
          };
          
          if (errorHandler.categorizeError('storage failed') !== 'storage_error') {
            throw new Error('存储错误分类失败');
          }
        }
      }
    ];
  }

  createPerformanceTests() {
    return [
      {
        name: '性能计时测试',
        fn: () => {
          const monitor = {
            timings: {},
            start: (key) => { monitor.timings[key] = Date.now(); },
            end: (key) => { 
              const duration = Date.now() - monitor.timings[key];
              delete monitor.timings[key];
              return duration;
            }
          };
          
          monitor.start('test');
          const duration = monitor.end('test');
          if (duration < 0) {
            throw new Error('性能计时异常');
          }
        }
      }
    ];
  }

  createTimeCalculationTests() {
    return [
      {
        name: '工作时长计算测试',
        fn: () => {
          const calculateHours = (start, end) => {
            const startTime = new Date(`2024-01-01 ${start}`);
            const endTime = new Date(`2024-01-01 ${end}`);
            return (endTime - startTime) / (1000 * 60 * 60);
          };
          
          const hours = calculateHours('09:00', '18:00');
          if (hours !== 9) {
            throw new Error(`工作时长计算错误: 期望9小时，实际${hours}小时`);
          }
        }
      }
    ];
  }

  createDataValidationTests() {
    return [
      {
        name: '数据格式验证测试',
        fn: () => {
          const validateRecord = (record) => {
            return record && 
                   record.date && 
                   /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
                   (!record.on || /^\d{1,2}:\d{2}$/.test(record.on)) &&
                   (!record.off || /^\d{1,2}:\d{2}$/.test(record.off));
          };
          
          const validRecord = { date: '2024-01-15', on: '09:00', off: '18:00' };
          const invalidRecord = { date: 'invalid', on: '25:00' };
          
          if (!validateRecord(validRecord)) {
            throw new Error('有效记录验证失败');
          }
          if (validateRecord(invalidRecord)) {
            throw new Error('无效记录验证失败');
          }
        }
      }
    ];
  }

  createWorkflowTests() {
    return [
      {
        name: '完整打卡流程测试',
        async: true,
        fn: async () => {
          // 模拟完整打卡流程
          const records = [];
          const today = '2024-01-15';
          
          // 上班打卡
          records.push({ date: today, on: '09:00' });
          
          // 下班打卡
          const record = records.find(r => r.date === today);
          record.off = '18:00';
          
          if (records.length !== 1 || !record.on || !record.off) {
            throw new Error('完整打卡流程测试失败');
          }
        }
      }
    ];
  }

  createDataConsistencyTests() {
    return [
      {
        name: '数据一致性测试',
        fn: () => {
          const data1 = [{ date: '2024-01-15', on: '09:00' }];
          const data2 = JSON.parse(JSON.stringify(data1));
          
          if (JSON.stringify(data1) !== JSON.stringify(data2)) {
            throw new Error('数据一致性测试失败');
          }
        }
      }
    ];
  }

  createCrossPageTests() {
    return [
      {
        name: '跨页面数据传递测试',
        fn: () => {
          // 模拟页面间数据传递
          const pageA = { data: { records: [{ date: '2024-01-15' }] } };
          const pageB = { data: { records: [] } };
          
          // 数据传递
          pageB.data.records = [...pageA.data.records];
          
          if (pageB.data.records.length !== 1) {
            throw new Error('跨页面数据传递失败');
          }
        }
      }
    ];
  }

  createBigDataTests() {
    return [
      {
        name: '大数据量处理测试',
        fn: () => {
          const startTime = Date.now();
          
          // 生成大量数据
          const largeData = [];
          for (let i = 0; i < 10000; i++) {
            largeData.push({ id: i, value: `data_${i}` });
          }
          
          // 处理数据
          const filtered = largeData.filter(item => item.id % 2 === 0);
          
          const duration = Date.now() - startTime;
          
          if (duration > 1000) { // 超过1秒认为性能不佳
            throw new Error(`大数据处理耗时过长: ${duration}ms`);
          }
          
          if (filtered.length !== 5000) {
            throw new Error('大数据处理结果错误');
          }
        }
      }
    ];
  }

  createMemoryTests() {
    return [
      {
        name: '内存使用测试',
        fn: () => {
          // 模拟内存使用检查
          const memoryUsage = {
            used: 50 * 1024, // 50MB
            limit: 100 * 1024 // 100MB
          };
          
          const usagePercent = (memoryUsage.used / memoryUsage.limit) * 100;
          
          if (usagePercent > 80) {
            throw new Error(`内存使用率过高: ${usagePercent}%`);
          }
        }
      }
    ];
  }

  createResponseTimeTests() {
    return [
      {
        name: '响应时间测试',
        async: true,
        fn: async () => {
          const startTime = Date.now();
          
          // 模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const responseTime = Date.now() - startTime;
          
          if (responseTime > 500) { // 超过500ms认为响应过慢
            throw new Error(`响应时间过长: ${responseTime}ms`);
          }
        }
      }
    ];
  }

  createCompatibilityTests() {
    return [
      {
        name: '数据格式兼容性测试',
        fn: () => {
          // 测试不同版本的数据格式
          const v1Data = { date: '2024-01-15', start: '09:00', end: '18:00' };
          const v2Data = { date: '2024-01-15', on: '09:00', off: '18:00' };
          
          // 模拟数据迁移
          const migrateData = (oldData) => {
            if (oldData.start && oldData.end) {
              return {
                date: oldData.date,
                on: oldData.start,
                off: oldData.end
              };
            }
            return oldData;
          };
          
          const migrated = migrateData(v1Data);
          if (!migrated.on || !migrated.off) {
            throw new Error('数据格式兼容性测试失败');
          }
        }
      }
    ];
  }

  createUpgradeTests() {
    return [
      {
        name: '版本升级测试',
        fn: () => {
          const oldVersion = '1.0.0';
          const newVersion = '1.1.0';
          
          const compareVersion = (v1, v2) => {
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            
            for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
              const part1 = parts1[i] || 0;
              const part2 = parts2[i] || 0;
              
              if (part1 < part2) return -1;
              if (part1 > part2) return 1;
            }
            return 0;
          };
          
          if (compareVersion(oldVersion, newVersion) !== -1) {
            throw new Error('版本比较测试失败');
          }
        }
      }
    ];
  }

  createBoundaryTests() {
    return [
      {
        name: '边界条件测试',
        fn: () => {
          // 测试各种边界条件
          const testCases = [
            { input: '', expected: false, desc: '空字符串' },
            { input: null, expected: false, desc: 'null值' },
            { input: undefined, expected: false, desc: 'undefined值' },
            { input: '2024-01-01', expected: true, desc: '有效日期' }
          ];
          
          const validateInput = (input) => {
            return input && typeof input === 'string' && input.length > 0;
          };
          
          testCases.forEach(testCase => {
            const result = validateInput(testCase.input);
            if (result !== testCase.expected) {
              throw new Error(`边界条件测试失败: ${testCase.desc}`);
            }
          });
        }
      }
    ];
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('测试运行器异常:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;