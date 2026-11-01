const fs = require('fs');
const path = require('path');

// Helper to resolve modules either locally or from backend/node_modules
function resolveModule(moduleName) {
  try {
    return require(moduleName);
  } catch (e) {
    try {
      return require(path.resolve(__dirname, '../backend/node_modules', moduleName));
    } catch (e2) {
      throw e;
    }
  }
}

const dotenv = resolveModule('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('DATABASE_URL is not configured.');
    console.log('In-memory database mode is active for local development.');
    console.log('Skipping remote PostgreSQL migration.');
    return;
  }

  const { Pool } = resolveModule('pg');

  console.log('Connecting to PostgreSQL to run database migration...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    console.log('Applying database schema (schema.sql)...');
    await pool.query(schemaSql);
    console.log('Database schema applied successfully.');

    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    console.log('Applying seed data (seed.sql)...');
    await pool.query(seedSql);
    console.log('Seed data applied successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
