const storageManager = require('./utils/storage');
const errorHandler = require('./utils/error-handler');
const performanceMonitor = require('./utils/performance-monitor');

App({
  onLaunch() {
    try {
      // 开始应用启动性能监控
      performanceMonitor.startTiming('app_launch');
      
      // 初始化全局数据
      this.initGlobalData();
      
      // 应用崩溃恢复检查
      errorHandler.crashRecovery();
      
      // 检查存储健康状态
      this.checkStorageHealth();
      
      // 显示首次启动的数据本地存储风险提示
      this.showFirstTimeWarning();
      
      // 执行存储优化
      this.optimizeStorageOnLaunch();
      
      // 检查网络状态（用于离线模式提示）
      this.checkNetworkStatusOnLaunch();
      
      // 结束应用启动性能监控
      performanceMonitor.endTiming('app_launch', 'page');
      
      // 开始定期内存监控
      this.startPerformanceMonitoring();
      
    } catch (error) {
      // 确保性能监控结束
      performanceMonitor.endTiming('app_launch', 'page');
      
      errorHandler.handleError(error, '应用启动', {
        showModal: true,
        recovery: () => {
          // 启动失败时的恢复策略
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/index/index'
            });
          }, 2000);
        }
      });
    }
  },

  onShow() {
    // 应用从后台进入前台时触发
    // 检查是否需要备份
    this.checkBackupNeeded();
  },

  onHide() {
    // 应用从前台进入后台时触发
    // 执行数据优化
    storageManager.optimizeStorage();
  },

  onError(msg) {
    // 应用发生脚本错误或 API 调用报错时触发
    console.error('应用错误:', msg);
    
    // 使用错误处理器统一处理
    errorHandler.handleError(msg, '应用全局错误', {
      showToast: true,
      showModal: false,
      recovery: {
        storage_error: () => {
          // 存储错误恢复策略
          setTimeout(() => {
            wx.showModal({
              title: '数据恢复',
              content: '检测到存储异常，是否尝试恢复数据？',
              success: (res) => {
                if (res.confirm) {
                  storageManager.tryRestoreFromBackup();
                }
              }
            });
          }, 1000);
        },
        default: () => {
          // 默认恢复策略
          console.log('执行默认错误恢复策略');
        }
      }
    });
  },

  onPageNotFound(res) {
    // 页面不存在时触发
    console.error('页面不存在:', res);
    
    wx.showToast({
      title: '页面不存在，返回首页',
      icon: 'none',
      duration: 2000
    });
    
    // 重定向到首页
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }, 2000);
  },

  onUnhandledRejection(res) {
    // 未处理的 Promise 拒绝时触发
    console.error('未处理的Promise拒绝:', res);
    
    errorHandler.handleError(res.reason, 'Promise拒绝', {
      showToast: false,
      showModal: false
    });
  },

  // 检查存储健康状态
  checkStorageHealth() {
    try {
      const healthReport = storageManager.checkStorageHealth();
      
      if (!healthReport.isHealthy) {
        console.warn('存储健康检查发现问题:', healthReport.issues);
        
        // 如果有严重问题，显示提示
        if (healthReport.issues.some(issue => issue.includes('异常') || issue.includes('过高'))) {
          setTimeout(() => {
            wx.showModal({
              title: '存储提醒',
              content: `检测到存储问题：${healthReport.issues[0]}。${healthReport.suggestions[0]}`,
              showCancel: true,
              confirmText: '了解',
              cancelText: '忽略'
            });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('存储健康检查失败:', error);
    }
  },

  // 显示首次启动警告
  showFirstTimeWarning() {
    try {
      const hasShown = storageManager.safeGetStorage('hasShownWarning', false);
      if (!hasShown) {
        wx.showModal({
          title: '重要提醒',
          content: '所有数据仅保存在本机，换机或卸载微信会丢失，请定期导出备份文件！建议每月导出一次。',
          showCancel: false,
          confirmText: '我知道了',
          success: (res) => {
            if (res.confirm) {
              storageManager.safeSetStorage('hasShownWarning', true);
            }
          },
          fail: (error) => {
            console.error('显示警告弹窗失败:', error);
          }
        });
      }
    } catch (error) {
      console.error('显示首次启动警告失败:', error);
    }
  },

  // 启动时优化存储
  optimizeStorageOnLaunch() {
    try {
      // 延迟执行，避免影响启动速度
      setTimeout(() => {
        const optimized = storageManager.optimizeStorage();
        if (optimized) {
          console.log('启动时存储优化完成');
        }
      }, 3000);
    } catch (error) {
      console.error('启动时存储优化失败:', error);
    }
  },

  // 检查是否需要备份
  checkBackupNeeded() {
    try {
      const lastBackupTime = storageManager.safeGetStorage('lastBackupTime', 0);
      const daysSinceBackup = (Date.now() - lastBackupTime) / (24 * 60 * 60 * 1000);
      
      // 如果超过7天未备份，提醒用户
      if (daysSinceBackup > 7) {
        const records = storageManager.safeGetStorage('records', []);
        if (records.length > 0) {
          setTimeout(() => {
            wx.showModal({
              title: '备份提醒',
              content: `您已有${Math.floor(daysSinceBackup)}天未备份数据，建议及时导出备份文件。`,
              showCancel: true,
              confirmText: '去备份',
              cancelText: '稍后',
              success: (res) => {
                if (res.confirm) {
                  wx.switchTab({
                    url: '/pages/export/export'
                  });
                }
              }
            });
          }, 5000);
        }
      }
    } catch (error) {
      errorHandler.handleError(error, '检查备份需求', { showToast: false });
    }
  },

  // 启动时检查网络状态
  async checkNetworkStatusOnLaunch() {
    try {
      const networkStatus = await errorHandler.checkNetworkStatus();
      
      // 记录网络状态（用于离线模式提示）
      this.globalData.networkStatus = networkStatus;
      
      // 如果无网络连接，显示离线模式提示
      if (!networkStatus.isConnected) {
        setTimeout(() => {
          wx.showToast({
            title: '当前离线模式，数据仅本地保存',
            icon: 'none',
            duration: 3000
          });
        }, 1000);
      }
    } catch (error) {
      errorHandler.handleError(error, '网络状态检查', { showToast: false });
    }
  },

  // 获取错误处理器实例
  getErrorHandler() {
    return errorHandler;
  },

  // 显示操作指导
  showOperationGuide(operation) {
    errorHandler.showOperationGuide(operation);
  },

  // 执行系统诊断
  async performSystemDiagnosis() {
    try {
      wx.showLoading({
        title: '系统诊断中...',
        mask: true
      });
      
      const diagnosis = await errorHandler.systemDiagnosis();
      
      wx.hideLoading();
      
      let content = '系统状态正常';
      if (diagnosis.issues.length > 0) {
        content = `发现 ${diagnosis.issues.length} 个问题：\n${diagnosis.issues.join('\n')}\n\n建议：\n${diagnosis.suggestions.join('\n')}`;
      }
      
      wx.showModal({
        title: '系统诊断结果',
        content: content,
        showCancel: diagnosis.issues.length > 0,
        confirmText: '确定',
        cancelText: '查看详情',
        success: (res) => {
          if (!res.confirm && res.cancel) {
            this.showDiagnosisDetails(diagnosis);
          }
        }
      });
      
      return diagnosis;
    } catch (error) {
      wx.hideLoading();
      errorHandler.handleError(error, '系统诊断', { showModal: true });
      return null;
    }
  },

  // 显示诊断详情
  showDiagnosisDetails(diagnosis) {
    const details = [
      `系统版本: ${diagnosis.systemInfo.system || '未知'}`,
      `微信版本: ${diagnosis.systemInfo.version || '未知'}`,
      `存储使用: ${diagnosis.storageInfo.currentSize || 0}KB / ${diagnosis.storageInfo.limitSize || 0}KB`,
      `网络状态: ${diagnosis.networkInfo.isConnected ? diagnosis.networkInfo.networkType : '离线'}`,
      `诊断时间: ${new Date(diagnosis.timestamp).toLocaleString()}`
    ].join('\n');
    
    wx.showModal({
      title: '系统详情',
      content: details,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 初始化全局数据
  initGlobalData() {
    this.globalData = {
      version: '1.0.0',
      storageManager: storageManager,
      performanceMonitor: performanceMonitor,
      storageKeys: {
        records: 'records',
        hasShownWarning: 'hasShownWarning',
        backupData: 'backupData',
        lastBackupTime: 'lastBackupTime'
      }
    };
  },

  // 获取存储管理器实例
  getStorageManager() {
    return storageManager;
  },

  // 获取性能监控器实例
  getPerformanceMonitor() {
    return performanceMonitor;
  },

  // 显示性能报告
  showPerformanceReport() {
    performanceMonitor.showPerformanceReport();
  },

  // 开始定期性能监控
  startPerformanceMonitoring() {
    // 立即执行一次内存监控
    performanceMonitor.monitorMemoryUsage();
    
    // 设置定期监控（每5分钟监控一次内存使用）
    this.performanceInterval = setInterval(() => {
      performanceMonitor.monitorMemoryUsage();
    }, 5 * 60 * 1000);
  },

  // 停止性能监控
  stopPerformanceMonitoring() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
  },

  globalData: {}
}) 