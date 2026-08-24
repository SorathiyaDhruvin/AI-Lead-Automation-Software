const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. bulk_email_jobs
    await client.query(`
      CREATE TABLE IF NOT EXISTS bulk_email_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        total_recipients INT DEFAULT 0,
        sent_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created bulk_email_jobs table');

    // 2. add bulk_job_id to email_logs
    await client.query(`
      ALTER TABLE email_logs 
      ADD COLUMN IF NOT EXISTS bulk_job_id UUID REFERENCES bulk_email_jobs(id) ON DELETE CASCADE;
    `);
    console.log('✅ Added bulk_job_id to email_logs');

    // 3. create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_bulk_job_id ON email_logs(bulk_job_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bulk_email_jobs_user ON bulk_email_jobs(user_id);`);
    
    await client.query('COMMIT');
    console.log('\n🎉 Migration v3 completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v3 failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

runMigration();
