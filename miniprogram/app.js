App({
  onLaunch() {
    const key = 'hasShownWarning';
    if (!wx.getStorageSync(key)) {
      wx.showModal({
        title: '重要提醒',
        content: '所有数据仅保存在本机，换机或卸载微信会丢失，请定期导出 PDF 备份！',
        showCancel: false,
        success: () => {
          wx.setStorageSync(key, true);
        }
      });
    }
  },
  globalData: {
  }
}) 