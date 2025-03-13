import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckService } from './healthcheck.service';

@ApiTags('Health Check')
@Controller('health-check')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @ApiOperation({ summary: `Get system's health`, description: `Check whether system is working or not.` })
  @ApiResponse({ status: 201, description: 'Server is running' })
  @Get()
  async healthCheck() {
    return this.healthCheckService.healthCheck();
  }
}
