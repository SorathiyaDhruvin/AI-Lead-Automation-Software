const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const res = await pool.query(`
        SELECT table_schema, table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('workflow_executions', 'automation_workflows') 
          AND column_name IN ('id', 'lead_id', 'workflow_id');
    `);
    console.table(res.rows);
    pool.end();
}
run().catch(console.error);
