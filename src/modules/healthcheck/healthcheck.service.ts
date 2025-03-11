import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthCheckService {
  public async healthCheck() {
    return {
      message: 'Server is running',
    };
  }
}