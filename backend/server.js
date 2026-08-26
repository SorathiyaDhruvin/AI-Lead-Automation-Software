const app = require("./src/app");
const pool = require("./src/config/db");
const scheduledProcessor = require("./src/services/scheduledProcessor");
const { Client } = require("pg");

const PORT = process.env.PORT || 5000;

function startDbListener() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.log("⚠️ [DbListener] No DATABASE_URL found. Skipping real-time DB listener.");
        return;
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    client.connect()
        .then(async () => {
            console.log("🔊 Database listener connected and listening to channel: lead_created");
            await client.query("LISTEN lead_created");

            client.on("notification", async (msg) => {
                if (msg.channel === "lead_created") {
                    try {
                        const lead = JSON.parse(msg.payload);
                        console.log(`[DbListener] New lead inserted: ${lead.id} (${lead.email})`);
                        
                        const automationEngine = require("./src/services/automationEngine");
                        await automationEngine.triggerEvent("lead_created", lead, lead.user_id);
                    } catch (err) {
                        console.error("[DbListener] Error processing notification:", err.message);
                    }
                }
            });
        })
        .catch((err) => {
            console.error("❌ [DbListener] Connection error:", err.message);
            setTimeout(startDbListener, 5000);
        });

    client.on("error", (err) => {
        console.error("❌ [DbListener] Client error:", err.message);
        setTimeout(startDbListener, 5000);
    });
}

// Test DB connection on startup, then start background processors
pool.connect()
    .then((client) => {
        console.log("✅ PostgreSQL Connected");
        client.release();
        // Start the scheduled action processor (runs every 60 seconds)
        scheduledProcessor.startProcessor(60000);
        // Start the real-time Postgres DB trigger listener
        startDbListener();
    })
    .catch((err) => console.error("❌ PostgreSQL Connection Error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

