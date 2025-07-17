/// <reference types="vitest" />
/// <reference path="../types.d.ts" />
import { expect, it, describe, beforeEach, vi } from 'vitest';

describe('导出功能端到端测试', () => {
  beforeEach(async () => {
    // 清空存储，确保测试环境干净
    await global.miniProgram.callWxMethod('clearStorageSync');
  });

  describe('基础导出功能', () => {
    it('应该正确加载月份数据统计', async () => {
      // 准备测试数据
      const testRecords = [
        { date: '2024-01-15', on: '09:00', off: '18:00' },
        { date: '2024-01-16', on: '08:30', off: '17:30' },
        { date: '2024-02-01', on: '09:00', off: '18:00' } // 不同月份
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(1000);
      
      // 设置选择的月份为2024-01
      await page.setData({ selectedDate: '2024-01' });
      await page.callMethod('loadMonthData');
      await page.waitFor(500);
      
      const data = await page.data();
      
      // 验证统计数据
      expect(data.recordCount).toBe(2); // 只有1月的2条记录
      expect(parseFloat(data.totalWorkHours)).toBe(18); // 9 + 9 = 18小时
    });

    it('应该支持月份选择', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟日期选择器变化
      await page.callMethod('onDateChange', { detail: { value: '2024-02' } });
      
      const data = await page.data();
      
      // 验证月份更新
      expect(data.selectedDate).toBe('2024-02');
      expect(data.selectedMonth).toBe('2024年2月');
    });

    it('无数据时应该提示用户', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 尝试生成报告
      await page.callMethod('makeReport');
      await page.waitFor(1000);
      
      // 验证提示信息
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '无打卡数据',
        icon: 'none'
      }));
    });
  });

  describe('多格式导出功能', () => {
    beforeEach(async () => {
      // 为每个测试准备基础数据
      const testRecords = [
        { date: '2024-01-15', on: '09:00', off: '18:00' },
        { date: '2024-01-16', on: '08:30', off: '17:30' },
        { date: '2024-01-17', on: '09:15', off: '18:45' }
      ];
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
    });

    it('应该显示导出格式选择', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟ActionSheet
      const actionSheetSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showActionSheet', actionSheetSpy);
      
      // 触发报告生成
      await page.callMethod('makeReport');
      await page.waitFor(1000);
      
      // 验证格式选择显示
      expect(actionSheetSpy).toHaveBeenCalledWith(expect.objectContaining({
        itemList: ['导出Excel表格(CSV)', '导出图片报告', '导出文本记录']
      }));
    });

    it('应该成功生成CSV文件', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟文件系统管理器
      const mockWriteFile = vi.fn((options) => {
        // 验证CSV内容
        expect(options.data).toContain('日期,星期,上班时间,下班时间,工作时长(小时),备注');
        expect(options.data).toContain('2024-01-15');
        expect(options.data).toContain('09:00');
        expect(options.data).toContain('18:00');
        expect(options.encoding).toBe('utf8');
        
        // 模拟成功回调
        setTimeout(() => options.success(), 10);
      });
      
      const mockFS = { writeFile: mockWriteFile };
      await global.miniProgram.mockWxMethod('getFileSystemManager', () => mockFS);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 获取测试数据并生成CSV
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      const monthRecords = records.filter(r => r.date.startsWith('2024-01'));
      
      await page.callMethod('generateCSV', monthRecords);
      await page.waitFor(1000);
      
      // 验证文件写入和成功提示
      expect(mockWriteFile).toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Excel表格生成成功',
        icon: 'success'
      }));
    });

    it('应该成功生成文本文件', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟文件系统管理器
      const mockWriteFile = vi.fn((options) => {
        // 验证文本内容
        expect(options.data).toContain('打卡记录报告');
        expect(options.data).toContain('统计信息');
        expect(options.data).toContain('详细记录');
        expect(options.data).toContain('2024-01-15');
        expect(options.encoding).toBe('utf8');
        
        setTimeout(() => options.success(), 10);
      });
      
      const mockFS = { writeFile: mockWriteFile };
      await global.miniProgram.mockWxMethod('getFileSystemManager', () => mockFS);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 生成文本文件
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      const monthRecords = records.filter(r => r.date.startsWith('2024-01'));
      
      await page.callMethod('generateText', monthRecords);
      await page.waitFor(1000);
      
      // 验证结果
      expect(mockWriteFile).toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '文本记录生成成功',
        icon: 'success'
      }));
    });

    it('应该成功生成图片报告', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟Canvas相关API
      const mockCanvas = {
        getContext: vi.fn(() => ({
          fillStyle: '',
          font: '',
          textAlign: '',
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          fillText: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          scale: vi.fn()
        })),
        width: 0,
        height: 0
      };
      
      // 模拟Canvas转换
      const mockCanvasToFile = vi.fn((options) => {
        setTimeout(() => options.success({ tempFilePath: '/tmp/test.png' }), 10);
      });
      await global.miniProgram.mockWxMethod('canvasToTempFilePath', mockCanvasToFile);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 生成图片报告
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      const monthRecords = records.filter(r => r.date.startsWith('2024-01'));
      
      await page.callMethod('generateImage', monthRecords);
      await page.waitFor(1000);
      
      // 验证Canvas转换调用
      expect(mockCanvasToFile).toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '报告生成成功',
        icon: 'success'
      }));
    });
  });

  describe('文件分享功能', () => {
    it('应该支持文件分享', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 设置已生成的文件路径
      await page.setData({ pdfPath: '/tmp/test-file.csv' });
      
      // 模拟文件分享
      const shareFileSpy = vi.fn((options) => {
        setTimeout(() => options.success(), 10);
      });
      await global.miniProgram.mockWxMethod('shareFileMessage', shareFileSpy);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 执行分享
      await page.callMethod('shareFile', '/tmp/test-file.csv', '打卡记录.csv');
      await page.waitFor(500);
      
      // 验证分享调用
      expect(shareFileSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: '/tmp/test-file.csv',
        fileName: '打卡记录.csv'
      }));
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '分享成功',
        icon: 'success'
      }));
    });

    it('应该支持保存图片到相册', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 设置图片路径
      await page.setData({ pdfPath: '/tmp/test-image.png' });
      
      // 模拟保存到相册
      const saveImageSpy = vi.fn((options) => {
        setTimeout(() => options.success(), 10);
      });
      await global.miniProgram.mockWxMethod('saveImageToPhotosAlbum', saveImageSpy);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 执行保存
      await page.callMethod('saveToAlbum');
      await page.waitFor(500);
      
      // 验证保存调用
      expect(saveImageSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: '/tmp/test-image.png'
      }));
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '已保存到相册',
        icon: 'success'
      }));
    });

    it('应该处理保存权限问题', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟权限失败
      const saveImageSpy = vi.fn((options) => {
        setTimeout(() => options.fail({ errMsg: 'saveImageToPhotosAlbum:fail auth deny' }), 10);
      });
      await global.miniProgram.mockWxMethod('saveImageToPhotosAlbum', saveImageSpy);
      
      // 模拟Modal提示
      const modalSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showModal', modalSpy);
      
      // 执行保存
      await page.callMethod('saveToAlbum');
      await page.waitFor(500);
      
      // 验证权限提示
      expect(modalSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '需要授权',
        content: '需要您授权保存图片到相册'
      }));
    });

    it('应该支持文件预览', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟文档预览
      const openDocSpy = vi.fn((options) => {
        setTimeout(() => options.success(), 10);
      });
      await global.miniProgram.mockWxMethod('openDocument', openDocSpy);
      
      // 执行预览
      await page.callMethod('previewFile', '/tmp/test-file.csv');
      await page.waitFor(500);
      
      // 验证预览调用
      expect(openDocSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: '/tmp/test-file.csv',
        showMenu: true
      }));
    });

    it('应该支持图片预览', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟图片预览
      const previewImageSpy = vi.fn();
      await global.miniProgram.mockWxMethod('previewImage', previewImageSpy);
      
      // 执行预览
      await page.callMethod('previewImage', '/tmp/test-image.png');
      await page.waitFor(500);
      
      // 验证预览调用
      expect(previewImageSpy).toHaveBeenCalledWith(expect.objectContaining({
        urls: ['/tmp/test-image.png'],
        current: '/tmp/test-image.png'
      }));
    });
  });

  describe('错误处理', () => {
    it('应该处理文件生成失败', async () => {
      // 准备测试数据
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟文件写入失败
      const mockWriteFile = vi.fn((options) => {
        setTimeout(() => options.fail({ errMsg: '写入失败' }), 10);
      });
      const mockFS = { writeFile: mockWriteFile };
      await global.miniProgram.mockWxMethod('getFileSystemManager', () => mockFS);
      
      // 模拟错误提示
      const modalSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showModal', modalSpy);
      
      // 尝试生成CSV
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      await page.callMethod('generateCSV', records);
      await page.waitFor(1000);
      
      // 验证错误处理
      expect(modalSpy).toHaveBeenCalled();
    });

    it('应该处理Canvas生成失败', async () => {
      // 准备测试数据
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟Canvas转换失败
      const mockCanvasToFile = vi.fn((options) => {
        setTimeout(() => options.fail({ errMsg: 'Canvas转换失败' }), 10);
      });
      await global.miniProgram.mockWxMethod('canvasToTempFilePath', mockCanvasToFile);
      
      // 模拟错误提示
      const modalSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showModal', modalSpy);
      
      // 尝试生成图片
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      await page.callMethod('generateImage', records);
      await page.waitFor(1000);
      
      // 验证错误处理
      expect(modalSpy).toHaveBeenCalled();
    });

    it('应该处理分享失败', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟分享失败
      const shareFileSpy = vi.fn((options) => {
        setTimeout(() => options.fail({ errMsg: '分享失败' }), 10);
      });
      await global.miniProgram.mockWxMethod('shareFileMessage', shareFileSpy);
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 尝试分享
      await page.callMethod('shareFile', '/tmp/test-file.csv', '测试文件.csv');
      await page.waitFor(500);
      
      // 验证错误提示
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '分享失败',
        icon: 'none'
      }));
    });
  });

  describe('数据完整性测试', () => {
    it('应该正确计算工作时长', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 测试正常工作时长
      let workHours = await page.callMethod('calculateWorkHours', '09:00', '18:00', '2024-01-15');
      expect(workHours).toBe(9);
      
      // 测试跨日工作时长
      workHours = await page.callMethod('calculateWorkHours', '22:00', '06:00', '2024-01-15');
      expect(workHours).toBe(8);
      
      // 测试不完整数据
      workHours = await page.callMethod('calculateWorkHours', '09:00', null, '2024-01-15');
      expect(workHours).toBe(0);
      
      workHours = await page.callMethod('calculateWorkHours', null, '18:00', '2024-01-15');
      expect(workHours).toBe(0);
    });

    it('应该正确处理不同月份的数据', async () => {
      // 准备跨月数据
      const testRecords = [
        { date: '2024-01-31', on: '09:00', off: '18:00' },
        { date: '2024-02-01', on: '08:30', off: '17:30' },
        { date: '2024-02-02', on: '09:15', off: '18:45' }
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 选择1月份
      await page.setData({ selectedDate: '2024-01' });
      await page.callMethod('loadMonthData');
      await page.waitFor(500);
      
      let data = await page.data();
      expect(data.recordCount).toBe(1);
      expect(parseFloat(data.totalWorkHours)).toBe(9);
      
      // 选择2月份
      await page.setData({ selectedDate: '2024-02' });
      await page.callMethod('loadMonthData');
      await page.waitFor(500);
      
      data = await page.data();
      expect(data.recordCount).toBe(2);
      expect(parseFloat(data.totalWorkHours)).toBe(18.5); // 9 + 9.5
    });

    it('应该正确处理边界日期', async () => {
      // 测试月初月末
      const testRecords = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-31', on: '08:30', off: '17:30' }
      ];
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      await page.setData({ selectedDate: '2024-01' });
      await page.callMethod('loadMonthData');
      await page.waitFor(500);
      
      const data = await page.data();
      expect(data.recordCount).toBe(2);
    });
  });

  describe('性能测试', () => {
    it('应该快速处理大量数据导出', async () => {
      // 生成大量数据
      const largeDataSet = [];
      for (let i = 1; i <= 31; i++) {
        largeDataSet.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          on: '09:00',
          off: '18:00'
        });
      }
      
      await global.miniProgram.callWxMethod('setStorageSync', ['records', largeDataSet]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟文件系统
      const mockWriteFile = vi.fn((options) => {
        setTimeout(() => options.success(), 10);
      });
      const mockFS = { writeFile: mockWriteFile };
      await global.miniProgram.mockWxMethod('getFileSystemManager', () => mockFS);
      
      // 测试CSV生成性能
      const startTime = Date.now();
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      const monthRecords = records.filter(r => r.date.startsWith('2024-01'));
      
      await page.callMethod('generateCSV', monthRecords);
      await page.waitFor(1000);
      
      const generationTime = Date.now() - startTime;
      
      // 验证性能和结果
      expect(generationTime).toBeLessThan(3000); // 应该在3秒内完成
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('页面加载应该快速完成', async () => {
      // 准备数据
      const testRecords = [
        { date: '2024-01-15', on: '09:00', off: '18:00' }
      ];
      await global.miniProgram.callWxMethod('setStorageSync', ['records', testRecords]);
      
      const startTime = Date.now();
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(1000);
      
      // 获取页面数据确保加载完成
      const data = await page.data();
      
      const loadTime = Date.now() - startTime;
      
      // 验证加载时间和数据
      expect(loadTime).toBeLessThan(3000);
      expect(data.selectedDate).toBeDefined();
      expect(data.selectedMonth).toBeDefined();
    });
  });

  describe('用户体验测试', () => {
    it('应该显示生成进度提示', async () => {
      // 准备数据
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 模拟Loading提示
      const showLoadingSpy = vi.fn();
      const hideLoadingSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showLoading', showLoadingSpy);
      await global.miniProgram.mockWxMethod('hideLoading', hideLoadingSpy);
      
      // 模拟文件系统
      const mockWriteFile = vi.fn((options) => {
        setTimeout(() => options.success(), 100);
      });
      const mockFS = { writeFile: mockWriteFile };
      await global.miniProgram.mockWxMethod('getFileSystemManager', () => mockFS);
      
      // 生成文件
      const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
      await page.callMethod('generateCSV', records);
      await page.waitFor(500);
      
      // 验证进度提示
      expect(showLoadingSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '生成Excel表格中...'
      }));
      expect(hideLoadingSpy).toHaveBeenCalled();
    });

    it('应该防止重复操作', async () => {
      // 准备数据
      await global.miniProgram.callWxMethod('setStorageSync', [
        'records',
        [{ date: '2024-01-15', on: '09:00', off: '18:00' }]
      ]);
      
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 设置生成状态
      await page.setData({ isGenerating: true });
      
      // 模拟Toast提示
      const toastSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showToast', toastSpy);
      
      // 尝试重复操作
      await page.callMethod('makeReport');
      await page.waitFor(500);
      
      // 验证防重复提示
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: '正在生成中...',
        icon: 'none'
      }));
    });

    it('应该提供多种分享选项', async () => {
      const page = await global.miniProgram.navigateTo('/pages/export/export');
      await page.waitFor(500);
      
      // 设置文件路径
      await page.setData({ pdfPath: '/tmp/test-file.csv' });
      
      // 模拟ActionSheet
      const actionSheetSpy = vi.fn();
      await global.miniProgram.mockWxMethod('showActionSheet', actionSheetSpy);
      
      // 显示分享选项
      await page.callMethod('showShareOptions', '/tmp/test-file.csv', '测试文件.csv');
      
      // 验证选项显示
      expect(actionSheetSpy).toHaveBeenCalledWith(expect.objectContaining({
        itemList: ['发送给朋友', '预览文件']
      }));
    });
  });
}); 