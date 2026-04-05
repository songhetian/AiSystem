const path = require('path');
const { spawn } = require('child_process');
const { loadRootEnv, resolveDatabaseUrl, rootDir } = require('./env-utils');

const task = process.argv[2];
const backendDir = path.join(rootDir, 'backend');
const env = loadRootEnv();
const databaseUrl = resolveDatabaseUrl(env);

if (!databaseUrl) {
  console.error('未找到数据库连接。请在 .env 中设置 LOCAL_DATABASE_URL 或 DATABASE_URL。');
  process.exit(1);
}

const taskMap = {
  'db:push': ['npx', ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma', '--skip-generate']],
  'db:seed': ['npm', ['run', 'prisma:seed']],
  'db:backfill:attendance-approval': ['npm', ['run', 'prisma:backfill:attendance-approval']]
};

if (!taskMap[task]) {
  console.error(`不支持的任务: ${task}`);
  process.exit(1);
}

const [command, args] = taskMap[task];
const child = spawn(command, args, {
  cwd: backendDir,
  env: {
    ...process.env,
    ...env,
    DATABASE_URL: databaseUrl
  },
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
