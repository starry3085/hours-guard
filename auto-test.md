下面给出**符合「最佳实践 + MVP 原则」**、**面向 Gitee** 的**全新自动化测试文档**。  
- 测试框架：**Vitest**（更快、零配置、天然 ESM，MVP 阶段更轻）。  
- CI：**Gitee Go**（Gitee 官方免费 CI/CD，国内镜像快）。  
- 仓库：Gitee 单仓，前端后端测试三合一。  

---

# 🧪 1. 测试目标（不变）

| 场景 | 断言 |
|---|---|
| 上班打卡 | Storage 新增/更新 on |
| 下班打卡 | Storage 新增/更新 off |
| 统计页 | 页面文本含「09:31」 |
| 导出 PDF | 本地临时文件非空 |
| 数据清除 | 空态文案出现 |

---

# 🏗️ 2. 目录结构（Gitee 单仓）

```
/miniprogram          ← 小程序源码
/tests
   ├─ vitest.config.ts
   ├─ setup.ts
   ├─ e2e
   │   ├─ index.spec.ts
   │   ├─ stat.spec.ts
   │   └─ export.spec.ts
   └─ unit
       └─ storage.spec.ts
/.gitee/go.yml        ← Gitee Go 流水线
package.json
```

---

# ⚙️ 3. 环境依赖

```bash
npm i -D vitest miniprogram-automator @vitest/ui
```

`package.json` 脚本
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

`vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

`tests/setup.ts`
```ts
import { beforeAll, afterAll } from 'vitest';
import automator from 'miniprogram-automator';

let miniProgram: any;

beforeAll(async () => {
  miniProgram = await automator.launch({
    projectPath: './miniprogram',
    timeout: 60000,
  });
  global.miniProgram = miniProgram;
});

afterAll(async () => {
  await miniProgram?.close();
});
```

---

# 🧩 4. E2E 用例（Vitest 语法）

`tests/e2e/index.spec.ts`
```ts
import { expect, it, describe } from 'vitest';

describe('打卡功能', () => {
  it('上班打卡后本地出现记录', async () => {
    const page = await global.miniProgram.reLaunch('/pages/index/index');
    await page.tap('.btn-checkin');
    const records = await global.miniProgram.callWxMethod('getStorageSync', ['records']);
    expect(records).toHaveLength(1);
    expect(records[0]).toHaveProperty('on');
  });
});
```

`tests/e2e/stat.spec.ts`
```ts
it('展示今日工时', async () => {
  await global.miniProgram.callWxMethod('setStorageSync', [
    'records',
    [{ date: '2025-07-14', on: '09:31', off: '18:45' }]
  ]);
  const page = await global.miniProgram.navigateTo('/pages/stat/stat');
  const text = await page.$text('09:31');
  expect(text).toBeTruthy();
});
```

---

# 🚀 5. Gitee Go（`.gitee/go.yml`）

```yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test
```

---

# ✅ 6. 给智能体的3条命令

```bash
npm install
npm run test          # 终端跑
npm run test:ui       # 浏览器看结果（可选）
```

---

# 7. 一句话总结（Gitee + Vitest 版）

> 用 Vitest + miniprogram-automator + Gitee Go，3 分钟搭好流水线；  
> 国内镜像快、零配置、单仓即可，MVP 阶段最轻最快。