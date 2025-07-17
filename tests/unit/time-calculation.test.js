/**
 * 时间计算逻辑单元测试
 * 测试工作时长计算、跨日处理等核心业务逻辑
 */

const { describe, it, beforeEach, afterEach, expect, mock } = require('./test-framework');

describe('时间计算逻辑测试', () => {
  let timeCalculator;
  
  beforeEach(() => {
    // 模拟时间计算函数
    timeCalculator = {
      calculateWorkHours: (onTime, offTime, date) => {
        if (!onTime || !offTime) return 0;
        
        try {
          const onDateTime = new Date(`${date} ${onTime}`);
          let offDateTime = new Date(`${date} ${offTime}`);
          
          // 处理跨日情况
          if (offDateTime < onDateTime) {
            offDateTime = new Date(offDateTime.getTime() + 24 * 60 * 60 * 1000);
          }
          
          const diffMs = offDateTime - onDateTime;
          return diffMs / (1000 * 60 * 60);
        } catch (error) {
          return 0;
        }
      },
      
      formatWorkHours: (hours) => {
        if (hours === 0) return '-';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return m > 0 ? `${h}h${m}m` : `${h}h`;
      },
      
      getCurrentWeek: () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const weekDates = [];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today.getFullYear(), today.getMonth(), diff + i);
          const month = date.getMonth() + 1;
          const dayOfMonth = date.getDate();
          weekDates.push(`${date.getFullYear()}-${month.toString().padStart(2, '0')}-${dayOfMonth.toString().padStart(2, '0')}`);
        }
        
        return weekDates;
      }
    };
  });

  describe('正常工作时长计算', () => {
    it('应该正确计算标准工作时长', () => {
      const workHours = timeCalculator.calculateWorkHours('09:00', '18:00', '2024-01-01');
      expect(workHours).toBe(9);
    });

    it('应该正确计算带分钟的工作时长', () => {
      const workHours = timeCalculator.calculateWorkHours('09:30', '18:45', '2024-01-01');
      expect(workHours).toBe(9.25);
    });

    it('应该正确计算短时间工作时长', () => {
      const workHours = timeCalculator.calculateWorkHours('14:00', '15:30', '2024-01-01');
      expect(workHours).toBe(1.5);
    });

    it('应该正确计算长时间工作时长', () => {
      const workHours = timeCalculator.calculateWorkHours('08:00', '20:00', '2024-01-01');
      expect(workHours).toBe(12);
    });
  });

  describe('跨日工作时长计算', () => {
    it('应该正确处理跨日情况', () => {
      const workHours = timeCalculator.calculateWorkHours('22:00', '06:00', '2024-01-01');
      expect(workHours).toBe(8);
    });

    it('应该正确处理深夜跨日情况', () => {
      const workHours = timeCalculator.calculateWorkHours('23:30', '07:30', '2024-01-01');
      expect(workHours).toBe(8);
    });

    it('应该正确处理凌晨跨日情况', () => {
      const workHours = timeCalculator.calculateWorkHours('20:00', '02:00', '2024-01-01');
      expect(workHours).toBe(6);
    });
  });

  describe('异常情况处理', () => {
    it('应该处理缺少上班时间的情况', () => {
      const workHours = timeCalculator.calculateWorkHours(null, '18:00', '2024-01-01');
      expect(workHours).toBe(0);
    });

    it('应该处理缺少下班时间的情况', () => {
      const workHours = timeCalculator.calculateWorkHours('09:00', null, '2024-01-01');
      expect(workHours).toBe(0);
    });

    it('应该处理空字符串时间', () => {
      const workHours = timeCalculator.calculateWorkHours('', '18:00', '2024-01-01');
      expect(workHours).toBe(0);
    });

    it('应该处理无效时间格式', () => {
      const workHours = timeCalculator.calculateWorkHours('invalid', '18:00', '2024-01-01');
      expect(workHours).toBe(0);
    });

    it('应该处理无效日期', () => {
      const workHours = timeCalculator.calculateWorkHours('09:00', '18:00', 'invalid-date');
      expect(workHours).toBe(0);
    });
  });

  describe('工作时长格式化', () => {
    it('应该正确格式化整小时', () => {
      const formatted = timeCalculator.formatWorkHours(8);
      expect(formatted).toBe('8h');
    });

    it('应该正确格式化小时和分钟', () => {
      const formatted = timeCalculator.formatWorkHours(8.5);
      expect(formatted).toBe('8h30m');
    });

    it('应该正确格式化小数分钟', () => {
      const formatted = timeCalculator.formatWorkHours(8.25);
      expect(formatted).toBe('8h15m');
    });

    it('应该处理零工作时长', () => {
      const formatted = timeCalculator.formatWorkHours(0);
      expect(formatted).toBe('-');
    });

    it('应该处理小于1小时的工作时长', () => {
      const formatted = timeCalculator.formatWorkHours(0.5);
      expect(formatted).toBe('0h30m');
    });

    it('应该正确四舍五入分钟', () => {
      const formatted = timeCalculator.formatWorkHours(8.76); // 8小时45.6分钟
      expect(formatted).toBe('8h46m');
    });
  });

  describe('本周日期计算', () => {
    it('应该返回7天的日期数组', () => {
      const weekDates = timeCalculator.getCurrentWeek();
      expect(weekDates).toHaveLength(7);
    });

    it('应该返回正确的日期格式', () => {
      const weekDates = timeCalculator.getCurrentWeek();
      weekDates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('应该从周一开始', () => {
      const weekDates = timeCalculator.getCurrentWeek();
      const firstDate = new Date(weekDates[0]);
      const dayOfWeek = firstDate.getDay();
      expect(dayOfWeek).toBe(1); // 周一
    });

    it('应该以周日结束', () => {
      const weekDates = timeCalculator.getCurrentWeek();
      const lastDate = new Date(weekDates[6]);
      const dayOfWeek = lastDate.getDay();
      expect(dayOfWeek).toBe(0); // 周日
    });
  });

  describe('边界值测试', () => {
    it('应该处理午夜时间', () => {
      const workHours = timeCalculator.calculateWorkHours('00:00', '08:00', '2024-01-01');
      expect(workHours).toBe(8);
    });

    it('应该处理23:59时间', () => {
      const workHours = timeCalculator.calculateWorkHours('15:00', '23:59', '2024-01-01');
      expect(workHours).toBe(8 + 59/60);
    });

    it('应该处理相同时间', () => {
      const workHours = timeCalculator.calculateWorkHours('09:00', '09:00', '2024-01-01');
      expect(workHours).toBe(24); // 跨日24小时
    });

    it('应该处理1分钟工作时长', () => {
      const workHours = timeCalculator.calculateWorkHours('09:00', '09:01', '2024-01-01');
      expect(workHours).toBe(1/60);
    });
  });

  describe('性能测试', () => {
    it('应该能快速计算大量时间', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        timeCalculator.calculateWorkHours('09:00', '18:00', '2024-01-01');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000次计算应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    it('应该能快速格式化大量时间', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        timeCalculator.formatWorkHours(8.5);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000次格式化应该在50ms内完成
      expect(duration).toBeLessThan(50);
    });
  });
});