/**
 * 错误处理和用户提示工具类
 * 提供统一的错误处理、用户提示和基本恢复功能
 */

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      STORAGE_ERROR: 'storage_error',
      NETWORK_ERROR: 'network_error',
      VALIDATION_ERROR: 'validation_error',
      SYSTEM_ERROR: 'system_error'
    };

    this.maxErrorLogs = 20;
  }

  /**
   * 处理错误并显示用户友好的提示
   * @param {Error|string} error 错误对象或错误信息
   * @param {string} context 错误发生的上下文
   * @param {Object} options 处理选项
   */
  handleError(error, context = '', options = {}) {
    // 解析错误信息
    const errorInfo = this.parseError(error, context);

    // 记录错误日志
    try {
      this.logError(errorInfo);
    } catch (e) {
      // 忽略日志记录错误
      console.error('记录错误日志失败:', e);
    }

    // 不显示任何错误提示，避免干扰用户
    // 只在控制台输出错误信息
    console.error(`[${errorInfo.type}] ${context}:`, error);

    return errorInfo;
  }

  /**
   * 解析错误信息
   * @param {Error|string} error 错误
   * @param {string} context 上下文
   * @returns {Object} 解析后的错误信息
   */
  parseError(error, context) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      type: this.errorTypes.SYSTEM_ERROR,
      message: '',
      userMessage: '' // 空字符串，不显示任何错误提示
    };

    if (typeof error === 'string') {
      errorInfo.message = error;
    } else if (error instanceof Error) {
      errorInfo.message = error.message;
    } else {
      errorInfo.message = JSON.stringify(error);
    }

    // 根据错误信息分类
    this.categorizeError(errorInfo);

    return errorInfo;
  }

  /**
   * 错误分类和用户消息生成
   * @param {Object} errorInfo 错误信息对象
   */
  categorizeError(errorInfo) {
    const message = errorInfo.message.toLowerCase();

    // 只设置错误类型，不设置用户消息
    if (message.includes('storage') || message.includes('存储') ||
      message.includes('setStorageSync') || message.includes('getStorageSync')) {
      errorInfo.type = this.errorTypes.STORAGE_ERROR;
    }
    else if (message.includes('network') || message.includes('网络') ||
      message.includes('request') || message.includes('timeout')) {
      errorInfo.type = this.errorTypes.NETWORK_ERROR;
    }
    else if (message.includes('validation') || message.includes('验证') ||
      message.includes('format') || message.includes('格式')) {
      errorInfo.type = this.errorTypes.VALIDATION_ERROR;
    }

    // 确保不显示任何错误提示
    errorInfo.userMessage = '';
  }

  /**
   * 显示用户友好的错误提示
   * @param {Object} errorInfo 错误信息
   * @param {Object} options 显示选项
   */
  showUserFriendlyMessage(errorInfo, options = {}) {
    // 不显示任何错误提示，只在控制台输出
    console.log('错误信息:', errorInfo.message);

    // 完全禁用错误提示显示
    return;
  }

  /**
   * 记录错误日志
   * @param {Object} errorInfo 错误信息
   */
  logError(errorInfo) {
    try {
      const errorLogs = wx.getStorageSync('errorLogs') || [];

      // 添加新的错误日志
      errorLogs.push({
        timestamp: errorInfo.timestamp,
        type: errorInfo.type,
        context: errorInfo.context,
        message: errorInfo.message,
        userMessage: errorInfo.userMessage
      });

      // 保持日志数量在限制内
      if (errorLogs.length > this.maxErrorLogs) {
        errorLogs.splice(0, errorLogs.length - this.maxErrorLogs);
      }

      wx.setStorageSync('errorLogs', errorLogs);

      // 在控制台输出错误信息（开发调试用）
      console.error(`[${errorInfo.type}] ${errorInfo.context}:`, errorInfo.message);

    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }
  }

  /**
   * 获取错误日志
   * @param {number} limit 获取数量限制
   * @returns {Array} 错误日志列表
   */
  getErrorLogs(limit = 10) {
    try {
      const errorLogs = wx.getStorageSync('errorLogs') || [];
      return errorLogs.slice(-limit).reverse(); // 最新的在前
    } catch (error) {
      console.error('获取错误日志失败:', error);
      return [];
    }
  }

  /**
   * 清除错误日志
   * @returns {boolean} 是否成功
   */
  clearErrorLogs() {
    try {
      wx.removeStorageSync('errorLogs');
      wx.showToast({
        title: '日志已清除',
        icon: 'success'
      });
      return true;
    } catch (error) {
      console.error('清除错误日志失败:', error);
      return false;
    }
  }

  /**
   * 带重试机制的异步操作包装器
   * @param {Function} asyncFn 异步函数
   * @param {Object} options 选项
   * @returns {Promise} 执行结果
   */
  async withRetry(asyncFn, options = {}) {
    const { maxRetries = 2, context = '' } = options;

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          // 简单延迟重试
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }
      }
    }

    // 处理最终失败的错误
    this.handleError(lastError, context);
    throw lastError;
  }

  /**
   * 应用崩溃恢复检查
   * 检查上次应用是否异常退出，并尝试恢复数据
   * @returns {boolean} 是否执行了恢复操作
   */
  crashRecovery() {
    try {
      console.log('执行崩溃恢复检查');

      // 检查是否有崩溃标记
      const hasCrashed = wx.getStorageSync('app_crashed') || false;

      if (hasCrashed) {
        console.log('检测到应用可能异常退出，尝试恢复数据');

        // 清除崩溃标记
        wx.setStorageSync('app_crashed', false);

        // 这里可以添加实际的数据恢复逻辑
        // 例如从备份恢复数据等

        return true;
      }

      // 设置正常运行标记
      wx.setStorageSync('app_running', true);

      return false;
    } catch (error) {
      console.error('崩溃恢复检查失败:', error);
      return false;
    }
  }

  /**
   * 检查网络状态
   * @returns {Promise<Object>} 网络状态信息
   */
  async checkNetworkStatus() {
    try {
      return new Promise((resolve) => {
        wx.getNetworkType({
          success: (res) => {
            const isConnected = res.networkType !== 'none';
            const result = {
              isConnected,
              networkType: res.networkType
            };

            // 不显示任何提示，只在控制台输出
            console.log('网络状态:', res.networkType);

            resolve(result);
          },
          fail: () => {
            // 获取网络状态失败，假设离线
            const result = {
              isConnected: false,
              networkType: 'unknown'
            };

            console.log('无法获取网络状态');

            resolve(result);
          }
        });
      });
    } catch (error) {
      console.error('检查网络状态失败:', error);
      return {
        isConnected: false,
        networkType: 'error'
      };
    }
  }

  /**
   * 显示网络状态
   * @returns {Promise<Object>} 网络状态信息
   */
  async showNetworkStatus() {
    return this.checkNetworkStatus();
  }

  /**
   * 显示操作指导
   * @param {string} operation 操作类型
   */
  showOperationGuide(operation) {
    try {
      let title = '操作指导';
      let content = '请按照提示进行操作。';

      // 根据不同操作类型显示不同的指导内容
      switch (operation) {
        case 'punch_in':
          title = '打卡操作指导';
          content = '1. 点击"上班打卡"按钮记录上班时间\n2. 下班时点击"下班打卡"按钮\n3. 如需修改时间，点击时间数字进行编辑';
          break;
        case 'export':
          title = '导出操作指导';
          content = '1. 选择导出格式\n2. 点击"生成导出文件"按钮\n3. 复制文本或保存到本地';
          break;
        case 'stat':
          title = '统计操作指导';
          content = '1. 选择统计时间范围\n2. 查看工时统计结果\n3. 点击日期可查看详细记录';
          break;
        default:
          content = '请根据界面提示进行操作，如有疑问请联系开发者。';
      }

      wx.showModal({
        title: title,
        content: content,
        showCancel: false,
        confirmText: '我知道了'
      });

      return true;
    } catch (error) {
      console.error('显示操作指导失败:', error);
      return false;
    }
  }

  /**
   * 系统诊断
   * 检查系统状态并返回诊断结果
   * @returns {Promise<Object>} 诊断结果
   */
  async systemDiagnosis() {
    try {
      // 获取系统信息
      const systemInfo = await new Promise((resolve) => {
        wx.getSystemInfo({
          success: (res) => resolve(res),
          fail: () => resolve({})
        });
      });

      // 获取存储信息
      const storageInfo = await new Promise((resolve) => {
        wx.getStorageInfo({
          success: (res) => resolve(res),
          fail: () => resolve({ currentSize: 0, limitSize: 0 })
        });
      });

      // 获取网络状态
      const networkInfo = await this.checkNetworkStatus();

      // 分析问题
      const issues = [];
      const suggestions = [];

      // 检查存储空间
      const storageUsage = storageInfo.currentSize / storageInfo.limitSize;
      if (storageUsage > 0.8) {
        issues.push('存储空间使用率过高');
        suggestions.push('建议清理历史数据或导出备份');
      }

      // 检查错误日志
      const errorLogs = this.getErrorLogs(5);
      if (errorLogs.length > 0) {
        const recentErrors = errorLogs.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          const now = Date.now();
          return (now - logTime) < 24 * 60 * 60 * 1000; // 24小时内
        });

        if (recentErrors.length > 3) {
          issues.push('近期出现多次错误');
          suggestions.push('建议重启应用或清除缓存');
        }
      }

      // 返回诊断结果
      return {
        timestamp: Date.now(),
        systemInfo,
        storageInfo,
        networkInfo,
        issues,
        suggestions
      };
    } catch (error) {
      console.error('系统诊断失败:', error);
      return {
        timestamp: Date.now(),
        systemInfo: {},
        storageInfo: {},
        networkInfo: { isConnected: false },
        issues: ['诊断过程出错'],
        suggestions: ['请重启应用后重试']
      };
    }
  }
}

// 创建单例实例
const errorHandler = new ErrorHandler();

module.exports = errorHandler;