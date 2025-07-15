/// <reference types="vitest" />
/// <reference path="../types.d.ts" />
import { expect, it, describe, vi } from 'vitest';

describe('导出功能', () => {
  it('导出PDF生成临时文件', async () => {
    // 先准备测试数据
    await global.miniProgram.callWxMethod('setStorageSync', [
      'records',
      [{ date: '2025-07-14', on: '09:31', off: '18:45' }]
    ]);
    
    const page = await global.miniProgram.navigateTo('/pages/export/export');
    await page.tap('button[bindtap="makePdf"]');
    
    // 等待PDF生成
    await page.waitFor(1000);
    
    // 检查页面数据中是否有pdfPath
    const data = await page.data();
    expect(data.pdfPath).toBeTruthy();
  });
  
  it('无数据时提示用户', async () => {
    // 清除测试数据
    await global.miniProgram.callWxMethod('setStorageSync', ['records', []]);
    
    const page = await global.miniProgram.navigateTo('/pages/export/export');
    
    // 模拟Toast提示的监听
    const toastSpy = vi.fn();
    await global.miniProgram.mockWxMethod('showToast', toastSpy);
    
    await page.tap('button[bindtap="makePdf"]');
    
    // 验证是否调用了showToast
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: '无数据',
      icon: 'none'
    }));
  });
}); 