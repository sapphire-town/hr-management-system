import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password for all users (password: "password123")
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Director user
  const directorUser = await prisma.user.upsert({
    where: { email: 'director@company.com' },
    update: {},
    create: {
      email: 'director@company.com',
      password: hashedPassword,
      role: 'DIRECTOR',
      isActive: true,
    },
  });

  console.log('Created Director user:', directorUser.email);

  // Create HR Head user
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@company.com' },
    update: {},
    create: {
      email: 'hr@company.com',
      password: hashedPassword,
      role: 'HR_HEAD',
      isActive: true,
    },
  });

  console.log('Created HR user:', hrUser.email);

  // Create Manager user
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      email: 'manager@company.com',
      password: hashedPassword,
      role: 'MANAGER',
      isActive: true,
    },
  });

  console.log('Created Manager user:', managerUser.email);

  // Create Employee user
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      email: 'employee@company.com',
      password: hashedPassword,
      role: 'EMPLOYEE',
      isActive: true,
    },
  });

  console.log('Created Employee user:', employeeUser.email);

  // Create default roles
  const directorRole = await prisma.role.upsert({
    where: { name: 'Director' },
    update: {},
    create: {
      name: 'Director',
      dailyReportingParams: [],
      performanceChartConfig: {},
      createdBy: directorUser.id,
    },
  });

  const hrRole = await prisma.role.upsert({
    where: { name: 'HR Manager' },
    update: {},
    create: {
      name: 'HR Manager',
      dailyReportingParams: [],
      performanceChartConfig: {},
      createdBy: directorUser.id,
    },
  });

  const engineeringManagerRole = await prisma.role.upsert({
    where: { name: 'Engineering Manager' },
    update: {},
    create: {
      name: 'Engineering Manager',
      dailyReportingParams: [],
      performanceChartConfig: {},
      createdBy: directorUser.id,
    },
  });

  const softwareEngineerRole = await prisma.role.upsert({
    where: { name: 'Software Engineer' },
    update: {},
    create: {
      name: 'Software Engineer',
      dailyReportingParams: [],
      performanceChartConfig: {},
      createdBy: directorUser.id,
    },
  });

  console.log('Created default roles');

  // Create Employee records for users
  const directorEmployee = await prisma.employee.upsert({
    where: { userId: directorUser.id },
    update: {},
    create: {
      userId: directorUser.id,
      firstName: 'John',
      lastName: 'Director',
      roleId: directorRole.id,
      salary: 150000,
      joinDate: new Date('2020-01-01'),
    },
  });

  const hrEmployee = await prisma.employee.upsert({
    where: { userId: hrUser.id },
    update: {},
    create: {
      userId: hrUser.id,
      firstName: 'Sarah',
      lastName: 'HR',
      roleId: hrRole.id,
      salary: 80000,
      joinDate: new Date('2021-03-15'),
    },
  });

  const managerEmployee = await prisma.employee.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      userId: managerUser.id,
      firstName: 'Mike',
      lastName: 'Manager',
      roleId: engineeringManagerRole.id,
      salary: 100000,
      joinDate: new Date('2021-06-01'),
    },
  });

  const regularEmployee = await prisma.employee.upsert({
    where: { userId: employeeUser.id },
    update: {},
    create: {
      userId: employeeUser.id,
      firstName: 'Jane',
      lastName: 'Employee',
      roleId: softwareEngineerRole.id,
      salary: 60000,
      managerId: managerEmployee.id,
      joinDate: new Date('2022-01-10'),
    },
  });

  console.log('Created Employee records');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
