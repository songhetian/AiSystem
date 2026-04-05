const { loadRootEnv, resolveDatabaseUrl } = require('./env-utils');

const env = loadRootEnv();
const databaseUrl = resolveDatabaseUrl(env);

console.log([
  '数据库初始化说明：',
  '',
  '1. 推荐优先使用 Prisma：',
  '   npm run db:push:local',
  '   npm run db:seed:local',
  '',
  '2. 如果 Prisma 在当前环境不可用，可执行纯 SQL 初始化：',
  '   npm run db:init:sql',
  '',
  `3. 当前读取到的数据库连接：${databaseUrl || '未配置'}`,
  '',
  '说明：',
  '- 优先读取 .env 中的 LOCAL_DATABASE_URL。',
  '- 若未配置 LOCAL_DATABASE_URL，则回退读取 DATABASE_URL。',
  '- db:push:local 只同步表结构，不写入初始化数据。',
  '- db:seed:local 会执行 backend/prisma/seed.ts。',
  '- schema.sql 负责结构初始化，seed.sql 负责初始化数据写入。',
  '- schema.sql 和 seed.sql 都不写死数据库名，导入时会按 .env 自动建库并执行。'
].join('\n'));
