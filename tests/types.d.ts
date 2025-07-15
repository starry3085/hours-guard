declare global {
  // 扩展全局命名空间
  var miniProgram: any;
}

// 声明vi命名空间
declare const vi: {
  fn: () => any;
  // 添加其他需要的vitest mock函数
};

// 确保这个文件被视为模块
export {}; 