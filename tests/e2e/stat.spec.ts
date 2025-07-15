/// <reference types="vitest" />
/// <reference path="../types.d.ts" />
import { expect, it, describe } from 'vitest';

describe('统计功能', () => {
  it('展示今日工时', async () => {
    await global.miniProgram.callWxMethod('setStorageSync', [
      'records',
      [{ date: '2025-07-14', on: '09:31', off: '18:45' }]
    ]);
    const page = await global.miniProgram.navigateTo('/pages/stat/stat');
    const text = await page.$text('09:31');
    expect(text).toBeTruthy();
  });
}); 