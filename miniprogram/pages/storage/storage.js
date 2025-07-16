const app = getApp();

Page({
  data: {
    storageInfo: {},
    healthReport: {},
    storageManager: null,
    errorHandler: null,
    isLoading: false,
    systemDiagnosis: null
  },

  onLoad() {
    try {
      // 获取存储管理器和错误处理器实例
      this.setData({
        storageManager: app.getStorageManager(),
        errorHandler: app.getErrorHandler()
      });
      
      this.loadStorageInfo();
      this.loadSystemDiagnosis();
      
    } catch (error) {
      const errorHandler = app.getErrorHandler();
      errorHandler.handleError(error, '存储管理页面初始化', {
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
    this.loadStorageInfo();
  },

  onPullDownRefresh() {
    this.loadStorageInfo();
    wx.stopPullDownRefresh();
  },

  // 加载存储信息
  loadStorageInfo() {
    const { storageManager, errorHandler } = this.data;
    
    if (!storageManager) {
      console.error('存储管理器未初始化');
      return;
    }

    this.setData({ isLoading: true });

    try {
      // 获取存储使用情况
      const storageInfo = storageManager.getStorageInfo();
      
      // 获取健康状态报告
      const healthReport = storageManager.checkStorageHealth();

      this.setData({
        storageInfo: storageInfo,
        healthReport: healthReport,
        isLoading: false
      });

    } catch (error) {
      this.setData({ isLoading: false });
      
      if (errorHandler) {
        errorHandler.handleError(error, '加载存储信息', {
          showToast: true,
          recovery: () => {
            setTimeout(() => {
              this.loadStorageInfo();
            }, 1000);
          }
        });
      } else {
        console.error('加载存储信息失败:', error);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    }
  },

  // 加载系统诊断信息
  async loadSystemDiagnosis() {
    const { errorHandler } = this.data;
    
    if (!errorHandler) {
      return;
    }

    try {
      const diagnosis = await errorHandler.systemDiagnosis();
      this.setData({
        systemDiagnosis: diagnosis
      });
    } catch (error) {
      console.error('加载系统诊断失败:', error);
    }
  },

  // 手动创建备份
  onCreateBackup() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '创建备份',
      content: '确定要手动创建数据备份吗？',
      success: (res) => {
        if (res.confirm) {
          const success = storageManager.manualBackup();
          if (success) {
            this.loadStorageInfo();
          }
        }
      }
    });
  },

  // 优化存储
  onOptimizeStorage() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '优化存储',
      content: '将清理重复数据并优化存储结构，确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '优化中...',
            mask: true
          });

          try {
            const optimized = storageManager.optimizeStorage();
            wx.hideLoading();
            
            if (optimized) {
              wx.showToast({
                title: '优化完成',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: '无需优化',
                icon: 'none'
              });
            }
            
            this.loadStorageInfo();
          } catch (error) {
            wx.hideLoading();
            console.error('存储优化失败:', error);
            wx.showToast({
              title: '优化失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 清理历史数据
  onCleanupData() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中',
        icon: 'none'
      });
      return;
    }

    wx.showActionSheet({
      itemList: ['清理1年前数据', '清理6个月前数据', '清理3个月前数据'],
      success: (res) => {
        let daysToKeep;
        let description;
        
        switch (res.tapIndex) {
          case 0:
            daysToKeep = 365;
            description = '1年前';
            break;
          case 1:
            daysToKeep = 180;
            description = '6个月前';
            break;
          case 2:
            daysToKeep = 90;
            description = '3个月前';
            break;
          default:
            return;
        }

        wx.showModal({
          title: '清理确认',
          content: `确定要清理${description}的数据吗？此操作不可恢复。`,
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.showLoading({
                title: '清理中...',
                mask: true
              });

              try {
                const cleanedCount = storageManager.cleanupOldData(daysToKeep);
                wx.hideLoading();
                
                wx.showToast({
                  title: `清理了${cleanedCount}条记录`,
                  icon: 'success'
                });
                
                this.loadStorageInfo();
              } catch (error) {
                wx.hideLoading();
                console.error('数据清理失败:', error);
                wx.showToast({
                  title: '清理失败',
                  icon: 'none'
                });
              }
            }
          }
        });
      }
    });
  },

  // 重置所有数据
  onResetAllData() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '危险操作',
      content: '确定要重置所有数据吗？此操作将清空所有打卡记录，且不可恢复！',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          // 二次确认
          wx.showModal({
            title: '最终确认',
            content: '请再次确认：真的要删除所有数据吗？',
            confirmColor: '#ff4444',
            success: (finalRes) => {
              if (finalRes.confirm) {
                const success = storageManager.resetAllData();
                if (success) {
                  this.loadStorageInfo();
                  
                  // 返回首页
                  setTimeout(() => {
                    wx.switchTab({
                      url: '/pages/index/index'
                    });
                  }, 1500);
                }
              }
            }
          });
        }
      }
    });
  },

  // 查看错误日志
  onViewErrorLog() {
    const { storageManager } = this.data;
    
    if (!storageManager) {
      wx.showToast({
        title: '系统初始化中',
        icon: 'none'
      });
      return;
    }

    try {
      const errorLog = storageManager.safeGetStorage('errorLog', []);
      
      if (errorLog.length === 0) {
        wx.showToast({
          title: '暂无错误记录',
          icon: 'none'
        });
        return;
      }

      let logContent = '最近的错误记录:\n\n';
      errorLog.slice(-5).forEach((log, index) => {
        logContent += `${index + 1}. ${new Date(log.timestamp).toLocaleString()}\n`;
        logContent += `   ${log.message}\n\n`;
      });

      wx.showModal({
        title: '错误日志',
        content: logContent,
        showCancel: true,
        confirmText: '清空日志',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            storageManager.safeSetStorage('errorLog', []);
            wx.showToast({
              title: '日志已清空',
              icon: 'success'
            });
          }
        }
      });

    } catch (error) {
      console.error('查看错误日志失败:', error);
      wx.showToast({
        title: '查看失败',
        icon: 'none'
      });
    }
  },

  // 导出存储信息
  onExportStorageInfo() {
    const { storageInfo, healthReport } = this.data;

    try {
      let reportContent = '存储状态报告\n';
      reportContent += `生成时间: ${new Date().toLocaleString()}\n`;
      reportContent += '='.repeat(30) + '\n\n';
      
      reportContent += '存储使用情况:\n';
      reportContent += `总使用量: ${storageInfo.totalSize}KB\n`;
      reportContent += `存储限制: ${storageInfo.limitSize}KB\n`;
      reportContent += `使用率: ${storageInfo.usagePercent}%\n`;
      reportContent += `记录数量: ${storageInfo.recordCount}条\n\n`;
      
      reportContent += '健康状态:\n';
      reportContent += `状态: ${healthReport.isHealthy ? '健康' : '异常'}\n`;
      
      if (healthReport.issues && healthReport.issues.length > 0) {
        reportContent += '发现问题:\n';
        healthReport.issues.forEach((issue, index) => {
          reportContent += `${index + 1}. ${issue}\n`;
        });
        reportContent += '\n';
      }
      
      if (healthReport.suggestions && healthReport.suggestions.length > 0) {
        reportContent += '建议操作:\n';
        healthReport.suggestions.forEach((suggestion, index) => {
          reportContent += `${index + 1}. ${suggestion}\n`;
        });
      }

      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const fileName = `存储状态报告-${new Date().toISOString().slice(0, 10)}.txt`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: reportContent,
        encoding: 'utf8',
        success: () => {
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
                    },
                    fail: () => {
                      wx.showToast({
                        title: '分享失败',
                        icon: 'none'
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
        },
        fail: (err) => {
          console.error('导出存储信息失败:', err);
          wx.showToast({
            title: '导出失败',
            icon: 'none'
          });
        }
      });

    } catch (error) {
      console.error('导出存储信息失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  },

  // 运行存储测试（开发调试用）
  onRunStorageTest() {
    if (typeof __wxConfig === 'undefined' || !__wxConfig.debug) {
      wx.showToast({
        title: '仅在开发模式下可用',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '运行存储测试',
      content: '这将运行存储管理器的功能测试，确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '运行测试中...',
            mask: true
          });

          try {
            const StorageTest = require('../../utils/storage-test');
            const tester = new StorageTest();
            const results = tester.runAllTests();
            const stats = tester.getTestStats();

            wx.hideLoading();

            wx.showModal({
              title: '测试完成',
              content: `总测试: ${stats.total}\n通过: ${stats.passed}\n失败: ${stats.failed}\n成功率: ${stats.successRate}%`,
              showCancel: false,
              confirmText: '查看详情',
              success: () => {
                console.log('详细测试结果:', results);
              }
            });

          } catch (error) {
            wx.hideLoading();
            console.error('运行测试失败:', error);
            wx.showToast({
              title: '测试运行失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 显示系统诊断详情
  onShowSystemDiagnosis() {
    const { systemDiagnosis, errorHandler } = this.data;
    
    if (!systemDiagnosis) {
      wx.showToast({
        title: '诊断信息未加载',
        icon: 'none'
      });
      return;
    }

    let content = '系统状态正常';
    if (systemDiagnosis.issues.length > 0) {
      content = `发现 ${systemDiagnosis.issues.length} 个问题：\n${systemDiagnosis.issues.join('\n')}\n\n建议：\n${systemDiagnosis.suggestions.join('\n')}`;
    }

    wx.showModal({
      title: '系统诊断',
      content: content,
      showCancel: systemDiagnosis.issues.length > 0,
      confirmText: '确定',
      cancelText: '查看详情',
      success: (res) => {
        if (!res.confirm && res.cancel) {
          this.showDiagnosisDetails();
        }
      }
    });
  },

  // 显示诊断详情
  showDiagnosisDetails() {
    const { systemDiagnosis } = this.data;
    
    const details = [
      `系统版本: ${systemDiagnosis.systemInfo.system || '未知'}`,
      `微信版本: ${systemDiagnosis.systemInfo.version || '未知'}`,
      `存储使用: ${systemDiagnosis.storageInfo.currentSize || 0}KB / ${systemDiagnosis.storageInfo.limitSize || 0}KB`,
      `网络状态: ${systemDiagnosis.networkInfo.isConnected ? systemDiagnosis.networkInfo.networkType : '离线'}`,
      `诊断时间: ${new Date(systemDiagnosis.timestamp).toLocaleString()}`
    ].join('\n');

    wx.showModal({
      title: '系统详情',
      content: details,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 查看新版错误日志
  onViewNewErrorLog() {
    const { errorHandler } = this.data;
    
    if (!errorHandler) {
      wx.showToast({
        title: '系统初始化中',
        icon: 'none'
      });
      return;
    }

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
          this.clearNewErrorLogs();
        }
      }
    });
  },

  // 清除新版错误日志
  clearNewErrorLogs() {
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
  async onExportErrorLog() {
    const { errorHandler } = this.data;
    
    if (!errorHandler) {
      wx.showToast({
        title: '系统初始化中',
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
                    },
                    fail: () => {
                      wx.showToast({
                        title: '分享失败',
                        icon: 'none'
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

  // 检查网络状态
  async onCheckNetworkStatus() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      await errorHandler.showNetworkStatus();
    }
  },

  // 显示操作指导
  onShowGuide() {
    const { errorHandler } = this.data;
    if (errorHandler) {
      errorHandler.showOperationGuide('storage');
    } else {
      app.showOperationGuide('storage');
    }
  },

  // 长按显示更多选项
  onLongPress() {
    wx.showActionSheet({
      itemList: ['操作指导', '系统诊断', '检查网络状态', '导出错误日志', '应用崩溃恢复'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onShowGuide();
            break;
          case 1:
            this.onShowSystemDiagnosis();
            break;
          case 2:
            this.onCheckNetworkStatus();
            break;
          case 3:
            this.onExportErrorLog();
            break;
          case 4:
            this.onCrashRecovery();
            break;
        }
      }
    });
  },

  // 应用崩溃恢复
  onCrashRecovery() {
    const { errorHandler } = this.data;
    
    if (!errorHandler) {
      wx.showToast({
        title: '系统初始化中',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '崩溃恢复',
      content: '这将检查并恢复应用异常状态，确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            errorHandler.crashRecovery();
            wx.showToast({
              title: '恢复检查完成',
              icon: 'success'
            });
          } catch (error) {
            errorHandler.handleError(error, '崩溃恢复', { showToast: true });
          }
        }
      }
    });
  }
});