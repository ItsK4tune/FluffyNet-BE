import { Injectable, NotFoundException } from '@nestjs/common';
import { UserProfileUtil } from 'src/utils/user-profile.util';
import { ProfileDto } from './dtos/edit-profile.dto';
import { UserAccountUtil } from 'src/utils/user-account.util';

@Injectable()
export class ProfileService {
    constructor (
        private readonly userProfileUtil: UserProfileUtil,
        private readonly userAccountUtil: UserAccountUtil,
    ) {}

    async getProfile (user_id: number) {    
        const user = await this.userProfileUtil.getProfileByUserId(user_id);
        if (!user) return null;

        return user;
    }   

    async editProfile (user_id: number, editData: ProfileDto) {
        let userProfile = await this.userProfileUtil.getProfileByUserId(user_id);

        if (!userProfile) {
            throw new NotFoundException('User profile not found');
        }

        userProfile = { ...userProfile, ...editData };

        await this.userProfileUtil.save(userProfile);

        const userAccount = await this.userAccountUtil.findByUserID(user_id);
        userAccount.email = editData.email;
        await this.userAccountUtil.save(userAccount);

        return {
            message: 'Profile updated successfully',
            profile: userProfile,
        };
    }
}
