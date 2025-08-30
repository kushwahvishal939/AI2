#!/bin/bash

echo "🚀 LashivGPT Environment Setup Script"
echo "====================================="

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp backend/env.example backend/.env
    echo "✅ Backend .env file created!"
    echo "⚠️  Please update backend/.env with your API keys and URLs"
else
    echo "✅ Backend .env file already exists"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend .env.local file..."
    cp frontend/env.example frontend/.env.local
    echo "✅ Frontend .env.local file created!"
    echo "⚠️  Please update frontend/.env.local with your API URL"
else
    echo "✅ Frontend .env.local file already exists"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. Update backend/.env with your API keys"
echo "2. Update frontend/.env.local with your backend API URL"
echo "3. Run 'cd backend && npm install && npm run dev'"
echo "4. Run 'cd frontend && npm install && npm run dev'"
echo ""
echo "🌐 For production: Update URLs in both .env files"
echo "🎯 Local development will work with default values"
