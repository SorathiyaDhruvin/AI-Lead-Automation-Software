require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting Migration v10 - Orphan Data Cleanup and Cascade Setup...');

    try {
        // 1. Clean orphaned records from users table (where id is not in auth.users)
        console.log("Cleaning orphaned user records...");
        await pool.query(`DELETE FROM public.users WHERE id NOT IN (SELECT id::text FROM auth.users)`);

        // 2. Clean orphaned records from child tables (where user_id is not in users table)
        const childTables = [
            'activities', 'automation_rules', 'lead_notes', 
            'lead_requests', 'leads', 'notifications', 
            'password_resets', 'segments'
        ];
        
        console.log("Cleaning orphaned child records...");
        for (const table of childTables) {
            await pool.query(`DELETE FROM public.${table} WHERE user_id NOT IN (SELECT id FROM public.users) OR user_id IS NULL`);
            console.log(`- Cleaned ${table}`);
        }

        // 3. Create a Postgres Trigger on auth.users to cascade delete to public.users
        console.log("Setting up auth.users -> public.users cascade trigger...");
        await pool.query(`
            CREATE OR REPLACE FUNCTION public.handle_deleted_user() 
            RETURNS TRIGGER AS $$
            BEGIN
              DELETE FROM public.users WHERE id = OLD.id::text;
              RETURN OLD;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
            CREATE TRIGGER on_auth_user_deleted
              AFTER DELETE ON auth.users
              FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();
        `);

        // 4. Add ON DELETE CASCADE from child tables to public.users
        console.log("Setting up child tables -> public.users cascade foreign keys...");
        for (const table of childTables) {
            await pool.query(`
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = '${table}_user_id_fkey'
                    ) THEN
                        ALTER TABLE public.${table} 
                        ADD CONSTRAINT ${table}_user_id_fkey 
                        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
                    END IF;
                END $$;
            `);
        }

        console.log('🎉 Migration v10 completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
