const app = getApp();

Page({
  data: {
    list: [],
    currentMonth: '',
    monthDays: 0,
    weekHours: 0,
    avgDailyHours: 0,
    totalMonthHours: 0,
    avgMonthDailyHours: 0,
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
    isLoading: false
  },
  
  onLoad() {
    try {
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
  
  // 获取本周日期范围
  getCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekDates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), diff + i);
      const month = date.getMonth() + 1;
      const dayOfMonth = date.getDate();
      weekDates.push(`${date.getFullYear()}-${month.toString().padStart(2, '0')}-${dayOfMonth.toString().padStart(2, '0')}`);
    }
    
    return weekDates;
  },

  // 计算工作时长（小时）- 优化版本，添加缓存
  calculateWorkHours(onTime, offTime, date) {
    if (!onTime || !offTime) return 0;
    
    // 使用缓存键避免重复计算
    const cacheKey = `${date}_${onTime}_${offTime}`;
    if (this.workHoursCache && this.workHoursCache.has(cacheKey)) {
      return this.workHoursCache.get(cacheKey);
    }
    
    try {
      const onDateTime = new Date(`${date} ${onTime}`);
      let offDateTime = new Date(`${date} ${offTime}`);
      
      // 处理跨日情况
      if (offDateTime < onDateTime) {
        offDateTime = new Date(offDateTime.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const diffMs = offDateTime - onDateTime;
      const hours = diffMs / (1000 * 60 * 60); // 转换为小时
      
      // 缓存计算结果
      if (!this.workHoursCache) {
        this.workHoursCache = new Map();
      }
      this.workHoursCache.set(cacheKey, hours);
      
      // 限制缓存大小，避免内存泄漏
      if (this.workHoursCache.size > 100) {
        const firstKey = this.workHoursCache.keys().next().value;
        this.workHoursCache.delete(firstKey);
      }
      
      return hours;
    } catch (error) {
      return 0;
    }
  },

  // 格式化工作时长显示
  formatWorkHours(hours) {
    if (hours === 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}时${m}分` : `${h}时`;
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
      const monthRecords = allRecords.filter(record => record.date.startsWith(monthPrefix));
      
      // 按日期倒序排序（最新日期在前）
      monthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 为每条记录添加工作时长
      const recordsWithHours = monthRecords.map(record => ({
        ...record,
        workHours: this.calculateWorkHours(record.on, record.off, record.date),
        workHoursText: this.formatWorkHours(this.calculateWorkHours(record.on, record.off, record.date))
      }));
      
      // 计算统计数据
      const stats = this.calculateStatistics(recordsWithHours);
      
      // 更新数据和缓存
      this.setData({
        list: recordsWithHours,
        currentMonth: currentMonth,
        monthDays: recordsWithHours.length,
        ...stats,
        monthCache: {
          month: monthPrefix,
          data: recordsWithHours,
          stats: stats
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

  // 计算统计数据
  calculateStatistics(records) {
    const currentWeek = this.getCurrentWeek();
    let weekHours = 0;
    let weekWorkDays = 0;
    let totalMonthHours = 0;
    let monthWorkDays = 0;
    
    records.forEach(record => {
      const workHours = record.workHours;
      
      if (workHours > 0) {
        totalMonthHours += workHours;
        monthWorkDays++;
        
        // 如果是本周的记录
        if (currentWeek.includes(record.date)) {
          weekHours += workHours;
          weekWorkDays++;
        }
      }
    });
    
    return {
      weekHours: weekHours.toFixed(1),
      avgDailyHours: weekWorkDays > 0 ? (weekHours / weekWorkDays).toFixed(1) : '0',
      totalMonthHours: totalMonthHours.toFixed(1),
      avgMonthDailyHours: monthWorkDays > 0 ? (totalMonthHours / monthWorkDays).toFixed(1) : '0'
    };
  }
})