const app = getApp();

Page({
  data: {
    today: '',
    todayRecord: {},
    selectedDate: '',
    currentTime: '',
    isToday: true,
    timeInterval: null,
    storageManager: null
  },
  
  onLoad() {
    // 获取存储管理器实例
    this.setData({
      storageManager: app.getStorageManager()
    });
    
    this.setCurrentDate();
    this.startTimeUpdate();
  },
  
  onShow() {
    this.loadTodayData();
    this.startTimeUpdate();
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

  // 更新当前时间
  updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}:${seconds}`;
    
    this.setData({
      currentTime: currentTime
    });
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
      wx.showToast({
        title: '数据加载失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
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
  
  checkIn() {
    const { selectedDate, isToday, storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
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
      
      if (success) {
        // 显示提示
        wx.showToast({
          title: isToday ? '已上班打卡' : '已补录上班时间',
          icon: 'success'
        });
        
        // 更新页面数据
        this.loadTodayData();
      } else {
        throw new Error('数据保存失败');
      }
      
    } catch (error) {
      console.error('打卡失败:', error);
      wx.showToast({
        title: '打卡失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  checkOut() {
    const { selectedDate, isToday, todayRecord, storageManager } = this.data;
    
    // 检查是否已上班打卡
    if (!todayRecord.on) {
      wx.showToast({
        title: '请先上班打卡',
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
        
        if (success) {
          // 显示提示
          wx.showToast({
            title: isToday ? '已下班打卡' : '已补录下班时间',
            icon: 'success'
          });
          
          // 更新页面数据
          this.loadTodayData();
        } else {
          throw new Error('数据保存失败');
        }
      } else {
        wx.showToast({
          title: '记录不存在，请先上班打卡',
          icon: 'none'
        });
      }
      
    } catch (error) {
      console.error('打卡失败:', error);
      wx.showToast({
        title: '打卡失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 编辑时间
  onEditTime(e) {
    const { type } = e.currentTarget.dataset;
    const { selectedDate, todayRecord } = this.data;
    
    const currentValue = todayRecord[type] || (type === 'on' ? '09:00' : '18:00');
    const [hour, minute] = currentValue.split(':');
    
    wx.showModal({
      title: `编辑${type === 'on' ? '上班' : '下班'}时间`,
      content: `当前时间: ${currentValue}`,
      editable: true,
      placeholderText: '请输入时间 (HH:MM)',
      success: (res) => {
        if (res.confirm && res.content) {
          const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (timePattern.test(res.content)) {
            this.updateTime(selectedDate, type, res.content);
          } else {
            wx.showToast({
              title: '时间格式错误',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 更新时间记录
  updateTime(date, type, newTime) {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    try {
      const records = storageManager.safeGetStorage('records', []);
      const idx = records.findIndex(r => r.date === date);
      
      if (idx >= 0) {
        records[idx][type] = newTime;
      } else {
        const newRecord = { date };
        newRecord[type] = newTime;
        records.push(newRecord);
      }
      
      const success = storageManager.safeSetStorage('records', records);
      
      if (success) {
        this.loadTodayData();
        wx.showToast({
          title: '时间已更新',
          icon: 'success'
        });
      } else {
        throw new Error('数据保存失败');
      }
    } catch (error) {
      console.error('更新时间失败:', error);
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  }
}) 