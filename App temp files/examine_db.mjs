#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function examineDatabase() {
  try {
    console.log('🔍 Examining database structure...\n');
    
    // Get all tables
    const tables = await client`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('📋 Current tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    console.log('\n🔍 Examining questions table structure...');
    
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
    
    console.log('\n🔍 Checking for NOT NULL constraints that might cause issues...');
    
    const notNullColumns = questionsColumns.filter(col => 
      col.is_nullable === 'NO' && 
      !col.column_default && 
      !['id', 'created_at', 'updated_at'].includes(col.column_name)
    );
    
    if (notNullColumns.length > 0) {
      console.log('⚠️  Potentially problematic NOT NULL columns (no default):');
      notNullColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    console.log('\n🔍 Checking question_options table...');
    
    const questionOptionsColumns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'question_options' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Question options table columns:');
    questionOptionsColumns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${def}`);
    });
    
    console.log('\n🔍 Checking for unnecessary/duplicate tables...');
    
    // Check for potentially redundant tables
    const redundantPatterns = [
      'track_subjects',
      'academic_tracks',
      'exam_types'
    ];
    
    const redundantTables = tables.filter(table => 
      redundantPatterns.some(pattern => 
        table.table_name.toLowerCase().includes(pattern.toLowerCase())
      )
    );
    
    if (redundantTables.length > 0) {
      console.log('⚠️  Potentially redundant tables:');
      redundantTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
    console.log('\n✅ Database examination complete!');
    
  } catch (error) {
    console.error('❌ Error examining database:', error);
  } finally {
    await client.end();
  }
}

examineDatabase();
