import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/documents',
    }),
    NotificationModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
