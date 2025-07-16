/**
 * 错误处理和用户提示工具类
 * 提供统一的错误处理、用户提示和问题诊断功能
 */

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      STORAGE_ERROR: 'storage_error',
      NETWORK_ERROR: 'network_error',
      FILE_ERROR: 'file_error',
      VALIDATION_ERROR: 'validation_error',
      SYSTEM_ERROR: 'system_error',
      USER_ERROR: 'user_error'
    };
    
    this.maxErrorLogs = 50;
    this.retryDelays = [100, 300, 1000]; // 重试延迟时间
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
    if (options.recovery) {
      this.executeRecovery(errorInfo, options.recovery);
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
    const timestamp = new Date().toISOString();
    let errorInfo = {
      timestamp,
      context,
      type: this.errorTypes.SYSTEM_ERROR,
      message: '',
      originalError: error,
      userMessage: '操作失败，请重试',
      suggestions: [],
      severity: 'medium'
    };

    if (typeof error === 'string') {
      errorInfo.message = error;
    } else if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.stack = error.stack;
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
      errorInfo.suggestions = [
        '检查微信存储空间是否充足',
        '尝试重启微信小程序',
        '清理部分历史数据'
      ];
      errorInfo.severity = 'high';
    }
    
    // 网络相关错误
    else if (message.includes('network') || message.includes('网络') || 
             message.includes('request') || message.includes('timeout')) {
      errorInfo.type = this.errorTypes.NETWORK_ERROR;
      errorInfo.userMessage = '网络连接异常';
      errorInfo.suggestions = [
        '检查网络连接状态',
        '切换网络环境重试',
        '稍后再试'
      ];
      errorInfo.severity = 'low'; // 本应用主要离线使用
    }
    
    // 文件操作错误
    else if (message.includes('file') || message.includes('文件') || 
             message.includes('writeFile') || message.includes('canvas')) {
      errorInfo.type = this.errorTypes.FILE_ERROR;
      errorInfo.userMessage = '文件操作失败';
      errorInfo.suggestions = [
        '检查设备存储空间',
        '重新尝试生成文件',
        '重启应用后重试'
      ];
      errorInfo.severity = 'medium';
    }
    
    // 数据验证错误
    else if (message.includes('validation') || message.includes('验证') || 
             message.includes('format') || message.includes('格式')) {
      errorInfo.type = this.errorTypes.VALIDATION_ERROR;
      errorInfo.userMessage = '数据格式错误';
      errorInfo.suggestions = [
        '检查输入的时间格式',
        '确保日期格式正确',
        '重新输入数据'
      ];
      errorInfo.severity = 'low';
    }
    
    // 用户操作错误
    else if (message.includes('用户') || message.includes('操作') || 
             message.includes('权限') || message.includes('授权')) {
      errorInfo.type = this.errorTypes.USER_ERROR;
      errorInfo.userMessage = '操作受限或需要授权';
      errorInfo.suggestions = [
        '检查应用权限设置',
        '重新授权相关功能',
        '按照提示完成操作'
      ];
      errorInfo.severity = 'low';
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
        title: '操作提示',
        content: `${errorInfo.userMessage}\n\n建议：${errorInfo.suggestions[0] || '请重试'}`,
        showCancel: true,
        confirmText: '我知道了',
        cancelText: '查看详情',
        success: (res) => {
          if (!res.confirm && res.cancel) {
            this.showErrorDetails(errorInfo);
          }
        }
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
   * 显示错误详情
   * @param {Object} errorInfo 错误信息
   */
  showErrorDetails(errorInfo) {
    const suggestions = errorInfo.suggestions.join('\n• ');
    const content = `错误类型：${this.getErrorTypeText(errorInfo.type)}\n时间：${new Date(errorInfo.timestamp).toLocaleString()}\n\n解决建议：\n• ${suggestions}`;
    
    wx.showModal({
      title: '错误详情',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  }

  /**
   * 获取错误类型的中文描述
   * @param {string} errorType 错误类型
   * @returns {string} 中文描述
   */
  getErrorTypeText(errorType) {
    const typeMap = {
      [this.errorTypes.STORAGE_ERROR]: '数据存储错误',
      [this.errorTypes.NETWORK_ERROR]: '网络连接错误',
      [this.errorTypes.FILE_ERROR]: '文件操作错误',
      [this.errorTypes.VALIDATION_ERROR]: '数据验证错误',
      [this.errorTypes.SYSTEM_ERROR]: '系统错误',
      [this.errorTypes.USER_ERROR]: '用户操作错误'
    };
    
    return typeMap[errorType] || '未知错误';
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
        id: Date.now(),
        timestamp: errorInfo.timestamp,
        type: errorInfo.type,
        context: errorInfo.context,
        message: errorInfo.message,
        userMessage: errorInfo.userMessage,
        severity: errorInfo.severity
      });
      
      // 保持日志数量在限制内
      if (errorLogs.length > this.maxErrorLogs) {
        errorLogs.splice(0, errorLogs.length - this.maxErrorLogs);
      }
      
      wx.setStorageSync('errorLogs', errorLogs);
      
      // 在控制台输出详细错误信息（开发调试用）
      console.error(`[${errorInfo.type}] ${errorInfo.context}:`, errorInfo.originalError);
      
    } catch (logError) {
      console.error('记录错误日志失败:', logError);
    }
  }

  /**
   * 执行错误恢复策略
   * @param {Object} errorInfo 错误信息
   * @param {Function|Object} recovery 恢复策略
   */
  executeRecovery(errorInfo, recovery) {
    try {
      if (typeof recovery === 'function') {
        recovery(errorInfo);
      } else if (typeof recovery === 'object') {
        // 根据错误类型执行不同的恢复策略
        const recoveryFn = recovery[errorInfo.type] || recovery.default;
        if (typeof recoveryFn === 'function') {
          recoveryFn(errorInfo);
        }
      }
    } catch (recoveryError) {
      console.error('执行错误恢复失败:', recoveryError);
    }
  }

  /**
   * 带重试机制的异步操作包装器
   * @param {Function} asyncFn 异步函数
   * @param {Object} options 选项
   * @returns {Promise} 执行结果
   */
  async withRetry(asyncFn, options = {}) {
    const { 
      maxRetries = 3, 
      context = '', 
      onRetry = null,
      retryCondition = null 
    } = options;
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFn();
        return result;
      } catch (error) {
        lastError = error;
        
        // 检查是否应该重试
        if (attempt < maxRetries) {
          const shouldRetry = retryCondition ? retryCondition(error, attempt) : true;
          
          if (shouldRetry) {
            // 执行重试回调
            if (onRetry) {
              onRetry(error, attempt + 1);
            }
            
            // 等待重试延迟
            const delay = this.retryDelays[attempt] || this.retryDelays[this.retryDelays.length - 1];
            await this.sleep(delay);
            continue;
          }
        }
        
        // 不再重试，抛出错误
        break;
      }
    }
    
    // 处理最终失败的错误
    this.handleError(lastError, context, { 
      showModal: maxRetries > 1,
      showToast: true 
    });
    
    throw lastError;
  }

  /**
   * 检查网络状态
   * @returns {Promise<Object>} 网络状态信息
   */
  async checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const isConnected = res.networkType !== 'none';
          resolve({
            isConnected,
            networkType: res.networkType,
            isWifi: res.networkType === 'wifi'
          });
        },
        fail: () => {
          resolve({
            isConnected: false,
            networkType: 'unknown',
            isWifi: false
          });
        }
      });
    });
  }

  /**
   * 显示网络状态提示
   */
  async showNetworkStatus() {
    const networkStatus = await this.checkNetworkStatus();
    
    if (!networkStatus.isConnected) {
      wx.showToast({
        title: '当前无网络连接',
        icon: 'none',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: `当前网络：${networkStatus.networkType}`,
        icon: 'none',
        duration: 1500
      });
    }
    
    return networkStatus;
  }

  /**
   * 获取错误日志
   * @param {number} limit 获取数量限制
   * @returns {Array} 错误日志列表
   */
  getErrorLogs(limit = 20) {
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
      wx.showToast({
        title: '清除失败',
        icon: 'none'
      });
      return false;
    }
  }

  /**
   * 导出错误日志
   * @returns {string} 日志文本内容
   */
  exportErrorLogs() {
    try {
      const errorLogs = this.getErrorLogs(100);
      
      if (errorLogs.length === 0) {
        wx.showToast({
          title: '暂无错误日志',
          icon: 'none'
        });
        return '';
      }
      
      let logContent = `错误日志报告\n生成时间: ${new Date().toLocaleString()}\n`;
      logContent += `${'='.repeat(50)}\n\n`;
      
      errorLogs.forEach((log, index) => {
        logContent += `${index + 1}. [${this.getErrorTypeText(log.type)}]\n`;
        logContent += `   时间: ${new Date(log.timestamp).toLocaleString()}\n`;
        logContent += `   上下文: ${log.context}\n`;
        logContent += `   错误: ${log.message}\n`;
        logContent += `   用户提示: ${log.userMessage}\n`;
        logContent += `   严重程度: ${log.severity}\n`;
        logContent += `${'-'.repeat(30)}\n`;
      });
      
      return logContent;
    } catch (error) {
      console.error('导出错误日志失败:', error);
      return '';
    }
  }

  /**
   * 系统诊断
   * @returns {Object} 诊断结果
   */
  async systemDiagnosis() {
    const diagnosis = {
      timestamp: new Date().toISOString(),
      issues: [],
      suggestions: [],
      systemInfo: {},
      storageInfo: {},
      networkInfo: {}
    };
    
    try {
      // 获取系统信息
      diagnosis.systemInfo = wx.getSystemInfoSync();
      
      // 获取存储信息
      diagnosis.storageInfo = wx.getStorageInfoSync();
      
      // 获取网络信息
      diagnosis.networkInfo = await this.checkNetworkStatus();
      
      // 检查存储使用率
      const storageUsage = (diagnosis.storageInfo.currentSize / diagnosis.storageInfo.limitSize) * 100;
      if (storageUsage > 80) {
        diagnosis.issues.push('存储空间使用率过高');
        diagnosis.suggestions.push('清理历史数据或导出备份');
      }
      
      // 检查错误日志
      const errorLogs = this.getErrorLogs(10);
      const recentErrors = errorLogs.filter(log => 
        Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
      );
      
      if (recentErrors.length > 5) {
        diagnosis.issues.push('近24小时内错误频发');
        diagnosis.suggestions.push('检查应用使用方式或重启应用');
      }
      
      // 检查微信版本
      const wxVersion = diagnosis.systemInfo.version;
      if (wxVersion && this.compareVersion(wxVersion, '8.0.0') < 0) {
        diagnosis.issues.push('微信版本较低');
        diagnosis.suggestions.push('建议更新微信到最新版本');
      }
      
    } catch (error) {
      diagnosis.issues.push('系统诊断过程中出现错误');
      diagnosis.suggestions.push('请重启应用后重试');
      console.error('系统诊断失败:', error);
    }
    
    return diagnosis;
  }

  /**
   * 版本比较
   * @param {string} version1 版本1
   * @param {string} version2 版本2
   * @returns {number} 比较结果 (-1: v1<v2, 0: v1=v2, 1: v1>v2)
   */
  compareVersion(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    const maxLength = Math.max(v1parts.length, v2parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }

  /**
   * 延迟函数
   * @param {number} ms 毫秒数
   * @returns {Promise} Promise对象
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 显示操作指导
   * @param {string} operation 操作类型
   */
  showOperationGuide(operation) {
    const guides = {
      'punch_in': {
        title: '打卡操作指南',
        content: '1. 选择日期（默认今天）\n2. 点击"上班打卡"记录上班时间\n3. 点击"下班打卡"记录下班时间\n4. 可以补录历史日期的打卡记录'
      },
      'statistics': {
        title: '统计功能说明',
        content: '1. 查看当月所有打卡记录\n2. 显示本周和月度工作时长统计\n3. 点击时间可以编辑修改\n4. 支持删除错误记录'
      },
      'export': {
        title: '导出功能说明',
        content: '1. 选择要导出的月份\n2. 点击"生成报告"选择格式\n3. 支持Excel、图片、文本三种格式\n4. 可以分享给朋友或保存到相册'
      },
      'storage': {
        title: '数据存储说明',
        content: '1. 所有数据仅保存在本机\n2. 换机或卸载会丢失数据\n3. 建议定期导出备份\n4. 可以手动清理历史数据'
      }
    };
    
    const guide = guides[operation];
    if (guide) {
      wx.showModal({
        title: guide.title,
        content: guide.content,
        showCancel: false,
        confirmText: '我知道了'
      });
    }
  }

  /**
   * 应用崩溃恢复
   */
  crashRecovery() {
    try {
      // 检查是否有未完成的操作
      const crashFlag = wx.getStorageSync('app_crash_flag');
      if (crashFlag) {
        wx.showModal({
          title: '应用恢复',
          content: '检测到应用异常退出，已自动恢复数据。如有问题请重新操作。',
          showCancel: false,
          confirmText: '确定',
          success: () => {
            wx.removeStorageSync('app_crash_flag');
          }
        });
      }
      
      // 设置崩溃标记
      wx.setStorageSync('app_crash_flag', Date.now());
      
      // 应用正常退出时清除标记
      wx.onAppHide(() => {
        wx.removeStorageSync('app_crash_flag');
      });
      
    } catch (error) {
      console.error('崩溃恢复检查失败:', error);
    }
  }
}

// 创建单例实例
const errorHandler = new ErrorHandler();

module.exports = errorHandler;