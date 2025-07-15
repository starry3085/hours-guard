import { expect, it, describe } from 'vitest';

describe('打卡功能', () => {
  it('上班打卡后本地出现记录', async () => {
    const page = await global.miniProgram.reLaunch('/pages/index/index');
    await page.tap('.btn-checkin');
    const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
    expect(records).toHaveLength(1);
    expect(records[0]).toHaveProperty('on');
  });

  it('下班打卡更新本地记录', async () => {
    const page = await global.miniProgram.reLaunch('/pages/index/index');
    await page.tap('.btn-checkout');
    const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
    expect(records).toHaveLength(1);
    expect(records[0]).toHaveProperty('off');
  });
}); 