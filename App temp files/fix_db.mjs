import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function examineAndFixDatabase() {
  try {
    console.log('🔍 Examining database structure...\n');
    
    // Get all tables
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📋 Current tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Get questions table columns
    const questionsColumns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'questions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Questions table columns:');
    questionsColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${def}`);
    });
    
    // Check for problematic NOT NULL columns
    const notNullColumns = questionsColumns.filter(col => 
      col.is_nullable === 'NO' && 
      !col.column_default && 
      !['id', 'created_at', 'updated_at'].includes(col.column_name)
    );
    
    if (notNullColumns.length > 0) {
      console.log('\n⚠️  Potentially problematic NOT NULL columns:');
      notNullColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // Try to make these columns nullable if they're causing issues
      console.log('\n🔧 Attempting to fix problematic columns...');
      for (const col of notNullColumns) {
        try {
          await client`ALTER TABLE questions ALTER COLUMN ${client(col.column_name)} DROP NOT NULL`;
          console.log(`✅ Made ${col.column_name} nullable`);
        } catch (error) {
          console.log(`❌ Could not make ${col.column_name} nullable: ${error.message}`);
        }
      }
    }
    
    // Check for redundant tables
    const redundantTables = tables.filter(table => 
      ['track_subjects', 'academic_tracks', 'exam_types'].some(pattern => 
        table.table_name.toLowerCase().includes(pattern.toLowerCase())
      )
    );
    
    if (redundantTables.length > 0) {
      console.log('\n⚠️  Potentially redundant tables found:');
      redundantTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      
      console.log('\n🔧 Checking if these tables are safe to remove...');
      for (const table of redundantTables) {
        try {
          const count = await client`SELECT COUNT(*) as count FROM ${client(table.table_name)}`;
          console.log(`  - ${table.table_name}: ${count[0].count} rows`);
        } catch (error) {
          console.log(`  - ${table.table_name}: Error checking - ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Database examination and fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

examineAndFixDatabase();
