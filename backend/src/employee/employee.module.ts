import { Module } from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
