const pool = require("./src/config/db");

async function migrate() {
    try {
        console.log("Creating platform_settings table...");
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS platform_settings (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // Insert default platform settings
        await pool.query(`
            INSERT INTO platform_settings (key, value)
            VALUES 
            ('automation_engine_enabled', 'true'::jsonb),
            ('system_maintenance_mode', 'false'::jsonb)
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log("Migration complete!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit();
    }
}

migrate();
