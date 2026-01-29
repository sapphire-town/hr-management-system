import { Module } from '@nestjs/common';
import { DirectorsListController } from './directors-list.controller';
import { DirectorsListService } from './directors-list.service';

@Module({
  controllers: [DirectorsListController],
  providers: [DirectorsListService],
  exports: [DirectorsListService],
})
export class DirectorsListModule {}
