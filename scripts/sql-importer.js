const fs = require('fs');
const path = require('path');
const { loadRootEnv, resolveDatabaseUrl, rootDir } = require('./env-utils');

function loadMysqlClient() {
  try {
    return require('mysql2/promise');
  } catch (_error) {
    return require(path.join(rootDir, 'backend', 'node_modules', 'mysql2', 'promise.js'));
  }
}

function parseMysqlUrl(url) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '');
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database
  };
}

async function importSqlFile(fileName) {
  const mysql = loadMysqlClient();
  const env = loadRootEnv();
  const databaseUrl = resolveDatabaseUrl(env);

  if (!databaseUrl) {
    throw new Error('未找到数据库连接。请在 .env 中设置 LOCAL_DATABASE_URL 或 DATABASE_URL。');
  }

  const sqlPath = path.join(rootDir, fileName);
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`根目录缺少 ${fileName}，无法导入。`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const connectionInfo = parseMysqlUrl(databaseUrl);
  if (!connectionInfo.database) {
    throw new Error('数据库连接中缺少数据库名，无法执行 SQL 导入。');
  }

  const connection = await mysql.createConnection({
    host: connectionInfo.host,
    port: connectionInfo.port,
    user: connectionInfo.user,
    password: connectionInfo.password,
    multipleStatements: true
  });

  try {
    const safeDatabaseName = connectionInfo.database.replace(/`/g, '``');
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.changeUser({ database: connectionInfo.database });
    await connection.query(sql);
    console.log(`${fileName} 导入完成，目标数据库: ${connectionInfo.database}`);
  } finally {
    await connection.end();
  }
}

module.exports = {
  importSqlFile
};
