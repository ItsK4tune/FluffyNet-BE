import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { MemberController } from './member.controller';
import { MemberRepository } from './member.repository';
import { MemberService } from './member.service';
import { ProfileModule } from '../profile/profile.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member]),
    ProfileModule,
    RedisCacheModule,
  ],
  controllers: [MemberController],
  providers: [MemberService, MemberRepository],
  exports: [MemberService],
})
export class MemberModule {}
