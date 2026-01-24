@echo off
echo ========================================
echo HR Management System - Quick Start
echo ========================================
echo.

echo Step 1: Installing Backend Dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Backend installation failed!
    pause
    exit /b %errorlevel%
)
echo Backend dependencies installed successfully!
echo.

echo Step 2: Setting up environment file...
if not exist .env (
    copy .env.example .env
    echo .env file created. Please edit it with your configuration.
    echo Press any key after editing .env file...
    pause
) else (
    echo .env file already exists.
)
echo.

echo Step 3: Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo Prisma generation failed!
    pause
    exit /b %errorlevel%
)
echo Prisma client generated successfully!
echo.

echo Step 4: Running Database Migrations...
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo Database migration failed! Please check your DATABASE_URL in .env
    pause
    exit /b %errorlevel%
)
echo Database migrated successfully!
echo.

echo Step 5: Installing Frontend Dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Frontend installation failed!
    pause
    exit /b %errorlevel%
)
echo Frontend dependencies installed successfully!
echo.

echo Step 6: Setting up frontend environment...
if not exist .env.local (
    copy .env.example .env.local
    echo .env.local file created.
) else (
    echo .env.local file already exists.
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo Backend:
echo   cd backend
echo   npm run start:dev
echo.
echo Frontend (in a new terminal):
echo   cd frontend
echo   npm run dev
echo.
echo Then open http://localhost:3000 in your browser
echo.
echo See SETUP.md for detailed instructions
echo.
pause
