#!/usr/bin/env bash
set -euo pipefail

echo "=== TripSync Local Environment Setup ==="

# Check Node.js version
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js 18+ is required. Current version: $(node -v)"
  exit 1
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Set up environment file
if [ ! -f .env.local ]; then
  echo ""
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo ""
  echo "IMPORTANT: Edit .env.local with your Supabase credentials:"
  echo "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
  echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
else
  echo ""
  echo ".env.local already exists, skipping..."
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your Supabase project credentials"
echo "  2. Run database migrations (see supabase/migrations/)"
echo "  3. Enable Realtime in Supabase Dashboard for: cards, votes, comments, participants"
echo "  4. Start the dev server: npm run dev"
echo ""
