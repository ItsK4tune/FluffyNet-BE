import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, IsNull, In } from 'typeorm';
import { Account } from '../authen/entities/account.entity';
import { RefreshToken } from '../authen/entities/refresh.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  @Cron('0 0 * * *', { name: 'dailyMidnightJobs' })
  async handleDailyMidnightJobs() {
    this.logger.log(`Running Daily Midnight Jobs...`);
    await this.handleCheckExpiredSuspensions();
    await this.cleanupExpiredRefreshTokens();
    this.logger.log(`Finished Daily Midnight Jobs.`);
  }

  async handleCheckExpiredSuspensions() {
    this.logger.log(
      `Running daily job at midnight: checkExpiredSuspensionsDaily`,
    );

    const now = new Date();

    try {
      const expiredSuspensions = await this.accountRepo.find({
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

      const updateResult = await this.accountRepo.update(
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

  private async cleanupExpiredRefreshTokens() {
    this.logger.log('[Daily Job] Running cleanupExpiredRefreshTokens...');
    const now = new Date();

    try {
      const deleteResult = await this.refreshTokenRepo
        .createQueryBuilder()
        .delete()
        .from(RefreshToken)
        .where('expires_at <= :now', { now })
        .orWhere('is_revoked = :isRevoked', { isRevoked: true })
        .execute();

      const affectedRows = deleteResult.affected ?? 0;

      if (affectedRows > 0) {
        this.logger.log(
          `[Daily Job - Tokens] Successfully deleted ${affectedRows} expired or revoked refresh tokens.`,
        );
      } else {
        this.logger.log(
          '[Daily Job - Tokens] No expired or revoked refresh tokens found to delete.',
        );
      }
    } catch (error) {
      this.logger.error(
        '[Daily Job - Tokens] Failed to cleanup refresh tokens',
        error.stack,
      );
    }
  }
}
