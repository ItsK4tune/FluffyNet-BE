import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserAccount } from "../modules/authen/entities/user-account.entity";
import * as bcrypt from "bcrypt"

@Injectable()
export class UserAccountUtil{
    constructor(
        @InjectRepository(UserAccount) private readonly repo: Repository<UserAccount>,
    ) {}

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
}