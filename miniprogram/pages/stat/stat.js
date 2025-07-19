const app = getApp();

Page({
  data: {
    list: [],
    currentMonth: '',
    showPicker: false,
    pickerType: '',
    pickerDate: '',
    pickerValue: [9, 0],
    hours: Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')),
    minutes: Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0')),
    monthCache: null,
    lastUpdateTime: 0,
    storageManager: null,
    errorHandler: null,
    isLoading: false,
    systemInfo: {},
    adaptedStyles: {}
  },
  
  onLoad() {
    try {
      // 获取系统信息进行适配
      this.initSystemAdaptation();
      
      // 获取存储管理器和错误处理器实例
      this.setData({
        storageManager: app.getStorageManager(),
        errorHandler: app.getErrorHandler()
      });
    } catch (error) {
      const errorHandler = app.getErrorHandler();
      errorHandler.handleError(error, '统计页面初始化', {
        showModal: true,
        recovery: () => {
          setTimeout(() => {
            this.onLoad();
          }, 1000);
        }
      });
    }
  },
  
  onShow() {
    this.loadMonthData();
  },

  onPullDownRefresh() {
    // 清除缓存，强制重新加载
    this.setData({ 
      monthCache: null,
      lastUpdateTime: 0 
    });
    this.loadMonthData();
    wx.stopPullDownRefresh();
  },
  
  // 工作时长相关函数已移除

  // 编辑时间
  onEditTime(e) {
    const { date, type } = e.currentTarget.dataset;
    const record = this.data.list.find(item => item.date === date);
    const currentValue = record ? record[type] : null;
    
    let currentHour = 9;
    let currentMinute = 0;
    
    if (currentValue) {
      const [h, m] = currentValue.split(':');
      currentHour = parseInt(h);
      currentMinute = parseInt(m);
    } else {
      // 默认时间：上班9:00，下班18:00
      currentHour = type === 'on' ? 9 : 18;
      currentMinute = 0;
    }
    
    this.setData({
      showPicker: true,
      pickerType: type,
      pickerDate: date,
      pickerValue: [currentHour, currentMinute]
    });
  },

  // 时间选择器变化
  onPickerChange(e) {
    const [hourIndex, minuteIndex] = e.detail.value;
    this.setData({
      pickerValue: [hourIndex, minuteIndex]
    });
  },

  // 确认时间修改
  onPickerConfirm() {
    const { pickerType, pickerDate, pickerValue } = this.data;
    const [hourIndex, minuteIndex] = pickerValue;
    const newTime = `${this.data.hours[hourIndex]}:${this.data.minutes[minuteIndex]}`;
    
    this.updateRecord(pickerDate, pickerType, newTime);
    this.setData({ showPicker: false });
  },

  // 取消时间修改
  onPickerCancel() {
    this.setData({ showPicker: false });
  },

  // 更新记录
  async updateRecord(date, type, newTime) {
    const { storageManager, errorHandler, isLoading } = this.data;
    
    if (isLoading) {
      wx.showToast({
        title: '操作进行中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isLoading: true });
    
    try {
      // 使用错误处理器的重试机制
      await errorHandler.withRetry(async () => {
        const allRecords = storageManager.safeGetStorage('records', []);
        const recordIndex = allRecords.findIndex(r => r.date === date);
        
        if (recordIndex >= 0) {
          allRecords[recordIndex][type] = newTime;
        } else {
          const newRecord = { date };
          newRecord[type] = newTime;
          allRecords.push(newRecord);
        }
        
        const success = storageManager.safeSetStorage('records', allRecords);
        
        if (!success) {
          throw new Error('数据保存失败');
        }
        
        return { date, type, newTime };
      }, {
        maxRetries: 2,
        context: '更新统计记录',
        onRetry: (error, attempt) => {
          // 静默重试
        }
      });
      
      // 清除缓存，强制重新计算
      this.setData({ 
        monthCache: null,
        lastUpdateTime: 0 
      });
      this.loadMonthData();
      
      wx.showToast({
        title: '修改成功',
        icon: 'success'
      });
      
    } catch (error) {
      errorHandler.handleError(error, '更新统计记录', {
        showToast: true,
        recovery: () => {
          // 恢复策略：重新加载数据
          this.loadMonthData();
        }
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 删除记录
  onDeleteRecord(e) {
    const { date } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除 ${date} 的打卡记录吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteRecord(date);
        }
      }
    });
  },

  async deleteRecord(date) {
    const { storageManager, errorHandler, isLoading } = this.data;
    
    if (isLoading) {
      wx.showToast({
        title: '操作进行中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isLoading: true });
    
    try {
      // 使用错误处理器的重试机制
      await errorHandler.withRetry(async () => {
        const allRecords = storageManager.safeGetStorage('records', []);
        const filteredRecords = allRecords.filter(r => r.date !== date);
        
        const success = storageManager.safeSetStorage('records', filteredRecords);
        
        if (!success) {
          throw new Error('数据保存失败');
        }
        
        return { deletedDate: date, remainingCount: filteredRecords.length };
      }, {
        maxRetries: 2,
        context: '删除统计记录',
        onRetry: (error, attempt) => {
          // 静默重试
        }
      });
      
      // 清除缓存，强制重新计算
      this.setData({ 
        monthCache: null,
        lastUpdateTime: 0 
      });
      this.loadMonthData();
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
    } catch (error) {
      errorHandler.handleError(error, '删除统计记录', {
        showToast: true,
        recovery: () => {
          // 恢复策略：重新加载数据
          this.loadMonthData();
        }
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载月度数据
  loadMonthData() {
    const { storageManager, errorHandler } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const currentTime = Date.now();
      
      // 检查缓存是否有效（5分钟内）
      if (this.data.monthCache && 
          this.data.monthCache.month === `${year}-${month.toString().padStart(2, '0')}` &&
          currentTime - this.data.lastUpdateTime < 5 * 60 * 1000) {
        return;
      }
      
      const currentMonth = `${year}年${month}月`;
      const allRecords = storageManager.safeGetStorage('records', []);
      
      // 筛选当月记录
      const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`;
      const monthRecords = allRecords.filter(record => record.date && record.date.indexOf(monthPrefix) === 0);
      
      // 按日期倒序排序（最新日期在前）
      monthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 不再添加周几信息
      const recordsWithWeekday = monthRecords.map(record => {
        return {
          ...record,
          weekday: '' // 设置为空字符串，不显示周几
        };
      });
      
      // 更新数据和缓存
      this.setData({
        list: recordsWithWeekday,
        currentMonth: currentMonth,
        monthCache: {
          month: monthPrefix,
          data: recordsWithWeekday
        },
        lastUpdateTime: currentTime
      });
      
    } catch (error) {
      if (errorHandler) {
        errorHandler.handleError(error, '加载统计数据', {
          showToast: true,
          recovery: () => {
            // 恢复策略：清除缓存后重试
            this.setData({ 
              monthCache: null,
              lastUpdateTime: 0 
            });
            setTimeout(() => {
              this.loadMonthData();
            }, 1000);
          }
        });
      } else {
        console.error('加载月度数据失败:', error);
        wx.showToast({
          title: '数据加载失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 显示操作指导
  onShowGuide() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      errorHandler.showOperationGuide('statistics');
    } else {
      app.showOperationGuide('statistics');
    }
  },

  // 长按显示更多选项
  onLongPress() {
    wx.showActionSheet({
      itemList: ['操作指导', '清理历史数据', '系统诊断'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onShowGuide();
            break;
          case 1:
            this.showCleanupOptions();
            break;
          case 2:
            this.performDiagnosis();
            break;
        }
      }
    });
  },

  // 显示清理选项
  showCleanupOptions() {
    wx.showActionSheet({
      itemList: ['清理30天前数据', '清理90天前数据', '清理一年前数据'],
      success: (res) => {
        const daysToKeep = [30, 90, 365][res.tapIndex];
        this.confirmCleanup(daysToKeep);
      }
    });
  },

  // 确认清理数据
  confirmCleanup(daysToKeep) {
    wx.showModal({
      title: '确认清理',
      content: `确定要清理${daysToKeep}天前的数据吗？此操作不可恢复。`,
      success: (res) => {
        if (res.confirm) {
          this.cleanupOldData(daysToKeep);
        }
      }
    });
  },

  // 清理历史数据
  async cleanupOldData(daysToKeep) {
    const { storageManager, errorHandler } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({
        title: '清理数据中...',
        mask: true
      });
      
      const cleanedCount = storageManager.cleanupOldData(daysToKeep);
      
      wx.hideLoading();
      
      if (cleanedCount > 0) {
        wx.showToast({
          title: `已清理${cleanedCount}条记录`,
          icon: 'success'
        });
        
        // 清除缓存并重新加载
        this.setData({ 
          monthCache: null,
          lastUpdateTime: 0 
        });
        this.loadMonthData();
      } else {
        wx.showToast({
          title: '没有需要清理的数据',
          icon: 'none'
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      if (errorHandler) {
        errorHandler.handleError(error, '清理历史数据', {
          showModal: true
        });
      } else {
        wx.showToast({
          title: '清理失败',
          icon: 'none'
        });
      }
    }
  },

  // 执行系统诊断
  async performDiagnosis() {
    await app.performSystemDiagnosis();
  },

  // 初始化系统适配
  initSystemAdaptation() {
    try {
      // 获取应用全局的系统信息
      const systemInfo = app.getSystemInfo();
      
      // 计算适配样式
      const adaptedStyles = this.calculateAdaptedStyles(systemInfo);
      
      this.setData({
        systemInfo: systemInfo,
        adaptedStyles: adaptedStyles
      });
      
      console.log('统计页面系统适配完成:', { systemInfo, adaptedStyles });
    } catch (error) {
      console.error('统计页面系统适配初始化失败:', error);
      // 设置默认适配样式
      this.setData({
        systemInfo: {},
        adaptedStyles: this.getDefaultAdaptedStyles()
      });
    }
  },

  // 计算适配样式
  calculateAdaptedStyles(systemInfo) {
    if (!systemInfo || !systemInfo.windowWidth) {
      return this.getDefaultAdaptedStyles();
    }

    const { windowWidth, windowHeight, isIPhoneX, screenType, safeAreaBottom } = systemInfo;
    
    return {
      // 页面容器底部间距（考虑安全区域和tabBar）
      pageBottomPadding: `calc(110rpx + ${safeAreaBottom || 0}px)`,
      
      // 列表项高度适配
      listItemHeight: screenType === 'long' ? '120rpx' : '100rpx',
      
      // 字体大小适配
      titleFontSize: windowWidth < 350 ? '48rpx' : windowWidth > 400 ? '60rpx' : '56rpx',
      dateFontSize: windowWidth < 350 ? '30rpx' : '34rpx',
      timeFontSize: windowWidth < 350 ? '30rpx' : '34rpx',
      
      // 时间选择器适配
      pickerHeight: windowWidth < 350 ? '350rpx' : '400rpx',
      pickerItemHeight: windowWidth < 350 ? '70rpx' : '80rpx',
      
      // 卡片间距适配
      cardMargin: windowWidth < 350 ? '16rpx' : '20rpx',
      cardPadding: windowWidth < 350 ? '24rpx' : '30rpx',
      
      // 是否为长屏幕
      isLongScreen: screenType === 'long',
      
      // 是否为小屏幕
      isSmallScreen: windowWidth < 350,
      
      // 是否为大屏幕
      isLargeScreen: windowWidth > 400
    };
  },

  // 获取默认适配样式
  getDefaultAdaptedStyles() {
    return {
      pageBottomPadding: '110rpx',
      listItemHeight: '100rpx',
      titleFontSize: '56rpx',
      dateFontSize: '34rpx',
      timeFontSize: '34rpx',
      pickerHeight: '400rpx',
      pickerItemHeight: '80rpx',
      cardMargin: '20rpx',
      cardPadding: '30rpx',
      isLongScreen: false,
      isSmallScreen: false,
      isLargeScreen: false
    };
  },

  // 统计数据计算功能已移除
})