/// <reference types="vitest" />
/// <reference path="../types.d.ts" />
import { expect, it, describe, beforeEach, vi } from 'vitest';

describe('本地存储功能', () => {
  beforeEach(async () => {
    // 清空所有存储
    await global.miniProgram.callWxMethod('clearStorageSync');
  });

  it('数据清除后显示空态', async () => {
    // 先清空数据
    await global.miniProgram.callWxMethod('clearStorageSync');
    
    // 进入统计页面
    const page = await global.miniProgram.navigateTo('/pages/stat/stat');
    
    // 获取页面数据
    const data = await page.data();
    expect(data.list).toHaveLength(0);
    
    // 检查是否显示空态文案
    const emptyText = await page.$('.empty-tip');
    expect(emptyText).toBeTruthy();
  });

  it('首次启动显示数据本地存储提示', async () => {
    // 清除首次启动标记
    await global.miniProgram.callWxMethod('removeStorageSync', ['hasShownWarning']);
    
    // 模拟showModal方法
    const modalSpy = vi.fn();
    await global.miniProgram.mockWxMethod('showModal', modalSpy);
    
    // 触发应用启动
    await global.miniProgram.reLaunch('/pages/index/index');
    
    // 验证是否显示了提示弹窗
    expect(modalSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: '重要提醒',
      content: expect.stringContaining('本机'),
      showCancel: false
    }));
    
    // 验证标记已保存
    const hasShownWarning = await global.miniProgram.callWxMethod('getStorageSync', ['hasShownWarning']);
    expect(hasShownWarning).toBe(true);
  });
}); 