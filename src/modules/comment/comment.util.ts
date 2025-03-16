import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Comment } from "./entities/comment.entity";
import { Repository } from "typeorm";

@Injectable()
export class CommentUtil {
    constructor(
        @InjectRepository(Comment) private readonly commentRepository: Repository<Comment>,
    ){}

    async getComment(post_id: number){
        return await this.commentRepository.find({ where: { post_id }, order: { createdAt: 'DESC' } });
    }
}