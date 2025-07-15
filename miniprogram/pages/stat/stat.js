Page({
  data: {
    list: [],
    currentMonth: '',
    monthDays: 0,
    weekHours: 0,
    avgDailyHours: 0,
    showPicker: false,
    pickerType: '',
    pickerDate: '',
    pickerValue: ['09', '00'],
    hours: Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')),
    minutes: Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'))
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

  checkIn() {
    const today = new Date().toISOString().slice(0,10);
    const hours = new Date().getHours().toString().padStart(2, '0');
    const minutes = new Date().getMinutes().toString().padStart(2, '0');
    const now = `${hours}:${minutes}`;
    const records = wx.getStorageSync('records') || [];
    const idx = records.findIndex(r=>r.date===today);
    idx>=0 ? records[idx].on = now : records.push({date:today,on:now});
    wx.setStorageSync('records',records);
    wx.showToast({title:'已上班打卡'});
  },

  checkOut() {
    const today = new Date().toISOString().slice(0,10);
    const hours = new Date().getHours().toString().padStart(2, '0');
    const minutes = new Date().getMinutes().toString().padStart(2, '0');
    const now = `${hours}:${minutes}`;
    const records = wx.getStorageSync('records') || [];
    const idx = records.findIndex(r=>r.date===today);
    idx>=0 ? records[idx].off = now : records.push({date:today,off:now});
    wx.setStorageSync('records',records);
    wx.showToast({title:'已下班打卡'});
  },

  onEditTime(e) {
    const { date, type } = e.currentTarget.dataset;
    const currentValue = this.data.list.find(item => item.date === date)[type];
    const currentHour = currentValue ? currentValue.split(':')[0] : '09';
    const currentMinute = currentValue ? currentValue.split(':')[1] : '00';
    
    this.setData({
      showPicker: true,
      pickerType: type,
      pickerDate: date,
      pickerValue: [currentHour, currentMinute]
    });
  },

  onPickerChange(e) {
    const [hour, minute] = e.detail.value;
    this.setData({
      pickerValue: [hour, minute]
    });
  },

  onPickerConfirm() {
    const { pickerType, pickerDate, pickerValue } = this.data;
    const [hour, minute] = pickerValue;
    const newTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    this.updateRecord(pickerDate, pickerType, newTime);
    this.setData({ showPicker: false });
  },

  onPickerCancel() {
    this.setData({ showPicker: false });
  },

  updateRecord(date, type, newTime) {
    const allRecords = wx.getStorageSync('records') || [];
    const recordIndex = allRecords.findIndex(r => r.date === date);
    
    if (recordIndex >= 0) {
      allRecords[recordIndex][type] = newTime;
    } else {
      const newRecord = { date };
      newRecord[type] = newTime;
      allRecords.push(newRecord);
    }
    
    wx.setStorageSync('records', allRecords);
    this.loadMonthData();
    wx.showToast({
      title: '修改成功',
      icon: 'success'
    });
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