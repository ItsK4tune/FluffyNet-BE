import { Injectable, NotFoundException } from '@nestjs/common';
import { ViewProfileDto } from './dtos/view-profile.dto';
import { UserAccountUtil } from 'src/utils/user-account.util';
import { UserProfileUtil } from 'src/utils/user-profile.util';
import { EditProfileDto } from './dtos/edit-profile.dto';
import { UserProfile } from './entities/user-profile.entity';

@Injectable()
export class ProfileService {
    constructor (
        private readonly userAccountUtil: UserAccountUtil,
        private readonly userProfileUtil: UserProfileUtil,
    ) {}

    async getProfile ({ username, email }: ViewProfileDto) {
        const user = await this.userAccountUtil.findByUsername(username) ?? await this.userAccountUtil.findByEmail(email);

        if (!user) return null;

        let userProfile = await this.userProfileUtil.getProfileByUsernameOrEmail(username, email);

        if (!userProfile) {
            userProfile = new UserProfile();
            userProfile.username = user.username;
            userProfile.email = user.email;

            await this.userProfileUtil.save(userProfile);
        }

        return userProfile;
    }   

    async editProfile ({ username, email }: ViewProfileDto, editData: EditProfileDto) {
        let userProfile = await this.userProfileUtil.getProfileByUsernameOrEmail(username, email);

        console.log(userProfile);

        if (!userProfile) {
            throw new NotFoundException('User profile not found');
        }

        userProfile = { ...userProfile, ...editData };

        await this.userProfileUtil.save(userProfile);

        return {
            message: 'Profile updated successfully',
            profile: userProfile,
        };
    }
}
