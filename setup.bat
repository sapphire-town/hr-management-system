@echo off
echo ==========================================
echo   HR Management System - Quick Setup
echo ==========================================
echo.

:: Check if PostgreSQL password is provided
set /p PG_PASSWORD="Enter your PostgreSQL password: "

if "%PG_PASSWORD%"=="" (
    echo ERROR: PostgreSQL password is required!
    pause
    exit /b 1
)

set /p PG_USER="Enter PostgreSQL username (press Enter for 'postgres'): "
if "%PG_USER%"=="" set PG_USER=postgres

set /p PG_PORT="Enter PostgreSQL port (press Enter for '5432'): "
if "%PG_PORT%"=="" set PG_PORT=5432

echo.
echo [1/6] Creating backend .env file...

(
echo DATABASE_URL="postgresql://%PG_USER%:%PG_PASSWORD%@localhost:%PG_PORT%/hr_management"
echo.
echo JWT_SECRET="make-this-at-least-32-characters-long"
echo JWT_EXPIRATION="7d"
echo.
echo EMAIL_HOST="smtp.gmail.com"
echo EMAIL_PORT=587
echo EMAIL_SECURE=false
echo EMAIL_USER="revathinandish6113@gmail.com"
echo EMAIL_PASSWORD="nmec yhul rgyi joqf"
echo EMAIL_FROM="HR System <revathinandish6113@gmail.com>"
echo.
echo FILE_UPLOAD_PATH="./uploads"
echo MAX_FILE_SIZE=5242880
echo.
echo PORT=3001
echo NODE_ENV=development
echo FRONTEND_URL="http://localhost:3000"
) > backend\.env

echo    Backend .env created!

echo.
echo [2/6] Creating frontend .env file...

(
echo NEXT_PUBLIC_API_URL=http://localhost:3001/api
) > frontend\.env

echo    Frontend .env created!

echo.
echo [3/6] Creating database 'hr_management'...
set PGPASSWORD=%PG_PASSWORD%
psql -U %PG_USER% -p %PG_PORT% -c "CREATE DATABASE hr_management;" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo    Database may already exist - continuing...
) else (
    echo    Database created!
)

echo.
echo [4/6] Installing backend dependencies...
cd backend
call npm install
echo    Backend dependencies installed!

echo.
echo [5/6] Generating Prisma client and applying migrations...
call npx prisma generate
call npx prisma migrate deploy
echo    Database schema ready!

echo.
echo [6/6] Installing frontend dependencies...
cd ..\frontend
call npm install
echo    Frontend dependencies installed!

cd ..

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo   To start the application:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     npm run start:dev
echo.
echo   Terminal 2 (Frontend):
echo     cd frontend
echo     npm run dev
echo.
echo   Then open http://localhost:3000
echo ==========================================
pause
