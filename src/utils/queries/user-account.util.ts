import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserAccount } from "src/modules/authen/entities/user-account.entity";
import * as bcrypt from "bcrypt"
import { UserProfile } from "src/modules/profile/entities/user-profile.entity";

@Injectable()
export class UserAccountUtil{
    constructor(
        @InjectRepository(UserAccount) private readonly repo: Repository<UserAccount>,
    ) {}

    async findByUserID(user_id: number) {
        return await this.repo.findOne({ where: { user_id } });
    }

    async findByUsername(username: string) {
        return await this.repo.findOne({ where: { username } });
    }

    async findByEmail(email: string) {
        return await this.repo.findOne({ where: { email } });
    }

    async checkVerify(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user.verifyEmail;
    }

    async findByUsernameOrEmail(username: string, email: string) {
        return await this.repo.findOne({ 
            where: [{ username }, { email }] 
        });
    }

    async updatePassword(user: UserAccount, newPassword: string) {
        user.password = await bcrypt.hash(newPassword, 12);
        await this.repo.save(user);
        return;
    }

    async updateVerifyEmail(userAccount: UserAccount) {
        userAccount.verifyEmail = true;
        await this.repo.save(userAccount);
        return;
    }

    create(username: string, ecryptPassword: string) {
        return this.repo.create({ username, password: ecryptPassword, profile: new UserProfile() });
    }

    async save (userAccount: UserAccount) {
        await this.repo.save(userAccount);
    }
}