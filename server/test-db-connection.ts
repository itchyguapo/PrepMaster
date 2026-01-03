// Test database connection
import "dotenv/config";
import { Pool } from "pg";

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in environment variables");
    process.exit(1);
  }

  console.log("🔍 Testing database connection...");
  console.log(`📋 DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`); // Hide password

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log("⏳ Attempting to connect...");
    const client = await pool.connect();
    console.log("✅ Successfully connected to database!");
    
    // Test a simple query
    const result = await client.query("SELECT NOW() as current_time, version() as pg_version");
    console.log("✅ Database query successful!");
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    // Test if we can access the users table
    try {
      const userCount = await client.query("SELECT COUNT(*) as count FROM users");
      console.log(`✅ Users table accessible: ${userCount.rows[0].count} users found`);
    } catch (err: any) {
      console.log(`⚠️  Users table check: ${err.message}`);
    }
    
    client.release();
    console.log("✅ Connection test completed successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Database connection failed!");
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Host: ${error.hostname || 'N/A'}`);
    console.error(`   Port: ${error.port || 'N/A'}`);
    
    if (error.code === 'ENOTFOUND') {
      console.error("\n💡 Possible issues:");
      console.error("   1. Database hostname cannot be resolved (DNS issue)");
      console.error("   2. Check if the DATABASE_URL hostname is correct");
      console.error("   3. Verify your internet connection");
      console.error("   4. Check if Supabase database is active");
    } else if (error.code === 'ECONNREFUSED') {
      console.error("\n💡 Possible issues:");
      console.error("   1. Database server is not running");
      console.error("   2. Port is incorrect");
      console.error("   3. Firewall blocking connection");
    } else if (error.code === '28P01') {
      console.error("\n💡 Possible issues:");
      console.error("   1. Invalid database credentials");
      console.error("   2. Password is incorrect");
      console.error("   3. User doesn't have access");
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

