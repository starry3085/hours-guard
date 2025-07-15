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