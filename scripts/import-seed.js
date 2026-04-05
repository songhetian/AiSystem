const { importSqlFile } = require('./sql-importer');

importSqlFile('seed.sql').catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
