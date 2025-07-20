const app = getApp();

Page({
  data: {
    list: [],
    currentMonth: '',
    weeklyStats: {
      totalHours: '0小时',
      avgHours: '0小时'
    },
    monthlyStats: {
      avgHours: '0小时',
      workDays: '0天'
    },
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
    // 清除缓存，确保显示最新数据
    this.setData({ 
      monthCache: null,
      lastUpdateTime: 0 
    });
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
  
  // 计算工作时长
  calculateWorkHours(onTime, offTime) {
    if (!onTime || !offTime) return null;
    
    try {
      const [onHour, onMinute] = onTime.split(':').map(Number);
      const [offHour, offMinute] = offTime.split(':').map(Number);
      
      const onTotalMinutes = onHour * 60 + onMinute;
      const offTotalMinutes = offHour * 60 + offMinute;
      
      if (offTotalMinutes <= onTotalMinutes) return null;
      
      const totalMinutes = offTotalMinutes - onTotalMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours === 0) {
        return `${minutes}分钟`;
      } else if (minutes === 0) {
        return `${hours}小时`;
      } else {
        return `${hours}小时${minutes}分钟`;
      }
    } catch (error) {
      console.error('计算工作时长失败:', error);
      return null;
    }
  },

  // 格式化显示日期（去掉年份）
  formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    
    try {
      // 输入格式：2025-07-20
      // 输出格式：07-20
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[1]}-${parts[2]}`;
      }
      return dateStr;
    } catch (error) {
      console.error('格式化日期失败:', error);
      return dateStr;
    }
  },

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
      // 延迟重试，等待存储管理器初始化
      setTimeout(() => {
        const newStorageManager = app.getStorageManager();
        if (newStorageManager) {
          this.setData({ storageManager: newStorageManager });
          this.loadMonthData();
        } else {
          wx.showToast({
            title: '系统初始化中，请稍后',
            icon: 'none'
          });
        }
      }, 1000);
      return;
    }
    
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const currentTime = Date.now();
      
      // 强制跳过缓存检查，确保获取最新数据
      const currentMonth = `${year}年${month}月`;
      const allRecords = storageManager.safeGetStorage('records', []);
      
      console.log('统计页面加载数据:', { 
        totalRecords: allRecords.length, 
        currentMonth,
        allRecords: allRecords.slice(0, 5) // 只打印前5条用于调试
      });
      
      // 筛选当月记录
      const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`;
      const monthRecords = allRecords.filter(record => {
        return record && record.date && record.date.startsWith(monthPrefix);
      });
      
      console.log('当月记录筛选结果:', { 
        monthPrefix, 
        monthRecordsCount: monthRecords.length,
        monthRecords: monthRecords
      });
      
      // 按日期倒序排序（最新日期在前）
      monthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 处理记录数据
      const processedRecords = monthRecords.map(record => {
        const workHours = this.calculateWorkHours(record.on, record.off);
        return {
          date: record.date,
          displayDate: this.formatDisplayDate(record.date), // 格式化显示日期（去掉年份）
          on: record.on || null,
          off: record.off || null,
          workHours: workHours, // 计算的工作时长
          weekday: '' // 不显示周几
        };
      });
      
      // 计算统计数据
      const stats = this.calculateStats(processedRecords, now);
      
      // 更新数据和缓存
      this.setData({
        list: processedRecords,
        currentMonth: currentMonth,
        weeklyStats: stats.weekly,
        monthlyStats: stats.monthly,
        monthCache: {
          month: monthPrefix,
          data: processedRecords
        },
        lastUpdateTime: currentTime
      });
      
      console.log('统计页面数据更新完成:', { 
        listLength: processedRecords.length,
        currentMonth,
        stats
      });
      
    } catch (error) {
      console.error('加载月度数据失败:', error);
      
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
        wx.showToast({
          title: '数据加载失败，请重试',
          icon: 'none',
          duration: 2000
        });
        
        // 设置空数据，避免页面显示异常
        this.setData({
          list: [],
          currentMonth: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`
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
      itemList: ['操作指导', '查看存储数据', '强制刷新', '清理历史数据', '系统诊断'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onShowGuide();
            break;
          case 1:
            this.showStorageData();
            break;
          case 2:
            this.forceRefresh();
            break;
          case 3:
            this.showCleanupOptions();
            break;
          case 4:
            this.performDiagnosis();
            break;
        }
      }
    });
  },

  // 查看存储数据（调试用）
  showStorageData() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '存储管理器未初始化',
        icon: 'none'
      });
      return;
    }

    try {
      const allRecords = storageManager.safeGetStorage('records', []);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      
      let debugInfo = `存储调试信息:\n\n`;
      debugInfo += `总记录数: ${allRecords.length}\n`;
      debugInfo += `当前月份: ${currentMonth}\n\n`;
      
      if (allRecords.length > 0) {
        debugInfo += `最近5条记录:\n`;
        allRecords.slice(-5).forEach((record, index) => {
          debugInfo += `${index + 1}. ${record.date} - 上班:${record.on || '无'} 下班:${record.off || '无'}\n`;
        });
        
        const currentMonthRecords = allRecords.filter(r => r.date && r.date.startsWith(currentMonth));
        debugInfo += `\n当月记录数: ${currentMonthRecords.length}\n`;
        
        if (currentMonthRecords.length > 0) {
          debugInfo += `当月记录:\n`;
          currentMonthRecords.forEach((record, index) => {
            debugInfo += `${index + 1}. ${record.date} - 上班:${record.on || '无'} 下班:${record.off || '无'}\n`;
          });
        }
      } else {
        debugInfo += `暂无任何记录`;
      }

      wx.showModal({
        title: '存储数据调试',
        content: debugInfo,
        showCancel: false,
        confirmText: '确定'
      });

    } catch (error) {
      console.error('查看存储数据失败:', error);
      wx.showToast({
        title: '查看失败',
        icon: 'none'
      });
    }
  },

  // 强制刷新
  forceRefresh() {
    wx.showLoading({
      title: '强制刷新中...',
      mask: true
    });

    try {
      // 清除所有缓存
      const { storageManager } = this.data;
      if (storageManager && storageManager.cache) {
        storageManager.cache.clear();
        storageManager.cacheExpiry.clear();
      }

      // 重置页面数据
      this.setData({
        list: [],
        monthCache: null,
        lastUpdateTime: 0
      });

      // 重新初始化存储管理器
      this.setData({
        storageManager: app.getStorageManager(),
        errorHandler: app.getErrorHandler()
      });

      // 延迟加载数据
      setTimeout(() => {
        this.loadMonthData();
        wx.hideLoading();
        
        wx.showToast({
          title: '刷新完成',
          icon: 'success'
        });
      }, 1000);

    } catch (error) {
      wx.hideLoading();
      console.error('强制刷新失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }
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

  // 计算统计数据
  calculateStats(records, currentDate) {
    if (!records || records.length === 0) {
      return {
        weekly: {
          totalHours: '0小时',
          avgHours: '0小时'
        },
        monthly: {
          avgHours: '0小时',
          workDays: '0天'
        }
      };
    }

    // 计算工作时长的辅助函数
    const calculateWorkHours = (onTime, offTime) => {
      if (!onTime || !offTime) return 0;
      
      try {
        const [onHour, onMinute] = onTime.split(':').map(Number);
        const [offHour, offMinute] = offTime.split(':').map(Number);
        
        const onTotalMinutes = onHour * 60 + onMinute;
        const offTotalMinutes = offHour * 60 + offMinute;
        
        if (offTotalMinutes <= onTotalMinutes) return 0;
        
        return (offTotalMinutes - onTotalMinutes) / 60; // 返回小时数
      } catch (error) {
        console.error('计算工作时长失败:', error);
        return 0;
      }
    };

    // 获取本周的日期范围
    const today = new Date(currentDate);
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周一为一周开始
    currentWeekStart.setDate(today.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // 筛选本周记录
    const weekRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= currentWeekStart && recordDate <= currentWeekEnd;
    });

    // 计算本周统计
    let weeklyTotalHours = 0;
    let weeklyWorkDays = 0;

    weekRecords.forEach(record => {
      const hours = calculateWorkHours(record.on, record.off);
      if (hours > 0) {
        weeklyTotalHours += hours;
        weeklyWorkDays++;
      }
    });

    // 计算本月统计
    let monthlyTotalHours = 0;
    let monthlyWorkDays = 0;

    records.forEach(record => {
      const hours = calculateWorkHours(record.on, record.off);
      if (hours > 0) {
        monthlyTotalHours += hours;
        monthlyWorkDays++;
      }
    });

    // 格式化时间显示
    const formatHours = (hours) => {
      if (hours === 0) return '0小时';
      if (hours < 1) {
        const minutes = Math.round(hours * 60);
        return `${minutes}分钟`;
      }
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      if (minutes === 0) {
        return `${wholeHours}小时`;
      }
      return `${wholeHours}小时${minutes}分钟`;
    };

    const weeklyAvgHours = weeklyWorkDays > 0 ? weeklyTotalHours / weeklyWorkDays : 0;
    const monthlyAvgHours = monthlyWorkDays > 0 ? monthlyTotalHours / monthlyWorkDays : 0;

    return {
      weekly: {
        totalHours: formatHours(weeklyTotalHours),
        avgHours: formatHours(weeklyAvgHours)
      },
      monthly: {
        avgHours: formatHours(monthlyAvgHours),
        workDays: `${monthlyWorkDays}天`
      }
    };
  }
})