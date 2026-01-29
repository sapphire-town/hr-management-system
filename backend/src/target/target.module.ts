import { Module } from '@nestjs/common';
import { TargetController } from './target.controller';
import { TargetService } from './target.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TargetController],
  providers: [TargetService],
  exports: [TargetService],
})
export class TargetModule {}
