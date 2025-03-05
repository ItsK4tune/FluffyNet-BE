import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UserAccount } from '../authen/entities/user-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile, UserAccount]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService]
})
export class ProfileModule {}
