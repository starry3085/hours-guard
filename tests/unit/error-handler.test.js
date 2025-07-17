/**
 * 错误处理器单元测试
 */

const { describe, it, beforeEach, afterEach, expect, mock } = require('./test-framework');

// 模拟微信API
global.wx = {
  getStorageSync: mock(() => []),
  setStorageSync: mock(),
  removeStorageSync: mock(),
  getSystemInfoSync: mock(() => ({
    platform: 'devtools',
    system: 'Windows 10',
    version: '8.0.0'
  })),
  getStorageInfoSync: mock(() => ({
    currentSize: 100,
    limitSize: 10240
  })),
  getNetworkType: mock((options) => {
    options.success({ networkType: 'wifi' });
  }),
  showToast: mock(),
  showModal: mock()
};

// 导入错误处理器
const ErrorHandler = require('../../miniprogram/utils/error-handler');

describe('错误处理器测试', () => {
  let errorHandler;
  
  beforeEach(() => {
    // 重置模拟函数
    Object.keys(wx).forEach(key => {
      if (wx[key].calls) {
        wx[key].calls = [];
      }
    });
    
    // 创建新的错误处理器实例
    errorHandler = new (require('../../miniprogram/utils/error-handler').constructor)();
  });

  describe('错误解析', () => {
    it('应该正确解析字符串错误', () => {
      const error = '测试错误信息';
      const context = '测试上下文';
      
      const errorInfo = errorHandler.parseError(error, context);
      
      expect(errorInfo.message).toBe(error);
      expect(errorInfo.context).toBe(context);
      expect(errorInfo.type).toBe('system_error');
    });

    it('应该正确解析Error对象', () => {
      const error = new Error('测试错误');
      const context = '测试上下文';
      
      const errorInfo = errorHandler.parseError(error, context);
      
      expect(errorInfo.message).toBe('测试错误');
      expect(errorInfo.context).toBe(context);
      expect(errorInfo.stack).toBeDefined();
    });

    it('应该正确分类存储错误', () => {
      const error = 'setStorageSync failed';
      const errorInfo = errorHandler.parseError(error, '存储操作');
      
      errorHandler.categorizeError(errorInfo);
      
      expect(errorInfo.type).toBe('storage_error');
      expect(errorInfo.userMessage).toContain('数据保存失败');
      expect(errorInfo.severity).toBe('high');
    });

    it('应该正确分类网络错误', () => {
      const error = 'network timeout';
      const errorInfo = errorHandler.parseError(error, '网络请求');
      
      errorHandler.categorizeError(errorInfo);
      
      expect(errorInfo.type).toBe('network_error');
      expect(errorInfo.userMessage).toContain('网络连接异常');
      expect(errorInfo.severity).toBe('low');
    });

    it('应该正确分类文件错误', () => {
      const error = 'writeFile failed';
      const errorInfo = errorHandler.parseError(error, '文件操作');
      
      errorHandler.categorizeError(errorInfo);
      
      expect(errorInfo.type).toBe('file_error');
      expect(errorInfo.userMessage).toContain('文件操作失败');
      expect(errorInfo.severity).toBe('medium');
    });
  });

  describe('错误处理', () => {
    it('应该记录错误日志', () => {
      wx.setStorageSync.mockReturnValue(undefined);
      
      const error = '测试错误';
      const context = '测试上下文';
      
      errorHandler.handleError(error, context, { silent: true });
      
      // 验证存储调用
      const logCalls = wx.setStorageSync.calls.filter(call => 
        call[0] === 'errorLogs'
      );
      expect(logCalls).toHaveLength(1);
    });

    it('应该显示用户友好的错误提示', () => {
      const error = '测试错误';
      const context = '测试上下文';
      
      errorHandler.handleError(error, context, { 
        showToast: true,
        showModal: false 
      });
      
      expect(wx.showToast.calls).toHaveLength(1);
      expect(wx.showModal.calls).toHaveLength(0);
    });

    it('应该执行错误恢复策略', () => {
      const error = '测试错误';
      const context = '测试上下文';
      const recoveryFn = mock();
      
      errorHandler.handleError(error, context, { 
        silent: true,
        recovery: recoveryFn
      });
      
      expect(recoveryFn.calls).toHaveLength(1);
    });
  });

  describe('重试机制', () => {
    it('应该在成功时不重试', async () => {
      const successFn = mock(() => '成功结果');
      
      const result = await errorHandler.withRetry(successFn, {
        maxRetries: 3,
        context: '测试操作'
      });
      
      expect(result).toBe('成功结果');
      expect(successFn.calls).toHaveLength(1);
    });

    it('应该在失败时重试', async () => {
      let callCount = 0;
      const retryFn = mock(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('临时失败');
        }
        return '最终成功';
      });
      
      const result = await errorHandler.withRetry(retryFn, {
        maxRetries: 3,
        context: '测试操作'
      });
      
      expect(result).toBe('最终成功');
      expect(retryFn.calls).toHaveLength(3);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const failFn = mock(() => {
        throw new Error('持续失败');
      });
      
      try {
        await errorHandler.withRetry(failFn, {
          maxRetries: 2,
          context: '测试操作'
        });
        expect(false).toBeTruthy(); // 不应该到达这里
      } catch (error) {
        expect(error.message).toBe('持续失败');
        expect(failFn.calls).toHaveLength(3); // 初始调用 + 2次重试
      }
    });

    it('应该调用重试回调', async () => {
      let callCount = 0;
      const retryFn = mock(() => {
        callCount++;
        if (callCount < 2) {
          throw new Error('需要重试');
        }
        return '成功';
      });
      
      const onRetry = mock();
      
      await errorHandler.withRetry(retryFn, {
        maxRetries: 2,
        context: '测试操作',
        onRetry
      });
      
      expect(onRetry.calls).toHaveLength(1);
      expect(onRetry.calls[0][1]).toBe(1); // 重试次数
    });
  });

  describe('网络状态检查', () => {
    it('应该检测网络连接状态', async () => {
      wx.getNetworkType.mockImplementation((options) => {
        options.success({ networkType: 'wifi' });
      });
      
      const status = await errorHandler.checkNetworkStatus();
      
      expect(status.isConnected).toBeTruthy();
      expect(status.networkType).toBe('wifi');
      expect(status.isWifi).toBeTruthy();
    });

    it('应该处理网络检查失败', async () => {
      wx.getNetworkType.mockImplementation((options) => {
        options.fail();
      });
      
      const status = await errorHandler.checkNetworkStatus();
      
      expect(status.isConnected).toBeFalsy();
      expect(status.networkType).toBe('unknown');
    });
  });

  describe('错误日志管理', () => {
    it('应该获取错误日志', () => {
      const mockLogs = [
        { id: 1, message: '错误1', timestamp: Date.now() },
        { id: 2, message: '错误2', timestamp: Date.now() }
      ];
      
      wx.getStorageSync.mockReturnValue(mockLogs);
      
      const logs = errorHandler.getErrorLogs(10);
      
      expect(logs).toHaveLength(2);
      expect(logs[0].id).toBe(2); // 最新的在前
    });

    it('应该清除错误日志', () => {
      wx.removeStorageSync.mockReturnValue(undefined);
      wx.showToast.mockReturnValue(undefined);
      
      const result = errorHandler.clearErrorLogs();
      
      expect(result).toBeTruthy();
      expect(wx.removeStorageSync.calls).toHaveLength(1);
      expect(wx.showToast.calls).toHaveLength(1);
    });

    it('应该导出错误日志', () => {
      const mockLogs = [
        { 
          type: 'storage_error',
          timestamp: new Date().toISOString(),
          context: '测试上下文',
          message: '测试错误',
          userMessage: '用户消息',
          severity: 'high'
        }
      ];
      
      wx.getStorageSync.mockReturnValue(mockLogs);
      
      const logContent = errorHandler.exportErrorLogs();
      
      expect(logContent).toContain('错误日志报告');
      expect(logContent).toContain('测试错误');
      expect(logContent).toContain('数据存储错误');
    });
  });

  describe('系统诊断', () => {
    it('应该执行系统诊断', async () => {
      wx.getSystemInfoSync.mockReturnValue({
        platform: 'devtools',
        system: 'Windows 10',
        version: '8.0.0'
      });
      
      wx.getStorageInfoSync.mockReturnValue({
        currentSize: 100,
        limitSize: 10240
      });
      
      wx.getStorageSync.mockReturnValue([]); // 空错误日志
      
      const diagnosis = await errorHandler.systemDiagnosis();
      
      expect(diagnosis.systemInfo).toBeDefined();
      expect(diagnosis.storageInfo).toBeDefined();
      expect(diagnosis.networkInfo).toBeDefined();
      expect(diagnosis.issues).toBeDefined();
      expect(diagnosis.suggestions).toBeDefined();
    });

    it('应该检测存储使用率过高', async () => {
      wx.getStorageInfoSync.mockReturnValue({
        currentSize: 9000, // 高使用率
        limitSize: 10240
      });
      
      wx.getStorageSync.mockReturnValue([]);
      
      const diagnosis = await errorHandler.systemDiagnosis();
      
      expect(diagnosis.issues).toContain('存储空间使用率过高');
      expect(diagnosis.suggestions).toContain('清理历史数据或导出备份');
    });

    it('应该检测错误频发', async () => {
      const recentErrors = Array(6).fill(null).map((_, i) => ({
        timestamp: new Date().toISOString(),
        type: 'system_error'
      }));
      
      wx.getStorageSync.mockReturnValue(recentErrors);
      
      const diagnosis = await errorHandler.systemDiagnosis();
      
      expect(diagnosis.issues).toContain('近24小时内错误频发');
    });
  });

  describe('版本比较', () => {
    it('应该正确比较版本号', () => {
      expect(errorHandler.compareVersion('8.0.0', '7.0.0')).toBe(1);
      expect(errorHandler.compareVersion('7.0.0', '8.0.0')).toBe(-1);
      expect(errorHandler.compareVersion('8.0.0', '8.0.0')).toBe(0);
      expect(errorHandler.compareVersion('8.0.1', '8.0.0')).toBe(1);
    });
  });
});