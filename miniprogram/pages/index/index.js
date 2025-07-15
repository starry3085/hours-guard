Page({
  data: {
    today: '',
    todayRecord: {}
  },
  
  onShow() {
    this.loadTodayData();
  },
  
  loadTodayData() {
    // 获取今天的日期，格式为YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
    // 查找今天的记录
    const todayRecord = records.find(r => r.date === today) || { date: today };
    
    this.setData({
      today: today,
      todayRecord: todayRecord
    });
  },
  
  checkIn() {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
    // 查找今天的记录索引
    const idx = records.findIndex(r => r.date === today);
    
    // 如果已有今天的记录，更新上班时间；否则添加新记录
    if (idx >= 0) {
      records[idx].on = now;
    } else {
      records.push({
        date: today,
        on: now
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
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
    
    // 从本地存储获取记录
    const records = wx.getStorageSync('records') || [];
    
    // 查找今天的记录索引
    const idx = records.findIndex(r => r.date === today);
    
    // 如果已有今天的记录，更新下班时间；否则提示先打上班卡
    if (idx >= 0) {
      records[idx].off = now;
      
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