const pool = require("./db");

/**
 * Runs idempotent database migrations and index updates on startup.
 */
async function runMigrations() {
    try {
        console.log("🔄 Checking and applying database migrations...");

        // 1. Leads table AI columns and indexes
        await pool.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS ai_rating VARCHAR(50),
            ADD COLUMN IF NOT EXISTS ai_reason TEXT,
            ADD COLUMN IF NOT EXISTS ai_strengths JSONB,
            ADD COLUMN IF NOT EXISTS ai_weaknesses JSONB,
            ADD COLUMN IF NOT EXISTS ai_recommendation TEXT,
            ADD COLUMN IF NOT EXISTS occupation TEXT,
            ADD COLUMN IF NOT EXISTS department TEXT;

            CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
            CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
            CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
            CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score);
            CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
        `);

        // 2. Email logs table tracking columns and indexes
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_logs (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                user_id VARCHAR(255) NOT NULL,
                lead_id VARCHAR(255),
                recipient TEXT NOT NULL,
                subject TEXT NOT NULL,
                template_id VARCHAR(255),
                workflow_execution_id VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                provider VARCHAR(50) DEFAULT 'brevo',
                provider_message_id TEXT,
                error_message TEXT,
                opened_at TIMESTAMP WITH TIME ZONE,
                clicked_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE email_logs
            ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE;

            CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);
            CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
            CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
        `);

        // 3. Workflow executions & scheduled actions indexes
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_executions (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                workflow_id VARCHAR(255) NOT NULL,
                lead_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                trigger_event VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'running',
                actions_completed INT DEFAULT 0,
                total_actions INT DEFAULT 0,
                idempotency_key TEXT UNIQUE,
                error_message TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_wf_exec_user_id ON workflow_executions(user_id);
            CREATE INDEX IF NOT EXISTS idx_wf_exec_workflow_id ON workflow_executions(workflow_id);
            CREATE INDEX IF NOT EXISTS idx_wf_exec_status ON workflow_executions(status);

            CREATE TABLE IF NOT EXISTS scheduled_actions (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                workflow_execution_id VARCHAR(255),
                workflow_id VARCHAR(255) NOT NULL,
                lead_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                action_config JSONB NOT NULL,
                scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                attempts INT DEFAULT 0,
                error_message TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_sched_actions_status_sched ON scheduled_actions(status, scheduled_at);
        `);

        // 4. Platform settings table for global toggles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS platform_settings (
                key VARCHAR(100) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            INSERT INTO platform_settings (key, value)
            VALUES ('automation_engine_enabled', 'true'::jsonb)
            ON CONFLICT (key) DO NOTHING;
        `);

        console.log("✅ Database migrations & indexes verified successfully.");
    } catch (error) {
        console.error("⚠️ Migration warning:", error.message);
    }
}

module.exports = { runMigrations };
