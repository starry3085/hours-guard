/**
 * 小程序单元测试框架
 * 提供基础的测试功能和断言方法
 */

class TestFramework {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    this.currentSuite = null;
  }

  /**
   * 创建测试套件
   * @param {string} name 套件名称
   * @param {Function} fn 测试函数
   */
  describe(name, fn) {
    this.currentSuite = {
      name,
      tests: [],
      beforeEach: null,
      afterEach: null
    };
    
    fn();
    
    this.tests.push(this.currentSuite);
    this.currentSuite = null;
  }

  /**
   * 创建测试用例
   * @param {string} name 测试名称
   * @param {Function} fn 测试函数
   */
  it(name, fn) {
    if (!this.currentSuite) {
      throw new Error('测试用例必须在describe块中定义');
    }
    
    this.currentSuite.tests.push({
      name,
      fn,
      async: fn.constructor.name === 'AsyncFunction'
    });
  }

  /**
   * 设置每个测试前的钩子
   * @param {Function} fn 钩子函数
   */
  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach = fn;
    }
  }

  /**
   * 设置每个测试后的钩子
   * @param {Function} fn 钩子函数
   */
  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEach = fn;
    }
  }

  /**
   * 运行所有测试
   * @returns {Promise<Object>} 测试结果
   */
  async runTests() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };

    console.log('开始运行测试...\n');

    for (const suite of this.tests) {
      console.log(`测试套件: ${suite.name}`);
      
      for (const test of suite.tests) {
        this.results.total++;
        
        try {
          // 运行beforeEach钩子
          if (suite.beforeEach) {
            await suite.beforeEach();
          }
          
          // 运行测试
          if (test.async) {
            await test.fn();
          } else {
            test.fn();
          }
          
          // 运行afterEach钩子
          if (suite.afterEach) {
            await suite.afterEach();
          }
          
          this.results.passed++;
          this.results.details.push({
            suite: suite.name,
            test: test.name,
            status: 'passed',
            error: null
          });
          
          console.log(`  ✓ ${test.name}`);
          
        } catch (error) {
          this.results.failed++;
          this.results.details.push({
            suite: suite.name,
            test: test.name,
            status: 'failed',
            error: error.message
          });
          
          console.log(`  ✗ ${test.name}`);
          console.log(`    错误: ${error.message}`);
        }
      }
      
      console.log('');
    }

    this.printSummary();
    return this.results;
  }

  /**
   * 打印测试摘要
   */
  printSummary() {
    console.log('测试摘要:');
    console.log(`总计: ${this.results.total}`);
    console.log(`通过: ${this.results.passed}`);
    console.log(`失败: ${this.results.failed}`);
    
    if (this.results.failed > 0) {
      console.log('\n失败的测试:');
      this.results.details
        .filter(detail => detail.status === 'failed')
        .forEach(detail => {
          console.log(`  ${detail.suite} > ${detail.test}: ${detail.error}`);
        });
    }
  }

  /**
   * 断言方法
   */
  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`期望 ${actual} 等于 ${expected}`);
        }
      },
      
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`期望 ${JSON.stringify(actual)} 深度等于 ${JSON.stringify(expected)}`);
        }
      },
      
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`期望 ${actual} 为真值`);
        }
      },
      
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`期望 ${actual} 为假值`);
        }
      },
      
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`期望 ${actual} 为 null`);
        }
      },
      
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`期望 ${actual} 为 undefined`);
        }
      },
      
      toContain: (expected) => {
        if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`期望数组 ${JSON.stringify(actual)} 包含 ${expected}`);
          }
        } else if (typeof actual === 'string') {
          if (actual.indexOf(expected) === -1) {
            throw new Error(`期望字符串 "${actual}" 包含 "${expected}"`);
          }
        } else {
          throw new Error('toContain 只能用于数组或字符串');
        }
      },
      
      toHaveLength: (expected) => {
        if (!actual || typeof actual.length !== 'number') {
          throw new Error(`期望 ${actual} 有 length 属性`);
        }
        if (actual.length !== expected) {
          throw new Error(`期望长度为 ${expected}，实际为 ${actual.length}`);
        }
      },
      
      toThrow: () => {
        if (typeof actual !== 'function') {
          throw new Error('toThrow 只能用于函数');
        }
        
        let threw = false;
        try {
          actual();
        } catch (error) {
          threw = true;
        }
        
        if (!threw) {
          throw new Error('期望函数抛出异常');
        }
      },
      
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`期望 ${actual} 大于 ${expected}`);
        }
      },
      
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`期望 ${actual} 小于 ${expected}`);
        }
      }
    };
  }

  /**
   * 模拟函数
   * @param {Function} implementation 实现函数
   * @returns {Object} 模拟函数对象
   */
  mock(implementation) {
    const mockFn = implementation || (() => {});
    const calls = [];
    
    const mock = function(...args) {
      calls.push(args);
      return mockFn.apply(this, args);
    };
    
    mock.calls = calls;
    mock.mockReturnValue = (value) => {
      mockFn = () => value;
      return mock;
    };
    mock.mockResolvedValue = (value) => {
      mockFn = () => Promise.resolve(value);
      return mock;
    };
    mock.mockRejectedValue = (error) => {
      mockFn = () => Promise.reject(error);
      return mock;
    };
    
    return mock;
  }

  /**
   * 清理所有测试
   */
  clear() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }
}

// 创建全局测试实例
const testFramework = new TestFramework();

// 导出全局函数
const describe = testFramework.describe.bind(testFramework);
const it = testFramework.it.bind(testFramework);
const beforeEach = testFramework.beforeEach.bind(testFramework);
const afterEach = testFramework.afterEach.bind(testFramework);
const expect = testFramework.expect.bind(testFramework);
const mock = testFramework.mock.bind(testFramework);

module.exports = {
  TestFramework,
  testFramework,
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  mock
};