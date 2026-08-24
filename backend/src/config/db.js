const { Pool } = require("pg");
require("dotenv").config();

// Support both individual env vars (local) and DATABASE_URL (Vercel/production)
const pool = new Pool(
    process.env.DATABASE_URL
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: { rejectUnauthorized: false },
          }
        : {
              host: process.env.DB_HOST,
              port: parseInt(process.env.DB_PORT) || 5432,
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME,
          }
);

pool.on("connect", () => {
    if (process.env.NODE_ENV !== "production") {
        console.log("✅ Connected to PostgreSQL");
    }
});

pool.on("error", (err) => {
    console.error("❌ PostgreSQL pool error:", err.message);
});

module.exports = pool;
