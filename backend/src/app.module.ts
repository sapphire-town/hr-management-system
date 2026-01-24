import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeeModule } from './employee/employee.module';
import { LeaveModule } from './leave/leave.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DocumentModule } from './document/document.module';
import { AssetModule } from './asset/asset.module';
import { ReimbursementModule } from './reimbursement/reimbursement.module';
import { ResignationModule } from './resignation/resignation.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    NotificationModule,
    DashboardModule,
    EmployeeModule,
    RoleModule,
    LeaveModule,
    AttendanceModule,
    DocumentModule,
    AssetModule,
    ReimbursementModule,
    ResignationModule,
  ],
})
export class AppModule {}
