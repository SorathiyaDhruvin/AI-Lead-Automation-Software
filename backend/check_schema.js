const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const res = await pool.query(`
        SELECT conname, contype, pg_get_constraintdef(oid) 
        FROM pg_constraint 
        WHERE conrelid = 'activities'::regclass;
    `);
    console.table(res.rows);
    pool.end();
}
run().catch(console.error);
