const { importSqlFile } = require('./sql-importer');

importSqlFile('schema.sql').catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
