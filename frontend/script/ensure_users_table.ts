import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL DB.");

    const query = `
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await client.query(query);
    console.log("SUCCESS: 'users' table created/verified in Supabase database.");
  } catch (err) {
    console.error("Error creating users table:", err);
  } finally {
    await client.end();
  }
}

run();
