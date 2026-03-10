# HR Management & Performance Tracking System

A comprehensive workforce management platform designed to streamline HR operations, employee performance tracking, and organizational workflows.

## Features

- **Role & Organization Management**: Create roles, define reporting parameters, and manage organizational structure
- **Employee Management**: Add, promote, and manage employees with complete profile management
- **Performance Management**: Daily reporting, performance dashboards, and target tracking
- **Leave Management**: Apply, approve, and track leaves with automatic balance calculation
- **Attendance Management**: Mark attendance, handle holidays, and integrate with payroll
- **Document Management**: Upload, verify, and release official documents
- **Recruitment**: Manage placement drives and candidate evaluations
- **Asset Management**: Request, approve, and track company assets
- **Reimbursement**: Submit and approve expense reimbursements
- **Payroll**: Automated payslip generation with deductions and additions
- **Resignation Management**: Handle resignation workflow and exit process
- **Rewards & Recognition**: Award badges and monetary rewards
- **Team Performance**: Track team metrics and iteration rates
- **Feedback & Tickets**: Confidential feedback and issue tracking system

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **UI Components**: shadcn/ui
- **HTTP Client**: Axios
- **Charts**: Recharts
- **PDF**: jsPDF
- **Excel**: SheetJS (xlsx)

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (Passport)
- **Validation**: class-validator
- **Email**: Nodemailer
- **File Upload**: Multer
- **PDF Generation**: PDFKit
- **Scheduling**: @nestjs/schedule

## Project Structure

```
hr-management-system/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── employee/       # Employee management
│   │   ├── role/           # Role management
│   │   ├── performance/    # Performance tracking
│   │   ├── leave/          # Leave management
│   │   ├── attendance/     # Attendance tracking
│   │   ├── document/       # Document management
│   │   ├── recruitment/    # Placement drives
│   │   ├── asset/          # Asset management
│   │   ├── reimbursement/  # Reimbursement workflow
│   │   ├── payroll/        # Payroll & payslips
│   │   ├── resignation/    # Resignation process
│   │   ├── reward/         # Rewards & badges
│   │   ├── ticket/         # Ticket system
│   │   ├── feedback/       # Feedback mechanism
│   │   ├── notification/   # Email notifications
│   │   └── common/         # Shared utilities
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utilities & API clients
│   │   ├── store/         # State management
│   │   └── types/         # TypeScript types
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Git

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start development server
npm run start:dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API URL

# Start development server
npm run dev
```

### Production Deployment

#### Backend
```bash
cd backend
npm run build
npm run start:prod
```

#### Frontend
```bash
cd frontend
npm run build
npm run start
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/hr_system"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="7d"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
FILE_UPLOAD_PATH="./uploads"
PORT=3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

## User Roles & Permissions

1. **Director**: Full system access, role creation, access control
2. **HR Head**: Administrative access, HR operations, compliance
3. **Manager**: Team management, approvals, performance monitoring
4. **Employee**: Self-service portal, personal data management
5. **Interviewer**: Candidate evaluation during placement drives

## Key Workflows

### Employee Onboarding
1. HR adds employee → System sends welcome email
2. Employee sets password and completes profile
3. Employee uploads documents → HR verifies
4. HR releases offer letter and documents
5. Employee starts daily reporting

### Leave Application
1. Employee applies → Manager approves → HR approves
2. Approved leave marked on attendance calendar
3. Leave balance updated automatically

### Performance Review
1. Employee submits daily reports
2. Manager verifies and comments
3. Performance aggregates automatically
4. Manager nominates for Director's list
5. Director reviews and selects

### Resignation Process
1. Employee submits resignation
2. Manager approves → HR approves
3. Asset handover on last day
4. Account deactivated automatically
5. After 45 days, HR sends no-due clearance

## API Documentation

API documentation is available at `http://localhost:3001/api/docs` when running in development mode.

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Data encryption (TLS 1.3 in transit, AES-256 at rest)
- Password hashing with bcrypt
- Session timeout (30 minutes)
- Audit logging for sensitive operations
- Input validation and sanitization

## Performance Targets

- Page load time: < 2 seconds
- Dashboard refresh: < 3 seconds
- Report generation: < 5 seconds
- System uptime: 99.5%
- Support for 10,000+ concurrent users

## Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests
cd frontend
npm run test
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## Support

For issues and questions, please create an issue in the repository.

## License

Proprietary - All rights reserved

## Version

Version: 1.0.0
Last Updated: January 2026
