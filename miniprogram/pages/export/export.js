const app = getApp();

Page({
  data: {
    selectedDate: '',
    selectedMonth: '',
    filePath: '',
    isGenerating: false,
    recordCount: 0,
    totalWorkHours: 0,
    storageManager: null,
    errorHandler: null
  },
  
  onLoad() {
    try {
      // 获取存储管理器和错误处理器实例
      this.setData({
        storageManager: app.getStorageManager(),
        errorHandler: app.getErrorHandler()
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
      
    } catch (error) {
      const errorHandler = app.getErrorHandler();
      errorHandler.handleError(error, '导出页面初始化', {
        showModal: true,
        recovery: () => {
          setTimeout(() => {
            this.onLoad();
          }, 1000);
        }
      });
    }
  },
  
  onShow() {
    this.loadMonthData();
  },
  
  // 加载月份数据统计
  loadMonthData() {
    const { storageManager, errorHandler } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
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
      if (errorHandler) {
        errorHandler.handleError(error, '加载导出数据', {
          showToast: true,
          recovery: () => {
            setTimeout(() => {
              this.loadMonthData();
            }, 1000);
          }
        });
      } else {
        wx.showToast({
          title: '数据加载失败',
          icon: 'none',
          duration: 2000
        });
      }
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
      return 0;
    }
  },
  
  onDateChange(e) {
    const value = e.detail.value;
    const [year, month] = value.split('-');
    
    this.setData({
      selectedDate: value,
      selectedMonth: `${year}年${month}月`,
      filePath: ''
    }, () => {
      this.loadMonthData();
    });
  },
  
  async makeReport() {
    const { storageManager, errorHandler, isGenerating } = this.data;
    
    if (isGenerating) {
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
        title: '生成文本记录中...',
        mask: true
      });
      
      this.setData({ isGenerating: true });
      
      // 使用错误处理器的重试机制
      const monthRecords = await errorHandler.withRetry(async () => {
        // 使用存储管理器安全获取所有记录
        const allRecords = storageManager.safeGetStorage('records', []);
        
        // 筛选选定月份的记录
        const records = allRecords.filter(record => record.date.startsWith(monthPrefix));
        
        if (!records.length) {
          throw new Error('无打卡数据');
        }
        
        // 按日期排序（从早到晚）
        records.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return records;
      }, {
        maxRetries: 2,
        context: '获取导出数据',
        onRetry: (error, attempt) => {
          // 静默重试
        }
      });
      
      // 直接生成文本文件
      this.generateText(monthRecords);
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isGenerating: false });
      
      if (error.message === '无打卡数据') {
        wx.showToast({
          title: '无打卡数据',
          icon: 'none',
          duration: 2000
        });
      } else {
        errorHandler.handleError(error, '生成报告', {
          showToast: true,
          recovery: () => {
            // 恢复策略：重新加载数据
            this.loadMonthData();
          }
        });
      }
    }
  },

  // 已删除CSV文件生成功能，统一使用文本导出

  // 生成文本文件
  async generateText(monthRecords) {
    const { errorHandler } = this.data;
    
    try {
      wx.showLoading({ title: '生成文本记录中...', mask: true });
      this.setData({ isGenerating: true });
      
      // 使用错误处理器的重试机制
      const result = await errorHandler.withRetry(async () => {
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
        
        return new Promise((resolve, reject) => {
          fs.writeFile({
            filePath: filePath,
            data: textContent,
            encoding: 'utf8',
            success: () => {
              resolve({ filePath, fileName });
            },
            fail: (err) => {
              reject(new Error(`文本文件写入失败: ${err.errMsg}`));
            }
          });
        });
      }, {
        maxRetries: 2,
        context: '生成文本文件',
        onRetry: (error, attempt) => {
          // 静默重试
        }
      });
      
      wx.hideLoading();
      this.setData({ 
        isGenerating: false,
        filePath: result.filePath 
      });
      
      wx.showToast({
        title: '文本记录生成成功',
        icon: 'success'
      });
      
      // 提供分享选项
      this.showShareOptions(result.filePath, result.fileName);
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isGenerating: false });
      
      errorHandler.handleError(error, '生成文本文件', {
        showModal: true,
        recovery: () => {
          // 恢复策略：重新尝试生成
          setTimeout(() => {
            this.generateText(monthRecords);
          }, 1000);
        }
      });
    }
  },

  // 已删除图片报告生成功能，统一使用文本导出

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
        // 预览成功
      },
      fail: err => {
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 已删除所有与图片/PDF相关的代码，统一使用文本导出
  
  // 删除了PDF相关的方法，统一使用shareFile方法

  // 跳转到存储管理页面
  onGoToStorage() {
    wx.navigateTo({
      url: '/pages/storage/storage'
    });
  },

  // 显示操作指导
  onShowGuide() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      errorHandler.showOperationGuide('export');
    } else {
      app.showOperationGuide('export');
    }
  },

  // 长按显示更多选项
  onLongPress() {
    wx.showActionSheet({
      itemList: ['操作指导', '检查网络状态', '系统诊断', '查看错误日志'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onShowGuide();
            break;
          case 1:
            this.checkNetworkStatus();
            break;
          case 2:
            this.performDiagnosis();
            break;
          case 3:
            this.showErrorLogs();
            break;
        }
      }
    });
  },

  // 检查网络状态
  async checkNetworkStatus() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      await errorHandler.showNetworkStatus();
    }
  },

  // 执行系统诊断
  async performDiagnosis() {
    await app.performSystemDiagnosis();
  },

  // 显示错误日志
  showErrorLogs() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      const logs = errorHandler.getErrorLogs(10);
      
      if (logs.length === 0) {
        wx.showToast({
          title: '暂无错误日志',
          icon: 'none'
        });
        return;
      }
      
      let logContent = `最近${logs.length}条错误记录：\n\n`;
      logs.forEach((log, index) => {
        logContent += `${index + 1}. ${log.userMessage}\n`;
        logContent += `   时间: ${new Date(log.timestamp).toLocaleString()}\n`;
        logContent += `   类型: ${errorHandler.getErrorTypeText(log.type)}\n\n`;
      });
      
      wx.showModal({
        title: '错误日志',
        content: logContent,
        showCancel: true,
        confirmText: '确定',
        cancelText: '清除日志',
        success: (res) => {
          if (!res.confirm && res.cancel) {
            this.clearErrorLogs();
          }
        }
      });
    }
  },

  // 清除错误日志
  clearErrorLogs() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有错误日志吗？',
      success: (res) => {
        if (res.confirm) {
          const { errorHandler } = this.data;
          if (errorHandler) {
            errorHandler.clearErrorLogs();
          }
        }
      }
    });
  },

  // 导出错误日志
  async exportErrorLogs() {
    const { errorHandler } = this.data;
    if (!errorHandler) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({
        title: '导出日志中...',
        mask: true
      });
      
      const logContent = errorHandler.exportErrorLogs();
      
      if (!logContent) {
        wx.hideLoading();
        return;
      }
      
      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const fileName = `错误日志-${new Date().toISOString().slice(0, 10)}.txt`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: logContent,
        encoding: 'utf8',
        success: () => {
          wx.hideLoading();
          
          wx.showToast({
            title: '日志导出成功',
            icon: 'success'
          });
          
          // 提供分享选项
          this.showShareOptions(filePath, fileName);
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('日志导出失败:', err);
          wx.showToast({
            title: '导出失败',
            icon: 'none'
          });
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      if (errorHandler) {
        errorHandler.handleError(error, '导出错误日志', { showToast: true });
      } else {
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    }
  }
}) 