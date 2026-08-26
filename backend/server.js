const app = require("./src/app");
const pool = require("./src/config/db");
const scheduledProcessor = require("./src/services/scheduledProcessor");

const PORT = process.env.PORT || 5000;

// Test DB connection on startup, then start background processors
pool.connect()
    .then((client) => {
        console.log("✅ PostgreSQL Connected");
        client.release();
        // Start the scheduled action processor (runs every 60 seconds)
        scheduledProcessor.startProcessor(60000);
    })
    .catch((err) => console.error("❌ PostgreSQL Connection Error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

scheduledProcessor.startProcessor(60000);
// Start the real-time Postgres DB trigger listener
startDbListener();
    })
    .catch ((err) => console.error("❌ PostgreSQL Connection Error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

