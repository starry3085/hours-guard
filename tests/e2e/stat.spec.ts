/// <reference types="vitest" />
/// <reference path="../types.d.ts" />
import { expect, it, describe, beforeEach, vi } from 'vitest';

describe('统计功能端到端测试', () => {
  beforeEach(async () => {
    // 清空存储，确保测试环境干净
    await global.miniProgram.callWxMethod('clearStorageSync');
  });

  describe('基础统计显示', () => {
    it('应该展示当月打卡记录', async () => {
      // 准备测试数据
      const testRecords = [
        { date: '2024-01-15', on: '09:00', off: '18:00' },
        { date: '2024-01-16', on: '08:30', off: '17:30' },
        { date: '2024-01-17', on: '09:15', off: '18:45' }
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 获取页面数据
      const data = await page.data();
      
      // 验证记录列表
      expect(data.list).toHaveLength(3);
      expect(data.list[0].date).toBe('2024-01-17'); // 最新的在前
      expect(data.list[1].date).toBe('2024-01-16');
      expect(data.list[2].date).toBe('2024-01-15');
    });

    it('应该正确显示工作时长', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证工作时长计算
      expect(data.list[0].workHours).toBe(9);
      expect(data.list[0].workHoursText).toBe('9h');
    });

    it('应该正确处理跨日工作时长', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '22:00', off: '06:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证跨日工作时长
      expect(data.list[0].workHours).toBe(8);
      expect(data.list[0].workHoursText).toBe('8h');
    });

    it('应该处理不完整的打卡记录', async () => {
      const testRecords = [
        { date: '2024-01-15', on: '09:00' }, // 只有上班时间
        { date: '2024-01-16', off: '18:00' }, // 只有下班时间
        { date: '2024-01-17', on: '09:00', off: '18:00' } // 完整记录
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证不完整记录的处理
      expect(data.list[2].workHoursText).toBe('-'); // 只有上班时间
      expect(data.list[1].workHoursText).toBe('-'); // 只有下班时间
      expect(data.list[0].workHoursText).toBe('9h'); // 完整记录
    });
  });

  describe('统计数据计算', () => {
    it('应该正确计算本周工作时长', async () => {
      // 获取本周日期
      const today = new Date();
      const currentWeek = getCurrentWeek(today);
      
      // 准备本周测试数据
      const weekRecords = currentWeek.slice(0, 5).map(date => ({
        date: date,
        on: '09:00',
        off: '18:00'
      }));
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', weekRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证本周统计
      expect(parseFloat(data.weekHours)).toBe(45); // 5天 * 9小时
      expect(parseFloat(data.avgDailyHours)).toBe(9); // 平均每日9小时
    });

    it('应该正确计算月度统计', async () => {
      const monthRecords = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-02', on: '08:30', off: '17:30' },
        { date: '2024-01-03', on: '09:15', off: '18:45' },
        { date: '2024-01-04', on: '09:00', off: '17:00' },
        { date: '2024-01-05', on: '08:45', off: '18:15' }
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', monthRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证月度统计
      expect(data.monthDays).toBe(5);
      expect(parseFloat(data.totalMonthHours)).toBe(45); // 总工作时长
      expect(parseFloat(data.avgMonthDailyHours)).toBe(9); // 平均每日工作时长
    });

    it('应该正确处理空数据', async () => {
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证空数据处理
      expect(data.list).toHaveLength(0);
      expect(data.weekHours).toBe('0');
      expect(data.avgDailyHours).toBe('0');
      expect(data.totalMonthHours).toBe('0');
    });
  });

  describe('时间编辑功能', () => {
    it('应该支持编辑上班时间', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 模拟时间选择器确认
      const confirmSpy = vi.fn();
      await page.setData({ showPicker: true, pickerType: 'on', pickerDate: '2024-01-15', pickerValue: [8, 30] });
      
      // 触发确认操作
      await page.callMethod('onPickerConfirm');
      await page.waitFor(1000);
      
      // 验证时间更新
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records[0].on).toBe('08:30');
    });

    it('应该支持编辑下班时间', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 模拟编辑下班时间
      await page.setData({ showPicker: true, pickerType: 'off', pickerDate: '2024-01-15', pickerValue: [19, 0] });
      await page.callMethod('onPickerConfirm');
      await page.waitFor(1000);
      
      // 验证时间更新
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records[0].off).toBe('19:00');
    });

    it('应该在编辑后重新计算统计数据', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 编辑下班时间
      await page.setData({ showPicker: true, pickerType: 'off', pickerDate: '2024-01-15', pickerValue: [20, 0] });
      await page.callMethod('onPickerConfirm');
      await page.waitFor(1000);
      
      // 获取更新后的数据
      const data = await page.data();
      
      // 验证工作时长重新计算
      expect(data.list[0].workHours).toBe(11); // 09:00 到 20:00 = 11小时
      expect(data.list[0].workHoursText).toBe('11h');
    });
  });

  describe('记录删除功能', () => {
    it('应该支持删除记录', async () => {
      const testRecords = [
        { date: '2024-01-15', on: '09:00', off: '18:00' },
        { date: '2024-01-16', on: '08:30', off: '17:30' }
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 模拟确认删除
      const modalSpy = vi.fn((options) => {
        options.success({ confirm: true });
      });
      await global.miniProgram.mockWxMethod('showModal', modalSpy);
      
      // 触发删除操作
      await page.callMethod('deleteRecord', '2024-01-15');
      await page.waitFor(1000);
      
      // 验证记录删除
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records).toHaveLength(1);
      expect(records[0].date).toBe('2024-01-16');
    });

    it('应该在删除后更新统计数据', async () => {
      const testRecords = [
        { date: '2024-01-15', on: '09:00', off: '18:00' },
        { date: '2024-01-16', on: '08:30', off: '17:30' }
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 删除一条记录
      const modalSpy = vi.fn((options) => {
        options.success({ confirm: true });
      });
      await global.miniProgram.mockWxMethod('showModal', modalSpy);
      
      await page.callMethod('deleteRecord', '2024-01-15');
      await page.waitFor(1000);
      
      // 验证统计数据更新
      const data = await page.data();
      expect(data.list).toHaveLength(1);
      expect(data.monthDays).toBe(1);
    });
  });

  describe('数据筛选和排序', () => {
    it('应该按日期倒序显示记录', async () => {
      const testRecords = [
        { date: '2024-01-13', on: '09:00', off: '18:00' },
        { date: '2024-01-15', on: '09:00', off: '18:00' },
        { date: '2024-01-14', on: '09:00', off: '18:00' }
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证排序（最新日期在前）
      expect(data.list[0].date).toBe('2024-01-15');
      expect(data.list[1].date).toBe('2024-01-14');
      expect(data.list[2].date).toBe('2024-01-13');
    });

    it('应该只显示当月记录', async () => {
      const testRecords = [
        { date: '2024-01-15', on: '09:00', off: '18:00' }, // 当月
        { date: '2023-12-31', on: '09:00', off: '18:00' }, // 上月
        { date: '2024-02-01', on: '09:00', off: '18:00' }  // 下月
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      const data = await page.data();
      
      // 验证只显示当月记录（假设当前是2024年1月）
      expect(data.list).toHaveLength(1);
      expect(data.list[0].date).toBe('2024-01-15');
    });
  });

  describe('性能和缓存测试', () => {
    it('应该使用缓存提高性能', async () => {
      // 准备大量数据
      const largeDataSet = [];
      for (let i = 1; i <= 31; i++) {
        largeDataSet.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          on: '09:00',
          off: '18:00'
        });
      }
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', largeDataSet]);
      
      // 第一次加载
      const startTime1 = Date.now();
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      const loadTime1 = Date.now() - startTime1;
      
      // 第二次加载（应该使用缓存）
      const startTime2 = Date.now();
      await page.callMethod('loadMonthData');
      await page.waitFor(500);
      const loadTime2 = Date.now() - startTime2;
      
      // 验证数据正确性
      const data = await page.data();
      expect(data.list).toHaveLength(31);
      
      // 验证性能（第二次应该更快）
      expect(loadTime1).toBeLessThan(3000);
      expect(loadTime2).toBeLessThan(loadTime1);
    });

    it('应该快速处理大量数据', async () => {
      // 生成一年的数据
      const yearData = [];
      const startDate = new Date('2024-01-01');
      
      for (let i = 0; i < 365; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().slice(0, 10);
        
        yearData.push({
          date: dateStr,
          on: '09:00',
          off: '18:00'
        });
      }
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', yearData]);
      
      const startTime = Date.now();
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(2000);
      const loadTime = Date.now() - startTime;
      
      // 验证加载时间合理
      expect(loadTime).toBeLessThan(5000); // 应该在5秒内完成
      
      // 验证数据正确性（只显示当月数据）
      const data = await page.data();
      expect(data.list.length).toBeGreaterThan(0);
      expect(data.list.length).toBeLessThanOrEqual(31);
    });
  });

  describe('错误处理', () => {
    it('应该处理数据加载失败', async () => {
      // 模拟存储读取失败
      const mockGetStorage = vi.fn(() => {
        throw new Error('存储读取失败');
      });
      await global.miniProgram.mockWxMethod('getStorageSync', mockGetStorage);
      
      // 模拟错误提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 验证错误处理
      expect(toastSpy).toHaveBeenCalled();
    });

    it('应该处理数据更新失败', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 模拟存储写入失败
      const mockSetStorage = vi.fn(() => {
        throw new Error('存储写入失败');
      });
      await global.miniProgram.mockWxMethod('setStorageSync', mockSetStorage);
      
      // 模拟错误提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 尝试更新记录
      await page.setData({ showPicker: true, pickerType: 'on', pickerDate: '2024-01-15', pickerValue: [8, 30] });
      await page.callMethod('onPickerConfirm');
      await page.waitFor(1000);
      
      // 验证错误处理
      expect(toastSpy).toHaveBeenCalled();
    });
  });

  describe('用户交互测试', () => {
    it('应该正确显示时间选择器', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 触发时间编辑
      await page.callMethod('onEditTime', { currentTarget: { dataset: { date: '2024-01-15', type: 'on' } } });
      
      const data = await page.data();
      
      // 验证选择器状态
      expect(data.showPicker).toBe(true);
      expect(data.pickerType).toBe('on');
      expect(data.pickerDate).toBe('2024-01-15');
      expect(data.pickerValue).toEqual([9, 0]); // 09:00
    });

    it('应该支持取消时间编辑', async () => {
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/stat/stat');
      await page.waitFor(1000);
      
      // 打开时间选择器
      await page.setData({ showPicker: true, pickerType: 'on', pickerDate: '2024-01-15' });
      
      // 取消编辑
      await page.callMethod('onPickerCancel');
      
      const data = await page.data();
      
      // 验证选择器关闭
      expect(data.showPicker).toBe(false);
    });
  });

  // 辅助函数
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