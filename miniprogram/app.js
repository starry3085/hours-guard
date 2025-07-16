const storageManager = require('./utils/storage');

App({
  onLaunch() {
    // 初始化全局数据
    this.initGlobalData();
    
    // 检查存储健康状态
    this.checkStorageHealth();
    
    // 显示首次启动的数据本地存储风险提示
    this.showFirstTimeWarning();
    
    // 执行存储优化
    this.optimizeStorageOnLaunch();
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
    
    // 记录错误信息到本地（用于调试）
    try {
      const errorLog = storageManager.safeGetStorage('errorLog', []);
      errorLog.push({
        message: msg,
        timestamp: new Date().toISOString(),
        version: this.globalData.version
      });
      
      // 只保留最近10条错误记录
      if (errorLog.length > 10) {
        errorLog.splice(0, errorLog.length - 10);
      }
      
      storageManager.safeSetStorage('errorLog', errorLog);
    } catch (error) {
      console.error('记录错误日志失败:', error);
    }
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
      console.error('检查备份需求失败:', error);
    }
  },

  // 初始化全局数据
  initGlobalData() {
    this.globalData = {
      version: '1.0.0',
      storageManager: storageManager,
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

  globalData: {}
}) 