# HR Management System - Complete Setup Guide

This guide will walk you through setting up the complete HR Management & Performance Tracking System.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **npm** or **yarn** package manager

## Quick Start (Automated Setup)

### Windows

1. Open PowerShell as Administrator
2. Navigate to the project directory:
   ```powershell
   cd C:\Users\Revathi N\hr-management-system
   ```
3. Run the setup script:
   ```powershell
   .\setup.ps1
   ```

### Linux/Mac

1. Open Terminal
2. Navigate to the project directory:
   ```bash
   cd ~/hr-management-system
   ```
3. Make the script executable and run it:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

## Manual Setup

If you prefer to set up manually or the automated script doesn't work, follow these steps:

### Step 1: Database Setup

1. **Create PostgreSQL Database:**

   ```sql
   -- Open PostgreSQL terminal (psql)
   CREATE DATABASE hr_management;
   CREATE USER hr_admin WITH ENCRYPTED PASSWORD 'your_password_here';
   GRANT ALL PRIVILEGES ON DATABASE hr_management TO hr_admin;
   ```

2. **Verify Connection:**
   ```bash
   psql -U hr_admin -d hr_management
   ```

### Step 2: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env file with your configuration
   # For Windows: notepad .env
   # For Linux/Mac: nano .env
   ```

4. **Update .env file with your credentials:**
   ```env
   DATABASE_URL="postgresql://hr_admin:your_password_here@localhost:5432/hr_management"
   JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long"
   JWT_EXPIRATION="7d"

   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="your-app-specific-password"
   EMAIL_FROM="HR System <noreply@hrsystem.com>"

   FILE_UPLOAD_PATH="./uploads"
   MAX_FILE_SIZE=5242880

   PORT=3001
   NODE_ENV=development

   FRONTEND_URL="http://localhost:3000"

   DEFAULT_WORKING_DAYS_PER_MONTH=22
   EARNED_LEAVE_ACCRUAL_DAYS=20
   PASSWORD_RESET_EXPIRATION="24h"
   ```

5. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

6. **Run database migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

7. **Seed the database (optional):**
   ```bash
   npm run prisma:seed
   ```

8. **Start the backend server:**
   ```bash
   # Development mode
   npm run start:dev

   # Production mode
   npm run build
   npm run start:prod
   ```

9. **Verify backend is running:**
   - Open browser: http://localhost:3001/api/docs
   - You should see the Swagger API documentation

### Step 3: Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

4. **Update .env.local:**
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3001/api"
   ```

5. **Start the frontend development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Open browser: http://localhost:3000
   - You should see the login page

## Gmail Setup for Email Notifications

To enable email notifications:

1. **Enable 2-Step Verification on your Google Account:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "HR System" as the name
   - Click "Generate"
   - Copy the 16-character password

3. **Update .env file:**
   ```env
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="your-16-char-app-password"
   ```

## Creating the First Admin User

After setup, you need to create an initial Director user:

### Option 1: Using Prisma Studio

```bash
cd backend
npx prisma studio
```

1. Open the `User` table
2. Click "Add record"
3. Fill in the details:
   - email: "admin@hrsystem.com"
   - password: (generate a bcrypt hash - see below)
   - role: "DIRECTOR"
   - isActive: true

To generate a bcrypt hash for password "Admin@123":
```bash
node -e "console.log(require('bcrypt').hashSync('Admin@123', 10))"
```

### Option 2: Direct SQL

```sql
-- Connect to database
psql -U hr_admin -d hr_management

-- Insert admin user (password: Admin@123)
INSERT INTO users (id, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@hrsystem.com',
  '$2b$10$YourBcryptHashHere',
  'DIRECTOR',
  true,
  NOW(),
  NOW()
);
```

## Testing the Setup

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3001/api/docs
   ```

2. **Login Test:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@hrsystem.com","password":"Admin@123"}'
   ```

3. **Frontend Access:**
   - Open http://localhost:3000
   - Login with admin credentials
   - Verify dashboard loads

## Production Deployment

### Backend Deployment

1. **Build the application:**
   ```bash
   cd backend
   npm run build
   ```

2. **Set environment to production:**
   ```env
   NODE_ENV=production
   ```

3. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Start the server:**
   ```bash
   npm run start:prod
   ```

### Frontend Deployment

1. **Build the application:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm run start
   ```

### Deployment Platforms

**Backend:**
- Heroku
- AWS (EC2, Elastic Beanstalk, ECS)
- DigitalOcean App Platform
- Railway
- Render

**Frontend:**
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Cloudflare Pages

**Database:**
- AWS RDS PostgreSQL
- Heroku Postgres
- DigitalOcean Managed Database
- Supabase
- Neon

## Common Issues and Solutions

### Issue: Cannot connect to database

**Solution:**
1. Verify PostgreSQL is running:
   ```bash
   # Windows
   services.msc
   # Look for PostgreSQL service

   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. Check DATABASE_URL in .env
3. Verify firewall allows port 5432

### Issue: Prisma migration fails

**Solution:**
```bash
# Reset the database (WARNING: Deletes all data)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev --create-only
npx prisma migrate dev
```

### Issue: Email notifications not working

**Solution:**
1. Verify Gmail App Password is correct
2. Check EMAIL_* variables in .env
3. Ensure 2-Step Verification is enabled
4. Check spam folder

### Issue: Port already in use

**Solution:**
```bash
# Find process using port 3001 (backend)
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### Issue: CORS errors

**Solution:**
- Verify FRONTEND_URL in backend .env matches your frontend URL
- Check NEXT_PUBLIC_API_URL in frontend .env.local

## Development Tools

### Useful Commands

**Backend:**
```bash
# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Create new migration
npx prisma migrate dev --name description

# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm run test
npm run test:e2e
npm run test:cov
```

**Frontend:**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

### Prisma Studio

Access the database GUI:
```bash
cd backend
npx prisma studio
```
Opens at: http://localhost:5555

### API Documentation

Access Swagger documentation:
- Development: http://localhost:3001/api/docs
- Test API endpoints directly from the browser

## System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Next.js        │────────▶│   NestJS API     │────────▶│   PostgreSQL    │
│  Frontend       │  HTTP   │   Backend        │  Prisma │   Database      │
│                 │◀────────│                  │◀────────│                 │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
      Port 3000                   Port 3001                   Port 5432

                            ┌──────────────────┐
                            │                  │
                            │  Email Service   │
                            │  (SMTP/Gmail)    │
                            │                  │
                            └──────────────────┘
```

## Support and Documentation

- **API Documentation:** http://localhost:3001/api/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs
- **NestJS Docs:** https://docs.nestjs.com

## Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS/TLS
- [ ] Set NODE_ENV=production
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Review and restrict CORS settings
- [ ] Enable rate limiting
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure environment-specific variables
- [ ] Secure file upload directory
- [ ] Enable audit logging

## Next Steps

1. Create initial roles using the Director account
2. Add employees through the employee management interface
3. Configure leave policies and holidays
4. Set up payroll parameters
5. Create document templates
6. Configure organizational structure
7. Train HR staff and managers
8. Roll out to employees

## License

Proprietary - All rights reserved

## Version

Version: 1.0.0
Setup Guide Version: 1.0
Last Updated: January 2026
