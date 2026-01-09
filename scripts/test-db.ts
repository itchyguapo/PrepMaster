import "dotenv/config";
import pg from 'pg';
const { Pool } = pg;

async function testConnection() {
    console.log("Checking DATABASE_URL...");
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is not set in .env");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('supabase.co') ? {
            rejectUnauthorized: false
        } : undefined,
    });

    try {
        console.log("Connecting to database...");
        const client = await pool.connect();
        console.log("✅ Successfully connected to database");

        console.log("Testing query...");
        const res = await client.query('SELECT NOW()');
        console.log("✅ Query successful:", res.rows[0]);

        console.log("Checking users table...");
        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("Tables found:", tables.rows.map(r => r.table_name).join(", "));

        client.release();
        await pool.end();
        console.log("✅ Database verification complete");
    } catch (err) {
        console.error("❌ Database connection failed:");
        console.error(err);
        process.exit(1);
    }
}

testConnection();
