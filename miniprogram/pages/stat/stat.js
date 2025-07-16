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
    storageManager: null
  },
  
  onLoad() {
    // 获取存储管理器实例
    this.setData({
      storageManager: app.getStorageManager()
    });
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

  // 计算工作时长（小时）
  calculateWorkHours(onTime, offTime, date) {
    if (!onTime || !offTime) return 0;
    
    try {
      const onDateTime = new Date(`${date} ${onTime}`);
      let offDateTime = new Date(`${date} ${offTime}`);
      
      // 处理跨日情况
      if (offDateTime < onDateTime) {
        offDateTime = new Date(offDateTime.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const diffMs = offDateTime - onDateTime;
      return diffMs / (1000 * 60 * 60); // 转换为小时
    } catch (error) {
      console.error('计算工作时长失败:', error);
      return 0;
    }
  },

  // 格式化工作时长显示
  formatWorkHours(hours) {
    if (hours === 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h${m}m` : `${h}h`;
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
  updateRecord(date, type, newTime) {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    try {
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
      
      if (success) {
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
      } else {
        throw new Error('数据保存失败');
      }
    } catch (error) {
      console.error('更新记录失败:', error);
      wx.showToast({
        title: '修改失败，请重试',
        icon: 'none',
        duration: 2000
      });
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

  deleteRecord(date) {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    try {
      const allRecords = storageManager.safeGetStorage('records', []);
      const filteredRecords = allRecords.filter(r => r.date !== date);
      
      const success = storageManager.safeSetStorage('records', filteredRecords);
      
      if (success) {
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
      } else {
        throw new Error('数据保存失败');
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 加载月度数据
  loadMonthData() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      console.error('存储管理器未初始化');
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
      console.error('加载月度数据失败:', error);
      wx.showToast({
        title: '数据加载失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
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