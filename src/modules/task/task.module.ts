import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../authen/entities/account.entity';
import { RefreshToken } from '../authen/entities/refresh.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, RefreshToken])],
  providers: [TaskService],
})
export class TaskModule {}
