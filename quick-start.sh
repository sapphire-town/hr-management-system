#!/bin/bash

echo "========================================"
echo "HR Management System - Quick Start"
echo "========================================"
echo ""

echo "Step 1: Installing Backend Dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "Backend installation failed!"
    exit 1
fi
echo "Backend dependencies installed successfully!"
echo ""

echo "Step 2: Setting up environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env file created. Please edit it with your configuration."
    echo "Press Enter after editing .env file..."
    read
else
    echo ".env file already exists."
fi
echo ""

echo "Step 3: Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "Prisma generation failed!"
    exit 1
fi
echo "Prisma client generated successfully!"
echo ""

echo "Step 4: Running Database Migrations..."
npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    echo "Database migration failed! Please check your DATABASE_URL in .env"
    exit 1
fi
echo "Database migrated successfully!"
echo ""

echo "Step 5: Installing Frontend Dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "Frontend installation failed!"
    exit 1
fi
echo "Frontend dependencies installed successfully!"
echo ""

echo "Step 6: Setting up frontend environment..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo ".env.local file created."
else
    echo ".env.local file already exists."
fi
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "To start the application:"
echo ""
echo "Backend:"
echo "  cd backend"
echo "  npm run start:dev"
echo ""
echo "Frontend (in a new terminal):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
echo "See SETUP.md for detailed instructions"
echo ""
