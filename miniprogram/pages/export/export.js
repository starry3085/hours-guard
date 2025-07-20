const app = getApp();

Page({
  data: {
    selectedStartDate: '',
    selectedStartMonth: '',
    selectedEndDate: '',
    selectedEndMonth: '',
    isGenerating: false,
    recordCount: 0,
    exportedText: '', // 存储导出的文本内容
    storageManager: null,
    errorHandler: null,
    systemInfo: {},
    adaptedStyles: {},
    showPreview: false, // 控制预览弹窗的显示
    workStats: {
      weeklyTotal: '0小时',
      weeklyAverage: '0小时',
      monthlyAverage: '0小时',
      monthlyDays: '0天'
    },
    // 日期选择器相关数据
    showStartDatePicker: false,
    showEndDatePicker: false,
    yearList: [],
    monthList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    tempStartYear: 0,
    tempStartMonth: 0,
    tempEndYear: 0,
    tempEndMonth: 0
  },

  onLoad() {
    try {
      // 获取系统信息进行适配
      this.initSystemAdaptation();

      // 获取存储管理器和错误处理器实例
      this.setData({
        storageManager: app.getStorageManager(),
        errorHandler: app.getErrorHandler()
      });

      // 初始化年份列表（从2020年到当前年份后2年）
      const currentYear = new Date().getFullYear();
      const yearList = [];
      for (let y = 2020; y <= currentYear + 2; y++) {
        yearList.push(y);
      }

      // 初始化为当前月份
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const selectedStartDate = `${year}-${month.toString().padStart(2, '0')}`;
      const selectedStartMonth = `${year}年${month}月`;

      // 默认结束月份也是当前月份
      const selectedEndDate = selectedStartDate;
      const selectedEndMonth = selectedStartMonth;

      this.setData({
        yearList,
        selectedStartDate,
        selectedStartMonth,
        selectedEndDate,
        selectedEndMonth,
        tempStartYear: year,
        tempStartMonth: month,
        tempEndYear: year,
        tempEndMonth: month
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
    const { storageManager, errorHandler, selectedStartDate, selectedEndDate } = this.data;

    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中，请稍后',
        icon: 'none'
      });
      return;
    }

    try {
      // 获取所有记录
      const allRecords = storageManager.safeGetStorage('records', []);

      // 计算日期范围
      const startDate = new Date(selectedStartDate + '-01');
      const endDateObj = new Date(selectedEndDate + '-01');
      // 设置为下个月的第0天，即当月最后一天
      endDateObj.setMonth(endDateObj.getMonth() + 1, 0);
      const endDate = endDateObj;

      // 筛选日期范围内的记录
      const rangeRecords = allRecords.filter(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });

      // 计算工时统计数据
      const workStats = this.calculateWorkStats(rangeRecords);

      this.setData({
        recordCount: rangeRecords.length,
        workStats: workStats
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

  // 计算工时统计数据
  calculateWorkStats(records) {
    // 默认值
    let stats = {
      weeklyTotal: '0小时',
      weeklyAverage: '0小时',
      monthlyAverage: '0小时',
      monthlyDays: '0天'
    };

    if (!records || records.length === 0) {
      return stats;
    }

    try {
      // 计算每天的工作时长
      const dailyHours = records.map(record => {
        if (!record.on || !record.off) return 0;

        const onTime = this.parseTimeToMinutes(record.on);
        const offTime = this.parseTimeToMinutes(record.off);

        if (onTime === null || offTime === null) return 0;

        // 计算工作时长（小时）
        return Math.max(0, (offTime - onTime) / 60);
      });

      // 计算本月总工时和打卡天数
      const monthlyTotalHours = dailyHours.reduce((sum, hours) => sum + hours, 0);
      const monthlyWorkDays = dailyHours.filter(hours => hours > 0).length;

      // 计算本月平均工时
      const monthlyAverage = monthlyWorkDays > 0 ? monthlyTotalHours / monthlyWorkDays : 0;

      // 获取当前日期
      const now = new Date();
      const currentDate = now.getDate();
      const currentDay = now.getDay(); // 0是周日，1-6是周一到周六

      // 计算本周的开始日期（周一）
      const weekStartDate = new Date(now);
      const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
      weekStartDate.setDate(currentDate - daysSinceMonday);

      // 筛选本周的记录
      const weeklyRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStartDate;
      });

      // 计算本周的工作时长
      const weeklyHours = weeklyRecords.map(record => {
        if (!record.on || !record.off) return 0;

        const onTime = this.parseTimeToMinutes(record.on);
        const offTime = this.parseTimeToMinutes(record.off);

        if (onTime === null || offTime === null) return 0;

        return Math.max(0, (offTime - onTime) / 60);
      });

      // 计算本周总工时和工作天数
      const weeklyTotalHours = weeklyHours.reduce((sum, hours) => sum + hours, 0);
      const weeklyWorkDays = weeklyHours.filter(hours => hours > 0).length;

      // 计算本周平均工时
      const weeklyAverage = weeklyWorkDays > 0 ? weeklyTotalHours / weeklyWorkDays : 0;

      // 格式化结果 - 使用更精确的格式化方式
      const formatHours = (hours) => {
        if (hours === 0) return '0小时';
        if (hours < 1) {
          const minutes = Math.round(hours * 60);
          return `${minutes}分钟`;
        }
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        if (minutes === 0) {
          return `${wholeHours}小时`;
        }
        return `${wholeHours}小时${minutes}分钟`;
      };

      stats = {
        weeklyTotal: formatHours(weeklyTotalHours),
        weeklyAverage: formatHours(weeklyAverage),
        monthlyAverage: formatHours(monthlyAverage),
        monthlyDays: `${monthlyWorkDays}天`
      };

      return stats;
    } catch (error) {
      console.error('计算工时统计出错:', error);
      return stats;
    }
  },

  // 将时间字符串解析为分钟数
  parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;

    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    } catch (error) {
      console.error('时间解析错误:', error);
      return null;
    }
  },

  // 打开起始日期选择器
  openStartDatePicker() {
    const { selectedStartDate } = this.data;
    const [year, month] = selectedStartDate.split('-').map(Number);

    this.setData({
      showStartDatePicker: true,
      showEndDatePicker: false,
      tempStartYear: year,
      tempStartMonth: month
    });
  },

  // 打开结束日期选择器
  openEndDatePicker() {
    const { selectedEndDate } = this.data;
    const [year, month] = selectedEndDate.split('-').map(Number);

    this.setData({
      showEndDatePicker: true,
      showStartDatePicker: false,
      tempEndYear: year,
      tempEndMonth: month
    });
  },

  // 关闭日期选择器
  closeDatePicker() {
    this.setData({
      showStartDatePicker: false,
      showEndDatePicker: false
    });
  },

  // 选择起始年份
  selectStartYear(e) {
    const year = e.currentTarget.dataset.year;
    this.setData({
      tempStartYear: year
    });
  },

  // 选择起始月份
  selectStartMonth(e) {
    const month = e.currentTarget.dataset.month;
    this.setData({
      tempStartMonth: month
    });
  },

  // 选择结束年份
  selectEndYear(e) {
    const year = e.currentTarget.dataset.year;
    this.setData({
      tempEndYear: year
    });
  },

  // 选择结束月份
  selectEndMonth(e) {
    const month = e.currentTarget.dataset.month;
    this.setData({
      tempEndMonth: month
    });
  },

  // 确认起始日期选择
  confirmStartDateSelection() {
    const { tempStartYear, tempStartMonth } = this.data;

    // 格式化日期
    const selectedStartDate = `${tempStartYear}-${tempStartMonth.toString().padStart(2, '0')}`;
    const selectedStartMonth = `${tempStartYear}年${tempStartMonth}月`;

    this.setData({
      selectedStartDate,
      selectedStartMonth,
      showStartDatePicker: false,
      exportedText: '',
      showPreview: false
    }, () => {
      // 确保起始日期不晚于结束日期
      const startDate = new Date(this.data.selectedStartDate + '-01');
      const endDate = new Date(this.data.selectedEndDate + '-01');

      if (startDate > endDate) {
        // 如果起始日期晚于结束日期，则将结束日期设置为起始日期
        this.setData({
          selectedEndDate: this.data.selectedStartDate,
          selectedEndMonth: this.data.selectedStartMonth,
          tempEndYear: tempStartYear,
          tempEndMonth: tempStartMonth
        });
      }

      this.loadMonthData();
    });
  },

  // 确认结束日期选择
  confirmEndDateSelection() {
    const { tempEndYear, tempEndMonth } = this.data;

    // 格式化日期
    const selectedEndDate = `${tempEndYear}-${tempEndMonth.toString().padStart(2, '0')}`;
    const selectedEndMonth = `${tempEndYear}年${tempEndMonth}月`;

    this.setData({
      selectedEndDate,
      selectedEndMonth,
      showEndDatePicker: false,
      exportedText: '',
      showPreview: false
    }, () => {
      // 确保结束日期不早于起始日期
      const startDate = new Date(this.data.selectedStartDate + '-01');
      const endDate = new Date(this.data.selectedEndDate + '-01');

      if (endDate < startDate) {
        // 如果结束日期早于起始日期，则将起始日期设置为结束日期
        this.setData({
          selectedStartDate: this.data.selectedEndDate,
          selectedStartMonth: this.data.selectedEndMonth,
          tempStartYear: tempEndYear,
          tempStartMonth: tempEndMonth
        });
      }

      this.loadMonthData();
    });
  },

  // 保留这些方法以兼容可能的外部调用
  onStartDateChange(e) {
    const value = e.detail.value;
    const [year, month] = value.split('-');

    this.setData({
      selectedStartDate: value,
      selectedStartMonth: `${year}年${month}月`,
      exportedText: '',
      showPreview: false
    }, () => {
      // 确保起始日期不晚于结束日期
      const startDate = new Date(this.data.selectedStartDate + '-01');
      const endDate = new Date(this.data.selectedEndDate + '-01');

      if (startDate > endDate) {
        this.setData({
          selectedEndDate: this.data.selectedStartDate,
          selectedEndMonth: this.data.selectedStartMonth
        });
      }

      this.loadMonthData();
    });
  },

  // 结束日期变更处理
  onEndDateChange(e) {
    const value = e.detail.value;
    const [year, month] = value.split('-');

    this.setData({
      selectedEndDate: value,
      selectedEndMonth: `${year}年${month}月`,
      exportedText: '',
      showPreview: false
    }, () => {
      // 确保结束日期不早于起始日期
      const startDate = new Date(this.data.selectedStartDate + '-01');
      const endDate = new Date(this.data.selectedEndDate + '-01');

      if (endDate < startDate) {
        this.setData({
          selectedStartDate: this.data.selectedEndDate,
          selectedStartMonth: this.data.selectedEndMonth
        });
      }

      this.loadMonthData();
    });
  },

  async makeReport() {
    const { storageManager, errorHandler, isGenerating, selectedStartDate, selectedEndDate } = this.data;

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

    try {
      // 显示加载提示
      wx.showLoading({
        title: '生成文本记录中...',
        mask: true
      });

      this.setData({ isGenerating: true });

      // 使用错误处理器的重试机制
      const rangeRecords = await errorHandler.withRetry(async () => {
        // 使用存储管理器安全获取所有记录
        const allRecords = storageManager.safeGetStorage('records', []);

        // 计算日期范围
        const startDate = new Date(selectedStartDate + '-01');
        const endDateObj = new Date(selectedEndDate + '-01');
        // 设置为下个月的第0天，即当月最后一天
        endDateObj.setMonth(endDateObj.getMonth() + 1, 0);
        const endDate = endDateObj;

        // 筛选日期范围内的记录
        const records = allRecords.filter(record => {
          if (!record.date) return false;
          const recordDate = new Date(record.date);
          return recordDate >= startDate && recordDate <= endDate;
        });

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

      // 生成文本内容
      this.generateText(rangeRecords);

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

  // 生成文本内容
  async generateText(rangeRecords) {
    const { errorHandler, selectedStartMonth, selectedEndMonth } = this.data;

    try {
      wx.showLoading({ title: '生成文本记录中...', mask: true });
      this.setData({ isGenerating: true });

      // 使用错误处理器的重试机制
      const textContent = await errorHandler.withRetry(async () => {
        // 生成报告标题，如果起始月份和结束月份相同，只显示一个月份
        const reportTitle = selectedStartMonth === selectedEndMonth ?
          `打卡记录报告 - ${selectedStartMonth}` :
          `打卡记录报告 - ${selectedStartMonth}至${selectedEndMonth}`;

        let content = `${reportTitle}\n`;
        content += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `${'='.repeat(50)}\n\n`;

        // 按月份分组记录
        const recordsByMonth = this.groupRecordsByMonth(rangeRecords);

        // 遍历每个月份的记录
        for (const [monthKey, monthRecords] of Object.entries(recordsByMonth)) {
          // 计算当前月份的工时统计
          const monthStats = this.calculateWorkStats(monthRecords);
          const [year, month] = monthKey.split('-');
          const monthTitle = `${year}年${month}月`;

          // 添加月份工时统计
          content += `${monthTitle}工时统计:\n`;
          content += `${'='.repeat(50)}\n`;
          content += `本月平均工时: ${monthStats.monthlyAverage}\n`;
          content += `本月打卡天数: ${monthStats.monthlyDays}\n`;
          content += `${'='.repeat(50)}\n\n`;

          // 添加当月详细记录
          content += `${monthTitle}详细记录:\n`;
          content += `${'='.repeat(50)}\n`;

          // 按日期排序（从早到晚）
          monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

          monthRecords.forEach(record => {
            const date = new Date(record.date);
            const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
            const weekday = `周${weekdays[date.getDay()]}`;

            content += `${record.date} (${weekday})\n`;
            content += `  上班时间: ${record.on || '未打卡'}\n`;
            content += `  下班时间: ${record.off || '未打卡'}\n`;

            // 计算日工时
            let dailyHours = '未知';
            if (record.on && record.off) {
              const onTime = this.parseTimeToMinutes(record.on);
              const offTime = this.parseTimeToMinutes(record.off);
              if (onTime !== null && offTime !== null) {
                const hours = Math.max(0, (offTime - onTime) / 60);
                dailyHours = this.formatHours(hours);
              }
            }
            content += `  日工时: ${dailyHours}\n`;
            content += `${'-'.repeat(30)}\n`;
          });

          // 添加月份分隔符
          content += `\n`;
        }

        content += `数据说明: 所有数据仅保存在本机，请妥善保管备份。`;

        return content;
      }, {
        maxRetries: 2,
        context: '生成文本内容',
        onRetry: (error, attempt) => {
          // 静默重试
        }
      });

      wx.hideLoading();
      this.setData({
        isGenerating: false,
        exportedText: textContent,
        showPreview: true
      });

      wx.showToast({
        title: '记录生成成功',
        icon: 'success'
      });

    } catch (error) {
      wx.hideLoading();
      this.setData({ isGenerating: false });

      errorHandler.handleError(error, '生成文本内容', {
        showModal: true,
        recovery: () => {
          // 恢复策略：重新尝试生成
          setTimeout(() => {
            this.generateText(rangeRecords);
          }, 1000);
        }
      });
    }
  },

  // 按月份分组记录
  groupRecordsByMonth(records) {
    const recordsByMonth = {};

    records.forEach(record => {
      if (!record.date) return;

      // 提取年月作为分组键
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      // 初始化月份分组
      if (!recordsByMonth[monthKey]) {
        recordsByMonth[monthKey] = [];
      }

      // 添加记录到对应月份
      recordsByMonth[monthKey].push(record);
    });

    return recordsByMonth;
  },

  // 格式化小时数为小时分钟格式
  formatHours(hours) {
    if (hours === 0) return '0小时';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}分钟`;
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours}小时`;
    }
    return `${wholeHours}小时${minutes}分钟`;
  },

  // 复制文本到剪贴板
  copyTextToClipboard() {
    const { exportedText } = this.data;

    if (!exportedText) {
      wx.showToast({
        title: '无内容可复制',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: exportedText,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  // 关闭预览弹窗
  closePreview() {
    this.setData({
      showPreview: false
    });
  },

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

      // 设置到剪贴板
      wx.setClipboardData({
        data: logContent,
        success: () => {
          wx.hideLoading();
          wx.showToast({
            title: '日志已复制到剪贴板',
            icon: 'success'
          });
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
  },

  // 初始化系统适配
  initSystemAdaptation() {
    try {
      // 获取应用全局的系统信息
      const systemInfo = app.getSystemInfo();

      // 计算适配样式
      const adaptedStyles = this.calculateAdaptedStyles(systemInfo);

      this.setData({
        systemInfo: systemInfo,
        adaptedStyles: adaptedStyles
      });

      console.log('导出页面系统适配完成:', { systemInfo, adaptedStyles });
    } catch (error) {
      console.error('导出页面系统适配初始化失败:', error);
      // 设置默认适配样式
      this.setData({
        systemInfo: {},
        adaptedStyles: this.getDefaultAdaptedStyles()
      });
    }
  },

  // 计算适配样式
  calculateAdaptedStyles(systemInfo) {
    if (!systemInfo || !systemInfo.windowWidth) {
      return this.getDefaultAdaptedStyles();
    }

    const { windowWidth, windowHeight, isIPhoneX, screenType, safeAreaBottom } = systemInfo;

    return {
      // 页面容器底部间距（考虑安全区域和tabBar）
      pageBottomPadding: `calc(110rpx + ${safeAreaBottom || 0}px)`,

      // 按钮尺寸适配
      buttonHeight: screenType === 'long' ? '88rpx' : '80rpx',
      buttonFontSize: windowWidth < 350 ? '30rpx' : '32rpx',

      // 标题字体大小适配
      titleFontSize: windowWidth < 350 ? '48rpx' : windowWidth > 400 ? '60rpx' : '56rpx',

      // 月份选择器适配
      pickerHeight: windowWidth < 350 ? '100rpx' : '120rpx',
      pickerFontSize: windowWidth < 350 ? '32rpx' : '38rpx',

      // 统计数字适配
      statNumberSize: windowWidth < 350 ? '48rpx' : '56rpx',
      statLabelSize: windowWidth < 350 ? '28rpx' : '32rpx',

      // 卡片间距适配
      cardMargin: windowWidth < 350 ? '16rpx' : '20rpx',
      cardPadding: windowWidth < 350 ? '24rpx' : '30rpx',

      // 是否为长屏幕
      isLongScreen: screenType === 'long',

      // 是否为小屏幕
      isSmallScreen: windowWidth < 350,

      // 是否为大屏幕
      isLargeScreen: windowWidth > 400
    };
  },

  // 获取默认适配样式
  getDefaultAdaptedStyles() {
    return {
      pageBottomPadding: '110rpx',
      buttonHeight: '80rpx',
      buttonFontSize: '32rpx',
      titleFontSize: '56rpx',
      pickerHeight: '120rpx',
      pickerFontSize: '38rpx',
      statNumberSize: '56rpx',
      statLabelSize: '32rpx',
      cardMargin: '20rpx',
      cardPadding: '30rpx',
      isLongScreen: false,
      isSmallScreen: false,
      isLargeScreen: false
    };
  }
})