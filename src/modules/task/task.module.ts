import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../authen/entities/account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  providers: [TaskService],
})
export class TaskModule {}
