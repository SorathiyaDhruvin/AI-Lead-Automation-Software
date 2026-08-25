require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting Migration v7 - Lead Requests RLS Policies...');

    try {
        // 1. Enable RLS on lead_requests (if not already enabled)
        await pool.query(`ALTER TABLE lead_requests ENABLE ROW LEVEL SECURITY;`);
        console.log('✅ Enabled Row Level Security on lead_requests');

        // 2. Drop existing policies if any
        await pool.query(`DROP POLICY IF EXISTS "Users can view their own lead requests" ON lead_requests;`);
        await pool.query(`DROP POLICY IF EXISTS "Users can insert their own lead requests" ON lead_requests;`);
        await pool.query(`DROP POLICY IF EXISTS "Users can update their own lead requests" ON lead_requests;`);
        await pool.query(`DROP POLICY IF EXISTS "Admins can view all lead requests" ON lead_requests;`);
        await pool.query(`DROP POLICY IF EXISTS "Admins can update all lead requests" ON lead_requests;`);
        
        // Note: In Supabase, auth.uid() refers to the UUID of the user in auth.users.
        // Also, role can be stored in auth.users, public.users, or JWT claims.
        // For simplicity and matching Supabase standards, we assume standard auth.uid() usage.

        // 3. User SELECT Policy
        await pool.query(`
            CREATE POLICY "Users can view their own lead requests" 
            ON lead_requests FOR SELECT 
            USING (auth.uid()::text = user_id);
        `);
        console.log('✅ Created User SELECT policy');

        // 4. User INSERT Policy
        await pool.query(`
            CREATE POLICY "Users can insert their own lead requests" 
            ON lead_requests FOR INSERT 
            WITH CHECK (auth.uid()::text = user_id);
        `);
        console.log('✅ Created User INSERT policy');

        // 5. Admin SELECT Policy (if relying on JWT claims or public.users table)
        // Here we use a subquery to check if the user is an admin in the public.users table.
        await pool.query(`
            CREATE POLICY "Admins can view all lead requests" 
            ON lead_requests FOR SELECT 
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'admin'
                )
            );
        `);
        console.log('✅ Created Admin SELECT policy');

        // 6. Admin UPDATE Policy
        await pool.query(`
            CREATE POLICY "Admins can update all lead requests" 
            ON lead_requests FOR UPDATE 
            USING (
                EXISTS (
                    SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role = 'admin'
                )
            );
        `);
        console.log('✅ Created Admin UPDATE policy');

        console.log('🎉 Migration v7 completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
