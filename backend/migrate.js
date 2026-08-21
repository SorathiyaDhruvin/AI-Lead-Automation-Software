const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const runMigration = async () => {
  try {
    await pool.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS ai_rating VARCHAR(50),
      ADD COLUMN IF NOT EXISTS ai_reason TEXT,
      ADD COLUMN IF NOT EXISTS ai_strengths JSONB,
      ADD COLUMN IF NOT EXISTS ai_weaknesses JSONB,
      ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;
    `);
    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

runMigration();
