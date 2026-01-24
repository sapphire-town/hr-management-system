import { Module } from '@nestjs/common';
import { ResignationController } from './resignation.controller';
import { ResignationService } from './resignation.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ResignationController],
  providers: [ResignationService],
  exports: [ResignationService],
})
export class ResignationModule {}
