#!/bin/bash

# Database Health Check Script
# Verifies database schema, permissions, and functionality

echo "🔍 COMPREHENSIVE DATABASE HEALTH CHECK"
echo "========================================"

# Get database URL from environment (masked for security)
DB_URL=${DATABASE_URL:0:20}...
echo "📡 Database URL: ${DB_URL}"
echo ""

# Test 1: Basic Connection
echo "1. Testing Basic Connection..."
psql "$DATABASE_URL" -c "SELECT 1 as connection_test;" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Basic connection: SUCCESS"
else
    echo "❌ Basic connection: FAILED"
    echo "   Check DATABASE_URL and network connectivity"
    exit 1
fi

# Test 2: Required Tables
echo ""
echo "2. Checking Required Tables..."
REQUIRED_TABLES=(
    "users"
    "exams" 
    "questions"
    "question_options"
    "exam_bodies"
    "subjects"
    "categories"
    "attempts"
    "subscriptions"
)

for table in "${REQUIRED_TABLES[@]}"; do
    if psql "$DATABASE_URL" -c "\dt $table" >/dev/null 2>&1; then
        echo "✅ Table '$table': EXISTS"
    else
        echo "❌ Table '$table': MISSING"
    fi
done

# Test 3: Critical Columns
echo ""
echo "3. Checking Critical Columns..."

# Check exams table columns
EXAMS_COLUMNS=("id" "title" "examBodyId" "questionIds" "createdAt")
echo "   Exams table:"
for col in "${EXAMS_COLUMNS[@]}"; do
    if psql "$DATABASE_URL" -c "\d exams" 2>/dev/null | grep -q "$col"; then
        echo "   ✅ Column '$col': EXISTS"
    else
        echo "   ❌ Column '$col': MISSING"
    fi
done

# Check users table columns  
USERS_COLUMNS=("id" "email" "supabaseId" "role" "subscriptionStatus")
echo "   Users table:"
for col in "${USERS_COLUMNS[@]}"; do
    if psql "$DATABASE_URL" -c "\d users" 2>/dev/null | grep -q "$col"; then
        echo "   ✅ Column '$col': EXISTS"
    else
        echo "   ❌ Column '$col': MISSING"
    fi
done

# Test 4: Data Integrity
echo ""
echo "4. Checking Data Integrity..."

# Check for orphaned records
ORPHANED_CHECKS=(
    "questions WHERE examBodyId NOT IN (SELECT id FROM exam_bodies)"
    "attempts WHERE userId NOT IN (SELECT id FROM users)"
    "question_options WHERE questionId NOT IN (SELECT id FROM questions)"
)

for check in "${ORPHANED_CHECKS[@]}"; do
    count=$(psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM $check" -t 2>/dev/null | tr -d ' ')
    if [ "$count" = "0" ]; then
        echo "✅ No orphaned records: $check"
    else
        echo "⚠️  Found $count orphaned records: $check"
    fi
done

# Test 5: Permissions
echo ""
echo "5. Checking Database Permissions..."

# Check if we can create a temporary table
TEMP_TABLE="temp_health_check_$(date +%s)"
if psql "$DATABASE_URL" -c "CREATE TABLE $TEMP_TABLE (id SERIAL PRIMARY KEY);" >/dev/null 2>&1; then
    echo "✅ CREATE permission: GRANTED"
    psql "$DATABASE_URL" -c "DROP TABLE $TEMP_TABLE;" >/dev/null 2>&1
else
    echo "❌ CREATE permission: DENIED"
fi

# Check if we can read from all tables
for table in "${REQUIRED_TABLES[@]}"; do
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM $table" >/dev/null 2>&1; then
        echo "✅ READ permission on '$table': GRANTED"
    else
        echo "❌ READ permission on '$table': DENIED"
    fi
done

# Test 6: Indexes
echo ""
echo "6. Checking Important Indexes..."
INDEXES=(
    "users.email"
    "users.supabase_id"
    "questions.exam_body_id"
    "exams.exam_body_id"
    "attempts.user_id"
)

for index in "${INDEXES[@]}"; do
    if psql "$DATABASE_URL" -c "\di" 2>/dev/null | grep -q "$index"; then
        echo "✅ Index '$index': EXISTS"
    else
        echo "⚠️  Index '$index': MISSING (may affect performance)"
    fi
done

# Test 7: Constraints
echo ""
echo "7. Checking Foreign Key Constraints..."
CONSTRAINTS=(
    "questions_exambodyid_fkey"
    "exams_exambodyid_fkey"
    "attempts_userid_fkey"
)

for constraint in "${CONSTRAINTS[@]}"; do
    if psql "$DATABASE_URL" -c "\d" 2>/dev/null | grep -q "$constraint"; then
        echo "✅ Constraint '$constraint': EXISTS"
    else
        echo "⚠️  Constraint '$constraint': MISSING"
    fi
done

# Test 8: Table Sizes
echo ""
echo "8. Table Sizes (approximate):"
for table in "${REQUIRED_TABLES[@]}"; do
    size=$(psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_total_relation_size('$table'));" -t 2>/dev/null | tr -d ' ')
    rows=$(psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM $table;" -t 2>/dev/null | tr -d ' ')
    echo "   $table: $size ($rows rows)"
done

echo ""
echo "========================================"
echo "🏁 DATABASE HEALTH CHECK COMPLETE"
echo ""
echo "📋 SUMMARY:"
echo "   • Connection tested"
echo "   • Required tables verified"  
echo "   • Critical columns checked"
echo "   • Data integrity validated"
echo "   • Permissions verified"
echo "   • Indexes and constraints checked"
echo "   • Table sizes reported"
echo ""
echo "🔧 If any issues were found:"
echo "   1. Run: psql -d your_database -f migrations/001_comprehensive_schema_migration.sql"
echo "   2. Check your DATABASE_URL environment variable"
echo "   3. Verify database user permissions"
echo ""
