import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfileUtil } from './user-profile.util';
import { ProfileDto } from './dtos/edit-profile.dto';
import { UserAccountUtil } from '../authen/user-account.util';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { RedisEnum } from 'src/utils/enums/redis.enum';
import { UserProfile } from './entities/user-profile.entity';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { profileFields } from 'src/utils/fields/profile.field';
import { env } from 'src/config';

@Injectable()
export class ProfileService {
    constructor (
        private readonly userProfileUtil: UserProfileUtil,
        private readonly userAccountUtil: UserAccountUtil,
        @InjectRedis() private readonly redis: Redis,
    ) {}

    async getProfile (user_id: number) {
        const key = `${RedisEnum.profile}:${user_id}`;
        const fields = profileFields;

        const cacheDataArray = await Promise.all(fields.map(field => this.redis.hget(key, field)));

        const cacheData: Record<string, any> = Object.fromEntries(
            fields.map((field, i) => [field, cacheDataArray[i]])
        );

        const missingFields = fields.filter((field) => cacheData[field] == null);

        if (missingFields.length === 0) {
            return cacheData as unknown as UserProfile;
        }

        const user = await this.userProfileUtil.getProfileByUserId(user_id);
        if (!user) return null;

        const updates: Record<string, string> = {};
        fields.forEach(field => {    
            updates[field] = user[field] !== undefined && user[field] !== null ? user[field].toString() : "";
        });

        await this.redis.hset(key, updates);
        await this.redis.expire(key, convertToSeconds(env.redis.ttl));

        return updates as unknown as UserProfile;
    }   

    async editProfile (user_id: number, editData: ProfileDto) {
        const key = `${RedisEnum.profile}:${user_id}`;
        const fields = Object.keys(editData);

        const cacheDataArray = await Promise.all(fields.map(field => this.redis.hget(key, field)));
        const cacheData: Record<string, any> = Object.fromEntries(fields.map((field, i) => [field, cacheDataArray[i]]));
        
        const changedFields: Record<string, string> = {};
        for (const field of fields) {
            const newValue = editData[field] !== undefined && editData[field] !== null ? editData[field].toString() : "";
            if (cacheData[field] !== newValue) {
                changedFields[field] = newValue;
            }
        }

        if (Object.keys(changedFields).length === 0) {
            return { message: 'Profile updated successfully', profile: cacheData };
        }

        let userProfile = await this.userProfileUtil.getProfileByUserId(user_id);

        if (!userProfile) {
            throw new NotFoundException('User profile not found');
        }

        userProfile = { ...userProfile, ...editData };
        await this.userProfileUtil.save(userProfile);

        const userAccount = await this.userAccountUtil.findByUserID(user_id);
        userAccount.email = editData.email;
        await this.userAccountUtil.save(userAccount);

        await this.redis.hset(key, changedFields);
        await this.redis.expire(key, convertToSeconds(env.redis.ttl));

        return { message: 'Profile updated successfully', profile: userProfile };
    }
}