// debug.js
const app = getApp();

Page({
  data: {
    records: [],
    storageInfo: {},
    debugInfo: ''
  },
  
  onLoad() {
    this.loadDebugData();
  },
  
  onPullDownRefresh() {
    this.loadDebugData();
    wx.stopPullDownRefresh();
  },
  
  loadDebugData() {
    try {
      const storageManager = app.getStorageManager();
      if (!storageManager) {
        this.setData({
          debugInfo: '存储管理器未初始化'
        });
        return;
      }
      
      // 获取所有记录
      const records = storageManager.safeGetStorage('records', []);
      
      // 获取存储信息
      const storageInfo = storageManager.getStorageInfo();
      
      this.setData({
        records: records,
        storageInfo: storageInfo,
        debugInfo: '数据加载成功'
      });
    } catch (error) {
      this.setData({
        debugInfo: '加载失败: ' + error.message
      });
    }
  },
  
  clearCache() {
    try {
      const storageManager = app.getStorageManager();
      if (storageManager && storageManager.cache) {
        storageManager.cache.clear();
        storageManager.cacheExpiry.clear();
        
        wx.showToast({
          title: '缓存已清除',
          icon: 'success'
        });
        
        this.loadDebugData();
      }
    } catch (error) {
      wx.showToast({
        title: '清除缓存失败',
        icon: 'none'
      });
    }
  },
  
  optimizeStorage() {
    try {
      const storageManager = app.getStorageManager();
      if (storageManager) {
        const result = storageManager.optimizeStorage();
        
        wx.showToast({
          title: result ? '优化成功' : '无需优化',
          icon: 'success'
        });
        
        this.loadDebugData();
      }
    } catch (error) {
      wx.showToast({
        title: '优化失败',
        icon: 'none'
      });
    }
  },
  
  forceReload() {
    // 强制重新加载所有页面数据
    try {
      // 清除缓存
      const storageManager = app.getStorageManager();
      if (storageManager && storageManager.cache) {
        storageManager.cache.clear();
        storageManager.cacheExpiry.clear();
      }
      
      // 重新加载当前页面
      this.loadDebugData();
      
      wx.showToast({
        title: '强制刷新成功',
        icon: 'success'
      });
      
      // 提示用户返回统计页面
      setTimeout(() => {
        wx.showModal({
          title: '刷新完成',
          content: '请返回统计页面查看是否已更新',
          showCancel: false,
          confirmText: '确定'
        });
      }, 1000);
    } catch (error) {
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }
  }
})