const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const index = line.indexOf('=');
    if (index <= 0) {
      continue;
    }

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }

  return result;
}

function loadRootEnv() {
  const envPath = path.join(rootDir, '.env');
  const examplePath = path.join(rootDir, '.env.example');

  const parsed = {
    ...(fs.existsSync(examplePath) ? parseEnvFile(examplePath) : {}),
    ...(fs.existsSync(envPath) ? parseEnvFile(envPath) : {})
  };

  return {
    ...process.env,
    ...parsed
  };
}

function resolveDatabaseUrl(env) {
  return env.LOCAL_DATABASE_URL || env.DATABASE_URL;
}

module.exports = {
  rootDir,
  loadRootEnv,
  resolveDatabaseUrl
};
