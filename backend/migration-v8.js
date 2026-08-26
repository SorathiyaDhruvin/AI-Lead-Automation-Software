require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting Migration v8 - Leads Ingestion & Security RLS Policies...');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Add processing_status column to leads table
        await client.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'accepted';
        `);
        console.log('✅ Added processing_status column to leads table');

        // 2. Enable Row Level Security (RLS) on leads table
        await client.query(`ALTER TABLE leads ENABLE ROW LEVEL SECURITY;`);
        console.log('✅ Enabled Row Level Security on leads table');

        // 3. Drop existing policies if any
        await client.query(`DROP POLICY IF EXISTS "Users can view their own leads" ON leads;`);
        await client.query(`DROP POLICY IF EXISTS "Users can insert their own leads" ON leads;`);
        await client.query(`DROP POLICY IF EXISTS "Users can update their own leads" ON leads;`);
        await client.query(`DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;`);
        await client.query(`DROP POLICY IF EXISTS "Admins can view all leads" ON leads;`);
        await client.query(`DROP POLICY IF EXISTS "Admins can update all leads" ON leads;`);
        await client.query(`DROP POLICY IF EXISTS "Admins can delete all leads" ON leads;`);

        // 4. Create User SELECT Policy
        await client.query(`
            CREATE POLICY "Users can view their own leads" 
            ON leads FOR SELECT 
            USING (auth.uid()::text = user_id);
        `);
        console.log('✅ Created User SELECT policy');

        // 5. Create User INSERT Policy
        await client.query(`
            CREATE POLICY "Users can insert their own leads" 
            ON leads FOR INSERT 
            WITH CHECK (auth.uid()::text = user_id);
        `);
        console.log('✅ Created User INSERT policy');

        // 6. Create User UPDATE Policy
        await client.query(`
            CREATE POLICY "Users can update their own leads" 
            ON leads FOR UPDATE 
            USING (auth.uid()::text = user_id);
        `);
        console.log('✅ Created User UPDATE policy');

        // 7. Create User DELETE Policy
        await client.query(`
            CREATE POLICY "Users can delete their own leads" 
            ON leads FOR DELETE 
            USING (auth.uid()::text = user_id);
        `);
        console.log('✅ Created User DELETE policy');

        // 8. Create Admin SELECT Policy
        await client.query(`
            CREATE POLICY "Admins can view all leads" 
            ON leads FOR SELECT 
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'admin'
                )
            );
        `);
        console.log('✅ Created Admin SELECT policy');

        // 9. Create Admin UPDATE Policy
        await client.query(`
            CREATE POLICY "Admins can update all leads" 
            ON leads FOR UPDATE 
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'admin'
                )
            );
        `);
        console.log('✅ Created Admin UPDATE policy');

        // 10. Create Admin DELETE Policy
        await client.query(`
            CREATE POLICY "Admins can delete all leads" 
            ON leads FOR DELETE 
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'admin'
                )
            );
        `);
        console.log('✅ Created Admin DELETE policy');

        // 11. Create PostgreSQL notify trigger function & trigger for database inserts
        await client.query(`
            CREATE OR REPLACE FUNCTION notify_lead_created()
            RETURNS trigger AS $$
            BEGIN
              PERFORM pg_notify('lead_created', row_to_json(NEW)::text);
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS lead_created_trigger ON leads;
        `);

        await client.query(`
            CREATE TRIGGER lead_created_trigger
            AFTER INSERT ON leads
            FOR EACH ROW
            EXECUTE FUNCTION notify_lead_created();
        `);
        console.log('✅ Created PostgreSQL notify triggers for lead creation');

        await client.query('COMMIT');
        console.log('🎉 Migration v8 completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
