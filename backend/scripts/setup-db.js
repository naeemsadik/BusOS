#!/usr/bin/env node
/**
 * Database setup script
 * This script creates the database and schema if they don't exist
 */

const { Client } = require('pg');

try {
  require('dotenv').config();
} catch {
  // Env vars come from Docker/Coolify in production.
}

const log = (...messages) => {
  process.stdout.write(messages.map((message) => String(message)).join(' ') + '\n');
};

const logError = (...messages) => {
  process.stderr.write(messages.map((message) => String(message)).join(' ') + '\n');
};

async function setupDatabase() {
  const sslConfig = process.env.DATABASE_SSL === 'true' ? {
    ssl: {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
    }
  } : {};

  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default database first
    ...sslConfig
  });

  try {
    await client.connect();
    log('Connected to PostgreSQL server');

    // Check if database exists
    const dbName = process.env.DATABASE_NAME || 'pos';
    const dbResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbResult.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE "${dbName}"`);
      log(`Database "${dbName}" created successfully`);
    } else {
      log(`Database "${dbName}" already exists`);
    }

    await client.end();

    // Connect to the target database to create schema
    const targetClient = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT || 5432,
      user: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: dbName,
      ...sslConfig
    });

    await targetClient.connect();
    log(`Connected to database "${dbName}"`);

    // Check if schema exists
    const schemaName = process.env.DATABASE_SCHEMA || 'public';
    if (schemaName !== 'public') {
      const schemaResult = await targetClient.query(
        'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
        [schemaName]
      );

      if (schemaResult.rows.length === 0) {
        // Create schema
        await targetClient.query(`CREATE SCHEMA "${schemaName}"`);
        log(`Schema "${schemaName}" created successfully`);
      } else {
        log(`Schema "${schemaName}" already exists`);
      }
    }

    await targetClient.end();
    log('Database setup completed successfully');

  } catch (error) {
    logError('Error setting up database:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

setupDatabase();
