/**
 * 适配测试工具
 * 用于测试和验证机型适配效果
 */

class AdaptationTester {
  constructor(adaptationManager) {
    this.adaptationManager = adaptationManager;
  }

  /**
   * 运行完整的适配测试
   */
  async runFullTest() {
    const results = {
      timestamp: Date.now(),
      testResults: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    // 测试系统信息获取
    results.testResults.push(await this.testSystemInfo());
    
    // 测试设备类型识别
    results.testResults.push(await this.testDeviceTypeDetection());
    
    // 测试屏幕类型识别
    results.testResults.push(await this.testScreenTypeDetection());
    
    // 测试安全区域适配
    results.testResults.push(await this.testSafeAreaAdaptation());
    
    // 测试字体大小适配
    results.testResults.push(await this.testFontSizeAdaptation());
    
    // 测试间距适配
    results.testResults.push(await this.testSpacingAdaptation());
    
    // 测试响应式设计
    results.testResults.push(await this.testResponsiveDesign());

    // 计算测试摘要
    results.testResults.forEach(result => {
      results.summary.total++;
      if (result.status === 'passed') {
        results.summary.passed++;
      } else if (result.status === 'failed') {
        results.summary.failed++;
      } else if (result.status === 'warning') {
        results.summary.warnings++;
      }
    });

    return results;
  }

  /**
   * 测试系统信息获取
   */
  async testSystemInfo() {
    const test = {
      name: '系统信息获取测试',
      status: 'passed',
      details: [],
      issues: []
    };

    try {
      const systemInfo = this.adaptationManager.getSystemInfo();
      
      if (!systemInfo) {
        test.status = 'failed';
        test.issues.push('无法获取系统信息');
        return test;
      }

      // 检查必要字段
      const requiredFields = ['windowWidth', 'windowHeight', 'platform', 'pixelRatio'];
      requiredFields.forEach(field => {
        if (systemInfo[field] === undefined || systemInfo[field] === null) {
          test.status = 'warning';
          test.issues.push(`缺少字段: ${field}`);
        } else {
          test.details.push(`${field}: ${systemInfo[field]}`);
        }
      });

      // 检查计算字段
      if (!systemInfo.rpxRatio || systemInfo.rpxRatio <= 0) {
        test.status = 'warning';
        test.issues.push('rpx转换比例异常');
      } else {
        test.details.push(`rpx转换比例: ${systemInfo.rpxRatio}`);
      }

    } catch (error) {
      test.status = 'failed';
      test.issues.push(`系统信息获取异常: ${error.message}`);
    }

    return test;
  }

  /**
   * 测试设备类型识别
   */
  async testDeviceTypeDetection() {
    const test = {
      name: '设备类型识别测试',
      status: 'passed',
      details: [],
      issues: []
    };

    try {
      const systemInfo = this.adaptationManager.getSystemInfo();
      
      if (!systemInfo) {
        test.status = 'failed';
        test.issues.push('无法获取系统信息');
        return test;
      }

      const { deviceType, platform, windowWidth } = systemInfo;
      
      test.details.push(`平台: ${platform}`);
      test.details.push(`设备类型: ${deviceType}`);
      test.details.push(`屏幕宽度: ${windowWidth}px`);

      // 验证设备类型识别逻辑
      if (platform === 'ios') {
        if (windowWidth >= 768 && deviceType !== 'ipad') {
          test.status = 'warning';
          test.issues.push('iPad识别可能有误');
        } else if (windowWidth < 768 && deviceType !== 'iphone') {
          test.status = 'warning';
          test.issues.push('iPhone识别可能有误');
        }
      } else if (platform === 'android') {
        if (windowWidth >= 600 && deviceType !== 'tablet') {
          test.status = 'warning';
          test.issues.push('Android平板识别可能有误');
        } else if (windowWidth < 600 && deviceType !== 'phone') {
          test.status = 'warning';
          test.issues.push('Android手机识别可能有误');
        }
      }

    } catch (error) {
      test.status = 'failed';
      test.issues.push(`设备类型识别异常: ${error.message}`);
    }

    return test;
  }

  /**
   * 测试屏幕类型识别
   */
  async testScreenTypeDetection() {
    const test = {
      name: '屏幕类型识别测试',
      status: 'passed',
      details: [],
      issues: []
    };

    try {
      const systemInfo = this.adaptationManager.getSystemInfo();
      
      if (!systemInfo) {
        test.status = 'failed';
        test.issues.push('无法获取系统信息');
        return test;
      }

      const { screenType, aspectRatio, windowWidth, windowHeight } = systemInfo;
      
      test.details.push(`屏幕类型: ${screenType}`);
      test.details.push(`宽高比: ${aspectRatio.toFixed(2)}`);
      test.details.push(`窗口尺寸: ${windowWidth}×${windowHeight}`);

      // 验证屏幕类型识别逻辑
      if (aspectRatio > 2.1 && screenType !== 'long') {
        test.status = 'warning';
        test.issues.push('长屏幕识别可能有误');
      } else if (aspectRatio < 1.6 && screenType !== 'wide') {
        test.status = 'warning';
        test.issues.push('宽屏幕识别可能有误');
      } else if (windowWidth < 350 && screenType !== 'small') {
        test.status = 'warning';
        test.issues.push('小屏幕识别可能有误');
      } else if (windowWidth > 414 && screenType !== 'large') {
        test.status = 'warning';
        test.issues.push('大屏幕识别可能有误');
      }

    } catch (error) {
      test.status = 'failed';
      test.issues.push(`屏幕类型识别异常: ${error.message}`);
    }

    return test;
  }

  /**
   * 测试安全区域适配
   */
  async testSafeAreaAdaptation() {
    const test = {
      name: '安全区域适配测试',
      status: 'passed',
      details: [],
      issues: []
    };

    try {
      const systemInfo = this.adaptationManager.getSystemInfo();
      const config = this.adaptationManager.getConfig();
      
      if (!systemInfo || !config) {
        test.status = 'failed';
        test.issues.push('无法获取适配配置');
        return test;
      }

      const { isIPhoneX, safeAreaBottom } = systemInfo;
      const { safeArea } = config;
      
      test.details.push(`iPhone X系列: ${isIPhoneX ? '是' : '否'}`);
      test.details.push(`底部安全区域: ${safeAreaBottom}px`);
      test.details.push(`TabBar适配: ${safeArea.tabBarPadding}`);

      // 验证安全区域适配
      if (isIPhoneX && safeAreaBottom === 0) {
        test.status = 'warning';
        test.issues.push('iPhone X系列设备但未检测到安全区域');
      }

      if (safeArea.tabBarPadding && !safeArea.tabBarPadding.includes('calc')) {
        test.status = 'warning';
        test.issues.push('TabBar适配可能不完整');
      }

    } catch (error) {
      test.status = 'failed';
      test.issues.push(`安全区域适配测试异常: ${error.message}`);
    }

    return test;
  }

  /**
   * 测试字体大小适配
   */
  async testFontSizeAdaptation() {
    const test = {
      name: '字体大小适配测试',
      status: 'passed',
      details: [],
      issues: []
    };

    try {
      const config = this.adaptationManager.getConfig();
      
      if (!config || !config.fontSize) {
        test.status = 'failed';
        test.issues.push('无法获取字体配置');
        return test;
      }

      const { fontSize } = config;
      
      // 检查字体大小配置
      Object.keys(fontSize).forEach(key => {
        const size = fontSize[key];
        test.details.push(`${key}: ${size}`);
        
        // 验证字体大小合理性
        const numericSize = parseInt(size);
        if (numericSize < 20 || numericSize > 80) {
          test.status = 'warning';
          test.issues.push(`${key}字体大小可能不合理: ${size}`);
        }
      });

      // 检查字体大小层次
      const titleSize = parseInt(fontSize.title);
      const contentSize = parseInt(fontSize.content);
      const smallSize = parseInt(fontSize.small);
      
      if (titleSize <= contentSize) {
        test.status = 'warning';
        test.issues.push('标题字体应大于内容字体');
      }
      
      if (contentSize <= smallSize) {
        test.status = 'warning';
        test.issues.push('内容字体应大于小字体');
      }

    } catch (error) {
      test.status = 'failed';
      test.issues.push(`字体大小适配测试异常: ${error.message}`);
    }

    return test;
  }

  /**
   * 测试间距适配
   */
  async testSpacingAdaptation() {
    const test = {
      name: '间距适配测试',
      status: 'passed',
      details: [],
      issues: []
    };

    try {
      const config = this.adaptationManager.getConfig();
      
      if (!config || !config.spacing) {
        test.status = 'failed';
        test.issues.push('无法获取间距配置');
        return test;
      }

      const { spacing } = config;
      
      // 检查间距配置
      Object.keys(spacing).forEach(key => {
        const space = spacing[key];
        test.details.push(`${key}: ${space}`);
        
        // 验证间距合理性
        const numericSpace = parseInt(space);
        if (numericSpace < 4 || numericSpace > 50) {
          test.status = 'warning';
          test.issues.push(`${key}间距可能不合理: ${space}`);
        }
      });

      // 检查间距层次
      const pageSpace = parseInt(spacing.page);
      const cardSpace = parseInt(spacing.card);
      const itemSpace = parseInt(spacing.item);
      const smallSpace = parseInt(spacing.small);
      
      if (pageSpace <= cardSpace || cardSpace <= itemSpace || itemSpace <= smallSpace) {
        test.status = 'warning';
        test.issues.push('间距层次可能不合理');
      }

    } catch (error) {
      test.status = 'failed';
      test.issues.push(`间距适配测试异常: ${error.message}`);
    }

    return test;
  }

  /**
   * 测试响应式设计
   */
  async testResponsiveDesign() {
    const test = {
      name: '响应式设计测试',
      status: 'passed',
      details: [],
      issues: []
    };

    try {
      const config = this.adaptationManager.getConfig();
      const systemInfo = this.adaptationManager.getSystemInfo();
      
      if (!config || !systemInfo) {
        test.status = 'failed';
        test.issues.push('无法获取配置信息');
        return test;
      }

      const { flags } = config;
      const { windowWidth } = systemInfo;
      
      test.details.push(`屏幕宽度: ${windowWidth}px`);
      test.details.push(`小屏幕: ${flags.isSmallScreen ? '是' : '否'}`);
      test.details.push(`大屏幕: ${flags.isLargeScreen ? '是' : '否'}`);
      test.details.push(`长屏幕: ${flags.isLongScreen ? '是' : '否'}`);
      test.details.push(`平板设备: ${flags.isTablet ? '是' : '否'}`);

      // 验证响应式标识
      if (windowWidth < 350 && !flags.isSmallScreen) {
        test.status = 'warning';
        test.issues.push('小屏幕标识可能有误');
      }
      
      if (windowWidth > 414 && !flags.isLargeScreen) {
        test.status = 'warning';
        test.issues.push('大屏幕标识可能有误');
      }

      // 检查适配效果
      const titleSize = parseInt(config.fontSize.title);
      if (flags.isSmallScreen && titleSize > 52) {
        test.status = 'warning';
        test.issues.push('小屏幕字体可能过大');
      }
      
      if (flags.isLargeScreen && titleSize < 56) {
        test.status = 'warning';
        test.issues.push('大屏幕字体可能过小');
      }

    } catch (error) {
      test.status = 'failed';
      test.issues.push(`响应式设计测试异常: ${error.message}`);
    }

    return test;
  }

  /**
   * 生成测试报告
   */
  generateReport(testResults) {
    let report = `适配测试报告\n`;
    report += `生成时间: ${new Date(testResults.timestamp).toLocaleString()}\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    // 测试摘要
    report += `测试摘要:\n`;
    report += `总计: ${testResults.summary.total} 项\n`;
    report += `通过: ${testResults.summary.passed} 项\n`;
    report += `警告: ${testResults.summary.warnings} 项\n`;
    report += `失败: ${testResults.summary.failed} 项\n\n`;
    
    // 详细结果
    report += `详细结果:\n`;
    report += `${'='.repeat(50)}\n`;
    
    testResults.testResults.forEach((result, index) => {
      report += `\n${index + 1}. ${result.name}\n`;
      report += `状态: ${result.status.toUpperCase()}\n`;
      
      if (result.details.length > 0) {
        report += `详情:\n`;
        result.details.forEach(detail => {
          report += `  - ${detail}\n`;
        });
      }
      
      if (result.issues.length > 0) {
        report += `问题:\n`;
        result.issues.forEach(issue => {
          report += `  ⚠ ${issue}\n`;
        });
      }
      
      report += `${'-'.repeat(30)}\n`;
    });
    
    // 建议
    report += `\n建议:\n`;
    if (testResults.summary.failed > 0) {
      report += `- 存在 ${testResults.summary.failed} 项失败，需要立即修复\n`;
    }
    if (testResults.summary.warnings > 0) {
      report += `- 存在 ${testResults.summary.warnings} 项警告，建议优化\n`;
    }
    if (testResults.summary.failed === 0 && testResults.summary.warnings === 0) {
      report += `- 所有测试通过，适配效果良好\n`;
    }
    
    return report;
  }
}

module.exports = AdaptationTester;