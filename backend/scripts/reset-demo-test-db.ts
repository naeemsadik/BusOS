import dataSource from '../src/database/data-source';

const allowedHosts = new Set(['localhost', '127.0.0.1']);
const host = process.env.DATABASE_HOST || '';
const database = process.env.DATABASE_NAME || '';

function assertSafeTarget() {
  if (process.env.BUSOS_ALLOW_TEST_RESET !== 'true') {
    throw new Error('Refusing to reset: BUSOS_ALLOW_TEST_RESET must be exactly "true".');
  }
  if (!allowedHosts.has(host)) {
    throw new Error(`Refusing to reset non-local PostgreSQL host: ${host || '<empty>'}.`);
  }
  if (!database.endsWith('_demo_test')) {
    throw new Error(`Refusing to reset database without the _demo_test suffix: ${database || '<empty>'}.`);
  }
  if (process.env.DATABASE_SSL === 'true') {
    throw new Error('Refusing to reset a database configured with SSL; the demo database must be local.');
  }
}

async function main() {
  assertSafeTarget();
  dataSource.setOptions({ dropSchema: true, synchronize: true, migrationsRun: false });
  await dataSource.initialize();
  await dataSource.destroy();
  process.stdout.write(`Reset disposable PostgreSQL database ${database} on ${host}.\n`);
}

main().catch(async (error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
});
