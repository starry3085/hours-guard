Page({
  data: {
    list: [],
    currentMonth: ''
  },
  
  onShow() {
    this.loadMonthData();
  },
  
  loadMonthData() {
    // 获取当前日期
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // 格式化当前月份显示
    const currentMonth = `${year}年${month}月`;
    
    // 从本地存储获取所有记录
    const allRecords = wx.getStorageSync('records') || [];
    
    // 筛选当月记录
    const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`;
    const monthRecords = allRecords.filter(record => record.date.startsWith(monthPrefix));
    
    // 按日期排序（从新到旧）
    monthRecords.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    this.setData({
      list: monthRecords,
      currentMonth: currentMonth
    });
  }
}) 