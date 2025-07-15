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
    // 获取网络时间（东八区）
    wx.request({
      url: 'https://worldtimeapi.org/api/timezone/Asia/Shanghai',
      success: (res) => {
        const datetime = new Date(res.data.datetime);
        const today = datetime.toISOString().slice(0, 10);
        const timeStr = datetime.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        });
        
        this.setData({
          today: today,
          selectedDate: today,
          currentTime: timeStr
        });
      },
      fail: () => {
        // 网络请求失败时使用本地时间
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const timeStr = now.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        });
        
        this.setData({
          today: today,
          selectedDate: today,
          currentTime: timeStr + ' (本地)'
        });
      }
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
    // 获取东八区当前时间
    const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
    const timeStr = now.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
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
    // 获取东八区当前时间
    const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
    const timeStr = now.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
    // 查找选中日期的记录索引
    const idx = records.findIndex(r => r.date === selectedDate);
    
    // 如果已有选中日期的记录，更新下班时间；否则提示先打上班卡
    if (idx >= 0) {
      records[idx].off = timeStr;
      
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