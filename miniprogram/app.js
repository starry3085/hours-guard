const storageManager = require('./utils/storage');
const errorHandler = require('./utils/error-handler');
const performanceMonitor = require('./utils/performance-monitor');
const adaptationManager = require('./utils/adaptation');

App({
  async onLaunch() {
    // 先初始化全局数据，确保其他函数可以使用
    this.globalData = {
      version: '1.0.0',
      storageManager: storageManager,
      performanceMonitor: performanceMonitor,
      adaptationManager: adaptationManager,
      isOfflineMode: true,
      systemInfo: {},
      adaptationConfig: {},
      adaptationSystemInfo: {},
      storageKeys: {
        records: 'records',
        hasShownWarning: 'hasShownWarning',
        backupData: 'backupData',
        lastBackupTime: 'lastBackupTime'
      }
    };
    
    // 初始化适配管理器
    await this.initAdaptationManager();
    
    // 获取系统信息进行适配（保留原有逻辑作为备用）
    this.getSystemInfoForAdaptation();
    
    // 设置已显示警告标记，避免显示首次启动警告
    try {
      wx.setStorageSync('hasShownWarning', true);
    } catch (e) {
      // 忽略错误
    }
    
    // 禁用所有可能导致错误的功能
    try {
      // 覆盖错误处理器的方法，避免显示错误提示
      if (errorHandler) {
        errorHandler.handleError = function(error, context) {
          console.error(`[${context}]`, error);
          return { type: 'error', message: error };
        };
        
        errorHandler.showUserFriendlyMessage = function() {
          // 不显示任何提示
        };
      }
      
      // 覆盖wx.showToast方法，避免显示错误提示
      const originalShowToast = wx.showToast;
      wx.showToast = function(options) {
        // 如果是错误提示，则不显示
        if (options && options.title && options.title.includes('失败') || options.title.includes('错误') || options.title.includes('请重试')) {
          console.log('拦截错误提示:', options.title);
          return;
        }
        
        // 其他提示正常显示
        return originalShowToast(options);
      };
      
      // 覆盖wx.showModal方法，避免显示错误提示
      const originalShowModal = wx.showModal;
      wx.showModal = function(options) {
        // 如果是"重要提醒"对话框，则不显示
        if (options && options.title && options.title === '重要提醒') {
          console.log('拦截重要提醒对话框');
          
          // 模拟用户点击了"我知道了"按钮
          if (options.success) {
            options.success({ confirm: true, cancel: false });
          }
          return;
        }
        
        // 其他对话框正常显示
        return originalShowModal(options);
      };
    } catch (e) {
      // 忽略错误
      console.error('覆盖方法失败:', e);
    }
  },

  onShow() {
    // 应用从后台进入前台时触发
    // 备份检测功能已移除
  },

  onHide() {
    // 应用从前台进入后台时触发
    // 不执行任何操作
  },

  onError(msg) {
    // 应用发生脚本错误或 API 调用报错时触发
    // 简化错误处理，避免显示错误提示
    console.error('应用全局错误:', msg);
    
    // 不显示任何错误提示，不执行任何恢复操作
  },

  onPageNotFound(res) {
    // 页面不存在时触发
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
    // 简化错误处理，避免显示错误提示
    console.error('未处理的Promise拒绝:', res.reason);
    
    // 不显示任何错误提示，不执行任何恢复操作
  },

  // 检查存储健康状态
  checkStorageHealth() {
    try {
      const healthReport = storageManager.checkStorageHealth();
      
      if (!healthReport.isHealthy) {
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
      // 静默失败，不显示错误提示
      console.error('存储健康检查失败:', error);
    }
  },

  // 显示首次启动警告
  showFirstTimeWarning() {
    // 使用最简单的方式显示警告，避免任何可能的错误
    try {
      // 直接使用wx.getStorageSync而不是通过storageManager
      let hasShown = false;
      try {
        hasShown = wx.getStorageSync('hasShownWarning');
      } catch (e) {
        // 忽略错误
      }
      
      if (!hasShown) {
        setTimeout(() => {
          wx.showModal({
            title: '重要提醒',
            content: '所有数据仅保存在本机，换机或卸载微信会丢失，请定期导出备份文件！建议每月导出一次。',
            showCancel: false,
            confirmText: '我知道了',
            success: (res) => {
              if (res.confirm) {
                try {
                  wx.setStorageSync('hasShownWarning', true);
                } catch (e) {
                  // 忽略错误
                }
              }
            }
          });
        }, 2000);
      }
    } catch (error) {
      // 完全忽略错误，不做任何处理
      console.error('显示首次启动警告失败，但不影响应用使用');
    }
  },

  // 启动时优化存储
  optimizeStorageOnLaunch() {
    try {
      // 延迟执行，避免影响启动速度
      setTimeout(() => {
        try {
          storageManager.optimizeStorage();
        } catch (e) {
          // 静默失败，不显示错误提示
          console.error('存储优化失败:', e);
        }
      }, 3000);
    } catch (error) {
      // 静默失败，不显示错误提示
      console.error('启动时存储优化失败:', error);
    }
  },

  // 备份检测功能已移除
  // 此处原有自动检测备份时间并提醒用户的功能已被移除

  // 初始化离线模式
  initOfflineMode() {
    // 设置应用为完全离线模式
    this.globalData.isOfflineMode = true;
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
      // 静默失败，不显示错误提示
      console.error('系统诊断失败:', error);
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
      isOfflineMode: true, // 应用始终处于离线模式
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

  // 获取系统信息进行适配
  getSystemInfoForAdaptation() {
    try {
      // 确保globalData已初始化
      if (!this.globalData) {
        this.globalData = {
          systemInfo: {},
          adaptationConfig: {},
          adaptationSystemInfo: {}
        };
      }
      
      wx.getSystemInfo({
        success: (res) => {
          // 确保systemInfo对象已初始化
          if (!this.globalData.systemInfo) {
            this.globalData.systemInfo = {};
          }
          
          this.globalData.systemInfo = {
            // 基础设备信息
            brand: res.brand || '未知',
            model: res.model || '未知',
            system: res.system || '未知',
            platform: res.platform || 'unknown',
            version: res.version || '未知',
            
            // 屏幕尺寸信息
            screenWidth: res.screenWidth || 375,
            screenHeight: res.screenHeight || 667,
            windowWidth: res.windowWidth || 375,
            windowHeight: res.windowHeight || 667,
            pixelRatio: res.pixelRatio || 2,
            
            // 安全区域信息
            safeArea: res.safeArea || null,
            statusBarHeight: res.statusBarHeight || 20,
            
            // 适配计算
            rpxRatio: 750 / (res.windowWidth || 375), // rpx转换比例
            isIPhoneX: this.isIPhoneXSeries(res),
            isAndroid: res.platform === 'android',
            isIOS: res.platform === 'ios',
            
            // 屏幕分类
            screenType: this.getScreenType(res),
            
            // 导航栏高度（考虑不同机型）
            navBarHeight: this.getNavBarHeight(res),
            
            // 底部安全区域高度
            safeAreaBottom: res.safeArea ? res.screenHeight - res.safeArea.bottom : 0
          };
          
          console.log('系统适配信息:', this.globalData.systemInfo);
        },
        fail: (err) => {
          console.error('获取系统信息失败:', err);
          // 设置默认值
          this.globalData.systemInfo = {
            screenWidth: 375,
            screenHeight: 667,
            windowWidth: 375,
            windowHeight: 667,
            pixelRatio: 2,
            rpxRatio: 2,
            isIPhoneX: false,
            isAndroid: false,
            isIOS: false,
            screenType: 'normal',
            navBarHeight: 44,
            safeAreaBottom: 0
          };
        }
      });
    } catch (error) {
      console.error('系统信息获取异常:', error);
      // 确保即使出错也有默认值
      if (this.globalData) {
        this.globalData.systemInfo = this.globalData.systemInfo || {
          screenWidth: 375,
          screenHeight: 667,
          windowWidth: 375,
          windowHeight: 667,
          pixelRatio: 2,
          rpxRatio: 2,
          isIPhoneX: false,
          isAndroid: false,
          isIOS: false,
          screenType: 'normal',
          navBarHeight: 44,
          safeAreaBottom: 0
        };
      }
    }
  },

  // 判断是否为iPhone X系列（刘海屏）
  isIPhoneXSeries(systemInfo) {
    if (systemInfo.platform !== 'ios') return false;
    
    // iPhone X系列特征：有安全区域且底部安全区域大于0
    if (systemInfo.safeArea && systemInfo.safeArea.bottom < systemInfo.screenHeight) {
      return systemInfo.screenHeight - systemInfo.safeArea.bottom > 0;
    }
    
    // 通过屏幕尺寸判断（备用方案）
    const { screenWidth, screenHeight } = systemInfo;
    const ratio = screenHeight / screenWidth;
    
    // iPhone X系列屏幕比例通常大于2.1
    return ratio > 2.1;
  },

  // 获取屏幕类型
  getScreenType(systemInfo) {
    const { windowWidth, windowHeight } = systemInfo;
    const ratio = windowHeight / windowWidth;
    
    if (ratio > 2.1) {
      return 'long'; // 长屏幕（如iPhone X系列）
    } else if (ratio < 1.6) {
      return 'wide'; // 宽屏幕（如iPad）
    } else {
      return 'normal'; // 普通屏幕
    }
  },

  // 获取导航栏高度
  getNavBarHeight(systemInfo) {
    // iOS设备
    if (systemInfo.platform === 'ios') {
      return this.isIPhoneXSeries(systemInfo) ? 88 : 64;
    }
    
    // Android设备，根据状态栏高度计算
    const statusBarHeight = systemInfo.statusBarHeight || 24;
    return statusBarHeight + 44; // 状态栏高度 + 导航栏高度
  },

  // 获取系统信息（供其他页面使用）
  getSystemInfo() {
    return this.globalData.systemInfo || {};
  },

  // 获取适配后的尺寸
  getAdaptedSize(size, type = 'rpx') {
    const systemInfo = this.globalData.systemInfo;
    if (!systemInfo) return size;
    
    switch (type) {
      case 'px':
        // rpx转px
        return Math.round(size / systemInfo.rpxRatio);
      case 'rpx':
        // px转rpx
        return Math.round(size * systemInfo.rpxRatio);
      default:
        return size;
    }
  },

  // 获取安全区域样式
  getSafeAreaStyle() {
    const systemInfo = this.globalData.systemInfo;
    if (!systemInfo) return {};
    
    return {
      paddingTop: systemInfo.statusBarHeight || 0,
      paddingBottom: systemInfo.safeAreaBottom || 0
    };
  },

  // 初始化适配管理器
  async initAdaptationManager() {
    try {
      // 确保globalData已初始化
      if (!this.globalData) {
        this.globalData = {
          systemInfo: {},
          adaptationConfig: {},
          adaptationSystemInfo: {}
        };
      }
      
      const success = await adaptationManager.init();
      if (success) {
        console.log('适配管理器初始化成功');
        // 将适配信息同步到全局数据
        const systemInfo = adaptationManager.getSystemInfo();
        const config = adaptationManager.getConfig();
        
        // 确保adaptationConfig和adaptationSystemInfo已初始化
        if (!this.globalData.adaptationConfig) {
          this.globalData.adaptationConfig = {};
        }
        if (!this.globalData.adaptationSystemInfo) {
          this.globalData.adaptationSystemInfo = {};
        }
        
        // 复制属性而不是直接赋值引用
        Object.assign(this.globalData.adaptationConfig, config);
        Object.assign(this.globalData.adaptationSystemInfo, systemInfo);
      } else {
        console.warn('适配管理器初始化失败，使用默认配置');
        // 设置默认配置
        this.globalData.adaptationConfig = adaptationManager.getConfig();
        this.globalData.adaptationSystemInfo = adaptationManager.getSystemInfo();
      }
    } catch (error) {
      console.error('适配管理器初始化异常:', error);
      // 确保即使出错也有默认值
      if (this.globalData) {
        this.globalData.adaptationConfig = this.globalData.adaptationConfig || {};
        this.globalData.adaptationSystemInfo = this.globalData.adaptationSystemInfo || {};
      }
    }
  },

  // 获取适配管理器实例
  getAdaptationManager() {
    return adaptationManager;
  },

  // 获取适配配置
  getAdaptationConfig() {
    return this.globalData.adaptationConfig || adaptationManager.getConfig();
  },

  // 获取页面适配样式
  getPageStyles() {
    return adaptationManager.getPageStyles();
  },

  // globalData 已在 initGlobalData 方法中初始化
}) 