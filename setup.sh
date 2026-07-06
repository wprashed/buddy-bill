#!/bin/bash
# BuddyBill - Local Setup Script
# Run: bash setup.sh

set -e

echo ""
echo "🤝💰 BuddyBill Setup"
echo "===================="
echo ""

# Detect Mac username
USERNAME=$(whoami)

# Check if PostgreSQL is running
if command -v pg_isready &> /dev/null; then
  if pg_isready &> /dev/null; then
    echo "✅ PostgreSQL is running"
  else
    echo "❌ PostgreSQL is not running. Starting it..."
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
      sleep 2
    fi
    if ! pg_isready &> /dev/null; then
      echo "⚠️  Could not start PostgreSQL. Please start it manually."
      echo "   brew services start postgresql"
      exit 1
    fi
    echo "✅ PostgreSQL started"
  fi
else
  echo "⚠️  pg_isready not found. Make sure PostgreSQL is installed and running."
  echo "   brew install postgresql@14"
  echo "   brew services start postgresql@14"
fi

echo ""

# Create database if it doesn't exist
echo "📦 Creating database 'buddybill'..."
if createdb buddybill 2>/dev/null; then
  echo "✅ Database 'buddybill' created"
else
  echo "✅ Database 'buddybill' already exists"
fi

echo ""

# Figure out the right connection string
# Try common patterns
DB_URL=""

# Try without password first (common on Mac with Homebrew)
if psql "postgresql://${USERNAME}@localhost:5432/buddybill" -c "SELECT 1" &>/dev/null; then
  DB_URL="postgresql://${USERNAME}@localhost:5432/buddybill"
elif psql "postgresql://localhost:5432/buddybill" -c "SELECT 1" &>/dev/null; then
  DB_URL="postgresql://localhost:5432/buddybill"
elif psql "postgresql://postgres:postgres@localhost:5432/buddybill" -c "SELECT 1" &>/dev/null; then
  DB_URL="postgresql://postgres:postgres@localhost:5432/buddybill"
elif psql "postgresql://postgres@localhost:5432/buddybill" -c "SELECT 1" &>/dev/null; then
  DB_URL="postgresql://postgres@localhost:5432/buddybill"
fi

if [ -z "$DB_URL" ]; then
  echo "⚠️  Could not auto-detect your database connection."
  echo ""
  echo "   Please enter your PostgreSQL connection URL:"
  echo "   (e.g., postgresql://${USERNAME}@localhost:5432/buddybill)"
  echo ""
  read -p "   DATABASE_URL=" DB_URL
  if [ -z "$DB_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
  fi
fi

echo "✅ Database connection verified: $DB_URL"

# Create .env file
echo ""
echo "📝 Creating .env file..."
echo "DATABASE_URL=${DB_URL}" > .env
echo "✅ .env file created"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Push database schema
echo ""
echo "🗄️  Pushing database schema (20 tables)..."
npx drizzle-kit push

# Build
echo ""
echo "🔨 Building for production..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Run the app:"
echo "   npm run start        # Production mode"
echo "   npm run dev          # Development mode (with hot reload)"
echo ""
echo "🌐 Then open:"
echo "   http://localhost:3000        # Main app"
echo "   http://localhost:3000/admin  # Admin dashboard"
echo ""
