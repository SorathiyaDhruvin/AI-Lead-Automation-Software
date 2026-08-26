require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query(`SELECT id FROM users WHERE email = 'sorathiyadhruvin2005@gmail.com'`);
        console.log("User ID:", res.rows[0]?.id);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();
