const app = require("./src/app");
const pool = require("./src/config/db");
const { runMigrations } = require("./src/config/migrations");
const scheduledProcessor = require("./src/services/scheduledProcessor");

const PORT = process.env.PORT || 5001;

// Test DB connection on startup, apply migrations, then start background processors
pool.connect()
    .then(async (client) => {
        console.log("✅ PostgreSQL Connected");
        client.release();
        
        // Run idempotent DB migrations and indexes check
        await runMigrations();

        // Start the scheduled action processor (runs every 60 seconds)
        scheduledProcessor.startProcessor(60000);
    })
    .catch((err) => console.error("❌ PostgreSQL Connection Error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

