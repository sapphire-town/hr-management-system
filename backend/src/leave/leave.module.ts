import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [LeaveController, HolidayController],
  providers: [LeaveService, HolidayService],
  exports: [LeaveService, HolidayService],
})
export class LeaveModule {}
