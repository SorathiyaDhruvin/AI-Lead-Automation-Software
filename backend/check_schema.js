require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT count(*) FROM lead_requests 
            WHERE user_id NOT IN (SELECT id FROM users);
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
