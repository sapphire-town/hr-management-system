# HR Management System - Installation Guide

## Quick Installation (Recommended)

### Windows
```cmd
cd C:\Users\Revathi N\hr-management-system
quick-start.bat
```

### Linux/Mac
```bash
cd ~/hr-management-system
chmod +x quick-start.sh
./quick-start.sh
```

The script will:
1. Install backend dependencies
2. Set up environment files
3. Generate Prisma client
4. Run database migrations
5. Install frontend dependencies

---

## Prerequisites

Before installation, ensure you have:

### Required
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))

### Verify Installation
```bash
node --version   # Should be v18 or higher
npm --version    # Should be 8 or higher
psql --version   # Should be 14 or higher
```

---

## Step-by-Step Manual Installation

### 1. Create PostgreSQL Database

```bash
# Open PostgreSQL terminal
psql -U postgres

# Create database and user
CREATE DATABASE hr_management;
CREATE USER hr_admin WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hr_management TO hr_admin;
\q
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# Windows: notepad .env
# Mac/Linux: nano .env
```

**Configure .env:**
```env
DATABASE_URL="postgresql://hr_admin:your_password@localhost:5432/hr_management"
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_EXPIRATION="7d"

EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="HR System <noreply@hrsystem.com>"

FILE_UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=5242880
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
```

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start the backend server
npm run start:dev
```

**Backend should now be running at:** http://localhost:3001

**API Documentation available at:** http://localhost:3001/api/docs

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local
# Windows: notepad .env.local
# Mac/Linux: nano .env.local
```

**Configure .env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

```bash
# Start the frontend server
npm run dev
```

**Frontend should now be running at:** http://localhost:3000

---

## Email Setup (Gmail)

### Enable Gmail for Email Notifications

1. **Enable 2-Step Verification:**
   - Go to https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "HR System"
   - Click "Generate"
   - Copy the 16-character password

3. **Update backend/.env:**
   ```env
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASSWORD="xxxx xxxx xxxx xxxx"  # App password from step 2
   ```

---

## Create First Admin User

You need to create an initial Director user to access the system.

### Method 1: Using Prisma Studio (Easiest)

```bash
cd backend
npx prisma studio
```

1. Browser opens at http://localhost:5555
2. Click on "User" table
3. Click "Add record"
4. Fill in:
   - email: `admin@hrsystem.com`
   - password: Use bcrypt hash (see below)
   - role: `DIRECTOR`
   - isActive: `true`
5. Click "Save 1 change"

**Generate Password Hash:**
```bash
# Generate hash for password "Admin@123"
node -e "console.log(require('bcrypt').hashSync('Admin@123', 10))"
```

### Method 2: Direct SQL

```sql
-- Connect to database
psql -U hr_admin -d hr_management

-- Generate UUID and insert admin user
INSERT INTO users (id, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@hrsystem.com',
  '$2b$10$YourBcryptHashHere',  -- Replace with hash from method 1
  'DIRECTOR',
  true,
  NOW(),
  NOW()
);
```

---

## Verify Installation

### 1. Check Backend
```bash
curl http://localhost:3001/api/docs
```
Should return Swagger documentation page.

### 2. Test Login API
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@hrsystem.com\",\"password\":\"Admin@123\"}"
```
Should return JWT token and user data.

### 3. Check Frontend
1. Open http://localhost:3000
2. You should see the login page
3. Login with:
   - Email: `admin@hrsystem.com`
   - Password: `Admin@123`
4. Should redirect to dashboard

---

## Development Commands

### Backend
```bash
cd backend

# Start development server (hot reload)
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test

# View database in browser
npx prisma studio

# Create new migration
npx prisma migrate dev --name description

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

### Frontend
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

---

## Troubleshooting

### Port Already in Use

**Error:** `Port 3000/3001 is already in use`

**Solution:**
```bash
# Windows - Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux - Kill process on port 3001
lsof -i :3001
kill -9 <PID>
```

### Database Connection Failed

**Error:** `Can't reach database server at localhost:5432`

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Look for PostgreSQL service

   # Mac
   brew services list

   # Linux
   sudo systemctl status postgresql
   ```

2. Check DATABASE_URL in backend/.env
3. Verify database credentials

### Prisma Migration Failed

**Error:** `Migration failed to apply`

**Solution:**
```bash
cd backend

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or create new migration
npx prisma migrate dev
```

### Email Not Sending

**Solutions:**
1. Verify Gmail App Password is correct (not your regular password)
2. Ensure 2-Step Verification is enabled
3. Check EMAIL_* variables in backend/.env
4. Check spam folder

### Module Not Found

**Error:** `Cannot find module '@/...'`

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## What's Next?

After successful installation:

1. **Explore the API**
   - Visit http://localhost:3001/api/docs
   - Try different endpoints

2. **Review the Database**
   - Run `npx prisma studio`
   - Explore the tables and relationships

3. **Continue Development**
   - See [PROJECT_STATUS.md](PROJECT_STATUS.md) for implementation status
   - See [SETUP.md](SETUP.md) for detailed configuration
   - Check remaining modules to implement

4. **Create Initial Data**
   - Create roles
   - Add employees
   - Set up organizational structure

---

## Production Deployment

### Before Deploying

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure proper CORS
- [ ] Set up database backups
- [ ] Configure error monitoring
- [ ] Review security settings

### Deployment Platforms

**Backend (NestJS):**
- Heroku
- AWS (EC2, ECS, Elastic Beanstalk)
- DigitalOcean
- Railway
- Render

**Frontend (Next.js):**
- Vercel (recommended)
- Netlify
- AWS Amplify
- Cloudflare Pages

**Database:**
- AWS RDS PostgreSQL
- Heroku Postgres
- DigitalOcean Managed Database
- Supabase

---

## Support

For issues during installation:

1. Check this guide carefully
2. Review [SETUP.md](SETUP.md)
3. Check [PROJECT_STATUS.md](PROJECT_STATUS.md)
4. Verify all prerequisites are installed
5. Check error messages carefully

---

## System Requirements

### Minimum
- RAM: 4GB
- Disk Space: 2GB
- Node.js: v18
- PostgreSQL: v14

### Recommended
- RAM: 8GB+
- Disk Space: 10GB+
- Node.js: v20+
- PostgreSQL: v15+

---

**Installation should take 10-15 minutes with quick-start script.**

**For manual installation, allow 20-30 minutes.**

---

Version: 1.0
Last Updated: January 22, 2026
