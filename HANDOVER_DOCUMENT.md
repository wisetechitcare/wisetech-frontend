# WiseTech Platform - Technical Handover Document

**Version:** 1.0  
**Last Updated:** January 2026  
**Document Type:** Technical Handover & Onboarding Guide

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Getting Started (New Developer Onboarding)](#2-getting-started-new-developer-onboarding)
3. [Architecture Overview](#3-architecture-overview)
4. [Backend Reference](#4-backend-reference)
5. [Frontend Reference](#5-frontend-reference)
6. [Infrastructure & DevOps](#6-infrastructure--devops)
7. [Configuration Reference](#7-configuration-reference)
8. [Operational Guide](#8-operational-guide)
9. [Troubleshooting](#9-troubleshooting)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### 1.1 Project Overview

WiseTech is a comprehensive HR Management and Project Tracking platform designed for organizations to manage their workforce, attendance, payroll, leads, projects, and tasks. The system provides both administrative and employee-facing interfaces.

### 1.2 Business Domains

| Domain | Description |
|--------|-------------|
| **HR Management** | Employee profiles, roles, levels, designations, departments, branches |
| **Attendance Tracking** | Check-in/out, working methods, attendance requests, day-wise shifts |
| **Leave Management** | Leave requests, approvals, leave balance, leave types |
| **Payroll** | Salary calculations, gross pay, deductions, salary slips, loan management |
| **Leads & Projects** | Lead tracking, project management, client companies, contacts |
| **Time & Task Tracking** | Timesheets, task assignments, KPIs |
| **Calendar & Events** | Public holidays, company events, announcements |
| **User Management** | Authentication, authorization, roles, permissions |

### 1.3 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript, Redux Toolkit, React Query, Metronic Theme |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM |
| **Database** | MySQL |
| **Caching/Queue** | Redis, BullMQ |
| **Realtime** | Socket.IO |
| **Storage** | AWS S3 |
| **Email** | Nodemailer, Resend |
| **Hosting** | AWS EC2 (Backend), AWS Amplify (Frontend) |

### 1.4 Architecture Diagram

```
+------------------+        +---------------------------+
|   User Browser   |<------>|  Socket.IO (Realtime)     |
+--------+---------+        +-------------+-------------+
         |                               ^
         v                               |
+------------------+        +-------------+-------------+
| Frontend (React) |------->|  API Server (Express)     |
| AWS Amplify      |  REST  |  EC2 + Prisma             |
+------------------+        +------+--------------------+
                                   |        \
                                   |         \
                                   v          v
                          +----------------+  +--------------------+
                          | MySQL Database |  | Redis (BullMQ)      |
                          | Prisma ORM     |  | Email Queue         |
                          +----------------+  +----------+----------+
                                                          |
                                                          v
                                                +--------------------+
                                                | Email Worker       |
                                                | (BullMQ Consumer)  |
                                                +---------+----------+
                                                          |
                                                          v
                                                +--------------------+
                                                | Email Provider     |
                                                | SMTP/Resend        |
                                                +--------------------+
```

---

## 2. Getting Started (New Developer Onboarding)

### 2.1 Prerequisites

Ensure the following are installed on your development machine:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 21.x (see `.nvmrc`) | Runtime |
| npm | Latest | Package management |
| MySQL | 8.x | Database |
| Redis | 6.x+ | Queue & caching |
| Git | Latest | Version control |
| AWS CLI | v2 | AWS operations (optional) |

### 2.2 Repository Setup

```bash
# Clone the repositories
git clone <repository-url>/wisetech-backend
git clone <repository-url>/wise-tech-frontend

# Navigate to backend
cd wisetech-backend

# Navigate to frontend (in separate terminal)
cd wise-tech-frontend
```

### 2.3 Environment Variables Reference

#### Backend (`wisetech-backend/.env` or `config.env`)

```env
# Server
NODE_ENV=development
LOCAL_HOST=0.0.0.0
LOCAL_PORT=9000

# Database
DATABASE_URL=mysql://user:password@localhost:3306/wisetech

# AWS S3
AWS_S3_BUCKET=your-bucket-name
AWS_S3_BUCKET_REGION=ap-south-1
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key

# Email
RESEND_API_KEY=your-resend-api-key

# Frontend URL (for CORS)
FRONTEND_BASE_URI=http://localhost:5173

# Google Maps (for location features)
GOOGLE_GEOCODE_API=https://maps.googleapis.com
GOOGLE_MAP_KEY=your-google-maps-key
```

#### Frontend (`wise-tech-frontend/.env`)

```env
VITE_APP_WISE_TECH_BACKEND=http://localhost:9000/api
```

### 2.4 Local Development Quickstart

#### Backend Setup

```bash
cd wisetech-backend

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run database migrations (if needed)
npx prisma migrate dev

# Start development server
npm run start:dev
```

The backend will be available at `http://localhost:9000`

#### Frontend Setup

```bash
cd wise-tech-frontend

# Install dependencies
npm ci

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 2.5 First-Run Checklist

- [ ] MySQL server running locally
- [ ] Redis server running locally
- [ ] Backend `.env` file configured
- [ ] Frontend `.env` file configured
- [ ] Prisma migrations applied
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can access frontend in browser
- [ ] Can login (create test user if needed)

---

## 3. Architecture Overview

### 3.1 System Flow Diagram

```
+--------------------+
| API Server (EC2)   |
| - utils/cron.ts    |
+---------+----------+
          |
          v
+---------------------------+
| Scheduled Jobs (node-cron)|
| - Manager leave emails    |
| - Loan installment deduct |
| - Attendance limit reset  |
| - Salary history updates  |
+---------+-----------------+
          |
          v
+---------------------------+
| Database (MySQL/Prisma)   |
+---------------------------+
          |
          v
+---------------------------+
| Redis (BullMQ Queue)      |
| - enqueue email jobs      |
+---------+-----------------+
          |
          v
+---------------------------+
| Email Worker (EC2)        |
+---------+-----------------+
          |
          v
+---------------------------+
| Email Provider (Resend)   |
+---------------------------+
```

### 3.2 Backend Architecture

#### Directory Structure

```
wisetech-backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── constants/             # API endpoints, HTTP codes
│   ├── db/                    # Repository layer (Prisma queries)
│   ├── email-templates/       # HTML email templates
│   ├── handlers/              # Route handlers (controllers)
│   ├── keys/                  # JWT keys (public/private)
│   ├── middlewares/           # Express middlewares
│   ├── models/                # TypeScript interfaces
│   ├── queues/                # BullMQ queue definitions
│   ├── routes/                # Express route definitions
│   ├── schemas/               # Yup validation schemas
│   ├── utils/                 # Utility functions
│   ├── workers/               # BullMQ workers
│   └── server.ts              # Express app setup
├── index.ts                   # Entry point
├── config.env                 # Environment variables
└── package.json
```

#### Layered Architecture

```
Request → Route → Middleware → Handler → Repository → Prisma → MySQL
                     ↓
              Validation (Yup)
                     ↓
              Auth (JWT check)
```

#### Key Middlewares

| Middleware | File | Purpose |
|------------|------|---------|
| `protect` | `middlewares/protect.ts` | JWT authentication |
| `checkBlacklistToken` | `middlewares/token.ts` | Token blacklist check |
| `validator` | `middlewares/validation.ts` | Yup schema validation |
| `paginationMiddleware` | `middlewares/pagination.ts` | Pagination handling |
| `multer` | `middlewares/multer.ts` | File upload handling |

### 3.3 Frontend Architecture

#### Directory Structure

```
wise-tech-frontend/
├── public/                    # Static assets
├── src/
│   ├── _metronic/             # Metronic theme components
│   ├── app/
│   │   ├── modules/           # Feature modules (auth, accounts, etc.)
│   │   ├── pages/             # Page components
│   │   └── routing/           # Route definitions
│   ├── hooks/                 # Custom React hooks
│   ├── keys/                  # JWT keys
│   ├── models/                # TypeScript interfaces
│   ├── redux/
│   │   ├── slices/            # Redux slices
│   │   └── store.ts           # Redux store config
│   ├── services/              # API service functions
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utility functions
│   ├── main.tsx               # App entry point
│   └── main.css               # Global styles
├── index.html
└── vite.config.ts
```

#### State Management

Redux slices handle global state:

| Slice | Purpose |
|-------|---------|
| `auth` | User authentication state |
| `employee` | Current employee data |
| `company` | Company information |
| `attendance` | Attendance records |
| `leaves` | Leave data |
| `loans` | Loan information |
| `rolesAndPermissions` | RBAC data |
| `appSettings` | Application settings |
| `featureConfiguration` | Feature toggles |
| `allEmployees` | Employee list |
| `timer` | Time tracking |
| `salaryData` | Salary information |

### 3.4 Realtime & Background Jobs

#### Socket.IO (Realtime Notifications)

- Initialized in `src/utils/socket.ts`
- Employees join rooms by `employeeId`
- Used for pushing in-app notifications
- Connection state stored in Redis

#### BullMQ (Email Queue)

- Queue defined in `src/queues/emailQueue.ts`
- Worker in `src/workers/emailWorker.ts`
- Supports retry with exponential backoff
- Batch notification on completion/failure

#### Cron Jobs

Defined in `src/utils/cron.ts`:

| Job | Schedule | Description |
|-----|----------|-------------|
| `managerLeave` | Daily (configurable) | Email managers about employees on leave |
| `deductSalaryFromLoanAtTheEndOfEachMonth` | 1st of month | Process loan installments |
| `resetAttendanceRequestLimits` | 1st of month | Reset attendance request limits |
| `updateEmployeeSalariesFromHistory` | 1st of month | Apply scheduled salary changes |

---

## 4. Backend Reference

### 4.1 API Endpoints by Module

#### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | User login |
| POST | `/logout` | User logout |
| POST | `/forgotPassword` | Request password reset |
| POST | `/resetPassword/:resetToken` | Reset password |
| POST | `/changePassword` | Change password |

#### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:userId` | Get user by ID |
| POST | `/` | Create user |
| PUT | `/:userId` | Update user |
| DELETE | `/:userId` | Archive user |
| GET | `/` | Get all users |

#### Employees (`/api/employee`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create employee |
| GET | `/` | Get employee by ID (query param) |
| PUT | `/` | Update employee |
| GET | `/all` | Get all employees |
| POST | `/attendance` | Mark attendance |
| GET | `/attendance` | Get attendance |
| PUT | `/attendance` | Update checkout |
| POST | `/leave-request` | Create leave request |
| GET | `/leave-request` | Get leave requests |
| PUT | `/leave-action` | Approve/reject leave |
| POST | `/loan` | Create loan |
| GET | `/loans` | Get all loans |
| POST | `/todo` | Create todo |
| GET | `/todo` | Get todos |
| POST | `/notification` | Create notification |
| GET | `/notification` | Get notifications |

#### Company (`/api/company`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/overview` | Get company overview |
| PUT | `/overview` | Update company overview |
| POST | `/branches` | Create branch |
| GET | `/branches` | Get all branches |
| POST | `/departments` | Create department |
| GET | `/departments` | Get all departments |
| POST | `/designations` | Create designation |
| GET | `/designations` | Get all designations |
| POST | `/public-holidays` | Create public holiday |
| GET | `/public-holidays` | Get public holidays |
| GET | `/salary` | Get salaries |
| POST | `/salary` | Create salary record |
| POST | `/gross-pay-deductions` | Create deductions |
| GET | `/announcements` | Get announcements |

#### Lead Project Companies (`/api/lead-project-companies`)

Handles leads, projects, client companies, and contacts.

#### Time & Task (`/api/task-and-time`)

Handles tasks, timesheets, and time tracking.

#### Roles (`/api/roles`)

Handles role and permission management.

#### Files (`/api/files`)

Handles file uploads to S3.

### 4.2 Database Schema Overview

Key Prisma models:

| Model | Description |
|-------|-------------|
| `Users` | Base user accounts |
| `Employees` | Employee profiles (linked to Users) |
| `CompanyOverview` | Company information |
| `Branches` | Company branches/locations |
| `Departments` | Company departments |
| `Designations` | Job titles/designations |
| `Attendance` | Attendance records |
| `LeaveTracker` | Leave requests |
| `LeaveOptions` | Leave types |
| `Salaries` | Salary payments |
| `GrossPayDeductions` | Salary deductions |
| `Loans` | Employee loans |
| `LoanInstallments` | Loan payment schedule |
| `Lead` | Sales leads |
| `Project` | Projects |
| `ProjectTask` | Tasks |
| `Timesheet` | Time entries |
| `Role` | RBAC roles |
| `RolePermission` | Role permissions |
| `UserPermission` | User-specific permissions |
| `Notification` | In-app notifications |

### 4.3 Repository Layer

Located in `src/db/*Repository.ts`:

| Repository | Purpose |
|------------|---------|
| `UsersRepository` | User CRUD |
| `EmployeesRepository` | Employee CRUD |
| `AttendanceRepository` | Attendance operations |
| `LeaveTrackerRepository` | Leave management |
| `CompanyOverviewRepository` | Company data |
| `BranchesRepository` | Branch operations |
| `SalariesRepository` | Salary records |
| `LoansRepository` | Loan management |
| `LeadRepository` | Lead operations |
| `ProjectRepository` | Project operations |

### 4.4 Authentication & Authorization Flow

```
1. User submits credentials to /api/auth/login
2. Server validates against Users table (bcrypt hash)
3. Server generates JWT token (private key in src/keys/)
4. Client stores token in localStorage
5. Client sends token in Authorization header
6. protect middleware validates token
7. checkBlacklistToken checks if token is revoked
8. Handler accesses req.currentUser
9. RBAC checked via roles/permissions
```

---

## 5. Frontend Reference

### 5.1 Routing & Navigation

Main routes defined in `src/app/routing/PrivateRoutes.tsx`:

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `DashboardWrapper` | Main dashboard |
| `/employees` | `EmployeesList` | Employee list |
| `/employees/:employeeId` | `ShowEmployeeDetailsToggle` | Employee details |
| `/employee/attendance-and-leaves` | `PersonalAttendanceView` | Personal attendance |
| `/employees/attendance-and-leaves` | `EmployeesAttendanceView` | All employees attendance |
| `/finance/salary` | `Salary` | Salary management |
| `/finance/loans` | `PersonalLoanMain` | Loan management |
| `/qc/leads` | `LeadsMain` | Lead management |
| `/qc/projects` | `ProjectsMain` | Project management |
| `/qc/companies` | `CompaniesMain` | Client companies |
| `/tasks` | `TasksMain` | Task management |
| `/tasks/timesheet` | `MyTimeSheetMain` | Personal timesheet |
| `/company/branches` | `Branches` | Branch management |
| `/company/departments` | `Departments` | Department management |
| `/company/public-holiday` | `PublicHoliday` | Holiday calendar |
| `/company/announcements` | `Announcements` | Announcements |

### 5.2 API Services

Located in `src/services/`:

| Service | Purpose |
|---------|---------|
| `auth.ts` | Authentication API calls |
| `users.ts` | User API calls |
| `employee.ts` | Employee API calls |
| `company.ts` | Company API calls |
| `configurations.ts` | Configuration API calls |
| `leads.ts` | Lead API calls |
| `projects.ts` | Project API calls |
| `tasks.ts` | Task API calls |
| `calendar.ts` | Calendar API calls |
| `uploader.ts` | File upload API calls |
| `roles.ts` | Role/permission API calls |

### 5.3 Key Utilities

| Utility | Purpose |
|---------|---------|
| `authAbac.ts` | Permission checking (`hasPermission`) |
| `date.ts` | Date formatting/manipulation |
| `token.ts` | JWT token handling |
| `localStorage.ts` | LocalStorage helpers |
| `attendanceValidation.ts` | Attendance validation logic |
| `salaryCalculations.ts` | Salary calculation helpers |
| `statistics.ts` | Statistics calculations |

### 5.4 Theming & Styling

- SCSS files in `src/_metronic/assets/sass/`
- Component-level styles in feature folders
- MUI components for advanced UI elements

---

## 6. Infrastructure & DevOps

### 6.1 Environments

| Environment | Backend | Frontend | Database |
|-------------|---------|----------|----------|
| Development | localhost:9000 | localhost:5173 | Local MySQL |
| Production | AWS EC2 | AWS Amplify | AWS RDS (MySQL) |

### 6.2 AWS Services Used

| Service | Purpose |
|---------|---------|
| **EC2** | Backend API server, Email worker |
| **Amplify** | Frontend hosting with CI/CD |
| **S3** | File storage (documents, avatars) |
| **RDS** | MySQL database (production) |

### 6.3 CI/CD Pipelines

#### Backend Deployment (GitHub Actions)

File: `.github/workflows/github.yml`

```yaml
name: Backend CI/CD (GitHub Hosted)

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/wisetech-backend
            ./deploy.sh
```

#### Backend Deploy Script (`deploy.sh`)

The deploy script on EC2 typically includes:

```bash
#!/bin/bash
cd /home/ubuntu/wisetech-backend
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart wisetech-backend
```

#### Frontend Deployment

AWS Amplify auto-deploys on push to main branch.

### 6.4 SSH Access & Server Management

```bash
# SSH into EC2
ssh -i "wisetech_key.pem" ubuntu@ec2-35-154-46-187.ap-south-1.compute.amazonaws.com

# Navigate to backend
cd /home/ubuntu/wisetech-backend

# View PM2 processes
pm2 list

# View logs
pm2 logs wisetech-backend

# Restart backend
pm2 restart wisetech-backend
```

### 6.5 Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name <MIGRATION_NAME>

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```

---

## 7. Configuration Reference

### 7.1 Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development`, `production` |
| `LOCAL_HOST` | Server host | `0.0.0.0` |
| `LOCAL_PORT` | Server port | `9000` |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |
| `AWS_S3_BUCKET` | S3 bucket name | `wise-tech-asset-store-2` |
| `AWS_S3_BUCKET_REGION` | S3 region | `ap-south-1` |
| `AWS_ACCESS_KEY` | AWS access key | `AKIA...` |
| `AWS_SECRET_KEY` | AWS secret key | `...` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |
| `FRONTEND_BASE_URI` | Frontend URL (CORS) | `https://...amplifyapp.com` |
| `GOOGLE_MAP_KEY` | Google Maps API key | `AIza...` |

### 7.2 Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_WISE_TECH_BACKEND` | Backend API URL | `http://localhost:9000/api` |

### 7.3 GitHub Secrets (for CI/CD)

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | EC2 public IP/hostname |
| `EC2_USER` | SSH username (`ubuntu`) |
| `EC2_SSH_KEY` | Private SSH key (PEM) |

---

## 8. Operational Guide

### 8.1 Starting/Stopping Services

#### Development

```bash
# Backend
cd wisetech-backend
npm run start:dev    # Start with nodemon

# Frontend
cd wise-tech-frontend
npm run dev          # Start Vite dev server
```

#### Production (EC2)

```bash
# List all PM2 processes
pm2 list

# Start backend
pm2 start dist/index.js --name wisetech-backend

# Restart backend
pm2 restart wisetech-backend

# Stop backend
pm2 stop wisetech-backend

# Delete from PM2
pm2 delete wisetech-backend
```

### 8.2 Monitoring Logs

```bash
# PM2 logs (all)
pm2 logs

# Specific app logs
pm2 logs wisetech-backend

# Follow logs
pm2 logs wisetech-backend --lines 100

# Clear logs
pm2 flush
```

### 8.3 Database Access

```bash
# MySQL CLI
mysql -u username -p database_name

# Prisma Studio (development)
npx prisma studio
```

### 8.4 Queue Monitoring

BullMQ does not have a built-in dashboard. Options:

- Use `bull-board` or `arena` for web UI
- Check Redis directly:

```bash
redis-cli
KEYS bull:*
LRANGE bull:email-queue:wait 0 -1
```

### 8.5 Common Commands Cheatsheet

```bash
# Backend
npm ci                          # Install dependencies
npm run build                   # Build for production
npm run start:dev               # Development mode
npx prisma generate             # Generate Prisma client
npx prisma migrate dev          # Run migrations (dev)
npx prisma migrate deploy       # Run migrations (prod)
npx prisma studio               # Database GUI

# Frontend
npm ci                          # Install dependencies
npm run dev                     # Development server
npm run build                   # Production build
npm run preview                 # Preview production build

# PM2 (Production)
pm2 list                        # List processes
pm2 logs                        # View logs
pm2 restart all                 # Restart all
pm2 save                        # Save process list
pm2 startup                     # Generate startup script
```

---

## 9. Troubleshooting

### 9.1 Common Issues & Fixes

#### Issue: Backend fails to start

**Symptoms:** `Error: Cannot find module...`

**Fix:**
```bash
rm -rf node_modules
npm ci
npx prisma generate
```

#### Issue: Prisma client not found

**Symptoms:** `PrismaClientInitializationError`

**Fix:**
```bash
npx prisma generate
```

#### Issue: Database connection failed

**Symptoms:** `P1001: Can't reach database server`

**Fix:**
- Check MySQL is running
- Verify `DATABASE_URL` in `.env`
- Check firewall rules

### 9.2 Auth/Token Problems

#### Issue: "You are not logged in"

**Cause:** Token missing or expired

**Fix:**
- Clear localStorage
- Re-login
- Check token expiration in frontend

#### Issue: Token blacklisted

**Cause:** Token was logged out

**Fix:**
- Clear localStorage
- Re-login

### 9.3 Email Delivery Issues

#### Issue: Emails not sending

**Check:**
1. Redis is running
2. Email worker is running
3. `RESEND_API_KEY` is valid
4. Check worker logs: `pm2 logs email-worker`

#### Issue: Queue backed up

**Check:**
```bash
redis-cli
LLEN bull:email-queue:wait
```

### 9.4 Deployment Failures

#### Issue: GitHub Actions fails

**Check:**
1. SSH key is valid
2. EC2 is running
3. Correct secrets in GitHub

#### Issue: PM2 process not starting

**Fix:**
```bash
pm2 delete wisetech-backend
cd /home/ubuntu/wisetech-backend
npm run build
pm2 start dist/index.js --name wisetech-backend
pm2 save
```

### 9.5 Database Connection Errors

#### Issue: Too many connections

**Fix:**
- Check connection pool settings
- Restart backend to release connections
- Check for connection leaks

---

## 10. Appendices

### 10.1 Full Environment Variables Template

#### Backend (.env)

```env
# Server
NODE_ENV=development
LOCAL_HOST=0.0.0.0
LOCAL_PORT=9000

# Database
DATABASE_URL=mysql://user:password@localhost:3306/wisetech

# AWS
AWS_S3_BUCKET=your-bucket
AWS_S3_BUCKET_REGION=ap-south-1
AWS_ACCESS_KEY=your-key
AWS_SECRET_KEY=your-secret

# Email
RESEND_API_KEY=re_xxxxx

# Frontend (CORS)
FRONTEND_BASE_URI=http://localhost:5173

# Google Maps
GOOGLE_GEOCODE_API=https://maps.googleapis.com
GOOGLE_MAP_KEY=your-key
```

#### Frontend (.env)

```env
VITE_APP_WISE_TECH_BACKEND=http://localhost:9000/api
```

### 10.2 API Endpoints Quick Reference

```
/api/auth
  POST /login
  POST /logout
  POST /forgotPassword
  POST /resetPassword/:resetToken
  POST /changePassword

/api/users
  GET /:userId
  POST /
  PUT /:userId
  DELETE /:userId

/api/employee
  POST /
  GET /
  PUT /
  GET /all
  POST /attendance
  GET /attendance
  POST /leave-request
  GET /leave-request
  POST /loan
  GET /loans

/api/company
  GET /overview
  PUT /overview
  POST /branches
  GET /branches
  POST /departments
  GET /departments
  POST /salary
  GET /salary

/api/lead-project-companies
  (leads, projects, companies, contacts)

/api/task-and-time
  (tasks, timesheets)

/api/roles
  (role management)

/api/files
  (file uploads)
```

### 10.3 Database ER Diagram

*Note: Generate using Prisma:*

```bash
npx prisma generate
# Then use prisma-erd-generator or similar tool
```

Key relationships:
- `Users` 1:N `Employees`
- `Employees` N:1 `CompanyOverview`
- `Employees` N:1 `Branches`
- `Employees` N:1 `Departments`
- `Employees` N:1 `Designations`
- `Employees` 1:N `Attendance`
- `Employees` 1:N `LeaveTracker`
- `Employees` 1:N `Loans`
- `Employees` N:M `Role`
- `Lead` N:1 `Employees` (assignee)
- `Project` N:1 `Lead`
- `ProjectTask` N:1 `Project`

### 10.4 User Guides

*Attach or link to existing user guides here*

### 10.5 Contact/Escalation Points

| Role | Contact |
|------|---------|
| Original Developer | [To be filled] |
| DevOps Support | [To be filled] |
| Database Admin | [To be filled] |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | [Author] | Initial handover document |

---

**End of Document**
