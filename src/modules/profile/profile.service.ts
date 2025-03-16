import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfileUtil } from './user-profile.util';
import { ProfileDto } from './dtos/edit-profile.dto';
import { UserAccountUtil } from '../authen/user-account.util';
import { RedisEnum } from 'src/utils/enums/redis.enum';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';

import { env } from 'src/config';
import { RedisCacheService } from '../redis-cache/redis-cache.service';

@Injectable()
export class ProfileService {
    constructor (
        private readonly userProfileUtil: UserProfileUtil,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    async getProfile (user_id: number) {
        const key = `${RedisEnum.profile}:${user_id}`;
        const cache = await this.redisCacheService.hgetall(key);

        if (cache)  return cache;

        const profile = await this.userProfileUtil.getProfileByUserId(user_id);
        if (!profile) return null;
        
        await this.redisCacheService.hsetall(key, profile);
        await this.redisCacheService.expire(key, convertToSeconds(env.redis.ttl));

        return profile;
    }   

    async editProfile (user_id: number, editData: ProfileDto, target_id: number) {
        if (user_id !== target_id)  return false;

        const key = `${RedisEnum.profile}:${target_id}`;
        await this.redisCacheService.del(key);

        let userProfile = await this.userProfileUtil.getProfileByUserId(user_id);
        if (!userProfile)   return null; 

        userProfile = { ...userProfile, ...editData };
        await this.userProfileUtil.save(userProfile);
    }
}