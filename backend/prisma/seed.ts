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
      sickLeaveBalance: 12,
      casualLeaveBalance: 12,
      earnedLeaveBalance: 15,
    },
  });

  console.log('Created Employee records');

  // Update leave balances for all employees (12 sick, 12 casual, 15 earned per year)
  const defaultLeaveBalance = {
    sickLeaveBalance: 12,
    casualLeaveBalance: 12,
    earnedLeaveBalance: 15,
  };

  await prisma.employee.update({
    where: { id: directorEmployee.id },
    data: defaultLeaveBalance,
  });

  await prisma.employee.update({
    where: { id: hrEmployee.id },
    data: defaultLeaveBalance,
  });

  await prisma.employee.update({
    where: { id: managerEmployee.id },
    data: defaultLeaveBalance,
  });

  await prisma.employee.update({
    where: { id: regularEmployee.id },
    data: defaultLeaveBalance,
  });

  console.log('Updated leave balances');

  // Create sample official holidays for current year
  const currentYear = new Date().getFullYear();
  const holidays = [
    { date: new Date(currentYear, 0, 1), name: 'New Year', description: 'New Year celebration' },
    { date: new Date(currentYear, 0, 26), name: 'Republic Day', description: 'Republic Day of India' },
    { date: new Date(currentYear, 2, 8), name: 'Holi', description: 'Festival of Colors' },
    { date: new Date(currentYear, 7, 15), name: 'Independence Day', description: 'Independence Day of India' },
    { date: new Date(currentYear, 9, 2), name: 'Gandhi Jayanti', description: 'Birth anniversary of Mahatma Gandhi' },
    { date: new Date(currentYear, 9, 12), name: 'Dussehra', description: 'Victory of good over evil' },
    { date: new Date(currentYear, 10, 1), name: 'Diwali', description: 'Festival of Lights' },
    { date: new Date(currentYear, 11, 25), name: 'Christmas', description: 'Christmas celebration' },
  ];

  for (const holiday of holidays) {
    await prisma.officialHoliday.upsert({
      where: { date: holiday.date },
      update: {},
      create: holiday,
    });
  }

  console.log('Created official holidays');

  // Create a second employee under the manager
  const employee2User = await prisma.user.upsert({
    where: { email: 'employee2@company.com' },
    update: {},
    create: {
      email: 'employee2@company.com',
      password: hashedPassword,
      role: 'EMPLOYEE',
      isActive: true,
    },
  });

  await prisma.employee.upsert({
    where: { userId: employee2User.id },
    update: {},
    create: {
      userId: employee2User.id,
      firstName: 'Bob',
      lastName: 'Developer',
      roleId: softwareEngineerRole.id,
      salary: 55000,
      managerId: managerEmployee.id,
      joinDate: new Date('2023-03-01'),
      sickLeaveBalance: 12,
      casualLeaveBalance: 12,
      earnedLeaveBalance: 15,
    },
  });

  console.log('Created additional employee: employee2@company.com');

  // Create Interviewer user
  const interviewerUser = await prisma.user.upsert({
    where: { email: 'interviewer@company.com' },
    update: {},
    create: {
      email: 'interviewer@company.com',
      password: hashedPassword,
      role: 'INTERVIEWER',
      isActive: true,
    },
  });

  // Create Interviewer role
  const interviewerRole = await prisma.role.upsert({
    where: { name: 'Technical Interviewer' },
    update: {
      dailyReportingParams: [
        { key: 'interviews_conducted', label: 'Interviews Conducted', target: 5, type: 'number' },
        { key: 'students_evaluated', label: 'Students Evaluated', target: 8, type: 'number' },
        { key: 'round1_completed', label: 'Round 1 Evaluations', target: 5, type: 'number' },
        { key: 'round2_completed', label: 'Round 2 Evaluations', target: 3, type: 'number' },
        { key: 'reports_written', label: 'Evaluation Reports Written', target: 5, type: 'number' },
      ],
    },
    create: {
      name: 'Technical Interviewer',
      dailyReportingParams: [
        { key: 'interviews_conducted', label: 'Interviews Conducted', target: 5, type: 'number' },
        { key: 'students_evaluated', label: 'Students Evaluated', target: 8, type: 'number' },
        { key: 'round1_completed', label: 'Round 1 Evaluations', target: 5, type: 'number' },
        { key: 'round2_completed', label: 'Round 2 Evaluations', target: 3, type: 'number' },
        { key: 'reports_written', label: 'Evaluation Reports Written', target: 5, type: 'number' },
      ],
      performanceChartConfig: {},
      createdBy: directorUser.id,
    },
  });

  const interviewerEmployee = await prisma.employee.upsert({
    where: { userId: interviewerUser.id },
    update: {},
    create: {
      userId: interviewerUser.id,
      firstName: 'Alex',
      lastName: 'Interviewer',
      roleId: interviewerRole.id,
      salary: 70000,
      joinDate: new Date('2022-06-01'),
      sickLeaveBalance: 12,
      casualLeaveBalance: 12,
      earnedLeaveBalance: 15,
    },
  });

  console.log('Created Interviewer: interviewer@company.com');

  // Create a sample placement drive and assign the interviewer
  const sampleDrive = await prisma.placementDrive.upsert({
    where: { id: 'sample-drive-1' },
    update: {},
    create: {
      id: 'sample-drive-1',
      collegeName: 'Tech University',
      driveDate: new Date(currentYear, 1, 15), // Feb 15
      roles: [
        { name: 'Software Engineer', description: 'Full stack development', positions: 5 },
        { name: 'QA Engineer', description: 'Quality assurance', positions: 2 },
      ],
      createdBy: hrUser.id,
    },
  });

  // Assign interviewer to the drive
  await prisma.placementDriveInterviewer.upsert({
    where: {
      driveId_interviewerId: {
        driveId: sampleDrive.id,
        interviewerId: interviewerEmployee.id,
      },
    },
    update: {},
    create: {
      driveId: sampleDrive.id,
      interviewerId: interviewerEmployee.id,
    },
  });

  // Add some sample students
  const sampleStudents = [
    { name: 'Alice Johnson', email: 'alice@university.edu', phone: '9876543210' },
    { name: 'Bob Smith', email: 'bob@university.edu', phone: '9876543211' },
    { name: 'Carol White', email: 'carol@university.edu', phone: '9876543212' },
  ];

  for (const student of sampleStudents) {
    await prisma.student.upsert({
      where: { id: `student-${student.email}` },
      update: {},
      create: {
        id: `student-${student.email}`,
        driveId: sampleDrive.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        studentData: { college: 'Tech University', branch: 'Computer Science' },
      },
    });
  }

  console.log('Created sample placement drive with students');

  // Create Intern user
  const internUser = await prisma.user.upsert({
    where: { email: 'intern@company.com' },
    update: {},
    create: {
      email: 'intern@company.com',
      password: hashedPassword,
      role: 'INTERN',
      isActive: true,
    },
  });

  const internRole = await prisma.role.upsert({
    where: { name: 'Intern' },
    update: {},
    create: {
      name: 'Intern',
      dailyReportingParams: [],
      performanceChartConfig: {},
      createdBy: directorUser.id,
    },
  });

  await prisma.employee.upsert({
    where: { userId: internUser.id },
    update: {},
    create: {
      userId: internUser.id,
      firstName: 'Test',
      lastName: 'Intern',
      roleId: internRole.id,
      salary: 15000,
      employeeType: 'INTERN',
      internType: 'SUMMER',
      contractEndDate: new Date(currentYear, 11, 31),
      internshipDuration: '6 months',
      managerId: managerEmployee.id,
      joinDate: new Date(currentYear, 0, 15),
      sickLeaveBalance: 0,
      casualLeaveBalance: 0,
      earnedLeaveBalance: 0,
    },
  });

  console.log('Created Intern: intern@company.com');

  console.log('');
  console.log('='.repeat(50));
  console.log('SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(50));
  console.log('');
  console.log('Test Accounts (password: password123):');
  console.log('  - Director: director@company.com');
  console.log('  - HR Head: hr@company.com');
  console.log('  - Manager: manager@company.com');
  console.log('  - Employee: employee@company.com');
  console.log('  - Employee 2: employee2@company.com');
  console.log('  - Interviewer: interviewer@company.com');
  console.log('  - Intern: intern@company.com');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
