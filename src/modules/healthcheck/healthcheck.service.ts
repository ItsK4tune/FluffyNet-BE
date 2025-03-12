import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthCheckService {
  public async healthCheck() {
    return {
      statusCode: 200,
      message: 'Server is running',
    };
  }
}
