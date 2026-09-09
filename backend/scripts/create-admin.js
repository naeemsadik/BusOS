const { DataSource } = require('typeorm');
const bcrypt = require('bcryptjs');
const path = require('path');

try {
  require('dotenv').config();
} catch {
  // Env vars come from Docker/Coolify in production.
}

const { Admin } = require('../dist/entities/admin.entity');

const requiredDatabaseVariables = [
  'DATABASE_HOST',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
];
const missingDatabaseVariables = requiredDatabaseVariables.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingDatabaseVariables.length > 0) {
  console.error(
    `Missing required database environment variables: ${missingDatabaseVariables.join(', ')}`,
  );
  process.exit(1);
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  schema: process.env.DATABASE_SCHEMA || 'public',
  synchronize: true,
  entities: [Admin],
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized:
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,
});

async function createDefaultAdmin() {
  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    const adminRepository = dataSource.getRepository(Admin);
    const username = process.env.ADMIN_USERNAME || 'admin';

    const existingAdmin = await adminRepository.findOne({
      where: { username },
    });

    if (existingAdmin) {
      console.log('Default admin already exists');
      return;
    }

    const password = process.env.ADMIN_PASSWORD || 'admin123!';
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    );

    const admin = adminRepository.create({
      username,
      email: process.env.ADMIN_EMAIL || 'admin@inventory-pos.com',
      password: hashedPassword,
      firstName: process.env.ADMIN_FIRST_NAME || 'System',
      lastName: process.env.ADMIN_LAST_NAME || 'Administrator',
      isActive: true,
    });

    await adminRepository.save(admin);
    console.log('Default admin created successfully');
  } catch (error) {
    console.error('Error creating default admin:', error.message);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

createDefaultAdmin();
