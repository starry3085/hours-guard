Page({
  data: {
    today: '',
    todayRecord: {},
    selectedDate: ''
  },
  
  onLoad() {
    this.setCurrentDate();
  },
  
  onShow() {
    this.loadTodayData();
  },
  
  setCurrentDate() {
    // 获取设备本地时间
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const fullTimeStr = `${hours}:${minutes}`;
    
    this.setData({
      today: today,
      selectedDate: today,
      currentTime: fullTimeStr
    });
  },
  
  loadTodayData() {
    const { selectedDate } = this.data;
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
    // 查找选中日期的记录
    const todayRecord = records.find(r => r.date === selectedDate) || { date: selectedDate };
    
    this.setData({
      todayRecord: todayRecord
    });
  },
  
  
  // 日期变更
  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value
    }, () => {
      this.loadTodayData();
    });
  },
  
  checkIn() {
    const { selectedDate } = this.data;
    // 获取设备本地时间
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const fullTimeStr = `${hours}:${minutes}`;
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
    // 查找选中日期的记录索引
    const idx = records.findIndex(r => r.date === selectedDate);
    
    // 如果已有选中日期的记录，更新上班时间；否则添加新记录
    if (idx >= 0) {
      records[idx].on = fullTimeStr;
    } else {
      records.push({
        date: selectedDate,
        on: fullTimeStr
      });
    }
    
    // 保存到本地存储
    wx.setStorageSync('records', records);
    
    // 显示提示
    wx.showToast({
      title: '已上班打卡',
      icon: 'success'
    });
    
    // 更新页面数据
    this.loadTodayData();
  },
  
  checkOut() {
    const { selectedDate } = this.data;
    // 获取设备本地时间
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const fullTimeStr = `${hours}:${minutes}`;
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
    // 查找选中日期的记录索引
    const idx = records.findIndex(r => r.date === selectedDate);
    
    // 如果已有选中日期的记录，更新下班时间；否则提示先打上班卡
    if (idx >= 0) {
      records[idx].off = fullTimeStr;
      
      // 保存到本地存储
      wx.setStorageSync('records', records);
      
      // 显示提示
      wx.showToast({
        title: '已下班打卡',
        icon: 'success'
      });
      
      // 更新页面数据
      this.loadTodayData();
    } else {
      wx.showToast({
        title: '请先打上班卡',
        icon: 'none'
      });
    }
  }
}) 