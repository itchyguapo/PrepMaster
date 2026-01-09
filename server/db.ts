// Load environment variables first
import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Now DATABASE_URL is guaranteed to exist if defined in .env
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for database connectivity");
}

// Enhanced pool configuration with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Enable SSL for Supabase connections
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : undefined,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

// Test connection on startup
let connectionTested = false;
async function testConnection() {
  if (connectionTested) return;

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection verified');
    connectionTested = true;
  } catch (error: any) {
    if (error.code === 'ENOTFOUND') {
      console.error(`❌ Database hostname could not be resolved: ${error.hostname}`);
      console.error('   Please check if your DATABASE_URL is correct and you have an internet connection.');
    } else {
      console.error('❌ Database connection test failed:', error.message);
      console.error('   This may cause issues. Please check your DATABASE_URL.');
    }
  }
}

// Test connection asynchronously (don't block startup)
testConnection().catch(() => {
  // Error already logged
});

export const db = drizzle(pool, { schema });
