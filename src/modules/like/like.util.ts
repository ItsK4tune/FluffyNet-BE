import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Like } from "./entity/like.entity";

@Injectable()
export class LikeUtil {
    constructor(
        @InjectRepository(Like) private readonly repo: Repository<Like>,
    ) {}

    async getPostLikeStatus(user_id: number, post_id: number): Promise<boolean> {
        const like = await this.repo.findOne({ where: { profile: { user_id }, post: { post_id } } });
        return !!like; 
    }

    async getCommentLikeStatus(user_id: number, comment_id: number): Promise<boolean> {
        const like = await this.repo.findOne({ where: { profile: { user_id }, comment: { comment_id } } });
        return !!like; 
    }

    async getPostLikeCount(post_id: number): Promise<Number> {
        return await this.repo.count({ where: { post: { post_id } }})
    }

    async getCommentLikeCount(comment_id: number): Promise<Number> {
        return await this.repo.count({ where: { comment: { comment_id } }})
    }

    async deleteLikePost(user_id: number, post_id: number): Promise<boolean> {
        await this.repo.delete({ profile: { user_id }, post: { post_id } });
        return false;
    }
    
    async createLikePost(user_id: number, post_id: number) {
        const likeRequest = this.repo.create({
            profile: { user_id } as any, 
            post: { post_id } as any, 
        });
        await this.repo.save(likeRequest);
        return true;
    }

    async deleteLikeComment(user_id: number, comment_id: number): Promise<boolean> {
        await this.repo.delete({ profile: { user_id }, comment: { comment_id } });
        return false;
    }
    
    async createLikeComment(user_id: number, comment_id: number) {
        const likeRequest = this.repo.create({
            profile: { user_id } as any, 
            comment: { comment_id } as any, 
        });
        await this.repo.save(likeRequest);
        return true;
    }
}