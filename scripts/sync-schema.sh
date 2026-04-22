#!/bin/bash

# Schema Synchronization Script
# Purpose: Sync schema.sql with Prisma schema to ensure 100% alignment
# Usage: ./scripts/sync-schema.sh

set -e

echo "🔄 Starting Schema Synchronization..."
echo ""

# Colors for output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup current schema.sql
echo "📦 Step 1: Backing up current schema.sql..."
cp schema.sql schema.sql.backup.$(date +%Y%m%d_%H%M%S)
echo "${GREEN}✓${NC} Backup created"
echo ""

# Step 2: Generate fresh schema from database
echo "🔨 Step 2: Generating fresh schema from Prisma..."
cd backend

# Push Prisma schema to database (this ensures DB is up to date)
echo "  → Pushing Prisma schema to database..."
npx prisma db push --skip-generate --accept-data-loss

# Generate SQL dump
echo "  → Generating SQL dump..."
cd ..

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "${RED}✗${NC} DATABASE_URL not set in .env file"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: mysql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "  → Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Generate schema dump (structure only, no data)
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS \
  --no-data \
  --skip-add-drop-table \
  --skip-comments \
  --compact \
  $DB_NAME > schema_generated.sql

echo "${GREEN}✓${NC} Schema generated"
echo ""

# Step 3: Compare schemas
echo "📊 Step 3: Comparing schemas..."
echo "  → Checking for missing tables..."

# Extract table names from both files
grep "CREATE TABLE" schema.sql | sed 's/.*`\([^`]*\)`.*/\1/' | sort > /tmp/schema_old_tables.txt
grep "CREATE TABLE" schema_generated.sql | sed 's/.*`\([^`]*\)`.*/\1/' | sort > /tmp/schema_new_tables.txt

# Find differences
MISSING_TABLES=$(comm -13 /tmp/schema_old_tables.txt /tmp/schema_new_tables.txt)
EXTRA_TABLES=$(comm -23 /tmp/schema_old_tables.txt /tmp/schema_new_tables.txt)

if [ -n "$MISSING_TABLES" ]; then
    echo "${YELLOW}⚠${NC}  Missing tables in schema.sql:"
    echo "$MISSING_TABLES" | sed 's/^/    - /'
    echo ""
fi

if [ -n "$EXTRA_TABLES" ]; then
    echo "${YELLOW}⚠${NC}  Extra tables in schema.sql (not in Prisma):"
    echo "$EXTRA_TABLES" | sed 's/^/    - /'
    echo ""
fi

if [ -z "$MISSING_TABLES" ] && [ -z "$EXTRA_TABLES" ]; then
    echo "${GREEN}✓${NC} All tables are present"
fi

echo ""

# Step 4: Offer to update schema.sql
echo "🔧 Step 4: Update Options"
echo ""
echo "Choose an action:"
echo "  1) Replace schema.sql with generated schema (RECOMMENDED)"
echo "  2) Show detailed diff"
echo "  3) Cancel (keep current schema.sql)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "📝 Replacing schema.sql..."
        
        # Add header comments
        cat > schema.sql << 'EOF'
-- AiSystem MySQL schema initialization script
-- Compatible with MySQL 8.x
-- Auto-generated from Prisma schema
-- Last updated: $(date +%Y-%m-%d %H:%M:%S)
-- 
-- This file only creates table structures and comments.
-- For initial data, run: npm run seed:import

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

EOF
        
        # Append generated schema
        cat schema_generated.sql >> schema.sql
        
        # Add footer
        echo "" >> schema.sql
        echo "SET FOREIGN_KEY_CHECKS = 1;" >> schema.sql
        
        echo "${GREEN}✓${NC} schema.sql updated successfully"
        echo ""
        echo "📋 Summary:"
        echo "  - Backup: schema.sql.backup.*"
        echo "  - New schema: schema.sql"
        echo "  - Generated: schema_generated.sql (kept for reference)"
        ;;
    2)
        echo ""
        echo "📊 Detailed Diff:"
        echo ""
        diff -u schema.sql schema_generated.sql || true
        echo ""
        echo "Generated schema saved as: schema_generated.sql"
        ;;
    3)
        echo ""
        echo "❌ Cancelled. No changes made."
        echo "Generated schema saved as: schema_generated.sql for your review"
        ;;
    *)
        echo ""
        echo "${RED}✗${NC} Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Schema synchronization complete!"
echo ""
echo "Next steps:"
echo "  1. Review the changes in schema.sql"
echo "  2. Test database initialization: npm run db:init:sql"
echo "  3. Verify seed data loads: npm run seed:import"
echo "  4. Commit changes if everything works"
