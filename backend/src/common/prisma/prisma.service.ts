import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  @Cron('*/4 * * * *')
  async keepAlive() {
    try {
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.warn(`Keep-alive ping failed: ${error?.message}`);
    }
  }
}
