import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserAccount } from "./entities/user-account.entity";
import * as bcrypt from "bcrypt"

@Injectable()
export class FindUser{
    constructor(
        @InjectRepository(UserAccount) private readonly repo: Repository<UserAccount>,
    ) {}

    async findByUsername(username: string) {
        return await this.repo.findOne({ where: { username } });
    }

    async findByEmail(email: string) {
        return await this.repo.findOne({ where: { email } });
    }

    async updatePassword(email: string, newPassword: string) {
        const user = await this.repo.findOne({ where: { email } });

        if (!user) {
            throw new Error('User not found');
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await this.repo.save(user);

        return { message: 'Password updated successfully' };
    }
}