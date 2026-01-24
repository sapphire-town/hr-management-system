import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ReimbursementController } from './reimbursement.controller';
import { ReimbursementService } from './reimbursement.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/receipts',
    }),
    NotificationModule,
  ],
  controllers: [ReimbursementController],
  providers: [ReimbursementService],
  exports: [ReimbursementService],
})
export class ReimbursementModule {}
