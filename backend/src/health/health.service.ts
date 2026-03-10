import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ObjectStorageService } from '../common/storage/storage.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async getBasicHealth() {
    const now = new Date().toISOString();

    let database = { ok: false, message: 'Unknown' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = { ok: true, message: 'Database reachable' };
    } catch (error: any) {
      database = { ok: false, message: error?.message || 'Database unreachable' };
    }

    const storage = await this.objectStorage.checkBucketAccess();
    const ok = database.ok && storage.ok;

    return {
      ok,
      timestamp: now,
      database,
      storage: {
        ...storage,
        provider: this.objectStorage.getStorageProvider(),
        bucket: this.objectStorage.getBucketName(),
      },
    };
  }

  async getStorageHealth() {
    const result = await this.objectStorage.checkBucketAccess();
    return {
      ok: result.ok,
      timestamp: new Date().toISOString(),
      provider: this.objectStorage.getStorageProvider(),
      bucket: this.objectStorage.getBucketName(),
      message: result.message,
    };
  }
}

