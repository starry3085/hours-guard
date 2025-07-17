/**
 * 错误处理器单元测试
 */

const { describe, it, beforeEach, expect, mock } = require('./test-framework');

// 模拟微信API
global.wx = {
  getStorageSync: mock(() => []),
  setStorageSync: mock(),
  removeStorageSync: mock(),
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
    });

    it('应该正确分类存储错误', () => {
      const error = 'setStorageSync failed';
      const errorInfo = errorHandler.parseError(error, '存储操作');
      
      errorHandler.categorizeError(errorInfo);
      
      expect(errorInfo.type).toBe('storage_error');
      expect(errorInfo.userMessage).toContain('数据保存失败');
    });

    it('应该正确分类网络错误', () => {
      const error = 'network timeout';
      const errorInfo = errorHandler.parseError(error, '网络请求');
      
      errorHandler.categorizeError(errorInfo);
      
      expect(errorInfo.type).toBe('network_error');
      expect(errorInfo.userMessage).toContain('网络连接异常');
    });

    it('应该正确分类验证错误', () => {
      const error = 'validation failed';
      const errorInfo = errorHandler.parseError(error, '数据验证');
      
      errorHandler.categorizeError(errorInfo);
      
      expect(errorInfo.type).toBe('validation_error');
      expect(errorInfo.userMessage).toContain('数据格式错误');
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
  });
});