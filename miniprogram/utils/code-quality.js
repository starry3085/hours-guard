/**
 * 代码质量检查和优化工具类
 * 提供代码质量检查、性能分析和最佳实践建议
 */

class CodeQualityChecker {
  constructor() {
    this.qualityMetrics = {
      functionComplexity: new Map(),
      codeSmells: [],
      performanceIssues: [],
      bestPracticeViolations: []
    };
    
    this.thresholds = {
      maxFunctionLength: 50,
      maxParameterCount: 5,
      maxNestingLevel: 4,
      maxCyclomaticComplexity: 10
    };
  }

  /**
   * 检查函数复杂度
   * @param {string} functionName 函数名
   * @param {string} functionCode 函数代码
   * @returns {Object} 复杂度分析结果
   */
  analyzeFunctionComplexity(functionName, functionCode) {
    const lines = functionCode.split('\n').filter(line => line.trim());
    const lineCount = lines.length;
    
    // 计算参数数量
    const paramMatch = functionCode.match(/function\s*\w*\s*\(([^)]*)\)/);
    const paramCount = paramMatch ? 
      (paramMatch[1].trim() ? paramMatch[1].split(',').length : 0) : 0;
    
    // 计算嵌套层级
    let maxNesting = 0;
    let currentNesting = 0;
    
    lines.forEach(line => {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      currentNesting += openBraces - closeBraces;
      maxNesting = Math.max(maxNesting, currentNesting);
    });
    
    // 计算圈复杂度（简化版本）
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch'];
    let cyclomaticComplexity = 1; // 基础复杂度
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = functionCode.match(regex);
      if (matches) {
        cyclomaticComplexity += matches.length;
      }
    });
    
    const analysis = {
      functionName,
      lineCount,
      paramCount,
      maxNesting,
      cyclomaticComplexity,
      issues: [],
      suggestions: []
    };
    
    // 检查是否超过阈值
    if (lineCount > this.thresholds.maxFunctionLength) {
      analysis.issues.push(`函数过长 (${lineCount} 行)`);
      analysis.suggestions.push('考虑将函数拆分为更小的函数');
    }
    
    if (paramCount > this.thresholds.maxParameterCount) {
      analysis.issues.push(`参数过多 (${paramCount} 个)`);
      analysis.suggestions.push('考虑使用对象参数或减少参数数量');
    }
    
    if (maxNesting > this.thresholds.maxNestingLevel) {
      analysis.issues.push(`嵌套层级过深 (${maxNesting} 层)`);
      analysis.suggestions.push('考虑提取嵌套逻辑到单独函数');
    }
    
    if (cyclomaticComplexity > this.thresholds.maxCyclomaticComplexity) {
      analysis.issues.push(`圈复杂度过高 (${cyclomaticComplexity})`);
      analysis.suggestions.push('考虑简化条件逻辑或拆分函数');
    }
    
    this.qualityMetrics.functionComplexity.set(functionName, analysis);
    return analysis;
  }

  /**
   * 检查代码异味
   * @param {string} code 代码内容
   * @param {string} fileName 文件名
   * @returns {Array} 代码异味列表
   */
  detectCodeSmells(code, fileName) {
    const smells = [];
    
    // 检查重复代码
    const duplicatePatterns = this.findDuplicateCode(code);
    duplicatePatterns.forEach(pattern => {
      smells.push({
        type: 'duplicate_code',
        severity: 'medium',
        message: `发现重复代码模式: ${pattern.pattern}`,
        line: pattern.line,
        suggestion: '考虑提取公共函数或使用配置对象'
      });
    });
    
    // 检查魔法数字
    const magicNumbers = this.findMagicNumbers(code);
    magicNumbers.forEach(number => {
      smells.push({
        type: 'magic_number',
        severity: 'low',
        message: `发现魔法数字: ${number.value}`,
        line: number.line,
        suggestion: '考虑使用命名常量替代魔法数字'
      });
    });
    
    // 检查长函数
    const longFunctions = this.findLongFunctions(code);
    longFunctions.forEach(func => {
      smells.push({
        type: 'long_function',
        severity: 'medium',
        message: `函数过长: ${func.name} (${func.lines} 行)`,
        line: func.startLine,
        suggestion: '考虑将函数拆分为更小的函数'
      });
    });
    
    // 检查深层嵌套
    const deepNesting = this.findDeepNesting(code);
    deepNesting.forEach(nesting => {
      smells.push({
        type: 'deep_nesting',
        severity: 'medium',
        message: `嵌套层级过深: ${nesting.level} 层`,
        line: nesting.line,
        suggestion: '考虑使用早期返回或提取函数减少嵌套'
      });
    });
    
    this.qualityMetrics.codeSmells.push({
      fileName,
      smells,
      timestamp: Date.now()
    });
    
    return smells;
  }

  /**
   * 查找重复代码
   * @param {string} code 代码内容
   * @returns {Array} 重复代码模式
   */
  findDuplicateCode(code) {
    const lines = code.split('\n');
    const patterns = [];
    const minPatternLength = 3;
    
    for (let i = 0; i < lines.length - minPatternLength; i++) {
      const pattern = lines.slice(i, i + minPatternLength).join('\n').trim();
      if (pattern.length > 20) { // 忽略太短的模式
        const occurrences = [];
        
        for (let j = i + minPatternLength; j < lines.length - minPatternLength; j++) {
          const comparePattern = lines.slice(j, j + minPatternLength).join('\n').trim();
          if (pattern === comparePattern) {
            occurrences.push(j + 1);
          }
        }
        
        if (occurrences.length > 0) {
          patterns.push({
            pattern: pattern.substring(0, 50) + '...',
            line: i + 1,
            occurrences
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * 查找魔法数字
   * @param {string} code 代码内容
   * @returns {Array} 魔法数字列表
   */
  findMagicNumbers(code) {
    const lines = code.split('\n');
    const magicNumbers = [];
    const numberPattern = /\b(\d{2,})\b/g; // 查找2位以上的数字
    const excludePatterns = [
      /console\./,  // 排除console语句
      /\/\//,       // 排除注释
      /\/\*/,       // 排除块注释
      /['"`]/       // 排除字符串内的数字
    ];
    
    lines.forEach((line, index) => {
      // 跳过注释和字符串
      const shouldExclude = excludePatterns.some(pattern => pattern.test(line));
      if (shouldExclude) return;
      
      let match;
      while ((match = numberPattern.exec(line)) !== null) {
        const number = parseInt(match[1]);
        // 排除常见的非魔法数字
        if (![0, 1, 2, 10, 100, 1000, 24, 60].includes(number)) {
          magicNumbers.push({
            value: number,
            line: index + 1,
            context: line.trim()
          });
        }
      }
    });
    
    return magicNumbers;
  }

  /**
   * 查找长函数
   * @param {string} code 代码内容
   * @returns {Array} 长函数列表
   */
  findLongFunctions(code) {
    const lines = code.split('\n');
    const functions = [];
    let currentFunction = null;
    let braceCount = 0;
    
    lines.forEach((line, index) => {
      const functionMatch = line.match(/^\s*(async\s+)?function\s+(\w+)|(\w+)\s*[:=]\s*(async\s+)?function|(\w+)\s*\([^)]*\)\s*{/);
      
      if (functionMatch) {
        if (currentFunction) {
          // 结束上一个函数
          currentFunction.endLine = index;
          currentFunction.lines = currentFunction.endLine - currentFunction.startLine;
          
          if (currentFunction.lines > this.thresholds.maxFunctionLength) {
            functions.push(currentFunction);
          }
        }
        
        // 开始新函数
        currentFunction = {
          name: functionMatch[2] || functionMatch[3] || functionMatch[5] || 'anonymous',
          startLine: index + 1,
          endLine: null,
          lines: 0
        };
        braceCount = 0;
      }
      
      if (currentFunction) {
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        braceCount += openBraces - closeBraces;
        
        if (braceCount === 0 && openBraces > 0) {
          // 函数结束
          currentFunction.endLine = index + 1;
          currentFunction.lines = currentFunction.endLine - currentFunction.startLine;
          
          if (currentFunction.lines > this.thresholds.maxFunctionLength) {
            functions.push(currentFunction);
          }
          
          currentFunction = null;
        }
      }
    });
    
    return functions;
  }

  /**
   * 查找深层嵌套
   * @param {string} code 代码内容
   * @returns {Array} 深层嵌套列表
   */
  findDeepNesting(code) {
    const lines = code.split('\n');
    const deepNesting = [];
    let currentLevel = 0;
    
    lines.forEach((line, index) => {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      currentLevel += openBraces - closeBraces;
      
      if (currentLevel > this.thresholds.maxNestingLevel) {
        deepNesting.push({
          level: currentLevel,
          line: index + 1,
          context: line.trim()
        });
      }
    });
    
    return deepNesting;
  }

  /**
   * 生成代码质量报告
   * @returns {Object} 质量报告
   */
  generateQualityReport() {
    const report = {
      timestamp: Date.now(),
      summary: {
        totalFunctions: this.qualityMetrics.functionComplexity.size,
        complexFunctions: 0,
        totalCodeSmells: 0,
        criticalIssues: 0
      },
      functionComplexity: {},
      codeSmells: this.qualityMetrics.codeSmells,
      recommendations: []
    };
    
    // 统计函数复杂度
    for (const [name, analysis] of this.qualityMetrics.functionComplexity.entries()) {
      report.functionComplexity[name] = analysis;
      if (analysis.issues.length > 0) {
        report.summary.complexFunctions++;
      }
    }
    
    // 统计代码异味
    this.qualityMetrics.codeSmells.forEach(fileSmells => {
      report.summary.totalCodeSmells += fileSmells.smells.length;
      fileSmells.smells.forEach(smell => {
        if (smell.severity === 'high') {
          report.summary.criticalIssues++;
        }
      });
    });
    
    // 生成建议
    report.recommendations = this.generateRecommendations(report);
    
    return report;
  }

  /**
   * 生成优化建议
   * @param {Object} report 质量报告
   * @returns {Array} 建议列表
   */
  generateRecommendations(report) {
    const recommendations = [];
    
    if (report.summary.complexFunctions > 0) {
      recommendations.push({
        priority: 'high',
        category: 'complexity',
        message: `发现 ${report.summary.complexFunctions} 个复杂函数，建议进行重构`,
        action: '将复杂函数拆分为更小的函数，提高代码可读性和可维护性'
      });
    }
    
    if (report.summary.totalCodeSmells > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'code_smells',
        message: `发现 ${report.summary.totalCodeSmells} 个代码异味`,
        action: '逐步清理代码异味，提高代码质量'
      });
    }
    
    if (report.summary.criticalIssues > 0) {
      recommendations.push({
        priority: 'high',
        category: 'critical',
        message: `发现 ${report.summary.criticalIssues} 个严重问题`,
        action: '优先解决严重问题，确保代码稳定性'
      });
    }
    
    // 基于具体问题类型的建议
    const smellTypes = new Set();
    report.codeSmells.forEach(fileSmells => {
      fileSmells.smells.forEach(smell => {
        smellTypes.add(smell.type);
      });
    });
    
    if (smellTypes.has('duplicate_code')) {
      recommendations.push({
        priority: 'medium',
        category: 'duplication',
        message: '发现重复代码',
        action: '提取公共函数或使用配置对象消除重复'
      });
    }
    
    if (smellTypes.has('magic_number')) {
      recommendations.push({
        priority: 'low',
        category: 'constants',
        message: '发现魔法数字',
        action: '使用命名常量替代魔法数字，提高代码可读性'
      });
    }
    
    return recommendations;
  }

  /**
   * 显示代码质量报告
   */
  showQualityReport() {
    const report = this.generateQualityReport();
    
    let content = '代码质量报告\n\n';
    content += `函数总数: ${report.summary.totalFunctions}\n`;
    content += `复杂函数: ${report.summary.complexFunctions}\n`;
    content += `代码异味: ${report.summary.totalCodeSmells}\n`;
    content += `严重问题: ${report.summary.criticalIssues}\n\n`;
    
    if (report.recommendations.length > 0) {
      content += '优化建议:\n';
      report.recommendations.forEach((rec, index) => {
        content += `${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}\n`;
      });
    } else {
      content += '代码质量良好，继续保持！';
    }
    
    wx.showModal({
      title: '代码质量检查',
      content: content,
      showCancel: false,
      confirmText: '确定'
    });
  }

  /**
   * 清除质量数据
   */
  clearQualityData() {
    this.qualityMetrics = {
      functionComplexity: new Map(),
      codeSmells: [],
      performanceIssues: [],
      bestPracticeViolations: []
    };
  }
}

// 创建单例实例
const codeQualityChecker = new CodeQualityChecker();

module.exports = codeQualityChecker;