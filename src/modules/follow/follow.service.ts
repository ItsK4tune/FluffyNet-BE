import {
  Injectable,
} from '@nestjs/common';
import { FollowUtil } from 'src/modules/follow/follow.util';
import { ProfileUtil } from 'src/modules/profile/profile.util';
import { Follow } from './entities/follow.entity';
import { Profile } from '../profile/entities/profile.entity';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class FollowService {
  constructor(
    private readonly followUtil: FollowUtil,
    private readonly profileUtil: ProfileUtil,
    private readonly notificationService: NotificationService,
    private readonly profileService: ProfileService,
  ) {}

  async getStatus(user_id: number, target_id: number): Promise<number | boolean> {
    if (user_id === target_id) return 409;
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
    } else {
      const targetProfile = await this.profileUtil.getProfileByUserId(target_id);
      if (!targetProfile) {
        return null; 
      }
      operationSuccess = await this.followUtil.createFollow(user_id, target_id);
      isNewFollow = true;
    }

    if (operationSuccess && isNewFollow) {
      await this.sendFollowNotification(user_id, target_id);
    }

    return operationSuccess;
  }

  async followingList(user_id: number): Promise<Follow[]> {
    const user = await this.profileUtil.getProfileByUserId(user_id);
    if (!user) return null;

    const list = await this.followUtil.findFollowingList(user_id);
    return list;
  }

  async followerList(user_id: number): Promise<Follow[]> {
    const user = await this.profileUtil.getProfileByUserId(user_id);
    if (!user)  return null;

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
            displayName: followerProfile.name,
            avatarUrl: followerProfile.avatar, 
        },
        message: `${followerProfile.name || `User ${follower_id}`} started following you.`, 
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

  private async getRandomProfiles(user_id: number, n: number): Promise<Profile[]> {
    const profiles = await this.profileUtil.getAllProfilesExcludingUser(user_id);
    return this.getRandomElements(profiles, n);
  }

  private getRandomElements<T>(arr: T[], k: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, k);
  }
}
