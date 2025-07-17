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
    const errorInfo = this.parseError(error, context);
    
    // 记录错误日志
    this.logError(errorInfo);
    
    // 显示用户提示
    if (!options.silent) {
      this.showUserFriendlyMessage(errorInfo, options);
    }
    
    // 执行错误恢复策略
    if (options.recovery && typeof options.recovery === 'function') {
      try {
        options.recovery(errorInfo);
      } catch (recoveryError) {
        console.error('执行错误恢复失败:', recoveryError);
      }
    }
    
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
      userMessage: '操作失败，请重试'
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
    
    // 存储相关错误
    if (message.includes('storage') || message.includes('存储') || 
        message.includes('setStorageSync') || message.includes('getStorageSync')) {
      errorInfo.type = this.errorTypes.STORAGE_ERROR;
      errorInfo.userMessage = '数据保存失败，请检查存储空间';
    }
    
    // 网络相关错误
    else if (message.includes('network') || message.includes('网络') || 
             message.includes('request') || message.includes('timeout')) {
      errorInfo.type = this.errorTypes.NETWORK_ERROR;
      errorInfo.userMessage = '网络连接异常，请检查网络设置';
    }
    
    // 数据验证错误
    else if (message.includes('validation') || message.includes('验证') || 
             message.includes('format') || message.includes('格式')) {
      errorInfo.type = this.errorTypes.VALIDATION_ERROR;
      errorInfo.userMessage = '数据格式错误，请检查输入';
    }
  }

  /**
   * 显示用户友好的错误提示
   * @param {Object} errorInfo 错误信息
   * @param {Object} options 显示选项
   */
  showUserFriendlyMessage(errorInfo, options = {}) {
    const { showModal = false, showToast = true, duration = 2000 } = options;
    
    if (showModal) {
      wx.showModal({
        title: '提示',
        content: errorInfo.userMessage,
        showCancel: false,
        confirmText: '确定'
      });
    } else if (showToast) {
      wx.showToast({
        title: errorInfo.userMessage,
        icon: 'none',
        duration: duration
      });
    }
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
}

// 创建单例实例
const errorHandler = new ErrorHandler();

module.exports = errorHandler;