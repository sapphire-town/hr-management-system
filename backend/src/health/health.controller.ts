import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check for database and storage' })
  async getHealth() {
    return this.healthService.getBasicHealth();
  }

  @Get('storage')
  @ApiOperation({ summary: 'Storage health check (MinIO/S3/local)' })
  async getStorageHealth() {
    return this.healthService.getStorageHealth();
  }
}

