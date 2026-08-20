const app = require("./src/app");
const pool = require("./src/config/db");

const PORT = process.env.PORT || 5000;

// Test DB connection on startup
pool.connect()
    .then(() => console.log("✅ PostgreSQL Connected"))
    .catch((err) => console.error("❌ PostgreSQL Connection Error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
