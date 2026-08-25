const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add fields to lead_requests
    await client.query(`
      ALTER TABLE lead_requests
      ADD COLUMN IF NOT EXISTS request_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS number_of_leads INT,
      ADD COLUMN IF NOT EXISTS additional_notes TEXT;
    `);
    console.log('✅ Added fields to lead_requests');

    // 2. Add role to users
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    `);
    
    // Set the specific admin user
    await client.query(`
      UPDATE users SET role = 'admin' WHERE email = 'leadflowai94@gmail.com';
    `);
    console.log('✅ Added role to users and set admin');

    await client.query('COMMIT');
    console.log('\n🎉 Migration v5 completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v5 failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

runMigration();
