import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Comment } from "./entities/comment.entity";
import { Repository } from "typeorm";
import { CommentDto } from "./dtos/comment.dto";

@Injectable()
export class CommentUtil {
    constructor(
        @InjectRepository(Comment) private readonly repo: Repository<Comment>,
    ){}

    async getCommentByPost(post_id: number){
        return await this.repo.find({ where: { post_id }, order: { createdAt: 'DESC' } });
    }

    async getCommentById(comment_id: number){
        return await this.repo.findOne({ where: { comment_id }, order: { createdAt: 'DESC' } });
    }

    async createComment(user_id: number, commentDto: CommentDto){
        const comment = this.repo.create({
            ...commentDto,
            user_id: user_id,
        });

        return await this.saveComment(comment);
    }

    async saveComment(comment: Comment) {
        return await this.repo.save(comment);
    }

    async deleteComment(comment_id: number) {
        return await this.repo.delete({ comment_id });
    }
}