import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Follow } from "src/modules/follow/entities/follow.entity";
import { Repository } from "typeorm";


@Injectable()
export class FollowUtil{
    constructor(
        @InjectRepository(Follow) private readonly repo: Repository<Follow>,
    ) {}

    async findFollow(user_id: number, target_id: number) {
        return await this.repo.findOne({ where: { follower_id: user_id, following_id: target_id } });
    }

    async deleteFollowing(user_id: number, target_id: number) {
        await this.repo.delete({ follower_id: user_id, following_id: target_id });
        return false;
    }

    async createFollow(user_id: number, target_id: number) {
        const followRequest = this.repo.create({ follower_id: user_id, following_id: target_id });
        await this.repo.save(followRequest);
        return true;
    }

    async findFollowingList(target_id: number) {
        return await this.repo.find({ where: { following_id: target_id } });
    }

    async findFollowerList(target_id: number) {
        return await this.repo.find({ where: { follower_id: target_id } });
    }
}