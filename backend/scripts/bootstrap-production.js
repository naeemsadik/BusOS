const path = require('node:path');
const { DataSource } = require('typeorm');

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is required for production startup.');
  process.exit(1);
}

const schema = process.env.DATABASE_SCHEMA || 'public';
const dataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
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
