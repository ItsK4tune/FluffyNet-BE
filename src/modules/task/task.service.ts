import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, IsNull, In } from 'typeorm';
import { Account } from '../authen/entities/account.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  @Cron('0 0 * * *', { name: 'checkExpiredSuspensionsDaily' })
  async handleCheckExpiredSuspensions() {
    this.logger.log(
      `Running daily job at midnight: checkExpiredSuspensionsDaily`,
    );

    const now = new Date();

    try {
      const expiredSuspensions = await this.repo.find({
        where: {
          is_suspended: true,
          suspended_until: Not(IsNull()) && LessThanOrEqual(now),
        },
        select: ['user_id'],
      });

      if (expiredSuspensions.length === 0) {
        this.logger.log(
          '[Daily Check] No expired suspensions found at midnight.',
        );
        return;
      }

      const userIdsToUnsuspend = expiredSuspensions.map((user) => user.user_id);
      this.logger.log(
        `[Daily Check] Found ${userIdsToUnsuspend.length} users to unsuspend at midnight: [${userIdsToUnsuspend.join(', ')}]`,
      );

      const updateResult = await this.repo.update(
        { user_id: In(userIdsToUnsuspend) },
        {
          is_suspended: false,
          suspended_until: null,
          suspend_reason: null,
        },
      );

      this.logger.log(
        `[Daily Check] Successfully unsuspended ${updateResult.affected} users at midnight.`,
      );
    } catch (error) {
      this.logger.error(
        '[Daily Check] Failed to process expired suspensions at midnight',
        error.stack,
      );
    }
  }
}
