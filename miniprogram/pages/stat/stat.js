Page({
  data: {
    list: [],
    currentMonth: '',
    monthDays: 0,
    weekHours: 0,
    avgDailyHours: 0
  },
  
  onShow() {
    this.loadMonthData();
  },
  
  getCurrentWeek: function() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 获取本周一的日期
    const weekDates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today.setDate(diff + i));
      const month = date.getMonth() + 1;
      const day = date.getDate();
      weekDates.push(`${date.getFullYear()}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`);
    }
    
    return weekDates;
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
    
    // 按日期倒序排序（最新日期在前）
    monthRecords.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // 计算每周工作时长
    let weekHours = 0;
    let workDays = 0;
    const currentWeek = this.getCurrentWeek();
    
    monthRecords.forEach(item => {
      if (item.on && item.off && currentWeek.includes(item.date)) {
        const onTime = new Date(`${item.date} ${item.on}`);
        const offTime = new Date(`${item.date} ${item.off}`);
        const hours = (offTime - onTime) / (1000 * 60 * 60);
        weekHours += hours;
        workDays++;
      }
    });

    this.setData({
      list: monthRecords,
      currentMonth: currentMonth,
      monthDays: monthRecords.length,
      weekHours: weekHours.toFixed(1),
      avgDailyHours: workDays > 0 ? (weekHours / workDays).toFixed(1) : '0'
    });
  }
}) 