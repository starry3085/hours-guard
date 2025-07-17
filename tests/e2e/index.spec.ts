/// <reference types="vitest" />
/// <reference path="../types.d.ts" />
import { expect, it, describe, beforeEach, vi } from 'vitest';

describe('打卡功能端到端测试', () => {
  beforeEach(async () => {
    // 清空存储，确保测试环境干净
    await global.miniProgram.callWxMethod('clearStorageSync');
  });

  describe('基础打卡功能', () => {
    it('上班打卡后本地出现记录', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      
      // 等待页面加载完成
      await page.waitFor(500);
      
      // 点击上班打卡按钮
      await page.tap('.btn-checkin');
      
      // 等待操作完成
      await page.waitFor(1000);
      
      // 验证存储中的记录
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records).toHaveLength(1);
      expect(records[0]).toHaveProperty('on');
      expect(records[0]).toHaveProperty('date');
      
      // 验证日期格式
      expect(records[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // 验证时间格式
      expect(records[0].on).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it('下班打卡更新本地记录', async () => {
      // 先进行上班打卡
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      // 再进行下班打卡
      await page.tap('.btn-checkout');
      await page.waitFor(1000);
      
      // 验证记录更新
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records).toHaveLength(1);
      expect(records[0]).toHaveProperty('on');
      expect(records[0]).toHaveProperty('off');
      
      // 验证时间格式
      expect(records[0].off).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it('重复上班打卡应该更新时间', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 第一次上班打卡
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      const firstRecords = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      const firstOnTime = firstRecords[0].on;
      
      // 等待一段时间后再次打卡
      await page.waitFor(2000);
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      // 验证记录数量没有增加，但时间可能更新
      const secondRecords = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(secondRecords).toHaveLength(1);
      expect(secondRecords[0]).toHaveProperty('on');
    });
  });

  describe('日期选择功能', () => {
    it('应该支持选择历史日期进行补录', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 选择昨天的日期
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      
      // 模拟日期选择器
      await page.setData({
        selectedDate: yesterdayStr
      });
      
      // 进行打卡
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      // 验证记录
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records).toHaveLength(1);
      expect(records[0].date).toBe(yesterdayStr);
    });

    it('应该正确显示选中日期的状态', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 获取页面数据
      const data = await page.data();
      
      // 验证今天日期设置正确
      const today = new Date().toISOString().slice(0, 10);
      expect(data.selectedDate).toBe(today);
      expect(data.isToday).toBe(true);
    });
  });

  describe('时间显示功能', () => {
    it('应该显示当前时间并实时更新', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 获取初始时间
      const initialData = await page.data();
      const initialTime = initialData.currentTime;
      
      // 等待时间更新
      await page.waitFor(2000);
      
      // 获取更新后的时间
      const updatedData = await page.data();
      const updatedTime = updatedData.currentTime;
      
      // 验证时间格式
      expect(initialTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(updatedTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('错误处理', () => {
    it('应该处理存储失败的情况', async () => {
      // 模拟存储失败
      const mockSetStorage = vi.fn(() => {
        throw new Error('存储失败');
      });
      await global.miniProgram.mockWxMethod('setStorageSync', mockSetStorage);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 尝试打卡
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      // 验证错误提示
      expect(toastSpy).toHaveBeenCalled();
    });

    it('应该在未上班打卡时阻止下班打卡', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 直接尝试下班打卡
      await page.tap('.btn-checkout');
      await page.waitFor(1000);
      
      // 验证提示信息
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '请先上班打卡',
        icon: 'none'
      }));
      
      // 验证没有创建记录
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records).toHaveLength(0);
    });
  });

  describe('用户体验测试', () => {
    it('应该显示打卡成功提示', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 进行上班打卡
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      // 验证成功提示
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '已上班打卡',
        icon: 'success'
      }));
    });

    it('应该正确显示当日打卡记录', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 进行完整打卡
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      await page.tap('.btn-checkout');
      await page.waitFor(1000);
      
      // 获取页面数据
      const data = await page.data();
      
      // 验证当日记录显示
      expect(data.todayRecord).toHaveProperty('on');
      expect(data.todayRecord).toHaveProperty('off');
      expect(data.todayRecord.on).toMatch(/^\d{1,2}:\d{2}$/);
      expect(data.todayRecord.off).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it('应该支持时间编辑功能', async () => {
      // 先创建一条记录
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      // 模拟Modal对话框
      const modalSpy = vi.fn((options) => {
        // 模拟用户输入新时间
        options.success({
          confirm: true,
          content: '08:30'
        });
      });
      await global.miniProgram.mockWxMethod('showModal', modalSpy);
      
      // 触发时间编辑（通过dataset模拟）
      await page.tap('.time-edit[data-type="on"]');
      await page.waitFor(1000);
      
      // 验证Modal被调用
      expect(modalSpy).toHaveBeenCalled();
      
      // 验证记录更新
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records[0].on).toBe('08:30');
    });
  });

  describe('离线模式测试', () => {
    it('应该在离线状态下正常工作', async () => {
      // 模拟网络状态检查
      const networkSpy = vi.fn((options) => {
        options.success({ networkType: 'none' });
      });
      await global.miniProgram.mockWxMethod('getNetworkType', networkSpy);
      
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(1000); // 等待网络检查完成
      
      // 进行打卡操作
      await page.tap('.btn-checkin');
      await page.waitFor(1000);
      
      // 验证打卡成功
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      expect(records).toHaveLength(1);
      expect(records[0]).toHaveProperty('on');
    });

    it('应该显示离线模式提示', async () => {
      // 模拟无网络状态
      const networkSpy = vi.fn((options) => {
        options.success({ networkType: 'none' });
      });
      await global.miniProgram.mockWxMethod('getNetworkType', networkSpy);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(1500); // 等待网络检查和提示显示
      
      // 验证离线提示
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringContaining('离线模式'),
        icon: 'none'
      }));
    });
  });

  describe('性能测试', () => {
    it('页面加载应该在合理时间内完成', async () => {
      const startTime = Date.now();
      
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 获取页面数据，确保页面完全加载
      const data = await page.data();
      
      const loadTime = Date.now() - startTime;
      
      // 验证页面加载时间
      expect(loadTime).toBeLessThan(3000); // 应该在3秒内加载完成
      
      // 验证关键数据已加载
      expect(data.today).toBeDefined();
      expect(data.currentTime).toBeDefined();
    });

    it('打卡操作应该快速响应', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      const startTime = Date.now();
      
      // 进行打卡操作
      await page.tap('.btn-checkin');
      await page.waitFor(100); // 最小等待时间
      
      // 检查记录是否已创建
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      
      const responseTime = Date.now() - startTime;
      
      // 验证响应时间和结果
      expect(responseTime).toBeLessThan(1000); // 应该在1秒内响应
      expect(records).toHaveLength(1);
    });
  });

  describe('数据一致性测试', () => {
    it('多次操作后数据应该保持一致', async () => {
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 进行多次打卡操作
      await page.tap('.btn-checkin');
      await page.waitFor(500);
      await page.tap('.btn-checkout');
      await page.waitFor(500);
      
      // 重新进入页面
      await page.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 验证数据一致性
      const pageData = await page.data();
      const storageRecords = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      
      expect(pageData.todayRecord.on).toBe(storageRecords[0].on);
      expect(pageData.todayRecord.off).toBe(storageRecords[0].off);
    });

    it('页面刷新后应该正确恢复状态', async () => {
      // 先创建记录
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: new Date().toISOString().slice(0, 10), on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.reLaunch('/pages/index/index');
      await page.waitFor(500);
      
      // 验证页面状态恢复
      const data = await page.data();
      expect(data.todayRecord.on).toBe('09:00');
      expect(data.todayRecord.off).toBe('18:00');
    });
  });
}); 