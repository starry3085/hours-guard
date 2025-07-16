const app = getApp();

Page({
  data: {
    selectedDate: '',
    selectedMonth: '',
    pdfPath: '',
    isGenerating: false,
    recordCount: 0,
    totalWorkHours: 0,
    storageManager: null
  },
  
  onLoad() {
    // 获取存储管理器实例
    this.setData({
      storageManager: app.getStorageManager()
    });
    
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
    
    this.loadMonthData();
  },
  
  onShow() {
    this.loadMonthData();
  },
  
  // 加载月份数据统计
  loadMonthData() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      console.error('存储管理器未初始化');
      return;
    }
    
    try {
      const [year, month] = this.data.selectedDate.split('-');
      const monthPrefix = `${year}-${month}`;
      
      const allRecords = storageManager.safeGetStorage('records', []);
      const monthRecords = allRecords.filter(record => record.date.startsWith(monthPrefix));
      
      // 计算总工作时长
      let totalHours = 0;
      monthRecords.forEach(record => {
        if (record.on && record.off) {
          const workHours = this.calculateWorkHours(record.on, record.off, record.date);
          totalHours += workHours;
        }
      });
      
      this.setData({
        recordCount: monthRecords.length,
        totalWorkHours: totalHours.toFixed(1)
      });
    } catch (error) {
      console.error('加载月份数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // 计算工作时长
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
      return diffMs / (1000 * 60 * 60);
    } catch (error) {
      console.error('计算工作时长失败:', error);
      return 0;
    }
  },
  
  onDateChange(e) {
    const value = e.detail.value;
    const [year, month] = value.split('-');
    
    this.setData({
      selectedDate: value,
      selectedMonth: `${year}年${month}月`,
      pdfPath: ''
    }, () => {
      this.loadMonthData();
    });
  },
  
  makeReport() {
    const { storageManager } = this.data;
    
    if (this.data.isGenerating) {
      wx.showToast({
        title: '正在生成中...',
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
    
    const [year, month] = this.data.selectedDate.split('-');
    const monthPrefix = `${year}-${month}`;
    
    try {
      // 显示加载提示
      wx.showLoading({
        title: '生成报告中...',
        mask: true
      });
      
      this.setData({ isGenerating: true });
      
      // 使用存储管理器安全获取所有记录
      const allRecords = storageManager.safeGetStorage('records', []);
      
      // 筛选选定月份的记录
      const monthRecords = allRecords.filter(record => record.date.startsWith(monthPrefix));
      
      if (!monthRecords.length) {
        wx.hideLoading();
        this.setData({ isGenerating: false });
        wx.showToast({
          title: '无打卡数据',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 按日期排序（从早到晚）
      monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // 显示导出格式选择
      this.showExportOptions(monthRecords);
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isGenerating: false });
      console.error('报告生成失败:', error);
      wx.showToast({
        title: '报告生成失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示导出格式选择
  showExportOptions(monthRecords) {
    wx.hideLoading();
    this.setData({ isGenerating: false });
    
    wx.showActionSheet({
      itemList: ['导出Excel表格(CSV)', '导出图片报告', '导出文本记录'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.generateCSV(monthRecords);
            break;
          case 1:
            this.generateImage(monthRecords);
            break;
          case 2:
            this.generateText(monthRecords);
            break;
        }
      }
    });
  },

  // 生成CSV文件
  generateCSV(monthRecords) {
    try {
      wx.showLoading({ title: '生成Excel表格中...', mask: true });
      
      // CSV头部
      let csvContent = '\uFEFF'; // BOM for UTF-8
      csvContent += '日期,星期,上班时间,下班时间,工作时长(小时),备注\n';
      
      // 添加数据行
      monthRecords.forEach(record => {
        const date = new Date(record.date);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = `周${weekdays[date.getDay()]}`;
        const workHours = this.calculateWorkHours(record.on, record.off, record.date);
        const workHoursText = workHours > 0 ? workHours.toFixed(2) : '';
        
        csvContent += `${record.date},${weekday},${record.on || ''},${record.off || ''},${workHoursText},\n`;
      });
      
      // 添加统计信息
      csvContent += '\n统计信息\n';
      csvContent += `打卡天数,${monthRecords.length}\n`;
      csvContent += `总工作时长,${this.data.totalWorkHours}小时\n`;
      csvContent += `平均每日工作时长,${monthRecords.length > 0 ? (parseFloat(this.data.totalWorkHours) / monthRecords.length).toFixed(2) : 0}小时\n`;
      csvContent += `生成时间,${new Date().toLocaleString('zh-CN')}\n`;
      
      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const fileName = `打卡记录-${this.data.selectedMonth}.csv`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: csvContent,
        encoding: 'utf8',
        success: () => {
          wx.hideLoading();
          this.setData({ 
            isGenerating: false,
            pdfPath: filePath 
          });
          
          wx.showToast({
            title: 'Excel表格生成成功',
            icon: 'success'
          });
          
          // 提供分享选项
          this.showShareOptions(filePath, fileName);
        },
        fail: (err) => {
          wx.hideLoading();
          this.setData({ isGenerating: false });
          console.error('CSV文件生成失败:', err);
          wx.showToast({
            title: '文件生成失败',
            icon: 'none'
          });
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isGenerating: false });
      console.error('CSV生成失败:', error);
      wx.showToast({
        title: 'Excel表格生成失败',
        icon: 'none'
      });
    }
  },

  // 生成文本文件
  generateText(monthRecords) {
    try {
      wx.showLoading({ title: '生成文本记录中...', mask: true });
      
      let textContent = `打卡记录报告 - ${this.data.selectedMonth}\n`;
      textContent += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
      textContent += `${'='.repeat(50)}\n\n`;
      
      // 统计信息
      textContent += `统计信息:\n`;
      textContent += `打卡天数: ${monthRecords.length} 天\n`;
      textContent += `总工作时长: ${this.data.totalWorkHours} 小时\n`;
      textContent += `平均每日工作时长: ${monthRecords.length > 0 ? (parseFloat(this.data.totalWorkHours) / monthRecords.length).toFixed(2) : 0} 小时\n\n`;
      
      // 详细记录
      textContent += `详细记录:\n`;
      textContent += `${'='.repeat(50)}\n`;
      
      monthRecords.forEach(record => {
        const date = new Date(record.date);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = `周${weekdays[date.getDay()]}`;
        const workHours = this.calculateWorkHours(record.on, record.off, record.date);
        
        textContent += `${record.date} (${weekday})\n`;
        textContent += `  上班时间: ${record.on || '未打卡'}\n`;
        textContent += `  下班时间: ${record.off || '未打卡'}\n`;
        textContent += `  工作时长: ${workHours > 0 ? workHours.toFixed(2) + '小时' : '-'}\n`;
        textContent += `${'-'.repeat(30)}\n`;
      });
      
      textContent += `\n数据说明: 所有数据仅保存在本机，请妥善保管备份文件。`;
      
      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const fileName = `打卡记录-${this.data.selectedMonth}.txt`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: textContent,
        encoding: 'utf8',
        success: () => {
          wx.hideLoading();
          this.setData({ 
            isGenerating: false,
            pdfPath: filePath 
          });
          
          wx.showToast({
            title: '文本记录生成成功',
            icon: 'success'
          });
          
          // 提供分享选项
          this.showShareOptions(filePath, fileName);
        },
        fail: (err) => {
          wx.hideLoading();
          this.setData({ isGenerating: false });
          console.error('文本文件生成失败:', err);
          wx.showToast({
            title: '文件生成失败',
            icon: 'none'
          });
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isGenerating: false });
      console.error('文本生成失败:', error);
      wx.showToast({
        title: '文本记录生成失败',
        icon: 'none'
      });
    }
  },

  // 生成图片报告
  generateImage(monthRecords) {
    wx.showLoading({ title: '生成图片报告中...', mask: true });
    this.setData({ isGenerating: true });
    this.generatePDF(monthRecords);
  },

  // 显示分享选项
  showShareOptions(filePath, fileName) {
    wx.showActionSheet({
      itemList: ['发送给朋友', '预览文件'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.shareFile(filePath, fileName);
            break;
          case 1:
            this.previewFile(filePath);
            break;
        }
      }
    });
  },

  // 分享文件
  shareFile(filePath, fileName) {
    wx.shareFileMessage({
      filePath: filePath,
      fileName: fileName,
      success: () => {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: err => {
        console.error('分享失败:', err);
        wx.showToast({
          title: '分享失败',
          icon: 'none'
        });
      }
    });
  },

  // 预览文件
  previewFile(filePath) {
    wx.openDocument({
      filePath: filePath,
      showMenu: true,
      success: () => {
        console.log('文件预览成功');
      },
      fail: err => {
        console.error('预览失败:', err);
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        });
      }
    });
  },
  
  generatePDF(monthRecords) {
    const query = wx.createSelectorQuery();
    query.select('#canvas').fields({ node: true, size: true }).exec(res => {
      if (!res[0] || !res[0].node) {
        wx.hideLoading();
        this.setData({ isGenerating: false });
        wx.showToast({
          title: 'Canvas初始化失败',
          icon: 'none'
        });
        return;
      }
      
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      
      // 设置Canvas尺寸
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = 595 * dpr;
      canvas.height = 842 * dpr;
      ctx.scale(dpr, dpr);
      
      // 绘制PDF内容
      this.drawPDFContent(ctx, monthRecords, canvas);
    });
  },
  
  drawPDFContent(ctx, monthRecords, canvas) {
    try {
      // 背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 595, 842);
      
      // 标题
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 28px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`打卡记录报告`, 297.5, 60);
      
      // 副标题
      ctx.font = '18px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText(`${this.data.selectedMonth}`, 297.5, 90);
      
      // 统计信息框
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(50, 110, 495, 80);
      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 110, 495, 80);
      
      // 统计信息
      ctx.fillStyle = '#333333';
      ctx.font = '16px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`打卡天数: ${monthRecords.length} 天`, 70, 140);
      ctx.fillText(`总工作时长: ${this.data.totalWorkHours} 小时`, 70, 165);
      
      const avgHours = monthRecords.length > 0 ? (parseFloat(this.data.totalWorkHours) / monthRecords.length).toFixed(1) : '0';
      ctx.fillText(`平均每日: ${avgHours} 小时`, 320, 140);
      ctx.fillText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 320, 165);
      
      // 表格标题
      ctx.fillStyle = '#495057';
      ctx.font = 'bold 16px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.fillText('日期', 70, 230);
      ctx.fillText('上班时间', 180, 230);
      ctx.fillText('下班时间', 280, 230);
      ctx.fillText('工作时长', 380, 230);
      ctx.fillText('备注', 480, 230);
      
      // 表头分隔线
      ctx.strokeStyle = '#dee2e6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 240);
      ctx.lineTo(545, 240);
      ctx.stroke();
      
      // 记录内容
      ctx.font = '14px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.fillStyle = '#333333';
      
      monthRecords.forEach((record, index) => {
        const y = 265 + index * 25;
        
        // 防止内容超出页面
        if (y > 780) return;
        
        // 日期
        ctx.fillText(record.date, 70, y);
        
        // 上班时间
        ctx.fillStyle = record.on ? '#28a745' : '#dc3545';
        ctx.fillText(record.on || '未打卡', 180, y);
        
        // 下班时间
        ctx.fillStyle = record.off ? '#28a745' : '#dc3545';
        ctx.fillText(record.off || '未打卡', 280, y);
        
        // 工作时长
        ctx.fillStyle = '#333333';
        if (record.on && record.off) {
          const workHours = this.calculateWorkHours(record.on, record.off, record.date);
          const hours = Math.floor(workHours);
          const minutes = Math.round((workHours - hours) * 60);
          const timeText = minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
          ctx.fillText(timeText, 380, y);
        } else {
          ctx.fillText('-', 380, y);
        }
        
        // 备注（周几）
        const date = new Date(record.date);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        ctx.fillStyle = '#6c757d';
        ctx.fillText(`周${weekdays[date.getDay()]}`, 480, y);
        
        // 行分隔线
        if (index < monthRecords.length - 1 && y < 760) {
          ctx.strokeStyle = '#f8f9fa';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(50, y + 12);
          ctx.lineTo(545, y + 12);
          ctx.stroke();
        }
      });
      
      // 页脚
      ctx.fillStyle = '#6c757d';
      ctx.font = '12px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('上下班打卡工具 - 数据仅保存在本地，请妥善保管', 297.5, 820);
      
      // 转换为临时文件
      this.convertToFile(canvas);
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isGenerating: false });
      console.error('绘制PDF内容失败:', error);
      wx.showToast({
        title: 'PDF绘制失败',
        icon: 'none'
      });
    }
  },
  
  convertToFile(canvas) {
    wx.canvasToTempFilePath({
      canvas,
      fileType: 'png',
      quality: 1,
      success: res => {
        wx.hideLoading();
        this.setData({ 
          isGenerating: false,
          pdfPath: res.tempFilePath 
        });
        
        wx.showToast({
          title: '报告生成成功',
          icon: 'success'
        });
        
        // 提供预览选项
        this.showPreviewOptions(res.tempFilePath);
      },
      fail: err => {
        wx.hideLoading();
        this.setData({ isGenerating: false });
        console.error('转换文件失败:', err);
        wx.showToast({
          title: '文件生成失败',
          icon: 'none'
        });
      }
    });
  },

  // 显示预览选项
  showPreviewOptions(filePath) {
    wx.showActionSheet({
      itemList: ['预览图片', '保存到相册', '发送给朋友'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.previewImage(filePath);
            break;
          case 1:
            this.saveToAlbum();
            break;
          case 2:
            this.shareToFriend();
            break;
        }
      }
    });
  },

  // 预览图片
  previewImage(filePath) {
    wx.previewImage({
      urls: [filePath],
      current: filePath
    });
  },
  
  openDocument(filePath) {
    wx.openDocument({
      filePath: filePath,
      showMenu: true,
      success: () => {
        console.log('文档打开成功');
      },
      fail: err => {
        console.error('打开文档失败:', err);
        wx.showToast({
          title: '打开文档失败',
          icon: 'none'
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
    
    wx.showActionSheet({
      itemList: ['发送给朋友', '保存到相册', '更多分享选项'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.shareToFriend();
            break;
          case 1:
            this.saveToAlbum();
            break;
          case 2:
            this.moreShareOptions();
            break;
        }
      }
    });
  },
  
  shareToFriend() {
    wx.shareFileMessage({
      filePath: this.data.pdfPath,
      fileName: `打卡记录-${this.data.selectedMonth}.png`,
      success: () => {
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: err => {
        console.error('分享失败:', err);
        wx.showToast({
          title: '分享失败',
          icon: 'none'
        });
      }
    });
  },
  
  saveToAlbum() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.pdfPath,
      success: () => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
      },
      fail: err => {
        console.error('保存失败:', err);
        if (err.errMsg.includes('auth')) {
          wx.showModal({
            title: '需要授权',
            content: '需要您授权保存图片到相册',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      }
    });
  },
  
  moreShareOptions() {
    // 可以扩展更多分享选项
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 跳转到存储管理页面
  onGoToStorage() {
    wx.navigateTo({
      url: '/pages/storage/storage'
    });
  }
}) 