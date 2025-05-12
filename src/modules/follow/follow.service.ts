import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { FollowUtil } from 'src/modules/follow/follow.util';
import { ProfileUtil } from 'src/modules/profile/profile.util';
import { Follow } from './entities/follow.entity';
import { Profile } from '../profile/entities/profile.entity';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { RedisEnum } from 'src/utils/enums/enum';
import { MinioClientService } from '../minio-client/minio-client.service';
import { FollowEventsService } from '../events/follow-events.service';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);
  constructor(
    private readonly followUtil: FollowUtil,
    private readonly profileUtil: ProfileUtil,
    private readonly notificationService: NotificationService,
    private readonly profileService: ProfileService,
    private readonly redisCacheService: RedisCacheService,
    private readonly minio: MinioClientService,
    private readonly followEventsService: FollowEventsService,
  ) {}

  async getStatus(
    user_id: number,
    target_id: number,
  ): Promise<number | boolean> {
    const target = await this.profileUtil.getProfileByUserId(target_id);
    if (!target)
      return 400;

    const log = await this.followUtil.findFollow(user_id, target_id);
    return !!log;
  }

  async followTarget(user_id: number, target_id: number): Promise<boolean> {
    const isCurrentlyFollowing = await this.followUtil.findFollow(user_id, target_id);

    let operationSuccess: boolean;
    let isNewFollow: boolean;

    if (isCurrentlyFollowing) {
      operationSuccess = await this.followUtil.deleteFollowing(user_id, target_id);
      isNewFollow = false;

      // Emit unfollow event
      this.logger.log(`User ${user_id} unfollowed user ${target_id}`);
      this.followEventsService.emitFollowEvent(user_id, target_id, false);
    }
    else {
      const targetProfile = await this.profileUtil.getProfileByUserId(target_id);
      if (!targetProfile) {
        return null; 
      }
      operationSuccess = await this.followUtil.createFollow(user_id, target_id);
      isNewFollow = true;

      // Emit follow event
      this.logger.log(`User ${user_id} followed user ${target_id}`);
      const isFollowing =
        (await this.isFollowing(user_id, target_id)) &&
        (await this.isFollowing(target_id, user_id));
      this.followEventsService.emitFollowEvent(user_id, target_id, isFollowing);
    }

    if (operationSuccess && isNewFollow) {
      await this.sendFollowNotification(user_id, target_id);
    }

    return operationSuccess;
  }

  async followingList(user_id: number): Promise<Follow[]> {
    const list = await this.followUtil.findFollowingList(user_id);;
    return this.enrichFollowingListWithMediaUrls(list);
  }

  async followerList(user_id: number): Promise<Follow[]> {
    const list = await this.followUtil.findFollowerList(user_id);
    return list;
  }

  async suggestionList(user_id: number): Promise<Profile[]> {
    let followingList: Follow[] = await this.followingList(user_id);

    if (!followingList || followingList.length === 0) {
      const n = 5; // must change
      return await this.getRandomProfiles(user_id, n);
    }

    const topm = Math.min(5, followingList.length); //must change
    const selectedFollowings = this.getRandomElements(followingList, topm);

    let potentialSuggestions = new Set<number>();

    for (const follow of selectedFollowings) {
      const followingsOfm = await this.followUtil.findFollowingList(follow.following_id);
      followingsOfm.forEach(f => potentialSuggestions.add(f.follower_id));
    }

    const alreadyFollowing = new Set(followingList.map(f => f.following_id));
    alreadyFollowing.add(user_id);
    const finalSuggestions = [...potentialSuggestions].filter(id => !alreadyFollowing.has(id));

    const y = Math.min(5, finalSuggestions.length); //must change
    const selectedSuggestions = this.getRandomElements(finalSuggestions, y);

    let suggestionList: Profile[] = [];
    for (const suggestionId of selectedSuggestions) {
      try {
        const profile = await this.profileUtil.getProfileByUserId(suggestionId);
        if (profile) { 
            suggestionList.push(profile);
        }
      } catch (error) {
        continue;;
      }
    }
    return suggestionList;
  }

  async isFollowing(user_id: number, target_id: number): Promise<boolean> {
    const log = await this.followUtil.findFollow(user_id, target_id);
    return !!log;
  }

  async pushFollowingToRedis(user_id: number, ttl?: number): Promise<void> {
    const redisKey = `${RedisEnum.following}:${user_id}:`;

    const list = await this.followUtil.findFollowingList(user_id);
    const dbSet = new Set(list.map(f => f.following.user_id.toString()));

    const cache = await this.redisCacheService.sgetall(`${RedisEnum.following}:${user_id}:`);
    const cacheSet = new Set(cache);

    const toAdd = [...dbSet].filter(id => !cacheSet.has(id));
    const toRemove = [...cacheSet].filter(id => !dbSet.has(id));

    if (toAdd.length > 0) {
      await this.redisCacheService.saddMultiple(redisKey, toAdd, ttl); 
    }

    if (toRemove.length > 0) {
      await this.redisCacheService.sremMultiple(redisKey, toRemove);
    }
  }

  private async sendFollowNotification(follower_id: number, followed_id: number): Promise<void> {
    try {
      const followerProfile = await this.profileService.getProfile(follower_id) as Profile;
      if (!followerProfile) {
        return;
      }

      const notificationType = 'FOLLOW'; 
      const notificationBody = {
        follower: { 
            user_id: followerProfile.user_id,
            displayName: followerProfile.nickname,
            avatarUrl: followerProfile.avatar, 
        },
        message: `${followerProfile.nickname || `User ${follower_id}`} started following you.`, 
        followedAt: new Date().toISOString(), 
      };

      await this.notificationService.createNotification(
        followed_id,      
        notificationType,
        notificationBody,
      );

    } catch (error) {
        // TODO: implement retry mechanism
    }
  }

  private async enrichFollowingListWithMediaUrls(followingList: Follow[] | null): Promise<Follow[]> {
    if (!followingList || followingList.length === 0) {
      return []; 
    }

    const enrichmentPromises = followingList.map(async (followItem) => {
      const enrichedFollowItem: Follow = { ...followItem };

      if (followItem.following.avatar) {
        if (followItem.following.avatar.startsWith('https://lh3.googleusercontent.com/')) {
          enrichedFollowItem.following.avatar = followItem.following.avatar;
        }
        else {
          try {
            enrichedFollowItem.following.avatar = await this.minio.generatePresignedDownloadUrl(followItem.following.avatar);
          } catch (error) {
            console.error(`Failed to get download URL for avatar ${followItem.following.avatar}:`, error);
            enrichedFollowItem.following.avatar = null; 
          }
        }
      }

      if (followItem.following.background) {
        try {
          enrichedFollowItem.following.background = await this.minio.generatePresignedDownloadUrl(followItem.following.background);
        } catch (error) {
          console.error(`Failed to get download URL for background ${followItem.following.background}:`, error);
          enrichedFollowItem.following.background = null; 
        }
      }

      return enrichedFollowItem;
    });

    const enrichedList = await Promise.all(enrichmentPromises);
    return enrichedList;
  }

  private async getRandomProfiles(user_id: number, n: number): Promise<Profile[]> {
    const profiles = await this.profileUtil.getAllProfilesExcludingUser(user_id);
    return this.getRandomElements(profiles, n);
  }

  private getRandomElements<T>(arr: T[], k: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, k);
  }
}
