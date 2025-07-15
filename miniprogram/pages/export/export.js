Page({
  data: {
    selectedDate: '',
    selectedMonth: '',
    pdfPath: ''
  },
  
  onLoad() {
    // 初始化为当前月份
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const selectedDate = `${year}-${month.toString().padStart(2, '0')}`;
    const selectedMonth = `${year}年${month}月`;
    
    this.setData({
      selectedDate: selectedDate,
      selectedMonth: selectedMonth
    });
  },
  
  onDateChange(e) {
    const value = e.detail.value; // 格式为 "YYYY-MM"
    const [year, month] = value.split('-');
    
    this.setData({
      selectedDate: value,
      selectedMonth: `${year}年${month}月`,
      pdfPath: '' // 清空之前的PDF路径
    });
  },
  
  makePdf() {
    const [year, month] = this.data.selectedDate.split('-');
    const monthPrefix = `${year}-${month}`;
    
    // 从本地存储获取所有记录
    const allRecords = wx.getStorageSync('records') || [];
    
    // 筛选选定月份的记录
    const monthRecords = allRecords.filter(record => record.date.startsWith(monthPrefix));
    
    if (!monthRecords.length) {
      wx.showToast({
        title: '无打卡数据',
        icon: 'none'
      });
      return;
    }
    
    // 按日期排序（从早到晚）
    monthRecords.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    
    // 创建PDF
    const query = wx.createSelectorQuery();
    query.select('#canvas').fields({ node: true, size: true }).exec(res => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      
      canvas.width = 595;
      canvas.height = 842;
      
      // 绘制PDF内容
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 标题
      ctx.fillStyle = '#000';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`打卡记录 - ${this.data.selectedMonth}`, canvas.width / 2, 60);
      
      // 表头
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('日期', 60, 100);
      ctx.fillText('上班时间', 220, 100);
      ctx.fillText('下班时间', 380, 100);
      
      // 绘制分隔线
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 110);
      ctx.lineTo(555, 110);
      ctx.stroke();
      
      // 记录内容
      ctx.font = '14px sans-serif';
      monthRecords.forEach((record, index) => {
        const y = 140 + index * 30;
        ctx.fillText(record.date, 60, y);
        ctx.fillText(record.on || '-', 220, y);
        ctx.fillText(record.off || '-', 380, y);
        
        // 行分隔线
        if (index < monthRecords.length - 1) {
          ctx.beginPath();
          ctx.moveTo(40, y + 10);
          ctx.lineTo(555, y + 10);
          ctx.stroke();
        }
      });
      
      // 页脚
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`共 ${monthRecords.length} 天记录 - 生成日期: ${new Date().toLocaleDateString('zh-CN')}`, canvas.width / 2, 800);
      
      // 转换为临时文件
      wx.canvasToTempFilePath({
        canvas,
        fileType: 'pdf',
        success: res => {
          this.setData({
            pdfPath: res.tempFilePath
          });
          
          // 保存到本地或打开文档
          if (wx.saveFileToDisk) {
            wx.saveFileToDisk({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({
                  title: 'PDF已保存',
                  icon: 'success'
                });
              },
              fail: () => {
                this.openDocument(res.tempFilePath);
              }
            });
          } else {
            this.openDocument(res.tempFilePath);
          }
        },
        fail: err => {
          wx.showToast({
            title: '生成PDF失败',
            icon: 'none'
          });
          console.error('生成PDF失败:', err);
        }
      });
    });
  },
  
  openDocument(filePath) {
    wx.openDocument({
      filePath: filePath,
      showMenu: true,
      success: () => {
        wx.showToast({
          title: 'PDF已生成',
          icon: 'success'
        });
      }
    });
  },
  
  sharePdf() {
    if (!this.data.pdfPath) {
      wx.showToast({
        title: '请先生成PDF',
        icon: 'none'
      });
      return;
    }
    
    wx.shareFileMessage({
      filePath: this.data.pdfPath,
      success: () => {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: err => {
        wx.showToast({
          title: '分享失败',
          icon: 'none'
        });
        console.error('分享失败:', err);
      }
    });
  }
}) 