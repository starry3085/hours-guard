const app = getApp();

Page({
  data: {
    today: '',
    todayRecord: {},
    selectedDate: '',
    currentTime: '',
    isToday: true,
    timeInterval: null,
    storageManager: null,
    errorHandler: null,
    isLoading: false,
    systemInfo: {},
    adaptedStyles: {}
  },
  
  onLoad() {
    // 极简初始化，只设置日期和时间
    try {
      // 获取系统信息进行适配
      this.initSystemAdaptation();
      
      // 设置当前日期
      this.setCurrentDate();
      
      // 启动时间更新
      this.startTimeUpdate();
      
      // 不加载数据，不显示任何提示
    } catch (error) {
      console.error('页面初始化失败:', error);
    }
  },
  
  onShow() {
    // 只更新时间，不加载数据
    this.startTimeUpdate();
    
    // 延迟加载数据，避免启动时出错
    setTimeout(() => {
      try {
        // 获取存储管理器
        if (!this.data.storageManager) {
          this.setData({
            storageManager: app.getStorageManager(),
            errorHandler: app.getErrorHandler()
          });
        }
        
        // 加载数据
        this.loadTodayData();
      } catch (e) {
        console.error('延迟加载数据失败:', e);
      }
    }, 2000);
  },

  onHide() {
    this.stopTimeUpdate();
  },

  onUnload() {
    this.stopTimeUpdate();
  },
  
  // 开始时间更新
  startTimeUpdate() {
    this.updateCurrentTime();
    this.data.timeInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 1000);
  },

  // 停止时间更新
  stopTimeUpdate() {
    if (this.data.timeInterval) {
      clearInterval(this.data.timeInterval);
      this.setData({
        timeInterval: null
      });
    }
  },

  // 更新当前时间（优化版本，减少不必要的setData调用）
  updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}:${seconds}`;
    
    // 只有时间真正变化时才更新
    if (this.data.currentTime !== currentTime) {
      this.setData({
        currentTime: currentTime
      });
    }
  },
  
  setCurrentDate() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    this.setData({
      today: today,
      selectedDate: today,
      isToday: true
    });
  },
  
  loadTodayData() {
    const { selectedDate, storageManager } = this.data;
    
    if (!storageManager) {
      console.error('存储管理器未初始化');
      return;
    }
    
    try {
      // 使用存储管理器安全获取记录
      const records = storageManager.safeGetStorage('records', []);
      
      // 查找选中日期的记录
      const todayRecord = records.find(r => r.date === selectedDate) || { date: selectedDate };
      
      // 检查是否为今天
      const today = new Date().toISOString().slice(0, 10);
      const isToday = selectedDate === today;
      
      this.setData({
        todayRecord: todayRecord,
        isToday: isToday
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      
      // 静默失败，不显示错误提示
      // 尝试设置一个空记录，以便页面能够正常显示
      this.setData({
        todayRecord: { date: selectedDate },
        isToday: selectedDate === new Date().toISOString().slice(0, 10)
      });
      
      // 延迟重试
      setTimeout(() => {
        try {
          this.loadTodayData();
        } catch (e) {
          // 忽略错误
        }
      }, 2000);
    }
  },

  // 检查离线模式
  checkOfflineMode() {
    // 不显示任何提示，避免干扰用户
    console.log('应用处于离线模式，数据仅本地保存');
  },
  
  // 日期变更
  onDateChange(e) {
    const selectedDate = e.detail.value;
    const today = new Date().toISOString().slice(0, 10);
    const isToday = selectedDate === today;
    
    this.setData({
      selectedDate: selectedDate,
      isToday: isToday
    }, () => {
      this.loadTodayData();
    });
  },
  
  async checkIn() {
    const { selectedDate, isToday, storageManager, isLoading } = this.data;
    
    // 防止重复操作
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
      // 获取当前时间或选择的时间
      let timeStr;
      if (isToday) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
      } else {
        // 对于历史日期，使用默认时间或让用户选择
        timeStr = '09:00';
      }
      
      // 使用存储管理器安全获取记录
      const records = storageManager.safeGetStorage('records', []);
      
      // 查找选中日期的记录索引
      const idx = records.findIndex(r => r.date === selectedDate);
      
      // 如果已有选中日期的记录，更新上班时间；否则添加新记录
      if (idx >= 0) {
        records[idx].on = timeStr;
      } else {
        records.push({
          date: selectedDate,
          on: timeStr
        });
      }
      
      // 使用存储管理器安全保存
      const success = storageManager.safeSetStorage('records', records);
      
      if (!success) {
        throw new Error('数据保存失败');
      }
      
      // 显示成功提示
      wx.showToast({
        title: isToday ? '已上班打卡' : '已补录上班时间',
        icon: 'success'
      });
      
      // 更新页面数据
      this.loadTodayData();
      
      // 直接更新当前页面数据状态，确保UI立即反映变化
      const updatedRecord = {...this.data.todayRecord, on: timeStr};
      this.setData({
        todayRecord: updatedRecord
      });
      
    } catch (error) {
      console.error('上班打卡操作失败:', error);
      
      // 静默失败，不使用错误处理器
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none',
        duration: 1500
      });
      
      // 尝试重新加载数据
      setTimeout(() => {
        try {
          this.loadTodayData();
        } catch (e) {
          // 忽略错误
        }
      }, 1000);
    } finally {
      this.setData({ isLoading: false });
    }
  },
  
  async checkOut() {
    const { selectedDate, isToday, todayRecord, storageManager, isLoading } = this.data;
    
    // 检查是否已上班打卡
    if (!todayRecord.on) {
      wx.showToast({
        title: '请先上班打卡',
        icon: 'none'
      });
      return;
    }
    
    // 防止重复操作
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
      // 获取当前时间或选择的时间
      let timeStr;
      if (isToday) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
      } else {
        // 对于历史日期，使用默认时间
        timeStr = '18:00';
      }
      
      // 使用存储管理器安全获取记录
      const records = storageManager.safeGetStorage('records', []);
      
      // 查找选中日期的记录索引
      const idx = records.findIndex(r => r.date === selectedDate);
      
      if (idx >= 0) {
        records[idx].off = timeStr;
        
        // 使用存储管理器安全保存
        const success = storageManager.safeSetStorage('records', records);
        
        if (!success) {
          throw new Error('数据保存失败');
        }
      } else {
        throw new Error('记录不存在，请先上班打卡');
      }
      
      // 显示成功提示
      wx.showToast({
        title: isToday ? '已下班打卡' : '已补录下班时间',
        icon: 'success'
      });
      
      // 更新页面数据
      this.loadTodayData();
      
      // 直接更新当前页面数据状态，确保UI立即反映变化
      const updatedRecord = {...this.data.todayRecord, off: timeStr};
      this.setData({
        todayRecord: updatedRecord
      });
      
    } catch (error) {
      console.error('下班打卡操作失败:', error);
      
      // 静默失败，不使用错误处理器
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none',
        duration: 1500
      });
      
      // 尝试重新加载数据
      setTimeout(() => {
        try {
          this.loadTodayData();
        } catch (e) {
          // 忽略错误
        }
      }, 1000);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 编辑时间功能已移除

  // 显示操作指导
  onShowGuide() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      errorHandler.showOperationGuide('punch_in');
    } else {
      app.showOperationGuide('punch_in');
    }
  },

  // 长按显示更多选项
  onLongPress() {
    wx.showActionSheet({
      itemList: ['操作指导', '检查网络状态', '系统诊断'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onShowGuide();
            break;
          case 1:
            this.checkNetworkStatus();
            break;
          case 2:
            this.performDiagnosis();
            break;
        }
      }
    });
  },

  // 检查网络状态
  async checkNetworkStatus() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      await errorHandler.showNetworkStatus();
    }
  },

  // 执行系统诊断
  async performDiagnosis() {
    await app.performSystemDiagnosis();
  },
  
  // 切换打卡模式（今日打卡/补录打卡）
  toggleMode() {
    const { isToday, today } = this.data;
    
    if (isToday) {
      // 当前是今日打卡模式，切换到补录打卡模式
      // 选择一个默认的历史日期（前一天）
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      this.setData({
        selectedDate: yesterdayStr,
        isToday: false
      }, () => {
        this.loadTodayData();
      });
      
      wx.showToast({
        title: '已切换到补录打卡模式',
        icon: 'none',
        duration: 1500
      });
    } else {
      // 当前是补录打卡模式，切换到今日打卡模式
      this.setData({
        selectedDate: today,
        isToday: true
      }, () => {
        this.loadTodayData();
      });
      
      wx.showToast({
        title: '已切换到今日打卡模式',
        icon: 'none',
        duration: 1500
      });
    }
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
      
      console.log('首页系统适配完成:', { systemInfo, adaptedStyles });
    } catch (error) {
      console.error('系统适配初始化失败:', error);
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
      
      // 按钮尺寸适配
      buttonHeight: screenType === 'long' ? '88rpx' : '80rpx',
      buttonFontSize: windowWidth < 350 ? '30rpx' : '32rpx',
      
      // 标题字体大小适配
      titleFontSize: windowWidth < 350 ? '48rpx' : windowWidth > 400 ? '60rpx' : '56rpx',
      
      // 时间显示字体大小适配
      timeFontSize: windowWidth < 350 ? '36rpx' : '42rpx',
      
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
      buttonHeight: '80rpx',
      buttonFontSize: '32rpx',
      titleFontSize: '56rpx',
      timeFontSize: '42rpx',
      cardMargin: '20rpx',
      cardPadding: '30rpx',
      isLongScreen: false,
      isSmallScreen: false,
      isLargeScreen: false
    };
  }
}) 