/**
 * 完整工作流程集成测试
 * 测试从打卡到导出的完整用户流程
 */

const { describe, it, beforeEach, afterEach, expect, mock } = require('../unit/test-framework');

describe('完整工作流程集成测试', () => {
  let mockStorage;
  let mockWx;
  let testRecords;
  
  beforeEach(() => {
    // 模拟存储数据
    testRecords = [];
    
    // 模拟微信API
    mockWx = {
      getStorageSync: mock((key) => {
        if (key === 'records') return [...testRecords];
        if (key === 'hasShownWarning') return true;
        return null;
      }),
      setStorageSync: mock((key, data) => {
        if (key === 'records') {
          testRecords = [...data];
        }
      }),
      removeStorageSync: mock(),
      showToast: mock(),
      showModal: mock(),
      getFileSystemManager: mock(() => ({
        writeFile: mock((options) => {
          setTimeout(() => options.success(), 10);
        })
      })),
      canvasToTempFilePath: mock((options) => {
        setTimeout(() => options.success({ tempFilePath: '/tmp/test.png' }), 10);
      }),
      shareFileMessage: mock((options) => {
        setTimeout(() => options.success(), 10);
      })
    };
    
    global.wx = mockWx;
    
    // 模拟存储管理器
    mockStorage = {
      safeGetStorage: (key, defaultValue) => {
        return mockWx.getStorageSync(key) || defaultValue;
      },
      safeSetStorage: (key, data) => {
        mockWx.setStorageSync(key, data);
        return true;
      },
      validateRecordsData: (data) => {
        return Array.isArray(data) && data.every(record => 
          record && record.date && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
        );
      }
    };
  });

  afterEach(() => {
    testRecords = [];
  });

  describe('完整打卡流程', () => {
    it('应该完成完整的上下班打卡流程', async () => {
      const today = '2024-01-15';
      
      // 1. 上班打卡
      const records = mockStorage.safeGetStorage('records', []);
      records.push({
        date: today,
        on: '09:00'
      });
      mockStorage.safeSetStorage('records', records);
      
      // 验证上班打卡记录
      const afterCheckin = mockStorage.safeGetStorage('records', []);
      expect(afterCheckin).toHaveLength(1);
      expect(afterCheckin[0].date).toBe(today);
      expect(afterCheckin[0].on).toBe('09:00');
      expect(afterCheckin[0].off).toBeUndefined();
      
      // 2. 下班打卡
      const updatedRecords = mockStorage.safeGetStorage('records', []);
      const recordIndex = updatedRecords.findIndex(r => r.date === today);
      updatedRecords[recordIndex].off = '18:00';
      mockStorage.safeSetStorage('records', updatedRecords);
      
      // 验证下班打卡记录
      const afterCheckout = mockStorage.safeGetStorage('records', []);
      expect(afterCheckout).toHaveLength(1);
      expect(afterCheckout[0].date).toBe(today);
      expect(afterCheckout[0].on).toBe('09:00');
      expect(afterCheckout[0].off).toBe('18:00');
      
      // 3. 验证工作时长计算
      const record = afterCheckout[0];
      const workHours = calculateWorkHours(record.on, record.off, record.date);
      expect(workHours).toBe(9);
    });

    it('应该支持多天打卡记录', async () => {
      const dates = ['2024-01-15', '2024-01-16', '2024-01-17'];
      const times = [
        { on: '09:00', off: '18:00' },
        { on: '08:30', off: '17:30' },
        { on: '09:15', off: '18:45' }
      ];
      
      // 添加多天记录
      const records = [];
      dates.forEach((date, index) => {
        records.push({
          date: date,
          on: times[index].on,
          off: times[index].off
        });
      });
      
      mockStorage.safeSetStorage('records', records);
      
      // 验证记录
      const savedRecords = mockStorage.safeGetStorage('records', []);
      expect(savedRecords).toHaveLength(3);
      
      // 验证每条记录
      savedRecords.forEach((record, index) => {
        expect(record.date).toBe(dates[index]);
        expect(record.on).toBe(times[index].on);
        expect(record.off).toBe(times[index].off);
      });
      
      // 计算总工作时长
      let totalHours = 0;
      savedRecords.forEach(record => {
        totalHours += calculateWorkHours(record.on, record.off, record.date);
      });
      
      expect(totalHours).toBe(27); // 9 + 9 + 9 = 27小时
    });
  });

  describe('统计功能集成测试', () => {
    it('应该正确计算月度统计', async () => {
      // 准备一个月的测试数据
      const monthRecords = [
        { date: '2024-01-01', on: '09:00', off: '18:00' }, // 9小时
        { date: '2024-01-02', on: '08:30', off: '17:30' }, // 9小时
        { date: '2024-01-03', on: '09:15', off: '18:45' }, // 9.5小时
        { date: '2024-01-04', on: '09:00', off: '17:00' }, // 8小时
        { date: '2024-01-05', on: '08:45', off: '18:15' }  // 9.5小时
      ];
      
      mockStorage.safeSetStorage('records', monthRecords);
      
      // 模拟统计页面逻辑
      const allRecords = mockStorage.safeGetStorage('records', []);
      const monthPrefix = '2024-01';
      const filteredRecords = allRecords.filter(record => 
        record.date.startsWith(monthPrefix)
      );
      
      // 计算统计数据
      let totalHours = 0;
      let workDays = 0;
      
      filteredRecords.forEach(record => {
        if (record.on && record.off) {
          const workHours = calculateWorkHours(record.on, record.off, record.date);
          totalHours += workHours;
          workDays++;
        }
      });
      
      const avgDailyHours = workDays > 0 ? totalHours / workDays : 0;
      
      // 验证统计结果
      expect(filteredRecords).toHaveLength(5);
      expect(workDays).toBe(5);
      expect(totalHours).toBe(45); // 9+9+9.5+8+9.5
      expect(avgDailyHours).toBe(9);
    });

    it('应该正确处理本周统计', async () => {
      // 获取本周日期
      const today = new Date();
      const currentWeek = getCurrentWeek(today);
      
      // 准备本周测试数据
      const weekRecords = currentWeek.slice(0, 5).map((date, index) => ({
        date: date,
        on: '09:00',
        off: '18:00'
      }));
      
      mockStorage.safeSetStorage('records', weekRecords);
      
      // 计算本周统计
      const allRecords = mockStorage.safeGetStorage('records', []);
      let weekHours = 0;
      let weekWorkDays = 0;
      
      allRecords.forEach(record => {
        if (currentWeek.includes(record.date) && record.on && record.off) {
          weekHours += calculateWorkHours(record.on, record.off, record.date);
          weekWorkDays++;
        }
      });
      
      // 验证本周统计
      expect(weekWorkDays).toBe(5);
      expect(weekHours).toBe(45); // 5天 * 9小时
    });
  });

  describe('导出功能集成测试', () => {
    it('应该成功生成CSV文件', async () => {
      // 准备测试数据
      const testData = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-02', on: '08:30', off: '17:30' },
        { date: '2024-01-03', on: '09:15', off: '18:45' }
      ];
      
      mockStorage.safeSetStorage('records', testData);
      
      // 模拟CSV生成逻辑
      const monthPrefix = '2024-01';
      const monthRecords = mockStorage.safeGetStorage('records', [])
        .filter(record => record.date.startsWith(monthPrefix));
      
      // 生成CSV内容
      let csvContent = '\uFEFF'; // BOM for UTF-8
      csvContent += '日期,星期,上班时间,下班时间,工作时长(小时),备注\n';
      
      monthRecords.forEach(record => {
        const date = new Date(record.date);
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = `周${weekdays[date.getDay()]}`;
        const workHours = calculateWorkHours(record.on, record.off, record.date);
        const workHoursText = workHours > 0 ? workHours.toFixed(2) : '';
        
        csvContent += `${record.date},${weekday},${record.on || ''},${record.off || ''},${workHoursText},\n`;
      });
      
      // 验证CSV内容
      expect(csvContent).toContain('日期,星期,上班时间,下班时间,工作时长(小时),备注');
      expect(csvContent).toContain('2024-01-01');
      expect(csvContent).toContain('09:00');
      expect(csvContent).toContain('18:00');
      expect(csvContent).toContain('9.00');
      
      // 模拟文件写入
      const fs = mockWx.getFileSystemManager();
      const fileName = '打卡记录-2024年1月.csv';
      const filePath = `/tmp/${fileName}`;
      
      fs.writeFile({
        filePath: filePath,
        data: csvContent,
        encoding: 'utf8',
        success: () => {
          expect(fs.writeFile.calls).toHaveLength(1);
          expect(fs.writeFile.calls[0][0].data).toContain('2024-01-01');
        }
      });
    });

    it('应该成功生成图片报告', async () => {
      // 准备测试数据
      const testData = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-02', on: '08:30', off: '17:30' }
      ];
      
      mockStorage.safeSetStorage('records', testData);
      
      // 模拟Canvas绘制和转换
      const mockCanvas = {
        getContext: mock(() => ({
          fillStyle: '',
          font: '',
          textAlign: '',
          fillRect: mock(),
          strokeRect: mock(),
          fillText: mock(),
          beginPath: mock(),
          moveTo: mock(),
          lineTo: mock(),
          stroke: mock()
        })),
        width: 595,
        height: 842
      };
      
      // 模拟Canvas转换为文件
      mockWx.canvasToTempFilePath({
        canvas: mockCanvas,
        fileType: 'png',
        quality: 1,
        success: (res) => {
          expect(res.tempFilePath).toBe('/tmp/test.png');
          expect(mockWx.canvasToTempFilePath.calls).toHaveLength(1);
        }
      });
    });

    it('应该成功分享文件', async () => {
      const filePath = '/tmp/test-file.csv';
      const fileName = '打卡记录.csv';
      
      // 模拟文件分享
      mockWx.shareFileMessage({
        filePath: filePath,
        fileName: fileName,
        success: () => {
          expect(mockWx.shareFileMessage.calls).toHaveLength(1);
          expect(mockWx.shareFileMessage.calls[0][0].filePath).toBe(filePath);
          expect(mockWx.shareFileMessage.calls[0][0].fileName).toBe(fileName);
        }
      });
    });
  });

  describe('数据修改和同步测试', () => {
    it('应该支持修改历史记录', async () => {
      // 准备初始数据
      const initialRecords = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-02', on: '08:30', off: '17:30' }
      ];
      
      mockStorage.safeSetStorage('records', initialRecords);
      
      // 修改第一条记录的下班时间
      const records = mockStorage.safeGetStorage('records', []);
      const recordIndex = records.findIndex(r => r.date === '2024-01-01');
      records[recordIndex].off = '19:00';
      mockStorage.safeSetStorage('records', records);
      
      // 验证修改结果
      const updatedRecords = mockStorage.safeGetStorage('records', []);
      const modifiedRecord = updatedRecords.find(r => r.date === '2024-01-01');
      
      expect(modifiedRecord.off).toBe('19:00');
      expect(modifiedRecord.on).toBe('09:00'); // 其他字段不变
      
      // 验证工作时长重新计算
      const newWorkHours = calculateWorkHours(modifiedRecord.on, modifiedRecord.off, modifiedRecord.date);
      expect(newWorkHours).toBe(10); // 09:00 到 19:00 = 10小时
    });

    it('应该支持删除记录', async () => {
      // 准备初始数据
      const initialRecords = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-02', on: '08:30', off: '17:30' },
        { date: '2024-01-03', on: '09:15', off: '18:45' }
      ];
      
      mockStorage.safeSetStorage('records', initialRecords);
      
      // 删除中间的记录
      const records = mockStorage.safeGetStorage('records', []);
      const filteredRecords = records.filter(r => r.date !== '2024-01-02');
      mockStorage.safeSetStorage('records', filteredRecords);
      
      // 验证删除结果
      const remainingRecords = mockStorage.safeGetStorage('records', []);
      expect(remainingRecords).toHaveLength(2);
      expect(remainingRecords.find(r => r.date === '2024-01-02')).toBeUndefined();
      expect(remainingRecords.find(r => r.date === '2024-01-01')).toBeDefined();
      expect(remainingRecords.find(r => r.date === '2024-01-03')).toBeDefined();
    });
  });

  describe('错误处理和恢复测试', () => {
    it('应该处理存储失败的情况', async () => {
      // 模拟存储失败
      mockWx.setStorageSync = mock(() => {
        throw new Error('存储空间不足');
      });
      
      // 尝试保存数据
      let saveSuccess = false;
      try {
        mockStorage.safeSetStorage('records', [{ date: '2024-01-01', on: '09:00' }]);
        saveSuccess = true;
      } catch (error) {
        expect(error.message).toContain('存储');
      }
      
      expect(saveSuccess).toBeFalsy();
    });

    it('应该处理数据损坏的情况', async () => {
      // 模拟损坏的数据
      mockWx.getStorageSync = mock(() => {
        return [
          { date: '2024-01-01', on: '09:00', off: '18:00' }, // 正常记录
          { date: 'invalid-date', on: '09:00', off: '18:00' }, // 损坏记录
          null, // null记录
          { on: '09:00', off: '18:00' } // 缺少日期字段
        ];
      });
      
      // 获取并验证数据
      const records = mockStorage.safeGetStorage('records', []);
      const validRecords = records.filter(record => 
        mockStorage.validateRecordsData([record])
      );
      
      expect(validRecords).toHaveLength(1);
      expect(validRecords[0].date).toBe('2024-01-01');
    });
  });

  describe('性能和压力测试', () => {
    it('应该处理大量数据', async () => {
      // 生成大量测试数据（1年的数据）
      const largeDataSet = [];
      const startDate = new Date('2024-01-01');
      
      for (let i = 0; i < 365; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().slice(0, 10);
        
        largeDataSet.push({
          date: dateStr,
          on: '09:00',
          off: '18:00'
        });
      }
      
      // 测试存储大量数据
      const startTime = Date.now();
      mockStorage.safeSetStorage('records', largeDataSet);
      const saveTime = Date.now() - startTime;
      
      // 测试读取大量数据
      const readStartTime = Date.now();
      const retrievedRecords = mockStorage.safeGetStorage('records', []);
      const readTime = Date.now() - readStartTime;
      
      // 验证数据完整性
      expect(retrievedRecords).toHaveLength(365);
      expect(saveTime).toBeLessThan(1000); // 保存应该在1秒内完成
      expect(readTime).toBeLessThan(500);  // 读取应该在0.5秒内完成
    });

    it('应该快速计算大量统计数据', async () => {
      // 准备大量数据
      const records = [];
      for (let i = 0; i < 1000; i++) {
        records.push({
          date: `2024-01-${(i % 31 + 1).toString().padStart(2, '0')}`,
          on: '09:00',
          off: '18:00'
        });
      }
      
      mockStorage.safeSetStorage('records', records);
      
      // 测试统计计算性能
      const startTime = Date.now();
      
      const allRecords = mockStorage.safeGetStorage('records', []);
      let totalHours = 0;
      let workDays = 0;
      
      allRecords.forEach(record => {
        if (record.on && record.off) {
          totalHours += calculateWorkHours(record.on, record.off, record.date);
          workDays++;
        }
      });
      
      const calculationTime = Date.now() - startTime;
      
      // 验证计算结果和性能
      expect(workDays).toBe(1000);
      expect(totalHours).toBe(9000); // 1000天 * 9小时
      expect(calculationTime).toBeLessThan(200); // 计算应该在200ms内完成
    });
  });

  // 辅助函数
  function calculateWorkHours(onTime, offTime, date) {
    if (!onTime || !offTime) return 0;
    
    try {
      const onDateTime = new Date(`${date} ${onTime}`);
      let offDateTime = new Date(`${date} ${offTime}`);
      
      if (offDateTime < onDateTime) {
        offDateTime = new Date(offDateTime.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const diffMs = offDateTime - onDateTime;
      return diffMs / (1000 * 60 * 60);
    } catch (error) {
      return 0;
    }
  }

  function getCurrentWeek(date = new Date()) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekDates = [];
    
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(date.getFullYear(), date.getMonth(), diff + i);
      const month = weekDate.getMonth() + 1;
      const dayOfMonth = weekDate.getDate();
      weekDates.push(`${weekDate.getFullYear()}-${month.toString().padStart(2, '0')}-${dayOfMonth.toString().padStart(2, '0')}`);
    }
    
    return weekDates;
  }
});