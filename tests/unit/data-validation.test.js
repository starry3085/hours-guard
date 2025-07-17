/**
 * 数据验证逻辑单元测试
 * 测试各种数据格式验证和边界情况处理
 */

const { describe, it, beforeEach, afterEach, expect, mock } = require('./test-framework');

describe('数据验证逻辑测试', () => {
  let validator;
  
  beforeEach(() => {
    // 模拟数据验证器
    validator = {
      datePattern: /^\d{4}-\d{2}-\d{2}$/,
      timePattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      
      validateDate: (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return false;
        
        if (!validator.datePattern.test(dateStr)) return false;
        
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date.getTime()) && 
               date.toISOString().slice(0, 10) === dateStr;
      },
      
      validateTime: (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return false;
        return validator.timePattern.test(timeStr);
      },
      
      validateRecord: (record) => {
        if (!record || typeof record !== 'object') return false;
        
        // 检查必需字段
        if (!record.date) return false;
        
        // 验证日期格式
        if (!validator.validateDate(record.date)) return false;
        
        // 验证时间格式（如果存在）
        if (record.on && !validator.validateTime(record.on)) return false;
        if (record.off && !validator.validateTime(record.off)) return false;
        
        return true;
      },
      
      validateRecordsArray: (records) => {
        if (!Array.isArray(records)) return false;
        return records.every(record => validator.validateRecord(record));
      },
      
      sanitizeRecord: (record) => {
        if (!record || typeof record !== 'object') return null;
        
        const sanitized = {
          date: record.date,
          on: record.on || undefined,
          off: record.off || undefined
        };
        
        // 移除undefined值
        Object.keys(sanitized).forEach(key => {
          if (sanitized[key] === undefined) {
            delete sanitized[key];
          }
        });
        
        return validator.validateRecord(sanitized) ? sanitized : null;
      }
    };
  });

  describe('日期格式验证', () => {
    it('应该接受有效的日期格式', () => {
      const validDates = [
        '2024-01-01',
        '2024-12-31',
        '2023-02-28',
        '2024-02-29', // 闰年
        '2000-01-01'
      ];
      
      validDates.forEach(date => {
        expect(validator.validateDate(date)).toBeTruthy();
      });
    });

    it('应该拒绝无效的日期格式', () => {
      const invalidDates = [
        '2024-1-1',      // 缺少前导零
        '24-01-01',      // 年份格式错误
        '2024/01/01',    // 分隔符错误
        '2024-13-01',    // 无效月份
        '2024-01-32',    // 无效日期
        '2023-02-29',    // 非闰年的2月29日
        '2024-04-31',    // 4月没有31日
        'invalid-date',  // 完全无效
        '',              // 空字符串
        null,            // null值
        undefined        // undefined值
      ];
      
      invalidDates.forEach(date => {
        expect(validator.validateDate(date)).toBeFalsy();
      });
    });

    it('应该验证真实存在的日期', () => {
      // 测试月份天数限制
      expect(validator.validateDate('2024-02-30')).toBeFalsy(); // 2月没有30日
      expect(validator.validateDate('2024-04-31')).toBeFalsy(); // 4月没有31日
      expect(validator.validateDate('2024-06-31')).toBeFalsy(); // 6月没有31日
      expect(validator.validateDate('2024-09-31')).toBeFalsy(); // 9月没有31日
      expect(validator.validateDate('2024-11-31')).toBeFalsy(); // 11月没有31日
    });

    it('应该正确处理闰年', () => {
      expect(validator.validateDate('2024-02-29')).toBeTruthy(); // 2024是闰年
      expect(validator.validateDate('2023-02-29')).toBeFalsy();  // 2023不是闰年
      expect(validator.validateDate('2000-02-29')).toBeTruthy(); // 2000是闰年
      expect(validator.validateDate('1900-02-29')).toBeFalsy();  // 1900不是闰年
    });
  });

  describe('时间格式验证', () => {
    it('应该接受有效的时间格式', () => {
      const validTimes = [
        '00:00',
        '09:00',
        '12:30',
        '18:45',
        '23:59',
        '1:00',    // 单位数小时
        '01:5',    // 单位数分钟（虽然不推荐，但技术上有效）
        '9:30'     // 单位数小时
      ];
      
      validTimes.forEach(time => {
        expect(validator.validateTime(time)).toBeTruthy();
      });
    });

    it('应该拒绝无效的时间格式', () => {
      const invalidTimes = [
        '24:00',     // 小时超出范围
        '12:60',     // 分钟超出范围
        '25:30',     // 小时超出范围
        '12:70',     // 分钟超出范围
        '12',        // 缺少分钟
        ':30',       // 缺少小时
        '12:',       // 缺少分钟
        '12:3a',     // 包含字母
        'invalid',   // 完全无效
        '',          // 空字符串
        null,        // null值
        undefined    // undefined值
      ];
      
      invalidTimes.forEach(time => {
        expect(validator.validateTime(time)).toBeFalsy();
      });
    });
  });

  describe('记录对象验证', () => {
    it('应该接受有效的记录对象', () => {
      const validRecords = [
        { date: '2024-01-01', on: '09:00', off: '18:00' },
        { date: '2024-01-01', on: '09:00' },
        { date: '2024-01-01', off: '18:00' },
        { date: '2024-01-01' }
      ];
      
      validRecords.forEach(record => {
        expect(validator.validateRecord(record)).toBeTruthy();
      });
    });

    it('应该拒绝无效的记录对象', () => {
      const invalidRecords = [
        null,                                                    // null值
        undefined,                                               // undefined值
        {},                                                      // 缺少date字段
        { on: '09:00', off: '18:00' },                          // 缺少date字段
        { date: 'invalid-date', on: '09:00', off: '18:00' },    // 无效日期
        { date: '2024-01-01', on: 'invalid-time', off: '18:00' }, // 无效上班时间
        { date: '2024-01-01', on: '09:00', off: 'invalid-time' }, // 无效下班时间
        { date: '2024-01-01', on: '25:00', off: '18:00' },      // 无效时间范围
        'not-an-object',                                         // 非对象类型
        []                                                       // 数组类型
      ];
      
      invalidRecords.forEach(record => {
        expect(validator.validateRecord(record)).toBeFalsy();
      });
    });
  });

  describe('记录数组验证', () => {
    it('应该接受有效的记录数组', () => {
      const validArrays = [
        [],
        [{ date: '2024-01-01', on: '09:00', off: '18:00' }],
        [
          { date: '2024-01-01', on: '09:00', off: '18:00' },
          { date: '2024-01-02', on: '08:30', off: '17:30' }
        ]
      ];
      
      validArrays.forEach(array => {
        expect(validator.validateRecordsArray(array)).toBeTruthy();
      });
    });

    it('应该拒绝无效的记录数组', () => {
      const invalidArrays = [
        null,
        undefined,
        'not-an-array',
        { not: 'an-array' },
        [{ date: '2024-01-01', on: '09:00', off: '18:00' }, null],
        [{ date: '2024-01-01', on: '09:00', off: '18:00' }, 'invalid'],
        [{ date: 'invalid-date', on: '09:00', off: '18:00' }]
      ];
      
      invalidArrays.forEach(array => {
        expect(validator.validateRecordsArray(array)).toBeFalsy();
      });
    });
  });

  describe('数据清理和标准化', () => {
    it('应该清理有效的记录对象', () => {
      const input = {
        date: '2024-01-01',
        on: '09:00',
        off: '18:00',
        extraField: 'should-be-removed'
      };
      
      const result = validator.sanitizeRecord(input);
      
      expect(result).toEqual({
        date: '2024-01-01',
        on: '09:00',
        off: '18:00'
      });
    });

    it('应该处理部分字段的记录', () => {
      const input = {
        date: '2024-01-01',
        on: '09:00'
      };
      
      const result = validator.sanitizeRecord(input);
      
      expect(result).toEqual({
        date: '2024-01-01',
        on: '09:00'
      });
    });

    it('应该拒绝无效的记录对象', () => {
      const invalidInputs = [
        null,
        undefined,
        { date: 'invalid-date' },
        { date: '2024-01-01', on: 'invalid-time' },
        {}
      ];
      
      invalidInputs.forEach(input => {
        const result = validator.sanitizeRecord(input);
        expect(result).toBeNull();
      });
    });

    it('应该移除undefined字段', () => {
      const input = {
        date: '2024-01-01',
        on: undefined,
        off: '18:00'
      };
      
      const result = validator.sanitizeRecord(input);
      
      expect(result).toEqual({
        date: '2024-01-01',
        off: '18:00'
      });
      expect(result.hasOwnProperty('on')).toBeFalsy();
    });
  });

  describe('边界值测试', () => {
    it('应该处理极端日期值', () => {
      const extremeDates = [
        '1900-01-01',  // 很早的日期
        '2099-12-31',  // 很晚的日期
        '2024-01-01',  // 正常日期
        '2024-12-31'   // 年末日期
      ];
      
      extremeDates.forEach(date => {
        expect(validator.validateDate(date)).toBeTruthy();
      });
    });

    it('应该处理极端时间值', () => {
      const extremeTimes = [
        '00:00',  // 午夜
        '23:59',  // 一天结束
        '12:00',  // 正午
        '01:01'   // 凌晨
      ];
      
      extremeTimes.forEach(time => {
        expect(validator.validateTime(time)).toBeTruthy();
      });
    });
  });

  describe('类型安全测试', () => {
    it('应该处理各种数据类型', () => {
      const testValues = [
        null,
        undefined,
        0,
        '',
        false,
        [],
        {},
        'string',
        123,
        true
      ];
      
      testValues.forEach(value => {
        // 这些调用不应该抛出异常
        expect(() => validator.validateDate(value)).not.toThrow();
        expect(() => validator.validateTime(value)).not.toThrow();
        expect(() => validator.validateRecord(value)).not.toThrow();
        expect(() => validator.validateRecordsArray(value)).not.toThrow();
        expect(() => validator.sanitizeRecord(value)).not.toThrow();
      });
    });
  });

  describe('性能测试', () => {
    it('应该快速验证大量记录', () => {
      const records = [];
      for (let i = 0; i < 1000; i++) {
        records.push({
          date: '2024-01-01',
          on: '09:00',
          off: '18:00'
        });
      }
      
      const startTime = Date.now();
      const result = validator.validateRecordsArray(records);
      const endTime = Date.now();
      
      expect(result).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速清理大量记录', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        validator.sanitizeRecord({
          date: '2024-01-01',
          on: '09:00',
          off: '18:00',
          extra: 'field'
        });
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});