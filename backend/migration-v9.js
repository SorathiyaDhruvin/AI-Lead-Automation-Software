require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting Migration v9 - Lead Request Automation Trigger...');

    try {
        // Create the notification function for lead_requests
        await pool.query(`
            CREATE OR REPLACE FUNCTION notify_lead_request_created() RETURNS trigger AS $$
            BEGIN
              PERFORM pg_notify('lead_request_created', row_to_json(NEW)::text);
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Created notify_lead_request_created function');

        // Create the trigger on lead_requests table
        await pool.query(`
            CREATE OR REPLACE TRIGGER lead_request_created_trigger
            AFTER INSERT ON lead_requests
            FOR EACH ROW
            EXECUTE FUNCTION notify_lead_request_created();
        `);
        console.log('✅ Created lead_request_created_trigger trigger');

        console.log('🎉 Migration v9 completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
