// debug.js
const app = getApp();
const AdaptationTester = require('../../utils/adaptation-test');

Page({
  data: {
    records: [],
    storageInfo: {},
    debugInfo: '',
    systemInfo: {},
    adaptationInfo: {},
    adaptedStyles: {}
  },
  
  onLoad() {
    this.initSystemAdaptation();
    this.loadDebugData();
  },
  
  onPullDownRefresh() {
    this.loadDebugData();
    wx.stopPullDownRefresh();
  },
  
  loadDebugData() {
    try {
      const storageManager = app.getStorageManager();
      if (!storageManager) {
        this.setData({
          debugInfo: '存储管理器未初始化'
        });
        return;
      }
      
      // 获取所有记录
      const records = storageManager.safeGetStorage('records', []);
      
      // 获取存储信息
      const storageInfo = storageManager.getStorageInfo();
      
      this.setData({
        records: records,
        storageInfo: storageInfo,
        debugInfo: '数据加载成功'
      });
    } catch (error) {
      this.setData({
        debugInfo: '加载失败: ' + error.message
      });
    }
  },
  
  clearCache() {
    try {
      const storageManager = app.getStorageManager();
      if (storageManager && storageManager.cache) {
        storageManager.cache.clear();
        storageManager.cacheExpiry.clear();
        
        wx.showToast({
          title: '缓存已清除',
          icon: 'success'
        });
        
        this.loadDebugData();
      }
    } catch (error) {
      wx.showToast({
        title: '清除缓存失败',
        icon: 'none'
      });
    }
  },
  
  optimizeStorage() {
    try {
      const storageManager = app.getStorageManager();
      if (storageManager) {
        const result = storageManager.optimizeStorage();
        
        wx.showToast({
          title: result ? '优化成功' : '无需优化',
          icon: 'success'
        });
        
        this.loadDebugData();
      }
    } catch (error) {
      wx.showToast({
        title: '优化失败',
        icon: 'none'
      });
    }
  },
  
  forceReload() {
    // 强制重新加载所有页面数据
    try {
      // 清除缓存
      const storageManager = app.getStorageManager();
      if (storageManager && storageManager.cache) {
        storageManager.cache.clear();
        storageManager.cacheExpiry.clear();
      }
      
      // 重新加载当前页面
      this.loadDebugData();
      
      wx.showToast({
        title: '强制刷新成功',
        icon: 'success'
      });
      
      // 提示用户返回统计页面
      setTimeout(() => {
        wx.showModal({
          title: '刷新完成',
          content: '请返回统计页面查看是否已更新',
          showCancel: false,
          confirmText: '确定'
        });
      }, 1000);
    } catch (error) {
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }
  },

  // 初始化系统适配
  initSystemAdaptation() {
    try {
      // 获取应用全局的系统信息
      const systemInfo = app.getSystemInfo();
      
      // 生成适配信息用于调试显示
      const adaptationInfo = this.generateAdaptationInfo(systemInfo);
      
      // 计算适配样式
      const adaptedStyles = this.calculateAdaptedStyles(systemInfo);
      
      this.setData({
        systemInfo: systemInfo,
        adaptationInfo: adaptationInfo,
        adaptedStyles: adaptedStyles
      });
      
      console.log('调试页面系统适配完成:', { systemInfo, adaptationInfo, adaptedStyles });
    } catch (error) {
      console.error('调试页面系统适配初始化失败:', error);
      // 设置默认适配样式
      this.setData({
        systemInfo: {},
        adaptationInfo: { error: '适配信息获取失败' },
        adaptedStyles: this.getDefaultAdaptedStyles()
      });
    }
  },

  // 生成适配信息用于调试显示
  generateAdaptationInfo(systemInfo) {
    if (!systemInfo || !systemInfo.windowWidth) {
      return { error: '系统信息不完整' };
    }

    const { 
      brand, model, system, platform, version,
      screenWidth, screenHeight, windowWidth, windowHeight, pixelRatio,
      safeArea, statusBarHeight, isIPhoneX, screenType, safeAreaBottom
    } = systemInfo;

    return {
      // 设备基本信息
      device: {
        brand: brand || '未知',
        model: model || '未知',
        system: system || '未知',
        platform: platform || '未知',
        version: version || '未知'
      },
      
      // 屏幕信息
      screen: {
        screenSize: `${screenWidth}×${screenHeight}`,
        windowSize: `${windowWidth}×${windowHeight}`,
        pixelRatio: pixelRatio || 1,
        screenType: screenType || 'normal',
        aspectRatio: (windowHeight / windowWidth).toFixed(2)
      },
      
      // 适配信息
      adaptation: {
        isIPhoneX: isIPhoneX || false,
        isAndroid: platform === 'android',
        isIOS: platform === 'ios',
        statusBarHeight: statusBarHeight || 0,
        safeAreaBottom: safeAreaBottom || 0,
        rpxRatio: (750 / windowWidth).toFixed(2)
      },
      
      // 安全区域信息
      safeAreaInfo: safeArea ? {
        top: safeArea.top,
        right: safeArea.right,
        bottom: safeArea.bottom,
        left: safeArea.left,
        width: safeArea.width,
        height: safeArea.height
      } : null
    };
  },

  // 计算适配样式
  calculateAdaptedStyles(systemInfo) {
    if (!systemInfo || !systemInfo.windowWidth) {
      return this.getDefaultAdaptedStyles();
    }

    const { windowWidth, windowHeight, screenType, safeAreaBottom } = systemInfo;
    
    return {
      // 页面容器底部间距
      pageBottomPadding: safeAreaBottom ? `${safeAreaBottom}px` : '0px',
      
      // 字体大小适配
      titleFontSize: windowWidth < 350 ? '48rpx' : windowWidth > 400 ? '60rpx' : '56rpx',
      contentFontSize: windowWidth < 350 ? '26rpx' : '28rpx',
      
      // 按钮尺寸适配
      buttonHeight: screenType === 'long' ? '88rpx' : '80rpx',
      buttonFontSize: windowWidth < 350 ? '30rpx' : '32rpx',
      
      // 卡片间距适配
      cardMargin: windowWidth < 350 ? '16rpx' : '20rpx',
      cardPadding: windowWidth < 350 ? '16rpx' : '20rpx',
      
      // 列表项高度适配
      listItemHeight: windowWidth < 350 ? '100rpx' : '120rpx',
      
      // 是否为特殊屏幕
      isLongScreen: screenType === 'long',
      isSmallScreen: windowWidth < 350,
      isLargeScreen: windowWidth > 400
    };
  },

  // 获取默认适配样式
  getDefaultAdaptedStyles() {
    return {
      pageBottomPadding: '0px',
      titleFontSize: '56rpx',
      contentFontSize: '28rpx',
      buttonHeight: '80rpx',
      buttonFontSize: '32rpx',
      cardMargin: '20rpx',
      cardPadding: '20rpx',
      listItemHeight: '120rpx',
      isLongScreen: false,
      isSmallScreen: false,
      isLargeScreen: false
    };
  },

  // 显示适配信息
  showAdaptationInfo() {
    const { adaptationInfo } = this.data;
    
    if (adaptationInfo.error) {
      wx.showModal({
        title: '适配信息',
        content: adaptationInfo.error,
        showCancel: false
      });
      return;
    }

    let content = '';
    content += `设备: ${adaptationInfo.device.brand} ${adaptationInfo.device.model}\n`;
    content += `系统: ${adaptationInfo.device.system}\n`;
    content += `平台: ${adaptationInfo.device.platform}\n`;
    content += `屏幕: ${adaptationInfo.screen.screenSize}\n`;
    content += `窗口: ${adaptationInfo.screen.windowSize}\n`;
    content += `像素比: ${adaptationInfo.screen.pixelRatio}\n`;
    content += `屏幕类型: ${adaptationInfo.screen.screenType}\n`;
    content += `宽高比: ${adaptationInfo.screen.aspectRatio}\n`;
    content += `iPhone X: ${adaptationInfo.adaptation.isIPhoneX ? '是' : '否'}\n`;
    content += `状态栏高度: ${adaptationInfo.adaptation.statusBarHeight}px\n`;
    content += `底部安全区: ${adaptationInfo.adaptation.safeAreaBottom}px\n`;
    content += `rpx比例: ${adaptationInfo.adaptation.rpxRatio}`;

    wx.showModal({
      title: '设备适配信息',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 测试适配效果
  async testAdaptation() {
    try {
      wx.showLoading({
        title: '运行适配测试...',
        mask: true
      });

      const adaptationManager = app.getAdaptationManager();
      if (!adaptationManager) {
        wx.hideLoading();
        wx.showToast({
          title: '适配管理器未初始化',
          icon: 'none'
        });
        return;
      }

      const tester = new AdaptationTester(adaptationManager);
      const testResults = await tester.runFullTest();
      
      wx.hideLoading();

      // 显示测试结果摘要
      const { summary } = testResults;
      let resultText = `适配测试完成!\n\n`;
      resultText += `总计: ${summary.total} 项\n`;
      resultText += `通过: ${summary.passed} 项\n`;
      resultText += `警告: ${summary.warnings} 项\n`;
      resultText += `失败: ${summary.failed} 项\n\n`;
      
      if (summary.failed > 0) {
        resultText += `⚠️ 发现 ${summary.failed} 项失败，需要修复`;
      } else if (summary.warnings > 0) {
        resultText += `⚠️ 发现 ${summary.warnings} 项警告，建议优化`;
      } else {
        resultText += `✅ 所有测试通过，适配效果良好`;
      }

      wx.showModal({
        title: '适配测试结果',
        content: resultText,
        showCancel: true,
        confirmText: '确定',
        cancelText: '详细报告',
        success: (res) => {
          if (!res.confirm && res.cancel) {
            this.showDetailedTestReport(testResults);
          }
        }
      });

    } catch (error) {
      wx.hideLoading();
      console.error('适配测试失败:', error);
      wx.showToast({
        title: '测试失败',
        icon: 'none'
      });
    }
  },

  // 显示详细测试报告
  showDetailedTestReport(testResults) {
    try {
      const adaptationManager = app.getAdaptationManager();
      const tester = new AdaptationTester(adaptationManager);
      const report = tester.generateReport(testResults);
      
      // 将报告写入临时文件
      const fs = wx.getFileSystemManager();
      const fileName = `适配测试报告-${new Date().toISOString().slice(0, 10)}.txt`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: report,
        encoding: 'utf8',
        success: () => {
          wx.showModal({
            title: '测试报告',
            content: '详细测试报告已生成，是否查看？',
            success: (res) => {
              if (res.confirm) {
                wx.openDocument({
                  filePath: filePath,
                  showMenu: true,
                  success: () => {
                    console.log('测试报告打开成功');
                  },
                  fail: (err) => {
                    console.error('测试报告打开失败:', err);
                    wx.showToast({
                      title: '报告打开失败',
                      icon: 'none'
                    });
                  }
                });
              }
            }
          });
        },
        fail: (err) => {
          console.error('测试报告写入失败:', err);
          wx.showToast({
            title: '报告生成失败',
            icon: 'none'
          });
        }
      });
      
    } catch (error) {
      console.error('生成详细报告失败:', error);
      wx.showToast({
        title: '报告生成失败',
        icon: 'none'
      });
    }
  },

  // 运行性能测试
  async runPerformanceTest() {
    try {
      wx.showLoading({
        title: '性能测试中...',
        mask: true
      });

      const startTime = Date.now();
      
      // 测试适配管理器性能
      const adaptationManager = app.getAdaptationManager();
      const config = adaptationManager.getConfig();
      const systemInfo = adaptationManager.getSystemInfo();
      
      // 测试多次获取配置的性能
      const iterations = 1000;
      const configStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        adaptationManager.getConfig();
      }
      const configEndTime = Date.now();
      
      // 测试样式计算性能
      const styleStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        adaptationManager.getPageStyles();
      }
      const styleEndTime = Date.now();
      
      const totalTime = Date.now() - startTime;
      
      wx.hideLoading();
      
      let performanceReport = `性能测试报告:\n\n`;
      performanceReport += `总耗时: ${totalTime}ms\n`;
      performanceReport += `配置获取 (${iterations}次): ${configEndTime - configStartTime}ms\n`;
      performanceReport += `样式计算 (${iterations}次): ${styleEndTime - styleStartTime}ms\n`;
      performanceReport += `平均配置获取: ${((configEndTime - configStartTime) / iterations).toFixed(2)}ms\n`;
      performanceReport += `平均样式计算: ${((styleEndTime - styleStartTime) / iterations).toFixed(2)}ms\n\n`;
      
      if (totalTime < 100) {
        performanceReport += `✅ 性能优秀`;
      } else if (totalTime < 500) {
        performanceReport += `✅ 性能良好`;
      } else {
        performanceReport += `⚠️ 性能需要优化`;
      }
      
      wx.showModal({
        title: '性能测试结果',
        content: performanceReport,
        showCancel: false,
        confirmText: '确定'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('性能测试失败:', error);
      wx.showToast({
        title: '性能测试失败',
        icon: 'none'
      });
    }
  },

  // 导出适配信息
  exportAdaptationInfo() {
    try {
      const adaptationManager = app.getAdaptationManager();
      const debugInfo = adaptationManager.getDebugInfo();
      
      let exportContent = `设备适配信息导出\n`;
      exportContent += `导出时间: ${new Date().toLocaleString()}\n`;
      exportContent += `${'='.repeat(50)}\n\n`;
      
      // 系统信息
      exportContent += `系统信息:\n`;
      const { systemInfo } = debugInfo;
      if (systemInfo) {
        exportContent += `品牌: ${systemInfo.brand}\n`;
        exportContent += `型号: ${systemInfo.model}\n`;
        exportContent += `系统: ${systemInfo.system}\n`;
        exportContent += `平台: ${systemInfo.platform}\n`;
        exportContent += `版本: ${systemInfo.version}\n`;
        exportContent += `屏幕尺寸: ${systemInfo.screenWidth}×${systemInfo.screenHeight}\n`;
        exportContent += `窗口尺寸: ${systemInfo.windowWidth}×${systemInfo.windowHeight}\n`;
        exportContent += `像素比: ${systemInfo.pixelRatio}\n`;
        exportContent += `设备类型: ${systemInfo.deviceType}\n`;
        exportContent += `屏幕类型: ${systemInfo.screenType}\n`;
        exportContent += `iPhone X: ${systemInfo.isIPhoneX ? '是' : '否'}\n`;
        exportContent += `底部安全区: ${systemInfo.safeAreaBottom}px\n`;
      }
      
      // 适配配置
      exportContent += `\n适配配置:\n`;
      const { adaptationConfig } = debugInfo;
      if (adaptationConfig) {
        exportContent += `字体大小:\n`;
        Object.keys(adaptationConfig.fontSize).forEach(key => {
          exportContent += `  ${key}: ${adaptationConfig.fontSize[key]}\n`;
        });
        
        exportContent += `间距设置:\n`;
        Object.keys(adaptationConfig.spacing).forEach(key => {
          exportContent += `  ${key}: ${adaptationConfig.spacing[key]}\n`;
        });
        
        exportContent += `尺寸设置:\n`;
        Object.keys(adaptationConfig.size).forEach(key => {
          exportContent += `  ${key}: ${adaptationConfig.size[key]}\n`;
        });
      }
      
      // 写入文件
      const fs = wx.getFileSystemManager();
      const fileName = `设备适配信息-${new Date().toISOString().slice(0, 10)}.txt`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: exportContent,
        encoding: 'utf8',
        success: () => {
          wx.showToast({
            title: '导出成功',
            icon: 'success'
          });
          
          // 提供分享选项
          setTimeout(() => {
            wx.showActionSheet({
              itemList: ['发送给朋友', '预览文件'],
              success: (res) => {
                switch (res.tapIndex) {
                  case 0:
                    wx.shareFileMessage({
                      filePath: filePath,
                      fileName: fileName,
                      success: () => {
                        wx.showToast({
                          title: '分享成功',
                          icon: 'success'
                        });
                      }
                    });
                    break;
                  case 1:
                    wx.openDocument({
                      filePath: filePath,
                      showMenu: true
                    });
                    break;
                }
              }
            });
          }, 1000);
        },
        fail: (err) => {
          console.error('适配信息导出失败:', err);
          wx.showToast({
            title: '导出失败',
            icon: 'none'
          });
        }
      });
      
    } catch (error) {
      console.error('导出适配信息失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  }
})