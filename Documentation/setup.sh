#!/bin/bash

echo "🎨 AuraChat Setup Script"
echo "========================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed!"
echo ""

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️  No .env.local file found"
    echo ""
    echo "Please create a .env.local file with your Supabase credentials:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo ""
    echo "You can find these in your Supabase project settings under API."
    echo ""
    echo "Creating .env.local template..."
    cp .env.local.example .env.local
    echo "✅ .env.local created. Please fill in your Supabase credentials."
    echo ""
else
    echo "✅ .env.local file found"
    echo ""
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your Supabase database (see README.md)"
echo "2. Add your Supabase credentials to .env.local"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "Happy coding! 💕"