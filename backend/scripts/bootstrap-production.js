const path = require('node:path');
const { DataSource } = require('typeorm');

const requiredDatabaseVariables = process.env.DATABASE_URL
  ? []
  : ['DATABASE_HOST', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'DATABASE_NAME'];
const missingDatabaseVariables = requiredDatabaseVariables.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingDatabaseVariables.length > 0) {
  console.error(
    `Missing required database environment variables: ${missingDatabaseVariables.join(', ')}`,
  );
  process.exit(1);
}

const schema = process.env.DATABASE_SCHEMA || 'public';
const connection = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl:
        process.env.DATABASE_SSL === 'true'
          ? {
              rejectUnauthorized:
                process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
            }
          : false,
    };
const dataSource = new DataSource({
  type: 'postgres',
  ...connection,
  schema,
  entities: [path.resolve(__dirname, '../dist/entities/*.entity.js')],
  migrations: [path.resolve(__dirname, '../dist/migrations/*.js')],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'each',
  synchronize: false,
  logging: false,
});

async function bootstrap() {
  try {
    await dataSource.initialize();

    const baseTables = [
      'organizations',
      'users',
      'admins',
      'products',
      'customers',
      'orders',
      'user_permissions',
    ];
    const knownTables = await dataSource.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_name = ANY($2::text[])`,
      [schema, baseTables],
    );
    const freshDatabase = knownTables.length === 0;

    if (freshDatabase) {
      console.log('Empty database detected; creating the initial BusOS schema.');
      await dataSource.synchronize(false);
    } else if (knownTables.length !== baseTables.length) {
      const existing = new Set(knownTables.map(({ table_name }) => table_name));
      const missing = baseTables.filter((table) => !existing.has(table));
      throw new Error(
        `The database contains a partial BusOS schema (missing: ${missing.join(', ')}). Restore a complete backup or use an empty Neon database.`,
      );
    }

    const migrations = await dataSource.runMigrations({
      transaction: 'each',
      fake: freshDatabase,
    });
    console.log(
      freshDatabase
        ? `Database ready; recorded ${migrations.length} migration(s) against the synchronized schema.`
        : `Database ready; applied ${migrations.length} pending migration(s).`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

bootstrap().catch((error) => {
  console.error('Database bootstrap failed:', error.message);
  process.exit(1);
});
