const { importSqlFile } = require('./sql-importer');

async function main() {
  await importSqlFile('schema.sql');
  await importSqlFile('seed.sql');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
