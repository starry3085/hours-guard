/**
 * 机型适配工具类
 * 提供统一的设备适配解决方案，支持所有微信小程序支持的设备
 */

class AdaptationManager {
  constructor() {
    this.systemInfo = null;
    this.adaptationConfig = null;
    this.initialized = false;
  }

  /**
   * 初始化适配管理器
   */
  async init() {
    try {
      // 确保系统信息和适配配置已初始化
      this.systemInfo = this.systemInfo || {};
      this.adaptationConfig = this.adaptationConfig || {};
      
      await this.getSystemInfo();
      this.calculateAdaptationConfig();
      this.initialized = true;
      console.log('适配管理器初始化完成:', this.adaptationConfig);
      return true;
    } catch (error) {
      console.error('适配管理器初始化失败:', error);
      this.setDefaultConfig();
      return false;
    }
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo() {
    return new Promise((resolve, reject) => {
      try {
        // 确保systemInfo对象已初始化
        if (!this.systemInfo) {
          this.systemInfo = {};
        }
        
        wx.getSystemInfo({
          success: (res) => {
            this.systemInfo = {
              // 基础设备信息
              brand: res.brand || '未知',
              model: res.model || '未知',
              system: res.system || '未知',
              platform: res.platform || 'unknown',
              version: res.version || '未知',
              
              // 屏幕尺寸信息
              screenWidth: res.screenWidth || 375,
              screenHeight: res.screenHeight || 667,
              windowWidth: res.windowWidth || 375,
              windowHeight: res.windowHeight || 667,
              pixelRatio: res.pixelRatio || 2,
              
              // 安全区域信息
              safeArea: res.safeArea || null,
              statusBarHeight: res.statusBarHeight || 20,
              
              // 其他信息
              language: res.language || 'zh_CN',
              fontSizeSetting: res.fontSizeSetting || 16,
              
              // 计算属性
              rpxRatio: 750 / (res.windowWidth || 375),
              aspectRatio: (res.windowHeight || 667) / (res.windowWidth || 375)
            };
            
            // 设备类型判断
            this.systemInfo.deviceType = this.getDeviceType();
            this.systemInfo.screenType = this.getScreenType();
            this.systemInfo.isIPhoneX = this.isIPhoneXSeries();
            this.systemInfo.safeAreaBottom = this.getSafeAreaBottom();
            
            resolve(this.systemInfo);
          },
          fail: (err) => {
            console.error('获取系统信息失败:', err);
            
            // 设置默认值，避免后续操作出错
            this.systemInfo = {
              brand: '未知',
              model: '未知',
              system: '未知',
              platform: 'unknown',
              version: '未知',
              screenWidth: 375,
              screenHeight: 667,
              windowWidth: 375,
              windowHeight: 667,
              pixelRatio: 2,
              safeArea: null,
              statusBarHeight: 20,
              language: 'zh_CN',
              fontSizeSetting: 16,
              rpxRatio: 2,
              aspectRatio: 667 / 375,
              deviceType: 'phone',
              screenType: 'normal',
              isIPhoneX: false,
              safeAreaBottom: 0
            };
            
            // 尽管失败，但仍然返回默认值以避免后续操作出错
            resolve(this.systemInfo);
          }
        });
      } catch (error) {
        console.error('获取系统信息异常:', error);
        
        // 设置默认值，避免后续操作出错
        this.systemInfo = {
          brand: '未知',
          model: '未知',
          system: '未知',
          platform: 'unknown',
          version: '未知',
          screenWidth: 375,
          screenHeight: 667,
          windowWidth: 375,
          windowHeight: 667,
          pixelRatio: 2,
          safeArea: null,
          statusBarHeight: 20,
          language: 'zh_CN',
          fontSizeSetting: 16,
          rpxRatio: 2,
          aspectRatio: 667 / 375,
          deviceType: 'phone',
          screenType: 'normal',
          isIPhoneX: false,
          safeAreaBottom: 0
        };
        
        // 尽管异常，但仍然返回默认值以避免后续操作出错
        resolve(this.systemInfo);
      }
    });
  }

  /**
   * 获取设备类型
   */
  getDeviceType() {
    if (!this.systemInfo) return 'unknown';
    
    const { platform, windowWidth } = this.systemInfo;
    
    if (platform === 'ios') {
      if (windowWidth >= 768) return 'ipad';
      return 'iphone';
    } else if (platform === 'android') {
      if (windowWidth >= 600) return 'tablet';
      return 'phone';
    } else if (platform === 'devtools') {
      return 'devtools';
    }
    
    return 'unknown';
  }

  /**
   * 获取屏幕类型
   */
  getScreenType() {
    if (!this.systemInfo) return 'normal';
    
    const { aspectRatio, windowWidth } = this.systemInfo;
    
    // 长屏幕判断（如iPhone X系列）
    if (aspectRatio > 2.1) {
      return 'long';
    }
    
    // 宽屏幕判断（如iPad）
    if (aspectRatio < 1.6) {
      return 'wide';
    }
    
    // 小屏幕判断
    if (windowWidth < 350) {
      return 'small';
    }
    
    // 大屏幕判断
    if (windowWidth > 414) {
      return 'large';
    }
    
    return 'normal';
  }

  /**
   * 判断是否为iPhone X系列
   */
  isIPhoneXSeries() {
    if (!this.systemInfo) return false;
    
    const { platform, safeArea, screenHeight, aspectRatio } = this.systemInfo;
    
    if (platform !== 'ios') return false;
    
    // 通过安全区域判断
    if (safeArea && safeArea.bottom < screenHeight) {
      return screenHeight - safeArea.bottom > 0;
    }
    
    // 通过屏幕比例判断（备用方案）
    return aspectRatio > 2.1;
  }

  /**
   * 获取底部安全区域高度
   */
  getSafeAreaBottom() {
    if (!this.systemInfo) return 0;
    
    const { safeArea, screenHeight } = this.systemInfo;
    
    if (safeArea && safeArea.bottom < screenHeight) {
      return screenHeight - safeArea.bottom;
    }
    
    return 0;
  }

  /**
   * 计算适配配置
   */
  calculateAdaptationConfig() {
    if (!this.systemInfo) {
      this.setDefaultConfig();
      return;
    }

    const { windowWidth, windowHeight, screenType, deviceType, isIPhoneX, safeAreaBottom } = this.systemInfo;

    this.adaptationConfig = {
      // 基础信息
      windowWidth,
      windowHeight,
      screenType,
      deviceType,
      isIPhoneX,
      safeAreaBottom,

      // 字体大小适配
      fontSize: {
        title: this.getFontSize('title', windowWidth),
        subtitle: this.getFontSize('subtitle', windowWidth),
        content: this.getFontSize('content', windowWidth),
        small: this.getFontSize('small', windowWidth),
        button: this.getFontSize('button', windowWidth)
      },

      // 间距适配
      spacing: {
        page: this.getSpacing('page', windowWidth),
        card: this.getSpacing('card', windowWidth),
        item: this.getSpacing('item', windowWidth),
        small: this.getSpacing('small', windowWidth)
      },

      // 尺寸适配
      size: {
        buttonHeight: this.getSize('buttonHeight', screenType),
        listItemHeight: this.getSize('listItemHeight', screenType),
        cardRadius: this.getSize('cardRadius', windowWidth),
        iconSize: this.getSize('iconSize', windowWidth)
      },

      // 安全区域适配
      safeArea: {
        top: `constant(safe-area-inset-top), env(safe-area-inset-top)`,
        bottom: `constant(safe-area-inset-bottom), env(safe-area-inset-bottom)`,
        left: `constant(safe-area-inset-left), env(safe-area-inset-left)`,
        right: `constant(safe-area-inset-right), env(safe-area-inset-right)`,
        
        // 计算后的值
        bottomPadding: safeAreaBottom > 0 ? `${safeAreaBottom}px` : '0px',
        tabBarPadding: `calc(110rpx + ${safeAreaBottom}px)`
      },

      // 特殊标识
      flags: {
        isSmallScreen: windowWidth < 350,
        isLargeScreen: windowWidth > 414,
        isLongScreen: screenType === 'long',
        isWideScreen: screenType === 'wide',
        isTablet: deviceType === 'ipad' || deviceType === 'tablet',
        needsExtraPadding: isIPhoneX || safeAreaBottom > 0
      }
    };
  }

  /**
   * 获取字体大小
   */
  getFontSize(type, windowWidth) {
    const baseSize = {
      title: 56,
      subtitle: 36,
      content: 32,
      small: 28,
      button: 32
    };

    const size = baseSize[type] || baseSize.content;
    
    // 小屏幕缩小字体
    if (windowWidth < 350) {
      return `${Math.max(size - 4, 24)}rpx`;
    }
    
    // 大屏幕放大字体
    if (windowWidth > 414) {
      return `${size + 4}rpx`;
    }
    
    return `${size}rpx`;
  }

  /**
   * 获取间距大小
   */
  getSpacing(type, windowWidth) {
    const baseSpacing = {
      page: 30,
      card: 20,
      item: 16,
      small: 10
    };

    const spacing = baseSpacing[type] || baseSpacing.item;
    
    // 小屏幕减少间距
    if (windowWidth < 350) {
      return `${Math.max(spacing - 4, 8)}rpx`;
    }
    
    // 大屏幕增加间距
    if (windowWidth > 414) {
      return `${spacing + 4}rpx`;
    }
    
    return `${spacing}rpx`;
  }

  /**
   * 获取尺寸大小
   */
  getSize(type, screenType) {
    const baseSize = {
      buttonHeight: 80,
      listItemHeight: 100,
      cardRadius: 16,
      iconSize: 48
    };

    const size = baseSize[type] || 80;
    
    // 长屏幕增加高度
    if (screenType === 'long' && (type === 'buttonHeight' || type === 'listItemHeight')) {
      return `${size + 8}rpx`;
    }
    
    return `${size}rpx`;
  }

  /**
   * 设置默认配置
   */
  setDefaultConfig() {
    this.adaptationConfig = {
      windowWidth: 375,
      windowHeight: 667,
      screenType: 'normal',
      deviceType: 'phone',
      isIPhoneX: false,
      safeAreaBottom: 0,

      fontSize: {
        title: '56rpx',
        subtitle: '36rpx',
        content: '32rpx',
        small: '28rpx',
        button: '32rpx'
      },

      spacing: {
        page: '30rpx',
        card: '20rpx',
        item: '16rpx',
        small: '10rpx'
      },

      size: {
        buttonHeight: '80rpx',
        listItemHeight: '100rpx',
        cardRadius: '16rpx',
        iconSize: '48rpx'
      },

      safeArea: {
        top: '0px',
        bottom: '0px',
        left: '0px',
        right: '0px',
        bottomPadding: '0px',
        tabBarPadding: '110rpx'
      },

      flags: {
        isSmallScreen: false,
        isLargeScreen: false,
        isLongScreen: false,
        isWideScreen: false,
        isTablet: false,
        needsExtraPadding: false
      }
    };
  }

  /**
   * 获取适配配置
   */
  getConfig() {
    if (!this.initialized) {
      console.warn('适配管理器未初始化，返回默认配置');
      this.setDefaultConfig();
    }
    return this.adaptationConfig;
  }

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    return this.systemInfo;
  }

  /**
   * rpx转px
   */
  rpxToPx(rpx) {
    if (!this.systemInfo) return rpx;
    return Math.round(rpx / this.systemInfo.rpxRatio);
  }

  /**
   * px转rpx
   */
  pxToRpx(px) {
    if (!this.systemInfo) return px;
    return Math.round(px * this.systemInfo.rpxRatio);
  }

  /**
   * 获取页面样式对象
   */
  getPageStyles() {
    const config = this.getConfig();
    
    return {
      // 页面容器样式
      pageContainer: {
        paddingBottom: config.safeArea.tabBarPadding,
        fontSize: config.fontSize.content
      },
      
      // 标题样式
      pageTitle: {
        fontSize: config.fontSize.title
      },
      
      // 卡片样式
      card: {
        margin: config.spacing.card,
        padding: config.spacing.card,
        borderRadius: config.size.cardRadius
      },
      
      // 按钮样式
      button: {
        height: config.size.buttonHeight,
        fontSize: config.fontSize.button
      },
      
      // 列表项样式
      listItem: {
        height: config.size.listItemHeight,
        padding: config.spacing.item
      }
    };
  }

  /**
   * 生成调试信息
   */
  getDebugInfo() {
    if (!this.systemInfo || !this.adaptationConfig) {
      return { error: '适配信息未初始化' };
    }

    return {
      systemInfo: this.systemInfo,
      adaptationConfig: this.adaptationConfig,
      debugSummary: {
        device: `${this.systemInfo.brand} ${this.systemInfo.model}`,
        system: this.systemInfo.system,
        screen: `${this.systemInfo.windowWidth}×${this.systemInfo.windowHeight}`,
        type: this.systemInfo.screenType,
        isIPhoneX: this.systemInfo.isIPhoneX,
        safeArea: this.systemInfo.safeAreaBottom > 0 ? `${this.systemInfo.safeAreaBottom}px` : '无'
      }
    };
  }
}

// 创建全局实例
const adaptationManager = new AdaptationManager();

module.exports = adaptationManager;